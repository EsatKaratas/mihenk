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
export function fallbackEnv(env: AiEnv): AiEnv | null {
  if (!env.AI_FALLBACK_PROVIDER) return null;
  return {
    AI: env.AI,
    AI_PROVIDER: env.AI_FALLBACK_PROVIDER,
    AI_MODEL: env.AI_FALLBACK_MODEL,
    AI_BASE_URL: env.AI_FALLBACK_BASE_URL,
    AI_API_KEY: env.AI_FALLBACK_API_KEY,
  };
}

export function fallbackConfigured(env: AiEnv): boolean {
  const f = fallbackEnv(env);
  if (!f) return false;
  return providerName(f) === 'workers-ai' ? !!f.AI : !!f.AI_API_KEY;
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

  if (!env.AI_API_KEY) throw new Error(`AI_API_KEY tanımlı değil (provider: ${provider})`);

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
        'x-api-key': env.AI_API_KEY,
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
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`OpenAI-uyumlu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  return String(j?.choices?.[0]?.message?.content ?? '');
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
  if (start === -1) throw new Error('Yanıtta JSON bulunamadı');

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
    const p =
      attempt === 1
        ? prompt
        : `${prompt}\n\nÖNEMLİ: Önceki yanıtın geçerli JSON değildi. SADECE geçerli JSON döndür; hiçbir açıklama, başlık veya kod bloğu işareti ekleme.`;
    try {
      const raw = await callModel(env, p, opts);
      const data = extractJson(raw);
      // agents.md §7.4: maliyet görünürlüğü — Workers Logs'a yazılır.
      console.log(
        JSON.stringify({
          ev: 'ai_call',
          provider: providerName(env),
          model: modelName(env),
          approxPromptChars: p.length,
          maxTokens: opts.maxTokens,
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
