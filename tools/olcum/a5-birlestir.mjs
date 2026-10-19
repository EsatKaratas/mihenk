#!/usr/bin/env node
// ============================================================================
// A5 etiket birleştirme ve denetim başarımı — §55 sonrası, OZET §9.
// Yalnız okur; docs/olcum/a5/a5-etiketli.csv yazar ve sonuçları konsola basar.
//
// Etiketler: W4 (tek K, etiket-W4.json) + W1 (çift K, etiket-W1.json) = birincil;
// W3 (ikinci-kontrol-w3.json, I-no) = kör ikinci kontrol.
// "Kusurlu" = yanlış YA DA belirsiz (müdür tanımı). "Sağlam" = doğru.
//
// AĞIRLIKLANDIRMA (yakalama / yanlış alarm, 392 birincil ÇSS'ye genelleme):
//   bayrak(A1 ∪ A2) taşıyan her ÇSS (b) kümesinde → TAM SAYIM, ağırlık 1.
//   bayraksız ÇSS'ler için etiketli olanlar ((a) ∩ bayraksız + (c)) aynı
//   model×sıcaklık tabakasındaki tüm bayraksızları temsil eder:
//   ağırlık = tabakadaki bayraksız sayısı / tabakadaki etiketli bayraksız sayısı.
//   (a) bayraklardan bağımsız seçildi (tekrar 1, s0,5), (c) bayraksızlardan
//   tohumlu rastgele; ikisinin birleşimi rastgele örneklem sayılır — varsayım.
// A1 = çözücü anahtardan farklı · A2 = hesap uyuşmazlığı ya da hesap başka şıkla
// tutuyor · A3 = uzunSikIpucu (b'nin bayrağı değil; ağırlıklarla ayrı hesaplanır)
// · SIKIFADE (doğru şıkta işlem ifadesi) (b)'ye girer ama A1/A2 başarımına katılmaz.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = path.join(KOK, 'docs', 'olcum', 'a5');
const oku = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));

