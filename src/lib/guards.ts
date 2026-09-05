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
/**
 * §42 — SAYAÇ HARİTASI SINIRSIZ BÜYÜYORDU.
 *
 * `rateLimited` her yeni anahtar için bir girdi yazıyor ama HİÇBİRİNİ
 * silmiyordu. Anahtar kullanıcı girdisinden türetiliyor (docKey, soru
 * gövdesinin hash'i, IP), yani kümesi sınırsızdır: uzun ömürlü bir isolate'te
 * harita, penceresi çoktan kapanmış on binlerce ölü girdiyle büyür.
 * Bir sızıntı, ölçülebilir bir çökme değil — ama sınırsız büyüyen bellek
 * `agents.md` §4'ün kaynak disiplinine aykırıdır.
 *
 * Penceresi dolmuş (son 60 saniyede hiç isteği olmayan) anahtarları siler ve
 * kaç tanesini attığını döner. Map'ten iterasyon sırasında silmek JS'te
 * tanımlıdır ve güvenlidir.
 */
export function budaHizSayaci(hits: Map<string, number[]>, now: number = Date.now()): number {
  let atilan = 0;
  hits.forEach((zamanlar, anahtar) => {
    if (!zamanlar.some((t) => now - t < 60_000)) {
      hits.delete(anahtar);
      atilan++;
    }
  });
  return atilan;
}

/**
 * Budamanın tetikleneceği anahtar sayısı. Her çağrıda taramak gereksiz;
 * harita bu boyutu aşınca bir kez süpürülür. Değer, gerçek bir sınıfın
 * (30-40 öğrenci × birkaç uç) çok üstünde ama belleği bağlayacak kadar
 * yüksek değil.
 */
export const HIZ_SAYACI_TAVANI = 500;

export function rateLimited(
  hits: Map<string, number[]>,
  key: string,
  limit: number = RATE_LIMIT_PER_MIN,
  now: number = Date.now()
): boolean {
  // §42: harita şişmişse önce ölü anahtarları at (yukarıdaki nota bakın).
  if (hits.size > HIZ_SAYACI_TAVANI) budaHizSayaci(hits, now);
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
 * §45 — HERHANGİ BİR MODEL METNİ İÇİN yabancı alfabe denetimi.
 *
 * 🔴 ÖLÇÜLMÜŞ EKSİK. `soruDilUyarisi()` yalnızca SORU ÜRETİMİNDE
 * çağrılıyordu; `/api/ai/evaluate` çıktısı (gerekçe, kriter açıklamaları ve
 * öğrenciye giden GERİ BİLDİRİM TASLAĞI) hiç denetlenmiyordu. Kanıt canlı
 * sistemden geldi — README için çekilen ekran görüntüsünde modelin geri
 * bildirim taslağı şöyle çıktı:
 *
 *   "Sürtünme kuvvetinin farklı durumlar下的 etkilerini düşün"
 *
 * Yani CJK karakteri, öğretmenin onayıyla ÖĞRENCİ KARNESİNE gidebilecek bir
 * metne sızmıştı. §3.3'ün kuralı burada da geçerli: otomatik düzeltme YOK
 * (tahmin anlamı bozar), ama insana GÖSTERİLİR.
 */
export function metinDilUyarisi(...metinler: Array<string | null | undefined>): boolean {
  return metinler.some((m) => yabanciAlfabeVarMi(m || ''));
}

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

/* ============================================================================
   §41 — ÜÇ ÖLÇÜLMÜŞ SORUN İÇİN SUNUCU TARAFI KORUMALAR
   ============================================================================ */

/**
 * §41 Madde 2 — GEÇERSİZ CEVAP ANAHTARI SESSİZCE "A" OLUYORDU.
 *
 * `remapOptionsByOrder` içindeki `Math.max(0, oldKeys.indexOf(...))` ifadesi,
 * model şıklarda BULUNMAYAN bir `correctKey` döndürdüğünde (-1) sessizce 0'a
 * düşüyor ve İLK ŞIKKI doğru sayıyordu. Ölçüldü: 'E', 'Z', '', 'AB', '1'
 * değerlerinin BEŞİ de uyarısız "A" oldu. Bir ölçme ürününde yanlış cevap
 * anahtarı en pahalı hatadır ve bu tam olarak §6.3-5'in yasakladığı SESSİZ
 * DÜŞÜŞTÜR.
 *
 * Otomatik tahmin YAPILMAZ (hangi şıkkın doğru olduğu bilinemez); soru
 * işaretlenir ve İçerik Uzmanı doğru şıkkı kendisi seçer — karar zaten
 * insanda (agents.md §1).
 */
export function cevapAnahtariGecerliMi(
  options: { key: string; text: string }[],
  correctKey: string | undefined
): boolean {
  const k = String(correctKey || '').trim().toUpperCase();
  if (!k) return false;
  return options.some((o) => String(o.key).trim().toUpperCase() === k);
}

/**
 * §41 Madde 4 — TEKRARLAYAN SORULAR.
 *
 * İsteme "tekrar etme" yazmak ölçülerek YETERSİZ bulundu (27 soruda 15 benzer
 * çift). Bu yüzden benzerlik SUNUCUDA denetlenir.
 *
 * Yöntem: Jaccard benzerliği (ortak jeton / birleşik jeton). Türkçe için
 * kök bulma yapılmaz — soru gövdeleri zaten aynı kalıptan üretildiği için
 * yüzeysel jeton örtüşmesi ayırt edici. Çok kısa jetonlar ve sık kullanılan
 * soru kalıbı sözcükleri elenir, yoksa "aşağıdakilerden hangisi" gibi ortak
 * kalıplar her soruyu birbirine benzetirdi.
 */
const DURDURMA = new Set([
  've', 'ile', 'bir', 'bu', 'da', 'de', 'için', 'gibi', 'daha', 'en', 'olan',
  'hangi', 'hangisi', 'aşağıdakilerden', 'aşağıdaki', 'nedir', 'nasıl', 'niçin',
  'açıklayınız', 'yazınız', 'belirtiniz', 'veriniz', 'söyleyiniz', 'ifade',
  'göre', 'olarak', 'olan', 'olur', 'eden', 'edilen', 'sonucu', 'durumu',
]);

export function jetonla(s: string): Set<string> {
  return new Set(
    String(s || '')
      .toLocaleLowerCase('tr')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !DURDURMA.has(t))
  );
}

