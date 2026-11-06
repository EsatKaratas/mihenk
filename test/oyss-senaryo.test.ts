// §114 — OYSS senaryosundan sınav kurma: xlsx okuyucu + tablo ayıklama + havuz eşleştirme.
// Fikstür el yapımıdır (tools/oyss-sentetik-xlsx.mjs), MEB/ÖDSGM dosyası DEĞİLDİR.
//
// DOMParser Node'da yok; okuyucunun kullandığı küçük DOM yüzeyi
// (getElementsByTagNameNS("*"), getAttribute/NS, textContent, parentNode.localName)
// aşağıdaki test şimiyle sağlanır. Gerçek tarayıcı DOMParser'ı ile aynı
// fikstür ve gerçek ÖDSGM dosyaları Chromium'da ayrıca denendi (PROGRESS §114).
// Zip + DecompressionStream("deflate-raw") katmanı burada GERÇEKTİR (Node yerleşik).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore — .mjs araç modülü
import { zipYap, sentetikGirdiler } from '../tools/oyss-sentetik-xlsx.mjs';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
const fikstur = new Uint8Array(fs.readFileSync(path.resolve(__dirname, 'fixtures', 'oyss-sentetik.xlsx')));

/* ---------------- test şimi: en küçük XML ayrıştırıcı ---------------- */
type Dugum = any;
function varlik(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as any)[e.toLowerCase()];
  });
}
function eleman(qad: string, ozn: Record<string, string>, ebeveyn: Dugum): Dugum {
  const i = qad.indexOf(':');
  const el: Dugum = {
    nodeType: 1, tagName: qad, localName: i < 0 ? qad : qad.slice(i + 1), onek: i < 0 ? '' : qad.slice(0, i),
    ozn, cocuk: [] as Dugum[], parentNode: ebeveyn,
    getAttribute(a: string) { return a in ozn ? ozn[a] : null; },
    getAttributeNS(ns: string, yerel: string) {
      for (const k of Object.keys(ozn)) {
        const j = k.indexOf(':');
        if (j > 0 && k.slice(j + 1) === yerel && onekNs(el, k.slice(0, j)) === ns) return ozn[k];
      }
      return null;
    },
    getElementsByTagNameNS(_ns: string, yerel: string) { const o: Dugum[] = []; gez(el, (d) => { if (d !== el && d.localName === yerel) o.push(d); }); return o; },
    getElementsByTagName(ad: string) { const o: Dugum[] = []; gez(el, (d) => { if (d !== el && d.tagName === ad) o.push(d); }); return o; },
    get textContent() { let s = ''; gez(el, (d) => { if (d.nodeType === 3) s += d.metin; }); return s; },
  };
  return el;
}
function onekNs(el: Dugum, onek: string): string | null {
  for (let d = el; d && d.ozn; d = d.parentNode) { const v = d.ozn['xmlns:' + onek]; if (v) return v; }
  return null;
}
function gez(d: Dugum, f: (x: Dugum) => void) { f(d); (d.cocuk || []).forEach((c: Dugum) => gez(c, f)); }
class SimDOMParser {
  parseFromString(xml: string) {
    const kok = eleman('#document', {}, null);
    const yigin: Dugum[] = [kok];
    const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
    let m: RegExpExecArray | null;
    let son = 0;
    const bozuk = () => { const d = eleman('#document', {}, null); d.cocuk.push(eleman('parsererror', {}, d)); return d; };
    while ((m = re.exec(xml))) {
      if (m.index !== son) return bozuk();
      son = re.lastIndex;
      const ust = yigin[yigin.length - 1];
      if (m[1]) { if (ust.tagName !== m[1]) return bozuk(); yigin.pop(); }
      else if (m[2]) {
        const ozn: Record<string, string> = {};
        (m[3] || '').replace(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g, (_x, a, _b, c, d) => { ozn[a] = varlik(c ?? d ?? ''); return ''; });
        const el = eleman(m[2], ozn, ust);
        ust.cocuk.push(el);
        if (!m[4]) yigin.push(el);
      } else if (m[5] != null) ust.cocuk.push({ nodeType: 3, metin: varlik(m[5]), parentNode: ust });
    }
    if (son !== xml.length || yigin.length !== 1) return bozuk();
    return kok;
  }
}

