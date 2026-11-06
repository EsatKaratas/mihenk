// ============================================================================
// §108 — Tam yedek (.mihenk): şifreleme gidiş-dönüş, yanlış parola, bozuk
// dosya, adsız yedekte ad sızıntısı, sürüm/göç, onay iptalinde durum
// değişmezliği. app.js modül değil: işlevler kaynak metinden çıkarılıp
// new Function ile sınanır (kota-dayaniklilik.test.ts deseni). 0 Neuron.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8');

function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}

const SABITLER = ['YEDEK_BASLIK', 'YEDEK_BICIM_SURUMU', 'MIHENK_UYGULAMA_SURUMU', 'YEDEK_PBKDF2_YINELEME',
  'YEDEK_PAROLA_EN_AZ', 'YEDEK_ONAY_METNI', 'YEDEK_HATA_METINLERI',
  'KISISEL_SOZCUK_ADLAR', 'KISISEL_HARF_SINIFI', 'KISISEL_EK'].map(sabit).join('\n');
const ISLEVLER = ['yedekHata', 'yedekDurumAl', 'yedekKitaplikAl', 'yedekKitaplikYaz', 'yedekOgretmenAdlari',
  'yedekKisiselVarMi', 'yedekDerinMetin', 'yedekAdKaliplari', 'yedekAdsizMetin', 'yedekAdsizYap', 'yedekB64',
  'yedekB64Coz', 'yedekSha256', 'yedekAnahtar', 'yedekAad', 'yedekShaGirdisi', 'yedekOlustur', 'yedekCoz',
  'yedekOzet', 'yedekOzetMetni', 'yedekUygula', 'yedekGeriYukle', 'yedekDosyaAdi', 'kisiselDesen', 'kisiselAdKaliplari'];

type Kayit = { id: number; pages: unknown };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Sahte ortam: localStorage, IndexedDB (dbIslem), onaylaModal. */
function ortam(opts: { state?: Any; kitaplik?: Kayit[]; onay?: boolean; setItemHata?: boolean } = {}) {
  const ls: Record<string, string> = {};
  const lsCagri: string[] = [];
  const localStorage = {
    getItem: (k: string) => (k in ls ? ls[k] : null),
    setItem: (k: string, v: string) => { lsCagri.push(k); if (opts.setItemHata) throw new Error('QuotaExceededError'); ls[k] = v; },
    removeItem: (k: string) => { delete ls[k]; },
  };
  let idb: Kayit[] = JSON.parse(JSON.stringify(opts.kitaplik || []));
  const idbYazim: Kayit[][] = [];
  const dbIslem = (mod: string, fn: (s: Any) => Any) => {
    let gecici = idb.slice();
    const store = {
      getAll: () => ({ result: JSON.parse(JSON.stringify(idb)) }),
      clear: () => { gecici = []; },
      put: (k: Kayit) => { gecici = gecici.filter((x) => x.id !== k.id).concat([JSON.parse(JSON.stringify(k))]); },
    };
    const r = fn(store);
    if (mod === 'readwrite') { idb = gecici; idbYazim.push(JSON.parse(JSON.stringify(gecici))); }
    return Promise.resolve(r ? r.result : undefined);
  };
  const onayMetinleri: Any[] = [];
  const onaylaModal = (o: Any) => { onayMetinleri.push(o); return Promise.resolve(!!opts.onay); };
  const state = opts.state || { students: [], questions: [], exams: [], library: [] };
  const KALICI_ALANLAR = ['questions', 'exams', 'students', 'library', 'activeTeacherName', 'auditLog', 'answers', 'outcomes', 'subjects'];
  const k = new Function('state', 'KALICI_ALANLAR', 'STORE_KEY', 'localStorage', 'dbIslem', 'onaylaModal', 'crypto',
    'let qIdSeq = 7; let _resetting = false; let _saveTimer = null; let _yedekGeriAl = null;\n' +
    SABITLER + '\n' + ISLEVLER.map(tanim).join('\n') +
    '\nreturn { ' + ISLEVLER.join(', ') + ', YEDEK_ONAY_METNI, YEDEK_PBKDF2_YINELEME, MIHENK_UYGULAMA_SURUMU,' +
    ' geriAl: function () { return _yedekGeriAl; }, resetting: function () { return _resetting; } };'
  )(state, KALICI_ALANLAR, 't3-olcme-durum-v1', localStorage, dbIslem, onaylaModal, globalThis.crypto);
  return { k, ls, lsCagri, idb: () => idb, idbYazim, onayMetinleri, state };
}

