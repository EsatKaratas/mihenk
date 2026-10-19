// ============================================================================
// §55 — Sunucu denetimleri A3/A4 ve ölçüm ortamı ayarları (A5).
//
// Uçtan testler `app.request` ile, model yerine sahte AI bağlamasıyla koşar;
// gerçek model çağrısı yoktur. Sahte bağlama modele giden parametreleri
// (sıcaklık) da kaydeder: "canlıda kapalı" iddiası böylece ölçülür.
// ============================================================================

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import app from '../src/index';
import { uzunSikIpucu, UZUN_SIK_ORANI, olcumAyarlari } from '../src/lib/guards';

/** Yanıtı veren ve her çağrının girdisini kaydeden sahte Workers AI. */
function kayitliAi(yanit: unknown) {
  const girdiler: Array<Record<string, unknown>> = [];
  const AI = { run: async (_m: string, girdi: Record<string, unknown>) => { girdiler.push(girdi); return { response: yanit }; } } as unknown as Ai;
  return { AI, girdiler };
}

let no = 0;
const govde = (ek: Record<string, unknown> = {}) => ({
  mode: 'kazanim', subject: 'Fen Bilimleri', grade: 7, outcomeCode: 'FEN.7.1.2',
  outcomeLabel: 'Kuvvet ve hareket', mcCount: 1, openCount: 1, docKey: 'denetim-' + ++no, ...ek,
});
const uret = (env: object, ek: Record<string, unknown> = {}) =>
  app.request('/api/ai/generate-questions', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(govde(ek)),
  }, env);

const CSS = (body: string, siklar: string[], dogru = 'A') => ({
  type: 'mc', body,
  options: siklar.map((t, i) => ({ key: 'ABCD'[i], text: t })),
  correctKey: dogru, distractorRationale: {}, difficulty: 'medium', bloom: 'uygulama', aiTime: 60,
  needsSource: false, refKeywords: [],
});
const ACIK = (body: string) => ({ type: 'open', body, difficulty: 'medium', bloom: 'analiz', aiTime: 120, needsSource: false, refKeywords: [] });

const GOVDE_KUVVET = 'Bir kutu 30 N ile sağa ve 10 N ile sola çekiliyor. Buna göre kutuya etki eden bileşke kuvvetin büyüklüğü ve yönü nedir, kutu nasıl hareket eder?';

describe('A3 — uzunSikIpucu (yalnız ölçüm)', () => {
  it('doğru şık tek başına en uzun ve oran ≥ 1,5 ise true', () => {
    expect(UZUN_SIK_ORANI).toBe(1.5);
    expect(uzunSikIpucu([{ key: 'A', text: 'x'.repeat(30) }, { key: 'B', text: 'x'.repeat(20) }, { key: 'C', text: 'x'.repeat(5) }], 'A')).toBe(true);
  });
  it('oran 1,5 altında, eşitlikte, doğru şık en uzun değilse ya da anahtar yoksa false', () => {
    expect(uzunSikIpucu([{ key: 'A', text: 'x'.repeat(29) }, { key: 'B', text: 'x'.repeat(20) }], 'A')).toBe(false);
    expect(uzunSikIpucu([{ key: 'A', text: 'x'.repeat(30) }, { key: 'B', text: 'x'.repeat(30) }], 'A')).toBe(false);
    expect(uzunSikIpucu([{ key: 'A', text: 'x'.repeat(5) }, { key: 'B', text: 'x'.repeat(30) }], 'A')).toBe(false);
    expect(uzunSikIpucu([{ key: 'A', text: 'x'.repeat(30) }, { key: 'B', text: 'x' }], '')).toBe(false);
  });
  it('uçtan: soru alanı ve meta sayısı döner', async () => {
    const { AI } = kayitliAi({ questions: [CSS(GOVDE_KUVVET, ['20 N sağa doğru ve kutu sağa doğru hızlanarak hareket eder', '40 N', '20 N', '10 N'])] });
    const r = await uret({ AI, AI_MODEL: 'm' }, { openCount: 0 });
    const j: any = await r.json();
    expect(r.status).toBe(200);
    const dogru = j.questions[0].options.find((o: any) => o.key === j.questions[0].correctKey).text;
    expect(dogru).toMatch(/^20 N sağa/);           // karıştırma içeriği izledi
    expect(j.questions[0].uzunSikIpucu).toBe(true);
    expect(j.meta.uzunSikIpucu).toBe(1);
  });
});

