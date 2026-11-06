// ============================================================================
// §115 — Erişilebilirlik cilası: CSS'yi koruyan küçük testler.
//   1) Genel prefers-reduced-motion kuralı (bütün CSS dosyalarını kapsar)
//   2) Ekranda 12 px altı font-size kalmadı (CSS, app.js satır içi, HTML sayfaları)
//   3) outline:none yalnız :focus-visible eşiyle
//   4) Model bekleme/bitiş durumları TEK ortak role="status" bölgesinden
//   5) Havuz soru düzenleyicisinde şık metni sarar (390 px kırpılması)
//   6) axe taraması yalnız betikte; sayfaya yüklenmez
// app.js modül değil: işlevler kaynak metinden çıkarılıp new Function ile sınanır.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const oku = (p: string) => fs.readFileSync(path.join(kok, p), 'utf8');
const app = oku('public/app.js');
const CSS_DOSYALARI = ['public/app.css', ...fs.readdirSync(path.join(kok, 'public/css')).filter((f) => f.endsWith('.css')).map((f) => 'public/css/' + f)];
const yorumsuz = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}

/** @media print bloklarını çıkarır (kâğıt pt ölçüsüyle basılır; ekran kuralı değildir). */
function printsiz(css: string): string {
  let s = css;
  for (;;) {
    const i = s.indexOf('@media print');
    if (i < 0) return s;
    let d = 0, j = s.indexOf('{', i);
    for (; j < s.length; j++) { if (s[j] === '{') d++; else if (s[j] === '}' && --d === 0) break; }
    s = s.slice(0, i) + s.slice(j + 1);
  }
}

/** px karşılığı (px, rem, pt); em göreli olduğu için null. */
function pxDegeri(deger: number, birim: string): number | null {
  return birim === 'px' ? deger : birim === 'rem' ? deger * 16 : birim === 'pt' ? (deger * 4) / 3 : null;
}

describe('§115 hareket azaltma', () => {
  const css = yorumsuz(oku('public/app.css'));
  it('genel @media (prefers-reduced-motion: reduce) kuralı evrensel seçiciyle bütün animasyon ve geçişleri kapatır', () => {
    const m = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{([^}]*)\}/);
    expect(m, 'genel kural yok').not.toBeNull();
    const govde = m![1];
    for (const k of ['animation-duration', 'animation-iteration-count', 'transition-duration', 'scroll-behavior']) {
      expect(govde).toMatch(new RegExp(k + ':[^;]*!important'));
    }
    // 0 değil 0.01ms: transitionend/animationend yine tetiklenir (davranış değişmez).
    expect(govde).toContain('0.01ms');
  });
  it('hareket içeren CSS dosyalarının hepsi aynı sayfada yüklenir (evrensel kural onları da kapsar)', () => {
    const html = oku('public/index.html');
    for (const f of CSS_DOSYALARI) {
      if (!/\b(animation|transition)\s*:/.test(yorumsuz(oku(f)))) continue;
      expect(html, f).toContain('href="' + f.replace('public/', '') + '"');
    }
  });
  it('JS yumuşak kaydırma hareket azaltmaya uyar', () => {
    const smooth = app.match(/behavior: [^,}]*"smooth"[^,}]*/g) || [];
    expect(smooth.length).toBeGreaterThan(0);
    for (const s of smooth) expect(s).toContain('prefers-reduced-motion: reduce');
  });
});

describe('§115 en küçük yazı 12 px', () => {
  it('CSS dosyalarında ekran için 12 px altı font-size / font kısaltması yok', () => {
    const kalan: string[] = [];
    for (const f of CSS_DOSYALARI) {
      const s = printsiz(yorumsuz(oku(f)));
      for (const m of s.matchAll(/font-size:\s*([0-9.]+)(px|rem|pt)\b/g)) {
        const px = pxDegeri(Number(m[1]), m[2]);
        if (px !== null && px < 12) kalan.push(f + ': ' + m[0]);
      }
      for (const m of s.matchAll(/\bfont:\s*[^;]*?\b([0-9.]+)(px|rem)\b/g)) {
        const px = pxDegeri(Number(m[1]), m[2]);
        if (px !== null && px < 12) kalan.push(f + ': ' + m[0]);
      }
    }
    expect(kalan).toEqual([]);
  });
  it('--fs-1 (en küçük ölçek) 12 px', () => {
    expect(oku('public/app.css')).toMatch(/--fs-1:\s*12px/);
  });
  it('app.js satır içi stillerde ve HTML sayfalarında 12 px altı yok', () => {
    const kaynaklar = ['public/app.js', 'public/index.html', 'public/mimari.html', 'public/privacy-policy.html', 'public/veri-nereye-gider.html', 'public/404.html'];
    const kalan: string[] = [];
    for (const f of kaynaklar) {
      for (const m of printsiz(oku(f)).matchAll(/font-size:\s*([0-9.]+)px/g)) if (Number(m[1]) < 12) kalan.push(f + ': ' + m[0]);
    }
    expect(kalan).toEqual([]);
  });
});