/* ---------------- §114 bloğunu çıkar ---------------- */
const bas = app.indexOf('§114 — OYSS SENARYOSUNDAN SINAV KUR');
const bit = app.indexOf('\nfunction wireTeacherTab1()', bas);
expect(bas).toBeGreaterThan(0);
const blok = app.slice(app.lastIndexOf('/*', bas), bit);

function kur(state: any = { questions: [], exam: { questionIds: [] }, katalog: {} }) {
  const izler: any[] = [];
  // eslint-disable-next-line no-new-func
  const f = new Function('DOMParser', 'state', 'auditKaydet', 'rolAdi', 'katalogAnahtari', 'escapeHtml', 'truncate', 'diffLabel',
    blok + '\nreturn { xlsxOku, xlsxZipDizini, xlsxHucreAdresi, xlsxSade, oyssKodNormal, oyssDersSinif, oyssTabloAyikla, ' +
    'oyssSenaryoSatirlari, oyssEslestir, oyssZorlukDagilimi, oyssPlanKarsilastir, oyssTaslagaYaz, OYSS_KOD_DESENI };')(
    SimDOMParser, state, (tur: string, v: any) => izler.push({ tur, ...v }), () => 'Öğretmen',
    (d: string, s: any) => d + '|' + s, (x: string) => String(x), (x: string) => String(x), (x: string) => x,
  );
  return Object.assign(f, { izler });
}
const k = kur();

