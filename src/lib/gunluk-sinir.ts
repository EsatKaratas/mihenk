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

// ============================================================================
// §129 (W10) — ADRES BAŞINA GÜNLÜK NEURON PAYI (fikir3-E Y2)
//
// NEDEN: Çağrı SAYISI sınırı (60) Neuron'u bilmez. Pahalı bir üretim isteği
// (6.000 karakter kaynak + 8 soru, max_tokens 5.600) ≈1.250 Neuron rezerv
// ister; tek adres 7–8 istekle hesabın 9.000'lik eşiğini 1–2 dakikada
// doldurup o günü herkes için "YAPAY ZEKÂ KAPALI" yapabiliyordu.
// YÖNTEM: hesap bütçesiyle (§93, neuron-butce.ts) AYNI rezerv → kapat düzeni,
// ama adres başına: çağrıdan önce üst sınır rezerve edilir, sonra gerçek
// (Workers AI usage'ından; §97'de Cloudflare sayacıyla birebir ölçüldü)
// yazılır. Kayıt adresin KENDİ sayaç nesnesinde (`idFromName(adres)`), ayrı
// anahtar 'n' altında; çağrı sayacına dokunulmaz.
// PAY: varsayılan 4.500 Neuron = 9.000 eşiğin YARISI. Tek adres havuzun
// yarısından fazlasını alamaz; geri kalanı başka okullara kalır. Meşru üst
// uç: bir sınıfın 40 açık uçlu değerlendirmesi ≈ 40 × 98 ≈ 3.900 Neuron
// (§97 ölçümü) — sığar. Okul NAT'ı arkasında birden çok öğretmen aynı adresi
// paylaşıyorsa `AI_IP_NEURON_PAYI` ile artırılır (kod değişmez).
// DÜRÜST SINIR: birden çok adresi (ya da /64) olan biri yine havuzu
// bitirebilir; bu sınır TEK adresin bitirmesini kapatır.
// ============================================================================
export const ADRES_NEURON_PAYI_VARSAYILAN = 4_500;

/** Pay `AI_IP_NEURON_PAYI`'ndan (1–10.000); geçersizse 4.500. */
export function adresNeuronPayi(env: { AI_IP_NEURON_PAYI?: string }): number {
  const n = Math.floor(Number(env.AI_IP_NEURON_PAYI));
  return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : ADRES_NEURON_PAYI_VARSAYILAN;
}

export type NeuronKaydi = { gun: string; harcanan: number; rezerv: number };
const nBos = (gun: string): NeuronKaydi => ({ gun, harcanan: 0, rezerv: 0 });
const nBuGun = (k: NeuronKaydi | undefined, gun: string): NeuronKaydi => (k && k.gun === gun ? { ...k } : nBos(gun));

/** Saf rezerv adımı: harcanan + rezerv + miktar paya sığarsa rezerv eklenir. */
export function adresRezervAdimi(k: NeuronKaydi | undefined, gun: string, miktar: number, pay: number): { kayit: NeuronKaydi; izin: boolean } {
  const kayit = nBuGun(k, gun);
  const m = Math.max(0, miktar);
  if (kayit.harcanan + kayit.rezerv + m > pay) return { kayit, izin: false };
  kayit.rezerv += m;
  return { kayit, izin: true };
}

/** Saf kapatma adımı: rezerv düşülür (0'ın altına inmez), gerçek eklenir. */
export function adresKapatAdimi(k: NeuronKaydi | undefined, gun: string, rezerv: number, gercek: number): NeuronKaydi {
  const kayit = nBuGun(k, gun);
  kayit.rezerv = Math.max(0, kayit.rezerv - Math.max(0, rezerv));
  kayit.harcanan += Math.max(0, gercek);
  return kayit;
}

const nBellek = new Map<string, NeuronKaydi>();
export function adresNeuronBelleginiSifirla(): void { nBellek.clear(); }

