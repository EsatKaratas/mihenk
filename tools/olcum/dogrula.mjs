#!/usr/bin/env node
// ============================================================================
// Manşet sayıların yeniden üretimi — `npm run olcum:dogrula` (PROGRESS §109).
//
// Ne yapar: depodaki HAM etiket ve denetim verisinden (docs/olcum/) ARASTIRMA.md
// §6 ve §6.8'deki manşet sayıları ve puanlama deneyinin birincil sonucunu
// BAĞIMSIZ olarak yeniden hesaplar, belgedeki metinden okunan sayılarla
// karşılaştırır ve docs/olcum/PANO.md'ye yazar. Bir sayı tutmazsa çıkış kodu 1.
//
// Ne YAPMAZ: belgeyi ya da veriyi düzeltmez; model çağırmaz; ağ kullanmaz.
// Belgedeki sayı belgenin kendi yuvarlama hassasiyetinde karşılaştırılır
// (%x,y → 1 ondalık; κ 0,xx → 2 ondalık).
//
// Bootstrap'ler kaynak betiklerle (a5-birlestir.mjs, puanlama-analiz.mjs) aynı
// RNG'yi (mulberry32), aynı tohumu ve aynı çekim sırasını kullanır; yani GA
// sınırları "yaklaşık" değil, birebir yeniden üretilir.
//
// Kullanım: node tools/olcum/dogrula.mjs [--sessiz]
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mulberry32, wilson, cohenKappa, bootstrapGA, csvOku } from './uyum-lib.mjs';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const yol = (...p) => path.join(KOK, ...p);
const oku = (p) => fs.readFileSync(yol(p), 'utf8');
const json = (p) => JSON.parse(oku(p));

const VERI = [
  'docs/olcum/elle-kontrol.json',
  'docs/olcum/anahtar-ikinci-kontrol.json',
  'docs/olcum/anahtar-kor-esleme.json',
  'docs/olcum/a5/a5-birlesik.csv',
  'docs/olcum/a5/a5-etiketli.csv',
  'docs/olcum/a5/etiket-W1.json',
  'docs/olcum/a5/etiket-W4.json',
  'docs/olcum/a5/ikinci-kontrol-w3.json',
  'docs/olcum/a5/ikinci-kontrol-esleme.json',
  'docs/olcum/a5/a5-bootstrap.json',
  'docs/olcum/puanlama-deney/ham.jsonl',
];
const BELGELER = ['docs/ARASTIRMA.md', 'docs/olcum/puanlama-deney/OZET.md', 'PROGRESS.md'];

// --- biçim yardımcıları (belgenin Türkçe yazımı: virgül ondalık) ------------
const v = (x, h) => (Number.isFinite(x) ? x.toFixed(h).replace('.', ',').replace(/^-/, '−') : '—');
const y1 = (x) => v(100 * x, 1);
const ga1 = (a, b) => `[${y1(a)}–${y1(b)}]`;
const norm = (s) => String(s).replace(/-/g, '−').replace(/\s+/g, ' ').trim();

// --- belgeden okuma ---------------------------------------------------------
const metin = Object.fromEntries(BELGELER.map((b) => [b, oku(b)]));
/** Belgede deseni arar; bulunamazsa null (kontrol "belgede yok" olur). */
function belgeden(belge, desen) {
  const m = metin[belge].match(desen);
  return m ? m.slice(1) : null;
}

const kontroller = [];
/**
 * @param bolum   belgedeki yer (rapor için)
 * @param ad      ölçü adı
 * @param belgeD  belgeden okunan değer(ler) — string ya da null
 * @param hesapD  yeniden hesaplanan değer, belgeyle aynı biçimde
 * @param kaynak  hesabın girdisi
 */
function kontrol(bolum, ad, belgeD, hesapD, kaynak) {
  const b = belgeD == null ? null : norm(belgeD);
  const h = norm(hesapD);
  kontroller.push({ bolum, ad, belge: b ?? '(belgede bulunamadı)', hesap: h, tutar: b !== null && b === h, kaynak });
}