describe('xlsx okuyucu (dış bağımlılık yok)', () => {
  it('app.js dışarıdan kütüphane yüklemez; DecompressionStream + DOMParser kullanır', () => {
    expect(blok).toContain('new DecompressionStream("deflate-raw")');
    expect(blok).toContain('new DOMParser()');
    expect(blok).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|import\(/);
  });

  it('sentetik fikstürü okur: 3 sayfa, paylaşılan + satır içi metin, birleşik hücreler', async () => {
    const r = await k.xlsxOku(fikstur);
    expect(r.sayfalar.map((s: any) => s.ad)).toEqual(['5. Sınıf', '7.SINIF', 'Notlar']);
    const s1 = r.sayfalar[0];
    expect(s1.hucreler['7,2']).toBe('T.O.5.6. Metnin yüzey anlamını belirleyebilme');
    expect(s1.hucreler['10,2']).toBe('T.Y.5.16. Yazım ve noktalama');   // inlineStr
    expect(s1.hucreler['7,3']).toBe('2');
    expect(s1.birlesik).toEqual([{ r1: 5, c1: 3, r2: 5, c2: 5 }, { r1: 5, c1: 6, r2: 5, c2: 7 }]);
    // sıkıştırmasız (yöntem 0) + x: önekli sayfa
    expect(r.sayfalar[1].hucreler['6,5']).toBe('Ülke Geneli Ortak Yazılı Sınav');
  });

  it('NFD harfi NFC yapar, boşlukları tekler, okunuş (rPh) metnini katmaz', async () => {
    const s1 = (await k.xlsxOku(fikstur)).sayfalar[0];
    expect(s1.hucreler['5,1']).toBe('Okuma Alanı — Türkçe');
    expect(s1.hucreler['5,1']).toBe(s1.hucreler['5,1'].normalize('NFC'));
    expect(s1.hucreler['8,2']).toBe('T.O.5.7. Görselle iletilen anlamı belirleyebilme');
    expect(s1.hucreler['5,2']).toBe('Öğrenme Çıktıları');
  });

  it('hücre adresi', () => {
    expect(k.xlsxHucreAdresi('A1')).toEqual({ r: 1, c: 1 });
    expect(k.xlsxHucreAdresi('AB12')).toEqual({ r: 12, c: 28 });
    expect(k.xlsxHucreAdresi('12')).toBeNull();
  });

  const reddeder = async (b: Uint8Array, desen: RegExp) => {
    let hata: any = null;
    try { await k.xlsxOku(b); } catch (e) { hata = e; }
    expect(hata, 'hata fırlatmalı').not.toBeNull();
    expect(hata.xlsx, 'anlaşılır (xlsx) hata olmalı: ' + (hata && hata.message)).toBe(true);
    expect(hata.message).toMatch(desen);
  };

  it('bozuk / beklenmeyen dosyada net Türkçe hata', async () => {
    await reddeder(new TextEncoder().encode('kazanım;senaryo 1;senaryo 2\nT.O.5.6;2;1\n'), /xlsx dosyası değil/);
    await reddeder(new Uint8Array(0), /boş ya da çok kısa/);
    await reddeder(fikstur.slice(0, fikstur.length - 30), /zip dizini bulunamadı/);         // yarıda kalmış indirme
    await reddeder(zipYap([{ ad: 'word/document.xml', metin: '<w/>' }]), /Excel çalışma kitabı değil/);
    // sayfa XML'i bozuk (kapanmayan etiket)
    const g = sentetikGirdiler().map((x: any) => x.ad === 'xl/worksheets/sheet1.xml' ? { ...x, metin: '<worksheet><sheetData><row>' } : x);
    await reddeder(zipYap(g), /sheet1\.xml okunamadı/);
    // sıkıştırılmış veri bozuk
    const b = fikstur.slice();
    const dz = k.xlsxZipDizini(b)['xl/worksheets/sheet1.xml'];
    for (let i = 0; i < 40; i++) b[dz.yerel + 30 + 24 + 10 + i] ^= 0xff;
    await reddeder(b, /bozuk|okunamadı/);
    // eksik sayfa hedefi
    const g2 = sentetikGirdiler().filter((x: any) => x.ad !== 'xl/worksheets/sheet3.xml');
    await reddeder(zipYap(g2), /“Notlar” sayfası bulunamadı/);
  });

  it('çok büyük dosyayı açmaya çalışmaz', async () => {
    await reddeder(new Uint8Array(5 * 1024 * 1024 + 1), /çok büyük/);
  });
});

