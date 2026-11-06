/**
 * §117 — Türkçe 6–7: ÖDSGM tabloları 2024 programının numaralarını kullanıyor, katalog 2026'ya göre.
 * Eşleme yalnız OYSS akışında uygulanır; katalog değişmez; belirsiz/karşılıksız satırda öneri YOK.
 * Gerçek ÖDSGM dosyası depoda değil; satır metinleri app.js'teki eşleme tablosundan (MEB 2024 program
 * metni) kurulur, 2026 metinleri public/mufredat kataloğundan okunur.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8');
const bas = app.indexOf('§114 — OYSS SENARYOSUNDAN SINAV KUR');
const blok = app.slice(app.lastIndexOf('/*', bas), app.indexOf('\nfunction wireTeacherTab1()', bas));
const katalogOku = (ad: string) => JSON.parse(fs.readFileSync(path.join(kok, 'public', 'mufredat', ad + '.json'), 'utf8'));

function kur(state: any, ogt: any = {}) {
  const izler: any[] = [];
  // eslint-disable-next-line no-new-func
  const f = new Function('DOMParser', 'state', 'auditKaydet', 'rolAdi', 'ogtDurum', 'aktifOturumuYaz', 'saveState', 'katalogAnahtari',
    'escapeHtml', 'truncate', 'diffLabel',
    blok + '\nreturn { OYSS_TURKCE_2024_2026, oyssMetinBenzerlik, oyssEslemKaydi, oyssSurumAlgila, oyssSurumUygula, oyssEslestir, ' +
    'oyssKatalogMetinleri, oyssGorunum, oyssYazmaKapali, oyssPlanSatiri, oyssPlanKarsilastir, oyssTaslagaYaz, oyssTabloHtml, oyssKodNormal };')(
    undefined, state, (tur: string, v: any) => izler.push({ tur, ...v }), () => 'Öğretmen', () => ogt, () => {}, () => {},
    (d: string, s: any) => d + '|' + s, (x: string) => String(x), (x: string) => String(x), (x: string) => String(x),
  );
  return Object.assign(f, { izler });
}

const katalog: Record<string, any> = {
  'Türkçe|5': katalogOku('turkce-5'), 'Türkçe|6': katalogOku('turkce-6'), 'Türkçe|7': katalogOku('turkce-7'),
  'Matematik|6': katalogOku('matematik-6'),
};
const k = kur({ questions: [], exam: { questionIds: [] }, katalog });
const metin26 = (sinif: number) => k.oyssKatalogMetinleri({ ders: 'Türkçe', sinif });
const ESLEM: [string, string | null, string][] = k.OYSS_TURKCE_2024_2026;

/** ÖDSGM biçiminde tablo: satırlar [kod, metin, istenen]; senaryo sütunu 3. */
function tablo(sinif: number, satirlar: [string, string, number][], ders = 'Türkçe') {
  return { ad: sinif + '. SINIF', baslik: 'SENTETİK', ders, sinif, notlar: [], atlanan: [],
    sinavlar: [{ ad: '1. Sınav', senaryolar: [{ ad: 'Senaryo 1', sutun: 3 }] }],
    satirlar: satirlar.map(([kod, metin, n]) => ({ kod, metin, sayilar: n ? { 3: n } : {} })) };
}
/** ÖDSGM'nin gerçekte yaptığı gibi: o sınıfın 2024 kodları + 2024 metinleri, her satırda 1 soru. */
const tablo2024 = (sinif: number) => tablo(sinif, ESLEM.filter((r) => r[0].split('.')[2] === String(sinif)).map((r) => [r[0], r[2], 1]));
const senaryo = (t: any) => t.satirlar.filter((r: any) => r.sayilar[3]).map((r: any) => ({ kod: r.kod, metin: r.metin, istenen: r.sayilar[3] }));
const hazirla = (t: any) => {
  const km = k.oyssKatalogMetinleri(t);
  const algi = k.oyssSurumAlgila(t, km);
  return { algi, satirlar: k.oyssSurumUygula(senaryo(t), algi, km) };
};

