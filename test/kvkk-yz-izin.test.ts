// ============================================================================
// §88b KVKK — öğrenci başına yapay zekâ izni. İzin yoksa cevap HİÇBİR
// /api/ai/* isteğine girmez; kuyrukta "elle değerlendirilecek" olur.
// app.js'teki gerçek fonksiyonlar çıkarılıp sahte bağımlılıklarla çalıştırılır.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

/** Üst düzey `function ad(` tanımının tam metni. */
function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 2);
}

function ortam(students: Array<Record<string, unknown>>, mode = 'live') {
  const cagrilar: Array<{ url: string; body: any }> = [];
  const audit: Array<{ ad: string; v: any }> = [];
  const state: any = { students, activeStudentId: students[0].id, ai: { mode }, evalCache: {} };
  // §90 (ai-rozet-tohum) ile birleşince aiEvaluate aiKaynak'ı (gerçek) ve hata yolunda
  // demoTohumDegerlendirmesi'ni çağırır; tohum burada hiç devreye girmez (null).
  const kod = [tanim('yzIzniVar'), tanim('yzIzinsizSonuc'), tanim('aiKaynak'), tanim('aiEvaluate')].join('\n');
  const aiEvaluate = new Function(
    'state', 'apiPost', 'AI_API', 'auditKaydet', 'auditKisalt', 'outcomeLabel', 'evalCacheKey', 'evalCacheGet',
    'evalCachePut', 'simulateAIEvaluation', 'kisiselMaskele', 'demoTohumDegerlendirmesi',
    kod + '\nreturn aiEvaluate;'
  )(
    state,
    async (url: string, body: unknown) => { cagrilar.push({ url, body }); return { aiScore: 6, maxScore: 10, justification: 'j', breakdown: [], confidence: 0.8 }; },
    { evaluate: '/api/ai/evaluate' },
    (ad: string, v: unknown) => audit.push({ ad, v }),
    (s: string) => String(s || '').slice(0, 80),
    () => 'kazanım',
    () => 'k',
    () => null,
    () => {},
    () => ({ aiScore: 5, maxScore: 10, simulated: true }),
    (m: string) => ({ metin: m, maskelendi: false }),
    () => null
  ) as (q: any, t: string, r: any, f?: boolean, sid?: number) => Promise<any>;
  return { aiEvaluate, cagrilar, audit, state };
}

const q = { id: 3, body: 'Sürtünme neden ısı açığa çıkarır?', outcome: 'FEN.7.1.2' };
const rub = { maxScore: 10, criteria: [{ label: 'Kavram', weight: 100 }] };

describe('aiEvaluate — öğrenci başına yapay zekâ izni (§88b)', () => {
  it('izin YOK → apiPost çağrılmaz, elle değerlendirme kaydı döner, denetim izine düşer', async () => {
    const o = ortam([{ id: 1, name: 'Ada Yılmaz', yzIzniYok: true }, { id: 2, name: 'Kerem Aydın' }]);
    const r = await o.aiEvaluate(q, 'Ada cevabı: sürtünme enerjiyi ısıya çevirir', rub, false, 1);
    expect(o.cagrilar).toHaveLength(0);
    expect(r).toMatchObject({ failed: true, izinYok: true, aiScore: null, maxScore: 10 });
    expect(o.audit.map((a) => a.ad)).toEqual(['yz_izni_yok']);
  });

  it('izin YOK → simülasyon modunda da (ve sid verilmezse aktif öğrenci) model/simülasyon çalışmaz', async () => {
    const o = ortam([{ id: 1, name: 'Ada', yzIzniYok: true }], 'simulation');
    const r = await o.aiEvaluate(q, 'x', rub);
    expect(r.izinYok).toBe(true);
    expect(r.simulated).toBeUndefined();
  });

  it('izin VAR (alan yok = varsayılan) → eski davranış: evaluate gövdesinde cevap gider', async () => {
    const o = ortam([{ id: 1, name: 'Ada' }, { id: 2, name: 'Kerem', yzIzniYok: false }]);
    const r = await o.aiEvaluate(q, 'Sürtünme ısı açığa çıkarır', rub, false, 2);
    expect(o.cagrilar).toHaveLength(1);
    expect(o.cagrilar[0].url).toBe('/api/ai/evaluate');
    expect(o.cagrilar[0].body.studentAnswer).toBe('Sürtünme ısı açığa çıkarır');
    expect(r.failed).toBeUndefined();
    expect(r.aiScore).toBe(6);
  });
});

