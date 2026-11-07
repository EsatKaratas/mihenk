// §122 — Adsız ve soru soru puanlama + kâğıda geri bildirim fişi (P4).
// İstemci kodu public/app.js metninden alınıp yalıtılmış kapsamda kurulur;
// onay kartı GERÇEK evalCardHtml'dir (taklit değil). Model çağrısı yok.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function arasi(bas: string, son: string): string {
  const i = app.indexOf(bas);
  const j = app.indexOf(son, i);
  expect(i, bas).toBeGreaterThan(0);
  expect(j, son).toBeGreaterThan(i);
  return app.slice(i, j);
}

const ADLAR = [
  'escapeHtml', 'ondalikTr', 'truncate', 'hash32', 'studentChip',
  'kriterAnahtari', 'kriterPuanNormal', 'kriterKaydi', 'kriterToplami', 'kriterDegisti', 'kriterNihaiDegeri',
  'kriterGirdiHtml', 'kriterDuzeltDugmesiHtml', 'kriterNotMetni',
  'evalCardHtml', 'doneCardHtml', 'demoTohumUyariHtml', 'feedbackDraftHtml', 'confBadge', 'injectionWarnHtml',
  'enjeksiyonKatla', 'enjeksiyonKalipBul', 'enjeksiyonIsareti', 'aiKaynakRozetiHtml', 'degerlendirmeDilUyarisiHtml',
  'puanTercihNormal', 'adsizRastgele', 'adsizKaristir', 'adsizNumaralar', 'adsizChipHtml', 'adsizCiz',
  'soruGruplari', 'soruGrubuBasHtml', 'puanKuyruguHtml', 'adsizOnayliKartHtml', 'puanAracCubuguHtml',
  // §124: onaylı kart ve soru soru grubu örnek yanıt alanını da çizer.
  'ornekYanitGruplari', 'ornekYanitlarHtml', 'ornekYanitAlaniHtml',
  'geriBildirimFisVerisi', 'geriBildirimFisiHtml',
];
const DONUS = ADLAR.concat(['_disari']);

const OGRENCILER = [
  { id: 1, name: 'Ada Yılmaz', sinif: '7-A' },
  { id: 2, name: 'Kerem Aydın', sinif: '7-A' },
  { id: 3, name: 'Elif Şahin', sinif: '7-A', yzIzniYok: true },
  { id: 4, name: 'Mert Koç', sinif: '7-A' },
];
const S1 = { id: 11, type: 'open', body: 'Sürtünme kuvvetini bir örnekle açıklayınız.', outcome: 'F.7.1.1' };
const S2 = { id: 12, type: 'open', body: 'Enerji dönüşümüne bir örnek veriniz.', outcome: 'F.7.1.2' };
const MC = { id: 13, type: 'mc', body: 'Hangisi?', outcome: 'F.7.1.3', correctKey: 'B' };
const BD = [
  { label: 'Kavram doğruluğu', weight: 50, points: 6, max: 10, reason: 'Kavram doğru.' },
  { label: 'Örnek', weight: 50, points: 5, max: 10, reason: 'Örnek kısmen uygun.' },
];
function ev(skor: number, guven: number) {
  return { aiScore: skor, confidence: guven, breakdown: BD, justification: 'Gerekçe metni.', studentFeedback: 'Örneğini genişlet.' };
}
// Yanıtlarda adın geçtiği durumlar da var (kâğıda adını yazan öğrenci).
const OTURUMLAR: Record<number, any> = {
  1: { answers: { 11: { text: "Ben Ada Yılmaz, sürtünme ısı açığa çıkarır." }, 12: { text: 'Pil kimyasal enerji verir.' } },
       aiEvals: { 11: ev(11, 0.9), 12: ev(9, 0.4) }, reviews: {} },
  2: { answers: { 11: { text: "Kerem'in cevabı: fren balataları." }, 12: { text: 'Barajda su potansiyel enerji.' } },
       aiEvals: { 11: ev(14, 0.6), 12: ev(16, 0.8) }, reviews: {} },
  3: { answers: { 11: { text: 'Kayan kutu yavaşlar.' }, 12: { text: 'Güneş paneli.' } },
       aiEvals: { 11: ev(12, 0.5), 12: ev(13, 0.7) }, reviews: {} },
  4: { answers: { 11: { text: 'Ellerimizi ovunca ısınır.' }, 12: { text: 'Rüzgâr türbini.' } },
       aiEvals: { 11: ev(15, 0.95), 12: ev(10, 0.3) }, reviews: {} },
};

