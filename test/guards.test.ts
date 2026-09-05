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
  yabanciAlfabeVarMi,
  soruDilUyarisi,
  metinDilUyarisi,
  anahtarla,
  round05,
  clamp,
  KAYNAK_ATIF,
  kaynakGerektirirMi,
  RATE_LIMIT_PER_MIN,
  RATE_LIMIT_EVAL_PER_MIN,
  remapOptionsByOrder,
  shuffleOptions,
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

describe('yabanciAlfabeVarMi — model çıktısında Türkçe dışı alfabe', () => {
  it('temiz Türkçe metinde uyarı vermez', () => {
    expect(yabanciAlfabeVarMi('Sürtünme kuvvetinin etkilerini açıklayınız.')).toBe(false);
    expect(yabanciAlfabeVarMi('Çığır açan bir öykü; şiirsel, ıslak, ünlü.')).toBe(false);
  });

  it('GERÇEK OLAY: llama Kiril harfi karıştırdı — yakalar', () => {
    // 26 Ağustos'ta canlıda üretilen gerçek çıktı.
    expect(yabanciAlfabeVarMi('Katkılarını açıklaйте.')).toBe(true);
  });

  it('diğer alfabeleri de yakalar', () => {
    expect(yabanciAlfabeVarMi('Soru: αβγ nedir?')).toBe(true);   // Yunan
    expect(yabanciAlfabeVarMi('Metinde 漢字 geçiyor')).toBe(true); // CJK
    expect(yabanciAlfabeVarMi('Arapça: مرحبا')).toBe(true);
  });

  it('boş/tanımsız girdide çökmez', () => {
    expect(yabanciAlfabeVarMi('')).toBe(false);
    expect(yabanciAlfabeVarMi(undefined as unknown as string)).toBe(false);
  });

  it('sayı ve noktalama uyarı vermez', () => {
    expect(yabanciAlfabeVarMi('1906 yılında — %50; (iki) "üç"')).toBe(false);
  });
});

describe('soruDilUyarisi — sorunun tüm görünen metinleri', () => {
  it('temiz soruda false', () => {
    expect(soruDilUyarisi({
      body: 'Ana fikir nedir?',
      options: [{ text: 'Birinci' }, { text: 'İkinci' }],
      distractorRationale: { B: 'Öğrenci karıştırıyor.' },
    })).toBe(false);
  });

  it('gövdede yabancı alfabe varsa true', () => {
    expect(soruDilUyarisi({ body: 'Açıklaйте.' })).toBe(true);
  });

  it('ŞIKTA yabancı alfabe varsa true (gövde temiz olsa bile)', () => {
    expect(soruDilUyarisi({
      body: 'Ana fikir nedir?',
      options: [{ text: 'Temiz şık' }, { text: 'Бозук şık' }],
    })).toBe(true);
  });

  it('ÇELDİRİCİ GEREKÇESİNDE yabancı alfabe varsa true', () => {
    expect(soruDilUyarisi({
      body: 'Ana fikir nedir?',
      options: [{ text: 'Temiz' }],
      distractorRationale: { B: 'Öğrenci неправильно düşünüyor.' },
    })).toBe(true);
  });

  it('alanlar eksikse çökmez', () => {
    expect(soruDilUyarisi({})).toBe(false);
    expect(soruDilUyarisi({ body: undefined, options: undefined })).toBe(false);
  });
});

// ============================================================================
// §32 (Burak Modül 4/3) — şık sırası: yeniden etiketleme ve karıştırma.
//
// NEDEN kritik: harf etiketleri konuma göre sabittir, içerik hareket eder.
// Doğru cevap ve çeldirici gerekçeleri şıkkın HARFİNİ değil İÇERİĞİNİ takip
// etmek zorunda; aksi halde "B şıkkını seçen öğrenci..." gerekçesi artık
// B'de olmayan bir metne bağlı kalır ve öğrenciye yanlış geri bildirim gider.
// ============================================================================

