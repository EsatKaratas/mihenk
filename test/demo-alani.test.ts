// ============================================================================
// §120 — Demo: güvenli ve dolu (W10).
//  1) Demo AYRI kayıt alanında: kullanıcının kaydı (STORE_KEY) bayt bayt aynı
//     kalır; kitaplığa yazma, yedek/geri yükleme/sıfırlama ve yapay zekâ POST'u
//     demo alanında kapalıdır.
//  2) Dolu sınıf: 24 uydurma "Örnek" öğrenci, 8 ÇSS + 2 açık uçlu, deterministik
//     yanıt deseni; KR-20 sayısal, "gösterge" eşiklerinin (n ≥ 10, k ≥ 5) üstünde.
//     Açık uçlu öneriler kayıtlı örnek veriden (0 Neuron), öğretmen onayı korunur.
//  3) Boş havuz: "Örnek soruları içe al" (ekibin yazdığı, modelsiz) ve sihirbazda
//     "Elle soru yaz" (§99 taslağı, aynı onay yolu).
// İstemci fonksiyonları public/app.js metninden alınıp yalıtılmış kapsamda kurulur.
// Tarayıcı ölçümleri (1280/390, bayt bayt hash, tık sayısı) PROGRESS §120'de ve
// tools/dogrula/kontroller.mjs içinde.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8');

/** Üst düzey fonksiyonun metni (kapanış: satır başındaki ilk "}"). */
function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
/** Üst düzey `const AD = ...` bildirimi; `bitis` bildirimin son karakterleri. */
function sabit(ad: string, bitis: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const son = app.indexOf(bitis, bas);
  return app.slice(bas + 1, son + bitis.length);
}
const sha = (s: string | null) => (s == null ? 'YOK' : createHash('sha256').update(s, 'utf8').digest('hex'));

const VERI = [
  sabit('DEMO_SORULAR', '\n];'), sabit('DEMO_KAZANIMLAR', '\n];'), sabit('DEMO_OGRENCI_ADLARI', '});'),
  sabit('DEMO_SINIF', ';'), sabit('DEMO_YANIT', '";\n'), sabit('DEMO_TOHUM_DEGERLENDIRME', '\n};'),
  sabit('DEMO_YANIT_2', '";\n'), sabit('DEMO_ORNEK_DEGERLENDIRME_2', '\n};'),
  sabit('DEMO_SINIF_TOHUMU', ';'), sabit('DEMO_ACIK_DUZEYLER', '\n];'),
  sabit('ORNEK_PAKET_SIRALARI', ';'), sabit('ORNEK_PAKET_NOTU', '";'),
].join('\n');

