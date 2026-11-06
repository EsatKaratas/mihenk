// W8 + §120 — onay pencereleri (gerçek tuş), §71 (TOHUMLA), Sıfırla, katalog, "Evet, bitir" odağı, demo alanı (kendi veri bayt bayt aynı), boş havuz çıkışları,
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
// §120: önce KULLANICININ KENDİ verisi (5 soru + sınav adı); demo sonunda bayt bayt aynı olmalı.
const kayitlar = () => p.evaluate(() => ({ kul: localStorage.getItem('t3-olcme-durum-v1'), demo: localStorage.getItem('t3-olcme-durum-v1-demo') }));
await p.locator('.gk-kart[data-role="teacher"]').click(); await bekle(400);
await p.evaluate(() => {
  for (let i = 1; i <= 5; i++) state.questions.push({ id: qIdSeq++, type: 'mc', status: 'approved', body: 'Kendi sorum ' + i,
    options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], correctKey: 'A', difficulty: 'easy', outcome: 'MAT.7.2.1', yazan: 'insan' });
  state.exam.title = 'Benim sınavım'; renderAll();
});
await bekle(900);
const kendiOnce = (await kayitlar()).kul;
console.log(`\n[§120 demo alanı — giriş] ${W}px`);
const demoGir = p.locator('#btnDemoSeed:visible');
if (await demoGir.count()) await demoGir.click(); else { await p.locator('.js-ek-menu').first().click(); await bekle(); await p.locator('.js-ek-demo').first().click(); }
await bekle();
const girisMetni = await p.locator('#modalBox').innerText().catch(() => '');
ok('§120 giriş penceresi "korunur" der, "değiştirilir" demez', /korunur/.test(girisMetni) && !/değiştirilir/.test(girisMetni), girisMetni.replace(/\s+/g, ' ').slice(0, 90));
await p.locator('.js-demo-onay').click(); await bekle(600);
const kd0 = await kayitlar();
ok("§120 demo başladı: kullanıcı kaydı aynı, demo kaydı ayrı", kd0.kul === kendiOnce && !!kd0.demo && await p.evaluate(() => demoAlaniMi() && state.students.length === 24));
ok('§120 şeritte "kendi veriniz korunuyor"', /kendi veriniz korunuyor/.test(await p.locator('.demo-serit').first().innerText()));

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
await p.evaluate(() => { demoSeridiniKapat(); state.role = 'admin'; renderAll(); });
const audit = () => p.evaluate(() => (state.auditLog || []).length);
const n0 = await audit(); const temizle = p.locator('#btnAuditTemizle');
await temizle.scrollIntoViewIfNeeded(); await temizle.click(); await bekle();
const rA = await rol(); ok('günlük alertdialog, odak Vazgeç, kırmızı', rA.join() === 'alertdialog,true' && (await odak()) === 'modalCancel' && (await p.locator('#modalBox .btn-critical').count()) >= 1, `${rA} ${await odak()}`);
ok('günlük Tab döngüsü', (await tabDongu()) === '9/9');
await p.keyboard.press('Escape'); await bekle();
ok('günlük Escape: veri aynı, odak açana döndü', !(await acik()) && (await audit()) === n0 && (await odak()) === 'btnAuditTemizle', `${n0}→${await audit()} ${await odak()}`);
await temizle.click(); await bekle(); await p.keyboard.press('Enter'); await bekle();
ok('günlük Enter@Vazgeç: veri aynı', !(await acik()) && (await audit()) === n0);

console.log(`\n[§120 ⋯ menüsü demo alanında] ${W}px`);
await p.locator('.js-ek-menu').first().click(); await bekle();
ok('§120 demo alanında Yedekle/Geri yükle/Sıfırla yok, "Demodan çık" var',
  (await p.locator('.js-ek-sifirla, .js-ek-yedekle, .js-ek-geri-yukle').count()) === 0 && (await p.locator('.js-ek-demo-cik').count()) === 1);
await p.keyboard.press('Escape'); await bekle();

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

console.log(`\n[§120 dolu sınıf analitiği] ${W}px`);
const an = await p.evaluate(() => { const g = sinavGuvenirligi(); state.role = 'teacher'; state.teacherTab = 4; renderAll();
  return { kr: g.kr20 && g.kr20.deger, n: g.ogrenci, k: g.mcSayisi, metin: document.getElementById('panel-teacher').innerText, isi: Object.keys(classOutcomeScores('7-A')).length }; });
