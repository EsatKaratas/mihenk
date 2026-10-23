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
 * §51b — İSTEMCİ ADRESİ (IP) BAŞINA ORTAK TAVAN, tüm AI uçlarında toplam.
 *
 * NEDEN: Yukarıdaki iki sınırın anahtarı İSTEMCİNİN verdiği değerdir (docKey,
 * soru gövdesi). Anahtarı her istekte değiştiren bir döngü — hatalı bir
 * istemci ya da kötü niyet — hiçbir sınıra takılmadan sınırsız model çağırır.
 * 26 Ekim 2026'dan sonra hesap ücretsiz Workers AI planına dönüyor; günlük
 * Neuron kotası tek böyle bir istemciyle tükenir ve demo düşer.
 *
 * AMAÇ MALİYET GÜVENLİĞİDİR, KALİTE EŞİĞİ DEĞİL. Değer ölçülmüş bir trafikten
 * değil (öyle bir veri yok), mevcut iki sınırdan TÜRETİLDİ ki meşru kullanımı
 * asla kesmesin: bir öğretmenin aynı dakikada yapabileceği en yoğun meşru iş,
 * bir sınıfı değerlendirmek (RATE_LIMIT_EVAL_PER_MIN = 45) artı üretim / rubrik
 * / kazanım denetiminin her birinden bir dakikalık sınır (3 × 5 = 15) → 60.
 * Ölçüm betiği (tools/olcum, çağrılar arası 13 sn ≈ dakikada 5) bunun çok
 * altında kalır. Sınırın kendisi bellek içidir ve isolate başınadır — dağıtık
 * bir garanti değil, döngüyü kesen bir sigortadır (agents.md §4 izinli).
 */
export const RATE_LIMIT_IP_PER_MIN = RATE_LIMIT_EVAL_PER_MIN + 3 * RATE_LIMIT_PER_MIN;

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
/*
 * §48 — ÖLÇÜLMÜŞ EKSİK: LATİN HARFLİ YABANCI KARAKTERLER KAÇIYORDU.
 *
 * Liste yalnızca Latin DIŞI alfabeleri tarıyordu. Canlı sistemde şu şık
 * üretildi ve `dilUyarisi` FALSE döndü — uyarı İçerik Uzmanına hiç
 * gösterilmedi:
 *
 *   "Şiirde phứcekli ve zor kelimeler kullanılmalıdır"
 *              ^^^ U+1EE9
 *
 * `ứ` Latin Extended Additional bloğundadır (U+1E00–1EFF, Vietnamca) ve blok
 * listede yoktu. Aralık eklendi.
 *
 * LATIN EXTENDED-A/B BİLEREK EKLENMEDİ: Türkçenin ğ ı İ ş Ş Ğ harfleri tam da
 * orada yaşıyor (U+011E, U+011F, U+0130, U+0131, U+015E, U+015F). O bloğu
 * toptan eklemek MEŞRU TÜRKÇEYİ işaretlerdi. U+1E00–1EFF'te Türkçe harf
 * yoktur; yanlış pozitif riski taşımaz ve kalibre edilecek bir eşik doğurmaz.
 *
 * §51b — LATIN EXTENDED-A ARTIK VAR, TÜRKÇE HARFLER HARİÇ.
 * Yukarıdaki "bilerek eklenmedi" kararının bedeli ölçüldü: W1'in gerçek
 * üretiminde (KK.FIZ.2.1, 19 Ekim) "tăngdı" geçti — `ă` U+0103, Vietnamca —
 * ve `dilUyarisi` FALSE döndü. Blok toptan değil, Türkçe harfler DIŞARIDA
 * bırakılarak eklendi: U+0100–011D, U+0120–012F, U+0132–015D, U+0160–017F.
 * Dışarıda kalan altı nokta: Ğ ğ (011E/011F), İ ı (0130/0131), Ş ş (015E/015F).
 * Türkçenin diğer harfleri (ç ö ü Ç Ö Ü) ve şapkalı â î û Latin-1'dedir
 * (U+00C0–00FF), bu bloğun dışında kalır.
 * Ölçüldü: depodaki 32 metin dosyasında (12 MEB müfredatı, 13 Deneyap
 * dosyası, ders belgeleri, app.js — 1.049.353 karakter) bu bloktan Türkçe
 * dışı karakter 0; yanlış pozitif 0 (test/guards.test.ts).
 * §57 — LATIN EXTENDED-B (U+0180–024F) DA VAR. A5'te W4 Vietnamca sızıntı
 * buldu ("ngược"); yakalanması "ư" (U+01B0) sayesinde DEĞİL, aynı kelimedeki
 * "ợ" (U+1EE3) sayesindeydi. "ư" ve "ơ" (U+01A1) Ext-B'dedir ve kapsanmıyordu:
 * "thư", "sư" uyarısız geçerdi. Türkçede bu blokta harf YOKTUR; bloğun tamamı
 * eklendi (Vietnamca ơ/ư, Rumence ș/ț, pinyin ǎ… hepsi Türkçe dışı).
 * Yanlış pozitif yeniden ölçüldü (test/guards.test.ts): 0.
 * (Eski not: "Latin-1 içindeki é, ñ, ã, ß hâlâ yakalanmaz" — §73'te
 * YABANCI_AKSAN ile kapandı; aşağıya bakın. Sözlük gerekmedi: Türkçe
 * harfler tek tek dışarıda bırakıldı.)
 */
