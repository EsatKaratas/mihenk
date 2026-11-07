// §128 — Veri sağlamlığı, gerçek tarayıcıda (fikir3-E Y1, O3, O1, O2; saglam/yedek/kvkk betiklerinin regresyonu).
// [1] Bozuk kayıt (raporun 5 biçimi + yarım kayıt + kayıt dizisi): uygulama açılır, sayfa hatası 0, kayıt
//     bayt bayt aynı, ham kopya karantinada, kurtarma ekranı (role=alertdialog) ve dört çıkış.
// [2] Kurtarma çıkışları: indir (içerik = ham kayıt), yeniden dene (kopya çoğalmaz), okunabilenle devam,
//     iki adımlı Sıfırla (kayıt + karantina silinir, uygulama temiz açılır).
// [3] Açılış hatası (şemaya uyan ama işlenemeyen kayıt): varsayılanla açılır, kurtarma ekranı çıkar.
// [4] Yedek geri yükleme: uygulamanın kendi yedekOlustur'uyla üretilmiş şemasız dosya REDDEDİLİR,
//     Türkçe neden görünür, onay penceresi açılmaz, kayıt bayt bayt aynı.
// [5] KVKK: ⋯ → Öğrencinin verisini sil (iki adım) — localStorage + sessionStorage + IndexedDB'de ad 0.
// [6] CSV: dört dışa aktarımda formül hücresi önekli, sayı hücreleri aynı.
// [7] KVKK kendi veride, Eğitim Yöneticisi rolüyle; kitaplık veritabanı açıkken IndexedDB taraması.
// Model çağrısı 0: /api/** GET dışı istekler kesilir, GET'ler 404 ile karşılanır.
// Kullanım: node tools/dogrula/veri-saglamligi.mjs <url> [genişlik]      Çıkış kodu: 0 = hepsi geçti.
import { chromium } from 'playwright-core';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:8875/';
const GEN = Number(process.argv[3] || 1280);
const KEY = 't3-olcme-durum-v1';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex').slice(0, 16);
let t; try { t = await chromium.launch({ channel: 'chrome' }); } catch { t = await chromium.launch(); }
let gec = 0, kal = 0;
const ok = (ad, k, ek = '') => { k ? gec++ : kal++; console.log(`  ${k ? '✓' : '✗'} ${ad}${ek ? ' — ' + ek : ''}`); };
const POST = [];

/** Yeni bağlam; ilk açılıştan önce kayıt verilirse yazılır (yalnız bir kez). */
async function ac(kayit, ek = {}) {
  const ctx = await t.newContext({ viewport: { width: GEN, height: 820 }, acceptDownloads: true });
  await ctx.route('**/api/**', (r) => { if (r.request().method() !== 'GET') { POST.push(r.request().url()); return r.abort(); } return r.fulfill({ status: 404, json: {} }); });
  const p = await ctx.newPage();
  const hata = [];
  p.on('pageerror', (e) => hata.push(String(e.message).slice(0, 140)));
  if (kayit != null) {
    await p.addInitScript(([k, v, d]) => {
      if (sessionStorage.getItem('vs-ilk')) return;
      sessionStorage.setItem('vs-ilk', '1');
      localStorage.setItem(k, v);
      Object.entries(d).forEach(([a, b]) => localStorage.setItem(a, b));
    }, [KEY, kayit, ek]);
  }
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  return { ctx, p, hata };
}
const depo = (p) => p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const karantina = (d) => Object.keys(d).filter((k) => k.startsWith(KEY + ':bozuk-'));
const ekran = (p) => p.evaluate(() => {
  const k = document.querySelector('#veriKurtarma [role="alertdialog"]');
  return k ? { gorunur: !!(k.offsetWidth && k.offsetHeight), dugme: [...k.querySelectorAll('.vk-eylem > button')].filter((b) => b.offsetParent).map((b) => b.textContent),
    odak: document.activeElement && document.activeElement.className, metin: k.innerText.replace(/\s+/g, ' ').slice(0, 600) } : null;
});

