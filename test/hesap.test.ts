// ============================================================================
// §55 A2 — sayısal hesap denetimi: güvenli ayrıştırıcı, şık sayısı, uçtan.
// ============================================================================

import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hesapla, sikSayisi, hesapDenetimi, sayisalCevapliMi, HESAP_UZUNLUK_SINIRI } from '../src/lib/guards';

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
    expect(hesapDenetimi('30 - 10', siklar, 'A')).toEqual({ hesapUyusmazligi: false, hesapBaskaSik: null, okunamadi: false, birimFarki: false });
  });
  it('hesap başka şıkla tutuyor → true + o harf (anahtar muhtemelen yanlış)', () => {
    expect(hesapDenetimi('30 + 10', siklar, 'A')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: 'B', okunamadi: false, birimFarki: false });
  });
  it('hesap hiçbir şıkla tutmuyor → true, başka şık null', () => {
    expect(hesapDenetimi('7 * 7', siklar, 'A')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: null, okunamadi: false, birimFarki: false });
  });
  it('hesap yok → null (denetlenmedi); okunamayan hesap → okunamadi; doğru şıkta sayı yok → null', () => {
    expect(hesapDenetimi(undefined, siklar, 'A').hesapUyusmazligi).toBeNull();
    expect(hesapDenetimi('x*2', siklar, 'A')).toEqual({ hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: true, birimFarki: false });
    expect(hesapDenetimi('1+1', [{ key: 'A', text: 'durur' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }], 'A').hesapUyusmazligi).toBeNull();
  });
  it('tolerans şıkkın yazımından: "3,33" için 10/3 tutar', () => {
    expect(hesapDenetimi('10 / 3', [{ key: 'A', text: '3,33' }, { key: 'B', text: '3' }, { key: 'C', text: '4' }], 'A').hesapUyusmazligi).toBe(false);
  });
});

