// ============================================================================
// T3 Vakfı Creathon — Problem 2
// Senkron rotaları: cihazlar arası köprü (§28b)
//
// NE ÇÖZER: 3 Eylül'e kadar tüm veri `localStorage` + IndexedDB'deydi, yani
// her tarayıcı kendi verisini görüyordu. Öğrencinin çözdüğü sınav öğretmenin
// paneline DÜŞEMİYORDU. Bu router o köprüyü kurar.
//
// NE ÇÖZMEZ — ve bu arayüzde de açıkça yazar:
// Bu bir KİMLİK DOĞRULAMA DEĞİLDİR. Oda kodunu bilen herkes o odanın verisini
// görebilir. Gerçek kimlik doğrulama (Better Auth + users tablosu) üretim
// hedefidir; şema `schema.sql`'de hazır durur. Sessiz geri düşüş yasağı
// (§6.3-5) gereği bu sınır gizlenmez, ekranda söylenir.
//
// HITL (agents.md §1): buradaki hiçbir uç karar üretmez. Sunucu oturum
// gövdesini YORUMLAMAZ; yalnızca taşır ve saklar. Onay zinciri istemcide,
// öğretmenin elinde kalır.
// ============================================================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { syncPushSchema, syncPullSchema, syncResetSchema } from '../schemas/sync';

type Bindings = { DB?: D1Database };

/** agents.md §2: her hata yanıtı { error, message } biçiminde döner. */
const onInvalid = (
  result: { success: boolean; error?: { issues?: Array<{ path: (string | number)[]; message: string }> } },
  c: any
) => {
  if (result.success) return;
  const issues = result.error?.issues ?? [];
  const detay = issues.map((i) => `${i.path.join('.') || 'gövde'}: ${i.message}`).join('; ');
  return c.json({ error: 'validation_failed', message: detay || 'İstek gövdesi geçersiz.' }, 400);
};

const sync = new Hono<{ Bindings: Bindings }>();

/**
 * D1 bağlı değilse SESSİZCE BAŞARILI DÖNME (§6.3-5). Ürünün en sert kuralı
 * budur: çalışmayan bir şey çalışıyor gibi görünemez. Bağlama yoksa istemci
 * bunu öğrenir ve arayüzde "senkron kapalı" yazar.
 */
function dbYok(c: any) {
  return c.json(
    {
      error: 'sync_unavailable',
      message: 'Senkron veritabanı bu ortamda bağlı değil. Veriler yalnızca bu cihazda saklanıyor.',
    },
    503
  );
}

/** Senkronun açık olup olmadığını istemci açılışta buradan öğrenir. */
sync.get('/status', (c) => c.json({ ready: !!c.env.DB }));

// ---------------------------------------------------------------------------
// POST /api/sync/push — bu cihazdaki sınav tanımını ve oturumları yukarı yaz
// ---------------------------------------------------------------------------
sync.post('/push', zValidator('json', syncPushSchema, onInvalid), async (c) => {
  if (!c.env.DB) return dbYok(c);
  const b = c.req.valid('json');
  const db = c.env.DB;

  try {
    const islemler: D1PreparedStatement[] = [];

    if (b.exam) {
      // agents.md §2: string birleştirmeyle SQL yazılmaz, bind() kullanılır.
      islemler.push(
        db
          .prepare(
            `INSERT INTO sync_exams (exam_key, room, exam_id, title, payload, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
             ON CONFLICT(exam_key) DO UPDATE SET
               title = excluded.title, payload = excluded.payload, updated_at = datetime('now')`
          )
          .bind(`${b.room}:${b.exam.examId}`, b.room, b.exam.examId, b.exam.title, b.exam.payload)
      );
    }

    for (const s of b.sessions) {
      islemler.push(
        db
          .prepare(
            `INSERT INTO sync_sessions
               (session_key, room, exam_id, student_id, student_name, status, payload, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
             ON CONFLICT(session_key) DO UPDATE SET
               student_name = excluded.student_name, status = excluded.status,
               payload = excluded.payload, updated_at = datetime('now')`
          )
          .bind(
            `${b.room}:${s.examId}:${s.studentId}`,
            b.room,
            s.examId,
            s.studentId,
            s.studentName,
            s.status,
            s.payload
          )
      );
    }

    if (!islemler.length) {
      return c.json({ error: 'empty_push', message: 'Gönderilecek sınav ya da oturum yok.' }, 400);
    }

    await db.batch(islemler);
    return c.json({ ok: true, exams: b.exam ? 1 : 0, sessions: b.sessions.length });
  } catch (e: any) {
    console.error(JSON.stringify({ ev: 'sync_push_failed', message: e?.message }));
    return c.json({ error: 'sync_failed', message: 'Veriler sunucuya yazılamadı.' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /api/sync/pull — odadaki her şeyi indir
//
// Neden POST: oda kodu bir sorgu dizesinde taşınmamalıdır. Sorgu dizeleri
// sunucu erişim kayıtlarına ve tarayıcı geçmişine düşer; oda kodu o odadaki
// öğrenci verisine erişim anahtarıdır.
// ---------------------------------------------------------------------------
sync.post('/pull', zValidator('json', syncPullSchema, onInvalid), async (c) => {
  if (!c.env.DB) return dbYok(c);
  const { room } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // agents.md §4: SELECT * yerine ihtiyaç duyulan sütunlar + LIMIT.
    const sinavlar = await db
      .prepare(`SELECT exam_id, title, payload, updated_at FROM sync_exams WHERE room = ?1 ORDER BY exam_id LIMIT 50`)
      .bind(room)
      .all();

    const oturumlar = await db
      .prepare(
        `SELECT exam_id, student_id, student_name, status, payload, updated_at
           FROM sync_sessions WHERE room = ?1 ORDER BY exam_id, student_id LIMIT 500`
      )
      .bind(room)
      .all();

    return c.json({
      ok: true,
      room,
      exams: sinavlar.results ?? [],
      sessions: oturumlar.results ?? [],
    });
  } catch (e: any) {
    console.error(JSON.stringify({ ev: 'sync_pull_failed', message: e?.message }));
    return c.json({ error: 'sync_failed', message: 'Veriler sunucudan okunamadı.' }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /api/sync/reset — odanın tüm verisini sil
//
// KVKK/agents.md §7: küçüklerin verisi söz konusu olduğunda SİLME YOLU
// BULUNMAK ZORUNDADIR. Bu uç, gizlilik metninde de duyurulan silme hakkının
// teknik karşılığıdır.
// ---------------------------------------------------------------------------
sync.post('/reset', zValidator('json', syncResetSchema, onInvalid), async (c) => {
  if (!c.env.DB) return dbYok(c);
  const { room } = c.req.valid('json');
  const db = c.env.DB;

  try {
    const sonuc = await db.batch([
      db.prepare(`DELETE FROM sync_sessions WHERE room = ?1`).bind(room),
      db.prepare(`DELETE FROM sync_exams WHERE room = ?1`).bind(room),
    ]);
    const silinen = sonuc.reduce((t, r: any) => t + (r?.meta?.changes ?? 0), 0);
    return c.json({ ok: true, room, deleted: silinen });
  } catch (e: any) {
    console.error(JSON.stringify({ ev: 'sync_reset_failed', message: e?.message }));
    return c.json({ error: 'sync_failed', message: 'Oda verisi silinemedi.' }, 500);
  }
});

export default sync;
