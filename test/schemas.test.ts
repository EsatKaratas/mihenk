// ============================================================================
// Zod şema testleri — agents.md §7.2: doğrulamasız c.req.json() yasak.
// Bu testler şemaların GERÇEKTEN koruduğunu doğrular; "şema var" demek
// yeterli değil, sınırların çalıştığı gösterilmelidir.
//
// PROGRESS §5 madde 6'da kayıtlı bir hata bu tür bir testle yakalanırdı:
// evaluate.outcomeLabel `.min(1).default('')` idi; Zod varsayılanı da
// doğruladığı için opsiyonel alan fiilen zorunlu olmuştu.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  generateQuestionsSchema,
  evaluateSchema,
  misconceptionsSchema,
  alignmentSchema,
  modelQuestionSchema,
  modelEvaluationSchema,
  modelAlignmentSchema,
  MAX_SOURCE_CHARS,
} from '../src/schemas/ai';

describe('generateQuestionsSchema', () => {
  const gecerli = {
    sourceText: 'Sürtünme kuvveti hareketi engelleyen bir kuvvettir ve yüzeylere bağlıdır.',
    subject: 'Fen Bilimleri',
    grade: 7,
    outcomeCode: 'FEN.7.1.2',
    outcomeLabel: 'Sürtünme kuvvetinin etkilerini açıklar',
  };

  it('geçerli gövdeyi kabul eder ve varsayılanları doldurur', () => {
    const r = generateQuestionsSchema.parse(gecerli);
    expect(r.mcCount).toBe(2);
    expect(r.openCount).toBe(1);
    expect(r.optionCount).toBe(4);
    expect(r.docKey).toBe('default');
  });

  it('30 karakterden kısa kaynak metni reddeder', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, sourceText: 'kısa' }).success).toBe(false);
  });

  it(`kaynak metni ${MAX_SOURCE_CHARS} karakterle sınırlar (agents.md §7.4)`, () => {
    const uzun = 'a'.repeat(MAX_SOURCE_CHARS + 1);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, sourceText: uzun }).success).toBe(false);
  });

  it('sınıf hem sayı hem metin olabilir', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, grade: 7 }).success).toBe(true);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, grade: '7' }).success).toBe(true);
  });

  it('sınıf aralığını korur (0 ve 13 geçersiz)', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, grade: 0 }).success).toBe(false);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, grade: 13 }).success).toBe(false);
  });

  it('soru adedi üst sınırlarını korur', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, mcCount: 9 }).success).toBe(false);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, openCount: 5 }).success).toBe(false);
  });

  it('şık sayısını 3-5 aralığında tutar', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, optionCount: 2 }).success).toBe(false);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, optionCount: 6 }).success).toBe(false);
  });

  // Madde 2: topicArea ve bloomFocus tamamen opsiyonel ek bağlam/yönlendirme.
  it('topicArea opsiyoneldir; verilmezse geçerlidir ve alanda yer almaz', () => {
    const r = generateQuestionsSchema.parse(gecerli);
    expect(r.topicArea).toBeUndefined();
  });

  it('bloomFocus verilmezse "dengeli" varsayılanına düşer', () => {
    const r = generateQuestionsSchema.parse(gecerli);
    expect(r.bloomFocus).toBe('dengeli');
  });

  it('bloomFocus yalnızca tanımlı üç değeri kabul eder', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, bloomFocus: 'temel' }).success).toBe(true);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, bloomFocus: 'ust' }).success).toBe(true);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, bloomFocus: 'yuksek' }).success).toBe(false);
  });

  it('topicArea 120 karakterle sınırlıdır', () => {
    expect(generateQuestionsSchema.safeParse({ ...gecerli, topicArea: 'a'.repeat(121) }).success).toBe(false);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, topicArea: 'Okuma' }).success).toBe(true);
  });

  // Paket 4c — Tekrar Önleme (dedup): excludeQuestions opsiyoneldir ve
  // geriye dönük uyumluluk için varsayılanı boş dizidir.
  it('excludeQuestions opsiyoneldir ve varsayılanı boş dizidir', () => {
    const r = generateQuestionsSchema.parse(gecerli);
    expect(r.excludeQuestions).toEqual([]);
  });

  it('excludeQuestions verilirse istem oluşturma için korunur', () => {
    const r = generateQuestionsSchema.parse({ ...gecerli, excludeQuestions: ['Önceki soru 1', 'Önceki soru 2'] });
    expect(r.excludeQuestions).toEqual(['Önceki soru 1', 'Önceki soru 2']);
  });

  it('excludeQuestions 50 öğeyle sınırlıdır', () => {
    const cok = Array.from({ length: 51 }, (_, i) => `soru ${i}`);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, excludeQuestions: cok }).success).toBe(false);
  });

  it('excludeQuestions içindeki bir öğe 2000 karakteri aşarsa reddeder', () => {
    const uzunSoru = 'a'.repeat(2001);
    expect(generateQuestionsSchema.safeParse({ ...gecerli, excludeQuestions: [uzunSoru] }).success).toBe(false);
  });
});