export const YABANCI_ALFABE =
  /[\u0400-\u04FF\u0370-\u03FF\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u1E00-\u1EFF\u0100-\u011D\u0120-\u012F\u0132-\u015D\u0160-\u017F\u0180-\u024F]/;

/*
 * §73 — LATİN-1 YABANCI AKSAN (yukarıdaki "BİLİNÇLİ SINIR" kapandı).
 * Latin-1 Supplement'ın (U+00C0–00FF) HARFLERİ, Türkçede geçen altısı
 * (Ç ç Ö ö Ü ü) ve şapkalılar (Â â Î î Û û) DIŞARIDA; × (D7) ve ÷ (F7) harf
 * değildir. Kalanlar: À Á Ã Ä Å Æ È–Í Ï–Õ Ø–Ú Ý Þ ß à á ã–æ è–í ï–õ ø–ú ý–ÿ.
 * ÖLÇÜLDÜ (§73, tools/olcum/aksan-say.mjs, model çağrısı yok):
 *   - 782 üretilmiş soru + 621 çözücü gerekçesi: 4 isabet, 4'ü de gerçek
 *     sızıntı (luôn, tämir, konkrét; đúngudur zaten Ext-A ile yakalanıyordu),
 *     yanlış alarm 0. Eski kural bunların yalnız 1'ini görüyordu.
 *   - İnsan yazımı Türkçe ders derlemi (müfredat + ders belgeleri + ölçüm
 *     seti, ~1 MB): isabet 0.
 *   - Canlıda (§69) değerlendirme çıktısında "necessário" görüldü.
 * BİLİNEN VE KABUL EDİLEN: meşru özgün yazımlı yabancı özel adlar da uyarı
 * verir (Ampère, Poincaré, El Niño, García Márquez…). Uyarı ENGELLEMEZ;
 * öğretmen görür ve geçer (agents.md §1). Allowlist bilerek yok: ölçülen
 * yanlış alarm 0 ve liste bakım yükü getirir.
 * KAPSAM DIŞI: aksansız yabancı sözcük (however, para, pero) — sözlük ya da
 * dil tanıma ister, ayrı iş.
 */
export const YABANCI_AKSAN =
  /[\u00C0\u00C1\u00C3-\u00C6\u00C8-\u00CD\u00CF-\u00D5\u00D8-\u00DA\u00DD-\u00E1\u00E3-\u00E6\u00E8-\u00ED\u00EF-\u00F5\u00F8-\u00FA\u00FD-\u00FF]/;

/* NFC: "e" + birleşik akut (U+0301) gibi ayrık yazımlar tek harfe dönsün;
   yoksa "é" ayrık yazılınca aralık testinden kaçardı. Türkçe harfler NFC'de
   değişmez. */
const nfc = (s: string): string => String(s || '').normalize('NFC');

/** Metinde Türkçe dışı alfabe ya da Türkçe dışı Latin-1 aksanlı harf geçiyorsa true. */
export const yabanciAlfabeVarMi = (s: string): boolean => {
  const m = nfc(s);
  return YABANCI_ALFABE.test(m) || YABANCI_AKSAN.test(m);
};

/**
 * §73 — Uyarıyı TETİKLEYEN sözcükler (tekil, görülme sırasıyla, en çok `en`).
 * Yalnız bilgi: öğretmene/ölçüme "neden uyarı" sorusunun cevabı. Metni
 * değiştirmez, karar vermez.
 */