function kur() {
  const state: any = {
    students: OGRENCILER,
    rubrics: {
      11: { maxScore: 20, criteria: [{ label: 'Kavram doğruluğu', weight: 50, description: 'Sürtünmeyi doğru tanımlar.' }, { label: 'Örnek', weight: 50 }] },
      12: { maxScore: 20, criteria: [{ label: 'Kavram doğruluğu', weight: 50 }, { label: 'Örnek', weight: 50 }] },
    },
  };
  const kod =
    arasi('const KISISEL_SOZCUK_ADLAR', 'function adMaskeNotuHtml(') + fonksiyonMetni('adMaskeNotuHtml') +
    arasi('const ENJEKSIYON_KALIPLARI', 'function enjeksiyonKatla(') +
    arasi('const PUAN_TERCIH_ANAHTAR', '/** SAF: kayıtlı tercih') +
    'var _kriterTaslak = {};\nvar _ornekTaslak = null;\nconst ORNEK_YANIT_LIMIT = 12;\nconst ORNEK_YANIT_UZUNLUK = 2000;\n' +   // §124
    'function readSession(sid) { return OTURUMLAR[sid] || {}; }\n' +
    'function aiKaynakMetinleri() { return []; }\nfunction dilTetikleyiciMetni() { return ""; }\n' +
    ADLAR.map(fonksiyonMetni).join('\n') +
    '\nconst _disari = { baglam: function () { return _adsizBaglam; }, acilan: _adsizAcilan };' +
    '\nreturn {' + DONUS.join(',') + '};';
  // eslint-disable-next-line no-new-func
  return new Function('state', 'OTURUMLAR', kod)(state, OTURUMLAR);
}

/** teacherTab3Html'in kurduğu bekleyen listesi (öğrenci × soru, güvene göre). */
function bekleyenler(f: any, adsizNo: Record<string, number> | null) {
  const liste: any[] = [];
  OGRENCILER.forEach((s) => [S1, S2].forEach((q) => liste.push({ student: s, q, ev: OTURUMLAR[s.id].aiEvals[q.id] })));
  if (adsizNo) liste.sort((a, b) => adsizNo[String(a.student.id)] - adsizNo[String(b.student.id)]);
  liste.sort((a, b) => a.ev.confidence - b.ev.confidence);
  return liste;
}
const ADLAR_VE_PARCALAR = ['Ada', 'Yılmaz', 'Kerem', 'Aydın', 'Elif', 'Şahin', 'Mert', 'Koç'];

