// ============================================================================
// §88 KVKK — kişisel veri ikinci katmanı (sunucu).
//
// İstemci (public/app.js kisiselMaskele) kayıtlı öğrenci adlarını gönderimden
// önce maskeler; sunucu öğrenci listesini BİLMEZ. Bu katman yine de şunları
// garanti eder:
//   1) Kişisel alan ANAHTARI (studentName, ad, soyad, okulNo, sinif…) taşıyan
//      gövde reddedilir (400). İstemci bu alanları hiç göndermez; bir isabet
//      hata demektir ve modele gitmeden durdurulur. (Zod şemaları bilinmeyen
//      alanı zaten atıyor — test/kvkk-sunucu.test.ts bunu ayrıca kanıtlar.)
//   2) Serbest metin alanlarında öğrencinin KENDİNİ tanıttığı kalıplar
//      ("benim adım Ayşe Yılmaz", "adım soyadım: …", "okul numaram 123")
//      maskelenir. Sezgiseldir: yalnız açık tanıtım kalıplarını yakalar,
//      cevabın içeriğine dokunmaz ("ilk adım", "adımı attı" maskelenmez).
// Hiçbir şey kaydedilmez/loglanmaz (metin içeriği log'a yazılmaz).
// ============================================================================

import type { MiddlewareHandler } from 'hono';

