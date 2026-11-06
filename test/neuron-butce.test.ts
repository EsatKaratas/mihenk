// ============================================================================
// §93 (W10) — Hesap düzeyi günlük Neuron bütçesi testleri.
// Sahte Workers AI bağlaması; gerçek model çağrısı YOK.
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index';
import {
  neuronTahmini, rezervTahmini, katsayi, butceEsigi, rezervAdimi, kapatAdimi, durumOlustur,
  NeuronButce, butceRezerv, butceDurumu, bellekButcesiniSifirla, BUTCE_ESIGI_VARSAYILAN, GUNLUK_HAVUZ,
} from '../src/lib/neuron-butce';
import { bellekSayaciniSifirla, utcGun } from '../src/lib/gunluk-sinir';

const M70 = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const SCOUT = '@cf/meta/llama-4-scout-17b-16e-instruct';
const GUN = '2026-11-06';

const DEGERLENDIRME = {
  breakdown: [{ label: 'Kavram', points: 7, reason: 'Kavramı doğru kullanmış.' }],
  justification: 'Yeterli.', studentFeedback: 'Güzel.', confidence: 0.8,
};
let no = 0;
const govde = () => ({
  questionBody: 'Bütçe testi sorusu ' + ++no, maxScore: 10,
  criteria: [{ label: 'Kavram', weight: 100 }], studentAnswer: 'Bileşke kuvvet 20 N ileri.',
});

/** Sahte storage; `gecikme` get/put'u gerçekten asenkron yapar (araya girme fırsatı). */
function sahteDepo(gecikme = 0) {
  const depo = new Map<string, unknown>();
  let yazma = 0;
  const bekle = () => new Promise((r) => setTimeout(r, gecikme));
  return {
    depo, yazmaSayisi: () => yazma,
    state: { storage: {
      get: async (k: string) => { await bekle(); return depo.get(k); },
      put: async (k: string, v: unknown) => { await bekle(); yazma++; depo.set(k, v); },
    } } as unknown as DurableObjectState,
  };
}
const ns = (nesne: NeuronButce) =>
  ({ idFromName: (n: string) => n, get: () => ({ fetch: (u: string) => nesne.fetch(new Request(u)) }) }) as unknown as DurableObjectNamespace;

function sahteAi(adimlar: Array<() => unknown>, usage: object | null = { prompt_tokens: 1000, completion_tokens: 500 }) {
  let i = 0;
  const AI = {
    run: async () => {
      const sonuc = adimlar[Math.min(i++, adimlar.length - 1)]();
      return usage ? { response: sonuc, usage } : { response: sonuc };
    },
  } as unknown as Ai;
  return { AI, sayi: () => i };
}

const post = (g: unknown, env: object, ip = '9.9.9.9') =>
  app.request('/api/ai/evaluate', {
    method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(g),
  }, env);

