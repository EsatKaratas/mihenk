// ============================================================================
// §84 — (1) renderAll yeniden çiziminde KAYBOLAN odak kurtarılır (W8 P2:
// "Evet, bitir" sonrası eşzamansız değerlendirme bitince odak BODY'ye
// düşüyordu). (2) Dil uyarısı tetikleyen sözcükleri gösterir (üç yol).
// Davranış gerçek tarayıcıda gecikmeli sahte /api/ai/evaluate ile ölçüldü
// (PROGRESS §84); bu dosya kaynak düzeyinde geri dönüşü yakalar ve
// dilTetikleyiciMetni'ni işlev olarak sınar.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

/** Üst düzey `function ad(` tanımının tam metni (bir sonraki üst düzey tanıma kadar). */
function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}

describe('renderAll — kaybolan odak kurtarılır (§84, W8 P2)', () => {
  it('renderAll izi baştan alır, sonda kurtarır', () => {
    const g = tanim('renderAll');
    expect(g).toMatch(/^function renderAll\(\) \{\n  const odakIzi = renderOdakIzi\(\);/);
    expect(g).toMatch(/bindFieldLabels\(\);\n  renderOdaginiKurtar\(odakIzi\);\n\}/);
  });

  it('yalnız panellerdeki odak izlenir; odak yerindeyse ya da pencere açıksa dokunulmaz', () => {
    expect(tanim('renderOdakIzi')).toContain('a.closest("#panels")');
    const k = tanim('renderOdaginiKurtar');
    expect(k).toContain('a !== document.body && a.isConnected) return;');
    expect(k).toContain('classList.contains("open")) return;');
    // Ortak yardımcı kullanılır, kaydırma sıçraması yok.
    expect(k).toContain('modalOdagiGeriVer(iz, { preventScroll: true })');
    expect(tanim('modalOdagiGeriVer')).toContain('hedef.focus(odakSecenek)');
  });
});

describe('dil uyarısı — tetikleyen sözcükler (§84)', () => {
  const TURKCE_HARF = /^[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]$/;
  const dilTetikleyiciMetni = new Function('TURKCE_HARF', tanim('dilTetikleyiciMetni') + '\nreturn dilTetikleyiciMetni;')(TURKCE_HARF) as
    (s: string[] | undefined, m: string[]) => string;

  it('sunucunun sözcükleri, en çok 3, üçte "…"', () => {
    expect(dilTetikleyiciMetni(['luôn'], [])).toBe('Türkçe olmayan: luôn');
    expect(dilTetikleyiciMetni(['a1', 'b2', 'c3'], [])).toBe('Türkçe olmayan: a1, b2, c3, …');
  });

  it('sözcük yoksa metindeki Türkçe dışı harfler; Türkçe (şapkalı dahil) metinde boş', () => {
    expect(dilTetikleyiciMetni([], ['Bu правильно'])).toBe('Türkçe olmayan karakter: п, р, а, …');
    expect(dilTetikleyiciMetni(undefined, ['durum下的'])).toBe('Türkçe olmayan karakter: 下, 的');
    expect(dilTetikleyiciMetni([], ['Kâğıt, hâlâ, ılık; ÇĞİÖŞÜ'])).toBe('');
  });

  it('üç yol da sözcükleri saklar ve gösterir', () => {
    expect(app).toContain('dilSozcukler: soruDilSozcukleri(q, j.meta && j.meta.dilUyarisiSozcukler)');
    expect((app.match(/dilSozcukler: \(j\.meta && j\.meta\.dilUyarisiSozcukler\) \|\| \[\]/g) || []).length).toBe(2);
    expect(tanim('degerlendirmeDilUyarisiHtml')).toContain('dilTetikleyiciMetni(ev.dilSozcukler');
    expect(tanim('denetimDurumHtml')).toContain('dilTetikleyiciMetni(c.dilSozcukler');
    // Rozet açıklaması sorunun GÜNCEL metnine göre süzer (uzman düzelttiyse eski sözcük yok).
    expect(app).toContain('dilTetikleyiciMetni(soruDilSozcukleri(q, q.dilSozcukler), soruDilMetinleri(q))');
  });
});
