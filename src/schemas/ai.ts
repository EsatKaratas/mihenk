// ============================================================================
// Zod şemaları — agents.md §7.2: doğrulamasız c.req.json() kullanımı yasaktır.
// ============================================================================

import { z } from 'zod';

/** agents.md §7.4: kaynak metin 6.000 karakterle sınırlıdır. */
export const MAX_SOURCE_CHARS = 6000;

export const generateQuestionsSchema = z.object({
  sourceText: z.string().min(30, 'Kaynak metin en az 30 karakter olmalıdır').max(MAX_SOURCE_CHARS),
  subject: z.string().min(1).max(80),
  grade: z.union([z.number().int().min(1).max(12), z.string().min(1).max(8)]),
  outcomeCode: z.string().min(1).max(40),
  outcomeLabel: z.string().min(1).max(200),
  mcCount: z.number().int().min(0).max(8).default(2),
  openCount: z.number().int().min(0).max(4).default(1),
  optionCount: z.number().int().min(3).max(5).default(4),
  docKey: z.string().min(1).max(120).default('default'),
});

export const rubricDraftSchema = z.object({
  questionBody: z.string().min(1).max(2000),
  outcomeLabel: z.string().max(200).default(''),
  subject: z.string().max(80).default(''),
  grade: z.union([z.number().int().min(1).max(12), z.string().max(8)]).default(''),
  maxScore: z.number().min(1).max(100).default(20),
});

/** Model çıktısı — ağırlıklar sunucuda 100'e normalleştirilir. */
export const modelRubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        weight: z.number().min(1).max(100),
        description: z.string().default(''),
      })
    )
    .min(2)
    .max(6),
});

export const sampleAnswersSchema = z.object({
  questionBody: z.string().min(1).max(2000),
  outcomeLabel: z.string().max(200).default(''),
  grade: z.union([z.number().int().min(1).max(12), z.string().max(8)]).default(''),
  levels: z.array(z.string().min(1).max(120)).min(1).max(8),
});

export const modelSampleAnswersSchema = z.object({
  answers: z.array(z.string().min(1).max(2000)).min(1).max(8),
});

/**
 * Kavram yanılgısı kümeleme girdisi.
 *
 * Öğrenci ADI GÖNDERİLMEZ — modele yalnızca anonim yanıt metinleri gider.
 * Amaç kimseyi işaretlemek değil, sınıfta tekrarlayan hatayı görmek.
 */
export const misconceptionsSchema = z.object({
  questionBody: z.string().min(1).max(2000),
  outcomeLabel: z.string().max(200).default(''),
  // En az 2 yanıt: tek yanıtta "tekrarlayan" bir yanılgı olamaz.
  answers: z.array(z.string().max(3000)).min(2).max(40),
});

/** Model çıktısı — güvenilmez, normalleştirilerek doğrulanır. */
export const modelMisconceptionsSchema = z.object({
  clusters: z
    .array(
      z.object({
        title: z.string().min(1).max(180),
        explanation: z.string().default(''),
        studentCount: z.number().int().min(1),
        evidence: z.array(z.string().max(240)).default([]),
        action: z.string().default(''),
      })
    )
    .max(6)
    .default([]),
  correctCount: z.number().int().min(0).catch(0),
});

/**
 * Kazanım-soru hizalama denetimi (içerik geçerliği).
 * candidates: modelin "daha uygun kazanım" önerisini seçebileceği liste.
 * Boşsa öneri istenmez — model kod UYDURAMASIN diye sunucuda da doğrulanır.
 */
export const alignmentSchema = z.object({
  outcomeCode: z.string().min(1).max(40),
  outcomeLabel: z.string().min(1).max(200),
  questions: z
    .array(
      z.object({
        type: z.enum(['mc', 'open']),
        body: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(12),
  candidates: z
    .array(z.object({ kod: z.string().min(1).max(40), metin: z.string().min(1).max(220) }))
    .max(60)
    .optional(),
});

export const modelAlignmentSchema = z.object({
  results: z
    .array(
      z.object({
        index: z.number().int(),
        karar: z.enum(['olcuyor', 'kismen', 'olcmuyor']).catch('kismen'),
        gerekce: z.string().default(''),
        onerilenKod: z.string().max(40).default(''),
      })
    )
    .default([]),
});

export const rubricCriterionSchema = z.object({
  label: z.string().min(1).max(120),
  weight: z.number().min(0).max(100),
});

export const evaluateSchema = z.object({
  questionBody: z.string().min(1).max(2000),
  // .min(1) YOK: Zod varsayılan değeri de doğrular, '' varsayılanı min(1)'e
  // takılıp alanı fiilen zorunlu hale getirirdi.
  outcomeLabel: z.string().max(200).default(''),
  studentAnswer: z.string().max(6000).default(''),
  maxScore: z.number().min(1).max(100),
  criteria: z.array(rubricCriterionSchema).min(1).max(8),
});

// --- Model çıktısı (güvenilmez — normalleştirilerek doğrulanır) -------------

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const BLOOMS = ['hatirlama', 'anlama', 'uygulama', 'analiz', 'degerlendirme', 'yaratma'] as const;

export const modelQuestionSchema = z.object({
  type: z.enum(['mc', 'open']),
  body: z.string().min(5),
  options: z.array(z.object({ key: z.string().min(1), text: z.string().min(1) })).optional(),
  correctKey: z.string().min(1).optional(),
  distractorRationale: z.record(z.string()).optional(),
  difficulty: z.enum(DIFFICULTIES).catch('medium'),
  bloom: z.enum(BLOOMS).catch('anlama'),
  aiTime: z.number().int().min(15).max(900).catch(60),
  /* Soru, kaynak metin öğrencinin önünde OLMADAN yanıtlanabilir mi?
     false ise sınavda öğrenciye kaynak metin de gösterilir. Model bu alanı
     unutabilir; sunucu ayrıca soru gövdesinden deterministik kontrol yapar. */
  needsSource: z.boolean().catch(false).default(false),
  refKeywords: z.array(z.string()).default([]),
});

export const modelQuestionsSchema = z.object({
  questions: z.array(modelQuestionSchema).min(1),
});

export const modelEvaluationSchema = z.object({
  breakdown: z
    .array(
      z.object({
        label: z.string().min(1),
        points: z.number(),
        reason: z.string().default(''),
      })
    )
    .min(1),
  justification: z.string().default(''),
  confidence: z.number().min(0).max(1).catch(0.5),
  // Model, öğrenci yanıtının kendisine talimat vermeye çalıştığını bildirir.
  // Bu bir ENGELLEME değildir — öğretmene sunulan bir SİNYALDİR (agents.md
  // §7.1 ile aynı mantık: karar insanda kalır). Alan yoksa false kabul edilir,
  // eski istemci sürümleri bozulmaz.
  injectionAttempt: z.boolean().catch(false).default(false),
});

export type ModelQuestion = z.infer<typeof modelQuestionSchema>;
export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;