describe('senaryo tablosu ayıklama', () => {
  it('sınav blokları, senaryolar, kodlar ve sayılar', async () => {
    const r = await k.xlsxOku(fikstur);
    const t = k.oyssTabloAyikla(r.sayfalar[0]);
    expect(t.hata).toBeUndefined();
    expect(t.baslik).toBe('SENTETİK DERS 5. SINIF');
    expect(t.sinavlar).toEqual([
      { ad: '1. Sınav', senaryolar: [{ ad: 'Senaryo 1', sutun: 3 }, { ad: 'Senaryo 2', sutun: 4 }, { ad: 'Senaryo 3', sutun: 5 }] },
      { ad: '2. Sınav', senaryolar: [{ ad: 'Senaryo 1', sutun: 6 }, { ad: 'Senaryo 2', sutun: 7 }] },
    ]);
    expect(t.satirlar.map((x: any) => x.kod)).toEqual(['T.O.5.6', 'T.O.5.7', 'T.O.5.99', 'T.Y.5.16']);
    expect(t.satirlar[1].metin).toBe('Görselle iletilen anlamı belirleyebilme');
    expect(t.satirlar[3].sayilar).toEqual({ 5: 1 });                 // F10 = "x" sayı değil, atlandı
    expect(t.atlanan).toEqual(['Satır 11 (TOPLAM)']);                 // kodsuz toplam satırı hesaba girmez
    expect(t.ders).toBe('Türkçe');
    expect(t.sinif).toBe(5);
  });

  it('"Ülke Geneli" alanı senaryo değildir; not olarak düşer, sayıları okunmaz', async () => {
    const t = k.oyssTabloAyikla((await k.xlsxOku(fikstur)).sayfalar[1]);
    expect(t.sinavlar).toEqual([{ ad: '1. Sınav', senaryolar: [{ ad: 'Senaryo 1', sutun: 3 }, { ad: 'Senaryo 2', sutun: 4 }] }]);
    expect(t.notlar).toEqual(['2. Sınav: senaryo yok — Ülke Geneli Ortak Yazılı Sınav']);
    expect(t.satirlar.map((x: any) => x.kod)).toEqual(['MAT.7.1.1', 'MAT.7.1.2']);
    expect(t.ders).toBe('Matematik');
    expect(t.sinif).toBe(7);
  });

  it('senaryosuz sayfa açık hata verir', async () => {
    const t = k.oyssTabloAyikla((await k.xlsxOku(fikstur)).sayfalar[2]);
    expect(t.hata).toMatch(/Senaryo/);
  });

  it('seçilen senaryonun satırları: yalnız soru isteyen kazanımlar', async () => {
    const t = k.oyssTabloAyikla((await k.xlsxOku(fikstur)).sayfalar[0]);
    expect(k.oyssSenaryoSatirlari(t, 0, 0)).toEqual([
      { kod: 'T.O.5.6', metin: 'Metnin yüzey anlamını belirleyebilme', istenen: 2 },
      { kod: 'T.O.5.7', metin: 'Görselle iletilen anlamı belirleyebilme', istenen: 1 },
    ]);
    expect(k.oyssSenaryoSatirlari(t, 1, 1).map((x: any) => [x.kod, x.istenen])).toEqual([['T.O.5.99', 2]]);
    expect(k.oyssSenaryoSatirlari(t, 9, 0)).toEqual([]);
  });

  it('kod biçimleri: gerçek dosyalarda görülen yazımlar', () => {
    const kod = (s: string) => { const m = k.OYSS_KOD_DESENI.exec(k.xlsxSade(s)); return m ? k.oyssKodNormal(m[1]) : null; };
    expect(kod('T.O.5.6. Metnin yüzey anlamını')).toBe('T.O.5.6');
    expect(kod('  MAT.6.1.2. Bir doğal sayının')).toBe('MAT.6.1.2');
    expect(kod('MAT.6.1.4.  Günlük hayat')).toBe('MAT.6.1.4');
    expect(kod('M.8.1.1.1. Verilen pozitif')).toBe('M.8.1.1.1');
    expect(kod('T.8.3.1. Noktalama')).toBe('T.8.3.1');
    expect(kod('FB.6.2.1 Güneş sistemi')).toBe('FB.6.2.1');
    expect(kod('OKUMA')).toBeNull();
    expect(kod('1. Dönem 1. Ortak Yazılı Sınav')).toBeNull();
    expect(k.oyssDersSinif('T.Y.7.21')).toEqual({ ders: 'Türkçe', sinif: 7 });
    expect(k.oyssDersSinif('FB.6.2.1')).toEqual({ ders: 'Fen Bilimleri', sinif: 6 });
    expect(k.oyssDersSinif('DKAB.5.1.1')).toEqual({ ders: '', sinif: 5 });
  });
});

