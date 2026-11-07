// ============================================================================
// §124 — Q1: kalıcı madde geçmişi + rubrik örnek yanıtları (yalnız gösterim).
//   1) Geçmiş: §121'in GERÇEK itemAnalysis/acikMaddeAnalizi fonksiyonlarıyla
//      elle hesaplanmış küçük sınıf; kayıtta öğrenci bilgisi yok; yeniden
//      yayında çoğalmaz; alan yoksa boş geçmiş (göç yok); etiket–gözlem notu
//      n ≥ 20'de ve etiket kendiliğinden değişmez.
//   2) Örnek yanıt: ad/numara temizliği, doğrulama, sınır, düzey grupları,
//      onaylı karttaki alan, hiçbir apiPost gövdesine girmez.
//   3) Anonim araştırma paketi (§111) iki alanı da dışlar.
// İstemci fonksiyonları public/app.js metninden alınıp yalıtılmış kapsamda
// kurulur (adsiz-puanlama.test.ts deseni). Model çağrısı yok.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}
function sabit(ad: string): string {
  const m = app.match(new RegExp('\\nconst ' + ad + ' = [^\\n]*;'));
  expect(m, ad).toBeTruthy();
  return m![0];
}
function arasi(bas: string, son: string): string {
  const i = app.indexOf(bas);
  const j = app.indexOf(son, i);
  expect(i, bas).toBeGreaterThan(0);
  expect(j, son).toBeGreaterThan(i);
  return app.slice(i, j);
}
/** Blok gövdesi: başlangıç işaretinden bir sonraki üst düzey yorum bloğuna kadar. */
function blok(bas: string, son: string): string { return arasi(bas, son); }

const ADLAR = [
  'escapeHtml', 'ondalikTr', 'truncate', 'hash32', 'diffLabel', 'ortakSinavMi', 'findQuestion',
  'ortalamaDizi', 'varyansOrneklem', 'pearsonR', 'celdiriciAnalizi', 'maddeToplamKorelasyonu', 'acikMaddeGuclugu',
  'acikMaddeAnalizi', 'itemAnalysis',
  'maddeGunu', 'maddeGunuTr', 'maddeGecmisiImza', 'maddeGecmisiKayitlari', 'maddeGecmisineEkle', 'maddeGecmisiOzeti',
  'gozlenenGuclukDuzeyi', 'guclukUyumsuzlugu', 'guclukEtiketiYzMi', 'maddeGecmisiRozetiHtml', 'guclukUyumsuzlukNotuHtml',
  'maddeGecmisiAyrintiHtml', 'maddeGecmisiniIsle',
  'ornekYanitTemizle', 'ornekYanitKaydi', 'ornekYanitEkle', 'ornekYanitGruplari', 'ornekYanitlarHtml',
  'ornekYanitPaneliHtml', 'ornekYanitAlaniHtml',
];
const SABITLER = ['MADDE_GECMISI_LIMIT', 'MADDE_GECMISI_UYUM_EN_AZ_N', 'ORNEK_YANIT_LIMIT', 'ORNEK_YANIT_UZUNLUK'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function kur(state: Any, oturumlar: Record<number, Any>) {
  const kod =
    arasi('const KISISEL_SOZCUK_ADLAR', 'function adMaskeNotuHtml(') +
    SABITLER.map(sabit).join('\n') + '\nvar _ornekTaslak = null;\n' +
    'function readSession(sid) { return oturumlar[sid] || {}; }\n' +
    'function submittedStudents() { return state.students.filter(function (s) { const d = (oturumlar[s.id] || {}).examStatus; return d === "submitted" || d === "graded"; }); }\n' +
    'function mcPuani() { return 5; }\n' +
    ADLAR.map(fonksiyonMetni).join('\n') +
    '\nreturn {' + ADLAR.join(',') + ', taslak: function (t) { _ornekTaslak = t; } };';
  // eslint-disable-next-line no-new-func
  return new Function('state', 'oturumlar', kod)(state, oturumlar) as Record<string, Any>;
}

const OGRENCILER = [
  { id: 1, name: 'Ada Yılmaz', sinif: '7-A', okulNo: '1453' },
  { id: 2, name: 'Kerem Aydın', sinif: '7-A' },
  { id: 3, name: 'Elif Şahin', sinif: '7-A' },
  { id: 4, name: 'Mert Koç', sinif: '7-A' },
  { id: 5, name: 'Zeynep Kaya', sinif: '7-A' },
];
const MC = { id: 1, type: 'mc', difficulty: 'hard', body: 'Hangisi sürtünmeyi azaltır?', correctKey: 'B',
  options: ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: 'şık ' + k })) };
