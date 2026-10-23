// §72 / W3 — İçerik Uzmanı kısa metin ön uyarısı.
// İstemcideki eşik (public/app.js ceMetinKapasitesi) sunucunun uyguladığı
// kuralla (src/lib/guards.ts makulSoruSayisi) BİREBİR aynı olmalı; ayrışırsa
// özet "~N soru taşır" derken sunucu başka sayıda soru döndürür.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { KARAKTER_BASINA_SORU, makulSoruSayisi } from '../src/lib/guards';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function istemciKapasitesi(): (n: number) => number {
  const bas = app.indexOf('\nfunction ceMetinKapasitesi(');
  expect(bas, 'ceMetinKapasitesi app.js içinde bulunmalı').toBeGreaterThan(0);
  const kod = app.slice(bas, app.indexOf('\n}\n', bas) + 3);
  const sabit = app.match(/\nconst KARAKTER_BASINA_SORU = (\d+);/);
  expect(sabit, 'KARAKTER_BASINA_SORU app.js içinde bulunmalı').not.toBeNull();
  // eslint-disable-next-line no-new-func
  return new Function('const KARAKTER_BASINA_SORU = ' + sabit![1] + ';\n' + kod + '\nreturn ceMetinKapasitesi;')();
}

describe('ceMetinKapasitesi — sunucu kuralıyla aynı', () => {
  const istemci = istemciKapasitesi();

  it('sabit aynı (180)', () => {
    expect(app).toContain('\nconst KARAKTER_BASINA_SORU = ' + KARAKTER_BASINA_SORU + ';');
  });

  it('0–6000 karakterin her birinde aynı sayı', () => {
    for (let n = 0; n <= 6000; n++) expect(istemci(n), n + ' karakter').toBe(makulSoruSayisi(n));
  });

  it('canlı ölçüm (§69): 484 karakter → 2 soru; alt sınır 2', () => {
    expect(istemci(484)).toBe(2);
    expect(istemci(30)).toBe(2);
    expect(istemci(540)).toBe(3);
  });
});
