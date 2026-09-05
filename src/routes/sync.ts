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

/* ============ HIZ SINIRI — ODA KODU TARAMASINA KARŞI (§28g) ============
   Oda kodu, o odadaki öğrenci verisine erişim anahtarıdır ve kimlik doğrulama
   YOKTUR. Hız sınırı olmadan /pull ucu deneme yanılmayla taranabilirdi:
   saniyede yüzlerce istekle kısa kodlar makul sürede bulunabilir.

   Alfabe 32 karakter (karışanlar çıkarılmış), üretilen kod 6 karakter:
   32^6 = 1.073.741.824 olasılık.

   🔴 3 EYLÜL, İLK SÜRÜM — CANLIDA ÖLÇÜLDÜ, TETİKLENMİYORDU.
   Sayaç bellek içi bir Map'ti ve HER İSOLATE İÇİN AYRIYDI. Canlıda ölçüm:
   2 saniyede 80 istek gönderildi, 80'i de 200 döndü, 429 çıkmadı; çünkü
   Cloudflare istekleri birden çok isolate'a dağıttı (AI uçlarındaki sınırın
   da bilinen durumu, AKTARIM §6.3-10).

   🔴 3 EYLÜL, İKİNCİ TUR — SAYAÇ D1'E TAŞINDI (Madde 6).
   Artık D1'deki `rate_limits` tablosunda tutuluyor; bu tablo tüm isolate'ler
   arasında PAYLAŞILIR (D1 tek bir mantıksal veritabanıdır, isolate'e özel
   değildir). Sabit pencereli sayaç (`window_start` + `count`), her istekte
   tek bir UPSERT ile güncellenir; SQLite'ın RETURNING'i ile güncel sayı aynı
   sorguda okunur (D1, SQLite 3.35+ tabanlıdır, RETURNING desteklenir).

   Neden AI uçlarındaki bellek-içi sınıra DOKUNULMADI: o sınır farklı bir
   risk sınıfını (kaynak/maliyet tüketimini yavaşlatmak) hedefliyor ve
   AI çağrıları zaten pahalı/yavaş olduğu için isolate başına sınır bile
   pratikte fren görevi görüyor. Buradaki risk (oda kodu taraması) ise
   ucuz ve hızlı istekler üzerinden çalışıyor — dağıtık sayaç olmadan sınır
   anlamsızlaşıyordu, bu yüzden yalnızca /api/sync/* güncellendi.

   Sınır İSTEMCİ BAŞINA değil, IP başınadır: amaç meşru kullanıcıyı değil
   tarayıcıyı yavaşlatmaktır. Bir sınıfta 30 öğrenci aynı ağdan girebileceği
   için okuma sınırı yazma sınırından yüksek tutuldu. */
export const SYNC_PULL_PER_MIN = 60;
export const SYNC_WRITE_PER_MIN = 30;

/**
 * §42 — SİLME UCU AYRI VE DAHA DAR BİR SINIRA ALINDI.
 *
 * `/reset` diğer yazma uçlarıyla aynı sınırı (30/dk) paylaşıyordu. Ama bu iki
 * uç aynı sınıfta değildir: `/push` yanlış çağrılırsa veri ÜZERİNE yazılır,
 * `/reset` çağrılırsa veri YOK OLUR ve geri alınamaz. Kimlik doğrulama
 * olmadığı için (bu dosyanın başındaki nota bakın) oda kodunu ele geçiren
 * biri için `/reset` en yıkıcı uçtur.
 *
 * 5/dk, meşru kullanımı hiç etkilemez — silme bir kez yapılan, `confirm()`
 * arkasındaki bir işlemdir (bkz. public/app.js syncSil) — ama otomatik bir
 * silme taramasını yavaşlatır. Kimlik doğrulamanın YERİNE GEÇMEZ; onu
 * ucuzlatılmış bir saldırı yolundan çıkarır.
 */
export const SYNC_RESET_PER_MIN = 5;

