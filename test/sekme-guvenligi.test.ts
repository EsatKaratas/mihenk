// ============================================================================
// §119 — Sekme güvenliği: aynı localStorage'ı paylaşan iki "sekme" (iki ayrı
// app.js örneği) birbirinin verisini sessizce silemez. Gerçek saveState,
// loadState (sürüm kısmı), sekmeDepoOlayi ve dbIslem bekçisi kaynak metinden
// çıkarılıp new Function ile çalıştırılır (tam-yedek.test.ts deseni).
// Tarayıcıda iki gerçek sayfayla ölçüm: tools/dogrula/sekme-cakisma.mjs.
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
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*|^window\./m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const STORE_KEY = 't3-olcme-durum-v1';

/** Paylaşılan depo: setItem değer DEĞİŞİRSE diğer sekmelere storage olayı yollar (tarayıcı kuralı). */
function paylasilanDepo() {
  const ls: Record<string, string> = {};
  const sekmeler: Any[] = [];
  const depo = (sahip: Any) => ({
    getItem: (k: string) => (k in ls ? ls[k] : null),
    setItem: (k: string, v: string) => {
      const eski = k in ls ? ls[k] : null;
      ls[k] = String(v);
      if (eski !== ls[k]) sekmeler.filter((s) => s !== sahip).forEach((s) => s.olaylar.push({ key: k, newValue: ls[k], oldValue: eski }));
    },
    removeItem: (k: string) => {
      const eski = k in ls ? ls[k] : null;
      delete ls[k];
      if (eski !== null) sekmeler.filter((s) => s !== sahip).forEach((s) => s.olaylar.push({ key: k, newValue: null, oldValue: eski }));
    },
  });
  return { ls, sekmeler, depo };
}

// §123: kayıt alanı (§120 demo) — sürüm kaydı da alana göre ayrı.
const KOD = ['SURUM_KEY', 'SEKME_KIMLIGI', 'DEMO_STORE_KEY'].map(sabit).join('\n') + '\n' +
  ['depoAnahtari', 'surumAnahtari', 'depoSurumOku', 'sekmeCakismasiBildir', 'depoSurumuBizimMi', 'depoyaSurumluYaz', 'sekmeDepoOlayi', 'saveState', 'dbIslem'].map(tanim).join('\n');

/** Bir sekme: kendi state'i, paylaşılan localStorage; açılışta loadState'in sürüm kısmı. */
function sekmeAc(P: ReturnType<typeof paylasilanDepo>, demo = false) {
  const s: Any = { olaylar: [], kutu: 0, idbYazim: 0 };
  P.sekmeler.push(s);
  const localStorage = P.depo(s);
  const state: Any = { questions: [], role: '' };
  const k = new Function('state', 'localStorage', 'STORE_KEY', 'KALICI_ALANLAR', 'kutuSay', 'idbYaz', 'demoBayrak',
    'function demoAlaniMi() { return demoBayrak; }\nfunction saveSoon() { saveState(); }\n' +
    'let qIdSeq = 1; let _resetting = false; let _saveTimer = null; let depoHatasi = ""; const KITAPLIK_STORE = "kitaplar";\n' +
    'let _bilinenSurum = null; let _sonYazilanMetin = null; let sekmeCakismasi = null;\n' +
    'function renderSekmeCakismasi() { kutuSay(); }\n' +
    'function dbAc() { return Promise.resolve({ transaction: function () { idbYaz(); const tx = { objectStore: function () { return {}; } };' +
    ' setTimeout(function () { tx.oncomplete && tx.oncomplete(); }, 0); return tx; } }); }\n' +
    KOD +
    '\n// loadState açılışı (yalnız §119 kısmı + veri)\n' +
    'const _m = depoSurumOku(); _bilinenSurum = _m ? _m.rev : null; const _raw = localStorage.getItem(depoAnahtari(demoAlaniMi())); _sonYazilanMetin = _raw;\n' +
    'if (_raw) { const d = JSON.parse(_raw); KALICI_ALANLAR.forEach(function (a) { if (d[a] !== undefined) state[a] = d[a]; }); }\n' +
    'return { saveState, sekmeDepoOlayi, dbIslem, cakisma: function () { return sekmeCakismasi; }, surum: function () { return _bilinenSurum; } };'
  )(state, localStorage, STORE_KEY, ['questions', 'role'], () => { s.kutu++; }, () => { s.idbYazim++; }, demo);
  s.k = k; s.state = state;
  // Tarayıcıdaki gibi: bekleyen storage olaylarını bu sekmenin dinleyicisine ver.
  s.olaylariIsle = () => { while (s.olaylar.length) k.sekmeDepoOlayi(Object.assign({ storageArea: localStorage }, s.olaylar.shift())); };
  return s;
}
const soruSayisi = (P: Any) => (JSON.parse(P.ls[STORE_KEY] || '{"questions":[]}').questions || []).length;