const OGRENCILER = [
  { id: 1, name: 'Ayşe Yılmaz', sinif: '7-A' },
  { id: 2, name: 'Mehmet Öztürk', sinif: '7-A' },
  { id: 3, name: 'Zeynep Kaya', sinif: '7-B' },
];
function ornekDurum(): Any {
  return {
    _qIdSeq: 12,
    students: JSON.parse(JSON.stringify(OGRENCILER)),
    questions: [{ id: 1, body: 'Sürtünme kuvveti nedir?' }, { id: 2, body: 'Kütle ile ağırlık farkı?' }],
    exams: [{ id: 1, title: 'Fen 1', teacherName: 'Hatice Demirci', sessions: { 1: { answers: { 2: 'Ayşe Yılmaz yazdı: kütle değişmez' } } } }],
    activeTeacherName: 'Hatice Demirci',
    answers: { 2: "Benim adım Mehmet Öztürk, Ayşe'nin cevabına katılıyorum. ZEYNEP KAYA da öyle dedi." },
    auditLog: [{ at: 1, tur: 'onay', not: 'Ayşe Yılmaz için puan onaylandı (Hatice Demirci)' }],
    library: [{ id: 1, ad: 'Fen kitabı', sayfaSayisi: 1 }],
  };
}
const KITAPLIK: Kayit[] = [{ id: 1, pages: [{ no: 1, text: 'Kuvvet ve enerji. Örnek: Mehmet Öztürk topu itti.' }] }];

describe('§108 şifreleme gidiş-dönüş', () => {
  it('parolalı yedek: başlık, PBKDF2 ≥310.000, rastgele tuz/IV, açık metin sızmaz, geri açılır', async () => {
    const { k } = ortam();
    const veri = { durum: ornekDurum(), kitaplik: KITAPLIK };
    const metin: string = await k.yedekOlustur(veri, { parola: 'gizli-parola-42', simdi: Date.UTC(2026, 10, 6, 12) });
    expect(metin.startsWith('MIHENK-YEDEK 1\n')).toBe(true);
    const zarf = JSON.parse(metin.slice(metin.indexOf('\n') + 1));
    expect(Object.keys(zarf).slice(0, 6)).toEqual(['baslik', 'bicim', 'uygulama', 'olusturma', 'adsiz', 'sifreli']);
    expect(zarf).toMatchObject({ baslik: 'MIHENK-YEDEK', bicim: 1, sifreli: true, adsiz: false, olusturma: '2026-11-06T12:00:00.000Z' });
    expect(zarf.kdf).toMatchObject({ ad: 'PBKDF2', hash: 'SHA-256' });
    expect(zarf.kdf.yineleme).toBeGreaterThanOrEqual(310000);
    expect(Buffer.from(zarf.kdf.tuz, 'base64')).toHaveLength(16);
    expect(zarf.sifre.ad).toBe('AES-GCM');
    expect(Buffer.from(zarf.sifre.iv, 'base64')).toHaveLength(12);
    expect(zarf.sha256).toMatch(/^[0-9a-f]{64}$/);
    for (const yasak of ['Ayşe', 'Yılmaz', 'Mehmet', 'Hatice', 'Sürtünme', 'gizli-parola-42']) {
      expect(metin.includes(yasak), yasak).toBe(false);
    }
    const geri = await k.yedekCoz(metin, 'gizli-parola-42');
    expect(geri.durum).toEqual(veri.durum);
    expect(geri.kitaplik).toEqual(KITAPLIK);
    expect(k.yedekOzet(geri)).toMatchObject({ soru: 2, sinav: 1, ogrenci: 3, kitap: 1, tarih: '2026-11-06T12:00:00.000Z' });
  }, 30000);

  it('aynı veri iki kez → farklı tuz, IV ve şifreli metin', async () => {
    const { k } = ortam();
    const veri = { durum: ornekDurum(), kitaplik: [] };
    const a = JSON.parse((await k.yedekOlustur(veri, { parola: 'abcdefgh' })).split('\n')[1]);
    const b = JSON.parse((await k.yedekOlustur(veri, { parola: 'abcdefgh' })).split('\n')[1]);
    expect(a.kdf.tuz).not.toBe(b.kdf.tuz);
    expect(a.sifre.iv).not.toBe(b.sifre.iv);
    expect(a.veri).not.toBe(b.veri);
  }, 30000);

  it('kişisel veri varsa parola ZORUNLU; kısa parola reddedilir; kişisel veri yoksa parolasız olur', async () => {
    const { k } = ortam();
    await expect(k.yedekOlustur({ durum: ornekDurum(), kitaplik: [] }, {})).rejects.toMatchObject({ kod: 'parola_zorunlu' });
    await expect(k.yedekOlustur({ durum: ornekDurum(), kitaplik: [] }, { parola: 'kisa' })).rejects.toMatchObject({ kod: 'parola_kisa' });
    const bos = { durum: { students: [], questions: [{ id: 1 }], exams: [] }, kitaplik: [] };
    const metin = await k.yedekOlustur(bos, {});
    expect(JSON.parse(metin.split('\n')[1]).sifreli).toBe(false);
    expect((await k.yedekCoz(metin, '')).durum).toEqual(bos.durum);
    // Yalnız öğretmen adı da kişisel veridir.
    expect(k.yedekKisiselVarMi({ students: [], activeTeacherName: 'Hatice Demirci' })).toBe(true);
    expect(k.yedekKisiselVarMi({ students: [{ id: 1, name: '' }] })).toBe(false);
  }, 30000);
});

