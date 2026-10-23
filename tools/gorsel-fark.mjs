/**
 * Mihenk Görsel Regresyon ve Arayüz Kalite Denetim Betiği
 *
 * Kullanım:
 *   node tools/gorsel-fark.mjs --url http://127.0.0.1:8788 --cikti <klasör> [--taban <klasör>]
 *   workerd açılmıyorsa statik sunucu yeter (/api/ai/ zaten engellenir):
 *     python -m http.server 8801 --directory public
 *
 * Amaç:
 *   - 5 rol (contentExpert, teacher, student, admin, parent) ve sekmeleri ile giriş ekranını
 *     iki farklı çözünürlükte (1280×800 masaüstü ve 390×844 mobil) fotoğraflar.
 *   - Taban klasörü verildiğinde piksel farkını <canvas> ile tarayıcı içinde hesaplar
 *     (harici paket gerektirmez, yükseklik farkı varsa küçük olana kırpar).
 *   - Her ekranda konsol hatalarını, yinelenen ID'leri, 24×24 pikselden küçük tıklanabilir
 *     öğeleri ve yatay taşmaları ölçüp raporlar.
 *   - /api/ai/ uçlarını engelleyerek sunucu yapay zekâ kotasını tüketmez.
 *
 * Çıkış kodları:
 *   0: Başarılı (konsol hatası ve yinelenen id yok)
 *   1: Hatalı ekran tespit edildi (konsol hatası > 0 veya yinelenen id > 0) ya da geçersiz parametre
 *   2: Hedef sunucu kapalı / ulaşılamıyor
 */

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// 1) Komut Satırı Argümanlarını Ayrıştırma
// ---------------------------------------------------------------------------
let url = 'http://127.0.0.1:8788';
let cikti = '';
let taban = null;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--url' && args[i + 1]) {
    url = args[++i];
  } else if (arg.startsWith('--url=')) {
    url = arg.slice(6);
  } else if (arg === '--cikti' && args[i + 1]) {
    cikti = args[++i];
  } else if (arg.startsWith('--cikti=')) {
    cikti = arg.slice(8);
  } else if (arg === '--taban' && args[i + 1]) {
    taban = args[++i];
  } else if (arg.startsWith('--taban=')) {
    taban = arg.slice(8);
  }
}

if (!cikti) {
  console.error('Hata: --cikti <klasör> parametresi zorunludur.');
  console.error('Kullanım: node tools/gorsel-fark.mjs --url <url> --cikti <klasör> [--taban <klasör>]');
  process.exit(1);
}

mkdirSync(cikti, { recursive: true });

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Çözünürlükler: masaüstü ve mobil
const COZUNURLUKLER = [
  { genislik: 1280, yukseklik: 800, etiket: '1280' },
  { genislik: 390, yukseklik: 844, etiket: '390' }
];

// Rol tanımları ve sekmeleri (app.js ve ekran-goruntusu-al.mjs uyumlu)
const ROLLER = [
  {
    ad: 'contentExpert',
    stateRole: 'content_expert',
    tabAlani: 'ceTab',
    sekmeler: [1, 2], // 1: Soru Üret, 2: Soru Havuzu
    secici: '#ceTabs'
  },
  {
    ad: 'teacher',
    stateRole: 'teacher',
    tabAlani: 'teacherTab',
    // §62 (W1): öğretmen Sınıflarım'dan (0, sekme çubuğu yok) başlar; 2 artık ayrı
    // ekran değil, sınav sihirbazının rubrik adımına yönlenir. §62 öncesi bir
    // kodda 0 ve 5 bulunamaz ve atlanır.
    sekmeler: [0, 1, 5, 3, 4], // 0 Sınıflarım, 1 Sınavlar, 5 Öğrenciler, 3 Puanlama, 4 Analitik
    secici: '#teacherTabs'
  },
  {
    ad: 'student',
    stateRole: 'student',
    tabAlani: 'studentTab',
    sekmeler: [1, 2, 3], // 1: Sınavlarım, 2: Sınavı Çöz, 3: Karne
    secici: '#studentTabs'
  },
  {
    ad: 'admin',
    stateRole: 'admin',
    tabAlani: null,
    sekmeler: [1], // Tek ekran (okul genel bakış)
    secici: null
  },
  {
    ad: 'parent',
    stateRole: 'parent',
    tabAlani: null,
    sekmeler: [1], // Tek ekran (veli görünümü)
    secici: null
  }
];

// ---------------------------------------------------------------------------
// 2) Tarayıcı Başlatma ve Hata Yakalama
// ---------------------------------------------------------------------------
let tarayici;
try {
  tarayici = await chromium.launch({ channel: 'chrome' });
} catch {
  tarayici = await chromium.launch();
}