describe('§119 iki sekme, tek depo', () => {
  it('fikir2 senaryosu: B açıkken A demo yükler; B rol kartına basar → A\'nın 3 sorusu kalır, B\'de kutu', () => {
    const P = paylasilanDepo();
    const B = sekmeAc(P);
    const A = sekmeAc(P);
    A.state.questions = [{ id: 1 }, { id: 2 }, { id: 3 }]; A.state.role = 'content_expert';
    A.k.saveState();
    B.olaylariIsle();
    B.state.role = 'teacher';
    B.k.saveState();
    expect(soruSayisi(P)).toBe(3);
    expect(JSON.parse(P.ls[STORE_KEY]).role).toBe('content_expert');
    expect(B.k.cakisma()).toMatchObject({ neden: 'olay' });
    expect(B.kutu).toBe(1);
    expect(A.k.cakisma()).toBeNull();
  });

  it('olay kaçsa bile (dinleyici çalışmadı) sürüm damgası eski sekmenin yazmasını durdurur', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P); A.state.questions = [{ id: 1 }]; A.k.saveState();
    const B = sekmeAc(P);   // A'nın 1 sorusunu yükledi
    const C = sekmeAc(P);
    C.state.questions.push({ id: 2 }); C.k.saveState();
    // B olaylarını İŞLEMEDEN yazmaya çalışır
    B.state.questions = []; B.k.saveState();
    expect(soruSayisi(P)).toBe(2);
    expect(B.k.cakisma()).toMatchObject({ neden: 'surum' });
    expect(B.kutu).toBe(1);
  });

  it('yalnız açılan ya da hiçbir şey değiştirmeyen sekme diğerini kilitlemez (aynı içerik yeniden yazılmaz)', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P); A.state.questions = [{ id: 1 }]; A.k.saveState();
    const surum = JSON.parse(P.ls[STORE_KEY + ':surum']).rev;
    const B = sekmeAc(P);
    B.k.saveState(); B.k.saveState();
    A.olaylariIsle();
    expect(A.k.cakisma()).toBeNull();
    expect(JSON.parse(P.ls[STORE_KEY + ':surum']).rev).toBe(surum);
    // A çalışmaya devam eder
    A.state.questions.push({ id: 2 }); A.k.saveState();
    expect(soruSayisi(P)).toBe(2);
  });

  it('aynı sekmenin ardışık yazımları sürümü artırır, kendi yazımı kendini kilitlemez', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P);
    for (let i = 1; i <= 5; i++) { A.state.questions.push({ id: i }); A.k.saveState(); }
    expect(A.k.surum()).toBe(5);
    expect(soruSayisi(P)).toBe(5);
    expect(A.k.cakisma()).toBeNull();
  });

  it('sıfırlama (anahtarlar silindi) ve clear() de çakışma sayılır; eski sekme veriyi geri yazmaz', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P); A.state.questions = [{ id: 1 }]; A.k.saveState();
    const B = sekmeAc(P);
    P.depo(B).removeItem(STORE_KEY); P.depo(B).removeItem(STORE_KEY + ':surum');
    A.olaylariIsle();
    A.state.questions.push({ id: 9 }); A.k.saveState();
    expect(P.ls[STORE_KEY]).toBeUndefined();
    expect(A.k.cakisma()).not.toBeNull();
    const C = sekmeAc(P); C.k.sekmeDepoOlayi({ key: null, newValue: null, storageArea: undefined });
    expect(C.k.cakisma()).toMatchObject({ neden: 'olay' });
  });

  it('ilgisiz anahtarlar (yönetici filtresi vb.) çakışma sayılmaz', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P);
    A.k.sekmeDepoOlayi({ key: 'mihenk-yonetici-filtre', newValue: '{}' });
    expect(A.k.cakisma()).toBeNull();
  });

  it('çakışmada kitaplığa (IndexedDB) yazma reddedilir; okuma sürer', async () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P); A.state.questions = [{ id: 1 }]; A.k.saveState();
    const B = sekmeAc(P);
    await B.k.dbIslem('readwrite', () => null);
    expect(B.idbYazim).toBe(1);
    A.state.questions.push({ id: 2 }); A.k.saveState();
    B.olaylariIsle();
    await expect(B.k.dbIslem('readwrite', () => null)).rejects.toThrow(/başka bir sekmede/);
    expect(B.idbYazim).toBe(1);
    await B.k.dbIslem('readonly', () => null);
    expect(B.idbYazim).toBe(2);
  });
});

