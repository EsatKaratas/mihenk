#!/usr/bin/env node
// ============================================================================
// Mihenk ölçüm betiği — sabit değerlendirme setiyle (tools/olcum/set-v1.json)
// /api/ai/generate-questions ucunu GERÇEK modelle koşar ve her soruyu kaydeder.
//
// Ne ölçer: sunucunun döndürdüğü her sorunun gövde uzunluğu, sunucu
// denetimlerinin bayrakları (anahtarBelirsiz, gerekceTekrari, dilUyarisi,
// needsSource) ve elenen soru sayaçları (elenenTekrar, elenenAyniSik,
// elenenGecersiz). Ayrıca sunucunun BAKMADIĞI ama betiğin deterministik
// olarak sayabildiği birkaç şeyi sayar (kazanım modunda metne atıf, eksik
// üretim, tür uyuşmazlığı) — bunlar "denetimden kaçan" adaylarıdır.
//
// Ne ÖLÇMEZ: cevap anahtarının olgusal doğruluğu, Latin harfli yabancı
// kelime, kazanım dışı içerik. Bunlar elle kontrol edilir
// (docs/olcum/elle-kontrol.json) ve tools/olcum/ozet.mjs ile birleştirilir.
//
// Kullanım:
//   node tools/olcum/olc.mjs --url http://localhost:8788 --etiket on-kosum
//   node tools/olcum/olc.mjs --url http://localhost:8789 --etiket gercek --sadece MAT.5.4.4,FB.6.2.3
//
// Seçenekler:
//   --url     API kökü (varsayılan http://localhost:8788)
//   --set     set dosyası (varsayılan tools/olcum/set-v1.json)
//   --etiket  "on-kosum" ya da "gercek" (zorunlu — sonuçlar karışmasın diye)
//   --sadece  virgülle ayrılmış kazanım kodları (yalnızca bunlar koşulur)
//   --bekle   iki çağrı arası saniye (varsayılan 13 → dakikada en çok ~4-5)
//   --kuru    model ÇAĞIRMAZ; yalnızca istek gövdelerini yazdırır
//   --src-kok  sunucunun çalıştığı ağaç (ör. ayrı bir git worktree); src özeti ve
//             src commit'i oradan okunur. Verilmezse bu depo.
//   --kosum-ek  koşum adına ek (ör. deneyap) → ayrı CSV dosyası
//   --kaynak-turu  Deneyap maddelerine kaynakTuru:"deneyap" ekler (W2'nin alanı
//             sunucuya girdikten sonra kullanılır; yoksa istem kazanımı "MEB" diye sunar)
//   --tekrar N  her kazanım N kez koşulur (varsayılan 1); her tekrar ayrı docKey ve
//             ayrı ham dosya (KOD-r2.json …) alır
//   --sicaklik X  beklenen üretim sıcaklığı. Sunucu meta.sicaklik ile AYNI değeri
//             döndürmezse betik DURUR: sunucu ölçüm modunda değildir (§55 A5;
//             sunucu `--var APP_ENV:olcum --var OLCUM_SICAKLIK:X` ile başlatılır)
//   --capraz  her ÇSS için POST /api/ai/solve (A1 bağımsız çözüm, cevap anahtarı
//             yalnız sunucuda karşılaştırılır); sonuç soru satırına yazılır
//
// §55 sütunları (tekrar, sicaklik, istemSurumu, hesap…, cozucu_…, elenenler…)
// sona eklendi; eski sütunların sırası değişmedi. Aynı adlı eski bir CSV'ye
// eklenmez (başlık denetimi) — yeni koşum için --kosum-ek verin.
//
// Hız sınırı: sunucu `gen:<docKey>` başına dakikada 5 istek kabul eder
// (src/lib/guards.ts RATE_LIMIT_PER_MIN). Her kazanıma ayrı docKey verilir;
// yine de çağrılar arasında beklenir ki aynı sunucuyu kullanan diğer
// çalışmalar etkilenmesin. 429 alınırsa 65 sn beklenir, en çok 2 kez
// yeniden denenir ve 429 sayısı kayda geçer (gizlenmez).
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
// Sunucunun KENDİ denetim fonksiyonları — ikiz koşul yazmamak için
// kopyalanmaz, doğrudan içe aktarılır (Node 22.18+ tür soyma ile .ts okur).
import { KAYNAK_ATIF, sikImzasi } from '../../src/lib/guards.ts';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function argumanlar(argv) {
  const a = { url: 'http://localhost:8788', set: 'tools/olcum/set-v1.json', bekle: 13, kuru: false, tekrar: 1, sicaklik: null, capraz: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--kuru') { a.kuru = true; continue; }
    if (k === '--kaynak-turu') { a.kaynakTuru = true; continue; }
    if (k === '--capraz') { a.capraz = true; continue; }
    const v = argv[i + 1];
    if (k === '--url') a.url = v;
    else if (k === '--src-kok') a.srcKok = path.resolve(v);
    else if (k === '--set') a.set = v;
    else if (k === '--etiket') a.etiket = v;
    else if (k === '--sadece') a.sadece = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--bekle') a.bekle = Number(v);
    else if (k === '--kosum-ek') a.kosumEk = String(v).replace(/[^a-z0-9]/gi, '');
    else if (k === '--tekrar') a.tekrar = Math.max(1, Math.floor(Number(v)) || 1);
    else if (k === '--sicaklik') a.sicaklik = Number(String(v).replace(',', '.'));
    else throw new Error(`Bilinmeyen seçenek: ${k}`);
    i++;
  }
  if (!['on-kosum', 'gercek'].includes(a.etiket)) {
    throw new Error('--etiket zorunlu: "on-kosum" ya da "gercek"');
  }
  if (a.sicaklik !== null && !(Number.isFinite(a.sicaklik) && a.sicaklik >= 0 && a.sicaklik <= 2)) {
    throw new Error('--sicaklik 0 ile 2 arasında bir sayı olmalı');
  }
  return a;
}

