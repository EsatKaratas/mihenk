// §121 — YZ puanlayıcı denetimi (QWK, SMD, uzunluk–fark ρ, sıra kayması) ve
// madde analizinin tamamlanması (çeldirici etkinliği, açık uçlu güçlük ve
// düzeltilmiş madde–toplam korelasyonu). public/app.js'teki saf fonksiyonlar.
//
// BİLİNEN ÖRNEK (QWK): Cohen (1968) 3×3 tablosu, 200 hasta, iki yargıç.
// Kaynak: DMAR paketi vinyeti "Weighted Kappa: Cohen's 1968 Illustration,
// Worked in Full" (https://cran.r-universe.dev/DMAR/doc/weighted_kappa.html,
// erişim 6 Kasım 2026). Satır = Yargıç B, sütun = Yargıç A:
//   88 10  2 | 14 40  6 | 18 10 12   → karesel ağırlıkla κ = 0,4545455.
// Elle: gözlenen ağırlıklı uyumsuzluk 0,20·1 + 0,10·4 = 0,60; beklenen
// 0,42·1 + 0,17·4 = 1,10; κ = 1 − 0,60/1,10 = 5/11.
//
// Diğer örneklerin hepsi elle hesaplandı; ara adımlar yorumlarda.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}

const ADLAR = [
  'ondalikTr', 'yzDenetimSabitleri', 'ortalamaDizi', 'varyansOrneklem', 'pearsonR', 'siraNumaralari',
  'spearmanRho', 'yarimPuanKategori', 'qwk', 'smdHesapla', 'siraKaymasi', 'yzDenetimOzeti',
  'yzDenetimEsikEtiketi', 'uzunlukIliskiMetni', 'celdiriciAnalizi', 'celdiriciDurumu',
  'maddeToplamKorelasyonu', 'acikMaddeGuclugu',
];
// eslint-disable-next-line no-new-func
const f = new Function(ADLAR.map(fonksiyonMetni).join('\n') + '\nreturn {' + ADLAR.join(',') + '};')() as Record<string, any>;

/** Sayım tablosundan (satır = a, sütun = b) çift dizisi üretir. */
function tablodanCiftler(t: number[][]): { a: number[]; b: number[] } {
  const a: number[] = [], b: number[] = [];
  t.forEach((satir, i) => satir.forEach((adet, j) => { for (let k = 0; k < adet; k++) { a.push(i); b.push(j); } }));
  return { a, b };
}

describe('QWK — Cohen (1968) bilinen örneği ve elle hesaplananlar', () => {
  const COHEN = [[88, 10, 2], [14, 40, 6], [18, 10, 12]];

  it('Cohen 1968 tablosu: κ_karesel = 0,4545455 (±0,001; tam değer 5/11)', () => {
    const { a, b } = tablodanCiftler(COHEN);
    expect(a.length).toBe(200);
    const r = f.qwk(a, b);
    expect(r.n).toBe(200);
    expect(r.kategori).toBe(3);
    expect(Math.abs(r.deger - 0.4545455)).toBeLessThan(0.001);
    expect(r.deger).toBeCloseTo(5 / 11, 12);
  });

  it('simetrik: puanlayıcıların yeri değişince aynı değer', () => {
    const { a, b } = tablodanCiftler(COHEN);
    expect(f.qwk(b, a).deger).toBeCloseTo(f.qwk(a, b).deger, 12);
  });

  it('tam uyum = 1; bağımsız 2×2 (her hücre 1) = 0', () => {
    expect(f.qwk([0, 1, 2, 3], [0, 1, 2, 3]).deger).toBeCloseTo(1, 12);
    // O = [[1,1],[1,1]], marjinaller 2/2: pay = 2, payda = 2 → κ = 0
    expect(f.qwk([0, 0, 1, 1], [0, 1, 0, 1]).deger).toBeCloseTo(0, 12);
  });

  it('kategori aralığı genişletilince (boş uç kategoriler) gözlenen hücreler aynı, ağırlık ölçeği değişir', () => {
    // [0,1] verisi 0..3 aralığında: w = (i−j)²/9; pay = 2/9, payda = 2/9 → yine 0
    expect(f.qwk([0, 0, 1, 1], [0, 1, 0, 1], 0, 3).deger).toBeCloseTo(0, 12);
  });

  it('hesaplanamayan durumlar sayı uydurmaz', () => {
    expect(f.qwk([], []).deger).toBeNull();
    expect(f.qwk([2, 2, 2], [2, 2, 2]).deger).toBeNull();          // tek kategori
    expect(f.qwk([1, 2], [1]).deger).toBeNull();                    // uzunluk farklı
    // aralık verilse de iki puanlayıcı hep aynı tek puanı verdiyse beklenen uyumsuzluk 0
    const r = f.qwk([2, 2, 2], [2, 2, 2], 0, 4);
    expect(r.deger).toBeNull();
    expect(r.neden).toMatch(/aynı puan/);
  });

  it('0,5 adımlı puan ×2 ile tamsayı kategoriye', () => {
    expect([0, 0.5, 2.5, 10].map(f.yarimPuanKategori)).toEqual([0, 1, 5, 20]);
  });
});

