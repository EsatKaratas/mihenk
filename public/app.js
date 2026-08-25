/* ============================== Sabitler ============================== */
const STOPWORDS = new Set(["ve","veya","ile","bir","bu","şu","o","da","de","ki","mi","mı","mu","mü","çok","daha",
  "gibi","için","olan","olarak","ise","ancak","fakat","ama","en","çünkü","kadar","göre","üzere","hem","ya","yani",
  "diye","hiç","her","bazı","tüm","bütün","şey","kez","olur","değil","vb","vs","dir","dır","dur","dür","onun",
  "bunun","şunun","biz","siz","onlar","ben","sen","değildir","olduğu","olduğunu","yapılan","yapılır"]);

// Bunlar artık sabit değil, yalnızca BAŞLANGIÇ değerleridir.
// Kullanıcı kendi dersini, sınıf düzeyini ve kazanımını tanımlayabilir
// (brief MVP 1: "konu, kazanım, seviye ... sisteme tanımlar").
const VARSAYILAN_DERSLER = ["Matematik", "Fen Bilimleri", "Türkçe", "Sosyal Bilgiler", "İngilizce"];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const VARSAYILAN_KAZANIMLAR = [
  { code: "MAT.7.2.1", label: "MAT.7.2.1 — Oran ve Orantı" },
  { code: "MAT.7.3.4", label: "MAT.7.3.4 — Cebirsel İfadeler" },
  { code: "FEN.7.1.2", label: "FEN.7.1.2 — Kuvvet ve Hareket" },
];

// Canlı listeler: state üzerinden okunur, kullanıcı ekleyip silebilir.
function OUTCOMES_LIST() { return state.outcomes && state.outcomes.length ? state.outcomes : VARSAYILAN_KAZANIMLAR; }
function SUBJECTS_LIST() { return state.subjects && state.subjects.length ? state.subjects : VARSAYILAN_DERSLER; }
const ROLES = [
  { id: "content_expert", label: "İçerik Uzmanı", hint: "soru üretimi ve onay" },
  { id: "teacher", label: "Öğretmen", hint: "sınav ve değerlendirme" },
  { id: "student", label: "Öğrenci", hint: "sınav çözümü" },
  { id: "admin", label: "Eğitim Yöneticisi", hint: "okul genel bakış" },
];

/* ============================== Yardımcılar ============================== */
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}
function truncate(str, n) { str = String(str || ""); return str.length > n ? str.slice(0, n - 1) + "…" : str; }
// Model her soruya bilissel duzey (Bloom) etiketi uretir; bu etiket
// olcme aracinin yalnizca ezber olcup olcmedigini gorunur kilar.
var BLOOM_TR = { hatirlama: "Hatırlama", anlama: "Anlama", uygulama: "Uygulama",
                 analiz: "Analiz", degerlendirme: "Değerlendirme", yaratma: "Yaratma" };
function bloomPill(b) {
  if (!b || !BLOOM_TR[b]) return "";
  return '<span class="pill pill-bloom" title="Bloom taksonomisi — sorunun ölçtüğü bilişsel düzey">' + BLOOM_TR[b] + '</span>';
}

