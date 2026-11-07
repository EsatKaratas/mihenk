// §102 — Öğrenme çıktısı kartı + karne kâğıdı.
// İstemci kodu tarayıcıda çalışır; fonksiyonlar public/app.js metninden
// alınıp yalıtılmış bir kapsamda kurulur (state yalnız buradaki sahte nesne).
// Odak: YALNIZ öğretmen onaylı puan (onaylı/onaysız ayrımı) ve eşik sınırları.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

/** app.js'teki sabit değerini okur (tek doğruluk kaynağı testte de o). */
function sabit(ad: string): unknown {
  const m = app.match(new RegExp('\\nconst ' + ad + ' = ([^;]+);'));
  expect(m, ad + ' sabiti bulunmalı').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('return (' + m![1] + ');')();
}

const ADLAR = [
  'ondalikTr', 'escapeHtml', 'kazanimKisaAd', 'veliSonuclari',
  'ogrenmeCiktisiHesapla', 'ogrenmeKazanimToplami', 'onayBekleyenSayisi', 'ogrenmeCiktisiVerisi',
  'ogrenmeKazanimAdi', 'siradakiAdimMetni', 'ogrenmeBekleyenMetni', 'ogrenmeCiktisiKartiHtml', 'karneKagidiHtml',
  // §125: kart ve karne gözlem bölümünü ayrı çizer (state.gozlemFormlari yoksa boş).
  'gozlemOgrenciOzeti', 'gozlemTarihMetni', 'gozlemKartBolumuHtml', 'gozlemKagitBolumuHtml',
];

const KAZANIMLAR = [
  { code: 'FEN.7.1.2', label: 'FEN.7.1.2 — Kuvvet ve Hareket' },
  { code: 'MAT.7.2.1', label: 'MAT.7.2.1 — Oran ve Orantı' },
];

/** Öğrenci 1: onaylı. Öğrenci 2: graded ama açık uçlu incelenmemiş.
    Öğrenci 3: submitted, yalnız yapay zekâ önerisi var (aiScore 17). */
function ornekState() {
  const sessions: Record<string, unknown> = {
    1: { examStatus: 'graded', mcResults: { 11: { correct: true } }, reviews: { 12: { finalScore: 10 } }, aiEvals: { 12: { aiScore: 17 } } },
    2: { examStatus: 'graded', mcResults: { 11: { correct: false } }, reviews: {}, aiEvals: { 12: { aiScore: 17 } } },
    3: { examStatus: 'submitted', mcResults: { 11: { correct: true } }, reviews: {}, aiEvals: { 12: { aiScore: 17 } } },
  };
  const sessions2: Record<string, unknown> = {
    1: { examStatus: 'graded', mcResults: { 21: { correct: true } }, reviews: {}, aiEvals: {} },
  };
  const exams = [
    { id: 1, title: 'Fen sınavı', status: 'published', questionIds: [11, 12], sessions },
    { id: 2, title: 'Mat sınavı', status: 'published', questionIds: [21], sessions: sessions2 },
    { id: 3, title: 'Taslak', status: 'draft', questionIds: [21], sessions: { 1: { examStatus: 'graded', mcResults: { 21: { correct: false } } } } },
  ];
  return {
    activeExamId: 99, exam: { status: 'draft' }, activeStudentId: 1,
    exams,
    students: [{ id: 1, name: 'Ada Yılmaz', sinif: '7-A' }, { id: 2, name: 'Kerem Aydın', sinif: '7-A' }, { id: 3, name: 'Elif Şahin', sinif: '7-B' }],
    questions: [
      { id: 11, type: 'mc', outcome: 'FEN.7.1.2' },
      { id: 12, type: 'open', outcome: 'FEN.7.1.2' },
      { id: 21, type: 'mc', outcome: 'MAT.7.2.1' },
    ],
    rubrics: { 12: { maxScore: 20 } },
  };
}

function kur(state = ornekState()) {
  const kod = ADLAR.map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  const fab = new Function(
    'state', 'OUTCOMES_LIST', 'OTURUM_ALANLARI', 'mcPuani', 'truncate', 'OGRENME_ESIK', 'OGRENME_SIRADAKI_EN_FAZLA',
    kod + '\nreturn {' + ADLAR.join(',') + '};',
  );
  return fab(
    state, () => KAZANIMLAR, ['answers', 'examStatus', 'aiEvals', 'reviews', 'mcResults'], () => 5,
    (s: string, n: number) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; },
    sabit('OGRENME_ESIK'), sabit('OGRENME_SIRADAKI_EN_FAZLA'),
  );
}

