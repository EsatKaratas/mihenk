// §116 — üçüncü entegrasyon (§114 OYSS + §115 erişilebilirlik) düzeltmesi (W9).
// §115'in 12 px testi yalnız px/rem/pt ölçüyordu; §114 OYSS kartı 13 px tabloda
// `.oyss-kod { font-size: 0.92em }` kullanınca ekranda 11,96 px ölçüldü.
// Bu test göreli küçültmeleri (em < 1, % < 100, smaller/x-small) de yakalar:
// yalnız `max(var(--fs-1), …)` ile tabana bağlananlar serbest.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..', 'public');
const cssDosyalari = [path.join(kok, 'app.css'), ...fs.readdirSync(path.join(kok, 'css')).filter((f) => f.endsWith('.css')).map((f) => path.join(kok, 'css', f))];
const oku = (f: string) => fs.readFileSync(f, 'utf8');
const printsiz = (s: string) => s.replace(/@media\s+print\s*\{[\s\S]*?\n\}/g, '');

describe('§116 göreli yazı küçültmesi 12 px tabanını delmez', () => {
  it('CSS’te tabansız em<1 / %<100 / smaller font-size yok', () => {
    const kalan: string[] = [];
    for (const f of cssDosyalari) {
      for (const m of printsiz(oku(f)).matchAll(/font-size:\s*([^;}]+)/g)) {
        const d = m[1].trim();
        if (/^max\(\s*var\(--fs-1\)/.test(d)) continue;
        const em = d.match(/^([0-9.]+)em\b/);
        const yuzde = d.match(/^([0-9.]+)%/);
        if ((em && Number(em[1]) < 1) || (yuzde && Number(yuzde[1]) < 100) || /^(smaller|x-small|xx-small|small)\b/.test(d)) {
          kalan.push(path.basename(f) + ': ' + m[0]);
        }
      }
    }
    expect(kalan).toEqual([]);
  });
  it('.oyss-kod en az --fs-1 (12 px)', () => {
    const css = oku(path.join(kok, 'css', 'ogretmen.css'));
    expect(css).toMatch(/\.oyss-kod \{[^}]*font-size: max\(var\(--fs-1\), 0\.92em\)/);
    expect(oku(path.join(kok, 'app.css'))).toMatch(/--fs-1:\s*12px/);
  });
});
