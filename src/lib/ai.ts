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
  /* §86 — ücretsiz plan güvenilirlik katmanı (ayrıntı: aşağıdaki §86 notları).
     AI_GATEWAY_ID boşsa AI Gateway KAPALIDIR (bugünkü durum; gateway yok). */
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_CACHE_TTL?: string;
  AI_GATEWAY_SKIP_CACHE?: string;
  /** Dakikalık hız sınırı / geçici kapasite hatasında tek tekrar öncesi bekleme (ms). */
  AI_HIZ_BEKLEME_MS?: string;
};

// ============================================================================
// §86 — HATA AYRIMI: GÜNLÜK KOTA (3036) ≠ DAKİKALIK HIZ SINIRI ≠ DİĞER
//
// Workers AI ücretsiz planda günde 10.000 Neuron verir; bitince HTTP 429 +
// iç kod 3036 "Account limited" döner ve kota 00:00 UTC'de (03:00 TR) açılır.
// Cloudflare hata tablosu (developers.cloudflare.com/workers-ai/platform/errors,
// 5 Kasım 2026'da okundu): 3036 → 429 "You have used up your daily free
// allocation of 10,000 neurons"; 3040 → 429 "Capacity temporarily exceeded,
// please try again". Dakikalık hız sınırının (metin üretiminde 300 istek/dk)
// KENDİ iç kodu tabloda YOK — bu yüzden metinle de tanınır.
//
// Binding'in fırlattığı hatanın TAM biçimi ölçülmedi (kotayı bilerek
// tüketmek gerekirdi). Ayrıştırıcı iki tür kanıt kabul eder:
//  (a) YAPISAL kod: hata nesnesinin sayısal `code` alanı ya da yapısal
//      `errors[].code` (iç içe `cause` dahil);
//  (b) AÇIK metin: kotada "daily free allocation" / "used up your daily" /
//      "Account limited"; hızda sözcük sınırlı "rate limit", "too many
//      requests", "capacity temporarily exceeded".
// MESAJ METNİNDEKİ ÇIPLAK SAYILARA BAKILMAZ (bağımsız doğrulama, 5 Kasım):
// "The input (3036 tokens)…", "requested 3036 tokens", "timed out after
// 3036 ms" kota sanılıyordu. Ayrıca OpenAI uyumlu yol sağlayıcının yanıt
// gövdesini mesaja gömer (callOpenAiUyumlu); oradaki sayılar ve gömülü JSON
// da kanıt sayılmaz.
//
// BİLİNÇLİ DAR TUTULAN NOKTA: mesajda yalnızca "429" geçmesi kota SAYILMAZ.
// 429 iki durumda da döner; çıplak 429'u kota sanmak geçici bir hız sınırında
// istemciye "yarına kadar bekle" dedirtirdi. Böyle bir hata "diğer" sayılır
// ve eski davranış (yedeğe geç) sürer — test/rota.test.ts README §3.1 testi.
// ============================================================================

export type AiHataTuru = 'kota' | 'hiz' | 'diger';

/** Günlük kota bitti: yeniden deneme ve aynı havuzdaki yedeğe geçiş YAPILMAZ. */
export class AiKotaHatasi extends Error {
  readonly tur = 'kota' as const;
  constructor(public readonly ayrinti: string) {
    super(`Workers AI günlük kota bitti (3036): ${ayrinti.slice(0, 200)}`);
    this.name = 'AiKotaHatasi';
  }
}

/** Model yanıtı JSON olarak ayrıştı ama uç noktanın zod şemasına uymadı. */
export class AiSemaHatasi extends Error {
  constructor(public readonly ayrinti: string) {
    super(`Yanıt beklenen JSON şemasına uymuyor: ${ayrinti.slice(0, 200)}`);
    this.name = 'AiSemaHatasi';
  }
}

