// -*- coding: utf-8 -*-
/**
 * ÖZ-KONTROL LİSTESİ DOĞRULAYICI
 *
 * NEDEN VAR: `public/app.js` tek dosyada ~5.600 satır. Bir yeniden yazımda iki
 * fonksiyon arasındaki aralık fazladan dört fonksiyonu kapsadı ve onlar
 * silindi; öğretmen sekmesi canlıda kırıldı (AKTARIM §6.3-1). Bu yüzden
 * dosyanın sonunda bir `selfCheck()` bloğu var: listedeki her adın gerçekten
 * `window` üzerinde tanımlı olduğunu tarayıcıda denetler ve eksikse ekrana
 * kırmızı uyarı basar.
 *
 * Ama o denetim ancak SAYFA AÇILINCA çalışır. Bu betik aynı denetimi
 * CI'da, tarayıcı olmadan yapar: listedeki her ad için dosyada bir
 * `function <ad>(` tanımı var mı?
 *
 * Yakaladığı hata sınıfı: "fonksiyonu sildim ama öz-kontrol listesinden
 * çıkarmayı unuttum" ve "yeni fonksiyon ekledim ama listeye eklemedim"in
 * tersi olan "listede var ama tanım yok".
 *
 * Kullanım:  node tools/ozkontrol-dogrula.mjs
 * Çıkış kodu 0 = tutarlı, 1 = tutarsız.
 *
 * PROGRESS §17d'de bu araç geçici bir denetim betiği olarak yazılmış ama
 * depoya alınmamıştı; CI'ya bağlanınca kalıcı hâle getirildi.
 */
import { readFileSync } from 'node:fs';

const DOSYA = 'public/app.js';
const kaynak = readFileSync(DOSYA, 'utf8');

// selfCheck bloğundaki ad listesini çıkar.
const basla = kaynak.indexOf('function selfCheck');
if (basla < 0) {
  console.error(`HATA: ${DOSYA} içinde selfCheck bloğu bulunamadı.`);
  process.exit(1);
}
const bitis = kaynak.indexOf('const eksik', basla);
if (bitis < 0) {
  console.error('HATA: selfCheck bloğunun sonu (const eksik) bulunamadı.');
  process.exit(1);
}
const blok = kaynak.slice(basla, bitis);
const adlar = [...blok.matchAll(/"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);

if (!adlar.length) {
  console.error('HATA: öz-kontrol listesi boş okundu.');
  process.exit(1);
}

// Her ad için dosyada bir tanım var mı?
const tanimsiz = adlar.filter((ad) => !kaynak.includes(`function ${ad}(`));

// Aynı ad iki kez listelenmişse liste bakımsız demektir.
const gorulen = new Set();
const tekrar = adlar.filter((ad) => (gorulen.has(ad) ? true : (gorulen.add(ad), false)));

console.log(`${DOSYA} — öz-kontrol listesi: ${adlar.length} ad (${gorulen.size} tekil)`);

let hata = false;
if (tanimsiz.length) {
  console.error(`\n✗ Listede olup TANIMI BULUNAMAYAN ${tanimsiz.length} ad:`);
  tanimsiz.forEach((ad) => console.error(`    ${ad}`));
  hata = true;
}
if (tekrar.length) {
  console.error(`\n✗ Listede TEKRAR EDEN ${tekrar.length} ad:`);
  [...new Set(tekrar)].forEach((ad) => console.error(`    ${ad}`));
  hata = true;
}

if (hata) {
  console.error('\nÖz-kontrol listesi tutarsız. Bir fonksiyon silindiyse listeden de çıkarın.');
  process.exit(1);
}

console.log('✓ Listedeki her adın tanımı mevcut, tekrar yok.');
