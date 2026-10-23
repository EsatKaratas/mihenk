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
 *   node tools/ekran-goruntusu-al.mjs [url] [cikti-dizini]
 *   (varsayılan url: https://mihenk.bies.workers.dev, dizin: docs/ekran)
 *
 *   §51b: ikinci argüman yerel KURU çalıştırma içindir — ör.
 *   `node tools/ekran-goruntusu-al.mjs http://127.0.0.1:8788 /tmp/ekran-kuru`
 *   README görüntülerini (docs/ekran) ezmeden betiğin uçtan uca çalıştığını
 *   sınar. README görüntüleri YALNIZCA canlıdan, varsayılan dizine alınır.
 *
 * Gereksinim: `playwright-core` (devDependency) + sistemde kurulu Chrome.
 * BİLEREK `playwright` DEĞİL `playwright-core`: `playwright` paketi kurulumda
 * ~150 MB tarayıcı indirir ve CI'ı yavaşlatırdı. `channel: 'chrome'` sistemdeki
 * Chrome'u kullandığı için o indirmeye hiç gerek yok.
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'https://mihenk.bies.workers.dev';
const CIKTI = process.argv[3] || 'docs/ekran';
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

// ---------------------------------------------------------------------------
// 0) GİRİŞ EKRANI — jürinin gördüğü İLK ekran (kullanıcı isteği, §50h)
//
// Kapıdan GEÇMEDEN çekilir; aşağıdaki blok onu kapattığı için sıra önemlidir.
// Kadraj tam ekrandır: anlatılan şey tek bir bileşen değil, ekranın bütünü
// (logo, palet, dalga ve tek giriş düğmesi). Hedef öğe verilseydi kadraj
// daralır ve alt yazı kadrajda olmayan bir şeyi anlatırdı (§45.1).
// Giriş animasyonu 0,55 sn; bitmesi beklenir, yoksa yarım kadraj çıkar.
// ---------------------------------------------------------------------------
await bekle(900);
await cek('00-giris.png', 'giriş ekranı — logo, palet ve tek giriş düğmesi', null);

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
/* §48b — SEKME DÜZELTİLDİ. Burası `ceTab = 2` (Soru Havuzu) idi: kadrajda
   onaylanmış sorular ve "Sil" düğmeleri çıkıyordu. README'deki alt yazı ise
   "her çeldirici için kavram yanılgısı gerekçesi ve onay/red düğmeleri"
   diyordu — yani §45.1'in kusuru (alt yazı kadrajda OLMAYAN bir şeyi
   anlatıyor) 01 numaralı görüntüde sürüyordu. Onay bekleyen kart `ceTab = 1`
   içindedir; hedef öğe `.q-card`, çeldirici gerekçeleri onun içindeki
   `.distractor-box`tur. */
/* §75b (W3): gerekçeler ve kazanım denetimi kartta <details class="q-detay">
   içinde, varsayılan KAPALI. Alt yazı "çeldirici gerekçeleri" diyor; kadrajda
   görünsünler diye ürünün kendi durumuyla (state.ceKartDetay) açılır. */
await sayfa.evaluate(() => {
  state.ceKartDetay = state.ceKartDetay || {};
  state.questions.filter((q) => q.status === 'ai_generated').forEach((q) => { state.ceKartDetay[q.id] = true; });
  state.role = 'content_expert'; state.ceTab = 1; renderAll();
});
await cek('01-icerik-uzmani.png', 'onay bekleyen soru taslağı + çeldirici gerekçeleri', '.q-card');

// ---------------------------------------------------------------------------
// 2) ÖĞRETMEN — gerçek AI puan önerisi
//    Sahne kurgulanmıyor: sınav yayınlanır, öğrenci çözer, model GERÇEKTEN çağrılır.
// ---------------------------------------------------------------------------
console.log('  … sınav yayınlanıyor, öğrenci sınavı çözüyor, model çağrılıyor');
/* §51b — YAYIN ENGELİ SESSİZ KALMIYOR. Düğme `canPublishExam()` false iken
   devre dışıdır ve `click()` hiçbir şey yapmaz; betik eskiden yine de
   öğrenciye geçip 120 sn sonra anlamsız bir zaman aşımıyla düşerdi. (§51'de
   kabul edilmemiş AI rubrik taslağı yayını engelleyen bir koşul oldu; demo
   tohumunun rubriği şablondur, etkilenmez — ama koşul değişirse sebep burada
   yazılır.) */
/* §62 (W1): yayın düğmesi sınav sihirbazının 3. adımında ("Gözden geçir ve
   yayınla"); Sınavlar listesinde yok. Sihirbaz durumu ogtDurum() içinde. */
const yayinEngeli = await sayfa.evaluate(() => {
  state.role = 'teacher'; state.teacherTab = 1; ogtDurum().sihirbaz = 3; renderAll();
  document.getElementById('btnPublishExam')?.click();
  return state.exam.status === 'published'
    ? ''
    : ((typeof yayinEngeliMetni === 'function' && yayinEngeliMetni()) || 'sınav yayınlanamadı (sebep bilinmiyor)');
});
if (yayinEngeli) {
  console.error(`  ✗ 02: sınav yayınlanamadı — ${yayinEngeli}`);
  await tarayici.close();
  process.exit(1);
}
await sayfa.evaluate(async () => {
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
// 4) EĞİTİM YÖNETİCİSİ — kazanım başarı grafiği
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => { state.role = 'admin'; renderAll(); });
await cek('04-egitim-yoneticisi.png', 'okul geneli + kazanım başarı grafiği', '#panel-admin .card');

// ---------------------------------------------------------------------------
// 5) VELİ — beşinci rol, README'de hiç yoktu
// ---------------------------------------------------------------------------
await sayfa.evaluate(() => { state.role = 'parent'; renderAll(); });
await cek('05-veli.png', 'yalnızca onaylanmış sonuç, sıralama yok', '#panel-parent .card');

// ---------------------------------------------------------------------------
// 6) DENEYAP — İçerik Uzmanı → Deneyap Atölyeleri → atölye → katalog modalı
//    (§52, W3). Kadrajda olması gerekenler: kitap adı + ISBN (başlıktaki
//    künye satırı) ve her kazanım satırında kitabın basılı sayfası ("s.13").
//    Durum elle kurulmaz; ürünün kendi fonksiyonları çağrılır (ders seçimi
//    sınıfı da getirir, indeks sunucudan okunur, katalog gerçek JSON'dan).
// ---------------------------------------------------------------------------
const DENEYAP_ATOLYE = 'Yapay Zekâ';
const deneyap = await sayfa.evaluate(async (atolye) => {
  if (typeof DENEYAP_DERSI === 'undefined' || typeof deneyapIndeksYukle !== 'function') {
    return { atla: 'Deneyap arayüzü bu sürümde yok (DENEYAP_DERSI / deneyapIndeksYukle tanımsız)' };
  }
  closeModal();
  state.role = 'content_expert'; state.ceTab = 1; renderAll();
  dersSec(DENEYAP_DERSI);
  /* dersSec indeksi kendisi yüklemeye başlar; o sürerken deneyapIndeksYukle
     null döner ("yükleniyor"). Bu yüzden çağırıp bırakmak değil, yüklemenin
     BİTMESİNİ (indeks ya da hata) en çok 15 sn beklemek gerekir. */
  await deneyapIndeksYukle(true);
  for (let i = 0; i < 150 && !deneyapIndeksi && !deneyapIndeksHata; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  const indeks = deneyapIndeksi;
  if (!indeks) return { atla: 'Deneyap indeksi yüklenemedi: ' + (deneyapIndeksHata || '15 sn içinde yüklenmedi') };
  if (!indeks.atolyeler.some((a) => a.ad === atolye)) return { atla: `"${atolye}" atölyesi indekste yok` };
  atolyeSec(atolye);
  await katalogAc();
  return { atla: '' };
}, DENEYAP_ATOLYE);
if (deneyap.atla) {
  // Sessiz düşüş yok: neden çekilmediği yazılır ve sonda özetlenir.
  hatalar.push(`06-deneyap ALINMADI: ${deneyap.atla}`);
  console.log(`  ⚠ 06-deneyap.png alınmadı — ${deneyap.atla}`);
} else {
  await sayfa.waitForSelector('#modalBox .kat-satir', { timeout: 15000 });
  const modal = await sayfa.evaluate(() => {
    const kutu = document.getElementById('modalBox');
    const t = kutu ? kutu.innerText : '';
    return { isbn: /ISBN\s*978[-\d]+/.test(t), sayfa: /\bs\.\d+/.test(t), kitap: /TÜBİTAK Deneyap Kitapları/.test(t) };
  });
  if (!modal.isbn || !modal.sayfa || !modal.kitap) {
    hatalar.push(`06-deneyap: modalda eksik — ${JSON.stringify(modal)}`);
  }
  await cek('06-deneyap.png', `Deneyap kataloğu — ${DENEYAP_ATOLYE}: kitap, ISBN, basılı sayfa`, '#modalBox');
}

console.log(hatalar.length ? `\n⚠ konsol hatası / eksik çekim: ${hatalar.length}\n` + hatalar.join('\n')
                           : '\n✓ konsol hatası yok, tüm çekimler alındı');
await tarayici.close();