/**
 * §86 — istek başına model çağrısı tavanı ve çağrı kancası.
 * Bir istek EN ÇOK 3 gerçek model çağrısı yapar: birincil en çok 2 (JSON/şema
 * onarımı ya da dakikalık hız tekrarı bu 2'nin içindedir), yedek en çok 1.
 * `cagriOncesi` HER gerçek binding/sağlayıcı çağrısından hemen önce çalışır
 * (günlük IP hakkı burada düşer); `kotaIade` çağrı 3036 ile döndüyse hakkı
 * geri verir — kota bitmişken dönen 503 hak yemez.
 */
export const ISTEK_BASINA_CAGRI_TAVANI = 3;
const BIRINCIL_CAGRI_TAVANI = 2;
const YEDEK_CAGRI_TAVANI = 1;

export type CagriKancasi = {
  cagriOncesi?: () => Promise<void>;
  kotaIade?: () => Promise<void>;
};

/** Günlük IP sınırı doldu: zincir durur, yedeğe geçilmez. */
export class AiGunlukSinirHatasi extends Error {
  constructor(public readonly limit: number) {
    super(`Günlük adres sınırı doldu (${limit})`);
    this.name = 'AiGunlukSinirHatasi';
  }
}

/** Hata nesnesinden (iç içe olabilir) YAPISAL sayısal kodları ve metni toplar. */
function hataIzleri(e: unknown, derinlik = 0): { kodlar: number[]; metin: string } {
  const kodlar: number[] = [];
  let metin = '';
  if (e == null || derinlik > 3) return { kodlar, metin };
  if (typeof e === 'string') return { kodlar, metin: e };
  if (typeof e !== 'object') return { kodlar, metin: String(e) };
  const o = e as Record<string, unknown>;
  for (const alan of ['code', 'internalCode', 'internal_code']) {
    const n = Number(o[alan]);
    if (Number.isFinite(n) && n > 0) kodlar.push(n);
  }
  if (typeof o.message === 'string') metin += o.message + ' ';
  if (typeof o.name === 'string') metin += o.name + ' ';
  const errs = Array.isArray(o.errors) ? o.errors : [];
  for (const x of errs) {
    const iz = hataIzleri(x, derinlik + 1);
    kodlar.push(...iz.kodlar);
    metin += iz.metin + ' ';
  }
  if (o.cause) {
    const iz = hataIzleri(o.cause, derinlik + 1);
    kodlar.push(...iz.kodlar);
    metin += iz.metin;
  }
  // Mesaj metnindeki sayılara ve gömülü JSON'a BİLEREK bakılmaz (üstteki not).
  return { kodlar, metin };
}

const KOTA_METNI = /daily free allocation|used up your daily|\baccount limited\b/i;
// Sözcük sınırlı: "moderate limit", "generate", "accurate", "separate_limit" hız DEĞİL.
const HIZ_METNI = /\brate[ -]?limit(?:s|ed|ing)?\b|\btoo many requests\b|\bcapacity temporarily exceeded\b/i;

/**
 * Model çağrısı hatasını sınıflandırır.
 *  - 'kota': yapısal kod 3036 ya da açık kota metni. Gün sonuna kadar kalıcı.
 *  - 'hiz' : yapısal kod 3040, yapısal `status === 429` ya da açık hız metni.
 *    Geçicidir: kısa bekleme + (çağrı tavanı izin verirse) 1 tekrar.
 *  - 'diger': geri kalan her şey (eski davranış: yedeğe geç).
 */
export function aiHatasiniSinifla(e: unknown): AiHataTuru {
  if (e instanceof AiKotaHatasi) return 'kota';
  const { kodlar, metin } = hataIzleri(e);
  if (kodlar.includes(3036) || KOTA_METNI.test(metin)) return 'kota';
  const durum = e && typeof e === 'object' ? Number((e as Record<string, unknown>).status) : NaN;
  if (kodlar.includes(3040) || durum === 429 || HIZ_METNI.test(metin)) return 'hiz';
  return 'diger';
}