const ACIK = { id: 2, type: 'open', difficulty: 'medium', body: 'Sürtünmeyi bir örnekle açıklayınız.' };
const MC_SECIM = ['B', 'B', 'B', 'A', 'C'];
const ACIK_PUAN = [8, 6, 7, 2, 3];

function sinif(ek: Any = {}) {
  const oturumlar: Record<number, Any> = {};
  OGRENCILER.forEach((s, i) => {
    oturumlar[s.id] = {
      examStatus: 'graded',
      answers: { 1: { selectedKey: MC_SECIM[i] }, 2: { text: i === 0 ? 'Ben Ada Yılmaz, okul numaram 1453. Kerem\'in dediği gibi fren ısınır.' : 'Fren balatası ısınır.' } },
      mcResults: { 1: { correct: MC_SECIM[i] === 'B' } },
      reviews: { 2: { finalScore: ACIK_PUAN[i], decision: 'revised', aiScore: 5 } },
    };
  });
  const state: Any = {
    students: JSON.parse(JSON.stringify(OGRENCILER)),
    questions: [JSON.parse(JSON.stringify(MC)), JSON.parse(JSON.stringify(ACIK))],
    rubrics: { 2: { maxScore: 10, criteria: [] } },
    exam: { questionIds: [1, 2], targetClass: '7-A', startsAt: new Date(2026, 10, 3, 9, 30).getTime() },
    exams: [{ id: 7, title: 'Fen 1' }],
    activeExamId: 7,
    ...ek,
  };
  return { state, oturumlar, f: kur(state, oturumlar) };
}