function diffLabel(d) { return { easy: "Kolay", medium: "Orta", hard: "Zor" }[d] || d; }
function formatTime(sec) {
  sec = Math.max(0, sec | 0);
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function examStatusLabel() {
  return { not_started: "Başlamadı", in_progress: "Sürüyor", submitted: "Değerlendiriliyor", graded: "Sonuçlandı" }[state.examStatus];
}
function pseudoRandom(seed) { const x = Math.sin(seed * 9301 + 49297) % 1; return Math.abs(x); }

function extractKeywords(text, n) {
  const words = (text || "").toLowerCase()
    .replace(/[^a-zçğıöşü\s]/gi, " ")
    .split(/\s+/)
    .filter(function (w) { return w.length > 3 && !STOPWORDS.has(w); });
  const freq = {};
  words.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
  let uniq = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
  const fallback = ["kavram", "ilke", "süreç", "örnek", "yöntem", "ilişki", "etki", "sonuç", "gözlem", "veri"];
  let fi = 0;
  while (uniq.length < n && fi < fallback.length) {
    if (uniq.indexOf(fallback[fi]) === -1) uniq.push(fallback[fi]);
    fi++;
  }
  return uniq.slice(0, n).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
}

/* ====================== Yerel Yedek (Simülasyon) ======================
   Model sunucusuna ulasilamadiginda devreye giren sablon tabanli yedek.
   Arayuzde bu mod acikca "Yerel simulasyon" olarak isaretlenir.        */
let qIdSeq = 1;

function simulateQuestions(doc) {
  const kw = extractKeywords(doc.text, 8);
  const offset = (state.genCount * 2) % Math.max(1, kw.length - 3 > 0 ? kw.length - 3 : kw.length);
  const k = function (i) { return kw[(offset + i) % kw.length]; };
  const mk = function () { return qIdSeq++; };
  const qs = [
    {
      id: mk(), type: "mc", difficulty: "easy", outcome: doc.outcome,
      body: 'Metne göre "' + k(0) + '" kavramıyla en doğrudan ilişkili seçenek hangisidir?',
      options: [{ key: "A", text: k(1) }, { key: "B", text: k(2) }, { key: "C", text: k(3) }, { key: "D", text: "Metinde bu konuya değinilmemiştir" }],
      correctKey: "A", aiTime: 45, status: "ai_generated", refKeywords: [k(0), k(1)],
    },
    {
      id: mk(), type: "mc", difficulty: "medium", outcome: doc.outcome,
      body: '"' + doc.outcomeLabel + '" kazanımı kapsamında, metinde geçen "' + k(2) + '" ifadesi en çok hangisiyle ilişkilendirilir?',
      options: [{ key: "A", text: k(4) }, { key: "B", text: k(3) }, { key: "C", text: k(5) }, { key: "D", text: "Bunların hiçbiri" }],
      correctKey: "B", aiTime: 60, status: "ai_generated", refKeywords: [k(2), k(3)],
    },
    {
      id: mk(), type: "open", difficulty: "hard", outcome: doc.outcome,
      body: '"' + k(0) + '" ve "' + k(1) + '" kavramları arasındaki ilişkiyi metinden yararlanarak açıklayınız; en az bir örnek veriniz.',
      aiTime: 240, status: "ai_generated", refKeywords: [k(0), k(1), k(2)],
    },
  ];
  state.genCount++;
  return qs;
}

function simulateAIEvaluation(q, answerText, rubric) {
  const text = (answerText || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const lengthFactor = Math.max(0, Math.min(1, words.length / 40));
  const kws = q.refKeywords || [];
  const found = kws.filter(function (kwd) { return text.indexOf(String(kwd).toLowerCase()) !== -1; });
  const coverage = kws.length ? found.length / kws.length : 0.4;
  const breakdown = rubric.criteria.map(function (c, i) {
    const base = 0.45 * lengthFactor + 0.55 * coverage;
    const jitter = (pseudoRandom(q.id + i * 7) - 0.5) * 0.18;
    const ratio = Math.max(0.1, Math.min(1, base + jitter));
    const max = Math.round(rubric.maxScore * (Number(c.weight) / 100) * 10) / 10;
    const points = Math.round(max * ratio * 2) / 2;
    return { label: c.label, weight: c.weight, max: max, points: points };
  });
  const aiScore = Math.round(breakdown.reduce(function (s, b) { return s + b.points; }, 0) * 2) / 2;

  let justification;
  if (!words.length) {
    justification = "Yanıt boş bırakıldığı için kriterlerin hiçbirinde puan verilemedi.";
  } else if (coverage >= 0.75) {
    justification = 'Yanıt, "' + kws.slice(0, 2).join('" ve "') + '" kavramlarına doğrudan değiniyor ve yeterli uzunlukta açıklama içeriyor.';
  } else if (coverage > 0) {
    const missing = kws.filter(function (kwd) { return found.indexOf(kwd) === -1; });
    justification = 'Yanıt "' + (found[0] || kws[0]) + '" kavramına değiniyor ancak ' +
      (missing[0] ? '"' + missing[0] + '" ile ilişkisini' : "örnekle desteklemeyi") + " yeterince açıklamıyor.";
  } else {
    justification = "Yanıt, sorunun beklediği temel kavramlara doğrudan değinmiyor; örnek ve açıklama eksik.";
  }
  return { aiScore: aiScore, maxScore: rubric.maxScore, justification: justification, breakdown: breakdown };
}


/* ========================= Gerçek AI Katmanı =========================
   Worker üzerindeki /api/ai/* uçlarına bağlanır. Başarısız olursa yerel
   yedeğe düşer ve bu durum kullanıcı arayüzünde açıkça gösterilir.      */
const AI_API = { status: "/api/ai/status", generate: "/api/ai/generate-questions", evaluate: "/api/ai/evaluate", rubric: "/api/ai/rubric", sampleAnswers: "/api/ai/sample-answers" };

async function probeAiMode() {
  try {
    const r = await fetch(AI_API.status, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    state.ai.provider = j.provider || "";
    state.ai.model = j.model || "";
    state.ai.mode = j.ready ? "live" : "simulation";
    state.ai.fallback = j.fallback || null;
    state.ai.error = j.ready ? "" : "model sağlayıcısı yapılandırılmamış";
  } catch (e) {
    state.ai.mode = "simulation";
    state.ai.error = "API'ye ulaşılamadı";
  }
  renderAll();
}

async function apiPost(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(function () { return null; });
  if (!r.ok) throw new Error((j && j.message) || ("HTTP " + r.status));
  return j;
}

async function aiGenerateQuestions(doc) {
  // Hiç gerçek model yoksa (statik/çevrimdışı prototip) yerel yedek kullanılır
  // ve arayüzdeki rozet zaten "Yerel simülasyon" yazar.
  if (state.ai.mode !== "live") return simulateQuestions(doc);
  // Gerçek model modundayken çağrı başarısız olursa YEDEĞE DÜŞMEYİZ:
  // şablon üretimi anahtar kelimeleri şıklara dizen bir taklittir; bunu
  // "yapay zekânın ürettiği soru" gibi göstermek kullanıcıyı yanıltır.
  try {
    const j = await apiPost(AI_API.generate, {
      sourceText: doc.text.slice(0, 6000),
      subject: doc.subject,
      grade: String(doc.grade),
      outcomeCode: doc.outcome,
      outcomeLabel: doc.outcomeLabel,
      mcCount: state.ceForm.mcCount,
      openCount: state.ceForm.openCount,
      optionCount: 4,
      docKey: doc.title || "adsiz",
    });
    state.ai.error = "";
    if (j.meta) { state.ai.usingFallback = !!j.meta.fellBack; if (j.meta.model) state.ai.model = j.meta.model; }
    return (j.questions || []).map(function (q) {
      return {
        id: qIdSeq++, type: q.type, difficulty: q.difficulty, outcome: doc.outcome,
        body: q.body, options: q.options, correctKey: q.correctKey,
        distractorRationale: q.distractorRationale || {}, bloom: q.bloom,
        aiTime: q.aiTime, status: "ai_generated", refKeywords: q.refKeywords || [],
      };
    });
  } catch (e) {
    state.ai.error = String((e && e.message) || e);
    state.ceForm.error = "Soru üretilemedi: " + state.ai.error +
      " — Bağlantınızı kontrol edip tekrar deneyin. Hiçbir soru üretilmedi.";
    return [];
  }
}

/* ==================== Değerlendirme Önbelleği ====================
   NEDEN: Workers AI ücretsiz kotası günde ~10 tam demo turu. Provalarda aynı
   yanıt aynı rubrikle defalarca değerlendiriliyor ve her seferinde tam ücret
   ödeniyordu. Aynı girdi → aynı sonuç olduğu için yeniden çağırmak gereksiz.

   DOĞRULUK GARANTİLERİ — anahtar, sonucu etkileyen HER ŞEYİ içerir:
     soru gövdesi · kazanım etiketi · rubrik (maxScore + kriter/ağırlık) ·
     öğrenci yanıtı · model adı
   Bunlardan biri değişirse anahtar değişir ve model yeniden çağrılır;
   bayat sonuç gösterilmez.

   Ek önlemler:
     - Başarısız değerlendirmeler ASLA önbelleğe alınmaz
     - Hash çakışmasına karşı tam anahtar saklanır ve isabette doğrulanır
     - Saklanan değer derin kopyadır (sonradan mutasyon önbelleği bozmasın)
     - "Yeniden Dene" önbelleği atlar (zorla taze çağrı)
     - 120 kayıt sınırı, dolunca en eski atılır
     - Önbellekten gelen sonuç arayüzde "önbellekten" olarak işaretlenir  */
const EVAL_CACHE_MAX = 120;

function evalCacheKey(q, rubric, answerText) {
  return JSON.stringify({
    b: String(q.body || "").trim(),
    o: outcomeLabel(q.outcome),
    m: rubric.maxScore,
    c: (rubric.criteria || []).map(function (c) { return [String(c.label || "").trim(), Number(c.weight) || 0]; }),
    a: String(answerText || "").trim(),
    md: state.ai.model || ""
  });
}

function hash32(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function evalCacheGet(key) {
  const kayit = (state.evalCache || {})[hash32(key)];
  // Hash çakışmasına karşı tam anahtar doğrulanır.
  if (!kayit || kayit.key !== key) return null;
  return JSON.parse(JSON.stringify(kayit.value));
}

function evalCachePut(key, value) {
  state.evalCache = state.evalCache || {};
  const anahtarlar = Object.keys(state.evalCache);
  if (anahtarlar.length >= EVAL_CACHE_MAX) {
    // En eski kaydı at.
    let enEski = anahtarlar[0];
    anahtarlar.forEach(function (k) {
      if ((state.evalCache[k].t || 0) < (state.evalCache[enEski].t || 0)) enEski = k;
    });
    delete state.evalCache[enEski];
  }
  state.evalCache[hash32(key)] = { key: key, value: JSON.parse(JSON.stringify(value)), t: Date.now() };
}

function evalCacheCount() { return Object.keys(state.evalCache || {}).length; }
function evalCacheClear() { state.evalCache = {}; renderAll(); }

async function aiEvaluate(q, answerText, rubric, force) {
  // Hiç gerçek model yoksa (statik/çevrimdışı prototip) yerel yedek kullanılır.
  if (state.ai.mode !== "live") return simulateAIEvaluation(q, answerText, rubric);
  // Gerçek model modundayken çağrı başarısız olursa YEDEĞE DÜŞMEYİZ:
  // simüle edilmiş bir puanı "yapay zekâ önerisi" diye göstermek yanıltıcı olur.
  // Bunun yerine değerlendirme "yapılamadı" işaretlenir; öğretmen yeniden
  // deneyebilir ya da elle puanlayabilir.
  const cacheKey = evalCacheKey(q, rubric, answerText);
  if (!force) {
    const hit = evalCacheGet(cacheKey);
    if (hit) { hit.fromCache = true; return hit; }
  }

  try {
    const j = await apiPost(AI_API.evaluate, {
      questionBody: q.body,
      outcomeLabel: outcomeLabel(q.outcome),
      studentAnswer: answerText || "",
      maxScore: rubric.maxScore,
      criteria: rubric.criteria.map(function (c) { return { label: c.label, weight: Number(c.weight) || 0 }; }),
    });
    state.ai.error = "";
    if (j.meta) { state.ai.usingFallback = !!j.meta.fellBack; if (j.meta.model) state.ai.model = j.meta.model; }
    const sonuc = { aiScore: j.aiScore, maxScore: j.maxScore, justification: j.justification,
                    breakdown: j.breakdown, confidence: j.confidence,
                    // Sunucu, ogrenci yanitinin modele talimat vermeye calistigini bildirir.
                    // Engelleme DEGIL, ogretmene sinyal (agents.md §7.1: karar insanda).
                    injectionAttempt: !!j.injectionAttempt };
    // Yalnızca BAŞARILI değerlendirme önbelleğe alınır.
    evalCachePut(cacheKey, sonuc);
    return sonuc;
  } catch (e) {
    const mesaj = String((e && e.message) || e);
    state.ai.error = mesaj;
    return { failed: true, error: mesaj, maxScore: rubric.maxScore, aiScore: null,
             justification: "", confidence: null, breakdown: [] };
  }
}

// Bağlantı geri geldiğinde tek bir değerlendirmeyi yeniden dene.
async function retryEvaluation(qid, sid) {
  const q = findQuestion(qid);
  if (!q) return;
  const ogrId = sid != null ? sid : state.activeStudentId;
  const ss = readSession(ogrId);
  const a = (ss.answers || {})[qid] || { text: "" };
  ensureRubric(qid);
  state.ai.busy = true; busySince = Date.now(); renderAll();
  try {
    await probeAiMode();
    // Öğretmen bilinçli olarak yeniden deniyor: önbelleği atla.
    const sonuc = await aiEvaluate(q, a.text || "", state.rubrics[qid], true);
    const yeni = Object.assign({}, readSession(ogrId).aiEvals || {});
    yeni[qid] = sonuc;
    writeSession(ogrId, { aiEvals: yeni });
  } finally {
    state.ai.busy = false; renderAll();
  }
}

function renderAiBadge() {
  const el = document.getElementById("aiModeSlot");
  if (el) {
    const live = state.ai.mode === "live";
    const txt = state.ai.mode === "unknown" ? "AI modu denetleniyor…"
      : live ? ((state.ai.usingFallback ? "Yedek model · " : "Gerçek model · ") + (state.ai.model || state.ai.provider))
      : "Yerel simülasyon" + (state.ai.error ? " · " + state.ai.error : "");
    const cls = !live ? "pill-warning" : (state.ai.usingFallback ? "pill-accent2" : "pill-success");
    el.innerHTML = '<span class="pill ' + cls + '" title="' +
      (state.ai.fallback ? "Yedek sağlayıcı hazır: " + escapeHtml(state.ai.fallback.model || state.ai.fallback.provider) : "Yedek sağlayıcı yapılandırılmamış") +
      '">' + (live ? "●" : "○") + " " + escapeHtml(txt) + "</span>" +
      (state.ai.fallback && !state.ai.usingFallback
        ? '<span class="fb-hint" title="Birincil sağlayıcı kotası dolarsa otomatik devreye girer">yedek hazır</span>' : "");
  }
  const col = document.getElementById("colophon");
  if (col) {
    col.textContent = state.ai.mode === "live"
      ? "Soru üretimi ve açık uçlu puan önerisi gerçek bir dil modeli tarafından üretilir; nihai puan her zaman öğretmen onayıyla kesinleşir. Bu prototip dört rolü aynı tarayıcı oturumunda simüle eder, veriler yalnızca bellekte tutulur."
      : "Model sunucusuna ulaşılamadığı için AI adımları şablon tabanlı yerel yedeğe düşmüştür. Bu prototip dört rolü aynı tarayıcı oturumunda simüle eder, veriler yalnızca bellekte tutulur.";
  }
}


/* ==================== Kalıcılık (localStorage) ====================
   ÖNCEDEN: sayfa yenilenince tüm durum sıfırlanıyordu. Jüri sunumunda ya da
   video çekiminde yanlış bir tuş, 10-17 saniyelik model beklemeleriyle birlikte
   her şeyi baştan yaptırıyordu. Durum artık tarayıcıda saklanıyor.
   (Kalıcı veritabanı değildir; yalnızca bu tarayıcıya özeldir.)              */
const STORE_KEY = "t3-olcme-durum-v1";
const KALICI_ALANLAR = ["role", "teacherTab", "studentTab", "ceTab", "genCount", "ceForm", "questions",
  "rubrics", "rubricSelectedQ", "exam", "answers", "examStatus", "currentQIndex",
  "remainingSec", "aiEvals", "reviews", "mcResults", "remedial", "integrity", "outcomes", "subjects", "poolFilter", "exams", "activeExamId",
  "students", "activeStudentId", "evalCache"];

function saveState() {
  if (_resetting) return;
  try {
    const d = { _qIdSeq: qIdSeq };
    KALICI_ALANLAR.forEach(function (k) { d[k] = state[k]; });
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  } catch (e) { /* kota dolu ya da gizli sekme — sessizce geç */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    KALICI_ALANLAR.forEach(function (k) { if (d[k] !== undefined) state[k] = d[k]; });
    if (d._qIdSeq) qIdSeq = d._qIdSeq;
    // Süresi dolmuş bir sınavı yarım bırakmayalım.
    if (state.examStatus === "in_progress" && state.remainingSec <= 0) state.examStatus = "submitted";
    // PDF okuma sırasında sayfa yenilenirse buton sonsuza dek kilitli kalırdı.
    state.ceForm.pdfLoading = false;
    // Sayfa metinleri bellekte tutuluyor; yenileme sonrası PDF seçici anlamsız.
    state.pdf = null;
    if (state.ceForm.fileName && /\.pdf/i.test(state.ceForm.fileName) && /sayfa aralığı/.test(state.ceForm.fileName)) {
      state.ceForm.fileName = "";
    }
    return true;
  } catch (e) { return false; }
}

let _resetting = false;
function resetState() {
  // saveState() ile localStorage.removeItem arasında yarış vardı: bekleyen bir
  // kayıt zamanlayıcısı, temizlikten SONRA eski durumu geri yazabiliyordu.
  _resetting = true;
  if (typeof _saveTimer !== "undefined" && _saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  location.reload();
}

/* ==================== Demo senaryosu ====================
   Aşağıdaki sorular ve şıklar UYDURULMAMIŞTIR: geliştirme sırasında
   @cf/meta/llama-3.3-70b-instruct-fp8-fast modelinin gerçekten ürettiği
   çıktılardır ve olduğu gibi saklanmıştır. Amaç, sunum sırasında her seferinde
   10-17 saniyelik üretimi beklememektir; jüri isterse "AI ile Soru Üret"e
   basarak canlı üretimi de görebilir.                                        */
const DEMO_SORULAR = [
  {
    type: "mc", difficulty: "medium", bloom: "anlama", aiTime: 60,
    body: "Bir cisme etki eden dengelenmemiş kuvvetlerin etkisi nedir?",
    options: [
      { key: "A", text: "Cismin hızını değiştirir" },
      { key: "B", text: "Cismin hızını değiştirmez" },
      { key: "C", text: "Cismin yönünü değiştirir ancak hızını değiştirmez" },
      { key: "D", text: "Cismin hareketini durdurur" }
    ],
    correctKey: "A",
    distractorRationale: {
      B: "bu şıkkı seçen öğrenci dengelenmemiş kuvvetlerin cismin hızını değiştirmediğini sanmaktadır",
      C: "bu şıkkı seçen öğrenci dengelenmemiş kuvvetlerin sadece yönü değiştirdiğini sanmaktadır",
      D: "bu şıkkı seçen öğrenci dengelenmemiş kuvvetlerin her zaman hareketi durdurduğunu sanmaktadır"
    },
    refKeywords: ["dengelenmemiş kuvvet", "hız", "hareket"]
  },
  {
    type: "mc", difficulty: "easy", bloom: "hatirlama", aiTime: 30,
    body: "Sürtünme kuvvetinin etkisi nedir?",
    options: [
      { key: "A", text: "Harekete zıt yönde etki eder" },
      { key: "B", text: "Harekete aynı yönde etki eder" },
      { key: "C", text: "Hareketi durdurur" },
      { key: "D", text: "Hareketi hızlandırır" }
    ],
    correctKey: "A",
    distractorRationale: {
      B: "bu şıkkı seçen öğrenci sürtünme kuvvetinin harekete aynı yönde etki ettiğini sanmaktadır",
      C: "bu şıkkı seçen öğrenci sürtünme kuvvetinin her zaman hareketi durdurduğunu sanmaktadır",
      D: "bu şıkkı seçen öğrenci sürtünme kuvvetinin hareketi hızlandırdığını sanmaktadır"
    },
    refKeywords: ["sürtünme kuvveti", "hareket"]
  },
  {
    type: "open", difficulty: "hard", bloom: "analiz", aiTime: 240,
    body: "Bir cisme etki eden kuvvetler hareketini nasıl etkiler? Sürtünme kuvvetini de içerecek biçimde açıklayınız.",
    refKeywords: ["kuvvet", "hareket", "sürtünme"]
  }
];

const DEMO_METIN = "Bir cisme etki eden kuvvet, cismin hareket durumunu değiştirir. " +
  "Dengelenmiş kuvvetler cismin hızını değiştirmez; cisim ya durur ya da sabit hızla " +
  "hareketine devam eder. Dengelenmemiş kuvvetler ise cismi hızlandırır, yavaşlatır veya " +
  "yönünü değiştirir. Sürtünme kuvveti harekete zıt yönde etki eder ve yüzeyin pürüzlülüğü " +
  "arttıkça büyür. Havada hareket eden cisimlere hava direnci etki eder.";

const DEMO_YANIT = "Dengelenmemiş kuvvetler cismin hızını değiştirir. Örneğin duran bir topa " +
  "vurulduğunda top hareket eder. Sürtünme kuvveti ise harekete zıt yönde etki ederek topu yavaşlatır.";

function loadDemoScenario() {
  state.questions = DEMO_SORULAR.map(function (q) {
    const kopya = JSON.parse(JSON.stringify(q));
    kopya.id = qIdSeq++;
    kopya.outcome = "FEN.7.1.2";
    kopya.status = "approved";
    kopya.demo = true;
    return kopya;
  });
  state.ceForm.title = "Kuvvet ve Hareket — 3. Ünite Özeti";
  state.ceForm.subject = "Fen Bilimleri";
  state.ceForm.grade = 7;
  state.ceForm.outcomeCode = "FEN.7.1.2";
  state.ceForm.text = DEMO_METIN;
  if (state.activeExamId == null) ensureExamList();
  state.exam.title = "Kuvvet ve Hareket — Kısa Sınav";
  state.exam.questionIds = state.questions.map(function (q) { return q.id; });
  state.exam.durationMin = 10;
  state.exam.startDelaySec = 0;
  state.exam.status = "published";
  state.exam.startsAt = Date.now();
  state.questions.filter(function (q) { return q.type === "open"; }).forEach(function (q) { ensureRubric(q.id); });
  // Öğrenci yanıtları hazır ama sınav BİTİRİLMEMİŞ: değerlendirme canlı çalışsın.
  state.questions.forEach(function (q) {
    state.answers[q.id] = q.type === "mc" ? { selectedKey: q.correctKey } : { text: DEMO_YANIT };
  });
  state.answers[state.questions[1].id] = { selectedKey: "C" }; // biri kasten yanlış
  state.examStatus = "in_progress";
  state.remainingSec = state.exam.durationMin * 60;
  state.aiEvals = {}; state.reviews = {}; state.mcResults = {};
  state.role = "student"; state.studentTab = 2; state.currentQIndex = 0;
  renderAll();
}

/* ==================== Model bekleme göstergesi ====================
   Model 10-17 saniye sürüyor. Sayaç olmadan ekran donmuş gibi görünüyor. */
let busySince = 0;
function tickBusy() {
  const el = document.getElementById("busyTimer");
  if (!el) return;
  el.textContent = Math.round((Date.now() - busySince) / 1000) + " sn";
}

/* ============================== Durum ============================== */
const state = {
  role: "content_expert",
  teacherTab: 1,
  studentTab: 1,
  genCount: 0,
  ai: { mode: "unknown", provider: "", model: "", error: "", busy: false, fallback: null, usingFallback: false },
  remedial: null, // { outcomeCode, sinif, deger } — analizden gelen tekrar sorusu talebi
  integrity: { active: false, fsGranted: false, tabSwitch: 0, blur: 0, fsExit: 0,
               pasteCount: 0, pasteChars: 0, awaySec: 0, _awayFrom: 0, events: [] },
  outcomes: VARSAYILAN_KAZANIMLAR.slice(),
  subjects: VARSAYILAN_DERSLER.slice(),
  newOutcome: { open: false, code: "", label: "", error: "" },
  ceTab: 1,
  pdf: null, // { ad, sayfaSayisi, from, to } — sayfa metinleri bellekte (pdfPages)

  poolFilter: { outcome: "", difficulty: "", type: "" },
  editingQid: null, // öğretmenin havuzda düzenlediği soru
  rubricError: "",
  poolError: "",
  critDescOpen: null,
  rejectedOpen: false,
  evalCache: {},
  simRunning: false,
  simStatus: null,

  ceForm: { title: "", subject: VARSAYILAN_DERSLER[0], grade: 7, outcomeCode: VARSAYILAN_KAZANIMLAR[0].code, text: "", error: "", mcCount: 2, openCount: 1 },
  questions: [],
  rubrics: {},
  rubricSelectedQ: null,
  students: [],       // sınıf listesi
  activeStudentId: null,
  exams: [],          // kaydedilmiş sınavlar
  activeExamId: null, // düzenlenen / çözülen sınav
  exam: { title: "", questionIds: [], timeOverrides: {}, status: "draft", durationMin: 10,
          startMode: "now", startAtLocal: "", startDelaySec: 0, startsAt: null, endsAt: null },
  answers: {},
  examStatus: "not_started",
  currentQIndex: 0,
  remainingSec: 0,
  aiEvals: {},
  reviews: {},
  mcResults: {},
  baseline: {
    totalAssigned: 160, totalCompleted: 142, pendingApprovalsOther: 7,
    classes: [
      // Karşılaştırma amaçlı okul geneli örnek veriler. Gerçek şubelerle
      // (7-A, 7-B) karışmasın diye bilinçli olarak farklı düzeyler seçildi.
      { name: "6-A", scores: { "MAT.7.2.1": 72, "MAT.7.3.4": 58, "FEN.7.1.2": 81 } },
      { name: "8-B", scores: { "MAT.7.2.1": 65, "MAT.7.3.4": 70, "FEN.7.1.2": 60 } },
      { name: "8-C", scores: { "MAT.7.2.1": 84, "MAT.7.3.4": 77, "FEN.7.1.2": 69 } },
    ],
  },
};

function findQuestion(id) { return state.questions.find(function (q) { return String(q.id) === String(id); }); }
function outcomeLabel(code) { const o = OUTCOMES_LIST().find(function (x) { return x.code === code; }); return o ? o.label : code; }

// ---- Kazanım tanımlama (brief MVP 1) --------------------------------------
function addOutcome(code, label) {
  code = (code || "").trim().toUpperCase();
  const ad = (label || "").trim();
  if (!code) return "Kazanım kodu boş olamaz (örn. FEN.7.3.1).";
  if (!ad) return "Kazanım açıklaması boş olamaz.";
  if (OUTCOMES_LIST().some(function (o) { return o.code === code; })) return "Bu kazanım kodu zaten tanımlı.";
  state.outcomes = OUTCOMES_LIST().concat([{ code: code, label: code + " — " + ad }]);
  state.ceForm.outcomeCode = code;
  return "";
}

function removeOutcome(code) {
  // Kullanımda olan kazanım silinemez: mevcut sorular sahipsiz kalmasın.
  if (state.questions.some(function (q) { return q.outcome === code; })) return false;
  if (OUTCOMES_LIST().length <= 1) return false;
  state.outcomes = OUTCOMES_LIST().filter(function (o) { return o.code !== code; });
  if (state.ceForm.outcomeCode === code) state.ceForm.outcomeCode = OUTCOMES_LIST()[0].code;
  return true;
}

function addSubject(ad) {
  ad = (ad || "").trim();
  if (!ad) return;
  if (!SUBJECTS_LIST().some(function (s) { return s.toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"); })) {
    state.subjects = SUBJECTS_LIST().concat([ad]);
  }
  state.ceForm.subject = ad;
}


/* ==================== PDF Okuma ====================
   Ders notu, müfredat ya da kitap bölümü PDF olarak yüklenebilir.
   pdf.js istemci tarafında çalışır; DOSYA SUNUCUYA GÖNDERİLMEZ.

   Sayfa metinleri bilinçli olarak state dışında (pdfPages) tutulur:
   büyük bir PDF localStorage kotasını doldurabilirdi. Kullanıcının seçtiği
   sayfa aralığının metni state.ceForm.text'e yazılır, kalıcı olan odur.   */
let pdfPages = null;      // [{ n, text }]
let pdfLibPromise = null;

function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs")
      .then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
        return lib;
      });
  }
  return pdfLibPromise;
}

async function extractPdf(file) {
  const lib = await loadPdfLib();
  const buf = await file.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  const sayfalar = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const sayfa = await doc.getPage(i);
    const tc = await sayfa.getTextContent();
    const metin = tc.items.map(function (x) { return x.str; }).join(" ").replace(/\s+/g, " ").trim();
    sayfalar.push({ n: i, text: metin });
  }
  return sayfalar;
}

function pdfRangeText() {
  if (!pdfPages || !state.pdf) return "";
  const a = Math.max(1, Math.min(state.pdf.from, state.pdf.to));
  const b = Math.min(pdfPages.length, Math.max(state.pdf.from, state.pdf.to));
  return pdfPages.filter(function (s) { return s.n >= a && s.n <= b; })
    .map(function (s) { return s.text; }).join("\n\n").trim();
}

function applyPdfRange() {
  const metin = pdfRangeText();
  if (!metin) {
    state.ceForm.error = "Seçilen sayfalarda metin bulunamadı. Farklı bir aralık deneyin.";
    renderAll();
    return;
  }
  state.ceForm.text = metin.slice(0, 6000);
  state.ceForm.fileName = state.pdf.ad + " · sayfa " + state.pdf.from + "-" + state.pdf.to +
    (metin.length > 6000 ? " (ilk 6000 karakter alındı)" : "");
  state.ceForm.error = "";
  renderAll();
}

function pdfPickerHtml() {
  if (!state.pdf) return "";
  const uzunluk = pdfRangeText().length;
  return '<div class="pdf-picker">' +
    '<div class="pp-head">📕 ' + escapeHtml(state.pdf.ad) + ' — <b>' + state.pdf.sayfaSayisi + ' sayfa</b></div>' +
    '<div class="pp-desc">Sorular hangi sayfalardan üretilsin? Tüm kitaptan değil, ' +
    'işlediğiniz bölümden soru üretmek daha isabetli sonuç verir.</div>' +
    '<div class="pp-row">' +
    '<div class="field"><label>Başlangıç sayfası</label>' +
    '<input type="number" id="pdfFrom" min="1" max="' + state.pdf.sayfaSayisi + '" value="' + state.pdf.from + '"></div>' +
    '<div class="field"><label>Bitiş sayfası</label>' +
    '<input type="number" id="pdfTo" min="1" max="' + state.pdf.sayfaSayisi + '" value="' + state.pdf.to + '"></div>' +
    '<div class="field"><label>Seçilen metin</label>' +
    '<div class="pp-count' + (uzunluk > 6000 ? " over" : "") + '">' + uzunluk.toLocaleString("tr-TR") + ' karakter' +
    (uzunluk > 6000 ? ' — ilk 6000 alınacak' : "") + '</div></div>' +
    '</div>' +
    '<button class="btn btn-primary btn-sm" id="btnApplyPdf">Bu sayfaları kullan</button> ' +
    '<button class="btn btn-secondary btn-sm" id="btnClearPdf">PDF\'i kaldır</button></div>';
}

/* ============================== İçerik Uzmanı ============================== */
async function onGenerateQuestions() {
  const text = state.ceForm.text.trim();
  if (text.length < 30) {
    state.ceForm.error = "Soru üretmek için en az birkaç cümlelik bir metin girin (min. 30 karakter).";
    renderAll();
    return;
  }
  if (state.ceForm.mcCount + state.ceForm.openCount < 1) {
    state.ceForm.error = "En az bir soru isteyin (çoktan seçmeli veya açık uçlu).";
    renderAll();
    return;
  }
  state.ceForm.error = "";
  const doc = {
    title: state.ceForm.title || "Adsız Kaynak", subject: state.ceForm.subject, grade: state.ceForm.grade,
    outcome: state.ceForm.outcomeCode, outcomeLabel: outcomeLabel(state.ceForm.outcomeCode), text: text,
  };
  state.ai.busy = true;
  busySince = Date.now();
  renderAll();
  try {
    const qs = await aiGenerateQuestions(doc);
    if (qs.length) {
      state.questions = state.questions.concat(qs);
      state.ceForm.error = "";
    }
  } finally {
    state.ai.busy = false;
    renderAll();
  }
}

function renderPendingQuestionCard(q) {
  const optsHtml = q.type === "mc" ? q.options.map(function (o) {
    return '<div class="opt-row">' +
      '<span class="opt-key">' + o.key + '</span>' +
      '<input type="text" data-qid="' + q.id + '" data-okey="' + o.key + '" class="opt-input" value="' + escapeHtml(o.text) + '">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);">' +
      '<input type="radio" name="correct-' + q.id + '" data-qid="' + q.id + '" data-okey="' + o.key + '" class="correct-radio" ' + (o.key === q.correctKey ? "checked" : "") + '> doğru</label></div>';
  }).join("") : "";
  return '<div class="q-card" data-card-id="' + q.id + '">' +
    '<div class="q-meta">' +
    '<span class="pill pill-accent">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
    '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' +
    bloomPill(q.bloom) +
    '<span class="pill pill-neutral">' + q.outcome + '</span>' +
    '<span class="time-tag">⏱ AI önerisi: ' + q.aiTime + 's</span></div>' +
    '<textarea class="q-body-input" data-qid="' + q.id + '" data-field="body" rows="2" style="width:100%;border:1px solid var(--border-strong);border-radius:8px;padding:8px;font-family:inherit;font-size:13.5px;font-weight:600;background:var(--surface);color:var(--text);">' + escapeHtml(q.body) + '</textarea>' +
    '<div style="margin-top:8px;">' + optsHtml + '</div>' +
    distractorHtml(q) +
    '<div class="actions">' +
    '<button class="btn btn-success btn-sm approve-btn" data-qid="' + q.id + '">✓ Onayla → Havuza Aktar</button>' +
    '<button class="btn btn-critical btn-sm reject-btn" data-qid="' + q.id + '">Reddet</button></div></div>';
}

// Model, her yanlis sik icin o sikki secen ogrencinin hangi kavram yanilgisina
// dustugunu yazar. Icerik uzmani soruyu onaylarken bunu gorur; celdiricinin
// pedagojik bir karsiligi yoksa soruyu duzeltebilir.
function distractorHtml(q) {
  if (q.type !== "mc" || !q.distractorRationale) return "";
  const keys = Object.keys(q.distractorRationale).filter(function (k) { return k !== q.correctKey; });
  if (!keys.length) return "";
  return '<div class="distractor-box"><div class="db-title">Çeldirici gerekçeleri — AI analizi</div>' +
    keys.map(function (k) {
      return '<div class="db-row"><span class="db-key">' + k + '</span><span>' + escapeHtml(q.distractorRationale[k]) + '</span></div>';
    }).join("") + '</div>';
}

function wirePendingCards() {
  document.querySelectorAll(".q-body-input").forEach(function (el) {
    el.oninput = function () { const q = findQuestion(el.dataset.qid); if (q) q.body = el.value; };
  });
  document.querySelectorAll(".opt-input").forEach(function (el) {
    el.oninput = function () { const q = findQuestion(el.dataset.qid); if (q) { const o = q.options.find(function (x) { return x.key === el.dataset.okey; }); if (o) o.text = el.value; } };
  });
  document.querySelectorAll(".correct-radio").forEach(function (el) {
    el.onchange = function () { const q = findQuestion(el.dataset.qid); if (q) q.correctKey = el.dataset.okey; };
  });
  document.querySelectorAll(".approve-btn").forEach(function (el) {
    el.onclick = function () { const q = findQuestion(el.dataset.qid); if (q) { q.status = "approved"; renderAll(); } };
  });
  document.querySelectorAll(".reject-btn").forEach(function (el) {
    el.onclick = function () { const q = findQuestion(el.dataset.qid); if (q) { q.status = "rejected"; renderAll(); } };
  });
}

// Analiz ekranından gelen "tekrar sorusu üret" talebini gösteren afiş.
function remedialBannerHtml() {
  const r = state.remedial;
  if (!r) return "";
  const hazir = state.ceForm.text.trim().length >= 30;
  return '<div class="remedial-banner" id="remedialBanner">' +
    '<div class="rbn-head">Analizden gelen talep</div>' +
    '<div class="rbn-body"><b>' + escapeHtml(r.sinif) + '</b> sınıfı, <b>' + escapeHtml(outcomeLabel(r.outcomeCode)) +
    '</b> kazanımında <b class="tabular">%' + r.deger + '</b> başarı gösterdi. ' +
    'Bu kazanıma yönelik tekrar sorusu üretmek için ' +
    (hazir ? 'aşağıdaki kaynak metin kullanılacak.' : 'sağdaki alana kaynak metni yapıştırın.') + '</div>' +
    '<div class="rbn-actions">' +
    (hazir ? '<button class="btn btn-primary btn-sm" id="btnRemedialGen"' + (state.ai.busy ? " disabled" : "") + '>Bu kazanıma soru üret</button>' : "") +
    '<button class="btn btn-secondary btn-sm" id="btnRemedialDismiss">Kapat</button></div></div>';
}

function ceTabsHtml() {
  const bekleyen = state.questions.filter(function (q) { return q.status === "ai_generated"; }).length;
  const onayli = state.questions.filter(function (q) { return q.status === "approved"; }).length;
  const tabs = [
    { id: 1, label: "1 \u00b7 Soru \u00dcret", rozet: bekleyen },
    { id: 2, label: "2 \u00b7 Soru Havuzu", rozet: onayli }
  ];
  return '<div class="tabs" id="ceTabs">' + tabs.map(function (x) {
    return '<button class="tab-btn ' + (state.ceTab === x.id ? "active" : "") + '" data-tab="' + x.id + '">' +
      x.label + (x.rozet ? ' <span class="tab-count">' + x.rozet + '</span>' : "") + '</button>';
  }).join("") + '</div>';
}

function wireCeTabs() {
  document.querySelectorAll("#ceTabs .tab-btn").forEach(function (b) {
    b.onclick = function () { state.ceTab = Number(b.dataset.tab); renderAll(); };
  });
}

// 1. sekme: kaynak icerik + AI ciktilarinin incelenmesi
function ceCreateHtml() {
  const pending = state.questions.filter(function (q) { return q.status === "ai_generated"; });
  return remedialBannerHtml() +
    '<div class="ce-layout">' +
    '<div class="card ce-source"><div class="card-head"><h3>1 · Kaynak İçerik</h3><span class="hint">sorular buradan üretilir</span></div>' +
    '<div class="ce-meta-grid">' +
    '<div class="field"><label>Başlık</label><input id="ceTitle" type="text" value="' + escapeHtml(state.ceForm.title) + '" placeholder="örn. Kuvvet ve Hareket — 3. Ünite Özeti"></div>' +
    '<div class="field"><label>Ders</label>' +
    '<input id="ceSubject" list="dersListesi" value="' + escapeHtml(state.ceForm.subject) + '" placeholder="Seçin veya yeni ders yazın">' +
    '<datalist id="dersListesi">' + SUBJECTS_LIST().map(function (s) { return '<option value="' + escapeHtml(s) + '">'; }).join("") + '</datalist></div>' +
    '<div class="field"><label>Sınıf</label><select id="ceGrade">' +
    GRADES.map(function (g) { return '<option ' + (String(g) === String(state.ceForm.grade) ? "selected" : "") + '>' + g + '. sınıf</option>'; }).join("") +
    '</select></div>' +
    '<div class="field field-outcome"><label>Kazanım</label>' +
    '<div class="input-with-actions">' +
    '<select id="ceOutcome">' +
    OUTCOMES_LIST().map(function (o) { return '<option value="' + o.code + '" ' + (o.code === state.ceForm.outcomeCode ? "selected" : "") + '>' + escapeHtml(o.label) + '</option>'; }).join("") +
    '</select>' +
    '<button class="icon-btn" id="btnNewOutcome" title="Yeni kazanım tanımla" aria-label="Yeni kazanım tanımla">+</button>' +
    '<button class="icon-btn" id="btnDelOutcome" title="Seçili kazanımı sil" aria-label="Seçili kazanımı sil">−</button></div>' +
    '<span class="field-note">' + OUTCOMES_LIST().length + ' kazanım tanımlı · yenisini + ile ekleyin</span></div>' +
    '<!--meta-grid-end-->' +
    (state.newOutcome.open
      ? '<div class="new-outcome"><div class="field-row">' +
        '<div class="field"><label>Kazanım kodu</label><input id="noCode" value="' + escapeHtml(state.newOutcome.code) + '" placeholder="örn. FEN.7.3.1"></div>' +
        '<div class="field" style="flex:2;"><label>Açıklama</label><input id="noLabel" value="' + escapeHtml(state.newOutcome.label) + '" placeholder="örn. Işığın Yansıması"></div></div>' +
        (state.newOutcome.error ? '<div class="pill pill-critical" style="margin-bottom:8px;">' + escapeHtml(state.newOutcome.error) + '</div>' : "") +
        '<button class="btn btn-primary btn-sm" id="btnSaveOutcome">Kazanımı Ekle</button> ' +
        '<button class="btn btn-secondary btn-sm" id="btnCancelOutcome">Vazgeç</button></div>'
      : "") + '</div>' +
    '<div class="field ce-text-field"><div class="label-row"><label>Ders notu / metin</label>' +
    '<span class="char-count' + (state.ceForm.text.length > 5500 ? " near" : "") + '">' + state.ceForm.text.length + ' / 6000</span></div>' +
    '<input type="file" id="ceFile" accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf" style="display:none;">' +
    '<div class="dropzone' + (state.ceForm.pdfLoading ? " busy" : "") + '" id="dropzone">' +
    (state.ceForm.pdfLoading
      ? '<div class="dz-spin"></div><div class="dz-title">PDF okunuyor…</div>' +
        '<div class="dz-sub">Sayfalar çıkarılıyor, bu birkaç saniye sürebilir.</div>'
      : '<div class="dz-icon">📄</div>' +
        '<div class="dz-title">Dosyayı buraya sürükleyin<span class="dz-or"> veya </span>' +
        '<button class="dz-browse" id="btnUpload" type="button">bilgisayarınızdan seçin</button></div>' +
        '<div class="dz-sub">PDF · TXT · MD — dosya sunucuya gönderilmez, tarayıcınızda okunur</div>' +
        (state.ceForm.fileName ? '<div class="dz-file">✓ ' + escapeHtml(state.ceForm.fileName) + '</div>' : "")) +
    '</div>' +
    pdfPickerHtml() +
    '<div class="dz-divider"><span>veya metni doğrudan aşağıya yapıştırın</span></div>' +
    '<textarea id="ceText" placeholder="Öğrencilere sunulacak ders notunu buraya yapıştırın...">' + escapeHtml(state.ceForm.text) + '</textarea></div>' +
    (state.ceForm.error ? '<div class="pill pill-critical" style="margin-bottom:10px;">' + escapeHtml(state.ceForm.error) + '</div>' : "") +
    '<div class="gen-bar">' +
    '<div class="field"><label>Çoktan seçmeli</label>' +
    '<input id="ceMcCount" type="number" min="0" max="8" value="' + state.ceForm.mcCount + '"></div>' +
    '<div class="field"><label>Açık uçlu</label>' +
    '<input id="ceOpenCount" type="number" min="0" max="4" value="' + state.ceForm.openCount + '"></div>' +
    '<div class="gen-action">' +
    '<button class="btn btn-primary btn-lg" id="btnGenerate"' + (state.ai.busy ? " disabled" : "") + '>' +
    (state.ai.busy ? '⏳ Model çalışıyor… <span id="busyTimer" class="tabular">0 sn</span>' : "🤖 AI ile Soru Üret") + '</button>' +
    '<span class="gen-hint">Seçilen metinden ' + state.ceForm.mcCount + ' çoktan seçmeli + ' + state.ceForm.openCount + ' açık uçlu soru taslağı üretilir</span>' +
    '</div></div></div>' +
    '<div class="card ce-pending"><div class="card-head"><h3>2 · İncelemeyi Bekleyenler</h3><span class="hint">' + pending.length + ' soru</span></div>' +
    '<div id="pendingList" class="' + (pending.length > 1 ? "pending-grid" : "") + '">' +
    (pending.length ? pending.map(renderPendingQuestionCard).join("") : '<div class="empty-state">Henüz AI çıktısı yok. Yukarıya bir metin yükleyip soru ürettirin.</div>') + '</div></div></div>';
}

// 2. sekme: onayli havuz + reddedilenler havuzu
function cePoolHtml() {
  const approved = state.questions.filter(function (q) { return q.status === "approved"; });
  const rejected = state.questions.filter(function (q) { return q.status === "rejected"; });
  return '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>Ortak Soru Havuzu</h3><span class="hint">' + approved.length + ' onaylı · ' + rejected.length + ' reddedilen</span></div>' +
    (approved.length ? approved.map(function (q) {
      return '<div class="pool-item"><div class="p-body">' + escapeHtml(q.body) +
        '<div class="p-tags"><span class="pill pill-accent">' + (q.type === "mc" ? "Çoktan Seçmeli" : "Açık Uçlu") + '</span>' +
        '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' + bloomPill(q.bloom) +
        '<span class="pill pill-neutral">' + q.outcome + '</span>' +
        '<span class="pill pill-success">Onaylı</span></div></div>' +
        '<button class="btn btn-secondary btn-sm del-q" data-qid="' + q.id + '" title="Bu soruyu havuzdan sil">Sil</button></div>';
    }).join("") : '<div class="empty-state">Onaylanan soru henüz yok.</div>') +
    (state.poolError ? '<div class="pill pill-critical" style="margin-top:10px;">' + escapeHtml(state.poolError) + '</div>' : "") + '</div>' +
    rejectedPoolHtml("ce");
}

function renderContentExpert() {
  const root = document.getElementById("panel-content_expert");
  root.innerHTML = ceTabsHtml() + '<div id="ceTabContent">' +
    (state.ceTab === 2 ? cePoolHtml() : ceCreateHtml()) + '</div>';
  wireCeTabs();
  if (state.ceTab === 2) { wireRejectedPool(); return; }

  const rg = document.getElementById("btnRemedialGen");
  if (rg) rg.onclick = onGenerateQuestions;
  const rd = document.getElementById("btnRemedialDismiss");
  if (rd) rd.onclick = function () { state.remedial = null; renderAll(); };
  document.getElementById("btnGenerate").onclick = onGenerateQuestions;
  document.getElementById("ceTitle").oninput = function (e) { state.ceForm.title = e.target.value; };
  const subEl = document.getElementById("ceSubject");
  subEl.onchange = function (e) { addSubject(e.target.value); renderAll(); };
  subEl.onkeydown = function (e) { if (e.key === "Enter") { addSubject(e.target.value); renderAll(); } };
  document.getElementById("ceGrade").onchange = function (e) { state.ceForm.grade = parseInt(e.target.value, 10) || e.target.value; };
  document.getElementById("ceOutcome").onchange = function (e) { state.ceForm.outcomeCode = e.target.value; };
  document.getElementById("ceText").oninput = function (e) { state.ceForm.text = e.target.value.slice(0, 6000); };

  // Kazanım tanımlama
  document.getElementById("btnNewOutcome").onclick = function () {
    state.newOutcome = { open: true, code: "", label: "", error: "" }; renderAll();
  };
  document.getElementById("btnDelOutcome").onclick = function () {
    if (!removeOutcome(state.ceForm.outcomeCode)) {
      state.ceForm.error = "Bu kazanım silinemez: ya son kazanım ya da kullanan sorular var.";
    }
    renderAll();
  };
  const noC = document.getElementById("noCode"), noL = document.getElementById("noLabel");
  if (noC) noC.oninput = function (e) { state.newOutcome.code = e.target.value; };
  if (noL) noL.oninput = function (e) { state.newOutcome.label = e.target.value; };
  const noSave = document.getElementById("btnSaveOutcome");
  if (noSave) noSave.onclick = function () {
    const hata = addOutcome(state.newOutcome.code, state.newOutcome.label);
    if (hata) state.newOutcome.error = hata;
    else state.newOutcome = { open: false, code: "", label: "", error: "" };
    renderAll();
  };
  const noCancel = document.getElementById("btnCancelOutcome");
  if (noCancel) noCancel.onclick = function () { state.newOutcome = { open: false, code: "", label: "", error: "" }; renderAll(); };

  // Dosyadan yükleme (.txt / .md) — istemci tarafında okunur, sunucuya gitmez.
  const fileEl = document.getElementById("ceFile");
  const upBtn = document.getElementById("btnUpload");
  if (upBtn) upBtn.onclick = function () { fileEl.click(); };

  // Sürükle-bırak
  const dz = document.getElementById("dropzone");
  if (dz) {
    dz.onclick = function (e) { if (e.target === dz || e.target.classList.contains("dz-icon") || e.target.classList.contains("dz-sub")) fileEl.click(); };
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("over"); });
    });
    dz.addEventListener("drop", function (e) {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      const dt = new DataTransfer();
      dt.items.add(f);
      fileEl.files = dt.files;
      fileEl.dispatchEvent(new Event("change"));
    });
  }
  const pf = document.getElementById("pdfFrom");
  if (pf) pf.onchange = function (e) { state.pdf.from = Math.max(1, Math.min(state.pdf.sayfaSayisi, Number(e.target.value) || 1)); renderAll(); };
  const pt = document.getElementById("pdfTo");
  if (pt) pt.onchange = function (e) { state.pdf.to = Math.max(1, Math.min(state.pdf.sayfaSayisi, Number(e.target.value) || 1)); renderAll(); };
  const pa = document.getElementById("btnApplyPdf");
  if (pa) pa.onclick = applyPdfRange;
  const pc = document.getElementById("btnClearPdf");
  if (pc) pc.onclick = function () { state.pdf = null; pdfPages = null; state.ceForm.fileName = ""; renderAll(); };

  fileEl.onchange = async function () {
    const f = fileEl.files && fileEl.files[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { state.ceForm.error = "Dosya çok büyük (en fazla 25 MB)."; renderAll(); return; }

    // --- PDF yolu ---
    if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
      state.ceForm.pdfLoading = true; state.ceForm.error = ""; renderAll();
      try {
        pdfPages = await extractPdf(f);
        const doluSayfa = pdfPages.filter(function (s) { return s.text.length > 20; }).length;
        if (!doluSayfa) {
          state.pdf = null; pdfPages = null;
          state.ceForm.error = "Bu PDF'te metin katmanı bulunamadı — taranmış görüntü olabilir. " +
            "Böyle dosyalar için metni kopyalayıp aşağıya yapıştırın.";
        } else {
          state.pdf = { ad: f.name, sayfaSayisi: pdfPages.length, from: 1, to: Math.min(3, pdfPages.length) };
          if (!state.ceForm.title) state.ceForm.title = f.name.replace(/\.pdf$/i, "");
          state.ceForm.fileName = f.name + " yüklendi — sayfa aralığı seçin";
        }
      } catch (err) {
        state.pdf = null; pdfPages = null;
        state.ceForm.error = "PDF okunamadı: " + String((err && err.message) || err) +
          ". İnternet bağlantısı gerekiyorsa kontrol edin ya da metni doğrudan yapıştırın.";
      } finally {
        state.ceForm.pdfLoading = false;
        fileEl.value = "";
        renderAll();
      }
      return;
    }

    // --- düz metin yolu ---
    if (f.size > 2 * 1024 * 1024) { state.ceForm.error = "Metin dosyası çok büyük (en fazla 2 MB)."; renderAll(); return; }
    const fr = new FileReader();
    fr.onload = function () {
      const metin = String(fr.result || "");
      state.ceForm.text = metin.slice(0, 6000);
      state.ceForm.fileName = f.name + (metin.length > 6000 ? " — ilk 6000 karakter alındı" : " yüklendi");
      if (!state.ceForm.title) state.ceForm.title = f.name.replace(/\.(txt|md)$/i, "");
      state.ceForm.error = "";
      renderAll();
    };
    fr.onerror = function () { state.ceForm.error = "Dosya okunamadı."; renderAll(); };
    fr.readAsText(f, "utf-8");
    fileEl.value = "";
  };
  document.getElementById("ceMcCount").onchange = function (e) { state.ceForm.mcCount = Math.max(0, Math.min(8, parseInt(e.target.value, 10) || 0)); renderAll(); };
  document.getElementById("ceOpenCount").onchange = function (e) { state.ceForm.openCount = Math.max(0, Math.min(4, parseInt(e.target.value, 10) || 0)); renderAll(); };
  wirePendingCards();
}