describe('SMD — havuzlanmış standart sapma (n−1)', () => {
  it('elle: YZ [2,4,6], öğretmen [1,3,5] → fark 1, s² 4 ve 4, ss 2, SMD 0,5', () => {
    const r = f.smdHesapla([2, 4, 6], [1, 3, 5]);
    expect(r.ortFark).toBeCloseTo(1, 12);
    expect(r.havuzSs).toBeCloseTo(2, 12);
    expect(r.deger).toBeCloseTo(0.5, 12);
  });
  it('işaret: YZ düşükse negatif; varyans farklıysa havuz', () => {
    // YZ [1,2,3] (s² 1), öğretmen [2,4,6] (s² 4): fark −2, ss = √2,5
    const r = f.smdHesapla([1, 2, 3], [2, 4, 6]);
    expect(r.deger).toBeCloseTo(-2 / Math.sqrt(2.5), 12);
  });
  it('değişkenlik yok ya da n < 2 → null', () => {
    expect(f.smdHesapla([3, 3], [3, 3]).deger).toBeNull();
    expect(f.smdHesapla([3], [2]).deger).toBeNull();
  });
});

describe('Spearman ρ, Pearson r, sıra kayması', () => {
  it('eşit değerlere ortalama sıra', () => {
    expect(f.siraNumaralari([5, 6, 7, 8, 7])).toEqual([1, 2, 3.5, 5, 3.5]);
  });
  it('elle: x 1..5, y [5,6,7,8,7] → ρ = 8/√95', () => {
    // dx = [−2,−1,0,1,2], dy = [−2,−1,0,5,2,0,5]: Σdxdy 8, Σdx² 10, Σdy² 9,5
    expect(f.spearmanRho([1, 2, 3, 4, 5], [5, 6, 7, 8, 7])).toBeCloseTo(8 / Math.sqrt(95), 12);
  });
  it('doğrusal olmayan ama tekdüze ilişki ρ = 1, ters yön −1', () => {
    expect(f.spearmanRho([1, 2, 3], [1, 4, 9])).toBeCloseTo(1, 12);
    expect(f.spearmanRho([1, 2, 3], [9, 4, 1])).toBeCloseTo(-1, 12);
  });
  it('Pearson: sabit değişken null', () => {
    expect(f.pearsonR([1, 2, 3], [4, 4, 4])).toBeNull();
  });
  it('sıra kayması: [0,0,1,1,2] → ilk 2 ort 0, son 3 ort 4/3', () => {
    const k = f.siraKaymasi([0, 0, 1, 1, 2]);
    expect(k.nIlk).toBe(2);
    expect(k.nSon).toBe(3);
    expect(k.ilkOrt).toBeCloseTo(0, 12);
    expect(k.sonOrt).toBeCloseTo(4 / 3, 12);
    expect(k.degisim).toBeCloseTo(4 / 3, 12);
    expect(f.siraKaymasi([1])).toBeNull();
  });
});