/* Aynı kod iki programda FARKLI kazanım: [ÖDSGM/2024 kodu, 2026 karşılığı | null] */
const CAKISAN: [string, string | null][] = [
  ['T.O.6.11', 'T.O.6.10'], ['T.O.6.12', 'T.O.6.11'], ['T.O.6.16', 'T.O.6.15'], ['T.O.6.17', 'T.O.6.16'],
  ['T.O.6.18', 'T.O.6.17'], ['T.O.6.19', 'T.O.6.18'], ['T.O.6.21', 'T.O.6.20'], ['T.O.6.23', 'T.O.6.21'],
  ['T.Y.6.4', 'T.Y.6.6'], ['T.Y.6.5', null], ['T.Y.6.7', 'T.Y.6.5'], ['T.Y.6.9', 'T.Y.6.7'], ['T.Y.6.10', 'T.Y.6.8'],
  ['T.Y.6.11', 'T.Y.6.9'], ['T.Y.6.17', 'T.Y.6.14'], ['T.Y.6.18', 'T.Y.6.15'],
  ['T.O.7.14', 'T.O.7.13'], ['T.O.7.15', 'T.O.7.14'], ['T.O.7.21', 'T.O.7.20'], ['T.Y.7.18', 'T.Y.7.16'],
];
const EKSIK: [string, string][] = [
  ['T.O.6.27', 'T.O.6.25'], ['T.Y.6.21', 'T.Y.6.18'], ['T.Y.6.22', 'T.Y.6.19'],
  ['T.O.7.28', 'T.O.7.26'], ['T.Y.7.21', 'T.Y.7.19'], ['T.Y.7.22', 'T.Y.7.20'],
];

describe('eşleme tablosu (2024 → 2026)', () => {
  it('49 satır, yalnız Türkçe 6–7; her hedef 2026 kataloğunda var', () => {
    expect(ESLEM).toHaveLength(49);
    for (const [eski, yeni, m] of ESLEM) {
      expect(eski).toMatch(/^T\.[OY]\.[67]\.\d+$/);
      expect(m.length).toBeGreaterThan(5);
      if (yeni) expect(metin26(Number(eski.split('.')[2]))![yeni], eski + ' → ' + yeni).toBeTruthy();
    }
    expect(ESLEM.filter((r) => r[1] === null).map((r) => r[0])).toEqual(['T.Y.6.5']);
  });
  it('katalog DEĞİŞMEDİ: eski kodlar eklenmedi (2026 programı: T.O.6.1–25, T.Y.6.1–19, T.O.7.1–26, T.Y.7.1–20)', () => {
    const say = (s: number, a: string) => katalog['Türkçe|' + s].kazanimlar.filter((x: any) => x.kod.startsWith('T.' + a + '.' + s + '.')).length;
    expect([say(6, 'O'), say(6, 'Y'), say(7, 'O'), say(7, 'Y')]).toEqual([25, 19, 26, 20]);
    for (const [eski] of EKSIK) expect(metin26(Number(eski.split('.')[2]))![eski]).toBeUndefined();
  });
  it('kaynak URL ve PDF SHA-256 yorumda', () => {
    expect(blok).toContain('https://mufredat.meb.gov.tr/ProgramDetay.aspx?PID=1979');
    expect(blok).toContain('https://mufredat.meb.gov.tr/ProgramDetay.aspx?PID=2352');
    expect(blok).toContain('7aa679b8f8f33790d99a7eca98f2712f16951b56a2ed4a608ec3ad0e5ebc0970');
    expect(blok).toContain('f9c44b1059a0d5a7a5aa4e0de3dce6821fce3d873c256ca86219e2347f07497a');
  });
});

describe('numaralandırma algılama', () => {
  it('ÖDSGM biçimindeki 6. ve 7. sınıf tabloları "2024" algılanır', () => {
    for (const s of [6, 7]) {
      const a = k.oyssSurumAlgila(tablo2024(s), metin26(s));
      expect(a.durum, s + '. sınıf').toBe('2024');
      expect(a.sayilar.yalniz2026).toBe(0);
      expect(a.sayilar.yalniz2024).toBeGreaterThan(0);
    }
  });
  it('2026 numaralı tablo "2026" algılanır, çeviri yapılmaz', () => {
    const kat = katalog['Türkçe|6'].kazanimlar.slice(0, 12);
    const t = tablo(6, kat.map((x: any) => [x.kod, x.metin, 1]));
    const { algi, satirlar } = hazirla(t);
    expect(algi.durum).toBe('2026');
    expect(satirlar.map((r: any) => r.kod)).toEqual(kat.map((x: any) => x.kod));
    expect(satirlar.every((r: any) => !r.oneriYok && r.izler.length === 0)).toBe(true);
  });
  it('karışık tablo: çeviri YOK, tüm satırlarda öneri durur, taslağa yazma kapalı', () => {
    const k26 = katalog['Türkçe|6'].kazanimlar.find((x: any) => x.kod === 'T.O.6.23');
    const t = tablo(6, [['T.O.6.21', ESLEM.find((r) => r[0] === 'T.O.6.21')![2], 2], [k26.kod, k26.metin, 1]]);
    const { algi, satirlar } = hazirla(t);
    expect(algi.durum).toBe('karisik');
    expect(satirlar.map((r: any) => [r.kod, r.oneriYok])).toEqual([['T.O.6.21', 'durdu'], ['T.O.6.23', 'durdu']]);
    expect(k.oyssYazmaKapali(algi)).toBe(true);
    const sorular = [{ id: 1, status: 'approved', outcome: 'T.O.6.21' }, { id: 2, status: 'approved', outcome: 'T.O.6.23' }];
    expect(k.oyssEslestir(satirlar, sorular, [], null).every((r: any) => r.adaylar.length === 0 && r.onerilen.length === 0)).toBe(true);
  });
  it('katalog yoksa (yüklenmedi/yüklenemedi) Türkçe 6–7 önerisi durur; sessiz yedek yok', () => {
    const t = tablo2024(6);
    const algi = k.oyssSurumAlgila(t, null);
    expect(algi.durum).toBe('katalogYok');
    expect(k.oyssSurumUygula(senaryo(t), algi, null).every((r: any) => r.oneriYok === 'durdu')).toBe(true);
    expect(k.oyssYazmaKapali(algi)).toBe(true);
  });
  it('5. sınıf Türkçe ve Matematik DEĞİŞMEDEN kalır (denetim yok)', () => {
    const t5 = tablo(5, [['T.O.5.6', 'Herhangi bir metin', 2]]);
    const tm = tablo(6, [['MAT.6.1.1', 'x', 1]], 'Matematik');
    for (const t of [t5, tm]) {
      const { algi, satirlar } = hazirla(t);
      expect(algi.durum).toBe('denetimYok');
      expect(satirlar).toEqual([{ kod: t.satirlar[0].kod, metin: t.satirlar[0].metin, istenen: t.satirlar[0].sayilar[3], odsgmKodlar: [t.satirlar[0].kod], izler: [], oneriYok: '' }]);
      expect(k.oyssYazmaKapali(algi)).toBe(false);
    }
  });
});