/**
 * §86 — KVKK: Workers Logs'a yazılabilir, İÇERİKSİZ hata özeti.
 *
 * Hata mesajları model çıktısı (extractJson ön izlemesi), sağlayıcı yanıt
 * gövdesi (callOpenAiUyumlu) ya da zod'un "received '…'" değerini taşıyabilir;
 * bunlar öğrenci yanıtından alıntı içerebilir. Kayda MESAJ METNİ HİÇ girmez:
 * yalnız sınıf adı, hata türü, kendi kodumuzun ürettiği neden etiketi, yapısal
 * kod/HTTP durumu ve mesaj UZUNLUĞU. (SHA-256 öneki eklenmedi: kayıtlar eşzamanlı
 * yazılıyor, crypto.subtle eşzamansız; gerek görülürse ayrı iş.)
 */
export function hataOzeti(e: unknown): Record<string, string | number | null> {
  const mesaj = e instanceof Error ? e.message : String(e ?? '');
  const o = e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
  const { kodlar } = hataIzleri(e);
  const yapisalDurum = Number(o.status);
  // Kendi ürettiğimiz önek ("OpenAI-uyumlu 400 …", "Anthropic 529: …") içerik değildir.
  const onek = mesaj.match(/^(?:OpenAI-uyumlu|Anthropic) (\d{3})\b/);
  const durum = Number.isFinite(yapisalDurum) && yapisalDurum > 0 ? yapisalDurum : onek ? Number(onek[1]) : null;
  return {
    hataSinifi: e instanceof Error ? e.name : typeof e,
    tur: aiHatasiniSinifla(e),
    neden: hataNedeni(e, mesaj),
    kod: kodlar[0] ?? null,
    durum,
    mesajUzunlugu: mesaj.length,
  };
}

function hataNedeni(e: unknown, mesaj: string): string {
  if (e instanceof AiSemaHatasi) return 'sema';
  if (e instanceof AiKotaHatasi) return 'kota';
  if (e instanceof AiGunlukSinirHatasi) return 'gunluk_sinir';
  if (/^Yanıtta JSON bulunamadı/.test(mesaj)) return 'json_yok';
  if (/^JSON dengeli biçimde kapanmıyor/.test(mesaj)) return 'json_kesik';
  if (e instanceof SyntaxError) return 'json_sozdizimi';
  if (/^Yanıtta içerik yok/.test(mesaj)) return 'icerik_yok';
  if (/^(AI binding tanımlı değil|AI_API_KEY tanımlı değil)/.test(mesaj)) return 'yapilandirma';
  return 'model';
}

/** Bir sonraki 00:00 UTC'ye (Workers AI kota sıfırlanması = 03:00 TR) kalan saniye. */
export function saniyeUtcGunSonuna(now: number = Date.now()): number {
  const d = new Date(now);
  const yarin = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return Math.max(1, Math.ceil((yarin - now) / 1000));
}

function hizBeklemeMs(env: AiEnv): number {
  const n = Number(env.AI_HIZ_BEKLEME_MS);
  // Varsayılan 2 sn: dakikalık pencerede bir sonraki saniyelere kaymak için
  // yeterli, isteği kullanıcıyı bezdirecek kadar uzatmayan bir değer. TAHMİN;
  // ölçülmedi (binding hız sınırında `retry-after` vermiyor).
  return Number.isFinite(n) && env.AI_HIZ_BEKLEME_MS !== undefined && env.AI_HIZ_BEKLEME_MS !== ''
    ? Math.min(Math.max(0, n), 10_000)
    : 2000;
}

const bekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * §86 — AI GATEWAY (isteğe bağlı, BUGÜN KAPALI).
 * AI_GATEWAY_ID boşsa `undefined` döner ve `env.AI.run` üçüncü argümansız,
 * eskisi gibi çağrılır. Doluysa `{ gateway: { id, cacheTtl, skipCache } }`.
 * Seçenek adları @cloudflare/workers-types `GatewayOptions` ve
 * developers.cloudflare.com/ai-gateway/usage/worker-binding-methods ile
 * eşleşir. TTL saniyedir; belge aralığı 60 sn – 1 ay, buraya kırpılır.
 * Varsayılan 3 gün: demo öncesi gün ısıtılan önbelleğin demo günü de geçerli
 * kalması için (rapor (d) "önbellek ısıtma"). Değer gerekçeli tahmindir.
 */
export function gatewaySecenekleri(env: AiEnv): { gateway: { id: string; cacheTtl: number; skipCache: boolean } } | undefined {
  const id = (env.AI_GATEWAY_ID || '').trim();
  if (!id) return undefined;
  const ttl = Number(env.AI_GATEWAY_CACHE_TTL);
  const cacheTtl = Number.isFinite(ttl) && ttl > 0 ? Math.min(Math.max(Math.round(ttl), 60), 2_592_000) : 259_200;
  const skipCache = /^(1|true|evet)$/i.test((env.AI_GATEWAY_SKIP_CACHE || '').trim());
  return { gateway: { id, cacheTtl, skipCache } };
}

/**
 * §86 — `meta.source` etiketi. Hangi kaynağın yanıtladığı her başarılı
 * yanıtta görünür (rapor (d): "her kaynak rozetli"). Bugün yalnız iki
 * Workers AI modeli var; `cache` ve `seed` ileride eklenecek.
 * NOT: AI Gateway önbellek isabeti (`cf-aig-cache-status: HIT`) binding'in
 * normal dönüş değerinden OKUNAMIYOR — dönen değer gövdedir, başlık değil.
 * Bu yüzden `cache` bugün işaretlenmez (bkz. PROGRESS §86).
 */
export function kaynakEtiketi(env: AiEnv): string {
  const p = providerName(env);
  const m = modelName(env).toLowerCase();
  if (p === 'workers-ai') {
    if (m.includes('llama-3.3-70b')) return 'workers-ai-70b';
    if (m.includes('scout')) return 'workers-ai-scout';
    return 'workers-ai';
  }
  return p;
}

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
 * Birincil sağlayıcı çağrılabilir durumda mı?
 *
 * §42: `/status` ucu bunu `!!c.env.AI_API_KEY` ile ham olarak ölçüyordu —
 * yani BOM'lu ya da yalnızca boşluktan oluşan bir anahtar "hazır" görünüyordu.
 * Oysa `callModel()` aynı anahtarı `temizAnahtar()`'dan geçirip boş bulunca
 * hata fırlatıyor. İki ölçüt ayrışmıştı: rozet yeşil, çağrı ölü.
 * BOM tuzağı bu dosyada zaten bir kez yaşandı (bkz. temizAnahtar notu);
 * hazırlık kontrolü de aynı temizlikten geçmek zorunda.
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
    const girdi = {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens,
      temperature,
    };
    // §86: gateway kapalıyken üçüncü argüman HİÇ verilmez (eski çağrı birebir).
    const gw = gatewaySecenekleri(env);
    const res: any = gw
      ? await env.AI.run(model as any, girdi as any, gw)
      : await env.AI.run(model as any, girdi as any);
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
/** §86: uç noktanın zod şeması (yalnız `safeParse` gerekir). */
export type JsonSema = {
  safeParse(d: unknown): { success: boolean; error?: { issues?: Array<{ path: (string | number)[]; message: string }> } };
};

/**
 * §86 — ZİNCİR: birincil (en çok 2 gerçek çağrı) → yedek (en çok 1) → açık hata.
 * İstek başına toplam en çok ISTEK_BASINA_CAGRI_TAVANI (3) model çağrısı;
 * dakikalık hız tekrarı da bu sayıya dahildir.
 * `sema` verilirse her yanıt sunucuda o şemayla KATI doğrulanır; şemaya
 * uymayan yanıt "yumuşak hata" sayılır (bkz. callOne onarım notu).
 * Günlük kota (3036) bitince aynı Neuron havuzundaki yedeğe GEÇİLMEZ.
 * `kanca` her gerçek çağrıdan önce çalışır (günlük IP hakkı, routes/ai.ts).
 */
