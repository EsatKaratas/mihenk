// §101 — e-Okul soru bazlı puan tablosu ve OYSS paketi (public/app.js).
// OYSS kılavuzu s. 16: soru puanları e-Okul'a SINAV KÂĞIDINDAKİ SIRAYLA girilir.
// Buradaki ana kanıt: tablonun S1…Sn sütunları, sinavYazdir()'ın bastığı
// kâğıttaki 1…n numaralarıyla aynı soruya denk gelir.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}

/** Sınav: kâğıtta karışık tür; ortada ONAYSIZ bir soru (kâğıda ve tabloya girmez). */
const sorular = [
  { id: 41, type: 'open', status: 'approved', body: 'Açık A: sürtünmeyi açıklayın', outcome: 'FEN.7.1.2', difficulty: 'medium' },
  { id: 12, type: 'mc', status: 'approved', body: 'Çoktan B', correctKey: 'A', options: [{ key: 'A', text: 'x' }, { key: 'B', text: 'y' }] },
  { id: 99, type: 'mc', status: 'ai_generated', body: 'Onaysız C', correctKey: 'A', options: [] },
  { id: 7, type: 'mc', status: 'approved', body: 'Çoktan D', correctKey: 'B', options: [{ key: 'A', text: 'x' }, { key: 'B', text: 'y' }] },
  { id: 30, type: 'open', status: 'approved', body: 'Açık E: deney tasarlayın', outcome: 'FEN.7.1.3', difficulty: 'hard' },
];
const rubrikler: Record<number, any> = {
  41: { maxScore: 20, criteria: [{ label: 'Kavram', weight: 40, description: 'Sürtünme harekete zıttır' }, { label: 'Gerekçe', weight: 60 }] },
  30: { maxScore: 10, criteria: [{ label: 'Tasarım', weight: 100, description: '' }] },
};
const state: any = {
  exam: { questionIds: [41, 12, 99, 7, 30], title: 'Deneme' },
  questions: sorular, rubrics: rubrikler,
};
const MCP = 5;
const oturumlar: Record<number, any> = {
  // Ada: her şey onaylı; puanlar soruya özgü ki sütun ↔ soru eşlemesi görünsün.
  1: { mcResults: { 12: { correct: true }, 7: { correct: false } }, reviews: { 41: { finalScore: 17 }, 30: { finalScore: 8.5 } },
       aiEvals: { 41: { aiScore: 3 }, 30: { aiScore: 3 } } },
  // Kerem: 30 numaralı açık uçlu henüz onaylanmadı (yalnız yapay zekâ önerisi var).
  2: { mcResults: { 12: { correct: false }, 7: { correct: true } }, reviews: { 41: { finalScore: 11 } },
       aiEvals: { 30: { aiScore: 9 } } },
};
const ogrenciler = [{ id: 1, name: 'Ada Yılmaz' }, { id: 2, name: 'Kerem; "Can"' }];

const kod = ['yazdirSorulari', 'csvHucre', 'csvSayi', 'csvSatirlar', 'eokulPuanCsv', 'sinavKagidiHtml', 'escapeHtml', 'ondalikTr', 'oyssMetni']
  .map(fonksiyonMetni).join('\n');
// eslint-disable-next-line no-new-func
const f = new Function('state', 'yazdirPuan', 'yazdirBaslikHtml', 'soruKaynakIster', 'kaynakBul',
  kod + '\nreturn { yazdirSorulari, eokulPuanCsv, sinavKagidiHtml, oyssMetni };')(
  state, (q: any) => (q.type === 'mc' ? MCP : rubrikler[q.id].maxScore), () => '', () => false, () => null,
) as any;

const { sorular: kagitSorulari } = f.yazdirSorulari();
const r = f.eokulPuanCsv(kagitSorulari, ogrenciler, (id: number) => oturumlar[id], MCP);
const satirlar = r.csv.replace(/^﻿/, '').split('\n');

