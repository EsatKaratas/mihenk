// ============================================================================
// §94 (W9) — Demo şeridi: tıklanabilir adımlar.
// Saf kural (demoAdimDurumu) kaynaktan çıkarılıp çalıştırılır; geri kalanı
// kaynak düzeyinde GERİ DÖNÜŞÜ yakalar: adıma tıklamak veri yazmaz (HITL),
// kilitli adım `disabled` değil aria-disabled, sessiz kalmaz.
// Davranış gerçek tarayıcıda ölçüldü (PROGRESS §94).
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return app.slice(bas, bas + 1 + (son < 0 ? kalan.length : son));
}

type Durum = { durum: string; ulasilir: boolean };
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const demoAdimDurumu = new Function(govde('demoAdimDurumu') + '\nreturn demoAdimDurumu;')() as
  (no: number, simdiki: number, enUzak: number | null, hazirlar: boolean[]) => Durum;

const H = (...b: number[]) => [1, 2, 3, 4, 5].map((n) => b.includes(n));

describe('demoAdimDurumu — açılma kuralı', () => {
  it('yeni demo: yalnız adım 1 şu anki, 2–5 kilitli', () => {
    const d = [1, 2, 3, 4, 5].map((n) => demoAdimDurumu(n, 1, 1, H(5)));
    expect(d.map((x) => x.durum)).toEqual(['simdiki', 'kilitli', 'kilitli', 'kilitli', 'kilitli']);
  });

  it('adım 1 hazır olunca adım 2 açılır, 3 hâlâ kilitli', () => {
    expect(demoAdimDurumu(2, 1, 1, H(1, 5))).toEqual({ durum: 'acik', ulasilir: true });
    expect(demoAdimDurumu(3, 1, 1, H(1, 5)).durum).toBe('kilitli');
  });

  it('ileri atlama yalnız önceki insan eylemleri yapıldıysa (1–3 hazır → 4 açık)', () => {
    expect(demoAdimDurumu(4, 1, 1, H(1, 2, 3, 5)).ulasilir).toBe(true);
    expect(demoAdimDurumu(4, 1, 1, H(1, 3, 5)).ulasilir).toBe(false);   // 2 atlanamaz
  });

  it('geri gitmek hep serbest; ziyaret edilmiş adım kilitlenmez', () => {
    // 4'e kadar gelindi, sonra adım 1'de yeni soru üretildi (hazir(1) yine false)
    const d = [1, 2, 3, 4, 5].map((n) => demoAdimDurumu(n, 1, 4, H(2, 3, 5)));
    expect(d.map((x) => x.ulasilir)).toEqual([true, true, true, true, false]);
    expect(d[1].durum).toBe('tamam');
    expect(d[3].durum).toBe('acik');   // ulaşıldı ama hazir değil → ✓ yok
  });

  it('adım 5 ziyaret edilmeden ✓ olmaz (hazir hep true)', () => {
    expect(demoAdimDurumu(5, 4, 4, H(1, 2, 3, 5)).durum).toBe('kilitli');
    expect(demoAdimDurumu(5, 3, 5, H(1, 2, 3, 4, 5)).durum).toBe('tamam');
  });

  it('enUzak null (demo kapalı/eski durum) 1 sayılır', () => {
    expect(demoAdimDurumu(1, 1, null, H()).durum).toBe('simdiki');
    expect(demoAdimDurumu(2, 1, null, H()).ulasilir).toBe(false);
  });
});

describe('demo şeridi — HITL ve erişilebilirlik (kaynak)', () => {
  const tik = govde('renderDemoSerit');
  const liste = govde('demoAdimListesiHtml');

  it('adım tıklaması yalnız demoAdimaGit; ürün eylemi çağırmaz', () => {
    const blok = tik.slice(tik.indexOf('.js-demo-adim'), tik.indexOf('.js-demo-ileri'));
    expect(blok).toContain('demoAdimaGit(no)');
    for (const yasak of ['approve', 'publish', 'finishExam', 'publishResults', 'finalizeReview', 'loadDemoScenario', 'status =']) {
      expect(blok, yasak).not.toContain(yasak);
    }
    // demoAdimaGit de yalnız yönlendirme durumu yazar
    const git = govde('demoAdimaGit');
    expect(git).not.toMatch(/state\.(questions|exam|answers|reviews|aiEvals)\b/);
  });

  it('kilitli adım aria-disabled (disabled değil), nedeni describedby ve tıklamada duyurulur', () => {
    expect(liste).toContain('aria-disabled="true"');
    expect(liste).toContain('aria-describedby="demoKilitNeden"');
    expect(liste).not.toMatch(/[" ]disabled[ ">]/);
    expect(tik).toMatch(/aria-disabled[\s\S]{0,120}demoKilitUyar\(no\)/);
    const u = govde('demoKilitUyar');
    expect(u).toMatch(/demoDuyur\([\s\S]*_demoKilitUyari\.metin/);
    expect(u).toContain('demoKilitNedeni()');
  });

  it('W10 P2: kilit uyarısı şeritte GÖRÜNÜR, süreli, adım değişince temizlenir, veri yazmaz', () => {
    const u = govde('demoKilitUyar');
    expect(u).toContain('setTimeout(');
    expect(u).toContain('DEMO_KILIT_UYARI_MS');
    expect(u).toContain('renderDemoSerit()');
    expect(u).not.toMatch(/state\./);                       // yalnız geçici modül değişkeni
    expect(govde('demoSeridiHtml')).toContain('demo-kilit-uyari');
    expect(govde('demoAdimaGit')).toMatch(/if \(degisti\)[^\n]*_demoKilitUyari = null/);
    expect(govde('demoBitir')).toContain('_demoKilitUyari = null');
  });

  it('şu anki adım aria-current="step"; liste nav + ol içinde; yerel düğme', () => {
    expect(liste).toContain('aria-current="step"');
    expect(liste).toContain('<nav class="demo-adimlar" aria-label="Demo adımları"><ol>');
    expect(liste).toContain('<button type="button"');
  });

  it('duyuru bölgesi kalıcı ve şerit dışında (innerHTML ile silinmez)', () => {
    const d = govde('demoDuyur');
    expect(d).toContain('aria-live');
    expect(d).toContain('document.body.appendChild');
  });

  it('yeniden çizimde odak geri konur', () => {
    expect(tik).toContain('data-demo-adim');
    expect(tik).toMatch(/hedef\.focus\(/);
  });

  it('demoEnUzak kalıcı değil; demo başında 1, bitince null', () => {
    const kalici = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    expect(kalici).not.toContain('demoEnUzak');
    expect(govde('loadDemoScenario')).toContain('state.demoEnUzak = 1');
    expect(govde('demoBitir')).toContain('state.demoEnUzak = null');
  });

  it('ileri düğmesi ve kilit kuralı korunur (demo-yuru.mjs buna dayanır)', () => {
    expect(govde('demoSeridiHtml')).toContain('js-demo-ileri');
    expect(tik).toContain('if (!a || !a.hazir()) return;');
  });
});
