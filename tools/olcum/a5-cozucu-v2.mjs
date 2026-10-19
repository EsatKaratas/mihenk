#!/usr/bin/env node
// ============================================================================
// §57 — A1 yeniden ölçümü: çözücü istemi sürüm 2 (gerekçe önce).
// A5'te etiketlenen 225 ÇSS'yi ham kayıttan okur (gövde, şıklar, anahtar —
// üretim YENİDEN YAPILMAZ) ve /api/ai/solve'a gönderir. Çapraz model korunur:
// A'nın (70b) ürettiğini Scout, B'nin (Scout) ürettiğini 70b çözer → iki sunucu.
// Çıktı: docs/olcum/a5/cozucu-v2.json (K-no → yanıt). Etiketler aynen kullanılır.
//
// Kullanım: node tools/olcum/a5-cozucu-v2.mjs --a http://127.0.0.1:8790 --b http://127.0.0.1:8791
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const a = { a: null, b: null, paralel: 2 };
for (let i = 2; i < process.argv.length; i += 2) {
  const [k, v] = [process.argv[i], process.argv[i + 1]];
  if (k === '--a') a.a = v; else if (k === '--b') a.b = v; else if (k === '--paralel') a.paralel = Number(v);
  else throw new Error(`Bilinmeyen seçenek: ${k}`);
}
if (!a.a || !a.b) throw new Error('--a ve --b zorunlu');

const esleme = JSON.parse(fs.readFileSync(path.join(KOK, 'docs/olcum/a5/etiket-esleme.json'), 'utf8')).maddeler;
const cikti = path.join(KOK, 'docs/olcum/a5/cozucu-v2.json');
const sonuc = fs.existsSync(cikti) ? JSON.parse(fs.readFileSync(cikti, 'utf8')).maddeler : {};

function soruBul(m) {
  const j = JSON.parse(fs.readFileSync(path.join(KOK, 'docs/olcum/ham', m.kosum, `${m.kazanim}-r${m.tekrar}.json`), 'utf8'));
  const q = j.yanit.questions[Number(m.sira) - 1];
  if (!q || q.type !== 'mc' || q.correctKey !== m.dogru_sik) throw new Error(`${m.kno}: ham kayıtta soru eşleşmedi`);
  return q;
}

async function coz(url, q) {
  for (let deneme = 1; ; deneme++) {
    const r = await fetch(`${url}/api/ai/solve`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ questionBody: q.body, options: q.options, anahtar: q.correctKey }),
    });
    const j = await r.json().catch(() => ({ error: 'json_degil' }));
    if ((r.status === 429 || r.status === 503) && deneme <= 3) { await new Promise((s) => setTimeout(s, 65000)); continue; }
    return { http: r.status, ...j };
  }
}

const isler = esleme.filter((m) => !sonuc[m.kno]);
console.log(`${esleme.length} madde, ${isler.length} çözülecek (paralel ${a.paralel})`);
let i = 0;
async function isci() {
  while (i < isler.length) {
    const m = isler[i++];
    const q = soruBul(m);
    const y = await coz(m.model === 'A' ? a.a : a.b, q);
    sonuc[m.kno] = { model: m.model, http: y.http, secilenSik: y.secilenSik ?? null, anahtarUyusmazligi: y.anahtarUyusmazligi ?? null,
      cozulemedi: y.cozulemedi ?? null, guven: y.guven ?? null, gerekce: y.gerekce || y.error || '', meta: y.meta || null };
    fs.writeFileSync(cikti, JSON.stringify({ cozucuIstemSurumu: 2, uretim: new Date().toISOString(), maddeler: sonuc }, null, 2) + '\n', 'utf8');
    if (i % 25 === 0) console.log(`  ${Object.keys(sonuc).length}/${esleme.length}`);
  }
}
await Promise.all(Array.from({ length: a.paralel }, isci));
const deg = Object.values(sonuc);
console.log(`bitti: ${deg.length} · 200: ${deg.filter((x) => x.http === 200).length} · capraz: ${deg.filter((x) => x.meta && x.meta.capraz).length} · sürüm2: ${deg.filter((x) => x.meta && x.meta.cozucuIstemSurumu === 2).length}`);
