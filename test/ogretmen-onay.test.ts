// ============================================================================
// §79 — Öğretmen tarafında yerel confirm() kalmadı: beş onay (yayından kaldır,
// sınav/taslak sil, örnek listeyi temizle, öğrenci çıkar, kart menüsünden sil)
// ortak onaylaModal / onayliEylem'i (§77) kullanır. Davranış gerçek tarayıcıda
// ölçüldü (PROGRESS §79); bu dosya kaynak düzeyinde geri dönüşü yakalar.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return son < 0 ? kalan : kalan.slice(0, son);
}

describe('Öğretmen onayları ortak pencereyle (§79)', () => {
  it('beş noktada confirm() yok', () => {
    for (const fn of ['unpublishExam', 'deleteExam', 'wireSinifYonetim', 'sinavIslemi', 'wireExamSwitcher']) {
      expect(govde(fn), fn).not.toMatch(/\bconfirm\(/);
    }
  });

  it('yayından kaldır ve sil async, onaylaModal ile; çağıran bekler', () => {
    expect(app).toMatch(/^async function unpublishExam\(/m);
    expect(app).toMatch(/^async function deleteExam\(/m);
    expect(govde('unpublishExam')).toContain('await onaylaModal(');
    expect(govde('deleteExam')).toContain('await onaylaModal(');
    const s = govde('sinavIslemi');
    expect(s).toContain('await deleteExam(id)');
    expect(s).toContain('await unpublishExam(id)');
  });

  it('tehlikeli olanlar kırmızı: sil + örnek listeyi temizle + öğrenci çıkar; yayından kaldır değil', () => {
    expect(govde('deleteExam')).toContain('tehlikeli: true');
    expect((govde('wireSinifYonetim').match(/tehlikeli: true/g) || []).length).toBe(2);
    expect(govde('unpublishExam')).not.toContain('tehlikeli: true');
  });

  it('taslak silme de soruluyor (onay deleteExam içinde, koşulsuz)', () => {
    const g = govde('deleteExam');
    expect(g).not.toMatch(/if \(yayinda \|\| k\.baslayan\) \{\s*let uyari/);
    expect(g).toContain('"Evet, taslağı sil"');
  });

  it('kart menüsü çift tıklamada ikinci pencere açmaz', () => {
    expect(govde('wireExamSwitcher')).toContain('dataset.onayBekliyor');
    expect(govde('wireSinifYonetim')).toContain('onayliEylem(');
  });
});
