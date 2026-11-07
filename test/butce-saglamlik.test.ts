// ============================================================================
// §129 (W10) — Bütçe sağlamlaştırma (fikir3-E Y2): tek adres günlük havuzu
// bitiremesin.
//  a) adres başına günlük Neuron payı (rezerv → kapat, usage ile gerçek)
//  b) IPv6 /64 önekine indirgeme
//  c) docKey'e güvenmeme: üretim ayrıca adres başına sayılır
//  d) istek boyutu: excludeQuestions toplam tavanı, gövde 256 KB
// Sahte Workers AI bağlaması; gerçek model çağrısı YOK (/api/ai POST yok).
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import app, { MAX_AI_GOVDE_BAYT } from '../src/index';
import { adresAnahtari } from '../src/lib/adres';
import {
  adresRezervAdimi, adresKapatAdimi, adresNeuronPayi, ADRES_NEURON_PAYI_VARSAYILAN, GunlukSayac,
  bellekSayaciniSifirla, adresNeuronBelleginiSifirla, adresRezerv, adresKapat,
} from '../src/lib/gunluk-sinir';
import { bellekButcesiniSifirla } from '../src/lib/neuron-butce';
import { haricListesiniKirp, MAX_EXCLUDE_TOTAL_CHARS, RATE_LIMIT_GEN_ADRES_PER_MIN } from '../src/lib/guards';

const GUN = '2026-11-07';
let no = 0;
const degerlendirme = () => ({
  questionBody: 'Pay testi sorusu ' + ++no, maxScore: 10,
  criteria: [{ label: 'Kavram', weight: 100 }], studentAnswer: 'Sürtünme harekete zıt yöndedir.',
});
const DEG_YANIT = { breakdown: [{ label: 'Kavram', points: 7, reason: 'Doğru.' }], justification: 'Yeterli.', studentFeedback: 'İyi.', confidence: 0.8 };

function sahteAi(yanit: unknown, usage: object | null = { prompt_tokens: 1000, completion_tokens: 500 }) {
  let n = 0;
  const AI = { run: async () => { n++; return usage ? { response: yanit, usage } : { response: yanit }; } } as unknown as Ai;
  return { AI, sayi: () => n };
}
const post = (yol: string, g: unknown, env: object, ip: string | null) =>
  app.request(yol, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(ip ? { 'cf-connecting-ip': ip } : {}) }, body: JSON.stringify(g),
  }, env);

