// ============================================================================
// §86 — Ücretsiz plan güvenilirlik katmanı testleri.
// Sahte Workers AI bağlaması; gerçek model çağrısı YOK. Kota (3036) ve
// dakikalık 429 yanıtlarının GERÇEK biçimi ölçülmedi: buradaki sahte hatalar
// Cloudflare hata tablosundaki kod/metinden ve olası sarmalama biçimlerinden
// türetildi (bkz. src/lib/ai.ts §86 notu).
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index';
import {
  aiHatasiniSinifla, AiKotaHatasi, gatewaySecenekleri, kaynakEtiketi, saniyeUtcGunSonuna,
} from '../src/lib/ai';
import {
  gunlukHakKullan, gunlukSinirDegeri, sayacAdimi, bellekSayaciniSifirla, utcGun, GunlukSayac,
  GUNLUK_SINIR_VARSAYILAN,
} from '../src/lib/gunluk-sinir';

const M70 = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const SCOUT = '@cf/meta/llama-4-scout-17b-16e-instruct';

const DEGERLENDIRME = {
  breakdown: [{ label: 'Kavram', points: 7, reason: 'Kavramı doğru kullanmış.' }],
  justification: 'Yeterli.', studentFeedback: 'Güzel.', confidence: 0.8,
};
// Ayrışan ama şemaya uymayan çıktı (breakdown yok).
const SEMA_DISI = { puan: 7, aciklama: 'Yeterli.' };

let no = 0;
const govde = () => ({
  questionBody: 'Güvenilirlik testi sorusu ' + ++no,
  maxScore: 10,
  criteria: [{ label: 'Kavram', weight: 100 }],
  studentAnswer: 'Bileşke kuvvet 20 N ileri.',
});

type Adim = () => unknown;
/** Model adına göre sırayla davranan sahte AI; çağrıları ve seçenekleri kaydeder. */
function sahteAi(davranis: Record<string, Adim[]>) {
  const cagri: Array<{ model: string; secenek: unknown; argSayisi: number }> = [];
  const AI = {
    run: async (...args: unknown[]) => {
      const model = String(args[0]);
      const i = cagri.filter((c) => c.model === model).length;
      cagri.push({ model, secenek: args[2], argSayisi: args.length });
      const adimlar = davranis[model] || [() => { throw new Error(`5007: No such model ${model}`); }];
      return { response: adimlar[Math.min(i, adimlar.length - 1)]() };
    },
  } as unknown as Ai;
  return { AI, cagri, sayi: (m: string) => cagri.filter((c) => c.model === m).length };
}

const zincirEnv = (AI: Ai, ek: Record<string, string> = {}) => ({
  AI, AI_MODEL: M70, AI_FALLBACK_PROVIDER: 'workers-ai', AI_FALLBACK_MODEL: SCOUT,
  AI_HIZ_BEKLEME_MS: '0', ...ek,
});

const post = (yol: string, g: unknown, env: object, ip?: string) =>
  app.request(yol, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(ip ? { 'cf-connecting-ip': ip } : {}) },
    body: JSON.stringify(g),
  }, env);

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

// Kota hatasının olası biçimleri — gerçek biçim ölçülmedi, hepsi tanınmalı.
const kotaBicimleri: Array<[string, () => unknown]> = [
  ['"3036: ..." mesajı', () => new Error('3036: You have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare\'s Workers Paid plan if you would like to continue usage.')],
  ['AiError önekli', () => new Error('AiError: 3036: Account limited')],
  ['yapısal code alanı', () => Object.assign(new Error('Account limited'), { code: 3036 })],
  ['yapısal errors[].code', () => Object.assign(new Error('upstream'), { errors: [{ code: 3036, message: 'x' }] })],
  ['cause içinde', () => new Error('upstream', { cause: { errors: [{ code: 3036, message: 'Account limited' }] } })],
  ['yalnız metin', () => new Error('You have used up your daily free allocation of 10,000 neurons')],
];

