// ============================================================================
// §104 — Red nedeni + karar kaydının genişletilmesi (W10).
// İstemci fonksiyonları public/app.js metninden alınıp yalıtılmış kapsamda
// kurulur (elle-soru.test.ts kalıbı); state sahte nesnedir.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');
const takso = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'HATA_TAKSONOMISI.md'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function sabitMetni(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n];\n', bas) + 4);
}
function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return son < 0 ? kalan : kalan.slice(0, son);
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kur(supheler: string[] = []) {
  const state: any = { questions: [], auditLog: [] };
  const kod = sabitMetni('RED_KODLARI') + '\n' + [
    'redKoduAdi', 'redKoduRozetiHtml', 'redKoduSeciciHtml', 'soruyuReddet', 'soruyuOnayla',
    'anahtarIzli', 'rozetA1A2', 'auditOzet', 'anahtarDuzeltmeHtml', 'auditCsv',
    'remapCorrectKeyAndRationale', 'relabelOptionsAndGetKeyMap',
  ].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', 'escapeHtml',
    'const ORAN_ALT_ORNEKLEM = 30; const OPT_LETTERS = ["A","B","C","D","E"]; const AUDIT_ETIKET = {};\n' +
    'function renderAll() {}\n' +
    'function ensureAudit() { state.auditLog = state.auditLog || []; }\n' +
    'function auditKaydet(tur, veri) { const k = { tur, at: 0 }; Object.keys(veri || {}).forEach(function (x) {' +
    ' if (veri[x] !== undefined && veri[x] !== null) k[x] = veri[x]; }); state.auditLog.push(k); }\n' +
    'function auditKisalt(s) { return String(s || ""); }\n' +
    'function auditZaman() { return "z"; }\n' +
    'function soruSupheleri() { return ' + JSON.stringify(supheler.map((a) => ({ anahtar: a }))) + '; }\n' +
    kod +
    '\nreturn { state, RED_KODLARI, redKoduAdi, redKoduRozetiHtml, redKoduSeciciHtml, soruyuReddet, soruyuOnayla, anahtarIzli, rozetA1A2, auditOzet, anahtarDuzeltmeHtml, auditCsv, remapCorrectKeyAndRationale, relabelOptionsAndGetKeyMap };',
  )(state, esc);
}

const yzSoru = (ek: any = {}) => ({
  id: 7, type: 'mc', status: 'ai_generated', body: 'Soru', uretenModel: 'llama',
  options: ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: 'şık ' + k })), correctKey: 'B', ilkAnahtar: 'B',
  distractorRationale: {}, ...ek,
});

describe('red kodları — HATA_TAKSONOMISI.md ile birebir', () => {
  // Soru üretimine ait bölümler A–G; H (açık uçlu değerlendirme) soru reddiyle ilgisiz.
  const agBolumu = takso.slice(takso.indexOf('## A.'), takso.indexOf('## H.'));
  const belgeKodlari = Array.from(agBolumu.matchAll(/^\| `([A-Z]+-[A-Z]+)`/gm)).map((m) => m[1]);
  const { RED_KODLARI } = kur();
  const listeKodlari = RED_KODLARI.flatMap((g: any) => g.kodlar.map((k: any) => k[0])).filter((k: string) => k !== 'DIGER');

  it('belgedeki A–G kodlarının hepsi listede, listede belgede olmayan kod yok', () => {
    expect(belgeKodlari.length).toBeGreaterThan(20);
    expect([...listeKodlari].sort()).toEqual([...belgeKodlari].sort());
  });

  it('"Diğer" var; DEG-* (değerlendirme) yok; kodlar tekil', () => {
    const tum = RED_KODLARI.flatMap((g: any) => g.kodlar.map((k: any) => k[0]));
    expect(tum).toContain('DIGER');
    expect(tum.some((k: string) => k.startsWith('DEG-'))).toBe(false);
    expect(new Set(tum).size).toBe(tum.length);
  });

  it('seçici: ilk seçenek boş ("isteğe bağlı"), gruplar optgroup', () => {
    const { redKoduSeciciHtml } = kur();
    const h = redKoduSeciciHtml({ id: 3 });
    expect(h).toMatch(/^<select class="red-kodu" data-qid="3"[^>]*><option value="">Red nedeni \(isteğe bağlı\)<\/option>/);
    expect(h).toContain('<optgroup label="Cevap anahtarı">');
    expect(h).toContain('<option value="ANH-OLGU">ANH-OLGU · Anahtar yanlış şıkkı gösteriyor</option>');
  });

  it('redKoduAdi: kod + ad; DIGER yalnız ad; bilinmeyen olduğu gibi', () => {
    const { redKoduAdi } = kur();
    expect(redKoduAdi('KZN-DISI')).toBe('KZN-DISI — Kazanımı ölçmüyor');
    expect(redKoduAdi('DIGER')).toBe('Diğer');
    expect(redKoduAdi('XYZ')).toBe('XYZ');
  });
});

