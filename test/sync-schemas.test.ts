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

// ============================================================================
// Hız sınırı — oda kodu taramasına karşı (§28g)
//
// Oda kodu kimlik doğrulama YERİNE geçtiği için, /pull ucunun taranabilir
// olmaması ürünün tek erişim korumasıdır. Sınırın kendisi guards.ts'te ve
// zaten test ediliyor; buradaki testler SYNC UÇLARININ SEÇTİĞİ DEĞERLERİ ve
// anahtar ayrımını dondurur.
// ============================================================================
import { rateLimited } from '../src/lib/guards';
import { SYNC_PULL_PER_MIN, SYNC_WRITE_PER_MIN } from '../src/routes/sync';

describe('senkron hız sınırı', () => {
  it('okuma sınırı yazma sınırından yüksektir (bir sınıf aynı ağdan girebilir)', () => {
    expect(SYNC_PULL_PER_MIN).toBeGreaterThan(SYNC_WRITE_PER_MIN);
  });

  it('sınır değerleri tarama için anlamlı bir tavan verir', () => {
    // 32 karakterlik alfabe, 6 karakterlik kod.
    const olasilik = Math.pow(32, 6);
    const gunlukDeneme = SYNC_PULL_PER_MIN * 60 * 24;
    const yil = olasilik / 2 / gunlukDeneme / 365;
    expect(yil).toBeGreaterThan(10);   // belirli bir odayı bulmak on yıllar sürmeli
  });

  it('sınıra ulaşınca engeller, altında geçirir', () => {
    const hits = new Map<string, number[]>();
    const now = Date.now();
    for (let i = 0; i < SYNC_PULL_PER_MIN; i++) {
      expect(rateLimited(hits, 'pull:1.2.3.4', SYNC_PULL_PER_MIN, now)).toBe(false);
    }
    expect(rateLimited(hits, 'pull:1.2.3.4', SYNC_PULL_PER_MIN, now)).toBe(true);
  });

  it('farklı IP\'ler birbirini engellemez', () => {
    const hits = new Map<string, number[]>();
    const now = Date.now();
    for (let i = 0; i < SYNC_PULL_PER_MIN; i++) rateLimited(hits, 'pull:1.1.1.1', SYNC_PULL_PER_MIN, now);
    expect(rateLimited(hits, 'pull:1.1.1.1', SYNC_PULL_PER_MIN, now)).toBe(true);
    expect(rateLimited(hits, 'pull:2.2.2.2', SYNC_PULL_PER_MIN, now)).toBe(false);
  });

  it('okuma ve yazma sayaçları AYRIDIR — okuma dolunca yazma kilitlenmez', () => {
    const hits = new Map<string, number[]>();
    const now = Date.now();
    for (let i = 0; i < SYNC_PULL_PER_MIN; i++) rateLimited(hits, 'pull:9.9.9.9', SYNC_PULL_PER_MIN, now);
    expect(rateLimited(hits, 'pull:9.9.9.9', SYNC_PULL_PER_MIN, now)).toBe(true);
    expect(rateLimited(hits, 'push:9.9.9.9', SYNC_WRITE_PER_MIN, now)).toBe(false);
  });

  it('bir dakika sonra pencere açılır', () => {
    const hits = new Map<string, number[]>();
    const t0 = Date.now();
    for (let i = 0; i < SYNC_WRITE_PER_MIN; i++) rateLimited(hits, 'push:5.5.5.5', SYNC_WRITE_PER_MIN, t0);
    expect(rateLimited(hits, 'push:5.5.5.5', SYNC_WRITE_PER_MIN, t0)).toBe(true);
    expect(rateLimited(hits, 'push:5.5.5.5', SYNC_WRITE_PER_MIN, t0 + 61_000)).toBe(false);
  });
});