export async function callModelJson(
  env: AiEnv,
  prompt: string,
  opts: CallOptions,
  sema?: JsonSema,
  kanca?: CagriKancasi
): Promise<{ data: unknown; attempts: number; approxPromptChars: number; usedProvider: string; usedModel: string; fellBack: boolean; source: string }> {
  try {
    const r = await callOne(env, prompt, opts, sema, { kalan: BIRINCIL_CAGRI_TAVANI }, kanca);
    return { ...r, usedProvider: providerName(env), usedModel: modelName(env), fellBack: false, source: kaynakEtiketi(env) };
  } catch (birincilHata) {
    // Günlük adres sınırı doldu: yedek de bir çağrı olurdu, zincir durur.
    if (birincilHata instanceof AiGunlukSinirHatasi) throw birincilHata;
    const yedek = fallbackEnv(env);
    if (!yedek || !fallbackConfigured(env)) throw birincilHata;
    /* §86: kota bittiyse ve yedek de Workers AI ise yedek AYNI hesabın AYNI
       günlük havuzundan yer — denemek kesin başarısız ve yalnızca gecikme
       ekler. Harici bir yedek (openai vb.) başka havuzdur; ona geçiş sürer. */
    if (
      birincilHata instanceof AiKotaHatasi &&
      providerName(env) === 'workers-ai' &&
      providerName(yedek) === 'workers-ai'
    ) throw birincilHata;
    // Birincil sağlayıcı düştü (kota, kesinti, model kaldırılması...).
    // Sessizce yutmuyoruz: hangi sağlayıcının yanıtladığı çağrıya döner ve
    // arayüzde gösterilir.
    console.log(
      JSON.stringify({
        ev: 'ai_fallback',
        from: providerName(env),
        to: providerName(yedek),
        // §86 KVKK: mesaj metni değil, içeriksiz özet.
        neden: hataOzeti(birincilHata),
      })
    );
    const r = await callOne(yedek, prompt, opts, sema, { kalan: YEDEK_CAGRI_TAVANI }, kanca);
    return { ...r, usedProvider: providerName(yedek), usedModel: modelName(yedek), fellBack: true, source: kaynakEtiketi(yedek) };
  }
}

type CagriHakki = { kalan: number };

/**
 * §86 — TEK gerçek model çağrısı (+ hız sınırında, hak kaldıysa TEK tekrar).
 * Her gerçek çağrı `hak.kalan`'dan düşer ve önce `kanca.cagriOncesi` çalışır.
 *  - 'kota' → hak iade edilir (`kotaIade`), AiKotaHatasi (yeniden deneme yok).
 *  - 'hiz'  → hak kaldıysa kısa bekleme + aynı model/istem/parametrelerle
 *             1 tekrar; yoksa hata yükselir (callModelJson yedeğe geçer).
 *  - diğer  → hata olduğu gibi yükselir (§51b: boşa tekrar yok).
 */
async function callModelHizKorumali(
  env: AiEnv, prompt: string, opts: CallOptions, hak: CagriHakki, kanca?: CagriKancasi
): Promise<string | object> {
  for (let tekrar = 0; ; tekrar++) {
    if (kanca?.cagriOncesi) await kanca.cagriOncesi();  // AiGunlukSinirHatasi fırlatabilir
    hak.kalan--;
    try {
      return await callModel(env, prompt, opts);
    } catch (e) {
      const tur = aiHatasiniSinifla(e);
      const mesaj = e instanceof Error ? e.message : String(e);
      if (tur === 'kota') {
        // Kota bitmişken model iş yapmadı: günlük adres hakkı geri verilir.
        if (kanca?.kotaIade) await kanca.kotaIade();
        throw e instanceof AiKotaHatasi ? e : new AiKotaHatasi(mesaj);
      }
      if (tur === 'hiz' && tekrar === 0 && hak.kalan > 0) {
        const ms = hizBeklemeMs(env);
        console.log(JSON.stringify({ ev: 'ai_hiz_tekrar', provider: providerName(env), model: modelName(env), beklemeMs: ms, hata: hataOzeti(e) }));
        await bekle(ms);
        continue;
      }
      throw e instanceof Error ? e : new Error(mesaj);
    }
  }
}

