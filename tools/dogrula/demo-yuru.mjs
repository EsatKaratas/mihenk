// W8 + §120 — demo 5 adım GERÇEK TIKLAMA. /api/ai/ POST engelli (0 model çağrısı).
// §120: demo ayrı kayıt alanında çalışır ve modele HİÇ istek göndermez (örnek veri);
// --model-evaluate artık demoda çağrı üretmez (bayrak geriye uyum için duruyor).
// Adım 5'te dolu sınıf analitiği (KR-20, gösterge uyarısı, ısı haritası), sonda
// demodan çıkış (kendi veriye dönüş, demo kaydının silinmesi) yazılır.
// Kullanım: node demo-yuru.mjs <url> <ciktiKlasoru> [genislik] [--model-evaluate]
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'https://mihenk.bies.workers.dev';
const out = process.argv[3] || './demo-out';
const W = Number(process.argv[4] || 1280);
const MODEL = process.argv.includes('--model-evaluate');
mkdirSync(out, { recursive: true });
let tarayici;
try { tarayici = await chromium.launch({ channel: 'chrome' }); } catch { tarayici = await chromium.launch(); }
const p = await (await tarayici.newContext({ viewport: { width: W, height: W < 600 ? 844 : 800 } })).newPage();
const log = [], hatalar = [], engellenen = [], dialoglar = [];
const L = (s) => { log.push(s); console.log(s); };
p.on('console', (m) => { if (m.type() === 'error' && !((m.location()?.url) || '').includes('/api/ai/')) hatalar.push(m.text()); });
p.on('pageerror', (e) => hatalar.push('pageerror: ' + e));
p.on('dialog', async (d) => { dialoglar.push(d.type()); await d.dismiss(); });
p.on('response', async (r) => { if (r.url().includes('/api/ai/evaluate')) { try { writeFileSync(`${out}/evaluate-yanit-${W}.json`, await r.text()); L('  evaluate yanıtı kaydedildi: ' + r.status()); } catch {} } });
await p.route('**/api/ai/**', (r) => {
  if (r.request().method() === 'GET') return r.continue();
  if (MODEL && r.request().url().includes('/api/ai/evaluate')) { L('  MODEL ÇAĞRISI: ' + r.request().url()); return r.continue(); }
  engellenen.push(r.request().url()); return r.abort();
});
const serit = async () => (await p.locator('.demo-serit').first().innerText().catch(() => '(şerit yok)')).replace(/\s+/g, ' ');
const tikla = async (loc, ad) => { await loc.scrollIntoViewIfNeeded(); await loc.click(); L('  tık: ' + ad); await p.waitForTimeout(400); };
const ileri = async () => { const b = p.locator('.js-demo-ileri').first(); L('  ileri: "' + (await b.innerText()) + '" disabled=' + (await b.isDisabled())); await tikla(b, 'ileri'); };

await p.goto(url, { waitUntil: 'networkidle' });
await tikla(p.locator('#gkDemoBtn'), 'Rehberli demo');
if (await p.locator('.js-demo-onay').count()) await tikla(p.locator('.js-demo-onay'), 'Demoyu başlat');
L('ADIM 1: ' + await serit());
const onay = p.getByRole('button', { name: /Onayla → Havuza Aktar/ });
while (await onay.count()) { await tikla(onay.first(), 'Onayla → Havuza Aktar'); if (await p.locator('#modalSupheOnay').count()) { await p.locator('#modalSupheOnay').focus(); await p.keyboard.press('Space'); await p.waitForTimeout(300); } }
await ileri();
L('ADIM 2: ' + await serit());
await tikla(p.locator('.ogt-kart-vurgu').first(), 'vurgulu sınıf kartı');
await tikla(p.getByRole('button', { name: /^Yayınla$/ }).first(), 'Yayınla');
await ileri();
L('ADIM 3: ' + await serit());
for (const ad of [/Sınava Başla/, /Gözden geçir ve bitir/, /^Sınavı bitir/, /Evet, bitir/]) await tikla(p.getByRole('button', { name: ad }).first(), String(ad));
await p.waitForFunction(() => !state.ai.busy, null, { timeout: 60000 }).catch(() => L('  ✗ ai.busy bitmedi'));
await p.waitForTimeout(800);
await ileri();
L('ADIM 4: ' + await serit());
const tek = p.getByRole('button', { name: /Tek Tıkla Onayla/ });
L('  Tek Tıkla Onayla: ' + await tek.count());
while (await tek.count()) await tikla(tek.first(), 'Tek Tıkla Onayla');
const elle = p.getByRole('button', { name: /Elle Puanla ve Onayla/ });
while (await elle.count()) { const g = p.getByLabel(/Puanı elle girin/).first(); if (await g.count()) await g.fill('2'); await tikla(elle.first(), 'Elle Puanla ve Onayla (2)'); }
await tikla(p.getByRole('button', { name: /Sonuçları Öğrenciye Yayınla/ }).first(), 'Sonuçları Öğrenciye Yayınla');
await ileri();
L('ADIM 5: ' + await serit());
L('  analitik: ' + JSON.stringify(await p.evaluate(() => { const g = sinavGuvenirligi(); const ia = itemAnalysis();
  return { kr20: g.kr20 && Math.round(g.kr20.deger * 100) / 100, alfa: g.alfa && g.alfa.deger != null ? Math.round(g.alfa.deger * 100) / 100 : null,
    ogrenci: g.ogrenci, madde: g.maddeSayisi, guvenilir: ia.guvenilir, isiHaritasi: classOutcomeScores('7-A') }; })));
L('  Kazanım Başarı Grafiği: ' + (await p.locator('h2:visible, h3:visible').allInnerTexts()).some((b) => /Kazanım Başarı Grafiği/.test(b)));
await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}), ileri()]);
await p.waitForTimeout(600);
L('demo sonrası: ' + await serit() + ' · ' + JSON.stringify(await p.evaluate(() => ({ demoAlani: demoAlaniMi(),
  demoKaydi: localStorage.getItem('t3-olcme-durum-v1-demo') !== null, bilgi: (document.getElementById('gkDemoDonus') || {}).textContent || '' }))));
L(`SONUÇ ${W}: konsol hatası ${hatalar.length}, yerel dialog ${dialoglar.length}, engellenen /api/ai POST ${engellenen.length}`);
hatalar.forEach((h) => L('  hata: ' + h));
writeFileSync(`${out}/log-${W}.txt`, log.join('\n'));
await tarayici.close();