/* ===================== Reddedilen Soru Havuzu =====================
   Reddedilen sorular kaybolmaz; ayri bir havuzda saklanir.
   - Icerik Uzmani: "Yeniden Incele" -> tekrar inceleme kuyruguna alir
   - Ogretmen:      "Havuza Al"      -> dogrudan onayli havuza tasir
   Boylece brief\'in "ogretmen soru havuzunu duzenler" maddesi de karsilanir. */
// Bir soru silinebilir mi? Herhangi bir sınavda kullanılıyorsa hayır —
// sınav içeriği sessizce değişmemeli. Önce sınavdan çıkarılması gerekir.
function questionUsage(qid) {
  const kullanan = [];
  (state.exams || []).forEach(function (x) {
    const aktif = x.id === state.activeExamId;
    const ids = aktif ? state.exam.questionIds : (x.questionIds || []);
    const ad = aktif ? state.exam.title : x.title;
    const st = aktif ? state.exam.status : x.status;
    if (ids.indexOf(qid) !== -1) kullanan.push({ ad: ad || "Adsız Sınav", yayinda: st === "published" });
  });
  return kullanan;
}

function deleteQuestion(qid) {
  const q = findQuestion(qid);
  if (!q) return "Soru bulunamadı.";
  const kullanan = questionUsage(q.id);
  if (kullanan.length) {
    return "Bu soru şu sınav(lar)da kullanılıyor: " +
      kullanan.map(function (k) { return k.ad + (k.yayinda ? " (yayında)" : ""); }).join(", ") +
      ". Önce sınavdan çıkarın.";
  }
  state.questions = state.questions.filter(function (x) { return String(x.id) !== String(qid); });
  delete state.rubrics[qid];
  if (state.editingQid === qid) state.editingQid = null;
  return "";
}

function rejectedPoolHtml(mod) {
  const rejected = state.questions.filter(function (q) { return q.status === "rejected"; });
  const btn = mod === "ce"
    ? '<button class="btn btn-secondary btn-sm restore-q" data-qid="QID" data-mode="review">↩ Yeniden İncele</button>'
    : '<button class="btn btn-success btn-sm restore-q" data-qid="QID" data-mode="approve">↩ Havuza Al</button>';
  const aciklama = mod === "ce"
    ? "Reddettiğiniz sorular silinmez. Fikrinizi değiştirirseniz inceleme kuyruğuna geri alabilirsiniz."
    : "İçerik uzmanının reddettiği sorular. Sınavınıza uygun bulduklarınızı doğrudan onaylı havuza alabilirsiniz.";
  if (!rejected.length && mod === "teacher") return "";
  const acik = state.rejectedOpen !== false;
  return '<div class="card" style="margin-top:16px;"><div class="card-head">' +
    '<h3>Reddedilen Soru Havuzu</h3>' +
    '<button class="btn btn-secondary btn-sm" id="btnToggleRejected">' + rejected.length + ' soru · ' + (acik ? "gizle" : "göster") + '</button></div>' +
    (acik ? '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">' + aciklama + '</div>' : "") +
    (!acik ? "" : rejected.length
      ? rejected.map(function (q) {
          return '<div class="pool-item"><div class="p-body">' + escapeHtml(q.body) +
            '<div class="p-tags"><span class="pill pill-neutral">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
            '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' +
            '<span class="pill pill-neutral">' + q.outcome + '</span>' +
            '<span class="pill pill-critical">Reddedildi</span></div></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">' +
            btn.replace(/QID/g, q.id) +
            '<button class="btn btn-secondary btn-sm del-q" data-qid="' + q.id + '" title="Kalıcı olarak sil">Sil</button></div></div>';
        }).join("")
      : '<div class="empty-state">Reddedilen soru yok.</div>') + '</div>';
}

function wireRejectedPool() {
  const tg = document.getElementById("btnToggleRejected");
  if (tg) tg.onclick = function () { state.rejectedOpen = state.rejectedOpen === false; renderAll(); };
  document.querySelectorAll(".del-q").forEach(function (b) {
    b.onclick = function () {
      state.poolError = deleteQuestion(Number(b.dataset.qid));
      renderAll();
    };
  });
  document.querySelectorAll(".restore-q").forEach(function (b) {
    b.onclick = function () {
      const q = findQuestion(b.dataset.qid);
      if (!q) return;
      q.status = b.dataset.mode === "approve" ? "approved" : "ai_generated";
      renderAll();
    };
  });
}


/* ==================== Çoklu Sınav ====================
   Öğretmen birden fazla sınav hazırlayabilir. Aktif sınavın alanları
   state.exam + oturum alanlarında canlı tutulur; sınav değiştirilirken
   mevcut alanlar kayda yazılır, hedefinkiler yüklenir.

   Bu ayrıca "önceki sınava göre gelişim" analizini mümkün kılar:
   tek sınavla kazanım trendi hesaplanamaz.                                 */
let examIdSeq = 1;
const OTURUM_ALANLARI = ["answers", "examStatus", "currentQIndex", "remainingSec",
  "aiEvals", "reviews", "mcResults", "integrity"];

function bosOturum() {
  return {
    answers: {}, examStatus: "not_started", currentQIndex: 0, remainingSec: 0,
    aiEvals: {}, reviews: {}, mcResults: {},
    integrity: { active: false, fsGranted: false, tabSwitch: 0, blur: 0, fsExit: 0,
                 pasteCount: 0, pasteChars: 0, awaySec: 0, _awayFrom: 0, events: [] }
  };
}

/* ==================== Sınıf (çoklu öğrenci) ====================
   Bir sınavın oturumu artık ÖĞRENCİ BAŞINA tutulur: kayit.sessions[ogrenciId].
   state.answers/examStatus/... aktif (sınav, öğrenci) çiftinin canlı alanıdır.

   Neden gerekliydi: tek öğrenciyle "sınıfın öğrenme durumu" gerçek veriden
   hesaplanamıyordu ve ürünün ana değer önerisi — öğretmenin 40 kağıt yerine
   AI'ın zorlandığı birkaçına odaklanması — görünmüyordu.               */
let studentIdSeq = 1;

// Varsayılan sınıf listesi — BIES takımı, iki şube.
const VARSAYILAN_OGRENCILER = [
  { name: "Esat Talha Karataş", sinif: "7-A" },
  { name: "İrem Yazıcı",        sinif: "7-A" },
  { name: "Zeynep Sude Demir",  sinif: "7-B" },
  { name: "Burak Özçelik",      sinif: "7-B" }
];

function siniflar() {
  const set = {};
  (state.students || []).forEach(function (s) { if (s.sinif) set[s.sinif] = true; });
  return Object.keys(set).sort();
}

function ensureStudents() {
  state.students = state.students || [];
  state.students.forEach(function (s) {
    if (s.id >= studentIdSeq) studentIdSeq = s.id + 1;
    if (!s.sinif) s.sinif = "7-A";
  });
  if (!state.students.length) {
    VARSAYILAN_OGRENCILER.forEach(function (o) {
      state.students.push({ id: studentIdSeq++, name: o.name, sinif: o.sinif, demo: false });
    });
  }
  if (state.activeStudentId == null ||
      !state.students.some(function (s) { return s.id === state.activeStudentId; })) {
    state.activeStudentId = state.students[0].id;
  }
}

function activeStudent() {
  return (state.students || []).find(function (s) { return s.id === state.activeStudentId; }) || { id: 0, name: "Öğrenci" };
}

function examSessions(kayit) {
  if (!kayit.sessions) {
    kayit.sessions = {};
    // Eski tek-oturumlu kayıttan geçiş.
    if (kayit.session) { kayit.sessions[state.activeStudentId] = kayit.session; delete kayit.session; }
  }
  return kayit.sessions;
}

function sessionOf(kayit, sid) {
  const ss = examSessions(kayit);
  if (!ss[sid]) ss[sid] = bosOturum();
  return ss[sid];
}

function syncActiveExam() {
  if (state.activeExamId == null || state.activeStudentId == null) return;
  const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
  if (!kayit) return;
  Object.keys(state.exam).forEach(function (k) { kayit[k] = state.exam[k]; });
  const ss = examSessions(kayit);
  ss[state.activeStudentId] = {};
  OTURUM_ALANLARI.forEach(function (k) { ss[state.activeStudentId][k] = state[k]; });
}

// Bir öğrencinin oturumunu OKU: aktif öğrenci canlı alanlarda tutulur.
function readSession(sid) {
  if (sid === state.activeStudentId) {
    const o = {};
    OTURUM_ALANLARI.forEach(function (k) { o[k] = state[k]; });
    return o;
  }
  const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
  return kayit ? sessionOf(kayit, sid) : bosOturum();
}

// Bir öğrencinin oturumuna YAZ.
function writeSession(sid, degisiklik) {
  if (sid === state.activeStudentId) {
    Object.keys(degisiklik).forEach(function (k) { state[k] = degisiklik[k]; });
    return;
  }
  const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
  if (!kayit) return;
  const s = sessionOf(kayit, sid);
  Object.keys(degisiklik).forEach(function (k) { s[k] = degisiklik[k]; });
}

// Sınavı çözmüş (en az gönderilmiş) öğrenciler.
function submittedStudents() {
  return (state.students || []).filter(function (s) {
    const ss = readSession(s.id);
    return ss.examStatus === "submitted" || ss.examStatus === "graded";
  });
}

// Öğrenci değiştir: mevcut oturumu kaydet, hedefinkini yükle.
function activateStudent(sid) {
  if (sid === state.activeStudentId) return;
  syncActiveExam();
  state.activeStudentId = sid;
  const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
  const s = kayit ? sessionOf(kayit, sid) : bosOturum();
  OTURUM_ALANLARI.forEach(function (k) { state[k] = s[k] !== undefined ? s[k] : bosOturum()[k]; });
  renderAll();
}

function activateExam(id) {
  if (id === state.activeExamId) return;
  syncActiveExam();
  const kayit = state.exams.find(function (x) { return x.id === id; });
  if (!kayit) return;
  state.activeExamId = id;
  state.exam = { title: kayit.title, questionIds: kayit.questionIds, timeOverrides: kayit.timeOverrides,
                 status: kayit.status, durationMin: kayit.durationMin,
                 startMode: kayit.startMode || "now", startAtLocal: kayit.startAtLocal || "",
                 startDelaySec: kayit.startDelaySec, startsAt: kayit.startsAt };
  const s = sessionOf(kayit, state.activeStudentId);
  OTURUM_ALANLARI.forEach(function (k) { state[k] = s[k] !== undefined ? s[k] : bosOturum()[k]; });
  renderAll();
}

function createExam(baslik) {
  syncActiveExam();
  const id = examIdSeq++;
  const yeni = { id: id, title: baslik || ("Yeni Sınav " + id), questionIds: [], timeOverrides: {},
                 status: "draft", durationMin: 10, startMode: "now", startAtLocal: "",
                 startDelaySec: 0, startsAt: null, sessions: {} };
  state.exams.push(yeni);
  state.activeExamId = id;
  state.exam = { title: yeni.title, questionIds: [], timeOverrides: {}, status: "draft",
                 durationMin: 10, startMode: "now", startAtLocal: "", startDelaySec: 0, startsAt: null };
  OTURUM_ALANLARI.forEach(function (k) { state[k] = bosOturum()[k]; });
  state.teacherTab = 1;
  renderAll();
}

function deleteExam(id) {
  const kayit = state.exams.find(function (x) { return x.id === id; });
  if (!kayit || kayit.status === "published") return false; // yayındaki sınav silinmez
  state.exams = state.exams.filter(function (x) { return x.id !== id; });
  if (state.activeExamId === id) {
    if (state.exams.length) { state.activeExamId = null; activateExam(state.exams[0].id); }
    else { state.activeExamId = null; createExam("Yeni Sınav"); }
  }
  renderAll();
  return true;
}

// Ilk acilis / eski kayittan gecis: tek sinav varsa listeye tasi.
function ensureExamList() {
  state.exams = state.exams || [];
  state.exams.forEach(function (x) { if (x.id >= examIdSeq) examIdSeq = x.id + 1; });
  if (!state.exams.length) {
    const id = examIdSeq++;
    state.exams.push({ id: id, title: state.exam.title, questionIds: state.exam.questionIds,
      timeOverrides: state.exam.timeOverrides, status: state.exam.status,
      durationMin: state.exam.durationMin, startMode: state.exam.startMode,
      startAtLocal: state.exam.startAtLocal, startDelaySec: state.exam.startDelaySec,
      startsAt: state.exam.startsAt, sessions: {} });
    state.activeExamId = id;
  }
  if (state.activeExamId == null) state.activeExamId = state.exams[0].id;
  syncActiveExam();
}

function examStatusPill(st, sessionStatus) {
  if (st !== "published") return '<span class="pill pill-neutral">Taslak</span>';
  if (sessionStatus === "graded") return '<span class="pill pill-success">Sonuçlandı</span>';
  if (sessionStatus === "submitted") return '<span class="pill pill-accent2">Onay bekliyor</span>';
  return '<span class="pill pill-accent">Yayında</span>';
}

function examSwitcherHtml() {
  return '<div class="exam-switcher"><div class="es-head">Sınavlarım <span class="lbl-hint">' +
    state.exams.length + ' sınav</span></div><div class="es-list">' +
    state.exams.map(function (x) {
      const aktif = x.id === state.activeExamId;
      const sess = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
      const st = aktif ? state.exam.status : x.status;
      const ad = aktif ? (state.exam.title || "Adsız Sınav") : (x.title || "Adsız Sınav");
      const adet = (aktif ? state.exam.questionIds : x.questionIds).length;
      return '<button class="es-item ' + (aktif ? "active" : "") + '" data-exam="' + x.id + '">' +
        '<span class="es-name">' + escapeHtml(ad) + '</span>' +
        '<span class="es-meta">' + adet + ' soru ' + examStatusPill(st, sess) + '</span></button>';
    }).join("") +
    '<button class="es-item es-new" id="btnNewExam">+ Yeni Sınav</button></div>' +
    (state.exam.status !== "published"
      ? '<button class="btn btn-secondary btn-sm" id="btnDelExam" style="margin-top:8px;">Bu taslağı sil</button>'
      : "") + '</div>';
}

function wireExamSwitcher() {
  document.querySelectorAll(".es-item[data-exam]").forEach(function (b) {
    b.onclick = function () { activateExam(Number(b.dataset.exam)); };
  });
  const nb = document.getElementById("btnNewExam");
  if (nb) nb.onclick = function () { createExam(); };
  const db = document.getElementById("btnDelExam");
  if (db) db.onclick = function () { deleteExam(state.activeExamId); };
}