describe('çeviri: 20 çakışan kod, 6 eksik kod, karşılıksız satır', () => {
  const s6 = hazirla(tablo2024(6)).satirlar;
  const s7 = hazirla(tablo2024(7)).satirlar;
  const bul = (eski: string) => [...s6, ...s7].find((r: any) => r.odsgmKodlar.includes(eski));

  it.each(CAKISAN)('çakışan %s → %s; aynı numaralı (başka anlamlı) 2026 sorusu ÖNERİLMEZ', (eski, yeni) => {
    const r = bul(eski)!;
    expect(r).toBeTruthy();
    const sorular = [{ id: 1, status: 'approved', outcome: eski }, { id: 2, status: 'approved', outcome: yeni || 'YOK' }];
    const e = k.oyssEslestir([r], sorular, [], null)[0];
    expect(e.adaylar).not.toContain(1);                        // 2026'da o kod başka kazanım: yanlış öneri yok
    if (yeni) {
      expect(r.kod).toBe(yeni);
      expect(r.izler).toContainEqual({ eski, yeni, metin: metin26(Number(eski.split('.')[2]))![yeni] });
      expect(e.onerilen).toEqual([2]);
    } else {
      expect(r.oneriYok).toBe('eslesmeYok');
      expect(e.adaylar).toEqual([]);
    }
  });

  it.each(EKSIK)('katalogda olmayan %s → %s (çevrilir, iz görünür)', (eski, yeni) => {
    const r = bul(eski)!;
    expect(r.kod).toBe(yeni);
    expect(r.oneriYok).toBe('');
    expect(r.izler.map((z: any) => z.eski + '→' + z.yeni)).toContain(eski + '→' + yeni);
  });

  it('T.Y.6.5: karşılığı yok → öneri üretilmez, "eşleşme yok, elle seçin"', () => {
    const r = bul('T.Y.6.5')!;
    expect(r).toMatchObject({ kod: 'T.Y.6.5', oneriYok: 'eslesmeYok', izler: [] });
    const e = k.oyssEslestir([r], [{ id: 7, status: 'approved', outcome: 'T.Y.6.5' }], [], null)[0];
    expect(e).toMatchObject({ adaylar: [], onerilen: [], eksik: 0, oneriYok: 'eslesmeYok' });
  });

  it('aynı 2026 koduna düşen iki satır birleşir (T.O.6.10 + T.O.6.11 → T.O.6.10, istenen toplanır)', () => {
    const r = s6.filter((x: any) => x.kod === 'T.O.6.10');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ istenen: 2, odsgmKodlar: ['T.O.6.10', 'T.O.6.11'] });
    expect(r[0].izler.map((z: any) => z.eski)).toEqual(['T.O.6.11']);
  });

  it('belirsiz satır: kod tabloda ama metin 2024 metniyle uyuşmuyor → öneri yok', () => {
    const t = tablo2024(6);
    t.satirlar.push({ kod: 'T.O.6.13', metin: 'Tamamen başka bir şey', sayilar: { 3: 1 } } as any);
    const r = hazirla(t).satirlar.find((x: any) => x.odsgmKodlar.includes('T.O.6.13'));
    expect(r.oneriYok).toBe('belirsiz');
  });
});