/**
 * Yanıt kesildiğinde ikinci denemede çıkılabilecek EN YÜKSEK token bütçesi.
 * Beceri temelli soru gövdeleri uzadığı için 4000 yetersiz kaldı
 * (bkz. src/routes/ai.ts token bütçesi notu).
 */
const KESILME_TOKEN_TAVANI = 8000;

async function callOne(
  env: AiEnv,
  prompt: string,
  opts: CallOptions,
  sema: JsonSema | undefined,
  hak: CagriHakki,
  kanca?: CagriKancasi
): Promise<{ data: unknown; attempts: number; approxPromptChars: number }> {
  let lastErr: unknown;
  // §86: deneme sayısı ayrıca çağrı hakkıyla sınırlı (hız tekrarı hak yer).
  for (let attempt = 1; attempt <= 2 && hak.kalan > 0; attempt++) {
    /* §86 — ONARIM DENEMESİ: İKİ AYRI YOL, İKİSİ DE TEK DENEME.
       (a) Yanıt JSON olarak AYRIŞMADIYSA eski davranış aynen sürer: ikinci
           denemede mevcut "gecerli JSON degildi" ek talimatı eklenir (§51b'den
           beri böyle; test/rota.test.ts bunu sınıyor).
       (b) JSON ayrıştı ama ŞEMAYA UYMADIYSA ikinci deneme AYNI istemle
           yapılır, ek talimat YOK. Gerekçe: (1) mevcut ek talimat "JSON
           değildi" diyor; şema hatasında yanlış bilgi verirdi; (2) yeni bir
           talimat cümlesi istem değişikliği olur ve ölçülmüş kalite sayıları
           (%77,7 vb.) o istemle ölçülmediği için geçersizleşirdi (rapor (e));
           (3) sıcaklık > 0 olduğu için aynı çağrının tekrarı farklı örnek
           üretir — onarım şansı sıfır değildir. Ne kadar işe yaradığı
           ÖLÇÜLMEDİ. */
    const semaHatasiydi = lastErr instanceof AiSemaHatasi;
    // Yanit kesildiyse ikinci denemede token butcesini iki katina cikar ve
    // modelden daha kisa yazmasini iste. Farkli saglayicilar ayni istem icin
    // farkli uzunlukta yaziyor; sabit butce birinde yetip digerinde
    // yetmeyebiliyor (Gemini yedeginde tam bu yasandi).
    const kesilmis = !semaHatasiydi && lastErr instanceof Error && /kapanm|kesil/i.test(lastErr.message);
    const p = attempt === 1 || semaHatasiydi
      ? prompt
      : prompt + (kesilmis
          ? '\n\nONEMLI: Onceki yanitin YARIDA KESILDI. Daha KISA yaz: her gerekceyi tek cumleyle sinirla. Yalnizca gecerli JSON dondur.'
          : '\n\nONEMLI: Onceki yanitin gecerli JSON degildi. SADECE gecerli JSON dondur; hicbir aciklama, baslik veya kod blogu isareti ekleme.');
    /* 🔴 BU SATIR BÜTÇEYİ KÜÇÜLTEBİLİYORDU.
       Eski hâli `Math.min(opts.maxTokens * 2, 4000)` idi. İlk denemenin
       bütçesi 4000'i aştığı anda (beceri temelli sorularda 3 soru bile
       ~2800, 6 soru ~4900 token istiyor) bu ifade bütçeyi ARTIRMIYOR,
       DÜŞÜRÜYORDU — yani "yanıt kesildi, daha çok yer ver" denemesi yanıtı
       daha da erken kesiyordu. Tavan yükseltildi ve ifade, bütçenin hiçbir
       koşulda ilk denemenin altına inemeyeceği biçimde yazıldı. */
    const buOpts = kesilmis
      ? {
          maxTokens: Math.max(opts.maxTokens, Math.min(opts.maxTokens * 2, KESILME_TOKEN_TAVANI)),
          temperature: opts.temperature,
        }
      : opts;
    /* §51b — İKİ DEĞİŞİKLİK.
       (1) Her deneme Workers Logs'a yazılır, başarısız olan da (`ok:false`).
           Eskiden yalnızca başarılı deneme yazılıyordu; JSON'u ayrıştırılamayan
           ilk deneme de token harcadığı hâlde kayıtta görünmüyordu (agents.md
           §4 maliyet görünürlüğü).
       (2) Yeniden deneme YALNIZCA yanıt geldi ama JSON ayrıştırılamadıysa
           yapılır. Model çağrısının kendisi düştüyse (kota, 429, kesinti, model
           kaldırıldı) aynı sağlayıcıyı ikinci kez denemek aynı hatayı verir ve
           boşa çağrı harcar; hata hemen yükselir ve callModelJson YEDEĞE geçer
           (README §3.1'deki "birincil bozuk, yine 200" davranışı korunur —
           test/rota.test.ts). */
    const baslangic = Date.now();
    let yanitUzunlugu: number | null = null;  // §86: içerik değil, yalnız uzunluk
    const kayit = (ok: boolean, asama?: 'model' | 'ayristirma' | 'sema', hata?: unknown) =>
      console.log(
        JSON.stringify({
          ev: 'ai_call',
          provider: providerName(env),
          model: modelName(env),
          approxPromptChars: p.length,
          maxTokens: buOpts.maxTokens,
          attempt,
          ok,
          sureMs: Date.now() - baslangic,
          ...(yanitUzunlugu !== null ? { yanitUzunlugu } : {}),
          // §86 KVKK: hata METNİ yazılmaz (model çıktısı/gövde taşıyabilir).
          ...(ok ? {} : { asama, hata: hataOzeti(hata) }),
        })
      );
    let raw: string | object;
    try {
      raw = await callModelHizKorumali(env, p, buOpts, hak, kanca);
    } catch (e) {
      // Günlük sınır reddinde model çağrılmadı; "model hatası" diye kaydedilmez.
      if (!(e instanceof AiGunlukSinirHatasi)) kayit(false, 'model', e);
      throw e instanceof Error ? e : new Error(String(e));
    }
    try {
      yanitUzunlugu = typeof raw === 'string' ? raw.length : JSON.stringify(raw)?.length ?? 0;
    } catch { yanitUzunlugu = null; }
    let data: unknown;
    try {
      data = extractJson(raw);
    } catch (e) {
      kayit(false, 'ayristirma', e);
      lastErr = e;
      continue;
    }
    if (sema) {
      const s = sema.safeParse(data);
      if (!s.success) {
        /* §86 KVKK: zod mesajları "received '…'" ile modelin değerini
           taşıyabilir; özet yalnız sorun SAYISINI ve kodlarını içerir. */
        const sorunlar = (s.error?.issues ?? []) as Array<{ code?: string }>;
        const ozet = `${sorunlar.length} sorun (${[...new Set(sorunlar.map((i) => String(i.code || '?')))].slice(0, 3).join(', ')})`;
        const e = new AiSemaHatasi(ozet || 'şema doğrulaması başarısız');
        kayit(false, 'sema', e);
        lastErr = e;
        continue;
      }
    }
    kayit(true);
    return { data, attempts: attempt, approxPromptChars: p.length };
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