const uyu = (ms) => new Promise((r) => setTimeout(r, ms));

/** İstanbul saatine göre YYYY-MM-DD. */
function bugun() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

function zamanDamgasi() {
  return new Date().toISOString();
}

function betikSurumu() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: KOK }).toString().trim();
    const kirli = execSync('git status --porcelain -- tools/olcum', { cwd: KOK }).toString().trim();
    return kirli ? `${hash}+degisiklik` : hash;
  } catch {
    return 'bilinmiyor';
  }
}

/* Sunucu kodunun o anki hâli. wrangler dev dosya değişince kendini yeniden
   yükler; başka bir çalışma src/'yi düzenlerse koşumun ortasında istem
   değişebilir. Her çağrıya istem/denetim dosyalarının özeti ve src/'ye
   dokunan son commit yazılır ki hangi satırın hangi kodla üretildiği bilinsin. */
const SRC_DOSYALARI = ['src/lib/prompts.ts', 'src/lib/guards.ts', 'src/lib/ai.ts', 'src/routes/ai.ts', 'src/schemas/ai.ts'];
function srcDurumu(kok = KOK) {
  const h = createHash('sha256');
  // Satır sonu farkı (CRLF/LF) istemi değiştirmez; özet içerikten alınır.
  for (const f of SRC_DOSYALARI) h.update(fs.readFileSync(path.join(kok, f), 'utf8').replace(/\r\n/g, '\n'));
  let commit = 'bilinmiyor';
  try {
    commit = execSync('git log -1 --format=%h -- src', { cwd: kok }).toString().trim();
    if (execSync('git diff --ignore-cr-at-eol --stat HEAD -- src', { cwd: kok }).toString().trim()) commit += '+kaydedilmemis';
  } catch { /* git yoksa bilinmiyor kalır */ }
  return { src_commit: commit, src_ozet: h.digest('hex').slice(0, 12) };
}

const kelimeSay = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const cumleSay = (s) => String(s || '').split(/[.!?…]+/).map((x) => x.trim()).filter(Boolean).length;
const modelKisaAd = (m) => String(m || 'bilinmiyor').split('/').pop().replace(/[^a-zA-Z0-9.\-]/g, '_');