describe('taslağa yazma ve 2. adım', () => {
  const durum = () => ({
    questions: [{ id: 1, status: 'approved', outcome: 'T.O.6.21', difficulty: 'easy', body: 'özetleme' },
                { id: 2, status: 'approved', outcome: 'T.O.6.23', difficulty: 'easy', body: 'eleştiri' }],
    exam: { title: 'S', questionIds: [], status: 'draft' }, katalog, role: 'teacher', auditLog: [],
  });
  const t = tablo(6, [['T.O.6.23', 'Okuduğunu özetleyebilme', 1], ['T.Y.6.5', 'Yazılı etkileşiminde uygun tepki verebilme', 2],
    ['T.O.6.1', 'Okumada materyal seçimini yönetebilme', 0]]);

  it('2024 tablosu: doğru kazanımın sorusu eklenir, plan ÖDSGM izini ve elle satırını taşır', () => {
    const st: any = durum();
    const ogt = { oyss: { tablolar: [t], sayfa: 0, sinav: 0, senaryo: 0, secim: null } };
    const f = kur(st, ogt);
    expect(f.oyssTaslagaYaz()).toBe(true);
    expect(st.exam.questionIds).toEqual([1]);                         // T.O.6.21 (özetleme), T.O.6.23 (eleştiri) DEĞİL
    expect(st.exam.status).toBe('draft');
    expect(st.exam.oyssSenaryo.satirlar).toEqual([
      { kod: 'T.O.6.21', istenen: 1, odsgm: 'T.O.6.23' },
      { kod: '', istenen: 2, odsgm: 'T.Y.6.5', elle: true },
    ]);
    expect(st.exam.oyssSenaryo.numaralandirma).toBe('ÖDSGM 2024 → 2026 programı');
    expect(f.izler[0]).toMatchObject({ tur: 'oyss_senaryo_yazildi', cevrilen: 1, elleSecilecek: 1, eklenen: 1, eksik: 0 });
    const k2 = f.oyssPlanKarsilastir(st.exam.oyssSenaryo, st.questions, st.exam.questionIds);
    expect(k2).toEqual([
      { kod: 'T.O.6.21', istenen: 1, sinavda: 1, eksik: 0, fazla: 0, odsgm: 'T.O.6.23' },
      { kod: '', odsgm: 'T.Y.6.5', istenen: 2, sinavda: null, eksik: 0, fazla: 0, elle: true },
    ]);
  });

  it('kart HTML: açık uyarı + satırda "ÖDSGM T.O.6.23 → T.O.6.21 (metin)" izi + eşleşme yok', () => {
    const st: any = durum();
    const f = kur(st, { yeni: false, oyss: { tablolar: [t], sayfa: 0, sinav: 0, senaryo: 0, secim: null } });
    const h = f.oyssTabloHtml(false);
    expect(h).toContain('Bu tablo 2024 program numaralarını kullanıyor; kodlar 2026 programına çevrildi.');
    expect(h).toContain('ÖDSGM T.O.6.23 → T.O.6.21 (Okuduğunu özetleyebilme)');
    expect(h).toContain('Eşleşme yok: 2026 programında karşılığı bulunamadı. Soruları elle seçin.');
    expect(h).not.toMatch(/id="btnOyssKurYaz" disabled/);
  });

  it('karışık tabloda taslağa yazılmaz, düğme kapalı, uyarı role=alert', () => {
    const k26 = katalog['Türkçe|6'].kazanimlar.find((x: any) => x.kod === 'T.O.6.23');
    const tk = tablo(6, [['T.O.6.21', 'Metinden hareketle söz varlığını geliştirmeye yönelik çözümleme yapabilme', 1], [k26.kod, k26.metin, 1]]);
    const st: any = durum();
    const f = kur(st, { yeni: false, oyss: { tablolar: [tk], sayfa: 0, sinav: 0, senaryo: 0, secim: null } });
    const h = f.oyssTabloHtml(false);
    expect(h).toMatch(/class="sy-hata oyss-surum" role="alert"><b>Numaralandırma belirlenemedi/);
    expect(h).toMatch(/id="btnOyssKurYaz" disabled/);
    expect(f.oyssTaslagaYaz()).toBe(false);
    expect(st.exam.oyssSenaryo).toBeUndefined();
    expect(st.exam.questionIds).toEqual([]);
  });

  it('eski plan kayıtları (yalnız {kod, istenen}) aynı sonucu verir', () => {
    const plan = { satirlar: [{ kod: 'T.O.5.6', istenen: 2 }] };
    expect(k.oyssPlanKarsilastir(plan, [{ id: 1, outcome: 'T.O.5.6' }], [1])).toEqual([{ kod: 'T.O.5.6', istenen: 2, sinavda: 1, eksik: 1, fazla: 0 }]);
  });
});
