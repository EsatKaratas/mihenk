// ============================================================================
// T3 Vakfı Creathon — Problem 2
// Saf yardımcılar: hız sınırı, kaynak metin tespiti, sayısal kırpma.
//
// NEDEN AYRI DOSYA: Bu fonksiyonlar `src/routes/ai.ts` içinde tanımlıydı ve
// dışa açılmadıkları için test edilemiyorlardı. `agents.md` §6 birim testi
// zorunlu tutuyor; testin varlığı ancak fonksiyon dışa açıksa mümkündür.
// Hiçbiri Cloudflare çalışma zamanına bağlı değildir — düz Node altında da
// koşar, dolayısıyla vitest ile doğrudan test edilebilir.
// ============================================================================

/** agents.md §7.4: soru üretimi için dakikada 5 istek. */
export const RATE_LIMIT_PER_MIN = 5;

/**
 * Değerlendirme ucu için dakika limiti. Bir sınıfın tamamı değerlendirilirken
 * onlarca MEŞRU çağrı olur (40 kişilik sınıf); buraya 5 koymak gerçek
 * kullanımı bozardı. Amaç kazara sonsuz döngüyü ve kötü niyetli kota
 * tüketimini kesmek, öğretmeni engellemek değil.
 */
export const RATE_LIMIT_EVAL_PER_MIN = 45;

/**
 * Dakika penceresinde istek sayan basit sayaç.
 *
 * BİLİNEN SINIR (PROGRESS.md §9): Sayaç bellek içidir ve Cloudflare
 * Workers'da her isolate için ayrıdır; dağıtık bir garanti değildir.
 * `agents.md` §7.4 buna açıkça izin veriyor ("basit bellek-içi ya da D1
 * tabanlı sayaç yeterlidir"). Üretimde D1/KV'ye taşınmalıdır.
 *
 * Sayaç dışarıdan verilir ki test edilebilir olsun ve isolate ömrüne
 * bağımlılık gizli kalmasın.
 */
export function rateLimited(
  hits: Map<string, number[]>,
  key: string,
  limit: number = RATE_LIMIT_PER_MIN,
  now: number = Date.now()
): boolean {
  const win = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (win.length >= limit) {
    hits.set(key, win);
    return true;
  }
  win.push(now);
  hits.set(key, win);
  return false;
}

/**
 * Uzun metinlerden kısa, kararlı bir anahtar üretir (hız sınırı anahtarı).
 * Kriptografik değildir; yalnızca aynı girdinin aynı anahtarı vermesi
 * yeterlidir.
 */
export function anahtarla(s: string): string {
  let h = 0;
  const t = String(s || '').slice(0, 300);
  for (let i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

/** 0,5'in katına yuvarlar (rubrik puanları yarım puan adımlıdır). */
export const round05 = (n: number) => Math.round(n * 2) / 2;

/** Sayıyı verilen aralığa kırpar. */
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Soru gövdesi kaynak metne atıf yapıyor mu?
 *
 * Model `needsSource` alanını unutabilir ya da yanlış işaretleyebilir; bu
 * deterministik kontrol ikinci güvencedir. YANLIŞ NEGATİF kabul edilemez:
 * metne atıf yapan bir soru metinsiz sorulursa öğrenci cevaplanamaz bir
 * soruyla karşılaşır. Bu yüzden kalıp yakalanırsa `needsSource` ZORLA true
 * yapılır; tersi (true'yu false'a çevirmek) asla yapılmaz.
 */
export const KAYNAK_ATIF = new RegExp(
  [
    'metne g[öo]re', 'metinde', 'metnin', 'metni oku',
    'par[çc]aya g[öo]re', 'par[çc]ada', 'par[çc]an[ıi]n',
    'yukar[ıi]daki', 'a[şs]a[ğg][ıi]daki metin', 'verilen metin',
    '[şs]iirde', '[şs]iirin', 'dizelerde', 'okudu[ğg]unuz',
    'bu metne', 'bu par[çc]a',
  ].join('|'),
  'i'
);

export const kaynakGerektirirMi = (body: string, modelKarari: boolean) =>
  modelKarari || KAYNAK_ATIF.test(String(body || ''));
