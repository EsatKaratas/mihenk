// ============================================================================
// T3 Vakfı Creathon — Problem 2
// Model çağrı sarmalayıcısı (sağlayıcı bağımsız)
//
// NEDEN SOYUTLAMA VAR:
// Cloudflare Workers AI üzerindeki küçük modeller Türkçede yer yer zayıf
// kalabiliyor. Demo günü kalite sorunu çıkarsa, TEK bir ortam değişkeni
// (AI_PROVIDER) değiştirilerek harici bir sağlayıcıya geçilebilir; mimari
// (Cloudflare Workers + Hono) aynı kalır, yalnızca model sağlayıcısı değişir.
//
// Desteklenen değerler:
//   AI_PROVIDER = "workers-ai"  (varsayılan) -> env.AI.run(...)
//   AI_PROVIDER = "openai"      -> OpenAI uyumlu /chat/completions
//                                  (OpenAI, Groq, DeepSeek, OpenRouter,
//                                   Gemini'nin OpenAI uyumlu ucu ...)
//   AI_PROVIDER = "anthropic"   -> /v1/messages
// ============================================================================

export type AiEnv = {
  AI?: Ai;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
  AI_API_KEY?: string;
  // Yedek sağlayıcı — birincil başarısız olursa (kota dolması, kesinti,
  // model kaldırılması) otomatik devreye girer. Yapılandırılmamışsa
  // yedekleme sessizce atlanır ve hata olduğu gibi bildirilir.
  AI_FALLBACK_PROVIDER?: string;
  AI_FALLBACK_MODEL?: string;
  AI_FALLBACK_BASE_URL?: string;
  AI_FALLBACK_API_KEY?: string;
};

/** Yedek sağlayıcıyı birincilmiş gibi gösteren bir env görünümü üretir. */
/**
 * API anahtarını temizler.
 *
 * GERÇEK OLAY: Anahtar Not Defteri ile kaydedilip yüklendiğinde başına
 * görünmez bir UTF-8 BOM (U+FEFF) eklenmişti. Google "Please pass a valid
 * API key" diyordu ve sebebi hiçbir yerde görünmüyordu. Anahtarın nasıl
 * girildiğine bağlı kalmamak için sunucu tarafında da temizliyoruz:
 * BOM, sıfır genişlikli karakterler ve baş/son boşluklar atılır.
 */