const sayfa = await tarayici.newPage();

// Yapay zekâ isteklerini engelleme sayacı
let engellenenAiSayisi = 0;
await sayfa.route('**/api/ai/**', (route) => {
  engellenenAiSayisi++;
  route.abort();
});

// Sayfa konsol ve çalışma zamanı hatalarını toplama
let anlikEkranHatalari = [];
// /api/ai/ istekleri bilerek iptal edilir; tarayıcının bunun için bastığı
// "Failed to load resource" satırı uygulama hatası değildir, sayılmaz.
sayfa.on('console', (m) => {
  if (m.type() !== 'error') return;
  const kaynak = (m.location() && m.location().url) || '';
  if (kaynak.includes('/api/ai/')) return;
  anlikEkranHatalari.push(m.text());
});
sayfa.on('pageerror', (e) => {
  anlikEkranHatalari.push(String(e));
});

// Sunucu bağlantısını test etme
console.log(`→ Sunucuya bağlanılıyor: ${url}`);
try {
  const yanit = await sayfa.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  if (!yanit || yanit.status() >= 400) {
    throw new Error(`HTTP ${yanit ? yanit.status() : 'yanıt yok'}`);
  }
} catch (err) {
  console.error(`\n[HATA] Sunucu kapalı veya ulaşılamıyor: ${url}`);
  console.error(`Ayrıntı: ${err.message}`);
  await tarayici.close();
  process.exit(2);
}

// ---------------------------------------------------------------------------
// 3) Yardımcı Analiz ve Ölçüm Fonksiyonları
// ---------------------------------------------------------------------------

/**
 * Sayfadaki arayüz kalite metriklerini ölçer:
 * - Yinelenen ID sayısı
 * - 24×24 pikselden küçük tıklanabilir öğeler (ve ilk 3 örneği)
 * - Yatay taşma (scrollWidth > innerWidth)
 */
async function ekranMetrikleriniOlc(page) {
  return await page.evaluate(() => {
    // 1. Yinelenen ID kontrolü
    const idler = Array.from(document.querySelectorAll('[id]')).map((el) => el.id.trim()).filter(Boolean);
    const idSayim = {};
    for (const id of idler) {
      idSayim[id] = (idSayim[id] || 0) + 1;
    }
    const yinelenenler = Object.entries(idSayim).filter(([_, adet]) => adet > 1);
    const yinelenenIdSayisi = yinelenenler.reduce((toplam, [_, adet]) => toplam + (adet - 1), 0);
    const yinelenenIdListesi = yinelenenler.map(([id, adet]) => `${id} (×${adet})`);

    // 2. 24×24 CSS pikselden küçük tıklanabilir hedef kontrolü
    const adaylar = Array.from(
      document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"]')
    );
    const kucukHedefler = [];

    for (const el of adaylar) {
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') continue;
      if (el.hidden || el.closest('[hidden]') || el.closest('.modal-overlay:not(.open)')) continue;

      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      if (r.width < 24 || r.height < 24) {
        const metin = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 24);
        const sinif = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        const etiket = el.tagName.toLowerCase();
        const ozet = `${etiket}${sinif ? '.' + sinif : ''}${metin ? ` ("${metin}")` : ''} [${Math.round(r.width)}×${Math.round(r.height)}]`;
        kucukHedefler.push(ozet);
      }
    }

    // 3. Yatay taşma kontrolü
    const scrollWidth = document.documentElement.scrollWidth;
    const innerWidth = window.innerWidth;
    const yatayTasma = scrollWidth > innerWidth;

    return {
      yinelenenIdSayisi,
      yinelenenIdListesi,
      kucukHedefSayisi: kucukHedefler.length,
      kucukHedefOrnekleri: kucukHedefler.slice(0, 3),
      yatayTasma,
      scrollWidth,
      innerWidth,
      tasmaMiktari: Math.max(0, scrollWidth - innerWidth)
    };
  });
}

/**
 * Taban klasöründeki karşılık PNG'yi arar (contentExpert / content_expert varyantlarını destekler).
 */
function tabanGorseliBul(tabanKlasor, dosyaAdi) {
  if (!tabanKlasor) return null;
  const dosyaYolu = path.join(tabanKlasor, dosyaAdi);
  if (existsSync(dosyaYolu)) return dosyaYolu;

  // contentExpert <-> content_expert adlandırma toleransı
  if (dosyaAdi.includes('contentExpert')) {
    const altYol = path.join(tabanKlasor, dosyaAdi.replace('contentExpert', 'content_expert'));
    if (existsSync(altYol)) return altYol;
  } else if (dosyaAdi.includes('content_expert')) {
    const altYol = path.join(tabanKlasor, dosyaAdi.replace('content_expert', 'contentExpert'));
    if (existsSync(altYol)) return altYol;
  }
  return null;
}