/* ============================== Öğretmen ============================== */
function canPublishExam() {
  if (!state.exam.questionIds.length) return false;
  const opens = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(function (q) { return q && q.type === "open"; });
  return opens.every(function (q) { return state.rubrics[q.id] && state.rubrics[q.id].criteria.length > 0 && totalWeight(state.rubrics[q.id]) === 100; });
}
function totalWeight(rub) { return rub.criteria.reduce(function (s, c) { return s + (Number(c.weight) || 0); }, 0); }
// Model bir rubrik TASLAĞI önerir; öğretmen üzerinde serbestçe değişiklik
// yapar. Taslak geldiğinde mevcut kriterler değiştirilir, ağırlıklar %100'e
// normalleştirilmiş olarak gelir.
async function aiSuggestRubric(qid) {
  const q = findQuestion(qid);
  if (!q) return;
  ensureRubric(qid);
  if (state.ai.mode !== "live") {
    state.rubricError = "Rubrik önerisi için gerçek model bağlantısı gerekiyor.";
    renderAll();
    return;
  }
  state.ai.busy = true; busySince = Date.now(); state.rubricError = ""; renderAll();
  try {
    const j = await apiPost(AI_API.rubric, {
      questionBody: q.body,
      outcomeLabel: outcomeLabel(q.outcome),
      subject: state.ceForm.subject,
      grade: String(state.ceForm.grade),
      maxScore: state.rubrics[qid].maxScore,
    });
    state.rubrics[qid].criteria = (j.criteria || []).map(function (c) {
      return { label: c.label, weight: c.weight, description: c.description || "" };
    });
    state.rubrics[qid].aiDraft = true;
  } catch (e) {
    state.rubricError = "Rubrik önerisi alınamadı: " + String((e && e.message) || e);
  } finally {
    state.ai.busy = false;
    renderAll();
  }
}

function ensureRubric(qid) {
  if (!state.rubrics[qid]) {
    state.rubrics[qid] = { maxScore: 20, criteria: [
      { label: "Kavram doğruluğu", weight: 40 }, { label: "Örnek / uygulama", weight: 30 }, { label: "Anlatım açıklığı", weight: 30 },
    ] };
  }
}

// Sınavın toplam puanı: her çoktan seçmeli 1 puan, her açık uçlu kendi
// rubriğinin maksimum puanı kadar. Öğrenci karnesindeki hesapla aynıdır.
function examTotalPoints(items) {
  return items.reduce(function (s, q) {
    if (q.type === "mc") return s + 1;
    const rub = state.rubrics[q.id];
    return s + (rub ? rub.maxScore : 0);
  }, 0);
}

function examSuggestedSec(items) {
  return items.reduce(function (sum, q) {
    return sum + (state.exam.timeOverrides[q.id] != null ? state.exam.timeOverrides[q.id] : q.aiTime);
  }, 0);
}

function examTrayHtml() {
  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  if (!items.length) return '<div class="empty-state">Soldaki havuzdan soru işaretleyerek sınava ekleyin.</div>';
  const locked = state.exam.status === "published";
  const onerilenDk = Math.round(examSuggestedSec(items) / 6) / 10;
  const puan = examTotalPoints(items);
  const mc = items.filter(function (q) { return q.type === "mc"; }).length;
  const acik = items.length - mc;

  return items.map(function (q, i) {
    const sure = state.exam.timeOverrides[q.id] != null ? state.exam.timeOverrides[q.id] : q.aiTime;
    const qPuan = q.type === "mc" ? 1 : ((state.rubrics[q.id] || {}).maxScore || 0);
    return '<div class="tray-item">' +
      '<span class="t-no">' + (i + 1) + '</span>' +
      '<span class="t-text">' + escapeHtml(truncate(q.body, 62)) +
      '<span class="t-tags"><span class="pill pill-neutral">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
      '<span class="pill pill-accent">' + qPuan + ' puan</span></span></span>' +
      '<span class="t-controls">' +
      '<input type="number" class="tray-time" data-qid="' + q.id + '" min="10" max="900" value="' + sure + '" ' + (locked ? "disabled" : "") + ' title="Bu soru için önerilen süre (saniye)"><span class="t-unit">sn</span>' +
      (locked ? "" :
        '<button class="icon-btn tray-up" data-idx="' + i + '" title="Yukarı taşı" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
        '<button class="icon-btn tray-down" data-idx="' + i + '" title="Aşağı taşı" ' + (i === items.length - 1 ? "disabled" : "") + '>↓</button>' +
        '<button class="icon-btn tray-remove" data-qid="' + q.id + '" title="Sınavdan çıkar">✕</button>') +
      '</span></div>';
  }).join("") +
  '<div class="tray-summary">' +
  '<div class="ts-row"><span>' + items.length + ' soru</span><span>' + mc + ' çoktan seçmeli · ' + acik + ' açık uçlu</span></div>' +
  '<div class="ts-row strong"><span>Toplam puan</span><span class="tabular">' + puan + ' puan</span></div>' +
  '<div class="ts-row"><span>Sorulara verilen sürelerin toplamı</span><span class="tabular">' + onerilenDk + ' dk</span></div>' +
  '</div>';
}

// Sınavın hangi kazanımları ölçtüğünü gösterir. Sistem sadece sınav kurmuyor,
// ölçme geçerliliğini de denetliyor: "4 kazanımdan 3'ünü ölçüyor, biri boşta".
function coverageHtml() {
  const secili = state.exam.questionIds
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(Boolean);
  if (!secili.length) return "";
  const havuzKazanimlari = {};
  state.questions.filter(function (q) { return q.status === "approved"; })
    .forEach(function (q) { havuzKazanimlari[q.outcome] = true; });
  const kodlar = Object.keys(havuzKazanimlari);
  if (!kodlar.length) return "";
  const olculen = {};
  secili.forEach(function (q) { olculen[q.outcome] = (olculen[q.outcome] || 0) + 1; });
  const kapsanan = kodlar.filter(function (k) { return olculen[k]; }).length;
  const eksik = kodlar.filter(function (k) { return !olculen[k]; });
  const zor = { easy: 0, medium: 0, hard: 0 };
  secili.forEach(function (q) { if (zor[q.difficulty] != null) zor[q.difficulty]++; });
  return '<div class="coverage-box">' +
    '<div class="cv-head">Kazanım kapsaması <b>' + kapsanan + '/' + kodlar.length + '</b></div>' +
    '<div class="cv-chips">' + kodlar.map(function (k) {
      return '<span class="cv-chip ' + (olculen[k] ? "on" : "off") + '">' + escapeHtml(k) +
        (olculen[k] ? " · " + olculen[k] + " soru" : " · ölçülmüyor") + '</span>';
    }).join("") + '</div>' +
    (eksik.length
      ? '<div class="cv-warn">Havuzdaki <b>' + eksik.length + '</b> kazanım bu sınavda hiç ölçülmüyor. Ölçme geçerliliği için gözden geçirin.</div>'
      : '<div class="cv-ok">Havuzdaki tüm kazanımlar bu sınavda ölçülüyor.</div>') +
    '<div class="cv-diff">Zorluk dağılımı — Kolay <b>' + zor.easy + '</b> · Orta <b>' + zor.medium + '</b> · Zor <b>' + zor.hard + '</b></div>' +
    '</div>';
}

function filteredPool() {
  const f = state.poolFilter;
  return state.questions.filter(function (q) {
    if (q.status !== "approved") return false;
    if (f.outcome && q.outcome !== f.outcome) return false;
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (f.type && q.type !== f.type) return false;
    return true;
  });
}

/* Öğretmen havuzdaki bir soruyu düzenleyebilir (brief Rol 02:
   "Soru havuzunu düzenler"). Düzenleme yayınlanmış bir sınavdaki soruyu
   da etkileyeceği için, sınav yayındaysa uyarı gösterilir. */