describe('havuz eşleştirme', () => {
  const sorular = [
    { id: 1, status: 'approved', outcome: 'T.O.5.6', difficulty: 'easy' },
    { id: 2, status: 'ai_generated', outcome: 'T.O.5.6', difficulty: 'easy' },   // onaysız: aday OLMAZ
    { id: 3, status: 'approved', outcome: 't.o.5.6.', difficulty: 'hard' },     // yazım farkı tolere edilir
    { id: 4, status: 'approved', outcome: 'T.O.5.6', difficulty: 'medium' },
    { id: 5, status: 'rejected', outcome: 'T.O.5.7', difficulty: 'medium' },
    { id: 6, status: 'approved', outcome: 'T.O.5.60', difficulty: 'medium' },   // önek benzerliği eşleşmez
  ];
  const satirlar = [
    { kod: 'T.O.5.6', metin: '', istenen: 2 },
    { kod: 'T.O.5.7', metin: '', istenen: 1 },
    { kod: 'T.O.5.99', metin: '', istenen: 2 },
  ];

  it('yalnız onaylı sorular önerilir; eksik açıkça sayılır', () => {
    const e = k.oyssEslestir(satirlar, sorular, [], { 'T.O.5.6': true, 'T.O.5.7': true });
    expect(e[0]).toMatchObject({ kod: 'T.O.5.6', adaylar: [1, 3, 4], onerilen: [1, 3], eksik: 0, katalogda: true });
    expect(e[1]).toMatchObject({ kod: 'T.O.5.7', adaylar: [], onerilen: [], eksik: 1, katalogda: true });
    expect(e[2]).toMatchObject({ kod: 'T.O.5.99', adaylar: [], eksik: 2, katalogda: false });
  });

  it('sınavda zaten olan soru öne alınır', () => {
    const e = k.oyssEslestir(satirlar, sorular, [4], null);
    expect(e[0].onerilen).toEqual([4, 1]);
    expect(e[0].katalogda).toBeNull();          // katalog yok → karşılaştırılmadı
  });

  it('zorluk dağılımı yalnız sayılır (seçimi değiştirmez)', () => {
    const e = k.oyssEslestir(satirlar, sorular, [], null);
    expect(e[0].onerilen).toEqual([1, 3]);      // kolay+zor; "denge" için orta zorla eklenmez
    expect(k.oyssZorlukDagilimi([sorular[0], sorular[2], { difficulty: undefined }])).toEqual({ easy: 1, medium: 0, hard: 1, diger: 1 });
  });

  it('2. adım karşılaştırması: istenen / sınavda / eksik / fazla', () => {
    const plan = { satirlar: [{ kod: 'T.O.5.6', istenen: 2 }, { kod: 'T.O.5.7', istenen: 1 }] };
    expect(k.oyssPlanKarsilastir(plan, sorular, [1, 3, 4])).toEqual([
      { kod: 'T.O.5.6', istenen: 2, sinavda: 3, eksik: 0, fazla: 1 },
      { kod: 'T.O.5.7', istenen: 1, sinavda: 0, eksik: 1, fazla: 0 },
    ]);
    expect(k.oyssPlanKarsilastir(null, sorular, [1])).toEqual([]);
  });
});

