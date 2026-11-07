// ============================================================================
// §132 — modele (ve §131 paketine) giden metinde telefon / e-posta / T.C. kimlik
// maskesi. kisiselMaskele gerçek app.js kaynağından çıkarılıp sınanır.
// Asıl kural: SESSİZ YANLIŞ MASKE YOK — tarih, puan, yıl, sınıf, büyük sayı,
// ondalık ve sayı listesi olduğu gibi kalmalı; yoksa model yanlış metni puanlar.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
const bas = app.indexOf('const KISISEL_SOZCUK_ADLAR');
const sonIsaret = app.indexOf('function adMaskeNotuHtml(');
const kod = app.slice(bas, app.indexOf('\n}\n', sonIsaret) + 3);
type Sonuc = { metin: string; maskelendi: boolean };
// eslint-disable-next-line no-new-func
const kisiselMaskele = new Function('state', kod + '\nreturn kisiselMaskele;')({ students: [{ name: 'Ayşe Yılmaz' }] }) as
  (m: string, o?: { name: string }[]) => Sonuc;
const mask = (m: string) => kisiselMaskele(m).metin;

describe('§132 iletişim maskesi — maskelenmesi gerekenler', () => {
  it.each([
    ['telefonum 0532 111 22 33', 'telefonum [NUMARA]'],
    ['telefonum 05321112233.', 'telefonum [NUMARA].'],
    ['ara +90 532 111 22 33 lütfen', 'ara [NUMARA] lütfen'],
    ['ara 0090 532 111 22 33', 'ara [NUMARA]'],
    ['0 (532) 111-22-33 numaram', '[NUMARA] numaram'],
    ['(0532) 111 22 33', '[NUMARA]'],
    ['ev 0212-555-12-34', 'ev [NUMARA]'],
    ['532 111 22 33 beni ara', '[NUMARA] beni ara'],
    ['cep 532.111.22.33', 'cep [NUMARA]'],
    ['mail: ali.veli@okul.k12.tr yaz', 'mail: [E-POSTA] yaz'],
    ['ayse_yilmaz42@gmail.com', '[E-POSTA]'],
    ['TC 10000000146 yazdım', 'TC [NUMARA] yazdım'],
  ])('%s', (girdi, beklenen) => {
    const r = kisiselMaskele(girdi);
    expect(r.metin).toBe(beklenen);
    expect(r.maskelendi).toBe(true);
  });
  it('ad maskesi ve iletişim maskesi birlikte', () => {
    expect(mask('Ben Ayşe Yılmaz, numaram 0532 111 22 33')).toBe('Ben [ÖĞRENCİ], numaram [NUMARA]');
  });
});

describe('§132 iletişim maskesi — DOKUNULMAMASI gerekenler (sessiz yanlış maske yok)', () => {
  it.each([
    '07.11.2026 tarihinde deney yaptık',
    '7.11.2026-8.11.2026 arası',
    '2026 yılında 7/B sınıfı',
    'puanım 16/20, sonra 17/20 oldu',
    '1000000000 bir milyardır',
    '5000000000 beş milyar',
    'pi yaklaşık 3.14159265358979 olur',
    'pi yaklaşık 3,14159265358979 olur',
    '1 2 3 4 5 6 7 8 9 10 diye sayarım',
    '12 34 56 78 90',
    '2, 4, 6, 8, 10, 12, 14, 16, 18, 20',
    'saat 10.30-12.45 arası',
    '12345678901 sayısı',
    'işlem: 250 + 300 = 550 ve 1.000.000.000',
    'x = 0,5 ve y = 0.25; a@b oldu',
    '1/2 + 3/4 = 5/4',
  ])('%s', (girdi) => {
    const r = kisiselMaskele(girdi);
    expect(r.metin).toBe(girdi);
    expect(r.maskelendi).toBe(false);
  });
});

describe('§132 kaynak sözleşmesi', () => {
  it('modele giden iki serbest metin ucu kisiselMaskele kullanıyor; §131 ayrı maskesi kalktı', () => {
    expect(app).toContain('const maske = kisiselMaskele(answerText || "");');
    expect(app).not.toMatch(/function ciftEkMaske\(/);
    expect(app).toMatch(/metin: kisiselMaskele\(m, g\.maskeListesi \|\| \[\]\)\.metin\.slice\(/);
  });
});
