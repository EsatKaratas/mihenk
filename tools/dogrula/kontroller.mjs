// W8 — onay pencereleri (gerçek tuş), §71 (TOHUMLA), Sıfırla, katalog, "Evet, bitir" odağı,
// yönetici filtresi, kısa metin, rol/sekme konsol taraması. Model çağrısı 0:
// /api/ai POST engelli; yalnız /evaluate, kayıtlı GERÇEK yanıtla 1,5 sn gecikmeli karşılanır.
// Kullanım: node kontroller.mjs <url> <genislik> <kayitli-evaluate.json>
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'https://mihenk.bies.workers.dev';
const W = Number(process.argv[3] || 1280);
const YANIT = process.argv[4];
let tarayici;
try { tarayici = await chromium.launch({ channel: 'chrome' }); } catch { tarayici = await chromium.launch(); }
const p = await (await tarayici.newContext({ viewport: { width: W, height: W < 600 ? 844 : 800 } })).newPage();
const hatalar = [], engellenen = [], dialoglar = [];
p.on('console', (m) => { if (m.type() === 'error' && !((m.location()?.url) || '').includes('/api/ai/')) hatalar.push(m.text()); });
p.on('pageerror', (e) => hatalar.push('pageerror: ' + e));
p.on('dialog', async (d) => { dialoglar.push(d.type()); await d.dismiss(); });
await p.route('**/api/ai/**', async (r) => {
  if (r.request().method() === 'GET') return r.continue();
  if (YANIT && r.request().url().includes('/api/ai/evaluate')) { await new Promise((z) => setTimeout(z, 1500)); return r.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(YANIT, 'utf-8') }); }
  engellenen.push(r.request().url()); return r.abort();
});
let gec = 0, kal = 0; const kalanlar = [];
const ok = (ad, k, ek = '') => { if (k) gec++; else { kal++; kalanlar.push(ad + ' ' + ek); } console.log(`  ${k ? '✓' : '✗'} ${ad}${ek ? ' — ' + ek : ''}`); };
const acik = () => p.evaluate(() => document.getElementById('modalOverlay').classList.contains('open'));
const odak = () => p.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : (a.id || (a.className || '').toString().split(' ').find((c) => c.startsWith('js-')) || a.tagName + ':' + a.textContent.trim().slice(0, 25)); });
const kutuIcinde = () => p.evaluate(() => document.getElementById('modalBox').contains(document.activeElement));
const rol = () => p.evaluate(() => [document.getElementById('modalBox').getAttribute('role'), document.getElementById('modalBox').getAttribute('aria-modal')]);
const bekle = (ms = 250) => p.waitForTimeout(ms);
const tabDongu = async () => { let ic = 0; for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); await bekle(60); if (await kutuIcinde()) ic++; } for (let i = 0; i < 3; i++) { await p.keyboard.press('Shift+Tab'); await bekle(60); if (await kutuIcinde()) ic++; } return `${ic}/9`; };

await p.goto(url, { waitUntil: 'networkidle' });
await p.locator('#gkDemoBtn').click(); await bekle(600);