const BOZUK = {
  'yarım kayıt (kesik JSON)': '{"questions":[{"id":1,"body":"benim sorum"}],"students":[{"id":1,"name":"Ay',
  'questions nesne': JSON.stringify({ questions: {}, students: [{ id: 1, name: 'Ayşe' }] }),
  'students metin': JSON.stringify({ students: 'x', questions: [] }),
  'ceForm null': JSON.stringify({ ceForm: null, questions: [{ id: 1, type: 'mc', status: 'approved', body: 'benim sorum', options: [] }] }),
  'exams sayı': JSON.stringify({ exams: 5, exam: 'x' }),
  'kayıt dizi': JSON.stringify([1, 2, 3]),
};

console.log(`[1] Bozuk kayıt ile açılış (${GEN} px)`);
for (const [ad, ham] of Object.entries(BOZUK)) {
  const { ctx, p, hata } = await ac(ham);
  const d = await depo(p);
  const e = await ekran(p);
  const kar = karantina(d);
  ok(`${ad}: açıldı, sayfa hatası 0, kayıt aynı, karantina = ham, kurtarma ekranı`,
    hata.length === 0 && d[KEY] === ham && kar.length === 1 && d[kar[0]] === ham && e && e.gorunur && e.dugme.length >= 3 &&
    (await p.locator('.gk-kart').count()) === 5,
    `hata ${hata.length} · kayıt ${d[KEY] === ham ? 'aynı' : 'DEĞİŞTİ'} · karantina ${kar.length} · düğme ${e ? e.dugme.join('/') : 'yok'}`);
  await ctx.close();
}

console.log('[2] Kurtarma çıkışları');
{
  const ham = BOZUK['yarım kayıt (kesik JSON)'];
  const { ctx, p } = await ac(ham);
  const [indir] = await Promise.all([p.waitForEvent('download'), p.locator('.js-vk-indir').click()]);
  const icerik = readFileSync(await indir.path(), 'utf-8');
  ok('Ham kaydı indir: dosya = ham kayıt', icerik === ham, indir.suggestedFilename());
  ok('Odak kurtarma ekranında, arka plan inert', await p.evaluate(() => !!document.activeElement.closest('#veriKurtarma') &&
    document.querySelector('.app') ? document.querySelector('.app').closest('[inert]') !== null : true));
  await p.locator('.js-vk-yeniden').click(); await p.waitForLoadState('networkidle'); await p.waitForTimeout(300);
  const d = await depo(p);
  ok('Yeniden dene: ekran yine çıkar, karantina çoğalmaz, kayıt aynı', !!(await ekran(p)) && karantina(d).length === 1 && d[KEY] === ham);
  ok('Yarım kayıtta "okunabilenle devam" yok (okunabilen alan yok)', (await p.locator('.js-vk-devam').count()) === 0);
  await p.locator('.js-vk-sifirla').click();
  ok('Sıfırla 1. adım: geri alınamaz uyarısı, odak Vazgeç', await p.locator('.vk-onay').isVisible() &&
    (await p.evaluate(() => document.activeElement.className)).includes('js-vk-vazgec'));
  await p.locator('.js-vk-vazgec').click();
  ok('Vazgeç: kayıt aynı', (await depo(p))[KEY] === ham);
  await p.locator('.js-vk-sifirla').click();
  await Promise.all([p.waitForEvent('load', { timeout: 10000 }), p.locator('.js-vk-sifirla-onay').click()]);   // kitapligiSil en çok 1,5 sn bekler
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(600);
  const s = await depo(p);
  ok('Evet, tümünü sil: kayıt ve karantina silindi, uygulama temiz açıldı', karantina(s).length === 0 && s[KEY] !== ham &&
    !(await ekran(p)) && (await p.locator('.gk-kart').count()) === 5, `kayıt ${s[KEY] ? 'yeni varsayılan' : 'yok'}`);
  await ctx.close();
}
{
  const ham = BOZUK['ceForm null'];
  const { ctx, p, hata } = await ac(ham);
  await p.locator('.js-vk-devam').click(); await p.waitForTimeout(500);
  const d = await depo(p);
  let yeni = null; try { yeni = JSON.parse(d[KEY]); } catch { yeni = null; }
  ok('Okunabilenle devam: soru korundu, ceForm varsayılan, karantina duruyor, ekran kapandı',
    !!yeni && yeni.questions[0].body === 'benim sorum' && yeni.ceForm && typeof yeni.ceForm === 'object' &&
    karantina(d).length === 1 && !(await ekran(p)));
  await p.locator('#girisKapisi .gk-kart[data-role="teacher"]').click(); await p.waitForTimeout(500);
  ok('Sonra öğretmen rolü açılır, sayfa hatası 0', hata.length === 0 && (await p.locator('.js-ek-menu').count()) > 0);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  ok('Yenilemede kurtarma ekranı yok', !(await ekran(p)));
  await ctx.close();
}

