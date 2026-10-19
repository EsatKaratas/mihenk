// ============================================================================
// §55 A2 — sayısal hesap denetimi: güvenli ayrıştırıcı, şık sayısı, uçtan.
// ============================================================================

import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hesapla, sikSayisi, hesapDenetimi, HESAP_UZUNLUK_SINIRI } from '../src/lib/guards';

describe('hesapla — güvenli aritmetik', () => {
  it('işlem önceliği, parantez, tekli eksi, ondalık (nokta/virgül), × ÷ −', () => {
    expect(hesapla('2 + 3 * 4')).toBe(14);
    expect(hesapla('(2 + 3) * 4')).toBe(20);
    expect(hesapla('-5 + 2')).toBe(-3);
    expect(hesapla('2 * -3')).toBe(-6);
    expect(hesapla('1.5 + 1,5')).toBe(3);
    expect(hesapla('30 − 10')).toBe(20);
    expect(hesapla('6 × 7 ÷ 2')).toBe(21);
    expect(hesapla('0.2 * 1500 * 10')).toBeCloseTo(3000, 9);
  });

  it('aritmetik DIŞI her şey reddedilir (kod çalıştırma yok)', () => {
    for (const kotu of [
      'process.exit()', 'constructor', 'alert(1)', '1e3', '2^3', '5%2', 'x + 1', '1 = 1',
      'Math.PI', '[]+[]', '"1"+1', '10 N', '2 ** 3', '((1)', '1)', '', '   ', '1..2', '1,,2',
    ]) {
      expect(hesapla(kotu)).toBeNull();
    }
  });

  it('sıfıra bölme, uzunluk ve derinlik sınırları null döner', () => {
    expect(hesapla('5 / 0')).toBeNull();
    expect(hesapla('1+'.repeat(HESAP_UZUNLUK_SINIRI) + '1')).toBeNull();
    expect(hesapla('('.repeat(25) + '1' + ')'.repeat(25))).toBeNull();
    expect(hesapla('('.repeat(5) + '1' + ')'.repeat(5))).toBe(1);
  });
});

describe('sikSayisi — şıktaki ilk sayı ve kendi hassasiyetinden tolerans', () => {
  it('Türkçe ve İngilizce ondalık, binlik, birimler', () => {
    expect(sikSayisi('20 N sağa')).toEqual({ deger: 20, tolerans: 0.5 });
    expect(sikSayisi('3,33 m')).toEqual({ deger: 3.33, tolerans: 0.005 });
    expect(sikSayisi('2.5 kg')).toEqual({ deger: 2.5, tolerans: 0.05 });
    expect(sikSayisi('1.250,5 TL')).toEqual({ deger: 1250.5, tolerans: 0.05 });
    expect(sikSayisi('1.250.000')).toEqual({ deger: 1250000, tolerans: 0.5 });
    expect(sikSayisi('−4 °C')).toEqual({ deger: -4, tolerans: 0.5 });
  });
  it('belirsiz "1.250" ve sayısız şık null (denetlenmez, tahmin yok)', () => {
    expect(sikSayisi('1.250 kg')).toBeNull();
    expect(sikSayisi('Araba durur')).toBeNull();
  });
});

describe('hesapDenetimi', () => {
  const siklar = [{ key: 'A', text: '20 N' }, { key: 'B', text: '40 N' }, { key: 'C', text: '10 N' }];
  it('hesap doğru şıkla tutuyor → false', () => {
    expect(hesapDenetimi('30 - 10', siklar, 'A')).toEqual({ hesapUyusmazligi: false, hesapBaskaSik: null, okunamadi: false });
  });
  it('hesap başka şıkla tutuyor → true + o harf (anahtar muhtemelen yanlış)', () => {
    expect(hesapDenetimi('30 + 10', siklar, 'A')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: 'B', okunamadi: false });
  });
  it('hesap hiçbir şıkla tutmuyor → true, başka şık null', () => {
    expect(hesapDenetimi('7 * 7', siklar, 'A')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: null, okunamadi: false });
  });
  it('hesap yok → null (denetlenmedi); okunamayan hesap → okunamadi; doğru şıkta sayı yok → null', () => {
    expect(hesapDenetimi(undefined, siklar, 'A').hesapUyusmazligi).toBeNull();
    expect(hesapDenetimi('x*2', siklar, 'A')).toEqual({ hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: true });
    expect(hesapDenetimi('1+1', [{ key: 'A', text: 'durur' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }], 'A').hesapUyusmazligi).toBeNull();
  });
  it('tolerans şıkkın yazımından: "3,33" için 10/3 tutar', () => {
    expect(hesapDenetimi('10 / 3', [{ key: 'A', text: '3,33' }, { key: 'B', text: '3' }, { key: 'C', text: '4' }], 'A').hesapUyusmazligi).toBe(false);
  });
});

