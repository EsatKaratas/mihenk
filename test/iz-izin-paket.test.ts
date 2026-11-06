// ============================================================================
// §107 (Madde 7 + 9) ve §111 (Madde 14) — W10.
//   1) Onaylı soru düzenlenince onay sürer, iz kalır.
//   2) Yeni gerçek öğrenci "rıza bekleniyor" ile doğar; eski kayıt/demo değişmez.
//   3) Anonim araştırma paketi: ad ve metin SIZINTISI YOK (demo verisiyle ölçülür).
// İstemci fonksiyonları public/app.js metninden alınıp yalıtılmış kapsamda kurulur.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.search(new RegExp('\\n(async )?function ' + ad + '\\('));
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function sabitMetni(ad: string, son = '\n];\n'): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf(son, bas) + son.length);
}
function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return son < 0 ? kalan : kalan.slice(0, son);
}
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kur(state: any) {
  const kod = [
    'soruAnligi', 'duzenlemeAnligiAl', 'duzenlemeFarki', 'duzenlemeIziniKapat', 'onaydanSonraHapHtml',
    'yeniGercekOgrenci', 'rizaBekleyenler', 'rizaTopluIsaretle', 'yzIzinEtiketi', 'rizaSeridiHtml', 'yzIzniVar',
    'auditOzet', 'auditCsv', 'sha256Hex', 'arastirmaPaketi', 'arastirmaTuzu',
  ].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', 'escapeHtml',
    'var _duzenlemeAnligi = null; var _arastirmaTuz = null; let studentIdSeq = 50;\n' +
    'const AUDIT_ETIKET = { soru_onaylandi: { aktor: "içerik uzmanı" }, puan_karari: { aktor: "öğretmen" } };\n' +
    sabitMetni('ARASTIRMA_ALANLARI') + '\n' +
    'function findQuestion(id) { return state.questions.find(function (q) { return String(q.id) === String(id); }); }\n' +
    'function ensureAudit() { state.auditLog = state.auditLog || []; }\n' +
    'function auditKaydet(tur, veri) { const k = { tur, at: 1793955600000 }; Object.keys(veri || {}).forEach(function (x) {' +
    ' if (veri[x] !== undefined && veri[x] !== null) k[x] = veri[x]; }); state.auditLog.push(k); }\n' +
    'function auditKisalt(s) { return String(s || ""); }\n' +
    'function auditZaman() { return "z"; }\n' +
    kod +
    '\nreturn { soruAnligi, duzenlemeAnligiAl, duzenlemeFarki, duzenlemeIziniKapat, onaydanSonraHapHtml, yeniGercekOgrenci,' +
    ' rizaBekleyenler, rizaTopluIsaretle, yzIzinEtiketi, rizaSeridiHtml, yzIzniVar, auditOzet, auditCsv, arastirmaPaketi, arastirmaTuzu };',
  )(state, esc);
}

const onayli = (ek: any = {}) => ({
  id: 4, type: 'mc', status: 'approved', body: 'Eski gövde', outcome: 'FEN.7.1.2', correctKey: 'B', uretenModel: 'llama',
  options: ['A', 'B', 'C', 'D'].map((k) => ({ key: k, text: 'şık ' + k })), ...ek,
});

