// ============================================================================
// Rota düzeyi testler — §51b.
//
// Diğer test dosyaları saf fonksiyonları sınar. Buradakiler Hono uygulamasını
// `app.request(...)` ile UÇTAN çağırır; model yerine sabit JSON döndüren sahte
// bir AI bağlaması verilir. Gerçek model çağrısı YAPILMAZ, maliyeti sıfırdır.
// ============================================================================

import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { kalipliGerekceSayisi } from '../src/lib/guards';

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