console.log('[3] Açılış hatası (şemaya uyan ama işlenemeyen kayıt)');
{
  const ham = JSON.stringify({ subjects: [], outcomes: [{ code: 'X' }], ceForm: { subject: 5, grade: {} } });
  const { ctx, p, hata } = await ac(ham);
  const d = await depo(p);
  const e = await ekran(p);
  ok('Uygulama varsayılanla açıldı, kayıt aynı, karantinada, ekran nedeni söylüyor', hata.length === 0 && d[KEY] === ham &&
    karantina(d).length === 1 && !!e && /açılamadı/.test(e.metin) && (await p.locator('.gk-kart').count()) === 5, `hata ${hata.length} · kayıt ${d[KEY] === ham ? 'aynı' : 'DEĞİŞTİ'} · karantina ${karantina(d).length} · ${e ? (e.metin.match(/Neden: [^.]*/) || [''])[0].slice(0, 90) : 'ekran yok'}`);
  await ctx.close();
}

console.log('[4] Yedekten geri yükleme: şemasız dosya');
{
  const kendi = JSON.stringify({ _qIdSeq: 3, role: 'teacher', questions: [{ id: 1, type: 'mc', status: 'approved', body: 'kendi sorum', options: [] }] });
  const { ctx, p, hata } = await ac(kendi);
  await p.locator('#girisKapisi .gk-kart[data-role="teacher"]').click(); await p.waitForTimeout(400);
  const once = (await depo(p))[KEY];
  for (const [ad, durum] of [['students metin', { students: 'x', questions: [] }], ['exams sayı', { exams: 5 }], ['questions nesne', { questions: {} }]]) {
    const dosya = await p.evaluate((d) => yedekOlustur({ durum: d, kitaplik: [], adsiz: true }, {}), durum);
    await p.locator('.js-ek-menu').first().click(); await p.waitForTimeout(150);
    await p.locator('.js-ek-geri-yukle').first().click(); await p.waitForTimeout(200);
    await p.locator('#yedekDosya').setInputFiles({ name: 'paylasilan-soru-bankasi.mihenk', mimeType: 'text/plain', buffer: Buffer.from(dosya, 'utf-8') });
    await p.locator('#yedekAc').click(); await p.waitForTimeout(500);
    const msg = (await p.locator('#yedekHata').innerText()).trim();
    ok(`${ad}: reddedildi, Türkçe neden, onay penceresi yok, kayıt aynı`,
      /Mihenk biçimine uymuyor/.test(msg) && (await p.getByRole('button', { name: /Evet, geri yükle/ }).count()) === 0 &&
      (await depo(p))[KEY] === once, msg.slice(0, 110));
    await p.locator('#modalCancel').click(); await p.waitForTimeout(150);
  }
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  ok('Yenilemede uygulama açılır, kurtarma yok, sayfa hatası 0', !(await ekran(p)) && hata.length === 0 && (await p.locator('.gk-kart').count()) === 5);
  await ctx.close();
}

