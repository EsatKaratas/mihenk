// ============================================================================
// Rota düzeyi testler — §51b.
//
// Diğer test dosyaları saf fonksiyonları sınar. Buradakiler Hono uygulamasını
// `app.request(...)` ile UÇTAN çağırır; model yerine sabit JSON döndüren sahte
// bir AI bağlaması verilir. Gerçek model çağrısı YAPILMAZ, maliyeti sıfırdır.
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import { kalipliGerekceSayisi, RATE_LIMIT_IP_PER_MIN, RATE_LIMIT_EVAL_PER_MIN, RATE_LIMIT_PER_MIN } from '../src/lib/guards';

/** Her çağrıda verilen yanıtı döndüren sahte Workers AI bağlaması. */
function sahteAi(yanit: unknown) {
  return { AI: { run: async () => ({ response: yanit }) } as unknown as Ai, AI_MODEL: 'sahte-model' };
}

let sayac = 0;
const uretimGovdesi = () => ({
  mode: 'kazanim',
  subject: 'Fen Bilimleri',
  grade: 7,
  outcomeCode: 'FEN.7.1.2',
  outcomeLabel: 'Kuvvet ve hareket',
  mcCount: 2,
  openCount: 0,
  // Her testte farklı docKey: modül düzeyindeki hız sayacı testler arasında taşınmasın.
  docKey: 'rota-test-' + ++sayac,
});

const post = (yol: string, govde: unknown, env: object) =>
  app.request(yol, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(govde) }, env);

describe('hata biçimi — bozuk/boş JSON (§51b P1-1)', () => {
  const ham = (yol: string, body?: string) =>
    app.request(yol, { method: 'POST', headers: { 'content-type': 'application/json' }, body }, sahteAi({}));

  it('bozuk JSON 500 değil 400 invalid_json döner', async () => {
    for (const yol of ['/api/ai/generate-questions', '/api/ai/evaluate', '/api/ai/rubric']) {
      const r = await ham(yol, '{bozuk');
      expect(r.status).toBe(400);
      const j: any = await r.json();
      expect(j.error).toBe('invalid_json');
      expect(typeof j.message).toBe('string');
    }
  });

  it('boş gövde de 400 invalid_json döner', async () => {
    const r = await ham('/api/ai/evaluate');
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error).toBe('invalid_json');
  });

  it('şema hatası eskisi gibi 400 validation_failed, olmayan uç 404 not_found', async () => {
    const r = await ham('/api/ai/evaluate', '{"questionBody":""}');
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error).toBe('validation_failed');
    const y = await app.request('/api/ai/yok');
    expect(y.status).toBe(404);
    expect(((await y.json()) as any).error).toBe('not_found');
  });
});

describe('kalipliGerekceSayisi (§51b)', () => {
  it('yalnızca kalıp açılışın kesildiği gerekçeleri sayar', () => {
    expect(kalipliGerekceSayisi({
      A: 'Bu şıkkı seçen öğrenci birimleri karıştırıyor.',
      B: 'Bu seçeneği işaretleyen öğrenciler ikinci adımı atlıyor.',
      C: 'Ters orantıyı doğru orantı sanıyor.',
      D: 'küçük harfle başlıyor ama kalıp yok',
    })).toBe(2);
  });
  it('kalıp dışında bir şey kalmıyorsa (orijinal korunur) saymaz; boş/eksik girdide 0', () => {
    expect(kalipliGerekceSayisi({ A: 'Bu şıkkı seçen öğrenci' })).toBe(0);
    expect(kalipliGerekceSayisi(undefined)).toBe(0);
    expect(kalipliGerekceSayisi({})).toBe(0);
  });
});