describe('§108 yanlış parola ve bozuk dosya: net hata, yan etki yok', () => {
  it('yanlış parola → parola_yanlis; parolasız → parola_gerekli', async () => {
    const { k } = ortam();
    const metin = await k.yedekOlustur({ durum: ornekDurum(), kitaplik: [] }, { parola: 'dogru-parola' });
    await expect(k.yedekCoz(metin, 'yanlis-parola')).rejects.toMatchObject({ kod: 'parola_yanlis' });
    await expect(k.yedekCoz(metin, '')).rejects.toMatchObject({ kod: 'parola_gerekli' });
    await expect(k.yedekCoz(metin, 'yanlis-parola')).rejects.toThrow(/Parola yanlış\. Hiçbir veri değiştirilmedi/);
  }, 30000);

  it('veri, başlık ya da JSON bozulursa → bozuk; Mihenk dışı dosya → bicim_yok', async () => {
    const { k } = ortam();
    const metin: string = await k.yedekOlustur({ durum: ornekDurum(), kitaplik: [] }, { parola: 'dogru-parola' });
    const zarf = JSON.parse(metin.split('\n')[1]);
    const yaz = (z: Any) => 'MIHENK-YEDEK 1\n' + JSON.stringify(z);
    // Şifreli metinde tek karakter.
    const v = zarf.veri as string;
    const bozukVeri = { ...zarf, veri: v.slice(0, 10) + (v[10] === 'A' ? 'B' : 'A') + v.slice(11) };
    await expect(k.yedekCoz(yaz(bozukVeri), 'dogru-parola')).rejects.toMatchObject({ kod: 'bozuk' });
    // Başlıkta tarih değişti (SHA başlığı da kapsar → "parola yanlış" sanılmaz).
    await expect(k.yedekCoz(yaz({ ...zarf, olusturma: '2020-01-01T00:00:00.000Z' }), 'dogru-parola')).rejects.toMatchObject({ kod: 'bozuk' });
    await expect(k.yedekCoz(yaz({ ...zarf, adsiz: true }), 'dogru-parola')).rejects.toMatchObject({ kod: 'bozuk' });
    // Yarıda kesilmiş dosya.
    await expect(k.yedekCoz(metin.slice(0, Math.floor(metin.length / 2)), 'dogru-parola')).rejects.toMatchObject({ kod: 'bozuk' });
    // Şifresiz yedekte iç JSON değiştirildi.
    const acik = await k.yedekCoz(await k.yedekOlustur({ durum: { students: [], questions: [] }, kitaplik: [] }, {}), '');
    expect(acik.durum.questions).toEqual([]);
    const acikMetin: string = await k.yedekOlustur({ durum: { students: [], questions: [] }, kitaplik: [] }, {});
    const acikZarf = JSON.parse(acikMetin.split('\n')[1]);
    expect(acikZarf.veri).toContain('"questions":[]');
    await expect(k.yedekCoz(yaz({ ...acikZarf, veri: acikZarf.veri.replace('"questions":[]', '"questions":[1]') }), ''))
      .rejects.toMatchObject({ kod: 'bozuk' });
    await expect(k.yedekCoz('{"bu":"json"}', '')).rejects.toMatchObject({ kod: 'bicim_yok' });
    await expect(k.yedekCoz('', '')).rejects.toMatchObject({ kod: 'bicim_yok' });
    await expect(k.yedekCoz('MIHENK-YEDEK 1\nçöp', '')).rejects.toMatchObject({ kod: 'bozuk' });
  }, 30000);
});