describe('§119 kaynak sözleşmesi', () => {
  it('storage dinleyicisi bağlı, kutu role=alert ve yeniden yükle düğmesi var', () => {
    expect(app).toMatch(/window\.addEventListener\("storage", sekmeDepoOlayi\)/);
    const r = tanim('renderSekmeCakismasi');
    expect(r).toMatch(/setAttribute\("role", "alert"\)/);
    expect(r).toMatch(/location\.reload\(\)/);
    expect(sabit('SEKME_CAKISMA_BASLIK')).toMatch(/Veri başka sekmede değişti/);
  });
  it('saveState sürüm denetiminden geçmeden yazmaz; doğrudan STORE_KEY yazımı yalnız sürümlü yazıcıda', () => {
    expect(tanim('saveState')).toMatch(/if \(!depoSurumuBizimMi\(\)\) return;/);
    // §123: durum kaydına (kullanıcı ya da demo alanı) doğrudan yazım yalnız sürümlü yazıcıda.
    const yazimlar = app.match(/localStorage\.setItem\((STORE_KEY|DEMO_STORE_KEY|depoAnahtari\()/g) || [];
    expect(yazimlar.length).toBe(1);
    expect(tanim('depoyaSurumluYaz')).toMatch(/localStorage\.setItem\(depoAnahtari\(demo\), metin\)/);
  });
  it('yedek geri yükleme çakışmada reddedilir; sıfırlama sürüm kaydını da siler', () => {
    expect(tanim('yedekGeriYukle')).toMatch(/depoSurumuBizimMi\(\)\) throw yedekHata\("sekme_cakisma"\)/);
    expect(tanim('resetState')).toMatch(/removeItem\(SURUM_KEY\)/);
    expect(tanim('dbAc')).toMatch(/onversionchange/);
  });
});

// ============================================================================
// §123 — entegrasyon: §119 sekme koruması × §120 demo alanı
// ============================================================================
describe('§123 sekme koruması demo alanında', () => {
  const DEMO = STORE_KEY + '-demo';
  it('demo sekmesi çoğaltıldıysa (iki sekme aynı demo alanında) koruma aynen çalışır', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P, true); const B = sekmeAc(P, true);
    A.state.questions = [{ id: 1 }, { id: 2 }, { id: 3 }]; A.k.saveState(); B.olaylariIsle();
    B.state.role = 'teacher'; B.k.saveState();                       // eski bellekle yazmaya çalışır
    expect(JSON.parse(P.ls[DEMO]).questions.length).toBe(3);
    expect(B.kutu).toBe(1);
    expect(P.ls[STORE_KEY]).toBeUndefined();                          // kullanıcı alanına hiç yazılmadı
  });
  it('olay kaçsa bile demo alanının sürüm damgası eski demo sekmesini durdurur', () => {
    const P = paylasilanDepo();
    const A = sekmeAc(P, true); const B = sekmeAc(P, true);
    A.state.questions = [{ id: 1 }]; A.k.saveState();                 // B olayları işlemedi
    B.state.questions = []; B.k.saveState();
    expect(JSON.parse(P.ls[DEMO]).questions.length).toBe(1);
    expect(B.kutu).toBe(1);
  });
  it('demo yazımları kullanıcının kaydını ve SÜRÜMÜNÜ değiştirmez; iki taraf birbirini kilitlemez', () => {
    const P = paylasilanDepo();
    const U = sekmeAc(P, false);
    U.state.questions = [{ id: 7 }]; U.k.saveState();
    const kayit = P.ls[STORE_KEY]; const surum = P.ls[STORE_KEY + ':surum'];
    const D = sekmeAc(P, true);
    for (let i = 0; i < 5; i++) { D.state.questions = Array.from({ length: i + 1 }, (_, j) => ({ id: j })); D.k.saveState(); }
    U.olaylariIsle();
    expect(P.ls[STORE_KEY]).toBe(kayit);
    expect(P.ls[STORE_KEY + ':surum']).toBe(surum);
    expect(JSON.parse(P.ls[DEMO + ':surum']).rev).toBe(5);
    expect(U.kutu).toBe(0);
    U.state.questions = [{ id: 7 }, { id: 8 }]; U.k.saveState();     // kullanıcı yazmaya devam eder
    D.olaylariIsle();
    expect(JSON.parse(P.ls[STORE_KEY]).questions.length).toBe(2);
    expect(D.kutu).toBe(0); expect(U.kutu).toBe(0);
  });
  it('yeni normal sekme artık kalan demo kaydını silince demo sekmesi çakışma saymaz, kaydını geri yazar', () => {
    const P = paylasilanDepo();
    const D = sekmeAc(P, true);
    D.state.questions = [{ id: 1 }, { id: 2 }]; D.k.saveState();
    const yeni: Any = { olaylar: [] }; P.sekmeler.push(yeni);
    P.depo(yeni).removeItem(DEMO);                                   // demoAlaniniOku temizliği
    D.olaylariIsle();
    expect(D.kutu).toBe(0);
    expect(JSON.parse(P.ls[DEMO]).questions.length).toBe(2);
  });
  it('kullanıcı alanındaki sıfırlama/clear demo sekmesini etkilemez; clear() (anahtar null) yine çakışmadır', () => {
    const P = paylasilanDepo();
    const U = sekmeAc(P, false); U.state.questions = [{ id: 1 }]; U.k.saveState();
    const D = sekmeAc(P, true); D.state.questions = [{ id: 9 }]; D.k.saveState();
    const S = sekmeAc(P, false);
    P.depo(S).removeItem(STORE_KEY); P.depo(S).removeItem(STORE_KEY + ':surum');
    D.olaylariIsle(); U.olaylariIsle();
    expect(D.kutu).toBe(0); expect(U.kutu).toBe(1);
    D.olaylar.push({ key: null, newValue: null, oldValue: null }); D.olaylariIsle();
    expect(D.kutu).toBe(1);
  });
  it('açılışın sıfırladığı geçici bayrak varsayılan ceForm\'da da var (yeni açılan sekme içeriği değiştirip yazmaz)', () => {
    // Ölçüldü: varsayılanda pdfLoading yokken çoğaltılmış demo sekmesi açılışta bir kez yazıp ilk sekmeyi kilitliyordu.
    const v = app.slice(app.indexOf('  ceForm: { title: ""'), app.indexOf('  ceForm: { title: ""') + 1200);
    for (const ad of ['pdfLoading: false', 'ocrLoading: false', 'ocrProgress: ""']) expect(v).toContain(ad);
  });
});
