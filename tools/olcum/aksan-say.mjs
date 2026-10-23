#!/usr/bin/env node
/**
 * §73 — YABANCI AKSAN ÖLÇÜMÜ (model çağırmaz; yalnız depodaki verileri okur).
 *
 * NEDEN VAR: §69'da canlıda modelin geri bildirim taslağında "necessário"
 * görüldü ve dil uyarısı çıkmadı. Latin-1'in Türkçe dışı harflerini
 * (é ñ ã ß …) uyarıya eklemeden önce iki soru ölçüldü: (1) model çıktılarında
 * bu harfler ne sıklıkla ve hangi sözcüklerde geçiyor, kaçı gerçek sızıntı;
 * (2) insan yazımı Türkçe ders metninde yanlış alarm olur mu.
 *
 * TEK KAYNAK: karakter sınıfları src/lib/guards.ts'ten OKUNUR (YABANCI_ALFABE,
 * YABANCI_AKSAN). Betik kendi kopyasını tutmaz; ürünle ölçüm ayrışamaz.
 *
 * DERLEMLER
 *   1. docs/olcum/ham/<koşum>/*.json  → `yanit` (modelin ürettiği metin; istek
 *      metni SAYILMAZ, o bizim verimizdir). Birim: çağrı ve soru.
 *   2. Çözücü gerekçeleri: docs/olcum/2026-*.csv `cozucu_gerekce` sütunu +
 *      docs/olcum/a5/cozucu-v2.json.
 *   3. İnsan yazımı Türkçe: public/mufredat, public/dersler, tools/olcum/set-*.json
 *      (yanlış alarm vekili).
 *
 * SINIRLILIK: /api/ai/evaluate çıktısı (gerekçe, geri bildirim) ölçüm setinde
 * YOK — canlıdaki sızıntı oradaydı. Aksansız yabancı sözcük (however, pero)
 * bu kuralın kapsamı dışında.
 *
 * Kullanım: node tools/olcum/aksan-say.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const KOK = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// --- guards.ts'ten sınıfları oku ---------------------------------------------
const guards = readFileSync(join(KOK, 'src/lib/guards.ts'), 'utf8');
const sinif = (ad) => {
  const m = guards.match(new RegExp('export const ' + ad + ' =\\s*\\n?\\s*/(\\[[^\\n]+\\])/;'));
  if (!m) throw new Error(ad + ' guards.ts içinde bulunamadı');
  return new RegExp(m[1], 'u');
};
const ALFABE = sinif('YABANCI_ALFABE');
const AKSAN = sinif('YABANCI_AKSAN');
const sozcukler = (m) => String(m || '').normalize('NFC').split(/[^\p{L}\p{M}]+/u).filter(Boolean);

const gez = function* (o) {
  if (typeof o === 'string') yield o;
  else if (Array.isArray(o)) for (const v of o) yield* gez(v);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) yield* gez(v);
};
const dosyalar = (d, uz) => {
  if (!existsSync(d)) return [];
  const out = [];
  for (const a of readdirSync(d)) {
    const p = join(d, a);
    if (statSync(p).isDirectory()) out.push(...dosyalar(p, uz));
    else if (uz.some((u) => a.toLowerCase().endsWith(u))) out.push(p);
  }
  return out.sort();
};

