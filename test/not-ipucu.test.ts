// §125 — Öğretmen notuna kural tabanlı ipucu (notIpucuBul).
// Elle etiketlenmiş örnek not seti: her notun BEKLENEN ipucu kodu yazılı.
// Kodlar: kisi (kişiye yönelik), ovgu (yalnız övgü), kisa (çok kısa),
// ileri (sonraki adım yok), null (ipucu yok — iyi not).
// Amaç yanlış pozitifi düşük tutmak: "iyi not"lara ipucu çıkmamalı.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function sabitMetni(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' sabiti bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('];\n', bas) > 0 && app.indexOf('];\n', bas) < app.indexOf('};\n', bas) ? app.indexOf('];\n', bas) + 3
    : app.indexOf('};\n', bas) + 3;
  return app.slice(bas, son);
}

const SABITLER = ['NOT_IPUCU_KISI', 'NOT_IPUCU_OVGU', 'NOT_IPUCU_DOLGU', 'NOT_IPUCU_EMIR', 'NOT_IPUCU_EMIR_DISI',
  'NOT_IPUCU_ILERI_KALIPLARI', 'NOT_IPUCU_ILERI_DISI', 'NOT_IPUCU_METIN'];

function kur() {
  const kod = SABITLER.map(sabitMetni).join('\n') + '\n' +
    ['notIpucuKatla', 'notIpucuIleriVar', 'notIpucuBul'].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(kod + '\nreturn { notIpucuBul, notIpucuIleriVar, notIpucuKatla };')();
}

type Kod = 'kisi' | 'ovgu' | 'kisa' | 'ileri' | null;
const ORNEKLER: Array<[string, Kod]> = [
  // — iyi notlar: görev + sonraki adım (ipucu YOK) —
  ['Gerekçen açık; bir dahaki sefere örnek de ekle.', null],
  ['Sebep-sonuç ilişkisini doğru kurmuşsun. Sonucu bir cümleyle özetlemeyi dene.', null],
  ['2. adımda birimi yazmamışsın, birimleri kontrol et.', null],
  ['Ana fikri buldun ama yardımcı fikirleri de belirtmelisin.', null],
  ['Cevabın doğru; çözüm yolunu adım adım yazarsan daha anlaşılır olur.', null],
  ['Kuvvetin yönünü göstermeyi unutma.', null],
  ['Metindeki ipuçlarını kullanarak tahminini gerekçelendirebilirsin.', null],
  ['Tabloyu okurken sütun başlıklarına dikkat et.', null],
  ['Harika bir giriş! Sonucu da örnekle desteklersen tam olur.', null],
  ['Çok güzel olmuş, bir sonraki yazında paragraf geçişlerine odaklan.', null],
  ['İşlem doğru, sadeleştirmeyi unutmayın.', null],
  ['Ölçüm sonucunu tabloya işaretleyin ve karşılaştırın.', null],
  ['Kavramları karıştırmışsın; kütle ile ağırlığın farkını ders kitabından tekrar oku.', null],
  ['Yanıtında kanıt yok, metinden bir cümle alıntılaman gerekiyor.', null],
  ['Bu soruda grafiği yanlış okumuşsun; eksenleri yeniden incele.', null],
  ['Açıklaman daha ayrıntılı olmalı.', null],
  ['Bir dahaki sınavda süreyi iyi kullan.', null],
  ['Temeli sağlam bir yanıt, sadece son adımda işaret hatası var; işareti düzelt.', null],
  // — yalnız övgü —
  ['Aferin!', 'ovgu'],
  ['Harika olmuş, tebrikler!', 'ovgu'],
  ['Çok iyi, devam et.', 'ovgu'],
  ['Mükemmel bir yanıt.', 'ovgu'],
  ['Süpersin, eline sağlık.', 'ovgu'],
  ['Çok zekisin!', 'ovgu'],
  ['Gerçekten güzel bir çalışma olmuş, seninle gurur duyuyorum.', 'ovgu'],
  // — kişiye yönelik —
  ['Tembelsin, yine çalışmamışsın.', 'kisi'],
  ['Çok dikkatsiz bir öğrencisin.', 'kisi'],
  ['Bu kadar beceriksiz olma, soruyu oku.', 'kisi'],
  ['Sorumsuz davranıyorsun, ödevini getirmedin.', 'kisi'],
  ['Aptalca hatalar yapıyorsun.', 'kisi'],
  // — çok kısa —
  ['Eksik.', 'kisa'],
  ['Yanlış.', 'kisa'],
  ['Birim eksik.', 'kisa'],
  ['Kısmen doğru.', 'kisa'],
  // — sonraki adım yok —
  ['Cevabında birim eksik.', 'ileri'],
  ['Sebep-sonuç ilişkisini doğru kurmuşsun ama sonuç cümlen eksik kalmış.', 'ileri'],
  ['Yanıtın konuyla ilgili fakat metinden kanıt göstermemişsin.', 'ileri'],
  ['Burada bir sorun var, oran yanlış kurulmuş.', 'ileri'],
  ['İkinci paragraf ana fikirle bağlantısız.', 'ileri'],
  ['Kuvvet ve hareket ilişkisini kısmen açıklamışsın.', 'ileri'],
];