describe('§102 eşikler — tek yerde', () => {
  it('OGRENME_ESIK veli "Konulara göre durum" eşikleriyle aynı (70 / 50)', () => {
    expect(sabit('OGRENME_ESIK')).toEqual({ GUCLU: 70, DESTEK: 50 });
    // veliKonuSatiriHtml artık sabit sayı değil, sabiti okuyor.
    const metin = fonksiyonMetni('veliKonuSatiriHtml');
    expect(metin).toContain('OGRENME_ESIK.GUCLU');
    expect(metin).not.toMatch(/yuzde >= 70/);
  });
});

describe('§102 ogrenmeCiktisiHesapla — eşik sınırları', () => {
  const f = kur();
  it('tam %70 güçlü, %69 gelişime açık', () => {
    const r = f.ogrenmeCiktisiHesapla({ A: { alinan: 70, tam: 100 }, B: { alinan: 69, tam: 100 } }, 0);
    expect(r.guclu.map((x: { kod: string }) => x.kod)).toEqual(['A']);
    expect(r.gelisime.map((x: { kod: string }) => x.kod)).toEqual(['B']);
  });
  it('yuvarlama: 69,5 → %70 güçlü sayılır (ekrandaki yüzdeyle tutarlı)', () => {
    const r = f.ogrenmeCiktisiHesapla({ A: { alinan: 139, tam: 200 } }, 0);
    expect(r.guclu[0]).toEqual({ kod: 'A', yuzde: 70 });
  });
  it('sıradaki adım: gelişime açıklardan en düşük 2, artan sırada', () => {
    const r = f.ogrenmeCiktisiHesapla({
      A: { alinan: 9, tam: 10 }, B: { alinan: 6, tam: 10 }, C: { alinan: 2, tam: 10 }, D: { alinan: 4, tam: 10 },
    }, 0);
    expect(r.siradaki.map((x: { kod: string }) => x.kod)).toEqual(['C', 'D']);
    expect(r.gelisime).toHaveLength(3);
  });
  it('tek gelişime açık kazanım → tek sıradaki adım', () => {
    const r = f.ogrenmeCiktisiHesapla({ A: { alinan: 9, tam: 10 }, B: { alinan: 5, tam: 10 } }, 0);
    expect(r.siradaki.map((x: { kod: string }) => x.kod)).toEqual(['B']);
  });
  it('hepsi güçlü → en düşük tek kazanım pekiştirme olarak', () => {
    const r = f.ogrenmeCiktisiHesapla({ A: { alinan: 10, tam: 10 }, B: { alinan: 8, tam: 10 } }, 0);
    expect(r.gelisime).toHaveLength(0);
    expect(r.siradaki.map((x: { kod: string }) => x.kod)).toEqual(['B']);
  });
  it('tavanı 0 olan kazanım hesaba girmez; bekleyen sayısı negatif olamaz', () => {
    const r = f.ogrenmeCiktisiHesapla({ A: { alinan: 0, tam: 0 } }, -3);
    expect(r.guclu).toHaveLength(0);
    expect(r.gelisime).toHaveLength(0);
    expect(r.siradaki).toHaveLength(0);
    expect(r.bekleyen).toBe(0);
  });
});