// ============================================================================
// §6.2 / §6.3 — ilk ölçüm (MEB, 13 kazanım; elle-kontrol.json)
// ============================================================================
{
  const et = json('docs/olcum/elle-kontrol.json').etiketler;
  const A = '2026-10-19-llama-3.3-70b-instruct-fp8-fast-gercek|';
  const B = '2026-10-19-llama-4-scout-17b-16e-instruct-gercek|';
  const say = (on) => {
    const s = Object.entries(et).filter(([k]) => k.startsWith(on)).map(([, x]) => x.anahtar);
    const c = (k) => s.filter((x) => x === k).length;
    return { n: s.length, d: c('dogru'), y: c('yanlis'), b: c('belirsiz') };
  };
  const a = say(A), b = say(B);
  const pct0 = (k, n) => `%${Math.round((100 * k) / n)}`;
  const satir = (s) => `${s.d} (${pct0(s.d, s.n)}) ${ga1(...wilson(s.d, s.n))}`;
  const r = belgeden('docs/ARASTIRMA.md', /\| \*\*Cevap anahtarı doğru\*\* \[%95 GA, Wilson\] \| elle \| \*\*(\d+ \(%\d+\))\*\* (\[[\d,]+–[\d,]+\]) \| \*\*(\d+ \(%\d+\))\*\* (\[[\d,]+–[\d,]+\])/);
  const n = belgeden('docs/ARASTIRMA.md', /\| ÇSS sayısı \(N\) \| — \| (\d+) \| (\d+) \|/);
  kontrol('§6.2', 'İlk ölçüm ÇSS sayısı A · B', n && `${n[0]} · ${n[1]}`, `${a.n} · ${b.n}`, 'elle-kontrol.json');
  kontrol('§6.2', 'İlk ölçüm anahtar doğru — A [Wilson]', r && `${r[0]} ${r[1]}`, satir(a), 'elle-kontrol.json');
  kontrol('§6.2', 'İlk ölçüm anahtar doğru — B [Wilson]', r && `${r[2]} ${r[3]}`, satir(b), 'elle-kontrol.json');
  const yb = belgeden('docs/ARASTIRMA.md', /\(`ANH-OLGU`\) \| elle \| \*\*(\d+) \(%\d+\)\*\* \| \*\*(\d+) \(%\d+\)\*\*/);
  kontrol('§6.2', 'İlk ölçüm anahtar yanlış A · B', yb && `${yb[0]} · ${yb[1]}`, `${a.y} · ${b.y}`, 'elle-kontrol.json');
  const bb = belgeden('docs/ARASTIRMA.md', /\| Cevap anahtarı belirsiz \| elle \| (\d+) \(%\d+\) \| (\d+) \(%\d+\)/);
  kontrol('§6.2', 'İlk ölçüm anahtar belirsiz A · B', bb && `${bb[0]} · ${bb[1]}`, `${a.b} · ${b.b}`, 'elle-kontrol.json');

  // §6.3 kör ikinci kontrol: anahtar-kor-esleme (K → elle-kontrol anahtarı) ↔ ikinci kontrol
  const es = json('docs/olcum/anahtar-kor-esleme.json');
  const ik = json('docs/olcum/anahtar-ikinci-kontrol.json').kararlar;
  const kno = Object.keys(es).sort();
  const k = cohenKappa(kno.map((x) => et[es[x]].anahtar), kno.map((x) => ik[x].karar), ['dogru', 'yanlis', 'belirsiz']);
  const uy = Math.round(k.po * k.n);
  const d = belgeden('docs/ARASTIRMA.md', /\| Tam uyuşma \(3 sınıf\) \| \*\*(\d+ \/ \d+ \(%\d+\))\*\*, Cohen κ = \*\*([\d,]+)\*\*/);
  kontrol('§6.3', 'Kör ikinci kontrol uyuşma', d && d[0], `${uy} / ${k.n} (${`%${Math.round(100 * k.po)}`})`, 'anahtar-kor-esleme + anahtar-ikinci-kontrol');
  kontrol('§6.3', 'Kör ikinci kontrol Cohen κ', d && d[1], v(k.kappa, 2), 'anahtar-kor-esleme + anahtar-ikinci-kontrol');
}