describe('§108 adsız yedek: ad sızıntısı 0', () => {
  it('öğrenci ve öğretmen adları hiçbir metinde (anahtarlar, kayıtlar, kitaplık) kalmaz', async () => {
    const { k } = ortam();
    const adsiz = k.yedekAdsizYap({ durum: ornekDurum(), kitaplik: KITAPLIK });
    expect(adsiz.adsiz).toBe(true);
    expect(adsiz.durum.students.map((s: Any) => s.name)).toEqual(['Öğrenci 1', 'Öğrenci 2', 'Öğrenci 3']);
    expect(adsiz.durum.activeTeacherName).toBe('Öğretmen 1');
    expect(adsiz.durum.exams[0].teacherName).toBe('Öğretmen 1');
    const metin: string = await k.yedekOlustur(adsiz, {});   // parolasız olabilir
    const zarf = JSON.parse(metin.split('\n')[1]);
    expect(zarf).toMatchObject({ adsiz: true, sifreli: false });
    const ADLAR = ['Ayşe', 'Yılmaz', 'Mehmet', 'Öztürk', 'Zeynep', 'Kaya', 'Hatice', 'Demirci'];
    const sizinti = ADLAR.filter((a) => metin.toLocaleLowerCase('tr').includes(a.toLocaleLowerCase('tr')));
    expect(sizinti).toEqual([]);
    // Ders içeriği bozulmadı; adlar etiketle değişti.
    const geri = await k.yedekCoz(metin, '');
    expect(geri.durum.questions[0].body).toBe('Sürtünme kuvveti nedir?');
    expect(geri.durum.auditLog[0].not).toBe('Öğrenci 1 için puan onaylandı (Öğretmen 1)');
    expect(geri.kitaplik[0].pages[0].text).toContain('Öğrenci 2 topu itti');
    // Kişisel alan kalmadığı için kişisel sayılmaz (özgün durum kişiseldir).
    expect(k.yedekKisiselVarMi(ornekDurum())).toBe(true);
  });

  it('sözcük de olan ad tek başına (küçük harf) değiştirilmez: içerik bozulmaz', () => {
    const { k } = ortam();
    const durum = { students: [{ id: 1, name: 'Deniz Arslan' }],
      questions: [{ id: 1, body: 'Deniz suyu tuzludur; deniz kenarı.' }], answers: { 1: "Deniz Arslan ve Deniz'in kardeşi" } };
    const a = k.yedekAdsizYap({ durum, kitaplik: [] });
    expect(a.durum.questions[0].body).toBe('Deniz suyu tuzludur; deniz kenarı.');
    expect(a.durum.students[0].name).toBe('Öğrenci 1');
    expect(a.durum.answers[1]).toBe('Öğrenci 1 ve Öğrenci 1 kardeşi');
    expect(JSON.stringify(a.durum)).not.toContain('Arslan');
  });
});