/**
 * Playwright sayfasında <canvas> ve getImageData ile iki görselin piksel farkını hesaplar.
 */
async function pikselFarkiHesapla(page, yeniGorselYolu, tabanGorselYolu) {
  if (!tabanGorselYolu || !existsSync(tabanGorselYolu)) {
    return {
      farkYuzdesi: null,
      tabanYok: true,
      kirpildi: false,
      metin: 'taban yok'
    };
  }

  const yeniBase64 = 'data:image/png;base64,' + readFileSync(yeniGorselYolu).toString('base64');
  const tabanBase64 = 'data:image/png;base64,' + readFileSync(tabanGorselYolu).toString('base64');

  return await page.evaluate(async ({ yeniSrc, tabanSrc }) => {
    const gorselYukle = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Görsel çözümlenemedi'));
        img.src = src;
      });

    const [imgYeni, imgTaban] = await Promise.all([gorselYukle(yeniSrc), gorselYukle(tabanSrc)]);

    const w = Math.min(imgYeni.width, imgTaban.width);
    const h = Math.min(imgYeni.height, imgTaban.height);
    const kirpildi = imgYeni.height !== imgTaban.height || imgYeni.width !== imgTaban.width;

    const c1 = document.createElement('canvas');
    c1.width = w;
    c1.height = h;
    const ctx1 = c1.getContext('2d');
    ctx1.drawImage(imgYeni, 0, 0);
    const d1 = ctx1.getImageData(0, 0, w, h).data;

    const c2 = document.createElement('canvas');
    c2.width = w;
    c2.height = h;
    const ctx2 = c2.getContext('2d');
    ctx2.drawImage(imgTaban, 0, 0);
    const d2 = ctx2.getImageData(0, 0, w, h).data;

    const toplamPiksel = w * h;
    let farkliPiksel = 0;

    for (let i = 0; i < d1.length; i += 4) {
      // Kanal farkları toplamı > 24 ise "farklı" (kenar yumuşatma gürültüsünü eler;
      // aynı kodun iki koşumu bu eşikle 0'a yakın çıkar).
      if (
        Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) +
        Math.abs(d1[i + 2] - d2[i + 2]) + Math.abs(d1[i + 3] - d2[i + 3]) > 24
      ) {
        farkliPiksel++;
      }
    }

    const yuzde = toplamPiksel > 0 ? (farkliPiksel / toplamPiksel) * 100 : 0;
    const yuvarli = Math.round(yuzde * 1000) / 1000;

    return {
      farkYuzdesi: yuvarli,
      tabanYok: false,
      kirpildi,
      toplamPiksel,
      farkliPiksel,
      metin: `%${yuvarli.toFixed(3)}${kirpildi ? ' (kırpıldı)' : ''}`
    };
  }, { yeniSrc: yeniBase64, tabanSrc: tabanBase64 });
}

// ---------------------------------------------------------------------------
// 4) Ekranları Dolaşma ve Kayıt
// ---------------------------------------------------------------------------
const sonuclar = [];