describe('remapOptionsByOrder — sıra değişince doğru cevap ve gerekçe birlikte taşınır', () => {
  const OPTIONS = [
    { key: 'A', text: 'Elma' },
    { key: 'B', text: 'Armut' },
    { key: 'C', text: 'Kiraz' },
    { key: 'D', text: 'Erik' },
  ];
  const RATIONALE = { A: 'Elma yanılgısı', B: 'Armut yanılgısı', D: 'Erik yanılgısı' };

  it('doğru cevap Kiraz (C) iken A konumuna taşınınca correctKey A olur', () => {
    const r = remapOptionsByOrder(OPTIONS, 'C', RATIONALE, [2, 0, 1, 3]);
    expect(r.options.map((o) => o.text)).toEqual(['Kiraz', 'Elma', 'Armut', 'Erik']);
    expect(r.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(r.correctKey).toBe('A');
  });

  it('gerekçeler taşınan metinle birlikte yeni harfe geçer', () => {
    const r = remapOptionsByOrder(OPTIONS, 'C', RATIONALE, [2, 0, 1, 3]);
    // Elma B'ye, Armut C'ye, Erik D'de kaldı.
    expect(r.distractorRationale).toEqual({
      B: 'Elma yanılgısı',
      C: 'Armut yanılgısı',
      D: 'Erik yanılgısı',
    });
  });

  it('yeni doğru şıkka denk gelen gerekçe düşürülür (gerekçe yalnızca çeldirici içindir)', () => {
    const r = remapOptionsByOrder(OPTIONS, 'A', RATIONALE, [0, 1, 2, 3]);
    expect(r.correctKey).toBe('A');
    expect(r.distractorRationale.A).toBeUndefined();
    expect(r.distractorRationale.B).toBe('Armut yanılgısı');
  });

  it('gerekçe konum harfiyle anahtarlanmışsa da bulunur (model ikisini karıştırabiliyor)', () => {
    const garipKeyler = [
      { key: 'a)', text: 'Elma' },
      { key: 'b)', text: 'Armut' },
      { key: 'c)', text: 'Kiraz' },
    ];
    const r = remapOptionsByOrder(garipKeyler, 'c)', { A: 'Elma yanılgısı' }, [2, 0, 1]);
    expect(r.correctKey).toBe('A');
    expect(r.distractorRationale.B).toBe('Elma yanılgısı');
  });

  it('correctKey tanınmazsa ilk şık doğru kabul edilir, çökmez', () => {
    const r = remapOptionsByOrder(OPTIONS, 'ZZZ', RATIONALE, [1, 0, 2, 3]);
    expect(r.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D']);
    expect(r.correctKey).toBe('B'); // eski A (Elma) yeni B konumunda
  });

  it('girdiyi mutasyona uğratmaz', () => {
    const kopya = JSON.parse(JSON.stringify(OPTIONS));
    remapOptionsByOrder(OPTIONS, 'C', RATIONALE, [3, 2, 1, 0]);
    expect(OPTIONS).toEqual(kopya);
  });
});

describe('shuffleOptions — üretim sonrası şık karıştırma', () => {
  const OPTIONS = [
    { key: 'A', text: 'Elma' },
    { key: 'B', text: 'Armut' },
    { key: 'C', text: 'Kiraz' },
    { key: 'D', text: 'Erik' },
  ];

  it('doğru cevabın METNİ her karıştırmada korunur', () => {
    for (let i = 0; i < 200; i++) {
      const r = shuffleOptions(OPTIONS, 'C', undefined, Math.random);
      const dogru = r.options.find((o) => o.key === r.correctKey);
      expect(dogru?.text).toBe('Kiraz');
    }
  });

  it('harfler her zaman konuma göre A,B,C,... olur', () => {
    for (let i = 0; i < 100; i++) {
      const r = shuffleOptions(OPTIONS, 'A', undefined, Math.random);
      expect(r.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('400 denemede doğru cevap her harfte görülür (pozisyon önyargısı yok)', () => {
    const dagilim: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (let i = 0; i < 400; i++) {
      const r = shuffleOptions(OPTIONS, 'C', undefined, Math.random);
      dagilim[r.correctKey]++;
    }
    Object.values(dagilim).forEach((n) => expect(n).toBeGreaterThan(20));
  });

  it('belirlenimci rng ile sonuç tekrarlanabilir', () => {
    const sabitRng = () => 0; // her adımda j = 0
    const a = shuffleOptions(OPTIONS, 'C', { A: 'x' }, sabitRng);
    const b = shuffleOptions(OPTIONS, 'C', { A: 'x' }, sabitRng);
    expect(a).toEqual(b);
  });

  it('gerekçeler karıştırmadan sonra da doğru metne bağlı kalır', () => {
    const RATIONALE = { A: 'Elma yanılgısı', B: 'Armut yanılgısı', D: 'Erik yanılgısı' };
    for (let i = 0; i < 200; i++) {
      const r = shuffleOptions(OPTIONS, 'C', RATIONALE, Math.random);
      const metinToHarf: Record<string, string> = {};
      r.options.forEach((o) => { metinToHarf[o.text] = o.key; });
      expect(r.distractorRationale[metinToHarf['Elma']]).toBe('Elma yanılgısı');
      expect(r.distractorRationale[metinToHarf['Armut']]).toBe('Armut yanılgısı');
      expect(r.distractorRationale[metinToHarf['Erik']]).toBe('Erik yanılgısı');
      expect(r.distractorRationale[r.correctKey]).toBeUndefined();
    }
  });

  it('üç şıklı soruda da çalışır', () => {
    const uc = [{ key: 'A', text: 'x' }, { key: 'B', text: 'y' }, { key: 'C', text: 'z' }];
    const r = shuffleOptions(uc, 'B', undefined, Math.random);
    expect(r.options).toHaveLength(3);
    expect(r.options.find((o) => o.key === r.correctKey)?.text).toBe('y');
  });
});

// ============================================================================
// §41 — ÜÇ ÖLÇÜLMÜŞ SORUNUN SUNUCU TARAFI KORUMALARI
//
// NEDEN TEST: üçü de ölçme DOĞRULUĞUNA dokunuyor. Özellikle cevap anahtarı:
// yanlış anahtar öğrenciye yanlış puan olarak yansır ve sessizce olur.
// ============================================================================
import {
  cevapAnahtariGecerliMi,
  benzerlik,
  jetonla,
  makulSoruSayisi,
  BENZERLIK_ESIGI,
} from '../src/lib/guards';

describe('cevapAnahtariGecerliMi — §41 Madde 2: sessiz "A" düzeltmesi', () => {
  const OPT = [
    { key: 'A', text: 'Elma' }, { key: 'B', text: 'Armut' },
    { key: 'C', text: 'Kiraz' }, { key: 'D', text: 'Erik' },
  ];

  it('şıklarda BULUNAN anahtarı geçerli sayar', () => {
    expect(cevapAnahtariGecerliMi(OPT, 'A')).toBe(true);
    expect(cevapAnahtariGecerliMi(OPT, 'D')).toBe(true);
  });

  it('küçük harf ve boşluk toleranslıdır (gerçekten geçerli anahtarı reddetmez)', () => {
    expect(cevapAnahtariGecerliMi(OPT, 'c')).toBe(true);
    expect(cevapAnahtariGecerliMi(OPT, ' b ')).toBe(true);
  });

  it('şıklarda OLMAYAN anahtarların HEPSİNİ geçersiz sayar', () => {
    // Ölçülen gerçek durum: bunların beşi de sessizce "A" oluyordu.
    for (const g of ['E', 'Z', 'AB', '1', 'X']) {
      expect(cevapAnahtariGecerliMi(OPT, g)).toBe(false);
    }
  });

  it('boş / tanımsız anahtarı geçersiz sayar', () => {
    expect(cevapAnahtariGecerliMi(OPT, '')).toBe(false);
    expect(cevapAnahtariGecerliMi(OPT, undefined)).toBe(false);
  });

  it('3 şıklı soruda da doğru çalışır (D geçersiz olmalı)', () => {
    const uc = OPT.slice(0, 3);
    expect(cevapAnahtariGecerliMi(uc, 'C')).toBe(true);
    expect(cevapAnahtariGecerliMi(uc, 'D')).toBe(false);
  });
});

describe('benzerlik — §41 Madde 4: sunucu tarafı tekrar denetimi', () => {
  it('birebir aynı soru 1.0 döner', () => {
    const s = 'Sürtünme kuvvetinin büyüklüğü neye bağlıdır?';
    expect(benzerlik(s, s)).toBe(1);
  });

  it('anlamca aynı, cümlesi farklı sorular eşiği aşar', () => {
    const a = 'Sürtünme kuvvetinin büyüklüğü yüzeyin pürüzlülüğüne nasıl bağlıdır?';
    const b = 'Yüzeyin pürüzlülüğü sürtünme kuvvetinin büyüklüğünü nasıl etkiler?';
    expect(benzerlik(a, b)).toBeGreaterThanOrEqual(BENZERLIK_ESIGI);
  });

  it('FARKLI konudaki sorular eşiğin ALTINDA kalır (meşru soru elenmez)', () => {
    const a = 'Sürtünme kuvvetinin büyüklüğü neye bağlıdır?';
    const b = 'Fotosentez sürecinde klorofilin görevi nedir?';
    expect(benzerlik(a, b)).toBeLessThan(BENZERLIK_ESIGI);
  });

  it('ortak soru kalıbı iki soruyu benzer YAPMAZ', () => {
    // "Aşağıdakilerden hangisi ... nedir?" kalıbı elenmezse her soru benzer çıkardı.
    const a = 'Aşağıdakilerden hangisi sürtünme kuvvetinin bir sonucudur?';
    const b = 'Aşağıdakilerden hangisi fotosentezin bir ürünüdür?';
    expect(benzerlik(a, b)).toBeLessThan(BENZERLIK_ESIGI);
  });

  it('boş metinlerde 0 döner (çökmez)', () => {
    expect(benzerlik('', 'bir şey')).toBe(0);
    expect(benzerlik('bir şey', '')).toBe(0);
  });

  it('jetonla kısa sözcükleri ve durdurma sözcüklerini eler', () => {
    const j = jetonla('Bu bir ve ile için sürtünme kuvveti');
    expect(j.has('bu')).toBe(false);
    expect(j.has('ile')).toBe(false);
    expect(j.has('için')).toBe(false);
    expect(j.has('sürtünme')).toBe(true);
    expect(j.has('kuvveti')).toBe(true);
  });
});

describe('makulSoruSayisi — §41 Madde 5: metin uzunluğu / soru sayısı', () => {
  it('389 karakterlik metinde 8 soru istenemez', () => {
    // Kullanıcının bildirdiği gerçek durum.
    expect(makulSoruSayisi(389)).toBeLessThan(8);
  });

  it('uzun metinde daha çok soruya izin verir', () => {
    expect(makulSoruSayisi(2000)).toBeGreaterThan(makulSoruSayisi(400));
  });

  it('çok kısa metinde bile en az 2 soru verir (özellik kullanılamaz olmasın)', () => {
    expect(makulSoruSayisi(30)).toBe(2);
    expect(makulSoruSayisi(0)).toBe(2);
  });

  it('6000 karakterlik üst sınırda 8+4 istek tamamen karşılanır', () => {
    expect(makulSoruSayisi(6000)).toBeGreaterThanOrEqual(12);
  });
});

/* ===========================================================================
   §45 — metinDilUyarisi: DEĞERLENDİRME çıktısında yabancı alfabe
   ===========================================================================
   Bu testler gerçek bir sızıntıdan doğdu. README için canlı sistemden ekran
   görüntüsü alınırken, modelin ÖĞRENCİYE GİDECEK geri bildirim taslağında
   CJK karakteri çıktı:

     "Sürtünme kuvvetinin farklı durumlar下的 etkilerini düşün"

   §3.3'ün koruması vardı ama YALNIZCA soru üretimine bağlıydı; /evaluate
   çıktısı (gerekçe, kriter açıklamaları, geri bildirim taslağı) hiç
   denetlenmiyordu. Aşağıdaki ilk test o cümlenin kendisidir.                */
describe('metinDilUyarisi — model çıktısındaki yabancı alfabe (§45)', () => {
  it('🔴 canlıda GÖZLENEN sızıntıyı yakalar', () => {
    const gercekCikti =
      'Doğru bir başlangıç yaptın, şimdi açıklamana daha fazla örnek ve ayrıntı eklemeyi dene. ' +
      'Sürtünme kuvvetinin farklı durumlar下的 etkilerini düşün ve bunları açıklamana dahil et.';
    expect(metinDilUyarisi(gercekCikti)).toBe(true);
  });

  it('temiz Türkçe metinde uyarı vermez', () => {
    expect(metinDilUyarisi(
      'Öğrenci dengelenmemiş kuvvetlerin cismin hızını değiştirdiğini doğru açıklamıştır.',
      'Şıklar, çeldiriciler ve ölçüt açıklamaları eksiksiz.',
      'Çığır açan bir yanıt değil ama yeterli.'
    )).toBe(false);
  });

  it('metinlerden HERHANGİ BİRİ kirliyse uyarır — sıra fark etmez', () => {
    expect(metinDilUyarisi('temiz', 'temiz', 'Кирилл')).toBe(true);
    expect(metinDilUyarisi('Кирилл', 'temiz')).toBe(true);
  });

  it('null/undefined/boş güvenle işlenir (kriter gerekçesi boş dönebilir)', () => {
    expect(metinDilUyarisi(null, undefined, '')).toBe(false);
    expect(metinDilUyarisi()).toBe(false);
  });

  it('Kiril, Yunan, Arap ve Hangul da yakalanır', () => {
    expect(metinDilUyarisi('kuvvet ve hareket Кириллица')).toBe(true);
    expect(metinDilUyarisi('enerji αβγ dönüşümü')).toBe(true);
    expect(metinDilUyarisi('yanıt العربية içeriyor')).toBe(true);
    expect(metinDilUyarisi('한국어 karışmış')).toBe(true);
  });

  it('sayı, noktalama ve yüzde işareti temiz sayılır', () => {
    expect(metinDilUyarisi('6/8 puan (%40) — “iyi” denebilir; ancak…')).toBe(false);
  });
});