export function benzerlik(a: string, b: string): number {
  const A = jetonla(a);
  const B = jetonla(b);
  if (!A.size || !B.size) return 0;
  let kesisim = 0;
  A.forEach((t) => { if (B.has(t)) kesisim++; });
  return kesisim / (A.size + B.size - kesisim);
}

/**
 * Bu eşiğin ÜSTÜ "aynı soru" sayılır.
 *
 * DEĞER ÖLÇÜLEREK SEÇİLDİ, tahminle değil. 11 gerçek soru çifti iki sınıfa
 * ayrıldı (elenmeli / korunmalı) ve iki ölçü karşılaştırıldı:
 *
 *   ölçü      | ELENMELİ en düşük | KORUNMALI en yüksek
 *   ----------|-------------------|--------------------
 *   Jaccard   |       0,333       |       0,250
 *   kapsama   |       0,500       |       1,000
 *
 * Kapsama (ortak/en küçük küme) ayırt ETMİYOR: "Kuvvet nedir?" sorusu
 * "Bir arabanın frenlemesinde hangi kuvvet rol oynar?" içinde tamamen
 * geçtiği için 1,000 veriyor ama iki soru özgün. Bu yüzden Jaccard kullanılır.
 *
 * Eşik, ayrımın tam ortasına (0,250 ile 0,333 arası) konuldu. İlk yazımda
 * 0,6 seçilmişti ve ÖLÇÜM bunun çok yüksek olduğunu gösterdi: anlamca aynı
 * ama yeniden yazılmış sorular 0,33-0,50 alıyor, yani hiç yakalanmıyordu —
 * kullanıcının bildirdiği "27 soruda 15 benzer çift" sorununun sebebi buydu.
 *
 * Yeniden ayarlanacaksa ölçümü tekrarlayın; sabiti tahminle değiştirmeyin.
 */
export const BENZERLIK_ESIGI = 0.3;

/* ===========================================================================
   §47 — ÇELDİRİCİ GEREKÇESİNDEKİ KALIP AÇILIŞI TEMİZLENİR
   ===========================================================================
   🔴 KULLANICI BİLDİRDİ, İKİ KEZ ÖLÇÜLDÜ. Model her çeldirici
   gerekçesine aynı açılışı yazıyordu:

     "bu şıkkı seçen öğrenci iklim ve hava olaylarını coğrafi faktörlerle
      karıştırmaktadır"
     "bu şıkkı seçen öğrenci iklim ve hava olaylarını jeolojik faktörlerle
      karıştırmaktadır"

   Kalıbın kaynağı istemin KENDİ JSON örneğiydi
   (`"distractorRationale": {"B": "bu şıkkı seçen öğrenci ... sanmaktadır"}`).
   Örnek düzeltildi ve isteme açıkça "böyle başlama" kuralı yazıldı (§47,
   kural 4a). ÖLÇÜLDÜ: hiçbir işe yaramadı — 24 gerekçenin 24'ü hâlâ aynı
   açılışla geldi (%100). Model bu kalıba fazla demirlemiş.

   Bu yüzden istemle rica etmek bırakıldı ve §3.3'ün ilkesine dönüldü:
   MODEL ÇIKTISI GÜVENİLMEZ KABUL EDİLİR, SUNUCU NORMALLEŞTİRİR. Açılış
   burada deterministik olarak kesilir — eşik yok, tahmin yok.

   NE SİLİNMEZ: yalnızca baştaki kalıp öznenin kendisi. Cümlenin geri kalanına
   dokunulmaz ve temizlik sonrası metin boş kalırsa ORİJİNAL geri verilir —
   bir gerekçeyi yok etmektense kalıplı bırakmak yeğdir.

   Arayüz zaten hangi şıkkın gerekçesi olduğunu harfle gösteriyor; cümlenin
   "bu şıkkı seçen öğrenci" diye başlamasına gerek yok, üstelik üç gerekçede
   üst üste tekrarlanınca okunurluğu düşürüyordu.                             */
