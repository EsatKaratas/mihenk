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
import { fileURLToPath } from 'node:url';
// Sunucunun KENDİ denetim fonksiyonları — ikiz koşul yazmamak için
// kopyalanmaz, doğrudan içe aktarılır (Node 22.18+ tür soyma ile .ts okur).
import { KAYNAK_ATIF, sikImzasi } from '../../src/lib/guards.ts';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function argumanlar(argv) {
  const a = { url: 'http://localhost:8788', set: 'tools/olcum/set-v1.json', bekle: 13, kuru: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--kuru') { a.kuru = true; continue; }
    const v = argv[i + 1];
    if (k === '--url') a.url = v;
    else if (k === '--set') a.set = v;
    else if (k === '--etiket') a.etiket = v;
    else if (k === '--sadece') a.sadece = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--bekle') a.bekle = Number(v);
    else throw new Error(`Bilinmeyen seçenek: ${k}`);
    i++;
  }
  if (!['on-kosum', 'gercek'].includes(a.etiket)) {
    throw new Error('--etiket zorunlu: "on-kosum" ya da "gercek"');
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
  'kazanim', 'ders', 'sinif', 'tur', 'sira', 'govde_kelime', 'govde_cumle', 'govde_40_ustu',
  'sik_sayisi', 'dogru_sik', 'gerekce_sayisi', 'eksik_gerekce', 'kalip_gerekce',
  'anahtarBelirsiz', 'gerekceTekrari', 'dilUyarisi', 'needsSource', 'kaynak_atif_govde',
  'bloom', 'zorluk', 'aiTime', 'govde', 'siklar', 'gerekceler',
];

const CAGRI_SUTUNLARI = [
  'tarih', 'kosum', 'etiket', 'set_surum', 'betik_surum', 'model_sunucu', 'model_yanit', 'fellBack', 'attempts',
  'kazanim', 'http', 'hata_kodu', 'hata_mesaji', 'sure_ms', 'denemeler_429',
  'istenen', 'istenen_mc', 'istenen_open', 'uretilen', 'donen_mc', 'donen_open',
  'elenenTekrar', 'elenenAyniSik', 'elenenGecersiz', 'eksik_uretim', 'kisiltmaNotu',
];

// §47 kalıbı. Sunucu bunu keser; betik kesilmeyen kaldı mı diye bakar.
const KALIP_GEREKCE = /^\s*bu\s+(ş[ıi]kk[ıi]|seçene[ğg]i|cevab[ıi])\s/i;

async function istekGonder(url, govde) {
  let denemeler429 = 0;
  for (;;) {
    const t0 = Date.now();
    let http = 0;
    let yanit = null;
    let agHatasi = null;
    try {
      const r = await fetch(`${url}/api/ai/generate-questions`, {
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
    return { http, yanit, sureMs, denemeler429, agHatasi };
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
  const kosum = `${tarih}-${modelKisaAd(modelSunucu)}-${a.etiket}`;
  console.log(`Koşum ${kosum} · sunucu ${a.url} · model ${modelSunucu} · yedek ${durum.fallback ? durum.fallback.model : 'yok'} · betik ${betik}`);
  console.log(`${maddeler.length} kazanım, çağrılar arası ${a.bekle} sn.`);

  const hamDizin = path.join(KOK, 'docs', 'olcum', 'ham', kosum);
  const soruCsv = path.join(KOK, 'docs', 'olcum', `${kosum}.csv`);
  const cagriCsv = path.join(KOK, 'docs', 'olcum', `${kosum}-cagrilar.csv`);
  if (!a.kuru) {
    fs.mkdirSync(hamDizin, { recursive: true });
    // BOM: Excel'in Türkçe karakterleri UTF-8 okuması için. Dosya yoksa başlık yazılır;
    // varsa sona eklenir (aynı koşum --sadece ile parça parça tamamlanabilir).
    if (!fs.existsSync(soruCsv)) fs.writeFileSync(soruCsv, '﻿' + csvSatir(SORU_SUTUNLARI) + '\n', 'utf8');
    if (!fs.existsSync(cagriCsv)) fs.writeFileSync(cagriCsv, '﻿' + csvSatir(CAGRI_SUTUNLARI) + '\n', 'utf8');
  }

  const ortak = { tarih, kosum, etiket: a.etiket, set_surum: set.surum, betik_surum: betik, model_sunucu: modelSunucu };

  for (let i = 0; i < maddeler.length; i++) {
    const m = maddeler[i];
    const govde = {
      ...set.istek,
      subject: m.ders,
      grade: String(m.sinif),
      outcomeCode: m.kod,
      outcomeLabel: m.metin,
      topicArea: m.grup,
      docKey: `olcum-${set.surum}-${kosum}-${m.kod}`,
    };
    if (a.kuru) { console.log(JSON.stringify(govde)); continue; }

    console.log(`[${i + 1}/${maddeler.length}] ${m.kod} …`);
    const { http, yanit, sureMs, denemeler429, agHatasi } = await istekGonder(a.url, govde);
    const meta = (yanit && yanit.meta) || {};
    const sorular = (yanit && Array.isArray(yanit.questions)) ? yanit.questions : [];

    fs.writeFileSync(
      path.join(hamDizin, `${m.kod}.json`),
      JSON.stringify({ zaman: zamanDamgasi(), ...ortak, istek: govde, http, sureMs, denemeler429, agHatasi, yanit }, null, 2) + '\n',
      'utf8'
    );

    const donenMc = sorular.filter((q) => q.type === 'mc').length;
    const donenOpen = sorular.filter((q) => q.type === 'open').length;
    const elenenToplam = (meta.elenenTekrar || 0) + (meta.elenenAyniSik || 0) + (meta.elenenGecersiz || 0);
    // Sunucunun meta'da SÖYLEMEDİĞİ açık: model istenenden az soru döndürürse
    // hiçbir sayaç artmaz. istenen − dönen − elenenler bunu ortaya çıkarır.
    const eksikUretim = http === 200 ? (meta.istenen ?? govde.mcCount + govde.openCount) - sorular.length - elenenToplam : '';

    const cagri = {
      ...ortak, model_yanit: meta.model || '', fellBack: meta.fellBack, attempts: meta.attempts,
      kazanim: m.kod, http, hata_kodu: (yanit && yanit.error) || (agHatasi ? 'ag_hatasi' : ''),
      hata_mesaji: (yanit && yanit.message) || agHatasi || '', sure_ms: sureMs, denemeler_429: denemeler429,
      istenen: meta.istenen ?? '', istenen_mc: govde.mcCount, istenen_open: govde.openCount,
      uretilen: meta.uretilen ?? '', donen_mc: donenMc, donen_open: donenOpen,
      elenenTekrar: meta.elenenTekrar ?? '', elenenAyniSik: meta.elenenAyniSik ?? '',
      elenenGecersiz: meta.elenenGecersiz ?? '', eksik_uretim: eksikUretim, kisiltmaNotu: meta.kisiltmaNotu || '',
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
      (ayniImza ? ` · DÖNENLERDE aynı şık kümesi ${ayniImza}` : '') +
      (http !== 200 ? ` · HATA ${(yanit && yanit.error) || agHatasi}` : ''));

    if (i < maddeler.length - 1) await uyu(a.bekle * 1000);
  }
  if (!a.kuru) console.log(`\nYazıldı:\n  ${soruCsv}\n  ${cagriCsv}\n  ${hamDizin}`);
}

main().catch((e) => { console.error('HATA:', e instanceof Error ? e.message : e); process.exit(1); });
