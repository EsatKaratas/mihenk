// §112 — Kriter bazında nihai puan (madde 6, W9). İstemci kodu public/app.js
// metninden alınıp yalıtılmış kapsamda kurulur. Model çağrısı yok.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function sabitMetni(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n];\n', bas) + 4);
}

const ADLAR = ['kriterPuanNormal', 'kriterKaydi', 'kriterToplami', 'kriterFarkOzeti', 'arastirmaKriterFarklari', 'kararRaporuCsv'];
function kur() {
  // eslint-disable-next-line no-new-func
  return new Function(ADLAR.map(fonksiyonMetni).join('\n') + '\nreturn {' + ADLAR.join(',') + '};')();
}

const BD = [
  { label: 'Kavram doğruluğu', weight: 40, points: 6, max: 8 },
  { label: 'Örnek / uygulama', weight: 30, points: 4.5, max: 6 },
  { label: 'Anlatım açıklığı', weight: 30, points: 5, max: 6 },
];

describe('kriterKaydi / kriterToplami', () => {
  const { kriterKaydi, kriterToplami, kriterPuanNormal } = kur();

  it('hiçbir ölçüt değişmediyse null (kayda kriter girmez, varsayılan akış)', () => {
    expect(kriterKaydi(BD, {})).toBeNull();
    expect(kriterKaydi(BD, { 0: '6', 1: '4,5', 2: '5' })).toBeNull();
    expect(kriterKaydi(BD, null)).toBeNull();
    expect(kriterKaydi([], { 0: '1' })).toBeNull();
  });

  it('değişen ölçüt: tüm liste {ad, oneri, nihai, max}; virgül kabul', () => {
    expect(kriterKaydi(BD, { 1: '3' })).toEqual([
      { ad: 'Kavram doğruluğu', oneri: 6, nihai: 6, max: 8 },
      { ad: 'Örnek / uygulama', oneri: 4.5, nihai: 3, max: 6 },
      { ad: 'Anlatım açıklığı', oneri: 5, nihai: 5, max: 6 },
    ]);
    expect(kriterKaydi(BD, { 0: '7,5' })[0].nihai).toBe(7.5);
  });

  it('geçersiz (tavan üstü, negatif, boş, metin) → "gecersiz"; sessiz kırpma yok', () => {
    for (const v of ['9', '-1', '', 'iyi', '1e1']) expect(kriterKaydi(BD, { 0: v })).toBe('gecersiz');
    expect(kriterPuanNormal('8', 8)).toBe(8);
    expect(kriterPuanNormal('8.01', 8)).toBeNull();
  });

  it('toplam yeniden hesaplanır, rubrik tavanına sınırlı', () => {
    expect(kriterToplami(kriterKaydi(BD, { 1: '3' }), 20)).toBe(14);
    expect(kriterToplami(kriterKaydi(BD, { 0: '8', 1: '6', 2: '6' }), 15)).toBe(15);
    expect(kriterToplami([], 20)).toBe(0);
  });
});

describe('kararRaporu kriter özeti (A7)', () => {
  const { kriterFarkOzeti, kararRaporuCsv } = kur();
  const k1 = [{ ad: 'Kavram', oneri: 6, nihai: 4, max: 8 }, { ad: 'Örnek', oneri: 4, nihai: 4, max: 6 }];
  const k2 = [{ ad: 'Kavram', oneri: 5, nihai: 6, max: 8 }, { ad: 'Örnek', oneri: 3, nihai: 2, max: 6 }];
  const kayitlar = [
    { sid: 1, soru: 'S', maxScore: 14, ai: 10, nihai: 8, confidence: 0.7, kriterler: k1 },
    { sid: 2, soru: 'S', maxScore: 14, ai: 8, nihai: 8, confidence: 0.8, kriterler: k2 },
    { sid: 3, soru: 'S', maxScore: 14, ai: 9, nihai: 9, confidence: 0.9, kriterler: null },   // düzeltilmedi
  ];
  it('yalnız düzeltilmiş kararlar; ölçüt başına n, değişen, ortalama fark', () => {
    expect(kriterFarkOzeti(kayitlar)).toEqual({ karar: 2, olcutler: [
      { ad: 'Kavram', n: 2, ortFark: -0.5, degisen: 2 },
      { ad: 'Örnek', n: 2, ortFark: -0.5, degisen: 1 },
    ] });
  });
  it('hiç düzeltme yoksa karar 0 (tahmin yok)', () => {
    expect(kriterFarkOzeti([{ ai: 1, nihai: 2 }])).toEqual({ karar: 0, olcutler: [] });
  });
  it('rapor CSV: kriterFarki sütunu, düzeltilmeyende boş', () => {
    const csv = kararRaporuCsv(kayitlar).replace(/^﻿/, '').split('\n');
    expect(csv[0].split(';').pop()).toBe('kriterFarki');
    expect(csv[1].split(';').pop()).toBe('Kavram=-2 | Örnek=0');
    expect(csv[3].split(';').pop()).toBe('');
  });
});

