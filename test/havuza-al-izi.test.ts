// ============================================================================
// §104b — "↩ Havuza Al" denetim izi (W10). Davranış aynı (soru approved olur,
// ek onay/modal yok); yalnız soru_havuza_alindi kaydı eklenir ve bu kayıt
// YZ önerisinin kabul oranına GİRMEZ.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

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

function kur(rol = 'teacher') {
  const state: any = { role: rol, auditLog: [] };
  const kod = sabitMetni('ROLES') + '\n' + sabitMetni('RED_KODLARI') + '\n' +
    ['havuzaAlindiKaydet', 'rolAdi', 'redKoduAdi', 'auditOzet', 'auditCsv', 'auditSatirHtml'].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', 'escapeHtml',
    'const AUDIT_ETIKET = {};\n' +
    'function ensureAudit() { state.auditLog = state.auditLog || []; }\n' +
    'function auditKaydet(tur, veri) { const k = { tur, at: 0 }; Object.keys(veri || {}).forEach(function (x) {' +
    ' if (veri[x] !== undefined && veri[x] !== null) k[x] = veri[x]; }); state.auditLog.push(k); }\n' +
    'function auditKisalt(s) { return String(s || ""); }\n' +
    'function auditZaman() { return "z"; }\n' +
    kod + '\nreturn { state, havuzaAlindiKaydet, rolAdi, auditOzet, auditCsv, auditSatirHtml };',
  )(state, esc);
}

const reddedilen = (ek: any = {}) => ({ id: 12, type: 'mc', status: 'rejected', body: 'Soru', uretenModel: 'llama', redKodu: 'ANH-YOK', ...ek });

describe('havuzaAlindiKaydet — yalnız kayıt', () => {
  it('qid, önceki durum, eski redKodu, rol yazılır; soru durumu DEĞİŞMEZ', () => {
    const { havuzaAlindiKaydet, state } = kur('teacher');
    const q: any = reddedilen();
    havuzaAlindiKaydet(q);
    expect(state.auditLog).toEqual([{ tur: 'soru_havuza_alindi', at: 0, qid: 12, soru: 'Soru', model: 'llama',
      oncekiDurum: 'rejected', redKodu: 'ANH-YOK', rol: 'teacher' }]);
    expect(q.status).toBe('rejected');
    expect(q.redKodu).toBe('ANH-YOK');
  });

  it('redKodu yoksa alan yazılmaz', () => {
    const { havuzaAlindiKaydet, state } = kur();
    havuzaAlindiKaydet(reddedilen({ redKodu: undefined }));
    expect('redKodu' in state.auditLog[0]).toBe(false);
  });
});

describe('düğme davranışı aynen', () => {
  const g = govde('wireRejectedPool');
  const restore = g.slice(g.indexOf('.restore-q'));

  it('yalnız "approve" modunda kayıt; kayıt redKodu silinmeden ve durum değişmeden ÖNCE', () => {
    const kayit = restore.indexOf('if (b.dataset.mode === "approve") havuzaAlindiKaydet(q);');
    expect(kayit).toBeGreaterThan(0);
    expect(kayit).toBeLessThan(restore.indexOf('delete q.redKodu'));
    expect(kayit).toBeLessThan(restore.indexOf('q.status = b.dataset.mode === "approve" ? "approved" : "ai_generated";'));
  });

  it('ek onay ya da modal yok', () => {
    expect(restore.slice(0, 900)).not.toMatch(/openModal|onaylaModal|onayliEylem|confirm\(/);
  });
});

describe('kabul oranına girmez', () => {
  const log = [
    { tur: 'soru_uretildi', adet: 4, model: 'llama' },
    { tur: 'soru_onaylandi', model: 'llama' },
    { tur: 'soru_reddedildi', model: 'llama', redKodu: 'ANH-YOK' },
    { tur: 'soru_havuza_alindi', model: 'llama', oncekiDurum: 'rejected', redKodu: 'ANH-YOK', rol: 'teacher' },
    { tur: 'soru_havuza_alindi', model: 'llama', oncekiDurum: 'rejected', rol: 'teacher' },
  ];

  it('"insan onayladı" ve model sayımı havuza alma kayıtlarından etkilenmez; ayrı sayaçta', () => {
    const { auditOzet, state } = kur();
    state.auditLog = log;
    const o = auditOzet();
    expect(o.onaylanan).toBe(1);
    expect(o.havuzaAlinan).toBe(2);
    expect(o.modeller).toEqual({ llama: 1 });
    expect(o.anahtarDuzeltme).toEqual({ rozetli: 0, rozetliDuzeltilen: 0, rozetsiz: 0, rozetsizDuzeltilen: 0 });
  });

  it('şişme gösterimi: kayıt "soru_onaylandi" olarak yazılsaydı onay sayısı 1 → 3 olurdu', () => {
    const { auditOzet, state } = kur();
    state.auditLog = log.map((k) => (k.tur === 'soru_havuza_alindi' ? { ...k, tur: 'soru_onaylandi' } : k));
    expect(auditOzet().onaylanan).toBe(3);   // 4 öneride 1 yerine 3 "kabul" — oran %25 → %75
  });

  it('AUDIT_ETIKET ve özet kutusu', () => {
    expect(app).toMatch(/soru_havuza_alindi:\s*\{ ad: "Reddedilen soru havuza alındı",[^}]*aktor: "öğretmen" \}/);
    expect(govde('auditGunluguHtml')).toContain('reddedilen havuza alındı');
  });
});

describe('Karar Günlüğü satırı ve CSV', () => {
  it('satırda önceki durum, rol adı ve eski red nedeni', () => {
    const { auditSatirHtml } = kur();
    const h = auditSatirHtml({ tur: 'soru_havuza_alindi', at: 0, soru: 'Soru', oncekiDurum: 'rejected', rol: 'teacher', redKodu: 'ANH-YOK' });
    expect(h).toContain('önceki durum: reddedilmiş · rol: Öğretmen');
    expect(h).toContain('eski red nedeni: ANH-YOK — Doğru cevap hiçbir şıkta yok');
  });

  it('CSV: oncekiDurum ve rol sütunları sonda, redKodu sütununda eski kod', () => {
    const { auditCsv, state } = kur();
    state.auditLog = [{ tur: 'soru_havuza_alindi', at: 0, oncekiDurum: 'rejected', redKodu: 'GVD-KOKYOK', rol: 'teacher' }];
    const [bas, satir] = auditCsv().replace(/^﻿/, '').split('\n');
    expect(bas.endsWith(';redKodu;anahtarDegisimi;rozetA1A2;oncekiDurum;rol;degisenAlanlar')).toBe(true);   // §107 sona ekledi
    expect(satir.split(';').slice(13, 18)).toEqual(['GVD-KOKYOK', '', '', 'rejected', 'teacher']);
  });

  it('rolAdi', () => {
    const { rolAdi } = kur();
    expect(rolAdi('content_expert')).toBe('İçerik Uzmanı');
    expect(rolAdi('x')).toBe('x');
  });

  it('yeni adlar selfCheck listesinde birer kez', () => {
    const sc = app.slice(app.indexOf('(function selfCheck()'));
    for (const ad of ['havuzaAlindiKaydet', 'rolAdi']) expect(sc.split('"' + ad + '"').length - 1, ad).toBe(1);
  });
});