/**
 * §42 — `rate_limits` SATIRLARI HİÇ SİLİNMİYORDU.
 *
 * Sayaç D1'e taşınırken (§28g Madde 6) tabloya her IP+bucket çifti için bir
 * satır yazıldı ama hiçbir temizlik yolu eklenmedi: pencere kapansa da satır
 * kalıyor. Bir dönem boyunca tablo, bir daha asla okunmayacak satırlarla
 * büyür — `agents.md` §4'ün kaynak disiplinine aykırı.
 *
 * Temizlik her istekte YAPILMAZ (gereksiz yazma maliyeti): isolate başına en
 * fazla `TEMIZLIK_ARALIGI`'nda bir. Sayaç mantığını etkilemez, yalnızca
 * penceresi çoktan kapanmış satırları düşürür.
 */
const TEMIZLIK_ARALIGI = 600_000;   // 10 dakika
const ESKI_SATIR_YASI = 3_600_000;  // 1 saat
let sonTemizlik = 0;

async function eskiSayaclariTemizle(db: D1Database, simdi: number): Promise<void> {
  if (simdi - sonTemizlik < TEMIZLIK_ARALIGI) return;
  sonTemizlik = simdi;
  try {
    await db.prepare(`DELETE FROM rate_limits WHERE ?1 - window_start > ?2`)
      .bind(simdi, ESKI_SATIR_YASI)
      .run();
  } catch (e: any) {
    // Temizlik bir bakım işidir; başarısız olursa istek AKIŞINI BOZMAZ.
    console.error(JSON.stringify({ ev: 'rate_limit_cleanup_failed', message: e?.message }));
  }
}

/** İstemci kimliği: Cloudflare'in eklediği gerçek IP başlığı. */
function istemciAnahtari(c: any, ek: string): string {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for') ||
    'bilinmeyen';
  return `${ek}:${ip}`;
}

/**
 * D1'deki paylaşılan sayacı bir UPSERT ile artırır ve güncel sayıyı okur.
 * Sayaç sorgusu BAŞARISIZ OLURSA isteği ENGELLEMEZ, geçirir — hız sınırı bir
 * güvenlik katmanıdır, ana işlevi (senkron) kırmamalıdır; hata loglanır.
 */
async function hizSinirli(db: D1Database, c: any, ek: string, limit: number): Promise<boolean> {
  const anahtar = istemciAnahtari(c, ek);
  const simdi = Date.now();
  await eskiSayaclariTemizle(db, simdi);
  try {
    const sonuc = await db
      .prepare(
        `INSERT INTO rate_limits (bucket_key, window_start, count)
         VALUES (?1, ?2, 1)
         ON CONFLICT(bucket_key) DO UPDATE SET
           count = CASE WHEN ?2 - window_start >= 60000 THEN 1 ELSE count + 1 END,
           window_start = CASE WHEN ?2 - window_start >= 60000 THEN ?2 ELSE window_start END
         RETURNING count`
      )
      .bind(anahtar, simdi)
      .first<{ count: number }>();
    return (sonuc?.count ?? 0) > limit;
  } catch (e: any) {
    console.error(JSON.stringify({ ev: 'rate_limit_check_failed', message: e?.message }));
    return false;
  }
}

function cokFazla(c: any) {
  return c.json(
    {
      error: 'rate_limited',
      message: 'Çok fazla istek gönderildi. Bir dakika sonra tekrar deneyin.',
    },
    429
  );
}

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
  if (await hizSinirli(c.env.DB, c, 'push', SYNC_WRITE_PER_MIN)) return cokFazla(c);
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
  // Tarama saldırısının hedefi tam olarak burasıdır: kod doğruysa veri döner.
  if (await hizSinirli(c.env.DB, c, 'pull', SYNC_PULL_PER_MIN)) return cokFazla(c);
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
  // §42: silme, yazmadan DAHA DAR bir sınıra tabidir — bkz. SYNC_RESET_PER_MIN.
  if (await hizSinirli(c.env.DB, c, 'reset', SYNC_RESET_PER_MIN)) return cokFazla(c);
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