beforeEach(() => {
  bellekButcesiniSifirla(); bellekSayaciniSifirla(); adresNeuronBelleginiSifirla();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// --------------------------------------------------------------------------
describe('§129 b — IPv6 /64 anahtarı', () => {
  it('IPv4 olduğu gibi; boş boş', () => {
    expect(adresAnahtari('203.0.113.7')).toBe('203.0.113.7');
    expect(adresAnahtari('')).toBe('');
    expect(adresAnahtari(undefined)).toBe('');
  });
  it('aynı /64 içindeki farklı yazımlar ve adresler AYNI anahtar', () => {
    const k = adresAnahtari('2001:db8:1:2::1');
    expect(k).toBe('2001:db8:1:2::/64');
    for (const a of ['2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd', '2001:DB8:1:2:ffff::', '2001:db8:1:2:0:0:0:9', '[2001:db8:1:2::5]', '2001:db8:1:2::7%eth0']) {
      expect(adresAnahtari(a), a).toBe(k);
    }
  });
  it('komşu /64 farklı anahtar', () => {
    expect(adresAnahtari('2001:db8:1:3::1')).not.toBe(adresAnahtari('2001:db8:1:2::1'));
  });
  it('IPv4\'e eşlenmiş IPv6 IPv4\'e döner; :: ve gömülü IPv4 açılır', () => {
    expect(adresAnahtari('::ffff:198.51.100.4')).toBe('198.51.100.4');
    expect(adresAnahtari('::1')).toBe('0:0:0:0::/64');
    expect(adresAnahtari('64:ff9b::192.0.2.1')).toBe('64:ff9b:0:0::/64');
  });
  it('ayrıştırılamayan değer olduğu gibi (sınır gevşemez)', () => {
    for (const a of ['1::2::3', 'zz::1', '1:2:3:4:5:6:7:8:9', '::ffff:300.1.1.1']) expect(adresAnahtari(a)).toBe(a);
  });
});

// --------------------------------------------------------------------------
describe('§129 a — adres Neuron payı (saf adımlar ve DO)', () => {
  it('pay ortam değişkeninden; geçersizse 4.500 (9.000 eşiğin yarısı)', () => {
    expect(ADRES_NEURON_PAYI_VARSAYILAN).toBe(4500);
    expect(adresNeuronPayi({})).toBe(4500);
    expect(adresNeuronPayi({ AI_IP_NEURON_PAYI: '3000' })).toBe(3000);
    for (const x of ['0', '-5', '20000', 'x']) expect(adresNeuronPayi({ AI_IP_NEURON_PAYI: x })).toBe(4500);
  });
  it('rezerv paya sığarsa eklenir, sığmazsa ret; kapat rezervi gerçeğe çevirir; gün dönünce sıfır', () => {
    let { kayit, izin } = adresRezervAdimi(undefined, GUN, 300, 500);
    expect(izin).toBe(true);
    ({ kayit, izin } = adresRezervAdimi(kayit, GUN, 201, 500));
    expect(izin).toBe(false);
    kayit = adresKapatAdimi(kayit, GUN, 300, 98);
    expect(kayit).toEqual({ gun: GUN, harcanan: 98, rezerv: 0 });
    expect(adresRezervAdimi(kayit, GUN, 402, 500).izin).toBe(true);
    expect(adresRezervAdimi({ gun: '2026-11-06', harcanan: 500, rezerv: 0 }, GUN, 500, 500).izin).toBe(true);
    expect(adresKapatAdimi({ gun: GUN, harcanan: 0, rezerv: 10 }, GUN, 50, 0).rezerv).toBe(0);
  });
  it('DO: /nrezerv ve /nkapat ayrı anahtarda; çağrı sayacı (k) bozulmaz', async () => {
    const depo = new Map<string, unknown>();
    const nesne = new GunlukSayac({ storage: { get: async (k: string) => depo.get(k), put: async (k: string, v: unknown) => { depo.set(k, v); } } } as unknown as DurableObjectState);
    const f = async (u: string) => (await nesne.fetch(new Request('https://gunluk-sayac' + u))).json() as Promise<any>;
    await f(`/kullan?limit=60&gun=${GUN}`);
    expect((await f(`/nrezerv?gun=${GUN}&pay=500&miktar=400`)).izin).toBe(true);
    expect((await f(`/nrezerv?gun=${GUN}&pay=500&miktar=200`)).izin).toBe(false);
    await f(`/nkapat?gun=${GUN}&rezerv=400&gercek=98`);
    expect(depo.get('n')).toEqual({ gun: GUN, harcanan: 98, rezerv: 0 });
    expect(depo.get('k')).toEqual({ gun: GUN, sayi: 1 });
  });
  it('bellek yedeği: aynı adres payı paylaşır, farklı adres paylaşmaz', async () => {
    const env = { AI_IP_NEURON_PAYI: '500' };
    expect((await adresRezerv(env, 'a', 400)).izin).toBe(true);
    expect((await adresRezerv(env, 'a', 200)).izin).toBe(false);
    expect((await adresRezerv(env, 'b', 400)).izin).toBe(true);
    await adresKapat(env, 'a', 400, 0);
    expect((await adresRezerv(env, 'a', 450)).izin).toBe(true);
  });
});

// --------------------------------------------------------------------------
describe('§129 a+b — uçtan: tek adres payını aşamaz, havuz başkalarına kalır', () => {
  it('pay dolunca 429 adres_payi, model ÇAĞRILMAZ; başka adres çalışır; rezerv sızmaz', async () => {
    const { AI, sayi } = sahteAi(DEG_YANIT);
    const env = { AI, AI_MODEL: 'm', AI_IP_NEURON_PAYI: '700' };
    const kodlar: number[] = [];
    let ilkRet: any = null;
    for (let i = 0; i < 8; i++) {
      const r = await post('/api/ai/evaluate', degerlendirme(), env, '198.51.100.20');
      kodlar.push(r.status);
      if (r.status !== 200 && !ilkRet) ilkRet = await r.json();
    }
    const basarili = kodlar.filter((k) => k === 200).length;
    expect(basarili).toBeGreaterThanOrEqual(2);
    expect(basarili).toBeLessThan(8);
    expect(ilkRet.error).toBe('adres_payi');
    expect(kodlar.slice(basarili).every((k) => k === 429)).toBe(true);
    expect(sayi()).toBe(basarili);                       // ret edilenlerde model çağrılmadı
    // Hesap bütçesi: yalnız gerçek kullanım yazıldı, açık rezerv kalmadı.
    const b: any = await (await app.request('/api/ai/butce', {}, env)).json();
    expect(b.rezerv).toBe(0);
    expect(b.doldu).toBe(false);
    // Başka adres hâlâ çalışıyor.
    expect((await post('/api/ai/evaluate', degerlendirme(), env, '198.51.100.21')).status).toBe(200);
  });

  it('IPv6: aynı /64 içinde adres değiştirmek payı sıfırlamaz', async () => {
    const { AI, sayi } = sahteAi(DEG_YANIT);
    const env = { AI, AI_MODEL: 'm', AI_IP_NEURON_PAYI: '700' };
    const kodlar: number[] = [];
    for (let i = 0; i < 8; i++) kodlar.push((await post('/api/ai/evaluate', degerlendirme(), env, `2001:db8:77:1::${(i + 1).toString(16)}`)).status);
    expect(kodlar).toContain(429);
    expect(sayi()).toBe(kodlar.filter((k) => k === 200).length);
    expect((await post('/api/ai/evaluate', degerlendirme(), env, '2001:db8:77:2::1')).status).toBe(200);   // komşu /64
  });

  it('kota hatasında (3036) adres rezervi iade edilir (pay yenmez)', async () => {
    const env = { AI: { run: async () => { throw Object.assign(new Error('3036: daily free allocation'), { code: 3036 }); } } as unknown as Ai, AI_MODEL: 'm', AI_IP_NEURON_PAYI: '300' };
    for (let i = 0; i < 3; i++) expect((await post('/api/ai/evaluate', degerlendirme(), env, '198.51.100.30')).status).toBe(503);
    expect((await adresRezerv({ AI_IP_NEURON_PAYI: '300' }, '198.51.100.30', 300)).izin).toBe(true);
  });

  it('/status adres payını söyler', async () => {
    const j: any = await (await app.request('/api/ai/status', {}, { AI_IP_NEURON_PAYI: '1200' })).json();
    expect(j.gunlukSinir.neuronPayi).toBe(1200);
  });
});

// --------------------------------------------------------------------------
describe('§129 c — docKey değiştirmek üretim sınırını aşmaz', () => {
  const uretim = (docKey: string) => ({
    mode: 'kazanim', subject: 'Fen Bilimleri', grade: 7, outcomeCode: 'FEN.7.1.2',
    outcomeLabel: 'Kuvvet ve hareket', mcCount: 1, openCount: 0, docKey,
  });
  it(`her istekte yeni docKey: adres başına dakikada ${RATE_LIMIT_GEN_ADRES_PER_MIN}'dan sonra 429`, async () => {
    const { AI } = sahteAi({ questions: [] });
    const env = { AI, AI_MODEL: 'm' };
    const kodlar: number[] = [];
    for (let i = 0; i < RATE_LIMIT_GEN_ADRES_PER_MIN + 2; i++) kodlar.push((await post('/api/ai/generate-questions', uretim('k-' + i + '-' + Math.random()), env, '198.51.100.40')).status);
    expect(kodlar.slice(0, RATE_LIMIT_GEN_ADRES_PER_MIN).every((k) => k !== 429)).toBe(true);
    expect(kodlar.slice(RATE_LIMIT_GEN_ADRES_PER_MIN)).toEqual([429, 429]);
  });
  it('agents.md §4 docKey sınırı (5/dk) aynen duruyor', async () => {
    const { AI } = sahteAi({ questions: [] });
    const kodlar: number[] = [];
    for (let i = 0; i < 6; i++) kodlar.push((await post('/api/ai/generate-questions', uretim('ayni-belge-129'), { AI, AI_MODEL: 'm' }, '198.51.100.41')).status);
    expect(kodlar[5]).toBe(429);
  });
});

// --------------------------------------------------------------------------
describe('§129 d — istek boyutu', () => {
  it('haricListesiniKirp: en yeniler kalır, sıra korunur, toplam tavanı aşmaz', () => {
    const liste = Array.from({ length: 50 }, (_, i) => String(i).padStart(2, '0') + 'x'.repeat(1998));
    const k = haricListesiniKirp(liste);
    expect(k.join('').length).toBeLessThanOrEqual(MAX_EXCLUDE_TOTAL_CHARS);
    expect(k).toEqual(liste.slice(-4));
    const kisa = ['a', 'b', 'c'];
    expect(haricListesiniKirp(kisa)).toEqual(kisa);
  });
  it('uçtan: büyük tekrar önleme listesi isteği REDDETMEZ ama isteme kırpılmış girer', async () => {
    const girdiler: string[] = [];
    const AI = { run: async (_m: string, g: any) => { girdiler.push(JSON.stringify(g)); return { response: { questions: [] } }; } } as unknown as Ai;
    const haric = Array.from({ length: 50 }, (_, i) => 'ESKI-SORU-' + String(i).padStart(2, '0') + ' ' + 'y'.repeat(1980));
    const r = await post('/api/ai/generate-questions', {
      mode: 'kazanim', subject: 'Fen Bilimleri', grade: 7, outcomeCode: 'FEN.7.1.2', outcomeLabel: 'Kuvvet',
      mcCount: 1, openCount: 0, docKey: 'haric-129', excludeQuestions: haric,
    }, { AI, AI_MODEL: 'm' }, '198.51.100.50');
    expect(r.status).not.toBe(400);
    const istem = girdiler.join('\n');
    expect(istem).toContain('ESKI-SORU-49');
    expect(istem).not.toContain('ESKI-SORU-00');
  });
  it(`gövde ${MAX_AI_GOVDE_BAYT} baytı aşarsa 413, ayrıştırılmadan; model çağrılmaz`, async () => {
    const { AI, sayi } = sahteAi(DEG_YANIT);
    const g = { ...degerlendirme(), studentAnswer: 'ş'.repeat(140_000) };   // ≈280 KB UTF-8
    const r = await post('/api/ai/evaluate', g, { AI, AI_MODEL: 'm' }, '198.51.100.60');
    expect(r.status).toBe(413);
    expect(((await r.json()) as any).error).toBe('payload_too_large');
    expect(sayi()).toBe(0);
  });
  it('content-length başlığı olmayan büyük gövde de ölçülür', async () => {
    const govde = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(JSON.stringify({ questionBody: 'x', studentAnswer: 'a'.repeat(300_000) }))); c.close(); } });
    const r = await app.request('/api/ai/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: govde, duplex: 'half' } as RequestInit, {});
    expect(r.status).toBe(413);
  });
  it('meşru en büyük gövde (kavram yanılgısı, 40 × 3.000 Türkçe karakter) sınırın altında', () => {
    expect(Buffer.byteLength(JSON.stringify({ answers: Array(40).fill('ğ'.repeat(1500) + 'a'.repeat(1500)) }), 'utf8')).toBeLessThan(MAX_AI_GOVDE_BAYT);
  });
});

// --------------------------------------------------------------------------
describe('§129 istemci', () => {
  const app_js = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
  it('adres_payi gün sonuna kadar kapalı sayılır ve kendi cümlesiyle gösterilir', () => {
    expect(app_js).toContain('kod === "gunluk_butce" || kod === "adres_payi"');
    expect(app_js).toContain('if (kod === "adres_payi") return AI_ADRES_PAYI_METNI;');
  });
});
