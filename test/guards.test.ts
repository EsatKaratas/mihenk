// ============================================================================
// Hız sınırı, kaynak metin tespiti ve sayısal yardımcı testleri.
// agents.md §6: birim testleri zorunludur.
//
// Bu testlerin çoğu daha önce tarayıcıda ya da tek seferlik betiklerle elle
// doğrulanmıştı; kalıcı hale getirilmelerinin nedeni regresyonu yakalamak.
// Özellikle KAYNAK_ATIF kalıbı kritik: yanlış negatif verirse öğrenci
// cevaplanamaz bir soruyla karşılaşır (PROGRESS §14c).
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  rateLimited,
  anahtarla,
  round05,
  clamp,
  KAYNAK_ATIF,
  kaynakGerektirirMi,
  RATE_LIMIT_PER_MIN,
  RATE_LIMIT_EVAL_PER_MIN,
} from '../src/lib/guards';

describe('kaynakGerektirirMi — uyaran metin tespiti', () => {
  // Kullanıcının bildirdiği asıl hata bu cümleydi: soru "Metne göre..." diyor
  // ama öğrenciye metin gösterilmiyordu.
  const metneAtifYapan = [
    'Metne göre yazar ilk kitabını kaç yaşında yazmıştır?',
    'Parçada anlatılan olay nerede geçmektedir?',
    'Yukarıdaki metinde geçen sözcüğün anlamı nedir?',
    'Şiirde hangi duygu öne çıkmaktadır?',
    'Okuduğunuz metnin ana fikri nedir?',
    'Verilen metin hangi türdedir?',
    'Metnin başlığı ne olabilir?',
    'Parçaya göre aşağıdakilerden hangisi doğrudur?',
    'Dizelerde kullanılan söz sanatı nedir?',
    'Bu parçanın konusu nedir?',
  ];
  const kendiKendineYeten = [
    'Sürtünme kuvveti nedir?',
    'İki sayının toplamı 12 ise farkı kaçtır?',
    'Noktalama işaretlerinden virgül ne zaman kullanılır?',
    'Fotosentez hangi organelde gerçekleşir?',
  ];

  it.each(metneAtifYapan)('metne atıf yapan soruyu yakalar: %s', (soru) => {
    expect(KAYNAK_ATIF.test(soru)).toBe(true);
    expect(kaynakGerektirirMi(soru, false)).toBe(true);
  });

  it.each(kendiKendineYeten)('kendi kendine yeten soruyu işaretlemez: %s', (soru) => {
    expect(KAYNAK_ATIF.test(soru)).toBe(false);
    expect(kaynakGerektirirMi(soru, false)).toBe(false);
  });

  it('model true dediyse kalıp aramaz (model kararına saygı)', () => {
    expect(kaynakGerektirirMi('Sürtünme nedir?', true)).toBe(true);
  });

  it('YANLIŞ NEGATİF olmaz: kalıp varsa model false dese de true döner', () => {
    expect(kaynakGerektirirMi('Metne göre bu nedir?', false)).toBe(true);
  });

  it('boş ve tanımsız girdide çökmez', () => {
    expect(kaynakGerektirirMi('', false)).toBe(false);
    // @ts-expect-error bilinçli olarak hatalı tip veriliyor
    expect(kaynakGerektirirMi(undefined, false)).toBe(false);
  });

  it('Türkçe karaktersiz yazımı da yakalar (parcada, siirde)', () => {
    expect(KAYNAK_ATIF.test('Parcada gecen olay nedir?')).toBe(true);
    expect(KAYNAK_ATIF.test('Siirde anlatilan duygu nedir?')).toBe(true);
  });
});

describe('rateLimited — hız sınırı', () => {
  it(`${RATE_LIMIT_PER_MIN} istek geçer, sonraki bloke olur`, () => {
    const hits = new Map<string, number[]>();
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_PER_MIN; i++) {
      expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, now)).toBe(false);
    }
    expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, now)).toBe(true);
  });

  it('değerlendirme limiti bir sınıfın tamamına yetecek kadar geniş', () => {
    const hits = new Map<string, number[]>();
    const now = 1_000_000;
    let gecen = 0;
    for (let i = 0; i < 50; i++) {
      if (!rateLimited(hits, 'eval', RATE_LIMIT_EVAL_PER_MIN, now)) gecen++;
    }
    expect(gecen).toBe(RATE_LIMIT_EVAL_PER_MIN);
    expect(RATE_LIMIT_EVAL_PER_MIN).toBeGreaterThanOrEqual(40);
  });

  it('farklı anahtarlar birbirini etkilemez', () => {
    const hits = new Map<string, number[]>();
    const now = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_PER_MIN; i++) rateLimited(hits, 'a', RATE_LIMIT_PER_MIN, now);
    expect(rateLimited(hits, 'a', RATE_LIMIT_PER_MIN, now)).toBe(true);
    expect(rateLimited(hits, 'b', RATE_LIMIT_PER_MIN, now)).toBe(false);
  });

  it('pencere kayınca yeniden izin verir (60 sn sonra)', () => {
    const hits = new Map<string, number[]>();
    const t0 = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_PER_MIN; i++) rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, t0);
    expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, t0)).toBe(true);
    // 61 saniye sonra pencere temizlenir
    expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, t0 + 61_000)).toBe(false);
  });
});

describe('anahtarla — kararlı kısa anahtar', () => {
  it('aynı girdi aynı anahtarı verir', () => {
    expect(anahtarla('Sürtünme kuvveti nedir?')).toBe(anahtarla('Sürtünme kuvveti nedir?'));
  });

  it('farklı girdiler farklı anahtar verir', () => {
    expect(anahtarla('Birinci soru')).not.toBe(anahtarla('İkinci soru'));
  });

  it('boş/tanımsız girdide çökmez', () => {
    expect(typeof anahtarla('')).toBe('string');
    // @ts-expect-error bilinçli olarak hatalı tip veriliyor
    expect(typeof anahtarla(undefined)).toBe('string');
  });

  it('yalnızca ilk 300 karakteri kullanır (uzun metin sınırı)', () => {
    const a = 'x'.repeat(300);
    expect(anahtarla(a)).toBe(anahtarla(a + 'farklı kuyruk'));
  });

  it('negatif olmayan sayı dizesi döner', () => {
    expect(Number(anahtarla('herhangi bir metin'))).toBeGreaterThanOrEqual(0);
  });
});

describe('round05 — yarım puan yuvarlama', () => {
  it.each([
    [7.24, 7],
    [7.25, 7.5],
    [7.74, 7.5],
    [7.75, 8],
    [0, 0],
    [-0.3, -0.5],
  ])('%s -> %s', (girdi, beklenen) => {
    expect(round05(girdi)).toBe(beklenen);
  });
});

describe('clamp — aralığa kırpma', () => {
  it('aralık içinde değeri korur', () => expect(clamp(5, 0, 10)).toBe(5));
  it('alt sınırın altını yükseltir', () => expect(clamp(-3, 0, 10)).toBe(0));
  it('üst sınırın üstünü düşürür', () => expect(clamp(99, 0, 10)).toBe(10));
  it('sınır değerlerini korur', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});
