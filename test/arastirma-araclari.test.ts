// Araştırma araçları (PROGRESS §109): manşet sayıların yeniden üretimi, kör
// etiketleme aracı ve uyum hesabı. Model çağrısı yok.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
// @ts-expect-error — düz .mjs, tür bildirimi yok
import { cohenKappa, fleissKappa, bootstrapGA, mulberry32, metinTohumu, wilson } from '../tools/olcum/uyum-lib.mjs';
// @ts-expect-error — düz .mjs, tür bildirimi yok
import { kararTuret, etiketciler, uyumAnalizi, sentetikDisaAktarim, anahtarYukle, yzYukle } from '../tools/olcum/uyum.mjs';
// @ts-expect-error — düz .mjs, tür bildirimi yok
import { veriKur, IZINLI_ALANLAR, GORUNUR_KODLAR } from '../tools/etiket/veri-uret.mjs';

const kok = path.resolve(__dirname, '..');
const oku = (f: string) => fs.readFileSync(path.join(kok, f), 'utf8');
/* eslint-disable @typescript-eslint/no-explicit-any */
const G = globalThis as any;

beforeAll(async () => {
  await import('../tools/etiket/sorular.js');
  await import('../tools/etiket/cekirdek.js');
});

// Bilinen örneklerden etiket dizisi kurar: [[a, b, adet], ...]
const ciftlerden = (t: [string, string, number][]) => {
  const a: string[] = [], b: string[] = [];
  for (const [x, y, n] of t) for (let i = 0; i < n; i++) { a.push(x); b.push(y); }
  return [a, b];
};