const GEREKCE_KALIP_ACILIS =
  /^\s*bu\s+(?:ş[ıi]kk?[ıi]|seçene[ğg]i|cevab[ıi])\s+(?:seçen|i̇?şaretleyen|tercih\s+eden)\s+(?:ö[ğg]renci(?:ler)?)\s*[,:;-]?\s*/iu;

/** Türkçe'ye duyarlı ilk harf büyütme (i → İ). */
function ilkHarfiBuyut(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}

/**
 * Çeldirici gerekçesinden kalıp açılışı temizler. Saf fonksiyondur.
 * Açılış yoksa metin aynen döner (idempotenttir).
 */
export function gerekceyiSadelestir(metin?: string | null): string {
  const ham = String(metin || '').trim();
  if (!ham) return '';
  const kirpilmis = ham.replace(GEREKCE_KALIP_ACILIS, '').trim();
  // Güvenlik: temizlik cümleyi yok ettiyse orijinali koru.
  if (!kirpilmis) return ham;
  return ilkHarfiBuyut(kirpilmis);
}

/** Bir çeldirici gerekçesi haritasının tamamını sadeleştirir. */
export function gerekceleriSadelestir(
  harita?: Record<string, string> | null
): Record<string, string> {
  const sonuc: Record<string, string> = {};
  Object.entries(harita || {}).forEach(([k, v]) => {
    const t = gerekceyiSadelestir(v);
    if (t) sonuc[k] = t;
  });
  return sonuc;
}

/* ===========================================================================
   §46 — ŞIK KÜMESİ İMZASI: gövdesi farklı, ŞIKLARI AYNI sorular
   ===========================================================================
   🔴 KULLANICI BİLDİRDİ, EKRAN GÖRÜNTÜSÜYLE ÖLÇÜLDÜ. Tek üretimde
   şu iki soru yan yana geldi:

     1) "İklim ve hava olaylarını karşılaştırmak için hangi faktörler
         dikkate alınmalıdır?"
     3) "Hava olaylarının oluşumunda hangi faktörler önemlidir?"

   Dördü de AYNI şıklardı (yalnızca A ve B yer değişmişti — ki o yer
   değişikliğini `shuffleOptions` bizzat yapıyor) ve doğru cevap ikisinde de
   aynı metindi. Öğrenci için bu, aynı soruyu iki kez cevaplamaktır.

   §41'in tekrar denetimi bunları KAÇIRIYORDU çünkü yalnızca `body`
   karşılaştırıyordu; iki gövdenin Jaccard benzerliği eşiğin altındaydı.

   ÇÖZÜM EŞİK DEĞİL, KESİN ÖLÇÜT: şık metinleri normalleştirilip SIRALANIR ve
   birleştirilir. İki çoktan seçmeli sorunun imzası birebir aynıysa bunlar
   aynı seçenek kümesini ölçüyor demektir — tahmine gerek yok, bu yüzden
   kalibre edilecek bir sabit de yok (§41'deki 0,30 gibi).

   Sıralama ŞART: `shuffleOptions` şıkları kasten karıştırıyor, dolayısıyla
   sıraya duyarlı bir imza aynı kümeyi farklı sanardı.                       */
export function sikImzasi(options?: Array<{ text?: string } | null>): string {
  const parcalar = (options || [])
    .map((o) =>
      String((o && o.text) || '')
        .toLocaleLowerCase('tr')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')   // noktalama ve simgeler elenir
        .trim()
        .replace(/\s+/g, ' ')
    )
    .filter((t) => t.length > 0)
    .sort();
  return parcalar.length ? parcalar.join('|') : '';
}

/**
 * §41 Madde 5 — SORU SAYISI / METİN UZUNLUĞU DENGESİ.
 *
 * 389 karakterlik bir metinden 8 soru istendiğinde metinde o kadar ölçülebilir
 * ayrıntı yoktur; model aynı şeyi farklı cümleyle tekrar sorar. Kullanıcının
 * "saçma soru" şikâyetinin ölçülen asıl sebebi budur.
 *
 * Yaklaşık 180 karakterde bir soruluk özgün içerik varsayılır (cömert bir
 * tahmin; tipik bir ders notu paragrafı 150-250 karakter). Alt sınır 2'dir:
 * çok kısa bir metinden bile iki soru istenebilir, yoksa özellik kullanılamaz
 * hâle gelirdi.
 *
 * SESSİZCE KISMAZ: çağıran taraf kaç sorunun neden düştüğünü kullanıcıya
 * bildirmek zorundadır (bkz. routes/ai.ts `kisiltmaNotu`).
 */
export const KARAKTER_BASINA_SORU = 180;

export function makulSoruSayisi(metinUzunlugu: number): number {
  return Math.max(2, Math.floor(metinUzunlugu / KARAKTER_BASINA_SORU));
}
