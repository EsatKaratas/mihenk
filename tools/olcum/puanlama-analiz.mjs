#!/usr/bin/env node
// Ön kayıtlı puanlama deneyinin analizi (ON-KAYIT.md §5–6). Model çağırmaz.
// Girdi: docs/olcum/puanlama-deney/ham.jsonl → Çıktı: OZET.md + analiz.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIZIN = path.join(KOK, 'docs/olcum/puanlama-deney');
const satirlar = fs.readFileSync(path.join(DIZIN, 'ham.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((s) => JSON.parse(s));
const TOHUM = 20261023, B_TEKRAR = 10000;

function rastgele(t) { return function () { t |= 0; t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const ort = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : NaN);
function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const z = 1.959964, p = k / n, d = 1 + z * z / n, m = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return [Math.max(0, m - h), Math.min(1, m + h)];
}
function bootstrap(v) {
  const r = rastgele(TOHUM), ortlar = [];
  for (let b = 0; b < B_TEKRAR; b++) { let s = 0; for (let i = 0; i < v.length; i++) s += v[Math.floor(r() * v.length)]; ortlar.push(s / v.length); }
  ortlar.sort((a, b) => a - b);
  return [ortlar[Math.floor(0.025 * B_TEKRAR)], ortlar[Math.floor(0.975 * B_TEKRAR) - 1]];
}
const yuzde = (x) => (Number.isFinite(x) ? (x * 100).toFixed(1).replace('.', ',') + '%' : '—');
const sayi = (x, h = 3) => (Number.isFinite(x) ? x.toFixed(h).replace('.', ',') : '—');

const K = ['A', 'B'];
const sonuc = { toplamDeneme: satirlar.length, kosul: {} };
for (const k of K) {
  const hepsi = satirlar.filter((s) => s.kosul === k);
  const ok = hepsi.filter((s) => s.durum === 'ok');
  const gecerli = ok.filter((s) => s.semaGecerli);
  const kriterler = gecerli.flatMap((s) => s.kr);
  const aralikDisi = kriterler.filter((x) => x.aralikDisi).length;
  const yarimDisi = kriterler.filter((x) => x.yarimDisi).length;
  const sira = gecerli.flatMap((s) => s.sira);
  const kullanim = ok.map((s) => s.kullanim).filter(Boolean);
  sonuc.kosul[k] = {
    deneme: hepsi.length, sistemHatasi: hepsi.length - ok.length,
    semaIlkDeneme: [ok.filter((s) => s.ilkDenemedeGecerli).length, ok.length],
    semaSonra: [gecerli.length, ok.length],
    dislanan: hepsi.length - gecerli.length,
    aralikDisi: [aralikDisi, kriterler.length], yarimDisi: [yarimDisi, kriterler.length],
    reasonOnce: [sira.filter((x) => x === 'reason-once').length, sira.length],
    kriterHata: ort(kriterler.map((x) => Math.abs(x.islenen - x.altin) / x.max)),
    normHataOrt: ort(gecerli.map((s) => s.normHata)),
    token: { girdi: kullanim.reduce((s, u) => s + (u.prompt_tokens || 0), 0), cikti: kullanim.reduce((s, u) => s + (u.completion_tokens || 0), 0), cagri: kullanim.length },
  };
}

// Birincil: yanıt başına tekrar ortalaması, eşleştirilmiş fark d = B − A
const yanitlar = [...new Set(satirlar.map((s) => s.yanit))].sort();
const yanitHata = (y, k) => ort(satirlar.filter((s) => s.yanit === y && s.kosul === k && s.durum === 'ok' && s.semaGecerli).map((s) => s.normHata));
const eslesik = [];
for (const y of yanitlar) {
  const a = yanitHata(y, 'A'), b = yanitHata(y, 'B');
  if (Number.isFinite(a) && Number.isFinite(b)) eslesik.push({ y, a, b, d: b - a, soru: y.split('-')[0], profil: satirlar.find((s) => s.yanit === y).profil });
}
const d = eslesik.map((x) => x.d);
sonuc.birincil = { n: eslesik.length, cikanYanit: yanitlar.length - eslesik.length, hataA: ort(eslesik.map((x) => x.a)), hataB: ort(eslesik.map((x) => x.b)), dOrt: ort(d), ga: bootstrap(d) };
// Duyarlılık: soru düzeyinde (n = 6), betimsel
const sorular = [...new Set(eslesik.map((x) => x.soru))];
sonuc.soruDuzeyi = sorular.map((q) => { const v = eslesik.filter((x) => x.soru === q); return { soru: q, hataA: ort(v.map((x) => x.a)), hataB: ort(v.map((x) => x.b)), d: ort(v.map((x) => x.d)) }; });
sonuc.soruDuzeyiGa = bootstrap(sonuc.soruDuzeyi.map((x) => x.d));
// Profil kırılımı (betimsel)
const profiller = [...new Set(eslesik.map((x) => x.profil))];
sonuc.profil = profiller.map((p) => { const v = eslesik.filter((x) => x.profil === p); return { profil: p, n: v.length, hataA: ort(v.map((x) => x.a)), hataB: ort(v.map((x) => x.b)) }; });

// Karar kuralı (ON-KAYIT §6)
const A = sonuc.kosul.A, B = sonuc.kosul.B;
const oran = (x) => x[0] / x[1];
const manipulasyonTamam = oran(B.reasonOnce) >= 0.8;
const kararsizDislama = A.dislanan / A.deneme > 0.1 || B.dislanan / B.deneme > 0.1;
const k1 = sonuc.birincil.ga[1] < 0;
const k2 = oran(B.semaIlkDeneme) >= oran(A.semaIlkDeneme) - 0.05;
const k3 = !(wilson(...B.aralikDisi)[0] > oran(A.aralikDisi));
let karar;
if (!manipulasyonTamam) karar = 'İstem değişikliği uygulanamadı (B\'de reason-önce oranı < %80) — H1 hakkında karar verilmez.';
else if (kararsizDislama) karar = 'Kararsız — bir koşulda dışlanan deneme %10\'u aştı.';
else if (k1 && k2 && k3) karar = 'Karar kuralı SAĞLANDI — B\'ye geçiş önerilebilir (karar müdürün).';
else if (sonuc.birincil.ga[0] > 0) karar = 'A daha iyi (GA alt sınırı > 0) — mevcut istem korunur.';
else if (!k1) karar = 'Fark gösterilemedi (GA 0\'ı içeriyor) — değişiklik önerilmez.';
else karar = `Birincil ölçüt B lehine ama güvenlik koşulu sağlanmadı (şema: ${k2 ? 'tamam' : 'SAĞLANMADI'}, aralık dışı: ${k3 ? 'tamam' : 'SAĞLANMADI'}) — değişiklik önerilmez.`;
sonuc.karar = { manipulasyonTamam, kararsizDislama, k1, k2, k3, metin: karar };

fs.writeFileSync(path.join(DIZIN, 'analiz.json'), JSON.stringify(sonuc, null, 1));

const sat = (ad, f) => `| ${ad} | ${f(A)} | ${f(B)} |`;
const oranMetni = (x) => `${x[0]}/${x[1]} = ${yuzde(x[0] / x[1])} [${yuzde(wilson(...x)[0])}–${yuzde(wilson(...x)[1])}]`;
const md = [
  '# Puanlama deneyi — sonuç özeti (otomatik, tools/olcum/puanlama-analiz.mjs)', '',
  `Ön kayıt: ON-KAYIT.md. Toplam deneme ${sonuc.toplamDeneme}. Model ${satirlar.find((s) => s.model)?.model || '—'}, sıcaklık 0,2.`, '',
  '| Ölçüt | A (points önce, üretim) | B (reason önce) |', '|---|---|---|',
  sat('Deneme / sistem hatası', (x) => `${x.deneme} / ${x.sistemHatasi}`),
  sat('Şema geçerli — ilk deneme [Wilson %95]', (x) => oranMetni(x.semaIlkDeneme)),
  sat('Şema geçerli — yeniden denemeden sonra', (x) => oranMetni(x.semaSonra)),
  sat('Aralık dışı ham puan (kriter) [Wilson %95]', (x) => oranMetni(x.aralikDisi)),
  sat('0,5 katı olmayan ham puan', (x) => oranMetni(x.yarimDisi)),
  sat('Manipülasyon: reason, points\'ten önce', (x) => oranMetni(x.reasonOnce)),
  sat('Normalize toplam hata (deneme ort.)', (x) => sayi(x.normHataOrt)),
  sat('Kriter düzeyi normalize hata', (x) => sayi(x.kriterHata)),
  sat('Token (girdi / çıktı, çağrı)', (x) => `${x.token.girdi} / ${x.token.cikti} (${x.token.cagri})`), '',
  `**Birincil (yanıt düzeyi, n = ${sonuc.birincil.n}, eşleştirilmiş):** hata A ${sayi(sonuc.birincil.hataA)} · B ${sayi(sonuc.birincil.hataB)} · d = B − A = ${sayi(sonuc.birincil.dOrt)}, bootstrap %95 GA [${sayi(sonuc.birincil.ga[0])}, ${sayi(sonuc.birincil.ga[1])}]` + (sonuc.birincil.cikanYanit ? ` · eşleştirmeden çıkan yanıt: ${sonuc.birincil.cikanYanit}` : ''), '',
  `**Duyarlılık (soru düzeyi, n = ${sonuc.soruDuzeyi.length}):** d %95 GA [${sayi(sonuc.soruDuzeyiGa[0])}, ${sayi(sonuc.soruDuzeyiGa[1])}] — n küçük, yalnız betimsel.`, '',
  '| Soru | Hata A | Hata B | d |', '|---|---|---|---|',
  ...sonuc.soruDuzeyi.map((x) => `| ${x.soru} | ${sayi(x.hataA)} | ${sayi(x.hataB)} | ${sayi(x.d)} |`), '',
  '| Profil (betimsel) | n | Hata A | Hata B |', '|---|---|---|---|',
  ...sonuc.profil.map((x) => `| ${x.profil} | ${x.n} | ${sayi(x.hataA)} | ${sayi(x.hataB)} |`), '',
  `**Karar kuralı:** GA üst < 0: ${k1 ? 'evet' : 'hayır'} · şema koşulu: ${k2 ? 'evet' : 'hayır'} · aralık dışı koşulu: ${k3 ? 'evet' : 'hayır'} · manipülasyon ≥ %80: ${manipulasyonTamam ? 'evet' : 'hayır'}`, '',
  `**Sonuç:** ${karar}`, '',
];
fs.writeFileSync(path.join(DIZIN, 'OZET.md'), md.join('\n'));
console.log(md.join('\n'));
