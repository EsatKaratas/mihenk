// ============================================================================
// §88 KVKK — öğrenci adı yapay zekâ isteğine girmez (istemci katmanı).
// kisiselMaskele gerçek app.js kaynağından çıkarılıp işlev olarak sınanır;
// ayrıca iki serbest metin ucunun (evaluate, misconceptions) maskeli metni
// gönderdiği kaynak düzeyinde kilitlenir.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

const bas = app.indexOf('const KISISEL_SOZCUK_ADLAR');
const sonIsaret = app.indexOf('function adMaskeNotuHtml(');
const son = app.indexOf('\n}\n', sonIsaret) + 3;
const kod = app.slice(bas, son);

type Sonuc = { metin: string; maskelendi: boolean };
const ogrenciler = [
  { name: 'Ayşe Yılmaz' },
  { name: 'Kerem Aydın' },
  { name: 'Deniz Çelik' },
  { name: 'İlker Işık' },
  { name: 'Ada Y.' },
];
const yukle = new Function('state', kod + '\nreturn { kisiselMaskele, adMaskeNotuHtml };');
const { kisiselMaskele, adMaskeNotuHtml } = yukle({ students: ogrenciler }) as {
  kisiselMaskele: (m: string, o?: { name: string }[]) => Sonuc;
  adMaskeNotuHtml: (ev: unknown) => string;
};

describe('kisiselMaskele — kayıtlı adlar', () => {
  it('ad+soyad ve ekli biçimler maskelenir', () => {
    const r = kisiselMaskele("Ben Ayşe Yılmaz. Ayşe'nin cevabı şöyle: sürtünme ısı açığa çıkarır.");
    expect(r.metin).toBe('Ben [ÖĞRENCİ]. [ÖĞRENCİ] cevabı şöyle: sürtünme ısı açığa çıkarır.');
    expect(r.maskelendi).toBe(true);
  });

  it('Türkçe büyük harf, kesmesiz ek ve klavyesiz yazım yakalanır', () => {
    expect(kisiselMaskele("AYŞE'YE göre").metin).toBe('[ÖĞRENCİ] göre');
    expect(kisiselMaskele('ayşenin fikri').metin).toBe('[ÖĞRENCİ] fikri');
    expect(kisiselMaskele('ayse yilmaz yazdi').metin).toBe('[ÖĞRENCİ] yazdi');
    expect(kisiselMaskele('ILKER ISIK').metin).toBe('[ÖĞRENCİ]');
    expect(kisiselMaskele('ilker ışık').metin).toBe('[ÖĞRENCİ]');
    expect(kisiselMaskele('KEREM AYDIN').metin).toBe('[ÖĞRENCİ]');
  });

  it('sözcük de olan ad tek başına içerik sözcüğü olarak kalır (puanı bozmaz)', () => {
    const r = kisiselMaskele('Deniz suyu tuzludur, deniz kenarında ada var. Aydın bir gün.');
    expect(r.metin).toBe('Deniz suyu tuzludur, deniz kenarında ada var. Aydın bir gün.');
    expect(r.maskelendi).toBe(false);
    // Özel ad işaretli (büyük harf + kesme) ya da ad+soyad birlikteyse maskelenir.
    expect(kisiselMaskele("Deniz'in cevabı").metin).toBe('[ÖĞRENCİ] cevabı');
    expect(kisiselMaskele('deniz çelik').metin).toBe('[ÖĞRENCİ]');
  });

  it('başka sözcüğün parçası maskelenmez', () => {
    expect(kisiselMaskele('Keremet ve ayşegül').metin).toBe('Keremet ve ayşegül');
  });

  it('ad içermeyen cevap birebir aynı kalır', () => {
    const t = 'Sürtünme kuvveti harekete zıt yönde etki eder; 2 + 3 = 5.';
    expect(kisiselMaskele(t)).toEqual({ metin: t, maskelendi: false });
  });

  it('okul numarası ifadeleri maskelenir', () => {
    expect(kisiselMaskele('Okul numaram 1234, cevabım A').metin).toBe('Okul numaram [NUMARA], cevabım A');
    expect(kisiselMaskele('no: 57').metin).toBe('no: [NUMARA]');
    // Matematikteki sayılar etkilenmez.
    expect(kisiselMaskele('Cevap 1234 tür.').metin).toBe('Cevap 1234 tür.');
  });

  it('öğretmen notu yalnız maskeleme olduysa çıkar', () => {
    expect(adMaskeNotuHtml({ adMaskelendi: true })).toContain('Ad bilgisi yapay zekâya gönderilmedi');
    expect(adMaskeNotuHtml({})).toBe('');
  });
});

describe('§88 — serbest metin uçları maskeli metni gönderir', () => {
  it('evaluate: studentAnswer maskeli', () => {
    const i = app.indexOf('async function aiEvaluate(');
    const g = app.slice(i, app.indexOf('\n}\n', i));
    expect(g).toContain('const maske = kisiselMaskele(answerText || "");');
    expect(g).toContain('studentAnswer: maske.metin,');
  });
  it('misconceptions: answers maskeli', () => {
    const i = app.indexOf('async function runMisconceptions(');
    const g = app.slice(i, app.indexOf('\n}\n', i));
    expect(g).toContain('answers: gidenYanitlar');
    expect(g).toContain('kisiselMaskele(t)');
  });
  it('hiçbir /api/ai gövdesinde öğrenci adı/sınıf alanı yok', () => {
    // apiPost çağrılarının gövdelerinde kişisel alan anahtarı geçmemeli.
    const govdeler = app.split('apiPost(AI_API.').slice(1).map((p) => p.slice(0, p.indexOf('});')));
    expect(govdeler.length).toBe(7);
    for (const g of govdeler) {
      expect(g).not.toMatch(/\b(name|studentName|sinif|sube|okul\w*|ogrenci\w*|sid|studentId)\s*:/);
    }
  });
});
