// ============================================================================
// §126 — Öğrenci/veli itirazı (yeniden inceleme talebi), Q3.
// Kaynak: MEB Eğitimde YZ Uygulamaları Etik Kılavuzu (Ocak 2026) §2.6 —
// https://ttkb.meb.gov.tr/meb_iys_dosyalar/2026_01/09152326_egitimdeyapayzekauygulamalari_etik_kilavuzu.pdf
// Zincir: itiraz → kuyrukta 1 kayıt → öğretmen kararı → günlükte satır + CSV
// `itiraz` sütunu. Öğretmen karar vermeden puan değişmez; YZ çağrılmaz.
// İstemci kodu public/app.js metninden alınıp yalıtılmış kapsamda kurulur.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function arasi(bas: string, son: string): string {
  const i = app.indexOf(bas);
  const j = app.indexOf(son, i);
  expect(i, bas).toBeGreaterThan(0);
  expect(j, son).toBeGreaterThan(i);
  return app.slice(i, j);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}
function sabitDizi(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf('];\n', bas) + 3);
}
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const ITIRAZ_FN = ['itirazAnahtari', 'itirazSinavi', 'itirazOturumu', 'itirazOturumYaz', 'itirazTavan', 'itirazAdaylari',
  'itirazBul', 'itirazKisiselVeriVar', 'itirazMetniDenetle', 'itirazCakismaVar', 'itirazYeniId', 'itirazAc', 'itirazKarar', 'itirazlarSinifta',
  'itirazDurumHtml', 'itirazFormHtml', 'itirazSatirHtml', 'itirazKartiHtml', 'itirazKararAdi', 'itirazKuyrukKartiHtml',
  'itirazKararFormuHtml', 'itirazGecmisSatirHtml', 'itirazElleFormHtml', 'itirazKuyruguHtml', 'itirazGunlukDetay'];
