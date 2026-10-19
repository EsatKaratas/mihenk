#!/usr/bin/env node
// ============================================================================
// Tohumlu etiketleme örneklemi — §55 A5.
//
// Elle etiketlenecek soruları ölçüm CSV'lerinden TEKRARLANABİLİR biçimde
// seçer: aynı --tohum aynı örneklemi verir (mulberry32). İki dosya yazar:
//   - KÖR dosya: etiketleyicinin göreceği alanlar (gövde, şıklar). Doğru şık,
//     sunucu bayrakları ve çözücü sonucu YOKTUR — etiket bunlardan etkilenmesin.
//   - EŞLEME dosyası: K-no → koşum/kazanım/tekrar/sıra + gizlenen alanlar.
//     Etiketleme bittikten sonra ozet tarafında birleştirilir.
//
// Kullanım:
//   node tools/olcum/orneklem.mjs --csv docs/olcum/A.csv,docs/olcum/B.csv --n 40 --tohum 2026 [--tur mc]
// Çıktı: docs/olcum/orneklem-<tohum>-kor.json ve orneklem-<tohum>-esleme.json
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function argumanlar(argv) {
  const a = { n: 40, tohum: null, tur: 'mc', csv: [] };
  for (let i = 2; i < argv.length; i += 2) {
    const [k, v] = [argv[i], argv[i + 1]];
    if (k === '--csv') a.csv = v.split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--n') a.n = Math.max(1, Math.floor(Number(v)));
    else if (k === '--tohum') a.tohum = Math.floor(Number(v));
    else if (k === '--tur') a.tur = v;
    else throw new Error(`Bilinmeyen seçenek: ${k}`);
  }
  if (!a.csv.length || !Number.isFinite(a.tohum)) throw new Error('--csv ve --tohum zorunlu');
  return a;
}

/** Tohumlu, deterministik rastgele sayı üreteci (mulberry32). */
function mulberry32(t) {
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** RFC 4180 CSV okuyucu (tırnaklı alan, kaçırılmış tırnak, alan içinde satır sonu). */
function csvOku(metin) {
  const satirlar = [];
  let alan = '', satir = [], tirnak = false;
  const s = metin.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (tirnak) {
      if (c === '"' && s[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === ',') { satir.push(alan); alan = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      satir.push(alan); alan = '';
      if (satir.length > 1 || satir[0] !== '') satirlar.push(satir);
      satir = [];
    } else alan += c;
  }
  if (alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }
  const [baslik, ...veri] = satirlar;
  return veri.map((r) => Object.fromEntries(baslik.map((b, j) => [b, r[j] ?? ''])));
}

const a = argumanlar(process.argv);
const havuz = a.csv.flatMap((f) => csvOku(fs.readFileSync(path.resolve(KOK, f), 'utf8')))
  .filter((r) => !a.tur || r.tur === a.tur);
if (!havuz.length) throw new Error('Havuz boş (CSV ya da --tur eşleşmedi).');

// Fisher-Yates, tohumlu: havuzun tamamı karıştırılır, ilk n alınır.
const rnd = mulberry32(a.tohum);
const sirali = [...havuz];
for (let i = sirali.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [sirali[i], sirali[j]] = [sirali[j], sirali[i]];
}
const secilen = sirali.slice(0, Math.min(a.n, sirali.length));

const kor = secilen.map((r, i) => ({ kno: `K${String(i + 1).padStart(3, '0')}`, ders: r.ders, sinif: r.sinif, govde: r.govde, siklar: r.siklar }));
const esleme = secilen.map((r, i) => ({
  kno: kor[i].kno, kosum: r.kosum, kazanim: r.kazanim, tekrar: r.tekrar || '1', sira: r.sira, sicaklik: r.sicaklik, istemSurumu: r.istemSurumu,
  model: r.model_yanit, dogru_sik: r.dogru_sik, anahtarBelirsiz: r.anahtarBelirsiz, hesapUyusmazligi: r.hesapUyusmazligi,
  uzunSikIpucu: r.uzunSikIpucu, cozucu_sik: r.cozucu_sik, cozucu_uyusmazlik: r.cozucu_uyusmazlik,
}));
const ust = { tohum: a.tohum, n: secilen.length, havuz: havuz.length, tur: a.tur, kaynak: a.csv, uretim: new Date().toISOString() };
const dizin = path.join(KOK, 'docs', 'olcum');
fs.writeFileSync(path.join(dizin, `orneklem-${a.tohum}-kor.json`), JSON.stringify({ ...ust, maddeler: kor }, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dizin, `orneklem-${a.tohum}-esleme.json`), JSON.stringify({ ...ust, maddeler: esleme }, null, 2) + '\n', 'utf8');
console.log(`Havuz ${havuz.length}, örneklem ${secilen.length} (tohum ${a.tohum}) → orneklem-${a.tohum}-kor.json + -esleme.json`);