describe('yzDenetimOzeti — küçük n ve toplu hesap', () => {
  const kayit = (i: number) => ({ qid: 'q1', maxScore: 10, nihai: i % 11, ai: (i % 11) + (i % 3 === 0 ? 0.5 : 0), uzunluk: 40 + i * 5, sira: 1000 + i });

  it('20 çiftten az: yalnız sayım, hiçbir ölçü alanı yok (sayı uydurulmaz)', () => {
    const o = f.yzDenetimOzeti(Array.from({ length: 19 }, (_, i) => kayit(i)));
    expect(o).toEqual({ n: 19, yeterli: false, altN: 20 });
  });

  it('eşikler tek yerde: QWK 0,70, SMD 0,15, alt n 20', () => {
    expect(f.yzDenetimSabitleri()).toEqual({ altN: 20, qwkEsik: 0.70, smdEsik: 0.15, iliskiAlt: 0.10 });
  });

  it('20 çift: QWK/SMD/uyum/ρ/kayma doğrudan fonksiyonlarla aynı', () => {
    const k = Array.from({ length: 20 }, (_, i) => kayit(i));
    const o = f.yzDenetimOzeti(k);
    expect(o.yeterli).toBe(true);
    const ai = k.map((r) => r.ai), ni = k.map((r) => r.nihai);
    expect(o.qwk.deger).toBeCloseTo(f.qwk(ni.map(f.yarimPuanKategori), ai.map(f.yarimPuanKategori), 0, 20).deger, 12);
    expect(o.smd.deger).toBeCloseTo(f.smdHesapla(ai, ni).deger, 12);
    // i % 3 === 0 olan 7 kayıt (0,3,…,18) 0,5 farklı: tam uyum 13/20, bitişik 20/20
    expect(o.tamUyum).toBeCloseTo(13 / 20, 12);
    expect(o.bitisikUyum).toBeCloseTo(1, 12);
    expect(o.uzunluk.n).toBe(20);
    expect(o.uzunluk.rho).toBeCloseTo(f.spearmanRho(k.map((r) => r.uzunluk), k.map((r) => r.ai - r.nihai)), 12);
    expect(o.kayma.n).toBe(20);
    expect(o.kayma.nIlk).toBe(10);
  });

  it('uzunluk yönü ölçümden gelir: fark uzunlukla artıyorsa ρ = +1, azalıyorsa −1', () => {
    const art = Array.from({ length: 20 }, (_, i) => ({ maxScore: 10, nihai: 4, ai: 4 + i * 0.25, uzunluk: i * 10 }));
    const azal = art.map((r) => ({ ...r, uzunluk: 1000 - r.uzunluk }));
    expect(f.yzDenetimOzeti(art).uzunluk.rho).toBeCloseTo(1, 12);
    expect(f.yzDenetimOzeti(azal).uzunluk.rho).toBeCloseTo(-1, 12);
    expect(f.uzunlukIliskiMetni(1)).toMatch(/^Uzun yanıtlarda/);
    expect(f.uzunlukIliskiMetni(-1)).toMatch(/^Kısa yanıtlarda/);
    expect(f.uzunlukIliskiMetni(0.05)).toMatch(/belirgin bir ilişki görülmedi/);
  });

  it('sıra kayması karar sırasına göre dizilir (giriş sırası değil); sırası olmayan girmez', () => {
    // Giriş sırasında ilk 11 kayıt fark 1, son 11 fark 0; ama sira tersten
    // (100 − i): karar sırasında fark-0'lar önce gelir → ilk yarı 0, son yarı 1.
    const k = Array.from({ length: 22 }, (_, i) => ({ maxScore: 10, nihai: 5, ai: i < 11 ? 6 : 5, sira: 100 - i }));
    k.push({ maxScore: 10, nihai: 5, ai: 9, sira: null as any });
    const o = f.yzDenetimOzeti(k);
    expect(o.n).toBe(23);
    expect(o.kayma.n).toBe(22);
    expect(o.kayma.ilkOrt).toBeCloseTo(0, 12);
    expect(o.kayma.sonOrt).toBeCloseTo(1, 12);
    expect(o.kayma.degisim).toBeCloseTo(1, 12);
  });

  it('eşik etiketi yalnız bilgi: kırmızı (pill-critical) kullanılmaz, "kaynakta önerilen" yazar', () => {
    for (const [tur, d] of [['qwk', 0.9], ['qwk', 0.5], ['smd', 0.1], ['smd', -0.3]] as const) {
      const e = f.yzDenetimEsikEtiketi(tur, d);
      expect(e.s).not.toBe('pill-critical');
      expect(e.t).toMatch(/^kaynakta önerilen/);
    }
    expect(f.yzDenetimEsikEtiketi('qwk', 0.70).t).toMatch(/karşılanıyor$/);
    expect(f.yzDenetimEsikEtiketi('smd', -0.15).t).toMatch(/karşılanıyor$/);
    expect(f.yzDenetimEsikEtiketi('smd', 0.16).t).toMatch(/karşılanmıyor$/);
  });
});