export function temizAnahtar(k?: string): string {
  return (k || '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .trim();
}

/**
 * Birincil sa\u011Flay\u0131c\u0131 \u00E7a\u011Fr\u0131labilir durumda m\u0131?
 *
 * \u00A742: `/status` ucu bunu `!!c.env.AI_API_KEY` ile ham olarak \u00F6l\u00E7\u00FCyordu \u2014
 * yani BOM'lu ya da yaln\u0131zca bo\u015Fluktan olu\u015Fan bir anahtar "haz\u0131r" g\u00F6r\u00FCn\u00FCyordu.
 * Oysa `callModel()` ayn\u0131 anahtar\u0131 `temizAnahtar()`'dan ge\u00E7irip bo\u015F bulunca
 * hata f\u0131rlat\u0131yor. \u0130ki \u00F6l\u00E7\u00FCt ayr\u0131\u015Fm\u0131\u015Ft\u0131: rozet ye\u015Fil, \u00E7a\u011Fr\u0131 \u00F6l\u00FC.
 * BOM tuza\u011F\u0131 bu dosyada zaten bir kez ya\u015Fand\u0131 (bkz. temizAnahtar notu);
 * haz\u0131rl\u0131k kontrol\u00FC de ayn\u0131 temizlikten ge\u00E7mek zorunda.
 */
export function saglayiciHazirMi(env: AiEnv): boolean {
  return providerName(env) === 'workers-ai' ? !!env.AI : !!temizAnahtar(env.AI_API_KEY);
}

export function fallbackEnv(env: AiEnv): AiEnv | null {
  if (!env.AI_FALLBACK_PROVIDER) return null;
  return {
    AI: env.AI,
    AI_PROVIDER: env.AI_FALLBACK_PROVIDER,
    AI_MODEL: env.AI_FALLBACK_MODEL,
    AI_BASE_URL: env.AI_FALLBACK_BASE_URL,
    AI_API_KEY: temizAnahtar(env.AI_FALLBACK_API_KEY),
  };
}

export function fallbackConfigured(env: AiEnv): boolean {
  const f = fallbackEnv(env);
  if (!f) return false;
  return providerName(f) === 'workers-ai' ? !!f.AI : !!temizAnahtar(f.AI_API_KEY);
}

/**
 * §42 — YEDEK SAĞLAYICI SESSİZCE ÖLÜ KALAMAZ.
 *
 * 🔴 ÖLÇÜLDÜ (5 Eylül, canlı uçtan):
 *   curl https://mihenk.bies.workers.dev/api/ai/status
 *   -> {"provider":"workers-ai", ..., "fallback":null}
 * Oysa `wrangler.demo.jsonc` AI_FALLBACK_PROVIDER="openai" ve
 * AI_FALLBACK_MODEL="gpt-5.6-luna" TANIMLIYOR ve yorumunda "demo günü için
 * ŞİDDETLE ÖNERİLİR" yazıyor. Sebep: `AI_FALLBACK_API_KEY` secret'ı deploy
 * edilmiş Worker'da yok, dolayısıyla `fallbackConfigured()` false dönüyor.
 *
 * Eski davranış bu iki DURUMU AYIRT ETMİYORDU:
 *   (a) yedek hiç tanımlanmamış  -> bilinçli bir tercih
 *   (b) yedek tanımlı ama anahtarı yok -> YAPILANDIRMA HATASI
 * İkisi de `fallback: null` dönüyor ve arayüzde "yapılandırılmamış" yazıyordu.
 * Yani konfigin vaat ettiği emniyet ağı yokken kimse uyarılmıyordu; kota
 * jüri günü dolduğunda bu ancak ilk hatayla anlaşılacaktı.
 * §6.3-5 (sessiz düşüş yasağı) tam olarak bunu yasaklıyor.
 *
 * Null döner = söylenecek bir sorun yok. Metin döner = yapılandırma eksik.
 */
export function fallbackSorunu(env: AiEnv): string | null {
  if (!env.AI_FALLBACK_PROVIDER) return null;   // (a) bilinçli tercih — sorun değil
  if (fallbackConfigured(env)) return null;      // yedek gerçekten hazır
  const p = String(env.AI_FALLBACK_PROVIDER).toLowerCase();
  return p === 'workers-ai'
    ? 'Yedek sağlayıcı "workers-ai" olarak tanımlı ama AI binding yok; kota dolarsa yedek devreye giremez.'
    : `Yedek sağlayıcı "${p}" olarak tanımlı ama AI_FALLBACK_API_KEY secret'ı yok; ` +
      'kota dolarsa yedek devreye GİREMEZ. Kurmak için: ' +
      'npx wrangler secret put AI_FALLBACK_API_KEY -c wrangler.demo.jsonc';
}

export type CallOptions = {
  maxTokens: number;
  temperature?: number;
};

const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export function providerName(env: AiEnv): string {
  return (env.AI_PROVIDER || 'workers-ai').toLowerCase();
}

export function modelName(env: AiEnv): string {
  if (env.AI_MODEL) return env.AI_MODEL;
  return providerName(env) === 'workers-ai' ? DEFAULT_WORKERS_AI_MODEL : 'bilinmiyor';
}

/**
 * Tek giriş noktası. Dönen değer metin VEYA nesne olabilir:
 * bazı Workers AI modelleri `response` alanında zaten ayrıştırılmış bir nesne
 * döndürür (String(...) uygulanırsa "[object Object]" olur ve JSON.parse patlar).
 */
async function callModel(env: AiEnv, prompt: string, opts: CallOptions): Promise<string | object> {
  const provider = providerName(env);
  const model = modelName(env);
  const temperature = opts.temperature ?? 0.4;

  if (provider === 'workers-ai') {
    if (!env.AI) throw new Error('AI binding tanımlı değil (wrangler.jsonc -> ai.binding)');
    // agents.md §7.4: max_tokens her çağrıda açıkça verilir.
    const res: any = await env.AI.run(model as any, {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens,
      temperature,
    } as any);
    const r = res?.response ?? res?.result?.response ?? res;
    return typeof r === 'string' ? r : (r as object);
  }

  const apiKey = temizAnahtar(env.AI_API_KEY);
  if (!apiKey) throw new Error(`AI_API_KEY tanımlı değil (provider: ${provider})`);

  // Taban adresin sonundaki '/' temizlenir: Gemini'nin OpenAI uyumlu ucu
  // '.../v1beta/openai/' biçiminde bitiyor ve doğrudan birleştirilirse
  // '//chat/completions' oluşup istek başarısız oluyordu.
  const kirp = (u: string) => u.replace(/\/+$/, '');

  if (provider === 'anthropic') {
    const base = kirp(env.AI_BASE_URL || 'https://api.anthropic.com');
    const r = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const j: any = await r.json();
    return String(j?.content?.[0]?.text ?? '');
  }

  // OpenAI uyumlu (OpenAI, Gemini'nin OpenAI ucu, Groq, DeepSeek, OpenRouter...)
  const base = kirp(env.AI_BASE_URL || 'https://api.openai.com/v1');
  return callOpenAiUyumlu(base, apiKey, model, prompt, opts.maxTokens, temperature);
}

/**
 * GPT-5 ailesi `max_tokens` yerine `max_completion_tokens` istiyor ve bazı
 * modeller varsayılan dışında `temperature` kabul etmiyor.
 *
 * ÖLÇÜLDÜ (26 Ağustos, gerçek anahtarla, canlı uçtan):
 *   gpt-5-nano   -> HTTP 400 "Unsupported parameter: 'max_tokens' is not
 *                   supported with this model. Use 'max_completion_tokens'"
 *   gpt-5.6-luna -> aynı hata
 * Yani bu düzeltme olmadan OpenAI yedeği HER çağrıda 400 döner; kota dolduğu
 * an yedek de ölür. Jüri demosunda ortaya çıkacaktı.
 *
 * Ad kalıbına göre tahmin YETMEZ (sağlayıcılar model adlarını değiştiriyor),
 * bu yüzden davranış uyarlamalı: sunucu hangi alandan şikâyet ederse o alan
 * değiştirilip BİR kez yeniden denenir. `agents.md` §7.4'ün "çıktı sınırı her
 * çağrıda açıkça verilir" kuralı korunur — yalnızca alanın adı değişir.
 */
async function callOpenAiUyumlu(
  base: string,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  // Bilinen aileler için doğru alanla başla; bilinmeyenlerde uyarlama devreye girer.
  let tokenAlani: 'max_tokens' | 'max_completion_tokens' =
    /^(gpt-5|gpt-6|o[1-9])/i.test(model) ? 'max_completion_tokens' : 'max_tokens';
  let temperatureGonder = true;

  for (let deneme = 1; deneme <= 3; deneme++) {
    const govdeNesne: Record<string, unknown> = {
      model,
      [tokenAlani]: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (temperatureGonder) govdeNesne.temperature = temperature;

    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(govdeNesne),
    });

    if (r.ok) {
      const j: any = await r.json();
      const icerik = j?.choices?.[0]?.message?.content;
      if (icerik == null) {
        throw new Error(`Yanıtta içerik yok: ${JSON.stringify(j).slice(0, 300)}`);
      }
      return String(icerik);
    }

    const govde = (await r.text().catch(() => '')).slice(0, 400);

    // Sunucu hangi parametreden şikâyet ediyorsa onu düzelt ve tekrar dene.
    if (r.status === 400 && deneme < 3) {
      const maxTokensSorunu = /max_tokens.*not supported|use ['"`]?max_completion_tokens/i.test(govde);
      const maxCompSorunu = /max_completion_tokens.*(not supported|unsupported|unrecognized)/i.test(govde);
      const tempSorunu = /temperature/i.test(govde) && /(not supported|unsupported|does not support)/i.test(govde);

      if (maxTokensSorunu && tokenAlani === 'max_tokens') {
        tokenAlani = 'max_completion_tokens';
        continue;
      }
      if (maxCompSorunu && tokenAlani === 'max_completion_tokens') {
        tokenAlani = 'max_tokens';
        continue;
      }
      if (tempSorunu && temperatureGonder) {
        temperatureGonder = false;
        continue;
      }
    }

    throw new Error(
      `OpenAI-uyumlu ${r.status} ${r.statusText || ''} @ ${base}/chat/completions [model=${model}] ${govde || '(boş gövde)'}`
    );
  }

  throw new Error(`OpenAI-uyumlu istek uyarlanamadı [model=${model}]`);
}

/**
 * Modelin döndürdüğü metinden ilk dengeli JSON nesnesini/dizisini çıkarır.
 * Modeller sık sık ```json çitleri veya "İşte sonuç:" gibi giriş cümleleri
 * ekler; bu fonksiyon onları tolere eder.
 */
export function extractJson(raw: string | object): unknown {
  // Model zaten ayrıştırılmış bir nesne döndürdüyse doğrudan kullan.
  if (raw && typeof raw === 'object') return raw;
  let s = String(raw || '').trim();

  // ``` çitlerini soy
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const start = s.search(/[{[]/);
  if (start === -1) {
    // Modelin NE döndürdüğü teşhis için şarttır. Boş gelmesi ile alakasız
    // metin dönmesi tamamen farklı sorunlardır: GPT-5 ailesindeki akıl
    // yürüten modeller `max_completion_tokens` bütçesini düşünme
    // tokenlarıyla tüketip içeriği BOŞ döndürebiliyor (26 Ağustos'ta
    // gpt-5-nano'da yaşandı). Eski mesaj ikisini ayırt ettirmiyordu.
    const onIzleme = s.length ? JSON.stringify(s.slice(0, 200)) : '(BOŞ yanıt)';
    throw new Error(`Yanıtta JSON bulunamadı — model şunu döndürdü: ${onIzleme}`);
  }

  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(start, i + 1));
    }
  }
  throw new Error('JSON dengeli biçimde kapanmıyor (yanıt kesilmiş olabilir)');
}

