// §73 / W4 — Eğitim Yöneticisi panosu filtreleri (sınıf · ders · öğretmen).
// İstemci kodu tarayıcıda çalışır; fonksiyonlar public/app.js metninden
// alınıp yalıtılmış bir kapsamda kurulur (state yalnız buradaki sahte nesne).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

/** "function ad(" ile başlayan üst düzey fonksiyonun tam metni. */
function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

const ADLAR = [
  'yonFiltreAktif', 'yonSinavi', 'yonOgretmenAdi', 'yonSinavSorulari', 'yonSoruDersi', 'yonSoruUygunMu',
  'yonSinavUygunMu', 'yonOgrenciler', 'yonOturum', 'yonFiltreSecenekleri', 'yonFiltreGecerli',
  'yonFiltreOzet', 'yonPuanlar', 'yonSinavGecmisi', 'yonKayitlariSuz', 'okulGercekDurum',
];

const KAZANIMLAR = [
  { code: 'FEN.7.1.2', label: 'FEN.7.1.2 — Kuvvet ve Hareket', subject: 'Fen Bilimleri' },
  { code: 'MAT.7.2.1', label: 'MAT.7.2.1 — Oran ve Orantı', subject: 'Matematik' },
];

/** İki sınıf, iki öğretmen, iki ders; aktif sınav 1. */
function ornekState() {
  const graded = (mc: Record<number, boolean>, rev: Record<number, number> = {}, extra = {}) => ({
    examStatus: 'graded',
    mcResults: Object.fromEntries(Object.entries(mc).map(([k, v]) => [k, { correct: v }])),
    reviews: Object.fromEntries(Object.entries(rev).map(([k, v]) => [k, { finalScore: v }])),
    aiEvals: {}, ...extra,
  });
  const sessions1: Record<string, unknown> = {
    1: graded({ 11: true }, { 12: 10 }),
    2: graded({ 11: false }, { 12: 20 }),
    3: { examStatus: 'submitted', mcResults: { 11: { correct: true } }, reviews: {}, aiEvals: { 12: { aiScore: 15 } } },
  };
  const sessions2: Record<string, unknown> = {
    1: graded({ 21: true }),
    3: graded({ 21: false }),
  };
  const exams = [
    { id: 1, title: 'Fen sınavı', status: 'published', teacherName: 'Ayşe Kaya', questionIds: [11, 12], sessions: sessions1 },
    { id: 2, title: 'Matematik sınavı', status: 'published', teacherName: '', questionIds: [21], sessions: sessions2 },
    { id: 3, title: 'Taslak', status: 'draft', teacherName: 'Can Er', questionIds: [21], sessions: {} },
  ];
  return {
    activeExamId: 1,
    exam: exams[0],
    exams,
    students: [
      { id: 1, name: 'Ada', sinif: '7-A' },
      { id: 2, name: 'Kerem', sinif: '7-A' },
      { id: 3, name: 'Elif', sinif: '7-B' },
    ],
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
  const readSession = (sid: number) => (state.exams[0].sessions as Record<string, unknown>)[sid] || null;
  // eslint-disable-next-line no-new-func
  const fab = new Function(
    'state', 'OUTCOMES_LIST', 'kodDanDers', 'VARSAYILAN_OGRETMEN_ADI', 'readSession', 'YON_FILTRE_BOS',
    kod + '\nreturn {' + ADLAR.join(',') + '};',
  );
  return fab(state, () => KAZANIMLAR, () => '', 'İsimsiz Öğretmen', readSession, { ders: '', sinif: '', ogretmen: '' });
}

const BOS = { ders: '', sinif: '', ogretmen: '' };

describe('yonetici filtre — seçenekler yalnız gerçek veriden', () => {
  it('taslak sınavın öğretmeni ve dersi seçeneklere girmez; boş öğretmen adı varsayılan ada düşer', () => {
    const { yonFiltreSecenekleri } = kur();
    const s = yonFiltreSecenekleri();
    expect(s.sinif).toEqual(['7-A', '7-B']);
    expect(s.ders).toEqual(['Fen Bilimleri', 'Matematik']);
    expect(s.ogretmen).toEqual(['Ayşe Kaya', 'İsimsiz Öğretmen']);
    expect(s.ogretmen).not.toContain('Can Er');
  });

  it('artık var olmayan kayıtlı seçim "tümü" olur', () => {
    const { yonFiltreGecerli, yonFiltreSecenekleri } = kur();
    const f = yonFiltreGecerli({ ders: 'Türkçe', sinif: '7-A', ogretmen: 'Silinmiş' }, yonFiltreSecenekleri());
    expect(f).toEqual({ ders: '', sinif: '7-A', ogretmen: '' });
  });

  it('ders yalnız kazanım kodundan; kodu olmayan sorunun dersi boştur', () => {
    const { yonSoruDersi } = kur();
    expect(yonSoruDersi({ outcome: 'MAT.7.2.1' })).toBe('Matematik');
    expect(yonSoruDersi({ outcome: '' })).toBe('');
    expect(yonSoruDersi({})).toBe('');
  });
});

describe('yonetici filtre — sınav ve öğrenci süzme', () => {
  it('filtre boşken yalnız yayınlanmış sınavlar uygundur', () => {
    const { yonSinavUygunMu } = kur();
    const st = ornekState();
    expect(st.exams.map((k) => yonSinavUygunMu(k, BOS))).toEqual([true, true, false]);
  });

  it('öğretmen ve ders filtresi sınavı süzer', () => {
    const { yonSinavUygunMu } = kur();
    const st = ornekState();
    expect(st.exams.map((k) => yonSinavUygunMu(k, { ...BOS, ogretmen: 'Ayşe Kaya' }))).toEqual([true, false, false]);
    expect(st.exams.map((k) => yonSinavUygunMu(k, { ...BOS, ders: 'Matematik' }))).toEqual([false, true, false]);
  });

  it('sınıf filtresi öğrenciyi süzer', () => {
    const { yonOgrenciler } = kur();
    expect(yonOgrenciler({ ...BOS, sinif: '7-B' }).map((o: { id: number }) => o.id)).toEqual([3]);
    expect(yonOgrenciler(BOS)).toHaveLength(3);
  });

  it('özet metni seçilenleri sırayla yazar', () => {
    const { yonFiltreOzet, yonFiltreAktif } = kur();
    expect(yonFiltreAktif(BOS)).toBe(false);
    expect(yonFiltreOzet({ ders: 'Matematik', sinif: '7-A', ogretmen: '' })).toBe('7-A · Matematik');
  });
});

describe('yonetici filtre — sayılar', () => {
  it('okul durumu: filtre boşken 2 yayınlı sınav × 3 öğrenci = 6 atama', () => {
    const { okulGercekDurum } = kur();
    expect(okulGercekDurum(BOS)).toEqual({ atanan: 6, tamamlanan: 5, bekleyen: 1 });
  });

  it('okul durumu: sınıf ve ders filtresiyle', () => {
    const { okulGercekDurum } = kur();
    expect(okulGercekDurum({ ...BOS, sinif: '7-B' })).toEqual({ atanan: 2, tamamlanan: 2, bekleyen: 1 });
    // Matematik sınavında açık uçlu yok: Fen'deki bekleyen yanıt sayılmaz.
    expect(okulGercekDurum({ ...BOS, ders: 'Matematik' })).toEqual({ atanan: 3, tamamlanan: 2, bekleyen: 0 });
  });

  it('kazanım yüzdesi yalnız onaylı oturumdan; gönderilmiş ama onaylanmamış yanıt katılmaz', () => {
    const { yonPuanlar } = kur();
    const st = ornekState();
    const p = yonPuanlar(BOS, st.students, st.exams.slice(0, 2));
    // FEN: Ada 100 + 50, Kerem 0 + 100 → ort. 62,5 → 63; Elif "submitted" sayılmaz.
    expect(p.scores['FEN.7.1.2']).toBe(63);
    // MAT: Ada 100, Elif 0 → 50.
    expect(p.scores['MAT.7.2.1']).toBe(50);
    expect(p.ogrenci).toBe(3);
  });

  it('ders filtresi başka dersin kazanımını grafikten çıkarır', () => {
    const { yonPuanlar } = kur();
    const st = ornekState();
    const p = yonPuanlar({ ...BOS, ders: 'Fen Bilimleri' }, st.students, st.exams.slice(0, 2));
    expect(Object.keys(p.scores)).toEqual(['FEN.7.1.2']);
  });

  it('gelişim geçmişi: onaylı katkısı olmayan sınav listeye girmez', () => {
    const { yonSinavGecmisi } = kur();
    const g = yonSinavGecmisi({ ...BOS, sinif: '7-B' });
    expect(g.map((x: { baslik: string }) => x.baslik)).toEqual(['Matematik sınavı']);
  });

  it('öğretmen kararı kayıtları sınıf ve derse göre süzülür', () => {
    const { yonKayitlariSuz } = kur();
    const kayitlar = [{ sid: '1', qid: '12' }, { sid: '3', qid: '12' }, { sid: '1', qid: '21' }];
    expect(yonKayitlariSuz(kayitlar, BOS)).toBe(kayitlar);
    expect(yonKayitlariSuz(kayitlar, { ...BOS, sinif: '7-A' })).toHaveLength(2);
    expect(yonKayitlariSuz(kayitlar, { ...BOS, ders: 'Fen Bilimleri' })).toHaveLength(2);
    expect(yonKayitlariSuz(kayitlar, { ...BOS, sinif: '7-A', ders: 'Matematik' })).toEqual([{ sid: '1', qid: '21' }]);
  });
});
