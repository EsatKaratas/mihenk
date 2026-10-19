#!/usr/bin/env node
// ============================================================================
// Mihenk ölçüm özeti — olc.mjs'nin yazdığı CSV'leri ve elle kontrol dosyasını
// (docs/olcum/elle-kontrol.json) birleştirip model × hata kodu tablosu üretir.
// Kodlar docs/HATA_TAKSONOMISI.md v0.1'deki adlarla AYNEN kullanılır.
//
// Kullanım:
//   node tools/olcum/ozet.mjs --etiket on-kosum            → stdout'a Markdown
//   node tools/olcum/ozet.mjs --etiket gercek --yaz         → docs/olcum/OZET-<etiket>.md
//
// Kural: elle etiketlenen kodlar için oran YALNIZCA elle bakılan sorular
// üzerinden verilir ve paydası (N) her satırda yazılır. Bakılmayan soru
// "hatasız" sayılmaz.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIZIN = path.join(KOK, 'docs', 'olcum');

function argumanlar(argv) {
  const a = { yaz: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--yaz') { a.yaz = true; continue; }
    if (argv[i] === '--etiket') { a.etiket = argv[++i]; continue; }
    throw new Error(`Bilinmeyen seçenek: ${argv[i]}`);
  }
  if (!a.etiket) throw new Error('--etiket zorunlu (on-kosum | gercek)');
  return a;
}

/** RFC 4180 CSV okuyucu (tırnaklı alan, "" kaçışı, alan içi satır sonu). */
function csvOku(dosya) {
  const s = fs.readFileSync(dosya, 'utf8').replace(/^﻿/, '');
  const satirlar = [];
  let alan = '', satir = [], tirnak = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (tirnak) {
      if (ch === '"' && s[i + 1] === '"') { alan += '"'; i++; }
      else if (ch === '"') tirnak = false;
      else alan += ch;
    } else if (ch === '"') tirnak = true;
    else if (ch === ',') { satir.push(alan); alan = ''; }
    else if (ch === '\n') { satir.push(alan.replace(/\r$/, '')); satirlar.push(satir); satir = []; alan = ''; }
    else alan += ch;
  }
  if (alan || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [baslik, ...veri] = satirlar;
  return veri.filter((r) => r.length > 1).map((r) => Object.fromEntries(baslik.map((b, i) => [b, r[i] ?? ''])));
}

const bir = (v) => v === '1' || v === 'true';
const oran = (x, n) => (n ? `${((100 * x) / n).toFixed(1).replace('.', ',')}` : '—');
const hucre = (x, n) => (n ? `${x} / ${n} (%${oran(x, n)})` : '— (N=0)');

// Yarı otomatik adaylar — karar elle verilir (taksonomi E).
const GVD_KALIP = /(\bnedir\s*\?|a[şs]a[ğg][ıi]dakilerden\s+hangisi)/i;
function yinelemeAdayi(govde) {
  const cumleler = String(govde || '').split(/[.!?…]+/).map((x) => x.trim().toLocaleLowerCase('tr')).filter((x) => x.length > 15);
  return cumleler.length !== new Set(cumleler).size;
}