// ============================================================================
// §6.8 — A5 (225 etiketli ÇSS, ağırlıklı tabakalı bootstrap)
// ============================================================================
const a5 = {};
{
  const evet = (x) => x === '1' || x === 'true';
  // Ağırlıklar ham birleşik CSV'den yeniden kurulur (etiketli CSV'deki 3 ondalıklı
  // `agirlik` sütunu yuvarlanmış olduğu için kullanılmaz; yalnız çapraz denetlenir).
  const tum = csvOku(oku('docs/olcum/a5/a5-birlesik.csv')).filter((r) => r.fellBack !== '1');
  const bayrakB = (r) => evet(r.cozucu_uyusmazlik) || evet(r.hesapUyusmazligi) || !!r.hesapBaskaSik || evet(r.sikIfadeIceriyor);
  const et = csvOku(oku('docs/olcum/a5/a5-etiketli.csv')).map((r) => ({
    kno: r.kno, kumeler: r.kumeler, model: r.model, tabaka: `${r.model}|${r.sicaklik_kosum}`,
    karar: r.karar, etiketleyen: r.etiketleyen,
    A1v2: evet(r.A1v2), A2: evet(r.A2), A3: evet(r.A3), SIK: evet(r.SIKIFADE),
    bayrak: evet(r.A1) || evet(r.A2) || evet(r.SIKIFADE), agirlikCsv: Number(r.agirlik),
  }));
  const knoTum = new Set(tum.map((r) => r.kno).filter(Boolean));
  if (et.some((r) => !knoTum.has(r.kno))) throw new Error('a5-etiketli.csv birleşik CSV dışında K-no içeriyor');
  const tabakalar = ['A|0.5', 'A|0.2', 'B|0.5', 'B|0.2'];
  const agirlik = {};
  for (const t of tabakalar) {
    const U = tum.filter((r) => `${r.model}|${r.sicaklik_kosum}` === t && !bayrakB(r)).length;
    const L = et.filter((r) => r.tabaka === t && !r.bayrak).length;
    agirlik[t] = L ? U / L : 0;
  }
  const w = (r) => (r.bayrak ? 1 : agirlik[r.tabaka]);
  const csvSapma = et.filter((r) => Math.abs(w(r) - r.agirlikCsv) > 0.0005).length;
  if (csvSapma) throw new Error(`ağırlık: ${csvSapma} satırda yeniden kurulan ağırlık CSV'deki agirlik sütunuyla tutmuyor`);

  const bayrakliTum = tum.filter(bayrakB).length;
  const etW = (k) => et.filter((r) => r.etiketleyen === k).length;
  const d1 = belgeden('docs/ARASTIRMA.md', /\*\*Etiketleme:\*\* (\d+) tekil ÇSS iki aşamalı kör yöntemle etiketlendi \(W4 (\d+)\s+\+ W1 (\d+);/);
  kontrol('§6.8', 'Etiketli ÇSS (W4 + W1)', d1 && `${d1[0]} (${d1[1]} + ${d1[2]})`, `${et.length} (${etW('W4')} + ${etW('W1')})`, 'a5-etiketli.csv');
  const d2 = belgeden('docs/ARASTIRMA.md', /oranlar (\d+) birincil\s+ÇSS üzerindendir/);
  kontrol('§6.8', 'Birincil ÇSS', d2 && d2[0], String(tum.length), 'a5-birlesik.csv (fellBack hariç)');
  const d3 = belgeden('docs/ARASTIRMA.md', /bayraklı (\d+) ÇSS'nin hepsi etiketli/);
  const bayrakliEt = et.filter((r) => r.bayrak).length;
  kontrol('§6.8', 'Bayraklı ÇSS (hepsi etiketli)', d3 && d3[0], bayrakliTum === bayrakliEt ? String(bayrakliTum) : `${bayrakliTum} (etiketli ${bayrakliEt})`, 'a5-birlesik.csv + a5-etiketli.csv');

  // W3 kör ikinci kontrol κ
  const birincil = Object.fromEntries(et.map((r) => [r.kno, r.karar]));
  const es = json('docs/olcum/a5/ikinci-kontrol-esleme.json').maddeler;
  const w3 = json('docs/olcum/a5/ikinci-kontrol-w3.json').kararlar;
  const k = cohenKappa(es.map((x) => birincil[x.kno]), es.map((x) => w3[x.ino].karar), ['dogru', 'yanlis', 'belirsiz']);
  const dy = k.matris[0][1] + k.matris[1][0];
  const d4 = belgeden('docs/ARASTIRMA.md', /\(W3, n=(\d+)\): üç sınıfta uyuşma %([\d,]+), \*\*κ = ([\d,]+)\*\*/);
  kontrol('§6.8', 'İkinci kontrol n', d4 && d4[0], String(k.n), 'ikinci-kontrol-esleme + w3');
  kontrol('§6.8', 'İkinci kontrol uyuşma (3 sınıf)', d4 && `%${d4[1]}`, `%${y1(k.po)}`, 'ikinci-kontrol-esleme + w3');
  kontrol('§6.8', 'İkinci kontrol Cohen κ', d4 && d4[2], v(k.kappa, 2), 'ikinci-kontrol-esleme + w3');
  kontrol('§6.8', 'Doğru ↔ yanlış karşıtlığı', /doğru ↔ yanlış karşıtlığı\s+hiç yok/.test(metin['docs/ARASTIRMA.md']) ? '0' : null, String(dy), 'ikinci-kontrol-esleme + w3');
  a5.kappa = k;

  // Taban küme (a): tekrar 1 · s0,5
  for (const [m, et2] of [['A', 'A \\(llama-3\\.3-70b\\)'], ['B', 'B \\(llama-4-scout\\)']]) {
    const s = et.filter((r) => r.kumeler.includes('a') && r.model === m);
    const c = (x) => s.filter((r) => r.karar === x).length;
    const [lo, hi] = wilson(c('dogru'), s.length);
    const d = belgeden('docs/ARASTIRMA.md', new RegExp(`\\| ${et2} \\| (\\d+) \\| \\*\\*(\\d+ \\(%[\\d,]+\\))\\*\\* (\\[[\\d,]+–[\\d,]+\\]) \\| (\\d+) \\| (\\d+) \\|`));
    kontrol('§6.8', `Taban küme ${m}: n · doğru [Wilson] · yanlış · belirsiz`, d && `${d[0]} · ${d[1]} ${d[2]} · ${d[3]} · ${d[4]}`,
      `${s.length} · ${c('dogru')} (%${y1(c('dogru') / s.length)}) ${ga1(lo, hi)} · ${c('yanlis')} · ${c('belirsiz')}`, 'a5-etiketli.csv (küme a)');
  }

  // Ağırlıklı başarım + tabakalı bootstrap — a5-birlestir.mjs [5] ile aynı algoritma
  const ded = { 'A1v2': (r) => r.A1v2, A2: (r) => r.A2, 'A1v2∪A2': (r) => r.A1v2 || r.A2, A3: (r) => r.A3 };
  const tanim = { yanlis: (r) => r.karar === 'yanlis', kusurlu: (r) => r.karar !== 'dogru' };
  const top = (s) => s.reduce((t, r) => t + w(r), 0);
  function olc(o) {
    const out = {};
    for (const [tA, tF] of Object.entries(tanim)) {
      const K = top(o.filter(tF)), S = top(o.filter((r) => r.karar === 'dogru'));
      for (const [dA, f] of Object.entries(ded)) {
        out[`${dA}|${tA}|yak`] = K ? top(o.filter((r) => tF(r) && f(r))) / K : NaN;
        out[`${dA}|ya`] = S ? top(o.filter((r) => r.karar === 'dogru' && f(r))) / S : NaN;
      }
    }
    return out;
  }
  const BOOT_N = 1000, BOOT_TOHUM = 20261019;
  const h = {};
  for (const r of et) (h[`${r.tabaka}|${r.bayrak ? 'b' : 'u'}`] ||= []).push(r);
  const hs = Object.values(h);
  const nokta = olc(hs.flat());
  const rnd = mulberry32(BOOT_TOHUM), dag = {};
  for (let b = 0; b < BOOT_N; b++) {
    const o = hs.flatMap((c) => Array.from({ length: c.length }, () => c[Math.floor(rnd() * c.length)]));
    for (const [kk, x] of Object.entries(olc(o))) (dag[kk] ||= []).push(x);
  }
  const boot = {};
  for (const [kk, x] of Object.entries(nokta)) {
    const s = dag[kk].filter((z) => !Number.isNaN(z)).sort((p, q) => p - q);
    boot[kk] = { nokta: x, alt: s[Math.floor(0.025 * s.length)], ust: s[Math.min(s.length - 1, Math.ceil(0.975 * s.length) - 1)] };
  }
  a5.boot = boot;
  const g = (kk) => `%${y1(boot[kk].nokta)} ${ga1(boot[kk].alt, boot[kk].ust)}`;
  const tohum = belgeden('docs/ARASTIRMA.md', /tabakalı bootstrap, (\d+) tekrar, tohum\s+(\d+)/);
  kontrol('§6.8', 'Bootstrap tekrar · tohum', tohum && `${tohum[0]} · ${tohum[1]}`, `${BOOT_N} · ${BOOT_TOHUM}`, 'dogrula.mjs (a5-birlestir.mjs ile aynı)');
  const satirlar = [
    ['A1 bağımsız çözüm, istem sürüm 2', 'A1v2', /\| A1 bağımsız çözüm, istem sürüm 2 \| \*\*(%[\d,]+)\*\* (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \|/],
    ['A2 sayısal hesap', 'A2', /\| A2 sayısal hesap \| \*\*(%[\d,]+)\*\* (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \|/],
    ['A1 (v2) ∪ A2', 'A1v2∪A2', /\| \*\*A1 \(v2\) ∪ A2\*\* \| \*\*(%[\d,]+)\*\* (\[[\d,]+–[\d,]+\]) \| \*\*(%[\d,]+)\*\* (\[[\d,]+–[\d,]+\]) \| \*\*(%[\d,]+)\*\* (\[[\d,]+–[\d,]+\]) \|/],
    ['A3 "doğru şık en uzun"', 'A3', /\| A3 "doğru şık en uzun" \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \| (%[\d,]+) (\[[\d,]+–[\d,]+\]) \|/],
  ];
  // A3 belgede "%0 [0–0]" biçiminde (ondalıksız) yazılmış: sıfırı belge gibi yaz.
  const sifir = (s) => s.replace(/%0,0\b/g, '%0').replace(/\[0,0–0,0\]/g, '[0–0]').replace(/\[0,0–/g, '[0–');
  for (const [ad, d, re] of satirlar) {
    const m = belgeden('docs/ARASTIRMA.md', re);
    kontrol('§6.8', `${ad} — yakalama (yanlış)`, m && `${m[0]} ${m[1]}`, sifir(g(`${d}|yanlis|yak`)), 'a5-birlesik + a5-etiketli, bootstrap');
    kontrol('§6.8', `${ad} — yakalama (kusurlu)`, m && `${m[2]} ${m[3]}`, sifir(g(`${d}|kusurlu|yak`)), 'a5-birlesik + a5-etiketli, bootstrap');
    kontrol('§6.8', `${ad} — yanlış alarm`, m && `${m[4]} ${m[5]}`, sifir(g(`${d}|ya`)), 'a5-birlesik + a5-etiketli, bootstrap');
  }

  // Depodaki a5-bootstrap.json ile sayısal eşitlik (dosya ↔ yeniden hesap)
  const kayit = json('docs/olcum/a5/a5-bootstrap.json');
  let farkli = 0, toplam = 0;
  for (const [kk, x] of Object.entries(boot)) {
    const y = kayit.sonuc.Toplam[kk];
    for (const alan of ['nokta', 'alt', 'ust']) { toplam++; if (!y || Math.abs(y[alan] - x[alan]) > 1e-12) farkli++; }
  }
  kontrol('§6.8', 'a5-bootstrap.json "Toplam" ile birebir (1e-12)', `${toplam} / ${toplam}`, `${toplam - farkli} / ${toplam}`, 'a5-bootstrap.json');

  // Kusurlu tahmini, kaçan, ağırlıksız 55/59, SIKIFADE
  const Ktop = top(et.filter((r) => r.karar !== 'dogru'));
  const kacan = Ktop - top(et.filter((r) => r.karar !== 'dogru' && (r.A1v2 || r.A2)));
  const d5 = belgeden('docs/ARASTIRMA.md', /"kusurlu" \(yanlış ∪ belirsiz, ≈(\d+) ÇSS,\s+≈%(\d+)\)/);
  kontrol('§6.8', 'Kusurlu tahmini (≈ÇSS, ≈%)', d5 && `≈${d5[0]} · ≈%${d5[1]}`, `≈${Math.round(Ktop)} · ≈%${Math.round((100 * Ktop) / tum.length)}`, 'ağırlıklı toplam');
  const d6 = belgeden('docs/ARASTIRMA.md', /\*\*≈(\d+)'si hiçbir otomatik uyarı/);
  kontrol('§6.8', 'Uyarısız geçen kusurlu (≈ÇSS)', d6 && `≈${d6[0]}`, `≈${Math.round(kacan)}`, 'ağırlıklı toplam');
  const yan = et.filter((r) => r.karar === 'yanlis');
  const yk = yan.filter((r) => r.A1v2 || r.A2).length;
  const d7 = belgeden('docs/ARASTIRMA.md', /toplamda (\d+\/\d+) için\s+\[([\d,]+)–([\d,]+)\]'tür\. \(ii\) Ağırlıksız %(\d+) ile/);
  kontrol('§6.8', 'Ağırlıksız yakalama (yanlış) [Wilson] · %', d7 && `${d7[0]} [${d7[1]}–${d7[2]}] · %${d7[3]}`,
    `${yk}/${yan.length} ${ga1(...wilson(yk, yan.length))} · %${Math.round((100 * yk) / yan.length)}`, 'a5-etiketli.csv');
  const a2 = et.filter((r) => r.A2);
  const d8 = belgeden('docs/ARASTIRMA.md', /A2'nin bayrakladığı (\d+)\s+ÇSS'nin (\d+)'ü bu türdendi/);
  // "bu türden" = DEN-YP-SIKIFADE yanlış alarmı: doğru şıkta işlem ifadesi VE etiket "doğru"
  // (a5-basarim.txt: "SIKIFADE 6 · bunlardan etiketi doğru (yanlış alarm) 4").
  const sikDogru = a2.filter((r) => r.SIK && r.karar === 'dogru').length;
  kontrol('§6.8', 'A2 bayraklı · bunlardan DEN-YP-SIKIFADE yanlış alarmı', d8 && `${d8[0]} · ${d8[1]}`, `${a2.length} · ${sikDogru}`,
    `a5-etiketli.csv (SIKIFADE toplam ${a2.filter((r) => r.SIK).length}; ${sikDogru}'ü "doğru" etiketli)`);
}

// ============================================================================
// Puanlama deneyi (ön kayıtlı, 24 Ekim) — birincil d = B − A ve %95 GA
// Belge: docs/olcum/puanlama-deney/OZET.md ve PROGRESS.md (ARASTIRMA.md'de YOK).
// ============================================================================
{
  const sat = oku('docs/olcum/puanlama-deney/ham.jsonl').trim().split('\n').filter(Boolean).map((s) => JSON.parse(s));
  const ort = (x) => (x.length ? x.reduce((s, z) => s + z, 0) / x.length : NaN);
  const yan = [...new Set(sat.map((s) => s.yanit))].sort();
  const hata = (y, k) => ort(sat.filter((s) => s.yanit === y && s.kosul === k && s.durum === 'ok' && s.semaGecerli).map((s) => s.normHata));
  const es = yan.map((y) => ({ a: hata(y, 'A'), b: hata(y, 'B') })).filter((x) => Number.isFinite(x.a) && Number.isFinite(x.b));
  const d = es.map((x) => x.b - x.a);
  const dOrt = ort(d);
  // puanlama-analiz.mjs: TOHUM 20261023, 10000 tekrar, ortalama; aynı çekim sırası.
  const ga = bootstrapGA(d.length, (idx) => idx.reduce((s, i) => s + d[i], 0) / idx.length, { tekrar: 10000, tohum: 20261023 });
  const hesap = `n = ${es.length} · d = ${v(dOrt, 3)} [${v(ga.alt, 3)}; ${v(ga.ust, 3)}]`;
  const o = belgeden('docs/olcum/puanlama-deney/OZET.md', /n = (\d+), eşleştirilmiş\):\*\* hata A [\d,]+ · B [\d,]+ · d = B − A = (-?[\d,]+), bootstrap %95 GA \[(-?[\d,]+), (-?[\d,]+)\]/);
  kontrol('Puanlama', 'Birincil d = B − A [%95 GA] — OZET.md', o && `n = ${o[0]} · d = ${o[1]} [${o[2]}; ${o[3]}]`, hesap, 'puanlama-deney/ham.jsonl');
  const p = belgeden('PROGRESS.md', /birincil d = B − A = (−?[\d,]+), bootstrap %95 GA \[(−?[\d,]+), (−?[\d,]+)\]\*\* \(n = (\d+) eşleştirilmiş\)/);
  kontrol('Puanlama', 'Birincil d = B − A [%95 GA] — PROGRESS.md', p && `n = ${p[3]} · d = ${p[0]} [${p[1]}; ${p[2]}]`, hesap, 'puanlama-deney/ham.jsonl');
  const ar = /0,042|−0,042|-0,042/.test(metin['docs/ARASTIRMA.md']);
  kontrol('Puanlama', 'ARASTIRMA.md bu sonucu içeriyor mu', ar ? 'evet' : 'hayır (yalnız OZET.md ve PROGRESS.md)', ar ? 'evet' : 'hayır (yalnız OZET.md ve PROGRESS.md)', 'bilgi');
}

// ============================================================================
// Rapor: docs/olcum/PANO.md (deterministik — tarih yok; CI farkı denetler)
// ============================================================================
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(yol(p))).digest('hex');
const tutmayan = kontroller.filter((x) => !x.tutar);
const kac = (s) => s.replace(/\|/g, '\\|');
const md = [
  '# Ölçüm panosu — manşet sayıların yeniden üretimi',
  '',
  '> **Otomatik üretilir:** `npm run olcum:dogrula` (`tools/olcum/dogrula.mjs`). Elle düzenlemeyin.',
  '> Depodaki ham veriden yeniden hesaplanan her sayı, belgedeki metinden okunan sayıyla',
  '> belgenin kendi yuvarlama hassasiyetinde karşılaştırılır. Tutmayan varsa betik 1 ile çıkar',
  '> ve CI kırmızı olur. Model çağrısı yok; ağ yok.',
  '>',
  '> **Etiketleyicilerin hepsi yapay zekâdır (Claude), insan alan uzmanı değil** (ARASTIRMA §6.7, §8.2).',
  '> Aşağıdaki κ değerleri aynı model ailesinin iki oturumunun uyumudur; insan–insan ve insan–YZ',
  '> uyumu henüz ölçülmedi (araç: `tools/etiket/`, hesap: `npm run olcum:uyum`).',
  '',
  `**Sonuç:** ${kontroller.length - tutmayan.length} / ${kontroller.length} kontrol tuttu.` + (tutmayan.length ? ` **TUTMAYAN: ${tutmayan.length}** (aşağıda ✗).` : ''),
  '',
  '| Bölüm | Ölçü | Belgede | Yeniden hesap | Durum | Girdi |',
  '|---|---|---|---|:---:|---|',
  ...kontroller.map((x) => `| ${x.bolum} | ${kac(x.ad)} | ${kac(x.belge)} | ${kac(x.hesap)} | ${x.tutar ? '✓' : '✗'} | ${kac(x.kaynak)} |`),
  '',
  '## Yöntem notları',
  '',
  '- **Wilson** %95 GA, z = 1,96 (`a5-birlestir.mjs` ile aynı).',
  '- **A5 başarımı:** ağırlıklar `a5-birlesik.csv`\'den yeniden kurulur (bayraklı = 1; bayraksız = tabakadaki',
  '  bayraksız sayısı / tabakadaki etiketli bayraksız sayısı). Tabakalı bootstrap: 1000 tekrar, tohum 20261019,',
  '  mulberry32; her tabaka × {bayraklı, bayraksız} hücresi kendi içinde yeniden örneklenir. Sınırlar 2,5. ve',
  '  97,5. yüzdelik. Aynı RNG ve aynı çekim sırası olduğu için `a5-bootstrap.json` birebir yeniden üretilir.',
  '- **Model A tabakalarında** "yanlış" yakalama 13/13 ve 17/17 olduğu için bootstrap aralığı [100–100]\'e çöker',
  '  (ARASTIRMA §6.8 okuma uyarısı i); bu pano o uyarıyı değiştirmez.',
  '- **Puanlama deneyi:** yanıt düzeyinde eşleştirilmiş d = B − A, bootstrap 10000 tekrar, tohum 20261023',
  '  (`puanlama-analiz.mjs` ile aynı). Bu sonuç ARASTIRMA.md\'de değil, `puanlama-deney/OZET.md` ve PROGRESS\'te.',
  '',
  '## Veri dosyaları (SHA-256)',
  '',
  'Bu sayılar yalnız aşağıdaki baytlarla geçerlidir. Bir dosya değişirse bu tablo da değişir ve CI farkı yakalar.',
  '',
  '| Dosya | SHA-256 |',
  '|---|---|',
  ...VERI.map((p) => `| \`${p}\` | \`${sha(p)}\` |`),
  '',
];
fs.writeFileSync(yol('docs/olcum/PANO.md'), md.join('\n'), 'utf8');

if (!process.argv.includes('--sessiz')) {
  for (const x of kontroller) console.log(`${x.tutar ? 'OK ' : 'XX '} ${x.bolum.padEnd(9)} ${x.ad}: belge ${x.belge} | hesap ${x.hesap}`);
}
console.log(`\nolcum:dogrula — ${kontroller.length - tutmayan.length}/${kontroller.length} tuttu · yazıldı: docs/olcum/PANO.md`);
if (tutmayan.length) {
  console.error(`TUTMAYAN ${tutmayan.length} kontrol:`);
  for (const x of tutmayan) console.error(`  ${x.bolum} ${x.ad}: belge ${x.belge} ≠ hesap ${x.hesap}`);
  process.exitCode = 1;
}
