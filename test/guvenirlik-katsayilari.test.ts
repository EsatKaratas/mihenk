// §101 — Sınav güvenirliği: KR-20 ve Cronbach alfa (public/app.js, saf hesap).
//
// BİLİNEN ÖRNEK (kaynak): Florida Gulf Coast University, EDF ölçme dersi,
// "Module Five — KR-20" (https://ruby.fgcu.edu/courses/chewittg/10009/module5kr20.htm,
// erişim 6 Kasım 2026). 10 öğrenci × 6 madde, 0/1 matris. Sayfadaki elle
// hesaplanmış değerler: madde doğru sayıları 4,3,6,7,6,3 · Σpq = 1,35 ·
// toplam puan ortalaması 2,9 · kareler toplamı 40,9 · σ² = 40,9/9 = 4,544
// (n-1'e bölünmüş) · KR-20 ≈ 0,84.
//
// Mihenk tüm varyansları n'ye böler (app.js §101 notu): Σpq da n'ye bölünmüş
// madde varyansıdır; pay ve payda aynı kuralla hesaplanınca 0/1 verisinde
// KR-20 = alfa olur ve n-1'e bölen paketlerle aynı alfa çıkar. Bu yüzden aynı
// matris için Mihenk'in değeri 1,2 · (1 − 1,35/4,09) = 0,8039'dur; kaynaktaki
// 0,84 karışık kuraldan (σ² n-1) gelir. Test iki değeri de ara sonuçlardan
// yeniden kurar: kaynağın her ara sayısı birebir doğrulanır.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}

// eslint-disable-next-line no-new-func
const { kr20, cronbachAlfa, varyansN, guvenirlikYorum } = new Function(
  ['varyansN', 'cronbachAlfa', 'kr20', 'guvenirlikYorum'].map(fonksiyonMetni).join('\n') +
  '\nreturn { kr20, cronbachAlfa, varyansN, guvenirlikYorum };',
)() as {
  kr20: (m: number[][]) => any; cronbachAlfa: (m: number[][]) => any;
  varyansN: (d: number[]) => number; guvenirlikYorum: (r: number) => { s: string; t: string };
};

// FGCU Module Five matrisi (Alice … Jack; Item 1–6).
const FGCU = [
  [0, 0, 0, 0, 0, 0], // Alice  0
  [0, 0, 0, 0, 1, 0], // Bob    1
  [1, 0, 1, 1, 1, 0], // Carol  4
  [1, 1, 1, 1, 1, 1], // David  6
  [1, 1, 1, 1, 1, 1], // Esther 6
  [0, 0, 1, 0, 0, 0], // Frank  1
  [0, 0, 1, 1, 1, 0], // Gloria 3
  [0, 0, 0, 1, 0, 0], // Hank   1
  [1, 0, 1, 1, 1, 0], // Irene  4
  [0, 1, 0, 1, 0, 1], // Jack   3
];

describe('KR-20 — FGCU Module Five bilinen örneği', () => {
  const r = kr20(FGCU);

  it('kaynaktaki ara değerler birebir: n=10, k=6, doğru sayıları, Σpq=1,35', () => {
    expect(r.n).toBe(10);
    expect(r.k).toBe(6);
    const dogru = [0, 1, 2, 3, 4, 5].map((j) => FGCU.reduce((s, x) => s + x[j], 0));
    expect(dogru).toEqual([4, 3, 6, 7, 6, 3]);
    expect(r.pqToplami).toBeCloseTo(1.35, 10);
  });

  it('kareler toplamı 40,9 → kaynağın σ² (n-1) = 4,544 ve KR-20 ≈ 0,84 yeniden kurulur', () => {
    const kareler = r.toplamVaryans * r.n;            // n'ye bölünmüş varyans × n
    expect(kareler).toBeCloseTo(40.9, 10);
    const kaynakVaryansi = kareler / (r.n - 1);
    expect(kaynakVaryansi).toBeCloseTo(4.5444, 4);
    const kaynakKr20 = (6 / 5) * (1 - r.pqToplami / kaynakVaryansi);
    expect(Math.round(kaynakKr20 * 100) / 100).toBe(0.84);
  });

  it('Mihenk (tutarlı n kuralı): σ² = 4,09 ve KR-20 = 0,8039', () => {
    expect(r.toplamVaryans).toBeCloseTo(4.09, 10);
    expect(r.deger).toBeCloseTo(1.2 * (1 - 1.35 / 4.09), 12);
    expect(r.deger).toBeCloseTo(0.8039, 4);
  });

  it('0/1 verisinde KR-20 = Cronbach alfa (aynı varyans kuralı)', () => {
    expect(cronbachAlfa(FGCU).deger).toBeCloseTo(r.deger, 12);
  });
});

