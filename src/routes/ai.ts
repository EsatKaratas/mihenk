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
  buildMisconceptionPrompt,
  buildAlignmentPrompt,
} from '../lib/prompts';
import {
  callModelJson, providerName, modelName, fallbackConfigured, fallbackEnv,
  fallbackSorunu, saglayiciHazirMi, type AiEnv,
} from '../lib/ai';
import {
  RATE_LIMIT_PER_MIN,
  RATE_LIMIT_EVAL_PER_MIN,
  rateLimited as rateLimitedRaw,
  soruDilUyarisi,
  anahtarla,
  round05,
  clamp,
  kaynakGerektirirMi,
  shuffleOptions,
  cevapAnahtariGecerliMi,
  benzerlik,
  BENZERLIK_ESIGI,
  makulSoruSayisi,
} from '../lib/guards';
import {
  generateQuestionsSchema,
  evaluateSchema,
  modelQuestionsSchema,
  modelEvaluationSchema,
  rubricDraftSchema,
  modelRubricSchema,
  sampleAnswersSchema,
  modelSampleAnswersSchema,
  misconceptionsSchema,
  modelMisconceptionsSchema,
  alignmentSchema,
  modelAlignmentSchema,
  MAX_SOURCE_CHARS,
} from '../schemas/ai';

type Bindings = AiEnv;