describe('§124 madde geçmişi — §121 saf fonksiyonlarıyla, elle hesaplanmış örnek', () => {
  it('ÇSS: p = 3/5, d = 1 (n=5: yarı gruplar 2+2); açık uçlu: güçlük 0,52, r = 27/√804', () => {
    const { state, f } = sinif();
    expect(f.maddeGecmisiniIsle()).toBe(2);
    const mc = state.questions[0].maddeGecmisi;
    const ac = state.questions[1].maddeGecmisi;
    expect(mc).toHaveLength(1);
    expect(mc[0]).toMatchObject({ tarih: '2026-11-03', sube: '7-A', n: 5, gucluk: 0.6, ayirt: 1, olcu: 'd' });
    // Elle: açık puan ort. 26/5 = 5,2 → /10 = 0,52. ÇSS puanı 5/0; sapma çarpımları toplamı 27,
    // kareler 26,8 ve 30 → r = 27/√804 = 0,95221 → 3 basamak 0,952.
    expect(ac[0]).toMatchObject({ n: 5, gucluk: 0.52, olcu: 'r' });
    expect(ac[0].ayirt).toBeCloseTo(27 / Math.sqrt(804), 3);
    expect(ac[0].anahtar).toBe(mc[0].anahtar);
    expect(state.exams[0].maddeGecmisiAnahtari).toBe(mc[0].anahtar);
  });

  it('kayıtta öğrenci bilgisi YOK: yalnız beyaz listedeki anahtarlar; ad, numara, yanıt metni geçmez', () => {
    const { state, f } = sinif();
    f.maddeGecmisiniIsle();
    const json = JSON.stringify(state.questions.map((q: Any) => q.maddeGecmisi));
    for (const k of state.questions[1].maddeGecmisi.concat(state.questions[0].maddeGecmisi)) {
      expect(Object.keys(k).sort()).toEqual(['anahtar', 'ayirt', 'gucluk', 'imza', 'n', 'olcu', 'sube', 'tarih']);
    }
    for (const yasak of ['Ada', 'Yılmaz', 'Kerem', '1453', 'Fren', 'sid', 'name', 'selectedKey', 'finalScore']) {
      expect(json.includes(yasak), yasak).toBe(false);
    }
  });

  it('yalnız onaylı puan: onaysız açık uçlu yanıtı olan öğrenci açık uçlu satırına girmez', () => {
    const { state, oturumlar, f } = sinif();
    delete oturumlar[5].reviews[2];
    f.maddeGecmisiniIsle();
    expect(state.questions[1].maddeGecmisi[0].n).toBe(4);
    expect(state.questions[0].maddeGecmisi[0].n).toBe(5);   // ÇSS anahtarla puanlanır
  });

  it('aynı sınav yeniden yayınlanınca kendi satırı güncellenir, çoğalmaz; başka sınav eklenir', () => {
    const { state, oturumlar, f } = sinif();
    f.maddeGecmisiniIsle();
    oturumlar[4].answers[1].selectedKey = 'B'; oturumlar[4].mcResults[1].correct = true;
    f.maddeGecmisiniIsle();
    expect(state.questions[0].maddeGecmisi).toHaveLength(1);
    expect(state.questions[0].maddeGecmisi[0].gucluk).toBe(0.8);
    state.exams.push({ id: 8 }); state.activeExamId = 8;
    f.maddeGecmisiniIsle();
    expect(state.questions[0].maddeGecmisi).toHaveLength(2);
  });

  it('sınır: en çok MADDE_GECMISI_LIMIT satır, en eskisi düşer', () => {
    const { f } = sinif();
    let l: Any[] = [];
    for (let i = 0; i < 45; i++) l = f.maddeGecmisineEkle(l, { anahtar: 's' + i, n: 1 });
    expect(l).toHaveLength(40);
    expect(l[0].anahtar).toBe('s5');
  });

  it('ortak yazılı sınavda şube yazılmaz (§119, madde 11)', () => {
    const { state, f } = sinif();
    state.exam.ortakSinav = true;
    f.maddeGecmisiniIsle();
    expect(state.questions[0].maddeGecmisi[0]).toMatchObject({ sube: '', ortak: true });
  });

  it('eski kayıt: alan yoksa geçmiş boş; rozet, not ve ayrıntı "" (göç yok, hata yok)', () => {
    const { state, f } = sinif();
    const q = state.questions[0];
    expect(q.maddeGecmisi).toBeUndefined();
    expect(f.maddeGecmisiOzeti(q)).toBeNull();
    expect(f.maddeGecmisiRozetiHtml(q)).toBe('');
    expect(f.guclukUyumsuzlukNotuHtml(q)).toBe('');
    expect(f.maddeGecmisiAyrintiHtml(q)).toBe('');
  });

  it('özet n ağırlıklı; soru sonradan düzenlenince eski satırlar özete girmez, tabloda işaretli', () => {
    const { f } = sinif();
    const q: Any = JSON.parse(JSON.stringify(MC));
    const imza = f.maddeGecmisiImza(q);
    q.maddeGecmisi = [
      { anahtar: 'a', tarih: '2026-10-01', sube: '7-A', n: 10, gucluk: 0.5, ayirt: 0.2, olcu: 'd', imza },
      { anahtar: 'b', tarih: '2026-10-08', sube: '7-B', n: 30, gucluk: 0.9, ayirt: 0.4, olcu: 'd', imza },
      { anahtar: 'c', tarih: '2026-09-01', sube: '7-C', n: 25, gucluk: 0.1, ayirt: -0.3, olcu: 'd', imza: 'eski' },
    ];
    const o = f.maddeGecmisiOzeti(q);
    expect(o).toMatchObject({ sinav: 2, n: 40, eskiSurum: 1, olcu: 'd' });
    expect(o.gucluk).toBeCloseTo((0.5 * 10 + 0.9 * 30) / 40, 12);   // 0,8
    expect(o.ayirt).toBeCloseTo((0.2 * 10 + 0.4 * 30) / 40, 12);    // 0,35
    expect(f.maddeGecmisiRozetiHtml(q)).toContain('2 sınav · n 40 · p 0,80 · d 0,35');
    const ay = f.maddeGecmisiAyrintiHtml(q);
    expect(ay).toContain('Kullanım geçmişi (3 sınav)');
    expect(ay).toContain('soru bu tarihten sonra düzenlendi');
    expect(ay).toContain('<caption>');
    expect(ay.indexOf('08.10.2026')).toBeLessThan(ay.indexOf('01.10.2026'));   // yeni üstte
  });
});

