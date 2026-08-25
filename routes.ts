// ============================================================================
// T3 Vakfı Creathon — Yapay Zekâ Destekli Ölçme ve Değerlendirme Sistemi
// Hono + Cloudflare Workers + D1 — rota iskeleti
//
// Bu dosya gerçek bir Hono uygulamasının route ağacını gösterir. Her handler
// bir yer tutucudur ("TODO"); iş mantığı ve D1 sorguları eklenmelidir.
// Panel/sekme eşlemesi için mimari dokümanındaki 3. bölüme bakınız.
// ============================================================================

import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  AI: Ai; // Workers AI binding — soru üretimi ve açık uçlu değerlendirme için
};

type Role = "content_expert" | "teacher" | "student" | "admin";

const app = new Hono<{ Bindings: Bindings }>();

// ---------------------------------------------------------------------------
// Ortak: rol bazlı yetkilendirme middleware'i
// ---------------------------------------------------------------------------
function requireRole(...roles: Role[]) {
  return async (c: any, next: () => Promise<void>) => {
    const user = c.get("user"); // authMiddleware tarafından set edilir
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  };
}

// ===========================================================================
// AUTH — tüm roller
// ===========================================================================
const auth = new Hono<{ Bindings: Bindings }>();
auth.post("/register", async (c) => c.json({ todo: "kullanıcı kaydı" }));
auth.post("/login", async (c) => c.json({ todo: "giriş + JWT/oturum" }));
auth.get("/me", async (c) => c.json({ todo: "role göre panele yönlendirme bilgisi" }));
auth.post("/logout", async (c) => c.json({ todo: "oturumu sonlandır" }));
app.route("/api/auth", auth);

// ===========================================================================
// İÇERİK UZMANI PANELİ
// 1. Alan: kaynak metin yükleme + kazanım/sınıf seviyesi belirleme
// 2. Alan: AI üretimli soruları inceleme/düzenleme/onaylama
// ===========================================================================
const documents = new Hono<{ Bindings: Bindings }>();
documents.use("*", requireRole("content_expert"));
documents.post("/", async (c) => c.json({ todo: "ders notu/metin yükle + konu/sınıf/kazanım kaydet" }));
documents.get("/", async (c) => c.json({ todo: "uzmanın yüklediği dokümanları listele" }));
documents.get("/:id", async (c) => c.json({ todo: "doküman detayı" }));
documents.post("/:id/generate-questions", async (c) =>
  c.json({ todo: "AI ile ÇSS + açık uçlu soru üretimini tetikle (Queue'ya gönder)" })
);
documents.get("/:id/questions", async (c) =>
  c.json({ todo: "bu dokümandan üretilen, incelenmeyi bekleyen sorular" })
);
app.route("/api/documents", documents);

const questionsReview = new Hono<{ Bindings: Bindings }>();
questionsReview.use("*", requireRole("content_expert"));
questionsReview.patch("/:id", async (c) => c.json({ todo: "soru metni/şıkları düzenle" }));
questionsReview.post("/:id/approve", async (c) =>
  c.json({ todo: "status='approved' → ortak soru havuzuna aktar" })
);
questionsReview.post("/:id/reject", async (c) => c.json({ todo: "status='rejected'" }));
app.route("/api/questions", questionsReview); // not: GET /api/questions aşağıda tüm roller için ortak

// ===========================================================================
// ORTAK SORU HAVUZU — okuma (Öğretmen ve İçerik Uzmanı)
// ===========================================================================
app.get("/api/questions", requireRole("teacher", "content_expert"), async (c) =>
  c.json({ todo: "havuzu filtrele: ?outcome=&difficulty=&type=&status=approved" })
);
app.get("/api/questions/:id", requireRole("teacher", "content_expert"), async (c) =>
  c.json({ todo: "soru detayı" })
);

// ===========================================================================
// ÖĞRETMEN PANELİ
// ===========================================================================
const exams = new Hono<{ Bindings: Bindings }>();
exams.use("*", requireRole("teacher"));

// -- 1. Sekme: sınav oluşturma -----------------------------------------------
exams.post("/", async (c) => c.json({ todo: "yeni sınav oluştur (draft)" }));
exams.get("/", async (c) => c.json({ todo: "öğretmenin sınavlarını listele" }));
exams.get("/:id", async (c) => c.json({ todo: "sınav detayı + soru listesi" }));
exams.patch("/:id", async (c) => c.json({ todo: "başlık/tarih/süre güncelle" }));
exams.delete("/:id", async (c) => c.json({ todo: "taslak sınavı sil" }));
exams.post("/:id/questions", async (c) =>
  c.json({ todo: "havuzdan soru ekle + AI süre önerisini kopyala" })
);
exams.patch("/:id/questions/:questionId", async (c) =>
  c.json({ todo: "sıra veya süre (time_estimate_sec) güncelle — manuel override" })
);
exams.delete("/:id/questions/:questionId", async (c) => c.json({ todo: "sınavdan soru çıkar" }));
exams.post("/:id/assign", async (c) =>
  c.json({ todo: "sınıf/öğrenci ataması + starts_at zamanlama" })
);
exams.post("/:id/publish", async (c) => c.json({ todo: "status: draft → scheduled/active" }));