// Bağımsız doğrulamanın bulduğu yanlış pozitifler: metindeki sayı ya da
// gömülü gövde KOTA/HIZ kanıtı DEĞİLDİR.
const yanlisPozitifler: string[] = [
  'The input (3036 tokens) exceeds the context window',
  'requested 3036 tokens, max is 2048',
  'timed out after 3036 ms',
  'Workers AI error code 3036',
  '3036: bilinmeyen',
  'InferenceUpstreamError: {"errors":[{"code":3036,"message":"x"}],"success":false}',
  'OpenAI-uyumlu 400 @ https://x/chat/completions [model=m] {"error":{"code":3036,"message":"bad"}}',
  'AiError: 3040: unknown',
  'moderate limit reached for this content',
  'failed to generate output',
  'response not accurate',
  'separate_limit exceeded',
];

describe('§86 hata ayrımı — aiHatasiniSinifla', () => {
  for (const [ad, uret] of kotaBicimleri) {
    it(`kota (3036): ${ad}`, () => expect(aiHatasiniSinifla(uret())).toBe('kota'));
  }
  it('3036 + status 429 birlikte → kota (hız değil)', () => {
    expect(aiHatasiniSinifla(Object.assign(new Error('3036: Account limited'), { status: 429 }))).toBe('kota');
  });
  it('dakikalık/geçici: 3040, yapısal 429, "rate limit", "Too Many Requests"', () => {
    expect(aiHatasiniSinifla(new Error('AiError: 3040: Capacity temporarily exceeded, please try again.'))).toBe('hiz');
    expect(aiHatasiniSinifla(Object.assign(new Error('istek reddedildi'), { status: 429 }))).toBe('hiz');
    expect(aiHatasiniSinifla(new Error('Rate limited: 300 requests per minute'))).toBe('hiz');
    expect(aiHatasiniSinifla(new Error('429 Too Many Requests'))).toBe('hiz');
  });
  for (const m of yanlisPozitifler) {
    it(`yanlış pozitif yok: "${m.slice(0, 40)}" → diger`, () => expect(aiHatasiniSinifla(new Error(m))).toBe('diger'));
  }
  it('sözcük sınırlı hız metni: "rate-limited", "Rate limits" → hiz', () => {
    expect(aiHatasiniSinifla(new Error('request rate-limited'))).toBe('hiz');
    expect(aiHatasiniSinifla(new Error('Rate limits exceeded'))).toBe('hiz');
  });
  it('mesajda yalnız "429" geçmesi kota SAYILMAZ (README §3.1 testi korunur)', () => {
    expect(aiHatasiniSinifla(new Error('Workers AI 429: daily neuron quota exceeded'))).toBe('diger');
  });
  it('diğer: 5007, zaman aşımı, sayı içeren ilgisiz metin', () => {
    expect(aiHatasiniSinifla(new Error('5007: No such model'))).toBe('diger');
    expect(aiHatasiniSinifla(new Error('3007: Timeout'))).toBe('diger');
    expect(aiHatasiniSinifla(new Error('yanıt 13036 karakter'))).toBe('diger');
    expect(aiHatasiniSinifla('düz metin')).toBe('diger');
    expect(aiHatasiniSinifla(null)).toBe('diger');
  });
  it('saniyeUtcGunSonuna: 23:59:00 UTC → 60 sn; gece yarısı → 86400', () => {
    expect(saniyeUtcGunSonuna(Date.UTC(2026, 10, 5, 23, 59, 0))).toBe(60);
    expect(saniyeUtcGunSonuna(Date.UTC(2026, 10, 5, 0, 0, 0))).toBe(86400);
  });
});

