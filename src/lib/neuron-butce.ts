// ============================================================================
// §93 (W10) — HESAP DÜZEYİ GÜNLÜK NEURON BÜTÇESİ (tahmini)
//
// NEDEN: §86'daki adres başına 60 çağrı sınırı tek adresi frenler ama hesabın
// TEK günlük havuzunu (Workers AI ücretsiz: 10.000 Neuron/gün, 00:00 UTC'de
// sıfırlanır) korumaz: birkaç adres birlikte havuzu bitirebilir ve havuz
// bitince model 3036 ile herkese kapanır. Bu sayaç havuzun TAMAMINI izler ve
// tahmini tüketim eşiğe (varsayılan 9.000) gelince YENİ çağrıyı model
// çağrılmadan reddeder. Sessiz yedek YOK: ret 503 `gunluk_butce` olarak
// öğretmene açıkça gösterilir, yedek modele geçilmez (aynı havuz).
//
// TAHMİN: Neuron = giriş token × giriş katsayısı + çıkış token × çıkış
// katsayısı. Token sayıları Workers AI yanıtındaki `usage`'dan gelir.
// KATSAYI KAYNAĞI (resmi): developers.cloudflare.com/workers-ai/platform/pricing
// (sayfa 20 Ekim 2026 güncel; 6 Kasım 2026'da okundu), "Price in Neurons":
//   @cf/meta/llama-3.3-70b-instruct-fp8-fast   26.668 / 204.805 Neuron/M token
//   @cf/meta/llama-4-scout-17b-16e-instruct    24.545 /  77.273 Neuron/M token
// Bilinmeyen workers-ai modeli için TEMKİNLİ olarak en yüksek katsayı kullanılır.
// Harici sağlayıcılar (openai, anthropic) bu havuzdan yemez; sayılmaz.
//
// REZERV → KAPAT: çağrıdan ÖNCE üst sınır tahmini rezerve edilir (eşzamanlı
// isteklerin eşiği birlikte aşmasını önler); çağrıdan SONRA rezerv düşülür,
// gerçek tahmin eklenir. 3036 ve dakikalık hız hatasında model iş yapmadığı
// için rezerv iade edilir; 3036 ayrıca günü "tükendi" işaretler.
// BİLİNEN FAZLA SAYIM: diğer hatalarda (zaman aşımı dahil) ve `usage` dönmeyen
// yanıtlarda rezerv HARCANMIŞ sayılır — temkinli taraf (PROGRESS §93).
//
// DÜRÜST SINIR: yalnız bu Worker'ın çağrılarını görür; aynı hesaptan REST ile
// yapılan ölçüm koşuları görünmez. Tahmin faturalama ile birebir değildir.
// ============================================================================

import { utcGun } from './gunluk-sinir';

export const GUNLUK_HAVUZ = 10_000;
export const BUTCE_ESIGI_VARSAYILAN = 9_000;

/** Neuron / M token — kaynak dosya başındaki resmi fiyat sayfası. */
export const NEURON_KATSAYILARI: Record<string, { giris: number; cikis: number }> = {
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { giris: 26_668, cikis: 204_805 },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { giris: 24_545, cikis: 77_273 },
};
const EN_YUKSEK = { giris: 26_668, cikis: 204_805 };

export function katsayi(model: string): { giris: number; cikis: number; bilinen: boolean } {
  const k = NEURON_KATSAYILARI[model];
  return k ? { ...k, bilinen: true } : { ...EN_YUKSEK, bilinen: false };
}

export type Kullanim = { prompt_tokens?: number; completion_tokens?: number } | null | undefined;

/** Yanıttaki token kullanımından Neuron tahmini; kullanım yoksa null. */
export function neuronTahmini(model: string, u: Kullanim): number | null {
  if (!u) return null;
  const g = Number(u.prompt_tokens);
  const c = Number(u.completion_tokens);
  if (!Number.isFinite(g) && !Number.isFinite(c)) return null;
  const k = katsayi(model);
  return ((Number.isFinite(g) ? g : 0) * k.giris + (Number.isFinite(c) ? c : 0) * k.cikis) / 1e6;
}

/**
 * Çağrı öncesi üst sınır: giriş token ≈ istem karakteri / 2 (Türkçe metinde
 * gerçek oran daha düşüktür; üst sınır olsun diye bilerek cömert), çıkış =
 * max_tokens (model bundan fazla yazamaz).
 */
