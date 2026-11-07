// ============================================================================
// §131 — Zümre çift puanlama (fikir 1). İki öğretmen aynı yanıtları bağımsız
// puanlar; dosya ile, hesap ve sunucu yok. Ölçülen:
//   · paket ad / kimlik / YZ önerisi / ilk puan taşımaz (kör);
//   · karesel ağırlıklı kappa elle hesaplanmış küçük örnekle (7/11);
//   · bozuk, başka sınava ait, yabancı paket reddedilir, state değişmez (§128 deseni);
//   · dönüş hiçbir öğretmen kararını değiştirmez (AGENTS §1);
//   · CSV hücreleri csvHucre'den geçer, ad yok.
// İstemci kodu public/app.js metninden alınıp yalıtılmış kapsamda kurulur.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

/** Fonksiyon metni. Tek satırlık tanım ("{ ... }" aynı satırda kapanır) yalnız o satırdır. */
function islev(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const satirSonu = app.indexOf('\n', bas + 1);
  const ilk = app.slice(bas + 1, satirSonu);
  if (/\}\s*$/.test(ilk) && (ilk.match(/\{/g) || []).length === (ilk.match(/\}/g) || []).length) return ilk + '\n';
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const CIFT_FN = ['ciftSabitleri', 'ciftKayitlari', 'ciftOlcutleri', 'ciftEkMaske', 'ciftPaketHazirla', 'ciftHata', 'ciftSayiMi', 'ciftPaketCoz',
  'ciftGelenDogrula', 'ciftPuanHesapla', 'ciftDonusPaketi', 'ciftDonusDogrula', 'ciftAPuani', 'ciftDonusUygula', 'ciftUyumRaporu',
  'ciftUyumCsv', 'ciftDosyaIsle', 'ciftPuanliSayisi', 'ciftYuzde'];