describe('evaluateSchema', () => {
  const gecerli = {
    questionBody: 'Sürtünmeyi açıklayınız.',
    maxScore: 20,
    criteria: [{ label: 'Doğruluk', weight: 100 }],
  };

  it('opsiyonel outcomeLabel gerçekten opsiyonel', () => {
    // PROGRESS §5 madde 6: .min(1).default('') yüzünden bu alan bir dönem
    // fiilen zorunlu olmuştu. Bu test o regresyonu yakalar.
    const r = evaluateSchema.parse(gecerli);
    expect(r.outcomeLabel).toBe('');
  });

  it('boş öğrenci yanıtını kabul eder (boş yanıt 0 puandır, hata değil)', () => {
    const r = evaluateSchema.parse({ ...gecerli, studentAnswer: '' });
    expect(r.studentAnswer).toBe('');
  });

  it('kriter listesi boş olamaz', () => {
    expect(evaluateSchema.safeParse({ ...gecerli, criteria: [] }).success).toBe(false);
  });

  it('maxScore zorunlu ve 1-100 arası', () => {
    expect(evaluateSchema.safeParse({ ...gecerli, maxScore: undefined }).success).toBe(false);
    expect(evaluateSchema.safeParse({ ...gecerli, maxScore: 0 }).success).toBe(false);
    expect(evaluateSchema.safeParse({ ...gecerli, maxScore: 101 }).success).toBe(false);
  });

  it('geçici forceFallback alanı KALDIRILDI (üretimde bulunmamalı)', () => {
    const r = evaluateSchema.parse({ ...gecerli, forceFallback: true } as never);
    expect((r as Record<string, unknown>).forceFallback).toBeUndefined();
  });
});

describe('misconceptionsSchema', () => {
  it('tek yanıtı reddeder — "tekrarlayan" yanılgı için en az iki gerekir', () => {
    const r = misconceptionsSchema.safeParse({ questionBody: 'Soru', answers: ['tek yanıt'] });
    expect(r.success).toBe(false);
  });

  it('iki yanıtı kabul eder', () => {
    expect(misconceptionsSchema.safeParse({ questionBody: 'Soru', answers: ['a', 'b'] }).success).toBe(true);
  });

  it('40 yanıttan fazlasını reddeder', () => {
    const cok = Array.from({ length: 41 }, (_, i) => 'yanıt ' + i);
    expect(misconceptionsSchema.safeParse({ questionBody: 'Soru', answers: cok }).success).toBe(false);
  });
});

describe('alignmentSchema', () => {
  const gecerli = {
    outcomeCode: 'T.O.7.5',
    outcomeLabel: 'Metnin yüzey anlamını belirleyebilme',
    questions: [{ type: 'mc' as const, body: 'Soru metni' }],
  };

  it('geçerli gövdeyi kabul eder', () => {
    expect(alignmentSchema.safeParse(gecerli).success).toBe(true);
  });

  it('soru listesi boş olamaz', () => {
    expect(alignmentSchema.safeParse({ ...gecerli, questions: [] }).success).toBe(false);
  });

  it('yalnızca mc ve open tiplerini kabul eder', () => {
    const r = alignmentSchema.safeParse({
      ...gecerli,
      questions: [{ type: 'matching', body: 'x' }],
    });
    expect(r.success).toBe(false);
  });

  it('aday listesi opsiyoneldir (yoksa öneri istenmez)', () => {
    expect(alignmentSchema.parse(gecerli).candidates).toBeUndefined();
  });
});

