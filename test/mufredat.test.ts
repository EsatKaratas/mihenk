// ============================================================================
// Müfredat kataloğu bütünlük testleri — §51b sonrası.
//
// NEDEN: public/mufredat/*.json ürünün kazanım kaynağıdır (MEB + TÜBİTAK
// Deneyap). Bu dosyalar elle ya da betikle üretiliyor ve sunucu şeması onlara
// sınır koyuyor. 19 Ekim'de MAT.8.3.5 (213 karakter) şemanın 200 sınırına
// takıldı ve o kazanımla soru ÜRETİLEMİYORDU (PROGRESS §51b.3). Bu dosya o tür
// bir kopukluğu katalog değiştiği anda yakalar: sayılar, kodların
// benzersizliği, etiket uzunluğu ve Deneyap kayıtlarının kaynak künyesi.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MAX_OUTCOME_LABEL_CHARS } from '../src/schemas/ai';

const DIZIN = path.resolve(__dirname, '..', 'public', 'mufredat');
const dosyalar = fs.readdirSync(DIZIN).filter((f) => f.endsWith('.json')).sort();

type Kazanim = {
  kod: string;
  metin: string;
  uygunluk?: string;
  tur?: string;
  kaynak?: { sayfa?: unknown; url?: unknown };
};
type Katalog = { kazanimlar?: Kazanim[] } & Record<string, unknown>;

/** UTF-8 olarak katı biçimde çözer (geçersiz bayt dizisinde hata fırlatır). */
const oku = (f: string): string =>
  new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(path.join(DIZIN, f)));

const kataloglar: Record<string, Katalog> = {};
for (const f of dosyalar) {
  try { kataloglar[f] = JSON.parse(oku(f)); } catch { /* aşağıdaki test raporlar */ }
}

const MEB_DERSLER = { turkce: 365, fen: 141, matematik: 100 } as const;
const mebDosyalari = dosyalar.filter((f) => /^(turkce|fen|matematik)-\d+\.json$/.test(f));
const deneyapDosyalari = dosyalar.filter((f) => f.startsWith('deneyap-') && f !== 'deneyap-index.json');
const kazanimlari = (f: string): Kazanim[] => kataloglar[f]?.kazanimlar ?? [];

describe('müfredat — biçim', () => {
  it('klasörde hem MEB hem Deneyap dosyaları var (test boş klasörde geçmesin)', () => {
    expect(mebDosyalari.length).toBe(12);
    expect(deneyapDosyalari.length).toBeGreaterThan(0);
    expect(dosyalar).toContain('deneyap-index.json');
  });

  it('her dosya geçerli UTF-8 (BOM yok) ve geçerli JSON', () => {
    const hatali: string[] = [];
    for (const f of dosyalar) {
      try {
        const metin = oku(f);
        if (metin.charCodeAt(0) === 0xfeff) hatali.push(`${f}: BOM var`);
        JSON.parse(metin);
      } catch (e) {
        hatali.push(`${f}: ${(e as Error).message}`);
      }
    }
    expect(hatali).toEqual([]);
  });

  it('her katalog dosyasında boş olmayan kazanimlar dizisi var; her kaydın kodu ve metni dolu', () => {
    const eksik: string[] = [];
    for (const f of [...mebDosyalari, ...deneyapDosyalari]) {
      const liste = kazanimlari(f);
      if (!liste.length) eksik.push(`${f}: kazanimlar boş`);
      liste.forEach((k, i) => {
        if (!k.kod || !String(k.kod).trim()) eksik.push(`${f}[${i}]: kod yok`);
        if (!k.metin || !String(k.metin).trim()) eksik.push(`${f} ${k.kod}: metin yok`);
      });
    }
    expect(eksik).toEqual([]);
  });
});

describe('müfredat — MEB sayıları', () => {
  it('toplam 606: Türkçe 365 · Fen 141 · Matematik 100', () => {
    const sayim: Record<string, number> = { turkce: 0, fen: 0, matematik: 0 };
    for (const f of mebDosyalari) sayim[f.split('-')[0]] += kazanimlari(f).length;
    expect(sayim).toEqual({ ...MEB_DERSLER });
    expect(Object.values(sayim).reduce((a, b) => a + b, 0)).toBe(606);
  });
});

