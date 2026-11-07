// ============================================================================
// §132 — demo alanı: (b) üst bant "Gerçek model · …" demez; (c) "Adları gizle"
// tercihi demo alanında ayrı anahtarda; demo gerçek alan tercihini yazmaz.
// İşlevler gerçek app.js kaynağından çıkarılıp sınanır.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
function islev(ad: string) {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const ilkSatir = app.slice(bas + 1, app.indexOf('\n', bas + 1));
  if (/\}\s*$/.test(ilkSatir)) return ilkSatir + '\n';   // tek satırlık işlev
  return app.slice(bas + 1, app.indexOf('\n}\n', bas) + 3);
}
function satir(bas: string) {
  const i = app.indexOf('\n' + bas);
  expect(i, bas + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(i + 1, app.indexOf('\n', i + 1) + 1);   // tek satırlık sabit (satır sonu yorumu dahil)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function kur() {
  const depo: Record<string, string> = {};
  const localStorage = {
    getItem: (k: string) => (k in depo ? depo[k] : null),
    setItem: (k: string, v: string) => { depo[k] = String(v); },
    removeItem: (k: string) => { delete depo[k]; },
  };
  const kod =
    'var _demo = false; function demoAlaniMi() { return _demo; }\n' +
    'var _puanTercih = null;\n' +
    [satir('const PUAN_TERCIH_ANAHTAR '), satir('const PUAN_TERCIH_DEMO_EK ')].join('\n') + '\n' +
    ['puanTercihDemoAnahtari', 'puanTercihAnahtari', 'puanTercihNormal', 'puanTercihAl', 'puanTercihKaydet'].map(islev).join('\n') +
    '\nreturn { puanTercihAl, puanTercihKaydet, puanTercihAnahtari, puanTercihDemoAnahtari,' +
    ' demo: function (v) { _demo = v; _puanTercih = null; } };';
  // eslint-disable-next-line no-new-func
  const f = new Function('localStorage', kod)(localStorage) as Any;
  return { f, depo };
}

describe('§132 (c) demo alanında "Adları gizle" tercihi ayrı', () => {
  it('demo anahtarı §122 anahtarı + "-demo"; gerçek anahtar değişmedi', () => {
    const { f } = kur();
    expect(f.puanTercihAnahtari()).toBe('mihenk.puanlama.tercih.v1');
    expect(f.puanTercihDemoAnahtari()).toBe('mihenk.puanlama.tercih.v1-demo');
    f.demo(true);
    expect(f.puanTercihAnahtari()).toBe('mihenk.puanlama.tercih.v1-demo');
  });

  it('gerçek alanda açık olan tercih demoda okunmaz; demoda değiştirmek gerçek tercihi yazmaz', () => {
    const { f, depo } = kur();
    f.puanTercihKaydet({ adsiz: true, gorunum: 'soru' });            // öğretmenin gerçek tercihi
    const gercek = depo['mihenk.puanlama.tercih.v1'];
    f.demo(true);
    expect(f.puanTercihAl()).toEqual({ adsiz: false, gorunum: 'liste' });   // demo varsayılandan başlar
    f.puanTercihKaydet({ adsiz: true });
    f.puanTercihKaydet({ adsiz: false });
    expect(depo['mihenk.puanlama.tercih.v1']).toBe(gercek);           // bayt bayt aynı
    f.demo(false);
    expect(f.puanTercihAl()).toEqual({ adsiz: true, gorunum: 'soru' });
  });

  it('kaynak: demoya giriş/çıkış ve demo dışı açılış demo tercihini siler, önbelleği sıfırlar', () => {
    const gec = islev('demoAlaninaGec');
    const cik = islev('demoAlanindanCik');
    const oku = islev('demoAlaniniOku');
    for (const g of [gec, cik]) {
      expect(g).toContain('localStorage.removeItem(puanTercihDemoAnahtari())');
      expect(g).toContain('_puanTercih = null');
    }
    expect(oku).toContain('localStorage.removeItem(puanTercihDemoAnahtari())');
    // gerçek anahtarı demo kodu hiç silmez
    for (const g of [gec, cik, oku]) expect(g).not.toContain('removeItem(PUAN_TERCIH_ANAHTAR)');
  });
});

describe('§132 (b) üst bant demo alanında model adı göstermez', () => {
  function bant(demo: boolean, mode = 'live') {
    const el: Any = { innerHTML: '' };
    const kod =
      [satir('const DEMO_AI_KAPALI_METNI '), satir('const DEMO_AI_BANT_METNI ')].join('\n') + '\n' +
      'function demoAlaniMi() { return ' + demo + '; }\n' +
      'function modelKisaAd() { return "Llama 3.3 70B"; } function saglayiciAdi() { return "Cloudflare Workers AI"; }\n' +
      'function aiAyrintiHtml() { return ""; } function aiButceMetni() { return ""; } function aiButceIpucu() { return ""; } function aiButceKisa() { return ""; }\n' +
      'var ROLES = [1,2,3,4,5];\n' +
      'var document = { getElementById: function (id) { return id === "aiModeSlot" ? el : null; } };\n' +
      islev('renderAiBadge') + '\nrenderAiBadge(); return el.innerHTML;';
    const esc = (s: unknown) => String(s);
    // eslint-disable-next-line no-new-func
    return new Function('state', 'escapeHtml', 'el', kod)(
      { ai: { mode, model: '@cf/meta/llama-3.3-70b', provider: 'workers-ai', usingFallback: false, butce: null }, aiAyrintiAcik: false, role: 'teacher' },
      esc, el) as string;
  }
  it('demo alanında: "Demo · model çağrılmaz", yeşil canlı nokta yok', () => {
    const h = bant(true);
    expect(h).toContain('Demo · model çağrılmaz');
    expect(h).not.toContain('Gerçek model');
    expect(h).not.toContain('Llama');
    expect(h).not.toContain('pill-success');
    expect(h).toContain('○');
  });
  it('gerçek alanda değişmedi: "Gerçek model · Llama 3.3 70B", yeşil', () => {
    const h = bant(false);
    expect(h).toContain('Gerçek model · Llama 3.3 70B');
    expect(h).toContain('pill-success');
    expect(h).not.toContain('Demo · model');
  });
});
