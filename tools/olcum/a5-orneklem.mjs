#!/usr/bin/env node
// ============================================================================
// A5 etiket kümeleri (W4 tasarımı) — §55 sonrası. Yalnız okur, yazdığı dosyalar
// docs/olcum/a5/ altındadır.
//
// Girdi: dört A5 koşumunun soru CSV'leri (…-gercek-a5s05.csv, …-a5s02.csv; iki model).
// Kümeler (her soru BİR KEZ etiketlenir; bir soru birden çok kümede olabilir,
// kümeler eşleme dosyasında etiket olarak durur):
//   (a) tekrar 1 · sıcaklık 0,5 · iki model · tüm ÇSS
//   (b) A1/A2 bayraklı tüm ÇSS (çözücü uyuşmazlığı, hesap uyuşmazlığı, hesap
//       başka şıkla tutuyor, doğru şıkta işlem ifadesi — bilinen yanlış pozitif)
//   (c) bayraksızlardan tabakalı ~40 (model × sıcaklık, tabaka başına eşit)
// Yedeğe düşen üretimler (fellBack=1) kümelere ALINMAZ; ayrı listelenir —
// B'nin ölçümünü A'nın çıktısı kirletmesin (gizlenmez, sayılır).
//
// Türetilen sütun: sikIfadeIceriyor — doğru şık metninde işlem ifadesi var mı
// (boşluklu işleç "km * 5", ya da rakamlar arası "5*2", "=" ). "km/saat" gibi
// birimler işaretlenmez. Hesap denetiminin bilinen yanlış pozitifi buradan gelir.
//
// Çıktılar (docs/olcum/a5/):
//   etiket-kor.json         — W4 için: K-no, ders, sınıf, kazanım, gövde, şıklar, işaretli harf (model,
//                              sıcaklık, çözücü, hesap, bayrak YOK)
//   etiket-esleme.json      — K-no → koşum/model/sıcaklık/kazanım/tekrar/sıra,
//                              kümeler, gizlenen tüm alanlar
//   ikinci-kontrol-kor.json — W3 için: K-no'ların tohumlu %20 alt örneklemi,
//                              KENDİ numaraları (I-no); birinci kontrolün hiçbir
//                              kararını ya da K-no'yu içermez
//   ikinci-kontrol-esleme.json — I-no → K-no (yalnız birleştirme için)
//   yedege-dusenler.json    — fellBack satırları (kümelere alınmadı)
//   a5-birlesik.csv         — dört koşumun tüm ÇSS satırları + model, sicaklik_kosum,
//                              sikIfadeIceriyor, kumeler, kno
//
// Kullanım: node tools/olcum/a5-orneklem.mjs --dizin docs/olcum --tohum 2026 [--c 40] [--ikinci 0.2]
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = { dizin: 'docs/olcum', tohum: null, c: 40, ikinci: 0.2 };
for (let i = 2; i < process.argv.length; i += 2) {
  const [k, v] = [process.argv[i], process.argv[i + 1]];
  if (k === '--dizin') a.dizin = v;
  else if (k === '--tohum') a.tohum = Math.floor(Number(v));
  else if (k === '--c') a.c = Math.floor(Number(v));
  else if (k === '--ikinci') a.ikinci = Number(v);
  else throw new Error(`Bilinmeyen seçenek: ${k}`);
}
if (!Number.isFinite(a.tohum)) throw new Error('--tohum zorunlu');

