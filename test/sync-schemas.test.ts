// ============================================================================
// Senkron katmanı şema testleri (§28b)
//
// agents.md §6: yeni bir uç eklendiğinde birim testi zorunludur. Buradaki
// testler sunucunun GİRDİ SÖZLEŞMESİNİ dondurur: oda kodu biçimi, boyut
// tavanı, bozuk JSON reddi ve durum kümesi.
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  syncPushSchema,
  syncPullSchema,
  syncResetSchema,
  MAX_PAYLOAD_CHARS,
  ROOM_RE,
  SESSION_STATUSES,
} from '../src/schemas/sync';

const gecerliYuk = JSON.stringify({ answers: {}, examStatus: 'submitted' });

const oturum = (uzer: Record<string, unknown> = {}) => ({
  examId: 1,
  studentId: 2,
  studentName: 'Test Öğrenci',
  status: 'submitted',
  payload: gecerliYuk,
  ...uzer,
});

describe('oda kodu (room)', () => {
  it('geçerli kodu kabul eder', () => {
    const r = syncPullSchema.safeParse({ room: 'AB2K' });
    expect(r.success).toBe(true);
  });

  it('küçük harfli kodu BÜYÜK harfe çevirir', () => {
    const r = syncPullSchema.safeParse({ room: 'ab2k' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.room).toBe('AB2K');
  });

  it('baştaki/sondaki boşluğu kırpar', () => {
    const r = syncPullSchema.safeParse({ room: '  AB2K  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.room).toBe('AB2K');
  });

  it('4 karakterden kısa kodu reddeder', () => {
    expect(syncPullSchema.safeParse({ room: 'AB2' }).success).toBe(false);
  });

  it('12 karakterden uzun kodu reddeder', () => {
    expect(syncPullSchema.safeParse({ room: 'ABCDEFGHJKLMN' }).success).toBe(false);
  });

  // Karışan karakterler bilinçli olarak dışarıda: kod sesli okunup elle yazılacak.
  it.each(['O', 'I', '0', '1'])('karışan karakteri (%s) reddeder', (ch) => {
    expect(syncPullSchema.safeParse({ room: 'AB2' + ch }).success).toBe(false);
  });

  it('noktalama içeren kodu reddeder', () => {
    expect(syncPullSchema.safeParse({ room: 'AB-2K' }).success).toBe(false);
  });

  it('ROOM_RE ile şema aynı kararı verir', () => {
    for (const kod of ['AB2K', 'ZZZZ9999', 'AB2']) {
      expect(syncPullSchema.safeParse({ room: kod }).success).toBe(ROOM_RE.test(kod));
    }
  });
});

describe('push gövdesi', () => {
  it('yalnızca sınavla gönderim kabul edilir', () => {
    const r = syncPushSchema.safeParse({
      room: 'AB2K',
      exam: { examId: 3, title: 'Kısa Sınav', payload: gecerliYuk },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sessions).toEqual([]);
  });

  it('yalnızca oturumla gönderim kabul edilir', () => {
    const r = syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum()] });
    expect(r.success).toBe(true);
  });

  it('bozuk JSON payload REDDEDİLİR', () => {
    // Bozuk gövde saklanırsa hata çekme anında ve BAŞKA BİR CİHAZDA patlar.
    const r = syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ payload: '{bozuk' })] });
    expect(r.success).toBe(false);
  });

  it('boyut tavanını aşan payload reddedilir', () => {
    const buyuk = JSON.stringify({ x: 'a'.repeat(MAX_PAYLOAD_CHARS) });
    expect(buyuk.length).toBeGreaterThan(MAX_PAYLOAD_CHARS);
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ payload: buyuk })] }).success).toBe(false);
  });

  it('tavanın hemen altındaki payload kabul edilir', () => {
    const tam = JSON.stringify({ x: 'a'.repeat(MAX_PAYLOAD_CHARS - 100) });
    expect(tam.length).toBeLessThanOrEqual(MAX_PAYLOAD_CHARS);
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ payload: tam })] }).success).toBe(true);
  });

  it.each(SESSION_STATUSES)('geçerli durumu (%s) kabul eder', (durum) => {
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ status: durum })] }).success).toBe(true);
  });

  it('tanımsız durumu reddeder', () => {
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ status: 'onaylandi' })] }).success).toBe(false);
  });

  it('60 oturumdan fazlasını reddeder', () => {
    const cok = Array.from({ length: 61 }, (_, i) => oturum({ studentId: i }));
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: cok }).success).toBe(false);
  });

  it('60 oturumu kabul eder', () => {
    const tam = Array.from({ length: 60 }, (_, i) => oturum({ studentId: i }));
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: tam }).success).toBe(true);
  });

  it('negatif kimlikleri reddeder', () => {
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ studentId: -1 })] }).success).toBe(false);
  });

  it('ondalıklı kimliği reddeder', () => {
    expect(syncPushSchema.safeParse({ room: 'AB2K', sessions: [oturum({ examId: 1.5 })] }).success).toBe(false);
  });

  it('öğrenci adı yoksa boş dizeye düşer', () => {
    const { studentName, ...adsiz } = oturum();
    const r = syncPushSchema.safeParse({ room: 'AB2K', sessions: [adsiz] });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sessions[0].studentName).toBe('');
  });

  it('oda kodu olmadan reddedilir', () => {
    expect(syncPushSchema.safeParse({ sessions: [oturum()] }).success).toBe(false);
  });
});

describe('reset gövdesi', () => {
  it('geçerli odayı kabul eder', () => {
    expect(syncResetSchema.safeParse({ room: 'AB2K' }).success).toBe(true);
  });

  it('geçersiz odayı reddeder — yanlış oda silinemez', () => {
    expect(syncResetSchema.safeParse({ room: '*' }).success).toBe(false);
  });
});
