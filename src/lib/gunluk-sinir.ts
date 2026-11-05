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
// bekliyor. /api/ai/status hangi modda olunduğunu `gunlukSinir.mod` ile söyler.
//
// ⚠ BELLEK MODUNDA SINIR GEVŞEKTİR (bağlama yokken — BUGÜNKÜ DURUM):
//  - Her Workers isolate'i KENDİ sayacını tutar. Aynı adresin istekleri farklı
//    isolate'lere (farklı veri merkezlerine ya da aynı merkezde birden çok
//    isolate'e) düşebilir; GERÇEK sınır yazılı değerin BİRKAÇ KATI olabilir.
//  - Isolate yenilenince (deploy, boşta kalma, bellek baskısı) sayaç SIFIRLANIR.
//  - Yani bellek modu kötü niyete karşı garanti DEĞİLDİR; yalnız tek isolate
//    içindeki döngüyü keser. Bu gevşeklik GUNLUK_SAYAC (Durable Object)
//    bağlaması açılınca kalkar: sayaç adres başına tek nesnede, güçlü tutarlı.
//
// SAYILAN ŞEY: istek değil, GERÇEK MODEL ÇAĞRISI (onarım, hız tekrarı, yedek
// çağrısı da birer hak). 3036 dönen çağrının hakkı iade edilir.
//
// GÜN: UTC günü. Workers AI kotası da 00:00 UTC'de (03:00 TR) sıfırlanır;
// iki sayaç aynı anda yenilenir.
// ============================================================================

export const GUNLUK_SINIR_VARSAYILAN = 60;

/**
 * Sınır değeri `AI_GUNLUK_IP_SINIRI` ortam değişkeninden; geçersizse 60.
 * Birim: GERÇEK MODEL ÇAĞRISI / UTC günü / adres.
 *
 * 60 NEDEN (gerekçeli TAHMİN, trafik ölçümü yok): artık onarım ve yedek
 * çağrıları da hak yediği için istek sayısından biraz yüksek tutuldu. Karma
 * bir öğretmen günü: bir sınıfın ~30 açık uçlu puanlaması + ~%10 onarım + 5
 * üretim + 10 çözüm ≈ 50 çağrı. Saha ölçümleriyle (rapor (c): puanlama ≈110,
 * üretim ≈400, çözme ≈60 Neuron) bu gün ≈ 30×110+3×110+5×400+10×60 ≈ 6.200
 * Neuron eder. Yalnız puanlama yapan bir adres 60 çağrıda ≈6.600 Neuron
 * (%66) harcar. DÜRÜST SINIR: yalnız üretim yapan ya da en kötü durumda
 * çağıran bir adres 60 çağrıyla günlük havuzu AŞABİLİR (en kötü durum hesabı
 * PROGRESS §86'da); bu sınır tek adresin havuzu bitirmesini garanti
 * engellemez, kaba döngüyü ve puanlama ağırlıklı aşırı kullanımı keser.
 * Okul ağları tek NAT adresinden çıkabilir; değer ortam değişkeniyle
 * değiştirilir (kod değişmez).
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
      console.error(JSON.stringify({ ev: 'gunluk_sinir_do_hata', islem: 'kullan', hataSinifi: e instanceof Error ? e.name : typeof e }));
    }
  }
  return bellekteKullan(ip, limit, now);
}

/** Saf iade adımı: aynı gündeyse ve sayı > 0 ise bir azaltır. */
export function iadeAdimi(k: Kayit | undefined, gun: string): Kayit | undefined {
  if (!k || k.gun !== gun || k.sayi <= 0) return k;
  return { gun, sayi: k.sayi - 1 };
}

/**
 * Model çağrısı 3036 (kota bitti) ile döndüyse hakkı geri verir: kota
 * bitmişken dönen 503 adresin günlük hakkını yemez. Hata yutulur ve loglanır
 * (iade başarısızlığı en kötü durumda bir hak kaybettirir).
 */
export async function gunlukHakIade(env: GunlukSinirEnv, ip: string, now: number = Date.now()): Promise<void> {
  const gun = utcGun(now);
  if (env.GUNLUK_SAYAC) {
    try {
      const stub = env.GUNLUK_SAYAC.get(env.GUNLUK_SAYAC.idFromName(ip));
      await stub.fetch(`https://gunluk-sayac/iade?gun=${gun}`);
      return;
    } catch (e) {
      console.error(JSON.stringify({ ev: 'gunluk_sinir_do_hata', islem: 'iade', hataSinifi: e instanceof Error ? e.name : typeof e }));
    }
  }
  const k = iadeAdimi(bellek.get(ip), gun);
  if (k) bellek.set(ip, k);
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
    if (u.pathname === '/iade') {
      const gunI = u.searchParams.get('gun') || utcGun();
      const k = iadeAdimi(await this.state.storage.get<Kayit>('k'), gunI);
      if (k) await this.state.storage.put('k', k);
      return Response.json({ sayi: k?.sayi ?? 0 });
    }
    const limit = Math.max(1, Math.floor(Number(u.searchParams.get('limit')) || GUNLUK_SINIR_VARSAYILAN));
    const gun = u.searchParams.get('gun') || utcGun();
    const onceki = await this.state.storage.get<Kayit>('k');
    const { kayit, izin } = sayacAdimi(onceki, gun, limit);
    if (izin || !onceki || onceki.gun !== gun) await this.state.storage.put('k', kayit);
    return Response.json({ izin, sayi: kayit.sayi });
  }
}