describe('POST /api/ai/generate-questions — meta.sadelestirilenGerekce (§51b)', () => {
  const modelYaniti = {
    questions: [
      {
        type: 'mc',
        body: 'Bir kutu 30 N ile sağa, 10 N ile sola çekiliyor. Buna göre kutuya etki eden bileşke kuvvet nedir ve yönü nereye doğrudur?',
        options: [
          { key: 'A', text: '20 N sağa' }, { key: 'B', text: '40 N sağa' },
          { key: 'C', text: '20 N sola' }, { key: 'D', text: '10 N sola' },
        ],
        correctKey: 'A',
        distractorRationale: {
          B: 'Bu şıkkı seçen öğrenci zıt yönlü kuvvetleri topluyor.',
          C: 'Yönü küçük kuvvetin tarafı sanıyor.',
          D: 'Bu şıkkı seçen öğrenci yalnızca küçük kuvveti alıyor.',
        },
        difficulty: 'medium', bloom: 'uygulama', aiTime: 60, needsSource: false, refKeywords: [],
      },
      {
        type: 'mc',
        body: 'Pazarda bir el arabası 50 N ile itiliyor, 50 N sürtünme var. Buna göre araba duruyorsa ne olur, hareket ediyorsa nasıl hareket eder?',
        options: [
          { key: 'A', text: 'Sabit süratle devam eder' }, { key: 'B', text: 'Hızlanır' },
          { key: 'C', text: 'Yavaşlar' }, { key: 'D', text: 'Geri gider' },
        ],
        correctKey: 'A',
        distractorRationale: {
          B: 'İtme varsa hızlanma olur sanıyor.',
          C: 'Sürtünmenin her zaman yavaşlattığını düşünüyor.',
          D: 'Bu seçeneği işaretleyen öğrenci sürtünmeyi itmeden büyük sanıyor.',
        },
        difficulty: 'medium', bloom: 'analiz', aiTime: 60, needsSource: false, refKeywords: [],
      },
    ],
  };

  it('kalıplı gerekçe sayısını ve toplam gerekçe sayısını meta ile döndürür', async () => {
    const r = await post('/api/ai/generate-questions', uretimGovdesi(), sahteAi(modelYaniti));
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta.sadelestirilenGerekce).toBe(3);
    expect(j.meta.toplamGerekce).toBe(6);
    // Davranış değişmedi: kullanıcıya giden gerekçelerde kalıp yok.
    for (const q of j.questions) {
      for (const g of Object.values(q.distractorRationale) as string[]) {
        expect(g).not.toMatch(/^bu (şıkkı|seçeneği)/i);
      }
    }
  });

  it('kalıp yoksa sayaç 0 döner (alan her zaman var)', async () => {
    const temiz = JSON.parse(JSON.stringify(modelYaniti));
    for (const q of temiz.questions) {
      for (const k of Object.keys(q.distractorRationale)) {
        q.distractorRationale[k] = q.distractorRationale[k].replace(/^Bu (şıkkı|seçeneği) (seçen|işaretleyen) öğrenci /, '');
      }
    }
    const r = await post('/api/ai/generate-questions', uretimGovdesi(), sahteAi(temiz));
    const j: any = await r.json();
    expect(j.meta.sadelestirilenGerekce).toBe(0);
    expect(j.meta.toplamGerekce).toBe(6);
  });
});