describe('§86 madde 1 — kota 3036 uçtan', () => {
  it('3036 → 503 ai_kota_bitti + Retry-After; tekrar YOK, Scout\'a geçiş YOK', async () => {
    const f = sahteAi({ [M70]: [() => { throw kotaBicimleri[0][1](); }], [SCOUT]: [() => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(503);
    const j: any = await r.json();
    expect(j.error).toBe('ai_kota_bitti');
    expect(j.message).toMatch(/03:00/);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(f.sayi(M70)).toBe(1);
    expect(f.sayi(SCOUT)).toBe(0);
  });

  it('yedek HARİCİ sağlayıcıysa (başka havuz) kota hatasında yedeğe geçiş sürer', async () => {
    const f = sahteAi({ [M70]: [() => { throw kotaBicimleri[2][1](); }] });
    const fetchSahte = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(DEGERLENDIRME) } }] }), { status: 200 })
    );
    const r = await post('/api/ai/evaluate', govde(), {
      AI: f.AI, AI_MODEL: M70, AI_FALLBACK_PROVIDER: 'openai', AI_FALLBACK_MODEL: 'harici', AI_FALLBACK_API_KEY: 'k',
    });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta).toMatchObject({ fellBack: true, yedekModel: true, source: 'openai' });
    expect(fetchSahte).toHaveBeenCalledTimes(1);
  });

  it('Scout da kota dönerse yine ai_kota_bitti (ör. /solve çapraz modda Scout birincil)', async () => {
    const f = sahteAi({ [SCOUT]: [() => { throw kotaBicimleri[1][1](); }], [M70]: [() => ({})] });
    const r = await post('/api/ai/solve', {
      questionBody: 'Kota çözücü sorusu ' + ++no,
      options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }],
    }, zincirEnv(f.AI));
    expect(r.status).toBe(503);
    expect(((await r.json()) as any).error).toBe('ai_kota_bitti');
    expect(f.sayi(M70)).toBe(0);
  });
});

