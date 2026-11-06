// §113 — ikinci yayın öncesi üç düzeltme (W9): ⋯ menüsü kapanması, Tek Tıkla
// işleyicisinde ölçüt savunması, öğretmen onam taslağının §111 ile eşitlenmesi.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');
function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}

describe('1 · ⋯ menüsü (ogt-menu)', () => {
  it('menü öğesi seçilince menü kapanır ve odak tetikleyiciye döner', () => {
    const w = fonksiyonMetni('wireExamSwitcher');
    expect(w).toContain('const menu = b.closest("details.ogt-menu");');
    expect(w).toContain('if (menu) ogtMenuKapat(menu, true);');
    const k = fonksiyonMetni('ogtMenuKapat');
    expect(k).toContain('menu.open = false;');
    expect(k).toContain('s.focus()');
  });
  it('Escape kapatır (odak tetikleyiciye); bir menü açılınca diğerleri kapanır; dışarı tıklama kapatır', () => {
    const w = fonksiyonMetni('wireExamSwitcher');
    expect(w).toContain('if (e.key === "Escape" && m.open) { e.preventDefault(); e.stopPropagation(); ogtMenuKapat(m, true); }');
    expect(w).toContain('if (x !== m) ogtMenuKapat(x, false);');
    expect(w).toContain('if (tetik) tetik.onclick = function () {');
    expect(w).not.toContain('m.ontoggle');
    expect(w).toContain('ogtMenuDisTiklamaKur();');
    const d = fonksiyonMetni('ogtMenuDisTiklamaKur');
    expect(d).toContain('if (_ogtMenuDisKurulu) return;');
    expect(d).toContain('if (!m.contains(e.target)) ogtMenuKapat(m, false);');
  });
  it('menü bileşeni tek yerde (sınav kartı)', () => {
    expect(app.split('<details class="ogt-menu">').length - 1).toBe(1);
  });
});

describe('2 · Tek Tıkla işleyicisinde ölçüt savunması (§103 deseni)', () => {
  const bag = app.slice(app.indexOf('document.querySelectorAll(".approve-as-is")'), app.indexOf('document.querySelectorAll(".revise-approve")'));
  it('enjeksiyon savunması duruyor, ölçüt savunması finalizeReview’dan ÖNCE', () => {
    const enj = bag.indexOf('enjeksiyonIsareti(ev, ((ss.answers || {})[qid] || {}).text).var) return;');
    const kr = bag.indexOf('if (kriterDegisti(qid, sid, ev)) return;');
    const fin = bag.indexOf('finalizeReview(');
    expect(enj).toBeGreaterThan(0);
    expect(kr).toBeGreaterThan(enj);
    expect(fin).toBeGreaterThan(kr);
  });
  it('kriterDegisti: açık ve değişmiş taslakta true, değişmemişte false (işleyici gerçekten durur)', () => {
    const kod = ['kriterAnahtari', 'kriterPuanNormal', 'kriterKaydi', 'kriterDegisti'].map(fonksiyonMetni).join('\n');
    // eslint-disable-next-line no-new-func
    const f = new Function('var _kriterTaslak = {};\n' + kod + '\nreturn { _kriterTaslak, kriterDegisti };')();
    const ev = { breakdown: [{ label: 'A', points: 4, max: 8 }, { label: 'B', points: 3, max: 6 }] };
    expect(f.kriterDegisti(1, 2, ev)).toBe(false);
    f._kriterTaslak['1|2'] = { acik: true, degerler: { 0: '4' } };
    expect(f.kriterDegisti(1, 2, ev)).toBe(false);
    f._kriterTaslak['1|2'].degerler[1] = '2';
    expect(f.kriterDegisti(1, 2, ev)).toBe(true);
    f._kriterTaslak['1|2'].degerler[1] = '99';
    expect(f.kriterDegisti(1, 2, ev)).toBe(true);   // geçersiz de tek tıkı durdurur
    f._kriterTaslak['1|2'].acik = false;
    expect(f.kriterDegisti(1, 2, ev)).toBe(false);
  });
});

describe('3 · öğretmen onam taslağı §111/§112 ile eşit', () => {
  const md = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'kvkk', 'OGRETMEN-ONAM-TASLAK.md'), 'utf8');
  it('eski yer tutucu ve yanlış adımlar kalktı', () => {
    expect(md).not.toContain('henüz yoktu; adımlar o bölümle eşitlenmeli');
    expect(md).not.toContain('rastgele yeni bir kimlikle değiştirilir');
    expect(md).not.toContain('ilk 80 karakteri');
  });
  it('gerçek davranış: beyaz liste, çıkarılanlar, tuzlu SHA-256, kriterFarklari, dakika', () => {
    expect(md).toContain('**Beyaz liste:**');
    expect(md).toMatch(/öğrenci adı ve sistem içi öğrenci numarası, soru metni, serbest\s+notlarınız, yapay zekâ gerekçesi ve ölçüt adları pakete girmez/);
    expect(md).toContain('**SHA-256 özeti**');
    expect(md).toContain('Tuz pakete yazılmaz');
    expect(md).toContain('`kriterFarklari`');
    expect(md).toContain('dakika hassasiyetindedir');
  });
  it('kodla tutarlı: beyaz listede ad/metin alanı yok; paket zamanı dakikaya kırpar', () => {
    const bas = app.indexOf('const ARASTIRMA_ALANLARI');
    const liste = app.slice(bas, app.indexOf('];', bas));
    for (const yasak of ['"soru"', '"sid"', '"not"', '"justification"', '"kriterler"', '"ogrenci"', '"teacherName"']) {
      expect(liste).not.toContain(yasak);
    }
    expect(fonksiyonMetni('arastirmaPaketi')).toContain('.toISOString().slice(0, 16) + "Z"');
  });
});