describe('reddetme — tek tık aynen, kod isteğe bağlı', () => {
  it('kodsuz red: kayıtta redKodu yok, soru reddedildi (eski davranış)', () => {
    const { soruyuReddet, state } = kur();
    const q: any = yzSoru();
    soruyuReddet(q, '');
    expect(q.status).toBe('rejected');
    expect('redKodu' in q).toBe(false);
    expect(state.auditLog[0]).toMatchObject({ tur: 'soru_reddedildi', qid: 7, model: 'llama' });
    expect('redKodu' in state.auditLog[0]).toBe(false);
  });

  it('kodlu red: redKodu ve o anki şüphe rozetleri kayda, kod soruya yazılır', () => {
    const { soruyuReddet, state } = kur(['hesapBaskaSik', 'dilUyarisi']);
    const q: any = yzSoru();
    soruyuReddet(q, 'ANH-OLGU');
    expect(state.auditLog[0]).toMatchObject({ redKodu: 'ANH-OLGU', supheler: ['hesapBaskaSik', 'dilUyarisi'] });
    expect(q.redKodu).toBe('ANH-OLGU');
  });

  it('işleyici tek tıkla soruyuReddet çağırır; modal ya da zorunlu seçim yok', () => {
    const g = govde('wirePendingCards');
    const red = g.slice(g.indexOf('.reject-btn'));
    expect(red.slice(0, 300)).toContain('soruyuReddet(q, redKoduOku(q.id));');
    expect(red.slice(0, 300)).not.toMatch(/openModal|onaylaModal|confirm\(/);
    // seçici bilinmeyen değeri kabul etmez
    expect(govde('redKoduOku')).toContain('RED_KODLARI.some');
  });

  it('havuzda gösterim: reddedilen soruda neden hapı; yeniden incelemeye alınınca kod silinir', () => {
    const { redKoduRozetiHtml } = kur();
    expect(redKoduRozetiHtml({ redKodu: 'GVD-KOKYOK' })).toContain('neden: GVD-KOKYOK');
    expect(redKoduRozetiHtml({ redKodu: 'DIGER' })).toContain('neden: diğer');
    expect(redKoduRozetiHtml({})).toBe('');
    expect(govde('havuzSoruHtml')).toContain('redKoduRozetiHtml(q)');
    expect(govde('rejectedPoolHtml')).toContain('redKoduRozetiHtml(q)');
    expect(govde('wireRejectedPool')).toContain('delete q.redKodu');
  });
});

describe('onay — anahtar değişimi eski → yeni harf', () => {
  it('anahtar değiştiyse anahtarEski/anahtarYeni yazılır', () => {
    const { soruyuOnayla, state } = kur();
    const q: any = yzSoru({ correctKey: 'C' });
    soruyuOnayla(q);
    expect(state.auditLog[0]).toMatchObject({ tur: 'soru_onaylandi', anahtarIzlendi: true, anahtarEski: 'B', anahtarYeni: 'C' });
  });

  it('anahtar aynıysa yalnız anahtarIzlendi', () => {
    const { soruyuOnayla, state } = kur();
    soruyuOnayla(yzSoru());
    const k = state.auditLog[0];
    expect(k.anahtarIzlendi).toBe(true);
    expect('anahtarEski' in k || 'anahtarYeni' in k).toBe(false);
  });

  it('şık taşıma (yeniden harfleme) değişim sayılmaz: ilkAnahtar şıkla birlikte gider', () => {
    const { soruyuOnayla, remapCorrectKeyAndRationale, relabelOptionsAndGetKeyMap, state } = kur();
    const q: any = yzSoru();
    const sira = [q.options[1], q.options[0], q.options[2], q.options[3]];   // B en üste
    const { newOptions, eskiHarfToYeniHarf } = relabelOptionsAndGetKeyMap(sira);
    q.options = newOptions;
    remapCorrectKeyAndRationale(q, eskiHarfToYeniHarf);
    expect(q.correctKey).toBe('A');
    expect(q.ilkAnahtar).toBe('A');
    soruyuOnayla(q);
    expect('anahtarYeni' in state.auditLog[0]).toBe(false);
  });

  it('iz yok: eski kayıt (ilkAnahtar yok), elle soru, açık uçlu', () => {
    const { soruyuOnayla, state } = kur();
    soruyuOnayla(yzSoru({ ilkAnahtar: undefined, correctKey: 'D' }));
    soruyuOnayla(yzSoru({ yazan: 'insan', correctKey: 'D' }));
    soruyuOnayla({ id: 9, type: 'open', body: 'x', ilkAnahtar: 'A' });
    for (const k of state.auditLog) {
      expect('anahtarIzlendi' in k || 'anahtarYeni' in k || 'rozetA1A2' in k).toBe(false);
    }
  });

  it('üretimde ilkAnahtar yalnız geçerli anahtarlı ÇSS için konur (anahtarBelirsiz değilse)', () => {
    const g = govde('onGenerateQuestions');
    expect(g).toContain('if (q.type === "mc" && q.correctKey && !q.anahtarBelirsiz) q.ilkAnahtar = q.correctKey;');
  });

  it('karar süresi kaydedilmez (Esat kararı bekleniyor)', () => {
    for (const ad of ['soruyuOnayla', 'soruyuReddet']) {
      expect(govde(ad)).not.toMatch(/sure|süre|Date\.now|performance\.now/i);
    }
  });
});

describe('rozetA1A2 — onay anındaki şüpheden bağımsız', () => {
  const { rozetA1A2 } = kur();
  it('A2: hesapBaskaSik dolu (anahtar düzeltilmiş olsa da) ya da hesapUyusmazligi true', () => {
    expect(rozetA1A2(yzSoru({ hesapBaskaSik: 'C', correctKey: 'C' }))).toEqual(['A2']);
    expect(rozetA1A2(yzSoru({ hesapUyusmazligi: true }))).toEqual(['A2']);
    expect(rozetA1A2(yzSoru({ hesapUyusmazligi: null }))).toEqual([]);
  });
  it('A1: bağımsız çözüm anahtardan farklıydı (bayat imza da sayılır); hata sayılmaz', () => {
    expect(rozetA1A2(yzSoru({ bagimsizCozum: { anahtarUyusmazligi: true, imza: 'eski' } }))).toEqual(['A1']);
    expect(rozetA1A2(yzSoru({ bagimsizCozum: { hata: 'x', anahtarUyusmazligi: true } }))).toEqual([]);
    expect(rozetA1A2(yzSoru({ bagimsizCozum: { anahtarUyusmazligi: true }, hesapBaskaSik: 'A' }))).toEqual(['A1', 'A2']);
  });
  it('açık uçlu → []', () => { expect(rozetA1A2({ type: 'open', hesapUyusmazligi: true })).toEqual([]); });
});

describe('Karar Günlüğü oranı', () => {
  const kayit = (rozet: string[] | null, degisti: boolean, ek: any = {}) => ({
    tur: 'soru_onaylandi', anahtarIzlendi: true, ...(rozet ? { rozetA1A2: rozet } : {}),
    ...(degisti ? { anahtarEski: 'A', anahtarYeni: 'B' } : {}), ...ek,
  });

  it('pay/payda: rozetli ve rozetsiz ayrı; izsiz eski kayıt ve elle onay girmez', () => {
    const { auditOzet, state } = kur();
    state.auditLog = [
      kayit(['A2'], true), kayit(['A1'], false), kayit(['A1', 'A2'], true),
      kayit(null, false), kayit(null, true),
      { tur: 'soru_onaylandi' },                         // eski kayıt
      kayit(['A2'], true, { elle: true }),               // elle (gerçekte yazılmaz; savunma)
      { tur: 'soru_reddedildi', elle: true }, { tur: 'soru_reddedildi' },
    ];
    const o = auditOzet();
    expect(o.anahtarDuzeltme).toEqual({ rozetli: 3, rozetliDuzeltilen: 2, rozetsiz: 2, rozetsizDuzeltilen: 1 });
    expect(o.reddedilen).toBe(1);
  });

  it('küçük örneklemde "gösterge niteliğinde" uyarısı; 30 ve üstünde yok; 0 ise satır yok', () => {
    const { anahtarDuzeltmeHtml } = kur();
    const kucuk = anahtarDuzeltmeHtml({ rozetli: 3, rozetliDuzeltilen: 2, rozetsiz: 2, rozetsizDuzeltilen: 1 });
    expect(kucuk).toContain('<b>2/3 (%67)</b>');
    expect(kucuk).toContain('Rozetsiz sorularda: 1/2 (%50).');
    expect(kucuk).toContain('gösterge niteliğindedir');
    const buyuk = anahtarDuzeltmeHtml({ rozetli: 30, rozetliDuzeltilen: 6, rozetsiz: 0, rozetsizDuzeltilen: 0 });
    expect(buyuk).toContain('<b>6/30 (%20)</b>');
    expect(buyuk).not.toContain('gösterge');
    expect(anahtarDuzeltmeHtml({ rozetli: 0, rozetliDuzeltilen: 0, rozetsiz: 5, rozetsizDuzeltilen: 1 })).toBe('');
    expect(govde('auditGunluguHtml')).toContain('anahtarDuzeltmeHtml(o.anahtarDuzeltme)');
  });
});

describe('CSV', () => {
  it('eski sütun sırası aynen, yeni üç sütun sonda; değerler doğru', () => {
    const { auditCsv, state } = kur();
    state.auditLog = [
      { tur: 'soru_reddedildi', at: 0, redKodu: 'ANH-YOK', supheler: ['kaynakYok'] },
      { tur: 'soru_onaylandi', at: 0, anahtarIzlendi: true, anahtarEski: 'B', anahtarYeni: 'C', rozetA1A2: ['A1', 'A2'] },
      { tur: 'soru_onaylandi', at: 0, anahtarIzlendi: true },
    ];
    const satirlar = auditCsv().replace(/^﻿/, '').split('\n');
    expect(satirlar[0]).toBe('zaman;olay;aktor;model;yedekMi;soru;ogrenciNo;aiPuan;nihaiPuan;degisti;guven;not;supheler;redKodu;anahtarDegisimi;rozetA1A2;oncekiDurum;rol');   // §104b: iki sütun daha sonda
    expect(satirlar[1].split(';').slice(12, 16)).toEqual(['kaynakYok', 'ANH-YOK', '', '']);
    expect(satirlar[2].split(';').slice(13, 16)).toEqual(['', 'B→C', 'A1,A2']);
    expect(satirlar[3].split(';').slice(13, 16)).toEqual(['', 'aynı', '']);
  });
});

describe('göç yok, öz-kontrol', () => {
  it('KALICI_ALANLAR yeni alan içermez', () => {
    const bas = app.indexOf('const KALICI_ALANLAR');
    expect(app.slice(bas, app.indexOf('];', bas))).not.toMatch(/"(redKodu|ilkAnahtar)"/);
  });
  it('yeni adlar selfCheck listesinde birer kez', () => {
    const sc = app.slice(app.indexOf('(function selfCheck()'));
    for (const ad of ['redKoduAdi', 'redKoduRozetiHtml', 'redKoduSeciciHtml', 'redKoduOku', 'soruyuReddet',
      'anahtarIzli', 'rozetA1A2', 'anahtarDuzeltmeHtml']) {
      expect(sc.split('"' + ad + '"').length - 1, ad).toBe(1);
    }
  });
});
