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

/**
 * Model çıktısında Türkçe olmayan alfabe var mı?
 *
 * ÖLÇÜLEN SORUN (26 Ağustos): `llama-3.3-70b` Türkçe üretirken araya Kiril
 * harfi karıştırdı — üretilen açık uçlu soru şöyleydi:
 *
 *   "Sait Faik'in Türk öykücülüğüne katkılarını açıklaйте."
 *                                              ^^^ Kiril
 *
 * Ölçülen sıklık: 10 sorunun 1'i (~%10). Sistematik değil ama jüri demosunda
 * göze alınacak bir oran değil; öğrenciye bozuk metinli soru gitmemeli.
 *
 * NEDEN OTOMATİK DÜZELTMİYORUZ: Kiril→Latin çevirisi tahmine dayanır ve
 * anlamı bozabilir. `agents.md` §1 gereği karar zaten insanda: İçerik Uzmanı
 * her soruyu onaylıyor. Doğru davranış, sorunu GİZLEMEK ya da tahminle
 * düzeltmek değil, insana GÖSTERMEKTİR (§6.3-5 sessiz düşüş yasağı).
 *
 * Kapsam: Kiril, Yunan, Arap, İbrani, CJK ve Hangul blokları. Türkçenin
 * kendi harfleri (çğıöşü) ve noktalama kapsam dışıdır.
 */
export const YABANCI_ALFABE =
  /[\u0400-\u04FF\u0370-\u03FF\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;

/** Metinde Türkçe dışı alfabe geçiyorsa true. */
export const yabanciAlfabeVarMi = (s: string): boolean => YABANCI_ALFABE.test(String(s || ''));

/**
 * Bir sorunun görünen tüm metinlerini tarar (gövde + şıklar + gerekçeler).
 * Herhangi birinde yabancı alfabe varsa true döner.
 */
export function soruDilUyarisi(q: {
  body?: string;
  options?: Array<{ text?: string }>;
  distractorRationale?: Record<string, string>;
}): boolean {
  if (yabanciAlfabeVarMi(q.body || '')) return true;
  if ((q.options || []).some((o) => yabanciAlfabeVarMi(o?.text || ''))) return true;
  return Object.values(q.distractorRationale || {}).some((v) => yabanciAlfabeVarMi(v));
}

/* ===========================================================================
   ŞIK SIRASI — yeniden etiketleme ve karıştırma (§32, Burak Modül 4)
   ===========================================================================
   NEDEN: Model ardışık üretimlerde doğru şıkkı sistematik olarak aynı harfe
   (gözlemlenen: B) yerleştirme eğiliminde olabiliyor. Öğrenci "şüphede
   kalırsan B'yi işaretle" gibi bir strateji geliştirirse ölçüm geçerliliğini
   kaybeder. Bu yüzden şıklar üretimden SONRA, istemciye gönderilmeden ÖNCE
   sunucuda karıştırılır.

   DEĞİŞMEZ KURAL: harf etiketleri (A,B,C,...) HER ZAMAN konuma göre atanır;
   içerik hareket eder. Doğru cevap ve çeldirici gerekçeleri, taşınan şıkkın
   HARFİNİ değil İÇERİĞİNİ takip eder — yoksa "B şıkkını seçen öğrenci..."
   gerekçesi artık B'de olmayan bir metne bağlı kalırdı.

   Bu iki fonksiyon saftır (girdiyi mutasyona uğratmaz) ve `shuffleOptions`
   `remapOptionsByOrder` üzerine kuruludur — sıralama mantığı tek yerde. */

const SIK_HARFLERI = 'ABCDE'.split('');

type SikSonucu = {
  options: { key: string; text: string }[];
  correctKey: string;
  distractorRationale: Record<string, string>;
};

/**
 * `order[k]` = yeni k. konuma yerleşecek ESKİ dizin.
 * Gerekçe anahtarları önce şıkkın kendi `key` değeriyle, bulunamazsa konum
 * harfiyle aranır (model bazen ikisini karıştırıyor). Yeni doğru şıkka
 * denk gelen gerekçe düşürülür — gerekçe yalnızca ÇELDİRİCİLER içindir.
 */
export function remapOptionsByOrder<T extends { key: string; text: string }>(
  options: T[],
  correctKey: string,
  distractorRationale: Record<string, string> | undefined,
  order: number[]
): SikSonucu {
  const oldKeys = options.map((o) => String(o.key).trim().toUpperCase());
  const correctOldIdx = Math.max(0, oldKeys.indexOf(String(correctKey || '').trim().toUpperCase()));
  const newOptions = order.map((origIdx, k) => ({
    key: SIK_HARFLERI[k],
    text: String(options[origIdx].text),
  }));
  const newCorrectIdx = order.indexOf(correctOldIdx);
  const newCorrectKey = SIK_HARFLERI[newCorrectIdx >= 0 ? newCorrectIdx : 0];
  const newRationale: Record<string, string> = {};
  order.forEach((origIdx, k) => {
    if (k === newCorrectIdx) return;
    const ok = oldKeys[origIdx];
    const val = distractorRationale?.[ok] ?? distractorRationale?.[SIK_HARFLERI[origIdx]];
    if (val) newRationale[SIK_HARFLERI[k]] = String(val);
  });
  return { options: newOptions, correctKey: newCorrectKey, distractorRationale: newRationale };
}

/**
 * Fisher-Yates ile şıkları karıştırır ve `remapOptionsByOrder` ile harf /
 * doğru cevap / gerekçeleri yeniden hizalar. `rng` testte belirlenimci bir
 * üreteçle değiştirilebilir.
 */
export function shuffleOptions<T extends { key: string; text: string }>(
  options: T[],
  correctKey: string,
  distractorRationale: Record<string, string> | undefined,
  rng: () => number = Math.random
): SikSonucu {
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return remapOptionsByOrder(options, correctKey, distractorRationale, order);
}