// ------------------------------------------------------------------ §107-1
describe('§107 Madde 7 — onaylı soru düzenleme izi', () => {
  it('gövde + anahtar + kazanım değişince tek kayıt; onay SÜRER; hap işareti', () => {
    const state: any = { questions: [onayli()], auditLog: [], role: 'teacher' };
    const f = kur(state);
    f.duzenlemeAnligiAl(state.questions[0]);
    const q = state.questions[0];
    q.body = 'Yeni gövde'; q.correctKey = 'C'; q.outcome = 'FEN.7.1.3';
    f.duzenlemeIziniKapat();
    expect(state.auditLog).toEqual([{ tur: 'onayli_soru_duzenlendi', at: 1793955600000, qid: 4, soru: 'Yeni gövde', model: 'llama',
      alanlar: ['govde', 'anahtar', 'kazanim'], anahtarEski: 'B', anahtarYeni: 'C', rol: 'teacher' }]);
    expect(q.status).toBe('approved');
    expect(q.onaydanSonraDuzenlendi).toBe(true);
    expect(f.onaydanSonraHapHtml(q)).toContain('onaydan sonra düzenlendi');
  });

  it('yalnız şık metni: alanlar ["sik"], anahtar alanı yok', () => {
    const state: any = { questions: [onayli()], auditLog: [], role: 'teacher' };
    const f = kur(state);
    f.duzenlemeAnligiAl(state.questions[0]);
    state.questions[0].options[2].text = 'yeni şık';
    f.duzenlemeIziniKapat();
    expect(state.auditLog[0].alanlar).toEqual(['sik']);
    expect('anahtarEski' in state.auditLog[0]).toBe(false);
  });

  it('fark yoksa kayıt yok; onaysız soruda kayıt yok; anlık görüntü tek kullanımlık', () => {
    const state: any = { questions: [onayli(), onayli({ id: 5, status: 'ai_generated' })], auditLog: [], role: 'teacher' };
    const f = kur(state);
    f.duzenlemeAnligiAl(state.questions[0]);
    expect(f.duzenlemeIziniKapat()).toBeNull();
    f.duzenlemeAnligiAl(state.questions[1]);
    state.questions[1].body = 'değişti';
    expect(f.duzenlemeIziniKapat()).toBeNull();
    expect(f.duzenlemeIziniKapat()).toBeNull();
    expect(state.auditLog).toHaveLength(0);
    expect(state.questions[0].onaydanSonraDuzenlendi).toBeUndefined();
  });

  it('düzenleme her kapanışta izlenir (Kaydet, Vazgeç, Kapat/başka soru); davranış aynı', () => {
    const g = govde('wireTeacherTab1');   // havuz düzenleme bağlayıcıları burada
    expect(g).toContain('b.onclick = function () { duzenlemeIziniKapat(); state.editingQid = null; renderAll(); };');
    expect(g).toContain('if (cancelBtn) cancelBtn.onclick = function () { duzenlemeIziniKapat(); state.editingQid = null; renderAll(); };');
    expect(g).toMatch(/duzenlemeIziniKapat\(\);\n\s+state\.editingQid = state\.editingQid === id \? null : id;\n\s+if \(state\.editingQid != null\) duzenlemeAnligiAl/);
    expect(govde('duzenlemeIziniKapat')).not.toMatch(/status\s*=/);
  });

  it('kabul oranına girmez; CSV degisenAlanlar + anahtarDegisimi; havuz kartlarında hap', () => {
    const state: any = { questions: [], role: 'teacher', auditLog: [
      { tur: 'soru_onaylandi', at: 0, model: 'llama' },
      { tur: 'onayli_soru_duzenlendi', at: 0, alanlar: ['govde', 'anahtar'], anahtarEski: 'B', anahtarYeni: 'C', rol: 'teacher' },
    ] };
    const f = kur(state);
    expect(f.auditOzet().onaylanan).toBe(1);
    expect(f.auditOzet().anahtarDuzeltme.rozetsiz).toBe(0);
    const [bas, , satir] = f.auditCsv().replace(/^﻿/, '').split('\n');
    expect(bas.endsWith(';rol;degisenAlanlar')).toBe(true);
    expect(satir.split(';').slice(14)).toEqual(['B→C', '', '', 'teacher', 'govde,anahtar']);
    expect(govde('sihirbazAdim2Html')).toContain('onaydanSonraHapHtml(q)');
    expect(govde('havuzSoruHtml')).toContain('onaydanSonraHapHtml(q)');
    expect(app).toMatch(/onayli_soru_duzenlendi:\{ ad: "Onaylı soru düzenlendi",[^}]*aktor: "öğretmen" \}/);
  });
});

