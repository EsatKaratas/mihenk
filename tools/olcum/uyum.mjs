#!/usr/bin/env node
// ============================================================================
// Kör etiketleme uyumu — `npm run olcum:uyum -- <dosya.json|dizin> ...`
//
// Girdi : tools/etiket/ aracından inen JSON'lar (yalnız takma kod içerir).
// Anahtar: docs/olcum/a5/etiket-kor.json (isaretli_sik) — öğretmene gösterilmedi.
// YZ    : docs/olcum/a5/a5-etiketli.csv `karar` (birincil YZ etiketi, W1/W4).
//
// Öğretmenin "doğru şık" seçimi anahtarla karşılaştırılarak ARASTIRMA §6.8'deki
// üç sınıfa çevrilir (W1/W3 karar kuralıyla aynı):
//   seçilen = anahtar → dogru · seçilen başka harf ya da "YOK" → yanlis ·
//   "BELIRSIZ" → belirsiz.
// Ölçüler: her çift için Cohen κ (3 sınıf + ikili "kusurlu" = karar ≠ dogru),
// 2+ insan için Fleiss κ (yalnız insanlar; insanlar + YZ). %95 GA: madde
// düzeyinde yüzdelik bootstrap (2000 tekrar, tohum 20261019).
//
// `--sentetik`: gerçek dosya olmadan, bilinen gürültüyle üretilmiş 3 sanal
// etiketleyiciyle uçtan uca koşar (doğrulama içindir; sonuç raporlanmaz).
// Model çağırmaz, ağ kullanmaz.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cohenKappa, fleissKappa, bootstrapGA, csvOku, mulberry32 } from './uyum-lib.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SINIFLAR = ['dogru', 'yanlis', 'belirsiz'];
export const YZ_ADI = 'YZ';

/** Öğretmen seçimi + anahtar → üç sınıf. */
export function kararTuret(dogruSik, anahtar) {
  if (dogruSik == null) return null;
  if (dogruSik === 'BELIRSIZ') return 'belirsiz';
  if (dogruSik === 'YOK') return 'yanlis';
  return dogruSik === anahtar ? 'dogru' : 'yanlis';
}

export function anahtarYukle(kok = KOK) {
  const kor = JSON.parse(fs.readFileSync(path.join(kok, 'docs/olcum/a5/etiket-kor.json'), 'utf8'));
  return Object.fromEntries(kor.maddeler.map((m) => [m.kno, m.isaretli_sik]));
}
export function yzYukle(kok = KOK) {
  return Object.fromEntries(csvOku(fs.readFileSync(path.join(kok, 'docs/olcum/a5/a5-etiketli.csv'), 'utf8')).map((r) => [r.kno, r.karar]));
}

/** Dışa aktarımları doğrular; { kod: { id: karar } } ve kusurlu bayrakları döndürür. */
export function etiketciler(disaAktarimlar, anahtar) {
  const sonuc = {}, uyarilar = [];
  for (const d of disaAktarimlar) {
    if (d.arac !== 'mihenk-kor-etiket') throw new Error(`tanınmayan dosya (arac=${d.arac})`);
    const kod = String(d.etiketleyici || '');
    if (!/^(?=.*[0-9])[A-Z0-9][A-Z0-9-]{1,18}[A-Z0-9]$/.test(kod)) throw new Error(`geçersiz takma kod: ${kod}`);
    if (kod === YZ_ADI) throw new Error('"YZ" kodu ayrılmış');
    if (sonuc[kod]) throw new Error(`aynı kod iki dosyada: ${kod}`);
    const karar = {}, kusurlu = {};
    for (const [id, e] of Object.entries(d.etiketler || {})) {
      if (!(id in anahtar)) { uyarilar.push(`${kod}: bilinmeyen madde ${id} atlandı`); continue; }
      karar[id] = kararTuret(e.dogruSik, anahtar[id]);
      kusurlu[id] = e.kusurlu === true;
    }
    sonuc[kod] = { karar, kusurlu, n: Object.keys(karar).length, veriSurumu: d.veriSurumu };
  }
  return { etiketciler: sonuc, uyarilar };
}