function poolEditHtml(q) {
  const kilitli = state.exams.some(function (x) {
    const st = x.id === state.activeExamId ? state.exam.status : x.status;
    const ids = x.id === state.activeExamId ? state.exam.questionIds : x.questionIds;
    return st === "published" && (ids || []).indexOf(q.id) !== -1;
  });
  return '<div class="pool-edit">' +
    (kilitli ? '<div class="pill pill-warning" style="margin-bottom:9px;">Bu soru yayında olan bir sınavda kullanılıyor. Değişiklik, sınavı çözen öğrencilere de yansır.</div>' : "") +
    '<div class="field"><label>Soru metni</label>' +
    '<textarea class="pe-body" data-qid="' + q.id + '" rows="3">' + escapeHtml(q.body) + '</textarea></div>' +
    (q.type === "mc"
      ? '<div class="field"><label>Şıklar — doğru olanı işaretleyin</label>' +
        (q.options || []).map(function (o) {
          return '<div class="opt-row" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<span class="opt-key">' + o.key + '</span>' +
            '<input type="text" class="pe-opt" data-qid="' + q.id + '" data-okey="' + o.key + '" value="' + escapeHtml(o.text) + '" style="flex:1;">' +
            '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);white-space:nowrap;">' +
            '<input type="radio" name="pe-correct-' + q.id + '" class="pe-correct" data-qid="' + q.id + '" data-okey="' + o.key + '"' +
            (o.key === q.correctKey ? " checked" : "") + '> doğru</label></div>';
        }).join("") + '</div>'
      : "") +
    '<div class="field-row"><div class="field"><label>Zorluk</label>' +
    '<select class="pe-diff" data-qid="' + q.id + '">' +
    [["easy", "Kolay"], ["medium", "Orta"], ["hard", "Zor"]].map(function (d) {
      return '<option value="' + d[0] + '"' + (q.difficulty === d[0] ? " selected" : "") + '>' + d[1] + '</option>';
    }).join("") + '</select></div>' +
    '<div class="field"><label>Kazanım</label><select class="pe-outcome" data-qid="' + q.id + '">' +
    OUTCOMES_LIST().map(function (o) {
      return '<option value="' + o.code + '"' + (q.outcome === o.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
    }).join("") + '</select></div>' +
    '<div class="field"><label>Süre (sn)</label>' +
    '<input type="number" class="pe-time" data-qid="' + q.id + '" min="15" max="900" value="' + q.aiTime + '"></div></div>' +
    '<button class="btn btn-primary btn-sm pe-save" data-qid="' + q.id + '">Değişiklikleri Kaydet</button> ' +
    '<button class="btn btn-secondary btn-sm pe-cancel">Vazgeç</button></div>';
}

function poolFilterHtml() {
  const f = state.poolFilter;
  const kazanimlar = {};
  state.questions.filter(function (q) { return q.status === "approved"; })
    .forEach(function (q) { kazanimlar[q.outcome] = true; });
  const sec = function (id, deger, secenekler) {
    return '<select id="' + id + '"><option value="">Tümü</option>' +
      secenekler.map(function (o) {
        return '<option value="' + escapeHtml(o.v) + '"' + (deger === o.v ? " selected" : "") + '>' + escapeHtml(o.t) + '</option>';
      }).join("") + '</select>';
  };
  return '<div class="pool-filter">' +
    '<div class="field"><label>Kazanım</label>' + sec("fltOutcome", f.outcome,
      Object.keys(kazanimlar).map(function (k) { return { v: k, t: k }; })) + '</div>' +
    '<div class="field"><label>Zorluk</label>' + sec("fltDiff", f.difficulty,
      [{ v: "easy", t: "Kolay" }, { v: "medium", t: "Orta" }, { v: "hard", t: "Zor" }]) + '</div>' +
    '<div class="field"><label>Soru türü</label>' + sec("fltType", f.type,
      [{ v: "mc", t: "Çoktan Seçmeli" }, { v: "open", t: "Açık Uçlu" }]) + '</div>' +
    '</div>';
}

function teacherTab1Html() {
  const approved = filteredPool();
  const tumOnayli = state.questions.filter(function (q) { return q.status === "approved"; }).length;
  const inExam = function (id) { return state.exam.questionIds.indexOf(id) !== -1; };
  const locked = state.exam.status === "published";
  return examSwitcherHtml() + '<div class="grid-2">' +
    '<div class="card"><div class="card-head"><h3>Onaylı Soru Havuzu</h3><span class="hint">' +
    (approved.length === tumOnayli ? approved.length + ' soru' : approved.length + ' / ' + tumOnayli + ' soru (filtreli)') + '</span></div>' +
    poolFilterHtml() +
    (approved.length ? approved.map(function (q) {
      const duzenleniyor = state.editingQid === q.id;
      return '<div class="pool-item"><input type="checkbox" class="pool-check" data-qid="' + q.id + '" ' + (inExam(q.id) ? "checked" : "") + " " + (locked ? "disabled" : "") + ' style="margin-top:3px;">' +
        '<div class="p-body">' + escapeHtml(q.body) + '<div class="p-tags"><span class="pill pill-accent">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
        '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' + bloomPill(q.bloom) +
        '<span class="pill pill-neutral">' + q.outcome + '</span></div>' +
        (duzenleniyor ? poolEditHtml(q) : "") + '</div>' +
        '<button class="btn btn-secondary btn-sm pool-edit-btn" data-qid="' + q.id + '" title="Bu soruyu düzenle">' +
        (duzenleniyor ? "Kapat" : "Düzenle") + '</button></div>';
    }).join("") : '<div class="empty-state">' + (tumOnayli ? 'Bu filtreye uyan soru yok. Filtreyi genişletin.' : 'Havuzda onaylı soru yok — önce İçerik Uzmanı panelinden soru onaylatın.') + '</div>') + '</div>' +
    '<div class="card"><div class="card-head"><h3>Sınav Taslağı</h3><span class="hint">' + state.exam.questionIds.length + ' soru seçildi</span></div>' +
    '<div class="field"><label>Sınav Başlığı</label><input id="examTitle" type="text" value="' + escapeHtml(state.exam.title) + '" placeholder="örn. 1. Dönem Fen Bilimleri Kısa Sınavı" ' + (locked ? "disabled" : "") + '></div>' +
    '<div id="examTray">' + examTrayHtml() + '</div>' + coverageHtml() +
    '<div class="field-row" style="margin-top:12px;"><div class="field"><label>Öğrenciye verilecek toplam süre (dk)</label>' +
    '<div class="input-with-actions"><input id="examDuration" type="number" min="1" value="' + state.exam.durationMin + '" ' + (locked ? "disabled" : "") + '>' +
    (locked ? "" : '<button class="btn btn-secondary btn-sm" id="btnUseSuggested" title="Soru sürelerinin toplamını uygula">Öneriyi uygula</button>') + '</div>' +
    '<span class="field-note">Sınav bu süre dolunca otomatik biter. Yukarıdaki soru süreleri yalnızca öneridir.</span></div>' +
    '<div class="field"><label>Sınav ne zaman açılsın?</label>' +
    '<select id="examStartMode" ' + (locked ? "disabled" : "") + '>' +
    '<option value="now"' + (state.exam.startMode !== "scheduled" ? " selected" : "") + '>Yayınlar yayınlamaz</option>' +
    '<option value="scheduled"' + (state.exam.startMode === "scheduled" ? " selected" : "") + '>Belirli bir tarih ve saatte</option>' +
    '</select></div></div>' +
    (state.exam.startMode === "scheduled"
      ? '<div class="field"><label>Açılış tarihi ve saati</label>' +
        '<input id="examStartAt" type="datetime-local" value="' + escapeHtml(state.exam.startAtLocal || "") + '" ' + (locked ? "disabled" : "") + '>' +
        '<span class="lbl-hint">Öğrenciler bu saatten önce sınava giremez; sınav kartında geri sayım görür.</span></div>'
      : '<div class="lbl-hint" style="margin:-4px 0 12px;">Sınav, yayınladığınız anda öğrencilerin listesinde açılır.</div>') +
    (locked && state.exam.startsAt
      ? '<div class="pill pill-neutral" style="margin-bottom:8px;">Açılış: ' +
        new Date(state.exam.startsAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) + '</div>'
      : "") +
    (locked ? '<div class="pill pill-success">Yayında — öğrenciler görebilir</div>' :
      '<button class="btn btn-primary" id="btnPublishExam" ' + (canPublishExam() ? "" : "disabled") + '>Sınavı Yayınla</button>' +
      (!canPublishExam() && state.exam.questionIds.length ? '<div class="pill pill-warning" style="margin-top:8px;">Açık uçlu sorular için Rubrik sekmesinden %100 ağırlıklı puanlama anahtarı tanımlayın.</div>' : "")
    ) + "</div></div>" + rejectedPoolHtml("teacher");
}

function wireTeacherTab1() {
  wireExamSwitcher();
  wireRejectedPool();
  const fo = document.getElementById("fltOutcome");
  if (fo) fo.onchange = function (e) { state.poolFilter.outcome = e.target.value; renderAll(); };
  const fd = document.getElementById("fltDiff");
  if (fd) fd.onchange = function (e) { state.poolFilter.difficulty = e.target.value; renderAll(); };
  const ft = document.getElementById("fltType");
  if (ft) ft.onchange = function (e) { state.poolFilter.type = e.target.value; renderAll(); };

  // --- havuzda soru düzenleme ---
  document.querySelectorAll(".pool-edit-btn").forEach(function (b) {
    b.onclick = function () {
      const id = Number(b.dataset.qid);
      state.editingQid = state.editingQid === id ? null : id;
      renderAll();
    };
  });
  const cancelBtn = document.querySelector(".pe-cancel");
  if (cancelBtn) cancelBtn.onclick = function () { state.editingQid = null; renderAll(); };
  // Metin girdileri renderAll ÇAĞIRMAZ (odak kaybolmasın); doğrudan mutasyon.
  document.querySelectorAll(".pe-body").forEach(function (el) {
    el.oninput = function () { const q = findQuestion(el.dataset.qid); if (q) { q.body = el.value; saveSoon(); } };
  });
  document.querySelectorAll(".pe-opt").forEach(function (el) {
    el.oninput = function () {
      const q = findQuestion(el.dataset.qid);
      if (!q) return;
      const o = (q.options || []).find(function (x) { return x.key === el.dataset.okey; });
      if (o) { o.text = el.value; saveSoon(); }
    };
  });
  document.querySelectorAll(".pe-correct").forEach(function (el) {
    el.onchange = function () { const q = findQuestion(el.dataset.qid); if (q) { q.correctKey = el.dataset.okey; saveSoon(); } };
  });
  document.querySelectorAll(".pe-diff").forEach(function (el) {
    el.onchange = function () { const q = findQuestion(el.dataset.qid); if (q) { q.difficulty = el.value; renderAll(); } };
  });
  document.querySelectorAll(".pe-outcome").forEach(function (el) {
    el.onchange = function () { const q = findQuestion(el.dataset.qid); if (q) { q.outcome = el.value; renderAll(); } };
  });
  document.querySelectorAll(".pe-time").forEach(function (el) {
    el.onchange = function () { const q = findQuestion(el.dataset.qid); if (q) { q.aiTime = Math.max(15, Math.min(900, Number(el.value) || 60)); renderAll(); } };
  });
  document.querySelectorAll(".pe-save").forEach(function (b) {
    b.onclick = function () { state.editingQid = null; renderAll(); };
  });
  document.getElementById("examTitle").oninput = function (e) { state.exam.title = e.target.value; };
  const durEl = document.getElementById("examDuration"); if (durEl) durEl.oninput = function (e) { state.exam.durationMin = Number(e.target.value) || 1; };
  const sugBtn = document.getElementById("btnUseSuggested");
  if (sugBtn) sugBtn.onclick = function () {
    const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
    state.exam.durationMin = Math.max(1, Math.ceil(examSuggestedSec(items) / 60));
    renderAll();
  };
  document.querySelectorAll(".tray-up").forEach(function (b) {
    b.onclick = function () {
      const i = Number(b.dataset.idx), ids = state.exam.questionIds;
      if (i > 0) { const tmp = ids[i - 1]; ids[i - 1] = ids[i]; ids[i] = tmp; renderAll(); }
    };
  });
  document.querySelectorAll(".tray-down").forEach(function (b) {
    b.onclick = function () {
      const i = Number(b.dataset.idx), ids = state.exam.questionIds;
      if (i < ids.length - 1) { const tmp = ids[i + 1]; ids[i + 1] = ids[i]; ids[i] = tmp; renderAll(); }
    };
  });
  document.querySelectorAll(".tray-remove").forEach(function (b) {
    b.onclick = function () {
      const qid = Number(b.dataset.qid);
      state.exam.questionIds = state.exam.questionIds.filter(function (x) { return x !== qid; });
      renderAll();
    };
  });
  const modeEl = document.getElementById("examStartMode");
  if (modeEl) modeEl.onchange = function (e) {
    state.exam.startMode = e.target.value;
    if (state.exam.startMode === "scheduled" && !state.exam.startAtLocal) {
      // Varsayılan: 1 saat sonrası, dakikaya yuvarlanmış.
      const d = new Date(Date.now() + 3600000);
      d.setSeconds(0, 0);
      const pad = function (n) { return String(n).padStart(2, "0"); };
      state.exam.startAtLocal = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
        "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
    renderAll();
  };
  const startEl = document.getElementById("examStartAt");
  if (startEl) startEl.onchange = function (e) { state.exam.startAtLocal = e.target.value; saveSoon(); };
  document.querySelectorAll(".pool-check").forEach(function (el) {
    el.onchange = function () {
      const qid = Number(el.dataset.qid);
      if (el.checked) { if (state.exam.questionIds.indexOf(qid) === -1) state.exam.questionIds.push(qid); }
      else { state.exam.questionIds = state.exam.questionIds.filter(function (id) { return id !== qid; }); delete state.exam.timeOverrides[qid]; }
      renderAll();
    };
  });
  document.querySelectorAll(".tray-time").forEach(function (el) {
    el.oninput = function () { state.exam.timeOverrides[Number(el.dataset.qid)] = Number(el.value) || 10; };
  });
  const pubBtn = document.getElementById("btnPublishExam");
  if (pubBtn) pubBtn.onclick = function () {
    if (state.exam.startMode === "scheduled" && state.exam.startAtLocal) {
      const ts = new Date(state.exam.startAtLocal).getTime();
      if (isNaN(ts)) { state.poolError = "Geçerli bir açılış tarihi ve saati seçin."; renderAll(); return; }
      state.exam.startsAt = ts;
    } else {
      state.exam.startsAt = Date.now();
    }
    state.exam.status = "published";
    state.poolError = "";
    renderAll();
  };
}

/* ==================== Sınıf Simülasyonu ====================
   Analiz ekranlarının anlamlı olması ve ürünün ana değer önerisinin
   ("40 kağıt yerine AI'ın zorlandığı birkaçına odaklan") görünmesi için
   birden fazla öğrenci gerekir.

   Üretilen yanıtlar GERÇEK ÖĞRENCİLERE AİT DEĞİLDİR; arayüzde "simüle"
   rozetiyle işaretlenir. Ancak değerlendirme gerçek modelle, öğretmenin
   tanımladığı gerçek rubrikle yapılır — sınıf ortalamaları uydurma sabit
   veriden değil, bu gerçek değerlendirmelerden hesaplanır.            */
const SIM_ISIMLER = ["Ada Y.", "Deniz K.", "Ege T.", "Mira S.", "Poyraz A.", "Zeynep D.", "Kerem B.", "Elif N."];
const SIM_DUZEYLER = [
  "kavramı doğru ve örnekle açıklayan güçlü bir yanıt",
  "kavramı büyük ölçüde doğru açıklayan ama örnek vermeyen orta düzey yanıt",
  "kavramın yalnızca bir kısmını bilen, kısa ve eksik yanıt",
  "kavramı yanlış anlamış, konuyla kısmen ilgili zayıf yanıt",
  "çok kısa ve neredeyse hiçbir açıklama içermeyen yanıt"
];

function simProgress(metin, oran) {
  state.simStatus = { metin: metin, oran: oran };
  const el = document.getElementById("simProgress");
  if (el) {
    el.innerHTML = '<div class="sim-bar"><div class="sim-fill" style="width:' + Math.round(oran * 100) + '%;"></div></div>' +
      '<div class="sim-text">' + escapeHtml(metin) + '</div>';
  }
}

async function simulateClass(adet) {
  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  if (!items.length) { state.poolError = "Önce sınava soru ekleyin."; renderAll(); return; }
  if (state.exam.status !== "published") { state.poolError = "Sınıfı simüle etmeden önce sınavı yayınlayın."; renderAll(); return; }
  const opens = items.filter(function (q) { return q.type === "open"; });
  if (opens.some(function (q) { return !state.rubrics[q.id] || totalWeight(state.rubrics[q.id]) !== 100; })) {
    state.poolError = "Açık uçlu sorular için puanlama anahtarını tamamlayın (%100).";
    renderAll();
    return;
  }

  state.simRunning = true;
  state.poolError = "";
  renderAll();

  try {
    // 1) Öğrencileri oluştur
    const yeniler = [];
    for (let i = 0; i < adet; i++) {
      // Simüle öğrenciler mevcut şubelere sırayla dağıtılır ki şube
      // karşılaştırması anlamlı olsun.
      const subeler = siniflar();
      const s = { id: studentIdSeq++, name: SIM_ISIMLER[i % SIM_ISIMLER.length], demo: true,
                  sinif: subeler.length ? subeler[i % subeler.length] : "7-A",
                  ability: 0.35 + (i / Math.max(1, adet - 1)) * 0.55 };
      state.students.push(s);
      yeniler.push(s);
    }
    simProgress(adet + " öğrenci oluşturuldu", 0.1);

    // 2) Açık uçlu sorular için farklı düzeylerde örnek yanıtlar
    const yanitlar = {};
    for (let oi = 0; oi < opens.length; oi++) {
      const q = opens[oi];
      simProgress("Örnek yanıtlar hazırlanıyor (" + (oi + 1) + "/" + opens.length + ")…", 0.1 + 0.25 * (oi / Math.max(1, opens.length)));
      const seviyeler = yeniler.map(function (s, i) { return SIM_DUZEYLER[Math.min(SIM_DUZEYLER.length - 1, Math.floor((1 - s.ability) * SIM_DUZEYLER.length))]; });
      try {
        const j = await apiPost(AI_API.sampleAnswers, {
          questionBody: q.body,
          outcomeLabel: outcomeLabel(q.outcome),
          grade: String(state.ceForm.grade),
          levels: seviyeler
        });
        yanitlar[q.id] = j.answers || [];
      } catch (e) {
        state.poolError = "Örnek yanıtlar üretilemedi: " + String((e && e.message) || e);
        yanitlar[q.id] = [];
      }
    }

    // 3) Her öğrenci için yanıtla + değerlendir
    for (let i = 0; i < yeniler.length; i++) {
      const ogr = yeniler[i];
      const oturum = bosOturum();
      items.forEach(function (q) {
        if (q.type === "mc") {
          const dogru = Math.random() < ogr.ability;
          const yanlislar = (q.options || []).filter(function (o) { return o.key !== q.correctKey; });
          const sec = dogru ? q.correctKey : (yanlislar.length ? yanlislar[Math.floor(Math.random() * yanlislar.length)].key : q.correctKey);
          oturum.answers[q.id] = { selectedKey: sec, savedAt: Date.now() };
          oturum.mcResults[q.id] = { correct: sec === q.correctKey };
        } else {
          const liste = yanitlar[q.id] || [];
          oturum.answers[q.id] = { text: liste[i] || liste[liste.length - 1] || "", savedAt: Date.now() };
        }
      });
      oturum.examStatus = "submitted";

      // Açık uçluları GERÇEK modelle değerlendir
      for (let oi = 0; oi < opens.length; oi++) {
        const q = opens[oi];
        simProgress(ogr.name + " değerlendiriliyor (" + (i + 1) + "/" + yeniler.length + ")…",
          0.35 + 0.6 * ((i * opens.length + oi) / Math.max(1, yeniler.length * opens.length)));
        oturum.aiEvals[q.id] = await aiEvaluate(q, oturum.answers[q.id].text || "", state.rubrics[q.id]);
      }

      const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
      if (kayit) examSessions(kayit)[ogr.id] = oturum;
    }

    simProgress("Tamamlandı — " + yeniler.length + " öğrenci sınavı gönderdi", 1);
  } finally {
    state.simRunning = false;
    renderAll();
  }
}

/* ==================== Puanlama Anahtarı (Rubrik) ====================
   Bu ekranın tek işi şu: açık uçlu bir yanıtın hangi ölçütlere göre
   puanlanacağını ÖĞRETMENİN belirlemesi. Yapay zekâ bu ölçütlerin dışına
   çıkamaz (bkz. src/lib/prompts.ts → buildEvaluationPrompt).

   Önceki sürüm doğrudan sayı istiyordu; kullanıcı %40'ın kaç puan ettiğini,
   neden 100 olması gerektiğini ve ne kadar eksik kaldığını göremiyordu.   */

const RUBRIK_SABLONLARI = [
  {
    ad: "Kavramsal Anlama",
    aciklama: "Bir kavramın doğru anlaşılıp anlaşılmadığını ölçen sorular için",
    criteria: [
      { label: "Kavram doğruluğu", weight: 50, description: "Kavramı bilimsel olarak doğru ifade etmiş." },
      { label: "Kavramlar arası ilişki", weight: 30, description: "İlgili kavramlarla bağını kurmuş." },
      { label: "Anlatım açıklığı", weight: 20, description: "Anlaşılır ve tutarlı bir dille açıklamış." }
    ]
  },
  {
    ad: "Problem Çözme",
    aciklama: "İşlem ve çözüm yolu gerektiren sorular için",
    criteria: [
      { label: "Yöntem seçimi", weight: 35, description: "Probleme uygun yolu seçmiş." },
      { label: "İşlem doğruluğu", weight: 35, description: "Adımları hatasız uygulamış." },
      { label: "Sonucun yorumu", weight: 30, description: "Bulduğu sonucu anlamlandırmış." }
    ]
  },
  {
    ad: "Yazılı Anlatım",
    aciklama: "Görüş, yorum ve gerekçelendirme isteyen sorular için",
    criteria: [
      { label: "İçerik zenginliği", weight: 40, description: "Konuyu yeterli derinlikte ele almış." },
      { label: "Örnek ve dayanak", weight: 30, description: "İddialarını örnekle desteklemiş." },
      { label: "Dil ve tutarlılık", weight: 30, description: "Bütünlüklü ve akıcı yazmış." }
    ]
  }
];

function kriterPuani(rub, c) {
  return Math.round(rub.maxScore * (Number(c.weight) || 0) / 100 * 10) / 10;
}

function critRowHtml(rub, c, i) {
  const puan = kriterPuani(rub, c);
  const acikMi = state.critDescOpen === i || !!c.description;
  return '<div class="crit-block">' +
    '<div class="crit-row" data-idx="' + i + '">' +
    '<span class="crit-no">' + (i + 1) + '</span>' +
    '<input type="text" class="crit-label" data-idx="' + i + '" value="' + escapeHtml(c.label) + '" placeholder="örn. Kavram doğruluğu">' +
    '<input type="number" class="crit-weight" data-idx="' + i + '" min="0" max="100" value="' + c.weight + '">' +
    '<span class="crit-pct">%</span>' +
    '<span class="crit-points" data-idx="' + i + '">= ' + puan + ' puan</span>' +
    '<button class="btn btn-ghost btn-sm crit-remove" data-idx="' + i + '" title="Bu ölçütü kaldır">✕</button></div>' +
    (acikMi
      ? '<textarea class="crit-desc" data-idx="' + i + '" rows="2" placeholder="Bu ölçütten tam puan almak için yanıtta ne olmalı?">' + escapeHtml(c.description || "") + '</textarea>'
      : '<button class="crit-desc-add" data-idx="' + i + '">+ Ne beklendiğini yaz (opsiyonel)</button>') +
    '</div>';
}

function teacherTab2Html() {
  const opens = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(function (q) { return q && q.type === "open"; });
  if (!opens.length) {
    return '<div class="card"><div class="card-head"><h3>Puanlama Anahtarı</h3></div>' +
      '<div class="rub-intro">Açık uçlu sorular, çoktan seçmeli sorular gibi tek bir doğru cevaba sahip değildir. ' +
      'Bu yüzden yapay zekânın <b>neye göre puan vereceğini</b> siz belirlersiniz. ' +
      'Bu ekran, sınavınızdaki açık uçlu sorular için o ölçütleri tanımladığınız yerdir.</div>' +
      '<div class="empty-state">Sınavda henüz açık uçlu soru yok. Önce <b>1 · Sınav Oluştur</b> sekmesinden açık uçlu bir soru ekleyin.</div></div>';
  }
  if (state.rubricSelectedQ == null || !opens.find(function (q) { return q.id === state.rubricSelectedQ; })) state.rubricSelectedQ = opens[0].id;
  const q = opens.find(function (x) { return x.id === state.rubricSelectedQ; });
  ensureRubric(q.id);
  const rub = state.rubrics[q.id];
  const tw = totalWeight(rub);
  const kalanPuan = Math.round(rub.maxScore * (100 - tw) / 100 * 10) / 10;

  // Dağıtım çubuğu: ölçütlerin ağırlıkları renkli bloklar hâlinde.
  const renkler = ["--accent", "--accent2", "--success", "--warning", "--critical", "--accent-strong"];
  const bar = '<div class="rub-bar">' +
    rub.criteria.map(function (c, i) {
      const w = Math.max(0, Math.min(100, Number(c.weight) || 0));
      return w ? '<div class="rb-seg" style="width:' + w + '%;background:var(' + renkler[i % renkler.length] + ');" title="' + escapeHtml(c.label) + ' %' + w + '"></div>' : "";
    }).join("") +
    (tw < 100 ? '<div class="rb-seg rb-empty" style="width:' + (100 - tw) + '%;"></div>' : "") +
    '</div>';

  const durum = tw === 100
    ? '<div class="rub-status ok">✓ Ölçütler tamam. Toplam <b>' + rub.maxScore + ' puan</b> eksiksiz dağıtıldı; sınavı yayınlayabilirsiniz.</div>'
    : tw < 100
      ? '<div class="rub-status warn">Ağırlıkların toplamı <b>%' + tw + '</b>. Dağıtılmayı bekleyen <b>' + kalanPuan + ' puan</b> var — ölçüt ekleyin ya da ağırlıkları artırın.</div>'
      : '<div class="rub-status err">Ağırlıkların toplamı <b>%' + tw + '</b> — 100\'ü <b>' + (tw - 100) + ' puan</b> aşıyor. Fazlalığı azaltın.</div>';

  const soruSecici = opens.length > 1
    ? '<div class="rub-qpick"><span class="lbl-hint">Bu sınavda ' + opens.length + ' açık uçlu soru var — her biri için ayrı ölçüt tanımlarsınız:</span><div>' +
      opens.map(function (o) {
        const r = state.rubrics[o.id];
        const hazir = r && totalWeight(r) === 100;
        return '<button class="btn ' + (o.id === q.id ? "btn-primary" : "btn-secondary") + ' btn-sm rub-select" data-qid="' + o.id + '">' +
          (hazir ? "✓ " : "• ") + escapeHtml(truncate(o.body, 30)) + '</button>';
      }).join("") + '</div></div>'
    : "";

  return '<div class="card">' +
    '<div class="card-head"><h3>Puanlama Anahtarı</h3><span class="hint">açık uçlu yanıtlar için</span></div>' +
    '<div class="rub-intro">Açık uçlu yanıtların tek bir doğru cevabı yoktur. Bu yüzden yapay zekânın ' +
    '<b>neye göre puan vereceğini siz belirlersiniz</b> — model bu ölçütlerin dışına çıkamaz, ' +
    'her ölçüt için ayrı puan ve gerekçe üretir. Nihai puanı yine siz onaylarsınız.</div>' +
    soruSecici +
    '<div class="rub-question"><span class="rq-label">Ölçüt tanımlanan soru</span>' + escapeHtml(q.body) + '</div>' +

    '<div class="rub-step"><span class="rs-no">1</span><span class="rs-text">Bu soru kaç puan üzerinden değerlendirilsin?</span></div>' +
    '<div class="field" style="max-width:180px;"><input id="rubMax" type="number" min="1" max="100" value="' + rub.maxScore + '"></div>' +

    '<div class="rub-step"><span class="rs-no">2</span><span class="rs-text">Bu ' + rub.maxScore + ' puanı hangi ölçütlere dağıtacaksınız?</span></div>' +
    '<div class="rub-helpers">' +
    '<button class="btn btn-primary btn-sm" id="btnAiRubric"' + (state.ai.busy ? " disabled" : "") + '>' +
    (state.ai.busy ? '⏳ Hazırlanıyor… <span id="busyTimer" class="tabular">0 sn</span>' : "🤖 Bu soruya özel taslak öner") + '</button>' +
    RUBRIK_SABLONLARI.map(function (s, i) {
      return '<button class="btn btn-secondary btn-sm rub-tpl" data-tpl="' + i + '" title="' + escapeHtml(s.aciklama) + '">' + escapeHtml(s.ad) + '</button>';
    }).join("") +
    '</div>' +
    (state.rubricError ? '<div class="pill pill-critical" style="margin-bottom:10px;">' + escapeHtml(state.rubricError) + '</div>' : "") +
    (rub.aiDraft ? '<div class="pill pill-accent2" style="margin-bottom:10px;">Bu taslağı yapay zekâ önerdi — onaylamadan önce gözden geçirin.</div>' : "") +

    bar + durum +
    '<div id="critList">' + rub.criteria.map(function (c, i) { return critRowHtml(rub, c, i); }).join("") + '</div>' +
    '<button class="btn btn-secondary btn-sm" id="btnAddCrit">+ Ölçüt Ekle</button>' +
    '</div>';
}

function wireTeacherTab2() {
  const aiRub = document.getElementById("btnAiRubric");
  if (aiRub) aiRub.onclick = function () { aiSuggestRubric(state.rubricSelectedQ); };

  document.querySelectorAll(".rub-tpl").forEach(function (b) {
    b.onclick = function () {
      const s = RUBRIK_SABLONLARI[Number(b.dataset.tpl)];
      const rub = state.rubrics[state.rubricSelectedQ];
      rub.criteria = JSON.parse(JSON.stringify(s.criteria));
      rub.aiDraft = false;
      state.rubricError = "";
      renderAll();
    };
  });

  document.querySelectorAll(".rub-select").forEach(function (b) {
    b.onclick = function () { state.rubricSelectedQ = Number(b.dataset.qid); state.critDescOpen = null; renderAll(); };
  });

  document.querySelectorAll(".crit-desc-add").forEach(function (b) {
    b.onclick = function () { state.critDescOpen = Number(b.dataset.idx); renderAll(); };
  });
  document.querySelectorAll(".crit-desc").forEach(function (el) {
    el.oninput = function () {
      const rub = state.rubrics[state.rubricSelectedQ];
      if (rub && rub.criteria[el.dataset.idx]) { rub.criteria[el.dataset.idx].description = el.value; saveSoon(); }
    };
  });

  const maxEl = document.getElementById("rubMax");
  if (maxEl) maxEl.onchange = function () {
    state.rubrics[state.rubricSelectedQ].maxScore = Math.max(1, Math.min(100, Number(maxEl.value) || 1));
    renderAll();
  };

  document.querySelectorAll(".crit-label").forEach(function (el) {
    el.oninput = function () { state.rubrics[state.rubricSelectedQ].criteria[Number(el.dataset.idx)].label = el.value; saveSoon(); };
  });

  // Ağırlık değişince renderAll ÇAĞIRMAYIZ (odak kaybolmasın); puan
  // karşılığını, çubuğu ve durum satırını yerinde güncelleriz.
  document.querySelectorAll(".crit-weight").forEach(function (el) {
    el.oninput = function () {
      const rub = state.rubrics[state.rubricSelectedQ];
      const i = Number(el.dataset.idx);
      rub.criteria[i].weight = Math.max(0, Math.min(100, Number(el.value) || 0));
      const pEl = document.querySelector('.crit-points[data-idx="' + i + '"]');
      if (pEl) pEl.textContent = "= " + kriterPuani(rub, rub.criteria[i]) + " puan";
      rubRefreshBar(rub);
      saveSoon();
    };
  });

  const addBtn = document.getElementById("btnAddCrit");
  if (addBtn) addBtn.onclick = function () {
    const rub = state.rubrics[state.rubricSelectedQ];
    const kalan = Math.max(0, 100 - totalWeight(rub));
    rub.criteria.push({ label: "", weight: kalan, description: "" });
    state.critDescOpen = null;
    renderAll();
  };
  document.querySelectorAll(".crit-remove").forEach(function (el) {
    el.onclick = function () {
      state.rubrics[state.rubricSelectedQ].criteria.splice(Number(el.dataset.idx), 1);
      state.critDescOpen = null;
      renderAll();
    };
  });
}

// Ağırlık yazarken çubuğu ve durum metnini yeniden çizmeden güncelle.
function rubRefreshBar(rub) {
  const tw = totalWeight(rub);
  const kalanPuan = Math.round(rub.maxScore * (100 - tw) / 100 * 10) / 10;
  const bar = document.querySelector(".rub-bar");
  if (bar) {
    const renkler = ["--accent", "--accent2", "--success", "--warning", "--critical", "--accent-strong"];
    bar.innerHTML = rub.criteria.map(function (c, i) {
      const w = Math.max(0, Math.min(100, Number(c.weight) || 0));
      return w ? '<div class="rb-seg" style="width:' + w + '%;background:var(' + renkler[i % renkler.length] + ');"></div>' : "";
    }).join("") + (tw < 100 ? '<div class="rb-seg rb-empty" style="width:' + (100 - tw) + '%;"></div>' : "");
  }
  const st = document.querySelector(".rub-status");
  if (st) {
    if (tw === 100) {
      st.className = "rub-status ok";
      st.innerHTML = "✓ Ölçütler tamam. Toplam <b>" + rub.maxScore + " puan</b> eksiksiz dağıtıldı; sınavı yayınlayabilirsiniz.";
    } else if (tw < 100) {
      st.className = "rub-status warn";
      st.innerHTML = "Ağırlıkların toplamı <b>%" + tw + "</b>. Dağıtılmayı bekleyen <b>" + kalanPuan + " puan</b> var — ölçüt ekleyin ya da ağırlıkları artırın.";
    } else {
      st.className = "rub-status err";
      st.innerHTML = "Ağırlıkların toplamı <b>%" + tw + "</b> — 100'ü <b>" + (tw - 100) + " puan</b> aşıyor. Fazlalığı azaltın.";
    }
  }
}

function studentChip(student) {
  return '<span class="student-chip' + (student.demo ? " sim" : "") + '">' +
    escapeHtml(student.name) +
    (student.sinif ? ' <span class="sc-class">' + escapeHtml(student.sinif) + '</span>' : "") +
    (student.demo ? ' <span class="sc-tag">simüle</span>' : "") + '</span>';
}

function evalCardHtml(q, student, ev) {
  const ss = readSession(student.id);
  const ans = (ss.answers || {})[q.id] || { text: "" };
  const rub = state.rubrics[q.id];
  if (ev && ev.failed) return evalFailedCardHtml(q, student, ans, ev, rub);
  if (!ev) return "";
  return '<div class="eval-card" data-qid="' + q.id + '" data-sid="' + student.id + '">' +
    '<div class="q-meta">' + studentChip(student) +
    '<span class="pill pill-accent">Açık Uçlu</span><span class="pill pill-neutral">' + q.outcome + '</span></div>' +
    '<div style="font-weight:600;font-size:14px;">' + escapeHtml(q.body) + '</div>' +
    '<div class="eval-grid"><div class="eval-block"><h4>Öğrenci Yanıtı</h4><div class="answer-box">' + escapeHtml(ans.text || "(boş bırakıldı)") + '</div></div>' +
    '<div class="eval-block"><h4>AI Puan Önerisi — ' + ev.aiScore + ' / ' + rub.maxScore + '</h4>' +
    (ev.fromCache ? '<div class="cache-note">Bu değerlendirme daha önce aynı yanıt ve aynı rubrikle yapılmıştı; sonuç önbellekten getirildi. Yeniden hesaplatmak için "Yapay Zekâ ile Yeniden Dene" kullanın.</div>' : "") +
    confBadge(ev.confidence) +
    injectionWarnHtml(ev) +
    (ev.breakdown || []).map(function (b) {
      return '<div class="crit-line"><span>' + escapeHtml(b.label) + ' (%' + b.weight + ')</span><span class="tabular">' + b.points + '/' + b.max + '</span></div>' +
        '<div class="bar-track" style="margin-bottom:4px;"><div class="bar-fill" style="width:' + Math.round(b.points / b.max * 100) + '%;"></div></div>' +
        (b.reason ? '<div class="crit-reason">' + escapeHtml(b.reason) + '</div>' : "");
    }).join("") + '<div class="justification">' + escapeHtml(ev.justification) + '</div></div></div>' +
    '<div class="field-row" style="margin-top:14px;align-items:flex-end;">' +
    '<div class="field" style="max-width:160px;"><label>Nihai puan</label><input type="number" class="final-score" data-qid="' + q.id + '" data-sid="' + student.id + '" min="0" max="' + rub.maxScore + '" step="0.5" value="' + ev.aiScore + '"></div>' +
    '<div class="field" style="flex:2;"><label>Not (opsiyonel)</label><input type="text" class="teacher-comment" data-qid="' + q.id + '" data-sid="' + student.id + '" placeholder="öğrenciye görünecek kısa not"></div></div>' +
    '<div class="actions"><button class="btn btn-success approve-as-is" data-qid="' + q.id + '" data-sid="' + student.id + '">✓ Tek Tıkla Onayla (AI puanı: ' + ev.aiScore + ')</button>' +
    '<button class="btn btn-secondary revise-approve" data-qid="' + q.id + '" data-sid="' + student.id + '">Puanı Güncelle ve Onayla</button>' +
    (ev.fromCache ? '<button class="btn btn-secondary retry-eval" data-qid="' + q.id + '" data-sid="' + student.id + '">Yapay Zekâ ile Yeniden Dene</button>' : "") +
    '</div></div>';
}

// Değerlendirme yapılamadıysa: ne olduğunu söyle, iki çıkış yolu ver.
function evalFailedCardHtml(q, student, ans, ev, rub) {
  return '<div class="eval-card eval-failed" data-qid="' + q.id + '" data-sid="' + student.id + '">' +
    '<div class="q-meta">' + studentChip(student) +
    '<span class="pill pill-critical">Değerlendirme yapılamadı</span>' +
    '<span class="pill pill-neutral">' + q.outcome + '</span></div>' +
    '<div style="font-weight:600;font-size:14px;">' + escapeHtml(q.body) + '</div>' +
    '<div class="eval-block" style="margin-top:12px;"><h4>Öğrenci Yanıtı</h4>' +
    '<div class="answer-box">' + escapeHtml(ans.text || "(boş bırakıldı)") + '</div></div>' +
    '<div class="fail-note">Yapay zekâ ön değerlendirmesi tamamlanamadı. ' +
    'Öğrencinin yanıtı güvenle kaydedildi; kaybolmadı.<br><span class="mono-err">' +
    escapeHtml(ev.error || "bilinmeyen hata") + '</span></div>' +
    '<div class="field-row" style="margin-top:12px;align-items:flex-end;">' +
    '<div class="field" style="max-width:160px;"><label>Puanı elle girin</label>' +
    '<input type="number" class="final-score" data-qid="' + q.id + '" data-sid="' + student.id + '" min="0" max="' + rub.maxScore + '" step="0.5" value="0"></div>' +
    '<div class="field" style="flex:2;"><label>Not (opsiyonel)</label>' +
    '<input type="text" class="teacher-comment" data-qid="' + q.id + '" data-sid="' + student.id + '" placeholder="öğrenciye görünecek kısa not"></div></div>' +
    '<div class="actions">' +
    '<button class="btn btn-primary retry-eval" data-qid="' + q.id + '" data-sid="' + student.id + '">Yapay Zekâ ile Yeniden Dene</button>' +
    '<button class="btn btn-secondary revise-approve" data-qid="' + q.id + '" data-sid="' + student.id + '">Elle Puanla ve Onayla</button></div></div>';
}

function doneCardHtml(q, student, ev, rv) {
  const rub = state.rubrics[q.id];
  return '<div class="eval-card" style="opacity:0.75;">' +
    '<div class="q-meta">' + studentChip(student) +
    '<span class="pill pill-success">Onaylandı</span><span class="pill pill-neutral">' + q.outcome + '</span></div>' +
    '<div style="font-size:13px;">' + escapeHtml(q.body) + '</div>' +
    '<div style="margin-top:8px;font-size:13px;">' +
    'AI önerisi: <b class="tabular">' + (rv.aiScore != null ? rv.aiScore : "—") + '</b>' +
    ' <span style="color:var(--text-muted);">&rarr;</span> ' +
    'Öğretmen onayı: <b class="tabular">' + rv.finalScore + ' / ' + rub.maxScore + '</b> ' +
    (rv.decision === "revised"
      ? '<span class="pill pill-accent2">öğretmen revize etti</span>'
      : '<span class="pill pill-accent">AI önerisiyle aynı</span>') +
    (rv.comment ? '<div style="margin-top:6px;color:var(--text-muted);">Not: ' + escapeHtml(rv.comment) + '</div>' : "") +
    '</div></div>';
}

function confBadge(c) {
  if (c == null) return "";
  const pct = Math.round(c * 100);
  const cls = c < 0.5 ? "pill-critical" : (c < 0.75 ? "pill-warning" : "pill-success");
  const not = c < 0.5
    ? "Model bu yanıtta zorlandı. Puanı dikkatle gözden geçirin."
    : (c < 0.75
      ? "Model kısmen emin. Gerekçeleri okuyup teyit etmeniz önerilir."
      : "Model yüksek güvenle değerlendirdi. Yine de son söz sizde.");
  return '<div class="conf-row"><span class="pill ' + cls + '">AI güveni %' + pct + '</span>' +
    '<span class="conf-note">' + not + '</span></div>';
}

/* Ogrenci yaniti, degerlendiren modele talimat vermeye calistiysa ogretmene
   gosterilen uyari. Bilinçli olarak SUÇLAYICI DEGIL: yapay zeka talimati
   uygulamadi, puan rubrige gore verildi; karar ogretmende. Sinav butunlugu
   kaydiyla ayni dil kullanildi ("tek basina kopya kanidi degildir").
   Ogrenci karnesinde GOSTERILMEZ — bu ogretmenin degerlendirmesine ait bir
   sinyaldir, ogrenciye yonelik bir suclama degildir. */
function injectionWarnHtml(ev) {
  if (!ev || !ev.injectionAttempt) return "";
  return '<div class="inj-warn"><b>⚠ Bu yanıt, değerlendiren yapay zekâya talimat ' +
    'vermeye çalışan bir ifade içeriyor.</b> Yapay zekâ bu ifadeyi uygulamadı; puanı ' +
    'yalnızca sizin tanımladığınız rubriğe göre verdi. Yanıtı kendiniz okuyup karar ' +
    'vermeniz önerilir. Bu tek başına kopya kanıtı değildir.</div>';
}

function teacherTab3Html() {
  if (state.exam.status !== "published") return '<div class="empty-state">Sınav henüz yayınlanmadı.</div>';
  if (state.examStatus === "not_started" || state.examStatus === "in_progress")
    return '<div class="empty-state">Öğrenci sınavı henüz bitirmedi. Değerlendirme kuyruğu, "Sınavı Bitir" dendiğinde dolacak.</div>';

  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  const mcs = items.filter(function (q) { return q.type === "mc"; });
  const opens = items.filter(function (q) { return q.type === "open"; });
  const gonderenler = submittedStudents();

  // Tüm sınıfın açık uçlu yanıtları tek kuyrukta: öğretmen öğrenci öğrenci
  // gezinmek zorunda kalmasın.
  const tumDegerlendirmeler = [];
  gonderenler.forEach(function (s) {
    const ss = readSession(s.id);
    opens.forEach(function (q) {
      tumDegerlendirmeler.push({
        student: s, q: q,
        ev: (ss.aiEvals || {})[q.id],
        review: (ss.reviews || {})[q.id]
      });
    });
  });
  const pending = tumDegerlendirmeler.filter(function (x) { return !x.review; });
  const done = tumDegerlendirmeler.filter(function (x) { return x.review; });
  const basarisiz = pending.filter(function (x) { return (x.ev || {}).failed; }).length;

  // Çoktan seçmeli: sınıf geneli doğru sayısı.
  let mcDogru = 0, mcToplam = 0;
  gonderenler.forEach(function (s) {
    const ss = readSession(s.id);
    mcs.forEach(function (q) {
      mcToplam++;
      if ((ss.mcResults || {})[q.id] && ss.mcResults[q.id].correct) mcDogru++;
    });
  });
  const mcCorrect = mcDogru;
  const yayinlandi = gonderenler.length > 0 && gonderenler.every(function (s) { return readSession(s.id).examStatus === "graded"; });

  // AI'ın en az emin olduğu yanıt en üste: öğretmen zamanını doğru yere harcasın.
  // Çok öğrencili sınıfta asıl değeri burada ortaya çıkıyor.
  pending.sort(function (a, b) {
    const ca = (a.ev || {}).confidence, cb = (b.ev || {}).confidence;
    return (ca == null ? 1 : ca) - (cb == null ? 1 : cb);
  });

  const ozet =
    '<div class="card" style="margin-bottom:16px;"><div class="card-head">' +
    '<h3>' + escapeHtml(state.exam.title || "Adsız Sınav") + '</h3>' +
    (yayinlandi ? '<span class="pill pill-success">Sonuçlar yayınlandı</span>'
                : '<span class="pill pill-accent2">Öğretmen onayı bekliyor</span>') + '</div>' +
    '<div class="grid-3col">' +
    '<div class="stat-tile"><div class="s-label">Çoktan Seçmeli</div><div class="s-value tabular">' + mcCorrect + '/' + mcToplam + '</div><div class="s-sub">' + gonderenler.length + ' öğrenci · otomatik puanlandı</div></div>' +
    '<div class="stat-tile' + (basarisiz ? ' tile-alert' : '') + '"><div class="s-label">Açık Uçlu — Onay Bekleyen</div><div class="s-value tabular">' + pending.length + '</div><div class="s-sub">' +
    (basarisiz ? basarisiz + ' değerlendirme yapılamadı — yeniden deneyin'
      : (pending.length ? "AI puan önerdi, karar sizde" : "tümü incelendi")) + '</div></div>' +
    '<div class="stat-tile"><div class="s-label">Öğrenciye Ulaştı mı?</div><div class="s-value" style="font-size:20px;">' + (yayinlandi ? "Evet" : "Hayır") + '</div><div class="s-sub">' + (yayinlandi ? gonderenler.length + " öğrenci karnesini görebiliyor" : "siz yayınlayana kadar gizli") + '</div></div>' +
    '</div></div>';

  const mcListesi = mcs.length
    ? '<div class="card" style="margin-bottom:16px;"><div class="card-head"><h3>Çoktan Seçmeli Sonuçlar</h3><span class="hint">anahtar karşılaştırmasıyla otomatik — yapay zekâ kararı değildir</span></div>' +
      mcs.map(function (q) {
        const dogruSayisi = gonderenler.filter(function (s) {
          const r = (readSession(s.id).mcResults || {})[q.id];
          return r && r.correct;
        }).length;
        const oran = gonderenler.length ? Math.round(dogruSayisi / gonderenler.length * 100) : 0;
        return '<div class="pool-item"><div class="p-body">' + escapeHtml(q.body) +
          '<div class="p-tags"><span class="pill ' + (oran >= 60 ? "pill-success" : oran >= 40 ? "pill-warning" : "pill-critical") + '">%' + oran + ' doğru</span>' +
          '<span class="pill pill-neutral">' + dogruSayisi + '/' + gonderenler.length + ' öğrenci</span>' +
          '<span class="pill pill-neutral">Doğru şık: ' + q.correctKey + '</span>' +
          '<span class="pill pill-neutral">' + q.outcome + '</span></div></div></div>';
      }).join("") + '</div>'
    : "";

  const yayinKutusu = (!yayinlandi && pending.length === 0)
    ? '<div class="card" style="margin-top:18px;">' +
      '<div class="card-head"><h3>Sonuçları Yayınla</h3><span class="hint">son adım</span></div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">' +
      'Onay bekleyen açık uçlu yanıt kalmadı. Sonuçlar, siz yayınlayana kadar öğrenciye görünmez.</div>' +
      '<button class="btn btn-success" id="btnPublishResults">✓ Sonuçları Öğrenciye Yayınla</button></div>'
    : "";

  const acikUclu = opens.length
    ? '<div class="card-head" style="margin-bottom:10px;"><h3>Açık Uçlu — Onay Bekleyen (' + pending.length + ')</h3><span class="hint">AI\'in en az emin oldugu yanit en ustte</span></div>' +
      (pending.length ? pending.map(function (x) { return evalCardHtml(x.q, x.student, x.ev); }).join("") : '<div class="empty-state">Bekleyen değerlendirme yok.</div>') +
      (done.length ? '<div class="card-head" style="margin:22px 0 10px;"><h3>Onaylanmış (' + done.length + ')</h3></div>' +
        done.map(function (x) { return doneCardHtml(x.q, x.student, x.ev, x.review); }).join("") : "")
    : '<div class="empty-state">Bu sınavda açık uçlu soru yok; tüm sorular otomatik puanlandı.</div>';

  const simKutusu = '<div class="card" style="margin-bottom:16px;"><div class="card-head">' +
    '<h3>Sınıf Verisi</h3><span class="hint">' + gonderenler.length + ' öğrenci sınavı gönderdi</span></div>' +
    '<div style="font-size:12.5px;color:var(--text-muted);line-height:1.6;margin-bottom:10px;">' +
    'Tek öğrenciyle sınıf ortalaması hesaplanamaz. Buradan simüle edilmiş bir sınıf ' +
    'oluşturabilirsiniz: yanıtlar farklı başarı düzeylerinde üretilir, ancak ' +
    '<b>değerlendirme gerçek modelle ve sizin tanımladığınız rubrikle</b> yapılır. ' +
    'Simüle öğrenciler listede açıkça işaretlenir.</div>' +
    '<button class="btn btn-secondary btn-sm" id="btnSimClass"' + (state.simRunning ? " disabled" : "") + '>' +
    (state.simRunning ? "Sınıf hazırlanıyor…" : "5 öğrencilik sınıf simüle et") + '</button>' +
    '<div class="cache-row">Değerlendirme önbelleği: <b>' + evalCacheCount() + '</b> kayıt' +
    (evalCacheCount() ? ' <button class="btn btn-secondary btn-sm" id="btnClearCache">Temizle</button>' : "") +
    '<span class="lbl-hint">Aynı yanıt + aynı rubrik yeniden değerlendirilmez; ücretsiz model kotasını korur.</span></div>' +
    '<div id="simProgress" class="sim-progress">' +
    (state.simStatus ? '<div class="sim-bar"><div class="sim-fill" style="width:' + Math.round(state.simStatus.oran * 100) + '%;"></div></div><div class="sim-text">' + escapeHtml(state.simStatus.metin) + '</div>' : "") +
    '</div></div>';

  return ozet + simKutusu + integritySummaryHtml() + mcListesi + acikUclu + yayinKutusu;
}

function wireTeacherTab3() {
  const simBtn = document.getElementById("btnSimClass");
  if (simBtn) simBtn.onclick = function () { simulateClass(5); };
  const ccBtn = document.getElementById("btnClearCache");
  if (ccBtn) ccBtn.onclick = evalCacheClear;
  document.querySelectorAll(".retry-eval").forEach(function (b) {
    b.onclick = function () { retryEvaluation(Number(b.dataset.qid), Number(b.dataset.sid)); };
  });
  const pubBtn = document.getElementById("btnPublishResults");
  if (pubBtn) pubBtn.onclick = publishResults;
  document.querySelectorAll(".approve-as-is").forEach(function (b) {
    b.onclick = function () {
      const qid = Number(b.dataset.qid), sid = Number(b.dataset.sid);
      const ev = (readSession(sid).aiEvals || {})[qid] || {};
      finalizeReview(qid, ev.aiScore, "", "approved_as_is", sid);
    };
  });
  document.querySelectorAll(".revise-approve").forEach(function (b) {
    b.onclick = function () {
      const qid = Number(b.dataset.qid), sid = Number(b.dataset.sid);
      const sel = '[data-qid="' + qid + '"][data-sid="' + sid + '"]';
      const scoreEl = document.querySelector('.final-score' + sel);
      const commentEl = document.querySelector('.teacher-comment' + sel);
      finalizeReview(qid, Number(scoreEl.value), commentEl.value, "revised", sid);
    };
  });
}
function finalizeReview(qid, score, comment, decision, sid) {
  const ogrId = sid != null ? sid : state.activeStudentId;
  const rub = state.rubrics[qid];
  const ss = readSession(ogrId);
  const ev = (ss.aiEvals || {})[qid] || {};
  const yeniReviews = Object.assign({}, ss.reviews || {});
  yeniReviews[qid] = {
    finalScore: Math.max(0, Math.min(rub.maxScore, score)),
    comment: comment,
    decision: decision,
    aiScore: ev.aiScore != null ? ev.aiScore : null
  };
  writeSession(ogrId, { reviews: yeniReviews });
  renderAll();
}
// Açık uçlu soruların tamamı incelendi mi? (Yalnızca ÇSS'den oluşan sınavda
// hiç açık uçlu soru olmadığı için bu koşul doğrudan sağlanır.)
// Sınavı gönderen HER öğrencinin HER açık uçlu yanıtı incelendi mi?
function allOpensReviewed() {
  const opens = state.exam.questionIds
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(function (q) { return q && q.type === "open"; });
  if (!opens.length) return true;
  const gonderenler = submittedStudents();
  if (!gonderenler.length) return false;
  return gonderenler.every(function (s) {
    const ss = readSession(s.id);
    return opens.every(function (q) { return ss.reviews && ss.reviews[q.id]; });
  });
}

// Sonuçlar öğrenciye ancak öğretmen yayınlayınca ulaşır.
// ÖNCEKİ HATA: notlandırma yalnızca bir açık uçlu soru onaylandığında
// tamamlanıyordu; sınavda hiç açık uçlu soru yoksa hiç tetiklenmiyor ve
// sınav sonsuza dek "submitted" kalıyordu (öğrenci karnesi hiç oluşmuyordu).
// Sonuçlar sınıfın tamamına birlikte yayınlanır.
function publishResults() {
  if (!allOpensReviewed()) return;
  submittedStudents().forEach(function (s) {
    const ss = readSession(s.id);
    if (ss.examStatus === "submitted") writeSession(s.id, { examStatus: "graded" });
  });
  renderAll();
}

function computeDemoClassScores() {
  const kayit = (state.exams || []).find(function (x) { return x.id === state.activeExamId; });
  return kayit ? examOutcomeScores(kayit).scores : {};
}
/* ==================== Gelişim Trendi ====================
   MODEL PROMT dokümanındaki "öğrencilerin ... önceki sınavlara göre
   değişimini görebilecek" vaadinin karşılığı. Tek sınavla hesaplanamazdı;
   çoklu sınav desteği geldikten sonra mümkün oldu.

   Kazanım yüzdeleri, sonuçlanmış sınavların GERÇEK verisinden hesaplanır
   (çoktan seçmeli doğruluğu + öğretmenin ONAYLADIĞI açık uçlu puanlar).  */
// Belirli bir şubenin kazanım yüzdeleri — gerçek oturumlardan.
function classOutcomeScores(sinif) {
  const ex = state.exam;
  const toplam = {}, adet = {};
  (state.students || []).filter(function (o) { return o.sinif === sinif; }).forEach(function (ogr) {
    const ss = readSession(ogr.id);
    if (!ss || (ss.examStatus !== "graded" && ss.examStatus !== "submitted")) return;
    (ex.questionIds || []).forEach(function (qid) {
      const q = state.questions.find(function (x) { return x.id === qid; });
      if (!q) return;
      let pct = null;
      if (q.type === "mc" && (ss.mcResults || {})[qid]) pct = ss.mcResults[qid].correct ? 100 : 0;
      if (q.type === "open" && (ss.reviews || {})[qid]) {
        const rub = state.rubrics[qid];
        if (rub) pct = ss.reviews[qid].finalScore / rub.maxScore * 100;
      }
      if (pct == null) return;
      toplam[q.outcome] = (toplam[q.outcome] || 0) + pct;
      adet[q.outcome] = (adet[q.outcome] || 0) + 1;
    });
  });
  const sonuc = {};
  Object.keys(toplam).forEach(function (k) { sonuc[k] = Math.round(toplam[k] / adet[k]); });
  return sonuc;
}

// Isı haritası satırları: her şube bir satır, hepsi GERÇEK veriden.
function realClassRows() {
  return siniflar().map(function (sf) {
    const ogrenciler = (state.students || []).filter(function (o) { return o.sinif === sf; });
    const cozen = ogrenciler.filter(function (o) {
      const st = readSession(o.id).examStatus;
      return st === "submitted" || st === "graded";
    }).length;
    return { name: sf + " (" + cozen + "/" + ogrenciler.length + ")", scores: classOutcomeScores(sf), live: cozen > 0 };
  });
}

// Bir sınavın kazanım yüzdeleri: SINIFIN TAMAMI üzerinden ortalama.
// Önceden yalnızca aktif öğrencinin sonucuna bakıyordu; tek öğrenciyle
// "sınıfın öğrenme durumu" hesaplanamıyordu.
function examOutcomeScores(kayit) {
  const aktif = kayit.id === state.activeExamId;
  const ex = aktif ? state.exam : kayit;
  const toplam = {}, adet = {};

  (state.students || []).forEach(function (ogr) {
    const ss = (aktif)
      ? readSession(ogr.id)
      : ((kayit.sessions || {})[ogr.id] || null);
    if (!ss || (ss.examStatus !== "graded" && ss.examStatus !== "submitted")) return;
    (ex.questionIds || []).forEach(function (qid) {
      const q = state.questions.find(function (x) { return x.id === qid; });
      if (!q) return;
      let pct = null;
      if (q.type === "mc" && (ss.mcResults || {})[qid]) pct = ss.mcResults[qid].correct ? 100 : 0;
      if (q.type === "open" && (ss.reviews || {})[qid]) {
        const rub = state.rubrics[qid];
        if (rub) pct = ss.reviews[qid].finalScore / rub.maxScore * 100;
      }
      if (pct == null) return;
      toplam[q.outcome] = (toplam[q.outcome] || 0) + pct;
      adet[q.outcome] = (adet[q.outcome] || 0) + 1;
    });
  });

  const sonuc = {};
  Object.keys(toplam).forEach(function (k) { sonuc[k] = Math.round(toplam[k] / adet[k]); });
  return { baslik: ex.title || "Adsız Sınav", scores: sonuc };
}

function gradedExamHistory() {
  return (state.exams || []).filter(function (x) {
    // Sınıftan en az bir öğrencinin sonucu yayınlandıysa sınav geçmişe girer.
    const ss = x.id === state.activeExamId
      ? (state.students || []).map(function (o) { return readSession(o.id); })
      : Object.keys(x.sessions || {}).map(function (k) { return x.sessions[k]; });
    return ss.some(function (s) { return s && s.examStatus === "graded"; });
  }).map(examOutcomeScores);
}

function trendOku(fark) {
  if (fark == null) return '<span class="trend-none">—</span>';
  if (fark > 2) return '<span class="trend-up">▲ +' + fark + '</span>';
  if (fark < -2) return '<span class="trend-down">▼ ' + fark + '</span>';
  return '<span class="trend-flat">● ' + (fark > 0 ? "+" : "") + fark + '</span>';
}

function trendHtml() {
  const gecmis = gradedExamHistory();
  if (gecmis.length < 2) {
    return '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>Sınavlar Arası Gelişim</h3>' +
      '<span class="hint">' + gecmis.length + ' sonuçlanmış sınav</span></div>' +
      '<div class="empty-state">Gelişim karşılaştırması için en az iki sonuçlanmış sınav gerekir. ' +
      'Şu anda ' + gecmis.length + ' sınav sonuçlandı.</div></div>';
  }
  const kodlar = {};
  gecmis.forEach(function (g) { Object.keys(g.scores).forEach(function (k) { kodlar[k] = true; }); });
  const liste = Object.keys(kodlar);
  const son = gecmis[gecmis.length - 1], onceki = gecmis[gecmis.length - 2];
  return '<div class="card" style="margin-top:16px;"><div class="card-head"><h3>Sınavlar Arası Gelişim</h3>' +
    '<span class="hint">' + gecmis.length + ' sonuçlanmış sınav</span></div>' +
    '<div style="font-size:12.5px;color:var(--text-muted);line-height:1.6;margin-bottom:12px;">' +
    'Kazanım yüzdeleri, öğretmen onayından geçmiş gerçek sonuçlardan hesaplanır. ' +
    'Son sütun, <b>' + escapeHtml(son.baslik) + '</b> ile <b>' + escapeHtml(onceki.baslik) + '</b> arasındaki farktır.</div>' +
    '<div class="heatmap-wrap"><table class="heatmap trend-table"><tr><th>Kazanım</th>' +
    gecmis.map(function (g) { return '<th>' + escapeHtml(truncate(g.baslik, 18)) + '</th>'; }).join("") +
    '<th>Değişim</th></tr>' +
    liste.map(function (k) {
      const a = onceki.scores[k], b = son.scores[k];
      const fark = (a != null && b != null) ? b - a : null;
      return '<tr><th class="outcome-col">' + escapeHtml(k) + '</th>' +
        gecmis.map(function (g) {
          const v = g.scores[k];
          return '<td>' + (v == null ? '<span class="trend-none">—</span>' : '<b class="tabular">%' + v + '</b>') + '</td>';
        }).join("") +
        '<td>' + trendOku(fark) + '</td></tr>';
    }).join("") + '</table></div></div>';
}

function teacherHeatmapRows() {
  return realClassRows().concat(state.baseline.classes.slice(0, 2).map(function (c) {
    return { name: c.name + " (örnek)", scores: c.scores };
  }));
}
function teacherTab4Html() {
  if (state.exam.status !== "published" || state.examStatus === "not_started") return '<div class="empty-state">Sınıf analitikleri, sınav yayınlanıp öğrenciler tamamladıkça burada oluşacak.</div>';
  const scores = computeDemoClassScores();
  const vals = Object.keys(scores).map(function (k) { return scores[k]; });
  const avg = vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : 0;
  return '<div class="grid-3col" style="margin-bottom:18px;">' +
    '<div class="stat-tile"><div class="s-label">Sınıf Ortalaması</div><div class="s-value tabular">%' + avg + '</div><div class="s-sub">tüm kazanımlar</div></div>' +
    '<div class="stat-tile"><div class="s-label">Sınav Durumu</div><div class="s-value" style="font-size:16px;">' + examStatusLabel() + '</div></div>' +
    '<div class="stat-tile"><div class="s-label">Öğrenci</div><div class="s-value tabular">1/1</div><div class="s-sub">tamamlandı</div></div></div>' +
    '<div class="card"><div class="card-head"><h3>Kazanım Isı Haritası — 8-A</h3><span class="hint">diğer sınıflarla karşılaştırma</span></div><div id="teacherHeatmap"></div></div>' +
    trendHtml();
}

function renderTeacher() {
  const root = document.getElementById("panel-teacher");
  const tabs = [{ id: 1, label: "1 · Sınav Oluştur" }, { id: 2, label: "2 · Rubrik" }, { id: 3, label: "3 · Değerlendirme Onayı" }, { id: 4, label: "4 · Analitik" }];
  root.innerHTML = '<div class="tabs" id="teacherTabs">' +
    tabs.map(function (t) { return '<button class="tab-btn ' + (state.teacherTab === t.id ? "active" : "") + '" data-tab="' + t.id + '">' + t.label + '</button>'; }).join("") +
    '</div><div id="teacherTabContent"></div>';
  document.querySelectorAll("#teacherTabs .tab-btn").forEach(function (b) { b.onclick = function () { state.teacherTab = Number(b.dataset.tab); renderAll(); }; });
  const content = document.getElementById("teacherTabContent");
  if (state.teacherTab === 1) { content.innerHTML = teacherTab1Html(); wireTeacherTab1(); }
  if (state.teacherTab === 2) { content.innerHTML = teacherTab2Html(); wireTeacherTab2(); }
  if (state.teacherTab === 3) { content.innerHTML = teacherTab3Html(); wireTeacherTab3(); }
  if (state.teacherTab === 4) { content.innerHTML = teacherTab4Html(); if (state.exam.status === "published" && state.examStatus !== "not_started") renderHeatmap("teacherHeatmap", teacherHeatmapRows()); }
}

/* ============================== Öğrenci ============================== */
let autosaveTimer = null;
let _saveTimer = null;
function saveSoon() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(function () { syncActiveExam(); saveState(); _saveTimer = null; }, 400);
}

function flashAutosave() { const m = document.getElementById("autosaveMsg"); if (m) m.innerHTML = '<span class="dot-save"></span> Kaydedildi ✓'; }

function startExam() {
  state.examStatus = "in_progress";
  state.currentQIndex = 0;
  state.remainingSec = state.exam.durationMin * 60;
  state.exam.endsAt = Date.now() + state.exam.durationMin * 60000;
  state.studentTab = 2;
  integrityReset();
  state.integrity.active = true;
  // Tam ekran isteği kullanıcı hareketi (buton tıklaması) içinde yapılmalıdır.
  requestExamFullscreen().then(renderAll);
  renderAll();
}
async function finishExam() {
  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  // Çoktan seçmeli anında puanlanır; açık uçlu yanıtlar model önerisi bekler.
  items.forEach(function (q) {
    if (q.type === "mc") {
      const a = state.answers[q.id];
      state.mcResults[q.id] = { correct: !!a && a.selectedKey === q.correctKey };
    }
  });
  state.integrity.active = false;
  exitExamFullscreen();
  state.examStatus = "submitted";
  state.studentTab = 1;
  state.ai.busy = true;
  busySince = Date.now();
  renderAll();
  try {
    const opens = items.filter(function (q) { return q.type !== "mc"; });
    for (let i = 0; i < opens.length; i++) {
      const q = opens[i];
      const a = state.answers[q.id] || { text: "" };
      ensureRubric(q.id);
      state.aiEvals[q.id] = await aiEvaluate(q, a.text || "", state.rubrics[q.id]);
    }
  } finally {
    state.ai.busy = false;
    renderAll();
  }
}

// "3 gün 4 saat" gibi okunur kalan süre — saniye saymak anlamsız.
function kalanMetni(ts) {
  const sn = Math.max(0, Math.round((ts - Date.now()) / 1000));
  if (sn < 60) return sn + " saniye içinde açılacak";
  const dk = Math.floor(sn / 60);
  if (dk < 60) return dk + " dakika içinde açılacak";
  const sa = Math.floor(dk / 60);
  if (sa < 24) return sa + " saat " + (dk % 60) + " dakika içinde açılacak";
  const gun = Math.floor(sa / 24);
  return gun + " gün " + (sa % 24) + " saat içinde açılacak";
}

function examCardState(x) {
  const aktif = x.id === state.activeExamId;
  const ex = aktif ? state.exam : x;
  const durum = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
  const bekliyor = ex.startsAt ? Date.now() < ex.startsAt : false;
  return { aktif: aktif, ex: ex, durum: durum, bekliyor: bekliyor };
}

// Her sınav kartında TEK eylem: durumu ne olursa olsun öğrencinin yapması
// gereken bir tek şey vardır.
function examActionBtn(x) {
  const c = examCardState(x);
  const d = 'data-exam="' + x.id + '"';
  if (c.durum === "graded") return '<button class="btn btn-primary exam-act" ' + d + ' data-act="rapor">Karnemi Gör</button>';
  if (c.durum === "submitted") return '<button class="btn btn-secondary" disabled>Öğretmen onayı bekleniyor</button>';
  if (c.durum === "in_progress") return '<button class="btn btn-primary exam-act" ' + d + ' data-act="devam">Kaldığın Yerden Devam Et</button>';
  if (c.bekliyor) return '<button class="btn btn-secondary" disabled>Henüz açılmadı</button>';
  return '<button class="btn btn-primary exam-act" ' + d + ' data-act="basla">Sınava Başla</button>';
}

function studentTab1Html() {
  const yayindakiler = state.exams.filter(function (x) {
    return (x.id === state.activeExamId ? state.exam.status : x.status) === "published";
  });
  if (!yayindakiler.length) {
    return '<div class="card"><div class="empty-state">Şu anda size atanmış aktif ya da yaklaşan bir sınav yok.</div></div>';
  }
  return yayindakiler.map(function (x) {
    const c = examCardState(x);
    const items = c.ex.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
    const acikUclu = items.filter(function (q) { return q.type === "open"; }).length;
    const rozet = c.durum === "graded" ? '<span class="pill pill-success">Sonuçlandı</span>'
      : c.durum === "submitted" ? '<span class="pill pill-accent2">Değerlendiriliyor</span>'
      : c.durum === "in_progress" ? '<span class="pill pill-accent">Yarım kaldı</span>'
      : c.bekliyor ? '<span class="pill pill-warning">Yaklaşıyor</span>'
      : '<span class="pill pill-success">Çözülebilir</span>';
    // Yarım kalan sınavda ne kadar ilerlediğini göster.
    const yanitlanan = items.filter(function (q) {
      const a = (c.aktif ? state.answers : ((x.sessions || {})[state.activeStudentId] || {}).answers || {})[q.id];
      return a && (a.selectedKey || (a.text && a.text.trim()));
    }).length;
    const kalanSn = c.ex.endsAt ? Math.max(0, Math.round((c.ex.endsAt - Date.now()) / 1000)) : null;
    return '<div class="card exam-card' + (c.durum === "in_progress" ? " resume" : "") + '">' +
      '<div class="card-head"><h3>' + escapeHtml(c.ex.title || "Adsız Sınav") + '</h3>' + rozet + '</div>' +
      '<div class="ec-meta">' + items.length + ' soru' + (acikUclu ? ' · ' + acikUclu + ' açık uçlu' : "") +
      ' · ' + c.ex.durationMin + ' dakika' +
      (c.durum === "in_progress" || c.durum === "submitted" || c.durum === "graded"
        ? ' · <b>' + yanitlanan + '/' + items.length + '</b> soru yanıtlandı' : "") + '</div>' +
      (c.durum === "in_progress"
        ? '<div class="resume-note">Bu sınavı yarım bıraktınız. Yanıtlarınız kaydedildi; devam ettiğinizde ' +
          'kaldığınız sorudan başlayacaksınız.' + (kalanSn != null ? ' Kalan süre <b>' + formatTime(kalanSn) + '</b>.' : "") + '</div>'
        : "") +
      (c.bekliyor
        ? '<div class="wait-box"><b>Açılış: ' +
          new Date(c.ex.startsAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) + '</b>' +
          '<div id="waitPill" class="lbl-hint" style="margin-left:0;">' + kalanMetni(c.ex.startsAt) + '</div></div>'
        : "") +
      '<div style="margin-top:14px;">' + examActionBtn(x) + '</div></div>';
  }).join("");
}

function wireStudentTab1() {
  document.querySelectorAll(".exam-act").forEach(function (b) {
    b.onclick = function () {
      const id = Number(b.dataset.exam);
      const act = b.dataset.act;
      // Öğrenci "aktif sınav" diye bir kavram bilmez: gerekiyorsa arkada geçilir.
      if (id !== state.activeExamId) activateExam(id);
      if (act === "rapor") { state.studentTab = 3; renderAll(); return; }
      if (act === "devam") { state.studentTab = 2; renderAll(); return; }
      startExam();
    };
  });
}

function mcAnswerHtml(q) {
  const a = state.answers[q.id] || {};
  return q.options.map(function (o) {
    const sec = a.selectedKey === o.key;
    return '<label class="answer-opt' + (sec ? " selected" : "") + '"><input type="radio" name="ans-' + q.id + '" value="' + o.key + '" ' + (sec ? "checked" : "") + ' class="mc-answer" data-qid="' + q.id + '">' +
      '<span class="opt-key">' + o.key + '</span><span class="opt-text">' + escapeHtml(o.text) + '</span></label>';
  }).join("") + '<div class="autosave-status" id="autosaveMsg"><span class="dot-save"></span> ' + (a.selectedKey ? "Kaydedildi" : "Henüz yanıt verilmedi") + '</div>';
}
function openAnswerHtml(q) {
  const a = state.answers[q.id] || {};
  return '<textarea id="openAnswerInput" data-qid="' + q.id + '" rows="7" placeholder="Yanıtınızı buraya yazın...">' + escapeHtml(a.text || "") + '</textarea>' +
    '<div class="autosave-status" id="autosaveMsg"><span class="dot-save"></span> ' + (a.text ? "Kaydedildi" : "Henüz yanıt verilmedi") + '</div>';
}

function studentTab2Html() {
  // Aktif sınav yoksa bu sekme boş bırakılmaz: çözülebilecek sınav varsa
  // doğrudan buradan başlatılır.
  if (state.examStatus === "not_started" || state.examStatus === "submitted" || state.examStatus === "graded") {
    const hazir = (state.exams || []).filter(function (x) {
      const aktif = x.id === state.activeExamId;
      const ex = aktif ? state.exam : x;
      const durum = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
      const bekliyor = ex.startsAt ? Date.now() < ex.startsAt : false;
      return ex.status === "published" && (durum === "not_started" || durum === "in_progress") && !bekliyor;
    });
    if (!hazir.length) {
      return '<div class="card"><div class="empty-state">' +
        (state.examStatus === "submitted" ? "Yanıtlarınız gönderildi, öğretmen onayı bekleniyor."
          : state.examStatus === "graded" ? "Bu sınav sonuçlandı. Karnenizi 3. sekmeden görebilirsiniz."
          : "Şu anda çözebileceğiniz bir sınav yok.") + '</div></div>';
    }
    return '<div class="card"><div class="card-head"><h3>Çözülmeyi bekleyen sınav</h3>' +
      '<span class="pill pill-success">' + hazir.length + ' sınav</span></div>' +
      '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">' +
      'Başlamak için aşağıdaki sınavı seçin. Tüm sınavlarınızı 2. sekmeden görebilirsiniz.</div>' +
      hazir.map(function (x) {
        const c = examCardState(x);
        const items = c.ex.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
        return '<div class="pool-item"><div class="p-body"><b>' + escapeHtml(c.ex.title || "Adsız Sınav") + '</b>' +
          '<div class="p-tags"><span class="pill pill-neutral">' + items.length + ' soru</span>' +
          '<span class="pill pill-neutral">' + c.ex.durationMin + ' dk</span></div></div>' +
          examActionBtn(x) + '</div>';
      }).join("") + '</div>';
  }
  if (state.examStatus === "submitted") return '<div class="card"><div class="empty-state">Yanıtlarınız gönderildi. Öğretmen onayını bekliyor — karne, onaylandığında 3. Sekme\'de görünecek.</div></div>';
  if (state.examStatus === "graded") return '<div class="card"><div class="empty-state">Bu sınav sonuçlandı. Karneyi 3. Sekme\'den görebilirsiniz.</div></div>';

  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  const q = items[state.currentQIndex];
  const answered = function (id) { const a = state.answers[id]; return !!a && (a.selectedKey || (a.text && a.text.trim().length > 0)); };
  return integrityNoticeHtml() +
    '<div class="timer-bar"><div>Kalan süre</div><div class="t-value tabular ' + (state.remainingSec < 60 ? "low" : "") + '" id="timerValue">' + formatTime(state.remainingSec) + '</div>' +
    '<div class="qnav">' + items.map(function (it, i) { return '<div class="qnav-dot ' + (i === state.currentQIndex ? "current" : "") + " " + (answered(it.id) ? "answered" : "") + '" data-idx="' + i + '">' + (i + 1) + '</div>'; }).join("") + '</div></div>' +
    '<div class="card exam-viewport"><div class="qv-meta"><span class="pill pill-accent">' + (q.type === "mc" ? "Çoktan Seçmeli" : "Açık Uçlu") + '</span><span class="pill pill-neutral">Soru ' + (state.currentQIndex + 1) + '/' + items.length + '</span></div>' +
    '<div class="qv-body">' + escapeHtml(q.body) + '</div>' + (q.type === "mc" ? mcAnswerHtml(q) : openAnswerHtml(q)) +
    '<div class="exam-footer"><div><button class="btn btn-secondary" id="btnPrevQ" ' + (state.currentQIndex === 0 ? "disabled" : "") + '>← Önceki</button> ' +
    '<button class="btn btn-secondary" id="btnNextQ" ' + (state.currentQIndex === items.length - 1 ? "disabled" : "") + '>Sonraki →</button></div>' +
    '<button class="btn btn-critical" id="btnFinishExam">Sınavı Bitir</button></div></div>';
}
function wireStudentTab2() {
  // Aktif sınav yokken bu sekme sınav başlatma kartlarını gösterir.
  if (state.examStatus !== "in_progress") { wireStudentTab1(); return; }
  // Yapıştırma tespiti: yalnızca KAÇ KARAKTER yapıştırıldığı tutulur,
  // metnin kendisi kaydedilmez (bkz. privacy-policy.html §2).
  const oa = document.getElementById("openAnswerInput");
  if (oa) oa.addEventListener("paste", function (e) {
    let n = 0;
    try { n = (e.clipboardData || window.clipboardData).getData("text").length; } catch (err) { n = 0; }
    integrityNote("yapistir", { karakter: n });
  });
  const fsBtn = document.getElementById("btnGoFullscreen");
  if (fsBtn) fsBtn.onclick = function () { requestExamFullscreen().then(renderAll); };
  document.querySelectorAll(".mc-answer").forEach(function (el) {
    el.onchange = function () {
      const qid = Number(el.dataset.qid);
      state.answers[qid] = state.answers[qid] || {};
      state.answers[qid].selectedKey = el.value;
      state.answers[qid].savedAt = Date.now();
      saveSoon();
      flashAutosave();
      const dot = document.querySelectorAll(".qnav-dot")[state.currentQIndex];
      if (dot) dot.classList.add("answered");
    };
  });
  const openEl = document.getElementById("openAnswerInput");
  if (openEl) openEl.oninput = function () {
    const qid = Number(openEl.dataset.qid);
    state.answers[qid] = state.answers[qid] || {};
    state.answers[qid].text = openEl.value;
    state.answers[qid].savedAt = Date.now();
    // ÖNEMLİ: bu satır olmadan "Kaydedildi ✓" göstergesi yalnızca görseldi;
    // yanıt state'te duruyor ama diske YAZILMIYORDU. Tarayıcı kapanırsa
    // veya bağlantı koparsa öğrencinin yazdığı her şey kayboluyordu.
    saveSoon();
    const msg = document.getElementById("autosaveMsg");
    if (msg) msg.innerHTML = '<span class="dot-save"></span> Kaydediliyor…';
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(function () {
      const m = document.getElementById("autosaveMsg");
      if (m) m.innerHTML = '<span class="dot-save"></span> Kaydedildi ✓ ' + new Date(state.answers[qid].savedAt).toLocaleTimeString("tr-TR");
      const dot = document.querySelectorAll(".qnav-dot")[state.currentQIndex];
      if (dot && openEl.value.trim()) dot.classList.add("answered");
    }, 500);
  };
  const prev = document.getElementById("btnPrevQ"); if (prev) prev.onclick = function () { state.currentQIndex--; renderAll(); };
  const next = document.getElementById("btnNextQ"); if (next) next.onclick = function () { state.currentQIndex++; renderAll(); };
  document.querySelectorAll(".qnav-dot").forEach(function (d) { d.onclick = function () { state.currentQIndex = Number(d.dataset.idx); renderAll(); }; });
  const finishBtn = document.getElementById("btnFinishExam"); if (finishBtn) finishBtn.onclick = function () { openModal(finishExamModalHtml()); };
}

function studentTab3Html() {
  if (state.examStatus !== "graded") {
    return '<div class="card"><div class="empty-state">' + (state.examStatus === "submitted" ? "Öğretmen henüz onaylamadı. Onaylandığında karneniz burada görünecek." : "Sınavı tamamladığınızda karneniz burada görünecek.") + '</div></div>';
  }
  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  let totalScore = 0, totalMax = 0;
  const rows = items.map(function (q) {
    if (q.type === "mc") {
      const res = state.mcResults[q.id], a = state.answers[q.id] || {};
      totalScore += res.correct ? 1 : 0; totalMax += 1;
      return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) + '</span><span class="' + (res.correct ? "pill pill-success" : "pill pill-critical") + '">' + (res.correct ? "✓ Doğru" : "✕ Yanlış") + '</span></div>' +
        '<div style="font-size:12.5px;color:var(--text-muted);">Yanıtınız: ' + (a.selectedKey || "—") + " · Doğru cevap: " + q.correctKey + '</div></div>';
    } else {
      const rv = state.reviews[q.id], rub = state.rubrics[q.id], ev = state.aiEvals[q.id];
      totalScore += rv.finalScore; totalMax += rub.maxScore;
      const revize = rv.decision === "revised";
      return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) + '</span><span class="rr-score tabular">' + rv.finalScore + " / " + rub.maxScore + '</span></div>' +
        '<div style="margin-top:8px;font-size:11.5px;color:var(--text-muted);">' +
        (revize
          ? (rv.aiScore != null
              ? 'Bu puanı öğretmeniniz yapay zekâ önerisini (' + rv.aiScore + ') değiştirerek belirledi.'
              : 'Bu puanı öğretmeniniz doğrudan belirledi.')
          : 'Bu puan, yapay zekâ önerisi öğretmeniniz tarafından onaylanarak kesinleşti.') + '</div>' +
        ((ev.breakdown || []).length ? '<div style="margin-top:10px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;">Puan kırılımı</div>' : "") +
        (ev.breakdown || []).map(function (b) {
          return '<div class="rr-crit"><span>' + escapeHtml(b.label) + '</span><span class="tabular">' + b.points + ' / ' + b.max + '</span></div>' +
            (b.reason ? '<div class="rc-reason">' + escapeHtml(b.reason) + '</div>' : "");
        }).join("") +
        ((ev.justification || rv.comment)
          ? '<div class="justification" style="margin-top:8px;">' + escapeHtml(ev.justification || "") +
            (rv.comment ? (ev.justification ? "<br>" : "") + "<b>Öğretmen notu:</b> " + escapeHtml(rv.comment) : "") + '</div>'
          : "") + '</div>';
    }
  }).join("");
  return '<div class="card"><div class="card-head"><h3>' + escapeHtml(state.exam.title || "Sınav Karnesi") + '</h3><span class="pill pill-accent">Toplam ' + (Math.round(totalScore * 10) / 10) + "/" + totalMax + '</span></div>' + rows + '</div>';
}

