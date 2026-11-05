// ============================================================================
// §88 KVKK — sunucu ikinci katmanı. Model çağrısı YOK (sahte AI bağlaması).
// (1) Zod şemaları bilinmeyen kişisel alanı ATIYOR mu? (kanıt)
// (2) src/lib/kisisel.ts: kişisel anahtar reddi + kendini tanıtma maskesi.
// (3) Uçtan: /api/ai/evaluate ve /misconceptions'ta modele giden istemde ad yok.
// ============================================================================
import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import {
  generateQuestionsSchema,
  evaluateSchema,
  rubricDraftSchema,
  sampleAnswersSchema,
  misconceptionsSchema,
  alignmentSchema,
  solveSchema,
} from '../src/schemas/ai';
import { kisiselAlanBul, kendiniTanitmaMaskele, anahtarNormal } from '../src/lib/kisisel';

afterEach(() => vi.restoreAllMocks());

const KISISEL = { studentName: 'Ayşe Yılmaz', okulNo: '1234', sinif: '7-A', okulAdi: 'Örnek Ortaokulu', ad: 'Ayşe', soyad: 'Yılmaz' };

describe('(1) Zod şemaları bilinmeyen kişisel alanı atar (kanıt)', () => {
  const ornekler: Array<[string, { parse: (x: unknown) => unknown }, Record<string, unknown>]> = [
    ['generate-questions', generateQuestionsSchema, { mode: 'kazanim', subject: 'Fen', grade: 7, outcomeCode: 'F.7.1', outcomeLabel: 'Kuvvet' }],
    ['evaluate', evaluateSchema, { questionBody: 'Soru?', studentAnswer: 'Cevap', maxScore: 10, criteria: [{ label: 'K', weight: 100, ...KISISEL }] }],
    ['rubric', rubricDraftSchema, { questionBody: 'Soru?' }],
    ['sample-answers', sampleAnswersSchema, { questionBody: 'Soru?', levels: ['orta'] }],
    ['misconceptions', misconceptionsSchema, { questionBody: 'Soru?', answers: ['a', 'b'] }],
    ['outcome-alignment', alignmentSchema, { outcomeCode: 'F.7.1', outcomeLabel: 'Kuvvet', questions: [{ type: 'open', body: 'S', ...KISISEL }] }],
    ['solve', solveSchema, { questionBody: 'Soru?', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }, { key: 'C', text: '3' }] }],
  ];
  for (const [ad, sema, govde] of ornekler) {
    it(`${ad}: üst düzey ve iç içe kişisel alanlar çıktıda yok`, () => {
      const cikti = JSON.stringify(sema.parse({ ...govde, ...KISISEL }));
      for (const k of Object.keys(KISISEL)) expect(cikti).not.toContain(`"${k}"`);
      expect(cikti).not.toContain('Ayşe');
      expect(cikti).not.toContain('Örnek Ortaokulu');
    });
  }
});

describe('(2a) kisiselAlanBul', () => {
  it('kişisel anahtarları (iç içe, farklı yazım) bulur', () => {
    expect(kisiselAlanBul({ studentName: 'x' })).toBe('studentName');
    expect(kisiselAlanBul({ criteria: [{ label: 'a', ogrenci_no: 5 }] })).toBe('criteria[0].ogrenci_no');
    expect(kisiselAlanBul({ a: { OkulAdı: 'x' } })).toBe('a.OkulAdı');
    expect(kisiselAlanBul({ Şube: '7-A' })).toBe('Şube');
    expect(anahtarNormal('Soyadı')).toBe('soyadi');
  });

  it('istemcinin GERÇEK alan adlarını reddetmez (yanlış alarm yok)', () => {
    const istemci = {
      mode: 'kazanim', guidance: '', materialName: 'Belge', sourceText: 't', subject: 'Fen', grade: 7,
      kaynakTuru: 'deneyap', outcomeCode: 'F', outcomeLabel: 'L', mcCount: 1, openCount: 1, optionCount: 4,
      docKey: 'adsiz', topicArea: 'x', bloomFocus: 'dengeli', excludeQuestions: ['s'],
      questionBody: 'q', studentAnswer: 'a', maxScore: 10, criteria: [{ label: 'k', weight: 100 }],
      questions: [{ type: 'mc', body: 'b' }], candidates: [{ kod: 'k', metin: 'm' }],
      options: [{ key: 'A', text: 't' }], anahtar: 'A', levels: ['orta'], answers: ['a', 'b'],
    };
    expect(kisiselAlanBul(istemci)).toBeNull();
  });
});