// Hız sınırı, kaynak metin tespiti ve sayısal yardımcılar ayrı bir modülde:
// dışa açık olmadıkları için test edilemiyorlardı (agents.md §6 birim testi
// zorunlu tutuyor). Bkz. src/lib/guards.ts ve test/guards.test.ts.
const hits = new Map<string, number[]>();
const rateLimited = (key: string, limit: number = RATE_LIMIT_PER_MIN) =>
  rateLimitedRaw(hits, key, limit);

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
    // §42: ham `!!c.env.AI_API_KEY` yerine `saglayiciHazirMi()` — BOM'lu ya da
    // yalnızca boşluktan oluşan bir anahtar artık "hazır" görünmüyor
    // (bkz. src/lib/ai.ts temizAnahtar notu: bu tuzağa bir kez düşüldü).
    ready: saglayiciHazirMi(c.env),
    fallback: fallbackConfigured(c.env)
      ? { provider: providerName(yedek!), model: modelName(yedek!) }
      : null,
    /* §42: yedek TANIMLI ama KULLANILAMAZ durumu artık sessiz kalmıyor.
       Boş dönerse söylenecek bir şey yok; dolu dönerse arayüz bunu
       yapılandırma uyarısı olarak gösterir (bkz. public/app.js
       aiAyrintiHtml). §6.3-5 sessiz düşüş yasağı. */
    fallbackSorunu: fallbackSorunu(c.env),
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

  /* §31 — KAZANIM MODU İKİNCİ KATMAN. İstem modele "metne atıf yapma ve
     needsSource'u false yaz" diyor, ama istem tek başına GARANTİ DEĞİLDİR:
     model yine "Metne göre..." yazabilir ve o zaman kaynakGerektirirMi()
     deterministik olarak true döndürürdü. Bu modda gösterilecek bir metin
     olmadığı için öğrenci ekranında "Bu soru bir metne dayanıyor ama metin
     bulunamadı" kutusu çıkardı — yani sessiz değil ama YANLIŞ bir durum.
     Bu yüzden needsSource burada koşulsuz false'a sabitlenir.
     (Soru gövdesi yine de metne atıf içerebilir; onu İçerik Uzmanı onay
     ekranında görür ve reddedebilir — karar yine insanda, agents.md §1.) */
  const kazanimModu = b.mode === 'kazanim';

  /* §41 Madde 5 — SORU SAYISI / METİN UZUNLUĞU DENGESİ.
     Kısa bir metinden çok soru istendiğinde model aynı şeyi tekrar sorar.
     İstek burada kısıtlanır; SESSİZCE değil — kaç sorunun neden düştüğü
     yanıtın meta alanında döner ve arayüz bunu kullanıcıya yazar.
     Kazanım modunda kaynak metin YOKTUR, dolayısıyla bu sınır uygulanmaz:
     dayanak MEB kazanımıdır, uzunluğu ölçülecek bir metin yok. */
  const istenenToplam = b.mcCount + b.openCount;
  const ustSinir = kazanimModu ? istenenToplam : makulSoruSayisi(b.sourceText.trim().length);
  let mcSayi = b.mcCount;
  let openSayi = b.openCount;
  let kisiltmaNotu: string | null = null;
  if (istenenToplam > ustSinir) {
    // Açık uçlu soru daha değerlidir (üst düzey ölçer); önce ÇSS kısılır.
    const dusecek = istenenToplam - ustSinir;
    const mcDusen = Math.min(dusecek, mcSayi);
    mcSayi -= mcDusen;
    openSayi -= dusecek - mcDusen;
    if (mcSayi + openSayi < 1) { mcSayi = 1; openSayi = 0; }
    kisiltmaNotu =
      `Kaynak metin ${b.sourceText.trim().length} karakter. Bu uzunlukta ` +
      `${ustSinir} soruluk özgün içerik var; ${istenenToplam} soru istendiği için ` +
      `${istenenToplam - (mcSayi + openSayi)} soru düşürüldü. Daha fazla soru için metni uzatın.`;
  }

  const prompt = buildQuestionPrompt(
    {
      subject: b.subject,
      grade: b.grade,
      outcomeCode: b.outcomeCode,
      outcomeLabel: b.outcomeLabel,
      mcCount: mcSayi,
      openCount: openSayi,
      optionCount: b.optionCount,
      // Madde 2: ikisi de opsiyonel ek bağlam/yönlendirmedir; JSON çıktı
      // şemasını değiştirmez (bkz. src/lib/prompts.ts QuestionSpec notu).
      topicArea: b.topicArea,
      bloomFocus: b.bloomFocus,
      excludeQuestions: b.excludeQuestions,
      // §31: üretim dayanağı ve (yalnızca kazanım modunda) öğretmen yönergesi.
      mode: b.mode,
      guidance: b.guidance,
    },
    b.sourceText
  );

  // agents.md §7.4: max_tokens açıkça verilir.
  // Ölçüm notu: soru başına yalnızca gövde+şıklar değil, her çeldirici için bir
  // gerekçe cümlesi de üretiliyor. 220 tok/soru ile yanıt ortada kesiliyordu ve
  // JSON ayrıştırması ilk denemede başarısız olup gereksiz bir retry'a yol
  // açıyordu (gözlemlenen: 27 sn / 2 deneme). 420 tok/soru ile tek denemede
  // tamamlanıyor.
  // §32 (Burak Modül 5): tekrar önleme listesi istemi büyütür; her önceki
  // soru için küçük bir pay eklenir ve üst sınır 3000 → 3400'e çıkar, aksi
  // halde uzun bir dedup listesinde yanıt yine ortada kesilebilirdi.
  // §41 Madde 5: token payı KISITLANMIŞ sayıya göre hesaplanır; aksi hâlde
  // düşürülen sorular için boşuna token ayrılırdı.
  const maxTokens = clamp(600 + (mcSayi + openSayi) * 420 + (b.excludeQuestions?.length || 0) * 12, 1200, 3400);

  // §44: kullanılamaz biçimde dönen (şıkkı eksik) soru sayısı — meta ile bildirilir.
  let elenenGecersiz = 0;

  try {
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens, temperature: 0.5 });
    const parsed = modelQuestionsSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    const questions = parsed.data.questions
      .map((q) => {
        if (q.type === 'mc') {
          const opts = (q.options || []).slice(0, b.optionCount);
          /* §44 — BU ELEME ARTIK SESSİZ DEĞİL.
             Model 3'ten az şıklı bir ÇSS döndürürse soru kullanılamaz ve
             burada düşer. §41 tekrar elemesi ve sayı kısıtlaması için özenle
             kurulan "sebebini söyle" kuralı bu yola UYGULANMAMIŞTI: kullanıcı
             5 soru isteyip 3 alıyor ve hiçbir açıklama görmüyordu (§6.3-5).
             Sayaç aşağıda meta.elenenGecersiz olarak döner. */
          if (opts.length < 3) { elenenGecersiz++; return null; }
          /* §32 (Burak Modül 4): şıklar burada hem A,B,C,... olarak
             normalleştirilir HEM DE rastgele karıştırılır. Eskiden yalnızca
             normalleştirme vardı; modelin kendi seçtiği KONUM korunuyordu ve
             doğru cevap sistematik olarak aynı harfe düşebiliyordu.
             `shuffleOptions` doğru cevabı ve çeldirici gerekçelerini
             İÇERİĞE göre yeni harfe taşır (bkz. src/lib/guards.ts).

             Bu, karıştırmanın TEK yetkili noktasıdır: istemci canlı AI
             yolunda ayrıca karıştırma yapmaz (bkz. public/app.js
             `aiGenerateQuestions` — çift karıştırmayı önlemek için). */
          const trimmedOpts = opts.map((o) => ({
            key: String(o.key).trim().toUpperCase(),
            text: String(o.text).trim(),
          }));
          /* §41 Madde 2 — GEÇERSİZ CEVAP ANAHTARI ARTIK SESSİZ DEĞİL.
             `remapOptionsByOrder` şıklarda bulunmayan bir correctKey'i
             sessizce İLK ŞIKKA düşürüyordu (ölçüldü: 'E','Z','','AB','1'
             beşi de uyarısız "A" oldu). Bir ölçme ürününde yanlış cevap
             anahtarı en pahalı hatadır.
             Otomatik tahmin YAPILMAZ — hangi şıkkın doğru olduğu bilinemez.
             Soru `anahtarBelirsiz` ile işaretlenir; İçerik Uzmanı onay
             ekranında uyarıyı görür ve doğru şıkkı kendisi seçer
             (agents.md §1: karar insanda). */
          const anahtarGecerli = cevapAnahtariGecerliMi(trimmedOpts, q.correctKey);
          const karisik = shuffleOptions(trimmedOpts, q.correctKey || '', q.distractorRationale);
          return {
            type: 'mc' as const,
            body: String(q.body).trim(),
            options: karisik.options,
            correctKey: karisik.correctKey,
            anahtarBelirsiz: !anahtarGecerli,
            distractorRationale: karisik.distractorRationale,
            difficulty: q.difficulty,
            bloom: q.bloom,
            aiTime: clamp(q.aiTime, 30, 180),
            needsSource: kazanimModu ? false : kaynakGerektirirMi(q.body, q.needsSource),
            refKeywords: q.refKeywords.slice(0, 6),
            // Model Türkçe metne yabancı alfabe karıştırabiliyor (ölçüldü:
            // ~10 soruda 1). Otomatik düzeltmek yerine İÇERİK UZMANINA
            // bildiriyoruz — onay zaten onda (agents.md §1).
            dilUyarisi: soruDilUyarisi({ body: q.body, options: opts, distractorRationale: q.distractorRationale }),
          };
        }
        return {
          type: 'open' as const,
          body: String(q.body).trim(),
          difficulty: q.difficulty,
          bloom: q.bloom,
          aiTime: clamp(q.aiTime, 90, 600),
          needsSource: kazanimModu ? false : kaynakGerektirirMi(q.body, q.needsSource),
          refKeywords: q.refKeywords.slice(0, 6),
          dilUyarisi: soruDilUyarisi({ body: q.body }),
        };
      })
      .filter(Boolean);

    /* §41 Madde 4 — TEKRAR DENETİMİ SUNUCUDA.
       İsteme "tekrar etme" yazmak ölçülerek yetersiz bulundu (27 soruda 15
       benzer çift). Burada iki yönlü denetim yapılır:
         a) yeni sorular ile ÖNCEKİ sorular (excludeQuestions) arasında,
         b) yeni soruların KENDİ aralarında.
       Eşiği aşanlar elenir ama SESSİZCE DEĞİL: kaç tanesinin elendiği meta
       ile döner ve arayüz bunu kullanıcıya yazar (§6.3-5). */
    const oncekiler = (b.excludeQuestions || []).filter(Boolean);
    const kabul: typeof questions = [];
    let elenenTekrar = 0;
    for (const q of questions) {
      const govde = String((q as any).body || '');
      const eskiyeBenzer = oncekiler.some((o) => benzerlik(govde, o) >= BENZERLIK_ESIGI);
      const yeniyeBenzer = kabul.some((k) => benzerlik(govde, String((k as any).body || '')) >= BENZERLIK_ESIGI);
      if (eskiyeBenzer || yeniyeBenzer) { elenenTekrar++; continue; }
      kabul.push(q);
    }

    if (!kabul.length) {
      return c.json({
        error: 'model_output_empty',
        message: elenenTekrar
          ? 'Üretilen soruların tamamı daha önce üretilenlerle çok benzerdi. Kaynak metni değiştirin ya da farklı bir kazanım seçin.'
          : elenenGecersiz
            ? 'Model, şık sayısı yetersiz sorular döndürdüğü için kullanılabilir soru kalmadı. Tekrar deneyin.'
            : 'Kullanılabilir soru üretilemedi.',
      }, 502);
    }

    return c.json({
      questions: kabul,
      /* §41: kısıtlama ve eleme SESSİZ OLMAZ — arayüz bu iki alanı
         kullanıcıya yazar (§6.3-5 sessiz düşüş yasağı). */
      meta: {
        provider: usedProvider, model: usedModel, attempts, fellBack,
        istenen: istenenToplam,
        uretilen: kabul.length,
        elenenTekrar,
        // §44: modelin kullanılamaz döndürdüğü (şıkkı eksik) soru sayısı.
        elenenGecersiz,
        kisiltmaNotu,
      },
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

  // Soru başına dakika limiti. Bir sınıfın tamamının değerlendirilmesi
  // meşrudur; buradaki sınır kazara döngüyü ve kota tüketimini keser.
  if (rateLimited(`eval:${anahtarla(b.questionBody)}`, RATE_LIMIT_EVAL_PER_MIN)) {
    return c.json(
      { error: 'rate_limited', message: `Aynı soru için dakikada en fazla ${RATE_LIMIT_EVAL_PER_MIN} değerlendirme yapılabilir. Bir dakika bekleyip tekrar deneyin.` },
      429
    );
  }

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
      /* §44: diğer tüm /evaluate yanıtlarında bu alan var; burada yoktu ve
         istemci `undefined` görüyordu. Boş yanıtta enjeksiyon denemesi de
         olamaz, o yüzden değeri açıkça false — "bilinmiyor" değil. */
      injectionAttempt: false,
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
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, { maxTokens: 820, temperature: 0.2 });  // +120: studentFeedback alanı eklendi
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
      // Öğrenciye geri bildirim TASLAĞI — öğretmen onaylamadan gitmez.
      studentFeedback: parsed.data.studentFeedback.trim(),
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

  if (rateLimited(`rubric:${anahtarla(b.questionBody)}`)) {
    return c.json(
      { error: 'rate_limited', message: 'Aynı soru için dakikada en fazla 5 rubrik taslağı isteyebilirsiniz.' },
      429
    );
  }
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

  if (rateLimited(`sample:${anahtarla(b.questionBody)}`)) {
    return c.json(
      { error: 'rate_limited', message: 'Aynı soru için dakikada en fazla 5 örnek yanıt seti isteyebilirsiniz.' },
      429
    );
  }

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

// ---------------------------------------------------------------------------
// POST /api/ai/misconceptions — sınıfın açık uçlu yanıtlarındaki TEKRARLAYAN
// kavram yanılgılarını kümeler.
//
// Isı haritası "hangi kazanım zayıf" der; bu uç "NEDEN zayıf" der.
// agents.md §7.1: Bu çıktı hiçbir puanı etkilemez, öğretmene sunulan bir
// gözlemdir. Öğrenci adı modele GÖNDERİLMEZ (yanıtlar anonim gider).
// ---------------------------------------------------------------------------
ai.post('/misconceptions', zValidator('json', misconceptionsSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');

  /* agents.md §7.4: hız sınırı. Anahtar soru gövdesinden türetilir.
     §42: diğer dört uç `anahtarla()` kullanırken burası ham gövdenin ilk 60
     karakterini anahtar yapıyordu. İki sonucu vardı: (1) aynı kalıpla
     başlayan iki FARKLI soru ("Aşağıdakilerden hangisi ...") aynı sayaca
     düşüp birbirini engelleyebiliyordu, (2) sayaç anahtarı sınırsız uzunlukta
     ham kullanıcı metni taşıyordu. `anahtarla()` ikisini de çözer ve uçlar
     arasındaki tutarsızlığı kaldırır. */
  if (rateLimited(`mis:${anahtarla(b.questionBody)}`)) {
    return c.json(
      { error: 'rate_limited', message: 'Aynı soru için dakikada en fazla 5 analiz isteği gönderebilirsiniz. Biraz bekleyip tekrar deneyin.' },
      429
    );
  }

  // agents.md §7.4: kaynak metin sınırı. Yanıtların toplamı 6.000 karakteri
  // aşarsa istem şişer; sondan kırpmak yerine istek reddedilir ki öğretmen
  // hangi veriyle çalışıldığını bilsin.
  const toplamKarakter = b.answers.reduce((t, a) => t + (a || '').length, 0);
  if (toplamKarakter > MAX_SOURCE_CHARS) {
    return c.json(
      {
        error: 'payload_too_large',
        message: `Yanıtların toplamı ${toplamKarakter} karakter; sınır ${MAX_SOURCE_CHARS}. Daha az öğrenciyle deneyin.`,
      },
      413
    );
  }

  // Boş yanıtlar analize girmemeli: model onları "yanılgı" sanabilir.
  const dolu = b.answers.map((a) => (a || '').trim()).filter((a) => a.length > 0);
  if (dolu.length < 2) {
    return c.json({
      clusters: [],
      correctCount: 0,
      analyzed: dolu.length,
      skipped: b.answers.length - dolu.length,
      note: 'Analiz için en az iki dolu yanıt gerekir.',
      meta: { provider: providerName(c.env), model: modelName(c.env), skipped: true },
    });
  }

  try {
    const prompt = buildMisconceptionPrompt({
      questionBody: b.questionBody,
      outcomeLabel: b.outcomeLabel,
      answers: dolu,
    });
    // agents.md §7.4: max_tokens açıkça verilir. Küme başına ~180 token.
    const maxTokens = clamp(500 + dolu.length * 60, 700, 1600);
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, {
      maxTokens,
      temperature: 0.3,
    });
    const parsed = modelMisconceptionsSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    // Normalleştirme — model çıktısı güvenilmez:
    //  - studentCount analiz edilen yanıt sayısını aşamaz
    //  - "tekrarlayan" olması için en az 2 öğrenci gerekir (istem kuralı 1)
    //  - alıntılar kırpılır
    const clusters = parsed.data.clusters
      .map((k) => ({
        title: k.title.trim(),
        explanation: k.explanation.trim(),
        studentCount: clamp(Math.round(Number(k.studentCount) || 0), 0, dolu.length),
        evidence: (k.evidence || []).map((e) => e.trim()).filter(Boolean).slice(0, 3),
        action: k.action.trim(),
      }))
      .filter((k) => k.title && k.studentCount >= 2)
      .sort((x, y) => y.studentCount - x.studentCount)
      .slice(0, 4);

    return c.json({
      clusters,
      correctCount: clamp(Math.round(Number(parsed.data.correctCount) || 0), 0, dolu.length),
      analyzed: dolu.length,
      skipped: b.answers.length - dolu.length,
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
// POST /api/ai/outcome-alignment — kazanım-soru hizalama denetimi
// (içerik geçerliği). Öğretmenin seçtiği kazanım ile üretilen soruların
// gerçekten örtüşüp örtüşmediğini BAĞIMSIZ bir çağrıda değerlendirir.
//
// agents.md §7.1: Hiçbir soruyu otomatik reddetmez; öğretmene sinyaldir.
// ---------------------------------------------------------------------------
ai.post('/outcome-alignment', zValidator('json', alignmentSchema, onInvalid), async (c) => {
  const b = c.req.valid('json');

  if (rateLimited(`align:${b.outcomeCode}`)) {
    return c.json(
      { error: 'rate_limited', message: 'Aynı kazanım için dakikada en fazla 5 denetim isteği gönderebilirsiniz.' },
      429
    );
  }

  const toplam = b.questions.reduce((t, q) => t + (q.body || '').length, 0);
  if (toplam > MAX_SOURCE_CHARS) {
    return c.json(
      { error: 'payload_too_large', message: `Soru metinlerinin toplamı ${toplam} karakter; sınır ${MAX_SOURCE_CHARS}. Daha az soruyla deneyin.` },
      413
    );
  }

  try {
    const prompt = buildAlignmentPrompt({
      outcomeCode: b.outcomeCode,
      outcomeLabel: b.outcomeLabel,
      questions: b.questions.map((q, i) => ({ index: i + 1, type: q.type, body: q.body })),
      candidates: b.candidates,
    });
    const maxTokens = clamp(400 + b.questions.length * 110, 600, 1600);
    const { data, attempts, usedProvider, usedModel, fellBack } = await callModelJson(c.env, prompt, {
      maxTokens,
      temperature: 0.2,
    });
    const parsed = modelAlignmentSchema.safeParse(data);
    if (!parsed.success) {
      return c.json(
        { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan bir yanıt döndürdü.' },
        502
      );
    }

    // Normalleştirme — model çıktısı güvenilmez:
    //  - index sınır dışıysa at
    //  - onerilenKod aday listesinde YOKSA temizle (model kod uyduramasın)
    //  - hedef kazanımın kendisi öneri olarak dönerse anlamsız, temizle
    const adayKodlar = new Set((b.candidates || []).map((x) => x.kod));
    const results = parsed.data.results
      .filter((r) => Number.isFinite(r.index) && r.index >= 1 && r.index <= b.questions.length)
      .map((r) => {
        const kod = (r.onerilenKod || '').trim();
        const gecerliOneri = kod && kod !== b.outcomeCode && adayKodlar.has(kod) ? kod : '';
        return {
          index: r.index,
          karar: r.karar,
          gerekce: (r.gerekce || '').trim(),
          onerilenKod: gecerliOneri,
        };
      });

    // Her soru için bir sonuç garanti et: model atladıysa "belirsiz" döner.
    const tam = b.questions.map((_, i) => {
      const bulunan = results.find((r) => r.index === i + 1);
      return bulunan || { index: i + 1, karar: 'belirsiz', gerekce: 'Model bu soru için karar döndürmedi.', onerilenKod: '' };
    });

    const ozet = {
      olcuyor: tam.filter((r) => r.karar === 'olcuyor').length,
      kismen: tam.filter((r) => r.karar === 'kismen').length,
      olcmuyor: tam.filter((r) => r.karar === 'olcmuyor').length,
      belirsiz: tam.filter((r) => r.karar === 'belirsiz').length,
    };

    return c.json({
      outcomeCode: b.outcomeCode,
      results: tam,
      ozet,
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