console.log(`\n[§71 şüpheli soru — TOHUMLA] ${W}px`);
await p.evaluate(() => { const q = state.questions.find((x) => x.status === 'ai_generated'); q.hesapUyusmazligi = true; renderAll(); });
const onayDug = p.getByRole('button', { name: /Onayla → Havuza Aktar/ }).first();
const bekleyen = () => p.evaluate(() => state.questions.filter((x) => x.status === 'ai_generated').length);
await onayDug.click(); await bekle();
const r71 = await rol(); ok('§71 açık, dialog/aria-modal, odak Vazgeç', await acik() && r71.join() === 'dialog,true' && (await odak()) === 'modalCancel', `${r71} ${await odak()}`);
ok('§71 Tab döngüsü', (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle(); ok('§71 Escape: kapandı, onay yok', !(await acik()) && (await bekleyen()) === 1);
await onayDug.click(); await bekle(); await p.locator('#modalCancel').focus(); await p.keyboard.press('Enter'); await bekle();
ok('§71 Vazgeç+Enter: onay yok', !(await acik()) && (await bekleyen()) === 1);
await onayDug.click(); await bekle(); await p.locator('#modalSupheOnay').focus(); await p.keyboard.press('Enter'); await bekle();
ok('§71 "Yine de onayla"+Enter ONAYLAMAZ', (await bekleyen()) === 1);
if (!(await acik())) { await onayDug.click(); await bekle(); }
await p.locator('#modalSupheOnay').focus(); await p.keyboard.press('Space'); await bekle();
ok('§71 Space onaylar, odak BODY değil', !(await acik()) && (await bekleyen()) === 0 && (await odak()) !== 'BODY', await odak());

console.log(`\n[Karar günlüğü temizle] ${W}px`);
await p.evaluate(() => { demoBitir(); state.role = 'admin'; renderAll(); });
const audit = () => p.evaluate(() => (state.auditLog || []).length);
const n0 = await audit(); const temizle = p.locator('#btnAuditTemizle');
await temizle.scrollIntoViewIfNeeded(); await temizle.click(); await bekle();
const rA = await rol(); ok('günlük alertdialog, odak Vazgeç, kırmızı', rA.join() === 'alertdialog,true' && (await odak()) === 'modalCancel' && (await p.locator('#modalBox .btn-critical').count()) >= 1, `${rA} ${await odak()}`);
ok('günlük Tab döngüsü', (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle();
ok('günlük Escape: veri aynı, odak açana döndü', !(await acik()) && (await audit()) === n0 && (await odak()) === 'btnAuditTemizle', `${n0}→${await audit()} ${await odak()}`);
await temizle.click(); await bekle(); await p.keyboard.press('Enter'); await bekle();
ok('günlük Enter@Vazgeç: veri aynı', !(await acik()) && (await audit()) === n0);

console.log(`\n[Sıfırla — ⋯ menüsü] ${W}px`);
const veri = () => p.evaluate(() => JSON.stringify([state.questions.length, (state.auditLog || []).length, state.exam && state.exam.status]));
const v0 = await veri();
const sifirlaAc = async () => { await p.locator('.js-ek-menu').first().click(); await bekle(); await p.locator('.js-ek-sifirla').first().click(); await bekle(); };
await sifirlaAc();
const rS = await rol(); ok('Sıfırla açık, dialog, odak Vazgeç, kırmızı dolgu', await acik() && rS.join() === 'dialog,true' && (await odak()) === 'modalCancel' && (await p.locator('#modalBox .btn-critical.btn-dolu').count()) === 1, `${rS} ${await odak()}`);
ok('Sıfırla Tab döngüsü', (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle(400);
ok('Sıfırla Escape: veri aynı, odak ⋯', !(await acik()) && (await veri()) === v0 && (await odak()) === 'js-ek-menu', `${await odak()}`);
await sifirlaAc(); await p.locator('#modalCancel').focus(); await p.keyboard.press('Enter'); await bekle(400);
ok('Sıfırla Enter@Vazgeç: veri aynı, odak ⋯', !(await acik()) && (await veri()) === v0 && (await odak()) === 'js-ek-menu', `${await odak()}`);

console.log(`\n[Katalog penceresi] ${W}px`);
await p.evaluate(() => { state.role = 'content_expert'; state.ceTab = 1; renderAll(); });
const kz = () => p.evaluate(() => OUTCOMES_LIST().length);
const k0 = await kz(); const katBtn = p.locator('#btnKatalog');
if (!(await katBtn.isVisible())) { await p.getByText(/Ne için\?/).first().click().catch(() => {}); await bekle(); }
const katAc = async () => { await katBtn.scrollIntoViewIfNeeded(); await katBtn.click(); await p.waitForSelector('#katEkle', { timeout: 15000 }); await bekle(300); };
// §98 (B3): katalog listesi ortak seçici (coklu); kapalı ünite dalını açıp ilk işaretsiz kazanımı işaretler.
const katIsaretle = async () => { const bos = '#kz-katalog-agac .kz-oge[aria-checked="false"]'; if (!(await p.locator(bos).count())) { await p.locator('#kz-katalog-agac .kz-grup[aria-expanded="false"]').first().click(); await bekle(100); } await p.locator(bos).first().click(); };
await katAc();
const rK = await rol(); ok('katalog açık, dialog', await acik() && rK.join() === 'dialog,true', `${rK}`);
await katIsaretle(); await bekle(100);
ok('katalog Tab döngüsü', (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle(400);
ok('katalog Escape (seçim yapılmışken): eklenmedi, odak açana döndü', !(await acik()) && (await kz()) === k0 && (await odak()) === 'btnKatalog', `${k0}→${await kz()} ${await odak()}`);
await katAc(); await katIsaretle(); await p.locator('#modalCancel').focus(); await p.keyboard.press('Enter'); await bekle(400);
ok('katalog Enter@Kapat: eklenmedi', !(await acik()) && (await kz()) === k0, `${k0}→${await kz()}`);

console.log(`\n[Sınavı bitir + odak] ${W}px`);
await p.evaluate(() => { state.role = 'teacher'; state.teacherTab = 1; ogtDurum().sihirbaz = 3; renderAll(); document.getElementById('btnPublishExam').click(); state.role = 'student'; state.studentTab = 1; renderAll(); });
await p.getByRole('button', { name: /Sınava Başla/ }).first().click(); await bekle();
await p.getByRole('button', { name: /Gözden geçir ve bitir/ }).first().click(); await bekle();
const bitir = p.getByRole('button', { name: /^Sınavı bitir/ }).first();
const sd = () => p.evaluate(() => state.examStatus);
await bitir.click(); await bekle();
ok('bitir dialog + Tab döngüsü', (await rol()).join() === 'dialog,true' && (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle(); ok('bitir Escape: bitmedi', !(await acik()) && (await sd()) === 'in_progress', await sd());
await bitir.click(); await bekle(); await p.locator('#modalCancel').focus(); await p.keyboard.press('Enter'); await bekle();
ok('bitir Enter@Vazgeç: bitmedi', !(await acik()) && (await sd()) === 'in_progress', await sd());
await bitir.click(); await bekle(); await p.getByRole('button', { name: /Evet, bitir/ }).focus(); await p.keyboard.press('Enter');
await bekle(3500);
ok('Evet, bitir (Enter) → değerlendirme bitince odak H3 (§84)', ['submitted', 'graded'].includes(await sd()) && /^H3/.test(await odak()) && await p.evaluate(() => !state.ai.busy), `${await sd()} ${await odak()}`);

console.log(`\n[Yönetici filtresi] ${W}px`);
await p.evaluate(() => { state.role = 'admin'; renderAll(); window.scrollTo(0, 0); });
const sec = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.js-yon-filtre')].map((s) => [s.dataset.boyut, { id: s.id, ops: [...s.options].map((o) => o.value).filter(Boolean) }])));
const ozet = () => p.evaluate(() => ({ url: location.href, kayit: localStorage.getItem('mihenk.yonetici.filtre.v1'), metin: document.getElementById('panel-admin').innerText.replace(/\s+/g, ' ') }));
const s = async (b, v) => { await p.locator('#' + sec[b].id).selectOption(v); await bekle(400); };
const f0 = await ozet();
await s('sinif', sec.sinif.ops[0]); const b1 = await ozet();
ok(`B1 sınıf=${sec.sinif.ops[0]}`, b1.metin !== f0.metin && b1.url === f0.url && (b1.kayit || '').includes(sec.sinif.ops[0]));
await s('ders', sec.ders.ops[0]); await s('ogretmen', sec.ogretmen.ops[0]); const b2 = await ozet();
ok('B2 sınıf+ders+öğretmen, URL aynı', b2.url === f0.url);
await s('ders', ''); await s('ogretmen', ''); await s('sinif', sec.sinif.ops[1] || sec.sinif.ops[0]); const b3 = await ozet();
ok(`B3 sınıf=${sec.sinif.ops[1]}`, b3.metin !== b1.metin || !sec.sinif.ops[1]);
await p.getByRole('button', { name: /Filtreleri temizle/ }).first().click(); await bekle(400);
ok('Filtreleri temizle → filtresiz', (await ozet()).metin === f0.metin);

console.log(`\n[Kısa metin uyarısı] ${W}px`);
const e0 = engellenen.length;
await p.evaluate(() => { state.role = 'content_expert'; state.ceTab = 1; renderAll(); });
const ceText = p.locator('#ceText');
if (!(await ceText.isVisible())) { await p.getByText(/Neye dayansın/).first().click().catch(() => {}); await bekle(); }
await ceText.click(); await ceText.fill(''); await p.keyboard.type('Sürtünme kuvveti, birbirine temas eden iki yüzey arasında harekete zıt yönde oluşan kuvvettir. Pürüzlü yüzeylerde daha büyüktür.', { delay: 2 }); await p.keyboard.press('Tab'); await bekle(500);
const uy = await p.getByText(/Bu metin ~\d+ soru taşır/).first().innerText().catch(() => '');
ok('kısa metin uyarısı, istek yok', /~2 soru taşır; \d+ istendi, fazlası düşer/.test(uy) && engellenen.length === e0, uy);

console.log(`\n[Konsol taraması] ${W}px`);
const h0 = hatalar.length;
const ekr = await p.evaluate(async () => { const o = []; const t = { content_expert: ['ceTab', [1, 2]], teacher: ['teacherTab', [0, 1, 2, 3, 4]], student: ['studentTab', [1, 2, 3]], admin: [null, [0]], parent: [null, [0]] };
  for (const [r, [a, l]] of Object.entries(t)) for (const n of l) { state.role = r; if (a) state[a] = n; renderAll(); await new Promise((z) => setTimeout(z, 200)); o.push(document.documentElement.scrollWidth > innerWidth ? 'TAŞMA' : 'ok'); } return o; });
ok(`${ekr.length} ekran: konsol hatası 0, taşma 0`, hatalar.length === h0 && !ekr.includes('TAŞMA'));

console.log(`\nSONUÇ ${W}px: geçti ${gec}, kaldı ${kal}; konsol hatası ${hatalar.length}; yerel dialog ${dialoglar.length}; engellenen /api/ai POST ${engellenen.length}`);
kalanlar.forEach((k) => console.log('  KALDI: ' + k)); hatalar.forEach((h) => console.log('  hata: ' + h));
await tarayici.close();