beforeEach(() => {
  bellekButcesiniSifirla();
  bellekSayaciniSifirla();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('§93 Neuron tahmini (resmi katsayılar)', () => {
  it('70B: 1M giriş = 26.668, 1M çıkış = 204.805 Neuron', () => {
    expect(neuronTahmini(M70, { prompt_tokens: 1_000_000, completion_tokens: 0 })).toBeCloseTo(26_668);
    expect(neuronTahmini(M70, { prompt_tokens: 0, completion_tokens: 1_000_000 })).toBeCloseTo(204_805);
    expect(neuronTahmini(M70, { prompt_tokens: 1000, completion_tokens: 500 })).toBeCloseTo(26.668 + 102.4025);
  });
  it('Scout: 24.545 / 77.273', () => {
    expect(neuronTahmini(SCOUT, { prompt_tokens: 1_000_000, completion_tokens: 1_000_000 })).toBeCloseTo(24_545 + 77_273);
  });
  it('bilinmeyen model en yüksek katsayıyla (temkinli); kullanım yoksa null', () => {
    expect(katsayi('@cf/yeni/model').bilinen).toBe(false);
    expect(neuronTahmini('@cf/yeni/model', { prompt_tokens: 0, completion_tokens: 1_000_000 })).toBeCloseTo(204_805);
    expect(neuronTahmini(M70, null)).toBeNull();
    expect(neuronTahmini(M70, {})).toBeNull();
  });
  it('rezerv üst sınırdır: max_tokens kadar çıkış + karakter/2 giriş', () => {
    expect(rezervTahmini(M70, 2000, 1000)).toBeCloseTo((1000 * 26_668 + 1000 * 204_805) / 1e6);
  });
  it('eşik ortam değişkeninden; geçersizse 9.000, havuzu aşamaz', () => {
    expect(butceEsigi({})).toBe(BUTCE_ESIGI_VARSAYILAN);
    expect(butceEsigi({ AI_GUNLUK_NEURON_ESIGI: '8000' })).toBe(8000);
    expect(butceEsigi({ AI_GUNLUK_NEURON_ESIGI: '20000' })).toBe(9000);
    expect(butceEsigi({ AI_GUNLUK_NEURON_ESIGI: 'x' })).toBe(9000);
  });
});

describe('§93 saf adımlar', () => {
  it('rezerv eşiğe sığarsa eklenir, sığmazsa ret; kapat rezervi gerçeğe çevirir', () => {
    let { kayit, izin } = rezervAdimi(undefined, GUN, 500, 1000);
    expect(izin).toBe(true);
    expect(kayit).toEqual({ gun: GUN, harcanan: 0, rezerv: 500, tukendi: false });
    ({ kayit, izin } = rezervAdimi(kayit, GUN, 501, 1000));
    expect(izin).toBe(false);
    kayit = kapatAdimi(kayit, GUN, 500, 120);
    expect(kayit).toMatchObject({ harcanan: 120, rezerv: 0 });
  });
  it('gün dönünce sıfırlanır; rezerv 0 altına inmez; tükendi bayrağı reddettirir', () => {
    const dun = { gun: '2026-11-05', harcanan: 8999, rezerv: 0, tukendi: true };
    expect(rezervAdimi(dun, GUN, 100, 9000).izin).toBe(true);
    expect(kapatAdimi(undefined, GUN, 300, 0).rezerv).toBe(0);
    const t = kapatAdimi(undefined, GUN, 0, 0, true);
    expect(rezervAdimi(t, GUN, 1, 9000).izin).toBe(false);
  });
  it('durum yüzdesi 10.000 havuza göre; eşikte "doldu"', () => {
    const d = durumOlustur({ gun: GUN, harcanan: 4000, rezerv: 500, tukendi: false }, GUN, 9000, 'bellek');
    expect(d).toMatchObject({ yuzde: 45, tahminiNeuron: 4500, havuz: GUNLUK_HAVUZ, doldu: false, sifirlanmaUtc: '2026-11-07T00:00:00.000Z' });
    expect(durumOlustur({ gun: GUN, harcanan: 9000, rezerv: 0, tukendi: false }, GUN, 9000, 'bellek').doldu).toBe(true);
  });
});

describe('§93 Durable Object', () => {
  it('rezerv/kapat/durum; durum YAZMAZ', async () => {
    const d = sahteDepo();
    const n = new NeuronButce(d.state);
    const iste = async (y: string) => (await (await n.fetch(new Request('https://x' + y))).json()) as any;
    expect((await iste(`/rezerv?gun=${GUN}&esik=1000&miktar=400`)).izin).toBe(true);
    expect((await iste(`/kapat?gun=${GUN}&rezerv=400&gercek=100&tukendi=0`)).kayit).toMatchObject({ harcanan: 100, rezerv: 0 });
    const once = d.yazmaSayisi();
    expect((await iste(`/durum?gun=${GUN}`)).kayit).toMatchObject({ harcanan: 100 });
    expect(d.yazmaSayisi()).toBe(once);
    // Reddedilen rezerv aynı günde yazmaz.
    expect((await iste(`/rezerv?gun=${GUN}&esik=1000&miktar=950`)).izin).toBe(false);
    expect(d.yazmaSayisi()).toBe(once);
  });

  it('EŞZAMANLI İKİ İSTEK eşiğin hemen altında: biri kabul, biri ret (nesne içi sıralama)', async () => {
    const d = sahteDepo(5);  // get ile put arasında gerçek bekleme: sıralama olmasa ikisi de geçerdi
    const n = new NeuronButce(d.state);
    await n.fetch(new Request(`https://x/kapat?gun=${GUN}&rezerv=0&gercek=8600`));
    const [a, b] = await Promise.all([
      n.fetch(new Request(`https://x/rezerv?gun=${GUN}&esik=9000&miktar=300`)).then((r) => r.json() as any),
      n.fetch(new Request(`https://x/rezerv?gun=${GUN}&esik=9000&miktar=300`)).then((r) => r.json() as any),
    ]);
    expect([a.izin, b.izin].sort()).toEqual([false, true]);
    expect((d.depo.get('b') as any).rezerv).toBe(300);
  });

  it('bağlama yoksa bellek; DO hata verirse belleğe düşer ve loglar', async () => {
    expect((await butceDurumu({})).mod).toBe('bellek');
    const bozuk = { idFromName: (x: string) => x, get: () => ({ fetch: async () => { throw new Error('DO yok'); } }) } as unknown as DurableObjectNamespace;
    const r = await butceRezerv({ NEURON_BUTCE: bozuk }, 10);
    expect(r.durum.mod).toBe('bellek');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('butce_do_hata'));
  });
});

describe('§93 rota', () => {
  const doEnv = (AI: Ai, n: NeuronButce, ek: Record<string, unknown> = {}) => ({
    AI, AI_MODEL: M70, AI_FALLBACK_PROVIDER: 'workers-ai', AI_FALLBACK_MODEL: SCOUT, AI_HIZ_BEKLEME_MS: '0',
    NEURON_BUTCE: ns(n), ...ek,
  });

  it('başarılı çağrı: usage tahmini harcanana yazılır, rezerv kapanır', async () => {
    const n = new NeuronButce(sahteDepo().state);
    const { AI } = sahteAi([() => DEGERLENDIRME]);
    const r = await post(govde(), doEnv(AI, n));
    expect(r.status).toBe(200);
    const j: any = await (await app.request('/api/ai/butce', {}, doEnv(AI, n))).json();
    expect(j).toMatchObject({ harcanan: Math.ceil(26.668 + 102.4025), rezerv: 0, mod: 'durable-object', esik: 9000, havuz: 10000 });
  });

  it('eşik doluysa 503 gunluk_butce, model ÇAĞRILMAZ, yedeğe geçilmez, adres hakkı iade', async () => {
    const d = sahteDepo();
    const n = new NeuronButce(d.state);
    await n.fetch(new Request(`https://x/kapat?gun=${utcGun()}&rezerv=0&gercek=8990`));
    const { AI, sayi } = sahteAi([() => DEGERLENDIRME]);
    const r = await post(govde(), doEnv(AI, n, { AI_GUNLUK_IP_SINIRI: '1' }));
    expect(r.status).toBe(503);
    expect(r.headers.get('Retry-After')).toMatch(/^\d+$/);
    const j: any = await r.json();
    expect(j.error).toBe('gunluk_butce');
    expect(j.message).toContain("03:00");
    expect(sayi()).toBe(0);
    // Adres hakkı (limit 1) iade edildi: bütçe açılınca aynı adres çağırabilir.
    await n.fetch(new Request(`https://x/kapat?gun=${utcGun()}&rezerv=0&gercek=0`));
    d.depo.clear();
    expect((await post(govde(), doEnv(AI, n, { AI_GUNLUK_IP_SINIRI: '1' }))).status).toBe(200);
  });

  it('3036: rezerv iade + gün "tükendi"; sonraki istek model çağırmadan 503 gunluk_butce', async () => {
    const n = new NeuronButce(sahteDepo().state);
    const { AI, sayi } = sahteAi([() => { throw new Error('3036: Account limited'); }]);
    expect((await post(govde(), doEnv(AI, n))).status).toBe(503);
    const once = sayi();
    const durum: any = await (await app.request('/api/ai/butce', {}, doEnv(AI, n))).json();
    expect(durum).toMatchObject({ tukendi: true, doldu: true, rezerv: 0, harcanan: 0 });
    const r = await post(govde(), doEnv(AI, n));
    expect((await r.json() as any).error).toBe('gunluk_butce');
    expect(sayi()).toBe(once);
  });

  it('zaman aşımı gibi diğer hatalarda rezerv KALIR (bilinen fazla sayım)', async () => {
    const n = new NeuronButce(sahteDepo().state);
    const { AI } = sahteAi([() => { throw new Error('timed out'); }]);
    await post(govde(), doEnv(AI, n));
    const j: any = await (await app.request('/api/ai/butce', {}, doEnv(AI, n))).json();
    expect(j.rezerv).toBeGreaterThan(0);
  });

  it('usage dönmezse rezerv harcanmış sayılır (temkinli)', async () => {
    const n = new NeuronButce(sahteDepo().state);
    const { AI } = sahteAi([() => DEGERLENDIRME], null);
    expect((await post(govde(), doEnv(AI, n))).status).toBe(200);
    const j: any = await (await app.request('/api/ai/butce', {}, doEnv(AI, n))).json();
    expect(j.rezerv).toBe(0);
    expect(j.harcanan).toBeGreaterThan(200);
  });

  it('/status bütçe eşiğini ve modu söyler', async () => {
    const j: any = await (await app.request('/api/ai/status', {}, { AI_GUNLUK_NEURON_ESIGI: '8500' })).json();
    expect(j.gunlukButce).toEqual({ esik: 8500, mod: 'bellek' });
  });
});