describe('§115 görünür odak', () => {
  it('outline:none yalnız :not(:focus-visible) ile ya da :focus-visible halkası başka öğeye çizilirken', () => {
    const sorunlu: string[] = [];
    for (const f of CSS_DOSYALARI) {
      const s = yorumsuz(oku(f));
      for (const m of s.matchAll(/([^{}]+)\{[^}]*outline:\s*(none|0)\s*[;}]/g)) {
        const secici = m[1].trim();
        if (secici.includes(':not(:focus-visible)')) continue;
        // :focus-visible'da kutunun kendisine çizilmiyorsa halka bir çocuğa çizilmeli.
        if (secici.endsWith(':focus-visible')) {
          const kok = secici.replace(/:focus-visible$/, '');
          if (s.includes(kok + ':focus-visible > ')) continue;
        }
        if (/:(hover|active)|opt-drop|\[tabindex="-1"\]:focus:not/.test(secici)) continue;
        sorunlu.push(f + ': ' + secici);
      }
    }
    expect(sorunlu).toEqual([]);
  });
  it('panel, kazanım öğesi ve grubu klavye odağında görünür halka alır', () => {
    expect(oku('public/css/kabuk.css')).toMatch(/\.panel\[tabindex="-1"\]:focus-visible \{ outline: 2px solid/);
    const kz = oku('public/css/kazanim-secici.css');
    expect(kz).toMatch(/\.kz-oge:focus-visible \{ outline: 2px solid/);
    expect(kz).toMatch(/\.kz-grup:focus-visible > \.kz-satir \{ outline: 2px solid/);
  });
  it('kaydırılan kaplar klavyeyle odaklanır (axe scrollable-region-focusable)', () => {
    for (const sinif of ['heatmap-wrap', 'au-liste']) {
      const m = app.match(new RegExp('<div class="' + sinif + '"[^>]*>', 'g')) || [];
      expect(m.length, sinif).toBeGreaterThan(0);
      for (const t of m) expect(t).toMatch(/tabindex="0" role="region" aria-label="/);
    }
  });
});

describe('§115 ortak durum duyurusu (role="status")', () => {
  it('tek bölge: yalnız durumDuyur oluşturur; demoDuyur ona gider', () => {
    const d = tanim('durumDuyur');
    expect(d).toContain('setAttribute("role", "status")');
    expect(d).toContain('setAttribute("aria-live", "polite")');
    expect(d).toContain('document.body.appendChild');
    expect(tanim('demoDuyur')).toContain('durumDuyur(metin)');
    // Başka yerde ikinci kalıcı duyuru bölgesi kurulmuyor.
    expect((app.match(/setAttribute\("aria-live"/g) || []).length).toBe(1);
  });
  it('soru üretimi, değerlendirme, çözdürme (tekil + toplu), puan ve rubrik önerisi başta ve sonda duyurur', () => {
    for (const ad of ['onGenerateQuestions', 'finishExam', 'bagimsizCoz', 'bekleyenleriCoz', 'retryEvaluation', 'aiSuggestRubric']) {
      const g = tanim(ad);
      const n = (g.match(/durumDuyur\(/g) || []).length;
      expect(n, ad).toBeGreaterThanOrEqual(2);
      // Bitiş duyurusu finally'de ya da sonda: hata yolunda da susmaz.
      if (ad !== 'bekleyenleriCoz') expect(g.slice(g.indexOf('finally')), ad).toContain('durumDuyur(');
    }
  });
  it('bitiş metinleri: karar öğretmende (HITL), hata sessiz değil', () => {
    const AG_KOD = (() => { const b = app.indexOf('\nconst AI_AG_HATASI_METNI = '); return app.slice(b + 1, app.indexOf(';\n', b) + 2); })();
    const f = new Function(AG_KOD + tanim('agHatasiMi') + tanim('hataMetniTr') + tanim('puanOnerisiDuyuruMetni') + tanim('bagimsizCozumDuyuruMetni') +
      'return { puanOnerisiDuyuruMetni, bagimsizCozumDuyuruMetni };')();
    expect(f.puanOnerisiDuyuruMetni({ aiScore: 7, maxScore: 10 })).toBe('Puan önerisi geldi: 7 / 10. Karar sizin; onaylamadan kesinleşmez.');
    expect(f.puanOnerisiDuyuruMetni({ failed: true, error: 'kota doldu' })).toContain('alınamadı: kota doldu');
    expect(f.puanOnerisiDuyuruMetni(null)).toContain('alınamadı');
    expect(f.bagimsizCozumDuyuruMetni({ secilenSik: 'B', anahtarUyusmazligi: true }, 'A')).toContain('anahtar A ile UYUŞMUYOR');
    expect(f.bagimsizCozumDuyuruMetni({ secilenSik: 'A', anahtarUyusmazligi: false }, 'A')).toContain('anahtarla uyumlu');
    expect(f.bagimsizCozumDuyuruMetni({ hata: 'ağ' }, 'A')).toBe('Bağımsız çözüm yapılamadı: ağ.');
    // §119: eski kayıtta kalmış İngilizce ağ hatası Türkçe gösterilir
    expect(f.bagimsizCozumDuyuruMetni({ hata: 'Failed to fetch' }, 'A')).toMatch(/^Bağımsız çözüm yapılamadı: Yapay zekâ sunucusuna ulaşılamadı: .*yeniden deneyin\.$/);
    expect(f.bagimsizCozumDuyuruMetni({ cozulemedi: true }, 'A')).toContain('çözemedi');
  });
});

describe('§115 havuz soru düzenleyicisi 390 px', () => {
  it('şık metni textarea (satıra sarar); sınıf ve veri öznitelikleri aynı', () => {
    const g = tanim('poolEditHtml');
    expect(g).toMatch(/<textarea rows="1" class="pe-opt" data-qid=/);
    expect(g).not.toMatch(/<input type="text" class="pe-opt"/);
  });
  it('dar ekranda düzenleyici tam satır, kazanım alanı tam genişlik', () => {
    const css = oku('public/app.css');
    expect(css).toMatch(/\.pool-item:has\(\.pool-edit\) > \.p-body \{ flex: 1 0 100%/);
    expect(css).toMatch(/\.pool-edit \.field-row > \.field-kz \{ flex: 1 0 100%/);
    expect(css).toMatch(/\.pool-edit textarea\.pe-opt \{[^}]*field-sizing: content/);
  });
});

describe('§115 axe taraması yalnız betikte', () => {
  it('axe-core devDependency; public/ altında hiçbir yerde yüklenmez', () => {
    const pkg = JSON.parse(oku('package.json'));
    expect(pkg.devDependencies['axe-core']).toBeTruthy();
    expect(pkg.dependencies['axe-core']).toBeUndefined();
    for (const f of ['public/index.html', 'public/app.js', 'public/_headers']) expect(oku(f)).not.toMatch(/axe(-core|\.min\.js)/);
  });
  it('tarama betiği 5 rol × 1280/390 × açık/koyu tema dolaşır ve serious/critical ile başarısız olur', () => {
    const b = oku('tools/erisilebilirlik-tara.mjs');
    for (const r of ['content_expert', 'teacher', 'student', 'admin', 'parent']) expect(b).toContain("ad: '" + r + "'");
    expect(b).toContain('{ w: 1280, h: 800 }, { w: 390, h: 844 }');
    expect(b).toContain("const TEMALAR = ['light', 'dark']");
    expect(b).toContain("'wcag2aa'");
    expect(b).toMatch(/ozet\.critical \+ ozet\.serious > 0 \? 1 : 0/);
  });
});

describe('§115 başlık ve yer işaretleri', () => {
  it('marka adı h1, alt bilgi footer; panel adı gizli h2', () => {
    const html = oku('public/index.html');
    expect(html).toContain('<h1 class="name">Mihenk</h1>');
    expect(html).toContain('<footer class="colophon">');
    expect(tanim('initPanels')).toContain('<h2 class="gorsel-gizli" id="panelBaslik">');
    // Dar ekranda marka display:none DEĞİL, görsel olarak gizli (h1 ağaçta kalır).
    expect(oku('public/css/kabuk.css')).not.toMatch(/\.kb-marka \.titles,\s*\n/);
  });
});