describe('A4 — aynı turda yalnız aynı tür tekrar sayılır', () => {
  it('ÇSS ile aynı kavramı soran AÇIK UÇLU soru artık elenmez', async () => {
    const { AI } = kayitliAi({ questions: [
      CSS(GOVDE_KUVVET, ['20 N sağa', '40 N sağa', '20 N sola', '10 N sola']),
      ACIK(GOVDE_KUVVET + ' Gerekçenizi yazınız.'),
    ] });
    const r = await uret({ AI, AI_MODEL: 'm' });
    const j: any = await r.json();
    expect(j.questions.map((q: any) => q.type)).toEqual(['mc', 'open']);
    expect(j.meta.elenenTekrar).toBe(0);
  });
  it('aynı türden iki benzer soru eskisi gibi elenir', async () => {
    const { AI } = kayitliAi({ questions: [
      CSS(GOVDE_KUVVET, ['20 N sağa', '40 N sağa', '20 N sola', '10 N sola']),
      CSS(GOVDE_KUVVET + ' Doğru seçeneği işaretleyiniz.', ['15 N', '25 N', '35 N', '45 N']),
    ] });
    const r = await uret({ AI, AI_MODEL: 'm' }, { mcCount: 2, openCount: 0 });
    const j: any = await r.json();
    expect(j.questions).toHaveLength(1);
    expect(j.meta.elenenTekrar).toBe(1);
  });
  it('önceki turlarla (excludeQuestions) karşılaştırma tür ayırmadan sürer — bilinen sınır', async () => {
    const { AI } = kayitliAi({ questions: [ACIK(GOVDE_KUVVET + ' Gerekçenizi yazınız.')] });
    const r = await uret({ AI, AI_MODEL: 'm' }, { mcCount: 0, openCount: 1, excludeQuestions: [GOVDE_KUVVET] });
    expect(r.status).toBe(502);
    expect(((await r.json()) as any).error).toBe('model_output_empty');
  });
});

/** Dizgi içindeki "/*" ve "//"yi yorum sanmayan küçük JSONC okuyucu. */
function jsoncOku(dosya: string): any {
  const s = fs.readFileSync(dosya, 'utf8');
  let o = '';
  for (let i = 0, dizgi = false; i < s.length; i++) {
    const c = s[i];
    if (dizgi) { o += c; if (c === '\\') { o += s[++i]; } else if (c === '"') dizgi = false; continue; }
    if (c === '"') { dizgi = true; o += c; continue; }
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; o += '\n'; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i++; continue; }
    o += c;
  }
  return JSON.parse(o.replace(/,(\s*[}\]])/g, '$1'));
}

describe('A5 — ölçüm ayarları yalnız APP_ENV=olcum iken etkin (canlıda kapalı)', () => {
  const acik = { OLCUM_SICAKLIK: '0.9', OLCUM_HAM: '1' };

  it('olcumAyarlari: olcum dışındaki her APP_ENV için kapalı, olcum için açık', () => {
    for (const APP_ENV of [undefined, '', 'demo', 'development', 'production', 'uretim', 'OLCUM ']) {
      expect(olcumAyarlari({ APP_ENV, ...acik })).toEqual({ sicaklik: null, ham: false });
    }
    expect(olcumAyarlari({ APP_ENV: 'olcum', ...acik })).toEqual({ sicaklik: 0.9, ham: true });
    expect(olcumAyarlari({ APP_ENV: 'olcum', OLCUM_SICAKLIK: '0,2' }).sicaklik).toBe(0.2);
    expect(olcumAyarlari({ APP_ENV: 'olcum', OLCUM_SICAKLIK: '7' }).sicaklik).toBeNull();
    expect(olcumAyarlari({ APP_ENV: 'olcum', OLCUM_SICAKLIK: 'abc' }).sicaklik).toBeNull();
  });

  it("depodaki ÜÇ yapılandırmanın üçünde de kapalı (wrangler.jsonc 'development' dahil)", () => {
    const kok = path.resolve(__dirname, '..');
    for (const f of ['wrangler.jsonc', 'wrangler.demo.jsonc', 'wrangler.deneme.jsonc']) {
      const vars = jsoncOku(path.join(kok, f)).vars || {};
      expect(vars.APP_ENV).not.toBe('olcum');
      expect(olcumAyarlari({ ...vars, ...acik })).toEqual({ sicaklik: null, ham: false });
    }
  });

  it('uçtan: demo ortamında sıcaklık 0,5 kalır, elenenler dönmez — değişkenler tanımlı olsa bile', async () => {
    const { AI, girdiler } = kayitliAi({ questions: [
      CSS(GOVDE_KUVVET, ['20 N sağa', '40 N sağa', '20 N sola', '10 N sola']),
      CSS(GOVDE_KUVVET + ' Doğru seçeneği işaretleyiniz.', ['15 N', '25 N', '35 N', '45 N']),
    ] });
    const r = await uret({ AI, AI_MODEL: 'm', APP_ENV: 'demo', ...acik }, { mcCount: 2, openCount: 0 });
    const j: any = await r.json();
    expect(girdiler[0].temperature).toBe(0.5);
    expect(j.meta.sicaklik).toBe(0.5);
    expect(j.meta.elenenTekrar).toBe(1);
    expect('elenenler' in j.meta).toBe(false);
  });

  it('uçtan: ölçüm ortamında sıcaklık modele GERÇEKTEN gider ve elenenler döner', async () => {
    const { AI, girdiler } = kayitliAi({ questions: [
      CSS(GOVDE_KUVVET, ['20 N sağa', '40 N sağa', '20 N sola', '10 N sola']),
      CSS(GOVDE_KUVVET + ' Doğru seçeneği işaretleyiniz.', ['15 N', '25 N', '35 N', '45 N']),
    ] });
    const r = await uret({ AI, AI_MODEL: 'm', APP_ENV: 'olcum', ...acik }, { mcCount: 2, openCount: 0 });
    const j: any = await r.json();
    expect(girdiler[0].temperature).toBe(0.9);
    expect(j.meta.sicaklik).toBe(0.9);
    expect(j.meta.elenenler).toEqual([
      { neden: 'tekrar', type: 'mc', body: GOVDE_KUVVET + ' Doğru seçeneği işaretleyiniz.', benzedigi: 'ayniTur' },
    ]);
  });
});