// Öğrenci panelinde "hangi öğrenciyim?" seçici. Gerçek üründe bu kimlik
// doğrulamadan gelir; prototipte roller gibi elle değiştirilir.
function studentPickerHtml() {
  if ((state.students || []).length < 2) return "";
  return '<div class="student-picker"><span class="sp-label">Görüntülenen öğrenci</span>' +
    state.students.map(function (s) {
      return '<button class="sp-btn ' + (s.id === state.activeStudentId ? "active" : "") + '" data-sid="' + s.id + '">' +
        escapeHtml(s.name) + (s.sinif ? ' <span class="sc-class">' + escapeHtml(s.sinif) + '</span>' : "") +
        (s.demo ? ' <span class="sc-tag">simüle</span>' : "") + '</button>';
    }).join("") + '</div>';
}

function renderStudent() {
  const root = document.getElementById("panel-student");
  // Sıra bilinçli: öğrencinin ana işi sınav çözmek. "Sınavı Çöz" sekmesi
  // aktif sınav yokken de ÖLÜ DEĞİLDİR — başlatılabilecek sınavı gösterir.
  const tabs = [
    { id: 2, label: "1 · Sınavı Çöz", pasif: false },
    { id: 1, label: "2 · Sınavlarım", pasif: false },
    { id: 3, label: "3 · Karne", pasif: state.examStatus !== "graded" }
  ];
  root.innerHTML = studentPickerHtml() + '<div class="tabs" id="studentTabs">' +
    tabs.map(function (t) {
      return '<button class="tab-btn ' + (state.studentTab === t.id ? "active" : "") + '" data-tab="' + t.id + '"' +
        (t.pasif ? ' disabled title="Bu sekme şu anda kullanılamıyor"' : "") + '>' + t.label + '</button>';
    }).join("") +
    '</div><div id="studentTabContent"></div>';
  document.querySelectorAll("#studentTabs .tab-btn").forEach(function (b) { b.onclick = function () { state.studentTab = Number(b.dataset.tab); renderAll(); }; });
  document.querySelectorAll(".sp-btn").forEach(function (b) {
    b.onclick = function () { activateStudent(Number(b.dataset.sid)); };
  });
  const content = document.getElementById("studentTabContent");
  if (state.studentTab === 1) { content.innerHTML = studentTab1Html(); wireStudentTab1(); }
  if (state.studentTab === 2) { content.innerHTML = studentTab2Html(); wireStudentTab2(); }
  if (state.studentTab === 3) { content.innerHTML = studentTab3Html(); }
}