/** metin kümesini tarar: birim sayısı, AKSAN'lı birim, ALFABE'li birim, sözcük → {n, ornek} */
function tara(birimler) {
  const r = { birim: 0, aksanli: 0, alfabeli: 0, sozluk: new Map() };
  for (const { kaynak, metinler } of birimler) {
    r.birim++;
    let ak = false, al = false;
    for (const m of metinler) {
      for (const w of sozcukler(m)) {
        if (AKSAN.test(w)) {
          ak = true;
          const e = r.sozluk.get(w) || { n: 0, kaynak, baglam: '' };
          if (!e.n) { const i = m.indexOf(w); e.baglam = m.slice(Math.max(0, i - 40), i + w.length + 40).replace(/\s+/g, ' '); }
          e.n++; r.sozluk.set(w, e);
        }
        if (ALFABE.test(w)) al = true;
      }
    }
    r.aksanli += ak; r.alfabeli += al;
  }
  return r;
}
const yaz = (baslik, r) => {
  console.log(`\n## ${baslik}`);
  console.log(`birim ${r.birim} · Latin-1 aksanlı ${r.aksanli} · mevcut alfabe sınıfı ${r.alfabeli} · tekil aksanlı sözcük ${r.sozluk.size}`);
  for (const [w, e] of [...r.sozluk].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${String(e.n).padStart(3)}  ${w}  ← ${e.kaynak} :: …${e.baglam}…`);
};

// 1) üretim ham çıktıları — çağrı ve soru birimi
const ham = dosyalar(join(KOK, 'docs/olcum/ham'), ['.json']);
const cagrilar = [], sorular = [];
for (const f of ham) {
  const d = JSON.parse(readFileSync(f, 'utf8'));
  const y = d.yanit || {};
  const kaynak = basename(join(f, '..')) + '/' + basename(f);
  const qs = Array.isArray(y.questions) ? y.questions : [];
  cagrilar.push({ kaynak, metinler: [...gez(qs)] });
  qs.forEach((q, i) => sorular.push({ kaynak: kaynak + '#' + i, metinler: [...gez(q)] }));
}
console.log('# Yabancı aksan ölçümü (§73) — sınıflar src/lib/guards.ts\'ten');
yaz('Üretim — çağrı birimi (docs/olcum/ham)', tara(cagrilar));
const s = tara(sorular);
console.log(`\n## Üretim — soru birimi: ${s.birim} soru · Latin-1 aksanlı ${s.aksanli}`);

// 2) çözücü gerekçeleri
const cozucu = [];
for (const f of dosyalar(join(KOK, 'docs/olcum'), ['.csv']).filter((f) => /2026-.*\.csv$/.test(f) && !f.endsWith('-cagrilar.csv'))) {
  const satirlar = readFileSync(f, 'utf8').replace(/^﻿/, '');
  // CSV'yi tam ayrıştırmak yerine gerekçe sütununu okuruz: tırnaklı alanlar için küçük bir ayrıştırıcı.
  const kayitlar = []; let alan = '', kayit = [], tirnak = false;
  for (let i = 0; i < satirlar.length; i++) {
    const c = satirlar[i];
    if (tirnak) { if (c === '"' && satirlar[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { kayit.push(alan); alan = ''; }
    else if (c === '\n') { kayit.push(alan.replace(/\r$/, '')); kayitlar.push(kayit); kayit = []; alan = ''; }
    else alan += c;
  }
  if (alan || kayit.length) { kayit.push(alan); kayitlar.push(kayit); }
  const bas = kayitlar.shift() || [];
  const k = bas.indexOf('cozucu_gerekce');
  if (k < 0) continue;
  for (const r of kayitlar) if (r[k]) cozucu.push({ kaynak: basename(f), metinler: [r[k]] });
}
const cv2 = join(KOK, 'docs/olcum/a5/cozucu-v2.json');
if (existsSync(cv2)) {
  const gerekceler = function* (o) {
    if (Array.isArray(o)) for (const v of o) yield* gerekceler(v);
    else if (o && typeof o === 'object') for (const [a, v] of Object.entries(o)) {
      if (typeof v === 'string' && /gerekce|reasoning|aciklama/i.test(a)) yield v; else yield* gerekceler(v);
    }
  };
  for (const g of gerekceler(JSON.parse(readFileSync(cv2, 'utf8')))) cozucu.push({ kaynak: 'a5/cozucu-v2.json', metinler: [g] });
}
yaz('Çözücü gerekçeleri (CSV cozucu_gerekce + a5/cozucu-v2.json)', tara(cozucu));

// 3) insan yazımı Türkçe derlem
const insan = [...dosyalar(join(KOK, 'public/mufredat'), ['.json', '.md', '.txt', '.html']),
  ...dosyalar(join(KOK, 'public/dersler'), ['.json', '.md', '.txt', '.html']),
  ...dosyalar(join(KOK, 'tools/olcum'), ['.json']).filter((f) => basename(f).startsWith('set-'))]
  .map((f) => ({ kaynak: relative(KOK, f), metinler: [readFileSync(f, 'utf8')] }));
yaz('İnsan yazımı Türkçe derlem (yanlış alarm vekili) — dosya birimi', tara(insan));