describe('uçtan: generate-questions A2 alanları + istem sürümü', () => {
  let no = 0;
  const sorular = {
    questions: [
      { type: 'mc', body: 'Bir kutu 30 N ile sağa, 10 N ile sola çekiliyor. Buna göre bileşke kuvvetin büyüklüğü kaç N olur?',
        options: [{ key: 'A', text: '20 N' }, { key: 'B', text: '40 N' }, { key: 'C', text: '10 N' }, { key: 'D', text: '30 N' }],
        correctKey: 'A', hesap: '30 + 10', distractorRationale: {}, difficulty: 'medium', bloom: 'uygulama', aiTime: 60, needsSource: false, refKeywords: [] },
      { type: 'mc', body: 'Bir manav günde 12 kasa elma satıyor, her kasada 15 kg var. Buna göre manav bir günde kaç kg elma satar?',
        options: [{ key: 'A', text: '180 kg' }, { key: 'B', text: '27 kg' }, { key: 'C', text: '120 kg' }, { key: 'D', text: '150 kg' }],
        correctKey: 'A', hesap: '12 * 15', distractorRationale: {}, difficulty: 'easy', bloom: 'uygulama', aiTime: 60, needsSource: false, refKeywords: [] },
      { type: 'mc', body: 'Okul kütüphanesinde rafların yerleşimi öğrencilerin istekleri dikkate alınarak yeniden düzenlenecek. Buna göre hangi ölçüt öne çıkar?',
        options: [{ key: 'A', text: 'Erişim kolaylığı' }, { key: 'B', text: 'Renk' }, { key: 'C', text: 'Fiyat' }, { key: 'D', text: 'Ağırlık' }],
        correctKey: 'A', hesap: 'process.exit()', distractorRationale: {}, difficulty: 'easy', bloom: 'anlama', aiTime: 60, needsSource: false, refKeywords: [] },
    ],
  };

  it('uyuşmazlık, başka şık, okunamayan hesap ve istemSurumu=2', async () => {
    const AI = { run: async () => ({ response: sorular }) } as unknown as Ai;
    const r = await app.request('/api/ai/generate-questions', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'kazanim', subject: 'Fen Bilimleri', grade: 7, outcomeCode: 'FEN.7.1.2', outcomeLabel: 'Kuvvet', mcCount: 3, openCount: 0, docKey: 'hesap-' + ++no }),
    }, { AI, AI_MODEL: 'm' });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    const [kuvvet, elma, kutuphane] = j.questions;
    // Karıştırmadan sonra harfler değişir; içerik üzerinden doğrula.
    const sikMetni = (q: any, k: string) => q.options.find((o: any) => o.key === k).text;
    expect(kuvvet.hesap).toBe('30 + 10');
    expect(kuvvet.hesapUyusmazligi).toBe(true);
    expect(sikMetni(kuvvet, kuvvet.hesapBaskaSik)).toBe('40 N');
    expect(elma.hesapUyusmazligi).toBe(false);
    expect(elma.hesapBaskaSik).toBeNull();
    expect(kutuphane.hesapUyusmazligi).toBeNull();
    expect(j.meta.hesapUyusmazligi).toBe(1);
    expect(j.meta.hesapOkunamadi).toBe(1);
    expect(j.meta.istemSurumu).toBe(2);
  });
});
