// ============================================================================
// T3 Vakfı Creathon — Problem 2
// AI rotaları: soru üretimi ve açık uçlu yanıt ön değerlendirmesi
//
// Human-in-the-Loop (agents.md §7.1): Buradaki hiçbir uç nokta nihai karar
// üretmez. Üretilen sorular "ai_generated", önerilen puanlar "öneri" olarak
// döner; onay zinciri istemci ve veritabanı tarafında yürür.
// ============================================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  buildQuestionPrompt,
  buildEvaluationPrompt,
  buildRubricPrompt,
  buildSampleAnswerPrompt,
} from '../lib/prompts';
import { callModelJson, providerName, modelName, fallbackConfigured, fallbackEnv, type AiEnv } from '../lib/ai';
import {
  generateQuestionsSchema,
  evaluateSchema,
  modelQuestionsSchema,
  modelEvaluationSchema,
  rubricDraftSchema,
  modelRubricSchema,
  sampleAnswersSchema,
  modelSampleAnswersSchema,
} from '../schemas/ai';

type Bindings = AiEnv & { DB?: D1Database };

// --- agents.md §7.4: aynı kaynak doküman için dakikada en fazla 5 istek ------
const RATE_LIMIT_PER_MIN = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const win = (hits.get(key) || []).filter((t) => now - t < 60_000);
  if (win.length >= RATE_LIMIT_PER_MIN) {
    hits.set(key, win);
    return true;
  }
  win.push(now);
  hits.set(key, win);
  return false;
}

const round05 = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * agents.md §2: her hata yanıtı { error, message } biçiminde döner.
 * zValidator'ın varsayılan çıktısı ({ success, error: { issues } }) bu kurala
 * uymadığı için tüm doğrulama hataları burada normalleştirilir.
 */
const onInvalid = (result: { success: boolean; error?: { issues?: Array<{ path: (string | number)[]; message: string }> } }, c: any) => {
  if (result.success) return;
  const issues = result.error?.issues ?? [];
  const detay = issues
    .map((i) => `${i.path.join('.') || 'gövde'}: ${i.message}`)
    .join('; ');
  return c.json(
    { error: 'validation_failed', message: detay || 'İstek gövdesi geçersiz.' },
    400
  );
};

const ai = new Hono<{ Bindings: Bindings }>();