describe('§108 sürüm ve göç', () => {
  it('yeni biçimli yedek bu uygulamada "desteklenmiyor" der (gövde okunmadan)', async () => {
    const { k } = ortam();
    await expect(k.yedekCoz('MIHENK-YEDEK 2\n<gelecekteki ikili biçim>', '')).rejects.toMatchObject({ kod: 'desteklenmiyor' });
    await expect(k.yedekCoz('MIHENK-YEDEK 2\n{}', '')).rejects.toThrow(/daha yeni bir Mihenk sürümüyle/);
  });

  it('uygulama sürümü package.json ile aynı', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(kok, 'package.json'), 'utf8'));
    expect(ortam().k.MIHENK_UYGULAMA_SURUMU).toBe(pkg.version);
  });

  it('eski şemalı yedek → geri yükle → loadState göçleri çalışır (§50 atölye, §52 Deneyap)', async () => {
    const e = ortam({ onay: true, state: { students: [], questions: [], exams: [], library: [] } });
    const eskiDurum = {
      _qIdSeq: 4,
      outcomes: [{ code: 'FEN.K.1', label: 'eski', grade: 'Fizik Atölyesi' }],
      subjects: ['Fen Bilimleri'],
      ceForm: { grade: 'Fizik Atölyesi', subject: 'Fen Bilimleri' },
      students: [], questions: [{ id: 3, body: 'q' }], exams: [],
      // gocDeneyapDersi YOK: eski kayıt.
    };
    const metin = await e.k.yedekOlustur({ durum: eskiDurum, kitaplik: [] }, {});
    const veri = await e.k.yedekCoz(metin, '');
    expect(await e.k.yedekGeriYukle(veri)).toBe(true);
    // Uygulamanın gerçek loadState'i, yazılan kayıt üzerinde.
    const state: Any = { ceForm: { atolye: '' }, outcomes: [], subjects: [], gocDeneyapDersi: true, examStatus: 'not_started' };
    const KALICI = ['outcomes', 'subjects', 'ceForm', 'students', 'questions', 'exams', 'gocDeneyapDersi'];
    const sonuc = new Function('state', 'localStorage', 'STORE_KEY', 'KALICI_ALANLAR',
      'let qIdSeq = 1;\n' + ['KESIF_SINIFI', 'ATOLYELER', 'DENEYAP_DERSI'].map(sabit).join('\n') +
      '\nconst VARSAYILAN_KAZANIMLAR = [];\n' + tanim('loadState') +
      '\nreturn { ok: loadState(), qIdSeq, KESIF_SINIFI, DENEYAP_DERSI };'
    )(state, { getItem: (key: string) => e.ls[key] ?? null }, 't3-olcme-durum-v1', KALICI);
    expect(sonuc.ok).toBe(true);
    expect(sonuc.qIdSeq).toBe(4);
    expect(state.outcomes[0]).toMatchObject({ grade: sonuc.KESIF_SINIFI, atolye: 'Fizik Atölyesi' });
    expect(state.ceForm).toMatchObject({ grade: sonuc.KESIF_SINIFI, atolye: 'Fizik Atölyesi' });
    expect(state.subjects).toContain(sonuc.DENEYAP_DERSI);
    expect(state.gocDeneyapDersi).toBe(true);
    expect(state.questions).toEqual([{ id: 3, body: 'q' }]);
  });
});