/* ============================== Eğitim Yöneticisi & Isı Haritası ============================== */
function relLuminance(r, g, b) {
  const a = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function bestTextColor(el) {
  const bg = getComputedStyle(el).backgroundColor;
  const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return;
  const L = relLuminance(+m[1], +m[2], +m[3]);
  el.style.color = L > 0.42 ? "#10141f" : "#f5f7fb";
}
function scaleStep(pct) { if (pct >= 85) return 5; if (pct >= 70) return 4; if (pct >= 55) return 3; if (pct >= 40) return 2; return 1; }

function renderHeatmap(targetId, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const cols = OUTCOMES_LIST();
  el.innerHTML = '<div class="heatmap-wrap"><table class="heatmap"><tr><th></th>' +
    cols.map(function (c) { return "<th>" + c.code + "</th>"; }).join("") + "</tr>" +
    rows.map(function (r) {
      return "<tr><th class=\"outcome-col\">" + escapeHtml(r.name) + "</th>" + cols.map(function (c) {
        const v = r.scores[c.code];
        if (v == null) return '<td><div class="hm-cell" style="background:var(--surface-2);color:var(--text-muted);">—</div></td>';
        const step = scaleStep(v);
        return '<td><div class="hm-cell" data-val="' + v + '" style="background:var(--seq-' + step + ');">' + (r.live ? '<span class="hm-flag">●</span>' : "") + v + '%</div></td>';
      }).join("") + "</tr>";
    }).join("") + "</table></div>" +
    '<div class="legend-scale"><span>Düşük</span>' +
    [1, 2, 3, 4, 5].map(function (s) { return '<span class="legend-swatch" style="background:var(--seq-' + s + ');"></span>'; }).join("") +
    '<span>Yüksek başarı</span>' +
    '<span class="legend-live">● işaretli şubeler bu sistemde gerçekten çözülen sınavlardan hesaplanır. ' +
    '"(örnek)" etiketli satırlar karşılaştırma amaçlı demo verileridir.</span></div>';
  el.querySelectorAll(".hm-cell[data-val]").forEach(bestTextColor);
  const low = [];
  rows.forEach(function (r) { cols.forEach(function (c) { const v = r.scores[c.code]; if (v != null && v < 55) low.push(r.name + " · " + c.code); }); });
  if (low.length) el.insertAdjacentHTML("beforeend", '<div class="pill pill-warning" style="margin-top:10px;">⚠ Dikkat gereken ' + low.length + " hücre: " + low.slice(0, 3).join(", ") + (low.length > 3 ? "…" : "") + '</div>');

  /* ============ KAPALI DÖNGÜ ============
     Analiz ekranı sadece sorunu göstermekle kalmaz, çözümü de başlatır:
     zayıf kazanımın yanındaki buton, kullanıcıyı o kazanım seçili hâlde
     soru üretim ekranına götürür. İçerik → sınav → değerlendirme → analiz
     → YENİ İÇERİK zinciri böyle kapanır.                                  */
  const zayif = [];
  rows.forEach(function (r) {
    cols.forEach(function (c) {
      const v = r.scores[c.code];
      if (v != null && v < 60) zayif.push({ sinif: r.name, kod: c.code, deger: v });
    });
  });
  zayif.sort(function (a, b) { return a.deger - b.deger; });
  if (zayif.length) {
    el.insertAdjacentHTML("beforeend",
      '<div class="remedial-box"><div class="rb-title">Bu kazanımlar için aksiyon alın</div>' +
      '<div class="rb-desc">Aşağıdaki butonlar sizi, ilgili kazanım seçili hâlde soru üretim ekranına götürür. ' +
      'Böylece analizden doğrudan yeni ölçme aracına geçebilirsiniz.</div>' +
      zayif.slice(0, 4).map(function (z) {
        return '<button class="btn btn-secondary btn-sm remedial-btn" data-kod="' + z.kod + '" data-sinif="' +
          escapeHtml(z.sinif) + '" data-deger="' + z.deger + '">' +
          escapeHtml(z.sinif) + ' · ' + z.kod + ' (%' + z.deger + ') → tekrar sorusu üret</button>';
      }).join("") + '</div>');
    el.querySelectorAll(".remedial-btn").forEach(function (b) {
      b.onclick = function () {
        state.remedial = { outcomeCode: b.dataset.kod, sinif: b.dataset.sinif, deger: Number(b.dataset.deger) };
        state.ceForm.outcomeCode = b.dataset.kod;
        state.role = "content_expert";
        state.ceTab = 1;
        renderAll();
        const banner = document.getElementById("remedialBanner");
        if (banner) banner.scrollIntoView({ behavior: "smooth", block: "center" });
      };
    });
  }
}

function buildAdminHeatmapRows() {
  return realClassRows().concat(
    state.baseline.classes.map(function (c) { return { name: c.name + " (örnek)", scores: c.scores }; })
  );
}
function renderAdmin() {
  const root = document.getElementById("panel-admin");
  const pendingLive = Object.keys(state.aiEvals).filter(function (qid) { return !state.reviews[qid]; }).length;
  const pendingCount = pendingLive + state.baseline.pendingApprovalsOther;
  const completed = state.baseline.totalCompleted + ((state.examStatus === "submitted" || state.examStatus === "graded") ? 1 : 0);
  const rate = Math.round(completed / state.baseline.totalAssigned * 1000) / 10;

  // En zayif kazanimi bul: yoneticiye "ne yapmali" sorusunun cevabini ver.
  const rows = buildAdminHeatmapRows();
  let enZayif = null;
  rows.forEach(function (r) {
    OUTCOMES_LIST().forEach(function (c) {
      const v = r.scores[c.code];
      if (v != null && (!enZayif || v < enZayif.v)) enZayif = { sinif: r.name, kod: c.code, etiket: outcomeLabel(c.code), v: v };
    });
  });

  root.innerHTML =
    '<div class="card" style="margin-bottom:16px;"><div class="card-head">' +
    '<h3>Okul Geneli Ölçme Durumu</h3><span class="hint">tüm sınıflar, bu dönem</span></div>' +
    '<div style="font-size:13px;color:var(--text-muted);line-height:1.6;">' +
    'Bu ekran, okuldaki ölçme sürecinin ne kadarının tamamlandığını ve hangi kazanımlarda ' +
    'eksik kalındığını tek bakışta gösterir. Puanların hiçbiri yapay zekâ tarafından ' +
    'kesinleştirilmemiştir; buradaki sayılar yalnızca <b>öğretmen onayından geçmiş</b> sonuçları yansıtır.' +
    '</div></div>' +

    '<div class="grid-3col" style="margin-bottom:18px;">' +
    '<div class="stat-tile"><div class="s-label">Sınav Tamamlanma</div><div class="s-value tabular">%' + rate + '</div>' +
    '<div class="s-sub tabular">' + completed + '/' + state.baseline.totalAssigned + ' sınav tamamlandı</div>' +
    '<div class="s-note">Atanan sınavların öğrenciler tarafından bitirilme oranı</div></div>' +

    '<div class="stat-tile"><div class="s-label">Öğretmen Onayı Bekleyen</div><div class="s-value tabular">' + pendingCount + '</div>' +
    '<div class="s-sub">açık uçlu yanıt</div>' +
    '<div class="s-note">AI puan önerdi, öğretmen henüz onaylamadı. Bu sayı büyürse sonuçlar gecikiyor demektir.</div></div>' +

    '<div class="stat-tile"><div class="s-label">Aktif Sınıf</div><div class="s-value tabular">' + siniflar().length + '</div>' +
    '<div class="s-sub">okul genelinde</div>' +
    '<div class="s-note">Bu dönem en az bir ölçme süreci yürütülen sınıf sayısı</div></div></div>' +

    (enZayif
      ? '<div class="card" style="margin-bottom:16px;"><div class="card-head"><h3>Önce Buraya Bakın</h3><span class="hint">en düşük kazanım</span></div>' +
        '<div style="font-size:14px;line-height:1.65;"><b>' + escapeHtml(enZayif.sinif) + '</b> sinifi, ' +
        '<b>' + escapeHtml(enZayif.etiket) + '</b> kazanımında <b class="tabular">%' + enZayif.v + '</b> başarı gösterdi. ' +
        'Bu, okuldaki en düşük değer. İlgili öğretmenle bu kazanıma yönelik tekrar çalışması planlanabilir.</div></div>'
      : "") +

    '<div class="card"><div class="card-head"><h3>Kazanım Isı Haritası</h3><span class="hint">satır: sınıf, sütun: kazanım</span></div>' +
    '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">' +
    'Her hücre, o sınıfın o kazanımdaki ortalama başarı yüzdesidir. ' +
    '<b>Koyu renk = düşük başarı</b>, açık renk = yüksek başarı. ' +
    '%55 altındaki hücreler aşağıda ayrıca uyarı olarak listelenir.</div>' +
    '<div id="adminHeatmap"></div></div>' + trendHtml();

  renderHeatmap("adminHeatmap", rows);
}


/* ==================== Sınav Bütünlüğü Kaydı ====================
   TASARIM KARARI — "hile önleme" DEĞİL, "bütünlük kaydı":
   Tarayıcı tabanlı hiçbir sistem hileyi önleyemez (öğrenci yandaki telefona
   bakabilir). Bu yüzden sistem engellemeye çalışmaz; sınav sırasındaki
   sekme değişimi, pencere odağı kaybı ve tam ekrandan çıkış olaylarını
   kaydeder ve öğretmene BAĞLAM olarak sunar. Karar yine insanındır —
   projenin Human-in-the-Loop ilkesiyle aynı mantık.

   Şeffaflık: öğrenci sınav ekranında neyin kaydedildiğini açıkça görür.
   Gizli izleme yoktur (bkz. privacy-policy.html §2).                        */
const INTEGRITY_ETIKET = { sekme: "Sekme değişimi", odak: "Pencere odağı kaybı",
  tamekran: "Tam ekrandan çıkış", yapistir: "Yanıta metin yapıştırıldı", donus: "Sınava geri dönüş" };

function integrityReset() {
  state.integrity = { active: false, fsGranted: false, tabSwitch: 0, blur: 0, fsExit: 0,
                      pasteCount: 0, pasteChars: 0, awaySec: 0, _awayFrom: 0, events: [] };
}

function integrityNote(tur, detay) {
  const g = state.integrity;
  if (!g.active) return;
  if (tur === "sekme") g.tabSwitch++;
  else if (tur === "odak") g.blur++;
  else if (tur === "tamekran") g.fsExit++;
  else if (tur === "yapistir") { g.pasteCount++; g.pasteChars += (detay && detay.karakter) || 0; }
  if (g.events.length < 60) {
    g.events.push({ tur: tur, sn: Math.max(0, state.exam.durationMin * 60 - state.remainingSec), detay: detay || null });
  }
  saveState();
  updateIntegrityBadge();
}

function integrityTotal() {
  const g = state.integrity;
  return g.tabSwitch + g.blur + g.fsExit + g.pasteCount;
}

// Sayaci renderAll cagirmadan guncelle: acik uclu yanit yazilirken odak kaybolmasin.
function updateIntegrityBadge() {
  const el = document.getElementById("integrityCount");
  if (el) el.textContent = integrityTotal();
}

async function requestExamFullscreen() {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) { await el.requestFullscreen(); state.integrity.fsGranted = true; }
  } catch (e) {
    // Tarayıcı reddedebilir (izin, gömülü çerçeve vb.). Sınav yine de çalışır.
    state.integrity.fsGranted = false;
  }
}