/**
 * Model çağırır ve JSON'a çevirir. Parse başarısız olursa "yalnızca JSON
 * döndür" uyarısıyla BİR kez daha dener (agents.md §7.4 token disiplini
 * gereği ikiden fazla denenmez).
 */
export async function callModelJson(
  env: AiEnv,
  prompt: string,
  opts: CallOptions
): Promise<{ data: unknown; attempts: number; approxPromptChars: number; usedProvider: string; usedModel: string; fellBack: boolean }> {
  try {
    const r = await callOne(env, prompt, opts);
    return { ...r, usedProvider: providerName(env), usedModel: modelName(env), fellBack: false };
  } catch (birincilHata) {
    const yedek = fallbackEnv(env);
    if (!yedek || !fallbackConfigured(env)) throw birincilHata;
    // Birincil sağlayıcı düştü (kota, kesinti, model kaldırılması...).
    // Sessizce yutmuyoruz: hangi sağlayıcının yanıtladığı çağrıya döner ve
    // arayüzde gösterilir.
    console.log(
      JSON.stringify({
        ev: 'ai_fallback',
        from: providerName(env),
        to: providerName(yedek),
        reason: birincilHata instanceof Error ? birincilHata.message.slice(0, 200) : String(birincilHata).slice(0, 200),
      })
    );
    const r = await callOne(yedek, prompt, opts);
    return { ...r, usedProvider: providerName(yedek), usedModel: modelName(yedek), fellBack: true };
  }
}