describe('§125 not ipucu — elle etiketli örnek set', () => {
  const { notIpucuBul } = kur();

  it('en az 30 örnek, her sınıftan örnek var', () => {
    expect(ORNEKLER.length).toBeGreaterThanOrEqual(30);
    for (const k of [null, 'ovgu', 'kisi', 'kisa', 'ileri']) expect(ORNEKLER.some((o) => o[1] === k), String(k)).toBe(true);
  });

  for (const [metin, beklenen] of ORNEKLER) {
    it(`${beklenen ?? 'ipucu yok'} ← "${metin}"`, () => {
      const r = notIpucuBul(metin);
      expect(r ? r.kod : null).toBe(beklenen);
    });
  }

  it('kesinlik (precision) ≥ 0,8 ve iyi notlarda yanlış pozitif 0', () => {
    let dogruPozitif = 0, pozitif = 0, iyiNotaIpucu = 0;
    for (const [metin, beklenen] of ORNEKLER) {
      const r = notIpucuBul(metin);
      if (r) { pozitif++; if (beklenen && r.kod === beklenen) dogruPozitif++; }
      if (!beklenen && r) iyiNotaIpucu++;
    }
    expect(dogruPozitif / pozitif).toBeGreaterThanOrEqual(0.8);
    expect(iyiNotaIpucu).toBe(0);
  });
});

describe('§125 not ipucu — kurallar', () => {
  const { notIpucuBul } = kur();

  it('boş not: ipucu yok (not isteğe bağlı)', () => {
    expect(notIpucuBul('')).toBeNull();
    expect(notIpucuBul('   ')).toBeNull();
    expect(notIpucuBul(undefined)).toBeNull();
  });

  it('"değil" ile olumsuzlanan nitelik kişiye yönelik sayılmaz', () => {
    expect(notIpucuBul('Tembel değilsin, yalnız bu konuyu tekrar et.')).toBeNull();
  });

  it('büyük harf ve Türkçe İ/I katlanır', () => {
    expect(notIpucuBul('TEMBELSİN')!.kod).toBe('kisi');
    expect(notIpucuBul('AFERİN')!.kod).toBe('ovgu');
  });

  it('ipucu metni yumuşak dilde ve kaydetmeyi engellemez (metinde yasak/zorunlu yok)', () => {
    for (const kod of ['kisi', 'ovgu', 'kisa', 'ileri']) {
      const r = ORNEKLER.map((o) => notIpucuBul(o[0])).find((x) => x && x.kod === kod)!;
      expect(r.metin).not.toMatch(/zorunlu|yasak|kaydedilemez|hatalı/i);
    }
  });
});

describe('§125 not ipucu — engellemez, değiştirmez, kapatılabilir', () => {
  it('kayıt yolları ipucunu okumaz (finalizeReview ve onay düğmeleri)', () => {
    const fin = fonksiyonMetni('finalizeReview');
    expect(fin).not.toMatch(/notIpucu/);
    expect(app.slice(app.indexOf('document.querySelectorAll(".approve-as-is")'), app.indexOf('function finalizeReview')))
      .not.toMatch(/notIpucu/);
  });

  it('ipucu not alanının değerine yazmaz', () => {
    const g = fonksiyonMetni('notIpucuGoster');
    expect(g).not.toMatch(/alan\.value\s*=/);
    expect(fonksiyonMetni('notIpucuKur')).not.toMatch(/\.value\s*=/);
  });

  it('tercih kalıcı: notIpucuKapali KALICI_ALANLAR içinde; kapalıyken ipucu çizilmez', () => {
    const bas = app.indexOf('const KALICI_ALANLAR');
    expect(app.slice(bas, app.indexOf('];', bas))).toContain('"notIpucuKapali"');
    expect(fonksiyonMetni('notIpucuGoster')).toMatch(/state\.notIpucuKapali \? null/);
    expect(fonksiyonMetni('notIpucuAyarla')).toMatch(/saveState\(\)/);
  });

  it('model çağrısı yok', () => {
    const bas = app.indexOf('§125 ÖĞRETMEN NOTUNA KURAL TABANLI İPUCU');
    const blok = app.slice(bas, app.indexOf('/* ==================== BOŞ DURUM', bas));
    expect(blok).not.toMatch(/apiPost|fetch\(|\/api\//);
  });
});