/** Sağlayıcı/model bilgisi — arayüzdeki "AI modu" rozeti bunu okur. */
ai.get('/status', (c) => {
  const yedek = fallbackEnv(c.env);
  return c.json({
    provider: providerName(c.env),
    model: modelName(c.env),
    ready: providerName(c.env) === 'workers-ai' ? !!c.env.AI : !!c.env.AI_API_KEY,
    fallback: fallbackConfigured(c.env)
      ? { provider: providerName(yedek!), model: modelName(yedek!) }
      : null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/ai/generate-questions
// ---------------------------------------------------------------------------
ai.post('/generate-questions', zValidator('json', generateQuestionsSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');

  if (rateLimited(`gen:${b.docKey}`)) {
    return c.json(
      { error: 'rate_limited', message: `Aynı kaynak için dakikada en fazla ${RATE_LIMIT_PER_MIN} üretim isteği gönderilebilir.` },
      429
    );
  }

  const total = b.mcCount + b.openCount;
  if (total < 1) {
    return c.json({ error: 'invalid_request', message: 'En az bir soru istenmelidir.' }, 400);
  }

  const prompt = buildQuestionPrompt(
    {
      subject: b.subject,
      grade: b.grade,
      outcomeCode: b.outcomeCode,
      outcomeLabel: b.outcomeLabel,
      mcCount: b.mcCount,
      openCount: b.openCount,
      optionCount: b.optionCount,
    },
    b.sourceText
  );

  // agents.md §7.4: max_tokens açıkça verilir.
  // Ölçüm notu: soru başına yalnızca gövde+şıklar değil, her çeldirici için bir
  // gerekçe cümlesi de üretiliyor. 220 tok/soru ile yanıt ortada kesiliyordu ve
  // JSON ayrıştırması ilk denemede başarısız olup gereksiz bir retry'a yol
  // açıyordu (gözlemlenen: 27 sn / 2 deneme). 420 tok/soru ile tek denemede
  // tamamlanıyor.
  const maxTokens = clamp(600 + total * 420, 1200, 3000);

  try {
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens, temperature: 0.5 });
    const parsed = modelQuestionsSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    const letters = 'ABCDE'.split('');
    const questions = parsed.data.questions
      .map((q) => {
        if (q.type === 'mc') {
          const opts = (q.options || []).slice(0, b.optionCount);
          if (opts.length < 3) return null;
          // Anahtarları A,B,C,... olarak normalleştir; doğru şıkkın yeni
          // anahtarını eski konumundan taşı.
          const oldKeys = opts.map((o) => String(o.key).trim().toUpperCase());
          const correctIdx = Math.max(0, oldKeys.indexOf(String(q.correctKey || '').trim().toUpperCase()));
          const options = opts.map((o, i) => ({ key: letters[i], text: String(o.text).trim() }));
          const rationale: Record<string, string> = {};
          if (q.distractorRationale) {
            oldKeys.forEach((ok, i) => {
              const val = q.distractorRationale?.[ok] ?? q.distractorRationale?.[letters[i]];
              if (val && i !== correctIdx) rationale[letters[i]] = String(val);
            });
          }
          return {
            type: 'mc' as const,
            body: String(q.body).trim(),
            options,
            correctKey: letters[correctIdx],
            distractorRationale: rationale,
            difficulty: q.difficulty,
            bloom: q.bloom,
            aiTime: clamp(q.aiTime, 30, 180),
            refKeywords: q.refKeywords.slice(0, 6),
          };
        }
        return {
          type: 'open' as const,
          body: String(q.body).trim(),
          difficulty: q.difficulty,
          bloom: q.bloom,
          aiTime: clamp(q.aiTime, 90, 600),
          refKeywords: q.refKeywords.slice(0, 6),
        };
      })
      .filter(Boolean);

    if (!questions.length) {
      return c.json({ error: 'model_output_empty', message: 'Kullanılabilir soru üretilemedi.' }, 502);
    }

    return c.json({
      questions,
      meta: { provider: usedProvider, model: usedModel, attempts, fellBack },
    });
  } catch (e) {
    return c.json(
      { error: 'ai_call_failed', message: e instanceof Error ? e.message : 'Model çağrısı başarısız oldu.' },
      502
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/evaluate
// ---------------------------------------------------------------------------
ai.post('/evaluate', zValidator('json', evaluateSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');

  // Kriter başına tavan puan — modelin döndürdüğü değer bununla kırpılır.
  const maxOf = (weight: number) => Math.round(b.maxScore * (Number(weight) / 100) * 10) / 10;

  // Boş yanıt için model çağrısı yapmaya gerek yok (token tasarrufu).
  if (!b.studentAnswer.trim()) {
    return c.json({
      aiScore: 0,
      maxScore: b.maxScore,
      justification: 'Yanıt boş bırakıldığı için kriterlerin hiçbirinde puan verilemedi.',
      confidence: 1,
      breakdown: b.criteria.map((cr) => ({
        label: cr.label,
        weight: cr.weight,
        max: maxOf(cr.weight),
        points: 0,
        reason: 'Yanıt boş.',
      })),
      meta: { provider: providerName(c.env), model: modelName(c.env), skipped: true },
    });
  }

  const prompt = buildEvaluationPrompt({
    questionBody: b.questionBody,
    outcomeLabel: b.outcomeLabel,
    maxScore: b.maxScore,
    criteria: b.criteria,
    studentAnswer: b.studentAnswer,
  });

  try {
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens: 700, temperature: 0.2 });
    const parsed = modelEvaluationSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    const norm = (s: string) => s.toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
    const returned = parsed.data.breakdown;

    const breakdown = b.criteria.map((cr, i) => {
      const max = maxOf(cr.weight);
      const found =
        returned.find((r) => norm(r.label) === norm(cr.label)) ?? returned[i] ?? null;
      const points = found ? round05(clamp(Number(found.points) || 0, 0, max)) : 0;
      return {
        label: cr.label,
        weight: cr.weight,
        max,
        points,
        reason: found?.reason?.trim() || '',
      };
    });

    const aiScore = round05(breakdown.reduce((s, x) => s + x.points, 0));

    return c.json({
      aiScore,
      maxScore: b.maxScore,
      justification: parsed.data.justification.trim(),
      confidence: parsed.data.confidence,
      injectionAttempt: parsed.data.injectionAttempt,
      breakdown,
      meta: { provider: usedProvider, model: usedModel, attempts, fellBack },
    });
  } catch (e) {
    return c.json(
      { error: 'ai_call_failed', message: e instanceof Error ? e.message : 'Model çağrısı başarısız oldu.' },
      502
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/rubric  — rubrik TASLAĞI önerisi
// Öğretmen kriterleri ve ağırlıkları değiştirebilir; ağırlık toplamı %100
// olmadan sınav yayınlanamaz (agents.md §7.1: nihai karar insanda).
// ---------------------------------------------------------------------------
ai.post('/rubric', zValidator('json', rubricDraftSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');
  try {
    const prompt = buildRubricPrompt({
      questionBody: b.questionBody,
      outcomeLabel: b.outcomeLabel,
      subject: b.subject,
      grade: b.grade,
      maxScore: b.maxScore,
    });
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens: 600, temperature: 0.3 });
    const parsed = modelRubricSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    // Ağırlıklar 100'e normalleştirilir: model toplamı tutturamayabilir ve
    // arayüz %100 olmadan yayına izin vermez.
    const ham = parsed.data.criteria.map((x) => ({
      label: x.label.trim(),
      weight: Math.max(1, Math.round(x.weight)),
      description: (x.description || '').trim(),
    }));
    const toplam = ham.reduce((s, x) => s + x.weight, 0);
    let olcekli = ham.map((x) => ({ ...x, weight: Math.max(1, Math.round((x.weight / toplam) * 100)) }));
    const fark = 100 - olcekli.reduce((s, x) => s + x.weight, 0);
    if (fark !== 0 && olcekli.length) {
      // Farkı en büyük ağırlıklı kritere ekleyerek toplamı tam 100 yap.
      let enBuyuk = 0;
      olcekli.forEach((x, i) => { if (x.weight > olcekli[enBuyuk].weight) enBuyuk = i; });
      olcekli[enBuyuk] = { ...olcekli[enBuyuk], weight: Math.max(1, olcekli[enBuyuk].weight + fark) };
    }

    return c.json({
      criteria: olcekli,
      meta: { provider: usedProvider, model: usedModel, attempts, fellBack },
    });
  } catch (e) {
    return c.json(
      { error: 'ai_call_failed', message: e instanceof Error ? e.message : 'Model çağrısı başarısız oldu.' },
      502
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/sample-answers — SİMÜLE EDİLMİŞ sınıf için örnek yanıtlar
//
// Analiz ekranlarının anlamlı olması için tek öğrenci yetmiyor. Bu uç, farklı
// başarı düzeylerinde gerçekçi öğrenci yanıtları üretir; böylece sınıf
// ortalamaları uydurma sabit veriden değil, GERÇEK değerlendirmelerden
// hesaplanır. Üretilen yanıtlar gerçek öğrencilere ait değildir ve arayüzde
// "simüle edilmiş sınıf verisi" olarak işaretlenir.
// ---------------------------------------------------------------------------
ai.post('/sample-answers', zValidator('json', sampleAnswersSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');
  try {
    const prompt = buildSampleAnswerPrompt({
      questionBody: b.questionBody,
      outcomeLabel: b.outcomeLabel,
      grade: b.grade,
      levels: b.levels,
    });
    // Düzey başına ~140 token; taban 500.
    const maxTokens = clamp(500 + b.levels.length * 140, 700, 2000);
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens, temperature: 0.8 });
    const parsed = modelSampleAnswersSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }
    // İstenen düzey sayısına hizala: eksikse son yanıtı tekrar etme, kırp.
    const answers = parsed.data.answers.slice(0, b.levels.length).map((s) => s.trim());
    return c.json({
      answers,
      simulated: true,
      meta: { provider: usedProvider, model: usedModel, attempts, fellBack },
    });
  } catch (e) {
    return c.json(
      { error: 'ai_call_failed', message: e instanceof Error ? e.message : 'Model çağrısı başarısız oldu.' },
      502
    );
  }
});

export default ai;