function ciftKappa(a, b, ortak, opts) {
  const ikili = (x) => (x == null ? null : x === 'dogru' ? 'saglam' : 'kusurlu');
  const k3 = (idx) => cohenKappa(idx.map((i) => a[ortak[i]]), idx.map((i) => b[ortak[i]]), SINIFLAR).kappa;
  const k2 = (idx) => cohenKappa(idx.map((i) => ikili(a[ortak[i]])), idx.map((i) => ikili(b[ortak[i]])), ['saglam', 'kusurlu']).kappa;
  const tum = ortak.map((_, i) => i);
  const c3 = cohenKappa(tum.map((i) => a[ortak[i]]), tum.map((i) => b[ortak[i]]), SINIFLAR);
  return {
    n: ortak.length, uyusma: c3.po, kappa3: c3.kappa, ga3: bootstrapGA(ortak.length, k3, opts),
    kappa2: k2(tum), ga2: bootstrapGA(ortak.length, k2, opts), matris: c3.matris,
  };
}

/**
 * Ana analiz. etiketler: { kod: { karar: {id: sinif} } }; yz: { id: sinif } (isteğe bağlı).
 * Dönüş: { ciftler: [...], fleissInsan, fleissInsanYz, insanSayisi }
 */
export function uyumAnalizi(etiketler, yz, { tekrar = 2000, tohum = 20261019 } = {}) {
  const opts = { tekrar, tohum };
  const kodlar = Object.keys(etiketler).sort();
  const ciftler = [];
  const ekle = (adA, a, adB, b, tur) => {
    const ortak = Object.keys(a).filter((id) => a[id] != null && b[id] != null).sort();
    ciftler.push({ a: adA, b: adB, tur, ...ciftKappa(a, b, ortak, opts) });
  };
  for (let i = 0; i < kodlar.length; i++) for (let j = i + 1; j < kodlar.length; j++) ekle(kodlar[i], etiketler[kodlar[i]].karar, kodlar[j], etiketler[kodlar[j]].karar, 'insan–insan');
  if (yz) for (const k of kodlar) ekle(k, etiketler[k].karar, YZ_ADI, yz, 'insan–YZ');

  const fleiss = (adlar, kaynak) => {
    if (adlar.length < 2) return null;
    const idler = [...new Set(adlar.flatMap((a) => Object.keys(kaynak(a))))].sort()
      .filter((id) => adlar.every((a) => kaynak(a)[id] != null)); // yalnız herkesin etiketlediği maddeler
    const tablo = idler.map((id) => adlar.map((a) => kaynak(a)[id]));
    const f = fleissKappa(tablo, SINIFLAR);
    return { etiketleyici: adlar, n: idler.length, kappa: f.kappa, ga: bootstrapGA(idler.length, (idx) => fleissKappa(idx.map((i) => tablo[i]), SINIFLAR).kappa, opts) };
  };
  const kaynak = (a) => (a === YZ_ADI ? yz : etiketler[a].karar);
  return {
    insanSayisi: kodlar.length, ciftler,
    fleissInsan: kodlar.length >= 2 ? fleiss(kodlar, kaynak) : null,
    fleissInsanYz: yz && kodlar.length >= 2 ? fleiss([...kodlar, YZ_ADI], kaynak) : null,
  };
}

