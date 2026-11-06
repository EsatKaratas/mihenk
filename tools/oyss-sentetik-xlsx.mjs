// -*- coding: utf-8 -*-
/**
 * §114 — SENTETİK OYSS XLSX ÜRETİCİSİ (test fikstürü)
 *
 * MEB/ÖDSGM dosyası DEĞİLDİR: bütün hücreler burada elle yazılmıştır. Gerçek
 * tablolar "Tüm hakları saklıdır" ibaresi taşıdığı için depoya konmaz; bu
 * dosya yalnız aynı YAPIYI taklit eder (6.11'de iki gerçek dosyada ölçülen
 * biçim): birleşik sınav başlığı, "Senaryo N" satırı, kod+metin tek hücrede,
 * "Ülke Geneli" birleşik alanı, ayrık (NFD) Türkçe harf, x: önekli ad alanı,
 * paylaşılan + satır içi metin, kodsuz toplam satırı, sıkıştırmasız girdi.
 *
 * Kullanım:  node tools/oyss-sentetik-xlsx.mjs   → test/fixtures/oyss-sentetik.xlsx
 * Testler zipYap()'ı ayrıca bozuk dosya üretmek için kullanır.
 */
import { deflateRawSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CRC_TABLO = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLO[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** girdiler: [{ ad, metin, sakla? }] → zip baytları (sakla: true = yöntem 0). */
export function zipYap(girdiler) {
  const yerel = [];
  const merkez = [];
  let ofs = 0;
  for (const g of girdiler) {
    const ad = Buffer.from(g.ad, 'utf8');
    const veri = Buffer.isBuffer(g.metin) ? g.metin : Buffer.from(g.metin, 'utf8');
    const sik = g.sakla ? veri : deflateRawSync(veri);
    const yontem = g.sakla ? 0 : 8;
    const crc = crc32(veri);
    const b = Buffer.alloc(30);
    b.writeUInt32LE(0x04034b50, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(0x0800, 6); b.writeUInt16LE(yontem, 8);
    b.writeUInt32LE(crc, 14); b.writeUInt32LE(sik.length, 18); b.writeUInt32LE(veri.length, 22); b.writeUInt16LE(ad.length, 26);
    yerel.push(b, ad, sik);
    const m = Buffer.alloc(46);
    m.writeUInt32LE(0x02014b50, 0); m.writeUInt16LE(20, 4); m.writeUInt16LE(20, 6); m.writeUInt16LE(0x0800, 8); m.writeUInt16LE(yontem, 10);
    m.writeUInt32LE(crc, 16); m.writeUInt32LE(sik.length, 20); m.writeUInt32LE(veri.length, 24); m.writeUInt16LE(ad.length, 28);
    m.writeUInt32LE(ofs, 42);
    merkez.push(m, ad);
    ofs += 30 + ad.length + sik.length;
  }
  const mBoy = merkez.reduce((a, x) => a + x.length, 0);
  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0); son.writeUInt16LE(girdiler.length, 8); son.writeUInt16LE(girdiler.length, 10);
  son.writeUInt32LE(mBoy, 12); son.writeUInt32LE(ofs, 16);
  return new Uint8Array(Buffer.concat([...yerel, ...merkez, son]));
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const RNS = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

/* Paylaşılan metinler. 1 numara bilerek NFD (u + U+0308): gerçek Türkçe dosyada ölçüldü. */
const ORTAK = [
  'SENTETİK DERS 5. SINIF',                               // 0
  'Okuma Alanı — Türkçe',                         // 1 (NFD)
  '1. Sınav', '2. Sınav',                                  // 2, 3
  'Senaryo 1', 'Senaryo 2', 'Senaryo 3',                   // 4, 5, 6
  'T.O.5.6. Metnin yüzey anlamını belirleyebilme',         // 7
  '  T.O.5.7.  Görselle   iletilen anlamı belirleyebilme', // 8 (baş/çift boşluk)
  'T.O.5.99. Uydurma kazanım (katalogda yok)',             // 9
  'TOPLAM',                                                // 10
  'x',                                                     // 11
  'Öğrenme Çıktıları',                                     // 12
];
function ortakXml() {
  const si = ORTAK.map((s, i) => i === 12
    // zengin metin + okunuş (rPh): okunuş metne KARIŞMAMALI
    ? '<si><r><t>Öğrenme </t></r><r><t>Çıktıları</t></r><rPh sb="0" eb="1"><t>YOMI</t></rPh></si>'
    : `<si><t xml:space="preserve">${s.replace(/&/g, '&amp;')}</t></si>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst ${NS} count="${ORTAK.length}" uniqueCount="${ORTAK.length}">${si}</sst>`;
}
const s = (r, i) => `<c r="${r}" t="s"><v>${i}</v></c>`;
const n = (r, v) => `<c r="${r}"><v>${v}</v></c>`;

const SAYFA1 = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${NS} ${RNS}><sheetData>
<row r="1">${s('A1', 0)}</row>
<row r="5">${s('A5', 1)}${s('B5', 12)}${s('C5', 2)}${s('F5', 3)}</row>
<row r="6">${s('C6', 4)}${s('D6', 5)}${s('E6', 6)}${s('F6', 4)}${s('G6', 5)}</row>
<row r="7">${s('B7', 7)}${n('C7', 2)}${n('D7', 1)}${n('F7', 1)}</row>
<row r="8">${s('B8', 8)}${n('C8', 1)}${n('E8', 3)}</row>
<row r="9">${s('B9', 9)}${n('D9', 1)}${n('G9', 2)}</row>
<row r="10"><c r="B10" t="inlineStr"><is><t>T.Y.5.16. Yazım ve noktalama</t></is></c>${n('E10', 1)}${s('F10', 11)}</row>
<row r="11">${s('B11', 10)}${n('C11', 3)}${n('D11', 2)}</row>
</sheetData><mergeCells count="2"><mergeCell ref="C5:E5"/><mergeCell ref="F5:G5"/></mergeCells></worksheet>`;

/* 2. sayfa: x: önekli ad alanı, satır içi metinler, "Ülke Geneli" birleşik alanı. */
const ic = (r, t) => `<x:c r="${r}" t="inlineStr"><x:is><x:t>${t}</x:t></x:is></x:c>`;
const xn = (r, v) => `<x:c r="${r}"><x:v>${v}</x:v></x:c>`;
const SAYFA2 = `<?xml version="1.0" encoding="UTF-8"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>
<x:row r="1">${ic('A1', '7. SINIF SENTETİK MATEMATİK')}</x:row>
<x:row r="5">${ic('C5', '1. Sınav')}${ic('E5', '2. Sınav')}</x:row>
<x:row r="6">${ic('C6', 'Senaryo 1')}${ic('D6', 'SENARYO 2')}${ic('E6', 'Ülke Geneli Ortak Yazılı Sınav')}</x:row>
<x:row r="7">${ic('B7', ' MAT.7.1.1.  Tam sayılarla işlem')}${xn('C7', 1)}${xn('D7', 2)}</x:row>
<x:row r="8">${ic('B8', 'MAT.7.1.2. Rasyonel sayılar')}${xn('C8', 2)}</x:row>
</x:sheetData><x:mergeCells><x:mergeCell ref="C5:D5"/><x:mergeCell ref="E6:E9"/></x:mergeCells></x:worksheet>`;

const SAYFA3 = `<?xml version="1.0" encoding="UTF-8"?><worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Açıklamalar — senaryo yok</t></is></c></row></sheetData></worksheet>`;

export function sentetikGirdiler() {
  return [
    { ad: '[Content_Types].xml', sakla: true, metin: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
    { ad: 'xl/workbook.xml', metin: `<?xml version="1.0" encoding="UTF-8"?><workbook ${NS} ${RNS}><sheets>` +
      '<sheet name="5. Sınıf" sheetId="1" r:id="rId1"/><sheet name="7.SINIF" sheetId="2" r:id="rId2"/><sheet name="Notlar" sheetId="3" r:id="rId3"/></sheets></workbook>' },
    { ad: 'xl/_rels/workbook.xml.rels', metin: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId2" Type="worksheet" Target="/xl/worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId3" Type="worksheet" Target="worksheets/sheet3.xml"/></Relationships>' },
    { ad: 'xl/sharedStrings.xml', metin: ortakXml() },
    { ad: 'xl/worksheets/sheet1.xml', metin: SAYFA1 },
    { ad: 'xl/worksheets/sheet2.xml', sakla: true, metin: SAYFA2 },
    { ad: 'xl/worksheets/sheet3.xml', metin: SAYFA3 },
  ];
}

export function sentetikXlsx() { return zipYap(sentetikGirdiler()); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hedef = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures', 'oyss-sentetik.xlsx');
  mkdirSync(path.dirname(hedef), { recursive: true });
  const b = sentetikXlsx();
  writeFileSync(hedef, b);
  console.log(hedef, b.length, 'bayt');
}