describe('e-Okul tablosu: S sırası = yazdırılan kâğıdın sırası', () => {
  it('kâğıt numaraları ile S sütunları aynı soruya denk gelir', () => {
    const html = f.sinavKagidiHtml(kagitSorulari);
    const kagit = [...html.matchAll(/<b>(\d+)\.<\/b> ([^<]*?) <span class="yz-puan">/g)].map((m) => [Number(m[1]), m[2]]);
    expect(kagit).toEqual([[1, 'Açık A: sürtünmeyi açıklayın'], [2, 'Çoktan B'], [3, 'Çoktan D'], [4, 'Açık E: deney tasarlayın']]);
    expect(r.basliklar).toEqual(['Okul No', 'Ad Soyad', 'S1', 'S2', 'S3', 'S4', 'Toplam']);
    // Ada'nın soruya özgü puanları kâğıt sırasına göre: A=17, B=5 (doğru), D=0 (yanlış), E=8,5.
    expect(satirlar[1]).toBe(';Ada Yılmaz;17;5;0;8,5;30,5');
  });

  it('onaysız soru (id 99) ne kâğıtta ne tabloda; sütun sayısı kâğıttaki soru sayısı', () => {
    expect(kagitSorulari.map((q: any) => q.id)).toEqual([41, 12, 7, 30]);
    expect(satirlar[0].split(';').length).toBe(2 + 4 + 1);
  });

  it('sinavYazdir ve eokulVerisi aynı listeden (yazdirSorulari) beslenir', () => {
    const yaz = fonksiyonMetni('sinavYazdir');
    expect(yaz).toContain('const y = yazdirSorulari();');
    expect(yaz).toContain('sinavKagidiHtml(y.sorular)');
    expect(fonksiyonMetni('eokulVerisi')).toContain('eokulPuanCsv(yazdirSorulari().sorular');
  });
});

describe('e-Okul tablosu: yalnız nihai puan', () => {
  it('onaylanmamış hücre boş, toplam boş; AI önerisi (9) yazılmaz', () => {
    expect(satirlar[2]).toBe(';"Kerem; ""Can""";11;0;5;;');
    expect(r.bekleyen).toBe(1);
  });
  it('dosyada açıklama satırı yok: BOM + başlık + öğrenci başına bir satır', () => {
    expect(r.csv.startsWith('﻿Okul No;Ad Soyad;S1')).toBe(true);
    expect(satirlar.length).toBe(1 + ogrenciler.length);
    expect(r.csv).not.toMatch(/onay bekliyor/);
  });
  it('indirme öncesi uyarı "X cevap onay bekliyor" ekranda ve modalda', () => {
    expect(fonksiyonMetni('eokulTabloHtml')).toContain('" cevap onay bekliyor');
    expect(fonksiyonMetni('wireEokulTablo')).toContain('r.bekleyen + " cevap onay bekliyor"');
  });
  it('var olan uzun öğrenci CSV\'si duruyor', () => {
    expect(fonksiyonMetni('ogrenciCsv')).toContain('"ogretmen_degistirdi_mi"');
  });
});

describe('OYSS paketi', () => {
  const metin = f.oyssMetni([sorular[0], sorular[4]], rubrikler, (k: string) => (k === 'FEN.7.1.2' ? 'Kuvvet ve hareket' : ''), () => '');
  it('kılavuz alan adları ve puanlama anahtarı (ölçüt puanı = tavan × ağırlık)', () => {
    expect(metin).toBe(
      '1. SORU\nÖğrenme çıktısı: FEN.7.1.2 — Kuvvet ve hareket\nGüçlük düzeyi: Orta\nSoru:\nAçık A: sürtünmeyi açıklayın\n\n' +
      'Puanlama anahtarı (toplam 20 puan):\n- Kavram (8 puan): Sürtünme harekete zıttır\n- Gerekçe (12 puan)\n\n\n' +
      '2. SORU\nÖğrenme çıktısı: FEN.7.1.3\nGüçlük düzeyi: Zor\nSoru:\nAçık E: deney tasarlayın\n\n' +
      'Puanlama anahtarı (toplam 10 puan):\n- Tasarım (10 puan)');
  });
  it('kodla başlayan katalog etiketinde kod iki kez yazılmaz', () => {
    const m = f.oyssMetni([sorular[0]], rubrikler, () => 'FEN.7.1.2 — Kuvvet ve Hareket', () => '');
    expect(m.split('\n')[1]).toBe('Öğrenme çıktısı: FEN.7.1.2 — Kuvvet ve Hareket');
  });
  it('onaysız soru ve yapay zekâ taslağı rubrik seçilemez', () => {
    const govde = fonksiyonMetni('oyssAdaylari');
    expect(govde).toContain('q.status !== "approved"');
    expect(govde).toContain('rub.aiDraft');
    const html = fonksiyonMetni('oyssPaketHtml');
    expect(html).toContain('a.engel ? " disabled"');
    expect(fonksiyonMetni('oyssSecimi')).toContain('!a.engel && o.oyss.secim[a.q.id]');
  });
  it('panoya erişilemezse metin seçilir (readonly textarea, select())', () => {
    expect(fonksiyonMetni('oyssPaketHtml')).toContain('readonly');
    expect(fonksiyonMetni('oyssKopyala')).toContain('ta.select()');
  });
});
