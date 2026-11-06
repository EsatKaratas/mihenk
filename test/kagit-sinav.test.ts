// §106 — Kâğıt sınav modu (W9). İstemci kodu public/app.js metninden alınıp
// yalıtılmış kapsamda kurulur. Model çağrısı yok.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string, async = false): string {
  const bas = app.indexOf('\n' + (async ? 'async ' : '') + 'function ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

const ADLAR = ['kagitSikNormal', 'kagitPuanNormal', 'kagitDuzenlenebilir', 'kagitSatirUygula', 'kagitSatirOzeti', 'kagitHucreMetni'];

function kur() {
  // eslint-disable-next-line no-new-func
  return new Function('const KAGIT_BOS = "-";\n' + ADLAR.map((a) => fonksiyonMetni(a)).join('\n') + '\nreturn {' + ADLAR.join(',') + '};')();
}

const mc = (id: number, dogru = 'B', sik = ['A', 'B', 'C', 'D']) => ({ id, type: 'mc', correctKey: dogru, options: sik.map((k) => ({ key: k })) });
const acik = (id: number, max = 20) => ({ id, type: 'open', maxScore: max });
const SORULAR = [mc(1, 'B'), mc(2, 'D'), acik(3, 20), mc(4, 'A', ['A', 'B', 'C', 'D', 'E'])];

describe('hücre normalleştirme', () => {
  const { kagitSikNormal, kagitPuanNormal } = kur();
  it('şık: küçük/büyük harf, boş bırakılmış, girilmedi, geçersiz', () => {
    expect(kagitSikNormal('b', mc(1))).toBe('B');
    expect(kagitSikNormal(' C ', mc(1))).toBe('C');
    for (const v of ['-', '0', '*', '.']) expect(kagitSikNormal(v, mc(1))).toBe('-');
    expect(kagitSikNormal('', mc(1))).toBe('');
    expect(kagitSikNormal(null, mc(1))).toBe('');
    expect(kagitSikNormal('E', mc(1))).toBeNull();          // 4 şıklı soruda E yok
    expect(kagitSikNormal('E', mc(4, 'A', ['A', 'B', 'C', 'D', 'E']))).toBe('E');
    expect(kagitSikNormal('X', mc(1))).toBeNull();
    expect(kagitSikNormal('ı', mc(1))).toBeNull();          // tr "ı" → "I": şık değil
    expect(kagitSikNormal('a', { id: 9, type: 'mc' })).toBe('A'); // şık listesi yoksa A–E
  });
  it('puan: virgül, sınır, geçersiz (sessiz kırpma yok)', () => {
    expect(kagitPuanNormal('7,5', 20)).toBe(7.5);
    expect(kagitPuanNormal('20', 20)).toBe(20);
    expect(kagitPuanNormal('0', 20)).toBe(0);
    expect(kagitPuanNormal('', 20)).toBe('');
    expect(kagitPuanNormal('21', 20)).toBeNull();
    expect(kagitPuanNormal('-1', 20)).toBeNull();
    expect(kagitPuanNormal('abc', 20)).toBeNull();
    expect(kagitPuanNormal('1e2', 20)).toBeNull();
  });
});

describe('kagitSatirUygula — çevrimiçiyle aynı oturum alanları', () => {
  const { kagitSatirUygula, kagitSatirOzeti, kagitDuzenlenebilir } = kur();

  it('dolu satır: ÇSS anahtarla puanlanır, açık uçlu elle karar, kaynak kâğıt, submitted', () => {
    const r = kagitSatirUygula({ examStatus: 'not_started' }, SORULAR, { 1: 'b', 2: 'A', 3: '12,5', 4: '-' });
    expect(r.answers).toEqual({ 1: { selectedKey: 'B' }, 2: { selectedKey: 'A' } });
    expect(r.mcResults).toEqual({ 1: { correct: true }, 2: { correct: false }, 4: { correct: false } });
    expect(r.reviews[3]).toEqual({ finalScore: 12.5, comment: '', decision: 'kagit_elle', aiScore: null });
    expect(r.examStatus).toBe('submitted');
    expect(r.kaynak).toBe('kagit');
    expect(kagitSatirOzeti(r, SORULAR, 5)).toEqual({ puan: 17.5, eksik: 0, oneri: 0 });
  });

  it('girilmeyen ÇSS hücresi dolu satırda boş = yanlış; açık uçlu eksik sayılır', () => {
    const r = kagitSatirUygula({}, SORULAR, { 1: 'B' });
    expect(r.mcResults).toEqual({ 1: { correct: true }, 2: { correct: false }, 4: { correct: false } });
    expect(r.reviews[3]).toBeUndefined();
    expect(kagitSatirOzeti(r, SORULAR, 5)).toEqual({ puan: 5, eksik: 1, oneri: 0 });
  });

  it('tamamen boş satır: oturum "girilmedi"ye döner (yanlışlıkla girilen satır geri alınabilir)', () => {
    const r = kagitSatirUygula({ examStatus: 'submitted', kaynak: 'kagit', answers: { 1: { selectedKey: 'B' } }, reviews: { 3: { finalScore: 5, decision: 'kagit_elle' } } },
      SORULAR, { 1: '', 2: '', 3: '', 4: '' });
    expect(r.examStatus).toBe('not_started');
    expect(r.kaynak).toBeUndefined();
    expect(r.reviews).toEqual({});
  });

  it('geçersiz hücre önceki değeri korur', () => {
    const once = kagitSatirUygula({}, SORULAR, { 1: 'B', 3: '10' });
    const r = kagitSatirUygula(once, SORULAR, { 1: 'X', 3: '99' });
    expect(r.answers[1]).toEqual({ selectedKey: 'B' });
    expect(r.reviews[3].finalScore).toBe(10);
  });

  it('YZ önerisi: aiEvals var, puan yok → satır dolu, öneri sayılır; elle puan girilince aiScore yan yana durur', () => {
    const ss = { examStatus: 'not_started', answers: { 3: { text: 'yanıt' } }, aiEvals: { 3: { aiScore: 14 } } };
    const r1 = kagitSatirUygula(ss, SORULAR, {});
    expect(r1.examStatus).toBe('submitted');
    expect(r1.reviews).toEqual({});                       // otomatik onay YOK
    expect(kagitSatirOzeti({ ...r1, aiEvals: ss.aiEvals }, SORULAR, 5).oneri).toBe(1);
    const r2 = kagitSatirUygula({ ...r1, aiEvals: ss.aiEvals }, SORULAR, { 3: '11' });
    expect(r2.reviews[3]).toEqual({ finalScore: 11, comment: '', decision: 'kagit_elle', aiScore: 14 });
  });

  it('YZ önerisinden onaylanmış puan hücre boşken silinmez; elle puan silinince kalkar', () => {
    const onayli = { examStatus: 'submitted', kaynak: 'kagit', aiEvals: { 3: { aiScore: 9 } }, reviews: { 3: { finalScore: 9, decision: 'approved_as_is', aiScore: 9 } } };
    expect(kagitSatirUygula(onayli, SORULAR, { 3: '' }).reviews[3].decision).toBe('approved_as_is');
    const elle = kagitSatirUygula({}, SORULAR, { 1: 'B', 3: '7' });
    expect(kagitSatirUygula(elle, SORULAR, { 1: 'B', 3: '' }).reviews[3]).toBeUndefined();
  });

  it('yayınlanmış (graded) sonuç düzeltilirse graded kalır', () => {
    expect(kagitSatirUygula({ examStatus: 'graded', kaynak: 'kagit' }, SORULAR, { 1: 'C' }).examStatus).toBe('graded');
  });

  it('çevrimiçi başlamış/göndermiş oturum salt okunur', () => {
    expect(kagitDuzenlenebilir({ examStatus: 'not_started' })).toBe(true);
    expect(kagitDuzenlenebilir({})).toBe(true);
    expect(kagitDuzenlenebilir({ examStatus: 'submitted', kaynak: 'kagit' })).toBe(true);
    expect(kagitDuzenlenebilir({ examStatus: 'submitted' })).toBe(false);
    expect(kagitDuzenlenebilir({ examStatus: 'in_progress' })).toBe(false);
    expect(kagitDuzenlenebilir({ examStatus: 'graded' })).toBe(false);
  });
});

describe('hücre metni (ızgaraya geri okuma)', () => {
  const { kagitHucreMetni, kagitSatirUygula } = kur();
  it('kayıt → hücre: şık, boş bırakılmış, puan virgüllü', () => {
    const r = kagitSatirUygula({}, SORULAR, { 1: 'B', 2: '-', 3: '7.5' });
    expect(kagitHucreMetni(r, SORULAR[0])).toBe('B');
    expect(kagitHucreMetni(r, SORULAR[1])).toBe('-');
    expect(kagitHucreMetni(r, SORULAR[2])).toBe('7,5');
    expect(kagitHucreMetni({}, SORULAR[0])).toBe('');
  });
});

describe('aynı veri yolu: e-Okul CSV (§101) kâğıt oturumunu çevrimiçi gibi okur', () => {
  it('eokulPuanCsv kâğıttan girilen satırı puanlar', () => {
    const { kagitSatirUygula } = kur();
    const kod = ['csvHucre', 'csvSayi', 'csvSatirlar', 'eokulPuanCsv'].map((a) => fonksiyonMetni(a)).join('\n');
    // eslint-disable-next-line no-new-func
    const { eokulPuanCsv } = new Function(kod + '\nreturn { eokulPuanCsv };')();
    const kagit = kagitSatirUygula({}, SORULAR, { 1: 'B', 2: 'D', 3: '15', 4: 'A' });
    const cevrimici = { examStatus: 'submitted', mcResults: { 1: { correct: true }, 2: { correct: true }, 4: { correct: true } },
      reviews: { 3: { finalScore: 15, decision: 'approved_as_is' } } };
    const ogr = [{ id: 1, name: 'Kâğıt', okulNo: '1' }, { id: 2, name: 'Çevrimiçi', okulNo: '2' }];
    const r = eokulPuanCsv(SORULAR, ogr, (sid: number) => (sid === 1 ? kagit : cevrimici), 5);
    const satirlar = r.csv.split(/\r?\n/).filter(Boolean);
    expect(satirlar[1].split(/[;,]/).slice(-1)[0]).toBe(satirlar[2].split(/[;,]/).slice(-1)[0]);
    expect(r.bekleyen).toBe(0);
  });
});

describe('bağlantılar ve sınırlar (kaynak metni)', () => {
  it('oturumda isteğe bağlı "kaynak" alanı; KALICI_ALANLAR da taşır; bosOturum şekli değişmedi', () => {
    const ot = app.slice(app.indexOf('const OTURUM_ALANLARI'), app.indexOf('];', app.indexOf('const OTURUM_ALANLARI')));
    expect(ot).toContain('"kaynak"');
    const k = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    expect(k).toContain('"kaynak"');
    expect(fonksiyonMetni('bosOturum')).not.toContain('kaynak');
  });

  it('YZ önerisi var olan aiEvaluate yolundan; sonuç yalnız aiEvals’a yazılır, onay yazılmaz', () => {
    const f = fonksiyonMetni('kagitOneriIste', true);
    expect(f).toContain('await aiEvaluate(q, metin, state.rubrics[qid], false, sid)');
    expect(f).toContain('writeSession(sid, { aiEvals: ev })');
    expect(f).not.toMatch(/finalizeReview|reviews\s*:/);
  });

  it('kâğıtta uygulanan sınav öğrencide çevrimiçi başlatılamaz', () => {
    expect(fonksiyonMetni('examActionBtn')).toContain('if (c.ex.uygulama === "kagit") return \'<button class="btn btn-secondary" disabled>Kâğıt üzerinde uygulandı</button>\'');
  });

  it('Puanlama kuyruğunda puanı girilmemiş kâğıt yanıtı görünür (boş kart değil)', () => {
    expect(fonksiyonMetni('evalCardHtml')).toContain('if (!ev) return ss.kaynak === "kagit" ? kagitEksikKartHtml(q, student) : "";');
  });

  it('sınav değiştirilince "uygulama" kaybolmaz (activateExam alanları tek tek kopyalar)', () => {
    expect(fonksiyonMetni('activateExam')).toContain('uygulama: kayit.uygulama || ""');
  });

  it('çevrimiçi yayındaki sınavın durumu ve tarihi kâğıt girişiyle değişmez', () => {
    expect(fonksiyonMetni('kagitSinaviIsaretle')).toContain('if (state.exam.status === "published" && state.exam.uygulama !== "kagit") return;');
  });

  it('gizlilik metni kâğıt yolunu anar', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    expect(pp).toContain('Sınav kâğıtta yapıldıysa');
  });
});
