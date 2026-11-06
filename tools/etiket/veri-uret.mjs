#!/usr/bin/env node
// ============================================================================
// Kör etiketleme aracının veri dosyasını üretir — `npm run etiket:veri`.
// Girdi : docs/olcum/a5/etiket-kor.json (225 ÇSS) + docs/HATA_TAKSONOMISI.md
// Çıktı : tools/etiket/sorular.js (sunucusuz sayfanın <script> ile yüklediği veri)
//
// KÖRLÜK: yalnız İZİNLİ alanlar kopyalanır (beyaz liste). Cevap anahtarı
// (isaretli_sik), model adı, sıcaklık, denetim bayrakları ve YZ etiketleri
// etiket-kor.json'da ya yok ya da burada bilerek atılır. Test:
// test/arastirma-araclari.test.ts "gizlenen alanlar gerçekten yok".
//
// Öğrenci verisi YOK: maddeler model üretimi ÇSS'lerdir.
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KAYNAK = 'docs/olcum/a5/etiket-kor.json';
const TAKSONOMI = 'docs/HATA_TAKSONOMISI.md';
const CIKTI = 'tools/etiket/sorular.js';

/** Öğretmenin yalnız soru gövdesi ve şıklardan değerlendirebileceği kodlar.
 *  ANH-* kodları öğretmenin seçtiği doğru şık anahtarla karşılaştırılarak
 *  SONRADAN türetilir (anahtar gösterilmediği için elle seçilmez). GRK-*
 *  (gerekçe) ve TKR-* (öteki sorularla tekrar) bu görünümde değerlendirilemez:
 *  gerekçeler ve öteki sorular gösterilmez. GVD-KISA betikle sayılır. */
export const GORUNUR_KODLAR = [
  'GVD-KOKYOK', 'SIK-ESANLAM', 'SIK-SACMA', 'KZN-DISI', 'SNF-DISI',
  'GVD-TEKADIM', 'GVD-KALIP', 'GVD-YINELEME', 'GVD-VERIFAZLA',
  'KYN-ATIF', 'DIL-ALFABE', 'DIL-LATIN',
];

/** Maddede gösterilmesine izin verilen alanlar (beyaz liste). */
export const IZINLI_ALANLAR = ['id', 'ders', 'sinif', 'kazanim', 'kazanim_metni', 'govde', 'siklar'];

const temiz = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

export function taksonomiOku(md) {
  const surum = (md.match(/sürüm (\d+\.\d+(?:\.\d+)?)/) || [])[1] || '?';
  const kodlar = {};
  for (const satir of md.split('\n')) {
    const m = satir.match(/^\| `([A-Z]{2,4}-[A-Z-]+)`(?: \*\(v[\d.]+\)\*)? \| ([^|]+) \|/);
    if (m && !kodlar[m[1]]) kodlar[m[1]] = temiz(m[2]);
  }
  const eksik = GORUNUR_KODLAR.filter((k) => !kodlar[k]);
  if (eksik.length) throw new Error(`taksonomide bulunamayan kod: ${eksik.join(', ')}`);
  return { surum, kodlar: GORUNUR_KODLAR.map((kod) => ({ kod, tanim: OGRETMEN_TANIMI[kod] || kodlar[kod] })) };
}

/** Taksonomideki tanım iç ayrıntı içeriyorsa öğretmene sade karşılığı (anlam aynı). */
const OGRETMEN_TANIMI = {
  'KYN-ATIF': 'Gövde gösterilmeyen bir metne, grafiğe ya da tabloya atıf yapıyor ("metinde", "yukarıdaki"…); öğrenci onu görmeden cevaplayamaz',
  'DIL-ALFABE': 'Türkçe metinde başka alfabeden harf (Kiril, Çince, Vietnamca harfler vb.)',
  'DIL-LATIN': 'Türkçe cümlede Latin harfli yabancı kelime ya da yabancı harf (é, ñ, ß…)',
};

export function siklariAyir(metin) {
  return metin.split(' | ').map((p) => {
    const m = p.match(/^([A-E])\)\s*(.*)$/s);
    if (!m) throw new Error(`şık biçimi tanınmadı: ${p.slice(0, 40)}`);
    return { harf: m[1], metin: m[2] };
  });
}

export function veriKur(kor, taksonomiMd) {
  const maddeler = kor.maddeler.map((x) => ({
    id: x.kno, ders: x.ders, sinif: x.sinif, kazanim: x.kazanim,
    kazanim_metni: x.kazanim_metni, govde: x.govde, siklar: siklariAyir(x.siklar),
  }));
  for (const m of maddeler) for (const k of Object.keys(m)) if (!IZINLI_ALANLAR.includes(k)) throw new Error(`izinsiz alan: ${k}`);
  const govdeOzeti = crypto.createHash('sha256').update(JSON.stringify(maddeler)).digest('hex');
  return {
    arac: 'mihenk-kor-etiket', veriSurumu: `a5-kor-${govdeOzeti.slice(0, 12)}`, n: maddeler.length,
    taksonomi: taksonomiOku(taksonomiMd), maddeler,
  };
}

const anaBetik = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (anaBetik) {
  const kor = JSON.parse(fs.readFileSync(path.join(KOK, KAYNAK), 'utf8'));
  const veri = veriKur(kor, fs.readFileSync(path.join(KOK, TAKSONOMI), 'utf8'));
  const js = '// OTOMATİK ÜRETİLDİ — elle düzenlemeyin: `npm run etiket:veri` (tools/etiket/veri-uret.mjs).\n' +
    `// Kaynak: ${KAYNAK}. Cevap anahtarı, model ve YZ etiketleri bu dosyada YOKTUR.\n` +
    `globalThis.MIHENK_ETIKET_VERI = {\n` +
    ['arac', 'veriSurumu', 'n', 'taksonomi'].map((k) => ` ${JSON.stringify(k)}: ${JSON.stringify(veri[k])},\n`).join('') +
    ` "maddeler": [\n${veri.maddeler.map((m) => `  ${JSON.stringify(m)}`).join(',\n')}\n ]\n};\n`;
  fs.writeFileSync(path.join(KOK, CIKTI), js, 'utf8');
  console.log(`yazıldı: ${CIKTI} · ${veri.n} madde · ${veri.veriSurumu} · taksonomi v${veri.taksonomi.surum} (${veri.taksonomi.kodlar.length} kod)`);
}
