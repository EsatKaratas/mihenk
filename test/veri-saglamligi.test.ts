// ============================================================================
// §128 — Veri sağlamlığı (fikir3-E Y1, O3, O1, O2, D1). app.js modül değil:
// işlevler kaynak metinden çıkarılıp new Function ile sınanır. 0 Neuron.
//   1) Tek durum şeması: raporun 5 bozuk biçimi + yarım kayıt; loadState
//      bozuk kaydı EZMEZ, karantinaya alır, kayıt yazımını durdurur.
//   2) Yedek geri yükleme: geçersiz içerik REDDEDİLİR, depo bayt bayt aynı.
//   3) CSV formül nötrleme (OWASP), sayı hücreleri ve e-Okul CSV bozulmaz.
//   4) KVKK: öğrencinin bütün verisi silinir, adı hiçbir kalıcı alanda kalmaz.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { durumSemasiKodu, appIslev as islev, appSabit as sabit, appKaynak as app } from './durum-semasi-kod';

// §130: görünüm alanları sürüm kaydını tetiklemez — saveState/loadState düzeneklerine eklenen kod.
const GORUNUM_KOD = (() => {
  const k = (ad: string) => { const b = app.indexOf('\nfunction ' + ad + '('); return app.slice(b + 1, app.indexOf('\n}\n', b) + 3); };
  return (app.match(/\nconst GORUNUM_ALANLARI = [^\n]*\n/) as RegExpMatchArray)[0] + ['veriImzasi', 'metinVeriImzasi', 'gorunumYaz'].map(k).join('');
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const STORE_KEY = 't3-olcme-durum-v1';

/** Raporun (fikir3-E Y1/O3, saglam.mjs + yedek.mjs) bozuk biçimleri + yarım kayıt. */
const BOZUK: Record<string, string> = {
  'yarım kayıt (kesik JSON)': '{"questions":[{"id":1,"body":"benim sorum"}],"students":[{"id":1,"name":"Ay',
  'questions nesne': JSON.stringify({ questions: {}, students: [{ id: 1, name: 'Ayşe' }] }),
  'students metin': JSON.stringify({ students: 'x', questions: [] }),
  'ceForm null': JSON.stringify({ ceForm: null, questions: [{ id: 1, type: 'mc', status: 'approved', body: 'benim sorum', options: [] }] }),
  'exams sayı': JSON.stringify({ exams: 5, exam: 'x' }),
  'kayıt dizi': JSON.stringify([1, 2, 3]),
};

function sahteDepo(ilk: Record<string, string> = {}) {
  const ls: Record<string, string> = { ...ilk };
  const yazim: string[] = [];
  const localStorage = {
    getItem: (k: string) => (k in ls ? ls[k] : null),
    setItem: (k: string, v: string) => { yazim.push(k); ls[k] = String(v); },
    removeItem: (k: string) => { delete ls[k]; },
    key: (i: number) => Object.keys(ls)[i] ?? null,
    get length() { return Object.keys(ls).length; },
  };
  return { ls, yazim, localStorage };
}

// --------------------------------------------------------------------------
describe('§128 tek durum şeması', () => {
  const k = new Function('localStorage', 'state',
    'function depoAnahtari(d) { return d ? "' + STORE_KEY + '-demo" : "' + STORE_KEY + '"; }\nfunction demoAlaniMi() { return false; }\n' +
    'let _ilkDurum = null; let qIdSeq = 1; const KALICI_ALANLAR = [];\n' + durumSemasiKodu() +
    'return { durumuDogrula, durumKaydiniCoz, durumHataMetni, DURUM_SEMASI };')(sahteDepo().localStorage, {});

  it('KALICI_ALANLAR\'daki her alanın şemada türü var (yeni alan eklenirse şemaya da yazılmalı)', () => {
    const blok = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    const alanlar = [...blok.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').matchAll(/"([A-Za-z_]+)"/g)].map((m) => m[1]);
    expect(alanlar.length).toBeGreaterThan(30);
    expect(alanlar.filter((a) => !(a in k.DURUM_SEMASI))).toEqual([]);
  });

  it('raporun 5 bozuk biçimi + yarım kayıt: hepsi hata verir, nedenler Türkçe', () => {
    for (const [ad, ham] of Object.entries(BOZUK)) {
      const r = k.durumKaydiniCoz(ham);
      expect(r.hatalar.length, ad).toBeGreaterThan(0);
      expect(k.durumHataMetni(r.hatalar), ad).toMatch(/olmalı|okunamadı/);
    }
    expect(k.durumHataMetni(k.durumKaydiniCoz(BOZUK['students metin']).hatalar)).toBe('«students» kayıt listesi olmalı, metin bulundu');
    expect(k.durumHataMetni(k.durumKaydiniCoz(BOZUK['exams sayı']).hatalar)).toContain('«exams» kayıt listesi olmalı, sayı bulundu');
    expect(k.durumHataMetni(k.durumKaydiniCoz(BOZUK['yarım kayıt (kesik JSON)']).hatalar)).toContain('JSON yarım ya da bozuk');
  });

  it('okunabilen alanlar korunur, sorunlu alan atılır (varsayılana döner); kayıt listesinde bozuk öğe tek tek atılır', () => {
    const r = k.durumKaydiniCoz(BOZUK['ceForm null']);
    expect(r.d.questions[0].body).toBe('benim sorum');
    expect('ceForm' in r.d).toBe(false);
    const s = k.durumuDogrula({ students: [{ id: 1, name: 'A' }, 'x', { name: 'kimliksiz' }], exams: [{ id: 2, questionIds: 'x' }] });
    expect(s.temiz.students).toEqual([{ id: 1, name: 'A' }]);
    expect(s.temiz.exams).toEqual([]);
    expect(s.hatalar.map((h: Any) => h.alan)).toEqual(['students[1]', 'students[2]', 'exams[0]']);
  });

  it('geçerli kayıt: hata yok, girdi değişmez; bilinmeyen anahtar hata değil ama alınmaz', () => {
    const d = { _qIdSeq: 4, role: 'teacher', questions: [{ id: 1, type: 'open', body: 'q' }], exams: [{ id: 1, questionIds: [1], sessions: {} }],
      students: [{ id: 1, name: 'A', sinif: '7-A' }], exam: { questionIds: [1], timeOverrides: {} }, ceForm: {}, subjects: ['Fen'],
      activeExamId: 1, activeStudentId: null, auditLog: [{ at: 1, tur: 'puan_karari' }], gelecekAlan: { x: 1 } };
    const once = JSON.stringify(d);
    const s = k.durumuDogrula(d);
    expect(s.hatalar).toEqual([]);
    expect(s.bilinmeyen).toEqual(['gelecekAlan']);
    expect('gelecekAlan' in s.temiz).toBe(false);
    expect(JSON.stringify(d)).toBe(once);
  });

  it('boyut sınırı: 20 M karakteri aşan kayıt okunmadan reddedilir', () => {
    const r = k.durumKaydiniCoz('{"a":"' + 'x'.repeat(20 * 1024 * 1024) + '"}');
    expect(r.d).toBeNull();
    expect(k.durumHataMetni(r.hatalar)).toContain('çok büyük');
  });
});

// --------------------------------------------------------------------------
describe('§128 açılış: bozuk kayıt EZİLMEZ, karantinaya alınır, yazım durur', () => {
  function ac(ham: string) {
    const D = sahteDepo({ [STORE_KEY]: ham, [STORE_KEY + ':surum']: JSON.stringify({ rev: 3, sekme: 'x', at: 1 }) });
    const state: Any = { questions: [], students: [], ceForm: { atolye: 'A' }, outcomes: [], subjects: [], examStatus: 'not_started' };
    const KALICI = ['questions', 'students', 'exams', 'ceForm', 'outcomes', 'subjects'];
    const ilk = JSON.stringify({ questions: [], students: [], exams: [], ceForm: { atolye: 'A' }, outcomes: [], subjects: [] });
    const f = new Function('state', 'localStorage', 'KALICI_ALANLAR', 'STORE_KEY', 'ilk',
      'let qIdSeq = 1; let _bilinenSurum = null; let _sonYazilanMetin = null; let _sonYazilanVeri = null;\n' + GORUNUM_KOD + ' let _resetting = false; let _saveTimer = null;\n' +
      'let sekmeCakismasi = null; var depoHatasi = ""; let _ilkDurum = ilk; const SEKME_KIMLIGI = "test";\n' +
      'function demoAlaniMi() { return false; }\nfunction depoAnahtari(d) { return d ? STORE_KEY + "-demo" : STORE_KEY; }\nfunction renderSekmeCakismasi() {}\n' +
      [sabit('SURUM_KEY'), sabit('KESIF_SINIFI'), sabit('ATOLYELER'), sabit('DENEYAP_DERSI')].join('\n') + '\nconst VARSAYILAN_KAZANIMLAR = [];\n' +
      ['surumAnahtari', 'depoSurumOku', 'sekmeCakismasiBildir', 'depoSurumuBizimMi', 'depoyaSurumluYaz', 'saveState', 'loadState'].map(islev).join('\n') +
      durumSemasiKodu() + 'return { loadState, saveState, kurtarma: function () { return _kurtarma; } };'
    )(state, D.localStorage, KALICI, STORE_KEY, ilk);
    const sonuc = f.loadState();
    return { ...D, f, state, sonuc };
  }

  for (const [ad, ham] of Object.entries(BOZUK)) {
    it(ad + ': kayıt bayt bayt aynı, ham kopya karantinada, saveState yazmaz', () => {
      const o = ac(ham);
      const kur = o.f.kurtarma();
      expect(kur, ad).not.toBeNull();
      expect(kur.hatalar.length).toBeGreaterThan(0);
      expect(kur.karantina).toMatch(/^t3-olcme-durum-v1:bozuk-/);
      expect(o.ls[kur.karantina]).toBe(ham);
      o.f.saveState(); o.f.saveState();
      expect(sha(o.ls[STORE_KEY])).toBe(sha(ham));
      expect(o.yazim.filter((x) => x === STORE_KEY)).toEqual([]);
      // Bellekte uygulamayı kilitleyen tür kalmadı: diziler dizi, nesneler nesne.
      expect(Array.isArray(o.state.questions) && Array.isArray(o.state.students)).toBe(true);
      expect(o.state.ceForm && typeof o.state.ceForm).toBe('object');
    });
  }

  it('aynı bozuk kayıtla ikinci açılış yeni karantina kopyası açmaz', () => {
    const o = ac(BOZUK['students metin']);
    const ilkKopya = o.f.kurtarma().karantina;
    const D2 = ac(BOZUK['students metin']);
    expect(Object.keys(D2.ls).filter((x) => x.includes(':bozuk-')).length).toBe(1);
    expect(ilkKopya).toMatch(/:bozuk-/);
  });

  it('"okunabilenle devam": okunabilen alanlar yazılır, ham kopya karantinada kalır', () => {
    const o = ac(BOZUK['ceForm null']);
    expect(o.state.questions[0].body).toBe('benim sorum');
    o.f.kurtarma().devam = true;
    o.f.saveState();
    const yeni = JSON.parse(o.ls[STORE_KEY]);
    expect(yeni.questions[0].body).toBe('benim sorum');
    expect(yeni.ceForm).toEqual({ atolye: 'A', pdfLoading: false });
    expect(o.ls[o.f.kurtarma().karantina]).toBe(BOZUK['ceForm null']);
  });

  it('geçerli kayıtta kurtarma açılmaz, karantina yazılmaz', () => {
    const o = ac(JSON.stringify({ questions: [{ id: 1, body: 'q' }], students: [] }));
    expect(o.sonuc).toBe(true);
    expect(o.f.kurtarma()).toBeNull();
    expect(Object.keys(o.ls).some((x) => x.includes(':bozuk-'))).toBe(false);
  });

  it('açılış her koşulda tamamlanır: acilisiTamamla try/catch içinde, ardından kurtarma ekranı', () => {
    const son = app.slice(app.indexOf('\ninitPanels();'));
    expect(son).toMatch(/try \{ acilisiTamamla\(\); \}\s*catch \(e\) \{\s*acilisHatasiniKurtar\(e\);/);
    expect(son.indexOf('renderKurtarma();')).toBeGreaterThan(son.indexOf('acilisHatasiniKurtar(e)'));
    // Açılış bitene kadar kayıt yazılmaz (göç yazıp sonraki adım patlarsa karantinaya değişmiş kayıt giderdi).
    expect(son.indexOf('_acilisSuruyor = true;')).toBeLessThan(son.indexOf('try { acilisiTamamla(); }'));
    expect(son.indexOf('_acilisSuruyor = false;')).toBeGreaterThan(son.indexOf('acilisHatasiniKurtar(e)'));
    expect(islev('saveState')).toContain('_acilisSuruyor) return;');
    expect(islev('acilisHatasiniKurtar')).toContain('let ham = _acilisHam;');
    // Kurtarma ekranının dört çıkışı ve iki adımlı sıfırlama.
    const r = islev('renderKurtarma');
    for (const s of ['js-vk-indir', 'js-vk-yeniden', 'js-vk-devam', 'js-vk-sifirla', 'js-vk-sifirla-onay', 'role="alertdialog"', 'Geri alınamaz']) {
      expect(r).toContain(s);
    }
    // Sıfırla karantina kopyalarını da siler.
    expect(islev('resetState')).toContain('karantinaAnahtarlari().forEach');
  });
});

// --------------------------------------------------------------------------
describe('§128 yedek geri yükleme: geçersiz dosya REDDEDİLİR, depo değişmez', () => {
  const SABIT = ['YEDEK_BASLIK', 'YEDEK_BICIM_SURUMU', 'MIHENK_UYGULAMA_SURUMU', 'YEDEK_PBKDF2_YINELEME', 'YEDEK_PBKDF2_EN_COK',
    'YEDEK_PAROLA_EN_AZ', 'YEDEK_HATA_METINLERI'].map(sabit).join('\n');
  const ISLEV = ['yedekHata', 'yedekB64', 'yedekB64Coz', 'yedekSha256', 'yedekAnahtar', 'yedekAad', 'yedekShaGirdisi',
    'yedekOlustur', 'yedekCoz', 'yedekOzet', 'yedekOzetMetni', 'yedekKisiselVarMi', 'yedekOgretmenAdlari'];
  const D = sahteDepo({ [STORE_KEY]: '{"questions":[{"id":1,"body":"mevcut"}]}' });
  const k = new Function('localStorage', 'crypto',
    'function depoAnahtari(d) { return "' + STORE_KEY + '"; }\nfunction demoAlaniMi() { return false; }\nlet _ilkDurum = null; let qIdSeq = 1;\n' +
    durumSemasiKodu() + SABIT + '\n' + ISLEV.map(islev).join('\n') + '\nreturn { yedekOlustur, yedekCoz, yedekOzet, yedekOzetMetni };'
  )(D.localStorage, globalThis.crypto);
  const once = sha(D.ls[STORE_KEY]);

  const govdeler: Record<string, Any> = {
    'students metin (yedek.mjs)': { students: 'x', questions: [] },
    'questions nesne': { questions: {} },
    'ceForm null': { ceForm: null },
    'exams sayı': { exams: 5, exam: 'x' },
    'öğrenci kimliksiz': { students: [{ name: 'A' }] },
  };
  for (const [ad, durum] of Object.entries(govdeler)) {
    it(ad + ' → gecersiz (Türkçe neden), depo bayt bayt aynı', async () => {
      const dosya = await k.yedekOlustur({ durum, kitaplik: [], adsiz: true }, {});
      await expect(k.yedekCoz(dosya, '')).rejects.toMatchObject({ kod: 'gecersiz', message: expect.stringMatching(/Mihenk biçimine uymuyor \(«.+» .+ olmalı.*\)\. Dosya reddedildi; hiçbir veri değiştirilmedi\./) });
      expect(sha(D.ls[STORE_KEY])).toBe(once);
      expect(D.yazim).toEqual([]);
    });
  }

  it('kitaplık kaydı nesne değilse → gecersiz', async () => {
    const dosya = await k.yedekOlustur({ durum: { questions: [] }, kitaplik: ['x'], adsiz: true }, {});
    await expect(k.yedekCoz(dosya, '')).rejects.toMatchObject({ kod: 'gecersiz' });
  });

  it('geçerli yedek açılır; tanınmayan alan özette yazar ve yüklenmez', async () => {
    const dosya = await k.yedekOlustur({ durum: { _qIdSeq: 3, questions: [{ id: 1, body: 'q' }], yeniAlan: 1 }, kitaplik: [{ id: 1, pages: [] }], adsiz: true }, {});
    const v = await k.yedekCoz(dosya, '');
    expect(v.durum).toEqual({ _qIdSeq: 3, questions: [{ id: 1, body: 'q' }] });
    expect(k.yedekOzetMetni(k.yedekOzet(v))).toContain('tanımadığı 1 alan yüklenmeyecek: yeniAlan');
  });

  it('D1: dosyadaki PBKDF2 yinelemesi [310.000; 2.000.000] dışındaysa → bozuk (sekme donmaz)', async () => {
    const dosya = await k.yedekOlustur({ durum: { questions: [] }, kitaplik: [], adsiz: true }, { parola: 'parola1234' });
    const [bas, govde] = [dosya.slice(0, dosya.indexOf('\n')), JSON.parse(dosya.slice(dosya.indexOf('\n') + 1))];
    govde.kdf.yineleme = 1e10;
    const sahte = bas + '\n' + JSON.stringify(govde);
    await expect(k.yedekCoz(sahte, 'parola1234')).rejects.toMatchObject({ kod: 'bozuk' });
    expect(app).toContain('if (dosya.size > YEDEK_DOSYA_EN_BUYUK)');
  });
});

// --------------------------------------------------------------------------
describe('§128 CSV formül nötrleme (OWASP CSV Injection)', () => {
  const csvHucre = new Function(islev('csvHucre') + '\nreturn csvHucre;')();

  it('= + - @ sekme CR ile başlayan metin tek tırnak önekli; formül çalışmaz', () => {
    expect(csvHucre('=HYPERLINK("http://ornek.invalid/?"&B2;"Tıkla")')).toBe('"\'=HYPERLINK(""http://ornek.invalid/?""&B2;""Tıkla"")"');
    expect(csvHucre('+90 555')).toBe("'+90 555");
    expect(csvHucre('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvHucre('\t=1+1')).toBe("'\t=1+1");
    expect(csvHucre('\r=1+1')).toBe('"\'\r=1+1"');
    expect(csvHucre('  =1+1')).toBe("'  =1+1");
    expect(csvHucre('＝1+1')).toBe("'＝1+1");
  });

  it('meşru "-3 çünkü…" yanıtı okunur kalır; yalnız sayı olan hücreye önek konmaz', () => {
    expect(csvHucre('-3 çünkü x=5')).toBe("'-3 çünkü x=5");
    for (const n of ['-3', '12,5', '-1.5', '0', '+2', 12.5, -2, '1e3']) expect(csvHucre(n)).toBe(String(n));
    expect(csvHucre('Ayşe')).toBe('Ayşe');
    expect(csvHucre('a;b')).toBe('"a;b"');
    expect(csvHucre('a\rb')).toBe('"a\rb"');   // tırnaksız CR yeni satır açardı
  });

  it('dört CSV de ortak yazıcıyı kullanıyor (kopya kaçış kuralı kalmadı)', () => {
    expect(islev('auditCsv')).toContain('.map(csvHucre)');
    expect(islev('kararRaporuCsv')).toContain('csvHucre(h)');
    expect(islev('csvSatirlar')).toContain('map(csvHucre)');
    expect(app.match(/h\.replace\(\/"\/g, '""'\)/g)?.length).toBe(1);
  });

  it('e-Okul CSV: sayısal içerik §101 kuralıyla birebir aynı (puanlar bozulmaz); formül adı nötrlenir', () => {
    const kod = ['csvHucre', 'csvSayi', 'csvSatirlar', 'eokulPuanCsv'].map(islev).join('\n');
    const { eokulPuanCsv } = new Function(kod + '\nreturn { eokulPuanCsv };')();
    const eskiHucre = (h: Any) => { h = String(h == null ? '' : h); return /[";\n]/.test(h) ? '"' + h.replace(/"/g, '""') + '"' : h; };
    const sorular = [{ id: 1, type: 'mc' }, { id: 2, type: 'open' }];
    const ogr = [{ id: 1, name: 'Ali Kaya' }, { id: 2, name: 'Ece Su' }, { id: 3, name: '=cmd|"/c calc"!A1' }];
    const oturum: Record<number, Any> = {
      1: { mcResults: { 1: { correct: true } }, reviews: { 2: { finalScore: 7.5 } } },
      2: { mcResults: { 1: { correct: false } }, reviews: { 2: { finalScore: 0 } } },
      3: { mcResults: { 1: { correct: true } }, reviews: {} },
    };
    const r = eokulPuanCsv(sorular, ogr, (sid: number) => oturum[sid], 5);
    const satir = r.csv.replace(/^﻿/, '').split('\n');
    expect(satir[1]).toBe(['', 'Ali Kaya', '5', '7,5', '12,5'].map(eskiHucre).join(';'));
    expect(satir[2]).toBe(['', 'Ece Su', '0', '0', '0'].map(eskiHucre).join(';'));
    expect(satir[3].split(';')[1]).toBe('"\'=cmd|""/c calc""!A1"');
  });
});

// --------------------------------------------------------------------------
describe('§128 KVKK: öğrencinin tüm verisini sil', () => {
  function kur() {
    const D = sahteDepo({ [STORE_KEY + ':bozuk-2026-11-07']: '{"students":[{"id":2,"name":"Baran Örnek"', [STORE_KEY + ':bozuk-2026-11-06']: '{"x":1' });
    const ANAH = '{"b":"Soru","a":"Baran\'ın yanıtı: kuvvet itme ya da çekmedir"}';
    const state: Any = {
      role: 'teacher', activeExamId: 1, activeStudentId: 2, parentStudentId: 2, exam: { title: 'S', questionIds: [10] },
      students: [{ id: 1, name: 'Ali Kaya', sinif: '7-A' }, { id: 2, name: 'Baran Örnek', sinif: '7-A' }, { id: 3, name: 'Ece Su', sinif: '7-B' }],
      exams: [
        { id: 1, title: 'S', questionIds: [10], sessions: {
          1: { examStatus: 'graded', answers: { 10: { text: 'Ali yanıtı; Baran Örnek bana söyledi' } }, reviews: { 10: { finalScore: 5 } }, mcResults: {} },
          2: { examStatus: 'submitted', answers: { 10: { text: 'eski kopya' } } },
          3: { examStatus: 'graded', answers: { 10: { text: 'Ece yanıtı' } }, reviews: { 10: { finalScore: 4 } }, mcResults: {} } } },
        { id: 2, title: 'Eski', questionIds: [10], sessions: {
          2: { examStatus: 'graded', answers: { 10: { text: 'Eski sınavda Baran' } }, aiEvals: { 10: { aiScore: 3, gerekce: 'Baran Örnek iyi' } }, reviews: { 10: { finalScore: 3, comment: 'Aferin Baran Örnek' } } } } },
      ],
      // Aktif öğrenci (sid 2) canlı alanlarda:
      answers: { 10: { text: 'Baran\'ın yanıtı: kuvvet itme ya da çekmedir' } }, aiEvals: { 10: { aiScore: 4 } }, reviews: { 10: { finalScore: 4 } },
      mcResults: {}, flagged: {}, examStatus: 'graded', currentQIndex: 0, remainingSec: 0, integrity: { events: [{ t: 'blur' }] },
      auditLog: [
        { at: 1, tur: 'puan_karari', sid: 2, soru: 'Soru', finalScore: 4 },
        { at: 2, tur: 'degerlendirme_onerildi', sid: '2', soru: 'Soru' },
        { at: 3, tur: 'puan_karari', sid: 1, soru: 'Soru', finalScore: 5 },
        { at: 4, tur: 'geri_bildirim_aktarildi', not: 'Baran Örnek için' },
        { at: 5, tur: 'soru_onaylandi', soru: 'Soru' },
      ],
      evalCache: { h1: { key: ANAH, value: { aiScore: 4 }, t: 1 }, h2: { key: '{"b":"Soru","a":"Ece yanıtı"}', value: { aiScore: 4 }, t: 2 } },
      misconceptions: { 'm1': { clusters: [{ ornek: 'Baran\'ın yanıtı: kuvvet itme ya da çekmedir' }] }, 'm2': { clusters: [{ ornek: 'genel' }] } },
      dikkatOnay: { 2: { at: 1 }, 1: { at: 2 } },
      questions: [{ id: 10, body: 'Soru' }], rubrics: { 10: { maxScore: 5 } },
    };
    const ISLEV = ['ogrenciOturumlari', 'ogrenciYanitMetinleri', 'ogrenciVeriOzeti', 'ogrenciGunlukKaydiMi', 'ogrenciVerisiniSil',
      'adGecisSayisi', 'readSession', 'sessionOf', 'examSessions', 'bosOturum', 'karantinaAnahtarlari'];
    const f = new Function('state', 'localStorage',
      'function depoAnahtari(d) { return "' + STORE_KEY + '"; }\nfunction demoAlaniMi() { return false; }\n' +
      'function ensureAudit() { state.auditLog = state.auditLog || []; }\n' +
      'function auditKaydet(tur, veri) { const k = { at: 99, tur: tur }; Object.keys(veri || {}).forEach(function (x) { if (veri[x] != null) k[x] = veri[x]; }); state.auditLog.push(k); }\n' +
      sabit('OTURUM_ALANLARI') + '\n' + ISLEV.map(islev).join('\n') + '\nreturn { ogrenciVeriOzeti, ogrenciVerisiniSil, adGecisSayisi };'
    )(state, D.localStorage);
    return { f, state, ...D };
  }
  const KALICI = (s: Any) => JSON.stringify(s);

  it('özet: silinecek oturum/yanıt/puan/günlük sayıları (state değişmez)', () => {
    const { f, state } = kur();
    const once = KALICI(state);
    expect(f.ogrenciVeriOzeti(2)).toEqual({ ad: 'Baran Örnek', oturum: 2, yanit: 2, puan: 2, gunluk: 3, gozlem: 0, itiraz: 0 });
    expect(KALICI(state)).toBe(once);
  });

  it('silme: öğrencinin adı ve verisi kalıcı alanların HİÇBİRİNDE kalmaz (başkasının yanıtı hariç)', () => {
    const { f, state, ls } = kur();
    const ali = JSON.stringify(state.exams[0].sessions[1]);
    const ece = JSON.stringify(state.exams[0].sessions[3]);
    const r = f.ogrenciVerisiniSil('2');
    expect(r).toMatchObject({ oturum: 2, gunluk: 3, onbellek: 1, analiz: 1, karantina: 1 });
    // Ad yalnız Ali'nin kendi yanıtında kalır (başkasının verisi; Ali artık aktif → canlı alanda da aynı metin).
    const metin = KALICI(state);
    expect(f.adGecisSayisi(metin, 'Baran Örnek')).toBeGreaterThan(0);
    expect(f.adGecisSayisi(metin.split('Ali yanıtı; Baran Örnek bana söyledi').join(''), 'Baran Örnek')).toBe(0);
    expect(metin).not.toContain('kuvvet itme ya da çekmedir');   // yanıt metni (canlı alan + önbellek + analiz)
    expect(metin).not.toContain('Eski sınavda Baran');
    // Oturumlar, canlı alanlar, onay, veli seçimi.
    expect(state.exams.every((e: Any) => !e.sessions[2])).toBe(true);
    expect(state.students.map((s: Any) => s.id)).toEqual([1, 3]);
    expect(state.activeStudentId).toBe(1);
    expect(state.answers).toEqual(state.exams[0].sessions[1].answers);
    expect(state.parentStudentId).toBeNull();
    expect(state.dikkatOnay).toEqual({ 1: { at: 2 } });
    // Başka öğrencilerin verisi aynen.
    expect(JSON.stringify(state.exams[0].sessions[1])).toBe(ali);
    expect(JSON.stringify(state.exams[0].sessions[3])).toBe(ece);
    expect(Object.keys(state.evalCache)).toEqual(['h2']);
    expect(Object.keys(state.misconceptions)).toEqual(['m2']);
    // Karantina: adı taşıyan kopya silindi, öbürü durdu.
    expect(Object.keys(ls)).toEqual([STORE_KEY + ':bozuk-2026-11-06']);
  });

  it('§130: gözlem puanları (§125), itirazlar (§126) ve adı içeren rubrik örneği (§124) de silinir; ad 0', () => {
    const { f, state } = kur();
    state.gozlemFormlari = [
      { id: 'gz-1', ad: 'Dinleme', puanlar: { 2: { 'T.7.1.1': 3 }, 1: { 'T.7.1.1': 2 } }, duzeyler: [], kazanimlar: [] },
      { id: 'gz-2', ad: 'Konuşma', puanlar: { 1: { 'T.7.2.1': 4 } }, duzeyler: [], kazanimlar: [] },
    ];
    state.itirazlar = [
      { id: 1, sid: 2, qid: 10, examId: 1, gerekce: 'Baran Örnek adına itiraz', onceki: { comment: 'Baran Örnek iyi' } },
      { id: 2, sid: 1, qid: 10, examId: 1, gerekce: 'Ali itirazı' },
    ];
    state.notIpucuKapali = true;
    state.questions[0].ornekYanitlar = [{ id: 'o1', puan: 4, tavan: 5, metin: 'Baran Örnek şöyle yazdı' }, { id: 'o2', puan: 5, tavan: 5, metin: 'adsız örnek' }];
    expect(f.ogrenciVeriOzeti(2)).toMatchObject({ gozlem: 1, itiraz: 1 });
    const r = f.ogrenciVerisiniSil(2);
    expect(r).toMatchObject({ gozlem: 1, itiraz: 1, ornek: 1 });
    expect(state.gozlemFormlari[0].puanlar).toEqual({ 1: { 'T.7.1.1': 2 } });
    expect(state.gozlemFormlari[1].puanlar).toEqual({ 1: { 'T.7.2.1': 4 } });
    expect(state.itirazlar.map((t: Any) => t.id)).toEqual([2]);
    expect(state.questions[0].ornekYanitlar.map((o: Any) => o.id)).toEqual(['o2']);
    const metin = KALICI(state).split('Ali yanıtı; Baran Örnek bana söyledi').join('');
    expect(f.adGecisSayisi(metin, 'Baran Örnek')).toBe(0);
  });

  it('günlük: o öğrencinin kayıtları silinir, kişisel veri içermeyen TEK satır eklenir', () => {
    const { f, state } = kur();
    f.ogrenciVerisiniSil(2);
    expect(state.auditLog.map((k: Any) => k.tur)).toEqual(['puan_karari', 'soru_onaylandi', 'ogrenci_verisi_silindi']);
    const son = state.auditLog[2];
    expect(son).toEqual({ at: 99, tur: 'ogrenci_verisi_silindi', not: '1 öğrencinin verisi silindi', rol: 'teacher' });
    expect('sid' in son).toBe(false);
  });

  it('iki adımlı onay, geri alınamaz uyarısı; menüde yalnız öğretmen ve yönetici', () => {
    const ac = islev('ogrenciSilAc');
    expect(ac).toContain('id="ogrSilDevam"');
    expect(ac).toMatch(/onaylaModal\(\{[\s\S]*GERİ ALINAMAZ[\s\S]*tehlikeli: true/);
    expect(ac.indexOf('ogrenciVerisiniSil(sid)')).toBeGreaterThan(ac.indexOf('if (!tamam) return;'));
    const menu = islev('renderKabukEk');
    expect(menu).toMatch(/state\.role === "teacher" \|\| state\.role === "admin" \? [\s\S]{0,200}js-ek-ogrenci-sil/);
    expect(menu).toContain('.js-ek-ogrenci-sil").forEach(function (b) { b.onclick = ogrenciSilAc; })');
  });

  it('gizlilik politikası gerçek davranışla eşit (AGENTS §7)', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('Öğrencinin verisini sil');
    expect(pp).toContain('1 öğrencinin verisi silindi');
    expect(pp).toContain('geri alınamaz biçimde');
    expect(pp).toContain('karantina');
    expect(pp).not.toContain('<b>“Verileri sıfırla”</b> düğmesi cihazdaki tüm yerel veriyi');
  });
});

describe('§130 entegrasyon: yeni kalıcı alanlar şemada', () => {
  it('gözlem formları, not ipucu tercihi ve itirazlar şemada; soru/sınav alt şeması madde geçmişini ve örnekleri tanır', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
    const sema = app.slice(app.indexOf('const DURUM_SEMASI = {'), app.indexOf('const DURUM_TUR_ADI'));
    expect(sema).toContain('gozlemFormlari: "kayitlar", notIpucuKapali: "bool?", itirazlar: "kayitlar"');
    expect(sema).toMatch(/questions: \{[^}]*maddeGecmisi: "dizi\?", ornekYanitlar: "dizi\?"/);
    expect(sema).toMatch(/exams: \{[^}]*maddeGecmisiAnahtari: "metin\?"/);
    expect(sema).toMatch(/itirazlar: \{ id: "kimlik", sid: "kimlik\?"/);
  });
});