describe('§124 etiket–gözlem notu (n ≥ 20; etiket kendiliğinden değişmez)', () => {
  const satir = (n: number, gucluk: number, imza: string) => ({ anahtar: 'x' + n, tarih: '2026-11-01', sube: '7-A', n, gucluk, ayirt: 0.3, olcu: 'd', imza });

  it('sınırlar: p > 0,70 kolay, p < 0,30 zor, arası orta (pYorum ile aynı)', () => {
    const { f } = sinif();
    expect(f.gozlenenGuclukDuzeyi(0.71)).toBe('easy');
    expect(f.gozlenenGuclukDuzeyi(0.70)).toBe('medium');
    expect(f.gozlenenGuclukDuzeyi(0.30)).toBe('medium');
    expect(f.gozlenenGuclukDuzeyi(0.29)).toBe('hard');
    expect(f.gozlenenGuclukDuzeyi(null)).toBeNull();
  });

  it('n = 19: not yok; n = 20 ve etiket "Zor", gözlenen 0,85: not görünür, etiket aynı kalır', () => {
    const { f } = sinif();
    const q: Any = JSON.parse(JSON.stringify(MC));
    const imza = f.maddeGecmisiImza(q);
    q.maddeGecmisi = [satir(19, 0.85, imza)];
    expect(f.guclukUyumsuzlugu(q)).toBeNull();
    expect(f.guclukUyumsuzlukNotuHtml(q)).toBe('');
    q.maddeGecmisi = [satir(12, 0.85, imza), satir(8, 0.85, imza)];
    const u = f.guclukUyumsuzlugu(q);
    expect(u).toMatchObject({ etiket: 'hard', gozlenen: 'easy', n: 20, sinav: 2 });
    const not = f.guclukUyumsuzlukNotuHtml(q);
    expect(not).toContain('“Zor” (yapay zekâ önerisi)');
    expect(not).toContain('0,85 → kolay');
    expect(not).toContain('kendiliğinden değişmez');
    expect(f.maddeGecmisiRozetiHtml(q)).toContain('etiket ≠ gözlenen güçlük');
    expect(q.difficulty).toBe('hard');
  });

  it('uyuşan etiket, etiketsiz soru ve eski sürüm satırları not üretmez; elle yazılan soruda "yapay zekâ" denmez', () => {
    const { f } = sinif();
    const q: Any = JSON.parse(JSON.stringify(MC));
    const imza = f.maddeGecmisiImza(q);
    q.maddeGecmisi = [satir(30, 0.2, imza)];
    expect(f.guclukUyumsuzlugu(q)).toBeNull();                       // zor = zor
    q.maddeGecmisi = [satir(30, 0.9, 'eski')];
    expect(f.guclukUyumsuzlugu(q)).toBeNull();                       // düzenlenmiş sürüm
    q.maddeGecmisi = [satir(30, 0.9, imza)];
    expect(f.guclukUyumsuzlugu({ ...q, difficulty: '' })).toBeNull();
    expect(f.guclukUyumsuzlukNotuHtml({ ...q, yazan: 'insan' })).not.toContain('yapay zekâ');
  });

  it('geçmiş kodu etiketi, puanı ya da onayı yazmaz; model çağırmaz', () => {
    const govde = blok('§124 — KALICI MADDE GEÇMİŞİ', '§101 — SINAV GÜVENİRLİĞİ');
    for (const yasak of ['.difficulty =', 'finalizeReview(', 'writeSession(', 'apiPost(', 'fetch(', 'auditKaydet(', '.status =']) {
      expect(govde.includes(yasak), yasak).toBe(false);
    }
  });

  it('geçmiş yalnız publishResults içinde ve allOpensReviewed kapısından SONRA yazılır', () => {
    const g = fonksiyonMetni('publishResults');
    expect(g.indexOf('if (!allOpensReviewed()) return;')).toBeGreaterThan(0);
    expect(g.indexOf('maddeGecmisiniIsle()')).toBeGreaterThan(g.indexOf('allOpensReviewed'));
    expect(app.match(/(?<!function )maddeGecmisiniIsle\(\)/g)!.length).toBe(1);   // tanım dışında tek çağrı
  });
});