function exitExamFullscreen() {
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
}

// Dinleyiciler bir kez baglanir; yalnizca integrity.active iken sayar.
document.addEventListener("visibilitychange", function () {
  const g = state.integrity;
  if (document.hidden) {
    g._awayFrom = Date.now();
    integrityNote("sekme");
  } else if (g.active && g._awayFrom) {
    // Kaç KEZ ayrıldığı kadar NE KADAR SÜRE ayrı kaldığı da önemlidir:
    // "3 kez, toplam 6 saniye" ile "3 kez, toplam 4 dakika" farklı sinyallerdir.
    const sure = Math.round((Date.now() - g._awayFrom) / 1000);
    g._awayFrom = 0;
    if (sure >= 2) {
      g.awaySec += sure;
      integrityNote("donus", { sure: sure });
    }
  }
});
window.addEventListener("blur", function () { integrityNote("odak"); });
document.addEventListener("fullscreenchange", function () {
  if (!document.fullscreenElement && state.integrity.active && state.integrity.fsGranted) integrityNote("tamekran");
});

function integrityNoticeHtml() {
  const g = state.integrity;
  return '<div class="integrity-bar">' +
    '<span class="ib-dot"></span>' +
    '<span class="ib-text">Sınav bütünlüğü kaydı açık — sekme değişimi, pencere odağı kaybı, tam ekrandan çıkış ' +
    've yanıta <b>metin yapıştırılması</b> öğretmeninize <b>bilgi olarak</b> iletilir. ' +
    'Yapıştırdığınız metnin içeriği kaydedilmez, yalnızca uzunluğu tutulur. ' +
    'Sistem sizi engellemez veya puanınızı otomatik düşürmez.</span>' +
    '<span class="ib-count">Kayıtlı olay: <b id="integrityCount" class="tabular">' + integrityTotal() + '</b></span>' +
    (g.fsGranted ? "" : '<button class="btn btn-secondary btn-sm" id="btnGoFullscreen">Tam ekrana geç</button>') +
    '</div>';
}

function integritySummaryHtml() {
  const g = state.integrity;
  const toplam = integrityTotal();
  const seviye = toplam === 0 ? "pill-success" : (toplam <= 3 ? "pill-warning" : "pill-critical");
  const yorum = toplam === 0
    ? "Sınav boyunca sekme değişimi veya odak kaybı kaydedilmedi."
    : "Bu kayıtlar tek başına kopya kanıtı değildir; bildirim gelmesi, sekmenin kazara değişmesi gibi masum " +
      "nedenlerle de olabilir. Değerlendirmede bağlam olarak kullanın.";
  return '<div class="card" style="margin-bottom:16px;"><div class="card-head">' +
    '<h3>Sınav Bütünlüğü Kaydı</h3><span class="pill ' + seviye + '">' + toplam + ' olay</span></div>' +
    '<div class="grid-3col" style="margin-bottom:10px;">' +
    '<div class="stat-tile"><div class="s-label">Sekme Değişimi</div><div class="s-value tabular">' + g.tabSwitch + '</div><div class="s-sub">başka sekmeye geçiş</div></div>' +
    '<div class="stat-tile"><div class="s-label">Odak Kaybı</div><div class="s-value tabular">' + g.blur + '</div><div class="s-sub">pencereden çıkış</div></div>' +
    '<div class="stat-tile"><div class="s-label">Tam Ekrandan Çıkış</div><div class="s-value tabular">' + g.fsExit + '</div><div class="s-sub">' + (g.fsGranted ? "tam ekran açıktı" : "tam ekran kullanılmadı") + '</div></div>' +
    '</div>' +
    '<div class="grid-2col-int">' +
    '<div class="stat-tile' + (g.pasteCount ? ' tile-alert' : '') + '"><div class="s-label">Yanıta Yapıştırma</div>' +
    '<div class="s-value tabular">' + g.pasteCount + '</div>' +
    '<div class="s-sub">' + (g.pasteCount ? g.pasteChars + ' karakter yapıştırıldı' : 'yapıştırma yok') + '</div>' +
    '<div class="s-note">Açık uçlu yanıtlar yapay zekâya okutulduğu için, dışarıdan hazır metin yapıştırılması bu üründeki en doğrudan bütünlük sinyalidir.</div></div>' +
    '<div class="stat-tile"><div class="s-label">Sınav Dışında Kalınan Süre</div>' +
    '<div class="s-value tabular">' + formatTime(g.awaySec || 0) + '</div>' +
    '<div class="s-sub">toplam</div>' +
    '<div class="s-note">Kaç kez ayrıldığı kadar ne kadar süre ayrı kaldığı da önemlidir.</div></div>' +
    '</div>' +
    (g.events.length
      ? '<div class="integrity-log">' + g.events.slice(0, 12).map(function (e) {
          const ek = e.detay
            ? (e.detay.karakter != null ? ' <b>(' + e.detay.karakter + ' karakter)</b>'
              : (e.detay.sure != null ? ' <b>(' + formatTime(e.detay.sure) + ' sonra)</b>' : ""))
            : "";
          return '<div class="il-row"><span class="il-time tabular">' + formatTime(e.sn) + '</span><span>' + INTEGRITY_ETIKET[e.tur] + ek + '</span></div>';
        }).join("") + (g.events.length > 12 ? '<div class="il-row" style="color:var(--text-muted);">… ve ' + (g.events.length - 12) + ' olay daha</div>' : "") + '</div>'
      : "") +
    '<div style="font-size:12px;color:var(--text-muted);line-height:1.6;margin-top:10px;">' + yorum + '</div></div>';
}

/* ============================== Modal ============================== */
function finishExamModalHtml() {
  const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
  const answeredCount = items.filter(function (it) { const a = state.answers[it.id]; return a && (a.selectedKey || (a.text && a.text.trim())); }).length;
  return '<h3>Sınavı bitirmek istediğinize emin misiniz?</h3>' +
    "<p>" + answeredCount + "/" + items.length + ' soruyu yanıtladınız. Bitirdikten sonra yanıtlarınızı değiştiremezsiniz; açık uçlu yanıtlarınız AI ön değerlendirmesine, ardından öğretmen onayına gönderilir.</p>' +
    '<div class="modal-actions"><button class="btn btn-secondary" id="modalCancel">Vazgeç</button><button class="btn btn-critical" id="modalConfirmFinish">Evet, Bitir</button></div>';
}
function openModal(html) {
  document.getElementById("modalBox").innerHTML = html;
  document.getElementById("modalOverlay").classList.add("open");
  const cancel = document.getElementById("modalCancel"); if (cancel) cancel.onclick = closeModal;
  const confirmFinish = document.getElementById("modalConfirmFinish"); if (confirmFinish) confirmFinish.onclick = function () { closeModal(); finishExam(); };
}
function closeModal() { document.getElementById("modalOverlay").classList.remove("open"); }

/* ============================== Üst çubuk & sayfa iskeleti ============================== */
function renderRoleNav() {
  const pendingReview = state.questions.filter(function (q) { return q.status === "ai_generated"; }).length;
  const pendingApproval = Object.keys(state.aiEvals).filter(function (qid) { return !state.reviews[qid]; }).length;
  // Çözülmeyi bekleyen TÜM yayındaki sınavlar sayılır (yalnızca aktif olan değil).
  const examReady = (state.exams || []).filter(function (x) {
    const aktif = x.id === state.activeExamId;
    const ex = aktif ? state.exam : x;
    const durum = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
    return ex.status === "published" && durum === "not_started" && (!ex.startsAt || Date.now() >= ex.startsAt);
  }).length;
  const badges = { content_expert: pendingReview, teacher: pendingApproval, student: examReady, admin: 0 };
  document.getElementById("roleNav").innerHTML = ROLES.map(function (r) {
    return '<button class="role-btn ' + (state.role === r.id ? "active" : "") + '" data-role="' + r.id + '"><span class="r-label">' + r.label + '</span><span class="r-hint">' + r.hint + '</span>' +
      (badges[r.id] ? '<span class="badge">' + badges[r.id] + '</span>' : "") + '</button>';
  }).join("");
  document.querySelectorAll(".role-btn").forEach(function (b) { b.onclick = function () { state.role = b.dataset.role; renderAll(); }; });
}
function renderPipeline() {
  const steps = [
    { label: "Havuz", done: state.questions.some(function (q) { return q.status === "approved"; }) },
    { label: "Sınav", done: state.exam.status === "published" },
    { label: "Çözüm", done: state.examStatus === "submitted" || state.examStatus === "graded" },
    { label: "Onay", done: state.examStatus === "graded" },
    { label: "Analiz", done: state.examStatus === "graded" },
  ];
  let activeSet = false;
  const html = steps.map(function (s, i) {
    let cls = "dot";
    if (s.done) cls += " done"; else if (!activeSet) { cls += " active"; activeSet = true; }
    return '<span class="seg"><span class="' + cls + '"></span><span>' + s.label + "</span></span>" + (i < steps.length - 1 ? '<span class="bar"></span>' : "");
  }).join("");
  document.getElementById("pipelineStrip").innerHTML = html;
}

function renderAll() {
  renderAiBadge();
  syncActiveExam();
  saveState();
  renderRoleNav();
  renderPipeline();
  renderContentExpert();
  renderTeacher();
  renderStudent();
  renderAdmin();
  document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + state.role); });
}
function initPanels() {
  document.getElementById("panels").innerHTML = ROLES.map(function (r) { return '<section class="panel" id="panel-' + r.id + '"></section>'; }).join("");
}

let waitingFlag = false;
setInterval(function () {
  if (state.examStatus === "in_progress") {
    // Kalan süre mutlak bitiş anından hesaplanır: sayfa kapansa, tarayıcı
    // çökse veya bağlantı kesilse bile süre gerçekte olduğu gibi işler.
    state.remainingSec = state.exam.endsAt
      ? Math.max(0, Math.round((state.exam.endsAt - Date.now()) / 1000))
      : Math.max(0, state.remainingSec - 1);
    const tv = document.getElementById("timerValue");
    if (tv) { tv.textContent = formatTime(state.remainingSec); tv.classList.toggle("low", state.remainingSec < 60); }
    if (state.remainingSec === 0) finishExam();
  }
  if (state.exam.status === "published" && state.examStatus === "not_started") {
    const stillWaiting = Date.now() < state.exam.startsAt;
    if (stillWaiting) {
      waitingFlag = true;
      const wp = document.getElementById("waitPill");
      if (wp) wp.textContent = kalanMetni(state.exam.startsAt);
    } else if (waitingFlag) { waitingFlag = false; renderAll(); }
  }
}, 1000);

/* ==================== Öz-kontrol ====================
   Geliştirme sırasında bir yeniden yazım, çağrılan bir fonksiyonu sessizce
   silebiliyor; hata ancak o ekrana girildiğinde ortaya çıkıyor. Bu liste,
   açılışta eksik tanımı hemen görünür kılar.
   (Gerçekten yaşandı: rubrik ekranı yeniden yazılırken evalCardHtml,
   doneCardHtml, evalFailedCardHtml ve confBadge silinmişti.)          */
(function selfCheck() {
  const gerekli = [
    "renderAll", "renderRoleNav", "renderContentExpert", "renderTeacher", "renderStudent", "renderAdmin",
    "ceCreateHtml", "cePoolHtml", "rejectedPoolHtml", "renderPendingQuestionCard", "distractorHtml",
    "teacherTab1Html", "teacherTab2Html", "teacherTab3Html", "teacherTab4Html",
    "wireTeacherTab1", "wireTeacherTab2", "wireTeacherTab3",
    "critRowHtml", "evalCardHtml", "evalFailedCardHtml", "doneCardHtml", "confBadge",
    "injectionWarnHtml",
    "studentTab1Html", "studentTab2Html", "studentTab3Html", "wireStudentTab1", "wireStudentTab2",
    "poolFilterHtml", "poolEditHtml", "coverageHtml", "examSwitcherHtml", "trendHtml",
    "integrityNoticeHtml", "integritySummaryHtml", "remedialBannerHtml", "renderHeatmap",
    "aiGenerateQuestions", "aiEvaluate", "aiSuggestRubric", "retryEvaluation",
    "startExam", "finishExam", "publishResults", "finalizeReview", "deleteQuestion",
    "activateExam", "createExam", "saveState", "loadState", "saveSoon", "kalanMetni",
    "ensureStudents", "activeStudent", "readSession", "writeSession", "submittedStudents",
    "activateStudent", "studentPickerHtml", "studentChip", "simulateClass", "examOutcomeScores",
    "examTotalPoints", "examSuggestedSec", "questionUsage", "rubRefreshBar",
    "siniflar", "classOutcomeScores", "realClassRows",
    "evalCacheKey", "hash32", "evalCacheGet", "evalCachePut", "evalCacheCount", "evalCacheClear"
  ];
  const eksik = gerekli.filter(function (f) { return typeof window[f] !== "function"; });
  if (eksik.length) {
    console.error("ÖZ-KONTROL BAŞARISIZ — tanımlı olmayan fonksiyonlar:", eksik);
    document.addEventListener("DOMContentLoaded", function () {
      const uyari = document.createElement("div");
      uyari.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;padding:12px 16px;" +
        "border-radius:10px;background:#ae3325;color:#fff;font:600 13px/1.5 system-ui;box-shadow:0 4px 16px rgba(0,0,0,.4)";
      uyari.textContent = "Geliştirici uyarısı — eksik fonksiyon: " + eksik.join(", ");
      document.body.appendChild(uyari);
    });
  }
})();

initPanels();
loadState();
ensureStudents();
ensureExamList();
document.getElementById("btnDemoSeed").onclick = loadDemoScenario;
document.getElementById("btnReset").onclick = resetState;
setInterval(function () { if (state.ai.busy) tickBusy(); }, 250);
renderAll();
probeAiMode();