describe('Çeldirici etkinliği — %5 kuralı, üst/alt grup', () => {
  // 10 öğrenci; üst grup (3) A,A,C · alt grup (3) B,B,A; anahtar A.
  const tum = ['A', 'A', 'C', 'A', 'A', 'B', 'B', 'B', 'A', null];
  const r = f.celdiriciAnalizi(['A', 'B', 'C', 'D'], 'A', tum, ['A', 'A', 'C'], ['B', 'B', 'A']);
  const sik = (k: string) => r.find((x: any) => x.key === k);

  it('oranlar elle: A 5/10, üst 2/3, alt 1/3; B 3/10, üst 0, alt 2/3', () => {
    expect(sik('A')).toMatchObject({ dogru: true, adet: 5, oran: 0.5 });
    expect(sik('A').ust).toBeCloseTo(2 / 3, 12);
    expect(sik('B')).toMatchObject({ adet: 3, oran: 0.3, ust: 0, islevsel: true, tersCalisiyor: false });
    expect(sik('B').alt).toBeCloseTo(2 / 3, 12);
  });
  it('C: üst grup daha çok seçti → ters çalışıyor; D: hiç seçilmedi (mevcut ölçü korunur)', () => {
    expect(sik('C')).toMatchObject({ adet: 1, tersCalisiyor: true, islevsel: false });
    expect(sik('D')).toMatchObject({ adet: 0, hicSecilmedi: true, dusukSecilme: false, islevsel: false });
    expect(f.celdiriciDurumu(sik('D')).t).toBe('hiç seçilmedi');
    expect(f.celdiriciDurumu(sik('C')).t).toMatch(/üst grup daha çok seçti/);
    expect(f.celdiriciDurumu(sik('A')).t).toBe('anahtar');
  });
  it('%5 kuralı: 25 öğrenciden 1 seçim (%4) işlevsiz; 2 seçim (%8) ve alt > üst işlevsel', () => {
    const t1 = Array(24).fill('A').concat(['E']);
    const a1 = f.celdiriciAnalizi(['A', 'E'], 'A', t1, ['A'], ['E'])[1];
    expect(a1.oran).toBeCloseTo(0.04, 12);
    expect(a1.dusukSecilme).toBe(true);
    expect(a1.islevsel).toBe(false);
    expect(f.celdiriciDurumu(a1).t).toMatch(/%5'in altında/);
    const t2 = Array(23).fill('A').concat(['E', 'E']);
    const a2 = f.celdiriciAnalizi(['A', 'E'], 'A', t2, ['A'], ['E'])[1];
    expect(a2.islevsel).toBe(true);
  });
  it('üst = alt (≥ %5) → ayırt etmiyor', () => {
    const a = f.celdiriciAnalizi(['A', 'B'], 'A', ['A', 'B', 'A', 'B'], ['B'], ['B'])[1];
    expect(a.islevsel).toBe(false);
    expect(a.tersCalisiyor).toBe(false);
    expect(f.celdiriciDurumu(a).t).toMatch(/ayırt etmiyor/);
  });
});

describe('Açık uçlu: güçlük ve düzeltilmiş madde–toplam korelasyonu', () => {
  it('güçlük = ortalama / tam puan: [2,3,4] / 5 = 0,6; tam puan yoksa null', () => {
    expect(f.acikMaddeGuclugu([2, 3, 4], 5)).toBeCloseTo(0.6, 12);
    expect(f.acikMaddeGuclugu([2, 3], null)).toBeNull();
    expect(f.acikMaddeGuclugu([], 5)).toBeNull();
  });
  it('elle: 4×3 matris, j=0 → r = 1; j=1 → r = 5/√34', () => {
    const m = [[2, 1, 0], [4, 1, 1], [6, 2, 1], [8, 2, 2]];
    // j=0: madde [2,4,6,8], kalan [1,2,3,4] → doğrusal, r = 1
    expect(f.maddeToplamKorelasyonu(m, 0)).toBeCloseTo(1, 12);
    // j=1: madde [1,1,2,2], kalan [2,5,7,10]: Σdxdy 5, Σdx² 1, Σdy² 34
    expect(f.maddeToplamKorelasyonu(m, 1)).toBeCloseTo(5 / Math.sqrt(34), 12);
  });
  it('madde kendi toplamına katılmaz (düzeltilmiş): düzeltmesiz r farklı çıkar', () => {
    const m = [[1, 2], [2, 3], [3, 5], [4, 4]];
    expect(f.maddeToplamKorelasyonu(m, 0)).toBeCloseTo(0.8, 12);   // elle: 4/√25
    const duzeltmesiz = f.pearsonR(m.map((r) => r[0]), m.map((r) => r[0] + r[1]));
    expect(duzeltmesiz).not.toBeCloseTo(0.8, 3);
  });
  it('tek öğrenci ya da sabit madde → null', () => {
    expect(f.maddeToplamKorelasyonu([[1, 2]], 0)).toBeNull();
    expect(f.maddeToplamKorelasyonu([[3, 1], [3, 2], [3, 4]], 0)).toBeNull();
  });
});

describe('Bağlantılar ve §1 (karar vermez)', () => {
  it('Analitik sekmesi kartı çağırıyor; uyum kartının hemen ardından', () => {
    const t = fonksiyonMetni('teacherTab4Html');
    expect(t).toMatch(/calibrationHtml\(\) \+\s*\n\s*yzDenetimHtml\(\)/);
  });
  it('kart ve madde analizi onay/puan yazan hiçbir fonksiyonu çağırmaz', () => {
    const govde = ['yzDenetimHtml', 'yzDenetimKayitlari', 'celdiriciTabloHtml', 'acikMaddeHtml', 'acikMaddeAnalizi']
      .map(fonksiyonMetni).join('\n');
    expect(govde).not.toMatch(/finalizeReview|writeSession|auditKaydet|apiPost|saveState|fetch\(/);
  });
  it('küçük n metni ve kaynak bağlantısı ekranda; eşik kaynağı kod yorumunda', () => {
    const k = fonksiyonMetni('yzDenetimHtml');
    expect(k).toContain('Yorum için yetersiz veri');
    expect(k).toContain('kaynakta önerilen');
    expect(k).toContain('https://arxiv.org/abs/2505.22771');
    const blok = app.slice(app.indexOf('§121 — YZ PUANLAYICI DENETİMİ'), app.indexOf('\nfunction yzDenetimSabitleri('));
    expect(blok).toContain('Williamson, Xi ve Breyer (2012)');
    expect(blok).toContain('https://www.act.org/content/dam/act/unsecured/documents/R2304-CRASE-Essay-Scoring-Model-Performance-02-2023.pdf');
  });
  it('mevcut "hiç seçilmeyen şık" notu korunuyor', () => {
    expect(fonksiyonMetni('itemAnalysisHtml')).toContain('hiçbir öğrenci seçmedi');
    expect(fonksiyonMetni('itemAnalysis')).toContain('islevsiz: islevsiz');
  });
});