describe('§124 rubrik örnek yanıtları', () => {
  it('temizlik: kayıtlı adlar → [ÖĞRENCİ], "okul numaram" ve öğrencinin okul no\'su → [NUMARA]', () => {
    const { f } = sinif();
    const r = f.ornekYanitTemizle('Ben Ada Yılmaz, okul numaram 1453. Kerem\'in dediği gibi; no 1453 değil 14530.', OGRENCILER, OGRENCILER[0]);
    expect(r.degisti).toBe(true);
    expect(r.metin).not.toMatch(/Ada|Yılmaz|Kerem/);
    expect(r.metin).toContain('[ÖĞRENCİ]');
    expect(r.metin).toContain('okul numaram [NUMARA]');
    expect(r.metin).toContain('no [NUMARA] değil 14530');   // tam sayı eşleşmesi; 14530 ayrı sayı
    const temiz = f.ornekYanitTemizle('Fren balatası ısınır.', OGRENCILER, OGRENCILER[1]);
    expect(temiz).toEqual({ metin: 'Fren balatası ısınır.', degisti: false });
  });

  it('kayıt doğrulaması: boş, uzun, aralık dışı ve yarım olmayan puan reddedilir; kayıtta öğrenci kimliği yok', () => {
    const { f } = sinif();
    expect(f.ornekYanitKaydi('  ', 5, 10, '2026-11-07', 'a').hata).toMatch(/boş/);
    expect(f.ornekYanitKaydi('x'.repeat(2001), 5, 10, '2026-11-07', 'a').hata).toMatch(/2000/);
    expect(f.ornekYanitKaydi('metin', 11, 10, 'g', 'a').hata).toMatch(/yarım puan/);
    expect(f.ornekYanitKaydi('metin', 2.25, 10, 'g', 'a').hata).toMatch(/yarım puan/);
    const k = f.ornekYanitKaydi(' metin ', '7.5', 10, '2026-11-07', 'oy1').kayit;
    expect(k).toEqual({ id: 'oy1', puan: 7.5, tavan: 10, metin: 'metin', tarih: '2026-11-07' });
  });

  it('sınır 12; düzeyler yüksekten düşüğe; HTML kaçışlı, "yapay zekâya gönderilmez" yazar, silme düğmesi adlı', () => {
    const { f } = sinif();
    let l: Any[] = [];
    for (let i = 0; i < 12; i++) l = f.ornekYanitEkle(l, { id: 'o' + i, puan: i % 3 === 0 ? 8 : 4, tavan: 10, metin: '<b>m' + i + '</b>' });
    expect(f.ornekYanitEkle(l, { id: 'fazla' })).toBeNull();
    const g = f.ornekYanitGruplari(l);
    expect(g.map((x: Any) => x.puan)).toEqual([8, 4]);
    expect(g[0].ornekler).toHaveLength(4);
    const html = f.ornekYanitlarHtml({ id: 2, ornekYanitlar: l });
    expect(html).toContain('8 / 10 puan düzeyi');
    expect(html).toContain('yapay zekâya gönderilmez');
    expect(html).toContain('&lt;b&gt;m0&lt;/b&gt;');
    expect(html).not.toContain('<b>m0</b>');
    expect(html).toContain('aria-label="Örneği sil (8 / 10 düzeyi)"');
    expect(f.ornekYanitlarHtml({ id: 2 })).toBe('');
    expect(f.ornekYanitPaneliHtml([{ id: 1 }, { id: 2 }])).toBe('');
  });

  it('onaylı kart alanı: yalnız onaylı + metinli yanıtta düğme; taslakta temizlenmiş metin ve etiketli alanlar', () => {
    const { state, oturumlar, f } = sinif();
    const q = state.questions[1];
    const rv = oturumlar[1].reviews[2];
    expect(f.ornekYanitAlaniHtml(q, OGRENCILER[0], null)).toBe('');                       // onaysız
    expect(f.ornekYanitAlaniHtml(q, OGRENCILER[0], rv)).toContain('Örnek yanıt olarak işaretle');
    oturumlar[2].answers[2].text = '  ';
    expect(f.ornekYanitAlaniHtml(q, OGRENCILER[1], oturumlar[2].reviews[2])).toBe('');     // boş yanıt
    const temiz = f.ornekYanitTemizle(oturumlar[1].answers[2].text, OGRENCILER, OGRENCILER[0]);
    f.taslak({ qid: 2, sid: 1, metin: temiz.metin, degisti: true, puan: 8, tavan: 10, hata: '' });
    const t = f.ornekYanitAlaniHtml(q, OGRENCILER[0], rv);
    expect(t).toContain('<label class="oy-etiket" for="oyMetin-2-1">');
    expect(t).toContain('id="oyPuan-2-1"');
    expect(t).toContain('[ÖĞRENCİ]');
    expect(t).not.toMatch(/Ada|Yılmaz|1453/);
    expect(t).toContain('Örnek olarak kaydet');
    expect(t).toContain('yapay zekâya gönderilmez');
  });

  it('kaydetme yalnız açık tıklamayla: ekleme tek yerde, ornekYanitKaydet içinde; işaretleme kaydetmez', () => {
    const atamalar = app.match(/q\.ornekYanitlar = /g) || [];
    expect(atamalar.length).toBe(3);   // kaydet + sil + §130 KVKK öğrenci silme (yalnız süzer, eklemez)
    expect(fonksiyonMetni('ogrenciVerisiniSil')).toContain('q.ornekYanitlar = q.ornekYanitlar.filter(');
    expect(fonksiyonMetni('ornekYanitKaydet')).toContain('q.ornekYanitlar = yeni;');
    expect(fonksiyonMetni('ornekYanitSil')).toContain('onaylaModal(');
    const wire = fonksiyonMetni('wireOrnekYanit');
    const isaretle = wire.slice(wire.indexOf('.js-ornek-isaretle'), wire.indexOf('.oy-metin-girdi'));
    expect(isaretle).not.toContain('ornekYanitlar');
  });

  it('modele GÖNDERİLMEZ: hiçbir apiPost gövdesi ornekYanitlar/maddeGecmisi ya da soru nesnesinin tamamını taşımaz', () => {
    const cagrilar = app.split('apiPost(AI_API.').slice(1);
    expect(cagrilar.length).toBeGreaterThanOrEqual(7);
    for (const c of cagrilar) {
      const govde = c.slice(0, c.indexOf('});') + 3);
      expect(govde).not.toMatch(/ornekYanit|maddeGecmisi|capa/);
      expect(govde).not.toMatch(/:\s*q\s*[,}]/);           // soru nesnesi bütün olarak gitmez
      expect(govde).not.toMatch(/:\s*rub(ric)?\s*[,}]/);   // rubrik nesnesi bütün olarak gitmez
    }
    const ev = fonksiyonMetni('aiEvaluate');
    const g = ev.slice(ev.indexOf('apiPost(AI_API.evaluate'), ev.indexOf('});', ev.indexOf('apiPost(AI_API.evaluate')));
    expect(g).toContain('criteria: rubric.criteria.map(');
  });
});