describe('model çıktı şemaları — güvenilmez veriyi normalleştirir', () => {
  it('modelQuestionSchema geçersiz zorluk/bloom değerini varsayılana çeker', () => {
    const r = modelQuestionSchema.parse({
      type: 'mc',
      body: 'Yeterince uzun bir soru metni',
      difficulty: 'imkansiz',
      bloom: 'telepati',
      aiTime: 60,
    });
    expect(r.difficulty).toBe('medium');
    expect(r.bloom).toBe('anlama');
  });

  it('modelQuestionSchema needsSource varsayılanı false', () => {
    const r = modelQuestionSchema.parse({ type: 'open', body: 'Açıklayınız lütfen', aiTime: 120 });
    expect(r.needsSource).toBe(false);
  });

  it('modelQuestionSchema aiTime aralık dışını varsayılana çeker', () => {
    const r = modelQuestionSchema.parse({ type: 'mc', body: 'Soru metni burada', aiTime: 99999 });
    expect(r.aiTime).toBe(60);
  });

  it('modelEvaluationSchema aralık dışı confidence değerini 0.5 yapar', () => {
    const r = modelEvaluationSchema.parse({
      breakdown: [{ label: 'K', points: 5 }],
      confidence: 7,
    });
    expect(r.confidence).toBe(0.5);
  });

  it('modelEvaluationSchema studentFeedback varsayılanı boş dize', () => {
    const r = modelEvaluationSchema.parse({ breakdown: [{ label: 'K', points: 5 }] });
    expect(r.studentFeedback).toBe('');
    expect(r.injectionAttempt).toBe(false);
  });

  it('modelEvaluationSchema breakdown boş olamaz', () => {
    expect(modelEvaluationSchema.safeParse({ breakdown: [] }).success).toBe(false);
  });

  it('modelAlignmentSchema geçersiz kararı kismen yapar', () => {
    const r = modelAlignmentSchema.parse({
      results: [{ index: 1, karar: 'bilmiyorum', gerekce: 'x' }],
    });
    expect(r.results[0].karar).toBe('kismen');
  });

  it('modelAlignmentSchema results yoksa boş dizi verir', () => {
    expect(modelAlignmentSchema.parse({}).results).toEqual([]);
  });
});

// ============================================================================
// §31 — generateQuestionsSchema: üretim dayanağı (mod) ve yönerge.
//
// NEDEN: 30 karakter alt sınırı alanın kendi .min(30)'undan superRefine'a
// taşındı. Bu tür bir taşıma sessizce GEVŞEYEBİLİR (kural hiç uygulanmaz)
// ya da SIKILAŞABİLİR (yeni mod da reddedilir). İkisi de test edilir.
// ============================================================================
describe('generateQuestionsSchema — §31 üretim dayanağı', () => {
  const temel = {
    subject: 'Fen Bilimleri',
    grade: 7,
    outcomeCode: 'FEN.7.1.2',
    outcomeLabel: 'Sürtünme kuvvetinin etkilerini açıklar',
  };

  it('mod verilmezse "kaynak" varsayılır (geriye dönük uyumluluk)', () => {
    const r = generateQuestionsSchema.safeParse({
      ...temel,
      sourceText: 'Sürtünme kuvveti hareketi yavaşlatan bir kuvvettir ve yüzeye bağlıdır.',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('kaynak');
      expect(r.data.guidance).toBeUndefined();
    }
  });

  it('kaynak modunda 30 karakter kuralı HÂLÂ uygulanır', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, sourceText: 'kısa' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.join('.') === 'sourceText')).toBe(true);
    }
  });

  it('kaynak modunda kaynak metin HİÇ gönderilmezse reddedilir', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, mode: 'kaynak' });
    expect(r.success).toBe(false);
  });

  it('kaynak modunda yalnızca boşluktan oluşan metin reddedilir', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, mode: 'kaynak', sourceText: ' '.repeat(80) });
    expect(r.success).toBe(false);
  });

  it('kazanım modunda kaynak metin GEREKMEZ — 30 karakter sınırı yoktur', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, mode: 'kazanim' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('kazanim');
      expect(r.data.sourceText).toBe('');
    }
  });

  it('kazanım modunda kısa bir metin gönderilse bile reddedilmez', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, mode: 'kazanim', sourceText: 'ab' });
    expect(r.success).toBe(true);
  });

  it('yönerge kabul edilir ve 600 karakterle sınırlıdır', () => {
    const ok = generateQuestionsSchema.safeParse({
      ...temel,
      mode: 'kazanim',
      guidance: 'Günlük hayattan örneklerle, grafik yorumlatan sorular olsun.',
    });
    expect(ok.success).toBe(true);

    const uzun = generateQuestionsSchema.safeParse({
      ...temel,
      mode: 'kazanim',
      guidance: 'a'.repeat(601),
    });
    expect(uzun.success).toBe(false);
  });

  it('bilinmeyen bir mod reddedilir (sessizce kaynağa düşmez)', () => {
    const r = generateQuestionsSchema.safeParse({ ...temel, mode: 'serbest', sourceText: 'x'.repeat(50) });
    expect(r.success).toBe(false);
  });

  it('kazanım modunda kazanım alanları hâlâ ZORUNLUDUR (dayanak onlar)', () => {
    const r = generateQuestionsSchema.safeParse({
      subject: 'Fen Bilimleri',
      grade: 7,
      mode: 'kazanim',
    });
    expect(r.success).toBe(false);
  });
});
