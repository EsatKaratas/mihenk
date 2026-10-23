// §79 (W4 bulgusu) — Öğretmen › Analitik "N / M tamamladı": M sınavın hedef
// sınıfına göre sayılır; kural yönetici panosuyla tek (yonSinavAtandiMi, §77).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  return app.slice(bas, app.indexOf('\n}\n', bas) + 3);
}

/** teacherTab4Html'in payda hesabını, gerçek yonSinavAtandiMi ile kurar. */
function payda(state: any, oturumlar: Record<string, string> = {}) {
  const kod = ['yonSinavi', 'yonOturum', 'yonSinavAtandiMi'].map((ad) => {
    const tek = app.match(new RegExp('\\nfunction ' + ad + '\\([^\\n]*\\{[^\\n]*\\}\\n'));
    return tek ? tek[0] : fonksiyonMetni(ad);
  }).join('\n');
  const readSession = (sid: number) => ({ examStatus: oturumlar[sid] || 'not_started' });
  // eslint-disable-next-line no-new-func
  const f = new Function('state', 'readSession', kod + '\nreturn yonSinavAtandiMi;')(state, readSession);
  const aktif = state.exams.find((x: any) => x.id === state.activeExamId);
  return state.students.filter((o: any) => f(aktif, o)).length;
}

const ogrenciler = [
  { id: 1, name: 'Ada', sinif: '7-A' }, { id: 2, name: 'Kerem', sinif: '7-A' },
  { id: 3, name: 'Elif', sinif: '7-B' }, { id: 4, name: 'Mert', sinif: '7-B' },
];
const durum = (hedef: string) => ({
  students: ogrenciler, activeExamId: 9,
  exam: { targetClass: hedef, status: 'published' },
  exams: [{ id: 9, targetClass: 'BAYAT', sessions: {} }],   // aktif sınav canlı alandan (state.exam) okunur
});

describe('Analitik "N / M tamamladı" paydası (§79)', () => {
  it('7-B hedefli sınavda M = 7-B öğrenci sayısı (2), tümü değil (4)', () => {
    expect(payda(durum('7-B'))).toBe(2);
  });
  it('hedef boşsa (tüm sınıflar) M = tüm öğrenciler', () => {
    expect(payda(durum(''))).toBe(4);
  });
  it('sınava girmiş başka şube öğrencisi atanmış sayılır (yönetici kuralıyla aynı)', () => {
    expect(payda(durum('7-B'), { 1: 'submitted' })).toBe(3);
  });
  it('teacherTab4Html paydayı yonSinavAtandiMi ile hesaplar (ayrı kural yok)', () => {
    const govde = fonksiyonMetni('teacherTab4Html');
    expect(govde).toContain('yonSinavAtandiMi(aktifKayit');
    expect(govde).not.toMatch(/const tumOgr = \(state\.students \|\| \[\]\)\.length;/);
  });
});