describe('taslağa yazma: yalnız tablo, dosya değil; yayın yok', () => {
  const t = { ad: '5. Sınıf', baslik: 'SENTETİK', ders: 'Türkçe', sinif: 5,
    sinavlar: [{ ad: '1. Sınav', senaryolar: [{ ad: 'Senaryo 1', sutun: 3 }] }],
    satirlar: [{ kod: 'T.O.5.6', metin: 'Gizli metin', sayilar: { 3: 2 } }, { kod: 'T.O.5.7', metin: '', sayilar: { 3: 1 } }],
    notlar: [], atlanan: [] };
  const yeniDurum = (status = 'draft') => ({
    questions: [{ id: 1, status: 'approved', outcome: 'T.O.5.6' }, { id: 3, status: 'approved', outcome: 'T.O.5.6' }, { id: 9, status: 'ai_generated', outcome: 'T.O.5.7' }],
    exam: { title: 'S', questionIds: [3], status }, katalog: {},
  });
  const calistir = (state: any, secim: any = null) => {
    const ogt: any = { oyss: { tablolar: [t], sayfa: 0, sinav: 0, senaryo: 0, secim, dosya: 'gizli-dosya-adi.xlsx' } };
    // eslint-disable-next-line no-new-func
    const izler: any[] = [];
    const f = new Function('DOMParser', 'state', 'auditKaydet', 'rolAdi', 'ogtDurum', 'aktifOturumuYaz', 'saveState', 'katalogAnahtari',
      blok + '\nreturn oyssTaslagaYaz();')(SimDOMParser, state, (tur: string, v: any) => izler.push({ tur, ...v }), () => 'Öğretmen',
      () => ogt, () => {}, () => {}, (d: string, s: any) => d + '|' + s);
    return { sonuc: f, izler };
  };

  it('önerilenler eklenir, mevcutlar korunur; plan yalnız {kod, istenen} taşır', () => {
    const st = yeniDurum();
    const { sonuc, izler } = calistir(st);
    expect(sonuc).toBe(true);
    expect(st.exam.questionIds).toEqual([3, 1]);
    expect(st.exam.status).toBe('draft');                                       // otomatik yayın YOK
    const p = (st.exam as any).oyssSenaryo;
    expect(p.satirlar).toEqual([{ kod: 'T.O.5.6', istenen: 2 }, { kod: 'T.O.5.7', istenen: 1 }]);
    expect([p.sayfa, p.sinav, p.senaryo]).toEqual(['5. Sınıf', '1. Sınav', 'Senaryo 1']);
    const metin = JSON.stringify(p) + JSON.stringify(izler);
    expect(metin).not.toContain('gizli-dosya-adi');                              // dosya adı kayda girmez
    expect(metin).not.toContain('Gizli metin');                                  // tablodaki metin kayda girmez
    expect(izler).toEqual([{ tur: 'oyss_senaryo_yazildi', senaryo: '1. Sınav · Senaryo 1', kazanimSay: 2, eklenen: 1, eksik: 1, rol: 'Öğretmen' }]);
  });

  it('öğretmenin kaldırdığı öneri eklenmez; onaysız soru seçilmiş görünse bile eklenmez', () => {
    const st = yeniDurum();
    st.exam.questionIds = [];
    calistir(st, { 1: false, 3: true, 9: true });
    expect(st.exam.questionIds).toEqual([3]);
  });

  it('yayındaki sınava yazmaz', () => {
    const st = yeniDurum('published');
    const { sonuc } = calistir(st);
    expect(sonuc).toBe(false);
    expect(st.exam.questionIds).toEqual([3]);
    expect((st.exam as any).oyssSenaryo).toBeUndefined();
  });
});

describe('kalıcılık ve bağlama', () => {
  it('okunan tablo kalıcı alana girmez (state.ogt KALICI_ALANLAR dışında)', () => {
    const m = /const KALICI_ALANLAR = \[([\s\S]*?)\];/.exec(app);
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/"ogt"|"oyss/);
  });
  it('activateExam oyssSenaryo alanını taşır (sınav değiştirince kaybolmaz)', () => {
    const bas2 = app.indexOf('\nfunction activateExam(');
    expect(app.slice(bas2, app.indexOf('\n}\n', bas2))).toContain('oyssSenaryo: kayit.oyssSenaryo || null');
  });
  it('1. adım bölümü çizer, 2. adım karşılaştırmayı gösterir, sihirbaz bağlar', () => {
    const govde = (ad: string) => { const b = app.indexOf('\nfunction ' + ad + '('); return app.slice(b, app.indexOf('\n}\n', b)); };
    expect(govde('sihirbazAdim1Html')).toContain('oyssKurHtml()');
    expect(govde('sihirbazAdim2Html')).toContain('oyssPlanHtml()');
    expect(govde('wireOgtSihirbaz')).toContain('wireOyssKur()');
  });
  it('gizlilik politikası dosyanın tarayıcıda okunduğunu söyler', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toMatch(/konu-soru dağılım tablosu[\s\S]{0,40}yalnız tarayıcınızda okunur/);
  });
});