/** Bilinen gürültüyle sanal dışa aktarım (doğrulama için). p = rastgele sınıfa kayma olasılığı. */
export function sentetikDisaAktarim(kod, gercek, anahtar, p, tohum) {
  const r = mulberry32(tohum), etiketler = {};
  for (const [id, sinif] of Object.entries(gercek)) {
    const s = r() < p ? SINIFLAR[Math.floor(r() * 3)] : sinif;
    const yanlisHarf = ['A', 'B', 'C', 'D'].find((h) => h !== anahtar[id]);
    etiketler[id] = { dogruSik: s === 'dogru' ? anahtar[id] : s === 'belirsiz' ? 'BELIRSIZ' : yanlisHarf, kusurlu: s !== 'dogru', kodlar: [], not: '', sureSn: 0 };
  }
  return { arac: 'mihenk-kor-etiket', aracSurumu: 1, veriSurumu: 'sentetik', etiketleyici: kod, etiketler };
}

const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2).replace('.', ',') : '—');
export function rapor(sonuc, uyarilar = []) {
  const s = [
    `# Etiketleyiciler arası uyum (${sonuc.insanSayisi} insan etiketleyici)`, '',
    '> κ ve %95 GA (madde düzeyinde bootstrap, 2000 tekrar, tohum 20261019). Üç sınıf: doğru / yanlış / belirsiz anahtar.',
    '> İkili: kusurlu (yanlış ∪ belirsiz) mı? YZ = birincil Claude etiketleri (W1/W4, a5-etiketli.csv).', '',
    '| Çift | Tür | n | Uyuşma | κ (3 sınıf) [%95 GA] | κ (ikili) [%95 GA] |', '|---|---|---:|---:|---|---|',
    ...sonuc.ciftler.map((c) => `| ${c.a} – ${c.b} | ${c.tur} | ${c.n} | %${(100 * c.uyusma).toFixed(1).replace('.', ',')} | ${f2(c.kappa3)} [${f2(c.ga3.alt)}; ${f2(c.ga3.ust)}] | ${f2(c.kappa2)} [${f2(c.ga2.alt)}; ${f2(c.ga2.ust)}] |`),
    '',
  ];
  for (const [ad, f] of [['Fleiss κ — yalnız insanlar', sonuc.fleissInsan], ['Fleiss κ — insanlar + YZ', sonuc.fleissInsanYz]]) {
    if (f) s.push(`**${ad}** (${f.etiketleyici.join(', ')}; ortak n = ${f.n}): ${f2(f.kappa)} [${f2(f.ga.alt)}; ${f2(f.ga.ust)}]`, '');
  }
  if (sonuc.insanSayisi < 2) s.push('_İnsan–insan κ ve Fleiss κ için en az 2 insan etiketleyici gerekir._', '');
  if (uyarilar.length) s.push('Uyarılar:', ...uyarilar.map((u) => `- ${u}`), '');
  return s.join('\n');
}

const anaBetik = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (anaBetik) {
  const arg = process.argv.slice(2);
  const anahtar = anahtarYukle(), yz = yzYukle();
  let dosyalar = [];
  if (arg.includes('--sentetik')) {
    dosyalar = [['SENT-01', 0.1, 1], ['SENT-02', 0.1, 2], ['SENT-03', 0.3, 3]].map(([k, p, t]) => sentetikDisaAktarim(k, yz, anahtar, p, t));
  } else {
    const yollar = arg.filter((a) => !a.startsWith('--')).flatMap((a) => (fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter((f) => f.endsWith('.json')).map((f) => path.join(a, f)) : [a]));
    if (!yollar.length) { console.error('Kullanım: npm run olcum:uyum -- <dosya.json|dizin> [...]   ya da   --sentetik'); process.exit(2); }
    dosyalar = yollar.map((y) => JSON.parse(fs.readFileSync(y, 'utf8')));
  }
  const { etiketciler: et, uyarilar } = etiketciler(dosyalar, anahtar);
  console.log(rapor(uyumAnalizi(et, yz), uyarilar));
  if (arg.includes('--sentetik')) console.log('\n_(SENTETİK veri: SENT-01/02 %10, SENT-03 %30 rastgele kayma; gerçek ölçüm değildir.)_');
}