describe('§111 araştırma paketi — kriter farkları beyaz listede, ad ve metin YOK', () => {
  it('arastirmaKriterFarklari yalnız sıra/max/öneri/nihai/fark', () => {
    const { arastirmaKriterFarklari } = kur();
    const r = arastirmaKriterFarklari([{ ad: 'Gizli Ölçüt Adı', oneri: 6, nihai: 4.5, max: 8, gerekce: 'metin' }]);
    expect(r).toEqual([{ sira: 1, max: 8, oneri: 6, nihai: 4.5, fark: -1.5 }]);
  });

  it('paket: puan_karari.kriterler → kriterFarklari; ham günlükteki ölçüt adı pakette 0 kez', async () => {
    const kod = ['sha256Hex', 'arastirmaKriterFarklari', 'arastirmaPaketi'].map(fonksiyonMetni).join('\n');
    // eslint-disable-next-line no-new-func
    const { arastirmaPaketi } = new Function('state',
      'const AUDIT_ETIKET = { puan_karari: { aktor: "öğretmen" } };\n' + sabitMetni('ARASTIRMA_ALANLARI') + '\n' + kod +
      '\nreturn { arastirmaPaketi };')({ auditDusen: 0 });
    const ADI = 'Fotosentez Kavram Ölçütü XYZ';
    const gunluk = [{ tur: 'puan_karari', at: 1793955600000, qid: 7, sid: 3, soru: 'Soru metni', aiScore: 10, finalScore: 8,
      degisti: true, not: 'not', kriterler: [{ ad: ADI, oneri: 6, nihai: 4, max: 8 }, { ad: 'Diğer', oneri: 4, nihai: 4, max: 6 }] }];
    const p = await arastirmaPaketi(gunluk, [{ id: 7, type: 'open' }], 'tuz');
    const k = p.kayitlar[0];
    expect(k.kriterFarklari).toEqual([{ sira: 1, max: 8, oneri: 6, nihai: 4, fark: -2 }, { sira: 2, max: 6, oneri: 4, nihai: 4, fark: 0 }]);
    expect(k.puanFarki).toBe(-2);
    expect(k.soruKimligi).toBe(createHash('sha256').update('tuz:7').digest('hex'));
    const metin = JSON.stringify(p);
    expect(metin).not.toContain(ADI);
    expect(metin).not.toContain('Diğer');
    expect(metin).not.toContain('Soru metni');
    expect(k).not.toHaveProperty('kriterler');
    expect(k).not.toHaveProperty('sid');
  });
});

describe('kart ve onay bağlantıları (kaynak metni)', () => {
  it('varsayılan kart: Tek Tıkla yalnız ölçüt DEĞİŞTİYSE kapalı; §103 enjeksiyon kısıtı aynen', () => {
    const kart = fonksiyonMetni('evalCardHtml');
    expect(kart).toContain('enjeksiyonIsareti(ev, ans.text).var ? "" :');
    expect(kart).toContain('(kriterDegisti(q.id, student.id, ev) ? \' disabled aria-describedby="krNot-');
    expect(kart).toContain('kriterDuzeltDugmesiHtml(q.id, student.id, ev)');
    expect(kart).toContain('kriterNihaiDegeri(q.id, student.id, ev, rub)');
  });
  it('düzeltme yokken nihai alan YZ önerisi, düzeltme açıkken ölçüt toplamı', () => {
    const f = fonksiyonMetni('kriterNihaiDegeri');
    expect(f).toContain('return ev.aiScore;');
    expect(f).toContain('kriterToplami(k, rub.maxScore)');
  });
  it('onay öğretmenin tıklamasıyla: revise-approve kriterleri finalizeReview’a geçirir; otomatik onay yok', () => {
    const bag = app.slice(app.indexOf('document.querySelectorAll(".revise-approve")'), app.indexOf('wireKriterDuzelt();   // §112'));
    expect(bag).toContain('finalizeReview(qid, Number(scoreEl.value), commentEl.value, "revised", sid, kriterler || undefined)');
    expect(fonksiyonMetni('wireKriterDuzelt')).not.toMatch(/finalizeReview|reviews/);
    expect(fonksiyonMetni('kriterKartTazele')).not.toMatch(/finalizeReview|writeSession/);
  });
  it('finalizeReview: review.kriterler ve puan_karari.kriterler isteğe bağlı', () => {
    const f = fonksiyonMetni('finalizeReview');
    expect(f).toContain('if (Array.isArray(kriterler) && kriterler.length) yeniReviews[qid].kriterler = kriterler;');
    expect(f).toContain('kriterler: yeniReviews[qid].kriterler');
  });
  it('rapor kayıtları kriterleri taşır; README A7 satırı güncel', () => {
    expect(fonksiyonMetni('teacherExamRecords')).toContain('kriterler: Array.isArray(r.kriterler) ? r.kriterler : null');
    const readme = fs.readFileSync(path.resolve(__dirname, '..', 'README.md'), 'utf8');
    expect(readme).toContain('Kriter bazında fark artık ölçülebiliyor (öğretmen düzelttiyse)');
    expect(readme).not.toContain('**kriter bazında fark ölçülemiyor**');
  });
  it('göç yok: KALICI_ALANLAR’a geçici taslak girmez', () => {
    const k = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    expect(k).not.toMatch(/kriterTaslak|_kriter/);
  });
});