const DIGER_FN = ['readSession', 'writeSession', 'sessionOf', 'examSessions', 'bosOturum', 'findQuestion',
  'ensureAudit', 'auditKaydet', 'auditKisalt', 'auditZaman', 'ondalikTr', 'truncate', 'auditCsv',
  'sha256Hex', 'arastirmaKriterFarklari', 'arastirmaPaketi', 'geriBildirimFisiHtml'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function kur(state: Any) {
  const kod =
    'var AUDIT_LIMIT = 500;\nvar AUDIT_ETIKET = { puan_karari: { ad: "Puan kararı", aktor: "öğretmen" } };\n' +
    'let saveSayac = 0; function saveSoon() { saveSayac++; }\n' +
    'function ogtSinif() { return state._sinif || ""; }\n' +
    'var sekmeCakismasi = null;\n' + sabit('ITIRAZ_CAKISMA_METNI') + '\n' +
    sabitDizi('OTURUM_ALANLARI') + '\n' + sabitDizi('ARASTIRMA_ALANLARI') + '\n' +
    arasi('const ITIRAZ_GEREKCE_SINIRI', '/** Aynı yanıt') +
    [...ITIRAZ_FN, ...DIGER_FN].map(fonksiyonMetni).join('\n') +
    '\nreturn { ' + [...ITIRAZ_FN, ...DIGER_FN].join(', ') +
    ', AUDIT_ETIKET, ITIRAZ_CIHAZ_METNI, ITIRAZ_KISISEL_UYARI, saveSayac: function () { return saveSayac; },' +
    ' acikYap: function (k) { _itirazAcik = k; }, cakisma: function (v) { sekmeCakismasi = v; } };';
  // eslint-disable-next-line no-new-func
  return new Function('state', 'escapeHtml', kod)(state, esc);
}

const OGRENCILER = [
  { id: 1, name: 'Ada Yılmaz', sinif: '7-A' },
  { id: 2, name: 'Kerem Aydın', sinif: '7-A' },
  { id: 3, name: 'Elif Şahin', sinif: '7-B' },
];
function durum(): Any {
  return {
    students: JSON.parse(JSON.stringify(OGRENCILER)),
    questions: [
      { id: 11, type: 'open', body: 'Sürtünme kuvvetini bir örnekle açıklayınız.', outcome: 'FEN.7.1.2' },
      { id: 12, type: 'mc', body: 'Hangisi kuvvettir?', outcome: 'FEN.7.1.2', correctKey: 'B' },
    ],
    rubrics: { 11: { maxScore: 10, criteria: [] } },
    exams: [
      { id: 1, title: 'Fen 1', status: 'published', questionIds: [11, 12], sessions: {
        2: { examStatus: 'graded', answers: { 11: { text: 'Fren balataları sürtünmeyle durdurur.' } },
             aiEvals: { 11: { aiScore: 6, justification: 'Örnek uygun ama açıklama eksik.' } },
             reviews: { 11: { finalScore: 6, comment: 'Açıklamayı genişlet.', decision: 'approved_as_is', aiScore: 6 } },
             mcResults: { 12: { correct: true } } },
        3: { examStatus: 'submitted', answers: {}, aiEvals: {},
             reviews: { 11: { finalScore: 5, comment: '', decision: 'revised', aiScore: 7 } }, mcResults: {} },
      } },
      { id: 2, title: 'Fen 2', status: 'published', questionIds: [11], sessions: {} },
    ],
    activeExamId: 2,
    exam: { title: 'Fen 2', status: 'published', questionIds: [11] },
    activeStudentId: 1,
    // Aktif öğrencinin (Ada) aktif sınavdaki oturumu canlı alanlarda:
    examStatus: 'graded', answers: { 11: { text: 'Kayan kutu yavaşlar.' } }, aiEvals: {},
    reviews: { 11: { finalScore: 4, comment: '', decision: 'kagit_elle', aiScore: null } }, mcResults: {},
    flagged: {}, currentQIndex: 0, remainingSec: 0, integrity: {}, auditLog: [],
  };
}
const kopya = (x: Any) => JSON.parse(JSON.stringify(x));

describe('§126 itiraz edilebilir yanıtlar', () => {
  it('yalnız yayınlanmış (graded) oturumdaki öğretmen kararı olan açık uçlu yanıt; ÇSS ve submitted yok', () => {
    const st = durum();
    const f = kur(st);
    expect(f.itirazAdaylari(2)).toEqual([{ examId: 1, baslik: 'Fen 1', qid: 11, sid: 2, soru: st.questions[0].body, no: 1, puan: 6, max: 10 }]);
    expect(f.itirazAdaylari(3)).toEqual([]);   // öğretmen henüz yayınlamadı
    // Aktif sınav + aktif öğrenci canlı alanlardan okunur.
    expect(f.itirazAdaylari(1).map((a: Any) => [a.examId, a.puan])).toEqual([[2, 4]]);
  });

  it('aiEvals okunmaz (karne kuralı): YZ önerisi silinse de aday aynı', () => {
    const st = durum();
    const once = kur(st).itirazAdaylari(2);
    delete st.exams[0].sessions[2].aiEvals;
    expect(kur(st).itirazAdaylari(2)).toEqual(once);
  });

  it('okuma oturum YARATMAZ (render saveState tetiklemesin)', () => {
    const st = durum();
    const f = kur(st);
    f.itirazAdaylari(2); f.itirazAdaylari(3); f.itirazKuyruguHtml(false); f.itirazKartiHtml(2, 'ogrenci');
    expect(Object.keys(st.exams[1].sessions)).toEqual([]);
    expect(st.itirazlar).toBeUndefined();
    expect(st.auditLog).toEqual([]);
  });
});

describe('§126 talep (öğrenci / veli)', () => {
  it('gerekçe denetimi: boş, 300 üstü, telefon, e-posta, T.C. no reddedilir; durum ve günlük değişmez', () => {
    const st = durum();
    const f = kur(st);
    const kotu = ['', '   ', 'kısa', 'x'.repeat(301), 'Beni arayın 0532 123 45 67 lütfen', 'Annem: veli@ornek.com yazsın',
      'Kimlik no 12345678901 olan öğrenci'];
    for (const g of kotu) {
      const r = f.itirazAc(1, 11, 2, g, 'ogrenci');
      expect(r.ok, g).toBe(false);
      expect(typeof r.hata).toBe('string');
    }
    expect(st.itirazlar).toBeUndefined();
    expect(st.auditLog).toEqual([]);
    expect(f.itirazMetniDenetle('x'.repeat(300)).ok).toBe(true);
    expect(f.itirazMetniDenetle('2. ölçütte 3 puan bekliyordum, 4 adımı da yazdım.').ok).toBe(true);
  });

  it('yayınlanmamış sonuca, ÇSS sorusuna, bilinmeyen yola itiraz açılmaz', () => {
    const st = durum();
    const f = kur(st);
    expect(f.itirazAc(1, 11, 3, 'Puanım düşük geldi, yeniden bakılsın.', 'ogrenci').ok).toBe(false);
    expect(f.itirazAc(1, 12, 2, 'Bu soru da yeniden bakılsın.', 'ogrenci').ok).toBe(false);
    expect(f.itirazAc(1, 11, 2, 'Yeniden bakılsın lütfen.', 'yz').ok).toBe(false);
    expect(st.itirazlar).toBeUndefined();
  });

  it('geçerli talep: kuyrukta 1 kayıt, günlükte 1 satır; PUAN DEĞİŞMEZ; ikinci talep reddedilir', () => {
    const st = durum();
    const f = kur(st);
    const once = kopya(st.exams[0].sessions[2]);
    const r = f.itirazAc(1, 11, 2, '  Örnek verdim,\n açıklamam da var.  ', 'ogrenci');
    expect(r.ok).toBe(true);
    expect(st.itirazlar).toHaveLength(1);
    expect(st.itirazlar[0]).toMatchObject({ id: 1, examId: 1, qid: 11, sid: 2, yol: 'ogrenci', durum: 'bekliyor',
      gerekce: 'Örnek verdim, açıklamam da var.', onceki: { finalScore: 6, decision: 'approved_as_is' } });
    expect(st.exams[0].sessions[2]).toEqual(once);   // öğretmen karar vermeden puan değişmez
    expect(st.auditLog).toHaveLength(1);
    expect(st.auditLog[0]).toMatchObject({ tur: 'itiraz_acildi', qid: 11, sid: 2, oncekiPuan: 6, itirazYolu: 'ogrenci' });
    expect(f.itirazAc(1, 11, 2, 'Bir kez daha bakılsın.', 'veli').ok).toBe(false);
    expect(st.itirazlar).toHaveLength(1);
    expect(f.itirazlarSinifta('7-A')).toHaveLength(1);
    expect(f.itirazlarSinifta('7-B')).toHaveLength(0);
  });
});

describe('§126 öğretmen kararı', () => {
  function hazir() {
    const st = durum();
    const f = kur(st);
    expect(f.itirazAc(1, 11, 2, 'Örnek verdim, açıklamam da var.', 'veli').ok).toBe(true);
    return { st, f };
  }

  it('seçimsiz, aynı puan, aralık dışı, açıklamasız yeni puan reddedilir; puan ve kayıt değişmez', () => {
    const { st, f } = hazir();
    const once = kopya(st);
    expect(f.itirazKarar(1, '', '', '')).toMatchObject({ ok: false, alan: 'secim' });
    expect(f.itirazKarar(1, 'degisti', '', 'Yeniden baktım.')).toMatchObject({ ok: false, alan: 'puan' });
    expect(f.itirazKarar(1, 'degisti', '11', 'Yeniden baktım.')).toMatchObject({ ok: false, alan: 'puan' });
    expect(f.itirazKarar(1, 'degisti', '-1', 'Yeniden baktım.')).toMatchObject({ ok: false, alan: 'puan' });
    expect(f.itirazKarar(1, 'degisti', '6', 'Yeniden baktım.')).toMatchObject({ ok: false, alan: 'puan' });
    expect(f.itirazKarar(1, 'degisti', '8', '   ')).toMatchObject({ ok: false, alan: 'aciklama' });
    expect(f.itirazKarar(1, 'degisti', '8', 'Ara 0532 123 45 67')).toMatchObject({ ok: false, alan: 'aciklama' });
    expect(st).toEqual(once);
  });

  it('ZİNCİR: itiraz → kuyrukta 1 → yeni puan + açıklama → günlükte satır, CSV itiraz sütunu, karne kaynağı güncel', () => {
    const { st, f } = hazir();
    expect(f.itirazKarar(1, 'degisti', '8,5', 'Örnek ve açıklama birlikte; 2. ölçüt karşılandı.')).toEqual({ ok: true });
    const rv = st.exams[0].sessions[2].reviews[11];
    expect(rv.finalScore).toBe(8.5);
    expect(rv.aiScore).toBe(6);                     // YZ önerisi kaydı olduğu gibi
    expect(rv.decision).toBe('approved_as_is');     // ilk karar izi korunur
    expect(rv.itiraz.oncekiPuan).toBe(6);
    expect(st.exams[0].sessions[2].aiEvals[11]).toEqual({ aiScore: 6, justification: 'Örnek uygun ama açıklama eksik.' });
    expect(st.itirazlar[0]).toMatchObject({ durum: 'karar', karar: { sonuc: 'degisti', oncekiPuan: 6, yeniPuan: 8.5 } });
    expect(st.auditLog.map((k: Any) => k.tur)).toEqual(['itiraz_acildi', 'itiraz_karari']);
    expect(st.auditLog[1]).toMatchObject({ oncekiPuan: 6, finalScore: 8.5, degisti: true, itirazYolu: 'veli',
      not: 'Örnek ve açıklama birlikte; 2. ölçüt karşılandı.' });
    expect(st.auditLog[1].aiScore).toBeUndefined();   // HITL oranlarına (puan_karari) karışmaz
    expect(f.itirazAdaylari(2)[0].puan).toBe(8.5);
    const csv = f.auditCsv().replace(/^﻿/, '').split('\n');
    const bas = csv[0].split(';');
    expect(bas[bas.length - 1]).toBe('itiraz');
    expect(csv[1].endsWith(';açıldı (veli): Örnek verdim, açıklamam da var.')).toBe(true);
    expect(csv[2].endsWith(';puan değişti 6→8.5')).toBe(true);
    expect(f.itirazKarar(1, 'ayni', '', '')).toMatchObject({ ok: false });   // ikinci karar yok
  });

  it('"Puan aynı kalsın": oturum birebir aynı, günlükte degisti=false, CSV "puan aynı"', () => {
    const { st, f } = hazir();
    const once = kopya(st.exams[0].sessions[2]);
    expect(f.itirazKarar(1, 'ayni', '9', '')).toEqual({ ok: true });   // "aynı" seçiliyken puan alanı yok sayılır
    expect(st.exams[0].sessions[2]).toEqual(once);
    expect(st.auditLog[1]).toMatchObject({ tur: 'itiraz_karari', degisti: false, oncekiPuan: 6, finalScore: 6 });
    expect(f.auditCsv().split('\n')[2].endsWith(';puan aynı 6')).toBe(true);
    expect(f.itirazGunlukDetay(st.auditLog[1])).toContain('puan aynı kaldı');
  });

  it('aktif sınav + aktif öğrenci: karar canlı alana (state.reviews) yazılır', () => {
    const st = durum();
    const f = kur(st);
    expect(f.itirazAc(2, 11, 1, 'Kâğıtta ikinci örneği de yazmıştım.', 'ogretmen').ok).toBe(true);
    expect(st.auditLog[0].tur).toBe('itiraz_elle_eklendi');
    expect(st.reviews[11].finalScore).toBe(4);
    expect(f.itirazKarar(1, 'degisti', 6, 'İkinci örnek kâğıtta var, puan düzeltildi.').ok).toBe(true);
    expect(st.reviews[11].finalScore).toBe(6);
    expect(st.exams[1].sessions).toEqual({});
  });
});

describe('§126 AGENTS §1 ve sekme koruması (§119)', () => {
  it('sekme çakışmasında itiraz ve karar BELLEKTE de yapılmaz (ekranda "kaydedildi" görünüp kaybolmasın)', () => {
    const st = durum();
    const f = kur(st);
    f.cakisma({ neden: 'olay', at: 1 });
    const r = f.itirazAc(1, 11, 2, 'Örnek verdim, açıklamam da var.', 'ogrenci');
    expect(r.ok).toBe(false);
    expect(r.hata).toMatch(/başka sekmede/);
    expect(st.itirazlar).toBeUndefined();
    expect(st.auditLog).toEqual([]);
    f.cakisma(null);
    expect(f.itirazAc(1, 11, 2, 'Örnek verdim, açıklamam da var.', 'ogrenci').ok).toBe(true);
    const once = kopya(st);
    f.cakisma({ neden: 'surum', at: 2 });
    expect(f.itirazKarar(1, 'degisti', 9, 'Yeniden baktım.').ok).toBe(false);
    expect(st).toEqual(once);
  });

  const blok = arasi('§126 — ÖĞRENCİ / VELİ İTİRAZI', 'function computeDemoClassScores');
  it('itiraz bloğunda YZ çağrısı, otomatik onay ve doğrudan depolama yok', () => {
    for (const yasak of ['apiPost', 'aiEvaluate', 'fetch(', 'finalizeReview', 'publishResults', 'localStorage',
      'sessionStorage', 'indexedDB', 'dbIslem', 'saveState(']) {
      expect(blok.includes(yasak), yasak).toBe(false);
    }
    // Puanı yazan tek yer itirazKarar ve yalnız "degisti" dalında.
    expect(blok.match(/itirazOturumYaz\(it\./g)).toHaveLength(1);
  });

  it('KALICI_ALANLAR "itirazlar" içerir (saveState/§119 sürüm yolu, §120 demo sıfırlaması, §108 yedek)', () => {
    const k = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    expect(k).toMatch(/"itirazlar"/);
  });
});

describe('§126 araştırma paketi (§111) gerekçeyi DIŞLAR', () => {
  it('gerekçe ve öğretmen açıklaması pakette 0; yalnız sayılar ve yol', async () => {
    const st = durum();
    const f = kur(st);
    const GEREKCE = 'Kerem Aydın olarak ikinci örneğimi de yazmıştım, gözden kaçmış.';
    const ACIKLAMA = 'Gizli açıklama: ikinci örnek gerçekten var.';
    expect(f.itirazAc(1, 11, 2, GEREKCE, 'ogrenci').ok).toBe(true);
    expect(f.itirazKarar(1, 'degisti', 7, ACIKLAMA).ok).toBe(true);
    const ham = JSON.stringify(st.auditLog);
    expect(ham).toContain('ikinci örneğimi');   // ham günlükte var (öğretmenin kendi kaydı)
    const p = await f.arastirmaPaketi(st.auditLog, st.questions, 'tuz');
    const metin = JSON.stringify(p);
    for (const parca of ['ikinci örneğimi', 'gözden kaçmış', 'Gizli açıklama', 'Kerem', 'Aydın', 'Sürtünme']) {
      expect(metin.includes(parca), parca).toBe(false);
    }
    for (const r of p.kayitlar) {
      for (const a of ['gerekce', 'not', 'sid', 'soru']) expect(Object.keys(r)).not.toContain(a);
    }
    expect(p.kayitlar[1]).toMatchObject({ tur: 'itiraz_karari', oncekiPuan: 6, finalScore: 7, degisti: true, itirazYolu: 'ogrenci' });
    expect(p.kararTurleri).toEqual({ itiraz_acildi: 1, itiraz_karari: 1 });
  });
});

describe('§126 tam yedek (§108) itirazları taşır', () => {
  const SABITLER = ['KISISEL_SOZCUK_ADLAR', 'KISISEL_HARF_SINIFI', 'KISISEL_EK'].map(sabit).join('\n');
  const ISLEV = ['yedekDurumAl', 'yedekOgretmenAdlari', 'yedekDerinMetin', 'yedekAdKaliplari', 'yedekAdsizMetin',
    'yedekAdsizYap', 'kisiselDesen', 'kisiselAdKaliplari'];
  function yedekKur(state: Any) {
    // eslint-disable-next-line no-new-func
    return new Function('state', 'let qIdSeq = 3;\n' + sabitDizi('KALICI_ALANLAR') + '\n' + SABITLER + '\n' +
      ISLEV.map(fonksiyonMetni).join('\n') + '\nreturn { yedekDurumAl, yedekAdsizYap };')(state);
  }
  it('yedekDurumAl itirazları birebir taşır; adsız yedekte gerekçedeki ad değişir', () => {
    const st = durum();
    expect(kur(st).itirazAc(1, 11, 2, 'Kerem Aydın: ikinci örneğim de vardı.', 'veli').ok).toBe(true);
    const y = yedekKur(st);
    const d = y.yedekDurumAl();
    expect(d.itirazlar).toEqual(st.itirazlar);
    const adsiz = y.yedekAdsizYap({ durum: d, kitaplik: [] });
    const m = JSON.stringify(adsiz.durum.itirazlar);
    expect(m).not.toContain('Kerem');
    expect(m).toContain('Öğrenci 2');
    expect(adsiz.durum.itirazlar[0]).toMatchObject({ examId: 1, qid: 11, sid: 2, durum: 'bekliyor' });
  });
});

describe('§126 ekran metinleri', () => {
  it('öğrenci kartı: düğme, paylaşılan cihaz cümlesi; form açıkken sınır + kişisel veri uyarısı', () => {
    const st = durum();
    const f = kur(st);
    const h = f.itirazKartiHtml(2, 'ogrenci');
    expect(h).toContain('Yeniden incelensin');
    expect(h).toContain(esc(f.ITIRAZ_CIHAZ_METNI));
    expect(h).toContain('yapay zekâ yeniden puanlamaz');
    f.acikYap(f.itirazAnahtari(1, 11, 2));
    const form = f.itirazKartiHtml(2, 'ogrenci');
    expect(form).toContain('maxlength="300"');
    expect(form).toContain(esc(f.ITIRAZ_KISISEL_UYARI));
    expect(form).toContain('role="alert"');
    expect(f.itirazKartiHtml(2, 'veli')).toContain('Çocuğunuzun');
    expect(f.itirazKartiHtml(3, 'ogrenci')).toBe('');   // onaysız sonuçta kart yok
  });

  it('gerekçe kaçışlanır; bekleyen ve sonuç durumu görünür', () => {
    const st = durum();
    const f = kur(st);
    expect(f.itirazAc(1, 11, 2, '<img src=x onerror=alert(1)> puanım yanlış', 'ogrenci').ok).toBe(true);
    const h = f.itirazKartiHtml(2, 'ogrenci');
    expect(h).not.toContain('<img');
    expect(h).toContain('Öğretmen incelemesi bekleniyor');
    expect(h).not.toContain('js-itiraz-ac');
    f.itirazKarar(1, 'degisti', 9, 'İki örnek var.');
    const s = f.itirazKartiHtml(2, 'ogrenci');
    expect(s).toContain('İncelendi: puan 6 → 9');
    expect(s).toContain('İki örnek var.');
    expect(s).toContain('9 / 10');
  });

  it('öğretmen kuyruğu: yanıt, etiketli YZ önerisi, önceki karar, gerekçe; varsayılan seçim YOK; üst/alt yerleşim', () => {
    const st = durum();
    const f = kur(st);
    expect(f.itirazKuyruguHtml(true)).toBe('');
    expect(f.itirazKuyruguHtml(false)).toContain('İtirazlar (0)');
    expect(f.itirazKuyruguHtml(false)).toContain('Elle itiraz ekle');
    f.itirazAc(1, 11, 2, 'Örnek verdim, açıklamam da var.', 'ogrenci');
    expect(f.itirazKuyruguHtml(false)).toBe('');
    const h = f.itirazKuyruguHtml(true);
    expect(h).toContain('İtirazlar (1)');
    expect(h).toContain('Fren balataları sürtünmeyle durdurur.');
    expect(h).toContain('öneri · karar değil');
    expect(h).toContain('Örnek uygun ama açıklama eksik.');
    expect(h).toContain('Önceki kararınız');
    expect(h).toContain('Açıklamayı genişlet.');
    expect(h).toContain('Örnek verdim, açıklamam da var.');
    expect(h).not.toMatch(/checked/);
    expect(h).toContain('yapay zekâ yeniden çağrılmaz');
    // Elle listede itirazı olan yanıt yok; 7-B süzgecinde kuyruk boş.
    const elle = f.itirazElleFormHtml('');
    expect(elle).toContain('value="2|11|1"');        // Ada: itirazsız, listede
    expect(elle).not.toContain('value="1|11|2"');    // Kerem: itirazı var, listede yok
    expect(elle).not.toMatch(/\|3"/);                // Elif: sonuç yayınlanmadı
    f.itirazAc(2, 11, 1, 'Kâğıttaki ikinci örnek okunmamış.', 'ogretmen');
    expect(f.itirazElleFormHtml('')).toContain('itirazı bulunmayan açık uçlu yanıt yok');
    st._sinif = '7-B';
    expect(f.itirazKuyruguHtml(false)).toContain('İtirazlar (0)');
  });

  it('kâğıt geri bildirim fişinde "itiraz için öğretmeninize başvurun" satırı', () => {
    const f = kur(durum());
    const fis = f.geriBildirimFisiHtml({ ad: 'Ada Yılmaz', sinif: '7-A', satirlar: [], puan: 0, tam: 0, bekleyen: 0, yzGozden: false }, 'Fen 1', '7 Kasım 2026');
    expect(fis).toContain('Puana itiraz için öğretmeninize başvurun.');
  });

  it('kaynak (MEB Etik Kılavuzu §2.6) kodda yazılı; gizlilik metni güncel', () => {
    expect(app).toContain('https://ttkb.meb.gov.tr/meb_iys_dosyalar/2026_01/09152326_egitimdeyapayzekauygulamalari_etik_kilavuzu.pdf');
    const gizlilik = fs.readFileSync(path.join(kok, 'public', 'privacy-policy.html'), 'utf8');
    expect(gizlilik).toMatch(/[İi]tiraz/);
    expect(fs.readFileSync(path.join(kok, 'public', 'index.html'), 'utf8')).toContain('css/itiraz.css');
  });
});