export function yabanciSozcukler(metinler: Array<string | null | undefined>, en = 3): string[] {
  const out: string[] = [];
  for (const m of metinler) {
    for (const w of nfc(m || '').split(/[^\p{L}\p{M}]+/u)) {
      if (!w || out.includes(w)) continue;
      if (YABANCI_ALFABE.test(w) || YABANCI_AKSAN.test(w)) {
        out.push(w);
        if (out.length >= en) return out;
      }
    }
  }
  return out;
}

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

/**
 * §47b — İKİ ÇELDİRİCİYE AYNI GEREKÇE YAZILMIŞ MI?
 *
 * 🔴 CANLIDA GÖZLENDİ (§47 yayınlandıktan hemen sonra, aynı uçtan):
 *   A) "İklimi belirleyen faktörleri hava olayları ile karıştırmaktadır."
 *   B) "İklimi belirleyen faktörlerin sadece bir kısmını dikkate almaktadır."
 *   D) "İklimi belirleyen faktörlerin sadece bir kısmını dikkate almaktadır."
 * B ve D BİREBİR aynı. İki farklı çeldiricinin aynı yanılgıyı ölçtüğünü
 * söylemek, ikisinden birinin gereksiz olduğu anlamına gelir — ölçme
 * açısından anlamlı bir sinyal.
 *
 * OTOMATİK DÜZELTİLMEZ, GÖSTERİLİR (§3.3 / agents.md §1): hangi gerekçenin
 * yeniden yazılacağına İçerik Uzmanı karar verir.
 *
 * BENZERLİK DEĞİL, BİREBİR EŞİTLİK aranır — küçük harfe indirgenmiş ve
 * noktalaması atılmış hâliyle. Böylece kalibre edilecek bir eşik doğmaz
 * (bkz. BENZERLIK_ESIGI üstündeki not: sabitler tahminle konmaz).
 */
export function gerekceTekrariVarMi(harita?: Record<string, string> | null): boolean {
  const gorulen = new Set<string>();
  for (const v of Object.values(harita || {})) {
    const n = String(v || '')
      .toLocaleLowerCase('tr')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    if (!n) continue;
    if (gorulen.has(n)) return true;
    gorulen.add(n);
  }
  return false;
}

/**
 * §51b — KAÇ GEREKÇEDE KALIP AÇILIŞ KESİLDİ?
 *
 * API yalnızca temizlenmiş gerekçeyi döndürdüğü için, modelin "Bu şıkkı seçen
 * öğrenci..." kalıbını ne sıklıkla yazdığı dışarıdan ÖLÇÜLEMİYORDU. Bu sayı,
 * otomatik denetimin ne kadar yakaladığının doğrudan ölçüsüdür (docs/ARASTIRMA).
 *
 * Yalnızca KALIP AÇILIŞIN gerçekten kesildiği gerekçe sayılır. İlk harf
 * büyütme tek başına sayılmaz (o bir kalıp değil), temizlik cümleyi yok
 * edeceği için orijinalin korunduğu durum da sayılmaz (değişiklik olmadı).
 * Davranışı değiştirmez; `gerekceyiSadelestir` ile aynı ifadeyi kullanır.
 */
