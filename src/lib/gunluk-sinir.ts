// ============================================================================
// §86 — İSTEMCİ ADRESİ (IP) BAŞINA GÜNLÜK YAPAY ZEKÂ ÇAĞRI SINIRI
//
// NEDEN: Kimlik doğrulama yok; tek bir sekme (ya da bozuk bir döngü) Workers
// AI'ın günlük 10.000 Neuron'unu tüketip o günü herkes için bitirebilir.
// Dakikalık sınırlar (guards.ts) döngüyü keser ama gün boyu yayılmış
// tüketimi kesmez.
//
// YÖNTEM SEÇİMİ (5 Kasım 2026, belgelerle tartıldı — PROGRESS §86):
//  - Workers Rate Limiting binding: pencere yalnız 10 ya da 60 sn; GÜNLÜK
//    sınır kurulamaz. Elendi.
//  - KV: ücretsiz planda 1.000 yazma/gün ve sonradan tutarlı (≈60 sn); sayaç
//    yarışlı olur, yazma tavanı da sayacın kendisini kilitler. Elendi.
//  - Durable Objects (SQLite arka uçlu): ücretsiz planda kullanılabilir,
//    güçlü tutarlı, tek nesne içi istekler sıralı. SEÇİLDİ.
// DO bir Cloudflare KAYNAĞIDIR (deploy sırasında migration ile oluşur). Bu
// dalda OLUŞTURULMADI; bağlama satırı wrangler.demo.jsonc'ta YORUM olarak
// bekliyor. Bağlama yokken sayaç BELLEK İÇİ çalışır (isolate başına, dağıtık
// garanti değil) ve /api/ai/status bunu `gunlukSinir.mod: "bellek"` diye
// açıkça söyler — sessiz değil.
//
// GÜN: UTC günü. Workers AI kotası da 00:00 UTC'de (03:00 TR) sıfırlanır;
// iki sayaç aynı anda yenilenir.
// ============================================================================

export const GUNLUK_SINIR_VARSAYILAN = 40;

/**
 * Sınır değeri `AI_GUNLUK_IP_SINIRI` ortam değişkeninden; geçersizse 40.
 *
 * 40 NEDEN (gerekçeli TAHMİN, trafik ölçümü yok): rapor (c)'deki saha
 * ölçümleriyle puanlama ≈110, üretim ≈400, çözme ≈60 Neuron. Karma bir
 * öğretmen günü (bir sınıfın ~30 açık uçlu puanlaması + birkaç üretim/çözüm)
 * 40 çağrıya sığar; 40 çağrının ortalama ~150 Neuron'la tutarı ≈6.000 Neuron,
 * yani tek adres günlük havuzun yaklaşık %60'ını tüketebilir, TAMAMINI değil.
 * Okul ağları tek NAT adresinden çıkabilir; o durumda değer ortam
 * değişkeniyle yükseltilir (kod değişmez).
 */
export function gunlukSinirDegeri(env: { AI_GUNLUK_IP_SINIRI?: string }): number {
  const n = Math.floor(Number(env.AI_GUNLUK_IP_SINIRI));
  return Number.isFinite(n) && n >= 1 && n <= 100_000 ? n : GUNLUK_SINIR_VARSAYILAN;
}

export function utcGun(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export type GunlukSonuc = { izin: boolean; sayi: number; limit: number; mod: 'durable-object' | 'bellek' };

type Kayit = { gun: string; sayi: number };

/** Saf sayaç adımı: gün değiştiyse sıfırlar; izin varsa artırır. */
export function sayacAdimi(k: Kayit | undefined, gun: string, limit: number): { kayit: Kayit; izin: boolean } {
  const kayit: Kayit = k && k.gun === gun ? { ...k } : { gun, sayi: 0 };
  if (kayit.sayi >= limit) return { kayit, izin: false };
  kayit.sayi++;
  return { kayit, izin: true };
}

// --- Bellek içi yedek sayaç (binding yokken) --------------------------------
const bellek = new Map<string, Kayit>();
const BELLEK_TAVANI = 20_000;

export function bellekSayaciniSifirla(): void {
  bellek.clear();
}

function bellekteKullan(ip: string, limit: number, now: number): GunlukSonuc {
  const gun = utcGun(now);
  if (bellek.size > BELLEK_TAVANI) {
    for (const [k, v] of bellek) if (v.gun !== gun) bellek.delete(k);
    if (bellek.size > BELLEK_TAVANI) bellek.clear();
  }
  const { kayit, izin } = sayacAdimi(bellek.get(ip), gun, limit);
  bellek.set(ip, kayit);
  return { izin, sayi: kayit.sayi, limit, mod: 'bellek' };
}

export type GunlukSinirEnv = {
  AI_GUNLUK_IP_SINIRI?: string;
  GUNLUK_SAYAC?: DurableObjectNamespace;
};

/**
 * Bir model çağrısı hakkı kullanır. Bağlama varsa Durable Object, yoksa
 * bellek. DO çağrısı hata verirse bellek sayacına düşer ve bunu Workers
 * Logs'a yazar (`ev: "gunluk_sinir_do_hata"`): sayaç arızası öğretmenin işini
 * durdurmaz, ama arıza görünür kalır.
 */
export async function gunlukHakKullan(env: GunlukSinirEnv, ip: string, now: number = Date.now()): Promise<GunlukSonuc> {
  const limit = gunlukSinirDegeri(env);
  if (env.GUNLUK_SAYAC) {
    try {
      const stub = env.GUNLUK_SAYAC.get(env.GUNLUK_SAYAC.idFromName(ip));
      const r = await stub.fetch(`https://gunluk-sayac/kullan?limit=${limit}&gun=${utcGun(now)}`);
      const j = (await r.json()) as { izin: boolean; sayi: number };
      return { izin: !!j.izin, sayi: Number(j.sayi) || 0, limit, mod: 'durable-object' };
    } catch (e) {
      console.error(JSON.stringify({ ev: 'gunluk_sinir_do_hata', hata: (e instanceof Error ? e.message : String(e)).slice(0, 200) }));
    }
  }
  return bellekteKullan(ip, limit, now);
}

export function gunlukSinirModu(env: GunlukSinirEnv): 'durable-object' | 'bellek' {
  return env.GUNLUK_SAYAC ? 'durable-object' : 'bellek';
}

/**
 * Durable Object sınıfı — adres başına bir nesne (`idFromName(ip)`), içinde
 * tek kayıt { gun, sayi }. DO istekleri nesne içinde sıralı işlendiği ve
 * get→put arasında başka await olmadığı için artırma yarışsızdır (DO giriş
 * kapısı). `cloudflare:workers` içe aktarılmaz: klasik `fetch` arabirimi
 * vitest'te de yüklenebilsin diye.
 */
export class GunlukSayac {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);
    const limit = Math.max(1, Math.floor(Number(u.searchParams.get('limit')) || GUNLUK_SINIR_VARSAYILAN));
    const gun = u.searchParams.get('gun') || utcGun();
    const onceki = await this.state.storage.get<Kayit>('k');
    const { kayit, izin } = sayacAdimi(onceki, gun, limit);
    if (izin || !onceki || onceki.gun !== gun) await this.state.storage.put('k', kayit);
    return Response.json({ izin, sayi: kayit.sayi });
  }
}
