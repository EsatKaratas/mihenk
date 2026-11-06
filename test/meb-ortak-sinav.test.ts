// ============================================================================
// §119 — MEB uyumu: ortak yazılı sınav sonuçları Eğitim Yöneticisi ekranında
// şubeler arasında karşılaştırılmaz (ÖDSGM 11.09.2025 / 140379263, madde 11).
// İşlevler kaynak metinden çıkarılıp new Function ile sınanır. Tarayıcı ölçümü
// PROGRESS §119'da (önce: 7-A %94 / 7-B %48 yan yana; sonra: 0 karşılaştırma).
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8');

function tanim(ad: string): string {
  const bas = app.search(new RegExp('^function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}
const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
function yukle(state: Any): Any {
  return new Function('state', 'escapeHtml', 'yonSinavUygunMu', 'yonSinavi',
    ['ORTAK_SINAV_KAYNAK', 'ORTAK_SINAV_ACIKLAMA'].map(sabit).join('\n') + '\n' +
    ['ortakSinavMi', 'ortakSinavAlaniHtml', 'yonKarsilastirmaKayitlari', 'yonOrtakDisiSayisi', 'yonOrtakNotuHtml'].map(tanim).join('\n') +
    '\nreturn { ortakSinavMi, ortakSinavAlaniHtml, yonKarsilastirmaKayitlari, yonOrtakDisiSayisi, yonOrtakNotuHtml, ORTAK_SINAV_ACIKLAMA };'
  )(state, escapeHtml, (k: Any) => k.status === 'published', (k: Any) => k);
}

describe('§119 ortak sınav işareti', () => {
  const k = yukle({ exams: [] });
  it('açık işaret önce; yoksa OYSS senaryosuna bağlı sınav ortak sayılır', () => {
    expect(k.ortakSinavMi(null)).toBe(false);
    expect(k.ortakSinavMi({})).toBe(false);
    expect(k.ortakSinavMi({ oyssSenaryo: { satirlar: [] } })).toBe(true);
    expect(k.ortakSinavMi({ oyssSenaryo: { satirlar: [] }, ortakSinav: false })).toBe(false);
    expect(k.ortakSinavMi({ ortakSinav: true })).toBe(true);
  });
  it('kutu: işaret durumunu gösterir, kaynağı yazar, etiket kutuyu sarar', () => {
    const h = k.ortakSinavAlaniHtml({ oyssSenaryo: {} });
    expect(h).toMatch(/<label[^>]*><input type="checkbox" id="examOrtakSinav" checked>/);
    expect(h).toContain('140379263');
    expect(h).toContain('Sizin sınıf analiziniz değişmez');
    expect(k.ortakSinavAlaniHtml({})).not.toContain(' checked');
  });
});

describe('§119 yönetici karşılaştırması ortak sınavı dışlar', () => {
  const exams = [
    { id: 1, status: 'published', title: 'Kısa sınav' },
    { id: 2, status: 'published', title: 'OYSS', oyssSenaryo: { satirlar: [] } },
    { id: 3, status: 'published', title: 'Elle ortak', ortakSinav: true },
    { id: 4, status: 'draft', title: 'Taslak ortak', ortakSinav: true },
    { id: 5, status: 'published', title: 'OYSS ama işaret kaldırıldı', oyssSenaryo: {}, ortakSinav: false },
  ];
  const k = yukle({ exams });
  it('karşılaştırmaya yalnız ortak olmayan yayınlı sınavlar girer', () => {
    expect(k.yonKarsilastirmaKayitlari({}).map((x: Any) => x.id)).toEqual([1, 5]);
    expect(k.yonOrtakDisiSayisi({})).toBe(2);   // taslak sayılmaz
  });
  it('not: kaynaklı tek cümle, role=note; ortak sınav yoksa boş', () => {
    const n = k.yonOrtakNotuHtml({});
    expect(n).toContain('role="note"');
    expect(n).toContain('<b>2 ortak yazılı sınav</b> bu şube karşılaştırmasına katılmadı: ');
    expect(n).toContain('okullar ve sınıflar arası karşılaştırmalı veri');
    expect(n).toContain('ÖDSGM, 11.09.2025 tarih ve 140379263 sayılı yazı, madde 11');
    expect((k.ORTAK_SINAV_ACIKLAMA.match(/\. /g) || []).length).toBe(0);   // tek cümle
    expect(yukle({ exams: [exams[0]] }).yonOrtakNotuHtml({})).toBe('');
  });
});

describe('§119 kaynak sözleşmesi', () => {
  it('grafik satırları, eylem kartı (aynı satırlar) ve sınav geçmişi aynı süzgeçten geçer', () => {
    expect(tanim('yonGercekSatirlar')).toContain('yonKarsilastirmaKayitlari(f)');
    expect(tanim('yonSinavGecmisi')).toContain('yonKarsilastirmaKayitlari(f)');
    const ra = tanim('renderAdmin');
    expect(ra).toContain('const gercekSatirlar = yonGercekSatirlar(f);');
    expect(ra.indexOf('yonOrtakNotuHtml(f)')).toBeLessThan(ra.indexOf('<div id="adminHeatmap">'));
  });
  it('kutu sihirbazın 1. adımında (var olan sınav), değişiklik state.exam.ortakSinav\'a yazılır', () => {
    expect(tanim('sihirbazAdim1Html')).toContain('(yeni ? "" : ortakSinavAlaniHtml(state.exam))');
    expect(app).toMatch(/getElementById\("examOrtakSinav"\);\s*\/\/ §119\s*\n\s*if \(ortakEl\) ortakEl\.onchange = function \(e\) \{ state\.exam\.ortakSinav = !!e\.target\.checked; saveSoon\(\); \};/);
  });
});