for (const cozunurluk of COZUNURLUKLER) {
  console.log(`\n======================================================`);
  console.log(`📐 Çözünürlük: ${cozunurluk.genislik}×${cozunurluk.yukseklik} (${cozunurluk.etiket})`);
  console.log(`======================================================`);

  await sayfa.setViewportSize({ width: cozunurluk.genislik, height: cozunurluk.yukseklik });
  anlikEkranHatalari = [];
  await sayfa.goto(url, { waitUntil: 'networkidle' });
  // Belirlenimcilik: geçiş/animasyon kapalı, yazı tipleri yüklenmiş olmalı;
  // yoksa aynı kod iki koşumda farklı piksel verir.
  await sayfa.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' });
  await sayfa.evaluate(() => document.fonts.ready);
  await bekle(600);

  // A) Giriş Ekranı (rol seçilmeden)
  {
    const dosyaAdi = `giris-0-${cozunurluk.etiket}.png`;
    const dosyaYolu = path.join(cikti, dosyaAdi);

    // Sayfa yüklenirken oluşan hatalar bu ekrana yazılır (sıfırlama goto'dan önce).
    const metrikler = await ekranMetrikleriniOlc(sayfa);
    // Giriş kapısı sabit konumlu bir katmandır; tam sayfa çekimde ALTINDAKİ panel
    // de kadraja girer ve panel değişince giriş "değişmiş" görünür. Yalnız görünür alan.
    await sayfa.screenshot({ path: dosyaYolu, fullPage: false });
    const konsolHataSayisi = anlikEkranHatalari.length;

    const tabanYolu = tabanGorseliBul(taban, dosyaAdi);
    const fark = await pikselFarkiHesapla(sayfa, dosyaYolu, tabanYolu);

    sonuclar.push({
      ekran: `giris-0-${cozunurluk.etiket}`,
      rol: 'giris',
      sekme: 0,
      genislik: cozunurluk.genislik,
      dosyaAdi,
      konsolHataSayisi,
      konsolHatalari: [...anlikEkranHatalari],
      ...metrikler,
      fark
    });

    console.log(
      `  ✓ ${dosyaAdi.padEnd(26)} | Fark: ${fark.metin.padEnd(16)} | Hata: ${konsolHataSayisi} | ID: ${metrikler.yinelenenIdSayisi} | <24px: ${metrikler.kucukHedefSayisi} | Taşma: ${metrikler.yatayTasma ? 'Evet' : 'Yok'}`
    );
  }

  // Demo verisini yükle ve giriş kapısını kapat
  await sayfa.evaluate(() => {
    if (typeof loadDemoScenario === 'function') loadDemoScenario();
    if (typeof demoBitir === 'function') demoBitir();
    const kapi = document.getElementById('girisKapisi');
    if (kapi) {
      kapi.hidden = true;
      document.body.style.overflow = '';
    }
    // Demo durumu OLDUĞU GİBİ kullanılır; durum alanları elle değiştirilmez
    // (yapay bir "graded" durumu gerçekte oluşmayan ekranlar üretir).
    if (typeof renderAll === 'function') renderAll();
  });
  await sayfa.waitForLoadState('networkidle');
  await bekle(800);

  // B) 5 Rol ve Sekmeleri
  for (const rol of ROLLER) {
    for (const sekme of rol.sekmeler) {
      // Hata sayacı render'DAN ÖNCE sıfırlanır: çizim sırasında çıkan hata bu ekrana yazılır.
      anlikEkranHatalari = [];
      // Önce rol çizilir (sekme düğmeleri ancak o zaman DOM'da), sonra sekme aranır.
      const sekmeMevcutMu = await sayfa.evaluate(
        ({ stateRole, tabAlani, sekmeNo, secici }) => {
          state.role = stateRole;
          if (tabAlani && sekmeNo != null) state[tabAlani] = sekmeNo;
          renderAll();
          // Sekme 0 bir giriş ekranıdır (sekme çubuğu yok); düğmesi aranmaz.
          if (secici && sekmeNo &&
              !document.querySelector(`${secici} .tab-btn[data-tab="${sekmeNo}"]`)) return false;
          window.scrollTo(0, 0);
          return true;
        },
        {
          stateRole: rol.stateRole,
          tabAlani: rol.tabAlani,
          sekmeNo: sekme,
          secici: rol.secici
        }
      );

      if (!sekmeMevcutMu) {
        console.log(`  ⚠ ${rol.ad} sekme ${sekme} bulunamadı, atlanıyor`);
        continue;
      }

      // Çizim eşzamansız yükleme başlatabilir (kazanım kataloğu, model durumu);
      // bitmeden çekilen görüntü koşumdan koşuma değişir.
      await sayfa.waitForLoadState('networkidle');
      await sayfa.evaluate(() => document.fonts.ready);
      await bekle(700);

      const dosyaAdi = `${rol.ad}-${sekme}-${cozunurluk.etiket}.png`;
      const dosyaYolu = path.join(cikti, dosyaAdi);

      const metrikler = await ekranMetrikleriniOlc(sayfa);
      await sayfa.screenshot({ path: dosyaYolu, fullPage: true });
      const konsolHataSayisi = anlikEkranHatalari.length;

      const tabanYolu = tabanGorseliBul(taban, dosyaAdi);
      const fark = await pikselFarkiHesapla(sayfa, dosyaYolu, tabanYolu);

      sonuclar.push({
        ekran: `${rol.ad}-${sekme}-${cozunurluk.etiket}`,
        rol: rol.ad,
        sekme,
        genislik: cozunurluk.genislik,
        dosyaAdi,
        konsolHataSayisi,
        konsolHatalari: [...anlikEkranHatalari],
        ...metrikler,
        fark
      });

      console.log(
        `  ✓ ${dosyaAdi.padEnd(26)} | Fark: ${fark.metin.padEnd(16)} | Hata: ${konsolHataSayisi} | ID: ${metrikler.yinelenenIdSayisi} | <24px: ${metrikler.kucukHedefSayisi} | Taşma: ${metrikler.yatayTasma ? 'Evet' : 'Yok'}`
      );
    }
  }
}