export function rezervTahmini(model: string, istemKarakter: number, maxTokens: number): number {
  const k = katsayi(model);
  return (Math.max(0, istemKarakter) / 2 * k.giris + Math.max(0, maxTokens) * k.cikis) / 1e6;
}

export function butceEsigi(env: { AI_GUNLUK_NEURON_ESIGI?: string }): number {
  const n = Math.floor(Number(env.AI_GUNLUK_NEURON_ESIGI));
  return Number.isFinite(n) && n >= 1 && n <= GUNLUK_HAVUZ ? n : BUTCE_ESIGI_VARSAYILAN;
}

export type ButceKaydi = { gun: string; harcanan: number; rezerv: number; tukendi: boolean };

const bos = (gun: string): ButceKaydi => ({ gun, harcanan: 0, rezerv: 0, tukendi: false });
const buGun = (k: ButceKaydi | undefined, gun: string): ButceKaydi => (k && k.gun === gun ? { ...k } : bos(gun));

/** Saf rezerv adımı: eşiğe sığarsa (ve gün tükenmediyse) rezerv eklenir. */
export function rezervAdimi(k: ButceKaydi | undefined, gun: string, miktar: number, esik: number): { kayit: ButceKaydi; izin: boolean } {
  const kayit = buGun(k, gun);
  if (kayit.tukendi || kayit.harcanan + kayit.rezerv + miktar > esik) return { kayit, izin: false };
  kayit.rezerv += miktar;
  return { kayit, izin: true };
}

/** Saf kapatma adımı: rezerv düşülür (0'ın altına inmez), gerçek eklenir. */
export function kapatAdimi(k: ButceKaydi | undefined, gun: string, rezerv: number, gercek: number, tukendi = false): ButceKaydi {
  const kayit = buGun(k, gun);
  kayit.rezerv = Math.max(0, kayit.rezerv - Math.max(0, rezerv));
  kayit.harcanan += Math.max(0, gercek);
  if (tukendi) kayit.tukendi = true;
  return kayit;
}

export type ButceDurumu = {
  gun: string; tahminiNeuron: number; harcanan: number; rezerv: number;
  esik: number; havuz: number; yuzde: number; doldu: boolean; tukendi: boolean;
  mod: 'durable-object' | 'bellek'; sifirlanmaUtc: string;
};

export function durumOlustur(k: ButceKaydi | undefined, gun: string, esik: number, mod: ButceDurumu['mod']): ButceDurumu {
  const kayit = buGun(k, gun);
  const toplam = kayit.harcanan + kayit.rezerv;
  const ertesi = new Date(gun + 'T00:00:00Z');
  ertesi.setUTCDate(ertesi.getUTCDate() + 1);
  return {
    gun,
    tahminiNeuron: Math.round(toplam),
    harcanan: Math.round(kayit.harcanan),
    rezerv: Math.round(kayit.rezerv),
    esik,
    havuz: GUNLUK_HAVUZ,
    // Yüzde 10.000'lik havuza göre (eşiğe göre DEĞİL).
    yuzde: Math.min(100, Math.round((toplam / GUNLUK_HAVUZ) * 100)),
    doldu: kayit.tukendi || toplam >= esik,
    tukendi: kayit.tukendi,
    mod,
    sifirlanmaUtc: ertesi.toISOString(),
  };
}

// --- Bellek içi yedek (bağlama yoksa ya da DO arızalıysa) -------------------
let bellek: ButceKaydi | undefined;
export function bellekButcesiniSifirla(): void { bellek = undefined; }

export type ButceEnv = { AI_GUNLUK_NEURON_ESIGI?: string; NEURON_BUTCE?: DurableObjectNamespace };

export function butceModu(env: ButceEnv): 'durable-object' | 'bellek' {
  return env.NEURON_BUTCE ? 'durable-object' : 'bellek';
}

const NESNE_ADI = 'butce';
function nesne(env: ButceEnv) {
  return env.NEURON_BUTCE!.get(env.NEURON_BUTCE!.idFromName(NESNE_ADI));
}
function doHatasi(islem: string, e: unknown) {
  console.error(JSON.stringify({ ev: 'butce_do_hata', islem, hataSinifi: e instanceof Error ? e.name : typeof e }));
}

