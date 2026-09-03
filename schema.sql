-- ============================================================================
-- T3 Vakfı Creathon — Yapay Zekâ Destekli Ölçme ve Değerlendirme Sistemi
-- Cloudflare D1 (SQLite) şeması
--
-- Kullanım: wrangler d1 execute <DB_ADI> --file=./schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. KURUM / KULLANICI
-- ----------------------------------------------------------------------------

CREATE TABLE schools (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id     INTEGER REFERENCES schools(id),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('content_expert','teacher','student','admin')),
  class_name    TEXT,                      -- öğrenciler için sınıf/şube (örn. "8-A")
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_school ON users(school_id);

-- ----------------------------------------------------------------------------
-- 2. KAZANIMLAR
-- ----------------------------------------------------------------------------

CREATE TABLE learning_outcomes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,        -- örn: "MAT.8.1.3"
  description TEXT NOT NULL,
  subject     TEXT NOT NULL,
  grade_level INTEGER NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. KAYNAK İÇERİK (İçerik Uzmanı — 1. Alan)
-- ----------------------------------------------------------------------------

CREATE TABLE source_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  uploaded_by   INTEGER NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  raw_text      TEXT NOT NULL,
  subject       TEXT NOT NULL,
  grade_level   INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processing'
                  CHECK (status IN ('processing','ready','failed')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE source_document_outcomes (       -- doküman <-> kazanım (N:N)
  source_document_id INTEGER NOT NULL REFERENCES source_documents(id),
  learning_outcome_id INTEGER NOT NULL REFERENCES learning_outcomes(id),
  PRIMARY KEY (source_document_id, learning_outcome_id)
);

-- ----------------------------------------------------------------------------
-- 4. SORU HAVUZU (İçerik Uzmanı — 2. Alan)
-- ----------------------------------------------------------------------------

CREATE TABLE questions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  source_document_id   INTEGER REFERENCES source_documents(id),
  learning_outcome_id  INTEGER REFERENCES learning_outcomes(id),
  type                 TEXT NOT NULL CHECK (type IN ('multiple_choice','open_ended')),
  body                 TEXT NOT NULL,
  options              TEXT,               -- JSON: [{"key":"A","text":"..."}] — sadece ÇSS
  correct_option_key   TEXT,               -- sadece ÇSS
  difficulty           TEXT NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  ai_estimated_time_sec INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'ai_generated'
                          CHECK (status IN ('ai_generated','pending_review','approved','rejected')),
  reviewed_by          INTEGER REFERENCES users(id),
  reviewed_at          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_questions_status     ON questions(status);
CREATE INDEX idx_questions_outcome    ON questions(learning_outcome_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);

-- ----------------------------------------------------------------------------
-- 5. RUBRİK (Öğretmen — 2. Sekme, açık uçlu puanlama anahtarı)
-- ----------------------------------------------------------------------------

CREATE TABLE rubrics (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  created_by INTEGER NOT NULL REFERENCES users(id),
  max_score  REAL NOT NULL,
  criteria   TEXT NOT NULL,   -- JSON: [{"label":"Kavram doğruluğu","weight":40,"description":"..."}]
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 6. SINAVLAR (Öğretmen — 1. Sekme)
-- ----------------------------------------------------------------------------

CREATE TABLE exams (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id    INTEGER NOT NULL REFERENCES users(id),
  title         TEXT NOT NULL,
  subject       TEXT NOT NULL,
  grade_level   INTEGER NOT NULL,
  starts_at     TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','active','completed','results_approved')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exam_questions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id          INTEGER NOT NULL REFERENCES exams(id),
  question_id      INTEGER NOT NULL REFERENCES questions(id),
  order_index      INTEGER NOT NULL,
  time_estimate_sec INTEGER NOT NULL,     -- AI önerisi, öğretmen tarafından değiştirilebilir
  UNIQUE (exam_id, question_id)
);

CREATE TABLE exam_assignments (            -- sınav <-> öğrenci ataması
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id     INTEGER NOT NULL REFERENCES exams(id),
  student_id  INTEGER NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started','in_progress','submitted','graded')),
  started_at   TEXT,
  submitted_at TEXT,
  UNIQUE (exam_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 7. YANITLAR (Öğrenci — 2. Sekme, auto-save)
-- ----------------------------------------------------------------------------

CREATE TABLE submissions (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_assignment_id    INTEGER NOT NULL REFERENCES exam_assignments(id),
  question_id           INTEGER NOT NULL REFERENCES questions(id),
  selected_option_key   TEXT,             -- ÇSS
  answer_text           TEXT,             -- açık uçlu
  last_saved_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exam_assignment_id, question_id)
);

-- ----------------------------------------------------------------------------
-- 8. AI DEĞERLENDİRME + ÖĞRETMEN ONAYI (Human-in-the-Loop çekirdeği)
-- ----------------------------------------------------------------------------

CREATE TABLE ai_evaluations (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id         INTEGER NOT NULL REFERENCES submissions(id),
  rubric_id             INTEGER REFERENCES rubrics(id),
  ai_score              REAL NOT NULL,
  ai_justification      TEXT NOT NULL,      -- AI gerekçe metni
  ai_criteria_breakdown TEXT NOT NULL,      -- JSON: kriter bazlı puan dökümü
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE teacher_reviews (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ai_evaluation_id INTEGER NOT NULL UNIQUE REFERENCES ai_evaluations(id),
  reviewed_by      INTEGER NOT NULL REFERENCES users(id),
  final_score      REAL NOT NULL,           -- nihai karar — öğretmende
  teacher_comment  TEXT,
  decision         TEXT NOT NULL CHECK (decision IN ('approved_as_is','revised')),
  reviewed_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- 9. ANALİTİK (Öğretmen 4. Sekme + Eğitim Yöneticisi Paneli)
-- ----------------------------------------------------------------------------

CREATE TABLE analytics_snapshots (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  scope               TEXT NOT NULL CHECK (scope IN ('student','class','school')),
  scope_ref           TEXT NOT NULL,        -- student_id / class_name / school_id
  learning_outcome_id INTEGER REFERENCES learning_outcomes(id),
  success_rate        REAL NOT NULL,        -- 0-100
  sample_size         INTEGER NOT NULL,
  computed_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_analytics_scope ON analytics_snapshots(scope, scope_ref);

-- ============================================================================
-- 10. SENKRON KATMANI — cihazlar arası köprü (§28b)
--
-- NEDEN AYRI:
-- Yukarıdaki 9 bölüm ürünün ÜRETİM hedef şemasıdır ve derin bir yabancı anahtar
-- zinciri taşır: teacher_reviews -> ai_evaluations -> submissions ->
-- exam_assignments -> exams -> users -> schools. Prototipte kimlik doğrulama
-- YOKTUR (roller arayüzden simüle edilir), dolayısıyla tek bir öğrenci yanıtını
-- bu zincire yazmak için UYDURMA `users` ve `schools` satırları üretmek
-- gerekirdi. Bu proje veri uydurmayı reddeder (PROGRESS §25b). Bu yüzden
-- cihazlar arası köprü, üretim şemasına dokunmadan ayrı ve açıkça adlandırılmış
-- iki tabloda tutulur. Kimlik doğrulama geldiğinde bu iki tablo düşer, yukarıdaki
-- şema devralır.
--
-- ODA (room) KAVRAMI:
-- Kimlik doğrulama olmadığı için "hangi öğretmen hangi öğrenciyi görür"
-- sorusunun cevabı bir ODA KODUDUR. Öğretmen kodu üretir, öğrencilere verir;
-- yalnızca aynı kodu girenler aynı veriyi görür. BU BİR KİMLİK DOĞRULAMA
-- DEĞİLDİR ve arayüzde de öyle yazar: kodu bilen herkes o odayı görebilir.
-- Demo/jüri açısından yararı, her denemenin kendi odasında yalıtılmasıdır.
-- ============================================================================

CREATE TABLE sync_exams (
  exam_key    TEXT PRIMARY KEY,     -- "<oda>:<sinav_id>"
  room        TEXT NOT NULL,
  exam_id     INTEGER NOT NULL,
  title       TEXT,
  payload     TEXT NOT NULL,        -- sınav tanımı + sorular + rubrikler (JSON)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sync_exams_room ON sync_exams(room);

CREATE TABLE sync_sessions (
  session_key TEXT PRIMARY KEY,     -- "<oda>:<sinav_id>:<ogrenci_id>"
  room        TEXT NOT NULL,
  exam_id     INTEGER NOT NULL,
  student_id  INTEGER NOT NULL,
  student_name TEXT,                -- öğretmenin kağıdı kime ait bilmesi için
  status      TEXT NOT NULL,        -- not_started | in_progress | submitted | graded
  payload     TEXT NOT NULL,        -- yanıtlar + ai değerlendirmesi + onaylar (JSON)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sync_sessions_room ON sync_sessions(room, exam_id);

-- ============================================================================
-- 11. HIZ SINIRI — dağıtık sayaç (§28r Madde 6)
--
-- NEDEN AYRI TABLO, KV DEĞİL: Bu Worker zaten D1'e bağlı (senkron katmanı
-- için); yeni bir Cloudflare kaynağı (KV namespace) açmak yerine var olan
-- bağlantıyı kullanmak hem daha az risk hem daha az kurulum adımıdır.
--
-- SABİT PENCERE (fixed window), KAYAN PENCERE DEĞİL: her istek için ayrı
-- satır tutup temizlemek D1'de gereksiz karmaşıklık olurdu. Bunun yerine
-- her (uç+IP) çifti için TEK satır tutulur; pencere 60 saniyeden eskiyse
-- sayaç sıfırlanır. Bu yüzden tablo aktif IP sayısı kadar satır tutar,
-- sınırsız büyümez.
-- ============================================================================

CREATE TABLE rate_limits (
  bucket_key    TEXT PRIMARY KEY,     -- "<uc>:<ip>", örn. "pull:203.0.113.7"
  window_start  INTEGER NOT NULL,     -- pencerenin başladığı Date.now() (ms)
  count         INTEGER NOT NULL
);