console.log('[5] KVKK: öğrencinin tüm verisini sil (demo alanı, dolu sınıf)');
{
  const { ctx, p, hata } = await ac(null);
  await p.locator('#girisKapisi .gk-kart[data-role="teacher"]').click(); await p.waitForTimeout(300);
  const demoGir = p.locator('#btnDemoSeed:visible');
  if (await demoGir.count()) await demoGir.click(); else { await p.locator('.js-ek-menu').first().click(); await p.waitForTimeout(150); await p.locator('.js-ek-demo').first().click(); }
  await p.waitForTimeout(400); if (await p.locator('.js-demo-onay').count()) await p.locator('.js-demo-onay').click();
  await p.waitForTimeout(800);
  await p.evaluate(() => { state.role = 'teacher'; renderAll(); });
  const hedef = await p.evaluate(() => {
    const ogr = state.students.find((o) => ogrenciVeriOzeti(o.id).oturum > 0 && ogrenciVeriOzeti(o.id).gunluk > 0) || state.students[0];
    /* §130: §124–§126'nın öğrenciye bağlı yeni kalıcı alanları da silinmeli — gözlem puanı, itiraz,
       adı geçen rubrik örneği. Gerçek yollarla aynı biçimde kurulur, sonra kaydedilir. */
    const form = gozlemFormuKur({ ad: 'Dinleme gözlemi', sinif: ogr.sinif || '7-A', kazanimlar: [{ kod: 'T.7.1.1', metin: 'Dinleme' }] });
    gozlemPuanla(form, ogr.id, 'T.7.1.1', 3);
    state.gozlemFormlari = (state.gozlemFormlari || []).concat([form]);
    const q = state.questions.find((x) => x.type === 'open');
    state.itirazlar = (state.itirazlar || []).concat([{ id: 900, examId: state.activeExamId, qid: q.id, sid: ogr.id, yol: 'veli',
      gerekce: ogr.name + ' adına yeniden inceleme', at: Date.now(), durum: 'bekliyor', onceki: { finalScore: 1, comment: '' } }]);
    q.ornekYanitlar = (q.ornekYanitlar || []).concat([{ id: 'oy-900', puan: 1, tavan: 2, metin: ogr.name + ' böyle yazmıştı', tarih: '2026-11-07' }]);
    saveState();
    return { id: String(ogr.id), ad: ogr.name, ozet: ogrenciVeriOzeti(ogr.id), gunluk: state.auditLog.length };
  });
  ok('§130: silinecekler özeti gözlem ve itirazı da sayar', hedef.ozet.gozlem === 1 && hedef.ozet.itiraz === 1, JSON.stringify(hedef.ozet));
  await p.locator('.js-ek-menu').first().click(); await p.waitForTimeout(150);
  await p.locator('.js-ek-ogrenci-sil').first().click(); await p.waitForTimeout(200);
  await p.locator('#ogrSilSec').selectOption(hedef.id); await p.waitForTimeout(100);
  const ozetMetni = await p.locator('#ogrSilOzet').innerText();
  await p.locator('#ogrSilDevam').click(); await p.waitForTimeout(200);
  const onay2 = await p.locator('#modalBox').innerText();
  ok('İki adım: 1. özet, 2. "GERİ ALINAMAZ" ve odak Vazgeç', /Silinecek/.test(ozetMetni) && /GERİ ALINAMAZ/.test(onay2) &&
    (await p.evaluate(() => document.activeElement.id)) === 'modalCancel', ozetMetni.replace(/\s+/g, ' ').slice(0, 100));
  await p.locator('#modalOnay').click(); await p.waitForTimeout(500);
  const sonuc = (await p.locator('#modalBox').innerText()).replace(/\s+/g, ' ');
  const tara = await p.evaluate(async (ad) => {
    const say = (s) => String(s || '').split(ad).length - 1;
    let ls = 0, ss = 0, idb = 0;
    for (let i = 0; i < localStorage.length; i++) ls += say(localStorage.getItem(localStorage.key(i))) + say(localStorage.key(i));
    for (let i = 0; i < sessionStorage.length; i++) ss += say(sessionStorage.getItem(sessionStorage.key(i)));
    const dbler = indexedDB.databases ? await indexedDB.databases() : [];
    for (const d of dbler) {
      const db = await new Promise((c, r) => { const q = indexedDB.open(d.name); q.onsuccess = () => c(q.result); q.onerror = () => r(q.error); });
      for (const s of db.objectStoreNames) {
        const hepsi = await new Promise((c) => { const q = db.transaction(s).objectStore(s).getAll(); q.onsuccess = () => c(q.result); q.onerror = () => c([]); });
        idb += say(JSON.stringify(hepsi));
      }
      db.close();
    }
    const son = state.auditLog[state.auditLog.length - 1];
    return { ls, ss, idb, dbSayisi: dbler.length, ogrenciVar: state.students.some((o) => o.name === ad), son };
  }, hedef.ad);
  ok('Sonuç penceresi: silindi + denetim "ad artık geçmiyor"', /verisi silindi/.test(sonuc) && /ad artık geçmiyor/.test(sonuc), sonuc.slice(0, 120));
  ok(`Ad hiçbir yerde yok: localStorage ${tara.ls} · sessionStorage ${tara.ss} · IndexedDB ${tara.idb} (${tara.dbSayisi} veritabanı)`,
    tara.ls === 0 && tara.ss === 0 && tara.idb === 0 && !tara.ogrenciVar, `${hedef.ad}, önce ${hedef.ozet.oturum} oturum, ${hedef.ozet.gunluk} günlük kaydı`);
  ok('Günlükte kişisel veri içermeyen tek satır', tara.son && tara.son.tur === 'ogrenci_verisi_silindi' && !('sid' in tara.son) &&
    tara.son.not === '1 öğrencinin verisi silindi', JSON.stringify(tara.son));
  await p.locator('#modalCancel').click(); await p.waitForTimeout(200);
  ok('Pencere kapanınca odak ⋯; sayfa hatası 0', (await p.evaluate(() => document.activeElement.className)).includes('js-ek-menu') && hata.length === 0);

  console.log('[6] CSV formül nötrleme (aynı demo)');
  const csv = await p.evaluate(() => {
    const ogr = submittedStudents()[0];
    const ss = readSession(ogr.id);
    const acik = state.questions.find((q) => state.exam.questionIds.includes(q.id) && q.type !== 'mc');
    const eski = ss.answers[acik.id];
    writeSession(ogr.id, { answers: Object.assign({}, ss.answers, { [acik.id]: Object.assign({}, eski, { text: '=HYPERLINK("http://ornek.invalid/?"&B2;"Tıkla")' }) }) });
    const ogrCsv = ogrenciCsv().csv;
    writeSession(ogr.id, { answers: Object.assign({}, ss.answers, { [acik.id]: eski }) });
    auditKaydet('geri_bildirim_aktarildi', { not: '-3 çünkü x=5' });
    const au = auditCsv();
    const eok = eokulVerisi().csv;
    const kr = kararRaporuCsv([{ sid: 1, soru: '@SUM(A1)', maxScore: 5, ai: 3, nihai: 2, confidence: 0.5 }]);
    return { ogrCsv, au, eok, kr };
  });
  ok('Öğrenci CSV: =HYPERLINK önekli', csv.ogrCsv.includes('"\'=HYPERLINK(""http://ornek.invalid/?""&B2;""Tıkla"")"') && !/;"=HYPERLINK/.test(csv.ogrCsv));
  ok('Karar günlüğü CSV: "-3 çünkü x=5" → \'-3 çünkü x=5 (okunur)', csv.au.includes(";'-3 çünkü x=5;"));
  ok('YZ–nihai rapor CSV: @ önekli, fark -1 sayı olarak kaldı', csv.kr.includes(";'@SUM(A1);") && csv.kr.includes(';-1;'));
  const eokSatir = csv.eok.replace(/^﻿/, '').split('\n').slice(1);
  ok('e-Okul CSV: puan hücrelerinde önek yok (yalnız sayı ya da boş)', eokSatir.length > 0 &&
    eokSatir.every((s) => s.split(';').slice(2).every((h) => h === '' || /^\d+(,\d+)?$/.test(h))), `${eokSatir.length} satır`);
  await ctx.close();
}

console.log('[7] KVKK: kendi veride, Eğitim Yöneticisi rolüyle (kitaplık veritabanı açık)');
{
  const kayit = JSON.stringify({ _qIdSeq: 11, role: 'admin', sinifKuruldu: true, activeExamId: 1, activeStudentId: 1,
    questions: [{ id: 10, type: 'open', status: 'approved', body: 'Kuvvet nedir?', options: [] }], rubrics: { 10: { maxScore: 5, criteria: [] } },
    exam: { title: 'S', questionIds: [10], status: 'published' },
    exams: [{ id: 1, title: 'S', questionIds: [10], status: 'published', sessions: {
      2: { examStatus: 'graded', answers: { 10: { text: 'Deniz Yıldırım: itme ya da çekme' } }, aiEvals: { 10: { aiScore: 4, rationale: 'iyi' } },
        reviews: { 10: { finalScore: 4, comment: 'Aferin Deniz Yıldırım' } }, mcResults: {} } } }],
    students: [{ id: 1, name: 'Ali Kaya', sinif: '7-A' }, { id: 2, name: 'Deniz Yıldırım', sinif: '7-A' }],
    answers: {}, aiEvals: {}, reviews: {}, mcResults: {}, examStatus: 'not_started',
    auditLog: [{ at: 1, tur: 'puan_karari', sid: 2, soru: 'Kuvvet nedir?', aiScore: 4, finalScore: 4 }, { at: 2, tur: 'soru_onaylandi', soru: 'Kuvvet nedir?' }],
    evalCache: { x: { key: JSON.stringify({ b: 'Kuvvet nedir?', a: 'Deniz Yıldırım: itme ya da çekme' }), value: { aiScore: 4 }, t: 1 } } });
  const { ctx, p, hata } = await ac(kayit);
  await p.locator('#girisKapisi .gk-kart[data-role="admin"]').click(); await p.waitForTimeout(300);
  await p.evaluate(() => yedekKitaplikAl());   // kitaplık veritabanı açılır (IndexedDB taraması boş geçmesin)
  await p.locator('.js-ek-menu').first().click(); await p.waitForTimeout(150);
  ok('Yönetici menüsünde "Öğrencinin verisini sil…"', (await p.locator('.js-ek-ogrenci-sil').count()) === 1);
  await p.locator('.js-ek-ogrenci-sil').first().click(); await p.waitForTimeout(200);
  await p.locator('#ogrSilSec').selectOption('2');
  await p.locator('#ogrSilDevam').click(); await p.waitForTimeout(200);
  await p.locator('#modalCancel').click(); await p.waitForTimeout(200);
  ok('2. adımda Vazgeç: hiçbir şey silinmedi', (await depo(p))[KEY].includes('Deniz Yıldırım'));
  await p.locator('.js-ek-menu').first().click(); await p.waitForTimeout(150);
  await p.locator('.js-ek-ogrenci-sil').first().click(); await p.waitForTimeout(200);
  await p.locator('#ogrSilSec').selectOption('2');
  await p.locator('#ogrSilDevam').click(); await p.waitForTimeout(200);
  await p.locator('#modalOnay').click(); await p.waitForTimeout(500);
  const tara = await p.evaluate(async (ad) => {
    const say = (s) => String(s || '').split(ad).length - 1;
    let ls = 0, idb = 0;
    for (let i = 0; i < localStorage.length; i++) ls += say(localStorage.getItem(localStorage.key(i)));
    const dbler = await indexedDB.databases();
    for (const d of dbler) {
      const db = await new Promise((c, r) => { const q = indexedDB.open(d.name); q.onsuccess = () => c(q.result); q.onerror = () => r(q.error); });
      for (const s of db.objectStoreNames) idb += say(JSON.stringify(await new Promise((c) => { const q = db.transaction(s).objectStore(s).getAll(); q.onsuccess = () => c(q.result); q.onerror = () => c([]); })));
      db.close();
    }
    const d = JSON.parse(localStorage.getItem('t3-olcme-durum-v1'));
    return { ls, idb, db: dbler.map((x) => x.name), ali: d.students.map((o) => o.name), gunluk: d.auditLog.map((k) => k.tur), onbellek: Object.keys(d.evalCache || {}).length };
  }, 'Deniz Yıldırım');
  ok(`Ad 0: localStorage ${tara.ls} · IndexedDB ${tara.idb} (${tara.db.join(',')})`, tara.ls === 0 && tara.idb === 0 && tara.db.length >= 1);
  ok('Ali Kaya ve onaylı soru günlüğü kaldı; önbellek silindi', tara.ali.join() === 'Ali Kaya' &&
    tara.gunluk.join() === 'soru_onaylandi,ogrenci_verisi_silindi' && tara.onbellek === 0, tara.gunluk.join());
  ok('Sayfa hatası 0', hata.length === 0, hata.join(' | '));
  await ctx.close();
}

console.log('[8] Demo alanında bozuk demo kaydı (§120): kullanıcının kaydı bayt bayt aynı kalır');
{
  const ctx = await t.newContext({ viewport: { width: GEN, height: 820 } });
  await ctx.route('**/api/**', (r) => { if (r.request().method() !== 'GET') { POST.push(r.request().url()); return r.abort(); } return r.fulfill({ status: 404, json: {} }); });
  const p = await ctx.newPage();
  const hata = [];
  p.on('pageerror', (e) => hata.push(e.message));
  await p.goto(URL, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
  // Kullanıcının kendi (uygulamanın normalleştirdiği) kaydı; sonra sekme demo alanına alınıp demo kaydı bozulur.
  const kendi = await p.evaluate((k) => {
    state.questions.push({ id: 990001, type: 'mc', status: 'approved', body: 'kendi sorum', options: [] }); saveState();
    sessionStorage.setItem('mihenk-demo-alani', '1');
    localStorage.setItem(k + '-demo', '{"questions":{},"students":"x"}');
    return localStorage.getItem(k);
  }, KEY);
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  const d = await depo(p);
  const kar = Object.keys(d).filter((k) => k.startsWith(KEY + '-demo:bozuk-'));
  ok('Demo kaydı karantinada (demo alanının anahtarıyla), kurtarma ekranı, kullanıcı kaydı aynı',
    !!(await ekran(p)) && kar.length === 1 && d[KEY] === kendi && hata.length === 0, kar.join());
  await p.locator('.js-vk-sifirla').click();
  await Promise.all([p.waitForEvent('load', { timeout: 10000 }), p.locator('.js-vk-sifirla-onay').click()]);
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(500);
  const s = await depo(p);
  ok('Demo alanında Sıfırla = demodan çık: kullanıcı kaydı bayt bayt aynı, demo kaydı ve kopyası silindi',
    s[KEY] === kendi && !s[KEY + '-demo'] && !Object.keys(s).some((k) => k.includes('-demo:bozuk-')) && !(await ekran(p)) &&
    (await p.evaluate(() => sessionStorage.getItem('mihenk-demo-alani'))) === null);
  await ctx.close();
}

ok('/api/** POST 0', POST.length === 0, POST.join(' '));
await t.close();
console.log(`\n${gec}/${gec + kal} denetim geçti`);
process.exit(kal ? 1 : 0);