// §83 — vakalar mat anahtar deneyinin (24 Ekim) gerçek sorularından; kural bu
// 72 soruya bakılarak tasarlandı, bağımsız doğrulaması 26 Ekim yeni setinde.
describe('§83 sayisalCevapliMi + hesapDenetimi: yalnız sayısal cevaplı soru denetlenir', () => {
  it('sayısal cevaplı: tek sayı + dört şıkta aynı kalan metin (birim kelime listesi yok)', () => {
    expect(sayisalCevapliMi([{ text: '12 bisküvi' }, { text: '4 bisküvi' }, { text: '6 bisküvi' }, { text: '8 bisküvi' }])).toBe(true);
    expect(sayisalCevapliMi([{ text: '15,00' }, { text: '13,75' }, { text: '16,25' }, { text: '17,50' }])).toBe(true);
    expect(sayisalCevapliMi([{ text: '−4 °C' }, { text: '4 °C' }, { text: '0 °C' }])).toBe(true);
  });
  it('sayısal cevaplı DEĞİL: metin şık, farklı kalan metin, ifade şık, boş liste', () => {
    expect(sayisalCevapliMi([{ text: '1 litrelik paketlerden almak' }, { text: '2 litrelik paketlerden almak' }, { text: 'İkisi de aynı fiyatlıdır' }])).toBe(false);
    expect(sayisalCevapliMi([{ text: '2 kg' }, { text: 'İkisi de aynı' }, { text: '1 kg' }])).toBe(false);
    expect(sayisalCevapliMi([{ text: '8 + 5' }, { text: '8 * 5' }, { text: '2*(8 + 5)' }])).toBe(false);
    expect(sayisalCevapliMi([])).toBe(false);
  });
  it('metin şıklı karşılaştırmada şıktaki ilk sayı cevap değil → null (eski yanlış alarm)', () => {
    const siklar = [{ key: 'A', text: '2 kg' }, { key: 'B', text: 'İkisi de aynı' }, { key: 'C', text: '1 kg' }, { key: 'D', text: 'Karşılaştırılamaz' }];
    expect(hesapDenetimi('9.50 / 2', siklar, 'A')).toEqual({ hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: false, birimFarki: false });
    const ifade = [{ key: 'A', text: '8 + 5' }, { key: 'B', text: '8 * 5' }, { key: 'C', text: '8 - 5' }, { key: 'D', text: '2*(8 + 5)' }];
    expect(hesapDenetimi('2*(8 + 5)', ifade, 'D').hesapUyusmazligi).toBeNull();
  });
  it('birim farkı: hesap × 10^3 doğru şıkla tam tutuyor → uyarı değil, birimFarki', () => {
    const siklar = [{ key: 'A', text: '7000' }, { key: 'B', text: '9000' }, { key: 'C', text: '8000' }, { key: 'D', text: '6000' }];
    expect(hesapDenetimi('3 * 2 * 1.5', siklar, 'B')).toEqual({ hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: false, birimFarki: true });
    expect(hesapDenetimi('9000 / 10000', [{ key: 'A', text: '0,9 m²' }, { key: 'B', text: '9 m²' }, { key: 'C', text: '90 m²' }], 'A').hesapUyusmazligi).toBe(false);
    expect(hesapDenetimi('9', [{ key: 'A', text: '0,000009' }, { key: 'B', text: '1' }, { key: 'C', text: '2' }], 'A').birimFarki).toBe(true);
  });
  it('gerçek yakalamalar korunur: sayılabilir ad şıkta da (12 bisküvi) uyuşmazlık; 10 katı birim farkı SAYILMAZ', () => {
    const bis = [{ key: 'A', text: '12 bisküvi' }, { key: 'B', text: '4 bisküvi' }, { key: 'C', text: '6 bisküvi' }, { key: 'D', text: '8 bisküvi' }];
    expect(hesapDenetimi('(3 * 24) / 15', bis, 'A').hesapUyusmazligi).toBe(true);
    expect(hesapDenetimi('12', [{ key: 'A', text: '120' }, { key: 'B', text: '12' }, { key: 'C', text: '24' }], 'A'))
      .toEqual({ hesapUyusmazligi: true, hesapBaskaSik: 'B', okunamadi: false, birimFarki: false });
  });
  it('5 Kasım denetimi: hesap BAŞKA bir şıkla tam tutuyorsa birim farkından ÖNCE uyuşmazlık (9 ve 9000)', () => {
    // Anahtar 9000, hesap 9 ve 9 şıklarda VAR: gerçek anahtar hatası; engellemeyen
    // "birim farkı" işaretine düşmemeli.
    const siklar = [{ key: 'A', text: '9' }, { key: 'B', text: '9000' }, { key: 'C', text: '900' }, { key: 'D', text: '90' }];
    expect(hesapDenetimi('3 * 3', siklar, 'B')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: 'A', okunamadi: false, birimFarki: false });
    // Ters yön (hesap 9000, anahtar 9, 9000 şıkta var) da uyuşmazlık.
    expect(hesapDenetimi('9 * 1000', siklar, 'A')).toEqual({ hesapUyusmazligi: true, hesapBaskaSik: 'B', okunamadi: false, birimFarki: false });
    // 9 şıklarda YOKSA birim farkı aynen kalır.
    const birimli = [{ key: 'A', text: '7000' }, { key: 'B', text: '9000' }, { key: 'C', text: '8000' }, { key: 'D', text: '6000' }];
    expect(hesapDenetimi('3 * 3', birimli, 'B').birimFarki).toBe(true);
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

  it('§89: Matematik dersinde istemSurumu=4; birim farkı hesapBirimFarki olarak yazılır', async () => {
    const birim = { questions: [
      { type: 'mc', body: 'Bir akvaryum 3 m uzunluğunda, 2 m genişliğinde ve 1,5 m yüksekliğindedir. Buna göre akvaryum kaç litre su alır?',
        options: [{ key: 'A', text: '7000' }, { key: 'B', text: '9000' }, { key: 'C', text: '8000' }, { key: 'D', text: '6000' }],
        correctKey: 'B', hesap: '3 * 2 * 1.5', distractorRationale: {}, difficulty: 'medium', bloom: 'uygulama', aiTime: 60, needsSource: false, refKeywords: [] },
    ] };
    const AI = { run: async () => ({ response: birim }) } as unknown as Ai;
    const r = await app.request('/api/ai/generate-questions', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'kazanim', subject: 'Matematik', grade: 6, outcomeCode: 'MAT.6.3.4', outcomeLabel: 'Hacim', mcCount: 1, openCount: 0, docKey: 'hesap-' + ++no }),
    }, { AI, AI_MODEL: 'm' });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta.istemSurumu).toBe(4);
    expect(j.questions[0].hesapBirimFarki).toBe(true);
    expect(j.questions[0].hesapUyusmazligi).toBeNull();
  });
});