// ------------------------------------------------------------------ §107-2
describe('§107 Madde 9 — yeni gerçek öğrencide rıza bekleniyor', () => {
  it('yeni öğrenci izinsiz doğar; eski kayıt (alan yok) ve demo/simülasyon öğrencisi İZİNLİ kalır', () => {
    const state: any = { students: [
      { id: 1, name: 'Ada Yılmaz', sinif: '7-A', demo: false },                   // tohum / eski kayıt: alan yok
      { id: 2, name: 'Ege T.', sinif: '7-A', demo: true, ability: 0.5 },          // simülasyon
    ], auditLog: [] };
    const f = kur(state);
    const yeni = f.yeniGercekOgrenci('Can Er', '7-A');
    state.students.push(yeni);
    expect(yeni).toMatchObject({ name: 'Can Er', demo: false, yzIzniYok: true, yzRizaBekliyor: true });
    expect(f.yzIzniVar(1)).toBe(true);
    expect(f.yzIzniVar(2)).toBe(true);
    expect(f.yzIzniVar(yeni.id)).toBe(false);
    expect(f.yzIzinEtiketi(yeni)).toBe('Rıza bekleniyor');
    expect(f.yzIzinEtiketi({ yzIzniYok: true })).toBe('İzin yok');
    expect(f.yzIzinEtiketi(state.students[0])).toBe('İzin var');
  });

  it('demo tohumu ve simülasyon yolları değişmedi (göç yok)', () => {
    expect(govde('ensureStudents')).toContain('state.students.push({ id: studentIdSeq++, name: o.name, sinif: o.sinif, demo: false });');
    expect(app).toMatch(/const s = \{ id: studentIdSeq\+\+, name: simIsmiSec\(\), demo: true,/);
    const kalici = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf('];', app.indexOf('const KALICI_ALANLAR')));
    expect(kalici).not.toMatch(/yzRiza/);
  });

  it('toplu işaret: yalnız bekleyenler açılır; "izin yok" (veli reddi) dokunulmaz; iz adsız', () => {
    const state: any = { role: 'teacher', auditLog: [], students: [] };
    const f = kur(state);
    const a = f.yeniGercekOgrenci('Can Er', '7-A');
    const b = f.yeniGercekOgrenci('Su Ak', '7-A');
    const red = { id: 9, name: 'Ali Ok', sinif: '7-A', yzIzniYok: true };
    state.students.push(a, b, red);
    expect(f.rizaSeridiHtml(state.students)).toContain('<b>2 öğrencinin</b>');
    expect(f.rizaTopluIsaretle(state.students, '7-A')).toBe(2);
    expect(f.yzIzniVar(a.id) && f.yzIzniVar(b.id)).toBe(true);
    expect(f.yzIzniVar(9)).toBe(false);
    const k = state.auditLog[0];
    expect(k).toMatchObject({ tur: 'yz_izni_toplu', adet: 2, sinif: '7-A', rol: 'teacher', sidler: [a.id, b.id] });
    expect(JSON.stringify(state.auditLog)).not.toMatch(/Can Er|Su Ak|Ali Ok/);
    expect(f.rizaSeridiHtml(state.students)).toBe('');
  });

  it('toplu işaret onay penceresinden geçer', () => {
    const g = govde('wireSinifYonetim');
    const i = g.indexOf('btnRizaToplu');
    expect(i).toBeGreaterThan(0);
    expect(g.slice(i, i + 900)).toContain('onayliEylem(rizaToplu,');
    expect(g.slice(i, i + 900)).toContain('rizaTopluIsaretle(liste, sf || null)');
  });

  it('izinsiz öğrencinin cevabı YZ\'ye gitmez: aiEvaluate ilk iş yzIzniVar ile döner (mevcut davranış)', () => {
    const g = govde('aiEvaluate');
    const kontrol = g.indexOf('if (!yzIzniVar(ogrId))');
    expect(kontrol).toBeGreaterThan(0);
    expect(kontrol).toBeLessThan(g.indexOf('apiPost('));
    expect(g.slice(kontrol, kontrol + 300)).toContain('return yzIzinsizSonuc(rubric);');
  });

  it('privacy-policy ve KVKK kontrol listesi güncel', () => {
    const pp = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'privacy-policy.html'), 'utf8');
    const kl = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'kvkk', 'pilot-ogretmen-kontrol-listesi.md'), 'utf8');
    expect(pp).toContain('<b>"rıza bekleniyor"</b> durumuyla başlar');
    expect(kl).toContain('"YZ: rıza\n      bekleniyor" ile başlar');
    expect(kl).not.toContain('"izin var" olarak eklenir');
  });
});