describe('(2b) kendiniTanitmaMaskele', () => {
  it('açık kendini tanıtma ve numara kalıplarını maskeler', () => {
    expect(kendiniTanitmaMaskele('Benim adım Ayşe Yılmaz. Kuvvet itme ya da çekmedir.').metin)
      .toBe('Benim adım [ÖĞRENCİ]. Kuvvet itme ya da çekmedir.');
    expect(kendiniTanitmaMaskele('BENİM ADIM AYŞE').metin).toBe('BENİM ADIM [ÖĞRENCİ]');
    expect(kendiniTanitmaMaskele('benim adım ayşe ve cevabım şu').metin).toBe('benim adım [ÖĞRENCİ] ve cevabım şu');
    expect(kendiniTanitmaMaskele('Ad Soyad: Ayşe Yılmaz\nCevap: 20 N').metin).toBe('Ad Soyad: [ÖĞRENCİ]\nCevap: 20 N');
    expect(kendiniTanitmaMaskele('adım soyadım ayşe yılmaz').metin).toBe('adım soyadım [ÖĞRENCİ]');
    expect(kendiniTanitmaMaskele('Okul numaram 1234').metin).toBe('Okul numaram [NUMARA]');
    expect(kendiniTanitmaMaskele('ÖĞRENCİ NO: 57').metin).toBe('ÖĞRENCİ NO: [NUMARA]');
  });

  it('cevap içeriğine dokunmaz ("ilk adım", "adımı", sayılar)', () => {
    const t = 'İlk adımda 12 ile 3 çarpılır, sonra adımı tekrar ederiz. Sonuç 36. Adım adım çözdüm.';
    expect(kendiniTanitmaMaskele(t)).toEqual({ metin: t, maskelendi: false });
  });
});

describe('(3) uçtan: modele giden istemde ad yok', () => {
  function yakalayanAi(yanit: unknown) {
    const istemler: string[] = [];
    const AI = { run: async (_m: string, girdi: unknown) => { istemler.push(JSON.stringify(girdi)); return { response: yanit }; } } as unknown as Ai;
    return { AI, istemler };
  }
  const post = (yol: string, govde: unknown, env: object) =>
    app.request(yol, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(govde) }, env);
  let n = 0;

  it('kişisel alan taşıyan gövde 400 kisisel_veri; model ÇAĞRILMAZ', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { AI, istemler } = yakalayanAi({});
    const r = await post('/api/ai/evaluate', {
      questionBody: 'KVKK sorusu ' + ++n, studentAnswer: 'x', maxScore: 10, criteria: [{ label: 'K', weight: 100 }], studentName: 'Ayşe Yılmaz',
    }, { AI, AI_MODEL: 'm' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as any).error).toBe('kisisel_veri');
    expect(istemler).toHaveLength(0);
  });

  it('evaluate: "Benim adım …" istemde [ÖĞRENCİ] olur, puan akışı çalışır', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { AI, istemler } = yakalayanAi({
      breakdown: [{ label: 'Kavram', points: 7, reason: 'Doğru.' }], justification: 'Yeterli.', studentFeedback: 'Güzel.', confidence: 0.8,
    });
    const r = await post('/api/ai/evaluate', {
      questionBody: 'KVKK sorusu ' + ++n, maxScore: 10, criteria: [{ label: 'Kavram', weight: 100 }],
      studentAnswer: 'Benim adım Zeynep Kaya, okul numaram 4821. Bileşke kuvvet 20 N ileri.',
    }, { AI, AI_MODEL: 'm' });
    expect(r.status).toBe(200);
    expect(((await r.json()) as any).aiScore).toBe(7);
    expect(istemler.length).toBeGreaterThan(0);
    const istem = istemler.join('\n');
    expect(istem).not.toContain('Zeynep');
    expect(istem).not.toContain('4821');
    expect(istem).toContain('[ÖĞRENCİ]');
    expect(istem).toContain('Bileşke kuvvet 20 N ileri.');
  });

  it('misconceptions: yanıt dizisindeki kendini tanıtma da maskelenir', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { AI, istemler } = yakalayanAi({ clusters: [], correctCount: 2 });
    await post('/api/ai/misconceptions', {
      questionBody: 'KVKK sorusu ' + ++n,
      answers: ['Benim adım Zeynep Kaya. Kuvvet itmedir.', 'Kuvvet çekmedir.'],
    }, { AI, AI_MODEL: 'm' });
    expect(istemler.length).toBeGreaterThan(0);
    expect(istemler.join('\n')).not.toContain('Zeynep');
  });
});