/** Normalize anahtar: küçük harf, Türkçe harf sadeleştirme, harf/rakam dışı atılır. */
export function anahtarNormal(k: string): string {
  return k
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

/** Gövdede GEÇMEMESİ gereken alan adları (normalize edilmiş). */
export const KISISEL_ANAHTARLAR = new Set(
  [
    'name', 'fullName', 'firstName', 'lastName', 'surname',
    'studentName', 'studentId', 'studentNo', 'studentNumber', 'sid',
    'schoolName', 'school', 'schoolNo', 'className', 'classroom',
    'ad', 'adi', 'soyad', 'soyadi', 'adSoyad', 'adiSoyadi', 'isim',
    'ogrenci', 'ogrenciAdi', 'ogrenciAd', 'ogrenciNo', 'ogrenciNumarasi', 'ogrenciId',
    'okul', 'okulAdi', 'okulNo', 'okulNumarasi', 'numara',
    'sinif', 'sube', 'sinifSube',
    'tc', 'tcNo', 'tcKimlik', 'tcKimlikNo', 'kimlikNo',
    'veli', 'veliAdi', 'telefon', 'phone', 'email', 'eposta',
  ].map(anahtarNormal)
);

/** Gövdede (iç içe dahil) kişisel alan anahtarı varsa yolunu döner. */
export function kisiselAlanBul(govde: unknown, yol = '', derinlik = 0): string | null {
  if (derinlik > 6 || govde === null || typeof govde !== 'object') return null;
  if (Array.isArray(govde)) {
    for (let i = 0; i < govde.length && i < 500; i++) {
      const r = kisiselAlanBul(govde[i], `${yol}[${i}]`, derinlik + 1);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(govde as Record<string, unknown>)) {
    const p = yol ? `${yol}.${k}` : k;
    if (KISISEL_ANAHTARLAR.has(anahtarNormal(k))) return p;
    const r = kisiselAlanBul(v, p, derinlik + 1);
    if (r) return r;
  }
  return null;
}

/** Türkçe duyarlı, büyük/küçük harfe duyarsız kalıp parçası ("adım" → [aA][dD][ıIiİ][mM]).
    /i bayrağı KULLANILMAZ: /iu altında \p{Lu} küçük harfle de eşleşir ve İ katlanmaz. */
function tr(sozcuk: string): string {
  const s: Record<string, string> = { i: 'iİıI', ı: 'ıIiİ', ş: 'şŞsS', ğ: 'ğĞgG', ü: 'üÜuU', ö: 'öÖoO', ç: 'çÇcC' };
  return Array.from(sozcuk)
    .map((h) => (s[h] ? `[${s[h]}]` : /\p{L}/u.test(h) ? `[${h}${h.toLocaleUpperCase('tr')}]` : h))
    .join('');
}
const BUYUK_AD = "\\p{Lu}[\\p{L}'’-]*";
const TEK_SOZCUK = "\\p{L}[\\p{L}'’-]*";
const ONCE = '(?<![\\p{L}\\p{N}])';
const KENDINI_TANITMA: RegExp[] = [
  // "benim adım Ayşe Yılmaz", "BENİM İSMİM AYŞE", "benim adım ayşe" (küçük harfte yalnız tek sözcük)
  new RegExp(
    `(${ONCE}${tr('benim')}\\s+(?:${tr('adım')}|${tr('ismim')}|${tr('isim')})\\s*[:,-]?\\s*)(${BUYUK_AD}(?:[ \\t]+${BUYUK_AD}){0,2}|${TEK_SOZCUK})`,
    'gu'
  ),
  // "adım soyadım: Ayşe Yılmaz", "Ad Soyad: …", "Adı Soyadı - …", "İsim Soyisim: …"
  new RegExp(
    `(${ONCE}(?:${tr('ad')}(?:${tr('ım')}|${tr('ı')})?\\s*(?:${tr('ve')}\\s+|[-/]\\s*)?${tr('soyad')}(?:${tr('ım')}|${tr('ı')})?|${tr('isim')}\\s*[-/]?\\s*${tr('soyisim')}|${tr('öğrenci')}(?:${tr('nin')})?\\s+${tr('adı')})[ \\t]*[:=-]?[ \\t]*)(${TEK_SOZCUK}(?:[ \\t]+${TEK_SOZCUK}){0,2})`,
    'gu'
  ),
];
const NUMARA = new RegExp(
  `((?:${tr('okul')}|${tr('öğrenci')})\\s*(?:${tr('numaramız')}|${tr('numaram')}|${tr('numarası')}|${tr('numara')}|${tr('nosu')}|${tr('no')})\\s*[:=]?\\s*|${ONCE}${tr('numaram')}\\s*[:=]?\\s*)\\d{1,11}(?!\\d)`,
  'gu'
);

/** Serbest metindeki açık kendini tanıtma ve numara kalıplarını maskeler. */
export function kendiniTanitmaMaskele(metin: string): { metin: string; maskelendi: boolean } {
  let m = String(metin ?? '');
  let degisti = false;
  for (const re of KENDINI_TANITMA) {
    m = m.replace(re, (_t, on: string) => {
      degisti = true;
      return `${on}[ÖĞRENCİ]`;
    });
  }
  m = m.replace(NUMARA, (_t, on: string) => {
    degisti = true;
    return `${on}[NUMARA]`;
  });
  return { metin: m, maskelendi: degisti };
}

/** Maskelenecek serbest metin alanları (istemcinin gerçek alan adları). */
export const SERBEST_METIN_ALANLARI = ['studentAnswer', 'answers'] as const;

/** Gövdeyi yerinde temizler; kaç alanın maskelendiğini döner. */
export function govdeTemizle(govde: Record<string, unknown>): number {
  let sayi = 0;
  if (typeof govde.studentAnswer === 'string') {
    const r = kendiniTanitmaMaskele(govde.studentAnswer);
    if (r.maskelendi) { govde.studentAnswer = r.metin; sayi++; }
  }
  if (Array.isArray(govde.answers)) {
    govde.answers = govde.answers.map((a) => {
      if (typeof a !== 'string') return a;
      const r = kendiniTanitmaMaskele(a);
      if (r.maskelendi) sayi++;
      return r.metin;
    });
  }
  return sayi;
}

/**
 * Hono ara katmanı: /api/ai/* POST gövdesini zValidator'dan ÖNCE denetler.
 * Maskeleme olursa HonoRequest.bodyCache temizlenmiş metinle değiştirilir;
 * doğrulayıcı (zValidator → c.req.json()) maskeli gövdeyi görür — test kanıtlar.
 * Ayrıştırılamayan gövde olduğu gibi geçer (doğrulayıcı 400 döner).
 */
export const kisiselKoruma: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'POST') return next();
  let govde: unknown;
  try {
    govde = await c.req.json();
  } catch {
    return next();
  }
  const alan = kisiselAlanBul(govde);
  if (alan) {
    console.log(JSON.stringify({ ev: 'kisisel_alan_reddedildi', yol: c.req.path, alan }));
    return c.json(
      {
        error: 'kisisel_veri',
        message: 'İstek öğrenciyi tanımlayan bir alan içeriyor; yapay zekâya gönderilmedi.',
      },
      400
    );
  }
  if (govde && typeof govde === 'object' && !Array.isArray(govde)) {
    if (govdeTemizle(govde as Record<string, unknown>) > 0) {
      // c.req.json() her çağrıda önbellekteki METNİ yeniden ayrıştırır (hono 4.x
      // HonoRequest.#cachedBody('text')); maskeli gövdenin doğrulayıcıya ulaşması
      // için önbellek temizlenmiş metinle değiştirilir. Uçtan test bunu kanıtlar.
      // Tür bildirimi Partial<Body> der; çalışma anında değerler Promise'tir.
      (c.req as unknown as { bodyCache: Record<string, Promise<string>> }).bodyCache = {
        text: Promise.resolve(JSON.stringify(govde)),
      };
    }
  }
  return next();
};
