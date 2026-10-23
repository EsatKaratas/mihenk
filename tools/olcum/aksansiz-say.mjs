#!/usr/bin/env node
/**
 * §76 — AKSANSIZ YABANCI SÖZCÜK SIZINTISI ÖLÇÜMÜ (model çağırmaz).
 *
 * NEDEN VAR: §73 aksanlı yabancı harfleri (é ñ ã ß) dil uyarısına ekledi.
 * Aksansız sızıntı ("however", "pero", "only") harf kuralıyla yakalanamaz;
 * sözcük listesi gerekir. Eklemeden önce ölçüldü: liste model çıktısında kaç
 * gerçek sızıntı, kaç yanlış alarm üretir? Sonuç: EKLENMEDİ (PROGRESS §76).
 *
 * LİSTE: tools/olcum/aksansiz-liste.tsv — Gemini (23.10.2026), W2 denetimli.
 * Eşleşme: belirteç (\p{L}+) tam eşitliği, Türkçe duyarlı küçük harf (I→ı, İ→i).
 *
 * DERLEMLER (aksan-say.mjs ile aynı):
 *   model: docs/olcum/ham/<koşum>/*.json `yanit.questions` (782 soru) +
 *          çözücü gerekçeleri (CSV `cozucu_gerekce` + a5/cozucu-v2.json)
 *   insan: public/mufredat, public/dersler, tools/olcum/set-*.json
 *
 * ALT KÜMELER:
 *   EVET — Türkçede ayrı sözcük/ek olarak geçenler (de, o, en, para…)
 *   HAYIR — çakışmasızlar
 *   DAR — HAYIR eksi programlama anahtar sözcükleri (not=kod)
 *
 * Kullanım: node tools/olcum/aksansiz-say.mjs [--ornek N]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const KOK = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ORNEK = Number((process.argv.find((a) => a.startsWith('--ornek=')) || '--ornek=3').split('=')[1]);
const kucuk = (w) => w.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();

// --- liste -------------------------------------------------------------------
const liste = new Map(); // sözcük → {evet, kod, diller:Set}
for (const satir of readFileSync(join(KOK, 'tools/olcum/aksansiz-liste.tsv'), 'utf8').split(/\r?\n/)) {
  if (!satir.trim() || satir.startsWith('#')) continue;
  const [w, dil, cak, not = ''] = satir.split('\t');
  const k = kucuk(w.trim());
  const e = liste.get(k) || { evet: false, kod: false, diller: new Set() };
  e.evet ||= cak === 'EVET'; e.kod ||= /(^|; )kod$/.test(not) || /(^|; )kod;/.test(not); e.diller.add(dil);
  liste.set(k, e);
}
const altKume = (w) => { const e = liste.get(w); return e.evet ? 'EVET' : e.kod ? 'HAYIR-kod' : 'DAR'; };

// --- derlemler -------------------------------------------------------------------
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
function csvSatirlari(metin) {
  const kayitlar = []; let alan = '', kayit = [], tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) { if (c === '"' && metin[i + 1] === '"') { alan += '"'; i++; } else if (c === '"') tirnak = false; else alan += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { kayit.push(alan); alan = ''; }
    else if (c === '\n') { kayit.push(alan.replace(/\r$/, '')); kayitlar.push(kayit); kayit = []; alan = ''; }
    else alan += c;
  }
  if (alan || kayit.length) { kayit.push(alan); kayitlar.push(kayit); }
  return kayitlar;
}
function* modelMetinleri() {
  for (const f of dosyalar(join(KOK, 'docs/olcum/ham'), ['.json'])) {
    const qs = (JSON.parse(readFileSync(f, 'utf8')).yanit || {}).questions || [];
    for (const [i, q] of qs.entries()) for (const m of gez(q)) yield [`${basename(join(f, '..'))}/${basename(f)}#${i}`, m];
  }
  for (const f of dosyalar(join(KOK, 'docs/olcum'), ['.csv']).filter((f) => /2026-.*\.csv$/.test(f) && !f.endsWith('-cagrilar.csv'))) {
    const k = csvSatirlari(readFileSync(f, 'utf8').replace(/^﻿/, ''));
    const s = (k.shift() || []).indexOf('cozucu_gerekce');
    if (s >= 0) for (const r of k) if (r[s]) yield [basename(f) + ':cozucu', r[s]];
  }
  const cv2 = join(KOK, 'docs/olcum/a5/cozucu-v2.json');
  if (existsSync(cv2)) {
    const ger = function* (o) {
      if (Array.isArray(o)) for (const v of o) yield* ger(v);
      else if (o && typeof o === 'object') for (const [a, v] of Object.entries(o)) {
        if (typeof v === 'string' && /gerekce|reasoning|aciklama/i.test(a)) yield v; else yield* ger(v);
      }
    };
    for (const g of ger(JSON.parse(readFileSync(cv2, 'utf8')))) yield ['a5/cozucu-v2.json', g];
  }
}
function* insanMetinleri() {
  const uz = ['.json', '.md', '.txt', '.html'];
  for (const f of [...dosyalar(join(KOK, 'public/mufredat'), uz), ...dosyalar(join(KOK, 'public/dersler'), uz),
    ...dosyalar(join(KOK, 'tools/olcum'), ['.json']).filter((f) => basename(f).startsWith('set-'))]) {
    yield [relative(KOK, f), readFileSync(f, 'utf8')];
  }
}

// --- sayım ------------------------------------------------------------------
function tara(it) {
  let belirtec = 0; const say = new Map(); const ornek = new Map();
  for (const [kaynak, m] of it) {
    for (const t of m.matchAll(/\p{L}+/gu)) {
      belirtec++;
      const w = kucuk(t[0]);
      if (!liste.has(w)) continue;
      say.set(w, (say.get(w) || 0) + 1);
      const o = ornek.get(w) || []; if (o.length < ORNEK) { o.push(`${kaynak} :: …${m.slice(Math.max(0, t.index - 45), t.index + w.length + 45).replace(/\s+/g, ' ')}…`); ornek.set(w, o); }
    }
  }
  return { belirtec, say, ornek };
}
function yaz(ad, r) {
  const top = { EVET: 0, 'HAYIR-kod': 0, DAR: 0 };
  for (const [w, n] of r.say) top[altKume(w)] += n;
  console.log(`\n## ${ad}: belirteç ${r.belirtec} · isabet EVET ${top.EVET} · HAYIR-kod ${top['HAYIR-kod']} · DAR ${top.DAR}`);
  for (const [w, n] of [...r.say].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(5)}  ${w} [${altKume(w)}; ${[...liste.get(w).diller].join(',')}]`);
    for (const o of r.ornek.get(w)) console.log('         ' + o);
  }
}
const e = [...liste.values()];
console.log(`# Aksansız sızıntı ölçümü (§76) — liste ${liste.size} tekil: EVET ${e.filter((x) => x.evet).length} · HAYIR-kod ${e.filter((x) => !x.evet && x.kod).length} · DAR ${e.filter((x) => !x.evet && !x.kod).length}`);
yaz('MODEL ÇIKTISI (782 soru + çözücü gerekçeleri)', tara(modelMetinleri()));
yaz('İNSAN YAZIMI TÜRKÇE (müfredat + ders belgeleri + ölçüm seti)', tara(insanMetinleri()));