function csvOku(metin) {
  const satirlar = []; let alan = '', satir = [], tirnak = false;
  const s = metin.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (tirnak) { if (c === '"' && s[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; satir.push(alan); alan = ''; if (satir.length > 1 || satir[0] !== '') satirlar.push(satir); satir = []; }
    else alan += c;
  }
  if (alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [b, ...v] = satirlar; return v.map((r) => Object.fromEntries(b.map((k, j) => [k, r[j] ?? ''])));
}
const evet = (v) => v === '1' || v === 'true' || v === true;
const yz = (a, b) => (b ? `${(100 * a / b).toFixed(1)}%` : '—');

// --- birincil etiketler ----------------------------------------------------
const w1 = oku('etiket-W1.json').kararlar;
const w4 = oku('etiket-W4.json').etiketler;
const etiket = {};
for (const [k, x] of Object.entries(w1)) etiket[k] = { karar: x.karar, anhYok: x.dogruCevap === 'Hiçbiri', etiketleyen: 'W1', dogruCevap: x.dogruCevap };
for (const [k, x] of Object.entries(w4)) {
  if (etiket[k]) throw new Error(`${k} iki etiketleyicide`);
  etiket[k] = { karar: x.anahtar, anhYok: (x.kodlar || []).includes('ANH-YOK') || x.dogru_sik === 'Hiçbiri', etiketleyen: 'W4', dogruCevap: x.dogru_sik, kodlar: (x.kodlar || []).join(' '), sikifade: /SIKIFADE/.test(x.not || '') };
}

// --- tüm ÇSS (birleşik CSV) -----------------------------------------------
const tum = csvOku(fs.readFileSync(path.join(D, 'a5-birlesik.csv'), 'utf8')).filter((r) => r.fellBack !== '1');
for (const r of tum) {
  r.A1 = evet(r.cozucu_uyusmazlik);
  r.A2 = evet(r.hesapUyusmazligi) || !!r.hesapBaskaSik;
  r.A3 = evet(r.uzunSikIpucu);
  r.SIK = evet(r.sikIfadeIceriyor);
  r.bayrak = r.A1 || r.A2 || r.SIK; // (b) kümesinin tanımı
  r.tabaka = `${r.model}|${r.sicaklik_kosum}`;
  r.et = r.kno ? etiket[r.kno] : null;
}
const eksik = tum.filter((r) => r.kno && !r.et).map((r) => r.kno);
if (eksik.length) throw new Error(`etiketsiz K-no: ${eksik.join(',')}`);
const bayrakliEtiketsiz = tum.filter((r) => r.bayrak && !r.et).length;
if (bayrakliEtiketsiz) throw new Error(`bayraklı ama etiketsiz ${bayrakliEtiketsiz} ÇSS — (b) tam sayım değil`);

// ağırlıklar
const tabakalar = ['A|0.5', 'A|0.2', 'B|0.5', 'B|0.2'];
const agirlik = {};
for (const t of tabakalar) {
  const U = tum.filter((r) => r.tabaka === t && !r.bayrak).length;
  const L = tum.filter((r) => r.tabaka === t && !r.bayrak && r.et).length;
  agirlik[t] = { U, L, w: L ? U / L : 0 };
}
const w = (r) => (r.bayrak ? 1 : agirlik[r.tabaka].w);
const etiketli = tum.filter((r) => r.et);
const kusurlu = (r) => r.et.karar !== 'dogru';

const sonuc = [];
const yaz = (s) => { sonuc.push(s); console.log(s); };

yaz(`Birincil ÇSS ${tum.length} · etiketli ${etiketli.length} (W1 ${etiketli.filter((r) => r.et.etiketleyen === 'W1').length}, W4 ${etiketli.filter((r) => r.et.etiketleyen === 'W4').length}) · bayraklı ${tum.filter((r) => r.bayrak).length} (hepsi etiketli)`);
yaz('Ağırlıklar (bayraksız): ' + tabakalar.map((t) => `${t} U=${agirlik[t].U} L=${agirlik[t].L} w=${agirlik[t].w.toFixed(2)}`).join(' · '));

// (1) (a) kümesi: anahtar doğruluğu, model × sıcaklık (yalnız (a) s0,5 tekrar 1 içerir)
yaz('\n[1] (a) kümesi — anahtar (tekrar 1 · s0,5):');
for (const m of ['A', 'B']) {
  const s = etiketli.filter((r) => r.kumeler.includes('a') && r.model === m);
  const c = (k) => s.filter((r) => r.et.karar === k).length;
  yaz(`  ${m}: n=${s.length} · doğru ${c('dogru')} (${yz(c('dogru'), s.length)}) · yanlış ${c('yanlis')} · belirsiz ${c('belirsiz')} · ANH-YOK ${s.filter((r) => r.et.anhYok).length}`);
}

// (2) yakalama / yanlış alarm (ağırlıklı), model × sıcaklık ve toplam
/* §57: çözücü istemi v2 (gerekçe önce) sonuçları varsa A1 v2 ve A1v2∪A2 de hesaplanır.
   Örneklem tasarımı ve ağırlıklar v1 bayraklarıyla kuruldu; tasarım ağırlıklarıyla
   tahmin, v2 bayrağını yalnız ETİKETLİ maddelerde bilmeyi gerektirir. */
const v2Dosya = path.join(D, 'cozucu-v2.json');
const v2 = fs.existsSync(v2Dosya) ? JSON.parse(fs.readFileSync(v2Dosya, 'utf8')).maddeler : null;
if (v2) for (const r of etiketli) {
  const y = v2[r.kno];
  if (!y || y.http !== 200) throw new Error(`${r.kno}: v2 çözüm yok ya da hatalı`);
  r.A1v2 = y.anahtarUyusmazligi === true;
}
const dedektorler = { A1: (r) => r.A1, A2: (r) => r.A2, 'A1∪A2': (r) => r.A1 || r.A2, A3: (r) => r.A3,
  ...(v2 ? { 'A1v2': (r) => r.A1v2, 'A1v2∪A2': (r) => r.A1v2 || r.A2 } : {}) };
yaz('\n[2] Yakalama (kusurlulardan işaretlenen) / yanlış alarm (sağlamlardan işaretlenen) — ağırlıklı:');
const tablo = [];
for (const kap of ['Toplam', ...tabakalar]) {
  const s = etiketli.filter((r) => kap === 'Toplam' || r.tabaka === kap);
  const K = s.filter(kusurlu).reduce((t, r) => t + w(r), 0);
  const S = s.filter((r) => !kusurlu(r)).reduce((t, r) => t + w(r), 0);
  const satir = { kap, kusurluTahmin: K, saglamTahmin: S };
  for (const [ad, f] of Object.entries(dedektorler)) {
    const yk = s.filter((r) => kusurlu(r) && f(r)).reduce((t, r) => t + w(r), 0);
    const ya = s.filter((r) => !kusurlu(r) && f(r)).reduce((t, r) => t + w(r), 0);
    satir[ad] = { yakalama: K ? yk / K : null, yanlisAlarm: S ? ya / S : null };
  }
  tablo.push(satir);
  yaz(`  ${kap.padEnd(6)} kusurlu≈${K.toFixed(1)} sağlam≈${S.toFixed(1)} | ` +
    Object.keys(dedektorler).map((ad) => `${ad} yak ${satir[ad].yakalama === null ? '—' : (100 * satir[ad].yakalama).toFixed(1) + '%'} / y.a. ${satir[ad].yanlisAlarm === null ? '—' : (100 * satir[ad].yanlisAlarm).toFixed(1) + '%'}`).join(' · '));
}
const kacirma = tablo[0].kusurluTahmin - etiketli.filter((r) => kusurlu(r) && (r.A1 || r.A2)).reduce((t, r) => t + w(r), 0);
yaz(`  Kaçırılan kusurlu (A1∪A2 işaretlemedi), ağırlıklı tahmin: ≈${kacirma.toFixed(1)} / ≈${tablo[0].kusurluTahmin.toFixed(1)} ÇSS (392 içinde)`);
if (v2) {
  const kacirma2 = tablo[0].kusurluTahmin - etiketli.filter((r) => kusurlu(r) && (r.A1v2 || r.A2)).reduce((t, r) => t + w(r), 0);
  yaz(`  Kaçırılan kusurlu (A1v2∪A2 işaretlemedi): ≈${kacirma2.toFixed(1)} / ≈${tablo[0].kusurluTahmin.toFixed(1)}`);
  // W4'ün işaretlediği 9 "gerekçe doğru, harf yanlış" maddesinde v2 ne seçti?
  const dokuz = ['K001', 'K067', 'K069', 'K097', 'K133', 'K139', 'K145', 'K169', 'K171'];
  const duzelen = dokuz.filter((k) => { const r = etiketli.find((x) => x.kno === k); return r && !r.A1v2; });
  yaz(`  W4'ün 9 "harf kayması" maddesinde v2 artık anahtarla uyuşuyor: ${duzelen.length}/9 (${duzelen.join(', ')})`);
  const degisen = etiketli.filter((r) => r.A1 !== r.A1v2);
  yaz(`  A1 bayrağı v1→v2 değişen madde: ${degisen.length} (v1 bayraklı → v2 bayraksız ${degisen.filter((r) => r.A1).length}, tersi ${degisen.filter((r) => !r.A1).length})`);
}

// SIKIFADE: A2 bayraklarının ne kadarı doğru şıkta işlem ifadesi kaynaklı?
const a2 = etiketli.filter((r) => r.A2);
yaz(`\n  A2 bayraklı ${a2.length} ÇSS: doğru şıkta işlem ifadesi (SIKIFADE) ${a2.filter((r) => r.SIK).length} · bunlardan etiketi "doğru" (yanlış alarm) ${a2.filter((r) => r.SIK && !kusurlu(r)).length}`);

// (3) tekrarlar arası tutarlılık — aynı kazanım × model × sıcaklık × sıra, farklı tekrar
yaz('\n[3] Tekrarlar arası tutarlılık (aynı kazanım×model×sıcaklık×sıra; FARKLI üretilmiş sorular):');
const grup = {};
for (const r of etiketli) (grup[`${r.kazanim}|${r.model}|${r.sicaklik_kosum}|${r.sira}`] ||= []).push(r);
let cift = 0, ayni = 0;
for (const g of Object.values(grup)) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { cift++; if (kusurlu(g[i]) === kusurlu(g[j])) ayni++; }
yaz(`  etiketli çift ${cift} · kusurlu/sağlam kararı aynı ${ayni} (${yz(ayni, cift)}) — (b) bayraklı seçildiği için örneklem yanlı; yalnız gösterge`);

// (4) W3 ↔ birincil kör uyuşma (κ)
const es = oku('ikinci-kontrol-esleme.json').maddeler;
const w3 = oku('ikinci-kontrol-w3.json').kararlar;
const S3 = ['dogru', 'yanlis', 'belirsiz'];
const m = Object.fromEntries(S3.map((a) => [a, Object.fromEntries(S3.map((b) => [b, 0]))]));
const uyusmaz = [];
for (const { ino, kno } of es) {
  const a = etiket[kno].karar, b = w3[ino].karar;
  m[a][b]++;
  if (a !== b) uyusmaz.push(`${ino}/${kno}(${etiket[kno].etiketleyen}) ${a}→W3 ${b}`);
}
const n = es.length;
const po = S3.reduce((t, k) => t + m[k][k], 0) / n;
const pe = S3.reduce((t, k) => t + (S3.reduce((u, j) => u + m[k][j], 0) / n) * (S3.reduce((u, i) => u + m[i][k], 0) / n), 0);
const kappa = (po - pe) / (1 - pe);
// ikili: kusurlu mu?
const ik = { kk: 0, ks: 0, sk: 0, ss: 0 };
for (const { ino, kno } of es) { const a = etiket[kno].karar !== 'dogru', b = w3[ino].karar !== 'dogru'; ik[(a ? 'k' : 's') + (b ? 'k' : 's')]++; }
const po2 = (ik.kk + ik.ss) / n, pe2 = ((ik.kk + ik.ks) / n) * ((ik.kk + ik.sk) / n) + ((ik.sk + ik.ss) / n) * ((ik.ks + ik.ss) / n);
yaz(`\n[4] W3 ↔ birincil, n=${n}: satır = birincil, sütun = W3`);
yaz('            ' + S3.map((s) => s.padStart(9)).join(''));
for (const a of S3) yaz(`  ${a.padEnd(9)} ` + S3.map((b) => String(m[a][b]).padStart(9)).join(''));
yaz(`  üç sınıf: uyuşma ${(100 * po).toFixed(1)}% · κ = ${kappa.toFixed(2)}`);
yaz(`  ikili (kusurlu mu?): uyuşma ${(100 * po2).toFixed(1)}% · κ = ${((po2 - pe2) / (1 - pe2)).toFixed(2)}`);
yaz(`  uyuşmazlıklar: ${uyusmaz.join(' · ')}`);

// --- [5] İstatistik: tabakalı bootstrap + Wilson (OZET §9.7) ---------------
/* Tabakalı bootstrap (BOOT_N tekrar, tohumlu): her tabaka × {bayraklı, etiketli
   bayraksız} hücresi KENDİ İÇİNDE yerine koyarak yeniden örneklenir; ağırlıklar
   (tabakadaki bayraksız sayısı / hücredeki etiketli sayısı) sabit kalır. Bayraklı
   hücre tasarımda tam sayımdır; onu da yeniden örneklemek etiketlerin süper-
   popülasyon değişkenliğini katar (bilerek tutucu). %95 GA = 2,5. ve 97,5. yüzdelikler.
   İki yakalama tanımı: "yanlış" (manşet: yalnız karar=yanlış) ve "kusurlu"
   (ikincil: yanlış ∪ belirsiz). Yanlış alarm = doğru etiketlilerden işaretlenen. */
const BOOT_N = 1000, BOOT_TOHUM = 20261019;
function mulberry32(t) { return () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function wilson(k, n, z = 1.96) {
  if (!n) return [null, null];
  const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}
const yzd = (x) => (x === null || x === undefined || Number.isNaN(x) ? '—' : (100 * x).toFixed(1));
const bDedektor = v2 ? { 'A1v2': (r) => r.A1v2, A2: (r) => r.A2, 'A1v2∪A2': (r) => r.A1v2 || r.A2, A3: (r) => r.A3 }
  : { A1: (r) => r.A1, A2: (r) => r.A2, 'A1∪A2': (r) => r.A1 || r.A2, A3: (r) => r.A3 };
const tanimlar = { yanlis: (r) => r.et.karar === 'yanlis', kusurlu: (r) => r.et.karar !== 'dogru' };
function olc(orneklem) {
  const sonuc = {};
  for (const [tAd, tF] of Object.entries(tanimlar)) {
    const K = orneklem.filter(tF).reduce((t, r) => t + w(r), 0);
    const S = orneklem.filter((r) => r.et.karar === 'dogru').reduce((t, r) => t + w(r), 0);
    for (const [dAd, f] of Object.entries(bDedektor)) {
      sonuc[`${dAd}|${tAd}|yak`] = K ? orneklem.filter((r) => tF(r) && f(r)).reduce((t, r) => t + w(r), 0) / K : NaN;
      sonuc[`${dAd}|ya`] = S ? orneklem.filter((r) => r.et.karar === 'dogru' && f(r)).reduce((t, r) => t + w(r), 0) / S : NaN;
    }
  }
  return sonuc;
}
const rnd = mulberry32(BOOT_TOHUM);
const kapsamlar = ['Toplam', ...tabakalar];
const hucreler = (kap) => {
  const s = etiketli.filter((r) => kap === 'Toplam' || r.tabaka === kap);
  const h = {};
  for (const r of s) (h[`${r.tabaka}|${r.bayrak ? 'b' : 'u'}`] ||= []).push(r);
  return Object.values(h);
};
yaz(`\n[5] İstatistik — tabakalı bootstrap (${BOOT_N} tekrar, tohum ${BOOT_TOHUM}); nokta tahmini [%95 GA]:`);
const bootTablo = {};
for (const kap of kapsamlar) {
  const hs = hucreler(kap);
  const nokta = olc(hs.flat());
  const dagilim = {};
  for (let b = 0; b < BOOT_N; b++) {
    const ornek = hs.flatMap((h) => Array.from({ length: h.length }, () => h[Math.floor(rnd() * h.length)]));
    for (const [k, v] of Object.entries(olc(ornek))) (dagilim[k] ||= []).push(v);
  }
  bootTablo[kap] = {};
  for (const [k, v] of Object.entries(nokta)) {
    const s = dagilim[k].filter((x) => !Number.isNaN(x)).sort((x, y) => x - y);
    bootTablo[kap][k] = { nokta: v, alt: s[Math.floor(0.025 * s.length)], ust: s[Math.min(s.length - 1, Math.ceil(0.975 * s.length) - 1)] };
  }
  const g = (k) => { const x = bootTablo[kap][k]; return `${yzd(x.nokta)} [${yzd(x.alt)}–${yzd(x.ust)}]`; };
  yaz(`  ${kap}:`);
  for (const d of Object.keys(bDedektor)) {
    yaz(`    ${d.padEnd(8)} yakalama(yanlış) ${g(`${d}|yanlis|yak`)} · yakalama(kusurlu) ${g(`${d}|kusurlu|yak`)} · yanlış alarm ${g(`${d}|ya`)}`);
  }
}
yaz('\n[6] Wilson %95 GA (basit oranlar):');
for (const [ad, k, n] of [
  ['(a) A5 anahtar doğru — A (70b), istem v2', etiketli.filter((r) => r.kumeler.includes('a') && r.model === 'A' && r.et.karar === 'dogru').length, etiketli.filter((r) => r.kumeler.includes('a') && r.model === 'A').length],
  ['(a) A5 anahtar doğru — B (Scout), istem v2', etiketli.filter((r) => r.kumeler.includes('a') && r.model === 'B' && r.et.karar === 'dogru').length, etiketli.filter((r) => r.kumeler.includes('a') && r.model === 'B').length],
  ['§54 ilk ölçüm anahtar doğru — A, istem v1', 12, 25],
  ['§54 ilk ölçüm anahtar doğru — B, istem v1', 16, 26],
  ['harf-önce deneyi (v1 şablon) yanlış', 3, 3],
  ['gerekçe-önce deneyi (v2 şablon) doğru', 3, 3],
]) {
  const [a, b] = wilson(k, n);
  yaz(`  ${ad}: ${k}/${n} = ${yzd(k / n)}% [${yzd(a)}–${yzd(b)}]`);
}
fs.writeFileSync(path.join(D, 'a5-bootstrap.json'), JSON.stringify({ tohum: BOOT_TOHUM, tekrar: BOOT_N, cozucu: v2 ? 'v2' : 'v1', sonuc: bootTablo }, null, 2) + '\n', 'utf8');

// --- etiketli CSV ----------------------------------------------------------
const sut = ['kno', 'kumeler', 'model', 'sicaklik_kosum', 'kosum', 'kazanim', 'tekrar', 'sira', 'etiketleyen', 'karar', 'anhYok', 'dogruCevap', 'kodlar',
  'A1', 'A2', 'A3', 'SIKIFADE', 'dilUyarisi', 'agirlik', 'dogru_sik', 'cozucu_sik', 'hesap', 'hesapBaskaSik', 'A1v2', 'cozucu_v2_sik'];
const csv = (v) => { const s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? '1' : '0') : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const satirlar = etiketli.map((r) => [r.kno, r.kumeler, r.model, r.sicaklik_kosum, r.kosum, r.kazanim, r.tekrar, r.sira, r.et.etiketleyen, r.et.karar, r.et.anhYok, r.et.dogruCevap, r.et.kodlar || '',
  r.A1, r.A2, r.A3, r.SIK, r.dilUyarisi, w(r).toFixed(3), r.dogru_sik, r.cozucu_sik, r.hesap, r.hesapBaskaSik,
  v2 ? r.A1v2 : '', v2 ? (v2[r.kno].secilenSik ?? '') : ''].map(csv).join(','));
fs.writeFileSync(path.join(D, 'a5-etiketli.csv'), '﻿' + [sut.join(','), ...satirlar].join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(D, 'a5-basarim.txt'), sonuc.join('\n') + '\n', 'utf8');
console.log('\nyazıldı: docs/olcum/a5/a5-etiketli.csv, a5-basarim.txt');