export function kalipliGerekceSayisi(harita?: Record<string, string> | null): number {
  let n = 0;
  for (const v of Object.values(harita || {})) {
    const ham = String(v || '').trim();
    if (ham && GEREKCE_KALIP_ACILIS.test(ham) && ham.replace(GEREKCE_KALIP_ACILIS, '').trim()) n++;
  }
  return n;
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

/* ===========================================================================
   §55 — A3: EN UZUN ŞIK İPUCU (YALNIZ ÖLÇÜM, ROZET YOK)
   ===========================================================================
   Soru yazımında bilinen bir kusur: doğru şık diğerlerinden belirgin biçimde
   uzunsa öğrenci bilmeden doğruyu bulur. ÖLÇÜLDÜ (W5 ham verisi, 6 gerçek
   koşum, 75 ÇSS): doğru şık yalnız 11'inde (%14,7) TEK BAŞINA en uzun —
   rastgele beklenti %25'in ALTINDA, yani bu modellerde genel bir kusur yok.
   En uzun / ikinci en uzun ≥ 1,5 olan 11 soruda en uzun şık 5'inde (%45)
   doğruydu; rastgele beklentinin yaklaşık iki katı.

   KALİBRE EDİLMEMİŞ EŞİK (tuzak 9 — açıkça yazılıyor): 1,5 değeri N=11'lik
   bir örneklemden seçildi. Bu yüzden alan YALNIZ ÖLÇÜM içindir: arayüzde
   rozet olarak gösterilmez, hiçbir kararı etkilemez; A5 koşumunda
   (docs/ARASTIRMA) daha büyük örneklemle yeniden bakılacak. */
export const UZUN_SIK_ORANI = 1.5;

/** Doğru şık TEK BAŞINA en uzunsa ve ikinci en uzundan en az UZUN_SIK_ORANI kat uzunsa true. */
export function uzunSikIpucu(
  options: Array<{ key: string; text: string }> | null | undefined,
  correctKey: string | null | undefined
): boolean {
  const siklar = (options || []).map((o) => ({ k: String(o.key), n: String(o.text || '').trim().length }));
  if (siklar.length < 2 || !correctKey) return false;
  const sirali = [...siklar].sort((a, b) => b.n - a.n);
  if (sirali[0].k !== correctKey || sirali[0].n === sirali[1].n) return false;
  return sirali[0].n >= UZUN_SIK_ORANI * Math.max(1, sirali[1].n);
}

/* ===========================================================================
   §55 — A5: ÖLÇÜM ORTAMI AYARLARI (canlıda KAPALI)
   ===========================================================================
   İki ayar yalnız yerel ölçüm koşumu içindir (tools/olcum):
     OLCUM_SICAKLIK — soru üretiminin sıcaklığı (varsayılan 0,5, ürün davranışı)
     OLCUM_HAM=1    — tekrar/aynı-şık/geçersiz diye elenen maddeler yanıtın
                      meta.elenenler alanında döner (A4'ün öncesi/sonrası ölçümü)

   GÜVENCE — İZİN LİSTESİ, DIŞLAMA LİSTESİ DEĞİL. İkisi yalnızca
   APP_ENV === "olcum" iken okunur. "demo/üretim değilse açık" kuralı
   YETMEZDİ: ölçüldü, üretim yapılandırması wrangler.jsonc APP_ENV'i
   "development" tanımlıyor; `npm run deploy` ile yayımlanırsa dışlama listesi
   ayarları canlıda açardı. Canlı (wrangler.demo.jsonc) "demo"dur; ölçüm
   sunucusu `--var APP_ENV:olcum` ile başlatılır. test/rota.test.ts üç
   yapılandırmanın üçünde de kapalı olduğunu doğrular. */
export type OlcumAyarlari = { sicaklik: number | null; ham: boolean };

export function olcumAyarlari(env: { APP_ENV?: string; OLCUM_SICAKLIK?: string; OLCUM_HAM?: string } | null | undefined): OlcumAyarlari {
  if (!env || String(env.APP_ENV || '').trim() !== 'olcum') return { sicaklik: null, ham: false };
  const ham = String(env.OLCUM_HAM || '').trim() === '1';
  const s = String(env.OLCUM_SICAKLIK ?? '').trim().replace(',', '.');
  const n = s === '' ? NaN : Number(s);
  // Ölçüm planı 0–2 aralığında sıcaklık kullanıyor; dışı (ya da sayı olmayan) yok sayılır, varsayılan kalır.
  const sicaklik = Number.isFinite(n) && n >= 0 && n <= 2 ? n : null;
  return { sicaklik, ham };
}

/* ===========================================================================
   §55 — A2: SAYISAL HESAP DENETİMİ
   ===========================================================================
   W5 ham verisinde 75 ÇSS'nin 30'u sayısal (gövdede ve tüm şıklarda rakam).
   Yanlış cevap anahtarının en sık görülen kökü hesap hatası (§46, §48b.2).
   Model, ÇSS için isteğe bağlı bir "hesap" ifadesi yazar; sunucu onu kendisi
   hesaplar ve doğru şıktaki sayıyla karşılaştırır. Tutmazsa İŞARETLER,
   düzeltmez (agents.md §1).

   GÜVENLİK: eval / Function / new Function YOKTUR. Elle yazılmış bir
   özyinelemeli iniş ayrıştırıcısı yalnız şunları kabul eder: sayı (nokta ya
   da virgül ondalık), + − × ÷ * / ve parantez, tekli eksi. Başka HER karakter
   (harf, $, =, ^, %) ifadeyi geçersiz kılar → hesaplanmaz (null). Uzunluk ve
   iç içe derinlik sınırlıdır; sıfıra bölme ve sonlu olmayan sonuç null. */
export const HESAP_UZUNLUK_SINIRI = 120;
const HESAP_DERINLIK_SINIRI = 20;

/** Aritmetik ifadeyi GÜVENLİ biçimde hesaplar; geçersizse null. */
export function hesapla(ifade: string | null | undefined): number | null {
  const s = String(ifade ?? '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  if (!s || s.length > HESAP_UZUNLUK_SINIRI || !/^[0-9.,+\-*/()]+$/.test(s)) return null;
  let i = 0;
  let derinlik = 0;
  const hata = () => { throw new Error('hesap'); };
  const sayi = (): number => {
    const m = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
    if (!m) hata();
    i += m![0].length;
    return Number(m![0].replace(',', '.'));
  };
  const etken = (): number => {
    if (s[i] === '-') { i++; return -etken(); }
    if (s[i] === '+') { i++; return etken(); }
    if (s[i] === '(') {
      if (++derinlik > HESAP_DERINLIK_SINIRI) hata();
      i++;
      const v = toplam();
      if (s[i] !== ')') hata();
      i++; derinlik--;
      return v;
    }
    return sayi();
  };
  const carpim = (): number => {
    let v = etken();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++];
      const w = etken();
      if (op === '/') { if (w === 0) hata(); v /= w; } else v *= w;
    }
    return v;
  };
  const toplam = (): number => {
    let v = carpim();
    while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const w = carpim(); v = op === '+' ? v + w : v - w; }
    return v;
  };
  try {
    const v = toplam();
    return i === s.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Şık metnindeki İLK sayıyı ve o yazımın kendi hassasiyetinden türetilen
 * toleransı döner. Tolerans kalibre edilmiş bir sabit DEĞİLDİR: şıktaki son
 * basamağın yarısıdır ("3,33" → ±0,005; "20" → ±0,5) — şık kaç basamakla
 * yazıldıysa o kadar kesinlik iddia eder. Yazım kuralları (tahmin yok):
 *   virgül varsa → virgül ondalık, noktalar binlik ("1.250,5" = 1250,5)
 *   birden çok nokta → binlik ("1.250.000")
 *   tek nokta + tam 3 basamak ("1.250") → BELİRSİZ (binlik mi ondalık mı?)
 *     → null, yani bu şık denetlenmez
 *   tek nokta, başka basamak sayısı ("2.5") → ondalık
 * Sayı yoksa null.
 */
export function sikSayisi(metin: string | null | undefined): { deger: number; tolerans: number } | null {
  const m = /-?\d+(?:[.,]\d+)*/.exec(String(metin ?? '').replace(/−/g, '-'));
  if (!m) return null;
  let t = m[0];
  const noktalar = (t.match(/\./g) || []).length;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (noktalar > 1) t = t.replace(/\./g, '');
  else if (noktalar === 1 && /\.\d{3}$/.test(t)) return null;
  const deger = Number(t);
  if (!Number.isFinite(deger)) return null;
  const ondalik = t.includes('.') ? t.split('.')[1].length : 0;
  return { deger, tolerans: 0.5 * Math.pow(10, -ondalik) };
}

export type HesapSonucu = { hesapUyusmazligi: boolean | null; hesapBaskaSik: string | null; okunamadi: boolean };

/**
 * Modelin hesabını doğru şıkla karşılaştırır. Karşılaştırma yapılamıyorsa
 * (hesap yok, şıkta sayı yok) hesapUyusmazligi null — "temiz" değil,
 * "denetlenmedi". Hesap başka bir şıkla tutuyorsa o harf döner: anahtar
 * büyük olasılıkla yanlış demektir — yine de karar İçerik Uzmanının.
 */
export function hesapDenetimi(
  hesap: string | null | undefined,
  options: Array<{ key: string; text: string }>,
  correctKey: string | null | undefined
): HesapSonucu {
  if (!hesap || !String(hesap).trim()) return { hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: false };
  const v = hesapla(hesap);
  if (v === null) return { hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: true };
  const tutar = (o: { text: string }) => { const n = sikSayisi(o.text); return n !== null && Math.abs(v - n.deger) <= n.tolerans + 1e-9; };
  const dogru = options.find((o) => o.key === correctKey);
  if (!dogru || sikSayisi(dogru.text) === null) return { hesapUyusmazligi: null, hesapBaskaSik: null, okunamadi: false };
  if (tutar(dogru)) return { hesapUyusmazligi: false, hesapBaskaSik: null, okunamadi: false };
  const baska = options.find((o) => o.key !== correctKey && tutar(o));
  return { hesapUyusmazligi: true, hesapBaskaSik: baska ? baska.key : null, okunamadi: false };
}
