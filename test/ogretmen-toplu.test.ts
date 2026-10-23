// §62 / W3 P1-1 — Öğretmen › Öğrenciler › "Toplu ekle: yapıştır" ayıklaması.
// İstemci kodu tarayıcıda çalışır; fonksiyonlar public/app.js metninden
// alınıp yalıtılmış bir kapsamda kurulur (state yalnız buradaki sahte nesne).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

/** "function ad(" ile başlayan üst düzey fonksiyonun tam metni. */
function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

function kur(students: Array<{ name: string; sinif: string }> = []) {
  const kod = ['eokulSatiriAd', 'adAnahtari', 'topluAdAyikla'].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', kod + '\nreturn { eokulSatiriAd, adAnahtari, topluAdAyikla };')({ students });
}

describe('eokulSatiriAd — e-Okul / Excel satırından ad', () => {
  const { eokulSatiriAd } = kur();

  it('baştaki TÜM sayılar atılır: "4 1234 Deniz Kaya" → "Deniz Kaya"', () => {
    expect(eokulSatiriAd('4 1234 Deniz Kaya')).toBe('Deniz Kaya');
    expect(eokulSatiriAd('3. Ada Yılmaz')).toBe('Ada Yılmaz');
    expect(eokulSatiriAd('12) 845 Can Er')).toBe('Can Er');
  });

  it('sekmeli satırda sayısal sütunlar ve cinsiyet sütunu atılır', () => {
    expect(eokulSatiriAd('4\t1234\tDeniz Kaya\tKız')).toBe('Deniz Kaya');
    expect(eokulSatiriAd('5\t1301\tMert Doğan\tErkek\t12.09.2013')).toBe('Mert Doğan');
    expect(eokulSatiriAd('6\t77\tElif Şahin\tK')).toBe('Elif Şahin');
    expect(eokulSatiriAd('7\t78\tEge Tunç\tE')).toBe('Ege Tunç');
    expect(eokulSatiriAd('8\t79\tZeynep Arı\tKIZ')).toBe('Zeynep Arı');
  });

  it('harf içermeyen satır geçersizdir ("" döner)', () => {
    expect(eokulSatiriAd('4 1234')).toBe('');
    expect(eokulSatiriAd('12\t845\t')).toBe('');
    expect(eokulSatiriAd('---')).toBe('');
  });

  it('Türkçe harfler korunur; adın içindeki "E"/"K" harfi silinmez', () => {
    expect(eokulSatiriAd('İrem Işık')).toBe('İrem Işık');
    expect(eokulSatiriAd('Ömer Çağrı Üstün')).toBe('Ömer Çağrı Üstün');
    expect(eokulSatiriAd('Ece K. Er')).toBe('Ece K. Er');
  });
});

describe('adAnahtari — Türkçe büyük/küçük harf', () => {
  const { adAnahtari } = kur();
  it('"İ"→"i", "I"→"ı": İREM IŞIK ile İrem Işık aynı kişi', () => {
    expect(adAnahtari('İREM IŞIK')).toBe(adAnahtari('İrem Işık'));
    expect(adAnahtari('  irem   ışık ')).toBe('irem ışık');
  });
  it('"Irmak" ile "İrmak" farklı addır (ı ≠ i)', () => {
    expect(adAnahtari('Irmak')).not.toBe(adAnahtari('İrmak'));
  });
});

describe('topluAdAyikla — sayımlar (sessiz düşüş yok)', () => {
  it('boş, geçersiz ve yinelenen satırlar ayrı sayılır', () => {
    const { topluAdAyikla } = kur([{ name: 'Ada Yılmaz', sinif: '7-A' }]);
    const metin = ['4 1234 Deniz Kaya', '', '5\t1301\tADA YILMAZ\tKız', '9 999', 'İrem Işık', 'İREM IŞIK', ''].join('\n');
    const a = topluAdAyikla(metin, '7-A');
    expect(a.eklenecek).toEqual(['Deniz Kaya', 'İrem Işık']);
    expect(a.yinelenen).toEqual(['ADA YILMAZ', 'İREM IŞIK']);
    expect(a.bos).toBe(1);
    expect(a.gecersiz).toBe(1);
  });
  it('başka şubedeki aynı ad yinelenen sayılmaz', () => {
    const { topluAdAyikla } = kur([{ name: 'Ada Yılmaz', sinif: '7-B' }]);
    expect(topluAdAyikla('Ada Yılmaz', '7-A').eklenecek).toEqual(['Ada Yılmaz']);
  });
});