describe('§86 madde 1 — dakikalık 429', () => {
  it('429 + başarılı tekrar → 200, aynı model 2 çağrı, Scout yok, attempts=1', async () => {
    const f = sahteAi({
      [M70]: [() => { throw Object.assign(new Error('Too Many Requests'), { status: 429 }); }, () => DEGERLENDIRME],
    });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta).toMatchObject({ source: 'workers-ai-70b', fellBack: false, yedekModel: false, attempts: 1 });
    expect(f.sayi(M70)).toBe(2);
    expect(f.sayi(SCOUT)).toBe(0);
  });

  it('429 iki kez → en fazla 1 tekrar, sonra eski davranış (Scout yedeği)', async () => {
    const hiz = () => { throw new Error('AiError: 3040: Capacity temporarily exceeded, please try again.'); };
    const f = sahteAi({ [M70]: [hiz, hiz, hiz], [SCOUT]: [() => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(200);
    expect(f.sayi(M70)).toBe(2);
    expect(((await r.json()) as any).meta).toMatchObject({ source: 'workers-ai-scout', yedekModel: true });
  });

  it('bekleme süresi AI_HIZ_BEKLEME_MS ile verilir (varsayılan 2000 ms)', async () => {
    vi.useFakeTimers();
    try {
      const f = sahteAi({ [M70]: [() => { throw new Error('rate limit'); }, () => DEGERLENDIRME] });
      const env = { ...zincirEnv(f.AI) } as Record<string, unknown>;
      delete env.AI_HIZ_BEKLEME_MS;
      const p = post('/api/ai/evaluate', govde(), env);
      await vi.advanceTimersByTimeAsync(1999);
      expect(f.sayi(M70)).toBe(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await p).status).toBe(200);
      expect(f.sayi(M70)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('§86 istek başına model çağrısı tavanı (3)', () => {
  it('her şey bozuk: toplam 3 çağrı (70B 2 + Scout 1)', async () => {
    const f = sahteAi({ [M70]: [() => 'yok'], [SCOUT]: [() => 'yok'] });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(502);
    expect(f.cagri.length).toBe(3);
  });

  it('hız tekrarı tavana dahil: 70B 429 → tekrar bozuk JSON → JSON onarımı YOK, Scout 1', async () => {
    const f = sahteAi({
      [M70]: [() => { throw new Error('Too Many Requests'); }, () => 'bozuk', () => DEGERLENDIRME],
      [SCOUT]: [() => DEGERLENDIRME],
    });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(200);
    expect(f.sayi(M70)).toBe(2);
    expect(f.sayi(SCOUT)).toBe(1);
    expect(((await r.json()) as any).meta).toMatchObject({ source: 'workers-ai-scout', yedekModel: true });
  });

  it('Scout\'ta hız hatası tekrar edilmez (Scout hakkı 1)', async () => {
    const f = sahteAi({ [M70]: [() => 'yok'], [SCOUT]: [() => { throw new Error('rate limited'); }, () => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(502);
    expect(f.sayi(SCOUT)).toBe(1);
    expect(f.cagri.length).toBe(3);
  });

  it('kesilmiş JSON yolunda 2. deneme bütçesi büyür (820 → 1640), tavan yine 3', async () => {
    const maks: unknown[] = [];
    const f = sahteAi({ [M70]: [() => '{"breakdown": [{"label": "Kavram", "po', () => DEGERLENDIRME] });
    const asil = (f.AI as any).run;
    (f.AI as any).run = async (m: string, g: any, ...r: unknown[]) => { maks.push(g.max_tokens); return asil(m, g, ...r); };
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(r.status).toBe(200);
    expect(maks).toEqual([820, 1640]);
  });
});

describe('§86 KVKK — kayıtlar içerik taşımaz', () => {
  const GIZLI = 'GIZLIOGRENCIMETNI';
  const uzun = (on = '') => on + (GIZLI + ' Ali Yılmaz 7-B ').repeat(80);

  /** Tüm console.log/error/warn satırlarını toplar. */
  function kayitlariTopla() {
    const satirlar: string[] = [];
    const yaz = (...a: unknown[]) => { satirlar.push(a.map(String).join(' ')); };
    vi.spyOn(console, 'log').mockImplementation(yaz);
    vi.spyOn(console, 'error').mockImplementation(yaz);
    vi.spyOn(console, 'warn').mockImplementation(yaz);
    return satirlar;
  }

  it('uzun bozuk çıktı, şema dışı (enum received), sağlayıcı gövdesi, kota, hız: hiçbir satırda içerik yok', async () => {
    const satirlar = kayitlariTopla();
    const ogrenciGovdesi = { ...govde(), studentAnswer: uzun('Öğrenci: ') };
    // 1) uzun JSON olmayan çıktı → json_yok; Scout uzun kesik JSON → json_kesik
    let f = sahteAi({ [M70]: [() => uzun()], [SCOUT]: [() => '{"breakdown":"' + uzun()] });
    expect((await post('/api/ai/evaluate', ogrenciGovdesi, zincirEnv(f.AI))).status).toBe(502);
    // 2) şema dışı: zod "received '…'" değeri model metnini taşırdı
    f = sahteAi({ [M70]: [() => ({ ...DEGERLENDIRME, breakdown: uzun() })], [SCOUT]: [() => ({ breakdown: [{ label: 7, points: uzun() }] })] });
    expect((await post('/api/ai/evaluate', ogrenciGovdesi, zincirEnv(f.AI))).status).toBe(502);
    // 3) hız hatası + kota hatası mesajında içerik
    f = sahteAi({ [M70]: [() => { throw new Error('rate limited ' + uzun()); }, () => { throw new Error('3036: daily free allocation ' + uzun()); }] });
    expect((await post('/api/ai/evaluate', ogrenciGovdesi, zincirEnv(f.AI))).status).toBe(503);
    // 4) OpenAI uyumlu sağlayıcı gövdesi mesaja gömülür
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(uzun('{"error":"'), { status: 400 }));
    const r4 = await post('/api/ai/evaluate', ogrenciGovdesi, { AI_PROVIDER: 'openai', AI_MODEL: 'm', AI_API_KEY: 'k' });
    expect(r4.status).toBe(502);

    expect(satirlar.length).toBeGreaterThan(5);
    for (const s of satirlar) {
      expect(s).not.toContain(GIZLI);
      expect(s).not.toContain('Yılmaz');
      expect(s.length).toBeLessThan(600);
    }
    // Teşhis için gereken içeriksiz alanlar duruyor
    const cagrilar = satirlar.filter((s) => s.includes('"ev":"ai_call"')).map((s) => JSON.parse(s));
    expect(cagrilar.some((k) => k.hata?.neden === 'json_yok')).toBe(true);
    expect(cagrilar.some((k) => k.hata?.neden === 'json_kesik')).toBe(true);
    expect(cagrilar.some((k) => k.hata?.neden === 'sema')).toBe(true);
    expect(cagrilar.some((k) => k.hata?.durum === 400)).toBe(true);
    expect(cagrilar.every((k) => typeof k.sureMs === 'number' && typeof k.approxPromptChars === 'number')).toBe(true);
    expect(cagrilar.some((k) => typeof k.yanitUzunlugu === 'number' && k.yanitUzunlugu > 1000)).toBe(true);
    expect(satirlar.some((s) => s.includes('"ev":"ai_kota_bitti"'))).toBe(true);
    expect(satirlar.some((s) => s.includes('"ev":"ai_hiz_tekrar"'))).toBe(true);
  });
});

describe('§86 madde 2 — meta.source', () => {
  it('70B yanıtı: source=workers-ai-70b, yedekModel=false; eski meta alanları duruyor', async () => {
    const f = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    const j: any = await (await post('/api/ai/evaluate', govde(), zincirEnv(f.AI))).json();
    expect(j.meta).toMatchObject({ provider: 'workers-ai', model: M70, attempts: 1, fellBack: false, source: 'workers-ai-70b', yedekModel: false });
    expect(Array.isArray(j.meta.dilUyarisiSozcukler)).toBe(true);
  });
  it('kaynakEtiketi: 70B, Scout, diğer Workers AI modeli, harici sağlayıcı', () => {
    expect(kaynakEtiketi({ AI_MODEL: M70 })).toBe('workers-ai-70b');
    expect(kaynakEtiketi({ AI_MODEL: SCOUT })).toBe('workers-ai-scout');
    expect(kaynakEtiketi({ AI_MODEL: '@cf/meta/llama-3.1-8b-instruct' })).toBe('workers-ai');
    expect(kaynakEtiketi({ AI_PROVIDER: 'openai', AI_MODEL: 'x' })).toBe('openai');
  });
});

describe('§86 madde 3 — şema doğrulaması, onarım, Scout', () => {
  it('şemaya uymayan çıktı → AYNI istemle 1 onarım → geçerli (Scout yok)', async () => {
    const icerikler: string[] = [];
    const f = sahteAi({ [M70]: [() => SEMA_DISI, () => DEGERLENDIRME] });
    const asil = (f.AI as any).run;
    (f.AI as any).run = async (m: string, g: any, ...r: unknown[]) => { icerikler.push(g.messages[0].content); return asil(m, g, ...r); };
    const res = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(res.status).toBe(200);
    const j: any = await res.json();
    expect(j.meta).toMatchObject({ attempts: 2, source: 'workers-ai-70b', yedekModel: false });
    expect(f.sayi(SCOUT)).toBe(0);
    // Onarım istemi DEĞİŞTİRMEZ (ölçülmüş kalite sayıları istem-bağımlı).
    expect(icerikler[1]).toBe(icerikler[0]);
  });

  it('bozuk (ayrışmayan) JSON → eski onarım (ek talimatlı) → geçerli', async () => {
    const f = sahteAi({ [M70]: [() => 'Üzgünüm, JSON veremem.', () => DEGERLENDIRME] });
    const res = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).meta.attempts).toBe(2);
    expect(f.sayi(SCOUT)).toBe(0);
  });

  it('70B iki denemede de bozuk → Scout → geçerli: source=workers-ai-scout, yedekModel=true', async () => {
    const f = sahteAi({ [M70]: [() => SEMA_DISI, () => '{bozuk'], [SCOUT]: [() => DEGERLENDIRME] });
    const res = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(res.status).toBe(200);
    const j: any = await res.json();
    expect(j.meta).toMatchObject({ source: 'workers-ai-scout', yedekModel: true, fellBack: true, model: SCOUT });
    expect(j.aiScore).toBe(7);
    expect(f.sayi(M70)).toBe(2);
    expect(f.sayi(SCOUT)).toBe(1);
  });

  it('Scout da şemaya uymaz → açık hata 502 model_output_invalid (sessiz yedek yok)', async () => {
    const f = sahteAi({ [M70]: [() => SEMA_DISI], [SCOUT]: [() => SEMA_DISI] });
    const res = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(res.status).toBe(502);
    const j: any = await res.json();
    expect(j.error).toBe('model_output_invalid');
    expect(typeof j.message).toBe('string');
    // İstek başına tavan 3: 70B en çok 2, Scout en çok 1.
    expect(f.sayi(M70)).toBe(2);
    expect(f.sayi(SCOUT)).toBe(1);
  });

  it('Scout ayrışmayan metin döndürür → açık hata 502 ai_call_failed', async () => {
    const f = sahteAi({ [M70]: [() => 'yok'], [SCOUT]: [() => 'yine yok'] });
    const res = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(res.status).toBe(502);
    const j: any = await res.json();
    expect(j.error).toBe('ai_call_failed');
    expect(j.message).toMatch(/geçerli bir yanıt/);
  });

  it('yedek yoksa şema hatası eskisi gibi model_output_invalid (onarım denemesinden sonra)', async () => {
    const f = sahteAi({ m: [() => SEMA_DISI] });
    const res = await post('/api/ai/evaluate', govde(), { AI: f.AI, AI_MODEL: 'm' });
    expect(res.status).toBe(502);
    expect(((await res.json()) as any).error).toBe('model_output_invalid');
    expect(f.sayi('m')).toBe(2);
  });
});

describe('§86 madde 4 — IP başına günlük sınır', () => {
  beforeEach(() => bellekSayaciniSifirla());

  it('sınır değeri: varsayılan 60, ortam değişkeni, geçersiz değer → varsayılan', () => {
    expect(GUNLUK_SINIR_VARSAYILAN).toBe(60);
    expect(gunlukSinirDegeri({})).toBe(60);
    expect(gunlukSinirDegeri({ AI_GUNLUK_IP_SINIRI: '3' })).toBe(3);
    expect(gunlukSinirDegeri({ AI_GUNLUK_IP_SINIRI: '0' })).toBe(60);
    expect(gunlukSinirDegeri({ AI_GUNLUK_IP_SINIRI: 'abc' })).toBe(60);
  });

  it('sayacAdimi: sınırda durur, gün değişince sıfırlanır', () => {
    let k = sayacAdimi(undefined, '2026-11-05', 2);
    expect(k).toMatchObject({ izin: true, kayit: { sayi: 1 } });
    k = sayacAdimi(k.kayit, '2026-11-05', 2);
    expect(k.izin).toBe(true);
    k = sayacAdimi(k.kayit, '2026-11-05', 2);
    expect(k).toMatchObject({ izin: false, kayit: { sayi: 2 } });
    expect(sayacAdimi(k.kayit, '2026-11-06', 2)).toMatchObject({ izin: true, kayit: { gun: '2026-11-06', sayi: 1 } });
  });

  it('uçtan: sınır aşılınca 429 gunluk_sinir + Retry-After; model çağrılmaz; başka IP etkilenmez', async () => {
    const f = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    const env = { ...zincirEnv(f.AI), AI_GUNLUK_IP_SINIRI: '2' };
    expect((await post('/api/ai/evaluate', govde(), env, '203.0.113.7')).status).toBe(200);
    expect((await post('/api/ai/evaluate', govde(), env, '203.0.113.7')).status).toBe(200);
    const r = await post('/api/ai/evaluate', govde(), env, '203.0.113.7');
    expect(r.status).toBe(429);
    const j: any = await r.json();
    expect(j.error).toBe('gunluk_sinir');
    expect(j.message).toMatch(/2 yapay zekâ çağrısı/);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(f.sayi(M70)).toBe(2);
    expect((await post('/api/ai/evaluate', govde(), env, '198.51.100.9')).status).toBe(200);
  });

  it('model çağırmayan istek (boş yanıt kısayolu, doğrulama hatası) hak yemez', async () => {
    const f = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    const env = { ...zincirEnv(f.AI), AI_GUNLUK_IP_SINIRI: '1' };
    expect((await post('/api/ai/evaluate', { ...govde(), studentAnswer: '  ' }, env, '203.0.113.8')).status).toBe(200);
    expect((await post('/api/ai/evaluate', { questionBody: '' }, env, '203.0.113.8')).status).toBe(400);
    expect((await post('/api/ai/evaluate', govde(), env, '203.0.113.8')).status).toBe(200);
    expect((await post('/api/ai/evaluate', govde(), env, '203.0.113.8')).status).toBe(429);
  });

  it('MODEL ÇAĞRISI başına sayılır: onarım + yedek çağrıları da birer hak', async () => {
    const f = sahteAi({ [M70]: [() => SEMA_DISI], [SCOUT]: [() => DEGERLENDIRME] });
    const env = { ...zincirEnv(f.AI), AI_GUNLUK_IP_SINIRI: '3' };
    expect((await post('/api/ai/evaluate', govde(), env, '203.0.113.9')).status).toBe(200);
    expect(f.cagri.length).toBe(3);
    const r = await post('/api/ai/evaluate', govde(), env, '203.0.113.9');
    expect(r.status).toBe(429);
    expect(f.cagri.length).toBe(3);
  });

  it('zincirin ortasında hak biterse yedek çağrılmaz, 429 gunluk_sinir döner', async () => {
    const f = sahteAi({ [M70]: [() => SEMA_DISI], [SCOUT]: [() => DEGERLENDIRME] });
    const env = { ...zincirEnv(f.AI), AI_GUNLUK_IP_SINIRI: '2' };
    const r = await post('/api/ai/evaluate', govde(), env, '203.0.113.10');
    expect(r.status).toBe(429);
    expect(((await r.json()) as any).error).toBe('gunluk_sinir');
    expect(f.sayi(M70)).toBe(2);
    expect(f.sayi(SCOUT)).toBe(0);
  });

  it('kota bitmişken dönen 503 hak YEMEZ (3036 çağrısının hakkı iade edilir)', async () => {
    const kota = sahteAi({ [M70]: [() => { throw kotaBicimleri[0][1](); }] });
    const env1 = { ...zincirEnv(kota.AI), AI_GUNLUK_IP_SINIRI: '1' };
    expect((await post('/api/ai/evaluate', govde(), env1, '203.0.113.11')).status).toBe(503);
    expect((await post('/api/ai/evaluate', govde(), env1, '203.0.113.11')).status).toBe(503);
    const ok = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    const env2 = { ...zincirEnv(ok.AI), AI_GUNLUK_IP_SINIRI: '1' };
    expect((await post('/api/ai/evaluate', govde(), env2, '203.0.113.11')).status).toBe(200);
    expect((await post('/api/ai/evaluate', govde(), env2, '203.0.113.11')).status).toBe(429);
  });

  it('/status günlük sınırı ve modu açıkça söyler (bağlama yok → bellek)', async () => {
    const j: any = await (await app.request('/api/ai/status', {}, { AI_GUNLUK_IP_SINIRI: '25' })).json();
    expect(j.gunlukSinir).toEqual({ limit: 25, mod: 'bellek' });
    expect(j.gateway).toBe(false);
  });

  it('Durable Object sınıfı: sayar, sınırda reddeder, gün değişince sıfırlar', async () => {
    const depo = new Map<string, unknown>();
    const state = { storage: { get: async (k: string) => depo.get(k), put: async (k: string, v: unknown) => { depo.set(k, v); } } };
    const d = new GunlukSayac(state as unknown as DurableObjectState);
    const iste = async (gun: string) => (await (await d.fetch(new Request(`https://x/kullan?limit=2&gun=${gun}`))).json()) as any;
    expect(await iste('2026-11-05')).toEqual({ izin: true, sayi: 1 });
    expect(await iste('2026-11-05')).toEqual({ izin: true, sayi: 2 });
    expect(await iste('2026-11-05')).toEqual({ izin: false, sayi: 2 });
    expect(await iste('2026-11-06')).toEqual({ izin: true, sayi: 1 });
    // iade: aynı günde bir azaltır; başka günün kaydına dokunmaz
    expect(await (await d.fetch(new Request('https://x/iade?gun=2026-11-06'))).json()).toEqual({ sayi: 0 });
    expect(await (await d.fetch(new Request('https://x/iade?gun=2026-11-06'))).json()).toEqual({ sayi: 0 });
    expect(await iste('2026-11-06')).toEqual({ izin: true, sayi: 1 });
    expect(await (await d.fetch(new Request('https://x/iade?gun=2026-11-07'))).json()).toEqual({ sayi: 1 });
  });

  it('bağlama varsa DO kullanılır; DO hata verirse bellek sayacına düşer ve loglar', async () => {
    const depo = new Map<string, unknown>();
    const nesne = new GunlukSayac({ storage: { get: async (k: string) => depo.get(k), put: async (k: string, v: unknown) => { depo.set(k, v); } } } as unknown as DurableObjectState);
    const ns = { idFromName: (n: string) => n, get: () => ({ fetch: (u: string) => nesne.fetch(new Request(u)) }) };
    const s = await gunlukHakKullan({ GUNLUK_SAYAC: ns as unknown as DurableObjectNamespace, AI_GUNLUK_IP_SINIRI: '5' }, '1.2.3.4');
    expect(s).toMatchObject({ izin: true, sayi: 1, limit: 5, mod: 'durable-object' });

    const bozuk = { idFromName: (n: string) => n, get: () => ({ fetch: async () => { throw new Error('DO yok'); } }) };
    const t = await gunlukHakKullan({ GUNLUK_SAYAC: bozuk as unknown as DurableObjectNamespace }, '1.2.3.4');
    expect(t.mod).toBe('bellek');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('gunluk_sinir_do_hata'));
  });

  it('utcGun UTC tarihidir (TR 02:30 = önceki UTC günü)', () => {
    expect(utcGun(Date.UTC(2026, 10, 4, 23, 30))).toBe('2026-11-04');
  });
});

describe('§86 madde 5 — AI Gateway seçeneği', () => {
  it('AI_GATEWAY_ID boş/yok → kapalı: env.AI.run üçüncü argümansız çağrılır', async () => {
    expect(gatewaySecenekleri({})).toBeUndefined();
    expect(gatewaySecenekleri({ AI_GATEWAY_ID: '  ' })).toBeUndefined();
    const f = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    await post('/api/ai/evaluate', govde(), zincirEnv(f.AI));
    expect(f.cagri[0].argSayisi).toBe(2);
  });

  it('AI_GATEWAY_ID dolu → { gateway: { id, cacheTtl, skipCache } } geçer', async () => {
    const f = sahteAi({ [M70]: [() => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', govde(), zincirEnv(f.AI, { AI_GATEWAY_ID: 'mihenk-gw' }));
    expect(r.status).toBe(200);
    expect(f.cagri[0].secenek).toEqual({ gateway: { id: 'mihenk-gw', cacheTtl: 259200, skipCache: false } });
    // Önbellek isabeti binding dönüşünden okunamadığı için source "cache" OLMAZ.
    expect(((await r.json()) as any).meta.source).toBe('workers-ai-70b');
  });

  it('TTL 60 sn – 30 gün aralığına kırpılır; skipCache "1"/"true"', () => {
    expect(gatewaySecenekleri({ AI_GATEWAY_ID: 'g', AI_GATEWAY_CACHE_TTL: '5' })!.gateway.cacheTtl).toBe(60);
    expect(gatewaySecenekleri({ AI_GATEWAY_ID: 'g', AI_GATEWAY_CACHE_TTL: '99999999' })!.gateway.cacheTtl).toBe(2_592_000);
    expect(gatewaySecenekleri({ AI_GATEWAY_ID: 'g', AI_GATEWAY_SKIP_CACHE: 'true' })!.gateway.skipCache).toBe(true);
    expect(gatewaySecenekleri({ AI_GATEWAY_ID: 'g', AI_GATEWAY_SKIP_CACHE: '1' })!.gateway.skipCache).toBe(true);
  });

  it('/status gateway açık olduğunu söyler', async () => {
    const j: any = await (await app.request('/api/ai/status', {}, { AI_GATEWAY_ID: 'g' })).json();
    expect(j.gateway).toBe(true);
  });

  it('AiKotaHatasi sınıflandırıcıda kota sayılır (zincirde yeniden sarılmaz)', () => {
    expect(aiHatasiniSinifla(new AiKotaHatasi('x'))).toBe('kota');
  });
});