describe('§108 geri yükleme akışı', () => {
  const mevcut = () => ({ students: [{ id: 9, name: 'Eski Öğrenci' }], questions: [{ id: 1, body: 'eski' }], exams: [], library: [{ id: 5 }] });
  const ESKI_KITAP: Kayit[] = [{ id: 5, pages: [{ text: 'eski kitap' }] }];
  const YENI = { durum: { _qIdSeq: 3, students: [], questions: [{ id: 2, body: 'yeni' }], exams: [] }, kitaplik: KITAPLIK, zarf: { olusturma: '2026-11-06T09:00:00.000Z' } };

  it('onay penceresi: özet + "Mevcut veriler bu yedekle DEĞİŞTİRİLECEK." + tehlikeli', async () => {
    const e = ortam({ onay: false, state: mevcut(), kitaplik: ESKI_KITAP });
    await e.k.yedekGeriYukle(YENI);
    const o = e.onayMetinleri[0];
    expect(o.metin).toContain('Mevcut veriler bu yedekle DEĞİŞTİRİLECEK.');
    expect(o.metin).toMatch(/1 soru · 0 sınav · 0 öğrenci · 1 kitap/);
    expect(o.metin).toMatch(/Yedek tarihi: 6 Kasım 2026/);
    expect(o.tehlikeli).toBe(true);
  });

  it('Vazgeç → localStorage ve kitaplık DEĞİŞMEZ, geri al kopyası alınmaz', async () => {
    const e = ortam({ onay: false, state: mevcut(), kitaplik: ESKI_KITAP });
    expect(await e.k.yedekGeriYukle(YENI)).toBe(false);
    expect(e.lsCagri).toEqual([]);
    expect(e.idbYazim).toEqual([]);
    expect(e.idb()).toEqual(ESKI_KITAP);
    expect(e.k.geriAl()).toBeNull();
    expect(e.k.resetting()).toBe(false);
  });

  it('Onay → geri al kopyası (eski durum + eski kitaplık) bellekte; yeni veri yazılır; kayıt durdurulur', async () => {
    const e = ortam({ onay: true, state: mevcut(), kitaplik: ESKI_KITAP });
    expect(await e.k.yedekGeriYukle(YENI)).toBe(true);
    const ga = e.k.geriAl();
    expect(ga.durum.students).toEqual([{ id: 9, name: 'Eski Öğrenci' }]);
    expect(ga.durum._qIdSeq).toBe(7);
    expect(ga.kitaplik).toEqual(ESKI_KITAP);
    expect(JSON.parse(e.ls['t3-olcme-durum-v1'])).toEqual(YENI.durum);
    expect(e.idb()).toEqual(KITAPLIK);
    expect(e.k.resetting()).toBe(true);   // eski bellek durumu yeni kaydın üstüne yazılamaz
  });

  it('yazım yarıda kalırsa (localStorage kotası) eski kitaplık geri konur, hata yükselir', async () => {
    const e = ortam({ onay: true, state: mevcut(), kitaplik: ESKI_KITAP, setItemHata: true });
    await expect(e.k.yedekGeriYukle(YENI)).rejects.toThrow(/Quota/);
    expect(e.idb()).toEqual(ESKI_KITAP);
    expect(e.k.resetting()).toBe(false);
  });
});

describe('§108 arayüz bağlantıları ve metinler', () => {
  it('⋯ menüsünde Yedekle ve Yedekten geri yükle (okul rolleri), bağlı', () => {
    const r = tanim('renderKabukEk');
    expect(r).toContain('js-ek-yedekle');
    expect(r).toContain('Yedekle…');
    expect(r).toContain('Yedekten geri yükle…');
    expect(r).toMatch(/\.js-ek-yedekle"\)\.forEach[^\n]*yedekAlAc/);
    expect(r).toMatch(/\.js-ek-geri-yukle"\)\.forEach[^\n]*yedekGeriYukleAc/);
  });
  it('parola ne dosyaya ne localStorage\'a yazılır (kaynakta parola saklama yok)', () => {
    const blok = ISLEVLER.concat(['yedekAlAc', 'yedekGeriYukleAc', 'yedekSonucAc']).map(tanim).join('\n');
    expect(blok).not.toMatch(/localStorage\.setItem\([^)]*parola/i);
    expect(blok).not.toMatch(/sessionStorage/);
    expect(blok).not.toMatch(/zarf\.parola/);
  });
  it('gizlilik metni ve KVKK belgesi yedek dosyasını anlatır', () => {
    const pp = fs.readFileSync(path.join(kok, 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('.mihenk');
    expect(pp).toMatch(/sunucusuna gitmez|sunucusuna gönderilmez/);
    const kvkkDir = path.join(kok, 'docs', 'kvkk');
    const kvkk = fs.readdirSync(kvkkDir).map((f) => fs.readFileSync(path.join(kvkkDir, f), 'utf8')).join('\n');
    expect(kvkk).toContain('.mihenk');
  });
});