describe('Cronbach alfa — elle hesaplanmış çok puanlı örnek', () => {
  // 4 öğrenci × 3 madde (puanlar 0–4). Elle:
  //   madde 1: 4,3,2,1 → ort 2,5 → σ² = (2,25+0,25+0,25+2,25)/4 = 1,25
  //   madde 2: 3,3,1,1 → ort 2   → σ² = (1+1+1+1)/4            = 1,00
  //   madde 3: 4,2,2,0 → ort 2   → σ² = (4+0+0+4)/4            = 2,00
  //   Σσ²ᵢ = 4,25
  //   toplamlar: 11,8,5,2 → ort 6,5 → σ² = (20,25+2,25+2,25+20,25)/4 = 11,25
  //   α = 3/2 · (1 − 4,25/11,25) = 1,5 · 0,62222… = 0,93333…
  const M = [[4, 3, 4], [3, 3, 2], [2, 1, 2], [1, 1, 0]];
  it('Σσ²ᵢ = 4,25 · σ²_X = 11,25 · α = 0,9333', () => {
    const a = cronbachAlfa(M);
    expect(a.maddeVaryansToplami).toBeCloseTo(4.25, 12);
    expect(a.toplamVaryans).toBeCloseTo(11.25, 12);
    expect(a.deger).toBeCloseTo(14 / 15, 12);
  });
  it('maddeler birbirinin aynısıysa α = 1', () => {
    expect(cronbachAlfa([[1, 1, 1], [3, 3, 3], [2, 2, 2]]).deger).toBeCloseTo(1, 12);
  });
  it('maddeler ters yönlüyse α negatif çıkar ve "negatif" yorumu alır', () => {
    const a = cronbachAlfa([[0, 1], [1, 0], [0, 1], [1, 0]]);
    // toplamlar hep 1 → varyans 0 → hesaplanamaz; biraz bozalım:
    expect(a.deger).toBeNull();
    const b = cronbachAlfa([[0, 2], [2, 0], [1, 2], [2, 1]]);
    expect(b.deger).toBeLessThan(0);
    expect(guvenirlikYorum(b.deger).t).toMatch(/^negatif/);
  });
});

describe('Sınır durumları', () => {
  it('varyansN n\'ye böler', () => {
    expect(varyansN([1, 2, 3, 4])).toBeCloseTo(1.25, 12);
    expect(varyansN([])).toBe(0);
  });
  it('tek öğrenci / tek madde / varyans sıfır / 0-1 dışı değer → değer yok, neden yazılı', () => {
    expect(kr20([[1, 0, 1]]).deger).toBeNull();
    expect(kr20([[1], [0]]).deger).toBeNull();
    expect(kr20([[1, 1], [1, 1]]).neden).toMatch(/varyans sıfır/);
    expect(kr20([[1, 2], [0, 1]]).neden).toMatch(/0\/1/);
    expect(cronbachAlfa([]).deger).toBeNull();
  });
  it('yorum eşikleri: 0,70 kabul · 0,50–0,70 sınırda · <0,50 zayıf', () => {
    expect(guvenirlikYorum(0.8039).s).toBe('pill-success');
    expect(guvenirlikYorum(0.6).s).toBe('pill-warning');
    expect(guvenirlikYorum(0.3).s).toBe('pill-critical');
  });
  it('ekran: n<10 ya da k<5 ise var olan "gösterge niteliğindedir" dili kullanılır', () => {
    const govde = fonksiyonMetni('guvenirlikHtml');
    expect(govde).toContain('s.n < 10 || s.k < 5');
    expect(govde).toContain('<b>Bu sayılar gösterge niteliğindedir.</b>');
    expect(fonksiyonMetni('itemAnalysisHtml')).toContain('<b>Bu sayılar gösterge niteliğindedir.</b>');
  });
  it('alfa yalnız onaylı (reviews.finalScore) açık uçlu puanla; AI önerisi (aiEvals) okunmaz', () => {
    const govde = fonksiyonMetni('sinavGuvenirligi');
    expect(govde).toContain('ss.reviews');
    expect(govde).not.toContain('aiEvals');
  });
});