await tarayici.close();

// ---------------------------------------------------------------------------
// 5) Rapor Üretimi (rapor.md ve rapor.json)
// ---------------------------------------------------------------------------
const toplamKonsolHatasi = sonuclar.reduce((t, s) => t + s.konsolHataSayisi, 0);
const toplamYinelenenId = sonuclar.reduce((t, s) => t + s.yinelenenIdSayisi, 0);
const toplamKucukHedef = sonuclar.reduce((t, s) => t + s.kucukHedefSayisi, 0);
const toplamYatayTasma = sonuclar.filter((s) => s.yatayTasma).length;
const basarisiz = sonuclar.some((s) => s.konsolHataSayisi > 0 || s.yinelenenIdSayisi > 0);

// Markdown Raporu
const mdIcerik = `# Görsel Regresyon ve Arayüz Kalite Raporu

- **Tarih:** ${new Date().toISOString()}
- **Hedef URL:** \`${url}\`
- **Çıktı Klasörü:** \`${cikti}\`
- **Taban Klasörü:** ${taban ? `\`${taban}\`` : '*Belirtilmedi (yalnız çekim yapıldı)*'}
- **Engellenen Yapay Zekâ İstekleri (\`/api/ai/*\`):** ${engellenenAiSayisi} adet
- **Toplam Test Edilen Ekran:** ${sonuclar.length}
- **Genel Değerlendirme:** ${basarisiz ? '❌ **BAŞARISIZ** (Konsol hatası veya yinelenen ID tespit edildi)' : '✅ **BAŞARILI** (Konsol hatası ve yinelenen ID yok)'}

---

## Ekran Karşılaştırma Tablosu

| Ekran | Fark % | Konsol Hatası | Yinelenen ID | <24px Hedef | Taşma |
|---|---|---|---|---|---|
${sonuclar
  .map((s) => {
    const fark = s.fark ? s.fark.metin : '-';
    const tasma = s.yatayTasma ? `Evet (+${s.tasmaMiktari}px)` : 'Yok';
    const kucuk = s.kucukHedefSayisi > 0
      ? `${s.kucukHedefSayisi} ${s.kucukHedefOrnekleri.length ? `(${s.kucukHedefOrnekleri.join('; ').replace(/\|/g, '/')})` : ''}`
      : '0';
    return `| \`${s.ekran}\` | ${fark} | ${s.konsolHataSayisi} | ${s.yinelenenIdSayisi} | ${kucuk} | ${tasma} |`;
  })
  .join('\n')}

---

### Metrik Özeti
- **Toplam Konsol Hatası:** ${toplamKonsolHatasi}
- **Toplam Yinelenen ID:** ${toplamYinelenenId}
- **Küçük Tıklanabilir Hedef (<24px):** ${toplamKucukHedef}
- **Yatay Taşma Olan Ekran Sayısı:** ${toplamYatayTasma}
`;

writeFileSync(path.join(cikti, 'rapor.md'), mdIcerik, 'utf8');

// JSON Raporu
const jsonVeri = {
  tarih: new Date().toISOString(),
  url,
  cikti,
  taban,
  engellenenAiSayisi,
  toplamEkran: sonuclar.length,
  durum: basarisiz ? 'BASARISIZ' : 'BASARILI',
  ozet: {
    toplamKonsolHatasi,
    toplamYinelenenId,
    toplamKucukHedef,
    toplamYatayTasma
  },
  sonuclar
};

writeFileSync(path.join(cikti, 'rapor.json'), JSON.stringify(jsonVeri, null, 2), 'utf8');

console.log(`\n📄 Raporlar kaydedildi:`);
console.log(`  - ${path.join(cikti, 'rapor.md')}`);
console.log(`  - ${path.join(cikti, 'rapor.json')}`);
console.log(`🛡 Engellenen /api/ai/ çağrıları: ${engellenenAiSayisi}`);

if (basarisiz) {
  console.error('\n❌ Sonuç: BAŞARISIZ — Bazı ekranlarda konsol hatası veya yinelenen ID tespit edildi.');
  process.exit(1);
} else {
  console.log('\n✅ Sonuç: BAŞARILI — Konsol hatası ve yinelenen ID bulunamadı.');
  process.exit(0);
}
