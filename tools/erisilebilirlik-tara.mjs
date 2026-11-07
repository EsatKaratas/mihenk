/**
 * Mihenk erişilebilirlik taraması (axe-core, WCAG 2.x A/AA + en iyi uygulama).
 *
 * Kullanım:
 *   node tools/erisilebilirlik-tara.mjs --url http://127.0.0.1:8807 --cikti <klasör> [--etiket once|sonra]
 *
 * axe-core SAYFAYA YÜKLENMEZ (public/ altına girmez, canlıya gitmez): yalnız bu
 * betik Playwright ile tarama anında enjekte eder. axe-core devDependency'dir;
 * node_modules'ta yoksa MIHENK_AXE_YOLU=<axe.min.js yolu> verilebilir.
 *
 * Tarama: giriş + 5 rol (sekmeleriyle, gorsel-fark.mjs ile aynı liste) ×
 * 1280/390 × açık/koyu tema (data-theme; index.html açığı sabitler, koyu zorlanır). /api/ai/* engelli → model
 * çağrısı 0. Çıktı: <klasör>/axe-<etiket>.json (ekran başına ihlal listesi) ve
 * konsola etki düzeyine göre özet.
 *
 * Çıkış kodu: 0 = "serious"/"critical" ihlal yok, 1 = var, 2 = sunucu kapalı.
 */
import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

let url = 'http://127.0.0.1:8807';
let cikti = '';
let etiket = 'tarama';
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--url') url = a[++i];
  else if (a[i] === '--cikti') cikti = a[++i];
  else if (a[i] === '--etiket') etiket = a[++i];
}
if (!cikti) { console.error('Kullanım: --url <url> --cikti <klasör> [--etiket ad]'); process.exit(1); }
mkdirSync(cikti, { recursive: true });

function axeYolu() {
  if (process.env.MIHENK_AXE_YOLU && existsSync(process.env.MIHENK_AXE_YOLU)) return process.env.MIHENK_AXE_YOLU;
  try { return createRequire(import.meta.url).resolve('axe-core/axe.min.js'); } catch { /* aşağıda */ }
  console.error('axe-core bulunamadı: `npm ci` ya da MIHENK_AXE_YOLU=<axe.min.js>');
  process.exit(1);
}
const AXE = readFileSync(axeYolu(), 'utf-8');

const ROLLER = [
  { ad: 'content_expert', alan: 'ceTab', sekmeler: [1, 2] },
  { ad: 'teacher', alan: 'teacherTab', sekmeler: [0, 1, 5, 3, 4, 6] },   // 6: §125 Gözlem
  { ad: 'student', alan: 'studentTab', sekmeler: [1, 2, 3] },
  { ad: 'admin', alan: null, sekmeler: [1] },
  { ad: 'parent', alan: null, sekmeler: [1] },
];
const GENISLIKLER = [{ w: 1280, h: 800 }, { w: 390, h: 844 }];
const TEMALAR = ['light', 'dark'];
const ETIKETLER = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

let tarayici;
try { tarayici = await chromium.launch({ channel: 'chrome' }); } catch { tarayici = await chromium.launch(); }

async function tara(p) {
  return p.evaluate(async (etiketler) => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: etiketler },
      resultTypes: ['violations', 'incomplete'],
    });
    // Kontrastı axe'in karar veremediği düğümler (zemin görseli, örtüşme) ayrıca sayılır.
    const kontrastBelirsiz = (r.incomplete.find((v) => v.id === 'color-contrast') || { nodes: [] }).nodes.length;
    // Sayfada ölçülen küçük yazı: kendi metni olan, görünür öğelerde hesaplanan
    // font-size < 12 px (CSS dosyası değil, tarayıcının çizdiği değer).
    const kucuk = {};
    for (const el of document.querySelectorAll('body *')) {
      if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 12) { const k = el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '') + ' ' + fs + 'px'; kucuk[k] = (kucuk[k] || 0) + 1; }
    }
    return { kontrastBelirsiz, kucuk, ihlal: r.violations.map((v) => ({
      id: v.id, impact: v.impact, help: v.help,
      dugumler: v.nodes.map((n) => ({ hedef: n.target.join(' '), ozet: (n.failureSummary || '').split('\n').slice(1, 3).join(' | ').slice(0, 220) })),
    })) };
  }, ETIKETLER);
}