function mulberry32(t) {
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function karistir(dizi, rnd) {
  const d = [...dizi];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function csvOku(metin) {
  const satirlar = []; let alan = '', satir = [], tirnak = false;
  const s = metin.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (tirnak) { if (c === '"' && s[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; satir.push(alan); alan = ''; if (satir.length > 1 || satir[0] !== '') satirlar.push(satir); satir = []; }
    else alan += c;
  }
  if (alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [b, ...v] = satirlar; return { baslik: b, satirlar: v.map((r) => Object.fromEntries(b.map((k, j) => [k, r[j] ?? '']))) };
}
const csvAlan = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const evet = (v) => v === '1' || v === 'true';

/** Doğru şık metninde işlem ifadesi: boşluklu işleç ya da rakamlar arası işleç / "=". Birimler ("km/saat") hariç. */
export function sikIfadeIceriyor(metin) {
  const s = String(metin || '');
  return /\s[*×÷/+=−-]\s/.test(s) || /\d\s*[*×÷=+]\s*\d/.test(s) || /=/.test(s);
}

const dizin = path.resolve(KOK, a.dizin);
const dosyalar = fs.readdirSync(dizin).filter((f) => /-gercek-a5s0[25]\.csv$/.test(f)).sort();
if (dosyalar.length !== 4) throw new Error(`4 A5 soru CSV'si bekleniyordu, ${dosyalar.length} bulundu: ${dosyalar.join(', ')}`);

let baslik = null;
const tum = [];
for (const f of dosyalar) {
  const { baslik: b, satirlar } = csvOku(fs.readFileSync(path.join(dizin, f), 'utf8'));
  baslik = baslik || b;
  const sicaklik = f.includes('a5s05') ? '0.5' : '0.2';
  const model = f.includes('scout') ? 'B' : 'A';
  for (const r of satirlar) {
    if (r.tur !== 'mc') continue;
    const dogru = (r.siklar.split(' | ').find((s) => s.startsWith(`${r.dogru_sik}) `)) || '').slice(3);
    tum.push({ ...r, model, sicaklik_kosum: sicaklik, sikIfadeIceriyor: sikIfadeIceriyor(dogru), _kimlik: `${r.kosum}|${r.kazanim}|${r.tekrar}|${r.sira}` });
  }
}
const yedek = tum.filter((r) => r.fellBack === '1');
const asil = tum.filter((r) => r.fellBack !== '1');

const bayrakli = (r) => evet(r.cozucu_uyusmazlik) || evet(r.hesapUyusmazligi) || !!r.hesapBaskaSik || r.sikIfadeIceriyor;
const kume = new Map(); // kimlik -> Set
const ekle = (r, k) => { if (!kume.has(r._kimlik)) kume.set(r._kimlik, new Set()); kume.get(r._kimlik).add(k); };
for (const r of asil) {
  if (r.tekrar === '1' && r.sicaklik_kosum === '0.5') ekle(r, 'a');
  if (bayrakli(r)) ekle(r, 'b');
}
// (c) bayraksızlardan tabakalı: model × sıcaklık, tabaka başına eşit pay, tohumlu.
const rnd = mulberry32(a.tohum);
const tabakalar = ['A|0.5', 'A|0.2', 'B|0.5', 'B|0.2'];
const pay = Math.ceil(a.c / tabakalar.length);
for (const t of tabakalar) {
  const [m, s] = t.split('|');
  const havuz = asil.filter((r) => !bayrakli(r) && r.model === m && r.sicaklik_kosum === s && !kume.get(r._kimlik)?.has('a'));
  for (const r of karistir(havuz, rnd).slice(0, pay)) ekle(r, 'c');
}

// Etiketlenecek tekil sorular: sıralama da tohumlu karıştırılır (küme sırası etiketleyiciye ipucu vermesin).
const secilen = karistir(asil.filter((r) => kume.has(r._kimlik)), rnd);
secilen.forEach((r, i) => { r.kno = `K${String(i + 1).padStart(3, '0')}`; r.kumeler = [...kume.get(r._kimlik)].sort().join(''); });

const cikti = path.join(dizin, 'a5');
fs.mkdirSync(cikti, { recursive: true });
const ust = { tohum: a.tohum, kaynak: dosyalar, uretim: new Date().toISOString() };
const yaz = (ad, veri) => fs.writeFileSync(path.join(cikti, ad), JSON.stringify(veri, null, 2) + '\n', 'utf8');

/* KÖR madde (W4'ün iki aşamalı kör yöntemi): gövde, şıklar, İŞARETLİ HARF (denetlenecek
   anahtar), kazanım ve sınıf. Model, sıcaklık, çözücü, hesap ve hiçbir bayrak YOK —
   etiketleyici denetimlerin ne dediğini bilmeden karar verir. */
const setMaddeleri = JSON.parse(fs.readFileSync(path.join(KOK, 'tools', 'olcum', 'set-v1.1.json'), 'utf8')).maddeler;
const kazanimMetni = (kod) => (setMaddeleri.find((m) => m.kod === kod) || {}).metin || '';
const korMadde = (r) => ({ ders: r.ders, sinif: r.sinif, kazanim: r.kazanim, kazanim_metni: kazanimMetni(r.kazanim), govde: r.govde, siklar: r.siklar, isaretli_sik: r.dogru_sik });
yaz('etiket-kor.json', { ...ust, n: secilen.length, not: 'Model, sıcaklık, çözücü, hesap ve bayraklar bilerek yok. isaretli_sik = sistemin cevap anahtarı (denetlenecek).',
  maddeler: secilen.map((r) => ({ kno: r.kno, ...korMadde(r) })) });
yaz('etiket-esleme.json', { ...ust, n: secilen.length,
  kume_sayilari: { a: secilen.filter((r) => r.kumeler.includes('a')).length, b: secilen.filter((r) => r.kumeler.includes('b')).length, c: secilen.filter((r) => r.kumeler.includes('c')).length },
  maddeler: secilen.map((r) => ({
    kno: r.kno, kumeler: r.kumeler, model: r.model, model_yanit: r.model_yanit, sicaklik: r.sicaklik_kosum, kosum: r.kosum, kazanim: r.kazanim,
    tekrar: r.tekrar, sira: r.sira, istemSurumu: r.istemSurumu, dogru_sik: r.dogru_sik, hesap: r.hesap, hesapUyusmazligi: r.hesapUyusmazligi,
    hesapBaskaSik: r.hesapBaskaSik, sikIfadeIceriyor: r.sikIfadeIceriyor, uzunSikIpucu: r.uzunSikIpucu, cozucu_sik: r.cozucu_sik,
    cozucu_uyusmazlik: r.cozucu_uyusmazlik, cozucu_guven: r.cozucu_guven, cozucu_gerekce: r.cozucu_gerekce,
  })) });

// W3: kör ikinci kontrol — %20 alt örneklem, KENDİ numaraları, birinci kontrolün hiçbir alanı yok.
const rnd2 = mulberry32(a.tohum + 1);
const ikinci = karistir(secilen, rnd2).slice(0, Math.max(1, Math.round(secilen.length * a.ikinci)));
yaz('ikinci-kontrol-kor.json', { tohum: a.tohum + 1, oran: a.ikinci, n: ikinci.length,
  not: 'Kör ikinci kontrol: model, sıcaklık, çözücü, hesap, bayrak ve birinci kontrolün kararları yok. isaretli_sik = sistemin cevap anahtarı.',
  maddeler: ikinci.map((r, i) => ({ ino: `I${String(i + 1).padStart(3, '0')}`, ...korMadde(r) })) });
yaz('ikinci-kontrol-esleme.json', { tohum: a.tohum + 1, n: ikinci.length, not: 'Yalnız birleştirme için; W3 bu dosyayı açmamalı.',
  maddeler: ikinci.map((r, i) => ({ ino: `I${String(i + 1).padStart(3, '0')}`, kno: r.kno })) });
yaz('yedege-dusenler.json', { n: yedek.length, not: 'fellBack=1: üretim birincil modelden değil; kümelere alınmadı.',
  maddeler: yedek.map((r) => ({ kosum: r.kosum, model_kosum: r.model, model_yanit: r.model_yanit, sicaklik: r.sicaklik_kosum, kazanim: r.kazanim, tekrar: r.tekrar, sira: r.sira })) });

const ekSutun = ['model', 'sicaklik_kosum', 'sikIfadeIceriyor', 'kumeler', 'kno'];
const satirlar = [baslik.concat(ekSutun).map(csvAlan).join(',')].concat(
  tum.map((r) => baslik.concat(ekSutun).map((k) => csvAlan(typeof r[k] === 'boolean' ? (r[k] ? 1 : 0) : r[k])).join(','))
);
fs.writeFileSync(path.join(cikti, 'a5-birlesik.csv'), '﻿' + satirlar.join('\n') + '\n', 'utf8');

console.log(`ÇSS toplam ${tum.length} · birincil ${asil.length} · yedeğe düşen ${yedek.length}`);
console.log(`etiketlenecek tekil soru ${secilen.length} (a ${secilen.filter((r) => r.kumeler.includes('a')).length} · b ${secilen.filter((r) => r.kumeler.includes('b')).length} · c ${secilen.filter((r) => r.kumeler.includes('c')).length}) · ikinci kontrol ${ikinci.length}`);
console.log(`doğru şıkta işlem ifadesi (sikIfadeIceriyor): ${asil.filter((r) => r.sikIfadeIceriyor).length}`);
console.log(`yazıldı: ${path.relative(KOK, cikti)}/`);