export type AdresPayEnv = GunlukSinirEnv & { AI_IP_NEURON_PAYI?: string };
export type AdresRezervSonucu = { izin: boolean; harcanan: number; rezerv: number; pay: number };

/** Adresin payından rezerv dener. izin=false → model ÇAĞRILMAZ. */
export async function adresRezerv(env: AdresPayEnv, adres: string, miktar: number, now: number = Date.now()): Promise<AdresRezervSonucu> {
  const pay = adresNeuronPayi(env);
  const gun = utcGun(now);
  if (env.GUNLUK_SAYAC) {
    try {
      const stub = env.GUNLUK_SAYAC.get(env.GUNLUK_SAYAC.idFromName(adres));
      const r = await stub.fetch(`https://gunluk-sayac/nrezerv?gun=${gun}&pay=${pay}&miktar=${Math.max(0, Math.ceil(miktar))}`);
      const j = (await r.json()) as { izin: boolean; kayit: NeuronKaydi };
      return { izin: !!j.izin, harcanan: j.kayit?.harcanan ?? 0, rezerv: j.kayit?.rezerv ?? 0, pay };
    } catch (e) {
      console.error(JSON.stringify({ ev: 'gunluk_sinir_do_hata', islem: 'nrezerv', hataSinifi: e instanceof Error ? e.name : typeof e }));
    }
  }
  if (nBellek.size > BELLEK_TAVANI) nBellek.clear();
  const { kayit, izin } = adresRezervAdimi(nBellek.get(adres), gun, Math.ceil(miktar), pay);
  nBellek.set(adres, kayit);
  return { izin, harcanan: kayit.harcanan, rezerv: kayit.rezerv, pay };
}

/** Adres rezervini kapatır (gercek = 0 → iade). Hata yutulur ve loglanır. */
export async function adresKapat(env: AdresPayEnv, adres: string, rezerv: number, gercek: number, now: number = Date.now()): Promise<void> {
  const gun = utcGun(now);
  if (env.GUNLUK_SAYAC) {
    try {
      const stub = env.GUNLUK_SAYAC.get(env.GUNLUK_SAYAC.idFromName(adres));
      await stub.fetch(`https://gunluk-sayac/nkapat?gun=${gun}&rezerv=${Math.max(0, Math.ceil(rezerv))}&gercek=${Math.max(0, Math.ceil(gercek))}`);
      return;
    } catch (e) {
      console.error(JSON.stringify({ ev: 'gunluk_sinir_do_hata', islem: 'nkapat', hataSinifi: e instanceof Error ? e.name : typeof e }));
    }
  }
  nBellek.set(adres, adresKapatAdimi(nBellek.get(adres), gun, Math.ceil(rezerv), Math.ceil(gercek)));
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
    /* §129: Neuron payı — ayrı anahtar 'n'. get→put arasında await yok
       (yalnız storage); DO giriş kapısı sırayı korur. */
    if (u.pathname === '/nrezerv' || u.pathname === '/nkapat') {
      const gunN = u.searchParams.get('gun') || utcGun();
      const sayi = (ad: string) => Math.max(0, Number(u.searchParams.get(ad)) || 0);
      const onceki = await this.state.storage.get<NeuronKaydi>('n');
      if (u.pathname === '/nkapat') {
        const kayit = adresKapatAdimi(onceki, gunN, sayi('rezerv'), sayi('gercek'));
        await this.state.storage.put('n', kayit);
        return Response.json({ kayit });
      }
      const pay = Math.max(1, Math.floor(sayi('pay')) || ADRES_NEURON_PAYI_VARSAYILAN);
      const { kayit, izin } = adresRezervAdimi(onceki, gunN, sayi('miktar'), pay);
      if (izin || !onceki || onceki.gun !== gunN) await this.state.storage.put('n', kayit);
      return Response.json({ izin, kayit });
    }
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