describe('§102 onaylı / onaysız ayrımı', () => {
  it('onaylı öğrenci: iki yayındaki sınav, taslak sınav hariç; bekleyen 0', () => {
    const f = kur();
    const v = f.ogrenmeCiktisiVerisi(1);
    expect(v.sonuclar.map((s: { baslik: string }) => s.baslik)).toEqual(['Fen sınavı', 'Mat sınavı']);
    // FEN: ÇSS 5/5 + açık uçlu onaylı 10/20 = 15/25 → %60; MAT: 5/5 → %100
    expect(v.kart.guclu).toEqual([{ kod: 'MAT.7.2.1', yuzde: 100 }]);
    expect(v.kart.gelisime).toEqual([{ kod: 'FEN.7.1.2', yuzde: 60 }]);
    expect(v.kart.bekleyen).toBe(0);
  });
  it('graded ama açık uçlu onaysız: puan karta girmez, 1 bekleyen sayılır; YZ önerisi (17) kullanılmaz', () => {
    const f = kur();
    const v = f.ogrenmeCiktisiVerisi(2);
    expect(v.kart.bekleyen).toBe(1);
    expect(v.kart.gelisime).toEqual([{ kod: 'FEN.7.1.2', yuzde: 0 }]);   // yalnız ÇSS 0/5
    expect(v.sonuclar[0].tam).toBe(5);
  });
  it('submitted (öğretmen yayınlamadı): hiç onaylı sonuç yok, sınavın tüm soruları bekleyen', () => {
    const f = kur();
    const v = f.ogrenmeCiktisiVerisi(3);
    expect(v.sonuclar).toHaveLength(0);
    expect(v.kart.bekleyen).toBe(2);
    const html = f.ogrenmeCiktisiKartiHtml(3, 'ogrenci');
    expect(html).toContain('2 cevap öğretmen onayı bekliyor; kart onaydan sonra güncellenir.');
    expect(html).not.toContain('js-karne-yazdir');   // onaylı sonuç yoksa yazdır düğmesi yok
    expect(html).not.toContain('17');
  });
  it('aktif oturum state üzerinden okunur (submitted → bekleyen)', () => {
    const s = ornekState();
    (s as Record<string, unknown>).activeExamId = 2;
    (s as Record<string, unknown>).exam = s.exams[1];
    Object.assign(s, { examStatus: 'submitted', reviews: {}, mcResults: { 21: { correct: true } }, answers: {}, aiEvals: {} });
    const f = kur(s);
    expect(f.onayBekleyenSayisi(1)).toBe(1);
    expect(f.ogrenmeCiktisiVerisi(1).sonuclar.map((x: { baslik: string }) => x.baslik)).toEqual(['Fen sınavı']);
  });
  it('hiç sonuç ve bekleyen yoksa kart çizilmez', () => {
    const s = ornekState();
    s.students.push({ id: 4, name: 'Can', sinif: '7-C' });
    expect(kur(s).ogrenmeCiktisiKartiHtml(4, 'veli')).toBe('');
  });
});

describe('§102 kart ve karne metni', () => {
  const f = kur();
  it('kartta üç bölüm + yazdır düğmesi; kazanım adı okunur, öneri kazanımdan türetilmiş', () => {
    const html = f.ogrenmeCiktisiKartiHtml(1, 'ogrenci');
    expect(html).toContain('Güçlü');
    expect(html).toContain('Gelişime açık');
    expect(html).toContain('Sıradaki adım');
    expect(html).toContain('js-karne-yazdir');
    expect(html).toContain('Oran ve Orantı');
    expect(html).toContain('“Kuvvet ve Hareket” konusunda 2–3 benzer soru çöz');
  });
  it('sıradaki adım metni: eşik altı / arası / üstü ve veli dili', () => {
    expect(f.siradakiAdimMetni('X', 49, 'ogrenci')).toContain('temel kavramlarını');
    expect(f.siradakiAdimMetni('X', 50, 'ogrenci')).toContain('benzer soru çöz');
    expect(f.siradakiAdimMetni('X', 70, 'ogrenci')).toContain('pekiştir');
    expect(f.siradakiAdimMetni('X', 30, 'veli')).toMatch(/^Çocuğunuzla/);
  });
  it('karne kâğıdı: ad, sınav, onaylı puan, tarih; YZ önerisi ve başka öğrenci YOK', () => {
    const html = f.karneKagidiHtml(2, 'veli');
    expect(html).toContain('Kerem Aydın');
    expect(html).toContain('Fen sınavı');
    expect(html).toContain('0 / 5');                       // yalnız onaylı ÇSS
    expect(html).toContain('1 cevap öğretmen onayı bekliyor');
    expect(html).toMatch(/\d{4}/);                         // tarih
    expect(html).not.toContain('17');                      // YZ önerisi kâğıda çıkmaz
    expect(html).not.toContain('/ 25');                    // onaysız açık uçlunun tavanı da girmez
    expect(html).not.toContain('Ada');
    expect(html).not.toContain('Elif');
  });
});