// §51b P2-2 / P2-3 — yeniden deneme, yedeğe geçiş ve deneme kaydı.
describe('model çağrısı: yeniden deneme yalnız ayrıştırma hatasında, yedek korunur', () => {
  afterEach(() => vi.restoreAllMocks());

  const DEGERLENDIRME = {
    breakdown: [{ label: 'Kavram', points: 7, reason: 'Kavramı doğru kullanmış.' }],
    justification: 'Yeterli.', studentFeedback: 'Güzel.', confidence: 0.8,
  };
  let soruNo = 0;
  const degerlendirmeGovdesi = () => ({
    // Her testte farklı soru gövdesi: hız sayacı anahtarı soru gövdesinden türetiliyor.
    questionBody: 'Yedek testi sorusu ' + ++soruNo,
    maxScore: 10,
    criteria: [{ label: 'Kavram', weight: 100 }],
    studentAnswer: 'Bileşke kuvvet 20 N ileri.',
  });

  /** Model adına göre davranan sahte AI; çağrıları sayar. */
  function sayanAi(davranis: Record<string, Array<() => unknown>>) {
    const cagri: Record<string, number> = {};
    const AI = {
      run: async (model: string) => {
        const i = (cagri[model] = (cagri[model] || 0) + 1) - 1;
        const adimlar = davranis[model] || [];
        const adim = adimlar[Math.min(i, adimlar.length - 1)];
        return { response: adim() };
      },
    } as unknown as Ai;
    return { AI, cagri };
  }
  const coker = () => { throw new Error('Workers AI 429: daily neuron quota exceeded @ https://ic.adres/v1 [model=x]'); };

  it('birincil model ÇÖKERSE aynı modeli yeniden denemez, yedeğe geçer ve 200 döner (README §3.1)', async () => {
    const { AI, cagri } = sayanAi({ bozuk: [coker], yedek: [() => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', degerlendirmeGovdesi(), {
      AI, AI_MODEL: 'bozuk', AI_FALLBACK_PROVIDER: 'workers-ai', AI_FALLBACK_MODEL: 'yedek',
    });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta.fellBack).toBe(true);
    expect(j.meta.model).toBe('yedek');
    expect(j.aiScore).toBe(7);
    expect(cagri.bozuk).toBe(1); // eskiden 2'ydi: kota hatası boşa yeniden deneniyordu
    expect(cagri.yedek).toBe(1);
  });

  it('yanıt JSON değilse BİR kez yeniden dener ve ikinci denemede başarır', async () => {
    const { AI, cagri } = sayanAi({ m: [() => 'Üzgünüm, JSON veremem.', () => DEGERLENDIRME] });
    const r = await post('/api/ai/evaluate', degerlendirmeGovdesi(), { AI, AI_MODEL: 'm' });
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.meta.attempts).toBe(2);
    expect(cagri.m).toBe(2);
  });

  it('her deneme ai_call olarak kaydedilir, başarısız olan da (ok:false + aşama)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { AI } = sayanAi({ m: [() => 'JSON yok', () => DEGERLENDIRME] });
    await post('/api/ai/evaluate', degerlendirmeGovdesi(), { AI, AI_MODEL: 'm' });
    const kayitlar = log.mock.calls
      .map((a) => { try { return JSON.parse(String(a[0])); } catch { return null; } })
      .filter((k) => k && k.ev === 'ai_call');
    expect(kayitlar).toHaveLength(2);
    expect(kayitlar[0]).toMatchObject({ ok: false, asama: 'ayristirma', attempt: 1 });
    expect(kayitlar[1]).toMatchObject({ ok: true, attempt: 2 });
    expect(typeof kayitlar[0].maxTokens).toBe('number');
  });

  it('yedek yoksa 502 ai_call_failed; istemciye ham hata (URL, model) GİTMEZ, ayrıntı log\'da', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { AI, cagri } = sayanAi({ bozuk: [coker] });
    const r = await post('/api/ai/evaluate', degerlendirmeGovdesi(), { AI, AI_MODEL: 'bozuk' });
    expect(r.status).toBe(502);
    const j: any = await r.json();
    expect(j.error).toBe('ai_call_failed');
    expect(j.message).not.toMatch(/https?:|model=|quota/i);
    expect(j.message).toMatch(/ulaşılamıyor/);
    expect(cagri.bozuk).toBe(1);
    const ayrinti = hata.mock.calls.map((a) => String(a[0])).find((x) => x.includes('ai_failed'));
    expect(ayrinti).toContain('quota');
  });
});

