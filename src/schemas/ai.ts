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
});

export type ModelQuestion = z.infer<typeof modelQuestionSchema>;
export type ModelEvaluation = z.infer<typeof modelEvaluationSchema>;