describe('§124 × §111 anonim araştırma paketi: iki alan da DIŞARIDA', () => {
  it('paket beyaz listeyle kurulur; madde geçmişi, örnek metni ve şube pakette yok', async () => {
    const sabitMetni = arasi('const ARASTIRMA_ALANLARI = ', '\n/** §112');
    const kod = ['sha256Hex', 'arastirmaKriterFarklari', 'arastirmaPaketi'].map(fonksiyonMetni).join('\n');
    // eslint-disable-next-line no-new-func
    const p = new Function('state', 'const AUDIT_ETIKET = { puan_karari: { aktor: "öğretmen" } };\n' + sabitMetni + '\n' + kod +
      '\nreturn { arastirmaPaketi };')({ auditDusen: 0 }) as Record<string, Any>;
    const q: Any = {
      ...JSON.parse(JSON.stringify(ACIK)),
      maddeGecmisi: [{ anahtar: 'sGizli', tarih: '2026-11-03', sube: '7-Z', n: 23, gucluk: 0.523, ayirt: 0.417, olcu: 'r', imza: 'imzaX' }],
      ornekYanitlar: [{ id: 'oyGizli', puan: 8, tavan: 10, metin: 'Örnek metni balata ısınması', tarih: '2026-11-07' }],
    };
    const gunluk = [{ tur: 'puan_karari', at: 1793955600000, qid: 2, sid: 1, aiScore: 5, finalScore: 8, not: 'x' }];
    const paket = await p.arastirmaPaketi(gunluk, [q], 'tuz');
    const json = JSON.stringify(paket);
    for (const yasak of ['maddeGecmisi', 'ornekYanit', 'sGizli', 'oyGizli', '7-Z', 'imzaX', '0.523', '0.417', 'balata', 'Sürtünme']) {
      expect(json.includes(yasak), yasak).toBe(false);
    }
    expect(paket.kayitlar[0]).toMatchObject({ tur: 'puan_karari', soruTuru: 'open', puanFarki: 3 });
  });
});

describe('§124 gizlilik metni (AGENTS §7)', () => {
  it('privacy-policy toplu istatistiği ve örnek yanıtın temizlenip yapay zekâya gitmediğini yazar', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('toplu madde istatistiği');
    expect(pp).toContain('rubrik örneği');
    expect(pp).toMatch(/yapay zekâya gönderilmez, tam yedeğe \(\.mihenk\) girer, anonim\s+araştırma paketine girmez/);
  });
});