ok('§120 KR-20 sayısal, n ≥ 10, k ≥ 5, "gösterge" uyarısı yok, ısı haritası ≥ 4 kazanım',
  an.kr != null && an.n >= 10 && an.k >= 5 && !/gösterge niteliğindedir/.test(an.metin) && !/hesaplanamadı/.test(an.metin) && an.isi >= 4,
  `KR-20 ${an.kr && an.kr.toFixed(2)} · n ${an.n} · k ${an.k} · kazanım ${an.isi}`);
const kd1 = await kayitlar();
ok("§120 demo boyunca kullanıcı kaydı bayt bayt aynı", kd1.kul === kendiOnce);

console.log(`\n[§120 demodan çıkış] ${W}px`);
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.evaluate(() => demoBitir())]); await bekle(600);
const kd2 = await kayitlar();
const donus = await p.evaluate(() => ({ alan: demoAlaniMi(), kendi: state.questions.filter((q) => /^Kendi sorum/.test(q.body)).length, not: !!document.getElementById('gkDemoDonus') }));
ok('§120 çıkış: kullanıcı kaydı bayt bayt aynı, demo kaydı silindi, 5 soru yerinde, bilgi satırı', kd2.kul === kendiOnce && kd2.demo === null && !donus.alan && donus.kendi === 5 && donus.not, JSON.stringify(donus));
await p.locator('.gk-kart[data-role="teacher"]').click(); await bekle(600);

console.log(`\n[Sıfırla — ⋯ menüsü, kendi veride] ${W}px`);
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
ok('§120 kullanıcı kaydı hâlâ bayt bayt aynı', (await kayitlar()).kul === kendiOnce);

console.log(`\n[§120 boş havuz — rol değiştirmeden] ${W}px`);
for (const yol of ['ornek', 'elle']) {
  const b = await (await tarayici.newContext({ viewport: { width: W, height: W < 600 ? 844 : 800 } })).newPage();
  b.on('pageerror', (e) => hatalar.push('pageerror(boş havuz): ' + e));
  await b.route('**/api/ai/**', (r) => (r.request().method() === 'GET' ? r.continue() : (engellenen.push(r.request().url()), r.abort())));
  let tik = 0; const roller = new Set();
  const t = async (loc) => { await loc.first().scrollIntoViewIfNeeded(); await loc.first().click(); tik++; roller.add(await b.evaluate(() => state.role)); await b.waitForTimeout(300); };
  await b.goto(url, { waitUntil: 'networkidle' });
  await t(b.locator('.gk-kart[data-role="teacher"]'));
  await t(b.locator('[data-ogt-sinif="7-A"]:visible'));
  await t(b.getByRole('button', { name: /Yeni sınav/ }));
  await b.locator('#ogtYeniAd').fill('İlk sınavım');
  await t(b.getByRole('button', { name: /Sınavı oluştur/ }));
  const iki = (await b.locator('#btnOrnekPaket').count()) === 1 && (await b.locator('#btnOgtElleSoru').count()) === 1;
  if (yol === 'ornek') {
    await t(b.locator('#btnOrnekPaket'));
    await t(b.locator('#panel-teacher .pool-check'));
  } else {
    await t(b.locator('#btnOgtElleSoru'));
    const kart = b.locator('#panel-teacher .ogt-elle-taslaklar .q-card').first();
    await kart.locator('.q-body-input').fill('Bir kutu 10 N kuvvetle 2 m itiliyor. Yapılan iş kaç J olur?');
    for (const [i, s] of ['20', '5', '12', '8'].entries()) await kart.locator('.opt-input').nth(i).fill(s);
    await t(kart.locator('.correct-radio').first());
    await t(kart.locator('.approve-btn'));
    await t(b.locator('#panel-teacher .pool-check'));
  }
  await t(b.getByRole('button', { name: /İleri/ }));
  await t(b.locator('#btnPublishExam'));
  const s = await b.evaluate(() => ({ yayin: state.exam.status, rolOnay: state.auditLog.filter((k) => k.tur === 'soru_onaylandi' && k.rol === 'teacher').length,
    paket: state.auditLog.filter((k) => k.tur === 'ornek_paket_alindi').length }));
  ok(`§120 boş havuz (${yol}): iki çıkış görünür, yayın ≤ 12 tık, yalnız Öğretmen rolü`, iki && s.yayin === 'published' && tik <= 12 && [...roller].join() === 'teacher',
    `${tik} tık · roller ${[...roller].join(',')} · ${JSON.stringify(s)}`);
  await b.context().close();
}

console.log(`\nSONUÇ ${W}px: geçti ${gec}, kaldı ${kal}; konsol hatası ${hatalar.length}; yerel dialog ${dialoglar.length}; engellenen /api/ai POST ${engellenen.length}`);
kalanlar.forEach((k) => console.log('  KALDI: ' + k)); hatalar.forEach((h) => console.log('  hata: ' + h));
await tarayici.close();