// --------------------------------------------------------------------------
describe('§120-1 · ayrı kayıt alanı', () => {
  function kur(demo: boolean, ilk: Record<string, string> = {}) {
    const depo: Record<string, string> = { ...ilk };
    const localStorage = {
      getItem: (k: string) => (k in depo ? depo[k] : null),
      setItem: (k: string, v: string) => { depo[k] = String(v); },
      removeItem: (k: string) => { delete depo[k]; },
    };
    const state: any = { questions: [{ id: 1, body: 'kendi' }], exam: { title: 'Benim' }, demoAdim: 3, demoEnUzak: 3,
      ceForm: {}, outcomes: [] };
    const f = new Function('state', 'localStorage', 'demoBayrak',
      'let qIdSeq = 7; let _resetting = false; var depoHatasi = "";\n' +
      'const STORE_KEY = "t3-olcme-durum-v1";\n' + sabit('DEMO_STORE_KEY', ';') + '\n' +
      'const KALICI_ALANLAR = ["questions", "exam"];\nconst ATOLYELER = []; const VARSAYILAN_KAZANIMLAR = [];\n' +
      'function demoAlaniMi() { return demoBayrak; }\n' + tanim('depoAnahtari') + tanim('saveState') +
      tanim('loadState').replace(/\/\* ---- GÖÇ[\s\S]*?(?=\n    \/\/ Süresi dolmuş)/, '') +
      '\nreturn { saveState, loadState, depoAnahtari, oku: () => qIdSeq };'
    )(state, localStorage, demo);
    return { ...f, depo, state };
  }

  it('depoAnahtari: demo dışı STORE_KEY, demoda "-demo" anahtarı (SAF)', () => {
    const { depoAnahtari } = kur(false);
    expect(depoAnahtari(false)).toBe('t3-olcme-durum-v1');
    expect(depoAnahtari(true)).toBe('t3-olcme-durum-v1-demo');
  });

  it('demo alanında saveState kullanıcının kaydına DOKUNMAZ (bayt bayt aynı)', () => {
    const kendi = JSON.stringify({ _qIdSeq: 5, questions: [{ id: 1, body: 'kendi sorum' }], exam: { title: 'Benim' } });
    const o = kur(true, { 't3-olcme-durum-v1': kendi });
    const once = sha(o.depo['t3-olcme-durum-v1']);
    o.state.questions = [{ id: 1, body: 'demo sorusu' }];
    o.saveState(); o.saveState();
    expect(sha(o.depo['t3-olcme-durum-v1'])).toBe(once);
    const d = JSON.parse(o.depo['t3-olcme-durum-v1-demo']);
    expect(d.questions[0].body).toBe('demo sorusu');
    expect(d._demoAdim).toBe(3);                 // yenilemede rehber kaldığı adımda
  });

  it('demo dışında demo alanları kullanıcının kaydına yazılmaz', () => {
    const o = kur(false);
    o.saveState();
    const d = JSON.parse(o.depo['t3-olcme-durum-v1']);
    expect('_demoAdim' in d).toBe(false);
    expect(o.depo['t3-olcme-durum-v1-demo']).toBeUndefined();
  });

  it('loadState demo alanında demo kaydını okur, rehber adımını geri koyar', () => {
    const o = kur(true, { 't3-olcme-durum-v1': JSON.stringify({ questions: [{ id: 9, body: 'kendi' }] }),
      't3-olcme-durum-v1-demo': JSON.stringify({ questions: [{ id: 2, body: 'demo' }], _demoAdim: 4, _demoEnUzak: 4, _qIdSeq: 12 }) });
    o.state.demoAdim = null;
    expect(o.loadState()).toBe(true);
    expect(o.state.questions[0].body).toBe('demo');
    expect(o.state.demoAdim).toBe(4);
  });

  it('KALICI_ALANLAR değişmedi (yedek/anonim paket şeması aynı); demo alanları listede yok', () => {
    const k = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    for (const ad of ['demoAdim', 'demoEnUzak', '_demo', 'demoAlani']) expect(k).not.toContain(ad);
  });

  it('kitaplık: demo alanında yazma/silme REDDEDİLİR, okuma serbest', async () => {
    const dbIslem = new Function('demoBayrak', 'function demoAlaniMi() { return demoBayrak; }\n' +
      'function dbAc() { return Promise.resolve({ transaction: function () { throw new Error("gerçek db"); } }); }\n' +
      'const KITAPLIK_STORE = "k";\n' + tanim('dbIslem') + '\nreturn dbIslem;')(true);
    await expect(dbIslem('readwrite', () => null)).rejects.toThrow(/Demo alanında kitaplığa kaydedilmez/);
    await expect(dbIslem('readonly', () => null)).rejects.toThrow(/gerçek db/);   // okuma db'ye kadar gider
  });

  it('yapay zekâ: demo alanında apiPost fetch ÇAĞIRMADAN demo_alani hatası verir', async () => {
    let cagri = 0;
    const apiPost = new Function('fetch', 'aiButceYenile', 'aiHataMetni',
      'function demoAlaniMi() { return true; }\n' + sabit('DEMO_AI_KAPALI_METNI', '";') + '\n' + tanim('apiPost') + '\nreturn apiPost;'
    )(() => { cagri++; }, () => {}, () => '');
    await expect(apiPost('/api/ai/generate-questions', {})).rejects.toMatchObject({ kod: 'demo_alani' });
    expect(cagri).toBe(0);
  });

  it('aiEvaluate demo alanında modele gitmeden demoAlaniDegerlendirmesi döner', () => {
    const g = tanim('aiEvaluate');
    const demoSatiri = g.indexOf('demoAlaniDegerlendirmesi(');
    expect(demoSatiri).toBeGreaterThan(0);
    expect(demoSatiri).toBeLessThan(g.indexOf('apiPost(AI_API.evaluate'));
    expect(demoSatiri).toBeGreaterThan(g.indexOf('yzIzinsizSonuc'));        // §88b izin denetimi önce
  });

  it('sıfırla / yedek / geri yükleme demo alanında kullanıcının verisine ulaşamaz', () => {
    const r = tanim('resetState');
    expect(r.indexOf('demoAlanindanCik()')).toBeLessThan(r.indexOf('localStorage.removeItem(STORE_KEY)'));
    expect(r.indexOf('demoAlanindanCik()')).toBeLessThan(r.indexOf('kitapligiSil()'));
    for (const ad of ['sifirlaOnayAc', 'yedekAlAc', 'yedekGeriYukleAc']) expect(tanim(ad)).toMatch(/if \(demoAlaniMi\(\)\) return;/);
    const m = tanim('renderKabukEk');
    expect(m).toContain("okul && !demoAlaniMi() ? '<div class=\"kb-ayrac\" role=\"separator\"></div>' +\n        '<button type=\"button\" role=\"menuitem\" tabindex=\"-1\" class=\"kb-oge js-ek-yedekle\"");
    expect(m).toContain('js-ek-demo-cik');
  });

  it('demoya giriş metni "korunur" der, "değiştirilir" demez', () => {
    const b = tanim('demoBaslat');
    expect(b).toContain('<b>korunur</b>');
    expect(b).not.toMatch(/değiştirilir/);
  });

  it('demoBitir demo alanından çıkar; çıkış demo kaydını siler, kullanıcının kaydına yazmaz', () => {
    expect(tanim('demoBitir')).toContain('if (demoAlaniMi()) { demoAlanindanCik(); return; }');
    const c = tanim('demoAlanindanCik');
    expect(c).toContain('_resetting = true');
    expect(c).toContain('localStorage.removeItem(DEMO_STORE_KEY)');
    expect(c).not.toMatch(/setItem\(STORE_KEY|removeItem\(STORE_KEY/);
  });

  it('loadDemoScenario her zaman önce demo alanına geçer; açılışta ilk durum loadState\'ten ÖNCE saklanır', () => {
    const l = tanim('loadDemoScenario');
    expect(l.indexOf('demoAlaninaGec()')).toBeLessThan(l.indexOf('state.questions = DEMO_SORULAR'));
    const acilis = app.slice(app.indexOf('\ninitPanels();'), app.indexOf('\ninitPanels();') + 400);
    expect(acilis.indexOf('ilkDurumuSakla()')).toBeLessThan(acilis.indexOf('loadState()'));
    expect(acilis.indexOf('demoAlaniniOku()')).toBeLessThan(acilis.indexOf('loadState()'));
  });
});

// --------------------------------------------------------------------------
describe('§120-2 · dolu sınıf (deterministik)', () => {
  const k = new Function(VERI + '\n' + tanim('demoRastgele') + tanim('demoSinifVerisi') + tanim('varyansN') + tanim('kr20') +
    '\nreturn { DEMO_SORULAR, DEMO_KAZANIMLAR, DEMO_OGRENCI_ADLARI, DEMO_SINIF, DEMO_ACIK_DUZEYLER, demoSinifVerisi, kr20 };')();

  it('sorular: 9 ÇSS (biri onay bekleyecek) + 2 açık uçlu; ilk üç soru ve DEMO_SORULAR[2] aynı yerde', () => {
    const mc = k.DEMO_SORULAR.filter((q: any) => q.type === 'mc');
    const acik = k.DEMO_SORULAR.filter((q: any) => q.type === 'open');
    expect(mc).toHaveLength(9);
    expect(acik).toHaveLength(2);
    expect(k.DEMO_SORULAR[2].type).toBe('open');
    for (const q of mc) {
      expect(q.options.map((o: any) => o.key)).toContain(q.correctKey);
      expect(Object.keys(q.distractorRationale).sort()).toEqual(q.options.map((o: any) => o.key).filter((x: string) => x !== q.correctKey).sort());
    }
    // Anahtarlar tek harfe yığılmasın (yanıt deseni ezberlenmesin).
    expect(new Set(mc.map((q: any) => q.correctKey)).size).toBeGreaterThanOrEqual(3);
  });

  it('yeni kazanımlar 2026 Fen 7 kataloğundaki kod ve metinle birebir', () => {
    const katalog = JSON.parse(fs.readFileSync(path.join(kok, 'public', 'mufredat', 'fen-7.json'), 'utf8')).kazanimlar;
    for (const o of k.DEMO_KAZANIMLAR) {
      const x = katalog.find((y: any) => y.kod === o.code);
      expect(x, o.code).toBeTruthy();
      expect(o.label).toBe(o.code + ' — ' + x.metin);
    }
    const kodlar = new Set(k.DEMO_SORULAR.map((q: any) => q.outcome || 'FEN.7.1.2'));
    expect(kodlar.size).toBe(4);                 // ısı haritası 4 sütun
  });

  it('24 uydurma ad, hepsi "Örnek" soyadlı ve tekil', () => {
    expect(k.DEMO_OGRENCI_ADLARI).toHaveLength(24);
    expect(new Set(k.DEMO_OGRENCI_ADLARI).size).toBe(24);
    for (const a of k.DEMO_OGRENCI_ADLARI) expect(a).toMatch(/^\S+ Örnek$/);
  });

  it('yanıt deseni deterministik: aynı tohum → aynı sınıf', () => {
    const z = ['medium', 'easy', 'medium', 'hard', 'easy', 'medium', 'medium', 'hard'];
    expect(JSON.stringify(k.demoSinifVerisi(z, 2, 23))).toBe(JSON.stringify(k.demoSinifVerisi(z, 2, 23)));
    expect(JSON.stringify(k.demoSinifVerisi(z, 2, 23))).not.toBe(JSON.stringify(k.demoSinifVerisi(z, 2, 23, 7)));
  });

  it('KR-20 sayısal ve kabul edilebilir; her çeldirici kullanılır; açık uçlu puanlar 3–19', () => {
    const z = k.DEMO_SORULAR.filter((q: any) => q.type === 'mc').filter((_: any, i: number) => i !== 1).map((q: any) => q.difficulty);
    expect(z).toHaveLength(8);
    const v = k.demoSinifVerisi(z, 2, 23);
    expect(v).toHaveLength(23);
    // Etkin öğrenci (demoda hepsini doğru yapar) da eklenir: n = 24.
    const m = v.map((r: any) => r.mc.map((x: any) => (x.dogru ? 1 : 0))).concat([z.map(() => 1)]);
    const r = k.kr20(m);
    expect(r.n).toBe(24);
    expect(r.k).toBe(8);
    expect(r.deger).toBeGreaterThanOrEqual(0.7);
    expect(r.deger).toBeLessThan(0.95);
    for (let j = 0; j < 8; j++) {
      const p = m.reduce((s: number, x: number[]) => s + x[j], 0) / 24;
      expect(p).toBeGreaterThan(0.1); expect(p).toBeLessThan(0.95);     // hiçbir madde tümüyle kolay/zor değil
      const secilen = new Set(v.map((x: any) => x.mc[j]).filter((x: any) => !x.dogru).map((x: any) => x.celdirici));
      expect(secilen.size, 'madde ' + (j + 1) + ' çeldiricileri').toBe(3);
    }
    for (const satir of v) for (const a of satir.acik) {
      expect(a.nihai).toBeGreaterThanOrEqual(3); expect(a.nihai).toBeLessThanOrEqual(19);
      expect(a.karar).toBe(a.ai === a.nihai ? 'approved_as_is' : 'revised');
    }
  });

  it('açık uçlu düzey metinleri iki soru × üç düzey, her biri üç kriter gerekçeli', () => {
    expect(k.DEMO_ACIK_DUZEYLER).toHaveLength(2);
    for (const s of k.DEMO_ACIK_DUZEYLER) { expect(s).toHaveLength(3); for (const d of s) expect(d.gerekce).toHaveLength(3); }
  });

  it('simüle oturumlar etiketli: demo:true, "model çağrılmadı", Math.random yok', () => {
    const s = tanim('demoSinifOturumlari');
    expect(s).toContain('ogr.demo = true');
    expect(s).toContain('yerel simülasyon (model çağrılmadı)');
    expect(s + tanim('demoSinifVerisi') + tanim('demoRastgele')).not.toContain('Math.random');
  });
});

// --------------------------------------------------------------------------
describe('§120-2 · örnek puan önerileri (0 Neuron, onay korunur)', () => {
  const kayit: any[] = [];
  const k = new Function('auditKaydet', 'auditKisalt', VERI + '\n' + tanim('demoAcikOrnekleri') + tanim('demoOrnekBul') +
    tanim('demoAlaniDegerlendirmesi') + '\nreturn { DEMO_SORULAR, DEMO_YANIT, DEMO_YANIT_2, demoOrnekBul, demoAlaniDegerlendirmesi };'
  )((tur: string, v: any) => kayit.push({ tur, ...v }), (s: string) => s);
  const rubrik = () => ({ maxScore: 20, criteria: [
    { label: 'Kavram doğruluğu', weight: 40 }, { label: 'Örnek / uygulama', weight: 30 }, { label: 'Anlatım açıklığı', weight: 30 }] });
  const acik = (i: number) => ({ id: 30 + i, demo: true, type: 'open', body: k.DEMO_SORULAR.filter((q: any) => q.type === 'open')[i].body });

  it('iki açık uçlu sorunun örnek önerisi: kaynak "demo", etiketli, kaynağı yazılı', () => {
    const a = k.demoOrnekBul(acik(0), k.DEMO_YANIT, rubrik());
    const b = k.demoOrnekBul(acik(1), k.DEMO_YANIT_2, rubrik());
    expect(a.kaynak.source).toBe('demo'); expect(a.demoOrnek).toBe(true); expect(a.aiScore).toBe(16);
    expect(a.ornekKaynak).toMatch(/canlı model yanıtı/);
    expect(b.aiScore).toBe(17); expect(b.ornekKaynak).toMatch(/elle yazdığı örnek.*model yanıtı değildir/);
    expect(b.breakdown.reduce((t: number, x: any) => t + x.points, 0)).toBe(17);
    expect(b.breakdown.map((x: any) => x.max)).toEqual([8, 6, 6]);
  });

  it('yalnız birebir girdi: başka yanıt, demo dışı soru ya da değişmiş rubrik → öneri YOK', () => {
    expect(k.demoOrnekBul(acik(0), k.DEMO_YANIT + ' Ek.', rubrik())).toBeNull();
    expect(k.demoOrnekBul(acik(1), k.DEMO_YANIT, rubrik())).toBeNull();           // çapraz eşleşme yok
    expect(k.demoOrnekBul({ ...acik(0), demo: false }, k.DEMO_YANIT, rubrik())).toBeNull();
    const r = rubrik(); r.maxScore = 10;
    expect(k.demoOrnekBul(acik(0), k.DEMO_YANIT, r)).toBeNull();
  });

  it('örnek yoksa öneri UYDURULMAZ: elle puanlama, denetim izinde "model çağrılmadı"', () => {
    kayit.length = 0;
    const s = k.demoAlaniDegerlendirmesi(acik(0), 'farklı bir yanıt', rubrik(), 5);
    expect(s).toMatchObject({ failed: true, demoAlani: true, aiScore: null });
    expect(kayit[0].model).toMatch(/model çağrılmadı/);
    const t = k.demoAlaniDegerlendirmesi(acik(1), k.DEMO_YANIT_2, rubrik(), 5);
    expect(t.aiScore).toBe(17);
    expect(kayit[1].model).toMatch(/örnek veri — demo alanı \(model çağrılmadı\)/);
  });

  it('öneri NİHAİ değil: demo akışında adım 4 öğretmen onayı olmadan geçilmez', () => {
    const adimlar = app.slice(app.indexOf('const DEMO_ADIMLARI'), app.indexOf('];', app.indexOf('const DEMO_ADIMLARI')));
    expect(adimlar).toContain('hazir: function () { return state.examStatus === "graded"; }');
  });
});

// --------------------------------------------------------------------------
describe('§120-3 · boş havuz çıkışları', () => {
  function kur() {
    const state: any = { questions: [], outcomes: [{ code: 'MAT.7.2.1' }], rubrics: {}, auditLog: [], role: 'teacher' };
    const cagri: string[] = [];
    const f = new Function('state', 'cagri', VERI + '\nlet qIdSeq = 40;\n' +
      'const VARSAYILAN_KAZANIMLAR = [{ code: "FEN.7.1.2", label: "FEN.7.1.2 — Kuvvet ve Hareket" }, { code: "MAT.7.2.1" }];\n' +
      'function ensureRubric(id) { state.rubrics[id] = state.rubrics[id] || { maxScore: 20 }; }\n' +
      'function auditKaydet(tur, v) { state.auditLog.push(Object.assign({ tur: tur }, v)); }\n' +
      'function renderAll() { cagri.push("renderAll"); }\nfunction durumDuyur(m) { cagri.push(m); }\n' +
      tanim('ornekPaketSorulari') + tanim('ornekPaketiIceriAl') + '\nreturn { ornekPaketSorulari, ornekPaketiIceriAl };')(state, cagri);
    return { ...f, state, cagri };
  }

  it('örnek paket: 8 soru (6 ÇSS + 2 açık uçlu), modelsiz, işaretli, demo bayrağı YOK', () => {
    const { ornekPaketSorulari } = kur();
    const p = ornekPaketSorulari();
    expect(p).toHaveLength(8);
    expect(p.filter((q: any) => q.type === 'mc')).toHaveLength(6);
    for (const q of p) {
      expect(q).toMatchObject({ status: 'approved', ornekPaket: true, uretenModel: null });
      expect('demo' in q).toBe(false);
    }
  });

  it('içe alma: havuza eklenir, açık uçluya rubrik, eksik kazanım EKLENİR (silinmez), denetim izi rol ile', () => {
    const o = kur();
    expect(o.ornekPaketiIceriAl()).toBe(8);
    expect(o.state.questions.map((q: any) => q.id)).toEqual([40, 41, 42, 43, 44, 45, 46, 47]);
    expect(Object.keys(o.state.rubrics)).toHaveLength(2);
    expect(o.state.outcomes.map((x: any) => x.code)).toEqual(['MAT.7.2.1', 'FEN.7.1.2', 'FB.7.2.1', 'FB.7.2.2', 'FB.7.2.3']);
    expect(o.state.auditLog).toEqual([{ tur: 'ornek_paket_alindi', adet: 8, rol: 'teacher', not: expect.stringMatching(/yapay zekâ üretmedi/) }]);
  });

  it('ikinci kez içe alma çoğaltmaz', () => {
    const o = kur();
    o.ornekPaketiIceriAl();
    expect(o.ornekPaketiIceriAl()).toBe(0);
    expect(o.state.questions).toHaveLength(8);
  });

  it('sihirbazda elle soru: §99 taslağı (onay bekler), onay aynı soruyuOnayla yolundan, rol yazılır', () => {
    const y = tanim('ogtElleSoruYaz');
    expect(y).toContain('elleSoruOlustur(tur)');
    expect(y).not.toMatch(/approved/);
    expect(tanim('wireBosHavuz')).toContain('wirePendingCards()');      // aynı onay düğmesi bağlayıcısı
    expect(tanim('soruyuOnayla')).toContain('rol: state.role && state.role !== "content_expert" ? state.role : null');
    expect(tanim('ogtElleTaslaklariHtml')).toContain('renderPendingQuestionCard');
  });

  it('boş durum iki çıkışı ve İçerik Uzmanı yolunu birlikte sunar', () => {
    const h = tanim('bosHavuzCikislariHtml');
    for (const id of ['btnOrnekPaket', 'btnOgtElleSoru', 'btnIcerikUzmaninaGit']) expect(h).toContain('id="' + id + '"');
    expect(tanim('sihirbazAdim2Html')).toContain('bosHavuzCikislariHtml()');
  });
});
