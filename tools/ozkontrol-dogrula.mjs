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
const blokHam = kaynak.slice(basla, bitis);
// Liste bloğunda AÇIKLAMA YORUMLARI var (§29, §30 gibi). Yorum metninde
// tırnak içinde geçen sıradan bir kelime (ör. veli panelindeki "Gir"
// düğmesi) buradaki regex tarafından FONKSİYON ADI sanılıyor ve araç
// olmayan bir hatayı bildiriyordu. Ölçüm aracının kendisi yanılıyordu,
// kod değil — bu proje bu tuzağa daha önce de düştü. Yorumlar önce ayıklanır.
const blok = blokHam.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const adlar = [...blok.matchAll(/"([A-Za-z0-9_]+)"/g)].map((m) => m[1]);

if (!adlar.length) {
  console.error('HATA: öz-kontrol listesi boş okundu.');
  process.exit(1);
}

// Her ad için dosyada bir tanım var mı?
const tanimsiz = adlar.filter((ad) => !kaynak.includes(`function ${ad}(`));

/* §42 — DENETİM ARTIK ÇİFT YÖNLÜ.
 *
 * Araç bugüne kadar yalnızca TEK yöne bakıyordu: "listede var, tanımı var mı?"
 * Ters yön (tanımı var ama listede yok) denetlenmiyordu ve tam da o yön
 * sessiz kalıyordu:
 *
 *   `selfCheck()` şeridi `typeof window[f] !== "function"` ile tetiklenir —
 *   yani YALNIZCA listedeki bir ad tanımsızsa. Bir fonksiyonu listeye hiç
 *   eklemezseniz kırmızı şerit ÇIKMAZ; koruma sessizce eksik kalır.
 *   (Devir belgesi bunun tersini söylüyordu; ölçülerek düzeltildi.)
 *
 * ÖLÇÜLDÜ: 330 üst düzey fonksiyonun 68'i listede değildi — `escapeHtml`
 * dahil, yani ürünün tek XSS savunması ağın dışındaydı.
 *
 * Artık kapsama %100 ve bu kontrol onu orada tutuyor: yeni bir üst düzey
 * fonksiyon eklenip listeye yazılmazsa CI kırılır.
 */
const tanimliAdlar = [...kaynak.matchAll(/^(?:async )?function ([A-Za-z0-9_]+)\(/gm)]
  .map((m) => m[1])
  .filter((ad) => ad !== 'selfCheck');
const listeDisi = [...new Set(tanimliAdlar)].filter((ad) => !adlar.includes(ad));

// Aynı ad iki kez listelenmişse liste bakımsız demektir.
const gorulen = new Set();
const tekrar = adlar.filter((ad) => (gorulen.has(ad) ? true : (gorulen.add(ad), false)));

const kapsama = tanimliAdlar.length
  ? Math.round(((tanimliAdlar.length - listeDisi.length) / tanimliAdlar.length) * 100)
  : 100;
console.log(`${DOSYA} — öz-kontrol listesi: ${adlar.length} ad (${gorulen.size} tekil)`);
console.log(`${DOSYA} — üst düzey fonksiyon: ${tanimliAdlar.length} · kapsama: %${kapsama}`);

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
if (listeDisi.length) {
  console.error(`\n✗ Tanımlı olup LİSTEDE OLMAYAN ${listeDisi.length} fonksiyon:`);
  listeDisi.forEach((ad) => console.error(`    ${ad}`));
  console.error('\n  Bunlar öz-kontrol ağının DIŞINDA: bir birleştirme onları');
  console.error('  düşürürse ekranda hiçbir uyarı çıkmaz (şerit yalnızca');
  console.error('  "listede var ama tanım yok" durumunda tetiklenir).');
  console.error('  Çözüm: adları public/app.js sonundaki selfCheck listesine ekleyin.');
  hata = true;
}

if (hata) {
  console.error('\nÖz-kontrol listesi tutarsız. Bir fonksiyon silindiyse listeden de çıkarın,');
  console.error('yeni bir fonksiyon eklendiyse listeye ekleyin.');
  process.exit(1);
}

console.log('✓ Listedeki her adın tanımı mevcut, tekrar yok, kapsama tam.');