describe('κ hesabı — bilinen örnekler', () => {
  it('Cohen κ: 2×2 ders kitabı örneği (20/5/10/15) → po 0,70, pe 0,50, κ 0,40', () => {
    const [a, b] = ciftlerden([['E', 'E', 20], ['E', 'H', 5], ['H', 'E', 10], ['H', 'H', 15]]);
    const k = cohenKappa(a, b, ['E', 'H']);
    expect(k.n).toBe(50);
    expect(k.po).toBeCloseTo(0.7, 12);
    expect(k.pe).toBeCloseTo(0.5, 12);
    expect(k.kappa).toBeCloseTo(0.4, 12);
  });

  it('Cohen κ: tam uyum 1, tam karşıtlık negatif, tek kategoride tanımsız (NaN)', () => {
    expect(cohenKappa(['a', 'b', 'a'], ['a', 'b', 'a']).kappa).toBe(1);
    expect(cohenKappa(['a', 'b'], ['b', 'a']).kappa).toBeLessThan(0);
    expect(cohenKappa(['a', 'a'], ['a', 'a']).kappa).toBeNaN();
    expect(cohenKappa(['a', null, 'b'], ['a', 'b', null]).n).toBe(1); // eksik çiftler atlanır
  });

  it('Fleiss κ: Fleiss (1971) 10 madde × 14 etiketleyici örneği → 0,210', () => {
    const sayim = [
      [0, 0, 0, 0, 14], [0, 2, 6, 4, 2], [0, 0, 3, 5, 6], [0, 3, 9, 2, 0], [2, 2, 8, 1, 1],
      [7, 7, 0, 0, 0], [3, 2, 6, 3, 0], [2, 5, 3, 2, 2], [6, 5, 2, 1, 0], [0, 2, 2, 3, 7],
    ];
    const tablo = sayim.map((r) => r.flatMap((c, j) => Array(c).fill(String(j + 1))));
    const f = fleissKappa(tablo, ['1', '2', '3', '4', '5']);
    expect(f.pBar).toBeCloseTo(0.378, 3);
    expect(f.peBar).toBeCloseTo(0.213, 3);
    expect(f.kappa).toBeCloseTo(0.21, 2);
  });

  it('depodaki gerçek veri: W3 ↔ birincil Cohen κ = 0,81 (ARASTIRMA §6.8)', () => {
    const yz = yzYukle();
    const es = JSON.parse(oku('docs/olcum/a5/ikinci-kontrol-esleme.json')).maddeler;
    const w3 = JSON.parse(oku('docs/olcum/a5/ikinci-kontrol-w3.json')).kararlar;
    const k = cohenKappa(es.map((x: any) => yz[x.kno]), es.map((x: any) => w3[x.ino].karar), ['dogru', 'yanlis', 'belirsiz']);
    expect(k.n).toBe(45);
    expect(k.kappa.toFixed(2)).toBe('0.81');
  });

  it('Wilson: 22/32 → [51,4; 82,0] (ARASTIRMA §6.8 taban küme A)', () => {
    const [a, b] = wilson(22, 32);
    expect((100 * a).toFixed(1)).toBe('51.4');
    expect((100 * b).toFixed(1)).toBe('82.0');
  });

  it('bootstrap GA deterministik: aynı tohum aynı aralık, farklı tohum farklı dizi', () => {
    const v = Array.from({ length: 40 }, (_, i) => (i % 7) / 7);
    const ort = (idx: number[]) => idx.reduce((s, i) => s + v[i], 0) / idx.length;
    const a = bootstrapGA(v.length, ort, { tekrar: 500, tohum: 20261019 });
    const b = bootstrapGA(v.length, ort, { tekrar: 500, tohum: 20261019 });
    expect(a).toEqual(b);
    expect(a.alt).toBeLessThan(a.ust);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('kör etiketleme aracı — karıştırma', () => {
  const idler = Array.from({ length: 225 }, (_, i) => `K${String(i + 1).padStart(3, '0')}`);

  it('aynı kod + aynı veri sürümü → aynı sıra; büyük/küçük harf fark etmez', () => {
    const E = G.MihenkEtiket;
    const a = E.karistir(idler, 'OGR-07', 'v1');
    expect(E.karistir(idler, 'ogr-07', 'v1')).toEqual(a);
    expect(a).not.toEqual(idler);
    expect([...a].sort()).toEqual(idler); // permütasyon: kayıp ya da tekrar yok
  });

  it('farklı etiketleyicilerin sırası farklı; girdi dizisi değişmez', () => {
    const E = G.MihenkEtiket;
    const kopya = [...idler];
    const a = E.karistir(idler, 'OGR-07', 'v1'), b = E.karistir(idler, 'OGR-08', 'v1');
    expect(a).not.toEqual(b);
    expect(idler).toEqual(kopya);
  });

  it('tarayıcı çekirdeği ile uyum kütüphanesi aynı RNG ve tohumu üretir', () => {
    const E = G.MihenkEtiket;
    expect(E.metinTohumu('OGR-07|v1')).toBe(metinTohumu('OGR-07|v1'));
    const r1 = E.mulberry32(42), r2 = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(r1()).toBe(r2());
  });

  it('takma kod: rakamsız ad reddedilir, kod biçimi kabul edilir', () => {
    const E = G.MihenkEtiket;
    expect(E.kodGecerliMi('AYSE')).toBe(false);
    expect(E.kodGecerliMi('Ayşe Yılmaz')).toBe(false);
    expect(E.kodGecerliMi('ogr-07')).toBe(true);
    expect(E.kodGecerliMi('OGR-K7P2A')).toBe(true);
  });
});

describe('kör etiketleme aracı — gizlenen alanlar gerçekten yok', () => {
  it('sorular.js: 225 madde, yalnız izinli alanlar; anahtar/model/YZ etiketi yok', () => {
    const V = G.MIHENK_ETIKET_VERI;
    expect(V.n).toBe(225);
    expect(V.maddeler).toHaveLength(225);
    for (const m of V.maddeler) {
      expect(Object.keys(m).every((k) => IZINLI_ALANLAR.includes(k))).toBe(true);
      for (const s of m.siklar) expect(Object.keys(s).sort()).toEqual(['harf', 'metin']);
    }
    const metin = oku('tools/etiket/sorular.js');
    for (const yasak of ['isaretli', 'dogru_sik', 'cozucu', 'llama', 'scout', '@cf/', 'sicaklik', '"karar"', 'kumeler', 'hesapUyusmazligi', 'A1v2', 'etiketleyen'])
      expect(metin.toLowerCase()).not.toContain(yasak.toLowerCase());
  });

  it('sorular.js depodaki etiket-kor.json ile güncel (elle düzenlenmemiş)', () => {
    const veri = veriKur(JSON.parse(oku('docs/olcum/a5/etiket-kor.json')), oku('docs/HATA_TAKSONOMISI.md'));
    expect(G.MIHENK_ETIKET_VERI).toEqual(veri);
    expect(veri.taksonomi.kodlar.map((k: any) => k.kod)).toEqual(GORUNUR_KODLAR);
  });

  it('sayfa ağ isteği yapmaz ve yalnız iki yerel betiği yükler; eşleme/etiket dosyalarına atıf yok', () => {
    const html = oku('tools/etiket/index.html'), js = oku('tools/etiket/cekirdek.js');
    for (const t of [html, js]) {
      for (const yasak of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'http://', 'https://', 'a5-etiketli', 'etiket-esleme', 'etiket-W', 'ikinci-kontrol'])
        expect(t).not.toContain(yasak);
    }
    expect([...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1])).toEqual(['sorular.js', 'cekirdek.js']);
  });

  it('dışa aktarım yalnız takma kod ve etiket taşır (ad, e-posta, okul alanı yok)', () => {
    const E = G.MihenkEtiket, V = G.MIHENK_ETIKET_VERI;
    const d = E.disaAktar({ kod: 'ogr-07', baslangic: 't0', etiketler: { K001: { dogruSik: 'A', kusurlu: false, kodlar: ['KZN-DISI'], not: '', sureSn: 30 } } }, V, 't1');
    expect(Object.keys(d).sort()).toEqual(['arac', 'aracSurumu', 'baslangic', 'disaAktarim', 'etiketleyici', 'etiketler', 'taksonomiSurumu', 'tamamlanan', 'toplamMadde', 'veriSurumu'].sort());
    expect(d.etiketleyici).toBe('OGR-07');
    expect(Object.keys(d.etiketler.K001).sort()).toEqual(['dogruSik', 'kodlar', 'kusurlu', 'not', 'sureSn']);
  });

  it('etiket denetimi: doğru şık ve kusurlu zorunlu; "doğru cevap yok" kusursuz olamaz', () => {
    const E = G.MihenkEtiket, s = [{ harf: 'A' }, { harf: 'B' }];
    expect(E.etiketDenetle({ dogruSik: 'A', kusurlu: false }, s)).toEqual([]);
    expect(E.etiketDenetle({ dogruSik: 'E', kusurlu: false }, s).length).toBe(1);
    expect(E.etiketDenetle({ dogruSik: 'A' }, s).length).toBe(1);
    expect(E.etiketDenetle({ dogruSik: 'YOK', kusurlu: false }, s).length).toBe(1);
    expect(E.etiketDenetle({ dogruSik: 'BELIRSIZ', kusurlu: true }, s)).toEqual([]);
  });
});

describe('uyum hesabı — sentetik veriyle uçtan uca', () => {
  const anahtar = anahtarYukle(), yz = yzYukle();

  it('öğretmen seçimi → üç sınıf (W1/W3 karar kuralı)', () => {
    expect(kararTuret('B', 'B')).toBe('dogru');
    expect(kararTuret('C', 'B')).toBe('yanlis');
    expect(kararTuret('YOK', 'B')).toBe('yanlis');
    expect(kararTuret('BELIRSIZ', 'B')).toBe('belirsiz');
    expect(kararTuret(null, 'B')).toBeNull();
  });

  it('gürültüsüz sanal etiketleyiciler: insan–insan, insan–YZ ve Fleiss κ = 1', () => {
    const d = [sentetikDisaAktarim('SENT-01', yz, anahtar, 0, 1), sentetikDisaAktarim('SENT-02', yz, anahtar, 0, 2)];
    const s = uyumAnalizi(etiketciler(d, anahtar).etiketciler, yz, { tekrar: 200 });
    expect(s.ciftler).toHaveLength(3); // 1 insan–insan + 2 insan–YZ
    for (const c of s.ciftler) { expect(c.n).toBe(225); expect(c.kappa3).toBe(1); }
    expect(s.fleissInsan.kappa).toBeCloseTo(1, 12);
    expect(s.fleissInsanYz.kappa).toBeCloseTo(1, 12);
  });

  it('tamamen rastgele etiketleyici: κ ≈ 0 ve GA 0\'ı içerir; gürültü arttıkça κ düşer', () => {
    const d = [0.1, 0.4, 1].map((p, i) => sentetikDisaAktarim(`SENT-0${i + 1}`, yz, anahtar, p, 100 + i));
    const s = uyumAnalizi(etiketciler(d, anahtar).etiketciler, yz, { tekrar: 300 });
    const yzc = s.ciftler.filter((c: any) => c.tur === 'insan–YZ');
    expect(yzc[0].kappa3).toBeGreaterThan(yzc[1].kappa3);
    expect(yzc[1].kappa3).toBeGreaterThan(yzc[2].kappa3);
    expect(Math.abs(yzc[2].kappa3)).toBeLessThan(0.15);
    expect(yzc[2].ga3.alt).toBeLessThan(0);
    expect(yzc[2].ga3.ust).toBeGreaterThan(0);
  });

  it('yalnız ortak maddeler sayılır; geçersiz kod ve tekrar eden kod reddedilir', () => {
    const a = sentetikDisaAktarim('SENT-01', yz, anahtar, 0, 1);
    const b = sentetikDisaAktarim('SENT-02', yz, anahtar, 0, 2);
    b.etiketler = Object.fromEntries(Object.entries(b.etiketler).slice(0, 50));
    const s = uyumAnalizi(etiketciler([a, b], anahtar).etiketciler, null, { tekrar: 100 });
    expect(s.ciftler[0].n).toBe(50);
    expect(() => etiketciler([{ ...a, etiketleyici: 'Ayşe' }], anahtar)).toThrow();
    expect(() => etiketciler([a, a], anahtar)).toThrow();
  });
});

describe('npm run olcum:dogrula', () => {
  it('ARASTIRMA.md manşet sayıları ham veriden yeniden üretilir (çıkış 0) ve PANO.md yazılır', () => {
    const r = spawnSync(process.execPath, ['tools/olcum/dogrula.mjs', '--sessiz'], { cwd: kok, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    const pano = oku('docs/olcum/PANO.md');
    expect(pano).toContain('%77,7 [60,6–98,4]');
    expect(pano).toContain('%5,3 [2,6–8,4]');
    expect(pano).toContain('[−0,042; 0,004]');
    expect(pano).not.toContain('✗');
  }, 30000);
});