const DIGER_FN = ['yzDenetimSabitleri', 'qwk', 'yarimPuanKategori', 'kriterPuani', 'kriterPuanNormal', 'kriterToplami',
  'adsizNumaralar', 'adsizKaristir', 'adsizRastgele', 'hash32', 'kisiselDesen', 'kisiselAdKaliplari', 'kisiselMaskele',
  'durumTurUyar', 'ondalikTr', 'csvHucre', 'csvSayi'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function kur(state: Any) {
  const kod =
    'var gunluk = []; function auditKaydet(tur, d) { gunluk.push(Object.assign({ tur: tur }, d)); }\n' +
    'var kayitSayac = 0; function saveSoon() { kayitSayac++; }\n' +
    'var cakisma = null; function itirazCakismaVar() { return !!cakisma; }\n' +
    'var ITIRAZ_CAKISMA_METNI = "çakışma";\n' +
    'function readSession(sid) { return (state._oturum || {})[sid] || {}; }\n' +
    ['KISISEL_HARF_SINIFI', 'KISISEL_EK', 'KISISEL_SOZCUK_ADLAR', 'CIFT_BICIM', 'CIFT_SURUM', 'CIFT_DOSYA_EN_BUYUK',
      'CIFT_METIN_SINIRI', 'CIFT_PUANLAYICI_SINIRI', 'CIFT_KIMLIK_DESENI'].map(sabit).join('\n') + '\n' +
    [...CIFT_FN, ...DIGER_FN].map(islev).join('\n') +
    '\nreturn { ' + [...CIFT_FN, ...DIGER_FN].join(', ') +
    ', gunluk: function () { return gunluk; }, kayitSayac: function () { return kayitSayac; }, cakismaYap: function (v) { cakisma = v; } };';
  // eslint-disable-next-line no-new-func
  return new Function('state', 'escapeHtml', kod)(state, esc);
}

const OGRENCILER = [
  { id: 1, name: 'Ada Yılmaz', sinif: '7-A' },
  { id: 2, name: 'Kerem Aydın', sinif: '7-A' },
  { id: 3, name: 'Elif Şahin', sinif: '7-A' },
];
const SORULAR = [
  { id: 101, type: 'mc', body: 'Çoktan seçmeli' },
  { id: 102, type: 'open', body: 'Kuvveti açıklayın.' },
  { id: 103, type: 'open', body: 'Sürtünmeye örnek verin.' },
];
const RUBRIK = {
  102: { maxScore: 10, criteria: [{ label: 'Kavram', weight: 60, description: 'Doğru tanım' }, { label: 'Örnek', weight: 40 }] },
  103: { maxScore: 4, criteria: [] },
};
/** A'nın cihazı: 3 öğrenci, iki açık uçlu; Elif 103'ü boş bıraktı; A'nın kararları ve YZ önerileri var. */
function aDurumu(): Any {
  const oturum: Any = {
    1: { answers: { 102: { text: 'Kuvvet itme ya da çekmedir. Kerem Aydın da öyle dedi.' }, 103: { text: 'Fren balatası' } },
      aiEvals: { 102: { aiScore: 7, breakdown: [{ label: 'Kavram', points: 5, max: 6 }, { label: 'Örnek', points: 2, max: 4 }] } },
      reviews: { 102: { finalScore: 7, decision: 'approved_as_is', aiScore: 7 }, 103: { finalScore: 3, decision: 'revised', aiScore: 4 } } },
    2: { answers: { 102: { text: 'Cisimleri hareket ettiren etki.' }, 103: { text: 'Kaygan zemin' } },
      aiEvals: { 102: { aiScore: 9, breakdown: [{ label: 'Kavram', points: 6, max: 6 }, { label: 'Örnek', points: 3, max: 4 }] } },
      reviews: { 102: { finalScore: 6, decision: 'revised', aiScore: 9, kriterler: [{ ad: 'Kavram', oneri: 6, nihai: 4, max: 6 }, { ad: 'Örnek', oneri: 3, nihai: 2, max: 4 }] },
        103: { finalScore: 2, decision: 'revised' } } },
    3: { answers: { 102: { text: 'Bilmiyorum, telefonum 0532 111 22 33' }, 103: { text: '   ' } },
      reviews: { 102: { finalScore: 1, decision: 'revised' } } },
  };
  return { activeExamId: 77, students: JSON.parse(JSON.stringify(OGRENCILER)), ciftPuanlama: [], _oturum: oturum };
}
function hazirla(f: Any, st: Any, kimlik = 'cp-00000000000000aa') {
  const r = f.ciftPaketHazirla({ sinav: { id: 77, baslik: '7-A Kuvvet' }, sorular: SORULAR, rubrikler: RUBRIK,
    ogrenciler: OGRENCILER, oturum: (sid: number) => st._oturum[sid], maskeListesi: OGRENCILER, tohum: 12345, kimlik, simdi: '2026-11-07T10:00:00.000Z' });
  st.ciftPuanlama = st.ciftPuanlama.concat([r.kayit]);
  return r;
}

describe('§131 karesel ağırlıklı kappa — elle hesaplanmış örnek', () => {
  /* Elle: A = [0; 0,5; 1; 1], B = [0; 1; 1; 0,5], tavan 1 → 0,5 adım kategorileri
     a = [0,1,2,2], b = [0,2,2,1], K = 3, w_ij = (i−j)²/4.
     Gözlenen: (1,2) ve (2,1) hücreleri birer → Σ w·O = 1/4 + 1/4 = 0,5.
     Marjinaller: a = b = (1, 1, 2), n = 4. Beklenen: Σ w·a_i·b_j/n =
       [i=0: 0,25·1 + 1·2] + [i=1: 0,25·1 + 0,25·2] + [i=2: 1·1 + 0,25·1]·2 = (2,25 + 0,75 + 2,5)/4 = 1,375.
     κ = 1 − 0,5/1,375 = 7/11 ≈ 0,6364.
     Sağlama (sayısal biçim): 1 − Σ(x−y)² / ((1/n)·ΣΣ(x_i−y_j)²) = 1 − 2/(22/4) = 7/11. */
  const kayit = {
    sorular: [{ qid: 1, no: 1, max: 1, olcutler: [] }],
    ogeler: [1, 2, 3, 4].map((k) => ({ kod: k, sid: k, qid: 1 })),
    donus: { puanlar: [[0, 0], [0.5, 1], [1, 1], [1, 0.5]].map(([a, b], i) => ({ kod: i + 1, qid: 1, a, b, ak: null, bk: null })) },
  };
  it('κ = 7/11; tam uyum %50, en çok 0,5 puan fark %100', () => {
    const f = kur({});
    const r = f.ciftUyumRaporu(kayit, { altN: 1, ayrisan: 10 });
    expect(r.genel.qwk.deger).toBeCloseTo(7 / 11, 10);
    expect(r.sorular[0].qwk.deger).toBeCloseTo(7 / 11, 10);
    expect(r.genel.tamUyum).toBe(0.5);
    expect(r.genel.bitisikUyum).toBe(1);
    expect(r.genel.ortMutlak).toBeCloseTo(0.25, 10);
    // Sayısal biçimle aynı (kategoriler ×2 ölçekte).
    const x = [0, 1, 2, 2], y = [0, 2, 2, 1];
    const pay = x.reduce((t, v, i) => t + (v - y[i]) ** 2, 0);
    const payda = x.reduce((t, v) => t + y.reduce((u, w) => u + (v - w) ** 2, 0), 0) / x.length;
    expect(1 - pay / payda).toBeCloseTo(r.genel.qwk.deger, 12);
  });
  it('altN (§121: 20) altında kappa yok, yüzdeler var; ayrışanlar fark oranına göre', () => {
    const f = kur({});
    const r = f.ciftUyumRaporu(kayit);
    expect(r.altN).toBe(20);
    expect(r.genel.qwk).toBeNull();
    expect(r.genel.tamUyum).toBe(0.5);
    expect(r.ayrisanlar.map((a: Any) => [a.kod, a.fark])).toEqual([[2, 0.5], [4, -0.5]]);
  });
  it('herkes aynı puanı verdiyse kappa "hesaplanamaz" (uydurma sayı yok)', () => {
    const f = kur({});
    const k = { sorular: [{ qid: 1, no: 1, max: 4, olcutler: [] }], ogeler: [], donus: { puanlar: [1, 2, 3].map((i) => ({ kod: i, qid: 1, a: 2, b: 2 })) } };
    const r = f.ciftUyumRaporu(k, { altN: 1, ayrisan: 10 });
    expect(r.genel.qwk.deger).toBeNull();
    expect(r.genel.tamUyum).toBe(1);
  });
});

describe('§131 paket: kör ve adsız', () => {
  it('pakette ad, sid, YZ önerisi ve ilk puan yok; metindeki ad ve telefon maskeli; boş yanıt girmez', () => {
    const st = aDurumu();
    const f = kur(st);
    const r = hazirla(f, st);
    const metin = JSON.stringify(r.paket);
    for (const o of OGRENCILER) expect(metin).not.toContain(o.name);
    expect(metin).not.toMatch(/"sid"|aiScore|finalScore|reviews|breakdown|aiEvals|decision/);
    expect(metin).not.toContain('0532');
    expect(metin).toContain('telefonum [NUMARA]');
    expect(f.ciftEkMaske('yaz: ali.veli@okul.k12.tr ya da 0 (532) 111-22-33; 12 elma')).toBe('yaz: [E-POSTA] ya da [NUMARA]; 12 elma');
    expect(metin).toContain('[ÖĞRENCİ]');
    expect(r.bos).toBe(1);
    expect(r.paket.yanitlar).toHaveLength(5);
    expect(r.paket.sorular.map((s: Any) => [s.no, s.max, s.olcutler.map((c: Any) => c.max)])).toEqual([[2, 10, [6, 4]], [3, 4, []]]);
    // Aynı öğrenci iki soruda aynı numara; numaralar 1..3 (adsız mod karıştırması).
    const ogrNo = (sid: number) => r.kayit.ogeler.filter((o: Any) => o.sid === sid).map((o: Any) => o.kod);
    expect(new Set(ogrNo(1)).size).toBe(1);
    expect(new Set(ogrNo(2)).size).toBe(1);
    expect([...new Set(r.kayit.ogeler.map((o: Any) => o.kod))].sort()).toEqual([1, 2, 3]);
    expect(r.kayit.ogeler.find((o: Any) => o.sid === 3 && o.qid === 103)).toBeUndefined();
    // A'nın kaydı yanıt metni tutmaz.
    expect(JSON.stringify(r.kayit)).not.toContain('Fren');
  });
  it('B paketi açarken yalnız bilinen alanlar alınır (biri pakete puan eklese de B görmez)', () => {
    const st = aDurumu();
    const f = kur(st);
    const p = JSON.parse(JSON.stringify(hazirla(f, st).paket));
    p.yanitlar[0].aiScore = 9; p.yanitlar[0].aPuani = 7; p.aPuanlari = [7, 6]; p.sorular[0].ipucu = 'A 7 verdi';
    const g = f.ciftGelenDogrula(p);
    expect(g.ok).toBe(true);
    expect(JSON.stringify(g.temiz)).not.toMatch(/aiScore|aPuan|ipucu|A 7 verdi/);
  });
});

describe('§131 B puanlaması ve dönüş paketi', () => {
  it('ölçüt puanları toplanır ve tavana sınırlanır; geçersiz/boş ayrımı', () => {
    const f = kur({});
    const s = { max: 10, olcutler: [{ ad: 'K', max: 6 }, { ad: 'Ö', max: 4 }] };
    expect(f.ciftPuanHesapla(s, ['5', '2,5'])).toEqual({ ok: true, puan: 7.5, kriterler: [5, 2.5] });
    expect(f.ciftPuanHesapla(s, ['', ' '])).toEqual({ ok: true, bos: true });
    expect(f.ciftPuanHesapla(s, ['7', '1']).ok).toBe(false);   // ölçüt tavanı 6
    expect(f.ciftPuanHesapla(s, ['5', '']).ok).toBe(false);    // eksik ölçüt
    expect(f.ciftPuanHesapla({ max: 4, olcutler: [] }, ['3,5'])).toEqual({ ok: true, puan: 3.5, kriterler: null });
    expect(f.ciftPuanHesapla({ max: 4, olcutler: [] }, ['=1+1']).ok).toBe(false);
  });
  it('dönüş paketinde yanıt metni yok; puansız yanıt girmez', () => {
    const f = kur({});
    const kayit = { id: 'cp-00000000000000aa', yon: 'gelen', examId: 77, baslik: 'S', puanlayici: 'Zümre',
      sorular: [{ qid: 102, no: 2, max: 10, olcutler: [] }],
      yanitlar: [{ kod: 1, qid: 102, metin: 'GİZLİ METİN' }, { kod: 2, qid: 102, metin: 'öteki' }], puanlar: { '1|102': { puan: 6, kriterler: null } } };
    const d = f.ciftDonusPaketi(kayit, 'z');
    expect(d.asama).toBe('puanlandi');
    expect(d.puanlar).toEqual([{ kod: 1, qid: 102, puan: 6, kriterler: null }]);
    expect(JSON.stringify(d)).not.toContain('GİZLİ');
  });
});

describe('§131 uçtan uca (iki cihaz) + reddetme, state değişmez', () => {
  function turAt() {
    const a = aDurumu();
    const fa = kur(a);
    const r = hazirla(fa, a);
    const b: Any = { ciftPuanlama: [], activeExamId: null };
    const fb = kur(b);
    const ac = fb.ciftDosyaIsle(JSON.stringify(r.paket));
    expect(ac.ok, ac.hata).toBe(true);
    const gelen = b.ciftPuanlama[0];
    // B kör puanlar: 102 ölçütlü, 103 toplam.
    for (const y of gelen.yanitlar) {
      const s = gelen.sorular.find((x: Any) => x.qid === y.qid);
      const deger = s.olcutler.length ? ['4', '2'] : ['3'];
      const h = fb.ciftPuanHesapla(s, deger);
      gelen.puanlar[y.kod + '|' + y.qid] = { puan: h.puan, kriterler: h.kriterler };
    }
    gelen.puanlayici = '=HYPERLINK("http://x")';
    const donus = fb.ciftDonusPaketi(gelen, '2026-11-07T12:00:00.000Z');
    return { a, fa, b, fb, r, donus };
  }
  it('A dönüşü alır: rapor çıkar, A\'nın hiçbir kararı değişmez (AGENTS §1)', () => {
    const { a, fa, donus } = turAt();
    const once = JSON.stringify(a._oturum);
    const s = fa.ciftDosyaIsle(JSON.stringify(donus));
    expect(s.ok, s.hata).toBe(true);
    expect(JSON.stringify(a._oturum)).toBe(once);
    const k = a.ciftPuanlama[0];
    expect(k.donus.puanlar).toHaveLength(5);
    // A'nın ölçütleri: Ada "YZ ile aynı" → döküm [5,2]; Kerem düzeltti → [4,2]; Elif yok.
    const ak = (sid: number) => k.donus.puanlar.find((x: Any) => x.qid === 102 && x.kod === k.ogeler.find((o: Any) => o.sid === sid && o.qid === 102).kod).ak;
    expect(ak(1)).toEqual([5, 2]);
    expect(ak(2)).toEqual([4, 2]);
    expect(ak(3)).toBeNull();
    const rap = fa.ciftUyumRaporu(k, { altN: 1, ayrisan: 10 });
    expect(rap.n).toBe(5);
    const kavram = rap.olcutler.find((o: Any) => o.ad === 'Kavram');
    expect(kavram.n).toBe(2);            // Elif'in ölçüt puanı yok
    expect(kavram.tamUyum).toBe(0.5);    // Kerem 4=4, Ada 5≠4
    expect(rap.ayrisanlar[0].oran).toBeGreaterThanOrEqual(rap.ayrisanlar[rap.ayrisanlar.length - 1].oran);
    expect(fa.gunluk().map((g: Any) => g.tur)).toEqual(['cift_donus_alindi']);
    const csv = fa.ciftUyumCsv(k);
    for (const o of OGRENCILER) expect(csv).not.toContain(o.name);
    expect(csv).toContain(`'=HYPERLINK`);           // csvHucre nötrledi
    expect(csv).not.toMatch(/;=HYPERLINK|^=/m);
  });
  it('bozuk, başka sınava ait, yabancı, karışık paketler reddedilir; A\'nın state\'i bayt bayt aynı', () => {
    const { a, fa, b, fb, r, donus } = turAt();
    const once = JSON.stringify(a);
    const kotu = (deg: (d: Any) => void) => { const d = JSON.parse(JSON.stringify(donus)); deg(d); return JSON.stringify(d); };
    const durumlar: [string, string][] = [
      ['{bozuk', 'okunamadı'],
      ['', 'boş'],
      [JSON.stringify({ bicim: 'baska' }), 'paketi değil'],
      [kotu((d) => { d.surum = 2; }), 'sürümü'],
      [kotu((d) => { d.paketId = 'cp-ffffffffffffffff'; }), 'hazırlanmadı'],
      [kotu((d) => { d.sinav.examId = 78; }), 'uyuşmuyor'],
      [kotu((d) => { d.puanlar[0].kod = 99; }), 'ait değil'],
      [kotu((d) => { d.puanlar[1] = JSON.parse(JSON.stringify(d.puanlar[0])); }), 'ait değil'],
      [kotu((d) => { d.puanlar.push(JSON.parse(JSON.stringify(d.puanlar[0]))); }), 'gönderilenden çok'],
      [kotu((d) => { d.puanlar[0].puan = 999; }), 'arasında değil'],
      [kotu((d) => { const x = d.puanlar.find((p: Any) => p.kriterler); x.puan = x.puan - 1; }), 'toplamıyla'],
      [kotu((d) => { d.puanlar = []; }), 'hiç puan yok'],
      [JSON.stringify(r.paket), 'siz hazırladınız'],
    ];
    for (const [metin, parca] of durumlar) {
      const s = fa.ciftDosyaIsle(metin);
      expect(s.ok, parca).toBe(false);
      expect(s.hata).toContain(parca);
      expect(JSON.stringify(a)).toBe(once);
    }
    // Başka sınav açıkken: "önce o sınavı seçin", hiçbir şey değişmez.
    a.activeExamId = 80;
    const once2 = JSON.stringify(a);
    const s2 = fa.ciftDosyaIsle(JSON.stringify(donus));
    expect(s2.ok).toBe(false);
    expect(s2.hata).toContain('«7-A Kuvvet» sınavına ait');
    expect(JSON.stringify(a)).toBe(once2);
    // B kendi puanladığı paketi içe alamaz; dönüş paketini de açamaz.
    const oncB = JSON.stringify(b);
    expect(fb.ciftDosyaIsle(JSON.stringify(donus)).hata).toContain('sizin puanladığınız');
    expect(JSON.stringify(b)).toBe(oncB);
    // Sekme çakışması (§119): hiçbir şey yazılmaz.
    fa.cakismaYap({ neden: 'surum' });
    a.activeExamId = 77;
    const once3 = JSON.stringify(a);
    expect(fa.ciftDosyaIsle(JSON.stringify(donus)).ok).toBe(false);
    expect(JSON.stringify(a)).toBe(once3);
  });
  it('aynı paket B\'de ikinci kez açılınca puanlar korunur', () => {
    const { r, b, fb } = turAt();
    const once = JSON.stringify(b);
    const s = fb.ciftDosyaIsle(JSON.stringify(r.paket));
    expect(s.ok).toBe(true);
    expect(s.metin).toContain('zaten açık');
    expect(JSON.stringify(b)).toBe(once);
  });
});

describe('§131 kaynak sözleşmeleri', () => {
  it('rapor ve paket kodu YZ çağırmaz, puan yazmaz (finalizeReview/writeSession/apiPost yok)', () => {
    const bas = app.indexOf('§131 — ZÜMRE ÇİFT PUANLAMA');
    const son = app.indexOf('§121 — YZ PUANLAYICI DENETİMİ');
    const blok = app.slice(bas, son);
    expect(blok).not.toMatch(/finalizeReview\(|writeSession\(|apiPost\(|fetch\(|reviews\[[^\]]*\]\s*=/);
  });
  it('Puanlama sekmesinde ve sınavı olmayan öğretmende bölüm çizilir', () => {
    const r = islev('renderTeacher');
    expect(r).toMatch(/sinavYokHtml\(\) \+ \(state\.teacherTab === 3 \? ciftBolumuHtml\(\) : ""\)/);
    expect(r).toContain('notIpucuAyarHtml() + ciftBolumuHtml()');
    expect(r).toContain('wireCiftPuanlama();');
  });
  it('gizlilik politikası çift puanlama paketini anlatır (AGENTS §7)', () => {
    const pp = fs.readFileSync(path.join(kok, 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('Zümre çift puanlama');
    expect(pp).toContain('ikinci puanlayıcı paketi');
  });
});
