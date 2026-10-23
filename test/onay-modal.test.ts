// ============================================================================
// §77 — Onay penceresi: tarayıcının yerel confirm() penceresi ortak bölgede
// kalmadı; dört tehlikeli eylem uygulamanın onaylaModal'ını kullanır.
// Davranış (odak, Escape, Enter, kırmızı düğme, odak geri dönüşü, çift tıklama,
// başka modal gelince false) gerçek tarayıcıda ölçüldü (PROGRESS §77); bu
// dosya kaynak düzeyinde GERİ DÖNÜŞÜ (birinin confirm() geri koymasını) yakalar.
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

/** Üst düzey `function ad(` tanımının gövdesi (bir sonraki üst düzey tanıma kadar). */
function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return son < 0 ? kalan : kalan.slice(0, son);
}

describe('onaylaModal — ortak bölgede yerel confirm() yok (§77)', () => {
  it('yardımcılar tanımlı', () => {
    expect(govde('onaylaModal')).toContain('Promise');
    expect(govde('onayliEylem')).toContain('onayBekliyor');
  });

  it('dört tehlikeli eylem onayliEylem kullanır, confirm() kullanmaz', () => {
    for (const [fn, isaret] of [
      ['wireSecimSekmeleri', 'dersi silinsin mi?'],
      ['wireSecimSekmeleri', 'kazanımı silinsin mi?'],
      ['wireKitaplik', 'kitaplıktan silinsin mi?'],
      ['wireAudit', 'Karar günlüğü tamamen silinsin mi?'],
    ]) {
      const g = govde(fn);
      expect(g, fn).not.toMatch(/\bconfirm\(/);
      expect(g, fn).toContain('onayliEylem(');
      expect(g, fn).toContain(isaret);
    }
  });

  it('tehlikeli eylemlerin hepsi kırmızı (tehlikeli: true)', () => {
    const g = govde('wireSecimSekmeleri') + govde('wireKitaplik') + govde('wireAudit');
    expect((g.match(/tehlikeli: true/g) || []).length).toBe(4);
  });

  it('W5 P1: odak tuzağı ORTAK düzeyde — her openModal arkayı inert yapar, Tab kutuda döner', () => {
    const om = govde('openModal');
    expect(om).toContain('modalArkasiInert(true)');
    expect(om).toContain('modalOdakTuzagiKur()');
    expect(govde('closeModal')).toContain('modalArkasiInert(false)');
    const tz = govde('modalOdakTuzagiKur');
    expect(tz).toContain('e.key !== "Tab"');
    expect(tz).toMatch(/e\.shiftKey[\s\S]*son\.focus\(\)[\s\S]*ilk\.focus\(\)/);
    // Kapanışta .app inert'i W5'in giriş kapısı eşitlemesine bırakılır (iki sahip çakışmaz).
    expect(govde('modalArkasiInert')).toContain('girisInertEsitle()');
    // onaylaModal'da ikinci bir Tab döngüsü yok.
    expect(govde('onaylaModal')).not.toContain('"Tab"');
  });

  it('onaydan sonra odak: aynı id → listede sonraki öğe → kart başlığı', () => {
    const g = govde('onayOdagiGeriVer');
    const i1 = g.indexOf('getElementById(iz.id)'), i2 = g.indexOf('liste[iz.sira]'), i3 = g.indexOf('.card h3');
    expect(i1).toBeGreaterThan(0); expect(i2).toBeGreaterThan(i1); expect(i3).toBeGreaterThan(i2);
  });

  it('W5 P2: metin aria-describedby ile bağlı; kapanınca kaldırılır', () => {
    const g = govde('onaylaModal');
    expect(g).toContain('id="onayMetin"');
    expect(g).toContain('setAttribute("aria-describedby", "onayMetin")');
    expect(g).toContain('removeAttribute("aria-describedby")');
  });

  it('W5 P2: onaydan sonra odak BODY\'ye düşmez (kart başlığı yedeği, eylemden sonra)', () => {
    expect(govde('onaylaModal')).toMatch(/setTimeout\(function \(\) \{[^}]*onayOdagiGeriVer\(iz\)/);
    const g = govde('onayOdagiGeriVer');
    expect(g).toContain('.card h3');
    expect(g).toContain('setAttribute("tabindex", "-1")');
  });

  it('odak Vazgeç\'te başlar, Escape = Vazgeç (kaynak düzeyi)', () => {
    const g = govde('onaylaModal');
    expect(g).toContain('getElementById("modalCancel").focus()');
    expect(g).toMatch(/e\.key === "Escape"[^}]*bitir\(false\)/);
  });
});