/** CSV alanı — virgül, tırnak ya da satır sonu varsa tırnaklanır. */
function csvAlan(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvSatir = (dizi) => dizi.map(csvAlan).join(',');

const SORU_SUTUNLARI = [
  'tarih', 'kosum', 'etiket', 'set_surum', 'betik_surum', 'model_sunucu', 'model_yanit', 'fellBack', 'attempts',
  'src_commit', 'src_ozet', 'kazanim', 'mufredat', 'kaynak_turu', 'ders', 'sinif', 'tur', 'sira', 'govde_kelime', 'govde_cumle', 'govde_40_ustu',
  'sik_sayisi', 'dogru_sik', 'gerekce_sayisi', 'eksik_gerekce', 'kalip_gerekce',
  'anahtarBelirsiz', 'gerekceTekrari', 'dilUyarisi', 'needsSource', 'kaynak_atif_govde',
  'bloom', 'zorluk', 'aiTime', 'govde', 'siklar', 'gerekceler',
  // §55 — sona eklendi (eski sütun sırası korunur)
  'tekrar', 'sicaklik', 'istemSurumu', 'hesap', 'hesapUyusmazligi', 'hesapBaskaSik', 'uzunSikIpucu',
  'cozucu_http', 'cozucu_model', 'cozucu_capraz', 'cozucu_sik', 'cozucu_guven', 'cozucu_cozulemedi', 'cozucu_uyusmazlik', 'cozucu_gerekce',
];

const CAGRI_SUTUNLARI = [
  'tarih', 'kosum', 'etiket', 'set_surum', 'betik_surum', 'model_sunucu', 'model_yanit', 'fellBack', 'attempts',
  'src_commit', 'src_ozet', 'kazanim', 'mufredat', 'kaynak_turu', 'http', 'hata_sinifi', 'hata_kodu', 'hata_mesaji', 'sure_ms', 'denemeler_429', 'denemeler_503',
  'istenen', 'istenen_mc', 'istenen_open', 'uretilen', 'donen_mc', 'donen_open',
  'elenenTekrar', 'elenenAyniSik', 'elenenGecersiz', 'eksik_uretim', 'kisiltmaNotu',
  // §51b (e35628f) sonrası sunucu sayaçları; eski sunucuda boş kalır.
  'sadelestirilenGerekce', 'toplamGerekce',
  // §55 — sona eklendi
  'tekrar', 'sicaklik', 'istemSurumu', 'hesapUyusmazligi', 'hesapOkunamadi', 'uzunSikIpucu',
  'elenenler_sayisi', 'elenenler_ayniTur_tekrar', 'elenenler_json',
];

// wrangler dev yeniden yüklenirken uçuştaki istek bu metinlerle düşer.
// Bunlar MODEL hatası değil, ORTAM hatasıdır; ayrı sınıflanır.
const ORTAM_HATASI = /restarted mid-request|Network connection lost/i;

// §47 kalıbı. Sunucu bunu keser; betik kesilmeyen kaldı mı diye bakar.
const KALIP_GEREKCE = /^\s*bu\s+(ş[ıi]kk[ıi]|seçene[ğg]i|cevab[ıi])\s/i;

async function istekGonder(url, govde, uc = '/api/ai/generate-questions') {
  let denemeler429 = 0;
  let denemeler503 = 0;
  for (;;) {
    const t0 = Date.now();
    let http = 0;
    let yanit = null;
    let agHatasi = null;
    try {
      const r = await fetch(`${url}${uc}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(govde),
      });
      http = r.status;
      const metin = await r.text();
      try { yanit = JSON.parse(metin); } catch { yanit = { hamMetin: metin.slice(0, 2000) }; }
    } catch (e) {
      agHatasi = e instanceof Error ? e.message : String(e);
    }
    const sureMs = Date.now() - t0;
    if (http === 429 && denemeler429 < 2) {
      denemeler429++;
      console.log(`  429 hız sınırı — 65 sn bekleniyor (${denemeler429}/2)`);
      await uyu(65000);
      continue;
    }
    // wrangler dev'in "Your worker restarted mid-request" yanıtı: model hatası
    // değil, sunucu kodunun yeniden yüklenmesi. Bir kez yeniden denenir ve sayılır.
    if (http === 503 && denemeler503 < 1 && ORTAM_HATASI.test(JSON.stringify(yanit || ''))) {
      denemeler503++;
      console.log('  503 (sunucu yeniden yüklendi) — 15 sn sonra 1 kez yeniden deneniyor');
      await uyu(15000);
      continue;
    }
    return { http, yanit, sureMs, denemeler429, denemeler503, agHatasi };
  }
}

async function main() {
  const a = argumanlar(process.argv);
  const set = JSON.parse(fs.readFileSync(path.resolve(KOK, a.set), 'utf8'));
  const maddeler = a.sadece ? set.maddeler.filter((m) => a.sadece.includes(m.kod)) : set.maddeler;
  if (!maddeler.length) throw new Error('Koşulacak kazanım yok (--sadece eşleşmedi).');

  const durum = await fetch(`${a.url}/api/ai/status`).then((r) => r.json());
  const modelSunucu = durum.model;
  const tarih = bugun();
  const betik = betikSurumu();
  // --kosum-ek: aynı gün aynı etiketle FARKLI sunucu koduyla koşulan parça ayrı dosyaya
  // yazılır (ör. "deneyap"); sütunları farklı eski dosyaya eklenmez.
  const kosum = `${tarih}-${modelKisaAd(modelSunucu)}-${a.etiket}${a.kosumEk ? '-' + a.kosumEk : ''}`;
  console.log(`Koşum ${kosum} · sunucu ${a.url} · model ${modelSunucu} · yedek ${durum.fallback ? durum.fallback.model : 'yok'} · betik ${betik}`);
  console.log(`${maddeler.length} kazanım, çağrılar arası ${a.bekle} sn.`);

  const hamDizin = path.join(KOK, 'docs', 'olcum', 'ham', kosum);
  const soruCsv = path.join(KOK, 'docs', 'olcum', `${kosum}.csv`);
  const cagriCsv = path.join(KOK, 'docs', 'olcum', `${kosum}-cagrilar.csv`);
  if (!a.kuru) {
    fs.mkdirSync(hamDizin, { recursive: true });
    // BOM: Excel'in Türkçe karakterleri UTF-8 okuması için. Dosya yoksa başlık yazılır;
    // varsa sona eklenir (aynı koşum --sadece ile parça parça tamamlanabilir).
    for (const [dosya, sutunlar] of [[soruCsv, SORU_SUTUNLARI], [cagriCsv, CAGRI_SUTUNLARI]]) {
      const baslik = csvSatir(sutunlar);
      if (!fs.existsSync(dosya)) { fs.writeFileSync(dosya, '﻿' + baslik + '\n', 'utf8'); continue; }
      // Sütunlar değiştiyse eski dosyaya eklemek satırları kaydırır — sessizce yapılmaz.
      const mevcut = fs.readFileSync(dosya, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0];
      if (mevcut !== baslik) throw new Error(`${path.basename(dosya)} başlığı betiğin sütunlarıyla uyuşmuyor; eklenmedi.`);
    }
  }

  const ortak = { tarih, kosum, etiket: a.etiket, set_surum: set.surum, betik_surum: betik, model_sunucu: modelSunucu };

  const isler = [];
  for (const m of maddeler) for (let t = 1; t <= a.tekrar; t++) isler.push({ m, t });
  for (let i = 0; i < isler.length; i++) {
    const { m, t: tekrar } = isler[i];
    const govde = {
      ...set.istek,
      subject: m.ders,
      grade: String(m.sinif),
      outcomeCode: m.kod,
      outcomeLabel: m.metin,
      topicArea: m.grup,
      docKey: `olcum-${set.surum}-${kosum}-${m.kod}${a.tekrar > 1 ? '-r' + tekrar : ''}`,
      ...(a.kaynakTuru && m.mufredat === 'Deneyap' ? { kaynakTuru: 'deneyap' } : {}),
    };
    if (a.kuru) { console.log(JSON.stringify(govde)); continue; }

    console.log(`[${i + 1}/${isler.length}] ${m.kod}${a.tekrar > 1 ? ' (tekrar ' + tekrar + ')' : ''} …`);
    const src = srcDurumu(a.srcKok);
    const { http, yanit, sureMs, denemeler429, denemeler503, agHatasi } = await istekGonder(a.url, govde);
    const meta = (yanit && yanit.meta) || {};
    const sorular = (yanit && Array.isArray(yanit.questions)) ? yanit.questions : [];

    // §55 A5: sunucu istenen sıcaklığı GERÇEKTEN kullandı mı? Kullanmadıysa koşum geçersizdir.
    if (http === 200 && a.sicaklik !== null && meta.sicaklik !== a.sicaklik) {
      throw new Error(`Sunucu sıcaklığı ${meta.sicaklik} döndürdü, beklenen ${a.sicaklik}. Sunucu ölçüm modunda değil ` +
        '(--var APP_ENV:olcum --var OLCUM_SICAKLIK:...). Koşum DURDURULDU.');
    }

    // §55 A1: her ÇSS için bağımsız çözüm (cevap anahtarı yalnız sunucuda karşılaştırılır).
    const cozumler = new Map();
    if (a.capraz && http === 200) {
      for (const q of sorular.filter((x) => x.type === 'mc')) {
        const c = await istekGonder(a.url, { questionBody: q.body, options: q.options, anahtar: q.correctKey, outcomeLabel: m.metin }, '/api/ai/solve');
        cozumler.set(q, c);
      }
    }

    fs.writeFileSync(
      path.join(hamDizin, `${m.kod}${a.tekrar > 1 ? '-r' + tekrar : ''}.json`),
      JSON.stringify({ zaman: zamanDamgasi(), ...ortak, ...src, tekrar, istek: govde, http, sureMs, denemeler429, denemeler503, agHatasi, yanit,
        ...(cozumler.size ? { cozumler: [...cozumler.entries()].map(([q, c]) => ({ govde: q.body, http: c.http, yanit: c.yanit })) } : {}) }, null, 2) + '\n',
      'utf8'
    );

    const donenMc = sorular.filter((q) => q.type === 'mc').length;
    const donenOpen = sorular.filter((q) => q.type === 'open').length;
    const elenenToplam = (meta.elenenTekrar || 0) + (meta.elenenAyniSik || 0) + (meta.elenenGecersiz || 0);
    // Sunucunun meta'da SÖYLEMEDİĞİ açık: model istenenden az soru döndürürse
    // hiçbir sayaç artmaz. istenen − dönen − elenenler bunu ortaya çıkarır.
    const eksikUretim = http === 200 ? (meta.istenen ?? govde.mcCount + govde.openCount) - sorular.length - elenenToplam : '';

    const cagri = {
      ...ortak, ...src, model_yanit: meta.model || '', fellBack: meta.fellBack, attempts: meta.attempts,
      kazanim: m.kod, mufredat: m.mufredat || 'MEB', kaynak_turu: govde.kaynakTuru || '(yok)', http,
      hata_sinifi: http === 200 ? '' : (agHatasi || ORTAM_HATASI.test(JSON.stringify(yanit || '')) ? 'ortam' : 'sunucu_model'),
      hata_kodu: (yanit && yanit.error) || (agHatasi ? 'ag_hatasi' : ''),
      hata_mesaji: (yanit && yanit.message) || agHatasi || '', sure_ms: sureMs, denemeler_429: denemeler429, denemeler_503: denemeler503,
      istenen: meta.istenen ?? '', istenen_mc: govde.mcCount, istenen_open: govde.openCount,
      uretilen: meta.uretilen ?? '', donen_mc: donenMc, donen_open: donenOpen,
      elenenTekrar: meta.elenenTekrar ?? '', elenenAyniSik: meta.elenenAyniSik ?? '',
      elenenGecersiz: meta.elenenGecersiz ?? '', eksik_uretim: eksikUretim, kisiltmaNotu: meta.kisiltmaNotu || '',
      sadelestirilenGerekce: meta.sadelestirilenGerekce ?? '', toplamGerekce: meta.toplamGerekce ?? '',
      tekrar, sicaklik: meta.sicaklik ?? '', istemSurumu: meta.istemSurumu ?? '',
      hesapUyusmazligi: meta.hesapUyusmazligi ?? '', hesapOkunamadi: meta.hesapOkunamadi ?? '', uzunSikIpucu: meta.uzunSikIpucu ?? '',
      // Yalnız ölçüm sunucusunda (OLCUM_HAM=1) dolu; aksi hâlde boş (bilinmiyor, 0 değil).
      elenenler_sayisi: Array.isArray(meta.elenenler) ? meta.elenenler.length : '',
      elenenler_ayniTur_tekrar: Array.isArray(meta.elenenler) ? meta.elenenler.filter((e) => e.benzedigi === 'ayniTur').length : '',
      elenenler_json: Array.isArray(meta.elenenler) ? JSON.stringify(meta.elenenler) : '',
    };
    fs.appendFileSync(cagriCsv, csvSatir(CAGRI_SUTUNLARI.map((k) => cagri[k])) + '\n', 'utf8');

    sorular.forEach((q, sira) => {
      const secenekler = Array.isArray(q.options) ? q.options : [];
      const gerekceler = q.distractorRationale && typeof q.distractorRationale === 'object' ? q.distractorRationale : {};
      const celdiriciler = secenekler.filter((o) => o.key !== q.correctKey).map((o) => o.key);
      const satir = {
        ...cagri,
        ders: m.ders, sinif: m.sinif, tur: q.type, sira: sira + 1,
        govde_kelime: kelimeSay(q.body), govde_cumle: cumleSay(q.body), govde_40_ustu: kelimeSay(q.body) >= 40,
        sik_sayisi: q.type === 'mc' ? secenekler.length : '',
        dogru_sik: q.type === 'mc' ? q.correctKey : '',
        gerekce_sayisi: q.type === 'mc' ? Object.values(gerekceler).filter((g) => String(g || '').trim()).length : '',
        eksik_gerekce: q.type === 'mc' ? celdiriciler.filter((k) => !String(gerekceler[k] || '').trim()).length : '',
        kalip_gerekce: q.type === 'mc' ? Object.values(gerekceler).filter((g) => KALIP_GEREKCE.test(String(g || ''))).length : '',
        anahtarBelirsiz: q.type === 'mc' ? !!q.anahtarBelirsiz : '',
        gerekceTekrari: q.type === 'mc' ? !!q.gerekceTekrari : '',
        dilUyarisi: !!q.dilUyarisi,
        needsSource: !!q.needsSource,
        // Kazanım modunda sunucu needsSource'u koşulsuz false yapar (ai.ts §31);
        // yani gövde metne atıf yapsa da hiçbir bayrak kalkmaz. Bunu betik sayar.
        kaynak_atif_govde: KAYNAK_ATIF.test(String(q.body || '')),
        bloom: q.bloom || '', zorluk: q.difficulty || '', aiTime: q.aiTime ?? '',
        govde: q.body || '',
        siklar: secenekler.map((o) => `${o.key}) ${o.text}`).join(' | '),
        gerekceler: Object.entries(gerekceler).map(([k, g]) => `${k}: ${g}`).join(' | '),
        hesap: q.hesap || '', hesapUyusmazligi: q.type === 'mc' ? (q.hesapUyusmazligi ?? '') : '',
        hesapBaskaSik: q.hesapBaskaSik || '', uzunSikIpucu: q.type === 'mc' ? !!q.uzunSikIpucu : '',
        ...(() => {
          const c = cozumler.get(q);
          if (!c) return {};
          const y = c.yanit || {};
          return {
            cozucu_http: c.http, cozucu_model: (y.meta && y.meta.model) || '', cozucu_capraz: y.meta ? !!y.meta.capraz : '',
            cozucu_sik: y.secilenSik ?? '', cozucu_guven: y.guven ?? '', cozucu_cozulemedi: y.cozulemedi ?? '',
            cozucu_uyusmazlik: y.anahtarUyusmazligi ?? '', cozucu_gerekce: y.gerekce || (y.error ? `HATA ${y.error}` : ''),
          };
        })(),
      };
      fs.appendFileSync(soruCsv, csvSatir(SORU_SUTUNLARI.map((k) => satir[k])) + '\n', 'utf8');
    });

    // Aynı tur içinde aynı şık kümesi sunucuda elenir; betik yalnızca
    // sunucunun elediğini doğrulamak için imzaları sayar (bilgi amaçlı).
    const imzalar = sorular.filter((q) => q.type === 'mc').map((q) => sikImzasi(q.options));
    const ayniImza = imzalar.length - new Set(imzalar).size;
    console.log(`  http ${http} · ${(sureMs / 1000).toFixed(1)} sn · dönen ${sorular.length}/${meta.istenen ?? '?'} ` +
      `(mc ${donenMc}, açık ${donenOpen}) · elenen T${meta.elenenTekrar ?? '-'} Ş${meta.elenenAyniSik ?? '-'} G${meta.elenenGecersiz ?? '-'}` +
      ` · eksik ${eksikUretim} · model ${meta.model || '-'}${meta.fellBack ? ' (YEDEK)' : ''}` +
      (meta.sicaklik !== undefined ? ` · s${meta.sicaklik} · istem v${meta.istemSurumu ?? '?'}` : '') +
      (cozumler.size ? ` · çözücü uyuşmaz ${[...cozumler.values()].filter((c) => c.yanit && c.yanit.anahtarUyusmazligi === true).length}/${cozumler.size}` : '') +
      (ayniImza ? ` · DÖNENLERDE aynı şık kümesi ${ayniImza}` : '') +
      (http !== 200 ? ` · HATA ${(yanit && yanit.error) || agHatasi}` : ''));

    if (i < isler.length - 1) await uyu(a.bekle * 1000);
  }
  if (!a.kuru) console.log(`\nYazıldı:\n  ${soruCsv}\n  ${cagriCsv}\n  ${hamDizin}`);
}

main().catch((e) => { console.error('HATA:', e instanceof Error ? e.message : e); process.exit(1); });