// -- 2. Sekme: rubrik ---------------------------------------------------------
exams.post("/:id/rubrics", async (c) =>
  c.json({ todo: "açık uçlu soru için kriter listesi + max_score tanımla" })
);
app.route("/api/exams", exams);

app.patch("/api/rubrics/:id", requireRole("teacher"), async (c) =>
  c.json({ todo: "rubrik kriterlerini güncelle" })
);

// -- 3. Sekme: AI puan önerilerini inceleme/onaylama (Human-in-the-Loop) -----
const grading = new Hono<{ Bindings: Bindings }>();
grading.use("*", requireRole("teacher"));
grading.get("/exams/:id/evaluations", async (c) =>
  c.json({ todo: "sınavın onay bekleyen AI değerlendirmelerini listele" })
);
grading.get("/evaluations/:id", async (c) =>
  c.json({ todo: "tek yanıt: öğrenci cevabı + rubrik + AI puan/gerekçe" })
);
grading.patch("/evaluations/:id/review", async (c) =>
  c.json({
    todo: "final_score + teacher_comment + decision('approved_as_is'|'revised') kaydet — NİHAİ KARAR",
  })
);
app.route("/api", grading);

// -- 4. Sekme: analitikler ----------------------------------------------------
const teacherAnalytics = new Hono<{ Bindings: Bindings }>();
teacherAnalytics.use("*", requireRole("teacher"));
teacherAnalytics.get("/exams/:id/analytics", async (c) =>
  c.json({ todo: "sınav bazlı başarı dağılımı" })
);
teacherAnalytics.get("/classes/:className/analytics", async (c) =>
  c.json({ todo: "sınıf geneli + öğrenci bazlı gelişim trendi" })
);
teacherAnalytics.get("/students/:id/analytics", async (c) =>
  c.json({ todo: "öğrencinin kazanım bazlı eksik/güçlü alanları" })
);
app.route("/api", teacherAnalytics);

// ===========================================================================
// ÖĞRENCİ PANELİ
// ===========================================================================
const student = new Hono<{ Bindings: Bindings }>();
student.use("*", requireRole("student"));

// -- 1. Sekme: aktif/yaklaşan sınavlar ---------------------------------------
student.get("/exams", async (c) => c.json({ todo: "atanan aktif + yaklaşan sınavları getir" }));

// -- 2. Sekme: sınav çözüm ekranı --------------------------------------------
student.get("/exams/:id", async (c) => c.json({ todo: "soru listesi + kalan süre" }));
student.post("/exams/:id/start", async (c) => c.json({ todo: "started_at kaydet, geri sayımı başlat" }));
student.patch("/exams/:id/answers/:questionId", async (c) =>
  c.json({ todo: "auto-save: şık seçimi veya açık uçlu metni kaydet (last_saved_at güncelle)" })
);
student.post("/exams/:id/submit", async (c) =>
  c.json({ todo: "submitted_at kaydet + AI değerlendirme kuyruğuna gönder" })
);

// -- 3. Sekme: karne (öğretmen onayından sonra) ------------------------------
student.get("/exams/:id/report", async (c) =>
  c.json({ todo: "doğru/yanlış + açık uçlu puan/gerekçe (sadece status='results_approved')" })
);
app.route("/api/student", student);

// ===========================================================================
// EĞİTİM YÖNETİCİSİ PANELİ
// ===========================================================================
const admin = new Hono<{ Bindings: Bindings }>();
admin.use("*", requireRole("admin"));
admin.get("/overview", async (c) =>
  c.json({ todo: "okul geneli sınav tamamlanma oranları" })
);
admin.get("/pending-approvals", async (c) =>
  c.json({ todo: "öğretmen bazlı bekleyen değerlendirme sayısı" })
);
admin.get("/outcomes-heatmap", async (c) =>
  c.json({ todo: "sınıf x kazanım başarı ısı haritası matrisi" })
);
app.route("/api/admin", admin);

// ===========================================================================
// DAHİLİ / ARKA PLAN İŞLERİ (Cloudflare Queues consumer'ları)
// ===========================================================================
const internal = new Hono<{ Bindings: Bindings }>();
internal.post("/ai/generate-questions", async (c) =>
  c.json({ todo: "source_document_id al → AI ile ÇSS+açık uçlu soru üret → questions tablosuna yaz" })
);
internal.post("/ai/evaluate-submission", async (c) =>
  c.json({ todo: "exam_assignment_id al → açık uçlu yanıtları rubrike göre puanla → ai_evaluations yaz" })
);
app.route("/internal", internal);

export default app;
