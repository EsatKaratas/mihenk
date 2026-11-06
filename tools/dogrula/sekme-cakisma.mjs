// §119 — İki sekme, aynı origin (aynı tarayıcı bağlamı = aynı localStorage ve IndexedDB).
// Ölçülen: başka sekmenin yazımı bu sekmenin eski belleğiyle sessizce SİLİNEMEZ;
// eski sekmede "Veri başka sekmede değişti" kutusu çıkar ve yeniden yükleme güncel veriyi getirir.
// Model çağrısı 0: /api/** GET dışı istekler kesilir, GET'ler 404 ile karşılanır.
// Kullanım: node tools/dogrula/sekme-cakisma.mjs <url>     Çıkış kodu: 0 = hepsi geçti.
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'https://mihenk.bies.workers.dev';
let t; try { t = await chromium.launch({ channel: 'chrome' }); } catch { t = await chromium.launch(); }
const ctx = await t.newContext({ viewport: { width: 1280, height: 800 } });
const POST = [], hata = [];
await ctx.route('**/api/**', (r) => { if (r.request().method() !== 'GET') { POST.push(r.request().url()); return r.abort(); } return r.fulfill({ status: 404, json: {} }); });
const ac = async () => { const p = await ctx.newPage(); p.on('pageerror', (e) => hata.push(e.message)); await p.goto(URL, { waitUntil: 'networkidle' }); return p; };
const KEY = 't3-olcme-durum-v1';
const depo = (p) => p.evaluate((k) => { const r = localStorage.getItem(k); const d = r ? JSON.parse(r) : { questions: [] }; return { soru: (d.questions || []).length, ids: (d.questions || []).map((q) => q.id), rol: d.role || '' }; }, KEY);
const kutu = (p) => p.evaluate(() => { const e = document.getElementById('sekmeCakisma'); return e ? { gorunur: !!(e.offsetWidth || e.offsetHeight), rol: e.getAttribute('role'), metin: e.innerText.replace(/\s+/g, ' ').trim() } : null; });
let gec = 0, kal = 0;
const ok = (ad, k, ek = '') => { k ? gec++ : kal++; console.log(`  ${k ? '✓' : '✗'} ${ad}${ek ? ' — ' + ek : ''}`); };

console.log('[1] fikir2 senaryosu: B açık, A demo yükler, B rol kartına basar');
const B = await ac();
const A = await ac();
await A.evaluate(() => { loadDemoScenario(); renderAll(); });
const aDemo = await depo(A);
await B.bringToFront();
await B.locator('#girisKapisi .gk-kart[data-role="teacher"]').click();
await B.waitForTimeout(600);
const sonra1 = await depo(B);
ok('A\'nın soruları depoda kaldı', aDemo.soru > 0 && sonra1.soru === aDemo.soru, `${aDemo.soru} → ${sonra1.soru}`);
const k1 = await kutu(B);
ok('B\'de kutu görünür, role=alert', !!(k1 && k1.gorunur && k1.rol === 'alert'), k1 ? k1.metin.slice(0, 60) : 'yok');
ok('A\'da kutu yok (A çalışmaya devam eder)', !(await kutu(A)));
await A.bringToFront(); await A.reload({ waitUntil: 'networkidle' });
ok('A yenilenince veri aynen', (await depo(A)).soru === aDemo.soru);

console.log('[2] Yalnız açılan sekme diğerini kilitlemez');
await B.reload({ waitUntil: 'networkidle' });
const C = await ac(); await C.waitForTimeout(400);
ok('B ve C açılınca A\'da kutu yok', !(await kutu(A)));
await C.close();

console.log('[3] A soru ekler; B eski bellekle yazmaya çalışır');
await A.evaluate(() => { state.questions.push({ id: 990001, type: 'mc', status: 'draft', body: 'A sekmesinin sorusu', options: [], outcome: '' }); saveState(); });
await B.bringToFront();
await B.evaluate(() => { state.role = 'student'; renderAll(); });
await B.waitForTimeout(300);
const d3 = await depo(B);
ok('A\'nın yeni sorusu korunur', d3.ids.includes(990001));
ok('B\'de kutu', !!(await kutu(B)));

console.log('[4] Olay kaçsa bile sürüm damgası korur');
const D = await ac(); const E = await ac();
await E.evaluate(() => { state.questions.push({ id: 990002, type: 'mc', status: 'draft', body: 'E sorusu', options: [], outcome: '' }); saveState(); });
await D.evaluate(() => { sekmeCakismasi = null; const k = document.getElementById('sekmeCakisma'); if (k) k.remove(); state.questions = []; renderAll(); });
ok('E\'nin sorusu korunur', (await depo(D)).ids.includes(990002));
const k4 = await kutu(D);
ok('D\'de kutu (neden: sürüm)', !!k4 && (await D.evaluate(() => sekmeCakismasi && sekmeCakismasi.neden)) === 'surum');

console.log('[5] "Yeniden yükle" düğmesi');
await D.bringToFront();
await Promise.all([D.waitForLoadState('load'), D.locator('#sekmeCakisma button').click()]);
await D.waitForTimeout(400);
ok('yeniden yükleme sonrası kutu yok, güncel veri bellekte', !(await kutu(D)) && await D.evaluate(() => state.questions.some((q) => q.id === 990002)));

console.log('[6] IndexedDB: çakışmada kitaplığa yazılmaz; başka sekme açıkken Sıfırla kitaplığı siler');
const F = await ac();
await F.evaluate(() => dbIslem('readwrite', (s) => s.put({ id: 990003, pages: ['F'] })));
await D.evaluate(() => { state.questions.push({ id: 990004, type: 'mc', status: 'draft', body: 'x', options: [], outcome: '' }); saveState(); });
await F.waitForTimeout(300);   // Chrome sekmeler arası localStorage eşitlemesi asenkron (ms); insan hızında kapanır
const f6 = await F.evaluate(() => dbIslem('readwrite', (s) => s.put({ id: 990005, pages: ['F2'] })).then(() => 'yazdı', (e) => 'ret: ' + e.message));
ok('çakışan sekmenin kitaplık yazımı reddedildi', f6.startsWith('ret'), f6.slice(0, 70));
const silme = await D.evaluate(() => new Promise((ok) => { const r = indexedDB.deleteDatabase(KITAPLIK_DB); r.onsuccess = () => ok('silindi'); r.onblocked = () => ok('bloklandı'); r.onerror = () => ok('hata'); setTimeout(() => ok('zaman aşımı'), 3000); }));
ok('F\'nin açık bağlantısı silmeyi bloklamadı', silme === 'silindi', silme);

ok('sayfa hatası 0', hata.length === 0, hata.join(' | ').slice(0, 120));
ok('/api POST 0', POST.length === 0, String(POST.length));
console.log(`\nSONUÇ: ${gec} geçti, ${kal} kaldı`);
await t.close();
process.exit(kal ? 1 : 0);