/** Rezerv dener. izin=false → model ÇAĞRILMAZ. */
export async function butceRezerv(env: ButceEnv, miktar: number, now = Date.now()): Promise<{ izin: boolean; durum: ButceDurumu }> {
  const esik = butceEsigi(env);
  const gun = utcGun(now);
  if (env.NEURON_BUTCE) {
    try {
      const r = await nesne(env).fetch(`https://neuron-butce/rezerv?gun=${gun}&esik=${esik}&miktar=${miktar}`);
      const j = (await r.json()) as { izin: boolean; kayit: ButceKaydi };
      return { izin: !!j.izin, durum: durumOlustur(j.kayit, gun, esik, 'durable-object') };
    } catch (e) { doHatasi('rezerv', e); }
  }
  const { kayit, izin } = rezervAdimi(bellek, gun, miktar, esik);
  bellek = kayit;
  return { izin, durum: durumOlustur(kayit, gun, esik, 'bellek') };
}

/** Rezervi kapatır: gercek = tahmini harcama (iade için 0). */
export async function butceKapat(env: ButceEnv, rezerv: number, gercek: number, tukendi = false, now = Date.now()): Promise<void> {
  const gun = utcGun(now);
  if (env.NEURON_BUTCE) {
    try {
      await nesne(env).fetch(`https://neuron-butce/kapat?gun=${gun}&rezerv=${rezerv}&gercek=${gercek}&tukendi=${tukendi ? 1 : 0}`);
      return;
    } catch (e) { doHatasi('kapat', e); }
  }
  bellek = kapatAdimi(bellek, gun, rezerv, gercek, tukendi);
}

/** Salt okunur durum: DO'da yalnız okuma yapılır, YAZMA YOK. */
export async function butceDurumu(env: ButceEnv, now = Date.now()): Promise<ButceDurumu> {
  const esik = butceEsigi(env);
  const gun = utcGun(now);
  if (env.NEURON_BUTCE) {
    try {
      const r = await nesne(env).fetch(`https://neuron-butce/durum?gun=${gun}`);
      const j = (await r.json()) as { kayit?: ButceKaydi };
      return durumOlustur(j.kayit, gun, esik, 'durable-object');
    } catch (e) { doHatasi('durum', e); }
  }
  return durumOlustur(bellek, gun, esik, 'bellek');
}

/**
 * Durable Object — TEK global nesne (`idFromName("butce")`), tek kayıt.
 * Platform zaten giriş kapısıyla sıralar; ayrıca her işlem nesne içi bir
 * söz zincirinde (kuyruk) sırayla çalışır: get→put arasına başka istek
 * giremez. Böylece sıralama, giriş kapısı olmayan test ortamında da kanıtlanır.
 * Yazma: rezervde yalnız izin verildiyse ya da gün döndüyse; kapatmada 1;
 * durumda HİÇ. Çağrı başına en çok 2 yazma.
 */
export class NeuronButce {
  private kuyruk: Promise<unknown> = Promise.resolve();
  constructor(private readonly state: DurableObjectState) {}

  private sirayla<T>(is: () => Promise<T>): Promise<T> {
    const p = this.kuyruk.then(is, is);
    this.kuyruk = p.catch(() => undefined);
    return p;
  }

  async fetch(req: Request): Promise<Response> {
    const u = new URL(req.url);
    const gun = u.searchParams.get('gun') || utcGun();
    const sayi = (ad: string) => Math.max(0, Number(u.searchParams.get(ad)) || 0);
    return this.sirayla(async () => {
      const onceki = await this.state.storage.get<ButceKaydi>('b');
      if (u.pathname === '/durum') return Response.json({ kayit: onceki });
      if (u.pathname === '/kapat') {
        const kayit = kapatAdimi(onceki, gun, sayi('rezerv'), sayi('gercek'), u.searchParams.get('tukendi') === '1');
        await this.state.storage.put('b', kayit);
        return Response.json({ kayit });
      }
      if (u.pathname === '/rezerv') {
        const esik = Math.max(1, Math.floor(sayi('esik')) || BUTCE_ESIGI_VARSAYILAN);
        const { kayit, izin } = rezervAdimi(onceki, gun, sayi('miktar'), esik);
        if (izin || !onceki || onceki.gun !== gun) await this.state.storage.put('b', kayit);
        return Response.json({ izin, kayit });
      }
      return new Response('yok', { status: 404 });
    });
  }
}