async function callOne(
  env: AiEnv,
  prompt: string,
  opts: CallOptions
): Promise<{ data: unknown; attempts: number; approxPromptChars: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    // Yanit kesildiyse ikinci denemede token butcesini iki katina cikar ve
    // modelden daha kisa yazmasini iste. Farkli saglayicilar ayni istem icin
    // farkli uzunlukta yaziyor; sabit butce birinde yetip digerinde
    // yetmeyebiliyor (Gemini yedeginde tam bu yasandi).
    const kesilmis = lastErr instanceof Error && /kapanm|kesil/i.test(lastErr.message);
    const p = attempt === 1
      ? prompt
      : prompt + (kesilmis
          ? '\n\nONEMLI: Onceki yanitin YARIDA KESILDI. Daha KISA yaz: her gerekceyi tek cumleyle sinirla. Yalnizca gecerli JSON dondur.'
          : '\n\nONEMLI: Onceki yanitin gecerli JSON degildi. SADECE gecerli JSON dondur; hicbir aciklama, baslik veya kod blogu isareti ekleme.');
    const buOpts = kesilmis ? { maxTokens: Math.min(opts.maxTokens * 2, 4000), temperature: opts.temperature } : opts;
    try {
      const raw = await callModel(env, p, buOpts);
      const data = extractJson(raw);
      // agents.md §7.4: maliyet görünürlüğü — Workers Logs'a yazılır.
      console.log(
        JSON.stringify({
          ev: 'ai_call',
          provider: providerName(env),
          model: modelName(env),
          approxPromptChars: p.length,
          maxTokens: buOpts.maxTokens,
          attempt,
        })
      );
      return { data, attempts: attempt, approxPromptChars: p.length };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