const ekranlar = [];
for (const tema of TEMALAR) {
  for (const { w, h } of GENISLIKLER) {
    const baglam = await tarayici.newContext({ viewport: { width: w, height: h }, colorScheme: tema, reducedMotion: 'reduce' });
    const p = await baglam.newPage();
    await p.route('**/api/ai/**', (r) => r.abort());
    try {
      const y = await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      if (!y || y.status() >= 400) throw new Error('HTTP ' + (y && y.status()));
    } catch (e) { console.error('Sunucu kapalı: ' + url + ' — ' + e.message); await tarayici.close(); process.exit(2); }
    // index.html <html data-theme="light"> ile açık temayı SABİTLER (ürün kararı);
    // prefers-color-scheme tek başına koyu temayı açmaz. Koyu paletin kendisi
    // app.css'te durduğu için tarama onu data-theme="dark" ile zorlar.
    await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
    await p.addScriptTag({ content: AXE });
    await p.evaluate(() => document.fonts.ready);
    const kaydet = async (ad) => {
      const { ihlal, kontrastBelirsiz, kucuk } = await tara(p);
      ekranlar.push({ ekran: `${ad}-${w}-${tema}`, ad, genislik: w, tema, kontrastBelirsiz, kucukYazi: kucuk, ihlal });
      const say = ihlal.reduce((t, v) => t + v.dugumler.length, 0);
      console.log(`  ${(ad + '-' + w + '-' + tema).padEnd(30)} kural ${String(ihlal.length).padStart(2)} · düğüm ${say}`);
    };
    await kaydet('giris');
    await p.evaluate(() => {
      loadDemoScenario(); demoSeridiniKapat();
      const k = document.getElementById('girisKapisi'); if (k) { k.hidden = true; document.body.style.overflow = ''; }
      renderAll();
    });
    await p.waitForLoadState('networkidle');
    for (const rol of ROLLER) {
      for (const s of rol.sekmeler) {
        await p.evaluate(({ ad, alan, s }) => { state.role = ad; if (alan) state[alan] = s; renderAll(); window.scrollTo(0, 0); }, { ad: rol.ad, alan: rol.alan, s });
        await p.waitForLoadState('networkidle');
        await p.waitForTimeout(400);
        await kaydet(`${rol.ad}-${s}`);
      }
    }
    await baglam.close();
  }
}
await tarayici.close();

// Özet: etki düzeyi × kural (düğüm sayısı)
const ozet = { critical: 0, serious: 0, moderate: 0, minor: 0 };
const kurallar = {};
for (const e of ekranlar) for (const v of e.ihlal) {
  ozet[v.impact] = (ozet[v.impact] || 0) + v.dugumler.length;
  const k = (kurallar[v.id] ||= { impact: v.impact, help: v.help, dugum: 0, ekran: 0, acik: 0, koyu: 0 });
  k.dugum += v.dugumler.length; k.ekran++; k[e.tema === 'dark' ? 'koyu' : 'acik'] += v.dugumler.length;
}
const kucukTum = {};
for (const e of ekranlar) for (const [k, n] of Object.entries(e.kucukYazi)) kucukTum[k] = (kucukTum[k] || 0) + n;
const kucukToplam = Object.values(kucukTum).reduce((t, n) => t + n, 0);
const belirsiz = ekranlar.reduce((t, e) => t + e.kontrastBelirsiz, 0);
writeFileSync(path.join(cikti, `axe-${etiket}.json`), JSON.stringify({ url, tarih: new Date().toISOString(), ozet, kucukToplam, kucukYazi: kucukTum, kontrastBelirsiz: belirsiz, kurallar, ekranlar }, null, 2));
console.log(`\n<12 px yazılı öğe (sayfada ölçüldü, ekranlar toplamı): ${kucukToplam} · ayrı seçici+boyut ${Object.keys(kucukTum).length}`);
for (const [k, n] of Object.entries(kucukTum).sort((x, y) => y[1] - x[1]).slice(0, 12)) console.log(`  ${n}× ${k}`);
console.log(`Kontrast: axe'in karar veremediği düğüm (incomplete) ${belirsiz}`);
console.log(`Ekran: ${ekranlar.length} · düğüm: critical ${ozet.critical} · serious ${ozet.serious} · moderate ${ozet.moderate} · minor ${ozet.minor}`);
for (const [id, k] of Object.entries(kurallar).sort((x, y) => y[1].dugum - x[1].dugum)) {
  console.log(`  [${k.impact}] ${id}: ${k.dugum} düğüm / ${k.ekran} ekran (açık ${k.acik}, koyu ${k.koyu}) — ${k.help}`);
}
process.exit(ozet.critical + ozet.serious > 0 ? 1 : 0);