// ------------------------------------------------------------------ §111
describe('§111 Madde 14 — anonim araştırma paketi', () => {
  // Demo verisinin GERÇEK metinleri app.js'ten okunur (kopya değil).
  const demoAdlar = Array.from(sabitMetni('VARSAYILAN_OGRENCILER').matchAll(/name: "([^"]+)"/g)).map((m) => m[1])
    .concat(JSON.parse(app.match(/const SIM_ISIMLER = (\[[^\]]+\]);/)![1]));
  const demoGovdeler = Array.from(sabitMetni('DEMO_SORULAR').matchAll(/body:\s*"((?:[^"\\]|\\.)*)"/g)).map((m) => JSON.parse('"' + m[1] + '"'));

  function demoDurumu() {
    const sorular = demoGovdeler.map((b, i) => ({ id: 10 + i, type: i === 2 ? 'open' : 'mc', status: 'approved', body: b,
      uretenModel: 'llama', istemSurumu: 2, correctKey: 'A' }));
    const ogr = demoAdlar.map((ad, i) => ({ id: 100 + i, name: ad }));
    const gunluk: any[] = [];
    let t = 1793955600000;
    sorular.forEach((q, i) => {
      const o = ogr[i % ogr.length];
      gunluk.push({ tur: 'soru_uretildi', at: t++, adet: 1, model: 'llama', istemSurumu: 2, soru: q.body.slice(0, 80),
        not: 'Fen Bilimleri · 7. sınıf · ' + o.name });
      gunluk.push({ tur: 'soru_onaylandi', at: t++, qid: q.id, soru: q.body.slice(0, 80), model: 'llama',
        anahtarIzlendi: true, anahtarEski: 'A', anahtarYeni: 'C', rozetA1A2: ['A2'], supheler: ['hesapBaskaSik'],
        not: 'onaylamadan önce düzenlendi' });
      gunluk.push({ tur: 'soru_reddedildi', at: t++, qid: q.id, soru: q.body, redKodu: 'ANH-YOK' });
      gunluk.push({ tur: 'puan_karari', at: t++, qid: q.id, sid: o.id, soru: q.body.slice(0, 80), aiScore: 6, finalScore: 7.5,
        degisti: true, not: o.name + ' için: ' + q.body.slice(0, 40) });
      gunluk.push({ tur: 'yz_izni_yok', at: t++, qid: q.id, sid: o.id, soru: q.body, not: o.name + ' cevabı gönderilmedi' });
    });
    return { sorular, gunluk };
  }

  it('demo adları ve soru gövdeleri pakette 0 kez geçer; sid/soru/not alanı yok', async () => {
    expect(demoAdlar.length).toBeGreaterThanOrEqual(12);
    expect(demoGovdeler.length).toBeGreaterThanOrEqual(3);
    const { sorular, gunluk } = demoDurumu();
    const state: any = { auditLog: gunluk, questions: sorular };
    const f = kur(state);
    const metin = JSON.stringify(await f.arastirmaPaketi(gunluk, sorular, 'tuz123'));
    // Kontrolün gerçekten çalıştığını göster: aynı veriler HAM günlükte var.
    const ham = JSON.stringify(gunluk);
    let hamda = 0, pakette = 0;
    for (const ad of demoAdlar) { if (ham.includes(ad)) hamda++; if (metin.includes(ad)) pakette++; }
    for (const b of demoGovdeler) {
      const parca = b.slice(0, 40);
      if (ham.includes(parca)) hamda++;
      if (metin.includes(parca)) pakette++;
    }
    expect(hamda).toBeGreaterThan(5);
    expect(pakette).toBe(0);
    expect(metin).not.toMatch(/"(sid|soru|not|name|justification|studentAnswer)":/);
    expect(metin).not.toContain('tuz123');
  });

  it('içerik: model, istem sürümü, karar türleri, redKodu, anahtar değişimi, rozet, puan farkı; soru kimliği tuzlu SHA-256', async () => {
    const { sorular, gunluk } = demoDurumu();
    const f = kur({ auditLog: gunluk, questions: sorular });
    const p = await f.arastirmaPaketi(gunluk, sorular, 'tuz123');
    expect(p.modeller).toEqual(['llama']);
    expect(p.istemSurumleri).toEqual([2]);
    expect(p.kararTurleri).toMatchObject({ soru_onaylandi: demoGovdeler.length, puan_karari: demoGovdeler.length });
    const onay = p.kayitlar.find((k: any) => k.tur === 'soru_onaylandi');
    expect(onay).toMatchObject({ anahtarEski: 'A', anahtarYeni: 'C', rozetA1A2: ['A2'], supheler: ['hesapBaskaSik'], istemSurumu: 2, soruTuru: 'mc' });
    expect(p.kayitlar.find((k: any) => k.tur === 'soru_reddedildi').redKodu).toBe('ANH-YOK');
    expect(p.kayitlar.find((k: any) => k.tur === 'puan_karari').puanFarki).toBe(1.5);
    const { createHash } = await import('node:crypto');
    expect(onay.soruKimligi).toBe(createHash('sha256').update('tuz123:10').digest('hex'));
    const p2 = await f.arastirmaPaketi(gunluk, sorular, 'baska-tuz');
    expect(p2.kayitlar.find((k: any) => k.tur === 'soru_onaylandi').soruKimligi).not.toBe(onay.soruKimligi);
  });

  it('beyaz liste: bilinmeyen yeni alan pakete kendiliğinden girmez', async () => {
    const f = kur({ auditLog: [], questions: [] });
    const p = await f.arastirmaPaketi([{ tur: 'soru_onaylandi', at: 0, gizliYeniAlan: 'Ada Yılmaz' }], [], 't');
    expect(JSON.stringify(p)).not.toContain('Ada Yılmaz');
  });

  it('oturum tuzu rastgele 32 hex, tekrar çağrıda aynı; pakete yazılmaz', () => {
    const f = kur({});
    const t1 = f.arastirmaTuzu();
    expect(t1).toMatch(/^[0-9a-f]{32}$/);
    expect(f.arastirmaTuzu()).toBe(t1);
  });

  it('önce ekranda önizleme, sonra indirme; ağ çağrısı yok', () => {
    const g = govde('wireAudit');
    expect(g).toContain('_arastirmaOnizleme = JSON.stringify(await arastirmaPaketi(state.auditLog, state.questions, arastirmaTuzu()), null, 2);');
    expect(g).toContain('auditIndir(_arastirmaOnizleme, "mihenk-arastirma-paketi-anonim.json"');
    for (const ad of ['arastirmaPaketi', 'arastirmaOnizlemeHtml', 'sha256Hex']) {
      expect(govde(ad)).not.toMatch(/fetch\(|apiPost\(|XMLHttpRequest|sendBeacon/);
    }
    expect(govde('auditGunluguHtml')).toContain('arastirmaOnizlemeHtml()');
  });
});

describe('öz-kontrol', () => {
  it('yeni adlar selfCheck listesinde birer kez', () => {
    const sc = app.slice(app.indexOf('(function selfCheck()'));
    for (const ad of ['soruAnligi', 'duzenlemeAnligiAl', 'duzenlemeFarki', 'duzenlemeIziniKapat', 'onaydanSonraHapHtml',
      'yeniGercekOgrenci', 'rizaBekleyenler', 'rizaTopluIsaretle', 'yzIzinEtiketi', 'rizaSeridiHtml',
      'arastirmaTuzu', 'sha256Hex', 'arastirmaPaketi', 'arastirmaOnizlemeHtml']) {
      expect(sc.split('"' + ad + '"').length - 1, ad).toBe(1);
    }
  });
});