describe('miscAnswers — izinsiz öğrencinin yanıtı yanılgı analizine girmez', () => {
  it('yalnız izinli öğrencilerin yanıtları toplanır', () => {
    const students = [{ id: 1, name: 'A', yzIzniYok: true }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
    const oturum: Record<number, any> = {
      1: { answers: { 7: { text: 'GİZLİ izinsiz cevap' } } },
      2: { answers: { 7: { text: 'B cevabı' } } },
      3: { answers: { 7: { text: 'C cevabı' } } },
    };
    const miscAnswers = new Function('state', 'submittedStudents', 'readSession',
      tanim('yzIzniVar') + '\n' + tanim('miscAnswers') + '\nreturn miscAnswers;'
    )({ students }, () => students, (id: number) => oturum[id]) as (qid: number) => string[];
    expect(miscAnswers(7)).toEqual(['B cevabı', 'C cevabı']);
  });
});

describe('arayüz ve kayıt şekli', () => {
  it('izinsiz kayıt kuyrukta "Elle değerlendirilecek" kartına gider, Elle Puanla ve Onayla düğmesiyle', () => {
    expect(tanim('evalFailedCardHtml')).toContain('if (ev && ev.izinYok) return evalElleCardHtml(q, student, ans, rub);');
    const k = tanim('evalElleCardHtml');
    expect(k).toContain('Elle değerlendirilecek');
    expect(k).toContain('class="btn btn-primary revise-approve"');
    expect(k).toContain('Elle Puanla ve Onayla');
  });
  it('öğretmen öğrenci listesinde anahtar var ve değiştirilebilir; izin açılınca alan silinir', () => {
    expect(tanim('sinifYonetimHtml')).toContain('data-yz-izin="');
    expect(tanim('wireSinifYonetim')).toContain('if (ogr.yzIzniYok) delete ogr.yzIzniYok; else ogr.yzIzniYok = true;');
  });
  /* §107 (Madde 9): bu test §88b'de "yeni öğrenci izin alanı YAZMAZ" diyordu. Emirle
     değişti: yeni GERÇEK öğrenci (tekli + e-Okul toplu) "rıza bekleniyor" ile doğar.
     Demo tohumu ve simülasyon öğrencileri değişmedi (göç yok); bkz. test/iz-izin-paket.test.ts. */
  it('e-Okul toplu ekleme ve tek ekleme yeni öğrenciyi "rıza bekleniyor" ile ekler (§107)', () => {
    expect(tanim('topluOgrenciEkle')).toContain('state.students.push(yeniGercekOgrenci(ad, sf));');
    expect(app).toContain('state.students.push(yeniGercekOgrenci(ad, sinif || "7-A"));');
    expect(tanim('ensureStudents')).not.toContain('yeniGercekOgrenci');
  });
  it('tüm aiEvaluate çağrıları öğrenci kimliğini geçirir ya da aktif öğrenciyi kullanır', () => {
    const cagrilar = app.match(/await aiEvaluate\([^;]*\);/g) || [];
    // §106: kâğıt sınavın "YZ puan önerisi iste" çağrısı (kagitOneriIste) öğrenci kimliğini `sid` ile geçirir.
    expect(cagrilar.length).toBe(4);
    expect(cagrilar.filter((c) => /, (ogrId|ogr\.id|sid)\)/.test(c))).toHaveLength(3);
  });
});