// §51b P1-2 / P2-4 — IP başına ortak tavan ve sayaç sırası.
describe('hız sınırı: IP başına ortak tavan (§51b)', () => {
  const istek = (ip: string, govde: unknown) =>
    app.request('/api/ai/generate-questions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify(govde),
    }, sahteAi({}));
  // Hiç soru istemeyen gövde: model çağrılmaz (400), ama IP sayacından geçer.
  const bos = (docKey: string) => ({ ...uretimGovdesi(), mcCount: 0, openCount: 0, docKey });

  it('tavan mevcut sınırlardan türetilir ve meşru en yoğun kullanımın üstündedir', () => {
    expect(RATE_LIMIT_IP_PER_MIN).toBe(60);
    expect(RATE_LIMIT_IP_PER_MIN).toBeGreaterThanOrEqual(RATE_LIMIT_EVAL_PER_MIN + RATE_LIMIT_PER_MIN);
  });

  it('anahtarı her istekte değiştiren döngü IP tavanında durur; başka IP etkilenmez', async () => {
    const ip = '203.0.113.' + Math.floor(Math.random() * 200);
    let gecen = 0;
    let ilk429 = -1;
    for (let i = 0; i < RATE_LIMIT_IP_PER_MIN + 5; i++) {
      const r = await istek(ip, bos('dongu-' + i)); // her istekte FARKLI docKey
      if (r.status !== 429) gecen++;
      else if (ilk429 < 0) {
        ilk429 = i;
        const j: any = await r.json();
        expect(j.error).toBe('rate_limited');
        expect(j.message).toContain(String(RATE_LIMIT_IP_PER_MIN));
      }
    }
    expect(gecen).toBe(RATE_LIMIT_IP_PER_MIN);
    expect(ilk429).toBe(RATE_LIMIT_IP_PER_MIN);
    const baska = await istek('198.51.100.7', bos('baska'));
    expect(baska.status).toBe(400); // tavana takılmadı, kendi doğrulamasına ulaştı
  });

  it('geçersiz istek (soru sayısı 0) belge başına üretim hakkını YEMEZ (P2-4)', async () => {
    const ip = '192.0.2.' + Math.floor(Math.random() * 200);
    for (let i = 0; i < RATE_LIMIT_PER_MIN + 2; i++) {
      const r = await istek(ip, bos('ayni-belge'));
      expect(r.status).toBe(400); // eskiden 6. istek 429 dönüyordu
    }
  });
});

// §73 — canlıda (§69) evaluate'in geri bildirim taslağında "necessário" görüldü.
describe('evaluate: Latin-1 yabancı aksan uyarısı ve tetikleyen sözcük (§73)', () => {
  let no = 0;
  const govde = () => ({
    questionBody: 'Aksan testi sorusu ' + ++no,
    maxScore: 10,
    criteria: [{ label: 'Kavram', weight: 100 }],
    studentAnswer: 'Sürtünme kuvveti hareketi zorlaştırır.',
  });
  const yanit = (geriBildirim: string) => ({
    breakdown: [{ label: 'Kavram', points: 6, reason: 'Kavramı doğru kullanmış.' }],
    justification: 'Yeterli.', studentFeedback: geriBildirim, confidence: 0.8,
  });

  it('geri bildirimde necessário → dilUyarisi true, meta.dilUyarisiSozcukler = ["necessário"]', async () => {
    const r = await post('/api/ai/evaluate', govde(),
      sahteAi(yanit('Doğru bir yaklaşım; bazı kavramları açıklaman necessário olabilir.')));
    expect(r.status).toBe(200);
    const j: any = await r.json();
    expect(j.dilUyarisi).toBe(true);
    expect(j.meta.dilUyarisiSozcukler).toEqual(['necessário']);
    // Metin DEĞİŞTİRİLMEZ (otomatik düzeltme yok, agents.md §1).
    expect(j.studentFeedback).toContain('necessário');
  });

  it('şapkalı Türkçe geri bildirim → uyarı yok, sözcük listesi boş', async () => {
    const r = await post('/api/ai/evaluate', govde(), sahteAi(yanit('Kâğıdındaki açıklama hâlâ millî müfredata uygun.')));
    const j: any = await r.json();
    expect(j.dilUyarisi).toBe(false);
    expect(j.meta.dilUyarisiSozcukler).toEqual([]);
  });
});