function main() {
  const a = argumanlar(process.argv);
  // <tarih>-<model>-<etiket>[-<ek>].csv — ek: aynı gün farklı sunucu koduyla koşulan parça.
  const desen = new RegExp(`-${a.etiket}(-[a-z0-9]+)?\\.csv$`, 'i');
  const soruDosyalari = fs.readdirSync(DIZIN).filter((f) => desen.test(f) && !/-cagrilar\.csv$/.test(f));
  if (!soruDosyalari.length) throw new Error(`docs/olcum altında -${a.etiket} koşumu yok.`);

  const elleYol = path.join(DIZIN, 'elle-kontrol.json');
  const elle = fs.existsSync(elleYol) ? JSON.parse(fs.readFileSync(elleYol, 'utf8')) : { etiketler: {} };

  const cikti = [];
  const yaz = (s = '') => cikti.push(s);
  yaz(`# Mihenk ölçüm özeti — ${a.etiket === 'on-kosum' ? 'ÖN KOŞUM' : 'GERÇEK KOŞUM'}`);
  yaz();
  yaz(`Üretildi: ${new Date().toISOString()} · \`node tools/olcum/ozet.mjs --etiket ${a.etiket}\``);
  yaz(`Taksonomi: docs/HATA_TAKSONOMISI.md v0.1 · Elle kontrol: ${elle.kontrolEden || '(yok)'}`);
  yaz();

  const modeller = [];
  for (const f of soruDosyalari.sort()) {
    const kosum = f.slice(0, -4);
    const sorular = csvOku(path.join(DIZIN, f));
    const cagriYol = path.join(DIZIN, `${kosum}-cagrilar.csv`);
    const cagrilar = fs.existsSync(cagriYol) ? csvOku(cagriYol) : [];
    modeller.push({ kosum, sorular, cagrilar });
  }

  // MEB ve Deneyap satırları ayrı bölümde raporlanır (müfredat sütunu yoksa MEB).
  const gruplar = [];
  for (const m of modeller) {
    for (const muf of ['MEB', 'Deneyap']) {
      const ayni = (x) => (x.mufredat || 'MEB') === muf;
      const c = m.cagrilar.filter(ayni);
      if (!c.length) continue;
      gruplar.push({ kosum: m.kosum, baslik: `${m.kosum} · ${muf}`, sorular: m.sorular.filter(ayni), cagrilar: c });
    }
  }

  for (const { kosum, baslik, sorular, cagrilar } of gruplar) {
    const ilk = cagrilar[0] || sorular[0] || {};
    const mc = sorular.filter((q) => q.tur === 'mc');
    const acik = sorular.filter((q) => q.tur === 'open');
    const basarili = cagrilar.filter((c) => c.http === '200');
    // Eleme oranlarının paydası yalnızca BAŞARILI çağrıların istediği sorulardır;
    // düşen çağrıda model hiç soru üretmedi, oraya eleme yazılamaz.
    const topla = (k, dizi = basarili) => dizi.reduce((t, c) => t + (Number(c[k]) || 0), 0);
    const istenen = basarili.reduce((t, c) => t + (Number(c.istenen_mc) || 0) + (Number(c.istenen_open) || 0), 0);
    const sureler = cagrilar.map((c) => Number(c.sure_ms) || 0);
    const yedek = cagrilar.filter((c) => bir(c.fellBack)).length;
    const turUyusmaz = basarili.filter((c) => Number(c.donen_mc) > Number(c.istenen_mc)
      || Number(c.donen_open) > Number(c.istenen_open)).length;
    // Tekrar elemesi açık uçlu soruyu da düşürebilir (ÇSS ile karşılaştırılıyor).
    const acikKalmadi = basarili.filter((c) => Number(c.istenen_open) > 0 && Number(c.donen_open) === 0).length;

    yaz(`## ${baslik}`);
    yaz();
    yaz(`Model (sunucu): \`${ilk.model_sunucu}\` · tarih ${ilk.tarih} · set ${ilk.set_surum} · betik \`${ilk.betik_surum}\``);
    yaz();
    yaz('### Çağrılar');
    yaz();
    yaz('| Ölçü | Değer |');
    yaz('|---|---|');
    yaz(`| Çağrı | ${cagrilar.length} (HTTP 200: ${basarili.length}, hata: ${cagrilar.length - basarili.length}) |`);
    const hatalar = cagrilar.filter((c) => c.http !== '200');
    const ortam = hatalar.filter((c) => c.hata_sinifi === 'ortam');
    const modelHata = hatalar.filter((c) => c.hata_sinifi !== 'ortam');
    yaz(`| Ortam hatası (wrangler yeniden yükleme, 503) | ${ortam.length}${ortam.length ? ' — ' + ortam.map((c) => c.kazanim).join(', ') + ' (yeniden koşuldu)' : ''} |`);
    yaz(`| Sunucu/model hatası | ${modelHata.length}${modelHata.length ? ' — ' + modelHata.map((c) => `${c.kazanim}: ${c.http} ${c.hata_kodu} (${c.hata_mesaji.slice(0, 80)})`).join(' · ') : ''} |`);
    const kapsam = new Set(basarili.map((c) => c.kazanim));
    yaz(`| Başarılı çağrısı olan kazanım | ${kapsam.size} / ${new Set(cagrilar.map((c) => c.kazanim)).size} |`);
    yaz(`| 429 (hız sınırı) beklemesi | ${topla('denemeler_429', cagrilar)} |`);
    yaz(`| Yedek modele düşen | ${yedek} |`);
    yaz(`| Model içi yeniden deneme (attempts > 1) | ${cagrilar.filter((c) => Number(c.attempts) > 1).length} |`);
    yaz(`| Süre (sn) ort · en kısa · en uzun · toplam | ${(sureler.reduce((x, y) => x + y, 0) / 1000 / (sureler.length || 1)).toFixed(1)} · ${(Math.min(...sureler) / 1000).toFixed(1)} · ${(Math.max(...sureler) / 1000).toFixed(1)} · ${(sureler.reduce((x, y) => x + y, 0) / 1000).toFixed(0)} |`);
    yaz(`| İstenen soru (başarılı çağrılarda) | ${istenen} (ÇSS ${topla('istenen_mc')}, açık ${topla('istenen_open')}) |`);
    yaz(`| Kullanıcıya dönen | ${sorular.length} (ÇSS ${mc.length}, açık ${acik.length}) |`);
    yaz();

    yaz('### Otomatik sayılan kodlar (sunucu denetimi)');
    yaz();
    yaz('| Kod | Davranış | Sayı / payda | Payda |');
    yaz('|---|---|---|---|');
    yaz(`| \`TKR-GOVDE\` | ele | ${hucre(topla('elenenTekrar'), istenen)} | istenen soru |`);
    yaz(`| \`TKR-SIK\` | ele | ${hucre(topla('elenenAyniSik'), istenen)} | istenen soru |`);
    yaz(`| \`SIK-SAYI\` | ele | ${hucre(topla('elenenGecersiz'), istenen)} | istenen soru |`);
    yaz(`| \`ANH-GECERSIZ\` | bayrak | ${hucre(mc.filter((q) => bir(q.anahtarBelirsiz)).length, mc.length)} | dönen ÇSS |`);
    yaz(`| \`GRK-TEKRAR\` | bayrak | ${hucre(mc.filter((q) => bir(q.gerekceTekrari)).length, mc.length)} | dönen ÇSS |`);
    yaz(`| \`DIL-ALFABE\` | bayrak | ${hucre(sorular.filter((q) => bir(q.dilUyarisi)).length, sorular.length)} | dönen soru |`);
    const sayacli = basarili.filter((c) => c.toplamGerekce !== undefined && c.toplamGerekce !== '');
    if (sayacli.length) {
      yaz(`| \`GRK-KALIP\` | düzelt | ${hucre(topla('sadelestirilenGerekce', sayacli), topla('toplamGerekce', sayacli))} (meta.sadelestirilenGerekce / toplamGerekce, tekrar elemesinden önce; ${sayacli.length} çağrı) | ham gerekçe |`);
    } else yaz(`| \`GRK-KALIP\` | düzelt | **ölçülemedi** — API yalnızca temizlik SONRASI gerekçeyi döndürüyor; ham çıktı yanıtta yok. Temizlik sonrası kalan: ${hucre(mc.reduce((t, q) => t + (Number(q.kalip_gerekce) || 0), 0), mc.reduce((t, q) => t + (Number(q.gerekce_sayisi) || 0), 0))} | gerekçe |`);
    yaz();

    yaz('### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)');
    yaz();
    yaz('| Kod | Sayı / payda | Not |');
    yaz('|---|---|---|');
    yaz(`| \`KYN-ATIF\` | ${hucre(sorular.filter((q) => bir(q.kaynak_atif_govde)).length, sorular.length)} | Kazanım modunda \`needsSource\` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |`);
    yaz(`| \`GVD-KISA\` (< 40 kelime) | ${hucre(sorular.filter((q) => Number(q.govde_kelime) < 40).length, sorular.length)} | ÇSS: ${hucre(mc.filter((q) => Number(q.govde_kelime) < 40).length, mc.length)} · açık: ${hucre(acik.filter((q) => Number(q.govde_kelime) < 40).length, acik.length)} · ort ${(sorular.reduce((t, q) => t + Number(q.govde_kelime), 0) / (sorular.length || 1)).toFixed(1).replace('.', ',')} kelime |`);
    yaz(`| \`GVD-KALIP\` adayı (yarı) | ${hucre(sorular.filter((q) => GVD_KALIP.test(q.govde)).length, sorular.length)} | aday; karar elle |`);
    yaz(`| \`GVD-YINELEME\` adayı (yarı) | ${hucre(sorular.filter((q) => yinelemeAdayi(q.govde)).length, sorular.length)} | aday; karar elle |`);
    yaz(`| (taksonomide yok) açık uçlu istendi, hiç dönmedi | ${hucre(acikKalmadi, basarili.length)} çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |`);
    yaz(`| (taksonomide yok) eksik üretim | ${hucre(topla('eksik_uretim'), istenen)} | model istenenden az soru döndürdü; meta'da sayacı YOK |`);
    yaz(`| (taksonomide yok) istenenden fazla tür | ${hucre(turUyusmaz, basarili.length)} çağrı | ör. 2 ÇSS istendi, 3 döndü |`);
    yaz(`| (taksonomide yok) eksik çeldirici gerekçesi | ${hucre(mc.reduce((t, q) => t + (Number(q.eksik_gerekce) || 0), 0), mc.reduce((t, q) => t + Math.max(0, Number(q.sik_sayisi) - 1), 0))} | çeldirici |`);
    yaz();

    // Elle etiketler
    const anahtar = { dogru: 0, yanlis: 0, belirsiz: 0 };
    const kodSayac = {};
    let bakilan = 0, bakilanMc = 0;
    for (const q of sorular) {
      const e = elle.etiketler?.[`${kosum}|${q.kazanim}|${q.sira}`];
      if (!e) continue;
      bakilan++;
      if (q.tur === 'mc') { bakilanMc++; if (e.anahtar && anahtar[e.anahtar] !== undefined) anahtar[e.anahtar]++; }
      for (const k of e.kodlar || []) kodSayac[k] = (kodSayac[k] || 0) + 1;
    }
    yaz('### Elle etiketlenen kodlar');
    yaz();
    if (!bakilan) {
      yaz('_Bu koşum için elle kontrol yok._');
    } else {
      yaz(`Elle bakılan: ${bakilan} soru (ÇSS ${bakilanMc}). Oranların paydası yalnızca bakılan sorulardır.`);
      yaz();
      yaz('| Kod | Sayı / bakılan |');
      yaz('|---|---|');
      yaz(`| Cevap anahtarı DOĞRU (ÇSS) | ${hucre(anahtar.dogru, bakilanMc)} |`);
      yaz(`| Cevap anahtarı YANLIŞ (\`ANH-OLGU\`, \`ANH-BIRIM\` dahil) | ${hucre(anahtar.yanlis, bakilanMc)} |`);
      yaz(`| Cevap anahtarı belirsiz / birden çok doğru | ${hucre(anahtar.belirsiz, bakilanMc)} |`);
      for (const k of Object.keys(kodSayac).sort()) yaz(`| \`${k}\` | ${hucre(kodSayac[k], bakilan)} |`);
    }
    yaz();
  }

  const md = cikti.join('\n') + '\n';
  if (a.yaz) {
    const hedef = path.join(DIZIN, `OZET-${a.etiket}.md`);
    fs.writeFileSync(hedef, md, 'utf8');
    console.log(`Yazıldı: ${hedef}`);
  } else {
    process.stdout.write(md);
  }
}

main();