describe('müfredat — Deneyap indeksi', () => {
  const indeks = kataloglar['deneyap-index.json'] as {
    toplamKazanim: number;
    atolyeler: Array<{ ad: string; dosya: string; kazanimSayisi: number; uygunluk: Record<string, number> }>;
  };

  it('indeksteki her atölyenin dosyası var; klasördeki her Deneyap dosyası indekste (iki yönlü)', () => {
    const indekstekiler = indeks.atolyeler.map((a) => path.basename(a.dosya));
    expect(indeks.atolyeler.every((a) => a.dosya.startsWith('/mufredat/'))).toBe(true);
    expect(indekstekiler.filter((f) => !deneyapDosyalari.includes(f))).toEqual([]);
    expect(deneyapDosyalari.filter((f) => !indekstekiler.includes(f))).toEqual([]);
    expect(new Set(indekstekiler).size).toBe(indekstekiler.length);
  });

  it('her atölyede kazanım sayısı ve uygunluk dağılımı dosyayla BİREBİR aynı', () => {
    const fark: string[] = [];
    for (const a of indeks.atolyeler) {
      const liste = kazanimlari(path.basename(a.dosya));
      if (liste.length !== a.kazanimSayisi) fark.push(`${a.ad}: indeks ${a.kazanimSayisi}, dosya ${liste.length}`);
      const dagilim: Record<string, number> = {};
      for (const k of liste) dagilim[String(k.uygunluk)] = (dagilim[String(k.uygunluk)] || 0) + 1;
      const anahtarlar = new Set([...Object.keys(dagilim), ...Object.keys(a.uygunluk || {})]);
      for (const u of anahtarlar) {
        if ((dagilim[u] || 0) !== ((a.uygunluk || {})[u] || 0)) {
          fark.push(`${a.ad} ${u}: indeks ${(a.uygunluk || {})[u] || 0}, dosya ${dagilim[u] || 0}`);
        }
      }
    }
    expect(fark).toEqual([]);
  });

  it('toplam 622 ve indeksin toplamKazanim alanı atölyelerin toplamına eşit', () => {
    const dosyaToplami = deneyapDosyalari.reduce((t, f) => t + kazanimlari(f).length, 0);
    const indeksToplami = indeks.atolyeler.reduce((t, a) => t + a.kazanimSayisi, 0);
    expect(dosyaToplami).toBe(622);
    expect(indeksToplami).toBe(622);
    expect(indeks.toplamKazanim).toBe(622);
  });

  it('her Deneyap kaydı alıntıdır ve kaynak künyesi taşır (tur, kaynak.sayfa, kaynak.url)', () => {
    const eksik: string[] = [];
    for (const f of deneyapDosyalari) {
      for (const k of kazanimlari(f)) {
        if (k.tur !== 'alinti') eksik.push(`${k.kod}: tur=${k.tur}`);
        const sayfa = k.kaynak?.sayfa;
        if (!(typeof sayfa === 'number' && Number.isInteger(sayfa) && sayfa > 0)) eksik.push(`${k.kod}: kaynak.sayfa=${String(sayfa)}`);
        const url = k.kaynak?.url;
        if (!(typeof url === 'string' && /^https:\/\//.test(url))) eksik.push(`${k.kod}: kaynak.url=${String(url)}`);
      }
    }
    expect(eksik).toEqual([]);
  });
});

describe('müfredat — kodlar ve etiketler', () => {
  const tumu = [...mebDosyalari, ...deneyapDosyalari].flatMap((f) => kazanimlari(f).map((k) => ({ f, k })));

  it('toplam kayıt 1.228 (606 MEB + 622 Deneyap)', () => {
    expect(tumu.length).toBe(1228);
  });

  it('tüm kazanım kodları (MEB + Deneyap) benzersiz', () => {
    const gorulen = new Map<string, string>();
    const tekrar: string[] = [];
    for (const { f, k } of tumu) {
      if (gorulen.has(k.kod)) tekrar.push(`${k.kod}: ${gorulen.get(k.kod)} ve ${f}`);
      else gorulen.set(k.kod, f);
    }
    expect(tekrar).toEqual([]);
  });

  it(`"KOD — metin" etiketi ${MAX_OUTCOME_LABEL_CHARS} karakteri aşmıyor (P0 regresyon koruması, §51b.3)`, () => {
    // Uygulama etiketi `kod + " — " + metin` olarak kurar (public/app.js
    // katalog → OUTCOMES dönüşümü); sunucu kazanım metnini bu sınırla kabul eder.
    const asan = tumu
      .map(({ k }) => `${k.kod} — ${k.metin}`)
      .filter((etiket) => etiket.length > MAX_OUTCOME_LABEL_CHARS);
    expect(asan).toEqual([]);
  });
});
