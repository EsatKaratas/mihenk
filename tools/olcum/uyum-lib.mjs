// ============================================================================
// Uyum ve aralık istatistikleri — saf fonksiyonlar, dosya okumaz, model çağırmaz.
// Kullananlar: tools/olcum/dogrula.mjs (yeniden üretim), tools/olcum/uyum.mjs
// (kör etiketleme aracının çıktıları), test/arastirma-araclari.test.ts.
//
// RNG: mulberry32 — a5-birlestir.mjs ve puanlama-analiz.mjs ile birebir aynı
// fonksiyon; aynı tohumla aynı diziyi verir (yeniden üretim buna dayanır).
// ============================================================================

/** Tohumlu, deterministik [0,1) üreteci (mulberry32). */
export function mulberry32(tohum) {
  let t = tohum | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Metinden 32 bit tohum (FNV-1a, UTF-16 birimleri). tools/etiket/cekirdek.js ile aynı. */
export function metinTohumu(metin) {
  const s = String(metin);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Wilson skor aralığı (%95, z = 1,96 — a5-birlestir.mjs ile aynı z). */
export function wilson(k, n, z = 1.96) {
  if (!n) return [NaN, NaN];
  const p = k / n, d = 1 + (z * z) / n, c = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [(c - h) / d, (c + h) / d];
}

/**
 * Cohen κ — iki etiketleyici, aynı maddeler. a[i] ve b[i] aynı maddenin
 * etiketleri; null/undefined olan çiftler atlanır.
 * Dönüş: { kappa, po, pe, n, kategoriler, matris }
 */
export function cohenKappa(a, b, kategoriler) {
  if (a.length !== b.length) throw new Error('cohenKappa: uzunluklar farklı');
  const ciftler = [];
  for (let i = 0; i < a.length; i++) if (a[i] != null && b[i] != null) ciftler.push([a[i], b[i]]);
  const n = ciftler.length;
  const K = kategoriler || [...new Set(ciftler.flat())].sort();
  const ix = new Map(K.map((k, i) => [k, i]));
  const m = K.map(() => K.map(() => 0));
  for (const [x, y] of ciftler) {
    if (!ix.has(x) || !ix.has(y)) throw new Error(`cohenKappa: bilinmeyen kategori ${x}/${y}`);
    m[ix.get(x)][ix.get(y)]++;
  }
  if (!n) return { kappa: NaN, po: NaN, pe: NaN, n, kategoriler: K, matris: m };
  const po = K.reduce((s, _, i) => s + m[i][i], 0) / n;
  const pe = K.reduce((s, _, i) => s + (m[i].reduce((u, v) => u + v, 0) / n) * (m.reduce((u, r) => u + r[i], 0) / n), 0);
  // pe = 1 (herkes tek kategoride, tam uyum): κ tanımsız; 1 döndürmek yanıltır.
  const kappa = pe === 1 ? NaN : (po - pe) / (1 - pe);
  return { kappa, po, pe, n, kategoriler: K, matris: m };
}

/**
 * Fleiss κ — 2+ etiketleyici. etiketler[madde][etiketleyici] (null = eksik).
 * Her maddede en az 2 etiket olmalı; daha azı olan madde atlanır. Madde başına
 * etiket sayısı farklı olabilir (genelleştirilmiş P_i formülü).
 * Dönüş: { kappa, pBar, peBar, n (madde), kategoriler }
 */
export function fleissKappa(etiketler, kategoriler) {
  const maddeler = etiketler.map((r) => r.filter((x) => x != null)).filter((r) => r.length >= 2);
  const K = kategoriler || [...new Set(maddeler.flat())].sort();
  const ix = new Map(K.map((k, i) => [k, i]));
  const n = maddeler.length;
  if (!n) return { kappa: NaN, pBar: NaN, peBar: NaN, n, kategoriler: K };
  const toplamKat = K.map(() => 0);
  let toplamEtiket = 0, pToplam = 0;
  for (const r of maddeler) {
    const say = K.map(() => 0);
    for (const x of r) {
      if (!ix.has(x)) throw new Error(`fleissKappa: bilinmeyen kategori ${x}`);
      say[ix.get(x)]++;
    }
    const m = r.length;
    pToplam += (say.reduce((s, c) => s + c * c, 0) - m) / (m * (m - 1));
    say.forEach((c, j) => { toplamKat[j] += c; });
    toplamEtiket += m;
  }
  const pBar = pToplam / n;
  const peBar = toplamKat.reduce((s, c) => s + (c / toplamEtiket) ** 2, 0);
  const kappa = peBar === 1 ? NaN : (pBar - peBar) / (1 - peBar);
  return { kappa, pBar, peBar, n, kategoriler: K };
}

/**
 * Madde düzeyinde yüzdelik bootstrap GA. `istatistik(indisler)` yeniden
 * örneklenmiş madde indisleriyle bir sayı döndürür. NaN tekrarlar atlanır.
 * Dönüş: { alt, ust, gecerli } (%95: 2,5. ve 97,5. yüzdelik).
 */
export function bootstrapGA(n, istatistik, { tekrar = 2000, tohum = 20261019, alfa = 0.05 } = {}) {
  const r = mulberry32(tohum), d = [];
  for (let b = 0; b < tekrar; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(r() * n));
    const v = istatistik(idx);
    if (!Number.isNaN(v)) d.push(v);
  }
  d.sort((x, y) => x - y);
  if (!d.length) return { alt: NaN, ust: NaN, gecerli: 0 };
  const alt = d[Math.floor((alfa / 2) * d.length)];
  const ust = d[Math.min(d.length - 1, Math.ceil((1 - alfa / 2) * d.length) - 1)];
  return { alt, ust, gecerli: d.length };
}

/** Basit CSV okuyucu (tırnaklı alan, BOM). a5-birlestir.mjs'teki ile aynı davranış. */
export function csvOku(metin) {
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
  const [b, ...v] = satirlar;
  return v.map((r) => Object.fromEntries(b.map((k, j) => [k, r[j] ?? ''])));
}
