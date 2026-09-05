/**
 * README ekran görüntülerini CANLI sistemden, GERÇEK model çağrılarıyla üretir.
 *
 * NEDEN VAR (§45): `docs/ekran/*.png` 4 Eylül'de kalmıştı ve artık ürünü
 * yalanlıyordu — eski lacivert tema, DÖRT rol (veli yok), "Demo senaryosu"
 * adıyla düğme ve en kötüsü: öğretmen ekranında §42.1'de KAPATILAN hatanın
 * kendisi ("Öğrenci sınavı henüz bitirmedi") görünüyordu. README'deki alt
 * yazı ise o görüntüde olmayan bir şeyi anlatıyordu.
 *
 * Görüntüler elle değil, BU BETİKLE alınır ki bir daha ürünle ayrışmasınlar:
 * betik uçtan uca gerçek akışı sürer (sınavı yayınlar, öğrenci sınavı çözer,
 * yapay zekâ gerçekten puan önerir, öğretmen onaylar), sahne KURGULAMAZ.
 *
 * Kullanım:
 *   node tools/ekran-goruntusu-al.mjs [url]
 *   (varsayılan url: https://mihenk.bies.workers.dev)
 *
 * Gereksinim: `playwright-core` (devDependency) + sistemde kurulu Chrome.
 * BİLEREK `playwright` DEĞİL `playwright-core`: `playwright` paketi kurulumda
 * ~150 MB tarayıcı indirir ve CI'ı yavaşlatırdı. `channel: 'chrome'` sistemdeki
 * Chrome'u kullandığı için o indirmeye hiç gerek yok.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'https://mihenk.bies.workers.dev';
const CIKTI = 'docs/ekran';
const GENISLIK = 1440;

mkdirSync(CIKTI, { recursive: true });

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const tarayici = await chromium.launch({ channel: 'chrome' });
const sayfa = await tarayici.newPage({
  viewport: { width: GENISLIK, height: 900 },
  deviceScaleFactor: 2,
});

const hatalar = [];
sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
sayfa.on('pageerror', (e) => hatalar.push(String(e)));

console.log('→ ' + URL);
await sayfa.goto(URL, { waitUntil: 'networkidle' });

// Giriş kapısını kapat + demo senaryosunu yükle (rehber şeridi kapalı: görüntü sade kalsın).
await sayfa.evaluate(() => {
  loadDemoScenario();
  demoBitir();
});
await bekle(500);

/**
 * Ekranın ANLAMLI parçasını kırpar.
 *
 * Eski görüntülerin ikinci kusuru buydu: kadraj sayfanın en üstünde kalıyor,
 * README'deki alt yazı ise kadrajda OLMAYAN bir şeyi anlatıyordu ("puan
 * önerisi kriter bazında gelir" diyor ama görüntüde boş bir durum kutusu
 * vardı). Alt yazı neyi vaat ediyorsa kadraj onu göstermeli; bu yüzden
 * hedef öğe verilir ve görüntü ONA göre kırpılır.
 */
async function cek(dosya, aciklama, secici) {
  await bekle(700);
  let hedef = null;
  if (secici) {
    hedef = await sayfa.$(secici);
    if (!hedef) { console.log(`  ⚠ ${dosya}: "${secici}" bulunamadı, tam ekran alınıyor`); }
    else { await hedef.scrollIntoViewIfNeeded(); await bekle(400); }
  }
  await sayfa.screenshot({ path: `${CIKTI}/${dosya}`, fullPage: false });
  console.log(`  ✓ ${dosya} — ${aciklama}`);
}

// ---------------------------------------------------------------------------
// 1) İÇERİK UZMANI — onay bekleyen AI soru taslağı
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => { state.role = 'content_expert'; state.ceTab = 2; renderAll(); });
await cek('01-icerik-uzmani.png', 'onay bekleyen soru taslağı', '.pending-card, .p-body, .pool-item');

// ---------------------------------------------------------------------------
// 2) ÖĞRETMEN — gerçek AI puan önerisi
//    Sahne kurgulanmıyor: sınav yayınlanır, öğrenci çözer, model GERÇEKTEN çağrılır.
// ---------------------------------------------------------------------------
console.log('  … sınav yayınlanıyor, öğrenci sınavı çözüyor, model çağrılıyor');
await sayfa.evaluate(async () => {
  state.role = 'teacher'; state.teacherTab = 1; renderAll();
  document.getElementById('btnPublishExam')?.click();
  state.role = 'student'; renderAll();
  startExam();
  await finishExam();            // ← gerçek /api/ai/evaluate çağrısı
});
await sayfa.waitForFunction(
  () => !state.ai.busy && Object.keys(state.aiEvals || {}).length > 0,
  { timeout: 120000 }
);
await sayfa.evaluate(() => { state.role = 'teacher'; state.teacherTab = 3; renderAll(); });
await cek('02-ogretmen-degerlendirme.png', 'AI puan önerisi + gerekçe (gerçek model)', '.eval-card');

// ---------------------------------------------------------------------------
// 3) ÖĞRENCİ — öğretmen onayladıktan sonra karne
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => {
  // Öğretmen KARAR VERİR: AI önerisini aynen onaylar (nihai puan burada oluşur).
  Object.keys(state.aiEvals).forEach((qid) => {
    const ev = state.aiEvals[qid];
    if (ev && ev.aiScore != null) finalizeReview(Number(qid), ev.aiScore, '', 'kabul', state.activeStudentId);
  });
  publishResults();
  state.role = 'student'; state.studentTab = 3; renderAll();
});
await cek('03-ogrenci-karne.png', 'onaylanmış karne', '#panel-student .card');

// ---------------------------------------------------------------------------
// 4) EĞİTİM YÖNETİCİSİ — kazanım ısı haritası
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => { state.role = 'admin'; renderAll(); });
await cek('04-egitim-yoneticisi.png', 'okul geneli + kazanım ısı haritası', '.heatmap, #panel-admin .card');

// ---------------------------------------------------------------------------
// 5) VELİ — beşinci rol, README'de hiç yoktu
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => { state.role = 'parent'; renderAll(); });
await cek('05-veli.png', 'yalnızca onaylanmış sonuç, sıralama yok', '#panel-parent .card');

console.log(hatalar.length ? `\n⚠ konsol hatası: ${hatalar.length}\n` + hatalar.join('\n')
                           : '\n✓ konsol hatası yok');
await tarayici.close();