describe('tercih: varsayılan kapalı, tek liste', () => {
  const f = kur();
  it('boş ya da bozuk kayıt → adsız kapalı, liste', () => {
    for (const h of [undefined, null, {}, 'x', { adsiz: 'true' }, { adsiz: 1, gorunum: 'tablo' }]) {
      expect(f.puanTercihNormal(h)).toEqual({ adsiz: false, gorunum: 'liste' });
    }
    expect(f.puanTercihNormal({ adsiz: true, gorunum: 'soru' })).toEqual({ adsiz: true, gorunum: 'soru' });
  });
  it('tercih kalıcı: ayrı localStorage anahtarı, try/catch ile (özel pencere bozmaz)', () => {
    const al = fonksiyonMetni('puanTercihAl'), kaydet = fonksiyonMetni('puanTercihKaydet');
    // §132: anahtar alana göre (demo alanı "-demo" ekli ayrı anahtar; test/demo-tercih-bant).
    expect(al).toContain('localStorage.getItem(puanTercihAnahtari())');
    expect(kaydet).toContain('localStorage.setItem(puanTercihAnahtari()');
    expect(fonksiyonMetni('puanTercihAnahtari')).toContain('PUAN_TERCIH_ANAHTAR +');
    expect(al).toMatch(/try \{/); expect(kaydet).toMatch(/try \{/);
    expect(fonksiyonMetni('adsizTohumAl')).toContain('sessionStorage');
  });
});

describe('karıştırma deterministik', () => {
  const f = kur();
  const ids = Array.from({ length: 30 }, (_, i) => i + 1);
  it('aynı tohum + aynı küme = aynı sıra; girdi sırasından bağımsız', () => {
    const a = f.adsizKaristir(ids, 12345);
    expect(f.adsizKaristir(ids, 12345)).toEqual(a);
    expect(f.adsizKaristir(ids.slice().reverse(), 12345)).toEqual(a);
    expect(a.slice().sort()).toEqual(ids.map(String).sort());   // permütasyon
    expect(a).not.toEqual(ids.map(String).sort());               // gerçekten karışık
  });
  it('başka tohum başka sıra', () => {
    expect(f.adsizKaristir(ids, 1)).not.toEqual(f.adsizKaristir(ids, 2));
  });
  it('numaralar 1..n birebir; sınava göre değişir, aynı sınavda sabit', () => {
    const m = f.adsizNumaralar(ids, 777, 'sinav-a');
    expect(Object.values(m).map(Number).sort((x, y) => x - y)).toEqual(ids);
    expect(f.adsizNumaralar(ids, 777, 'sinav-a')).toEqual(m);
    expect(f.adsizNumaralar(ids, 777, 'sinav-b')).not.toEqual(m);
    // Sınıf listesi sırası (1,2,3…) numaraya aynen geçmiyor.
    expect(ids.every((i) => m[String(i)] === i)).toBe(false);
  });
});

describe('adsız kuyruk: DOM metninde ad yok', () => {
  const f = kur();
  const no = f.adsizNumaralar(OGRENCILER.map((s) => s.id), 4242, 'sinav-1');
  for (const gorunum of ['liste', 'soru']) {
    it(gorunum + ' görünümünde: kayıtlı ad ve parçaları 0, her kartta "Yanıt N"', () => {
      const html = f.puanKuyruguHtml(bekleyenler(f, no), [S1, S2], { adsiz: true, gorunum }, no, OGRENCILER);
      for (const p of ADLAR_VE_PARCALAR) expect(html, p).not.toContain(p);
      expect((html.match(/class="eval-card"/g) || []).length).toBe(8);
      expect((html.match(/>Yanıt \d+</g) || []).length).toBe(8);
      expect(html).toContain('[ÖĞRENCİ]');                       // yanıttaki ad maskelendi
      // Onay düğmeleri aynen: hiçbir şey otomatik değil.
      expect((html.match(/approve-as-is/g) || []).length).toBe(8);
      expect((html.match(/revise-approve/g) || []).length).toBe(8);
      expect((html.match(/kr-ac/g) || []).length).toBe(8);       // §112 ölçüt düzeltme aynen
      expect(f._disari.baglam()).toBeNull();                      // bağlam sızmaz
    });
  }
  it('çizim hata verse de bağlam geri alınır', () => {
    expect(() => f.adsizCiz(no, OGRENCILER, () => { throw new Error('x'); })).toThrow('x');
    expect(f._disari.baglam()).toBeNull();
    expect(f.studentChip(OGRENCILER[0])).toContain('Ada Yılmaz');
  });
  it('onaylanmış kart: ad gizli + "Adı göster"; açılınca ad görünür', () => {
    const x = { student: OGRENCILER[1], q: S1, ev: OTURUMLAR[2].aiEvals[11],
      review: { finalScore: 13, comment: 'Kerem güzel örnek.', decision: 'revised', aiScore: 14 } };
    const kapali = f.adsizOnayliKartHtml(x, no, OGRENCILER);
    for (const p of ADLAR_VE_PARCALAR) expect(kapali, p).not.toContain(p);
    expect(kapali).toContain('adsiz-goster');
    expect(kapali).toMatch(/aria-label="Adı göster \(Yanıt \d+\)">Adı göster</);
    f._disari.acilan['11|2'] = true;
    const acik = f.adsizOnayliKartHtml(x, no, OGRENCILER);
    expect(acik).toContain('Kerem Aydın');
    expect(acik).toContain('Yanıt ' + no['2']);
    expect(acik).not.toContain('adsiz-goster');
  });
});

describe('eski akış değişmedi (adsız kapalı, tek liste)', () => {
  const f = kur();
  it('kuyruk = eskisi gibi evalCardHtml dizisi, aynı sıra, adlar görünür', () => {
    const b = bekleyenler(f, null);
    const yeni = f.puanKuyruguHtml(b, [S1, S2], f.puanTercihNormal({}), null, OGRENCILER);
    expect(yeni).toBe(b.map((x: any) => f.evalCardHtml(x.q, x.student, x.ev)).join(''));
    expect(yeni).toContain('Ada Yılmaz');
    expect(yeni).not.toContain('Yanıt ');
    expect(yeni).not.toContain('pk-grup');
  });
  it('teacherTab3Html: tercih yoksa eski ipucu metni ve doneCardHtml; onay işleyicileri §103/§112/§113 savunmalarıyla aynen', () => {
    const t = fonksiyonMetni('teacherTab3Html');
    expect(t).toContain('yapay zekânın en az emin olduğu yanıt en üstte');
    expect(t).toContain('adsizNo ? adsizOnayliKartHtml(x, adsizNo, gonderenler) : doneCardHtml(x.q, x.student, x.ev, x.review)');
    const w = fonksiyonMetni('wireTeacherTab3');
    expect(w).toContain('if (enjeksiyonIsareti(ev, ((ss.answers || {})[qid] || {}).text).var) return;');
    expect(w).toContain('if (kriterDegisti(qid, sid, ev)) return;');
    expect(w).toContain('finalizeReview(qid, Number(scoreEl.value), commentEl.value, "revised", sid, kriterler || undefined);');
    expect(w).toContain('wirePuanArac();');
  });
  it('onaylanmış kart saydam değil (axe kontrast): opacity yok, .eval-onayli var', () => {
    const d = fonksiyonMetni('doneCardHtml');
    expect(d).not.toMatch(/'<div class="eval-card" style="opacity/);
    expect(d).toContain('class="eval-card eval-onayli"');
    expect(fs.readFileSync(path.resolve(__dirname, '..', 'public', 'css', 'ogretmen.css'), 'utf8')).toContain('.eval-card.eval-onayli');
  });
  it('gizlilik metni fişi ve adsız tercihini anlatıyor (agents.md §7)', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('geri bildirim fişi');
    expect(pp).toContain('Adları gizle');
  });
  it('§122 kodu hiçbir puanı/onayı kendisi yazmaz', () => {
    const blok = arasi('const PUAN_TERCIH_ANAHTAR', 'function teacherTab3Html(');
    expect(blok).not.toMatch(/finalizeReview\(|writeSession\(|auditKaydet\(|aiEvaluate\(|apiPost\(/);
  });
});

describe('soru soru görünüm', () => {
  const f = kur();
  it('soruya göre gruplar (sınav sırası), grup içinde güven sırası korunur, kart kaybı yok', () => {
    const b = bekleyenler(f, null);
    const g = f.soruGruplari(b, [S1, S2]);
    expect(g.map((x: any) => x.q.id)).toEqual([11, 12]);
    expect(g.map((x: any) => x.sira)).toEqual([1, 2]);
    expect(g[0].ogeler.map((x: any) => x.ev.confidence)).toEqual([0.5, 0.6, 0.9, 0.95]);
    expect(g[1].ogeler.map((x: any) => x.ev.confidence)).toEqual([0.3, 0.4, 0.7, 0.8]);
    expect(g[0].ogeler.length + g[1].ogeler.length).toBe(b.length);
  });
  it('bekleyeni olmayan soru grubu çizilmez', () => {
    const b = bekleyenler(f, null).filter((x: any) => x.q.id === 12);
    expect(f.soruGruplari(b, [S1, S2]).map((x: any) => x.q.id)).toEqual([12]);
  });
  it('grup başında rubrik (öğretmenin ölçütleri), başlık bölümle bağlı', () => {
    const html = f.puanKuyruguHtml(bekleyenler(f, null), [S1, S2], { adsiz: false, gorunum: 'soru' }, null, OGRENCILER);
    expect((html.match(/<section class="pk-grup" aria-labelledby="pkGrup-(11|12)">/g) || []).length).toBe(2);
    expect(html).toContain('id="pkGrup-11">Soru 1');
    expect(html).toContain('Sürtünmeyi doğru tanımlar.');
    expect(html.indexOf('pkGrup-11')).toBeLessThan(html.indexOf('pkGrup-12'));
    expect((html.match(/class="eval-card"/g) || []).length).toBe(8);
  });
  it('araç çubuğu: anahtar role=switch ve açıklamalı; iki radyo; varsayılan seçili "Tek liste"', () => {
    const h = f.puanAracCubuguHtml(f.puanTercihNormal({}), false);
    expect(h).toMatch(/<input type="checkbox" id="pkAdsiz" role="switch" aria-describedby="pkAdsizNot">/);
    expect(h).toContain('value="liste" checked');
    expect(h).not.toContain('value="soru" checked');
    expect(f.puanAracCubuguHtml({ adsiz: true, gorunum: 'soru' }, true)).toContain('Kâğıt sınavda ad kâğıdın üzerindedir');
  });
});

describe('geri bildirim fişi: yalnız onaylı içerik', () => {
  const f = kur();
  const sorular = [MC, { ...S1, maxScore: 20 }, { ...S2, maxScore: 20 }];
  const oturum = {
    kaynak: 'kagit',
    answers: { 13: { selectedKey: 'C' }, 11: { text: 'Yanıt metni öğrenciye ait.' } },
    mcResults: { 13: { correct: false } },
    reviews: { 11: { finalScore: 12.5, comment: 'Örneğin güzel, tanımı genişlet.', decision: 'revised', aiScore: 14,
      kriterler: [{ ad: 'Kavram doğruluğu', oneri: 7, nihai: 6, max: 10 }, { ad: 'Örnek', oneri: 7, nihai: 6.5, max: 10 }] } },
    // S2 için yalnız ONAYSIZ YZ önerisi var: fişe hiçbir izi girmemeli.
    aiEvals: { 11: { aiScore: 14, justification: 'YZ_GEREKCE_11', studentFeedback: 'YZ_TASLAK_11' },
               12: { aiScore: 17, justification: 'YZ_GEREKCE_12', studentFeedback: 'YZ_TASLAK_12', breakdown: [{ label: 'YZ_OLCUT', points: 9, max: 10 }] } },
  };
  it('onaysız YZ önerisi (puan, gerekçe, taslak, döküm) fişte yok; bekleyen "onay bekliyor"', () => {
    const v = f.geriBildirimFisVerisi(OGRENCILER[0], sorular, oturum, 5);
    const html = f.geriBildirimFisiHtml(v, 'Fen 1. yazılı', '6 Kasım 2026');
    for (const yasak of ['YZ_GEREKCE', 'YZ_TASLAK', 'YZ_OLCUT', '17 / 20', 'Yanıt metni']) expect(html, yasak).not.toContain(yasak);
    expect(html).toContain('onay bekliyor');
    expect(html).toContain('kesinleşmedi (1 yanıt onay bekliyor)');
    expect(v.bekleyen).toBe(1);
  });
  it('onaylı puan, öğretmen notu ve öğretmenin ölçüt puanları fişte', () => {
    const html = f.geriBildirimFisiHtml(f.geriBildirimFisVerisi(OGRENCILER[0], sorular, oturum, 5), 'Fen', 'bugün');
    expect(html).toContain('12,5 / 20');
    expect(html).toContain('Örneğin güzel, tanımı genişlet.');
    expect(html).toContain('Kavram doğruluğu: 6/10 · Örnek: 6,5/10');
    expect(html).toContain('Çoktan seçmeli: 0/1 doğru');
    expect(html).toContain('1 ✗');
  });
  it('yalnız kendi adı: başka öğrencinin adı fişte 0', () => {
    const html = f.geriBildirimFisiHtml(f.geriBildirimFisVerisi(OGRENCILER[0], sorular, oturum, 5), 'Fen', 'bugün');
    expect(html).toContain('Ada Yılmaz');
    for (const p of ['Kerem', 'Elif', 'Mert']) expect(html).not.toContain(p);
  });
  it('ibare yalnız gerçekten öyleyse: YZ önerisi + öğretmenin onay kartı kararı', () => {
    const ibare = 'Yapay zekâ önerisi öğretmen tarafından gözden geçirildi';
    const yap = (rv: any) => f.geriBildirimFisiHtml(f.geriBildirimFisVerisi(OGRENCILER[0], [{ ...S1, maxScore: 20 }],
      { reviews: rv ? { 11: rv } : {}, aiEvals: { 11: { aiScore: 15 } } }, 5), 'Fen', 'bugün');
    expect(yap({ finalScore: 15, decision: 'approved_as_is', aiScore: 15 })).toContain(ibare);
    expect(yap({ finalScore: 13, decision: 'revised', aiScore: 15 })).toContain(ibare);
    expect(yap({ finalScore: 13, decision: 'kagit_elle', aiScore: 15 })).not.toContain(ibare);   // ızgarada kendi puanı
    expect(yap({ finalScore: 13, decision: 'kagit_elle', aiScore: null })).not.toContain(ibare);
    expect(yap({ finalScore: 13, decision: 'revised', aiScore: null })).not.toContain(ibare);     // elle puanla (öneri yok)
    expect(yap(null)).not.toContain(ibare);                                                      // yalnız onaysız öneri
  });
  it('tam onaylı fişte toplam yazılır', () => {
    const v = f.geriBildirimFisVerisi(OGRENCILER[1], [MC, { ...S1, maxScore: 20 }],
      { mcResults: { 13: { correct: true } }, answers: { 13: { selectedKey: 'B' } }, reviews: { 11: { finalScore: 18, decision: 'kagit_elle', aiScore: null } } }, 5);
    expect(v).toMatchObject({ puan: 23, tam: 25, bekleyen: 0, yzGozden: false });
    expect(f.geriBildirimFisiHtml(v, 'Fen', 'bugün')).toContain('Toplam: 23 / 25');
  });
  it('fiş kodu aiEvals okumaz (kaynak düzeyinde)', () => {
    for (const ad of ['geriBildirimFisVerisi', 'geriBildirimFisiHtml', 'geriBildirimFisleriHtml', 'geriBildirimFisleriYazdir']) {
      expect(fonksiyonMetni(ad), ad).not.toMatch(/aiEvals|studentFeedback|justification|breakdown/);
    }
    expect(fonksiyonMetni('geriBildirimFisleriYazdir')).toContain('yazdirKabindanBas(geriBildirimFisleriHtml(ogr), "fis")');
    expect(fonksiyonMetni('geriBildirimFisOgrencileri')).toContain('readSession(s.id).kaynak === "kagit"');
  });
});
