/* ============================== Sabitler ============================== */
const STOPWORDS = new Set(["ve","veya","ile","bir","bu","şu","o","da","de","ki","mi","mı","mu","mü","çok","daha",
  "gibi","için","olan","olarak","ise","ancak","fakat","ama","en","çünkü","kadar","göre","üzere","hem","ya","yani",
  "diye","hiç","her","bazı","tüm","bütün","şey","kez","olur","değil","vb","vs","dir","dır","dur","dür","onun",
  "bunun","şunun","biz","siz","onlar","ben","sen","değildir","olduğu","olduğunu","yapılan","yapılır"]);

// Bunlar artık sabit değil, yalnızca BAŞLANGIÇ değerleridir.
// Kullanıcı kendi dersini, sınıf düzeyini ve kazanımını tanımlayabilir
// (brief MVP 1: "konu, kazanım, seviye ... sisteme tanımlar").
/* Ortaokulun üç temel dersi. Sosyal Bilgiler ve İngilizce çıkarıldı:
   kazanım katalogları yok, seçilince öğretmen boş listeyle karşılaşıyordu. */
const VARSAYILAN_DERSLER = ["Türkçe", "Matematik", "Fen Bilimleri"];
/* KAPSAM KARARI (26 Ağustos, kullanıcı): Ürün ORTAOKUL için tasarlandı.
   1-4 ve 9-12 kaldırıldı: kazanım katalogları yalnızca 5-8 için var ve
   olmayan sınıfları listelemek, öğretmene karşılığı olmayan bir seçim
   sunmak demek. Dar ama gerçek kapsam, geniş ama boş kapsamdan iyidir. */
const GRADES = [5, 6, 7, 8];
const VARSAYILAN_KAZANIMLAR = [
  // subject/grade: kazanım artık hangi ders ve sınıfa ait olduğunu taşır.
  // Eskiden bu bilgi yoktu ve "Türkçe dersi + MAT.7.3.4 kazanımı" gibi
  // tutarsız seçimler mümkündü (kullanıcı bildirdi, PROGRESS §14a).
  { code: "MAT.7.2.1", label: "MAT.7.2.1 — Oran ve Orantı", subject: "Matematik", grade: 7 },
  { code: "MAT.7.3.4", label: "MAT.7.3.4 — Cebirsel İfadeler", subject: "Matematik", grade: 7 },
  { code: "FEN.7.1.2", label: "FEN.7.1.2 — Kuvvet ve Hareket", subject: "Fen Bilimleri", grade: 7 },
];

// Canlı listeler: state üzerinden okunur, kullanıcı ekleyip silebilir.
function OUTCOMES_LIST() { return state.outcomes && state.outcomes.length ? state.outcomes : VARSAYILAN_KAZANIMLAR; }
function SUBJECTS_LIST() { return state.subjects && state.subjects.length ? state.subjects : VARSAYILAN_DERSLER; }
const ROLES = [
  { id: "content_expert", label: "İçerik Uzmanı", hint: "soru üretimi ve onay" },
  { id: "teacher", label: "Öğretmen", hint: "sınav ve değerlendirme" },
  { id: "student", label: "Öğrenci", hint: "sınav çözümü" },
  { id: "admin", label: "Eğitim Yöneticisi", hint: "okul genel bakış" },
  /* Beşinci rol (§28f). Brief dördünü şart koşuyor; veli gerekçesiyle eklendi:
     salt okunur, yalnızca kendi çocuğunun ONAYLANMIŞ sonuçları, sınıf
     ortalaması ve sıralama yok. */
  { id: "parent", label: "Veli", hint: "çocuğunun sonuçları" },
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

/* Yerel yedek (simülasyon) üretimi.
   İKİ HATA DÜZELTİLDİ (§14h):
   1) Eskiden HER ZAMAN 2 ÇSS + 1 açık uçlu üretiyordu; öğretmenin seçtiği
      adetler yok sayılıyordu. Artık istenen sayıya uyar.
   2) Ürettiği sorular "Metne göre…" diyordu ama needsSource/srcId alanları
      yoktu; yani uyaran metin düzeltmesi (§14c) simülasyon modunda
      çalışmıyor, aynı "metin yok" hatası burada devam ediyordu. Artık
      kaynak metin bağlanıyor.
   Bu üretim bir TAKLİTTİR ve arayüzde "Yerel simülasyon" rozetiyle
   açıkça belirtilir; gerçek model çıktısı değildir. */
/* §31 — ÜRETİM DAYANAĞI (mod) tek yerden okunur.
   Eski durumlarda (localStorage'dan gelen ceForm) bu alan hiç yoktur;
   o yüzden bilinmeyen her değer "kaynak"a düşer — eski kullanıcı verisi
   davranış değiştirmez. */
/* §31 — MOD SEÇİCİ. İki dayanak da gerçektir, bu yüzden gizli bir ayar değil
   görünür bir seçim olarak sunulur; öğretmen hangi temele dayandığını bilmeli.
   Seçim state.ceForm.mode'a yazılır ve KALICI_ALANLAR üzerinden saklanır. */
function uretimModuSecHtml() {
  const m = uretimModu();
  const kart = function (deger, baslik, aciklama) {
    return '<button type="button" class="mod-kart' + (m === deger ? " secili" : "") + '" ' +
      'data-uretim-modu="' + deger + '" aria-pressed="' + (m === deger ? "true" : "false") + '">' +
      '<span class="mod-ad">' + baslik + '</span>' +
      '<span class="mod-not">' + aciklama + '</span></button>';
  };
  return '<div class="field"><label>Soru neye dayansın?</label>' +
    '<div class="mod-secici">' +
    kart("kaynak", "📄 Kaynak metinden",
      "Yüklediğiniz ders notundan üretilir. Okuma kazanımları için gerekli — metin sınavda öğrenciye gösterilir.") +
    kart("kazanim", "🎯 Kazanımdan",
      "Metin gerekmez. Dayanak MEB kazanımı; isterseniz bir yönerge yazarsınız.") +
    '</div></div>';
}

/* §31 — YÖNERGE ALANI. Yalnızca kazanım modunda görünür. Zorunlu değildir;
   boş bırakılırsa istem yalnızca kazanıma dayanır (eski davranışın kazanım
   karşılığı). Sunucuda kaynak metinle aynı enjeksiyon koruması uygulanır. */
function yonergeAlaniHtml() {
  const g = String(state.ceForm.guidance || "");
  return '<div class="field ce-text-field"><div class="label-row">' +
    '<label for="ceGuidance">Yönerge <span style="font-weight:400;color:var(--text-muted);">(opsiyonel)</span></label>' +
    '<span class="char-count' + (g.length > 540 ? " near" : "") + '">' + g.length + ' / 600</span></div>' +
    '<textarea id="ceGuidance" rows="3" placeholder="örn. Günlük hayattan örneklerle, grafik yorumlatan sorular olsun. Sürtünme kuvvetine ağırlık ver.">' +
    escapeHtml(g) + '</textarea>' +
    '<div class="alan-not">Bu bir <b>odak ve üslup</b> isteğidir — soru sayısını, çıktı biçimini ve dil kurallarını değiştiremez. ' +
    'Öğrencinin önünde okuyacağı bir metin olmayacağı için sorular metne atıf yapmaz.</div></div>';
}

function uretimModu() {
  return state.ceForm && state.ceForm.mode === "kazanim" ? "kazanim" : "kaynak";
}

/* §31 — Kazanım modunda YEREL SİMÜLASYON için anahtar kelime kaynağı.
   Gerçek model yokken (çevrimdışı/statik önizleme) simülasyon şablonu
   anahtar kelimelere ihtiyaç duyar; kaynak metin olmadığı için bunlar
   kazanım açıklamasından ve öğretmenin yönergesinden çıkarılır.
   Bu YALNIZCA simülasyon yoludur — gerçek model yolunda kullanılmaz. */
function kazanimAnahtarlari(doc) {
  const havuz = [doc.outcomeLabel || "", doc.guidance || "", outcomeAlan(doc.outcome) || ""].join(" ");
  const kw = extractKeywords(havuz, 10);
  return kw.length ? kw : ["kavram", "ilişki", "örnek", "uygulama"];
}

function simulateQuestions(doc) {
  /* §31: kazanım modunda kaynak metin yoktur; anahtar kelimeler kazanımdan
     üretilir ve soru gövdeleri metne ATIF YAPMAZ (bkz. metneAtif). */
  const kazanimModu = doc.mode === "kazanim";
  const kw = kazanimModu ? kazanimAnahtarlari(doc) : extractKeywords(doc.text, 10);
  if (!kw.length) return [];
  const metneAtif = !kazanimModu;
  const offset = (state.genCount * 2) % kw.length;
  const k = function (i) { return kw[(offset + i) % kw.length]; };
  const mk = function () { return qIdSeq++; };
  const istenenMc = Math.max(0, Number(doc.mcCount != null ? doc.mcCount : 2));
  const istenenOpen = Math.max(0, Number(doc.openCount != null ? doc.openCount : 1));
  const zorluklar = ["easy", "medium", "hard"];
  const qs = [];

  for (let i = 0; i < istenenMc; i++) {
    const t = i * 3;
    qs.push({
      id: mk(), type: "mc", difficulty: zorluklar[i % 3], outcome: doc.outcome,
      bloom: i % 2 === 0 ? "hatirlama" : "anlama",
      body: (metneAtif ? 'Metne göre "' : 'Bu kazanım kapsamında "') + k(t) +
        '" kavramıyla en doğrudan ilişkili seçenek hangisidir?',
      options: [
        { key: "A", text: k(t + 1) }, { key: "B", text: k(t + 2) },
        { key: "C", text: k(t + 3) },
        { key: "D", text: metneAtif ? "Metinde bu konuya değinilmemiştir" : "Bu kavramla doğrudan ilişkili değildir" }
      ],
      correctKey: "A", aiTime: 45 + i * 10, status: "ai_generated",
      refKeywords: [k(t), k(t + 1)],
      /* Kaynak modunda simülasyon soruları metne atıf yapar → metin sınavda
         gösterilmeli. §31 kazanım modunda gösterilecek metin YOKTUR; burada
         true bırakılsaydı öğrenci ekranında "metin bulunamadı" kutusu çıkardı
         (sunucu tarafındaki zorlamanın simülasyon yolundaki karşılığı). */
      needsSource: metneAtif, srcId: doc.srcId != null ? doc.srcId : null,
      sube: doc.sube || ""
    });
    // Paket 4b — tasarım kararı: simulateQuestions() GERÇEK bir AI çağrısı
    // değil, sabit şablonlu yerel bir yedektir; "hep B doğru" sapması burada
    // GERÇEKTEN yaşanan bir önyargı değil (kod zaten her seferinde "A"yı
    // doğru üretiyor — bu satırın birkaç üstünde açıkça görülüyor). Yine de
    // bu şablonun kendisi "doğru şık hep A" deseniyle aynı sorunu üretiyor;
    // İçerik Uzmanı/öğrenci arayüzde gördüğü ÇSS'lerin doğru şıkkının hep A
    // olması öğrenmeyi/güveni bozabilir. shuffleQuestionOptions() maliyeti
    // sıfıra yakın (küçük dizi, saf fonksiyon) ve gerçek AI yoluyla birebir
    // aynı davranışı sağladığı için savunma amaçlı (defense-in-depth) ve
    // tutarlılık için burada da uygulanıyor — zararı yok, kazancı var.
    shuffleQuestionOptions(qs[qs.length - 1]);
  }

  for (let i = 0; i < istenenOpen; i++) {
    const t = i * 2;
    qs.push({
      id: mk(), type: "open", difficulty: i === 0 ? "hard" : "medium", outcome: doc.outcome,
      bloom: i === 0 ? "analiz" : "uygulama",
      body: '"' + k(t) + '" ve "' + k(t + 1) + '" kavramları arasındaki ilişkiyi ' +
        (metneAtif ? 'metinden yararlanarak ' : '') +
        'açıklayınız; en az bir örnek veriniz.',
      aiTime: 240, status: "ai_generated",
      refKeywords: [k(t), k(t + 1), k(t + 2)],
      needsSource: metneAtif, srcId: doc.srcId != null ? doc.srcId : null,
      sube: doc.sube || ""
    });
  }

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
const AI_API = { status: "/api/ai/status", generate: "/api/ai/generate-questions", evaluate: "/api/ai/evaluate", rubric: "/api/ai/rubric", sampleAnswers: "/api/ai/sample-answers", misconceptions: "/api/ai/misconceptions", alignment: "/api/ai/outcome-alignment" };

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

/* Paket 4c — Tekrar Önleme (dedup) girdisi.
   Aynı kaynak/kazanım için bu OTURUMDA (state.questions içinde, henüz
   sayfa yenilenmemiş/localStorage'dan geleni de dahil) daha önce üretilmiş
   soru gövdelerini toplar. Yeni bir state alanı EKLENMEDİ — bilgi zaten
   state.questions'ta var; burada yalnızca türetiliyor. srcId varsa ONA göre
   (aynı kaynak metin), yoksa kazanım koduna göre eşleştirilir; en yakın
   (en çok tekrar riski taşıyan) 30 soruyla sınırlanır ki istek boyutu
   büyümesin (sunucu şeması da 50 ile sınırlar). */
function previouslyGeneratedQuestionBodies(doc) {
  const ayniKaynak = function (q) {
    if (doc.srcId != null && q.srcId != null) return q.srcId === doc.srcId;
    return q.outcome === doc.outcome;
  };
  return (state.questions || [])
    .filter(ayniKaynak)
    .map(function (q) { return String(q.body || "").trim(); })
    .filter(Boolean)
    .slice(-30);
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
      // §31: kazanım modunda kaynak metin gönderilmez (sunucu şeması bu modda
      // alt sınır aramaz); dayanak kazanımın kendisidir.
      mode: doc.mode === "kazanim" ? "kazanim" : "kaynak",
      guidance: doc.mode === "kazanim" ? (doc.guidance || undefined) : undefined,
      sourceText: doc.mode === "kazanim" ? "" : doc.text.slice(0, 6000),
      subject: doc.subject,
      grade: String(doc.grade),
      outcomeCode: doc.outcome,
      outcomeLabel: doc.outcomeLabel,
      mcCount: state.ceForm.mcCount,
      openCount: state.ceForm.openCount,
      optionCount: 4,
      docKey: doc.title || "adsiz",
      // Madde 2: ikisi de opsiyonel — sunucu tarafında yalnızca istemi
      // zenginleştirir, çıktı şemasını değiştirmez (bkz. src/lib/prompts.ts).
      topicArea: outcomeAlan(doc.outcome) || undefined,
      bloomFocus: state.ceForm.bloomFocus || "dengeli",
      // Paket 4c — Tekrar Önleme: bu oturumda AYNI kazanım için daha önce
      // üretilmiş soru gövdeleri sunucuya negatif örnek olarak gönderilir.
      // Ayrı bir state alanı TUTULMUYOR — zaten var olan state.questions
      // üzerinden türetiliyor (bkz. previouslyGeneratedQuestionBodies), ki
      // "hiç ek soru üretilmedi" durumunda boş dizi gider (geri uyumlu).
      excludeQuestions: previouslyGeneratedQuestionBodies(doc),
    });
    state.ai.error = "";
    if (j.meta) { state.ai.usingFallback = !!j.meta.fellBack; if (j.meta.model) state.ai.model = j.meta.model; }
    return (j.questions || []).map(function (q) {
      const soru = {
        id: qIdSeq++, type: q.type, difficulty: q.difficulty, outcome: doc.outcome,
        body: q.body, options: q.options, correctKey: q.correctKey,
        distractorRationale: q.distractorRationale || {}, bloom: q.bloom,
        aiTime: q.aiTime, status: "ai_generated", refKeywords: q.refKeywords || [],
        // Soru bir kaynak metne dayanıyorsa, o metin sınavda öğrenciye
        // gösterilmek üzere saklanır ve soruya bağlanır (uyaran metin).
        needsSource: !!q.needsSource, srcId: doc.srcId != null ? doc.srcId : null,
        // Sunucu, model çıktısında Türkçe dışı alfabe saptadıysa işaretler
        // (ölçüldü: llama ~10 soruda 1 kez Kiril harfi karıştırıyor).
        // Otomatik düzeltilmez; İçerik Uzmanına gösterilir.
        dilUyarisi: !!q.dilUyarisi,
        // Denetim izi icin: bu soruyu HANGI model uretti (§19c: modeller
        // farkli davraniyor, kayitta gorunmeli).
        uretenModel: (j.meta && j.meta.model) || null,
        // Madde 1: yalnızca etiket — modele hiç gönderilmedi (yukarıdaki
        // apiPost çağrısında "sube" alanı yok), yalnızca burada damgalanıyor.
        sube: doc.sube || "",
      };
      /* Paket 4b + §32 (Burak Modül 4) — %25 şık dağılımı, TEK yerde.
         Eskiden burada ayrıca `shuffleQuestionOptions(soru)` çağrılıyordu;
         artık karıştırma SUNUCUDA yapılıyor (src/routes/ai.ts →
         guards.ts `shuffleOptions`) ve bu satır kaldırıldı. Gerekçe:
         karıştırma tek ve yetkili bir noktada olmalı — iki bağımsız
         karıştırma sonucu bozmaz ama hangi katmanın sorumlu olduğunu
         belirsizleştirir ve sunucu testleriyle (test/guards.ts) doğrulanan
         davranışın istemcide sessizce değişmesine kapı açar.
         `shuffleQuestionOptions` KALDIRILMADI: yerel simülasyon yolunda
         (simulateQuestions) ve şık taşımada (moveOption, sürükle-bırak)
         hâlâ kullanılıyor. */
      return soru;
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
  if (state.ai.mode !== "live") {
    const sim = simulateAIEvaluation(q, answerText, rubric);
    // Denetim izi simülasyonu da kaydeder — ama SİMÜLASYON OLDUĞUNU yazarak.
    // Kayıtta gerçek model adı görünmesi denetim izini yalancı yapardı.
    auditKaydet("degerlendirme_onerildi", {
      qid: q.id, sid: state.activeStudentId, soru: auditKisalt(q.body),
      aiScore: sim ? sim.aiScore : null, confidence: sim ? sim.confidence : null,
      model: "yerel simülasyon (model çağrılmadı)",
    });
    return sim;
  }
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
                    // Öğrenciye geri bildirim TASLAĞI. Öğretmen "Nota Aktar" demeden
                    // öğrenciye gitmez; otomatik doldurma bilinçli olarak yapılmadı
                    // (öğretmen farkında olmadan AI metnini onaylamasın).
                    studentFeedback: j.studentFeedback || "",
                    breakdown: j.breakdown, confidence: j.confidence,
                    // Sunucu, ogrenci yanitinin modele talimat vermeye calistigini bildirir.
                    // Engelleme DEGIL, ogretmene sinyal (agents.md §7.1: karar insanda).
                    injectionAttempt: !!j.injectionAttempt };
    // Yalnızca BAŞARILI değerlendirme önbelleğe alınır.
    evalCachePut(cacheKey, sonuc);
    // Denetim izi: yapay zekâ PUAN ÖNERDİ. Nihai puan değil — öğretmen
    // onaylayınca "puan_karari" kaydı düşer ve ikisi karşılaştırılabilir.
    auditKaydet("degerlendirme_onerildi", {
      qid: q.id, sid: state.activeStudentId, soru: auditKisalt(q.body),
      aiScore: sonuc.aiScore, confidence: sonuc.confidence,
      model: (j.meta && j.meta.model) || null,
      fellBack: !!(j.meta && j.meta.fellBack),
      injectionAttempt: sonuc.injectionAttempt || undefined,
    });
    return sonuc;
  } catch (e) {
    const mesaj = String((e && e.message) || e);
    state.ai.error = mesaj;
    // Denetim izi: başarısızlık da kayda geçer — öğretmenin neden elle
    // puanladığı sonradan anlaşılabilsin (§3.4 sessiz geri düşüş yasağı).
    auditKaydet("degerlendirme_basarisiz", {
      qid: q.id, sid: state.activeStudentId, soru: auditKisalt(q.body),
      not: mesaj.slice(0, 120),
    });
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

/**
 * Model kimliğini insan okunur kısa ada çevirir.
 *
 * NEDEN: Sağ üstte "@cf/meta/llama-3.3-70b-instruct-fp8-fast" yazıyordu —
 * 38 karakterlik teknik gürültü. Öğretmenin bu kimliğe ihtiyacı yok; jürinin
 * var, o yüzden SİLİNMİYOR, ayrıntı panelinde tam hâliyle duruyor.
 *
 * Sabit bir eşleme tablosu YAZILMADI: sağlayıcılar model adlarını sık
 * değiştiriyor, tablo bayatlar. Bunun yerine kimlik biçimsel olarak
 * sadeleştiriliyor; tanınmayan bir ad gelirse olduğu gibi gösterilir.
 */
function modelKisaAd(kimlik) {
  var s = String(kimlik || "").trim();
  if (!s) return "";
  s = s.replace(/^@[^/]+\//, "").replace(/^[^/]+\//, "");   // @cf/meta/ önekini at
  s = s.replace(/-instruct|-fp8|-fast|-preview|-latest/gi, ""); // teknik son ekler
  s = s.replace(/[-_]+/g, " ").trim();
  // "llama 3.3 70b" -> "Llama 3.3 70B" · "gpt 5.6 luna" -> "GPT 5.6 Luna"
  var KISALTMA = { gpt: "GPT", ai: "AI", llm: "LLM", cf: "CF" };
  return s.split(" ").map(function (k) {
    var alt = k.toLocaleLowerCase("tr");
    if (KISALTMA[alt]) return KISALTMA[alt];
    if (/^\d/.test(k)) return k.toUpperCase();
    return k.charAt(0).toLocaleUpperCase("tr") + k.slice(1);
  }).join(" ");
}

/** Sağlayıcı kimliğini okunur ada çevirir. */
function saglayiciAdi(p) {
  var m = { "workers-ai": "Cloudflare Workers AI", openai: "OpenAI uyumlu uç", anthropic: "Anthropic" };
  return m[String(p || "").toLowerCase()] || String(p || "bilinmiyor");
}

/** Durum çipinin ayrıntı panelini açar/kapatır. */
function aiAyrintiToggle() {
  state.aiAyrintiAcik = !state.aiAyrintiAcik;
  renderAiBadge();
}

function aiAyrintiHtml() {
  if (!state.aiAyrintiAcik) return "";
  var a = state.ai;
  var satir = function (etiket, deger, mono) {
    return '<div class="aim-satir"><span class="aim-etiket">' + escapeHtml(etiket) + "</span>" +
      '<span class="aim-deger' + (mono ? " mono" : "") + '">' + escapeHtml(deger) + "</span></div>";
  };
  var icerik = "";
  if (a.mode === "live") {
    icerik += satir("Sağlayıcı", saglayiciAdi(a.provider));
    icerik += satir("Model", a.model || "—", true);
    icerik += a.fallback
      ? satir("Yedek", saglayiciAdi(a.fallback.provider) + " · " + (a.fallback.model || "—"))
      : satir("Yedek", "yapılandırılmamış");
    icerik += '<div class="aim-not">' +
      (a.usingFallback
        ? "Şu an <b>yedek model</b> yanıtlıyor — birincil sağlayıcı başarısız oldu."
        : "Yedek yalnızca birincil sağlayıcı başarısız olursa devreye girer. " +
          "Devreye girerse burada ve yanıtın kendisinde <b>açıkça yazar</b>; sessiz geçiş yoktur.") +
      "</div>";
  } else if (a.mode === "simulation") {
    icerik += satir("Durum", "Yerel simülasyon");
    if (a.error) icerik += satir("Sebep", a.error);
    icerik += '<div class="aim-not">Model sunucusuna ulaşılamadığı için AI adımları şablon tabanlı ' +
      "yerel yedeğe düştü. Üretilen içerik <b>gerçek model çıktısı değildir</b> ve ekranda böyle işaretlenir.</div>";
  } else {
    icerik += satir("Durum", "Denetleniyor…");
  }
  return '<div class="ai-mode-detay" id="aiModeDetay">' + icerik + "</div>";
}

function renderAiBadge() {
  const el = document.getElementById("aiModeSlot");
  if (el) {
    const live = state.ai.mode === "live";
    const kisa = modelKisaAd(state.ai.model) || saglayiciAdi(state.ai.provider);
    const txt = state.ai.mode === "unknown" ? "Model denetleniyor…"
      : live ? ((state.ai.usingFallback ? "Yedek model · " : "Gerçek model · ") + kisa)
      : "Yerel simülasyon";
    const cls = !live ? "pill-warning" : (state.ai.usingFallback ? "pill-accent2" : "pill-success");
    el.innerHTML =
      '<button class="ai-chip ' + cls + '" id="btnAiDetay" aria-expanded="' + (state.aiAyrintiAcik ? "true" : "false") +
      '" title="Model ayrıntılarını göster/gizle">' +
      '<span class="ai-nokta">' + (live ? "●" : "○") + "</span>" +
      '<span class="ai-metin">' + escapeHtml(txt) + "</span>" +
      '<span class="ai-ok">' + (state.aiAyrintiAcik ? "▴" : "▾") + "</span></button>" +
      aiAyrintiHtml();
    const btn = document.getElementById("btnAiDetay");
    if (btn) btn.onclick = aiAyrintiToggle;
  }
  const col = document.getElementById("colophon");
  if (col) {
    /* 🔴 BU METİN EKRANI YALANLAMAMALI (§17a-3, §25b).
       Eskiden sabit olarak "dört rolü" ve "veriler sunucuya gönderilmez"
       diyordu. Rol sayısı beşe çıktı ve sınıf kodu kullanıldığında veri
       GERÇEKTEN sunucuya gidiyor (§28b). İkisi de artık duruma göre yazılıyor;
       rol sayısı ROLES dizisinden SAYILIYOR ki bir daha ayrışmasın. */
    const rolAdedi = ["", "tek", "iki", "üç", "dört", "beş", "altı"][ROLES.length] || String(ROLES.length);
    const depoNotu = state.syncRoom
      ? "sınıf kodu (" + state.syncRoom + ") kullanıldığı için sınav ve yanıt verileri, cihazlar arasında " +
        "paylaşılmak üzere sunucudaki veritabanında da saklanır; üst çubuktaki sınıf kodu çipinin altındaki “Sunucudaki veriyi sil” ile kaldırılabilir."
      : "sınıf kodu girilmediği için veriler sunucuya gönderilmez, yalnızca bu tarayıcıda saklanır ve sayfa yenilenince korunur.";
    const model = state.ai.mode === "live"
      ? "Soru üretimi ve açık uçlu puan önerisi gerçek bir dil modeli tarafından üretilir; nihai puan her zaman öğretmen onayıyla kesinleşir."
      : "Model sunucusuna ulaşılamadığı için AI adımları şablon tabanlı yerel yedeğe düşmüştür.";
    col.textContent = model + " Bu prototip " + rolAdedi + " rolü aynı tarayıcı oturumunda simüle eder; " + depoNotu;
  }
}


/* ==================== Kalıcılık (localStorage) ====================
   ÖNCEDEN: sayfa yenilenince tüm durum sıfırlanıyordu. Jüri sunumunda ya da
   video çekiminde yanlış bir tuş, 10-17 saniyelik model beklemeleriyle birlikte
   her şeyi baştan yaptırıyordu. Durum artık tarayıcıda saklanıyor.
   (Kalıcı veritabanı değildir; yalnızca bu tarayıcıya özeldir.)              */
const STORE_KEY = "t3-olcme-durum-v1";
const KALICI_ALANLAR = ["role", "teacherTab", "studentTab", "ceTab", "genCount", "ceForm", "questions",
  "rubrics", "rubricSelectedQ", "exam", "answers", "flagged", "examStatus", "currentQIndex",
  "remainingSec", "aiEvals", "reviews", "mcResults", "remedial", "integrity", "outcomes", "subjects", "poolFilter", "exams", "activeExamId",
  "students", "activeStudentId", "evalCache", "misconceptions", "alignment", "sources", "library", "auditLog", "auditDusen",
  // §29: "kim olarak değerlendiriyorum" — sayfa yenilenince kaybolmamalı.
  "activeTeacherName",
  /* Sınıf (oda) kodu KALICIDIR: sayfa yenilenince öğrenci kodu yeniden
     girmek zorunda kalmamalı. `state.sync` çalışma zamanı durumudur ve
     bilinçli olarak kalıcı DEĞİLDİR. */
  "syncRoom", "parentStudentId",
  /* Öğretmenin "veliye bildirilsin" onayı (§28e). Bu bir İNSAN KARARIDIR ve
     kaybolmamalıdır; sinyalin kendisi her seferinde yeniden hesaplanır. */
  "dikkatOnay"];

/* Depolama uyarısı: localStorage kotası dolarsa kullanıcı bunu BİLMELİDİR.
   Eskiden `saveState()` hatayı sessizce yutuyordu; öğretmen soru üretmeye
   devam ederken hiçbir şey kaydedilmiyor olabilirdi. Sessiz düşüş yasağı
   (§6.3-5) burada da geçerlidir. */
var depoHatasi = "";

function saveState() {
  if (_resetting) return;
  try {
    const d = { _qIdSeq: qIdSeq };
    KALICI_ALANLAR.forEach(function (k) { d[k] = state[k]; });
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
    depoHatasi = "";
  } catch (e) {
    // Kota dolu ya da gizli sekme. Sessizce geçilirse kullanıcı çalışmasının
    // kaydedildiğini sanır ve yenilemede her şeyi kaybeder.
    depoHatasi = "Çalışmanız bu tarayıcıya kaydedilemiyor (" +
      String((e && e.name) || "depolama hatası") + "). Sekmeyi kapatırsanız " +
      "kaydedilmemiş veriler kaybolur. Müfredat Kitaplığı'ndan kullanmadığınız " +
      "kitapları silmeyi ya da tarayıcı verisini temizlemeyi deneyin.";
  }
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
  // Kitaplık ayrı bir depoda (IndexedDB). Yalnızca localStorage silinirse
  // kitap içerikleri diskte kalır ve arayüzde onları silecek bir liste de
  // kalmaz — erişilemeyen artık veri olur. Silme bloklanırsa (başka sekme
  // açıksa) sıfırlama yine de sürer; süresiz beklemez.
  kitapligiSil().then(function () { location.reload(); });
}

/** Kitaplık veritabanını tümüyle siler. Bloklanırsa en fazla 1,5 sn bekler. */
function kitapligiSil() {
  return new Promise(function (resolve) {
    var bitti = false;
    var bitir = function () { if (!bitti) { bitti = true; resolve(); } };
    setTimeout(bitir, 1500);
    try {
      // Açık bağlantı varken deleteDatabase bloklanır; önce kapat.
      if (dbPromise) {
        dbPromise.then(function (db) { try { db.close(); } catch (e) {} }, function () {});
        dbPromise = null;
      }
      var istek = indexedDB.deleteDatabase(KITAPLIK_DB);
      istek.onsuccess = bitir;
      istek.onerror = bitir;
      istek.onblocked = bitir;
    } catch (e) { bitir(); }
  });
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

/* §38 — DEMO AKIŞI: sahne artık "her şey bitmiş" değil, ADIM ADIM İLERLETİLİR.

   Eskiden tohum her şeyi hazır bırakıp kullanıcıyı Öğrenci paneline atıyordu.
   §32'de üst çubuktaki beş rol düğmesi kaldırıldığı için bu davranış bozuldu:
   İçerik Uzmanı olarak girip düğmeye basan kişi SESSİZCE Öğrenci paneline
   düşüyor ve geri dönüşü yalnızca Çıkış → giriş → kart (3 tık) oluyordu.

   Yeni tohum, jürinin GERÇEK AKSİYONLARI görmesi için iki şeyi bilerek
   YARIM bırakır:
     • bir çoktan seçmeli soru `ai_generated` (onay bekliyor) kalır ve
       sınava dahil edilmez → İçerik Uzmanı onu KENDİSİ onaylar,
     • sınav `draft` kalır → Öğretmen sınavı KENDİSİ yayınlar.
   Öğrencinin yanıtları yine hazırdır (sunumda 3 soru yazmakla vakit
   kaybedilmesin) ama sınavı BİTİRME işini de sunumcu kendisi yapar.

   Demo verisi ile gerçek veri karışmaz: sorular `demo: true`, simüle
   öğrenciler `demo: true` + "simüle" rozeti, denetim izinde model adı
   "yerel simülasyon (model çağrılmadı)". Isı haritasındaki "(örnek)"
   satırları ayrı bir sistemdir (§37) ve buradan etkilenmez. */
function loadDemoScenario() {
  state.questions = DEMO_SORULAR.map(function (q) {
    const kopya = JSON.parse(JSON.stringify(q));
    kopya.id = qIdSeq++;
    kopya.outcome = "FEN.7.1.2";
    kopya.status = "approved";
    kopya.demo = true;
    return kopya;
  });
  /* Adım 1'in gerçek aksiyonu: bu soru ONAY BEKLER. Açık uçlu DEĞİL bilerek —
     açık uçlu sınavdan çıkarsa rubrik ve AI değerlendirmesi de çıkar, adım 4
     gösterilecek bir şey bulamazdı. */
  const onayBekleyen = state.questions.filter(function (q) { return q.type === "mc"; })[1];
  if (onayBekleyen) onayBekleyen.status = "ai_generated";

  state.ceForm.title = "Kuvvet ve Hareket — 3. Ünite Özeti";
  state.ceForm.subject = "Fen Bilimleri";
  state.ceForm.grade = 7;
  state.ceForm.outcomeCode = "FEN.7.1.2";
  state.ceForm.text = DEMO_METIN;
  if (state.activeExamId == null) ensureExamList();
  state.exam.title = "Kuvvet ve Hareket — Kısa Sınav";
  // Onay bekleyen soru sınava GİRMEZ: onaylanmamış soru sınava konamaz.
  state.exam.questionIds = state.questions
    .filter(function (q) { return q.status === "approved"; })
    .map(function (q) { return q.id; });
  state.exam.durationMin = 10;
  state.exam.startDelaySec = 0;
  // Adım 2'nin gerçek aksiyonu: sınavı ÖĞRETMEN yayınlar.
  state.exam.status = "draft";
  state.exam.startsAt = null;
  state.exam.startMode = "now";
  state.questions.filter(function (q) { return q.type === "open"; }).forEach(function (q) { ensureRubric(q.id); });
  // Yanıtlar hazır ama sınav BAŞLAMADI: adım 3'te sunumcu başlatıp bitirir.
  state.answers = {};
  state.exam.questionIds.forEach(function (qid) {
    const q = state.questions.find(function (x) { return x.id === qid; });
    if (q) state.answers[q.id] = q.type === "mc" ? { selectedKey: q.correctKey } : { text: DEMO_YANIT };
  });
  state.examStatus = "not_started";
  state.remainingSec = state.exam.durationMin * 60;
  state.aiEvals = {}; state.reviews = {}; state.mcResults = {};
  demoSinifOturumlari();
  /* Ölçüldü (§38.2): simüle sınıf oturumları sınav TASLAKKEN yazılsa da
     analitiğe düşmez (okulGercekDurum ve classOutcomeScores yayınlanmış
     sınav şartı arar); öğretmen adım 2'de yayınlayınca eksiksiz görünür. */
  state.demoAdim = 1;
  demoAdimaGit(1);
  return;
}

/* Demo Akışı'nın beş adımı. Her adım YALNIZCA rol + sekme söyler; hiçbir
   ürün aksiyonunu (onaylama, yayınlama, bitirme) kendisi YAPMAZ.
   `hazir` = bir sonraki adıma geçmenin KOŞULU; koşul insan tarafından
   yerine getirilir. HITL burada gizlenmez, tam tersine görünür kılınır. */
const DEMO_ADIMLARI = [
  { no: 1, rol: "content_expert", sekme: 1, roleAd: "İçerik Uzmanı",
    aciklama: "Onay bekleyen soruyu inceleyip onaylayın; soru havuzuna geçsin.",
    sonraki: "Sonraki Adım → Öğretmen",
    hazir: function () { return !state.questions.some(function (q) { return q.status === "ai_generated"; }); },
    kilit: "Önce bekleyen soruyu onaylayın" },
  { no: 2, rol: "teacher", sekme: 1, roleAd: "Öğretmen",
    aciklama: "Havuzdaki soruları sınava dönüştürüp sınavı yayınlayın.",
    sonraki: "Sonraki Adım → Öğrenci",
    hazir: function () { return state.exam.status === "published"; },
    kilit: "Önce sınavı yayınlayın" },
  { no: 3, rol: "student", sekme: 1, roleAd: "Öğrenci",
    aciklama: "Yayınlanan sınavı çözün ve “Sınavı Bitir” ile gönderin.",
    sonraki: "Sonraki Adım → Öğretmen Onayı",
    hazir: function () { return state.examStatus === "submitted" || state.examStatus === "graded"; },
    kilit: "Önce sınavı bitirin" },
  { no: 4, rol: "teacher", sekme: 3, roleAd: "Öğretmen Onayı",
    aciklama: "Yapay zekânın puan önerisini inceleyin, nihai kararı verin ve sonuçları yayınlayın.",
    sonraki: "Sonraki Adım → Analiz",
    hazir: function () { return state.examStatus === "graded"; },
    kilit: "Önce değerlendirmeleri onaylayıp sonuçları yayınlayın" },
  { no: 5, rol: "admin", sekme: null, roleAd: "Eğitim Yöneticisi",
    aciklama: "Öğretmenin yayınladığı sonuçlar analiz ekranına ve kazanım ısı haritasına düştü.",
    sonraki: "Demoyu Bitir",
    hazir: function () { return true; },
    kilit: "" },
];

/** Demo Akışı'nda bir adıma geçer: SADECE rol ve sekme ayarlar. */
function demoAdimaGit(no) {
  const a = DEMO_ADIMLARI.find(function (x) { return x.no === no; });
  if (!a) return;
  state.demoAdim = no;
  state.role = a.rol;
  if (a.rol === "content_expert" && a.sekme) state.ceTab = a.sekme;
  if (a.rol === "teacher" && a.sekme) state.teacherTab = a.sekme;
  if (a.rol === "student" && a.sekme) state.studentTab = a.sekme;
  /* Demo, giriş kapısını kapatır — rehber zaten nereye gidileceğini söylüyor. */
  const kapi = document.getElementById("girisKapisi");
  if (kapi && !kapi.hidden) { kapi.hidden = true; document.body.style.overflow = ""; }
  renderAll();
}

/** Rehberli demoyu kapatır. Üretilen veriye DOKUNMAZ; yalnızca yönlendirmeyi
    sonlandırır. Veriyi temizlemek isteyen mevcut "Sıfırla" düğmesini kullanır. */
function demoBitir() {
  state.demoAdim = null;
  renderAll();
}

/** Üst çubuktaki demo şeridi. Demo kapalıysa boş dizedir. */
function demoSeridiHtml() {
  const a = DEMO_ADIMLARI.find(function (x) { return x.no === state.demoAdim; });
  if (!a) return "";
  const son = a.no === DEMO_ADIMLARI.length;
  const acik = a.hazir();
  return '<div class="demo-serit">' +
    '<span class="demo-rozet">Demo Akışı</span>' +
    '<span class="demo-adim tabular">Adım ' + a.no + "/" + DEMO_ADIMLARI.length + "</span>" +
    '<span class="demo-metin"><b>' + escapeHtml(a.roleAd) + ":</b> " + escapeHtml(a.aciklama) + "</span>" +
    (!acik && a.kilit ? '<span class="demo-kilit">' + escapeHtml(a.kilit) + "</span>" : "") +
    '<span class="demo-dugmeler">' +
    '<button type="button" class="btn btn-primary btn-sm js-demo-ileri"' + (acik ? "" : " disabled") +
      (acik ? "" : ' title="' + escapeHtml(a.kilit) + '"') + ">" + escapeHtml(a.sonraki) + "</button>" +
    (son ? "" : '<button type="button" class="btn btn-secondary btn-sm js-demo-bitir">Demoyu Bitir</button>') +
    "</span></div>";
}

/* TUZAK 1/1B: şerit tek örnek olsa da düğmeler id ile DEĞİL, kendine özgü
   sınıflarla (.js-demo-ileri / .js-demo-bitir) ve querySelectorAll ile
   bağlanır; mevcut hiçbir paylaşılan sınıf yeniden kullanılmadı. */
function renderDemoSerit() {
  const yuva = document.getElementById("demoSeritYuva");
  if (!yuva) return;
  yuva.innerHTML = demoSeridiHtml();
  document.querySelectorAll(".js-demo-ileri").forEach(function (b) {
    b.onclick = function () {
      const a = DEMO_ADIMLARI.find(function (x) { return x.no === state.demoAdim; });
      if (!a || !a.hazir()) return;                 // kilit: insan aksiyonu şart
      if (a.no === DEMO_ADIMLARI.length) { demoBitir(); return; }
      demoAdimaGit(a.no + 1);
    };
  });
  document.querySelectorAll(".js-demo-bitir").forEach(function (b) { b.onclick = demoBitir; });
}

/* DEMO SAHNESİ — sınıfın geri kalanı için TAMAMLANMIŞ oturumlar.

   🔴 NEDEN GEREKTİ: Yönetici istatistikleri uydurma sabitlerden alınıp gerçek
   oturumlardan hesaplanır hâle getirilince (§25b), demo senaryosu yüklendiğinde
   Eğitim Yöneticisi paneli haklı olarak "%0 · 0/4" göstermeye başladı — çünkü
   senaryo sınavı "çözülüyor" durumunda bırakıyor ve gerçekten kimse bitirmemiş
   oluyordu. Doğru çözüm sayıyı geri uydurmak DEĞİL, sahnede gerçekten
   tamamlanmış oturumlar oluşturmaktır: ısı haritası, kalibrasyon ve karar
   günlüğü artık gerçek kayıtlardan doluyor.

   DÜRÜSTLÜK SINIRI (§6.3-5):
   - Bu öğrenciler `demo: true` işaretlenir; arayüzde "simüle" rozetiyle çıkar.
   - Denetim izine yazılan model adı "yerel simülasyon (model çağrılmadı)"dır;
     §21d'de düzeltilen "yalancı denetim izi" hatası tekrarlanmaz.
   - Aktif öğrenci DIŞARIDA bırakılır: sunumu yapan kişi zinciri (çöz → değerlendir
     → onayla → karne) canlı ve gerçek modelle gösterebilsin.
   - Hiçbir sayı sabit değildir; hepsi buradaki oturumlardan HESAPLANIR. */
function demoSinifOturumlari() {
  const kayit = state.exams.find(function (x) { return x.id === state.activeExamId; });
  if (!kayit) return 0;
  const mcler = state.questions.filter(function (q) { return q.type === "mc"; });
  const acik = state.questions.find(function (q) { return q.type === "open"; });
  const rub = acik ? state.rubrics[acik.id] : null;
  if (!acik || !rub) return 0;

  const SIMULE_MODEL = "yerel simülasyon (model çağrılmadı)";
  // Üç farklı başarı düzeyi: ısı haritası ve madde analizi ayrışsın diye
  // ÇSS doğruluğu da öğrenciden öğrenciye değişir.
  const desenler = [
    { mc: [true, true],   ai: 16, nihai: 16, karar: "approved_as_is", guven: 0.88,
      yanit: "Dengelenmemiş kuvvetler cismin hızını değiştirir. Duran bir topa vurulduğunda top hareket eder. Sürtünme ise harekete zıt yönde etki edip topu yavaşlatır, bu yüzden top bir süre sonra durur.",
      kirilim: [8, 5, 3],
      gerekce: ["Dengelenmemiş kuvvet ile hız değişimi arasındaki ilişkiyi ve sürtünmenin yönünü doğru kurmuş.",
                "Topa vurma örneğini vermiş ancak sürtünmeye ait ayrı bir örnek eklememiş.",
                "Anlatım anlaşılır fakat cümleler kısa; nedensellik bağlaçları zayıf."] },
    { mc: [true, false],  ai: 13, nihai: 11, karar: "revised", guven: 0.62,
      yanit: "Kuvvet cismi hareket ettirir. Sürtünme de onu yavaşlatır ama nasıl olduğunu tam bilmiyorum.",
      kirilim: [5, 3, 3],
      gerekce: ["Kuvvetin hareketi başlattığını söylemiş ama dengelenmiş/dengelenmemiş ayrımına girmemiş.",
                "Hiç örnek vermemiş; kavram günlük hayatla ilişkilendirilmemiş.",
                "İfade açık ancak öğrenci bilmediğini belirterek açıklamayı yarıda bırakmış."] },
    { mc: [false, true],  ai: 7,  nihai: 7,  karar: "approved_as_is", guven: 0.71,
      yanit: "Kuvvet itmek ve çekmektir. Sürtünme kuvveti vardır.",
      kirilim: [4, 1, 2],
      gerekce: ["Kuvvetin tanımını vermiş ama sorunun sorduğu HAREKETE etkisini hiç açıklamamış.",
                "Örnek yok; sürtünme yalnızca adıyla anılmış.",
                "İki cümlelik yanıt kazanımı karşılamak için yeterli değil."] },
  ];

  const digerleri = (state.students || []).filter(function (s) { return s.id !== state.activeStudentId; });
  let yazilan = 0;

  digerleri.forEach(function (ogr, i) {
    const d = desenler[i % desenler.length];
    ogr.demo = true;                       // arayüzde "simüle" rozeti
    const ss = sessionOf(kayit, ogr.id);   // ürünün kendi oturum yazıcısı (§3.2)
    ss.answers = {}; ss.mcResults = {}; ss.aiEvals = {}; ss.reviews = {};

    mcler.forEach(function (q, j) {
      const dogruMu = !!d.mc[j % d.mc.length];
      // Yanlış cevapta doğru şıkkın DIŞINDA bir şık seçilmeli.
      const yanlisSik = (q.options || []).find(function (o) { return o.key !== q.correctKey; });
      ss.answers[q.id] = { selectedKey: dogruMu ? q.correctKey : (yanlisSik ? yanlisSik.key : q.correctKey) };
      ss.mcResults[q.id] = { correct: dogruMu };
    });

    ss.answers[acik.id] = { text: d.yanit, savedAt: Date.now() };
    ss.aiEvals[acik.id] = {
      aiScore: d.ai,
      confidence: d.guven,
      breakdown: rub.criteria.map(function (c, k) {
        const tavan = Math.round(rub.maxScore * (c.weight / 100) * 10) / 10;
        return { label: c.label, points: Math.min(d.kirilim[k] != null ? d.kirilim[k] : 0, tavan), max: tavan,
                 reason: (d.gerekce || [])[k] || "" };
      }),
      /* Simüle olduğu ÖZET satırında açıkça yazar; öğrenci çipinde "simüle"
         rozeti, denetim izinde "model çağrılmadı" kaydı vardır. Kriter
         gerekçeleri anlamlı yazıldı çünkü yer tutucu metin öğretmene de
         jüriye de hiçbir şey göstermiyordu (§6.3-5: gizleme yok, ETİKETLE). */
      justification: "Demo senaryosunun parçası olan simüle sınıf verisidir; bu yanıt için model çağrılmadı.",
      studentFeedback: "Açıklamanı örneklerle biraz daha genişletmen gerekiyor.",
      model: SIMULE_MODEL, simulated: true
    };
    ss.reviews[acik.id] = { finalScore: d.nihai, comment: "", decision: d.karar, aiScore: d.ai };
    ss.examStatus = "graded";

    auditKaydet("degerlendirme_onerildi", { qid: acik.id, sid: ogr.id,
      soru: auditKisalt(acik.body), aiScore: d.ai, model: SIMULE_MODEL });
    auditKaydet("puan_karari", { qid: acik.id, sid: ogr.id,
      soru: auditKisalt(acik.body), aiScore: d.ai, finalScore: d.nihai,
      degisti: Math.abs(d.nihai - d.ai) > 0.001, model: SIMULE_MODEL });
    yazilan++;
  });

  return yazilan;
}

/* ==================== Model bekleme göstergesi ====================
   Model 10-17 saniye sürüyor. Sayaç olmadan ekran donmuş gibi görünüyor. */
let busySince = 0;
function tickBusy() {
  const el = document.getElementById("busyTimer");
  if (!el) return;
  el.textContent = Math.round((Date.now() - busySince) / 1000) + " sn";
}

/* Çoktan seçmeli soru başına varsayılan puan.

   BURADA TANIMLI, `mcPuani()`'nin yanında DEĞİL: aşağıdaki `state` nesnesi
   bu değeri `exam.mcPoint` başlangıcı olarak kullanıyor. `const` hoist
   edilmez (temporal dead zone) — tanım `state`'ten sonra kalırsa sayfa
   "Cannot access 'MC_VARSAYILAN_PUAN' before initialization" ile açılışta
   ölür. Bu bir kez yaşandı; tarayıcıda çalıştırılmasa fark edilmezdi.
   Gerekçe ve kullanım için `mcPuani()` / `examTotalPoints()`. */
const MC_VARSAYILAN_PUAN = 5;

/* ============================== Durum ============================== */
const state = {
  role: "content_expert",
  teacherTab: 1,
  studentTab: 1,
  genCount: 0,
  /* Öğretmen kimliği — SEÇENEK A: PROTOTİP DİSİPLİNİ (§29 — Eğitim Yöneticisi
     karnesi). Bu projede kimlik doğrulama yoktur (bkz. schema.sql §10 notu);
     tam bir auth sistemi kurmak yerine öğretmen kendi adını burada YAZAR/SEÇER.
     Bu ada sahip sınav kayıtları (`exam.teacherName`) Eğitim Yöneticisi
     panelindeki "hangi öğretmenin hangi onayları" sorusunun cevabıdır.
     Boşsa `VARSAYILAN_OGRETMEN_ADI`'na düşer (bkz. teacherRoster). */
  activeTeacherName: "",
  // Eğitim Yöneticisi panelinde seçili öğretmen karnesi (yalnızca UI durumu,
  // kalıcı DEĞİL — sayfa yenilenince listeye geri döner).
  adminSelectedTeacher: null,
  ai: { mode: "unknown", provider: "", model: "", error: "", busy: false, fallback: null, usingFallback: false },
  remedial: null, // { outcomeCode, sinif, deger } — analizden gelen tekrar sorusu talebi
  integrity: { active: false, fsGranted: false, tabSwitch: 0, blur: 0, fsExit: 0,
               pasteCount: 0, pasteChars: 0, awaySec: 0, _awayFrom: 0, events: [] },
  outcomes: VARSAYILAN_KAZANIMLAR.slice(),
  subjects: VARSAYILAN_DERSLER.slice(),
  newOutcome: { open: false, code: "", label: "", error: "" },
  ceTab: 1,
  pdf: null, // { ad, sayfaSayisi, from, to } — sayfa metinleri bellekte (pdfPages)

  poolFilter: { outcome: "", difficulty: "", type: "", sube: "" },
  editingQid: null, // öğretmenin havuzda düzenlediği soru
  rubricError: "",
  poolError: "",
  critDescOpen: null,
  /* §32 (Burak Modül 2): Reddedilenler havuzunun açık/kapalı durumu ROL
     BAŞINA ayrı tutulur. Eskiden tek bir `rejectedOpen` vardı; beş panelin
     DOM'u aynı anda render edildiği için İçerik Uzmanı ve Öğretmen aynı
     düğmeyi paylaşıyor, birinde yapılan aç/kapa diğerini de etkiliyordu. */
  rejectedOpenByRole: { ce: false, teacher: false },
  /* §38 — Demo Akışı'nın bulunduğu adım (null = demo kapalı, 1..5).
     KALICI_ALANLAR'a BİLEREK eklenmedi: sayfa yenilenince demo kapanır ve
     normal kullanım hiç etkilenmez. Bu alan yalnızca YÖNLENDİRME durumudur;
     hiçbir ürün verisi taşımaz. */
  demoAdim: null,
  evalCache: {},
  simRunning: false,
  simStatus: null,

  ceForm: { title: "", subject: VARSAYILAN_DERSLER[0], grade: 7, sube: "", outcomeCode: VARSAYILAN_KAZANIMLAR[0].code, text: "", error: "", mcCount: 2, openCount: 1, showAllOutcomes: false, ocrLoading: false, ocrProgress: "", bloomFocus: "dengeli",
    /* §31 — ÜRETİM DAYANAĞI. "kaynak" varsayılandır ve eski davranışın
       birebir aynısıdır. "kazanim" modunda kaynak metin istenmez; dayanak
       MEB kazanımıdır ve öğretmen isterse serbest bir yönerge yazar. */
    mode: "kaynak", guidance: "" },
  questions: [],
  rubrics: {},
  rubricSelectedQ: null,
  students: [],       // sınıf listesi
  activeStudentId: null,
  exams: [],          // kaydedilmiş sınavlar
  activeExamId: null, // düzenlenen / çözülen sınav
  exam: { title: "", questionIds: [], timeOverrides: {}, status: "draft", durationMin: 10,
          startMode: "now", startAtLocal: "", startDelaySec: 0, startsAt: null, endsAt: null,
          // Çoktan seçmeli soru başına puan (öğretmen belirler) — bkz. mcPuani()
          mcPoint: MC_VARSAYILAN_PUAN,
          // §28r: boşsa TÜM sınıflara yayınlanır; doluysa yalnızca o sınıf görür.
          targetClass: "",
          // §29: bu sınavı hangi öğretmen değerlendiriyor (bkz. state.activeTeacherName).
          teacherName: "" },
  syncRoom: "",   // cihazlar arası senkron sınıf kodu (§28b)
  parentStudentId: null,  // veli panelinde seçili çocuk (§28f, simüle)
  answers: {},
  // Madde 5: öğrencinin "gözden geçir" için işaretlediği sorular (qid -> true).
  // Yanıtlanmış/yanıtlanmamış durumundan BAĞIMSIZ bir etikettir; puanlamayı
  // hiçbir şekilde etkilemez, yalnızca öğrencinin kendi gezinmesine yardımcı olur.
  flagged: {},
  examStatus: "not_started",
  currentQIndex: 0,
  remainingSec: 0,
  aiEvals: {},
  reviews: {},
  mcResults: {},
  misconceptions: {},
  alignment: {},
  sources: [],
  // Yapay zekâ karar günlüğü (denetim izi).
  auditLog: [],
  auditDusen: 0,
  // Müfredat Kitaplığı indeksi. İçerik (sayfa metinleri) IndexedDB'dedir;
  // burada yalnızca listelemeye yetecek küçük üstveri durur.
  library: [],
  baseline: {
    /* 🔴 KALDIRILDI: totalAssigned/totalCompleted/pendingApprovalsOther.
       Bu üç sabit, Eğitim Yöneticisi panelindeki kutuları besliyordu ve
       ekranda "%88,8 · 142/160 sınav tamamlandı" gibi UYDURMA bir sayı
       çıkarıyordu — üstelik hemen altındaki ısı haritası aynı ekranda
       "7-A (0/2)" diyordu. Gerekçe ve yerine geçen hesap için
       `okulGercekDurum()` fonksiyonunun başındaki nota bakın.
       `classes` KALDI: onlar ısı haritasında "(örnek)" etiketiyle görünen
       karşılaştırma satırlarıdır, etiketli oldukları için yanıltmazlar. */
    classes: [
      // Karşılaştırma amaçlı okul geneli örnek veriler. Gerçek şubelerle
      // (7-A, 7-B) karışmasın diye bilinçli olarak farklı düzeyler seçildi.
      { name: "6-A", scores: { "MAT.7.2.1": 72, "MAT.7.3.4": 58, "FEN.7.1.2": 81 } },
      { name: "8-B", scores: { "MAT.7.2.1": 65, "MAT.7.3.4": 70, "FEN.7.1.2": 60 } },
      { name: "8-C", scores: { "MAT.7.2.1": 84, "MAT.7.3.4": 77, "FEN.7.1.2": 69 } },
    ],
    /* ===========================================================================
       ÖĞRETMEN KALİBRASYON KARŞILAŞTIRMASI (§29 — Eğitim Yöneticisi karnesi)
       ===========================================================================
       NEDEN: Brief demo/jüri anında kurumda birden fazla öğretmen listelenmesini
       istiyor ama bu prototipte kimlik doğrulama yok (bkz. §10 notu, schema.sql).
       Gerçek çoklu-kullanıcı üretmek yerine — `classes` ile AYNI disiplinle —
       üç öğretmen için HAM (ai, nihai) puan çiftleri tanımlanır; yüzde/uyum gibi
       HİÇBİR türetilmiş sayı burada sabitlenmez, hepsi `calibrationFromRecords()`
       ile aynı formülden HESAPLANIR (§6.3-5: uydurma yasak, ETİKETLİ örnek olur).

       Bu satırlar yalnızca aynı isimde GERÇEK bir sınav kaydı (kayit.teacherName)
       yokken gösterilir (bkz. teacherRoster) ve arayüzde her zaman "örnek veri"
       rozetiyle çıkar — ısı haritasındaki "(örnek)" satırlarıyla aynı sözleşme. */
    teachers: [
      { name: "Ahmet Yılmaz", subject: "Matematik", records: [
        { ogrenci: "Öğrenci A", soru: "Bir doğrusal denklemi gerçek hayat problemine uygulayarak çözünüz.", maxScore: 20, ai: 15, nihai: 13, confidence: 0.86 },
        { ogrenci: "Öğrenci B", soru: "Cebirsel ifadeyi sadeleştirip sonucu yorumlayınız.",                 maxScore: 20, ai: 12, nihai: 10, confidence: 0.58 },
        { ogrenci: "Öğrenci C", soru: "Verilen tabloyu kullanarak orantı kurunuz ve açıklayınız.",           maxScore: 20, ai: 18, nihai: 17, confidence: 0.91 },
        { ogrenci: "Öğrenci D", soru: "Bir doğrusal denklemi gerçek hayat problemine uygulayarak çözünüz.", maxScore: 20, ai: 10, nihai: 8,  confidence: 0.49 },
        { ogrenci: "Öğrenci E", soru: "Cebirsel ifadeyi sadeleştirip sonucu yorumlayınız.",                 maxScore: 20, ai: 14, nihai: 13, confidence: 0.73 },
        { ogrenci: "Öğrenci F", soru: "Verilen tabloyu kullanarak orantı kurunuz ve açıklayınız.",           maxScore: 20, ai: 16, nihai: 15, confidence: 0.82 },
      ] },
      { name: "Ayşe Kaya", subject: "Fen Bilgisi", records: [
        { ogrenci: "Öğrenci A", soru: "Dengelenmemiş kuvvetlerin cisme etkisini örnekle açıklayınız.", maxScore: 20, ai: 12, nihai: 13, confidence: 0.77 },
        { ogrenci: "Öğrenci B", soru: "Fotosentez ve solunum arasındaki ilişkiyi karşılaştırınız.",     maxScore: 20, ai: 14, nihai: 15, confidence: 0.68 },
        { ogrenci: "Öğrenci C", soru: "Bir maddenin hâl değişimini enerji alışverişiyle açıklayınız.",  maxScore: 20, ai: 9,  nihai: 10, confidence: 0.52 },
        { ogrenci: "Öğrenci D", soru: "Dengelenmemiş kuvvetlerin cisme etkisini örnekle açıklayınız.", maxScore: 20, ai: 17, nihai: 18, confidence: 0.89 },
        { ogrenci: "Öğrenci E", soru: "Fotosentez ve solunum arasındaki ilişkiyi karşılaştırınız.",     maxScore: 20, ai: 11, nihai: 12, confidence: 0.61 },
        { ogrenci: "Öğrenci F", soru: "Bir maddenin hâl değişimini enerji alışverişiyle açıklayınız.",  maxScore: 20, ai: 15, nihai: 15, confidence: 0.84 },
      ] },
      { name: "Mehmet Demir", subject: "Türkçe", records: [
        { ogrenci: "Öğrenci A", soru: "Okuduğunuz metnin ana fikrini gerekçeleriyle yazınız.",       maxScore: 20, ai: 16, nihai: 16,   confidence: 0.9  },
        { ogrenci: "Öğrenci B", soru: "Metindeki söz sanatlarından birini örnekle açıklayınız.",       maxScore: 20, ai: 14, nihai: 14,   confidence: 0.71 },
        { ogrenci: "Öğrenci C", soru: "Verilen paragrafı kendi cümlelerinizle özetleyiniz.",           maxScore: 20, ai: 18, nihai: 18,   confidence: 0.93 },
        { ogrenci: "Öğrenci D", soru: "Okuduğunuz metnin ana fikrini gerekçeleriyle yazınız.",       maxScore: 20, ai: 12, nihai: 12,   confidence: 0.55 },
        { ogrenci: "Öğrenci E", soru: "Metindeki söz sanatlarından birini örnekle açıklayınız.",       maxScore: 20, ai: 10, nihai: 10.5, confidence: 0.64 },
        { ogrenci: "Öğrenci F", soru: "Verilen paragrafı kendi cümlelerinizle özetleyiniz.",           maxScore: 20, ai: 17, nihai: 17,   confidence: 0.88 },
        { ogrenci: "Öğrenci G", soru: "Okuduğunuz metnin ana fikrini gerekçeleriyle yazınız.",       maxScore: 20, ai: 9,  nihai: 9,     confidence: 0.6  },
      ] },
    ],
  },
};

// §29: kayıt bir öğretmen adı taşımıyorsa (eski sınav / hiç girilmemiş) burada
// biriktirilir. Gerçek bir kullanıcı adı DEĞİLDİR, yalnızca listede boş
// bırakılmasın diye konmuş bir etiket olduğu ismiyle bellidir.
const VARSAYILAN_OGRETMEN_ADI = "İsimsiz Öğretmen";

/* §34 — ÖĞRETMEN KADROSU (hızlı seçim listesi).

   NEDEN AYRI BİR LİSTE: Üç öğretmen zaten `state.baseline.teachers` içinde
   vardı ama oraya bir ad eklemek, o ada AİT UYDURMA PUANLAMA KAYDI da eklemek
   demek — orası kalibrasyon karnesini besleyen ham (ai, nihai) puan çiftlerini
   tutuyor. Yalnızca "seçilebilir isim" eklemek için oraya dokunulmadı
   (§6.3-5: uydurma sayı yasak). Buradaki adların puan verisi YOKTUR; biri
   seçilip gerçekten sınav değerlendirirse kalibrasyon karnesi o GERÇEK
   kayıtlardan hesaplanır (bkz. teacherRoster / teacherExamRecords).

   Bu liste yalnızca bir kolaylıktır: alan hâlâ serbest metindir, buradaki
   adlar bir kısıt değildir. Kendi okulunuzun öğretmenleriyle değiştirmek
   için yalnızca bu diziyi düzenleyin. */
const OGRETMEN_KADROSU = [
  { name: "Ahmet Yılmaz", subject: "Matematik" },
  { name: "Ayşe Kaya", subject: "Fen Bilimleri" },
  { name: "Mehmet Demir", subject: "Türkçe" },
  { name: "Zeynep Arslan", subject: "Türkçe" },
  { name: "Emre Şahin", subject: "Matematik" },
  { name: "Fatma Öztürk", subject: "Fen Bilimleri" },
];

/* §34 — Hızlı seçim çiplerinde gösterilecek adlar.
   Sıra: önce bu sistemde GERÇEKTEN sınav değerlendirmiş adlar, sonra kadro.
   Aynı ad iki kez görünmez. Gerçek olanlar `gercek:true` ile işaretlenir —
   ısı haritası ve teacherRoster'daki "(örnek)" sözleşmesiyle aynı mantık:
   örnek olan hiçbir zaman gerçek gibi gösterilmez. */
function ogretmenSecenekleri() {
  const gorulen = {};
  const liste = [];
  (state.exams || []).forEach(function (k) {
    const ad = String((k && k.teacherName) || "").trim();
    if (!ad || gorulen[ad]) return;
    gorulen[ad] = true;
    liste.push({ name: ad, subject: null, gercek: true });
  });
  OGRETMEN_KADROSU.forEach(function (t) {
    if (gorulen[t.name]) return;
    gorulen[t.name] = true;
    liste.push({ name: t.name, subject: t.subject, gercek: false });
  });
  return liste;
}

function findQuestion(id) { return state.questions.find(function (q) { return String(q.id) === String(id); }); }
function outcomeLabel(code) { const o = OUTCOMES_LIST().find(function (x) { return x.code === code; }); return o ? o.label : code; }
/* Madde 2: kazanımın müfredat kataloğundaki konu alanı ("alan") — yalnızca
   katalogdan seçilmiş kazanımlarda dolu (bkz. kazanimSecildi). Model
   istemine ek BAĞLAM olarak gider, kazanım filtrelemesini etkilemez. */
function outcomeAlan(code) { const o = OUTCOMES_LIST().find(function (x) { return x.code === code; }); return (o && o.alan) || ""; }

/* ===========================================================================
   KAZANIM META BİLGİSİ — ders ve sınıf bağlaması
   ===========================================================================
   BULUNAN HATA (kullanıcı bildirdi): Kaynak içerik formundaki dört alan
   birbirinden tamamen bağımsızdı. Ders "Türkçe", kazanım "MAT.7.3.4 —
   Cebirsel İfadeler", başlık "Kuvvet ve Hareket" olabiliyordu. Hiçbir alan
   diğerini kısıtlamıyordu; üretilen soru da bu tutarsız bağlamla üretiliyordu.

   ÇÖZÜM: Kazanım nesnesine `subject` ve `grade` eklendi. Seçici varsayılan
   olarak yalnızca seçili ders + sınıfa ait kazanımları gösterir.

   SERT ENGELLEME YOK — öğretmen "tümünü göster" diyebilir. Amaç yasaklamak
   değil, yanlışı görünür kılmak (agents.md §7.1 ile aynı mantık: karar
   insanda). Uyuşmazlık varsa ekranda gerekçeli uyarı çıkar.

   GERİYE DÖNÜK UYUM: Alanı olmayan eski kazanımlar (localStorage'da duran
   kayıtlar) elenmez; kod önekinden çıkarım yapılır, çıkarılamıyorsa kazanım
   "tüm dersler" sayılır ve veri kaybı olmaz.
   =========================================================================== */

/* Kod öneki -> ders eşlemesi. MEB kodlama geleneğine dayanır:
   MAT.7.2.1 (Matematik), FEN.7.1.2 (Fen), T.O.7.5 (Türkçe-Okuma),
   SOS.7.1.1 (Sosyal Bilgiler), ING.7.1.1 (İngilizce). */
var KOD_DERS_ONEK = [
  { re: /^MAT\./i, ders: "Matematik" },
  { re: /^FEN\./i, ders: "Fen Bilimleri" },
  { re: /^T\.[DOKY]\./i, ders: "Türkçe" },
  { re: /^TUR\.|^TÜR\./i, ders: "Türkçe" },
  { re: /^SOS\./i, ders: "Sosyal Bilgiler" },
  { re: /^ING\./i, ders: "İngilizce" }
];

/** Kazanım kodundan dersi çıkarır; çıkaramazsa "" döner. */
function kodDanDers(code) {
  const k = String(code || "");
  for (let i = 0; i < KOD_DERS_ONEK.length; i++) {
    if (KOD_DERS_ONEK[i].re.test(k)) return KOD_DERS_ONEK[i].ders;
  }
  return "";
}

/** Kazanım kodundan sınıfı çıkarır (MAT.7.2.1 -> 7); çıkaramazsa "" döner. */
function kodDanSinif(code) {
  const m = String(code || "").match(/\.(\d{1,2})\./);
  if (!m) return "";
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 12 ? n : "";
}

/* Eski kayıtlarda subject/grade yok. Açılışta kod önekinden doldurulur;
   böylece localStorage'daki veriler de tutarlı hale gelir. Çıkarılamayan
   kodlar boş bırakılır ve filtreye takılmaz. */
function ensureOutcomeMeta() {
  const liste = state.outcomes && state.outcomes.length ? state.outcomes : null;
  if (!liste) return;
  liste.forEach(function (o) {
    if (!o.subject) { const d = kodDanDers(o.code); if (d) o.subject = d; }
    if (!o.grade) { const g = kodDanSinif(o.code); if (g) o.grade = g; }
  });
}

/** Kazanım seçili ders/sınıfa uyuyor mu? Alanı yoksa uyar sayılır. */
function outcomeUyar(o, ders, sinif) {
  if (o.subject && ders && o.subject !== ders) return false;
  if (o.grade && sinif && String(o.grade) !== String(sinif)) return false;
  return true;
}

/** Seçili ders/sınıfa uyan kazanımlar. */
function uygunKazanimlar() {
  return OUTCOMES_LIST().filter(function (o) {
    return outcomeUyar(o, state.ceForm.subject, state.ceForm.grade);
  });
}

/**
 * Ders/sınıf değiştiğinde seçili kazanım artık uymuyorsa, uyan ilk kazanıma
 * geçilir. Uyan hiç kazanım yoksa seçim OLDUĞU GİBİ BIRAKILIR — sessizce
 * boşaltmak öğretmenin seçimini kaybettirir; bunun yerine ekranda uyarı çıkar.
 */
function outcomeSeciminiTazele() {
  const secili = OUTCOMES_LIST().filter(function (o) { return o.code === state.ceForm.outcomeCode; })[0];
  // Mevcut seçim zaten uyuyorsa dokunma.
  if (secili && outcomeUyar(secili, state.ceForm.subject, state.ceForm.grade)) return;

  const uygun = uygunKazanimlar();
  if (uygun.length) { state.ceForm.outcomeCode = uygun[0].code; return; }

  /* MADDE 2 (kullanıcı bildirdi): Eskiden burada `return` vardı — uymayan
     kazanım seçili KALIYORDU. Sonuç: 8. sınıf seçince ekranda hâlâ 7. sınıf
     kazanımı duruyor ve "kazanım ile sınıf birbirini tutmuyor" uyarısı
     çıkıyordu. Kullanıcının haklı itirazı: seçimi ben değiştirmedim, sınıfı
     değiştirdim; sistem bana kendi bıraktığı tutarsızlığı hata gibi
     gösteriyor.
     Doğru davranış: uyan kazanım yoksa seçimi BOŞALT. Bu sessiz bir kayıp
     değildir — kazanım notu satırı "bu ders/sınıf için kazanım tanımlı
     değil, Katalog'dan ekleyin" diyerek ne yapılacağını söyler. */
  state.ceForm.outcomeCode = "";
}

/**
 * Kazanım seçeneklerini üretir. Varsayılan: yalnızca seçili ders + sınıfa
 * ait olanlar. Seçili kazanım uymasa bile listede kalır — aksi halde
 * <select> onu gösteremez ve öğretmenin seçimi sessizce değişmiş görünür.
 */
/* ============ KATALOG KAZANIMLARININ SEÇİCİYE GETİRİLMESİ ============
   TASARIM KARARI — neden OUTCOMES_LIST()'e karıştırılmıyor:
   `OUTCOMES_LIST()` ısı haritasının SÜTUNLARINI üretiyor. Katalog oraya
   dökülseydi 8. sınıf Türkçe'de 98 sütunlu, kullanılamaz bir tablo çıkardı.
   Bu yüzden katalog yalnızca SORU ÜRETİM SEÇİCİSİNDE görünür; öğretmen bir
   kazanım seçtiği anda o kazanım `state.outcomes`'a eklenir ve ancak o zaman
   ısı haritasına, filtrelere ve analitiğe girer. Yani "okulun çalıştığı
   kazanımlar" listesi kullanıldıkça büyür, baştan 606 kayıtla dolmaz. */

/** Seçili ders/sınıfın kataloğu bellekte varsa kazanımlarını döndürür. */
function katalogKazanimlari() {
  const anahtar = katalogAnahtari(state.ceForm.subject, state.ceForm.grade);
  const k = (state.katalog || {})[anahtar];
  if (!k || !k.kazanimlar) return [];
  return k.kazanimlar.map(function (x) {
    return { code: x.kod, label: x.kod + " — " + x.metin, subject: k.ders,
             grade: k.sinif, uygunluk: x.uygunluk, alan: x.alan,
             grup: x.grup || x.alan || "", katalogdan: true };
  });
}

/**
 * Ders/sınıf değiştiğinde kataloğu arka planda yükler ve ekranı tazeler.
 * Sessiz başarısızlık YOK: yüklenemezse kazanım notu satırında yazar.
 */
/* Hangi katalog anahtarı için yükleme DENENDİ (başarılı ya da başarısız).
   §28n: `katalogHazirla()` artık `renderContentExpert()` içinden de çağrılıyor,
   yani her çizimde tetikleniyor. Hata yolunda `renderAll()` var; bu bayrak
   olmasaydı kalıcı bir ağ hatasında "yükle → hata → renderAll → yükle"
   sonsuz döngüsü oluşurdu. Kullanıcı ders/sınıfı ELLE değiştirdiğinde
   `katalogHazirla(true)` ile bayrak aşılır, yani yeniden deneme mümkündür. */
const katalogDenendi = {};

async function katalogHazirla(yenidenDene) {
  const anahtar = katalogAnahtari(state.ceForm.subject, state.ceForm.grade);
  if (!MUFREDAT_KATALOGLARI[anahtar]) { state.katalogHata = ""; return; }
  if ((state.katalog || {})[anahtar]) return;
  if (katalogDenendi[anahtar] && !yenidenDene) return;
  katalogDenendi[anahtar] = true;
  try {
    state.katalogHata = "";
    await katalogYukle(state.ceForm.subject, state.ceForm.grade);
    outcomeSeciminiTazele();
    renderAll();
  } catch (e) {
    state.katalogHata = "Kazanım kataloğu yüklenemedi: " + String((e && e.message) || e);
    renderAll();
  }
}

/** Seçilen kod katalogdan geliyorsa kalıcı listeye taşı. */
function kazanimSecildi(kod) {
  state.ceForm.outcomeCode = kod;
  if (!kod) return;
  if (OUTCOMES_LIST().some(function (o) { return o.code === kod; })) return;
  const k = katalogKazanimlari().filter(function (o) { return o.code === kod; })[0];
  if (!k) return;
  // Katalogdan seçilen kazanım artık okulun çalıştığı kazanımlardan biridir.
  state.outcomes = OUTCOMES_LIST().concat([{
    code: k.code, label: k.label, subject: k.subject, grade: k.grade,
    uygunluk: k.uygunluk, alan: k.alan,
  }]);
  saveSoon();
}

function kazanimSecenekleriHtml() {
  const hepsi = OUTCOMES_LIST();
  const gosterilecek = state.ceForm.showAllOutcomes
    ? hepsi
    : hepsi.filter(function (o) {
        return outcomeUyar(o, state.ceForm.subject, state.ceForm.grade) ||
               o.code === state.ceForm.outcomeCode;
      });
  // Yer tutucu AŞAĞIDA hesaplanır: metni, seçilebilir kazanım olup olmamasına
  // göre değişir ve bunu bilmek için katalog listesinin de hesaplanmış olması
  // gerekir.
  const secenek = function (o, uyarEtiketi) {
    const uyar = outcomeUyar(o, state.ceForm.subject, state.ceForm.grade);
    // value özniteliği de kaçırılmalı: kod serbest metindir ve tırnak içeren
    // bir kod özniteliği kapatıp kendi HTML'ini yazabilirdi.
    return '<option value="' + escapeHtml(o.code) + '" ' +
      (o.code === state.ceForm.outcomeCode ? "selected" : "") + '>' +
      escapeHtml(o.label) + (uyarEtiketi && !uyar ? "  (başka ders/sınıf)" : "") + "</option>";
  };

  const eklenmisKodlar = {};
  hepsi.forEach(function (o) { eklenmisKodlar[o.code] = true; });

  /* KATALOG: seçili ders/sınıfın MEB kazanımları. Zaten eklenmiş olanlar
     tekrar gösterilmez. Varsayılan olarak YALNIZCA yazılı sınavla ölçülebilen
     kazanımlar listelenir — bir konuşma kazanımı çoktan seçmeli soruyla
     ölçülemez (PROGRESS §12c). "Tümünü göster" açıksa hepsi gelir. */
  const katalog = katalogKazanimlari().filter(function (o) {
    if (eklenmisKodlar[o.code]) return false;
    return state.ceForm.showAllOutcomes || o.uygunluk === "yazili";
  });

  const grupla = function (baslik, liste, uyarEtiketi) {
    if (!liste.length) return "";
    return '<optgroup label="' + escapeHtml(baslik) + '">' +
      liste.map(function (o) { return secenek(o, uyarEtiketi); }).join("") + "</optgroup>";
  };

  /* KONU + KAZANIM — iki katmanlı seçici (kullanıcı isteği).
     AYRI BİR "Konu" ALANI AÇILMADI. Sebep: konu bağımsız bir seçim değil,
     her kazanım tam olarak bir konuya ait. Ayrı alan olsaydı ders/sınıf/kazanım
     uyuşmazlığının (§14a) aynısı konu düzeyinde tekrarlanırdı — öğretmen
     "Kesirler" seçip "Geometri" kazanımı seçebilirdi.
     Bunun yerine konu, seçicinin içinde BAŞLIK olarak görünür.

     Gruplama dersin kendi yapısını izler, uydurulmaz:
       Fen / Matematik -> ünite ("3. Ünite · CANLILARIN YAPISINA YOLCULUK")
       Türkçe          -> beceri alanı (Okuma / Yazma / Dinleme / Konuşma)
     Türkçe'de kodda ünite YOKTUR; temalar kazanımlara diktir (aynı okuma
     kazanımı her temada çalışılır), bu yüzden tema dayatmak yanlış olurdu. */
  const konuGruplari = {};
  const konuSirasi = [];
  katalog.forEach(function (o) {
    const g = o.grup || "Diğer";
    if (!konuGruplari[g]) { konuGruplari[g] = []; konuSirasi.push(g); }
    konuGruplari[g].push(o);
  });

  /* Yer tutucu — seçim boşken <select>'te görünen satır.
     Metin DURUMA GÖRE değişir (kullanıcı isteği): eskiden her hâlükârda
     "— bu ders/sınıf için kazanım seçilmedi —" yazıyordu; bu hem soğuk bir
     ifadeydi hem de seçilecek 39 kazanım varken sanki hiç yokmuş gibi
     okunuyordu. Artık seçenek varsa DAVET eder, gerçekten yoksa durumu söyler. */
  const secilebilirVar = gosterilecek.length + katalog.length > 0;
  const yerTutucu = state.ceForm.outcomeCode
    ? ""
    : '<option value="" selected>' +
      (secilebilirVar ? "Bir kazanım seçin…" : "— bu ders/sınıf için kazanım yok —") +
      "</option>";

  return yerTutucu +
    (katalog.length
      ? grupla("Eklenen kazanımlar", gosterilecek, true) +
        konuSirasi.map(function (g) { return grupla(g, konuGruplari[g], false); }).join("")
      : gosterilecek.map(function (o) { return secenek(o, true); }).join(""));
}

/**
 * Kazanım seçicisinin altındaki bilgi satırı.
 *
 * 🔴 DÜZELTİLEN HATA: Bu satır SEÇİCİYİ YALANLIYORDU. Ölçüldü — Türkçe 7'de
 * seçicide 39 gerçek MEB kazanımı listeliyken (T.O.7.3 … T.Y.7.19) hemen
 * altında "0 kazanım · bu ders ve sınıf için henüz kazanım tanımlı değil.
 * Katalog düğmesiyle MEB müfredatından ekleyin." yazıyordu. 12 ders/sınıf
 * kombinasyonundan 10'unda çıkıyordu; varsayılan açılış (Türkçe · 7) de
 * bunlardan biriydi, yani ürünü ilk açan herkes bu çelişkiyi görüyordu.
 * Kalan 2 kombinasyonda da sayı yanlıştı (seçicide 31, satırda "2 kazanım").
 *
 * Kök neden: sayı `uygunKazanimlar()`'dan geliyordu; o yalnızca
 * `OUTCOMES_LIST()`'i (okula EKLENMİŞ kazanımları) süzer ve KATALOĞA hiç
 * bakmaz. Oysa `kazanimSecenekleriHtml()` kataloğu da listeler. İki fonksiyon
 * "neyin seçilebilir olduğu" konusunda anlaşmıyordu.
 *
 * Çözüm: sayı, seçicinin uyguladığı filtrenin BİREBİR AYNISIYLA hesaplanır.
 * Bu bir yanlış beyandı; §4.1-7'de aynı sınıftan bir yanlış beyan
 * ("AI önerisi onaylandı" denmesi) zaten düzeltilmişti.
 */
function kazanimNotuHtml() {
  const hepsi = OUTCOMES_LIST();
  const uygun = uygunKazanimlar();
  const gizli = hepsi.length - uygun.length;

  /* Seçicide GERÇEKTEN listelenenler. Aşağıdaki iki filtre
     `kazanimSecenekleriHtml()` ile birebir aynıdır; ayrışırlarsa bu satır
     yeniden seçiciyi yalanlamaya başlar. */
  const gosterilenEklenmis = state.ceForm.showAllOutcomes
    ? hepsi.length
    : hepsi.filter(function (o) {
        return outcomeUyar(o, state.ceForm.subject, state.ceForm.grade) ||
               o.code === state.ceForm.outcomeCode;
      }).length;
  const eklenmisKodlar = {};
  hepsi.forEach(function (o) { eklenmisKodlar[o.code] = true; });
  const katalogSecilebilir = katalogKazanimlari().filter(function (o) {
    if (eklenmisKodlar[o.code]) return false;
    return state.ceForm.showAllOutcomes || o.uygunluk === "yazili";
  }).length;
  const secilebilir = gosterilenEklenmis + katalogSecilebilir;

  const dersSinif = "<b>" + escapeHtml(state.ceForm.subject) + " · " +
    state.ceForm.grade + ". sınıf</b>";

  /* Sayı eki bilinçli olarak "tanesi" ile kuruldu. Türkçede ek sayının
     OKUNUŞUNA göre değişir ("39'u" ama "23'ü", "%100'ünü"); sabit bir ek her
     değerde doğru olamaz (§6.3-14 Türkçe ek tuzağı). "tanesi" her sayıda
     doğrudur. */
  const tumunuGoster = gizli
    ? ' <button type="button" class="oc-link" id="ceShowAllOutcomes">' +
      (state.ceForm.showAllOutcomes
        ? "yalnızca bu ders/sınıfı göster"
        : "başka ders/sınıfa ait " + gizli + " kazanım gizlendi — tümünü göster") +
      "</button>"
    : "";

  // GERÇEKTEN hiç seçenek yok: öğretmeni yönlendir, yoksa "0 kazanım"
  // yazısıyla baş başa kalır ve ne yapacağını bilemez.
  if (!secilebilir) {
    const katalogVar = !!MUFREDAT_KATALOGLARI[katalogAnahtari(state.ceForm.subject, state.ceForm.grade)];
    return '<span class="field-note">0 kazanım · ' + dersSinif +
      " · <b>bu ders ve sınıf için henüz kazanım tanımlı değil.</b> " +
      (katalogVar
        ? "<b>Katalog</b> düğmesiyle MEB müfredatından ekleyin."
        : "<b>+</b> düğmesiyle elle tanımlayın (bu ders/sınıf için hazır katalog yok).") +
      tumunuGoster + "</span>";
  }

  var satir = '<span class="field-note">' + secilebilir + " kazanım seçilebilir · " + dersSinif;
  if (katalogSecilebilir === secilebilir) {
    // Hepsi katalogdan geliyor: sayıyı iki kez yazmayalım.
    satir += " · <b>tümü MEB öğretim programından</b>; seçtiğiniz kazanım " +
      "okulun listesine eklenir";
  } else if (katalogSecilebilir) {
    satir += " · <b>" + katalogSecilebilir + " tanesi</b> MEB öğretim programından; " +
      "seçtiğiniz kazanım okulun listesine eklenir";
  } else {
    satir += " · <b>Katalog</b> ile MEB müfredatından ekleyin, <b>+</b> ile elle tanımlayın";
  }
  return satir + tumunuGoster + "</span>";
}

/** Seçili kazanım ile ders/sınıf uyuşmazlığı varsa açıklama üretir. */
function outcomeUyusmazlikHtml() {
  const secili = OUTCOMES_LIST().filter(function (o) { return o.code === state.ceForm.outcomeCode; })[0];
  if (!secili) return "";
  if (outcomeUyar(secili, state.ceForm.subject, state.ceForm.grade)) return "";
  const parcalar = [];
  if (secili.subject && secili.subject !== state.ceForm.subject) {
    parcalar.push("<b>" + escapeHtml(secili.subject) + "</b> dersine");
  }
  if (secili.grade && String(secili.grade) !== String(state.ceForm.grade)) {
    parcalar.push("<b>" + secili.grade + ". sınıfa</b>");
  }
  if (!parcalar.length) return "";
  return '<div class="oc-uyusmaz">Seçili kazanım <b>' + escapeHtml(secili.code) + "</b> " +
    parcalar.join(" ve ") + " ait; siz <b>" + escapeHtml(state.ceForm.subject) + " · " +
    state.ceForm.grade + ". sınıf</b> seçtiniz. Bu haliyle soru üretilirse kaynak, " +
    "kazanım ve sınıf düzeyi birbirini tutmaz.</div>";
}

// ---- Kazanım tanımlama (brief MVP 1) --------------------------------------
function addOutcome(code, label, subject, grade) {
  code = (code || "").trim().toUpperCase();
  const ad = (label || "").trim();
  if (!code) return "Kazanım kodu boş olamaz (örn. FEN.7.3.1).";
  if (!ad) return "Kazanım açıklaması boş olamaz.";
  if (OUTCOMES_LIST().some(function (o) { return o.code === code; })) return "Bu kazanım kodu zaten tanımlı.";
  // Ders/sınıf verilmediyse koddan çıkarılır (MAT.7.2.1 -> Matematik, 7).
  // Çıkarılamazsa boş kalır ve kazanım her derse uyar (geriye dönük uyum).
  const ders = subject || kodDanDers(code);
  const sinif = grade || kodDanSinif(code);
  const kayit = { code: code, label: code + " — " + ad };
  if (ders) kayit.subject = ders;
  if (sinif) kayit.grade = sinif;
  state.outcomes = OUTCOMES_LIST().concat([kayit]);
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

   Sayfa metinleri state (localStorage) DIŞINDA tutulur: büyük bir PDF
   localStorage kotasını doldurup uygulamanın tüm kaydını bozardı. Çalışma
   kopyası `pdfPages` değişkenindedir; kalıcı kopya ise Müfredat Kitaplığı
   aracılığıyla IndexedDB'ye yazılır (aşağıdaki bölüme bakın). Kullanıcının
   seçtiği sayfa aralığının metni ayrıca state.ceForm.text'e yazılır.       */
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

/* ==================== DOCX Okuma (Madde 4) ====================
   Word belgesi (.docx) desteği. PDF'te olduğu gibi İSTEMCİ TARAFINDA okunur;
   dosya sunucuya hiç gönderilmez — mevcut gizlilik ilkesiyle birebir aynı
   (bkz. privacy-policy.html, PDF bölümü). mammoth.js'in resmî bir ESM/.mjs
   dağıtımı olmadığı için pdf.js'teki gibi dinamik `import()` kullanılamıyor;
   bunun yerine klasik <script> etiketi enjekte edilip `window.mammoth`
   üzerinden okunuyor. CSP zaten cdn.jsdelivr.net'e izin veriyor
   (public/_headers), yeni bir izin gerekmiyor. */
let mammothLibPromise = null;

function loadMammothLib() {
  if (window.mammoth) return Promise.resolve(window.mammoth);
  if (!mammothLibPromise) {
    mammothLibPromise = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";
      s.onload = function () { resolve(window.mammoth); };
      s.onerror = function () { reject(new Error("Word okuma kütüphanesi yüklenemedi (ağ bağlantısını kontrol edin).")); };
      document.head.appendChild(s);
    });
  }
  return mammothLibPromise;
}

async function extractDocx(file) {
  const mammoth = await loadMammothLib();
  const buf = await file.arrayBuffer();
  const sonuc = await mammoth.extractRawText({ arrayBuffer: buf });
  return String((sonuc && sonuc.value) || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ==================== Taranmış PDF için OCR (Madde 4) ====================
   NEDEN: `extractPdf()` yalnızca PDF'in METİN KATMANINI okur. Taranmış
   (görüntü tabanlı) bir PDF'te metin katmanı yoktur ve eskiden kullanıcıya
   doğrudan hata gösterilip metni elle yapıştırması isteniyordu. Bu, sistemin
   kendi "sessiz düşüş yok" ilkesiyle tutarlı ama kullanışsızdı.

   ÇÖZÜM: pdf.js ile sayfa görüntüsü <canvas>'a çizilir, Tesseract.js (istemci
   tarafı, WebAssembly) ile o görüntü OCR'lanır. Süreç TAMAMEN TARAYICIDA
   çalışır; ne dosyanın kendisi ne de sayfa görüntüleri sunucuya gönderilir —
   PDF için geçerli gizlilik taahhüdü burada da aynen geçerlidir.

   SINIR: Bir OCR turu en fazla OCR_MAX_SAYFA sayfa işler (istemci CPU'sunda
   sayfa başına birkaç saniye sürebilir; sınırsız bir kitabı OCR'lamaya
   çalışmak sekmeyi uzun süre kilitler). Kırpma yapıldıysa kullanıcıya
   açıkça söylenir — sessiz kırpma yok.

   DÜRÜSTLÜK: OCR çıktısı asla PDF metin katmanı kadar güvenilir değildir.
   Üretilen sayfalar `ocr: true` ile işaretlenir ve arayüzde bir uyarı
   rozetiyle gösterilir (bkz. pdfPickerHtml). */
let tesseractLibPromise = null;
const OCR_MAX_SAYFA = 15;

function loadTesseractLib() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (!tesseractLibPromise) {
    tesseractLibPromise = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = function () { resolve(window.Tesseract); };
      s.onerror = function () { reject(new Error("OCR kütüphanesi yüklenemedi (ağ bağlantısını kontrol edin).")); };
      document.head.appendChild(s);
    });
  }
  return tesseractLibPromise;
}

/** Taranmış bir PDF'in ilk OCR_MAX_SAYFA sayfasını OCR'lar (Türkçe). */
async function ocrPdfSayfalari(file, ilerlemeCb) {
  const [pdfLib, Tesseract] = await Promise.all([loadPdfLib(), loadTesseractLib()]);
  const buf = await file.arrayBuffer();
  const doc = await pdfLib.getDocument({ data: buf }).promise;
  const toplamSayfa = doc.numPages;
  const islenecek = Math.min(toplamSayfa, OCR_MAX_SAYFA);
  // CSP yalnızca cdn.jsdelivr.net'e izin veriyor (public/_headers); Tesseract.js
  // varsayılan olarak worker/core/dil dosyalarını başka barındırıcılardan
  // çekebiliyor. Sessizce engellenmesin diye üçü de burada açıkça jsdelivr'e
  // sabitleniyor.
  /* 🔴 DÜZELTME — langPath 404 veriyordu (ölçüldü).
     Eski değer ".../@tesseract.js-data/tur/4.0.0_best" idi. Tesseract.js v5
     bu yola "/<dil>.traineddata.gz" ekliyor (kütüphane kaynağından
     doğrulandı) ve @tesseract.js-data/tur paketinde "4.0.0_best" diye bir
     dizin YOK — pakette yalnızca "4.0.0" ve "4.0.0_best_int" var. Sonuç:
     OCR, tek bir sayfa işlemeden önce
     "Network error while fetching ... Response code: 404" ile düşüyordu.

     Yeni değer olarak "_best_int" seçildi, "4.0.0" değil. Gerekçe: yukarıdaki
     ikinci argüman 1, yani oem = LSTM_ONLY. "4.0.0" paketi hem eski (legacy)
     hem LSTM modelini taşır ve oem=1 ile legacy kısım hiç kullanılmaz;
     "_best_int" tam olarak LSTM'dir — kütüphanenin langPath verilmediğinde
     oem=1 için kendi seçtiği paket. Üstelik 2.141.291 bayt, 8.063.205 yerine
     (ölçüldü): paylaşılan bir sunum ağında 4 kat daha az indirme.
     Hız öncelikliyse tek yapılacak "_best_int" yerine "4.0.0" yazmaktır. */
  const worker = await Tesseract.createWorker("tur", 1, {
    workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
    corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd.wasm.js",
    langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/tur@1.0.0/4.0.0_best_int"
  });
  const sayfalar = [];
  try {
    for (let i = 1; i <= islenecek; i++) {
      if (ilerlemeCb) ilerlemeCb(i, islenecek);
      const sayfa = await doc.getPage(i);
      const viewport = sayfa.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await sayfa.render({ canvasContext: ctx, viewport: viewport }).promise;
      const { data } = await worker.recognize(canvas);
      sayfalar.push({ n: i, text: String((data && data.text) || "").replace(/\s+/g, " ").trim(), ocr: true });
    }
  } finally {
    await worker.terminate();
  }
  return { sayfalar: sayfalar, kirpildi: toplamSayfa > OCR_MAX_SAYFA, toplamSayfa: toplamSayfa };
}

/** Kullanıcının OCR teklifini görebilmesi için taranmış dosya bilgisini tutar. */
let taranmisPdfDosya = null; // { file, sayfaSayisi } | null

function ocrOneriHtml() {
  if (!taranmisPdfDosya || state.pdf) return "";
  if (state.ceForm.ocrLoading) {
    return '<div class="ocr-offer"><div class="dz-spin"></div><div class="dz-sub">' +
      escapeHtml(state.ceForm.ocrProgress || "OCR başlatılıyor…") + '</div></div>';
  }
  const fazlaSayfa = taranmisPdfDosya.sayfaSayisi > OCR_MAX_SAYFA;
  return '<div class="ocr-offer">' +
    '<button class="btn btn-secondary btn-sm" id="btnRunOcr">🔎 OCR ile Dene (' +
    (fazlaSayfa ? "ilk " + OCR_MAX_SAYFA + " / " + taranmisPdfDosya.sayfaSayisi : taranmisPdfDosya.sayfaSayisi) +
    ' sayfa)</button>' +
    '<div class="dz-sub">Görüntü tabanlı sayfalar tarayıcıda otomatik okunur; sonuç kesin değildir, gözden geçirin.</div></div>';
}

async function runOcrOnScannedPdf() {
  if (!taranmisPdfDosya) return;
  const dosya = taranmisPdfDosya.file;
  state.ceForm.ocrLoading = true;
  state.ceForm.error = "";
  state.ceForm.ocrProgress = "OCR başlatılıyor…";
  renderAll();
  try {
    const sonuc = await ocrPdfSayfalari(dosya, function (i, toplam) {
      state.ceForm.ocrProgress = "OCR çalışıyor: " + i + "/" + toplam + " sayfa";
      renderAll();
    });
    const doluSayfa = sonuc.sayfalar.filter(function (s) { return s.text.length > 20; }).length;
    if (!doluSayfa) {
      state.ceForm.error = "OCR bu sayfalarda okunabilir metin bulamadı. Görüntü kalitesi düşük olabilir; " +
        "metni elle kopyalayıp yapıştırmayı deneyin.";
    } else {
      pdfPages = sonuc.sayfalar;
      const kayit = await kitapligaEkle(dosya.name, pdfPages);
      state.pdf = {
        ad: dosya.name,
        sayfaSayisi: pdfPages.length,
        from: 1,
        to: Math.min(3, pdfPages.length),
        kitapId: kayit ? kayit.id : null,
        ocr: true
      };
      if (!state.ceForm.title) state.ceForm.title = dosya.name.replace(/\.pdf$/i, "");
      state.ceForm.fileName = dosya.name + " — OCR ile okundu" +
        (sonuc.kirpildi ? " (ilk " + OCR_MAX_SAYFA + " sayfa)" : "") +
        (kayit ? ", kitaplığa eklendi" : "") + " — sayfa aralığı seçin";
      taranmisPdfDosya = null;
    }
  } catch (err) {
    state.ceForm.error = "OCR başarısız: " + String((err && err.message) || err);
  } finally {
    state.ceForm.ocrLoading = false;
    state.ceForm.ocrProgress = "";
    renderAll();
  }
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
    (state.pdf.ocr
      ? '<div class="pill pill-warning" style="margin-bottom:8px;">⚠️ Bu metin OCR (otomatik görüntü okuma) ile ' +
        'çıkarıldı; yazım hataları olabilir, soru üretmeden önce gözden geçirin.</div>'
      : "") +
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

/* ==================== MÜFREDAT KİTAPLIĞI ====================
   BULUNAN SORUN (kullanıcı bildirdi): Öğretmen 170 sayfalık müfredat/kitap
   PDF'ini yüklüyor, sayfa aralığı seçip soru üretiyor. Ama sayfa metinleri
   yalnızca `pdfPages` modül değişkeninde tutuluyor ve `state.pdf`
   KALICI_ALANLAR'da olmadığı için SAYFA YENİLENDİĞİNDE HEPSİ GİDİYORDU.
   Öğretmen ertesi gün aynı PDF'i baştan yüklemek zorunda kalıyordu.

   NEDEN localStorage DEĞİL: Uygulamanın tüm durumu tek bir localStorage
   anahtarında ve ~5 MB paylaşımlı kotada. 200 sayfalık bir kitabın metni
   400-800 KB; birkaç kitap kotayı doldurur ve `saveState()` başarısız olur —
   yani sorular, sınavlar ve puanlar kaydedilmemeye başlar. Kitap metnini
   oraya koymak, ana veriyi riske atmak demektir.

   ÇÖZÜM: İki katmanlı depolama.
     · IndexedDB (`t3-mufredat`)  -> sayfa metinleri (ayrı ve çok daha büyük
       kota; dolsa bile uygulama durumuna dokunmaz)
     · state.library[]            -> yalnızca İNDEKS (ad, sayfa sayısı, ders,
       sınıf, karakter, tarih). Küçüktür, localStorage'da kalır.

   İndeksin state'te tutulmasının sebebi mimaridir: bu uygulamanın tamamı
   senkron `renderAll()` ile HTML dizesi üretir. Liste senkron veriden
   çizilir; IndexedDB'ye yalnızca kitap AÇILIRKEN ve KAYDEDİLİRKEN gidilir.

   SESSİZ DÜŞÜŞ YOK (§6.3-5): IndexedDB kullanılamıyorsa (gizli sekme, kota,
   tarayıcı ayarı) sebep ekranda yazılır ve PDF yalnızca o oturum için
   geçerli olur; kullanıcı kitabın saklandığını sanmaz.
   ============================================================ */

var KITAPLIK_DB = "t3-mufredat";
var KITAPLIK_STORE = "kitaplar";
var KITAPLIK_LIMIT = 20;
var kitapIdSeq = 1;
var kitaplikHata = "";      // boş değilse kitaplık kullanılamıyor demektir
var dbPromise = null;

/** IndexedDB bağlantısı (bir kez açılır, sonuç önbelleklenir). */
function dbAc() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve, reject) {
    if (!window.indexedDB) { reject(new Error("Bu tarayıcı IndexedDB desteklemiyor.")); return; }
    var istek;
    // Gizli sekmede open() doğrudan istisna fırlatabiliyor.
    try { istek = indexedDB.open(KITAPLIK_DB, 1); }
    catch (e) { reject(e); return; }
    istek.onupgradeneeded = function () {
      var db = istek.result;
      if (!db.objectStoreNames.contains(KITAPLIK_STORE)) {
        db.createObjectStore(KITAPLIK_STORE, { keyPath: "id" });
      }
    };
    istek.onsuccess = function () { resolve(istek.result); };
    istek.onerror = function () { reject(istek.error || new Error("Yerel depo açılamadı.")); };
    istek.onblocked = function () { reject(new Error("Yerel depo başka bir sekme tarafından kilitlenmiş.")); };
  });
  return dbPromise;
}

/** Tek bir IndexedDB işlemi; işlem tamamlanana kadar bekler. */
function dbIslem(mod, fn) {
  return dbAc().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx, store, istek;
      try {
        tx = db.transaction(KITAPLIK_STORE, mod);
        store = tx.objectStore(KITAPLIK_STORE);
        istek = fn(store);
      } catch (e) { reject(e); return; }
      // put() başarılı görünüp işlem sonradan iptal olabilir (kota); bu yüzden
      // istek değil İŞLEM beklenir.
      tx.oncomplete = function () { resolve(istek ? istek.result : undefined); };
      tx.onerror = function () { reject(tx.error || new Error("Depolama işlemi başarısız.")); };
      tx.onabort = function () {
        reject(tx.error || new Error("Depolama işlemi iptal edildi — cihaz depolama alanı dolmuş olabilir."));
      };
    });
  });
}

function kitapKaydet(id, sayfalar) {
  return dbIslem("readwrite", function (s) { return s.put({ id: id, pages: sayfalar }); });
}
function kitapYukle(id) {
  return dbIslem("readonly", function (s) { return s.get(id); });
}
function kitapSil(id) {
  return dbIslem("readwrite", function (s) { return s.delete(id); });
}

function ensureLibrary() {
  state.library = state.library || [];
  state.library.forEach(function (k) { if (k.id >= kitapIdSeq) kitapIdSeq = k.id + 1; });
}

function kitapBul(id) {
  ensureLibrary();
  return state.library.filter(function (k) { return String(k.id) === String(id); })[0] || null;
}

/**
 * Çıkarılmış sayfaları kitaplığa yazar ve indeks kaydını döndürür.
 * Aynı kitap (ad + sayfa sayısı + karakter) tekrar yüklenirse çoğaltılmaz.
 * Hata durumunda `kitaplikHata` doldurulur ve null döner — çağıran taraf
 * PDF'i oturumluk kullanmaya devam eder.
 */
async function kitapligaEkle(dosyaAdi, sayfalar) {
  ensureLibrary();
  var karakter = sayfalar.reduce(function (t, s) { return t + s.text.length; }, 0);
  var ayni = state.library.filter(function (k) {
    return k.ad === dosyaAdi && k.sayfaSayisi === sayfalar.length && k.karakter === karakter;
  })[0];
  if (ayni) { ayni.at = Date.now(); saveState(); return ayni; }

  var kayit = {
    id: kitapIdSeq++,
    ad: dosyaAdi,
    sayfaSayisi: sayfalar.length,
    karakter: karakter,
    subject: state.ceForm.subject || "",
    grade: state.ceForm.grade || "",
    at: Date.now()
  };
  try {
    await kitapKaydet(kayit.id, sayfalar);
  } catch (e) {
    kitapIdSeq--;   // id tüketilmesin
    kitaplikHata = "Kitaplığa kaydedilemedi: " + String((e && e.message) || e) +
      " Bu PDF yalnızca bu oturumda kullanılabilir.";
    return null;
  }
  kitaplikHata = "";
  state.library.push(kayit);
  // Sınır aşılırsa en eski kitap düşer. Liste ekranda görünür olduğu için
  // bu kayıp sessiz değildir.
  while (state.library.length > KITAPLIK_LIMIT) {
    var atilan = state.library.shift();
    try { await kitapSil(atilan.id); } catch (e) { /* kayıt zaten yoksa sorun değil */ }
  }
  saveState();
  return kayit;
}

/** Yapıştırılan/yazılan metni Başlık alanındaki adla kitaplığa kaydeder. */
async function kaynakKitapligaKaydet() {
  var metin = String(state.ceForm.text || "").trim();
  if (metin.length < 30) {
    state.ceForm.error = "Kitaplığa kaydetmek için en az 30 karakterlik bir metin girin.";
    renderAll(); return;
  }
  var ad = String(state.ceForm.title || "").trim();
  if (!ad) {
    state.ceForm.error = "Kitaplığa kaydetmeden önce yukarıya bir başlık yazın (kitabın adı olacak).";
    renderAll(); return;
  }
  state.ceForm.error = "";
  await kitapligaEkle(ad, [{ text: metin }]);
  renderAll();
}

/** Kitaplıktaki bir kitabı açar: sayfa metinlerini belleğe alır, seçiciyi gösterir. */
async function kitapAc(id) {
  var kayit = kitapBul(id);
  if (!kayit) return;
  state.ceForm.pdfLoading = true;
  state.ceForm.error = "";
  renderAll();
  try {
    var veri = await kitapYukle(kayit.id);
    if (!veri || !veri.pages || !veri.pages.length) {
      // İndeks duruyor ama içerik yok: tarayıcı verisi kısmen temizlenmiş
      // olabilir. "Açılmadı" demek yetmez; sebebini söyle ve ölü kaydı kaldır.
      state.library = state.library.filter(function (k) { return k.id !== kayit.id; });
      saveState();
      state.ceForm.error = "“" + kayit.ad + "” kitaplıkta görünüyordu ama içeriği bulunamadı " +
        "(tarayıcı verisi temizlenmiş olabilir). Kayıt listeden kaldırıldı; PDF'i yeniden yükleyin.";
      return;
    }
    pdfPages = veri.pages;
    state.pdf = {
      ad: kayit.ad,
      sayfaSayisi: veri.pages.length,
      from: 1,
      to: Math.min(3, veri.pages.length),
      kitapId: kayit.id
    };
    if (!state.ceForm.title) state.ceForm.title = kayit.ad.replace(/\.pdf$/i, "");
    state.ceForm.fileName = kayit.ad + " — kitaplıktan açıldı, sayfa aralığı seçin";
  } catch (e) {
    state.ceForm.error = "Kitap açılamadı: " + String((e && e.message) || e);
  } finally {
    state.ceForm.pdfLoading = false;
    renderAll();
  }
}

/** Kitabı kitaplıktan siler (hem indeks hem içerik). */
async function kitapKaldir(id) {
  var kayit = kitapBul(id);
  if (!kayit) return;
  state.library = state.library.filter(function (k) { return k.id !== kayit.id; });
  // Açık olan kitap silindiyse seçici de kapanmalı; yoksa var olmayan bir
  // kitabın sayfa aralığı seçiliyormuş gibi görünür.
  if (state.pdf && state.pdf.kitapId === kayit.id) {
    state.pdf = null; pdfPages = null; state.ceForm.fileName = "";
  }
  saveState();
  renderAll();
  try { await kitapSil(kayit.id); }
  catch (e) { kitaplikHata = "Kitap içeriği silinemedi: " + String((e && e.message) || e); renderAll(); }
}

function kitapBoyutEtiketi(karakter) {
  var kb = karakter / 1024;
  return kb >= 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB"
                    : Math.max(1, Math.round(kb)) + " KB";
}

function kitapTarihEtiketi(ts) {
  try { return new Date(ts).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }); }
  catch (e) { return ""; }
}

/** Kitaplık listesi. Tamamen senkron — yalnızca state.library'den çizilir. */
/** §28r Madde 5: ad/ders/sınıf metnine göre büyük/küçük harf duyarsız arama. */
function kitapAramaFiltrele(liste, arama) {
  var a = String(arama || "").trim().toLocaleLowerCase("tr");
  if (!a) return liste;
  return liste.filter(function (k) {
    var metin = (k.ad + " " + (k.subject || "") + " " + (k.grade ? k.grade + ". sınıf" : ""))
      .toLocaleLowerCase("tr");
    return metin.indexOf(a) !== -1;
  });
}

/* §28r Madde 4: kayıt anında sabitlenen ad/ders/sınıf artık düzenlenebilir.
   Yalnızca state.library'deki METADATA değişir; IndexedDB'deki sayfa metnine
   dokunulmaz (o zaten hiç sabit değildi). Bir seferde en fazla bir satır
   düzenleme modundadır (state.kitEdit). AYRI FONKSİYON OLMASININ SEBEBİ
   (§28r Madde 5): arama kutusuna yazarken yalnızca bu alt-liste yeniden
   çizilir, `renderAll()` ÇAĞRILMAZ — aksi hâlde her tuş vuruşunda tüm sayfa
   yeniden basılır ve arama kutusundaki ODAK KAYBOLURDU (§6.3-3). */
function kitaplikSatirlarHtml(sirali) {
  var filtreli = kitapAramaFiltrele(sirali, state.kitArama);
  if (!filtreli.length) {
    return '<div class="empty-state">“' + escapeHtml(state.kitArama || "") + '” ile eşleşen kayıt yok.</div>';
  }
  return filtreli.map(function (k) {
    var acik = !!(state.pdf && state.pdf.kitapId === k.id);
    var etiket = [k.subject, k.grade ? k.grade + ". sınıf" : ""].filter(Boolean).join(" · ");

    if (state.kitEdit === k.id) {
      return '<div class="kit-satir kit-satir-duzenle">' +
        '<div class="kit-duzen-form">' +
        '<input id="kitDuzenAd" class="sy-input" value="' + escapeHtml(k.ad) + '" maxlength="120" placeholder="Kitap/ders adı">' +
        '<select id="kitDuzenDers" class="sy-input sy-input-sm">' +
        '<option value="">Ders yok</option>' +
        SUBJECTS_LIST().map(function (d) { return '<option value="' + escapeHtml(d) + '"' + (d === k.subject ? " selected" : "") + '>' + escapeHtml(d) + '</option>'; }).join("") +
        '</select>' +
        '<select id="kitDuzenSinif" class="sy-input sy-input-sm">' +
        '<option value="">Sınıf yok</option>' +
        GRADES.map(function (g) { return '<option value="' + g + '"' + (String(g) === String(k.grade) ? " selected" : "") + '>' + g + '. sınıf</option>'; }).join("") +
        '</select>' +
        '<button class="btn btn-primary btn-sm" data-kitap-kaydet="' + k.id + '">Kaydet</button>' +
        '<button class="btn btn-secondary btn-sm" id="btnKitDuzenVazgec">Vazgeç</button>' +
        '</div></div>';
    }

    return '<div class="kit-satir' + (acik ? " acik" : "") + '">' +
      '<div class="kit-bilgi">' +
      '<div class="kit-ad">📕 ' + escapeHtml(k.ad) + (acik ? ' <span class="kit-rozet">açık</span>' : "") + '</div>' +
      '<div class="kit-alt">' + k.sayfaSayisi + ' sayfa · ' + kitapBoyutEtiketi(k.karakter) +
      (etiket ? ' · ' + escapeHtml(etiket) : "") + ' · ' + kitapTarihEtiketi(k.at) + '</div></div>' +
      '<div class="kit-islem">' +
      '<button class="btn btn-secondary btn-sm" data-kitap="' + k.id + '"' + (acik ? " disabled" : "") + '>' +
      (acik ? "Açık" : "Aç") + '</button>' +
      '<button class="icon-btn" data-kitap-duzenle="' + k.id + '" title="Adı/ders/sınıfı düzenle" aria-label="' +
      escapeHtml(k.ad) + ' kaydını düzenle">✎</button>' +
      '<button class="icon-btn kit-sil" data-kitap-sil="' + k.id + '" title="Kitaplıktan sil" aria-label="' +
      escapeHtml(k.ad) + ' kitabını kitaplıktan sil">×</button>' +
      '</div></div>';
  }).join("");
}

function kitaplikHtml() {
  ensureLibrary();
  var uyari = kitaplikHata ? '<div class="kit-uyari">' + escapeHtml(kitaplikHata) + '</div>' : "";
  if (!state.library.length) return uyari ? '<div class="kit-wrap">' + uyari + '</div>' : "";

  var sirali = state.library.slice().sort(function (a, b) { return b.at - a.at; });
  var toplam = state.library.reduce(function (t, k) { return t + k.karakter; }, 0);
  // Az kayıtta arama kutusu gürültüdür; birkaç kayıttan sonra anlamlı olur.
  var aramaKutusu = state.library.length >= 4
    ? '<input id="kitArama" class="kit-arama" placeholder="Kitaplıkta ara (ad, ders, sınıf)…" value="' +
      escapeHtml(state.kitArama || "") + '">'
    : "";

  return '<div class="kit-wrap">' + uyari +
    '<div class="kit-bas">📚 Müfredat Kitaplığı' +
    '<span class="kit-ozet">' + state.library.length + ' kitap · ' + kitapBoyutEtiketi(toplam) + '</span></div>' +
    '<div class="kit-desc">Yüklediğiniz PDF\'ler bu tarayıcıda saklanır; her seferinde yeniden ' +
    'yüklemeniz gerekmez. Bir kitabı açıp farklı sayfa aralıklarından soru üretebilirsiniz.</div>' +
    aramaKutusu +
    '<div class="kit-liste" id="kitListesi">' + kitaplikSatirlarHtml(sirali) + '</div></div>';
}

function wireKitaplik() {
  /* Arama kutusuna yazarken renderAll() ÇAĞRILMAZ — yalnızca #kitListesi
     alt-ağacı yeniden çizilir ve içindeki düğmeler yeniden bağlanır. Kutunun
     kendisi DOM'da aynı kalır, odak korunur (§6.3-3). */
  var arama = document.getElementById("kitArama");
  if (arama) arama.oninput = function () {
    state.kitArama = arama.value;
    var sirali = state.library.slice().sort(function (a, b) { return b.at - a.at; });
    var liste = document.getElementById("kitListesi");
    if (liste) liste.innerHTML = kitaplikSatirlarHtml(sirali);
    wireKitaplik();
  };
  document.querySelectorAll("[data-kitap]").forEach(function (b) {
    b.onclick = function () { kitapAc(b.getAttribute("data-kitap")); };
  });
  document.querySelectorAll("[data-kitap-sil]").forEach(function (b) {
    b.onclick = function () {
      var k = kitapBul(b.getAttribute("data-kitap-sil"));
      if (!k) return;
      if (confirm("“" + k.ad + "” kitaplıktan silinsin mi? Bu kitaptan üretilmiş sorular silinmez.")) {
        kitapKaldir(k.id);
      }
    };
  });
  document.querySelectorAll("[data-kitap-duzenle]").forEach(function (b) {
    b.onclick = function () {
      state.kitEdit = Number(b.getAttribute("data-kitap-duzenle"));
      renderAll();
    };
  });
  var vazgec = document.getElementById("btnKitDuzenVazgec");
  if (vazgec) vazgec.onclick = function () { state.kitEdit = null; renderAll(); };
  document.querySelectorAll("[data-kitap-kaydet]").forEach(function (b) {
    b.onclick = function () {
      var k = kitapBul(b.getAttribute("data-kitap-kaydet"));
      if (!k) return;
      var ad = String((document.getElementById("kitDuzenAd") || {}).value || "").trim();
      if (!ad) { kitaplikHata = "Kitap adı boş olamaz."; renderAll(); return; }
      kitaplikHata = "";
      k.ad = ad;
      k.subject = (document.getElementById("kitDuzenDers") || {}).value || "";
      var sinifDeger = (document.getElementById("kitDuzenSinif") || {}).value || "";
      k.grade = sinifDeger ? parseInt(sinifDeger, 10) : "";
      state.kitEdit = null;
      saveState(); renderAll();
    };
  });
}


/* ==================== YAPAY ZEKÂ KARAR GÜNLÜĞÜ (DENETİM İZİ) ====================
   NEDEN VAR: Bu ürünün tezi "yapay zekâ önerir, insan karar verir" (agents.md
   §1). Bu tez ekranda görünüyor ama İSPATLANMIYORDU. Jüri "insan onayını nasıl
   ispatlıyorsunuz" diye sorduğunda gösterilecek somut bir kayıt yoktu.

   `calibration()` zaten AI-öğretmen puan farkını hesaplıyor, ama:
     · yalnızca DEĞERLENDİRMELERİ kapsıyor (soru onay/red kararları yok),
     · ANLIK DURUMDAN türetiliyor — soru silinirse geçmiş de kayboluyor,
     · hangi MODELİN önerdiğini tutmuyor (§19c'den sonra kritik: iki model
       aynı cevaba farklı puan veriyor),
     · zaman damgası yok, dışa aktarılamıyor.

   Bu günlük onun tamamlayıcısıdır: her AI önerisini ve o öneriye insanın ne
   yaptığını zaman damgasıyla, model adıyla birlikte kalıcı olarak yazar.

   DEPOLAMA SINIRI: localStorage'da tutulur (senkron render için gerekli).
   En fazla AUDIT_LIMIT kayıt; sınır aşılırsa en eski düşer ve bu ekranda
   AÇIKÇA yazar (§6.3-5 sessiz düşüş yasağı).

   GİZLİLİK: Öğrenci adı YAZILMAZ, yalnızca öğrenci numarası (sid) tutulur.
   Soru gövdesi 80 karaktere kırpılır — kayıt tek başına anlaşılsın diye
   (soru sonradan silinse bile günlük okunabilir kalmalı).
   ============================================================================ */

var AUDIT_LIMIT = 500;

function ensureAudit() {
  state.auditLog = state.auditLog || [];
}

/** Günlüğe bir olay yazar. Asla hata fırlatmaz — günlük ana akışı bozmamalı. */
function auditKaydet(tur, veri) {
  try {
    ensureAudit();
    var kayit = { at: Date.now(), tur: tur };
    Object.keys(veri || {}).forEach(function (k) {
      if (veri[k] !== undefined && veri[k] !== null) kayit[k] = veri[k];
    });
    state.auditLog.push(kayit);
    var dusen = 0;
    while (state.auditLog.length > AUDIT_LIMIT) { state.auditLog.shift(); dusen++; }
    if (dusen) state.auditDusen = (state.auditDusen || 0) + dusen;
    saveSoon();
  } catch (e) {
    // Günlük tutulamıyorsa ürün çalışmaya devam etmeli.
    console.warn("denetim izi yazılamadı:", e && e.message);
  }
}

/** Soru gövdesini günlük için kısaltır. */
function auditKisalt(s) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  return s.length > 80 ? s.slice(0, 79) + "…" : s;
}

var AUDIT_ETIKET = {
  soru_uretildi:        { ad: "Soru üretildi",            sinif: "pill-accent",  aktor: "yapay zekâ" },
  soru_onaylandi:       { ad: "Soru onaylandı",           sinif: "pill-success", aktor: "içerik uzmanı" },
  soru_reddedildi:      { ad: "Soru reddedildi",          sinif: "pill-critical",aktor: "içerik uzmanı" },
  rubrik_onerildi:      { ad: "Rubrik önerildi",          sinif: "pill-accent",  aktor: "yapay zekâ" },
  degerlendirme_onerildi:{ad: "Puan önerildi",            sinif: "pill-accent",  aktor: "yapay zekâ" },
  degerlendirme_basarisiz:{ad:"Değerlendirme yapılamadı", sinif: "pill-warning", aktor: "sistem" },
  puan_karari:          { ad: "Puan kararı",              sinif: "pill-success", aktor: "öğretmen" },
  geri_bildirim_aktarildi:{ad:"Geri bildirim aktarıldı",  sinif: "pill-neutral", aktor: "öğretmen" },
  /* Dikkat sinyalinin veliye iletilmesi bir İNSAN KARARIDIR ve denetim izine
     öyle yazılır: aktör öğretmendir, sistem değil (§28e). */
  dikkat_veliye_bildirildi:{ad:"Dikkat sinyali veliye bildirildi", sinif: "pill-warning", aktor: "öğretmen" },
};

/**
 * Günlükten özet çıkarır. Jürinin sorduğu soruya doğrudan cevap:
 * "AI kaç öneri yaptı, insan kaçını aynen kabul etti, kaçını değiştirdi?"
 */
function auditOzet() {
  ensureAudit();
  var g = state.auditLog;
  var oneri = g.filter(function (k) { return k.tur === "degerlendirme_onerildi"; }).length;
  var kararlar = g.filter(function (k) { return k.tur === "puan_karari"; });
  var aynen = kararlar.filter(function (k) { return k.degisti === false; }).length;
  var degisen = kararlar.filter(function (k) { return k.degisti === true; }).length;
  var elle = kararlar.filter(function (k) { return k.aiScore == null; }).length;
  var uretilen = g.filter(function (k) { return k.tur === "soru_uretildi"; })
                  .reduce(function (t, k) { return t + (k.adet || 0); }, 0);
  var onaylanan = g.filter(function (k) { return k.tur === "soru_onaylandi"; }).length;
  var reddedilen = g.filter(function (k) { return k.tur === "soru_reddedildi"; }).length;

  /* Hangi modeller kullanılmış? (§19c: model farkı puanı etkiliyor)
     🔴 DÜZELTİLEN SAYIM HATASI: Eskiden `model` alanı TAŞIYAN her kayıt
     sayılıyordu. Ama insan kararları (soru_onaylandi / soru_reddedildi /
     puan_karari) da bu alanı taşır — hangi modelin ürettiği çıktıya karar
     verildiğini göstermek için, ki bu doğrudur. Sonuç: ekranda
     "Kullanılan modeller: llama · 14" yazıyordu, oysa gerçekte 8 model
     çağrısı yapılmıştı (ölçüldü: 2 üretim + 6 değerlendirme).
     Denetim izi ekranında bir sayının ne saydığı belirsiz olamaz (§21d:
     "yalancı bir denetim izi hiç olmamasından kötüdür"). Artık yalnızca
     MODELİN ÜRETTİĞİ olaylar sayılıyor; insan kararları sayılmıyor. */
  var MODEL_URETIMI = { soru_uretildi: 1, rubrik_onerildi: 1, degerlendirme_onerildi: 1 };
  var modeller = {};
  g.forEach(function (k) {
    if (k.model && MODEL_URETIMI[k.tur]) modeller[k.model] = (modeller[k.model] || 0) + 1;
  });

  return {
    toplamKayit: g.length, dusen: state.auditDusen || 0,
    oneri: oneri, aynen: aynen, degisen: degisen, elle: elle,
    uretilen: uretilen, onaylanan: onaylanan, reddedilen: reddedilen,
    modeller: modeller,
    ilk: g.length ? g[0].at : null, son: g.length ? g[g.length - 1].at : null,
  };
}

function auditZaman(ts) {
  try { return new Date(ts).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  catch (e) { return String(ts); }
}

/** Günlüğü CSV'ye çevirir (Excel'de açılabilsin diye ayraç noktalı virgül). */
function auditCsv() {
  ensureAudit();
  var basliklar = ["zaman", "olay", "aktor", "model", "yedekMi", "soru", "ogrenciNo",
                   "aiPuan", "nihaiPuan", "degisti", "guven", "not"];
  var satirlar = state.auditLog.map(function (k) {
    var e = AUDIT_ETIKET[k.tur] || { ad: k.tur, aktor: "" };
    return [
      auditZaman(k.at), e.ad, e.aktor, k.model || "", k.fellBack === true ? "evet" : (k.fellBack === false ? "hayır" : ""),
      k.soru || "", k.sid != null ? k.sid : "",
      k.aiScore != null ? k.aiScore : "", k.finalScore != null ? k.finalScore : "",
      k.degisti === true ? "evet" : (k.degisti === false ? "hayır" : ""),
      k.confidence != null ? k.confidence : "", k.not || "",
    ].map(function (h) {
      h = String(h == null ? "" : h);
      return /[";\n]/.test(h) ? '"' + h.replace(/"/g, '""') + '"' : h;
    }).join(";");
  });
  // BOM: Excel'in UTF-8'i doğru açması için gerekli (Türkçe karakterler).
  return "﻿" + basliklar.join(";") + "\n" + satirlar.join("\n");
}

/** Tarayıcıda dosya indirtir. */
function auditIndir(icerik, dosyaAdi, tur) {
  try {
    var blob = new Blob([icerik], { type: tur });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = dosyaAdi;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return true;
  } catch (e) {
    alert("Dosya indirilemedi: " + ((e && e.message) || e));
    return false;
  }
}

function auditSatirHtml(k) {
  var e = AUDIT_ETIKET[k.tur] || { ad: k.tur, sinif: "pill-neutral", aktor: "" };
  var detay = [];
  if (k.model) detay.push((k.fellBack ? "yedek model: " : "model: ") + escapeHtml(k.model));
  if (k.aiScore != null && k.finalScore != null) {
    detay.push("AI önerisi <b>" + k.aiScore + "</b> → öğretmen <b>" + k.finalScore + "</b>" +
      (k.degisti ? ' <span class="au-degisti">değiştirdi</span>' : ' <span class="au-aynen">aynen onayladı</span>'));
  } else if (k.aiScore != null) {
    detay.push("AI önerisi: <b>" + k.aiScore + "</b>" + (k.confidence != null ? " (güven " + k.confidence + ")" : ""));
  } else if (k.tur === "puan_karari") {
    detay.push('<span class="au-elle">yapay zekâ önerisi olmadan, öğretmen doğrudan puanladı</span>: <b>' + k.finalScore + "</b>");
  }
  if (k.adet) detay.push(k.adet + " soru");
  if (k.injectionAttempt) detay.push('<span class="au-inj">yanıt modele talimat vermeye çalışmış</span>');
  if (k.not) detay.push(escapeHtml(k.not));

  return '<div class="au-satir">' +
    '<div class="au-ust"><span class="pill ' + e.sinif + '">' + escapeHtml(e.ad) + "</span>" +
    '<span class="au-aktor">' + escapeHtml(e.aktor) + "</span>" +
    '<span class="au-zaman">' + escapeHtml(auditZaman(k.at)) + "</span></div>" +
    (k.soru ? '<div class="au-soru">' + escapeHtml(k.soru) + "</div>" : "") +
    (detay.length ? '<div class="au-detay">' + detay.join(" · ") + "</div>" : "") +
    "</div>";
}

function auditGunluguHtml() {
  ensureAudit();
  var o = auditOzet();
  if (!o.toplamKayit) {
    return '<div class="card"><div class="card-head"><h3>Yapay Zekâ Karar Günlüğü</h3></div>' +
      '<p class="au-bos">Henüz kayıt yok. Soru üretildikçe ve öğretmen puan onayladıkça ' +
      "her adım buraya yazılır: hangi model ne önerdi, insan ne karar verdi.</p></div>";
  }
  var modelListesi = Object.keys(o.modeller).map(function (m) {
    return '<span class="pill pill-neutral">' + escapeHtml(m) + " · " + o.modeller[m] + "</span>";
  }).join(" ");

  var kararToplam = o.aynen + o.degisen;
  var yuzde = kararToplam ? Math.round((o.degisen / kararToplam) * 100) : null;

  var sonKayitlar = state.auditLog.slice(-25).reverse().map(auditSatirHtml).join("");

  return '<div class="card"><div class="card-head"><h3>Yapay Zekâ Karar Günlüğü</h3>' +
    '<span class="pill pill-accent">' + o.toplamKayit + " kayıt</span></div>" +
    '<p class="au-aciklama">Bu ürünün ilkesi <b>yapay zekâ önerir, insan karar verir</b>. ' +
    "Bu günlük o ilkenin kanıtıdır: her yapay zekâ önerisi ve insanın o öneriye ne yaptığı " +
    "zaman damgasıyla kayıtlıdır.</p>" +

    '<div class="au-ozet">' +
    '<div class="au-kutu"><div class="au-sayi">' + o.uretilen + '</div><div class="au-etiket">AI soru önerdi</div></div>' +
    '<div class="au-kutu"><div class="au-sayi">' + o.onaylanan + '</div><div class="au-etiket">insan onayladı</div></div>' +
    '<div class="au-kutu"><div class="au-sayi">' + o.reddedilen + '</div><div class="au-etiket">insan reddetti</div></div>' +
    '<div class="au-kutu"><div class="au-sayi">' + o.oneri + '</div><div class="au-etiket">AI puan önerdi</div></div>' +
    '<div class="au-kutu"><div class="au-sayi">' + o.aynen + '</div><div class="au-etiket">aynen onaylandı</div></div>' +
    '<div class="au-kutu au-vurgu"><div class="au-sayi">' + o.degisen + '</div><div class="au-etiket">öğretmen değiştirdi</div></div>' +
    (o.elle ? '<div class="au-kutu"><div class="au-sayi">' + o.elle + '</div><div class="au-etiket">AI olmadan puanlandı</div></div>' : "") +
    "</div>" +

    (yuzde != null
      /* Cümle, sayı eki ALMAYACAK biçimde kuruldu. Eski hâli sabit "'ini" eki
         kullanıyordu ve ekranda "%0'ini değiştirdi" yazıyordu — doğrusu
         "%0'ını". Türkçede ek sayının okunuşuna göre değişir: %50'sini,
         %100'ünü, %33'ünü… Sabit ek çoğu değerde yanlış olur (§6.3-14).
         §7e'de aynı sınıf hata ("Sınıfın %67'i doğru") yine cümle yeniden
         kurularak çözülmüştü. Bu satır §21c'de "özetin en değerli satırı"
         diye geçiyor, yani jüriye gösterilecek cümle. */
      ? '<div class="au-oran">Öğretmen, yapay zekâ puan önerilerinde <b>%' + yuzde +
        "</b> oranında değişiklik yaptı. Bu oran sıfırsa insan onayı biçimsel " +
        "kalıyor demektir; çok yüksekse modelin rubriğe uyumu gözden geçirilmelidir.</div>"
      : "") +

    /* Sayının NEYİ saydığı yazıyor: yalnızca modelin ürettiği çıktılar
       (soru üretimi, rubrik taslağı, puan önerisi). İnsan kararları bu
       sayıya dâhil değildir — bkz. auditOzet() içindeki MODEL_URETIMI. */
    (modelListesi ? '<div class="au-modeller">Model çağrısı yapılan adımlar: ' + modelListesi + "</div>" : "") +

    (o.dusen ? '<div class="au-uyari">⚠ Günlük en fazla ' + AUDIT_LIMIT + " kayıt tutar; " +
      "sınır aşıldığı için <b>" + o.dusen + " eski kayıt düştü</b>. Kalıcı arşiv için indirin.</div>" : "") +

    '<div class="au-butonlar">' +
    '<button class="btn btn-secondary btn-sm" id="btnAuditCsv">CSV indir (Excel)</button> ' +
    '<button class="btn btn-secondary btn-sm" id="btnAuditJson">JSON indir</button> ' +
    '<button class="btn btn-secondary btn-sm" id="btnAuditTemizle">Günlüğü temizle</button></div>' +

    '<div class="au-liste-bas">Son ' + Math.min(25, o.toplamKayit) + " kayıt (yeniden eskiye)</div>" +
    '<div class="au-liste">' + sonKayitlar + "</div></div>";
}

function wireAudit() {
  var csv = document.getElementById("btnAuditCsv");
  if (csv) csv.onclick = function () {
    auditIndir(auditCsv(), "yapay-zeka-karar-gunlugu.csv", "text/csv;charset=utf-8");
  };
  var js = document.getElementById("btnAuditJson");
  if (js) js.onclick = function () {
    ensureAudit();
    auditIndir(JSON.stringify({ olusturuldu: new Date().toISOString(), ozet: auditOzet(), kayitlar: state.auditLog }, null, 2),
      "yapay-zeka-karar-gunlugu.json", "application/json;charset=utf-8");
  };
  var tm = document.getElementById("btnAuditTemizle");
  if (tm) tm.onclick = function () {
    if (confirm("Karar günlüğü tamamen silinsin mi? Bu işlem geri alınamaz. İndirmediyseniz önce indirin.")) {
      state.auditLog = []; state.auditDusen = 0; renderAll();
    }
  };
}

/* ============================== İçerik Uzmanı ============================== */
/* ===========================================================================
   UYARAN METİN (kaynak metin) — sorunun dayandığı metnin saklanması
   ===========================================================================
   BULUNAN HATA (kullanıcı bildirdi): Model "Metne göre yazar ilk kitabını kaç
   yaşında yazmıştır?" gibi bir soru üretiyordu ama ORTADA METİN YOKTU.
   Kaynak metin yalnızca üretim isteğinde kullanılıyor, sonra atılıyordu;
   öğrenci sınavda o metni asla görmüyordu. Yani soru cevaplanamazdı.

   Bu, Türkçe/Sosyal Bilgiler gibi derslerde yapısal bir sorundur: okuma
   kazanımları METİN OLMADAN ÖLÇÜLEMEZ. Ölçmede soruya eşlik eden bu metne
   "uyaran metin" (stimulus) denir.

   ÇÖZÜM:
   1. Soru üretilirken kaynak metin state.sources[] içinde saklanır.
   2. Üretilen sorulara srcId bağlanır.
   3. Model her soru için needsSource döndürür (sunucu ayrıca soru gövdesinden
      deterministik olarak kontrol eder — "metne göre", "parçada", "şiirde"...).
   4. Sınavda needsSource olan sorularda kaynak metin öğrenciye GÖSTERİLİR.

   DEPOLAMA SINIRI: Kaynaklar localStorage'da tutulur. Sınırsız büyümemesi
   için en fazla KAYNAK_LIMIT tanesi saklanır; en eskisi atılır. Atılan bir
   kaynağa bağlı soru kalırsa öğretmene açıkça uyarı gösterilir (sessizce
   metinsiz soru sunmaktansa uyarmak doğrudur).
   =========================================================================== */

var KAYNAK_LIMIT = 10;
var srcIdSeq = 1;

function ensureSources() {
  state.sources = state.sources || [];
  state.sources.forEach(function (s) {
    if (s.id >= srcIdSeq) srcIdSeq = s.id + 1;
  });
}

/** Kaynak metni saklar ve id döndürür. Aynı metin tekrar tekrar eklenmez. */
function kaynakEkle(doc) {
  ensureSources();
  const metin = String(doc.text || "").trim();
  if (!metin) return null;
  const ayni = state.sources.filter(function (s) {
    return s.text === metin && s.subject === doc.subject && String(s.grade) === String(doc.grade);
  })[0];
  if (ayni) return ayni.id;
  const kayit = {
    id: srcIdSeq++,
    title: doc.title || "Adsız Kaynak",
    subject: doc.subject || "",
    grade: doc.grade || "",
    text: metin,
    at: Date.now()
  };
  state.sources.push(kayit);
  // Sınırı aşarsa en eskiyi at. Hangi kaynağın atıldığı sessiz kalmaz:
  // ona bağlı soru varsa arayüzde uyarı çıkar (kaynakMetni() null döner).
  while (state.sources.length > KAYNAK_LIMIT) state.sources.shift();
  return kayit.id;
}

/** id'den kaynak kaydını getirir; silinmişse null. */
function kaynakBul(srcId) {
  if (srcId == null) return null;
  ensureSources();
  return state.sources.filter(function (s) { return String(s.id) === String(srcId); })[0] || null;
}

/** Soru kaynak metin gerektiriyor mu? (eski sorularda alan yoktur) */
function soruKaynakIster(q) {
  return !!(q && q.needsSource);
}

/**
 * Sınavda/incelemede gösterilecek kaynak metin bloğu.
 * mod: "student" (sınav ekranı) | "review" (öğretmen incelemesi)
 */
function kaynakBlokHtml(q, mod) {
  if (!soruKaynakIster(q)) return "";
  const k = kaynakBul(q.srcId);
  if (!k) {
    // Kaynak bulunamadı: sessizce metinsiz soru göstermek öğrenciyi
    // cevaplanamaz bir soruyla baş başa bırakır. Açıkça söylenir.
    return '<div class="src-yok"><b>Bu soru bir kaynak metne dayanıyor ama metin bulunamadı.</b> ' +
      (mod === "student"
        ? "Öğretmeninize bildirin; bu soruyu yanıtlamak için metne ihtiyacınız var."
        : "Kaynak saklama sınırı aşılmış olabilir. Soruyu havuzdan çıkarmayı ya da " +
          "metni yeniden yükleyip soruyu tekrar üretmeyi düşünün.") + "</div>";
  }
  const acik = mod === "student";
  return '<details class="src-blok"' + (acik ? " open" : "") + ">" +
    '<summary class="src-bas">Bu soru bir metne dayanıyor — <b>' + escapeHtml(k.title) + "</b>" +
    '<span class="src-uzunluk">' + k.text.length + " karakter</span></summary>" +
    '<div class="src-metin">' + escapeHtml(k.text) + "</div></details>";
}

/** Öğretmen inceleme kartında kısa rozet. */
function kaynakRozetHtml(q) {
  if (!soruKaynakIster(q)) return "";
  const k = kaynakBul(q.srcId);
  return '<span class="pill ' + (k ? "pill-neutral" : "pill-critical") + '" title="' +
    (k ? "Bu soru kaynak metne dayanıyor; sınavda metin öğrenciye gösterilir."
       : "Bu soru kaynak metne dayanıyor ama metin bulunamadı!") + '">' +
    (k ? "metne dayalı" : "METİN YOK") + "</span>";
}

/** Sınav kurarken: metne dayalı soruların özeti/uyarısı. */
function sinavKaynakUyarisiHtml(secili) {
  const metneDayali = secili.filter(soruKaynakIster);
  if (!metneDayali.length) return "";
  const kayip = metneDayali.filter(function (q) { return !kaynakBul(q.srcId); });
  if (kayip.length) {
    return '<div class="src-uyari src-uyari-kritik"><b>' + kayip.length +
      " sorunun kaynak metni bulunamadı.</b> Bu sorular öğrenciye metinsiz gider ve " +
      "yanıtlanamaz. Sınavdan çıkarın ya da metni yeniden yükleyip soruları tekrar üretin.</div>";
  }
  return '<div class="src-uyari"><b>' + metneDayali.length +
    " soru bir kaynak metne dayanıyor.</b> Bu soruların metni sınavda öğrenciye " +
    "birlikte gösterilir; öğrenci metni okumadan yanıtlayamaz.</div>";
}

async function onGenerateQuestions() {
  const text = state.ceForm.text.trim();
  /* §31 — 30 KARAKTER KURALI ARTIK MODA BAĞLI.
     "kaynak" modunda kural aynen duruyor: dayanak metnin kendisi olduğu için
     birkaç kelimeden soru üretmek modeli uydurmaya iter.
     "kazanim" modunda ise kaynak metin HİÇ İSTENMEZ — dayanak MEB kazanımı
     (kod + açıklama + konu alanı) olduğundan bir alt sınır anlamsızdır.
     Sunucu şeması da aynı ayrımı yapar (src/schemas/ai.ts superRefine). */
  const kazanimModu = uretimModu() === "kazanim";
  if (!kazanimModu && text.length < 30) {
    state.ceForm.error = "Soru üretmek için en az birkaç cümlelik bir metin girin (min. 30 karakter).";
    renderAll();
    return;
  }
  if (kazanimModu && !state.ceForm.outcomeCode) {
    state.ceForm.error = "Kazanımdan üretim için önce bir kazanım seçin — bu modda dayanak kazanımın kendisidir.";
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
    // Madde 1: şube yalnızca etiket olarak taşınır; AI çağrısına (aiGenerateQuestions)
    // hiç gönderilmez, yalnızca üretilen soru nesnesine damgalanır.
    sube: (state.ceForm.sube || "").trim(),
    outcome: state.ceForm.outcomeCode, outcomeLabel: outcomeLabel(state.ceForm.outcomeCode), text: text,
  };
  // Kaynak metin ÜRETİMDEN ÖNCE saklanır: model metne atıf yapan bir soru
  // üretirse (Türkçe okuma kazanımlarında bu gereklidir) o metin sınavda
  // öğrenciye gösterilebilsin. Eskiden metin atılıyordu ve soru
  // cevaplanamaz hale geliyordu.
  /* §31: kazanım modunda saklanacak bir uyaran metin yoktur. kaynakEkle()
     çağrılmaz — çağrılsaydı boş/alakasız bir kaynak kaydı oluşur ve
     KAYNAK_LIMIT kuyruğundan gerçek kaynakları iterdi. srcId null kalır;
     needsSource da sunucuda zaten false'a sabitlenir. */
  doc.srcId = kazanimModu ? null : kaynakEkle(doc);
  doc.mode = kazanimModu ? "kazanim" : "kaynak";
  doc.guidance = kazanimModu ? String(state.ceForm.guidance || "").trim() : "";
  // Yerel simülasyon da bu adetlere uymalı (§14h).
  doc.mcCount = state.ceForm.mcCount;
  doc.openCount = state.ceForm.openCount;
  state.ai.busy = true;
  busySince = Date.now();
  renderAll();
  try {
    const qs = await aiGenerateQuestions(doc);
    if (qs.length) {
      state.questions = state.questions.concat(qs);
      state.ceForm.error = "";
      // Denetim izi: yapay zekâ öneri üretti. Bu kaydın karşılığı, İçerik
      // Uzmanı onaylayınca/reddedince yazılan "soru_onaylandi/reddedildi"dir;
      // ikisi birlikte HITL zincirinin ilk halkasını belgeler.
      auditKaydet("soru_uretildi", {
        adet: qs.length,
        /* DOĞRU ATIF: simülasyon modunda üretilen soruya GERÇEK model adı
           yazmak denetim izini yalancı yapar. `state.ai.model` son yoklamadan
           kalma olabilir; yalnızca gerçekten model çağrıldıysa (uretenModel
           dolu) o ad kullanılır, aksi hâlde durum açıkça yazılır. */
        model: qs[0].uretenModel || (state.ai.mode === "live" ? (state.ai.model || null) : "yerel simülasyon (model çağrılmadı)"),
        fellBack: state.ai.mode === "live" ? state.ai.usingFallback === true : undefined,
        soru: auditKisalt(qs[0].body),
        not: (state.ceForm.subject || "") + " · " + (state.ceForm.grade || "") + ". sınıf · " +
             (state.ceForm.outcomeCode || "kazanım yok") +
             (qs.some(function (q) { return q.dilUyarisi; }) ? " · DİL UYARISI var" : ""),
      });
    }
  } finally {
    state.ai.busy = false;
    renderAll();
  }
}

/* ===========================================================================
   KAZANIM-SORU HİZALAMA DENETİMİ (arayüz) — içerik geçerliği
   ===========================================================================
   NEDEN: Öğretmen bir kazanım seçiyor, model o kazanım için soru üretiyor.
   Ama ürettiği soru gerçekten O kazanımı mı ölçüyor? Ölçmede buna "içerik
   geçerliği" denir. "Metnin yüzey anlamını belirleyebilme" için üretilmiş bir
   soru aslında derin anlam ölçüyorsa, sonuç yanlış kazanıma yazılır ve ısı
   haritası öğretmeni yanıltır.

   TASARIM:
   - Denetimi ÜRETEN çağrı yapmaz; ayrı ve bağımsız bir çağrıdır. Model kendi
     ürettiğini onaylamaya eğilimlidir.
   - OTOMATİK ÇALIŞMAZ; düğmeyle tetiklenir (her denetim bir model çağrısıdır).
   - Hiçbir soruyu reddetmez veya silmez (agents.md §7.1) — öğretmene sinyaldir.
   - Öneri kodu yalnızca gerçekten tanımlı kazanımlardan gelebilir; sunucu da
     ayrıca doğrular, böylece model kod uyduramaz.
   - Sessiz düşüş yok: çağrı başarısız olursa hata yazılır, uydurma sonuç yok.
   =========================================================================== */

function alignKey(qid) { return String(qid); }

/** Öneri havuzu: tanımlı kazanımlar + (yüklüyse) müfredat kataloğu. */
function alignAdaylari(ders) {
  const liste = OUTCOMES_LIST().map(function (o) {
    const p = o.label.split(" — ");
    return { kod: o.code, metin: p.length > 1 ? p.slice(1).join(" — ") : o.label };
  });
  const k = (state.katalog || {})[katalogAnahtari(ders, state.ceForm.grade)];
  if (k) {
    const mevcut = {};
    liste.forEach(function (x) { mevcut[x.kod] = true; });
    k.kazanimlar.forEach(function (x) {
      if (!mevcut[x.kod] && x.uygunluk === "yazili") liste.push({ kod: x.kod, metin: x.metin });
    });
  }
  return liste.slice(0, 60);
}

async function runAlignment() {
  const bekleyen = state.questions.filter(function (q) { return q.status === "ai_generated"; });
  if (!bekleyen.length) return;

  // Kazanıma göre grupla: her kazanım için ayrı denetim çağrısı yapılır,
  // çünkü denetim "bu soru BU kazanımı ölçüyor mu" sorusudur.
  const gruplar = {};
  bekleyen.forEach(function (q) { (gruplar[q.outcome] = gruplar[q.outcome] || []).push(q); });

  state.alignment = state.alignment || {};
  bekleyen.forEach(function (q) { state.alignment[alignKey(q.id)] = { loading: true }; });
  renderAll();

  const kodlar = Object.keys(gruplar);
  for (let i = 0; i < kodlar.length; i++) {
    const kod = kodlar[i];
    const grup = gruplar[kod];
    try {
      const j = await apiPost(AI_API.alignment, {
        outcomeCode: kod,
        outcomeLabel: outcomeLabel(kod),
        questions: grup.map(function (q) { return { type: q.type, body: q.body }; }),
        candidates: alignAdaylari(state.ceForm.subject)
      });
      (j.results || []).forEach(function (r) {
        const q = grup[r.index - 1];
        if (!q) return;
        state.alignment[alignKey(q.id)] = {
          karar: r.karar, gerekce: r.gerekce, onerilenKod: r.onerilenKod,
          model: (j.meta && j.meta.model) || ""
        };
      });
    } catch (e) {
      const mesaj = String((e && e.message) || e);
      grup.forEach(function (q) { state.alignment[alignKey(q.id)] = { error: mesaj }; });
    }
  }
  saveState();
  renderAll();
}

var ALIGN_ETIKET = {
  olcuyor: { ad: "kazanımı ölçüyor", sinif: "pill-success" },
  kismen: { ad: "kısmen ölçüyor", sinif: "pill-warning" },
  olcmuyor: { ad: "bu kazanımı ölçmüyor", sinif: "pill-critical" },
  belirsiz: { ad: "karar verilemedi", sinif: "pill-neutral" }
};

/** Tek bir soru kartında gösterilen hizalama satırı. */
function alignmentRowHtml(q) {
  const d = (state.alignment || {})[alignKey(q.id)];
  if (!d) return "";
  if (d.loading) return '<div class="al-row al-loading">Kazanım denetimi yapılıyor…</div>';
  if (d.error) {
    return '<div class="al-row al-err"><b>Kazanım denetimi yapılamadı.</b> ' + escapeHtml(d.error) + "</div>";
  }
  const e = ALIGN_ETIKET[d.karar] || ALIGN_ETIKET.belirsiz;
  const oneri = d.onerilenKod
    ? '<div class="al-oneri">Daha uygun görünen kazanım: <b>' + escapeHtml(d.onerilenKod) +
      '</b> <button class="btn btn-secondary btn-sm al-uygula" data-qid="' + q.id +
      '" data-kod="' + escapeHtml(d.onerilenKod) + '">Bu kazanıma taşı</button></div>'
    : "";
  return '<div class="al-row"><div class="al-bas"><span class="pill ' + e.sinif + '">' + e.ad + "</span>" +
    '<span class="al-hint">içerik geçerliği denetimi · bağımsız çağrı</span></div>' +
    (d.gerekce ? '<div class="al-gerekce">' + escapeHtml(d.gerekce) + "</div>" : "") +
    oneri + "</div>";
}

/** Bekleyen soru listesinin başındaki denetim çubuğu. */
function alignmentBarHtml(bekleyen) {
  if (!bekleyen.length) return "";
  const d = state.alignment || {};
  const yukleniyor = bekleyen.some(function (q) { return (d[alignKey(q.id)] || {}).loading; });
  const sonuclu = bekleyen.filter(function (q) { const x = d[alignKey(q.id)]; return x && x.karar; });
  let ozet = "";
  if (sonuclu.length) {
    const say = { olcuyor: 0, kismen: 0, olcmuyor: 0, belirsiz: 0 };
    sonuclu.forEach(function (q) { const k = d[alignKey(q.id)].karar; if (say[k] != null) say[k]++; });
    const sorunlu = say.kismen + say.olcmuyor;
    ozet = '<span class="al-ozet">' + say.olcuyor + " soru kazanımı ölçüyor" +
      (sorunlu ? ", <b>" + sorunlu + "</b> soruda sorun var" : "") + "</span>";
  }
  return '<div class="al-bar"><button class="btn btn-secondary btn-sm" id="btnAlign"' +
    (yukleniyor ? " disabled" : "") + ">" +
    (yukleniyor ? "Denetleniyor…" : (sonuclu.length ? "Kazanım Denetimini Yenile" : "Kazanım Denetimi Yap")) +
    "</button>" + ozet +
    '<span class="al-aciklama">Üretilen sorular seçtiğiniz kazanımı gerçekten ölçüyor mu? ' +
    "Denetimi soruyu üreten çağrı değil, ayrı ve bağımsız bir çağrı yapar.</span></div>";
}

function wireAlignment() {
  const b = document.getElementById("btnAlign");
  if (b) b.onclick = function () { runAlignment(); };
  document.querySelectorAll(".al-uygula").forEach(function (btn) {
    btn.onclick = function () {
      const qid = btn.dataset.qid, kod = btn.dataset.kod;
      const q = state.questions.filter(function (x) { return String(x.id) === String(qid); })[0];
      if (!q) return;
      // Önerilen kazanım tanımlı değilse (katalogdan geldiyse) önce ekle.
      if (!OUTCOMES_LIST().some(function (o) { return o.code === kod; })) {
        const aday = alignAdaylari(state.ceForm.subject).filter(function (x) { return x.kod === kod; })[0];
        if (aday) addOutcome(aday.kod, aday.metin);
      }
      q.outcome = kod;
      // Kazanım değişti; eski denetim sonucu artık geçersiz.
      if (state.alignment) delete state.alignment[alignKey(q.id)];
      saveState();
      renderAll();
    };
  });
}

/**
 * Model çıktısında Türkçe dışı alfabe saptandıysa İçerik Uzmanına uyarı.
 *
 * ÖLÇÜLEN GERÇEK OLAY (26 Ağustos): llama-3.3-70b üretilen soruya Kiril harfi
 * karıştırdı — "…katkılarını açıklaйте." Ölçülen sıklık ~10 soruda 1.
 * Otomatik düzeltilmiyor: Kiril→Latin çevirisi tahmine dayanır ve anlamı
 * bozabilir. Karar zaten insanda (agents.md §1); doğru davranış gizlemek
 * değil GÖSTERMEK (§6.3-5).
 */
function dilUyarisiHtml(q) {
  if (!q || !q.dilUyarisi) return "";
  return '<div class="dil-uyari">⚠ <b>Bu soruda Türkçe olmayan karakterler var.</b> ' +
    'Model, metne başka bir alfabeden harf karıştırmış olabilir. ' +
    'Onaylamadan önce soruyu ve şıkları okuyup düzeltin.</div>';
}

/* Madde 1: şube (bölüm) etiketi yalnızca ORGANİZASYON/RAPORLAMA amaçlıdır.
   MEB kazanımları şubeye göre değişmediği için bu bilgi hiçbir AI istemine
   girmez (bkz. buildQuestionPrompt) ve kazanım filtrelemesini etkilemez
   (outcomeUyar/uygunKazanimlar). Yalnızca "bu soru hangi şube için
   üretildi" bilgisini soru kartlarında ve (Madde 3'te) öğretmenin havuz
   filtresinde görünür kılar. */
function subeRozetiHtml(q) {
  if (!q || !q.sube) return "";
  return '<span class="pill pill-neutral" title="Bu kaynak için belirtilen şube">👥 ' + escapeHtml(q.sube) + '</span>';
}

/* ===========================================================================
   PAKET 4a/4b ORTAK YARDIMCILAR — şık yeniden sıralama
   ===========================================================================
   Şık `key` değerleri ("A","B","C",...) HER ZAMAN dizideki konuma göre
   atanır (bkz. sunucu tarafı src/routes/ai.ts aynı kural). Şıklar herhangi
   bir sebeple (İçerik Uzmanı sürükleyip taşıdı — 4a, ya da AI çıktısı
   karıştırıldı — 4b) yeniden sıralandığında:
     1) harfler yeni konuma göre A,B,C,... olarak YENİDEN atanır (etiketler
        sabit kalır, metinler yer değiştirir),
     2) doğru şıkkın harfi (correctKey) metniyle birlikte yeni harfe TAŞINIR,
     3) her çeldiricinin gerekçesi (distractorRationale) de aynı eşlemeyle
        yeni harfe taşınır — yoksa "B şıkkını seçen..." gerekçesi artık B'de
        olmayan bir metne bağlanmış olurdu.
   Bu iki fonksiyon saf yardımcılardır (yan etkisiz girdi işleme + kontrollü
   mutasyon) ve hem 4a (sürükle-bırak) hem 4b (Fisher-Yates) tarafından
   ORTAK kullanılır — mantık iki yerde ayrı ayrı yazılıp birbirinden
   sapmasın diye. */
const OPT_LETTERS = "ABCDEFGH".split("");

/**
 * orderedOptions: şıklar YENİ sırada, her biri hâlâ ESKİ `.key` değerini
 * taşıyor halde verilir (örn. sürüklemeyle yeniden dizilmiş dizi, ya da
 * Fisher-Yates sonrası karışık dizi).
 * Döner: { newOptions, eskiHarfToYeniHarf }
 *   - newOptions: aynı nesneler, `.key` alanı konuma göre A,B,C,... olacak
 *     şekilde YENİDEN yazılmış (kopya nesneler; orijinaller mutasyona
 *     uğramaz — çağıran q.options'a kendisi atar).
 *   - eskiHarfToYeniHarf: { "C": "A", "A": "B", ... } gibi eski→yeni harf
 *     eşlemesi; correctKey ve distractorRationale bunu kullanarak taşınır.
 */
function relabelOptionsAndGetKeyMap(orderedOptions) {
  const eskiHarfToYeniHarf = {};
  const newOptions = (orderedOptions || []).map(function (o, i) {
    const eskiHarf = o.key;
    const yeniHarf = OPT_LETTERS[i] || String(i + 1);
    if (eskiHarf != null) eskiHarfToYeniHarf[eskiHarf] = yeniHarf;
    const kopya = Object.assign({}, o);
    kopya.key = yeniHarf;
    return kopya;
  });
  return { newOptions: newOptions, eskiHarfToYeniHarf: eskiHarfToYeniHarf };
}

/**
 * q.correctKey ve q.distractorRationale'ı eskiHarfToYeniHarf eşlemesine göre
 * yerinde (in-place) günceller ve q'yu döner. q.options'ın KENDİSİ bu
 * fonksiyonun sorumluluğunda değildir — çağıran, relabelOptionsAndGetKeyMap
 * ile ürettiği newOptions'ı ayrıca q.options'a atamalıdır.
 */
function remapCorrectKeyAndRationale(q, eskiHarfToYeniHarf) {
  if (!q || !eskiHarfToYeniHarf) return q;
  if (q.correctKey != null && eskiHarfToYeniHarf[q.correctKey] != null) {
    q.correctKey = eskiHarfToYeniHarf[q.correctKey];
  }
  if (q.distractorRationale) {
    const yeni = {};
    Object.keys(q.distractorRationale).forEach(function (eskiHarf) {
      const yeniHarf = eskiHarfToYeniHarf[eskiHarf] != null ? eskiHarfToYeniHarf[eskiHarf] : eskiHarf;
      yeni[yeniHarf] = q.distractorRationale[eskiHarf];
    });
    q.distractorRationale = yeni;
  }
  return q;
}

/**
 * Standart Fisher-Yates (Knuth) karıştırma — yeni bir dizi döner, girdiyi
 * mutasyona uğratmaz. Paket 4b: AI üretimi ardışık "hep B doğru" sapmasını
 * önlemek için üretimden hemen sonra her ÇSS sorunun şıkları bu fonksiyonla
 * karıştırılır, ardından relabelOptionsAndGetKeyMap + remapCorrectKeyAndRationale
 * ile harfler/doğru şık/gerekçeler yeniden hizalanır.
 */
function fisherYatesShuffle(arr) {
  const a = (arr || []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/**
 * Bir ÇSS sorunun şıklarını Fisher-Yates ile karıştırır ve harf/doğru
 * şık/gerekçeleri senkronize eder. q yerinde (in-place) güncellenir.
 * Tek şıklı ya da şıksız sorularda (karıştıracak bir şey yoksa) dokunmaz.
 */
function shuffleQuestionOptions(q) {
  if (!q || q.type !== "mc" || !Array.isArray(q.options) || q.options.length < 2) return q;
  const karisik = fisherYatesShuffle(q.options);
  const { newOptions, eskiHarfToYeniHarf } = relabelOptionsAndGetKeyMap(karisik);
  q.options = newOptions;
  remapCorrectKeyAndRationale(q, eskiHarfToYeniHarf);
  return q;
}

function renderPendingQuestionCard(q) {
  const optsHtml = q.type === "mc" ? q.options.map(function (o, i) {
    // Paket 4a: satır sürüklenebilir (draggable) + erişilebilir yukarı/aşağı
    // düğmeleri. data-index HER RENDER'DA güncel diziye göre yazılır; harf
    // (o.key) taşınan metinle birlikte gider ama moveOption() sonrasında
    // relabelOptionsAndGetKeyMap ile konuma göre yeniden atanır.
    return '<div class="opt-row opt-draggable" draggable="true" data-qid="' + q.id + '" data-index="' + i + '">' +
      '<span class="opt-drag-handle" title="Sürükleyerek sırala" aria-hidden="true">⠿</span>' +
      '<span class="opt-key">' + o.key + '</span>' +
      '<input type="text" data-qid="' + q.id + '" data-okey="' + o.key + '" class="opt-input" value="' + escapeHtml(o.text) + '">' +
      '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);">' +
      '<input type="radio" name="correct-' + q.id + '" data-qid="' + q.id + '" data-okey="' + o.key + '" class="correct-radio" ' + (o.key === q.correctKey ? "checked" : "") + '> doğru</label>' +
      '<span class="opt-reorder-btns">' +
      '<button type="button" class="opt-move-btn" data-qid="' + q.id + '" data-index="' + i + '" data-dir="-1" aria-label="Şıkkı yukarı taşı"' + (i === 0 ? " disabled" : "") + '>▲</button>' +
      '<button type="button" class="opt-move-btn" data-qid="' + q.id + '" data-index="' + i + '" data-dir="1" aria-label="Şıkkı aşağı taşı"' + (i === q.options.length - 1 ? " disabled" : "") + '>▼</button>' +
      '</span></div>';
  }).join("") : "";
  return '<div class="q-card" data-card-id="' + q.id + '">' +
    '<div class="q-meta">' +
    '<span class="pill pill-accent">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
    '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' +
    bloomPill(q.bloom) +
    '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span>' +
    subeRozetiHtml(q) +
    kaynakRozetHtml(q) +
    '<span class="time-tag">⏱ AI önerisi: ' + q.aiTime + 's</span></div>' +
    dilUyarisiHtml(q) +
    kaynakBlokHtml(q, "review") +
    '<textarea class="q-body-input" data-qid="' + q.id + '" data-field="body" rows="2" style="width:100%;border:1px solid var(--border-strong);border-radius:8px;padding:8px;font-family:inherit;font-size:13.5px;font-weight:600;background:var(--surface);color:var(--text);">' + escapeHtml(q.body) + '</textarea>' +
    '<div style="margin-top:8px;">' + optsHtml + '</div>' +
    distractorHtml(q) +
    alignmentRowHtml(q) +
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

/* Paket 4a: bir ÇSS sorunun i. şıkkını j. konuma taşır. Harfler konuma göre
   yeniden atanır, correctKey ve distractorRationale ortak yardımcılarla
   (relabelOptionsAndGetKeyMap/remapCorrectKeyAndRationale — Paket 4b'nin
   Fisher-Yates karıştırmasıyla AYNI fonksiyonlar) yeni harfe taşınır.
   renderAll() hem kartı yeniden çizer hem de saveState() üzerinden kaydeder
   (bkz. renderAll tanımı) — onay/red düğmelerinde kullanılan mevcut
   kalıpla birebir aynı: pending kart düzenlemeleri anlık saveSoon()
   ÇAĞIRMAZ, bir sonraki renderAll() (ör. bu taşıma) ile kalıcı hale gelir. */
function moveOption(q, eskiIndex, yeniIndex) {
  if (!q || !Array.isArray(q.options)) return;
  const n = q.options.length;
  if (eskiIndex < 0 || eskiIndex >= n || yeniIndex < 0 || yeniIndex >= n || eskiIndex === yeniIndex) return;
  const arr = q.options.slice();
  const tasinan = arr.splice(eskiIndex, 1)[0];
  arr.splice(yeniIndex, 0, tasinan);
  const { newOptions, eskiHarfToYeniHarf } = relabelOptionsAndGetKeyMap(arr);
  q.options = newOptions;
  remapCorrectKeyAndRationale(q, eskiHarfToYeniHarf);
  q.duzenlendi = true;
  renderAll();
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
  // Paket 4a — erişilebilir yukarı/aşağı düğmeleri (sürükle-bırak yapılamayan
  // ortamlar: klavye, dokunmatik, test otomasyonu için).
  document.querySelectorAll(".opt-move-btn").forEach(function (el) {
    el.onclick = function () {
      const q = findQuestion(el.dataset.qid);
      const i = Number(el.dataset.index);
      const yon = Number(el.dataset.dir);
      if (q) moveOption(q, i, i + yon);
    };
  });
  // Paket 4a — HTML5 sürükle-bırak (drag & drop) ile şık taşıma.
  let dragFromIndex = null;
  document.querySelectorAll(".opt-row.opt-draggable").forEach(function (el) {
    el.ondragstart = function (e) {
      dragFromIndex = Number(el.dataset.index);
      el.classList.add("opt-dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(dragFromIndex)); } catch (err) { /* bazı tarayıcılarda gerekmez */ }
      }
    };
    el.ondragend = function () { el.classList.remove("opt-dragging"); dragFromIndex = null; };
    el.ondragover = function (e) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      el.classList.add("opt-drop-target");
    };
    el.ondragleave = function () { el.classList.remove("opt-drop-target"); };
    el.ondrop = function (e) {
      e.preventDefault();
      el.classList.remove("opt-drop-target");
      const q = findQuestion(el.dataset.qid);
      const hedefIndex = Number(el.dataset.index);
      const kaynakIndex = dragFromIndex != null ? dragFromIndex :
        Number((e.dataTransfer && e.dataTransfer.getData("text/plain")) || NaN);
      if (q && Number.isFinite(kaynakIndex)) moveOption(q, kaynakIndex, hedefIndex);
      dragFromIndex = null;
    };
  });
  document.querySelectorAll(".approve-btn").forEach(function (el) {
    el.onclick = function () {
      const q = findQuestion(el.dataset.qid);
      if (q) {
        // Denetim izi: AI'ın ürettiği soruyu İNSAN onayladı.
        auditKaydet("soru_onaylandi", { qid: q.id, soru: auditKisalt(q.body),
          model: q.uretenModel || null, not: q.duzenlendi ? "onaylamadan önce düzenlendi" : null });
        q.status = "approved"; renderAll();
      }
    };
  });
  document.querySelectorAll(".reject-btn").forEach(function (el) {
    el.onclick = function () {
      const q = findQuestion(el.dataset.qid);
      if (q) {
        auditKaydet("soru_reddedildi", { qid: q.id, soru: auditKisalt(q.body), model: q.uretenModel || null });
        q.status = "rejected"; renderAll();
      }
    };
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
    /* MADDE 1 (kullanıcı bildirdi): Burası serbest metin girişi + <datalist>
       idi. İki sorun vardı: (a) yazdıkça liste filtreleniyor, kullanıcı
       "sadece Matematik çıkıyor" sanıyordu; (b) datalist açılır listesi
       tarayıcının kendi çizimi, biçimlendirilemiyor ve formun geri kalanıyla
       uyumsuz görünüyor. Kapsam üç derse indiği için <select> doğru kontrol:
       hepsi her zaman görünür ve diğer alanlarla aynı görünümde. */
    '<div class="field"><label for="ceSubject">Ders</label><select id="ceSubject">' +
    SUBJECTS_LIST().map(function (d) {
      return '<option value="' + escapeHtml(d) + '"' +
        (d === state.ceForm.subject ? " selected" : "") + ">" + escapeHtml(d) + "</option>";
    }).join("") + '</select></div>' +
    '<div class="field"><label for="ceGrade">Sınıf</label><select id="ceGrade">' +
    GRADES.map(function (g) { return '<option value="' + g + '"' + (String(g) === String(state.ceForm.grade) ? " selected" : "") + '>' + g + '. sınıf</option>'; }).join("") +
    '</select></div>' +
    /* MADDE 1: Şube (bölüm) — yalnızca ORGANİZASYON/RAPORLAMA etiketidir,
       kazanım filtrelemesini ETKİLEMEZ (MEB müfredatı şubeye göre değişmez)
       ve AI istemine hiç girmez. Serbest metin: okulların şube adlandırması
       (7-A, 7/A, 7-B1 ...) tek bir listeye sığmaz; <select> bunu kısıtlardı. */
    '<div class="field"><label for="ceSube">Şube <span style="font-weight:400;color:var(--text-muted);">(opsiyonel)</span></label>' +
    '<input id="ceSube" type="text" maxlength="20" value="' + escapeHtml(state.ceForm.sube || "") + '" ' +
    'placeholder="örn. ' + escapeHtml(siniflar()[0] || "7-A") + ' — boş bırakılabilir" title="Bu içerik hangi şube için üretiliyor? Yalnızca etiket amaçlıdır, kazanım listesini değiştirmez."></div>' +
    '<div class="field field-outcome"><label for="ceOutcome">Konu ve Kazanım</label>' +
    '<div class="input-with-actions">' +
    '<select id="ceOutcome">' +
    // Yalnızca seçili ders + sınıfa ait kazanımlar listelenir. "Tümünü göster"
    // açıksa hepsi gelir; seçili kazanım her durumda listede kalır ki
    // öğretmenin mevcut seçimi sessizce kaybolmasın.
    kazanimSecenekleriHtml() +
    '</select>' +
    '<button class="icon-btn" id="btnNewOutcome" title="Yeni kazanım tanımla" aria-label="Yeni kazanım tanımla">+</button>' +
    '<button class="icon-btn" id="btnDelOutcome" title="Seçili kazanımı sil" aria-label="Seçili kazanımı sil">−</button>' +
    '<button class="btn btn-secondary btn-sm" id="btnKatalog" title="MEB öğretim programından kazanım seç">Katalog</button></div>' +
    kazanimNotuHtml() + '</div>' +
    outcomeUyusmazlikHtml() +
    '<!--meta-grid-end-->' +
    (state.newOutcome.open
      ? '<div class="new-outcome"><div class="field-row">' +
        '<div class="field"><label>Kazanım kodu</label><input id="noCode" value="' + escapeHtml(state.newOutcome.code) + '" placeholder="örn. FEN.7.3.1"></div>' +
        '<div class="field" style="flex:2;"><label>Açıklama</label><input id="noLabel" value="' + escapeHtml(state.newOutcome.label) + '" placeholder="örn. Işığın Yansıması"></div></div>' +
        (state.newOutcome.error ? '<div class="pill pill-critical" style="margin-bottom:8px;">' + escapeHtml(state.newOutcome.error) + '</div>' : "") +
        '<button class="btn btn-primary btn-sm" id="btnSaveOutcome">Kazanımı Ekle</button> ' +
        '<button class="btn btn-secondary btn-sm" id="btnCancelOutcome">Vazgeç</button></div>'
      : "") + '</div>' +
    uretimModuSecHtml() +
    (uretimModu() === "kazanim" ? yonergeAlaniHtml() :
    '<div class="field ce-text-field"><div class="label-row"><label for="ceText">Ders notu / metin</label>' +
    /* §28q: "öğretmen kendi ders oluşturabilsin, notlar kayıtlı dursun." Bu
       düğüm mevcut Kitaplık altyapısını (IndexedDB, kalıcı, ad+tarih+boyutla
       listelenen) YAPIŞTIRILAN METNE de açar — eskiden yalnızca YÜKLENEN
       PDF'ler kaydediliyordu. Metni "1 sayfalık kitap" olarak kaydeder;
       kitapAc()/kitapKaldir() birebir aynı akışla çalışır. */
    (state.ceForm.text.trim().length >= 30
      ? '<button class="btn btn-secondary btn-sm" id="btnKaynakKaydet" type="button" ' +
        'title="Bu metni adlandırıp kitaplığa kaydet — bir daha yazmadan tekrar açabilirsiniz">📚 Kitaplığa kaydet</button>'
      : "") +
    '<span class="char-count' + (state.ceForm.text.length > 5500 ? " near" : "") + '">' + state.ceForm.text.length + ' / 6000</span></div>' +
    '<input type="file" id="ceFile" accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none;">' +
    '<div class="dropzone' + (state.ceForm.pdfLoading ? " busy" : "") + '" id="dropzone">' +
    (state.ceForm.pdfLoading
      ? '<div class="dz-spin"></div><div class="dz-title">Dosya okunuyor…</div>' +
        '<div class="dz-sub">İçerik çıkarılıyor, bu birkaç saniye sürebilir.</div>'
      : '<div class="dz-icon">📄</div>' +
        '<div class="dz-title">Dosyayı buraya sürükleyin<span class="dz-or"> veya </span>' +
        '<button class="dz-browse" id="btnUpload" type="button">bilgisayarınızdan seçin</button></div>' +
        '<div class="dz-sub">PDF · TXT · MD · DOCX — dosya sunucuya gönderilmez, tarayıcınızda okunur. ' +
        'PDF\'ler kitaplığa kaydedilir; aynı dosyayı tekrar yüklemeniz gerekmez.</div>' +
        (state.ceForm.fileName ? '<div class="dz-file">✓ ' + escapeHtml(state.ceForm.fileName) + '</div>' : "")) +
    '</div>' +
    ocrOneriHtml() +
    pdfPickerHtml() +
    kitaplikHtml() +
    '<div class="dz-divider"><span>veya metni doğrudan aşağıya yapıştırın</span></div>' +
    '<textarea id="ceText" placeholder="Öğrencilere sunulacak ders notunu buraya yapıştırın...">' + escapeHtml(state.ceForm.text) + '</textarea></div>') +
    (state.ceForm.error ? '<div class="pill pill-critical" style="margin-bottom:10px;">' + escapeHtml(state.ceForm.error) + '</div>' : "") +
    '<div class="gen-bar">' +
    '<div class="field"><label>Çoktan seçmeli</label>' +
    '<input id="ceMcCount" type="number" min="0" max="8" value="' + state.ceForm.mcCount + '"></div>' +
    '<div class="field"><label>Açık uçlu</label>' +
    '<input id="ceOpenCount" type="number" min="0" max="4" value="' + state.ceForm.openCount + '"></div>' +
    /* MADDE 2: bilişsel düzey ağırlığı — tamamen opsiyonel bir YÖNLENDİRME.
       "Dengeli" seçiliyken istem hiç değişmez (mevcut davranış). Zorunlu bir
       oran dayatmaz; öğretmen/içerik uzmanı isterse kullanır. */
    '<div class="field"><label for="ceBloomFocus">Bilişsel düzey <span style="font-weight:400;color:var(--text-muted);">(opsiyonel)</span></label>' +
    '<select id="ceBloomFocus">' +
    '<option value="dengeli"' + (state.ceForm.bloomFocus === "dengeli" ? " selected" : "") + '>Dengeli (varsayılan)</option>' +
    '<option value="temel"' + (state.ceForm.bloomFocus === "temel" ? " selected" : "") + '>Temel düzeyi vurgula (hatırlama/anlama)</option>' +
    '<option value="ust"' + (state.ceForm.bloomFocus === "ust" ? " selected" : "") + '>Üst düzeyi vurgula (analiz/değerlendirme)</option>' +
    '</select></div>' +
    '<div class="gen-action">' +
    '<button class="btn btn-primary btn-lg" id="btnGenerate"' + (state.ai.busy ? " disabled" : "") + '>' +
    (state.ai.busy ? '⏳ Model çalışıyor… <span id="busyTimer" class="tabular">0 sn</span>' : "🤖 AI ile Soru Üret") + '</button>' +
    '<span class="gen-hint">' +
    (uretimModu() === "kazanim"
      ? escapeHtml(state.ceForm.outcomeCode || "seçili kazanım") + ' kazanımından '
      : "Seçilen metinden ") +
    state.ceForm.mcCount + ' çoktan seçmeli + ' + state.ceForm.openCount + ' açık uçlu soru taslağı üretilir</span>' +
    '</div></div></div>' +
    '<div class="card ce-pending"><div class="card-head"><h3>2 · İncelemeyi Bekleyenler</h3><span class="hint">' + pending.length + ' soru</span></div>' +
    alignmentBarHtml(pending) +
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
        '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span>' +
        subeRozetiHtml(q) +
        '<span class="pill pill-success">Onaylı</span></div></div>' +
        '<button class="btn btn-secondary btn-sm del-q" data-qid="' + q.id + '" title="Bu soruyu havuzdan sil">Sil</button></div>';
    }).join("") : '<div class="empty-state">Onaylanan soru henüz yok.</div>') +
    (state.poolError ? '<div class="pill pill-critical" style="margin-top:10px;">' + escapeHtml(state.poolError) + '</div>' : "") + '</div>' +
    rejectedPoolHtml("ce");
}

function renderContentExpert() {
  /* 🔴 KATALOG GARANTİSİ (§28n — PROGRESS §27b'nin "doğru yol"u).
     `katalogHazirla()` eskiden YALNIZCA üç yerden çağrılıyordu: ders değişimi,
     sınıf değişimi ve açılış. `loadDemoScenario()` ders/sınıfı PROGRAMATİK
     değiştirdiği için hiçbirine uğramıyordu; sonuç: demo senaryosu yüklenince
     ders "Fen Bilimleri 7" oluyor ama Fen kataloğu yüklenmiyor ve seçicide
     TEK kazanım kalıyordu (ölçüldü: 26 yerine 1).
     Kısa yol `loadDemoScenario()` sonuna bir çağrı eklemek olurdu; ama aynı
     hata BAŞKA bir programatik değişiklikte tekrar ederdi. Bu yüzden garanti
     çizim noktasına konuldu: ders/sınıf hangi yoldan değişirse değişsin,
     panel bir sonraki çizimde doğru kataloğu yükler. Yükleme başarılıysa
     `katalogHazirla()` kendi `renderAll()`'ını çağırır; katalog artık
     bellekte olduğu için ikinci çağrı anında geri döner — döngü yoktur. */
  katalogHazirla();
  const root = document.getElementById("panel-content_expert");
  root.innerHTML = ceTabsHtml() + '<div id="ceTabContent">' +
    (state.ceTab === 2 ? cePoolHtml() : ceCreateHtml()) + '</div>';
  wireCeTabs();
  if (state.ceTab === 2) { wireRejectedPool("ce"); return; }

  const rg = document.getElementById("btnRemedialGen");
  if (rg) rg.onclick = onGenerateQuestions;
  const rd = document.getElementById("btnRemedialDismiss");
  if (rd) rd.onclick = function () { state.remedial = null; renderAll(); };
  document.getElementById("btnGenerate").onclick = onGenerateQuestions;
  var kks = document.getElementById("btnKaynakKaydet");
  if (kks) kks.onclick = kaynakKitapligaKaydet;
  wireAlignment();
  document.getElementById("ceTitle").oninput = function (e) { state.ceForm.title = e.target.value; };
  const subEl = document.getElementById("ceSubject");
  const dersDegisti = function (deger) {
    addSubject(deger);
    // Ders değişince seçili kazanım artık başka bir derse ait olabilir.
    outcomeSeciminiTazele();
    renderAll();
    katalogHazirla(true);   // elle değişim: başarısız denemeyi yeniden dene
  };
  // Ders artık <select>; serbest metin ve Enter dinleyicisi kaldırıldı.
  subEl.onchange = function (e) { dersDegisti(e.target.value); };
  document.getElementById("ceGrade").onchange = function (e) {
    state.ceForm.grade = parseInt(e.target.value, 10) || e.target.value;
    outcomeSeciminiTazele(); saveSoon(); renderAll();
    katalogHazirla(true);   // elle değişim: başarısız denemeyi yeniden dene
  };
  const tumKaz = document.getElementById("ceShowAllOutcomes");
  if (tumKaz) tumKaz.onclick = function () {
    state.ceForm.showAllOutcomes = !state.ceForm.showAllOutcomes; renderAll();
  };
  document.getElementById("ceOutcome").onchange = function (e) { kazanimSecildi(e.target.value); renderAll(); };
  /* §31: kazanım modunda #ceText hiç render edilmez; eski kod koşulsuz
     getElementById().oninput yazıyordu ve bu modda TypeError atardı. */
  const ceTextEl = document.getElementById("ceText");
  if (ceTextEl) ceTextEl.oninput = function (e) { state.ceForm.text = e.target.value.slice(0, 6000); };
  const ceGuidanceEl = document.getElementById("ceGuidance");
  /* TUZAK 3: metin kutusunun oninput'undan renderAll() ÇAĞRILMAZ — sayfa
     yeniden çizilir ve kullanıcı yazarken odak kaybeder. Karakter sayacı bir
     sonraki çizimde güncellenir; bu bilinçli bir ödünleşmedir. */
  if (ceGuidanceEl) ceGuidanceEl.oninput = function (e) { state.ceForm.guidance = e.target.value.slice(0, 600); };
  /* Mod kartları: beş panel aynı anda DOM'da olduğu için id değil SINIF +
     querySelectorAll kullanılır (§6.3-2 dersi / TUZAK 1). */
  document.querySelectorAll("[data-uretim-modu]").forEach(function (el) {
    el.onclick = function () {
      const yeni = el.dataset.uretimModu === "kazanim" ? "kazanim" : "kaynak";
      if (uretimModu() === yeni) return;
      state.ceForm.mode = yeni;
      /* Mod değişince kullanıcının yazdığı metin ya da yönerge SİLİNMEZ —
         geri döndüğünde bulur. Yalnızca hata mesajı temizlenir, çünkü eski
         mod için geçerliydi. */
      state.ceForm.error = "";
      renderAll();
    };
  });
  // Madde 1: şube yalnızca etiket — değişimi kazanım listesini tetiklemez.
  document.getElementById("ceSube").oninput = function (e) { state.ceForm.sube = e.target.value.slice(0, 20); };

  // Kazanım tanımlama
  const bKat = document.getElementById("btnKatalog");
  if (bKat) bKat.onclick = function () { katalogAc(); };
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
  const runOcr = document.getElementById("btnRunOcr");
  if (runOcr) runOcr.onclick = runOcrOnScannedPdf;
  const pc = document.getElementById("btnClearPdf");
  // "PDF'i kaldır" yalnızca AÇIK olan kitabı kapatır; kitaplıktan SİLMEZ.
  // Silme işlemi kitaplık listesindeki × düğmesindedir ve onay ister.
  if (pc) pc.onclick = function () { state.pdf = null; pdfPages = null; state.ceForm.fileName = ""; renderAll(); };
  wireKitaplik();

  /* §31: #ceFile yalnızca "kaynak" modunda render edilir. Bu atama korumasızdı
     ve kazanım modunda TypeError atıyordu — hata wireCeCreate()'i ortasında
     kesince ceMcCount/ceOpenCount/ceBloomFocus/wirePendingCards hiç bağlanmadan
     kalıyor, yani "Soru Üret" düğmesi de dahil formun altı ÖLÜYORDU.
     (Gerçek tarayıcı testinde yakalandı; node --check bunu göremez — TUZAK 2.) */
  if (fileEl) fileEl.onchange = async function () {
    const f = fileEl.files && fileEl.files[0];
    if (!f) return;
    // Yeni bir dosya seçimi eski "taranmış PDF" OCR teklifini geçersiz kılar.
    taranmisPdfDosya = null;
    if (f.size > 25 * 1024 * 1024) { state.ceForm.error = "Dosya çok büyük (en fazla 25 MB)."; renderAll(); return; }

    // --- DOCX yolu ---
    if (/\.docx$/i.test(f.name) || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      state.ceForm.pdfLoading = true; state.ceForm.error = ""; renderAll();
      try {
        const metin = await extractDocx(f);
        if (!metin) {
          state.ceForm.error = "Bu Word belgesinde metin bulunamadı. Belge boş olabilir ya da yalnızca " +
            "görsel/tablo içeriyor olabilir.";
        } else {
          state.ceForm.text = metin.slice(0, 6000);
          state.ceForm.fileName = f.name + (metin.length > 6000 ? " — ilk 6000 karakter alındı" : " yüklendi");
          if (!state.ceForm.title) state.ceForm.title = f.name.replace(/\.docx$/i, "");
        }
      } catch (err) {
        state.ceForm.error = "Word belgesi okunamadı: " + String((err && err.message) || err) +
          ". Metni kopyalayıp doğrudan yapıştırabilirsiniz.";
      } finally {
        state.ceForm.pdfLoading = false;
        fileEl.value = "";
        renderAll();
      }
      return;
    }

    // --- PDF yolu ---
    if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
      state.ceForm.pdfLoading = true; state.ceForm.error = ""; renderAll();
      try {
        pdfPages = await extractPdf(f);
        const doluSayfa = pdfPages.filter(function (s) { return s.text.length > 20; }).length;
        if (!doluSayfa) {
          const sayfaSayisi = pdfPages.length;
          state.pdf = null; pdfPages = null;
          taranmisPdfDosya = { file: f, sayfaSayisi: sayfaSayisi };
          state.ceForm.error = "Bu PDF'te metin katmanı bulunamadı — taranmış görüntü olabilir. " +
            "Aşağıdaki “OCR ile Dene” düğmesiyle sayfaları otomatik okutabilir ya da metni kopyalayıp yapıştırabilirsiniz.";
        } else {
          // Kitaplığa yaz: öğretmen aynı PDF'i her oturumda yeniden
          // yüklemek zorunda kalmasın. Başarısız olursa kitapligaEkle null
          // döner, `kitaplikHata` ekranda görünür ve PDF oturumluk kullanılır.
          const kayit = await kitapligaEkle(f.name, pdfPages);
          state.pdf = {
            ad: f.name,
            sayfaSayisi: pdfPages.length,
            from: 1,
            to: Math.min(3, pdfPages.length),
            kitapId: kayit ? kayit.id : null
          };
          if (!state.ceForm.title) state.ceForm.title = f.name.replace(/\.pdf$/i, "");
          state.ceForm.fileName = f.name + (kayit ? " kitaplığa eklendi" : " yüklendi") + " — sayfa aralığı seçin";
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
  document.getElementById("ceBloomFocus").onchange = function (e) { state.ceForm.bloomFocus = e.target.value; saveSoon(); };
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

/* §32 (Burak Modül 2): "bu rolde havuz açık mı?" — eksik/eski kayıtlarda
   (localStorage'da `rejectedOpenByRole` yoksa) varsayılan KAPALI kalır,
   böylece davranış eskisiyle aynı olur. */
function rejectedAcikMi(mod) {
  const durum = state.rejectedOpenByRole || {};
  return durum[mod] === true;
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
  const acik = rejectedAcikMi(mod);
  return '<div class="card" style="margin-top:16px;"><div class="card-head">' +
    '<h3>Reddedilen Soru Havuzu</h3>' +
    // §32: id role göre benzersiz — aksi halde iki panelde aynı id oluşur ve
    // getElementById DOM sırasındaki İLKİNİ bulup ikinciyi ölü bırakır.
    '<button class="btn btn-secondary btn-sm" id="btnToggleRejected-' + mod + '">' + rejected.length + ' soru · ' + (acik ? "gizle" : "göster") + '</button></div>' +
    (acik ? '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">' + aciklama + '</div>' : "") +
    (!acik ? "" : rejected.length
      ? rejected.map(function (q) {
          return '<div class="pool-item"><div class="p-body">' + escapeHtml(q.body) +
            '<div class="p-tags"><span class="pill pill-neutral">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
            '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' +
            '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span>' +
            '<span class="pill pill-critical">Reddedildi</span></div></div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">' +
            btn.replace(/QID/g, q.id) +
            '<button class="btn btn-secondary btn-sm del-q" data-qid="' + q.id + '" title="Kalıcı olarak sil">Sil</button></div></div>';
        }).join("")
      : '<div class="empty-state">Reddedilen soru yok.</div>') + '</div>';
}

function wireRejectedPool(mod) {
  const tg = document.getElementById("btnToggleRejected-" + mod);
  if (tg) tg.onclick = function () {
    state.rejectedOpenByRole = state.rejectedOpenByRole || {};
    state.rejectedOpenByRole[mod] = !rejectedAcikMi(mod);
    renderAll();
  };
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
const OTURUM_ALANLARI = ["answers", "flagged", "examStatus", "currentQIndex", "remainingSec",
  "aiEvals", "reviews", "mcResults", "integrity"];

function bosOturum() {
  return {
    answers: {}, flagged: {}, examStatus: "not_started", currentQIndex: 0, remainingSec: 0,
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
  /* §36 — GEÇERSİZ ÖĞRENCİ KİMLİĞİ KORUMASI.
     Buradaki kontrol yalnızca `== null` idi; NaN'ı YAKALAMIYORDU
     (NaN == null → false). `activateStudent(Number(...))` bir yerde
     tanımsız bir değer alırsa state.activeStudentId NaN olur ve aşağıdaki
     `ss[state.activeStudentId] = {}` satırı sınav kaydına "NaN" ADLI bir
     oturum anahtarı yazar. O anahtar KALICIDIR ve syncPaket() onu
     studentId:null olarak gönderdiği için sunucu her push'u
     "sessions.N.studentId: Expected number, received null" ile reddeder —
     yani sınıf kodu senkronu o sınav için BİR DAHA HİÇ çalışmaz ve
     kullanıcı yalnızca anlaşılmaz bir doğrulama hatası görür.
     (Gerçekten yaşandı; ölçülerek bulundu — bkz. PROGRESS §36.) */
  if (state.activeExamId == null || !Number.isFinite(Number(state.activeStudentId))) return;
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
  /* DİKKAT: burada alanlar TEK TEK sayılıyor. state.exam'e yeni bir alan
     eklendiğinde bu listeye de eklenmezse, sınav değiştirilince o alan
     sessizce kaybolur. `mcPoint` bu yüzden burada da var. */
  state.exam = { title: kayit.title, questionIds: kayit.questionIds, timeOverrides: kayit.timeOverrides,
                 status: kayit.status, durationMin: kayit.durationMin,
                 startMode: kayit.startMode || "now", startAtLocal: kayit.startAtLocal || "",
                 startDelaySec: kayit.startDelaySec, startsAt: kayit.startsAt,
                 // §28r: DİKKAT — burada eksik kalırsa sınav değiştirilince hedef sınıf kaybolur.
                 targetClass: kayit.targetClass || "",
                 /* `endsAt` BU LİSTEDE YOKTU ve sınav değiştirilip geri dönülünce
                    undefined oluyordu (ölçüldü). Sonucu: süre sayacı mutlak bitiş
                    anından hesaplanmayı bırakıp yumuşak "-1" sayımına geriliyordu;
                    yani "sayfa kapansa bile süre gerçekte olduğu gibi işler"
                    garantisi SESSİZCE düşüyordu (§6.3-5). */
                 endsAt: kayit.endsAt != null ? kayit.endsAt : null,
                 mcPoint: mcPuani(kayit),
                 // §29: sınav DEĞİŞTİRİLDİĞİNDE o sınavın kayıtlı sahibi yüklenir —
                 // "kim olarak değerlendiriyorum" alanı da buna göre güncellenir
                 // (aşağıdaki satır), aksi hâlde bir öğretmenin sınavına geçince
                 // ekranda hâlâ önceki öğretmenin adı görünürdü.
                 teacherName: kayit.teacherName || "" };
  state.activeTeacherName = state.exam.teacherName;
  const s = sessionOf(kayit, state.activeStudentId);
  OTURUM_ALANLARI.forEach(function (k) { state[k] = s[k] !== undefined ? s[k] : bosOturum()[k]; });
  renderAll();
}

function createExam(baslik) {
  syncActiveExam();
  const id = examIdSeq++;
  // §29: yeni sınav, o an "ben buyum" dediğimiz öğretmene atanır.
  const ogretmen = state.activeTeacherName || "";
  const yeni = { id: id, title: baslik || ("Yeni Sınav " + id), questionIds: [], timeOverrides: {},
                 status: "draft", durationMin: 10, startMode: "now", startAtLocal: "",
                 startDelaySec: 0, startsAt: null, endsAt: null, mcPoint: MC_VARSAYILAN_PUAN,
                 targetClass: "", teacherName: ogretmen, sessions: {} };
  state.exams.push(yeni);
  state.activeExamId = id;
  /* Bu literal, KAYDIN alanlarıyla birebir aynı olmalıdır. `mcPoint` ve `endsAt`
     burada eksikti: kayıtta 5 duruyordu ama `state.exam.mcPoint` undefined'dı ve
     yalnızca `mcPuani()`'nin varsayılana düşmesi sayesinde görünür bir kırılma
     olmuyordu — yani hata örtülüydü, yok değildi. */
  state.exam = { title: yeni.title, questionIds: [], timeOverrides: {}, status: "draft",
                 durationMin: 10, startMode: "now", startAtLocal: "", startDelaySec: 0,
                 startsAt: null, endsAt: null, mcPoint: MC_VARSAYILAN_PUAN, targetClass: "",
                 teacherName: ogretmen };
  OTURUM_ALANLARI.forEach(function (k) { state[k] = bosOturum()[k]; });
  state.teacherTab = 1;
  renderAll();
}

/* ==================== SINAV YÖNETİMİ (§28c) ====================
   Öğretmen, yayınladığı bir sınav üzerinde HİÇBİR ŞEY yapamıyordu: saatini
   değiştiremiyor, silemiyor, yayından kaldıramıyordu. Tek çıkış yolu "Verileri
   sıfırla" ile her şeyi silmekti. Ölçülen sebep üçtü: deleteExam() yayındaki
   sınavda doğrudan `false` dönüyordu, silme düğmesi yayındayken hiç
   çizilmiyordu ve tüm alanlar `locked` iken `disabled` idi.

   YENİ KURAL — kilit "yayında mı"ya değil "ÖĞRENCİ BAŞLADI MI"ya bakar:
     · taslak                          → her şey düzenlenebilir
     · yayında, kimse başlamadı        → her şey düzenlenebilir (asıl boşluk buydu)
     · yayında, en az bir öğrenci başladı → başlık serbest, SÜRE VE SAAT KİLİTLİ
   Süreyi sınav sürerken değiştirmek ölçmeyi bozar: aynı sınava giren iki
   öğrenci farklı süre almış olur. Bu yüzden orası bilinçli olarak kilitli. */
function sinavKatilim(kayit) {
  const ss = (kayit && kayit.sessions) || {};
  let baslayan = 0, gonderen = 0;
  Object.keys(ss).forEach(function (sid) {
    const d = (ss[sid] || {}).examStatus || "not_started";
    if (d === "in_progress") baslayan++;
    else if (d === "submitted" || d === "graded") { baslayan++; gonderen++; }
  });
  // Aktif öğrencinin oturumu kökte "canlı" durur; kayda henüz yazılmamış olabilir.
  if (kayit && kayit.id === state.activeExamId) {
    const d = state.examStatus || "not_started";
    const yazili = ((kayit.sessions || {})[state.activeStudentId] || {}).examStatus;
    if (!yazili && d !== "not_started") { baslayan++; if (d !== "in_progress") gonderen++; }
  }
  return { baslayan: baslayan, gonderen: gonderen };
}

/** Süre/saat alanları kilitli mi? Yayında olmak TEK BAŞINA yetmez. */
function sinavZamanKilitli(kayit) {
  const k = kayit || (state.exams || []).find(function (x) { return x.id === state.activeExamId; });
  if (!k) return false;
  const st = k.id === state.activeExamId ? state.exam.status : k.status;
  return st === "published" && sinavKatilim(k).baslayan > 0;
}

/** Yayından kaldır: sınav taslağa döner, öğrenciler artık göremez. */
function unpublishExam(id) {
  const kayit = (state.exams || []).find(function (x) { return x.id === id; });
  if (!kayit) return false;
  const k = sinavKatilim(kayit);
  let uyari = "“" + (kayit.title || "Adsız Sınav") + "” yayından kaldırılacak ve öğrenciler artık göremeyecek.";
  if (k.baslayan) {
    uyari += "\n\nDİKKAT: " + k.baslayan + " öğrenci bu sınava başlamış" +
      (k.gonderen ? " (" + k.gonderen + " tanesi yanıtlarını göndermiş)" : "") +
      ". Yanıtları SİLİNMEZ, sınav yeniden yayınlandığında yerinde durur.";
  }
  if (!confirm(uyari + "\n\nDevam edilsin mi?")) return false;
  if (id === state.activeExamId) state.exam.status = "draft"; else kayit.status = "draft";
  kayit.status = "draft";
  renderAll();
  syncOtomatik();
  return true;
}

function deleteExam(id) {
  const kayit = state.exams.find(function (x) { return x.id === id; });
  if (!kayit) return false;

  /* Yayındaki sınav ARTIK SİLİNEBİLİR ama sessizce değil: kaç öğrencinin
     verisinin gideceği sayılıp söylenir. Eskiden buradan `false` dönülüyor,
     öğretmene hiçbir açıklama yapılmıyordu. */
  const yayinda = (id === state.activeExamId ? state.exam.status : kayit.status) === "published";
  const k = sinavKatilim(kayit);
  if (yayinda || k.baslayan) {
    let uyari = "“" + (kayit.title || "Adsız Sınav") + "” KALICI OLARAK silinecek.";
    if (k.baslayan) {
      uyari += "\n\n" + k.baslayan + " öğrencinin bu sınavdaki yanıtları" +
        (k.gonderen ? ", " + k.gonderen + " tanesinin gönderdiği kağıt dahil," : "") +
        " birlikte silinecek. Bu işlem geri alınamaz.";
    }
    if (!confirm(uyari + "\n\nDevam edilsin mi?")) return false;
  }
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

/* ==================== SINIF YÖNETİMİ (§28q) ====================
   Kullanıcı: "öğretmen kendi sınıfını kendi eliyle oluştursun." Eskiden
   öğrenci listesi yalnızca VARSAYILAN_OGRENCILER (BIES takımı, demo amaçlı)
   ile geliyordu; öğretmenin kendi gerçek listesini girecek hiçbir yer yoktu.
   Bu bölüm onu ekler: serbest sınıf adıyla öğrenci ekleme/çıkarma.

   SINIF KODU DA BURAYA TAŞINDI — ayrı bir "senkron" kavramı olarak değil,
   sınıfın doğal bir parçası olarak (kullanıcı: "başka bi cihazdaysınız
   kısmı saçma, amaçtan sapmışsın"). Kart tek bir soru cevaplıyor:
   "sınıfım kim, kodu ne." */

/** O öğrencinin herhangi bir sınavda gönderilmiş/onaylanmış yanıtı var mı?
 *  Silme onayında uyarı için — veriyi SİLMEZ, yalnızca bilgilendirir. */
function ogrenciSilGuard(id) {
  return (state.exams || []).some(function (kayit) {
    var canli = kayit.id === state.activeExamId;
    var durum = (canli && String(id) === String(state.activeStudentId))
      ? state.examStatus
      : (((kayit.sessions || {})[id] || {}).examStatus || "not_started");
    return durum === "submitted" || durum === "graded";
  });
}

/** Öğretmen hiç dokunmadıysa liste hâlâ VARSAYILAN_OGRENCILER'in (takım
 *  isimleri) aynısı mı? Öyleyse "bu örnektir" ipucu + tek tık temizleme
 *  gösterilir — §28q: kullanıcı kendi sınıfını kurarken 4 sahte isimle
 *  uğraşmak zorunda kalmasın. */
function varsayilanListeMi() {
  var ogr = state.students || [];
  if (!ogr.length) return false;
  var adlar = VARSAYILAN_OGRENCILER.map(function (o) { return o.name; });
  return ogr.every(function (o) { return adlar.indexOf(o.name) !== -1; });
}

function sinifYonetimHtml() {
  var ogrenciler = (state.students || []).slice().sort(function (a, b) {
    return (a.sinif || "").localeCompare(b.sinif || "") || a.name.localeCompare(b.name, "tr");
  });
  return '<div class="card sinif-yonetim"><div class="card-head"><h3>Sınıfım</h3>' +
    '<span class="hint">' + ogrenciler.length + ' öğrenci</span></div>' +
    (varsayilanListeMi()
      ? '<div class="sy-ornek-uyari">Bu örnek bir liste (takım üyelerinin adları). Kendi ' +
        'sınıfınızı eklerken tek tıkla temizleyebilirsiniz. ' +
        '<button class="btn btn-secondary btn-sm" id="btnOrnekTemizle">Örnek listeyi temizle</button></div>'
      : "") +
    (ogrenciler.length
      ? '<div class="sy-liste">' + ogrenciler.map(function (o) {
          return '<div class="sy-satir"><span class="sy-ad">' + escapeHtml(o.name) + '</span>' +
            (o.sinif ? '<span class="pill pill-neutral">' + escapeHtml(o.sinif) + '</span>' : "") +
            (o.demo ? '<span class="pill pill-warning">örnek</span>' : "") +
            '<button class="icon-btn" data-ogrenci-sil="' + o.id + '" title="Öğrenciyi çıkar" aria-label="' +
            escapeHtml(o.name) + ' öğrencisini sınıftan çıkar">×</button></div>';
        }).join("") + '</div>'
      : '<div class="empty-state">Henüz öğrenci eklenmedi.</div>') +
    '<div class="sy-ekle">' +
    '<input id="syAd" class="sy-input" placeholder="Öğrenci adı" maxlength="60">' +
    '<input id="sySinif" class="sy-input sy-input-sm" placeholder="Sınıf, ör. 7-A" maxlength="20" value="' +
    escapeHtml((ogrenciler[ogrenciler.length - 1] || {}).sinif || "") + '">' +
    '<button class="btn btn-secondary btn-sm" id="btnOgrenciEkle">+ Öğrenci ekle</button></div>' +
    (state.sy && state.sy.hata ? '<div class="sy-hata">' + escapeHtml(state.sy.hata) + '</div>' : "") +
    syncShareLineHtml() +
    '</div>';
}

function wireSinifYonetim() {
  var temizle = document.getElementById("btnOrnekTemizle");
  if (temizle) temizle.onclick = function () {
    if (!confirm("Örnek öğrenci listesi (" + state.students.length + " kişi) çıkarılacak. Devam edilsin mi?")) return;
    state.students = [];
    state.activeStudentId = null;
    saveState(); renderAll(); syncOtomatik();
  };
  document.querySelectorAll("[data-ogrenci-sil]").forEach(function (b) {
    b.onclick = function () {
      var id = Number(b.dataset.ogrenciSil);
      var o = (state.students || []).find(function (x) { return x.id === id; });
      if (!o) return;
      var uyari = "“" + o.name + "” sınıftan çıkarılacak.";
      if (ogrenciSilGuard(id)) uyari += " Bu öğrencinin gönderilmiş/onaylanmış sınav yanıtları var; " +
        "çıkarırsanız kayıtlar isimsiz kalır (silinmez).";
      if (!confirm(uyari + " Devam edilsin mi?")) return;
      state.students = state.students.filter(function (x) { return x.id !== id; });
      state.activeStudentId = state.students.length ? state.students[0].id : null;
      saveState(); renderAll(); syncOtomatik();
    };
  });
  var ekle = document.getElementById("btnOgrenciEkle");
  if (ekle) ekle.onclick = function () {
    var ad = String((document.getElementById("syAd") || {}).value || "").trim();
    var sinif = String((document.getElementById("sySinif") || {}).value || "").trim();
    state.sy = state.sy || {};
    if (!ad) { state.sy.hata = "Öğrenci adı boş olamaz."; renderAll(); return; }
    state.sy.hata = "";
    state.students = state.students || [];
    state.students.push({ id: studentIdSeq++, name: ad, sinif: sinif || "7-A", demo: false });
    if (state.activeStudentId == null) state.activeStudentId = state.students[state.students.length - 1].id;
    saveState(); renderAll(); syncOtomatik();
  };
  wireSyncShareLine();
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
    /* Silme düğmesi ESKİDEN YALNIZCA TASLAKTA çiziliyordu; yayınlanan bir sınav
       için öğretmenin hiçbir çıkışı yoktu (§28c). Artık her durumda var ve
       yayındaki sınavda deleteExam() kaç öğrencinin verisinin gideceğini sayıp
       soruyor. Yayından kaldırma ise veri silmeyen, geri alınabilir yoldur. */
    '<div class="es-actions">' +
    (state.exam.status === "published"
      ? '<button class="btn btn-secondary btn-sm" id="btnUnpublishExam">Yayından kaldır</button>'
      : "") +
    '<button class="btn btn-secondary btn-sm" id="btnDelExam">' +
    (state.exam.status === "published" ? "Bu sınavı sil" : "Bu taslağı sil") + '</button>' +
    '</div></div>';
}

function wireExamSwitcher() {
  document.querySelectorAll(".es-item[data-exam]").forEach(function (b) {
    b.onclick = function () { activateExam(Number(b.dataset.exam)); };
  });
  const nb = document.getElementById("btnNewExam");
  if (nb) nb.onclick = function () { createExam(); };
  const db = document.getElementById("btnDelExam");
  if (db) db.onclick = function () { deleteExam(state.activeExamId); };
  const ub = document.getElementById("btnUnpublishExam");
  if (ub) ub.onclick = function () { unpublishExam(state.activeExamId); };
}

/* ============================== Öğretmen ============================== */
function canPublishExam() {
  if (!state.exam.questionIds.length) return false;
  const opens = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(function (q) { return q && q.type === "open"; });
  return opens.every(function (q) { return state.rubrics[q.id] && state.rubrics[q.id].criteria.length > 0 && totalWeight(state.rubrics[q.id]) === 100; });
}
function totalWeight(rub) { return rub.criteria.reduce(function (s, c) { return s + (Number(c.weight) || 0); }, 0); }

/* ===========================================================================
   MADDE 3 — öğretmen paneli sekme rozetleri (yalnızca ORGANİZASYON amaçlı)
   ===========================================================================
   NEDEN: İçerik Uzmanı sekmelerinde zaten "kaç soru bekliyor" rozeti var
   (bkz. ceTabsHtml). Öğretmen tarafında eşdeğeri yoktu; 4 sekme arasında
   "hangisine bakmam lazım" sorusunun cevabı yalnızca sekmeye tıklayıp
   görmekti. Bu iki sayaç salt OKUNUR bir gezinme yardımıdır — hiçbir
   onay/karar vermez, hiçbir soruyu/yanıtı otomatik işlemez (agents.md §1). */

/** Aktif sınavda rubriği eksik/%100 olmayan açık uçlu soru sayısı. */
function pendingRubricCount() {
  const opens = state.exam.questionIds
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(function (q) { return q && q.type === "open"; });
  return opens.filter(function (q) {
    return !(state.rubrics[q.id] && state.rubrics[q.id].criteria.length > 0 && totalWeight(state.rubrics[q.id]) === 100);
  }).length;
}

/** Aktif sınavda, gönderilmiş açık uçlu yanıtlardan öğretmen onayı bekleyen sayısı. */
function pendingReviewCount() {
  if (state.exam.status !== "published") return 0;
  const opens = state.exam.questionIds
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(function (q) { return q && q.type === "open"; });
  if (!opens.length) return 0;
  let sayac = 0;
  submittedStudents().forEach(function (s) {
    const ss = readSession(s.id);
    opens.forEach(function (q) { if (!((ss.reviews || {})[q.id])) sayac++; });
  });
  return sayac;
}
// Model bir rubrik TASLAĞI önerir; öğretmen üzerinde serbestçe değişiklik
// yapar. Taslak geldiğinde mevcut kriterler değiştirilir, ağırlıklar %100'e
// normalleştirilmiş olarak gelir.
async function aiSuggestRubric(qid) {
  const q = findQuestion(qid);
  if (!q) return;
  ensureRubric(qid);
  // §30 — ÜZERİNE YAZMA KORUMASI: öğretmen bu rubriği elle düzenlediyse
  // önce onay ister; onaylanmazsa AI çağrısı bile yapılmaz (kota israfı yok).
  if (!rubricTemplateOverwriteGuard(state.rubrics[qid])) return;
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
    state.rubrics[qid].userEdited = false; // taze öneri — henüz elle dokunulmadı
  } catch (e) {
    state.rubricError = "Rubrik önerisi alınamadı: " + String((e && e.message) || e);
  } finally {
    state.ai.busy = false;
    renderAll();
  }
}

function ensureRubric(qid) {
  if (!state.rubrics[qid]) {
    // §30 — `userEdited`: öğretmen bu rubriği elle değiştirdi mi? Şablon/AI
    // önerisi butonları bu bayrak true iken ÜZERİNE YAZMADAN ÖNCE onay ister
    // (bkz. rubricTemplateOverwriteGuard) — Human-in-the-Loop önceliği
    // öğretmenin emeğini sessizce silmemeyi de kapsar.
    state.rubrics[qid] = { maxScore: 20, userEdited: false, criteria: [
      { label: "Kavram doğruluğu", weight: 40 }, { label: "Örnek / uygulama", weight: 30 }, { label: "Anlatım açıklığı", weight: 30 },
    ] };
  }
}

/* §30 — MODÜL 2/3: RUBRİK DURUM KORUMASI VE ÜZERİNE YAZMA KORUMASI
   ===========================================================================
   ÖLÇÜLDÜ, ÖLÇÜLMEDİ: "Bir boyuttan diğerine geçince kriterlerin silinmesi"
   iddiası bu kod tabanında Playwright ile tekrar tekrar denendi (iki açık
   uçlu soru arasında geçiş, ölçüt ekleme, geri dönme) ve KRİTER KAYBI
   ÜRETİLEMEDİ — `state.rubrics[qid]` soru id'sine göre kalıcı bir nesnedir,
   `.rub-select` yalnızca HANGİSİNİN gösterileceğini değiştirir, veriye
   dokunmaz. Bu yüzden burada "tekrar yazma" değil, GERÇEKTEN ÖLÇÜLEN bir
   veri kaybı riski kapatıldı: hem "Bu soruya özel taslak öner" (AI) hem de
   hazır şablon düğmeleri `rub.criteria`'yı SORGUSUZ SUALSİZ değiştiriyordu
   — öğretmen ağırlıkları elle düzenledikten SONRA bu düğmelerden birine
   basarsa emeği sessizce siliniyordu. Bu, Modül 3'ün "sistem hiçbir koşulda
   öğretmenin revize ettiği puanlamayı ezmemeli" kuralının BİREBİR ihlaliydi.

   `rub.userEdited` her elle değişiklikte (etiket/ağırlık/açıklama/ekleme/
   silme/tavan puanı) true'ya çekilir (bkz. wireTeacherTab2). Şablon/AI
   düğmesi bu bayrak true iken tıklanırsa native `confirm()` ile onay ister
   — bu projede zaten yerleşik bir kalıptır (bkz. kitaplık silme, karar
   günlüğü temizleme). Onaylanmazsa HİÇBİR ŞEY değişmez. */
function rubricTemplateOverwriteGuard(rub) {
  if (!rub.userEdited) return true; // henüz elle dokunulmamış — sormaya gerek yok
  return confirm(
    "Bu sorunun ölçütlerini elle düzenlediniz. Yeni bir taslak uygularsanız " +
    "mevcut ölçütleriniz ve ağırlıklarınız SİLİNİR. Devam edilsin mi?"
  );
}

// Sınavın toplam puanı: her çoktan seçmeli `mcPuani()` kadar (öğretmen
// belirler), her açık uçlu kendi rubriğinin maksimum puanı kadar.
// Öğrenci karnesindeki hesapla aynıdır.
/* ÇOKTAN SEÇMELİ SORU PUANI — sınav düzeyinde, öğretmen belirler.

   🔴 NEDEN EKLENDİ (ekip denemesi geri bildirimi): Çoktan seçmeli sorular
   puanlanıyordu ama puan SABİT 1'di ve hiçbir yerde değiştirilemiyordu.
   Açık uçlu bir soru 20 puanken 3 ÇSS + 1 açık uçludan oluşan bir sınavda
   ÇSS'ler toplamın yalnızca %13'ünü oluşturuyordu. Bir ölçme aracında
   soru ağırlığı öğretmenin kararıdır, kodun sabiti değil.

   NEDEN SORU BAŞINA DEĞİL SINAV BAŞINA: Türkiye'deki yazılı pratiğinde
   çoktan seçmeli sorular birbirine eşit puan taşır ("10 soru × 5 puan").
   Soru başına alan açmak her ÇSS için ayrı bir girdi demekti; ekranı
   kalabalıklaştırır, karşılığı olmayan bir esneklik sunardı.

   GERİYE DÖNÜK UYUM: localStorage'daki eski sınavlarda `mcPoint` yoktur;
   o durumda varsayılan kullanılır (§6.3-12: alanın dolu olduğunu VARSAYMA).
   Not: eski kayıtlarda ÇSS başına 1 puan görünüyordu, artık varsayılan
   üzerinden yeniden hesaplanır. ÇSS tavanı hiçbir zaman saklanmıyordu,
   türetiliyordu; bu yüzden veri kaybı yok, yalnızca ağırlık düzeliyor.

   `MC_VARSAYILAN_PUAN` bilinçli olarak `state` tanımının HEMEN ÜSTÜNDE
   duruyor; sebebi orada yazılı. */
function mcPuani(ex) {
  const e = ex || state.exam || {};
  const v = Number(e.mcPoint);
  return Number.isFinite(v) && v > 0 ? v : MC_VARSAYILAN_PUAN;
}

function examTotalPoints(items) {
  const mcP = mcPuani();
  return items.reduce(function (s, q) {
    if (q.type === "mc") return s + mcP;
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
    const qPuan = q.type === "mc" ? mcPuani() : ((state.rubrics[q.id] || {}).maxScore || 0);
    // §31 — MODÜL 4: rubrik eksik uyarısı. `canPublishExam()` bugüne kadar
    // sadece TEK bir genel uyarı basıyordu ("Rubrik sekmesinden %100
    // ağırlıklı puanlama anahtarı tanımlayın") — HANGİ sorunun eksik olduğu
    // yazmıyordu (ölçüldü: >1 açık uçlu sorulu sınavda öğretmen hangisi
    // olduğunu bulmak için Rubrik sekmesine geçip her soruyu tek tek
    // kontrol etmek zorundaydı). Aynı koşul burada, SORU KARTININ ÜZERİNDE
    // tekrarlanır.
    const rubrikEksik = q.type === "open" && (!state.rubrics[q.id] || totalWeight(state.rubrics[q.id]) !== 100);
    return '<div class="tray-item-wrap">' +
      '<div class="tray-item' + (rubrikEksik ? " tray-item-warn" : "") + '">' +
      '<span class="t-no">' + (i + 1) + '</span>' +
      '<span class="t-text">' + escapeHtml(truncate(q.body, 62)) +
      '<span class="t-tags"><span class="pill pill-neutral">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
      '<span class="pill pill-accent">' + qPuan + ' puan</span>' +
      (rubrikEksik ? '<span class="pill pill-critical">⚠️ Rubrik Tanımı Eksik</span>' : "") +
      '</span></span>' +
      '<span class="t-controls">' +
      '<input type="number" class="tray-time" data-qid="' + q.id + '" min="10" max="900" value="' + sure + '" ' + (locked ? "disabled" : "") + ' title="Bu soru için önerilen süre (saniye)"><span class="t-unit">sn</span>' +
      (locked ? "" :
        '<button class="icon-btn tray-up" data-idx="' + i + '" title="Yukarı taşı" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
        '<button class="icon-btn tray-down" data-idx="' + i + '" title="Aşağı taşı" ' + (i === items.length - 1 ? "disabled" : "") + '>↓</button>' +
        '<button class="icon-btn tray-remove" data-qid="' + q.id + '" title="Sınavdan çıkar">✕</button>') +
      '</span></div>' +
      // §31: uyarı rozeti KART İÇİNDE ama satır dışında — flex satırın
      // (tray-item) genişliğini bozmadan, tam genişlikte bir aksiyon çubuğu.
      (rubrikEksik
        ? '<div class="tray-rubric-warn">⚠️ Bu açık uçlu sorunun puanlama anahtarı eksik/%100 dağıtılmamış. ' +
          '<button class="btn btn-secondary btn-sm tray-goto-rubric" data-qid="' + q.id + '">Rubrik Sayfasına Git →</button></div>'
        : "") +
      '</div>';
  }).join("") +
  '<div class="tray-summary">' +
  '<div class="ts-row"><span>' + items.length + ' soru</span><span>' + mc + ' çoktan seçmeli · ' + acik + ' açık uçlu</span></div>' +
  (mc
    ? '<div class="ts-row"><span><label for="mcPointInput">Çoktan seçmeli soru başına puan</label></span>' +
      /* SINIF ADI BİLİNÇLİ OLARAK `tray-time` DEĞİL: o sınıfın işleyicisi
         `el.dataset.qid` okuyup `timeOverrides[...]`'a yazıyor; burada qid
         olmadığı için `timeOverrides[NaN]` üretirdi. Görünüm CSS'te
         `.tray-time, .tray-point` ortak kuralıyla aynı tutuluyor. */
      '<span><input type="number" id="mcPointInput" class="tray-point" min="1" max="100" step="1" value="' +
      mcPuani() + '" ' + (locked ? "disabled" : "") +
      ' title="Her çoktan seçmeli soru kaç puan değerinde olsun"> puan</span></div>' +
      '<div class="ts-row ts-note"><span>' + mc + ' çoktan seçmeli × ' + mcPuani() + ' puan = ' +
      (mc * mcPuani()) + ' puan · açık uçlu ' + (puan - mc * mcPuani()) + ' puan</span><span></span></div>'
    : "") +
  '<div class="ts-row strong"><span>Toplam puan</span><span class="tabular">' + puan + ' puan</span></div>' +
  '<div class="ts-row"><span>Sorulara verilen sürelerin toplamı</span><span class="tabular">' + onerilenDk + ' dk</span></div>' +
  '</div>';
}

// Sınavın hangi kazanımları ölçtüğünü gösterir. Sistem sadece sınav kurmuyor,
// ölçme geçerliliğini de denetliyor: "4 kazanımdan 3'ünü ölçüyor, biri boşta".
/* ===========================================================================
   BLOOM TAKSONOMİSİ DENGESİ
   ===========================================================================
   NEDEN: Model zaten her soruya bilişsel düzey etiketi üretiyordu ama bu
   etiket yalnızca rozet olarak duruyordu. Bir sınavın tamamı "hatırlama"
   düzeyindeyse o sınav ezber ölçer, öğrenmeyi ölçmez — ve öğretmen bunu
   soruları tek tek okumadan göremez.

   Bloom düzeyleri iki öbekte toplanır:
     ALT DÜZEY : hatırlama, anlama          -> bilgiyi geri çağırma
     ÜST DÜZEY : uygulama, analiz,          -> bilgiyi kullanma, değerlendirme
                 değerlendirme, yaratma

   Ölçme literatüründe sabit bir "doğru oran" yoktur; sınıf düzeyine ve
   dersin amacına göre değişir. Bu yüzden ürün bir hedef oran DAYATMAZ,
   yalnızca iki uç durumu bildirir:
     - hiç üst düzey soru yoksa  -> sınav ezber ölçüyor olabilir
     - hiç alt düzey soru yoksa  -> temel bilgi hiç ölçülmüyor olabilir
   Karar öğretmenindir (agents.md §7.1).

   Saf hesaptır, AI çağrısı yapılmaz.
   =========================================================================== */

var BLOOM_SIRA = ["hatirlama", "anlama", "uygulama", "analiz", "degerlendirme", "yaratma"];
var BLOOM_UST = { uygulama: true, analiz: true, degerlendirme: true, yaratma: true };

function bloomDagilimi(sorular) {
  const say = {};
  BLOOM_SIRA.forEach(function (b) { say[b] = 0; });
  let etiketli = 0;
  sorular.forEach(function (q) {
    if (q && q.bloom && say[q.bloom] != null) { say[q.bloom]++; etiketli++; }
  });
  let alt = 0, ust = 0;
  BLOOM_SIRA.forEach(function (b) { if (BLOOM_UST[b]) ust += say[b]; else alt += say[b]; });
  return { say: say, etiketli: etiketli, alt: alt, ust: ust,
           ustOran: etiketli ? Math.round(ust / etiketli * 100) : 0 };
}

function bloomBalanceHtml(sorular) {
  const d = bloomDagilimi(sorular);
  if (!d.etiketli) return "";

  const cubuk = BLOOM_SIRA.filter(function (b) { return d.say[b] > 0; }).map(function (b) {
    const oran = Math.round(d.say[b] / d.etiketli * 100);
    return '<span class="bl-seg' + (BLOOM_UST[b] ? " bl-ust" : "") + '" style="flex:' + d.say[b] +
      ';" title="' + BLOOM_TR[b] + ": " + d.say[b] + " soru (%" + oran + ')"></span>';
  }).join("");

  const rozetler = BLOOM_SIRA.filter(function (b) { return d.say[b] > 0; }).map(function (b) {
    return '<span class="bl-rozet' + (BLOOM_UST[b] ? " bl-ust" : "") + '">' +
      BLOOM_TR[b] + " <b>" + d.say[b] + "</b></span>";
  }).join("");

  let not = "";
  if (d.ust === 0) {
    not = '<div class="bl-warn">Bu sınavdaki soruların <b>tamamı alt düzey</b> (hatırlama/anlama). ' +
      "Sınav büyük olasılıkla ezber ölçüyor; öğrencinin bilgiyi <i>kullanabildiğini</i> " +
      "gösteren bir soru yok. En az bir uygulama ya da analiz sorusu eklemeyi düşünün.</div>";
  } else if (d.alt === 0) {
    not = '<div class="bl-warn">Bu sınavdaki soruların <b>tamamı üst düzey</b>. ' +
      "Temel bilgiyi ölçen bir soru yok; konuyu kısmen öğrenmiş öğrenci hiç puan alamayabilir.</div>";
  } else {
    not = '<div class="bl-ok">Alt düzey <b>' + d.alt + "</b> · üst düzey <b>" + d.ust +
      "</b> soru (üst düzey oranı %" + d.ustOran + "). Dengeli görünüyor; hedef oranı dersin " +
      "amacına göre siz belirlersiniz.</div>";
  }

  return '<div class="bl-box"><div class="bl-head">Bilişsel düzey dağılımı ' +
    '<span class="bl-hint">Bloom taksonomisi · saf hesap</span></div>' +
    '<div class="bl-bar">' + cubuk + "</div>" +
    '<div class="bl-rozetler">' + rozetler + "</div>" + not + "</div>";
}

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
    bloomBalanceHtml(secili) +
    '</div>' +
    sinavKaynakUyarisiHtml(secili);
}

function filteredPool() {
  const f = state.poolFilter;
  return state.questions.filter(function (q) {
    if (q.status !== "approved") return false;
    if (f.outcome && q.outcome !== f.outcome) return false;
    if (f.difficulty && q.difficulty !== f.difficulty) return false;
    if (f.type && q.type !== f.type) return false;
    // Madde 3: Madde 1'de eklenen şube etiketiyle filtreleme — yalnızca
    // organizasyon amaçlı, hangi sorunun onaylanacağına karışmaz.
    if (f.sube && (q.sube || "") !== f.sube) return false;
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
      return '<option value="' + escapeHtml(o.code) + '"' + (q.outcome === o.code ? " selected" : "") + '>' + escapeHtml(o.code) + '</option>';
    }).join("") + '</select></div>' +
    '<div class="field"><label>Süre (sn)</label>' +
    '<input type="number" class="pe-time" data-qid="' + q.id + '" min="15" max="900" value="' + q.aiTime + '"></div></div>' +
    '<button class="btn btn-primary btn-sm pe-save" data-qid="' + q.id + '">Değişiklikleri Kaydet</button> ' +
    '<button class="btn btn-secondary btn-sm pe-cancel">Vazgeç</button></div>';
}

function poolFilterHtml() {
  /* Filtreler yalnızca filtrelenecek bir şey varken görünür.
     ÖNCEDEN: havuz BOŞKEN bile üç açılır liste duruyordu — kullanılamayan
     kontroller ekranı doldurup "burada bir şey yapmam mı gerekiyor?"
     hissi veriyordu (kullanıcı bildirdi). Tek soruda da filtrelemenin
     anlamı yok. Eşik: 2 onaylı soru. */
  const onayliSayisi = state.questions.filter(function (q) { return q.status === "approved"; }).length;
  if (onayliSayisi < 2) return "";
  const f = state.poolFilter;
  const kazanimlar = {};
  const subeler = {};
  state.questions.filter(function (q) { return q.status === "approved"; })
    .forEach(function (q) { kazanimlar[q.outcome] = true; if (q.sube) subeler[q.sube] = true; });
  const sec = function (id, deger, secenekler) {
    return '<select id="' + id + '"><option value="">Tümü</option>' +
      secenekler.map(function (o) {
        return '<option value="' + escapeHtml(o.v) + '"' + (deger === o.v ? " selected" : "") + '>' + escapeHtml(o.t) + '</option>';
      }).join("") + '</select>';
  };
  const subeAlanlari = Object.keys(subeler).sort();
  return '<div class="pool-filter">' +
    '<div class="field"><label>Kazanım</label>' + sec("fltOutcome", f.outcome,
      Object.keys(kazanimlar).map(function (k) { return { v: k, t: k }; })) + '</div>' +
    '<div class="field"><label>Zorluk</label>' + sec("fltDiff", f.difficulty,
      [{ v: "easy", t: "Kolay" }, { v: "medium", t: "Orta" }, { v: "hard", t: "Zor" }]) + '</div>' +
    '<div class="field"><label>Soru türü</label>' + sec("fltType", f.type,
      [{ v: "mc", t: "Çoktan Seçmeli" }, { v: "open", t: "Açık Uçlu" }]) + '</div>' +
    // Madde 3: yalnızca en az bir onaylı soruda şube etiketi VARSA görünür —
    // aksi hâlde hep boş bir "Tümü" filtresi ekranı doldururdu.
    (subeAlanlari.length
      ? '<div class="field"><label>Şube</label>' + sec("fltSube", f.sube,
          subeAlanlari.map(function (s) { return { v: s, t: s }; })) + '</div>'
      : "") +
    '</div>';
}

function teacherTab1Html() {
  const approved = filteredPool();
  const tumOnayli = state.questions.filter(function (q) { return q.status === "approved"; }).length;
  const inExam = function (id) { return state.exam.questionIds.indexOf(id) !== -1; };
  /* §28c: kilit artık "yayında mı"ya değil "öğrenci başladı mı"ya bakar.
     Yayınlanmış ama kimsenin başlamadığı sınav hâlâ düzenlenebilir — asıl
     boşluk buydu. Soru listesi yayında değişmez (ölçme bütünlüğü). */
  const katilim = sinavKatilim((state.exams || []).find(function (x) { return x.id === state.activeExamId; }));
  const yayinda = state.exam.status === "published";
  const locked = yayinda && katilim.baslayan > 0;
  const soruKilidi = yayinda;
  return sinifYonetimHtml() + examSwitcherHtml() + '<div class="grid-2">' +
    '<div class="card"><div class="card-head"><h3>Onaylı Soru Havuzu</h3><span class="hint">' +
    (approved.length === tumOnayli ? approved.length + ' soru' : approved.length + ' / ' + tumOnayli + ' soru (filtreli)') + '</span></div>' +
    poolFilterHtml() +
    (approved.length ? approved.map(function (q) {
      const duzenleniyor = state.editingQid === q.id;
      return '<div class="pool-item"><input type="checkbox" class="pool-check" data-qid="' + q.id + '" ' + (inExam(q.id) ? "checked" : "") + " " + (soruKilidi ? "disabled" : "") + ' aria-label="Bu soruyu sınava ekle">' +
        '<div class="p-body">' + escapeHtml(q.body) + '<div class="p-tags"><span class="pill pill-accent">' + (q.type === "mc" ? "ÇSS" : "Açık Uçlu") + '</span>' +
        '<span class="pill pill-neutral">' + diffLabel(q.difficulty) + '</span>' + bloomPill(q.bloom) +
        '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span>' + subeRozetiHtml(q) + '</div>' +
        (duzenleniyor ? poolEditHtml(q) : "") + '</div>' +
        '<button class="btn btn-secondary btn-sm pool-edit-btn" data-qid="' + q.id + '" title="Bu soruyu düzenle">' +
        (duzenleniyor ? "Kapat" : "Düzenle") + '</button></div>';
    }).join("")
      : '<div class="empty-state empty-rich">' +
        (tumOnayli
          ? '<div class="es-baslik">Bu filtreye uyan soru yok</div>' +
            '<div class="es-alt">Havuzda ' + tumOnayli + ' onaylı soru var ama seçtiğiniz filtreye uymuyor.</div>' +
            '<button class="btn btn-secondary btn-sm" id="btnFiltreTemizle">Filtreleri temizle</button>'
          /* Boş durum artık ne yapılacağını söylemekle kalmıyor, ORAYA GÖTÜRÜYOR.
             Kullanıcı "havuzda soru yok" yazısını okuyup hangi panele gideceğini
             kendi bulmak zorunda kalıyordu. */
          : '<div class="es-baslik">Havuzda henüz onaylı soru yok</div>' +
            '<div class="es-alt">Sınav kurabilmek için önce İçerik Uzmanı panelinde soru üretip onaylamanız gerekiyor.</div>' +
            '<button class="btn btn-primary btn-sm" id="btnIcerikUzmaninaGit">İçerik Uzmanı paneline git</button>') +
        '</div>') + '</div>' +
    '<div class="card"><div class="card-head"><h3>Sınav Taslağı</h3><span class="hint">' + state.exam.questionIds.length + ' soru seçildi</span></div>' +
    '<div class="field"><label>Sınav Başlığı</label><input id="examTitle" type="text" value="' + escapeHtml(state.exam.title) + '" placeholder="örn. 1. Dönem Fen Bilimleri Kısa Sınavı"></div>' +
    '<div id="examTray">' + examTrayHtml() + '</div>' + coverageHtml() +
    '<div class="field-row" style="margin-top:12px;"><div class="field"><label>Öğrenciye verilecek toplam süre (dk)</label>' +
    '<div class="input-with-actions"><input id="examDuration" type="number" min="1" value="' + state.exam.durationMin + '" ' + (locked ? "disabled" : "") + '>' +
    (locked ? "" : '<button class="btn btn-secondary btn-sm" id="btnUseSuggested" title="Soru sürelerinin toplamını uygula">Öneriyi uygula</button>') + '</div>' +
    '<span class="field-note">Süre dolunca sınav otomatik biter.</span></div>' +
    '<div class="field"><label>Sınav ne zaman açılsın?</label>' +
    '<select id="examStartMode" ' + (locked ? "disabled" : "") + '>' +
    '<option value="now"' + (state.exam.startMode !== "scheduled" ? " selected" : "") + '>Yayınlar yayınlamaz</option>' +
    '<option value="scheduled"' + (state.exam.startMode === "scheduled" ? " selected" : "") + '>Belirli bir tarih ve saatte</option>' +
    '</select></div></div>' +
    /* §28r: "sınav kurarken hangi sınıfa yayınla" seçimi. Boş = tüm sınıflar
       (eski davranış korunur, geriye dönük uyum). Doluysa yalnızca o sınıftaki
       öğrenciler sınavı görür — studentTab1Html/studentTab2Html'deki
       "yayindakiler" filtresinde kontrol edilir. */
    '<div class="field"><label>Kime yayınlansın?</label>' +
    '<select id="examTargetClass" ' + (locked ? "disabled" : "") + '>' +
    '<option value="">Tüm sınıflar</option>' +
    siniflar().map(function (sf) {
      return '<option value="' + escapeHtml(sf) + '"' + (state.exam.targetClass === sf ? " selected" : "") + '>' +
        escapeHtml(sf) + '</option>';
    }).join("") + '</select>' +
    '<span class="field-note">Boş bırakırsanız tüm öğrenciler görür.</span></div>' +
    (state.exam.startMode === "scheduled"
      ? '<div class="field"><label>Açılış tarihi ve saati</label>' +
        /* `min` OLMADAN geçmiş bir tarih seçilebiliyordu (ölçüldü: 2020-01-01
           kabul ediliyor, checkValidity() true dönüyordu). Yayınlandığında sınav
           anında açılıyor ama kartta "Açılış: 1 Oca 2020" yazıyordu. */
        '<input id="examStartAt" type="datetime-local" min="' + yerelDamga(new Date()) + '" value="' + escapeHtml(state.exam.startAtLocal || "") + '" ' + (locked ? "disabled" : "") + '>' +
        '<span class="lbl-hint">Öğrenciler bu saatten önce sınava giremez; sınav kartında geri sayım görür.</span></div>'
      : "") +
    (yayinda && state.exam.startsAt
      ? '<div class="pill pill-neutral" style="margin-bottom:8px;">Açılış: ' +
        new Date(state.exam.startsAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) + '</div>'
      : "") +
    (yayinda ? '<div class="pill pill-success">Yayında — öğrenciler görebilir</div>' +
      (locked
        ? '<div class="pill pill-warning" style="margin-top:8px;">' + katilim.baslayan +
          ' öğrenci sınava başladı — süre ve açılış saati artık değiştirilemez. ' +
          'Aynı sınava giren öğrencilerin farklı süre alması ölçmeyi bozar.</div>'
        : '<div class="lbl-hint" style="margin-top:8px;">Henüz kimse başlamadı; başlığı, süreyi ve açılış saatini hâlâ değiştirebilirsiniz.</div>') :
      '<button class="btn btn-primary" id="btnPublishExam" ' + (canPublishExam() ? "" : "disabled") + '>Sınavı Yayınla</button>' +
      (!canPublishExam() && state.exam.questionIds.length ? '<div class="pill pill-warning" style="margin-top:8px;">Açık uçlu sorular için Rubrik sekmesinden %100 ağırlıklı puanlama anahtarı tanımlayın.</div>' : "")
    ) + "</div></div>" + rejectedPoolHtml("teacher");
}

function wireTeacherTab1() {
  wireSinifYonetim();
  wireExamSwitcher();
  wireRejectedPool("teacher");
  // Boş durumdaki yönlendirme düğmeleri.
  const git = document.getElementById("btnIcerikUzmaninaGit");
  if (git) git.onclick = function () { state.role = "content_expert"; state.ceTab = 1; renderAll(); };
  const flt = document.getElementById("btnFiltreTemizle");
  if (flt) flt.onclick = function () {
    state.poolFilter = { outcome: "", difficulty: "", type: "", sube: "" };
    saveSoon(); renderAll();
  };
  const fo = document.getElementById("fltOutcome");
  if (fo) fo.onchange = function (e) { state.poolFilter.outcome = e.target.value; renderAll(); };
  const fd = document.getElementById("fltDiff");
  if (fd) fd.onchange = function (e) { state.poolFilter.difficulty = e.target.value; renderAll(); };
  const ft = document.getElementById("fltType");
  if (ft) ft.onchange = function (e) { state.poolFilter.type = e.target.value; renderAll(); };
  const fs = document.getElementById("fltSube");
  if (fs) fs.onchange = function (e) { state.poolFilter.sube = e.target.value; renderAll(); };

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

  /* §31 — MODÜL 4: "Rubrik Sayfasına Git" derin bağlantısı. Öğretmenin
     sayfalarca soru arasında hangi sorunun rubriğinin eksik olduğunu ARAMASI
     gerekmesin diye: 2. Sekmeye geçilir, o soru `rubricSelectedQ` ile
     doğrudan seçilir, sonra editör alanına KAYDIRILIP ODAKLANIR. */
  document.querySelectorAll(".tray-goto-rubric").forEach(function (b) {
    b.onclick = function () {
      const qid = Number(b.dataset.qid);
      state.teacherTab = 2;
      state.rubricSelectedQ = qid;
      state.critDescOpen = null;
      renderAll();
      // renderAll() eşzamanlı olarak innerHTML'i yazdığı için editör DOM'u
      // burada zaten hazırdır — ekstra bir setTimeout/RAF gerekmez.
      const maxEl = document.getElementById("rubMax");
      if (maxEl) {
        maxEl.scrollIntoView({ behavior: "smooth", block: "center" });
        maxEl.focus({ preventScroll: true });
      }
    };
  });
  const modeEl = document.getElementById("examStartMode");
  if (modeEl) modeEl.onchange = function (e) {
    state.exam.startMode = e.target.value;
    if (state.exam.startMode === "scheduled" && !state.exam.startAtLocal) {
      // Varsayılan: 1 saat sonrası, dakikaya yuvarlanmış.
      const d = new Date(Date.now() + 3600000);
      d.setSeconds(0, 0);
      state.exam.startAtLocal = yerelDamga(d);
    }
    renderAll();
  };
  const startEl = document.getElementById("examStartAt");
  if (startEl) startEl.onchange = function (e) { state.exam.startAtLocal = e.target.value; saveSoon(); };
  const targetEl = document.getElementById("examTargetClass");
  if (targetEl) targetEl.onchange = function (e) { state.exam.targetClass = e.target.value; saveSoon(); };
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
  /* ÇSS puanı: `change` olayında bağlanır, `input`'ta değil. Sebep §6.3-3:
     her tuş vuruşunda renderAll() çağırmak odağı kaybettirir; ayrıca
     kullanıcı "5"i silip "10" yazarken ara adımda boş/0 değer okunurdu.
     Alandan çıkınca bir kez okunur, sınırlanır ve toplam puan tazelenir. */
  const mcPointEl = document.getElementById("mcPointInput");
  if (mcPointEl) mcPointEl.onchange = function () {
    state.exam.mcPoint = Math.max(1, Math.min(100, Math.round(Number(mcPointEl.value) || MC_VARSAYILAN_PUAN)));
    renderAll();
  };
  const pubBtn = document.getElementById("btnPublishExam");
  if (pubBtn) pubBtn.onclick = function () {
    if (state.exam.startMode === "scheduled") {
      /* SESSİZ GERİ DÜŞÜŞ YASAĞI (§6.3-5). Eskiden bu dal yalnızca
         `startAtLocal` DOLUYSA çalışıyordu; öğretmen "Belirli bir tarih ve
         saatte" seçip alanı boş bırakırsa `else` dalına düşülüyor ve sınav
         sessizce ANINDA yayınlanıyordu — seçim yok sayılmış oluyordu. */
      const ts = state.exam.startAtLocal ? new Date(state.exam.startAtLocal).getTime() : NaN;
      if (isNaN(ts)) { state.poolError = "Geçerli bir açılış tarihi ve saati seçin."; renderAll(); return; }
      if (ts <= Date.now()) {
        state.poolError = "Açılış saati geçmişte kalamaz. İleri bir tarih ve saat seçin ya da “Yayınlar yayınlamaz” seçeneğine dönün.";
        renderAll(); return;
      }
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
    '<input type="number" class="crit-weight" data-idx="' + i + '" min="0" max="100" value="' + c.weight +
      '" aria-label="' + escapeHtml((c.label || ("Ölçüt " + (i + 1))) + " ağırlığı (yüzde)") + '">' +
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
    '<div class="field" style="max-width:180px;"><input id="rubMax" type="number" min="1" max="100" value="' + rub.maxScore + '" aria-label="Bu soru kaç puan üzerinden değerlendirilsin"></div>' +

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
      const rub = state.rubrics[state.rubricSelectedQ];
      // §30 — ÜZERİNE YAZMA KORUMASI: bkz. rubricTemplateOverwriteGuard notu.
      if (!rubricTemplateOverwriteGuard(rub)) return;
      const s = RUBRIK_SABLONLARI[Number(b.dataset.tpl)];
      rub.criteria = JSON.parse(JSON.stringify(s.criteria));
      rub.aiDraft = false;
      rub.userEdited = false; // taze şablon — henüz elle dokunulmadı
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
      if (rub && rub.criteria[el.dataset.idx]) { rub.criteria[el.dataset.idx].description = el.value; rub.userEdited = true; saveSoon(); }
    };
  });

  const maxEl = document.getElementById("rubMax");
  if (maxEl) maxEl.onchange = function () {
    const rub = state.rubrics[state.rubricSelectedQ];
    rub.maxScore = Math.max(1, Math.min(100, Number(maxEl.value) || 1));
    rub.userEdited = true;
    renderAll();
  };

  document.querySelectorAll(".crit-label").forEach(function (el) {
    el.oninput = function () {
      const rub = state.rubrics[state.rubricSelectedQ];
      rub.criteria[Number(el.dataset.idx)].label = el.value;
      rub.userEdited = true;
      saveSoon();
    };
  });

  // Ağırlık değişince renderAll ÇAĞIRMAYIZ (odak kaybolmasın); puan
  // karşılığını, çubuğu ve durum satırını yerinde güncelleriz.
  document.querySelectorAll(".crit-weight").forEach(function (el) {
    el.oninput = function () {
      const rub = state.rubrics[state.rubricSelectedQ];
      const i = Number(el.dataset.idx);
      rub.criteria[i].weight = Math.max(0, Math.min(100, Number(el.value) || 0));
      rub.userEdited = true;
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
    rub.userEdited = true;
    state.critDescOpen = null;
    renderAll();
  };
  document.querySelectorAll(".crit-remove").forEach(function (el) {
    el.onclick = function () {
      const rub = state.rubrics[state.rubricSelectedQ];
      rub.criteria.splice(Number(el.dataset.idx), 1);
      rub.userEdited = true;
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
    '<span class="pill pill-accent">Açık Uçlu</span><span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span></div>' +
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
    }).join("") + '<div class="justification">' + escapeHtml(ev.justification) + '</div>' +
    feedbackDraftHtml(q, student, ev) + '</div></div>' +
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
    '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span></div>' +
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
    '<span class="pill pill-success">Onaylandı</span><span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span></div>' +
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

/* ===========================================================================
   ÖĞRENCİYE GERİ BİLDİRİM TASLAĞI
   ===========================================================================
   NEDEN: Karnede puanın gerekçesi vardı ama öğrenciye YÖNLENDİRME yoktu.
   Ölçmenin amacı not vermek değil öğrenmeyi düzeltmektir; öğrenci "neden 16
   aldım" değil "ne yapmalıyım" sorusunun cevabını arar.

   NEDEN OTOMATİK DOLDURULMUYOR: Taslağı doğrudan "Not" alanına yazmak,
   öğretmenin farkında olmadan AI metnini onaylamasına yol açar. Bu, HITL
   ilkesini biçimsel hale getirirdi. Bunun yerine taslak ayrı bir kutuda
   durur ve öğretmen "Nota Aktar" ile bilinçli olarak alır; sonra düzenler.
   =========================================================================== */
function feedbackDraftHtml(q, student, ev) {
  const t = (ev && ev.studentFeedback ? String(ev.studentFeedback) : "").trim();
  if (!t) return "";
  return '<div class="fb-draft"><div class="fb-draft-bas">Öğrenciye geri bildirim taslağı' +
    '<span class="fb-draft-not">yapay zekâ önerisi · siz aktarmadan öğrenciye gitmez</span></div>' +
    '<div class="fb-draft-metin">' + escapeHtml(t) + '</div>' +
    '<button class="btn btn-secondary btn-sm fb-apply" data-qid="' + q.id +
    '" data-sid="' + student.id + '">Nota Aktar</button></div>';
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
          '<span class="pill pill-neutral">Doğru şık: ' + escapeHtml(q.correctKey) + '</span>' +
          '<span class="pill pill-neutral">' + escapeHtml(q.outcome) + '</span></div></div></div>';
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
  // Geri bildirim taslağını "Not" alanına aktar. renderAll ÇAĞRILMAZ: metin
  // girdisinde yeniden çizim odağı kaybettirir (PROGRESS §5'te kayıtlı ders).
  document.querySelectorAll(".fb-apply").forEach(function (b) {
    b.onclick = function () {
      const qid = b.dataset.qid, sid = b.dataset.sid;
      const ss = readSession(Number(sid));
      const ev = (ss.aiEvals || {})[qid] || {};
      const alan = document.querySelector('.teacher-comment[data-qid="' + qid + '"][data-sid="' + sid + '"]');
      if (!alan || !ev.studentFeedback) return;
      alan.value = String(ev.studentFeedback).trim();
      alan.focus();
      // Denetim izi: AI geri bildirim taslağını öğretmen bilinçli olarak aldı.
      // Otomatik doldurulmuyor; bu kayıt o bilinçli eylemi belgeler.
      auditKaydet("geri_bildirim_aktarildi", {
        qid: Number(qid), sid: Number(sid),
        soru: auditKisalt((findQuestion(qid) || {}).body),
        not: "öğretmen taslağı not alanına aldı (düzenleyebilir)",
      });
      b.textContent = "Nota aktarıldı ✓";
      b.disabled = true;
    };
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
/* Öğretmenin nihai puan kararı. Sonuç yayınlandığında (publishResults)
   sunucuya gönderilir; öğrenci onaylanmış puanı kendi cihazından görür. */
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
  /* Denetim izi: NİHAİ KARAR. Bu kayıt HITL tezinin en doğrudan kanıtıdır —
     yapay zekânın ne önerdiği (aiScore) ile insanın ne verdiği (finalScore)
     yan yana durur ve değiştirilip değiştirilmediği açıkça yazılır. */
  const ai = ev.aiScore != null ? Number(ev.aiScore) : null;
  const nihai = yeniReviews[qid].finalScore;
  auditKaydet("puan_karari", {
    qid: qid, sid: ogrId,
    soru: auditKisalt((findQuestion(qid) || {}).body),
    aiScore: ai, finalScore: nihai,
    degisti: ai == null ? undefined : Math.abs(nihai - ai) > 0.001,
    not: comment ? auditKisalt(comment) : null,
  });
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
/* §37 — İKİ ÖLÇÜLMÜŞ DÜZELTME:

   1) YALNIZCA ÖĞRETMENİN YAYINLADIĞI SONUÇ SAYILIR.
      Eski koşul `graded || submitted` idi. `submitted` = öğrenci gönderdi,
      öğretmen HENÜZ ONAYLAMADI. Açık uçlularda zarar yoktu (puan ancak
      `ss.reviews[qid]` varsa okunuyor, o da onaydan sonra oluşur) ama
      ÇOKTAN SEÇMELİDE `mcResults` gönderim anında oluştuğu için yüzde
      onaydan ÖNCE ısı haritasına giriyordu. Ölçüldü: tek öğrenci
      `submitted`, `reviews: {}` iken satır `{"MAT.7.2.1":100}` gösteriyordu.
      Ekrandaki "buradaki sayılar yalnızca öğretmen onayından geçmiş
      sonuçları yansıtır" cümlesi bu yüzden YANLIŞ BEYANDI (§6.3-5).
      `graded` durumunu yalnızca `publishResults()` yazar ve o da
      `allOpensReviewed()` olmadan çalışmaz — yani HITL'in tam karşılığı.

   2) TEK SINAV DEĞİL, TÜM YAYINLANMIŞ SINAVLAR.
      Eskiden yalnızca `state.exam` (aktif sınav) taranıyordu; öğretmen yeni
      bir sınava geçtiğinde önceki sınavın sonuçları ısı haritasından
      KAYBOLUYORDU. Ölçüldü. Artık `okulGercekDurum()` ile aynı desen
      kullanılır: yayınlanmış her sınav kaydı gezilir, aktif sınavın oturumu
      `readSession()`, diğerlerininki `kayit.sessions` üzerinden okunur.

   AI'ın ham puanı (`ss.aiEvals`) HİÇBİR KOŞULDA okunmaz — burada da, eskiden
   de. Değişmedi. */
function classOutcomeScores(sinif) {
  const toplam = {}, adet = {};
  const ogrenciler = (state.students || []).filter(function (o) { return o.sinif === sinif; });
  (state.exams || []).forEach(function (kayit) {
    if (kayit.status !== "published") return;
    const aktif = kayit.id === state.activeExamId;
    const ex = aktif ? state.exam : kayit;
    ogrenciler.forEach(function (ogr) {
      const ss = aktif ? readSession(ogr.id) : ((kayit.sessions || {})[ogr.id] || null);
      if (!ss || ss.examStatus !== "graded") return;
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
    /* §37: `sinif` ham şube adıdır. Örnek satırların elenmesi ve uyarı
       filtresi ARTIK GÖRÜNEN ADA (ör. "7-A (1/2)") bakmıyor — ad kullanıcıya
       gösterilen bir metindir, ölçüt olamaz. */
    return { sinif: sf, name: sf + " (" + cozen + "/" + ogrenciler.length + ")", scores: classOutcomeScores(sf), live: cozen > 0 };
  });
}

/* §37 — GERÇEK VERİ ÖNCELİKLİ: gerçek bir şube zaten satır olarak varsa,
   AYNI ADLI örnek satır gösterilmez. Eskiden ikisi birden çiziliyordu;
   ölçüldü: 6-A'da gerçek sonuç varken tabloda hem "6-A (1/1)" hem
   "6-A (örnek)" görünüyordu ve yönetici hangisinin gerçek olduğunu
   ayırt etmek zorunda kalıyordu. `ornek: true` işareti, uyarı ve
   hesaplama filtrelerinin ada bakmadan çalışmasını sağlar. */
function ornekSinifSatirlari(gercekSatirlar, adet) {
  const gercekAdlar = {};
  gercekSatirlar.forEach(function (r) { if (r.sinif) gercekAdlar[r.sinif] = true; });
  return (state.baseline.classes || [])
    .filter(function (c) { return !gercekAdlar[c.name]; })
    .slice(0, adet == null ? undefined : adet)
    .map(function (c) { return { sinif: c.name, name: c.name + " (örnek)", scores: c.scores, ornek: true }; });
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
  const gercek = realClassRows();
  return gercek.concat(ornekSinifSatirlari(gercek, 2));
}
/* ===========================================================================
   MADDE ANALİZİ — klasik test kuramı (item analysis)
   ===========================================================================
   NEDEN: Brief "soru üretimi" istiyor ama üretilen sorunun İYİ BİR SORU olup
   olmadığını kimse ölçmüyor. Bir soru zor ya da kolay olabilir; daha önemlisi
   ÖĞRENENİ ÖĞRENMEYENDEN AYIRT EDİP ETMEDİĞİdir. Madde havuzlarında kullanılan
   iki temel ölçü budur:

     p (güçlük indeksi)  = soruyu doğru yanıtlayan oranı
     d (ayırt edicilik)  = üst grubun doğru oranı - alt grubun doğru oranı

   Üst/alt grup, testin toplam başarısına göre sıralanıp uçlardan %27 alınarak
   oluşturulur (klasik test kuramında yaygın uygulama). Sınıf 10 kişiden azsa
   %27 tek kişiye düşüp anlamsızlaşacağı için alt/üst YARI kullanılır ve sonuç
   "gösterge niteliğinde" olarak işaretlenir.

   DÜRÜSTLÜK NOTU (ekranda da yazar): 5-6 öğrencilik bir sınıfta bu sayılar
   istatistiksel olarak güvenilir DEĞİLDİR; yön gösterir, karar vermez.
   Kararı - her zamanki gibi - öğretmen verir.

   Hiçbir AI çağrısı yapılmaz; bu saf hesaptır.
   =========================================================================== */

function itemAnalysis() {
  const gonderenler = submittedStudents();
  const n = gonderenler.length;
  const mcs = (state.exam.questionIds || [])
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(function (q) { return q && q.type === "mc"; });
  if (!n || !mcs.length) return { n: n, maddeler: [] };

  // Sıralama ölçütü: öğrencinin bu sınavdaki çoktan seçmeli doğru sayısı.
  const sirali = gonderenler.map(function (st) {
    const ss = readSession(st.id);
    let d = 0;
    mcs.forEach(function (q) { if (((ss.mcResults || {})[q.id] || {}).correct) d++; });
    return { sid: st.id, dogru: d };
  }).sort(function (a, b) { return b.dogru - a.dogru; });

  const k = n >= 10 ? Math.max(1, Math.round(n * 0.27)) : Math.max(1, Math.floor(n / 2));
  const ustGrup = sirali.slice(0, k).map(function (x) { return x.sid; });
  const altGrup = sirali.slice(n - k).map(function (x) { return x.sid; });

  const secilenSik = function (sid, qid) {
    return ((readSession(sid).answers || {})[qid] || {}).selectedKey;
  };
  const grupOrani = function (grup, q) {
    if (!grup.length) return 0;
    let d = 0;
    grup.forEach(function (sid) { if (secilenSik(sid, q.id) === q.correctKey) d++; });
    return d / grup.length;
  };

  const maddeler = mcs.map(function (q) {
    const secim = {};
    (q.options || []).forEach(function (o) { secim[o.key] = 0; });
    let bos = 0, dogruSayisi = 0;
    gonderenler.forEach(function (st) {
      const key = secilenSik(st.id, q.id);
      if (key == null || key === "") { bos++; return; }
      if (secim[key] == null) secim[key] = 0;
      secim[key]++;
      if (key === q.correctKey) dogruSayisi++;
    });
    const islevsiz = (q.options || [])
      .filter(function (o) { return o.key !== q.correctKey && !secim[o.key]; })
      .map(function (o) { return o.key; });
    return {
      q: q, p: dogruSayisi / n, d: grupOrani(ustGrup, q) - grupOrani(altGrup, q),
      secim: secim, bos: bos, dogruSayisi: dogruSayisi, islevsiz: islevsiz
    };
  });

  return { n: n, k: k, maddeler: maddeler, guvenilir: n >= 10 };
}

/* p (güçlük) yorumu - yaygın kullanılan aralıklar. */
function pYorum(p) {
  if (p < 0.30) return { s: "pill-critical", t: "çok zor" };
  if (p > 0.90) return { s: "pill-warning", t: "çok kolay" };
  if (p <= 0.70) return { s: "pill-success", t: "ideal güçlük" };
  return { s: "pill-neutral", t: "kolay" };
}

/* d (ayırt edicilik) yorumu. NEGATİF d en önemli sinyaldir: iyi öğrenciler
   yanlış, zayıf öğrenciler doğru yanıtlıyor demektir - soru ya da cevap
   anahtarı hatalı olabilir. */
function dYorum(d) {
  if (d < 0) return { s: "pill-critical", t: "TERS ayırt ediyor - soru veya cevap anahtarı hatalı olabilir" };
  if (d < 0.20) return { s: "pill-critical", t: "ayırt etmiyor - havuzdan çıkarmayı düşünün" };
  if (d < 0.30) return { s: "pill-warning", t: "sınırda - gözden geçirin" };
  if (d < 0.40) return { s: "pill-success", t: "iyi ayırt ediyor" };
  return { s: "pill-success", t: "çok iyi ayırt ediyor" };
}

function itemAnalysisHtml() {
  const a = itemAnalysis();
  if (!a.maddeler.length) return "";

  const satirlar = a.maddeler.map(function (m) {
    const py = pYorum(m.p), dy = dYorum(m.d);
    const sikDagilimi = Object.keys(m.secim).map(function (key) {
      const say = m.secim[key];
      const dogruMu = key === m.q.correctKey;
      const oran = a.n ? Math.round(say / a.n * 100) : 0;
      const ek = dogruMu ? " ia-opt-correct" : (!say ? " ia-opt-dead" : "");
      // Şık harfi sunucuda A-D'ye normalleştiriliyor ama tarayıcıdaki
      // durum elle de düzenlenebiliyor; kaçırmamak maliyetsiz.
      return '<span class="ia-opt' + ek + '">' + escapeHtml(key) + ": " + say +
        ' <span class="ia-opt-pct">(%' + oran + ")</span>" + (dogruMu ? " &#10003;" : "") + "</span>";
    }).join("");

    return '<div class="ia-item">' +
      '<div class="ia-body">' + escapeHtml(m.q.body) + "</div>" +
      '<div class="ia-metrics">' +
        '<span class="ia-metric"><b>p</b> = ' + m.p.toFixed(2) +
          ' <span class="pill ' + py.s + '">' + py.t + "</span></span>" +
        '<span class="ia-metric"><b>d</b> = ' + m.d.toFixed(2) +
          ' <span class="pill ' + dy.s + '">' + dy.t + "</span></span>" +
      "</div>" +
      '<div class="ia-opts">' + sikDagilimi +
        (m.bos ? '<span class="ia-opt">boş: ' + m.bos + "</span>" : "") + "</div>" +
      (m.islevsiz.length
        ? '<div class="ia-note">İşlevsiz çeldirici: <b>' + m.islevsiz.map(escapeHtml).join(", ") +
          "</b> - hiçbir öğrenci seçmedi, bu şık soruyu zorlaştırmıyor. Daha inandırıcı bir çeldiriciyle değiştirmeyi düşünün.</div>"
        : "") +
      "</div>";
  }).join("");

  const grupAcik = a.guvenilir ? "%27 alınarak" : "yarıya bölünerek";
  const uyari = !a.guvenilir
    ? '<div class="ia-warn"><b>Bu sayılar gösterge niteliğindedir.</b> Sınıfta ' + a.n +
      " öğrenci var; madde analizinin istatistiksel olarak anlamlı olması için genellikle en az 10 " +
      "öğrenci gerekir. Yön gösterir, karar vermez - kararı siz verirsiniz.</div>"
    : "";

  return '<div class="card" style="margin-top:18px;">' +
    '<div class="card-head"><h3>Madde Analizi</h3>' +
    '<span class="hint">klasik test kuramı · yapay zekâ kullanılmaz, saf hesap</span></div>' +
    '<div class="ia-legend"><b>p</b> = güçlük (doğru yanıtlayan oranı) &nbsp;·&nbsp; ' +
    "<b>d</b> = ayırt edicilik (üst grup - alt grup doğru oranı). " +
    "Gruplar, sınavdaki çoktan seçmeli doğru sayısına göre sıralanıp uçlardan " +
    grupAcik + " oluşturuldu (" + a.k + " + " + a.k + " öğrenci).</div>" +
    uyari + satirlar + "</div>";
}

/* ===========================================================================
   ÖĞRETMEN - YAPAY ZEKÂ UYUMU (kalibrasyon)
   ===========================================================================
   NEDEN: Brief'in problem tanımındaki cümle şudur - "değerlendiriciler
   arasında tutarsızlık oluşabiliyor." Bu bölüm doğrudan o soruna bakar:
   öğretmenin onayladığı NİHAİ puan ile yapay zekânın ÖNERDİĞİ puan ne kadar
   örtüşüyor?

   Üç şey ölçülür:
     1. Yön (bias)        : ortalama(nihai - AI). Pozitifse AI CİMRİ davranıyor
                            (öğretmen puan ekliyor), negatifse AI CÖMERT.
     2. Ortalama sapma    : ortalama(|nihai - AI|) - yönden bağımsız büyüklük.
     3. Güven kalibrasyonu: AI "güvenim yüksek" dediğinde gerçekten daha mı
                            isabetli? Güven skoru bu projede onay kuyruğunu
                            sıralamak için kullanılıyor; işe yarayıp yaramadığı
                            ancak böyle ölçülebilir.

   SINIR (dürüstlük notu, ekranda da yazar): Öğretmen puanı KRİTER BAZINDA
   değil, TOPLAM olarak düzeltiyor. Bu yüzden "hangi kriterde ayrışıyoruz"
   sorusu bu veriyle yanıtlanamaz; kırılım soru ve güven bandı düzeyinde
   verilir.

   Hiçbir AI çağrısı yapılmaz; saf hesaptır.
   =========================================================================== */

/* §29 — GENELLEŞTİRME: Bu hesap eskiden yalnızca `calibration()` içindeydi ve
   TEK sınavın TEK odasına bakıyordu. Eğitim Yöneticisi karnesi aynı matematiği
   öğretmen bazında, BİRDEN FAZLA sınav/oda üzerinden istiyor. Formülü ikinci
   kez YAZMAK yerine (iki kopya = iki yerde ayrı ayrı bozulabilecek işaret
   kuralı riski) tek bir saf fonksiyona taşındı: girdi HAM (ai, nihai, maxScore,
   confidence) çiftleri, çıktı hem `calibration()` (öğretmenin kendi ekranı)
   hem `teacherCalibration()` (Eğitim Yöneticisi karnesi) için birebir aynı.

   PAYDA SIFIR KORUMASI: `maxScore <= 0` ya da tanımsız olan kayıtlar `uyum`/
   `ortTavan` hesabına GİRMEZ (aşağıdaki `tavanlar` filtresi) — ama `yon`/`sapma`
   hesabına girer, çünkü ai/nihai farkı rubrik tavanından bağımsız anlamlıdır. */
function calibrationFromRecords(hamKayitlar) {
  const kayitlar = (hamKayitlar || []).map(function (k) {
    const fark = Number(k.nihai) - Number(k.ai);
    return Object.assign({}, k, { fark: fark, degistirildi: Math.abs(fark) > 0.001 });
  });

  if (!kayitlar.length) return { n: 0 };

  const n = kayitlar.length;
  const ort = function (dizi) { return dizi.reduce(function (a, b) { return a + b; }, 0) / dizi.length; };
  const yon = ort(kayitlar.map(function (k) { return k.fark; }));
  const sapma = ort(kayitlar.map(function (k) { return Math.abs(k.fark); }));
  const aynenOnay = kayitlar.filter(function (k) { return !k.degistirildi; }).length;

  // Payda sıfır koruması: 0, null, undefined veya negatif tavan istatistikten çıkarılır.
  const tavanlar = kayitlar.map(function (k) { return k.maxScore; })
    .filter(function (v) { return v != null && Number(v) > 0; });
  const ortTavan = tavanlar.length ? ort(tavanlar) : null;
  const uyum = ortTavan ? Math.max(0, Math.round((1 - sapma / ortTavan) * 100)) : null;

  const bantla = function (c) {
    if (c == null) return null;
    if (c >= 0.85) return "yuksek";
    if (c >= 0.70) return "orta";
    return "dusuk";
  };
  const bantlar = { yuksek: [], orta: [], dusuk: [] };
  kayitlar.forEach(function (k) {
    const b = bantla(k.confidence);
    if (b) bantlar[b].push(Math.abs(k.fark));
  });
  const bantOzeti = ["yuksek", "orta", "dusuk"].map(function (b) {
    return { bant: b, adet: bantlar[b].length, ortSapma: bantlar[b].length ? ort(bantlar[b]) : null };
  }).filter(function (x) { return x.adet > 0; });

  const yks = bantOzeti.filter(function (x) { return x.bant === "yuksek"; })[0];
  const dsk = bantOzeti.filter(function (x) { return x.bant === "dusuk"; })[0];
  let guvenKalibre = null;
  if (yks && dsk) guvenKalibre = yks.ortSapma < dsk.ortSapma;

  const enFarkli = kayitlar.slice().sort(function (a, b) { return Math.abs(b.fark) - Math.abs(a.fark); })[0];

  return {
    n: n, yon: yon, sapma: sapma, uyum: uyum, ortTavan: ortTavan,
    aynenOnay: aynenOnay, degistirilen: n - aynenOnay,
    bantOzeti: bantOzeti, guvenKalibre: guvenKalibre,
    enFarkli: enFarkli && Math.abs(enFarkli.fark) > 0.001 ? enFarkli : null,
    guvenilir: n >= 5
  };
}

// Öğretmenin KENDİ ekranı (Analitik sekmesi): yalnızca aktif sınavın gönderen
// öğrencileri. Davranış §17'den bu yana DEĞİŞMEDİ — yalnızca hesap motoru
// artık `calibrationFromRecords()` ile paylaşılıyor.
function calibration() {
  const gonderenler = submittedStudents();
  const kayitlar = [];

  gonderenler.forEach(function (st) {
    const ss = readSession(st.id);
    const rv = ss.reviews || {}, ev = ss.aiEvals || {};
    Object.keys(rv).forEach(function (qid) {
      const r = rv[qid];
      if (!r || r.finalScore == null || r.aiScore == null) return;
      const q = state.questions.find(function (x) { return String(x.id) === String(qid); });
      const rub = state.rubrics[qid];
      const evq = ev[qid];
      kayitlar.push({
        sid: st.id, ogrenci: st.name, qid: qid,
        soru: q ? q.body : "(soru bulunamadı)",
        maxScore: rub ? rub.maxScore : (evq ? evq.maxScore : null),
        ai: Number(r.aiScore), nihai: Number(r.finalScore),
        confidence: evq && evq.confidence != null ? Number(evq.confidence) : null
      });
    });
  });

  return calibrationFromRecords(kayitlar);
}

/* ===========================================================================
   EĞİTİM YÖNETİCİSİ — ÖĞRETMEN BAZLI KAYIT TOPLAMA (§29)
   ===========================================================================
   Bu prototipte kimlik doğrulama yoktur; "öğretmen" bir `role` seçimidir,
   ayrı bir kullanıcı kaydı DEĞİLDİR (bkz. schema.sql §10 notu). O yüzden
   öğretmen bazlı toplama, sınav kayıtlarındaki `teacherName` etiketine göre
   yapılır: `state.exams` içindeki HER sınav (yalnızca aktif olan değil) o
   sınavın sahibi öğretmene ait sayılır. Sunucu tarafında ayrıca bir agregasyon
   ROTASI eklenmedi — `src/routes/sync.ts`'in "sunucu gövdeyi yorumlamaz"
   ilkesi bilinçli olarak korundu; hesap tamamen istemcide (`app.js`) kalır. */
function teacherExamRecords(teacherName) {
  syncActiveExam(); // aktif sınav/öğrencinin en güncel hâli kayit.sessions'a yazılsın
  const kayitlar = [];
  (state.exams || []).forEach(function (kayit) {
    const ad = (kayit.teacherName || "").trim() || VARSAYILAN_OGRETMEN_ADI;
    if (ad !== teacherName) return;
    const sessions = kayit.sessions || {};
    Object.keys(sessions).forEach(function (sid) {
      const ss = sessions[sid] || {};
      const rv = ss.reviews || {}, ev = ss.aiEvals || {};
      const ogr = (state.students || []).find(function (s) { return String(s.id) === String(sid); });
      Object.keys(rv).forEach(function (qid) {
        const r = rv[qid];
        if (!r || r.finalScore == null || r.aiScore == null) return;
        const q = state.questions.find(function (x) { return String(x.id) === String(qid); });
        const rub = state.rubrics[qid];
        const evq = ev[qid];
        kayitlar.push({
          ogrenci: (ogr && ogr.name) || "öğrenci",
          soru: q ? q.body : "(soru bulunamadı)",
          maxScore: rub ? rub.maxScore : (evq ? evq.maxScore : null),
          ai: Number(r.aiScore), nihai: Number(r.finalScore),
          confidence: evq && evq.confidence != null ? Number(evq.confidence) : null
        });
      });
    });
  });
  return kayitlar;
}

/* Kurumdaki öğretmen listesi: önce GERÇEK sınav kayıtlarındaki isimler
   (bu sistemde gerçekten yürütülmüş sınavlar), sonra — yalnızca gerçek verisi
   OLMAYAN isimler için — `state.baseline.teachers` örnek karşılaştırma verisi.
   Isı haritasındaki gerçek+"(örnek)" satır birlikteliğiyle AYNI sözleşme:
   örnek satırlar her zaman `demo:true` ile etiketlenir, gerçek veriyle
   karıştırılmaz. */
function teacherRoster() {
  syncActiveExam();
  const gercekAdlar = {};
  (state.exams || []).forEach(function (k) {
    const ad = (k.teacherName || "").trim() || VARSAYILAN_OGRETMEN_ADI;
    gercekAdlar[ad] = true;
  });
  const liste = Object.keys(gercekAdlar).sort().map(function (ad) {
    return { name: ad, subject: null, records: teacherExamRecords(ad), demo: false };
  });
  (state.baseline.teachers || []).forEach(function (t) {
    if (gercekAdlar[t.name]) return; // gerçek veri varsa örnek satır tekrar gösterilmez
    liste.push({ name: t.name, subject: t.subject, records: t.records, demo: true });
  });
  return liste;
}

function calibrationHtml() {
  const c = calibration();
  if (!c.n) return "";

  const yonMetni = Math.abs(c.yon) < 0.05
    ? "Sistematik bir sapma yok."
    : (c.yon > 0
      ? "Yapay zekâ ortalama <b>" + Math.abs(c.yon).toFixed(1) + " puan CİMRİ</b> davranıyor - siz puan ekliyorsunuz."
      : "Yapay zekâ ortalama <b>" + Math.abs(c.yon).toFixed(1) + " puan CÖMERT</b> davranıyor - siz puan kırıyorsunuz.");

  const bantAd = { yuksek: "Yüksek güven (%85 ve üstü)", orta: "Orta güven (%70-85)", dusuk: "Düşük güven (%70 altı)" };
  const bantSatir = c.bantOzeti.map(function (b) {
    return '<div class="cal-band"><span class="cal-band-ad">' + bantAd[b.bant] + "</span>" +
      '<span class="cal-band-adet">' + b.adet + " yanıt</span>" +
      '<span class="cal-band-sapma">ortalama sapma <b>' + b.ortSapma.toFixed(1) + "</b> puan</span></div>";
  }).join("");

  const kalibreNotu = c.guvenKalibre === null
    ? '<div class="cal-note">Güven skorunun işe yarayıp yaramadığını ölçmek için hem yüksek hem düşük güvenli değerlendirme gerekir; henüz ikisi birlikte yok.</div>'
    : (c.guvenKalibre
      ? '<div class="cal-note cal-ok"><b>Güven skoru çalışıyor.</b> Yapay zekânın emin olduğu yanıtlarda sizinle daha çok örtüşüyor, zorlandığını söylediği yanıtlarda daha çok ayrışıyor. Onay kuyruğundaki "en düşük güven en üstte" sıralaması bu yüzden anlamlı.</div>'
      : '<div class="cal-note cal-warn"><b>Dikkat: güven skoru beklendiği gibi davranmıyor.</b> Yapay zekânın emin olduğu yanıtlarda sapma, zorlandığını söylediği yanıtlardan daha büyük. Onay kuyruğu sıralamasına bu veriyle güvenmeyin.</div>');

  const enFarkliKutu = c.enFarkli
    ? '<div class="cal-worst"><span class="cal-worst-baslik">En çok ayrıştığınız yanıt</span>' +
      escapeHtml(c.enFarkli.ogrenci || "öğrenci") + " · " + escapeHtml(String(c.enFarkli.soru).slice(0, 90)) +
      '<div class="cal-worst-sayi">AI önerisi <b>' + c.enFarkli.ai + "</b> &rarr; sizin puanınız <b>" +
      c.enFarkli.nihai + "</b> (" + (c.enFarkli.fark > 0 ? "+" : "") + c.enFarkli.fark.toFixed(1) + ")</div></div>"
    : "";


  /* 🔴 SADELEŞTİRME (ekip denemesi geri bildirimi: "bu kısmı hiç anlamadım").

     Panel `n≈20` onay için tasarlanmıştı: yedi ayrı metin bloğu basıyordu ve
     `n=1` iken bunların DÖRDÜ "bu sayı henüz anlamlı değil" diyen çekinceydi.
     Yani panel, en çok görüleceği durumda (demo/jüri: n=1-3) en anlaşılmaz
     hâlindeydi.

     İki değişiklik:

     1. AZ VERİDE YÜZDE GÖSTERİLMEZ. Tek onayda "%100 uyum" yazmak matematiksel
        olarak doğru ama bilgi olarak yanlış: hiçbir şey ölçmüyor, üstelik
        "yapay zekâ mükemmel" izlenimi veriyor. Az veride ham sayım gösterilir
        (kaç onay, kaçında puan değişti) — bu her zaman doğrudur.
     2. Geri kalan her şey `<details>` içine alındı. Silinmedi: jüri "derinlik
        var mı" diye sorarsa tek tıkla açılıyor. Katlama idiyomu `.src-blok`
        ile aynı (inline betik yok — §6.3-7). */
  const azVeriModu = !c.guvenilir || c.n < 5;

  const buyukSayi = azVeriModu ? String(c.n) : (c.uyum != null ? "%" + c.uyum : "—");
  const buyukEtiket = azVeriModu ? "onaylanan değerlendirme" : "uyum";

  const tekCumle = azVeriModu
    ? (c.degistirilen === 0
        ? "Bu değerlendirmelerin hepsini yapay zekânın önerdiği puanla onayladınız. " +
          "Uyum oranı, en az 5 onaydan sonra anlamlı bir sayı verir."
        : "Bunların <b>" + c.degistirilen + "</b> tanesinde yapay zekânın önerdiği puanı değiştirdiniz. " +
          "Uyum oranı, en az 5 onaydan sonra anlamlı bir sayı verir.")
    : yonMetni + " <b>" + c.aynenOnay + "</b> yanıtı olduğu gibi onayladınız, <b>" + c.degistirilen +
      "</b> yanıtta puanı değiştirdiniz. Ortalama sapma <b>" + c.sapma.toFixed(1) + "</b> puan" +
      (c.ortTavan ? " (ortalama tam puan " + c.ortTavan.toFixed(0) + ")" : "") + ".";

  const ayrintiIc =
    (azVeriModu
      ? "<div>Ortalama sapma <b>" + c.sapma.toFixed(1) + "</b> puan" +
        (c.ortTavan ? " (ortalama tam puan " + c.ortTavan.toFixed(0) + ")" : "") + ".</div>" +
        (c.uyum != null ? "<div>Ham uyum oranı: <b>%" + c.uyum + "</b> — yalnızca " + c.n +
          " onay üzerinden hesaplandığı için tek bir puan değişikliği bu sayıyı büyük ölçüde oynatır.</div>" : "")
      : "") +
    bantSatir + kalibreNotu + enFarkliKutu +
    '<div class="cal-limit">Bu ölçüm toplam puan üzerinden yapılır. Öğretmen puanı kriter bazında değil toplam olarak düzelttiği için "hangi kriterde ayrışıyoruz" sorusu bu veriyle yanıtlanamaz.</div>';

  return '<div class="card" style="margin-top:18px;">' +
    '<div class="card-head"><h3>Öğretmen – Yapay Zekâ Uyumu</h3>' +
    '<span class="hint">yapay zekânın önerdiği puanı ne sıklıkla değiştiriyorsunuz</span></div>' +
    '<div class="cal-top">' +
      '<div class="cal-big"><div class="cal-big-sayi">' + buyukSayi + "</div>" +
      '<div class="cal-big-etiket">' + buyukEtiket + "</div></div>" +
      '<div class="cal-detay"><div>' + tekCumle + "</div></div>" +
    "</div>" +
    '<details class="cal-ayrinti"><summary>Ayrıntılı analiz</summary>' + ayrintiIc + "</details>" +
    "</div>";
}

/* ===========================================================================
   KAVRAM YANILGISI KÜMELEME (arayüz)
   ===========================================================================
   NEDEN: Isı haritası "hangi kazanım zayıf" der. Bu bölüm "NEDEN zayıf" der.
   Öğretmenin asıl ihtiyacı budur: yarın sınıfta neyi tekrar anlatacağı.

   TASARIM KARARLARI:
   - OTOMATİK ÇALIŞMAZ. Her analiz bir model çağrısıdır ve kota tüketir;
     öğretmen istediğinde düğmeyle tetiklenir.
   - Öğrenci ADI sunucuya gönderilmez (yalnızca anonim yanıt metinleri).
   - Sonuç hiçbir puanı etkilemez (agents.md §7.1) — bir gözlemdir.
   - Sessiz düşüş yok: çağrı başarısız olursa hata ekranda yazar, uydurma
     bir "yanılgı listesi" gösterilmez.
   - Sonuç sınav+soru bazında saklanır ve diske yazılır; sekme değişiminde
     yeniden ücret ödenmez.
   =========================================================================== */

function miscKey(qid) {
  return String(state.activeExamId) + ":" + String(qid);
}

/** Bu sınavdaki açık uçlu sorular (analiz edilebilir olanlar). */
function miscQuestions() {
  return (state.exam.questionIds || [])
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(function (q) { return q && q.type === "open"; });
}

/** Sınıfın o soruya verdiği DOLU yanıtları toplar (isim taşımaz). */
function miscAnswers(qid) {
  return submittedStudents()
    .map(function (st) { return ((readSession(st.id).answers || {})[qid] || {}).text || ""; })
    .map(function (t) { return String(t).trim(); })
    .filter(function (t) { return t.length > 0; });
}

async function runMisconceptions(qid) {
  const q = state.questions.find(function (x) { return String(x.id) === String(qid); });
  if (!q) return;
  const key = miscKey(qid);
  state.misconceptions = state.misconceptions || {};
  state.misconceptions[key] = { loading: true };
  renderAll();

  const yanitlar = miscAnswers(qid);
  if (yanitlar.length < 2) {
    state.misconceptions[key] = { error: "Analiz için en az iki dolu yanıt gerekir; şu an " + yanitlar.length + " var." };
    saveState(); renderAll(); return;
  }

  try {
    const j = await apiPost(AI_API.misconceptions, {
      questionBody: q.body,
      outcomeLabel: outcomeLabel(q.outcome),
      answers: yanitlar
    });
    state.misconceptions[key] = {
      clusters: j.clusters || [],
      correctCount: j.correctCount || 0,
      analyzed: j.analyzed || yanitlar.length,
      model: (j.meta && j.meta.model) || "",
      fellBack: !!(j.meta && j.meta.fellBack),
      at: Date.now()
    };
  } catch (e) {
    // Sessiz düşüş yok: uydurma bir yanılgı listesi göstermek yerine hatayı yaz.
    state.misconceptions[key] = { error: String((e && e.message) || e) };
  }
  saveState();
  renderAll();
}

function misconceptionHtml() {
  const sorular = miscQuestions();
  if (!sorular.length) return "";
  const gonderen = submittedStudents().length;
  if (gonderen < 2) return "";

  const bloklar = sorular.map(function (q) {
    const key = miscKey(q.id);
    const d = (state.misconceptions || {})[key];
    const yanitSayisi = miscAnswers(q.id).length;

    let govde;
    if (d && d.loading) {
      govde = '<div class="mis-durum">Sınıfın yanıtları okunuyor…</div>';
    } else if (d && d.error) {
      govde = '<div class="mis-hata"><b>Analiz yapılamadı.</b> ' + escapeHtml(d.error) +
        '<div class="mis-hata-not">Yanıtlar kaybolmadı. Bağlantı düzelince yeniden deneyebilirsiniz.</div></div>';
    } else if (d && d.clusters) {
      if (!d.clusters.length) {
        govde = '<div class="mis-durum mis-temiz">Tekrarlayan bir kavram yanılgısı bulunamadı. ' +
          d.analyzed + " yanıt incelendi.</div>";
      } else {
        govde = d.clusters.map(function (k) {
          const oran = d.analyzed ? Math.round(k.studentCount / d.analyzed * 100) : 0;
          return '<div class="mis-kume">' +
            '<div class="mis-kume-bas"><span class="mis-kume-ad">' + escapeHtml(k.title) + "</span>" +
            '<span class="pill ' + (oran >= 50 ? "pill-critical" : "pill-warning") + '">' +
            k.studentCount + "/" + d.analyzed + " öğrenci</span></div>" +
            (k.explanation ? '<div class="mis-aciklama">' + escapeHtml(k.explanation) + "</div>" : "") +
            ((k.evidence || []).length
              ? '<div class="mis-kanit">' + k.evidence.map(function (e) {
                  return '<span class="mis-alinti">&ldquo;' + escapeHtml(e) + "&rdquo;</span>";
                }).join("") + "</div>"
              : "") +
            (k.action ? '<div class="mis-aksiyon"><b>Öneri:</b> ' + escapeHtml(k.action) + "</div>" : "") +
            "</div>";
        }).join("") +
        '<div class="mis-ozet">' + d.analyzed + " yanıt incelendi · " + d.correctCount +
          " yanıt kazanımı doğru biçimde ifade etmiş" +
          (d.model ? ' · <span class="mis-model">' + escapeHtml(d.model) + "</span>" : "") +
          (d.fellBack ? ' <span class="pill pill-warning">yedek model</span>' : "") + "</div>";
      }
    } else {
      govde = '<div class="mis-durum">Bu soruya ' + yanitSayisi +
        " dolu yanıt verildi. Sınıfın ortak hatasını görmek için analiz edin.</div>";
    }

    const dugmeMetni = d && d.clusters ? "Yeniden Analiz Et" : "Sınıfın Ortak Hatasını Bul";
    return '<div class="mis-blok">' +
      '<div class="mis-soru">' + escapeHtml(q.body) + "</div>" +
      govde +
      '<div class="mis-alt"><button class="btn btn-secondary btn-sm mis-run" data-qid="' + q.id + '"' +
      (d && d.loading ? " disabled" : "") + ">" + (d && d.loading ? "Analiz ediliyor…" : dugmeMetni) + "</button>" +
      '<span class="mis-alt-not">' + yanitSayisi + " yanıt · isimler gönderilmez</span></div>" +
      "</div>";
  }).join("");

  return '<div class="card" style="margin-top:18px;">' +
    '<div class="card-head"><h3>Kavram Yanılgısı Analizi</h3>' +
    '<span class="hint">ısı haritası "hangi kazanım zayıf" der, bu bölüm "neden zayıf" der</span></div>' +
    '<div class="mis-giris">Sınıfın açık uçlu yanıtlarında <b>en az iki öğrencide tekrarlayan</b> ' +
    "hatalar gruplanır. Bu bir puanlama değildir, hiçbir öğrencinin notunu etkilemez; " +
    "yarın sınıfta neyi tekrar anlatacağınıza karar vermeniz içindir. " +
    "Öğrenci adları yapay zekâya gönderilmez.</div>" +
    bloklar + "</div>";
}

function wireMisconceptions() {
  document.querySelectorAll(".mis-run").forEach(function (b) {
    b.onclick = function () { runMisconceptions(b.dataset.qid); };
  });
}

function teacherTab4Html() {
  if (state.exam.status !== "published" || state.examStatus === "not_started") return '<div class="empty-state">Sınıf analitikleri, sınav yayınlanıp öğrenciler tamamladıkça burada oluşacak.</div>';
  const scores = computeDemoClassScores();
  const vals = Object.keys(scores).map(function (k) { return scores[k]; });
  const avg = vals.length ? Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) : 0;
  // Sabit "1/1" yazıyordu: çoklu öğrenci desteği geldiğinde güncellenmemişti.
  const tumOgr = (state.students || []).length;
  const bitiren = submittedStudents().length;
  // Şube adı da sabit "8-A" idi; gerçek şubeler 7-A / 7-B.
  // Mevcut siniflar() yardımcısı kullanıldı (alan adı s.sinif).
  const subeler = siniflar();
  const subeEtiketi = subeler.length ? subeler.join(" · ") : "sınıf";
  return '<div class="grid-3col" style="margin-bottom:18px;">' +
    '<div class="stat-tile"><div class="s-label">Sınıf Ortalaması</div><div class="s-value tabular">%' + avg + '</div><div class="s-sub">tüm kazanımlar</div></div>' +
    '<div class="stat-tile"><div class="s-label">Sınav Durumu</div><div class="s-value" style="font-size:16px;">' + examStatusLabel() + '</div></div>' +
    '<div class="stat-tile"><div class="s-label">Öğrenci</div><div class="s-value tabular">' + bitiren + '/' + tumOgr + '</div><div class="s-sub">tamamladı</div></div></div>' +
    '<div class="card"><div class="card-head"><h3>Kazanım Isı Haritası — ' + escapeHtml(subeEtiketi) + '</h3><span class="hint">diğer sınıflarla karşılaştırma</span></div><div id="teacherHeatmap"></div></div>' +
    itemAnalysisHtml() +
    calibrationHtml() +
    misconceptionHtml() +
    trendHtml();
}

/* §29 — ÖĞRETMEN ETİKETİ/SEÇİCİSİ (SEÇENEK A: prototip disiplini).
   Kimlik doğrulama YOK; "şu an ben buyum" diyen bu alan yalnızca bir isim
   etiketidir. Yeni oluşturulan sınav bu isme atanır (bkz. createExam) ve
   Eğitim Yöneticisi karnesindeki "kim" sorusunun cevabı budur. Değer boşsa
   sınav `VARSAYILAN_OGRETMEN_ADI` altında toplanır (teacherRoster). */
function teacherWhoamiHtml() {
  const ad = state.activeTeacherName || "";
  const secenekler = ogretmenSecenekleri();
  /* §34: eskiden yalnızca bir <datalist> vardı. Tarayıcı datalist'i ancak
     kullanıcı YAZMAYA BAŞLAYINCA açar; bu yüzden ekranda üç öğretmen tanımlı
     olmasına rağmen alan bomboş görünüyor ve kimse listenin varlığını
     bilmiyordu. Artık adlar GÖRÜNÜR çip olarak sunuluyor. datalist de
     KORUNDU — yazarken tamamlama hâlâ çalışsın.

     🔴 SINIF SEÇİMİ — ÖLÇÜLMÜŞ TUZAK: bu çiplere önce öğrenci seçicisinin
     `.sp-btn` sınıfı verilmişti (görsel dil aynı olsun diye). Ama öğrenci
     seçicisi `document.querySelectorAll(".sp-btn")` ile BELGE ÇAPINDA
     bağlanıyor (bkz. wireStudentPicker) ve buradaki çiplerin onclick'ini
     `activateStudent(...)` ile EZİYORDU — çipe basınca hiçbir şey olmuyordu.
     Bu, TUZAK 1'in (duplicate id) sınıf tarafındaki eşi: paylaşılan bir
     sınıfa belge çapında olay bağlayan başka bir bileşen varsa, o sınıfı
     yeniden KULLANMAYIN. Görsel eşitlik CSS'te sağlanır (app.css'te
     `.ta-who-btn` kuralları `.sp-btn` ile aynı satırlarda tanımlıdır). */
  const cipler = secenekler.map(function (t) {
    const secili = t.name === ad;
    return '<button type="button" class="ta-who-btn' + (secili ? " active" : "") + '" ' +
      'data-ad="' + escapeHtml(t.name) + '" aria-pressed="' + (secili ? "true" : "false") + '"' +
      /* §34 — İFADE DOĞRULUĞU: `gercek` bayrağı yalnızca "bu ada ATANMIŞ
         bir sınav var" demektir; o öğretmenin gerçekten puanlama yaptığını
         göstermez (bir sınav oluşturulup hiç değerlendirilmemiş olabilir).
         Etiket önce "kayıtlı" idi ve alt not "gerçekten sınav değerlendirdiğini
         gösterir" diyordu — ekranı yalanlayan bir iddiaydı. Bu proje aynı
         hata sınıfını daha önce dört kez düzeltti (§ fix: kayıtları). */
      (t.subject ? ' title="Branş: ' + escapeHtml(t.subject) + '"' : ' title="Bu ada atanmış sınav var"') + '>' +
      escapeHtml(t.name) +
      (t.gercek ? '<span class="sc-tag">sınavı var</span>' : (t.subject ? '<span class="sc-class">' + escapeHtml(t.subject) + '</span>' : "")) +
      '</button>';
  }).join("");
  const oneriler = secenekler.map(function (t) {
    return '<option value="' + escapeHtml(t.name) + '">';
  }).join("");
  return '<div class="ta-whoami">' +
    '<div class="sp-label">Öğretmen adınız — bu sınavı kim değerlendiriyor</div>' +
    '<div class="ta-who-list">' + cipler +
    (ad && !secenekler.some(function (t) { return t.name === ad; })
      ? '<button type="button" class="ta-who-btn active" data-ad="' + escapeHtml(ad) + '" aria-pressed="true">' + escapeHtml(ad) + '</button>'
      : "") +
    '</div>' +
    '<div class="ta-who-input"><input type="text" id="taWhoami" list="taWhoamiList" ' +
    'placeholder="ya da adınızı yazın — örn. Ahmet Yılmaz" value="' + escapeHtml(ad) + '">' +
    (ad ? '<button type="button" class="btn btn-secondary btn-sm ta-who-temizle">Temizle</button>' : "") +
    '<datalist id="taWhoamiList">' + oneriler + '</datalist></div>' +
    '<div class="ta-who-not">Listedekiler yalnızca kolaylık; alan serbesttir — istediğiniz adı yazabilirsiniz. ' +
    '<b>sınavı var</b> etiketi, o ada bu sistemde atanmış en az bir sınav bulunduğunu gösterir.</div>' +
    '</div>';
}

/* §34/§35 — öğretmen adı alanının olay bağlamaları. Eskiden renderTeacher
   gövdesinin içindeydi; alan 3. sekmeye taşınınca içerik o sekme çizildikten
   SONRA bağlanmalı, bu yüzden ayrı bir fonksiyona alındı. */
function wireTeacherWhoami() {
  const whoami = document.getElementById("taWhoami");
  if (whoami) {
    /* TUZAK 3: oninput içinden renderAll() ÇAĞRILMAZ — yazarken odak kaybolur.
       Çip seçimleri bir sonraki çizimde güncellenir; bilinçli ödünleşme. */
    whoami.oninput = function (e) {
      state.activeTeacherName = e.target.value;
      state.exam.teacherName = e.target.value; // aktif sınav bu öğretmene atanır
      saveSoon();
    };
  }
  /* §34 — hızlı seçim çipleri. id DEĞİL sınıf + querySelectorAll: beş panel
     aynı anda DOM'da (§6.3-2 / TUZAK 1). Çip TIKLAMASI bir yazma eylemi
     olmadığı için renderAll() burada güvenlidir ve seçili çipi günceller. */
  document.querySelectorAll(".ta-who-btn").forEach(function (b) {
    b.onclick = function () {
      const yeni = b.dataset.ad || "";
      // Aynı çipe tekrar basmak seçimi kaldırır — yanlış seçimden çıkışın
      // en kısa yolu; ayrıca "Temizle" düğmesi de var.
      const ad = state.activeTeacherName === yeni ? "" : yeni;
      state.activeTeacherName = ad;
      state.exam.teacherName = ad;
      renderAll();
    };
  });
  document.querySelectorAll(".ta-who-temizle").forEach(function (b) {
    b.onclick = function () {
      state.activeTeacherName = "";
      state.exam.teacherName = "";
      renderAll();
    };
  });
}

function renderTeacher() {
  const root = document.getElementById("panel-teacher");
  // Madde 3: rozetler İçerik Uzmanı sekmelerindeki (ceTabsHtml) desenle
  // birebir aynı — salt okunur sayaç, hiçbir onay/karar vermez.
  const tabs = [
    { id: 1, label: "1 · Sınav Oluştur" },
    { id: 2, label: "2 · Rubrik", rozet: pendingRubricCount() },
    { id: 3, label: "3 · Değerlendirme Onayı", rozet: pendingReviewCount() },
    { id: 4, label: "4 · Analitik" }
  ];
  /* §35 — ÖĞRETMEN ADI ALANI ARTIK YALNIZCA "3 · Değerlendirme Onayı"
     SEKMESİNDE. Eskiden sekme şeridinin ÜSTÜNDE, dört sekmede birden
     duruyordu; alanın sorduğu şey ("bu sınavı kim değerlendiriyor") yalnızca
     değerlendirme adımında anlamlı olduğu için sınav kurma, rubrik ve
     analitik ekranlarında yer kaplıyordu.

     BİLİNEN SONUÇ: createExam() yeni sınavı state.activeTeacherName'e atar
     (bkz. o fonksiyondaki §29 notu). Alan 1. sekmede görünmediği için ad,
     sınav oluşturulmadan ÖNCE girilemez. Kayıp değildir: 3. sekmede ad
     girildiğinde state.exam.teacherName de güncellenir ve aktif sınavın
     sahibi düzelir. Analitik sekmesi bu alandan bağımsızdır — kendi
     listesini (state.adminSelectedTeacher) kullanır (ölçüldü). */
  root.innerHTML = '<div class="tabs" id="teacherTabs">' +
    tabs.map(function (t) {
      return '<button class="tab-btn ' + (state.teacherTab === t.id ? "active" : "") + '" data-tab="' + t.id + '">' +
        t.label + (t.rozet ? ' <span class="tab-count">' + t.rozet + '</span>' : "") + '</button>';
    }).join("") +
    '</div><div id="teacherTabContent"></div>';
  document.querySelectorAll("#teacherTabs .tab-btn").forEach(function (b) { b.onclick = function () { state.teacherTab = Number(b.dataset.tab); renderAll(); }; });
  const content = document.getElementById("teacherTabContent");
  if (state.teacherTab === 1) { content.innerHTML = teacherTab1Html(); wireTeacherTab1(); }
  if (state.teacherTab === 2) { content.innerHTML = teacherTab2Html(); wireTeacherTab2(); }
  if (state.teacherTab === 3) { content.innerHTML = teacherWhoamiHtml() + teacherTab3Html(); wireTeacherWhoami(); wireTeacherTab3(); }
  if (state.teacherTab === 4) { content.innerHTML = teacherTab4Html() + dikkatPanelHtml(); wireMisconceptions(); wireDikkat(); if (state.exam.status === "published" && state.examStatus !== "not_started") renderHeatmap("teacherHeatmap", teacherHeatmapRows()); }
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
    /* ÜRÜNÜN ANA BOŞLUĞU BURADA KAPANIYOR: öğrencinin bitirdiği kağıt,
       öğretmenin cihazındaki panele ancak buradan gönderilirse düşer (§28b). */
    syncOtomatik();
  }
}

// "3 gün 4 saat" gibi okunur kalan süre — saniye saymak anlamsız.
/* `datetime-local` alanının beklediği "YYYY-MM-DDTHH:MM" biçimi (YEREL saat).
   Hem alanın `min` özniteliği hem de varsayılan açılış değeri bunu kullanır;
   ikisi ayrı ayrı yazılırsa biri diğerini yalanlayabilir. ISO/UTC KULLANILAMAZ:
   `toISOString()` saat dilimini kaydırır ve öğretmenin seçtiği saat 3 saat
   önce/sonra görünür. */
function yerelDamga(d) {
  const pad = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
    "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

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
  /* §28r: "Kime yayınlansın?" hedef sınıf filtresi. Öğrenci sınava DAHA ÖNCE
     dokunduysa (not_started değilse) hedef sınıf sonradan değişse/kaldırılsa
     bile görünmeye devam eder — aksi hâlde yarım kalmış bir sınav öğrencinin
     ekranından sessizce kaybolurdu. */
  const kendiSinifi = (activeStudent().sinif || "");
  const yayindakiler = state.exams.filter(function (x) {
    const aktif = x.id === state.activeExamId;
    const ex = aktif ? state.exam : x;
    if (ex.status !== "published") return false;
    if (!ex.targetClass || ex.targetClass === kendiSinifi) return true;
    const durum = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
    return durum !== "not_started";
  });
  if (!yayindakiler.length) {
    return bosDurumHtml("Şu anda size atanmış aktif ya da yaklaşan bir sınav yok.");
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
          /* SAYAÇ KARTIN KENDİSİNE BAĞLI (§28a). Eskiden burada `id="waitPill"`
             vardı; birden fazla sınav beklerken AYNI id birden çok kez basılıyor,
             `getElementById` yalnızca ilkini bulabiliyordu. Artık her kart kendi
             açılış damgasını taşır ve sayacı kendi damgasından hesaplanır. */
          '<div class="lbl-hint wait-pill" data-basla="' + c.ex.startsAt + '" style="margin-left:0;">' + kalanMetni(c.ex.startsAt) + '</div></div>'
        : "") +
      '<div style="margin-top:14px;">' + examActionBtn(x) + '</div></div>';
  }).join("");
}

function wireStudentTab1() {
  wireSyncJoin();
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
    const kendiSinifi = (activeStudent().sinif || "");
    const hazir = (state.exams || []).filter(function (x) {
      const aktif = x.id === state.activeExamId;
      const ex = aktif ? state.exam : x;
      const durum = aktif ? state.examStatus : (((x.sessions || {})[state.activeStudentId] || {}).examStatus || "not_started");
      const bekliyor = ex.startsAt ? Date.now() < ex.startsAt : false;
      const sinifUygun = !ex.targetClass || ex.targetClass === kendiSinifi || durum !== "not_started";
      return ex.status === "published" && (durum === "not_started" || durum === "in_progress") && !bekliyor && sinifUygun;
    });
    if (!hazir.length) {
      return bosDurumHtml(
        state.examStatus === "submitted" ? "Yanıtlarınız gönderildi, öğretmen onayı bekleniyor."
          : state.examStatus === "graded" ? "Bu sınav sonuçlandı. Karnenizi 3. sekmeden görebilirsiniz."
          : "Şu anda çözebileceğiniz bir sınav yok."
      );
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
  const isFlagged = function (id) { return !!(state.flagged || {})[id]; };
  // Madde 5: kalan süre görünürlüğü iki eşikli — 60 sn altı (mevcut "low",
  // kırmızı) ve 5 dk altı (yeni "warn", uyarı rengi). Zaman hesaplama
  // (endsAt/remainingSec) mantığına HİÇ dokunulmadı; yalnızca stil sınıfı.
  const sureSinifi = state.remainingSec < 60 ? "low" : (state.remainingSec <= 300 ? "warn" : "");
  return integrityNoticeHtml() +
    '<div class="timer-bar"><div>Kalan süre</div><div class="t-value tabular ' + sureSinifi + '" id="timerValue">' + formatTime(state.remainingSec) + '</div>' +
    '<div class="qnav">' + items.map(function (it, i) {
      return '<div class="qnav-dot ' + (i === state.currentQIndex ? "current" : "") + " " + (answered(it.id) ? "answered" : "") +
        (isFlagged(it.id) ? " flagged" : "") + '" data-idx="' + i + '" title="' +
        (isFlagged(it.id) ? "İşaretli — gözden geçirilecek" : "") + '">' + (i + 1) +
        (isFlagged(it.id) ? ' <span class="qnav-flag">🚩</span>' : "") + '</div>';
    }).join("") + '</div></div>' +
    '<div class="card exam-viewport"><div class="qv-meta"><span class="pill pill-accent">' + (q.type === "mc" ? "Çoktan Seçmeli" : "Açık Uçlu") + '</span>' +
    '<span class="pill pill-neutral">Soru ' + (state.currentQIndex + 1) + '/' + items.length + '</span>' +
    /* Madde 5: "gözden geçir" işareti — yanıtlanma durumundan bağımsız,
       yalnızca öğrencinin kendi gezinmesine yardımcı olur, hiçbir puanı
       etkilemez (aynı sınav bütünlüğü kaydı gibi: bilgi amaçlı, karar
       öğrencinin/öğretmenin). */
    '<button class="btn btn-secondary btn-sm' + (isFlagged(q.id) ? " flag-on" : "") + '" id="btnFlagQ" type="button" title="Bu soruyu daha sonra gözden geçirmek için işaretle">' +
    (isFlagged(q.id) ? "🚩 İşaretli" : "🏳️ İşaretle") + '</button></div>' +
    kaynakBlokHtml(q, "student") +
    '<div class="qv-body">' + escapeHtml(q.body) + '</div>' + (q.type === "mc" ? mcAnswerHtml(q) : openAnswerHtml(q)) +
    '<div class="exam-footer"><div><button class="btn btn-secondary" id="btnPrevQ" ' + (state.currentQIndex === 0 ? "disabled" : "") + '>← Önceki</button> ' +
    '<button class="btn btn-secondary" id="btnNextQ" ' + (state.currentQIndex === items.length - 1 ? "disabled" : "") + '>Sonraki →</button></div>' +
    '<button class="btn btn-critical" id="btnFinishExam">Sınavı Bitir</button></div></div>';
}
function wireStudentTab2() {
  // Aktif sınav yokken bu sekme sınav başlatma kartlarını gösterir.
  if (state.examStatus !== "in_progress") { wireStudentTab1(); return; }
  // Madde 5: gözden geçirme işareti — yanıtı değiştirmez, yalnızca toggle'lar.
  const flagBtn = document.getElementById("btnFlagQ");
  if (flagBtn) flagBtn.onclick = function () {
    const items = state.exam.questionIds.map(function (id) { return state.questions.find(function (q) { return q.id === id; }); }).filter(Boolean);
    const q = items[state.currentQIndex];
    if (!q) return;
    state.flagged = state.flagged || {};
    if (state.flagged[q.id]) delete state.flagged[q.id]; else state.flagged[q.id] = true;
    saveSoon();
    renderAll();
  };
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
      /* §30 — SEÇİLİ ŞIK VURGUSU: burada bilerek renderAll() ÇAĞRILMAZ
         (sınav ekranını komple yeniden çizmek gereksiz ve risklidir), ama
         .selected sınıfı da taşınmıyordu: radyo düğmesi yeni şıkka geçiyor,
         kutu vurgusu ESKİ şıkta kalıyordu. Öğrenci iki çelişkili işaret
         görüyor ve yanıtının kaydedilmediğini sanabiliyordu. Vurgu yalnızca
         tıklanan şıkkın KARDEŞLERİ arasında taşınır — beş panel aynı anda
         DOM'da olduğu için belge çapında seçici kullanılmaz (§6.3 dersi). */
      const kutu = el.closest(".answer-opt");
      const kapsayici = kutu && kutu.parentElement;
      if (kapsayici) {
        kapsayici.querySelectorAll(".answer-opt").forEach(function (x) {
          const r = x.querySelector('input[type="radio"]');
          x.classList.toggle("selected", !!(r && r.checked));
        });
      }
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
      // SAVUNMA: sonuç kaydı yoksa çökmek yerine durumu açıkça söyle.
      // Bu, sınav yayınlandıktan SONRA soru eklenmesi ya da eksik/bozuk
      // oturum verisi yüklenmesi durumunda olur. Sessizce "yanlış" saymak
      // öğrenciye haksızlıktır; puanlamaya da dahil edilmez.
      if (!res) {
        return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) +
          '</span><span class="pill pill-warning">puanlanmadı</span></div>' +
          '<div style="font-size:12.5px;color:var(--text-muted);">Bu soru için yanıtın kaydedilmemiş — ' +
          'soru sen sınavı bitirdikten sonra eklenmiş olabilir. Toplam puanına eklenmedi; ' +
          'öğretmenine söyle.</div></div>';
      }
      /* PUAN GÖRÜNÜR OLMALI (ekip denemesi geri bildirimi): burada eskiden
         yalnızca "✓ Doğru" rozeti vardı; soru puanlanıyordu ama öğrenci o
         sorudan kaç puan aldığını göremiyordu. Puan artık açık uçlu
         sorularla aynı biçimde ("N / M") yazılır. */
      const mcP = mcPuani();
      const kazanilan = res.correct ? mcP : 0;
      totalScore += kazanilan; totalMax += mcP;
      /* Şık HARFİ tek başına öğrenciye ne işaretlediğini hatırlatmaz
         ("C" neydi?). Şıkkın metni de yazılır; silinmiş/bozuk şık
         durumunda harfe düşülür (§6.3-12: alan dolu VARSAYILMAZ). */
      const sikMetni = function (key) {
        const o = (q.options || []).find(function (x) { return x.key === key; });
        return o && o.text ? key + ") " + o.text : (key || "—");
      };
      return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) + '</span>' +
        '<span class="rr-score tabular">' + kazanilan + " / " + mcP + '</span></div>' +
        '<div class="rr-answer"><div class="rr-answer-lbl">Sizin yanıtınız</div>' +
        '<div class="rr-answer-txt' + (res.correct ? " ok" : " no") + '">' + escapeHtml(sikMetni(a.selectedKey)) +
        ' <span class="pill ' + (res.correct ? "pill-success" : "pill-critical") + '">' +
        (res.correct ? "✓ Doğru" : "✕ Yanlış") + '</span></div>' +
        (res.correct ? "" :
          '<div class="rr-answer-lbl" style="margin-top:8px;">Doğru yanıt</div>' +
          '<div class="rr-answer-txt ok">' + escapeHtml(sikMetni(q.correctKey)) + '</div>') +
        '</div></div>';
    } else {
      const rv = state.reviews[q.id], rub = state.rubrics[q.id];
      /* AI DEĞERLENDİRMESİ OLMAYABİLİR — ve bu olağan bir durumdur:
         model çağrısı başarısız olduğunda öğretmene "Elle Puanla ve Onayla"
         seçeneği sunuluyor (§3.4 sessiz geri düşüş yasağı). O yol seçilirse
         `aiEvals[q.id]` hiç oluşmaz.
         Eskiden burada doğrudan `ev.breakdown` okunuyordu ve karne
         ÇÖKÜYORDU — §4.4'te `mcResults` için düzeltilen hatanın birebir
         aynısı, bu kez AI değerlendirmesi için. */
      const ev = state.aiEvals[q.id] || {};
      // SAVUNMA: onay ya da rubrik kaydı yoksa çökmek yerine durumu söyle.
      if (!rv || !rub) {
        return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) +
          '</span><span class="pill pill-warning">puanlanmadı</span></div>' +
          '<div style="font-size:12.5px;color:var(--text-muted);">Bu soru ' +
          (!rub ? "için puanlama ölçütü hazırlanmamış" : "henüz öğretmenin tarafından onaylanmamış") +
          '. Toplam puanına eklenmedi — öğretmenine söyle.</div></div>';
      }
      totalScore += rv.finalScore; totalMax += rub.maxScore;
      /* "Değiştirildi mi" sorusu ETİKETTEN DEĞİL, PUANDAN türetilir.
         Eskiden `rv.decision === "revised"` yeterli sayılıyordu; öğretmen
         düzenleme alanını açıp AYNI puanı onaylarsa karar "revised" olur ve
         öğrenciye "öğretmenin bunu değiştirdi" denirdi — oysa değişmemiştir.
         Bu, öğrenciye puanının nasıl oluştuğunu YANLIŞ anlatmaktır (§17a-3
         ile aynı sınıf). `auditKaydet` zaten `Math.abs(nihai-ai) > 0.001`
         kullanıyordu; karne artık onunla aynı ölçütü kullanıyor, böylece
         karne ile denetim günlüğü birbirini yalanlayamaz. */
      const aiOneri = rv.aiScore != null ? Number(rv.aiScore) : (ev.aiScore != null ? Number(ev.aiScore) : null);
      const revize = aiOneri != null && Math.abs(Number(rv.finalScore) - aiOneri) > 0.001;
      /* ÖĞRENCİ KENDİ YANITINI GÖRMELİ (ekip denemesi geri bildirimi).
         Karne, öğrenciye "şu kriterden 1/6 aldın" diyordu ama ne yazdığını
         göstermiyordu — geri bildirim, neye verildiği görünmeden öğrenilebilir
         bir şey söylemez. Çoktan seçmelide "Yanıtınız: A" zaten vardı;
         açık uçluda hiç yoktu, yani ürün kendi içinde tutarsızdı. */
      const yanitMetni = String(((state.answers[q.id] || {}).text || "")).trim();
      return '<div class="report-row"><div class="rr-head"><span>' + escapeHtml(q.body) + '</span><span class="rr-score tabular">' + rv.finalScore + " / " + rub.maxScore + '</span></div>' +
        '<div class="rr-answer"><div class="rr-answer-lbl">Sizin yanıtınız</div>' +
        '<div class="rr-answer-txt' + (yanitMetni ? "" : " bos") + '">' +
        (yanitMetni ? escapeHtml(yanitMetni) : "Bu soruya yanıt yazmamışsınız.") + '</div></div>' +
        '<div style="margin-top:8px;font-size:11.5px;color:var(--text-muted);">' +
        /* DÜRÜSTLÜK: ortada hiç yapay zekâ önerisi yokken öğrenciye "yapay zekâ
           önerisi onaylandı" demek yanlış beyandır. Öğretmen elle puanladıysa
           (AI çağrısı başarısız olduğu için ya da tercihen) bunu olduğu gibi
           söyle. HITL tezinin gereği: öğrenci puanın nasıl oluştuğunu doğru
           bilmeli. */
        (aiOneri == null
          ? 'Bu puanı öğretmenin kendisi verdi; bu soruda yapay zekâ önerisi kullanılmadı.'
          : revize
            ? 'Yapay zekâ ' + aiOneri + ' puan önermişti; öğretmenin okuyup ' + rv.finalScore + ' puana çevirdi.'
            : 'Yapay zekâ bu puanı önerdi, öğretmenin okuyup onayladı.') + '</div>' +
        ((ev.breakdown || []).length ? '<div style="margin-top:10px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em;">Puanın nereden geldiği</div>' : "") +
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
  /* NİHAİ PUAN BARİZ OLMALI (ekip denemesi geri bildirimi).
     Toplam puan eskiden kart başlığının sağ köşesindeki küçük bir rozetti
     ("Toplam 5/22") — karnenin en çok aranan bilgisi en az göze çarpan
     yerdeydi. Artık kendi bloğunda, puan + yüzde olarak en üstte duruyor.

     YÜZDE NEDEN VAR: "5/22" öğrenciye tek başına bir şey söylemiyor;
     sınavdan sınava tavan değiştiği için karşılaştırılabilir de değil.
     totalMax 0 ise bölme yapılmaz (§6.3-12). */
  const puan = Math.round(totalScore * 10) / 10;
  const yuzde = totalMax > 0 ? Math.round(totalScore / totalMax * 100) : null;

  return '<div class="card">' +
    '<div class="card-head"><h3>' + escapeHtml(state.exam.title || "Sınav Karnesi") + '</h3>' +
    '<span class="hint">öğretmeniniz onayladı</span></div>' +
    '<div class="karne-toplam">' +
      '<div class="kt-sayi"><span class="kt-puan tabular">' + puan + '</span>' +
      '<span class="kt-tavan tabular">/ ' + totalMax + '</span></div>' +
      (yuzde == null ? "" : '<div class="kt-yuzde tabular">%' + yuzde + '</div>') +
      '<div class="kt-not">Bu senin bu sınavdan aldığın <b>nihai puan</b>. ' +
      'Aşağıda her soruda ne yazdığını, kaç puan aldığını ve neden o puanı aldığını görebilirsin.</div>' +
    '</div>' + rows + '</div>';
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
/* Isı haritası hücresinin metin rengini, hücrenin GERÇEK hesaplanmış zemin
   parlaklığından seçer — böylece palet değişse de kendiliğinden uyar.

   ÖLÇÜLEN HATA (düzeltildi): eşik 0,42 idi ve yanlış yerdeydi. `--seq-4`
   (#6a86cf, L=0,246) eşiğin altında kalıp AÇIK metin alıyordu; kontrast
   yalnızca 3,31:1 çıkıyordu — WCAG AA eşiği 4,5:1. Aynı hücrede KOYU metin
   4,95:1 veriyor, yani doğru seçim koyuydu.

   Doğru eşik tahmin edilmedi, hesaplandı: iki metin renginin kontrastı
   L_zemin = sqrt((L_koyu+0,05)(L_acik+0,05)) - 0,05 noktasında eşitlenir;
   bu palet için 0,195. Bu değerde her hücre iki seçenekten YÜKSEK kontrastlı
   olanı alır (ölçüldü: seq-3 8,29:1 · seq-4 4,95:1 · seq-5 7,78:1). */
const METIN_ESIGI = 0.195;
function bestTextColor(el) {
  const bg = getComputedStyle(el).backgroundColor;
  const m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return;
  const L = relLuminance(+m[1], +m[2], +m[3]);
  el.style.color = L > METIN_ESIGI ? "#1b1915" : "#f5f7fb";
}
function scaleStep(pct) { if (pct >= 85) return 5; if (pct >= 70) return 4; if (pct >= 55) return 3; if (pct >= 40) return 2; return 1; }

function renderHeatmap(targetId, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const cols = OUTCOMES_LIST();
  el.innerHTML = '<div class="heatmap-wrap"><table class="heatmap"><tr><th></th>' +
    // GÜVENLİK: kazanım KODU da kullanıcı girdisidir. "+ Yeni kazanım tanımla"
    // formundaki kod alanı serbest metindir; sabit bir kalıp (MAT.7.2.1)
    // varsaymak yanlıştı. Etiketler kaçırılıyordu ama kodlar kaçırılmıyordu.
    cols.map(function (c) { return "<th>" + escapeHtml(c.code) + "</th>"; }).join("") + "</tr>" +
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
  /* §37 — UYARI YALNIZCA GERÇEK SATIRLARDAN. Bu döngü eskiden "(örnek)"
     satırlarını da tarıyordu; demo verisi bir aksiyon uyarısı doğuramaz.
     Bugünkü demo değerlerinin hepsi ≥58 olduğu için hata GÖRÜNMÜYORDU ama
     kod yoluna sahipti: 6-A örnek değeri 30'a çekilerek yeniden üretildi —
     uyarı "6-A (örnek) · MAT.7.2.1" satırını gösterdi. */
  const low = [];
  rows.filter(function (r) { return !r.ornek; })
    .forEach(function (r) { cols.forEach(function (c) { const v = r.scores[c.code]; if (v != null && v < 55) low.push(escapeHtml(r.name) + " · " + escapeHtml(c.code)); }); });
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
        return '<button class="btn btn-secondary btn-sm remedial-btn" data-kod="' + escapeHtml(z.kod) + '" data-sinif="' +
          escapeHtml(z.sinif) + '" data-deger="' + z.deger + '">' +
          escapeHtml(z.sinif) + ' · ' + escapeHtml(z.kod) + ' (%' + z.deger + ') → tekrar sorusu üret</button>';
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
  const gercek = realClassRows();
  return gercek.concat(ornekSinifSatirlari(gercek));
}

/* Okul geneli GERÇEK ölçme durumu.

   🔴 NEDEN YAZILDI (ekip denemesi geri bildirimi): Bu üç kutu eskiden
   `state.baseline.totalAssigned / totalCompleted / pendingApprovalsOther`
   sabitlerinden besleniyordu — yani "%88,8 · 142/160 sınav tamamlandı"
   yazısı UYDURMA bir sayıydı. Üç ayrı sorun üretiyordu:

     1. Ekran kendi kendini yalanlıyordu: kutu "142/160 tamamlandı" derken
        hemen altındaki ısı haritası aynı ekranda "7-A (0/2)" diyordu.
     2. Kutuların üstündeki açıklama "buradaki sayılar yalnızca öğretmen
        onayından geçmiş sonuçları yansıtır" diyordu; sabit sayı için bu
        YANLIŞ BEYANDIR (§17a-3'te düzeltilen hatanın aynı sınıfı).
     3. Isı haritası satırları "(örnek)" etiketliyken bu kutular etiketsizdi
        — ürün kendi dürüstlük standardına (§6.3-5) uymuyordu.

   Artık sayılar yayınlanmış sınavlardan ve gerçek öğrenci oturumlarından
   hesaplanır. Veri yoksa uydurulmaz; "henüz yok" denir.

   Bir atama = (yayınlanmış sınav × öğrenci) çifti. Aktif sınavın aktif
   öğrencisinin oturumu state kökünde durduğu için okuma `readSession()`
   üzerinden yapılır (§3.2). */
function okulGercekDurum() {
  const ogrenciler = state.students || [];
  let atanan = 0, tamamlanan = 0, bekleyen = 0;
  (state.exams || []).forEach(function (kayit) {
    if (kayit.status !== "published") return;
    ogrenciler.forEach(function (ogr) {
      atanan++;
      const ss = (kayit.id === state.activeExamId)
        ? readSession(ogr.id)
        : ((kayit.sessions || {})[ogr.id] || null);
      if (!ss) return;
      if (ss.examStatus === "submitted" || ss.examStatus === "graded") tamamlanan++;
      const evals = ss.aiEvals || {}, revs = ss.reviews || {};
      Object.keys(evals).forEach(function (qid) { if (!revs[qid]) bekleyen++; });
    });
  });
  return { atanan: atanan, tamamlanan: tamamlanan, bekleyen: bekleyen };
}
function renderAdmin() {
  const root = document.getElementById("panel-admin");
  const durum = okulGercekDurum();
  const rate = durum.atanan ? Math.round(durum.tamamlanan / durum.atanan * 1000) / 10 : null;

  /* En zayif kazanimi bul: yoneticiye "ne yapmali" sorusunun cevabini ver.

     GERÇEK VERİ ÖNCELİKLİ: Bu kutu eskiden "(örnek)" satırları da tarıyordu ve
     pratikte hep demo sınıfını işaret ediyordu — yönetici, var olmayan bir
     şubenin öğretmeniyle çalışma planlamaya yönlendiriliyordu. Artık önce
     gerçek şubelere bakılır; gerçek veri yoksa örneğe düşülür ve bunun örnek
     veri olduğu ekranda YAZAR (§6.3-5: simüle veri simüle olduğunu söyler). */
  function enDusukKazanim(satirlar) {
    let en = null;
    satirlar.forEach(function (r) {
      OUTCOMES_LIST().forEach(function (c) {
        const v = r.scores[c.code];
        if (v != null && (!en || v < en.v)) en = { sinif: r.name, kod: c.code, etiket: outcomeLabel(c.code), v: v };
      });
    });
    return en;
  }
  let enZayif = enDusukKazanim(realClassRows());
  const enZayifOrnek = !enZayif;
  if (!enZayif) enZayif = enDusukKazanim(buildAdminHeatmapRows());

  root.innerHTML =
    '<div class="card" style="margin-bottom:16px;"><div class="card-head">' +
    '<h3>Okul Geneli Ölçme Durumu</h3><span class="hint">tüm sınıflar, bu dönem</span></div>' +
    '<div style="font-size:13px;color:var(--text-muted);line-height:1.6;">' +
    'Bu ekran, okuldaki ölçme sürecinin ne kadarının tamamlandığını ve hangi kazanımlarda ' +
    'eksik kalındığını tek bakışta gösterir. Puanların hiçbiri yapay zekâ tarafından ' +
    'kesinleştirilmemiştir; buradaki sayılar yalnızca <b>öğretmen onayından geçmiş</b> sonuçları yansıtır. ' +
    'Aşağıdaki üç kutu <b>yalnızca bu sistemde gerçekten yürütülen</b> sınavlardan hesaplanır. ' +
    'Isı haritasındaki <b>“(örnek)”</b> etiketli satırlar ise karşılaştırma için konmuş demo verisidir ' +
    've bu kutulara dahil <b>edilmez</b>.' +
    '</div></div>' +

    '<div class="grid-3col" style="margin-bottom:18px;">' +
    '<div class="stat-tile"><div class="s-label">Sınav Tamamlanma</div><div class="s-value tabular">' +
    (rate == null ? "—" : "%" + rate) + '</div>' +
    '<div class="s-sub tabular">' +
    (durum.atanan
      ? durum.tamamlanan + '/' + durum.atanan + ' sınav tamamlandı'
      : 'henüz yayınlanmış sınav yok') + '</div>' +
    '<div class="s-note">Atanan sınavların öğrenciler tarafından bitirilme oranı ' +
    '(yayınlanmış her sınav × her öğrenci bir atama sayılır)</div></div>' +

    '<div class="stat-tile"><div class="s-label">Öğretmen Onayı Bekleyen</div><div class="s-value tabular">' + durum.bekleyen + '</div>' +
    '<div class="s-sub">açık uçlu yanıt</div>' +
    '<div class="s-note">AI puan önerdi, öğretmen henüz onaylamadı. Bu sayı büyürse sonuçlar gecikiyor demektir.</div></div>' +

    '<div class="stat-tile"><div class="s-label">Aktif Sınıf</div><div class="s-value tabular">' + siniflar().length + '</div>' +
    '<div class="s-sub">okul genelinde</div>' +
    '<div class="s-note">Bu dönem en az bir ölçme süreci yürütülen sınıf sayısı</div></div></div>' +

    (enZayif
      ? '<div class="card" style="margin-bottom:16px;"><div class="card-head"><h3>Önce Buraya Bakın</h3><span class="hint">' +
        (enZayifOrnek ? "örnek veri — gerçek sonuç henüz yok" : "en düşük kazanım") + '</span></div>' +
        '<div style="font-size:14px;line-height:1.65;"><b>' + escapeHtml(enZayif.sinif) + '</b> sınıfı, ' +
        '<b>' + escapeHtml(enZayif.etiket) + '</b> kazanımında <b class="tabular">%' + enZayif.v + '</b> başarı gösterdi. ' +
        (enZayifOrnek
          ? 'Bu satır <b>örnek karşılaştırma verisidir</b>; sistemde henüz öğretmen onayından geçmiş gerçek sonuç yok. ' +
            'Gerçek sonuçlar girdikçe bu kutu onlara göre güncellenir.'
          : 'Bu, okuldaki en düşük değer. İlgili öğretmenle bu kazanıma yönelik tekrar çalışması planlanabilir.') +
        '</div></div>'
      : "") +

    '<div class="card"><div class="card-head"><h3>Kazanım Isı Haritası</h3><span class="hint">satır: sınıf, sütun: kazanım</span></div>' +
    '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">' +
    /* 🔴 DÜZELTİLEN YANLIŞ BEYAN (kullanıcı bildirdi): burada
       "Koyu renk = düşük başarı, açık renk = yüksek başarı" yazıyordu —
       TERSİ doğru. Kanıt kodun kendisinde:
         · scaleStep(): 85+ -> 5, <40 -> 1  (yüksek yüzde = yüksek adım)
         · hücre zemini var(--seq-<adım>); --seq-1 en AÇIK, --seq-5 en KOYU
         · efsane de "Düşük [açık…koyu] Yüksek başarı" diyor
       Yani hem hücreler hem efsane doğruydu, yalnızca bu cümle ters yazılmıştı
       ve ikisiyle de çelişiyordu. Jüri bu cümleyi okusaydı en KOYU hücreleri
       (yani en başarılı sınıfları) en başarısız sanardı — analitik ekranının
       tamamı ters okunurdu. */
    'Her hücre, o sınıfın o kazanımdaki ortalama başarı yüzdesidir. ' +
    '<b>Koyu renk = yüksek başarı</b>, açık renk = düşük başarı. ' +
    '%55 altındaki hücreler aşağıda ayrıca uyarı olarak listelenir.</div>' +
    '<div id="adminHeatmap"></div></div>' + trendHtml();

  // §29: Öğretmen Değerlendirme Analitiği & Kalibrasyon — ısı haritasından
  // SONRA (okul geneli görünümden öğretmen bazlı kırılıma iniş sırası),
  // denetim izinden ÖNCE (karne, "bugün ne yapmalıyım" sorusuna en yakın kart).
  root.insertAdjacentHTML("beforeend", teacherAnalyticsHtml());
  wireTeacherAnalytics();
  // Yapay zeka karar gunlugu (denetim izi) — Egitim Yoneticisi gozetim rolu
  // oldugu icin buraya konuldu. Isi haritasindan SONRA eklenir cunku
  // renderHeatmap innerHTML ile kendi kapsayicisini yaziyor.
  root.insertAdjacentHTML("beforeend", auditGunluguHtml());
  wireAudit();
  /* Risk listesi (§28g). Denetim izinin ÜSTÜNE değil altına konuldu ama dışa
     aktarmanın üstünde: müdürün "bugün ne yapmalıyım" sorusu, indirme
     düğmelerinden önce gelir. */
  root.insertAdjacentHTML("beforeend", riskListesiHtml());
  // Dışa aktarma (§28d) — okullar sonuçları Excel'de ister.
  root.insertAdjacentHTML("beforeend", disaAktarHtml());
  wireDisaAktar();
  /* Isı haritası GERÇEK + "(örnek)" satırların ikisini birden gösterir
     (örnekler etiketli olduğu için yanıltmaz). "Önce Buraya Bakın" kutusu
     ise yalnızca gerçek satırlara bakar — bkz. `enDusukKazanim` kullanımı. */
  renderHeatmap("adminHeatmap", buildAdminHeatmapRows());
}

/* ===========================================================================
   ÖĞRETMEN DEĞERLENDİRME ANALİTİĞİ & KALİBRASYON (§29 — Eğitim Yöneticisi)
   ===========================================================================
   NEDEN: Brief'in problem tanımı — "değerlendiriciler arasında tutarsızlık
   oluşabiliyor, yönetici bunu göremiyor." `calibration()` (Öğretmen ekranı)
   bu ölçümü zaten TEK öğretmen/TEK sınav kapsamında yapıyordu; burada AYNI
   motor (`calibrationFromRecords`) öğretmen bazında, kurum genelinde çalışır.

   İŞARET KURALI (§29 uygulama talimatı madde 3): `yon = ort(nihai - ai)`.
   Pozitif -> öğretmen AI'dan DAHA YÜKSEK puan veriyor (cömert).
   Negatif -> öğretmen AI'dan DAHA DÜŞÜK puan veriyor (katı).
   Bu, öğretmenin kendi "Öğretmen – Yapay Zekâ Uyumu" kartındaki (`calibrationHtml`)
   yön cümlesiyle BİREBİR AYNI kuraldır çünkü ikisi de `calibrationFromRecords`'u
   çağırır — iki ayrı formül olmadığı için iki ekran asla ters yön göstermez. */

// Ortalama sapmayı ortalama rubrik tavanına oranlayıp yüzdeye çevirir.
// Tavan bilinmiyorsa (payda sıfır/])) null döner — çağıran puan cinsinden yazar.
function teacherDeltaYuzde(c) {
  if (!c.ortTavan || c.ortTavan <= 0) return null;
  return Math.round(Math.abs(c.yon) / c.ortTavan * 100);
}

function teacherOzetCumlesi(t) {
  const c = calibrationFromRecords(t.records);
  if (!c.n) return "henüz değerlendirme onayı yok";
  if (!c.guvenilir) return c.n + " onay — istatistiksel sapma için en az 5 onay gerekir";
  if (Math.abs(c.yon) < 0.05) return "AI analizine kıyasla sistematik bir sapma yok";
  const pct = teacherDeltaYuzde(c);
  /* 🔴 KENAR DURUMU (ölçüldü — Mehmet Demir örneği): yon ham puanda 0,05'i
     geçebilir ama yüzdeye çevrilip yuvarlanınca "%0" çıkabilir (ör. 0,07/20 ≈
     %0,35 -> yuvarlanır 0). "%0 daha yüksek puan veriyor" bir çelişkidir —
     bu durumda puan cinsinden ifadeye düşülür, sıfır yüzde YAZILMAZ. */
  const yonKelime = c.yon > 0 ? "daha yüksek" : "daha düşük";
  return pct != null && pct > 0
    ? "AI analizine kıyasla ortalama %" + pct + " " + yonKelime + " puan veriyor"
    : "AI analizine kıyasla ortalama " + Math.abs(c.yon).toFixed(1) + " puan " + yonKelime + " veriyor";
}

function teacherAnalyticsHtml() {
  const roster = teacherRoster();
  const secili = state.adminSelectedTeacher;

  const satirlar = !roster.length
    ? '<div class="empty-state">Henüz sınav kaydı yok; öğretmen listesi ilk sınav oluşturulunca dolar.</div>'
    : roster.map(function (t) {
        const c = calibrationFromRecords(t.records);
        const aktif = t.name === secili;
        const rozet = t.demo
          ? '<span class="pill pill-neutral">örnek</span>'
          : (c.n ? '<span class="pill pill-accent2">canlı</span>' : '<span class="pill pill-neutral">veri yok</span>');
        return '<div class="ta-row' + (aktif ? " ta-row-aktif" : "") + '" data-teacher="' + escapeHtml(t.name) + '">' +
          '<div class="ta-row-ust"><span class="ta-row-ad">' + escapeHtml(t.name) +
          (t.subject ? ' <span class="ta-row-ders">· ' + escapeHtml(t.subject) + '</span>' : "") + '</span>' + rozet + '</div>' +
          '<div class="ta-row-ozet">' + teacherOzetCumlesi(t) + '</div>' +
          '</div>';
      }).join("");

  const seciliKayit = secili ? roster.find(function (t) { return t.name === secili; }) : null;
  const detay = seciliKayit
    ? teacherReportCardHtml(seciliKayit)
    : '<div class="empty-state">Karneyi görmek için yukarıdaki listeden bir öğretmen seçin.</div>';

  return '<div class="card" style="margin-top:18px;">' +
    '<div class="card-head"><h3>Öğretmen Değerlendirme Analitiği &amp; Kalibrasyon</h3>' +
    '<span class="hint">yapay zekâ önerisi ile öğretmen kararı arasındaki uyum, öğretmen bazında</span></div>' +
    '<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px;line-height:1.6;">' +
    'Bu liste yalnızca öğretmenin <b>onayladığı</b> açık uçlu değerlendirmelerden hesaplanır; hiçbir sayı sabit değildir. ' +
    '<b>"canlı"</b> etiketi bu sistemde gerçekten yürütülmüş onayları, <b>"örnek"</b> etiketi henüz gerçek onayı ' +
    'olmayan öğretmenler için gösterilen karşılaştırma verisini gösterir.</div>' +
    '<div class="ta-list">' + satirlar + '</div>' +
    '<div id="taDetay">' + detay + '</div>' +
    '</div>';
}

function teacherReportCardHtml(t) {
  const c = calibrationFromRecords(t.records);
  const kaynakRozet = t.demo
    ? '<span class="pill pill-neutral">örnek veri</span>'
    : '<span class="pill pill-accent2">canlı veri</span>';

  // ZERO-DATA: kesinlikle "%0" ya da "%100" gibi yanıltıcı bir sayı YAZILMAZ.
  if (!c.n) {
    return '<div class="card" style="margin-top:12px;"><div class="card-head">' +
      '<h3>' + escapeHtml(t.name) + '</h3>' + kaynakRozet + '</div>' +
      '<div class="empty-state">Henüz değerlendirme onayı bulunmuyor.</div></div>';
  }

  const azVeriModu = !c.guvenilir;
  const pct = teacherDeltaYuzde(c);
  const yonEtiket = Math.abs(c.yon) < 0.05 ? "dengeli değerlendirici"
    : (c.yon > 0 ? "cömert değerlendirici" : "katı değerlendirici");
  // §29: aynı "%0 çelişkisi" koruması — bkz. teacherOzetCumlesi yorumu.
  // §29: "%0 daha yüksek puan verdi" çelişkisine düşmemek için — yüzde 0'a
  // yuvarlanıyorsa puan cinsine düşülür ve "puan" kelimesi TEKRARLANMAZ.
  const yonKelime = c.yon > 0 ? "daha yüksek" : "daha düşük";
  const yonCumle = Math.abs(c.yon) < 0.05
    ? escapeHtml(t.name) + ", AI analizine kıyasla sistematik bir sapma göstermiyor."
    : (pct != null && pct > 0
        ? escapeHtml(t.name) + ", AI analizine kıyasla ortalama <b>%" + pct + "</b> " + yonKelime + " puan verdi"
        : escapeHtml(t.name) + ", AI analizine kıyasla ortalama <b>" + Math.abs(c.yon).toFixed(1) + " puan</b> " + yonKelime + " verdi")
      + " / <b>" + yonEtiket + "</b>.";
  const tamMutabakat = Math.round(c.aynenOnay / c.n * 100);
  const enFarkli = c.enFarkli;

  return '<div class="card" style="margin-top:12px;"><div class="card-head">' +
    '<h3>' + escapeHtml(t.name) + (t.subject ? ' <span class="hint">' + escapeHtml(t.subject) + '</span>' : "") + '</h3>' +
    kaynakRozet + '</div>' +

    // AZ VERİ MODU (n<5): yüzde YAZILMAZ, ham sayım + uyarı gösterilir — aynı
    // disiplin `calibrationHtml()`'deki `azVeriModu` ile birebir aynıdır.
    (azVeriModu
      ? '<div class="pill pill-warning" style="margin-bottom:12px;">İstatistiksel sapma analizi için en az 5 onay gereklidir — şu an <b>' +
        c.n + '</b> onay var.</div>' +
        '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Bu ' + c.n + ' onayın ' +
        c.degistirilen + ' tanesinde AI önerisi değiştirildi, ' + c.aynenOnay + ' tanesi aynen onaylandı.</div>'
      : '<div style="font-size:13.5px;line-height:1.65;margin-bottom:14px;">' + yonCumle + '</div>') +

    '<div class="grid-3col">' +
    '<div class="stat-tile"><div class="s-label">Toplam Onay</div><div class="s-value tabular">' + c.n + '</div>' +
    '<div class="s-sub">açık uçlu değerlendirme</div></div>' +
    '<div class="stat-tile"><div class="s-label">Tam Mutabakat</div><div class="s-value tabular">%' + tamMutabakat + '</div>' +
    '<div class="s-sub tabular">' + c.aynenOnay + '/' + c.n + ' onayda AI puanı aynen kabul edildi</div></div>' +
    '<div class="stat-tile"><div class="s-label">Ortalama Sapma</div><div class="s-value tabular">' + c.sapma.toFixed(1) + '</div>' +
    '<div class="s-sub">puan (mutlak değer' + (c.ortTavan ? ", ortalama tam puan " + c.ortTavan.toFixed(0) : "") + ')</div></div>' +
    '</div>' +

    (enFarkli
      ? '<div class="cal-worst" style="margin-top:14px;"><span class="cal-worst-baslik">En çok ayrıştığı rubrik/soru</span>' +
        escapeHtml(enFarkli.ogrenci || "öğrenci") + " · " + escapeHtml(String(enFarkli.soru).slice(0, 90)) +
        '<div class="cal-worst-sayi">AI önerisi <b>' + enFarkli.ai + "</b> &rarr; öğretmenin puanı <b>" +
        enFarkli.nihai + "</b> (" + (enFarkli.fark > 0 ? "+" : "") + enFarkli.fark.toFixed(1) + ")</div></div>"
      : "") +
    '<div class="cal-limit">Bu ölçüm toplam puan üzerinden yapılır; öğretmen puanı kriter bazında değil toplam ' +
    'olarak düzelttiği için "hangi kriterde ayrışıyoruz" sorusu bu veriyle yanıtlanamaz.</div>' +
    '</div>';
}

function wireTeacherAnalytics() {
  document.querySelectorAll(".ta-row").forEach(function (el) {
    el.onclick = function () {
      const ad = el.dataset.teacher;
      state.adminSelectedTeacher = ad === state.adminSelectedTeacher ? null : ad;
      renderAll();
    };
  });
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
  const answered = function (it) { const a = state.answers[it.id]; return !!a && (a.selectedKey || (a.text && a.text.trim())); };
  const answeredCount = items.filter(answered).length;
  // Madde 5: hangi sorular yanıtsız olduğunu NUMARAYLA göster — eskiden
  // yalnızca "6/8" gibi bir sayı vardı, öğrenci hangi 2 soruyu atladığını
  // bulmak için sekmeler arasında gezinmek zorundaydı. Sınav akışına
  // (süre, kayıt, bitirme) hiç dokunulmadı; bu yalnızca bu modalın içeriği.
  const yanitsizNo = items.map(function (it, i) { return { it: it, no: i + 1 }; })
    .filter(function (x) { return !answered(x.it); })
    .map(function (x) { return x.no; });
  return '<h3>Sınavı bitirmek istediğinize emin misiniz?</h3>' +
    "<p>" + answeredCount + "/" + items.length + ' soruyu yanıtladınız. Bitirdikten sonra yanıtlarınızı değiştiremezsiniz; açık uçlu yanıtlarınız AI ön değerlendirmesine, ardından öğretmen onayına gönderilir.</p>' +
    (yanitsizNo.length
      ? '<p class="pill pill-warning" style="display:block;">Yanıtsız sorular: ' +
        yanitsizNo.map(function (n) { return "#" + n; }).join(", ") + '</p>'
      : "") +
    '<div class="modal-actions"><button class="btn btn-secondary" id="modalCancel">Vazgeç</button><button class="btn btn-critical" id="modalConfirmFinish">Evet, Bitir</button></div>';
}
/* ===========================================================================
   MÜFREDAT KAZANIM KATALOĞU
   ===========================================================================
   NEDEN: Kazanımlar bu prototipte elle yazılıyordu ve varsayılan üç tanesi
   (MAT.7.2.1, MAT.7.3.4, FEN.7.1.2) bizim uydurduğumuz kodlardı. Artık
   MEB Ortaokul Türkçe Dersi Öğretim Programı'nın 7. sınıf öğrenme çıktıları
   depoda duruyor (public/mufredat/turkce-7.json, 96 kazanım) ve öğretmen
   katalogdan seçerek ekliyor.

   ÜÇLÜ UYGUNLUK AYRIMI — ürünün kendi sınıflandırmasıdır, müfredatın parçası
   değildir ve arayüzde bu açıkça yazar:
     yazili     : yazılı sınavla ölçülebilir (Okuma, Yazma)            → 39
     performans : gözlem/performans gerektirir (Dinleme, Konuşma)      → 43
     surec      : öğrenme sürecine aittir, sınav sorusu olmaz          → 14

   Bu ayrım pedagojik olarak gereklidir: bir Türkçe öğretmeni konuşma
   kazanımını çoktan seçmeli soruyla ölçemez. Katalog varsayılan olarak
   yalnızca "yazili" gösterir; diğerleri uyarı etiketiyle listelenir.
   =========================================================================== */

/* Katalog anahtarı DERS + SINIF birlikte. Eskiden yalnızca ders vardı ve
   8. sınıf seçiliyken bile 7. sınıf kataloğu açılıyordu (kullanıcı bildirdi,
   PROGRESS §14b). Kazanımlar sınıfa özeldir; 7. sınıf kazanımı 8. sınıfta
   ölçülmez. */
/* MEB Maarif Modeli öğretim programlarından çıkarılan kazanım katalogları.
   3 ders x 4 sınıf = 12 dosya, toplam 606 öğrenme çıktısı.
   Çıkarım doğrulaması: aynı yöntem, bağımsız olarak hazırlanmış Türkçe 7
   kataloğunun 96 kaydını BİREBİR yeniden üretti (PROGRESS §22). */
const MUFREDAT_KATALOGLARI = {
  "Türkçe|5": "/mufredat/turkce-5.json",
  "Türkçe|6": "/mufredat/turkce-6.json",
  "Türkçe|7": "/mufredat/turkce-7.json",
  "Türkçe|8": "/mufredat/turkce-8.json",
  "Matematik|5": "/mufredat/matematik-5.json",
  "Matematik|6": "/mufredat/matematik-6.json",
  "Matematik|7": "/mufredat/matematik-7.json",
  "Matematik|8": "/mufredat/matematik-8.json",
  "Fen Bilimleri|5": "/mufredat/fen-5.json",
  "Fen Bilimleri|6": "/mufredat/fen-6.json",
  "Fen Bilimleri|7": "/mufredat/fen-7.json",
  "Fen Bilimleri|8": "/mufredat/fen-8.json",
};

function katalogAnahtari(ders, sinif) { return String(ders) + "|" + String(sinif); }

async function katalogYukle(ders, sinif) {
  const anahtar = katalogAnahtari(ders, sinif);
  const yol = MUFREDAT_KATALOGLARI[anahtar];
  if (!yol) return null;
  state.katalog = state.katalog || {};
  if (state.katalog[anahtar]) return state.katalog[anahtar];
  const r = await fetch(yol, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error("Katalog yüklenemedi (HTTP " + r.status + ")");
  const j = await r.json();
  state.katalog[anahtar] = j;
  return j;
}

/** Hangi ders/sınıf çiftleri için katalog var? (hata mesajında listelenir) */
function mevcutKataloglar() {
  return Object.keys(MUFREDAT_KATALOGLARI).map(function (a) {
    const p = a.split("|");
    return p[0] + " " + p[1] + ". sınıf";
  });
}

function katalogFiltreDurumu() {
  state.katalogFiltre = state.katalogFiltre || { alan: "", uygunluk: "yazili", ara: "" };
  return state.katalogFiltre;
}

function katalogSatirlari(k) {
  const f = katalogFiltreDurumu();
  const mevcut = {};
  OUTCOMES_LIST().forEach(function (o) { mevcut[o.code] = true; });
  const ara = (f.ara || "").toLocaleLowerCase("tr");
  return k.kazanimlar.filter(function (x) {
    if (f.alan && x.alan !== f.alan) return false;
    if (f.uygunluk && x.uygunluk !== f.uygunluk) return false;
    if (ara && (x.kod + " " + x.metin).toLocaleLowerCase("tr").indexOf(ara) === -1) return false;
    return true;
  }).map(function (x) { return Object.assign({}, x, { ekli: !!mevcut[x.kod] }); });
}

const UYGUNLUK_ETIKET = {
  yazili: { ad: "yazılı sınav", sinif: "pill-success", not: "" },
  performans: { ad: "performans", sinif: "pill-warning",
    not: "Bu kazanım dinleme ya da konuşma becerisidir; yazılı sınavla değil gözlemle ölçülür." },
  surec: { ad: "süreç", sinif: "pill-neutral",
    not: "Bu bir öğrenme süreci kazanımıdır; doğrudan sınav sorusu haline getirilmesi önerilmez." }
};

function katalogModalHtml(k, hata) {
  const f = katalogFiltreDurumu();
  const satirlar = katalogSatirlari(k);
  const alanlar = k.kazanimlar.map(function (x) { return x.alan; })
    .filter(function (v, i, a) { return a.indexOf(v) === i; });
  const sayim = { yazili: 0, performans: 0, surec: 0 };
  k.kazanimlar.forEach(function (x) { sayim[x.uygunluk]++; });

  const liste = satirlar.length
    ? satirlar.map(function (x) {
        const u = UYGUNLUK_ETIKET[x.uygunluk];
        return '<label class="kat-satir' + (x.ekli ? " kat-ekli" : "") + '">' +
          // Katalog şu an depodaki kendi JSON'umuzdan geliyor, ama §5.3-4
          // başka dersler için katalog eklemeyi planlıyor; kaynağın her zaman
          // bizim olacağını varsaymak yanlış olur.
          '<input type="checkbox" class="kat-sec" value="' + escapeHtml(x.kod) + '"' + (x.ekli ? " disabled checked" : "") + ">" +
          '<span class="kat-icerik"><span class="kat-kod">' + escapeHtml(x.kod) + "</span>" +
          '<span class="kat-metin">' + escapeHtml(x.metin) + "</span>" +
          '<span class="kat-etiketler"><span class="pill pill-neutral">' + escapeHtml(x.alan) + "</span>" +
          '<span class="pill ' + u.sinif + '">' + u.ad + "</span>" +
          (x.ekli ? '<span class="pill pill-neutral">zaten ekli</span>' : "") + "</span></span></label>";
      }).join("")
    : '<div class="kat-bos">Bu filtreyle eşleşen kazanım yok.</div>';

  return '<h3>MEB Kazanım Kataloğu — ' + escapeHtml(k.ders) + " " + k.sinif + ". sınıf</h3>" +
    '<div class="kat-kaynak">' + escapeHtml(k.kaynak) + " · <b>" + k.kazanimlar.length +
    " kazanım</b>. Bu kazanımlar uydurulmadı, öğretim programından alındı.</div>" +
    (hata ? '<div class="kat-hata">' + escapeHtml(hata) + "</div>" : "") +
    '<div class="kat-filtre">' +
      '<select id="katUygunluk">' +
        '<option value="yazili"' + (f.uygunluk === "yazili" ? " selected" : "") + ">Yazılı sınavla ölçülebilir (" + sayim.yazili + ")</option>" +
        '<option value="performans"' + (f.uygunluk === "performans" ? " selected" : "") + ">Performans/gözlem (" + sayim.performans + ")</option>" +
        '<option value="surec"' + (f.uygunluk === "surec" ? " selected" : "") + ">Süreç kazanımı (" + sayim.surec + ")</option>" +
        '<option value=""' + (f.uygunluk === "" ? " selected" : "") + ">Tümü (" + k.kazanimlar.length + ")</option>" +
      "</select>" +
      '<select id="katAlan"><option value="">Tüm alanlar</option>' +
        alanlar.map(function (a) {
          return '<option value="' + escapeHtml(a) + '"' + (f.alan === a ? " selected" : "") + ">" + escapeHtml(a) + "</option>";
        }).join("") +
      "</select>" +
      '<input id="katAra" placeholder="kazanım ara…" value="' + escapeHtml(f.ara) + '">' +
    "</div>" +
    (f.uygunluk && UYGUNLUK_ETIKET[f.uygunluk].not
      ? '<div class="kat-uyari">' + UYGUNLUK_ETIKET[f.uygunluk].not + "</div>" : "") +
    '<div class="kat-liste">' + liste + "</div>" +
    '<div class="kat-not">"Uygunluk" ayrımı bu ürünün değerlendirmesidir, müfredatın parçası değildir.</div>' +
    '<div class="modal-actions"><button class="btn btn-secondary" id="modalCancel">Kapat</button>' +
    '<button class="btn btn-primary" id="katEkle">Seçilenleri Ekle</button></div>';
}

async function katalogAc() {
  const ders = state.ceForm.subject;
  const sinif = state.ceForm.grade;
  try {
    const k = await katalogYukle(ders, sinif);
    if (!k) {
      openModal('<h3>Katalog bulunamadı</h3><p><b>' + escapeHtml(ders) + " · " + escapeHtml(String(sinif)) +
        '. sınıf</b> için müfredat kataloğu yok.</p>' +
        "<p>Şu an katalog bulunan ders/sınıflar: <b>" + mevcutKataloglar().join(", ") + "</b>. " +
        "Kazanımlar sınıfa özeldir; bu yüzden başka bir sınıfın kataloğu açılmaz. " +
        "Diğer ders ve sınıflar için kazanımları <b>+</b> düğmesiyle elle ekleyebilirsiniz.</p>" +
        '<div class="modal-actions"><button class="btn btn-secondary" id="modalCancel">Kapat</button></div>');
      return;
    }
    katalogModalGoster(k);
  } catch (e) {
    openModal('<h3>Katalog yüklenemedi</h3><p>' + escapeHtml(String((e && e.message) || e)) +
      "</p><p>Bağlantı düzelince tekrar deneyebilirsiniz; kazanımları elle de ekleyebilirsiniz.</p>" +
      '<div class="modal-actions"><button class="btn btn-secondary" id="modalCancel">Kapat</button></div>');
  }
}

function katalogModalGoster(k, hata) {
  openModal(katalogModalHtml(k, hata));
  const f = katalogFiltreDurumu();
  const yenile = function () { katalogModalGoster(k); };
  const uy = document.getElementById("katUygunluk");
  if (uy) uy.onchange = function () { f.uygunluk = uy.value; yenile(); };
  const al = document.getElementById("katAlan");
  if (al) al.onchange = function () { f.alan = al.value; yenile(); };
  const ara = document.getElementById("katAra");
  if (ara) {
    ara.oninput = function () { f.ara = ara.value; };
    // Arama kutusunda renderAll/yeniden çizim yapmıyoruz: odak kaybolur
    // (PROGRESS.md §5'te kayıtlı ders). Enter ile ya da filtre değişince yenilenir.
    ara.onkeydown = function (ev) { if (ev.key === "Enter") { ev.preventDefault(); yenile(); } };
  }
  const ekle = document.getElementById("katEkle");
  if (ekle) ekle.onclick = function () {
    const secili = Array.prototype.slice.call(document.querySelectorAll(".kat-sec:checked:not(:disabled)"));
    if (!secili.length) { katalogModalGoster(k, "Hiç kazanım seçmediniz."); return; }
    let eklenen = 0, atlanan = 0;
    secili.forEach(function (cb) {
      const kz = k.kazanimlar.filter(function (x) { return x.kod === cb.value; })[0];
      if (!kz) return;
      // addOutcome kodu büyük harfe çevirir ve kod+" — "+ad biçiminde etiketler.
      // Ders ve sınıf katalogdan gelir; böylece kazanım hangi ders/sınıfa ait
      // olduğunu taşır ve seçici filtresi doğru çalışır.
      const h = addOutcome(kz.kod, kz.metin, k.ders, k.sinif);
      if (h) atlanan++; else eklenen++;
    });
    closeModal();
    saveState();
    renderAll();
    if (eklenen) {
      state.ceForm.error = "";
    }
    // Kullanıcıya ne olduğunu söyle (sessiz başarı da bir belirsizliktir).
    openModal('<h3>Katalogdan eklendi</h3><p><b>' + eklenen + "</b> kazanım eklendi" +
      (atlanan ? ", <b>" + atlanan + "</b> tanesi zaten tanımlıydı ve atlandı" : "") +
      ".</p><div class=\"modal-actions\"><button class=\"btn btn-secondary\" id=\"modalCancel\">Tamam</button></div>");
  };
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
  const nav = document.getElementById("roleNav");

  /* §33 — ROL İZOLASYONU. Eskiden burada beş rolün düğmesi birden duruyordu
     ve kullanıcı giriş kapısından bir rol seçtikten sonra bile diğer dört
     role tek tıkla geçebiliyordu. Artık üst çubuk YALNIZCA içinde bulunulan
     rolü gösterir; rol değiştirmenin tek yolu Çıkış → giriş kapısı.

     Panellerin kendisi zaten izoleydi (aşağıda renderAll içinde tek bir
     panele .active veriliyor); değişen şey NAVİGASYON görünürlüğü, panel
     çizim mantığı değil.

     Bekleyen iş sayacı (badge) kayboLMAdı: aktif rolün rozeti aynı .badge
     bileşeniyle etiketin yanında durmaya devam ediyor. */
  const aktif = ROLES.find(function (r) { return r.id === state.role; });
  if (!aktif) {
    // Rol yok (henüz seçilmedi ya da Çıkış yapıldı) — üst çubukta rol alanı
    // hiç görünmez; ekranı giriş kapısı kaplar.
    nav.innerHTML = "";
    nav.classList.remove("tek-rol");
    return;
  }
  nav.classList.add("tek-rol");
  nav.innerHTML =
    '<div class="role-btn active" aria-current="page"><span class="r-label">' + escapeHtml(aktif.label) + '</span>' +
    '<span class="r-hint">' + escapeHtml(aktif.hint) + '</span>' +
    (badges[aktif.id] ? '<span class="badge">' + badges[aktif.id] + '</span>' : "") + '</div>' +
    /* id DEĞİL class: bu düğme tek örnek olsa da projede daha önce iki panelin
       aynı id'yi üretmesinden kaynaklı ölü düğme hatası yaşandı (§32). Aynı
       tuzağa düşmemek için bağlama querySelectorAll ile yapılır. */
    '<button type="button" class="btn btn-secondary btn-sm role-logout-btn" ' +
    'title="Rolden çık — üretilen sorular, sınavlar ve tüm veriler korunur">Çıkış</button>';

  document.querySelectorAll(".role-logout-btn").forEach(function (b) {
    b.onclick = rolCikisYap;
  });
}

/* ===========================================================================
   ÇIKIŞ — YALNIZCA ROL OTURUMU KAPANIR, ÜRÜN VERİSİ KORUNUR (§33)
   ===========================================================================
   Bu fonksiyon bir "sıfırlama" DEĞİLDİR. Sıfırlama zaten var ve ayrı bir
   düğme (btnReset). Buradaki tek iş: kullanıcıyı roldan çıkarıp giriş
   kapısına döndürmek.

   DOKUNULMAYANLAR (bilerek, tek tek): questions (üretilen/onaylanan/
   reddedilen sorular ve tüm alanları: status, outcome, sube, topicArea,
   bloomFocus, correctKey, distractorRationale, srcId), rubrics, reviews,
   aiEvals, mcResults, exams, exam, answers, flagged, students, sources,
   library, auditLog, outcomes, subjects, syncRoom ve diğer sync durumu,
   activeTeacherName (hangi öğretmenin değerlendirdiği bir ÜRÜN bilgisidir,
   state.exam.teacherName ile eşleşir), ceForm'un içeriği (yüklenmiş kaynak
   metin, sayaçlar, seçili kazanım — bunlar yarım kalmış İŞTİR).

   localStorage.clear(), IndexedDB silme, D1 silme YOKTUR. saveState() bu
   fonksiyondan sonra renderAll içinde normal akışında çalışır ve korunan
   alanları aynen geri yazar. */
function rolCikisYap() {
  // 1) Rol ve sekme konumu — saf navigasyon.
  state.role = "";
  state.ceTab = 1;
  state.teacherTab = 1;
  state.studentTab = 1;
  // 2) Yalnızca bu oturuma ait AÇ/KAPA ve seçim durumları.
  state.rejectedOpenByRole = { ce: false, teacher: false };
  state.critDescOpen = null;
  state.rubricSelectedQ = null;
  // 3) Geçici hata/uyarı metinleri — bir sonraki girişte eski hata görünmesin.
  state.poolError = "";
  state.rubricError = "";
  if (state.ceForm) state.ceForm.error = "";

  renderAll();       // saveState() burada çalışır: ürün verisi aynen kaydedilir
  girisKapisiniAc(); // en baştaki Mihenk ekranı (1. aşama)
}
/* ===========================================================================
   GİRİŞ KAPISI (public/index.html #girisKapisi) — YALNIZCA GÖRSEL KATMAN
   ===========================================================================
   İki aşamalı karşılama: (1) logo + slogan + giriş düğmesi, (2) kırmızı şerit
   altında 3+2 düzeninde panel seçim kartları.

   YÖNLENDİRME MANTIĞI DEĞİŞMEDİ: kartlar ROLES dizisinden üretilir ve tıklama,
   üst çubuktaki mevcut rol düğmesiyle BİREBİR aynı iki satırı çalıştırır
   (bkz. renderRoleNav):
       state.role = <id>;  renderAll();
   Yeni bir kimlik doğrulama, yetki kontrolü ya da yönlendirme kuralı YOKTUR;
   bu katman kapandıktan sonra uygulama eskisi gibi davranır ve üst çubuktaki
   rol düğmeleri çalışmaya devam eder.

   KALICI DEĞİLDİR: kapının açık/kapalı durumu localStorage'a yazılmaz, yani
   kayıtlı durum şeması (KALICI_ALANLAR) hiç değişmedi. Sayfa her açıldığında
   karşılama ekranı görünür. */

/** Panel seçim kartlarının HTML'i — kaynak ROLES, sıra da oradan gelir
 *  (üst sıra: İçerik Uzmanı, Öğretmen, Öğrenci · alt sıra: Eğitim Yöneticisi,
 *  Veli). Böylece rol eklenir/çıkarılırsa kartlar kendiliğinden uyar. */
function girisKapisiKartlariHtml() {
  /* Altın sarısı ÇİZGİ ikonlar. Dolgu yok; renk ve kalınlık CSS'ten gelir
     (.gk-ikon svg *), bu yüzden burada yalnızca geometri var. */
  const ikonlar = {
    content_expert: '<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h4"/>',
    teacher:        '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8.5 20h7"/><path d="M8 10.5l2.5 2.5L16 8"/>',
    student:        '<path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M6.5 10.5V15c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.5"/><path d="M21 8.5V14"/>',
    admin:          '<path d="M4 20h16"/><rect x="5.5" y="12" width="3.5" height="6"/><rect x="10.5" y="8" width="3.5" height="10"/><rect x="15.5" y="4.5" width="3.5" height="13.5"/>',
    parent:         '<circle cx="8.5" cy="7.5" r="3"/><circle cx="16.5" cy="9" r="2.2"/><path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M15 19c0-2.2 1.3-3.7 3-3.7s3 1.5 3 3.7"/>'
  };
  return ROLES.map(function (r) {
    return '<button class="gk-kart" type="button" data-role="' + r.id + '">' +
      '<span class="gk-ikon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (ikonlar[r.id] || "") + '</svg></span>' +
      '<span class="gk-kart-ad">' + escapeHtml(r.label) + '</span>' +
      '<span class="gk-kart-not">' + escapeHtml(r.hint) + '</span>' +
      '<span class="gk-kart-alt" aria-hidden="true">→</span>' +
      '</button>';
  }).join("");
}

/** Giriş kapısını kurar: kartları basar, iki aşama geçişini ve kart
 *  tıklamalarını bağlar. Açılışta bir kez çağrılır. */
function girisKapisiKur() {
  const kapi = document.getElementById("girisKapisi");
  if (!kapi) return;   // kapı HTML'den kaldırılırsa uygulama eskisi gibi açılır

  const kartlar = document.getElementById("gkKartlar");
  if (kartlar) kartlar.innerHTML = girisKapisiKartlariHtml();

  /* Kapı açıkken ARKADAKİ uygulama kaydırılmasın. Kapı position:fixed
     olduğu için kaydırma onu oynatmıyordu ama sağda işlevsiz bir kaydırma
     çubuğu duruyordu (ölçüldü: 860 px pencerede sayfa 1472 px). Kapının
     kendi içeriği uzarsa o kendi içinde kayar (overflow-y: auto). */
  document.body.style.overflow = "hidden";

  const asama2 = document.getElementById("gkAsama2");
  const girisBtn = document.getElementById("gkGirisBtn");
  if (girisBtn) girisBtn.onclick = function () {
    if (asama2) {
      asama2.hidden = false;
      /* Yeniden akış (reflow) ZORUNLU: hidden kalkar kalkmaz data-asama
         değişirse tarayıcı iki durumu tek karede hesaplar ve geçiş hiç
         oynamaz. Bu satır başlangıç durumunun hesaplanmasını garantiler. */
      void kapi.offsetWidth;
    }
    kapi.dataset.asama = "2";
    /* Odağı ilk karta taşı: klavye kullanıcısı geçişten sonra doğrudan
       seçim yapabilsin. Geçiş süresi kadar beklenir. */
    const ilkKart = kapi.querySelector(".gk-kart");
    if (ilkKart) setTimeout(function () { ilkKart.focus(); }, 700);
  };

  kapi.querySelectorAll(".gk-kart").forEach(function (k) {
    k.onclick = function () {
      /* Üst çubuktaki rol düğmesiyle BİREBİR aynı iki satır. */
      state.role = k.dataset.role;
      renderAll();
      kapi.hidden = true;
      document.body.style.overflow = "";   // uygulamanın kaydırması geri gelsin
    };
  });
}

/* §33 — Giriş kapısını 1. AŞAMADAN yeniden açar (Çıkış sonrası).
   Kartların HTML'i ve tıklama dinleyicileri girisKapisiKur() içinde BİR KEZ
   kuruldu ve DOM'da duruyor; burada yeniden üretilmez, yoksa dinleyiciler
   düşer ve kartlar ölür. Yalnızca görünürlük/aşama durumu geri alınır —
   animasyonun kendisi ve zamanlaması değişmez, ilk açılıştakiyle aynı
   CSS geçişi yeniden oynar. */
function girisKapisiniAc() {
  const kapi = document.getElementById("girisKapisi");
  if (!kapi) return;
  const asama2 = document.getElementById("gkAsama2");
  if (asama2) asama2.hidden = true;
  kapi.dataset.asama = "1";
  kapi.hidden = false;
  kapi.scrollTop = 0;
  document.body.style.overflow = "hidden";   // arkadaki uygulama kaymasın
  const girisBtn = document.getElementById("gkGirisBtn");
  if (girisBtn) girisBtn.focus();            // klavye kullanıcısı akışa devam etsin
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

/* ===========================================================================
   ERİŞİLEBİLİRLİK — label/input otomatik bağlama
   ===========================================================================
   BULGU (§10h, §14): Arayüz genelinde
   <div class="field"><label>Başlık</label><input id="ceTitle"></div>
   kalıbı kullanılıyor. label'da `for`, kimi yerde input'ta `id` yoktu; ekran
   okuyucu ikisini BAĞLAMIYOR ve alanı "etiketsiz giriş" olarak okuyordu.
   Ölçüldü: 14 label/input çiftinin 14'ü bağlı değildi.

   NEDEN ELLE DEĞİL BURADAN: Kalıp onlarca yerde tekrarlanıyor; her birini
   elle düzenlemek 176 KB'lık dosyada regresyon riski demekti (bu projede
   daha önce blok sınırı hatası yaşandı — §5). Bunun yerine render sonrası
   tek geçiş: bağlanmamış her label kendi kapsayıcısındaki kontrole
   bağlanır, gerekirse kontrole id üretilir.

   İKİ KORUMA:
   - Dosya (type=file) ve gizli girişler ATLANIR: "Ders notu" etiketi gizli
     dosya seçiciye değil, metin alanına işaret etmelidir.
   - Kapsayıcıda textarea varsa o tercih edilir (aynı gerekçe).
   =========================================================================== */
var _autoLabelSeq = 0;

function bindFieldLabels(kok) {
  const kap = kok || document;
  kap.querySelectorAll("label:not([for])").forEach(function (lbl) {
    // Kontrolü saran label'lar zaten erişilebilir; dokunma.
    if (lbl.querySelector("input, select, textarea")) return;
    const sahne = lbl.parentElement;
    if (!sahne) return;
    const adaylar = Array.prototype.slice
      .call(sahne.querySelectorAll("input, select, textarea"))
      .filter(function (c) { return c.type !== "hidden" && c.type !== "file"; });
    if (!adaylar.length) return;
    const textarea = adaylar.filter(function (c) { return c.tagName === "TEXTAREA"; })[0];
    const hedef = textarea || adaylar[0];
    if (!hedef.id) hedef.id = "auto_lbl_" + (++_autoLabelSeq);
    lbl.setAttribute("for", hedef.id);
  });
}

/**
 * Depolama uyarısı şeridi. Kasten gövdeye eklenir ve konumu sabittir:
 * hangi rol/sekme açık olursa olsun görünmelidir (§6.3-2: kapsayıcıya
 * bağlı tanım yapma dersi).
 */
function renderDepoUyarisi() {
  var el = document.getElementById("depoUyari");
  if (!depoHatasi) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "depoUyari";
    el.className = "depo-uyari";
    el.setAttribute("role", "alert");
    document.body.appendChild(el);
  }
  el.textContent = "⚠ " + depoHatasi;
}

function renderAll() {
  renderAiBadge();
  syncActiveExam();
  saveState();
  renderDepoUyarisi();
  renderRoleNav();
  renderPipeline();
  renderDemoSerit();   // §38 — demo kapalıyken boş dize yazar
  renderContentExpert();
  renderTeacher();
  renderStudent();
  renderAdmin();
  renderParent();
  renderSyncChip();
  document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + state.role); });
  // Render sonrası tek geçiş: etiketleri kontrollere bağla (erişilebilirlik).
  bindFieldLabels();
}
function initPanels() {
  document.getElementById("panels").innerHTML = ROLES.map(function (r) { return '<section class="panel" id="panel-' + r.id + '"></section>'; }).join("");
}

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
  /* ============ BEKLEYEN SINAV SAYAÇLARI (§28a — ölçülmüş 4 kusur) ============
     Eski kod şunu yapıyordu:
       if (state.exam.status === "published" && state.examStatus === "not_started") {
         ... document.getElementById("waitPill") ... state.exam.startsAt ...
       }
     Dört ayrı kusuru vardı ve üçü birden canlıda ölçüldü:
       1) `state.examStatus === "not_started"` şartı — öğrenci BAŞKA bir sınavı
          bitirdiyse durum "graded"/"submitted" olur ve blok HİÇ çalışmazdı.
       2) Yinelenen `id="waitPill"` — birden çok sınav beklerken getElementById
          yalnızca ilk kartı buluyordu.
       3) Ticker yalnızca AKTİF sınava bakıyordu; listedeki diğer sınavların
          sayacı hiç güncellenmiyor, üstelik ilk karta aktif sınavın süresi
          yazılabiliyordu.
       4) `waitingFlag` tek bir globaldi; iki sınav beklerken biri açılınca
          bayrak düşüyor, ikincisinin açılışı hiç tetiklenmiyordu.
     Sonucu ölçüldü: açılış saati geçtiği hâlde sayaç donuyor ve öğrenci
     SAYFAYI ELLE YENİLEMEDEN sınava giremiyordu.

     Artık her bekleyen kart kendi `data-basla` damgasından hesaplanır; hangi
     sınavın aktif olduğu ya da aktif oturumun durumu hiç önemli değildir. */
  const acilanlar = [];
  document.querySelectorAll(".wait-pill").forEach(function (el) {
    const ts = Number(el.dataset.basla);
    if (!Number.isFinite(ts) || ts <= 0) return;
    if (Date.now() < ts) el.textContent = kalanMetni(ts);
    else acilanlar.push(el);
  });
  if (acilanlar.length) {
    /* renderAll() TÜM panelleri yeniden çizer — öğretmen paneli dahil. Bu yüzden
       biri bir alana yazarken çağrılamaz, odak kaybolur (§6.3-3). Yazma bitene
       kadar erteliyoruz: ticker saniyede bir döndüğü için sınav en fazla birkaç
       saniye gecikmeyle açılır; odak kaybı bundan ağır bir hatadır. */
    const odak = document.activeElement;
    const yaziliyor = !!odak && (odak.tagName === "INPUT" || odak.tagName === "TEXTAREA" || odak.isContentEditable);
    if (!yaziliyor) renderAll();
  }
}, 1000);

/* ==================== RİSK LİSTESİ (§28g) ====================
   Yönetici paneli "ne kadar tamamlandı" ve "hangi kazanım zayıf" sorularını
   cevaplıyordu. Bir müdürün ilk sorduğu soru ise bu değil:
   "HANGİ ÖĞRENCİLER RİSK ALTINDA?"

   ÖLÇÜT — ABC çerçevesi (eğitimde erken uyarı sistemlerinin uluslararası
   standardı): Attendance (devam), Behavior (davranış), Course performance
   (ders başarısı). Literatürdeki tavsiye ÜÇ GÖSTERGEYLE BAŞLA, karmaşıklığı
   sonra ekle. Üçünün buradaki karşılıkları:
     · Devam   -> atanan sınavın kaçına hiç girmemiş
     · Davranış-> sınav bütünlüğü sinyali (§28e ile aynı veri)
     · Başarı  -> onaylanmış sınavlardaki ortalama yüzde

   🔴 DÜRÜSTLÜK SINIRI: Bu bir TAHMİN DEĞİL, bir ÖZETTİR. Sistem "bu öğrenci
   başarısız olacak" demez; yalnızca elindeki üç ölçütü tek yerde toplar.
   Karar ve müdahale insanındır — ürünün her yerindeki kural burada da geçerli. */
const RISK_ESIK_BASARI = 50;     // onaylı sınav ortalaması bu yüzdenin altındaysa
const RISK_ESIK_GIRMEME = 1;     // en az bu kadar sınava hiç girmemişse

function riskOgrencileri() {
  const yayindaki = (state.exams || []).filter(function (kayit) {
    const ex = kayit.id === state.activeExamId ? state.exam : kayit;
    return ex.status === "published";
  });
  if (!yayindaki.length) return [];

  return (state.students || []).map(function (ogr) {
    let toplamPuan = 0, toplamTam = 0, girmedi = 0, onayli = 0;
    yayindaki.forEach(function (kayit) {
      const ex = kayit.id === state.activeExamId ? state.exam : kayit;
      const o = kayit.id === state.activeExamId && String(ogr.id) === String(state.activeStudentId)
        ? (function () { const t = {}; OTURUM_ALANLARI.forEach(function (k) { t[k] = state[k]; }); return t; })()
        : ((kayit.sessions || {})[ogr.id] || null);
      const durum = (o && o.examStatus) || "not_started";
      if (durum === "not_started") { girmedi++; return; }
      if (durum !== "graded") return;
      onayli++;
      const sorular = (ex.questionIds || [])
        .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
        .filter(Boolean);
      const mcP = mcPuani(kayit);
      sorular.forEach(function (q) {
        if (q.type === "mc") {
          const r = (o.mcResults || {})[q.id];
          if (!r) return;
          toplamTam += mcP; toplamPuan += r.correct ? mcP : 0;
        } else {
          const rv = (o.reviews || {})[q.id];
          if (!rv) return;
          toplamTam += (state.rubrics[q.id] || {}).maxScore || 0;
          toplamPuan += Number(rv.finalScore) || 0;
        }
      });
    });

    const yuzde = toplamTam ? Math.round((toplamPuan / toplamTam) * 100) : null;
    const dikkat = dikkatOgrenciSinyali(ogr.id);
    const sebepler = [];
    if (yuzde != null && yuzde < RISK_ESIK_BASARI) sebepler.push({ tur: "basari", metin: "onaylı sınav ortalaması %" + yuzde });
    if (girmedi >= RISK_ESIK_GIRMEME) sebepler.push({ tur: "devam", metin: girmedi + " sınava hiç girmemiş" });
    if (dikkat) sebepler.push({ tur: "davranis", metin: dikkat.isaretli.length + " sınavda dikkat sinyali" + (dikkat.oruntu ? " (örüntü)" : "") });

    return {
      id: ogr.id, ad: ogr.name || ("#" + ogr.id), sinif: ogr.sinif || "",
      yuzde: yuzde, girmedi: girmedi, onayli: onayli,
      sebepler: sebepler, sayi: sebepler.length
    };
  }).filter(function (r) { return r.sayi > 0; })
    .sort(function (a, b) {
      if (b.sayi !== a.sayi) return b.sayi - a.sayi;                     // çok göstergeli önce
      return (a.yuzde == null ? 101 : a.yuzde) - (b.yuzde == null ? 101 : b.yuzde);
    });
}

function riskListesiHtml() {
  const liste = riskOgrencileri();
  const toplam = (state.students || []).length;
  if (!liste.length) {
    return '<div class="card"><div class="card-head"><h3>Risk Altındaki Öğrenciler</h3>' +
      '<span class="pill pill-success">işaret yok</span></div>' +
      '<div class="empty-state">Üç göstergenin (devam · davranış · başarı) hiçbirinde işaret oluşmadı. ' +
      'Sınavlar onaylandıkça bu liste dolar.</div></div>';
  }
  const etiket = { basari: "pill-critical", devam: "pill-warning", davranis: "pill-accent2" };
  return '<div class="card"><div class="card-head"><h3>Risk Altındaki Öğrenciler</h3>' +
    '<span class="pill pill-warning">' + liste.length + ' / ' + toplam + ' öğrenci</span></div>' +
    '<p class="lbl-hint" style="margin-top:0;">Uluslararası erken uyarı standardı olan <b>ABC</b> ' +
    'çerçevesine göre üç gösterge birlikte değerlendirilir: <b>devam</b> (girilmeyen sınav), ' +
    '<b>davranış</b> (sınav bütünlüğü sinyali) ve <b>başarı</b> (onaylı sınav ortalaması). ' +
    'Bu liste bir <b>tahmin değil, bir özettir</b>: sistem kimsenin başarısız olacağını söylemez, ' +
    'yalnızca elindeki üç ölçütü tek yerde toplar. <b>Karar ve müdahale sizindir.</b></p>' +
    liste.map(function (r) {
      return '<div class="pool-item"><div class="p-body"><b>' + escapeHtml(r.ad) + '</b>' +
        (r.sinif ? ' <span class="pill pill-neutral">' + escapeHtml(r.sinif) + '</span>' : "") +
        '<div class="p-tags">' + r.sebepler.map(function (s) {
          return '<span class="pill ' + etiket[s.tur] + '">' + escapeHtml(s.metin) + '</span>';
        }).join("") + '</div>' +
        '<div class="lbl-hint">' + (r.onayli ? r.onayli + " onaylı sınav" : "henüz onaylı sınavı yok") +
        (r.yuzde != null ? " · ortalama %" + r.yuzde : "") + '</div></div>' +
        '<span class="pill ' + (r.sayi >= 2 ? "pill-critical" : "pill-warning") + '">' +
        r.sayi + ' gösterge</span></div>';
    }).join("") +
    '<div class="lbl-hint" style="margin-top:10px;">İki ve üzeri göstergesi olan öğrenciler listenin ' +
    'başındadır; literatürdeki tavsiye, tek göstergeye değil <b>göstergelerin birikmesine</b> ' +
    'bakmaktır.</div></div>';
}

/* ==================== VELİ PANELİ (§28f) ====================
   Brief dört rol istiyor; beşincisi gerekçesiyle ekleniyor: veli, çocuğunun
   öğrenme durumunu en çok merak eden ve bugün en az bilgilendirilen taraftır.

   🔴 EN AĞIR HATA SINIFI: YANLIŞ VELİYE YANLIŞ ÇOCUĞUN VERİSİ.
   Bu yüzden panel bilinçli olarak DAR tutuldu:

   · YALNIZCA ONAYLANMIŞ sonuç görünür. Öğretmen "yayınla" demediyse veli
     hiçbir şey görmez — AI'ın ham puan önerisi veliye ASLA ulaşmaz.
     Bu, HITL zincirinin veliye kadar uzatılmış hâlidir (agents.md §1).
   · SINIF ORTALAMASI YOK, SIRALAMA YOK, BAŞKA ÖĞRENCİ YOK. Kullanıcının
     açık isteği; ayrıca bir çocuğun sınıftaki yerini veliye söylemek
     ölçme-değerlendirmenin amacı değildir.
   · Sınav bütünlüğü kaydı yalnızca ÖĞRETMEN ONAYLADIYSA görünür (§28e) ve
     suçlayıcı olmayan dille yazılır.
   · Kimlik doğrulama YOKTUR; çocuk seçimi simülasyondur ve ekranda öyle
     yazar. Gerçek eşleştirme Better Auth ile üretimde yapılacaktır. */

function veliCocugu() {
  const liste = state.students || [];
  if (!liste.length) return null;
  const bulunan = liste.find(function (o) { return String(o.id) === String(state.parentStudentId); });
  return bulunan || liste[0];
}

/** Velinin görebileceği sınavlar: YALNIZCA öğretmen onayından geçmiş olanlar. */
function veliSonuclari(sid) {
  const cikti = [];
  (state.exams || []).forEach(function (kayit) {
    const ex = kayit.id === state.activeExamId ? state.exam : kayit;
    if (ex.status !== "published") return;
    const o = kayit.id === state.activeExamId && String(sid) === String(state.activeStudentId)
      ? (function () { const t = {}; OTURUM_ALANLARI.forEach(function (k) { t[k] = state[k]; }); return t; })()
      : ((kayit.sessions || {})[sid] || null);
    // ONAY KAPISI: "graded" değilse veli göremez.
    if (!o || o.examStatus !== "graded") return;

    const sorular = (ex.questionIds || [])
      .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
      .filter(Boolean);
    const mcP = mcPuani(kayit);
    let puan = 0, tam = 0;
    const kazanimlar = {};
    sorular.forEach(function (q) {
      let alinan = null, azami = 0;
      if (q.type === "mc") {
        const r = (o.mcResults || {})[q.id];
        if (!r) return;                       // puanlanmamış soru toplama girmez
        azami = mcP; alinan = r.correct ? mcP : 0;
      } else {
        const rv = (o.reviews || {})[q.id];
        if (!rv) return;
        azami = (state.rubrics[q.id] || {}).maxScore || 0;
        alinan = Number(rv.finalScore) || 0;
      }
      puan += alinan; tam += azami;
      const kod = q.outcome || "—";
      if (!kazanimlar[kod]) kazanimlar[kod] = { alinan: 0, tam: 0 };
      kazanimlar[kod].alinan += alinan; kazanimlar[kod].tam += azami;
    });

    // Öğretmenin ONAYLADIĞI geri bildirimler (AI taslağı değil, nihai metin).
    const yorumlar = sorular.map(function (q) {
      const rv = (o.reviews || {})[q.id];
      return rv && rv.comment ? { soru: q.body, yorum: rv.comment } : null;
    }).filter(Boolean);

    cikti.push({
      examId: kayit.id, baslik: ex.title || "Adsız Sınav",
      puan: puan, tam: tam,
      yuzde: tam ? Math.round((puan / tam) * 100) : null,
      kazanimlar: kazanimlar, yorumlar: yorumlar
    });
  });
  return cikti;
}

function veliKazanimEtiketi(kod) {
  const o = OUTCOMES_LIST().find(function (x) { return x.code === kod; });
  return o && o.label ? o.label : kod;
}

function renderParent() {
  const root = document.getElementById("panel-parent");
  if (!root) return;
  const cocuk = veliCocugu();

  if (!cocuk) {
    // §35: veli panelinde sınıf kodu GİRİŞ formu gösterilmez (bkz. syncJoinHtml).
    root.innerHTML = bosDurumHtml("Henüz tanımlı bir öğrenci yok.", true);
    wireSyncJoin();
    return;
  }

  /* 🔴 "SİMÜLASYON" DİLİ KALDIRILDI (3 Eylül, üçüncü tur — kullanıcı: "simülasyon
     yazısı saçma onu kaldır"). Katlama korunuyor ama artık özür diler bir
     <details> değil; öğrenci tarafındaki `.student-picker` ile AYNI görünen
     sade bir seçicidir (§6.3-2 tutarlılığı). Diğer öğrencilerin adı yine de
     yalnızca bu seçicide görünür — sonuç kartlarında hiç geçmez. */
  const secici = '<div class="card"><div class="card-head"><h3>Veli Görünümü</h3></div>' +
    '<p class="lbl-hint" style="margin-top:0;">Burada yalnızca <b>öğretmenin onayladığı</b> sonuçlar ' +
    'görünür. Yapay zekânın ham puan önerileri veliye gösterilmez. ' +
    '<b>Diğer öğrencilerin bilgileri, sınıf ortalaması ve sıralama bu ekranda yer almaz.</b></p>' +
    ((state.students || []).length > 1
      ? '<div class="student-picker"><span class="sp-label">Görüntülenen veli</span>' +
        state.students.map(function (o) {
          return '<button class="sp-btn ' + (o.id === cocuk.id ? "active" : "") + '" data-vid="' + o.id + '">' +
            escapeHtml(o.name || ("#" + o.id)) + '</button>';
        }).join("") + '</div>' +
        '<div class="lbl-hint" style="margin-top:6px;">Gerçek sürümde veli yalnızca kendi hesabıyla ' +
        'giriş yapar ve bu seçici hiç görünmez.</div>'
      : "") + '</div>';

  const sonuclar = veliSonuclari(cocuk.id);
  if (!sonuclar.length) {
    // §35: veli panelinde sınıf kodu GİRİŞ formu gösterilmez (bkz. syncJoinHtml).
    root.innerHTML = secici + bosDurumHtml(
      escapeHtml(cocuk.name || "Öğrenci") + " için öğretmen onayından geçmiş bir sonuç henüz yok. " +
      "Öğretmen sonuçları yayınladığında burada görünecek.",
      true
    );
    wireParent();
    return;
  }

  // Kazanım bazlı güçlü/zayıf — TÜM onaylı sınavlar birleştirilir.
  const birlesik = {};
  sonuclar.forEach(function (s) {
    Object.keys(s.kazanimlar).forEach(function (k) {
      if (!birlesik[k]) birlesik[k] = { alinan: 0, tam: 0 };
      birlesik[k].alinan += s.kazanimlar[k].alinan;
      birlesik[k].tam += s.kazanimlar[k].tam;
    });
  });
  const kazanimSatirlari = Object.keys(birlesik).map(function (k) {
    const v = birlesik[k];
    return { kod: k, yuzde: v.tam ? Math.round((v.alinan / v.tam) * 100) : null };
  }).filter(function (x) { return x.yuzde != null; }).sort(function (a, b) { return b.yuzde - a.yuzde; });

  const onay = ensureDikkatOnay()[cocuk.id];

  root.innerHTML = secici +
    '<div class="card"><div class="card-head"><h3>' + escapeHtml(cocuk.name) + ' — Sonuçlar</h3>' +
    '<span class="pill pill-success">' + sonuclar.length + ' onaylı sınav</span></div>' +
    sonuclar.map(function (s) {
      return '<div class="report-row"><div class="rr-head"><span><b>' + escapeHtml(s.baslik) + '</b></span>' +
        '<span class="rr-score tabular">' + s.puan + ' / ' + s.tam +
        (s.yuzde != null ? ' &nbsp;(%' + s.yuzde + ')' : "") + '</span></div>' +
        (s.yorumlar.length
          ? '<div class="rr-answer"><div class="rr-answer-lbl">Öğretmenin notu</div>' +
            s.yorumlar.map(function (y) {
              return '<div class="rr-answer-txt">' + escapeHtml(y.yorum) + '</div>';
            }).join("") + '</div>'
          : "") +
        '</div>';
    }).join("") + '</div>' +

    '<div class="card"><div class="card-head"><h3>Kazanım Bazlı Durum</h3>' +
    '<span class="hint">güçlü ve gelişime açık alanlar</span></div>' +
    '<p class="lbl-hint" style="margin-top:0;">Yüzdeler <b>yalnızca çocuğunuzun kendi yanıtlarından</b> ' +
    'hesaplanır; sınıfla karşılaştırma içermez.</p>' +
    kazanimSatirlari.map(function (k) {
      const renk = k.yuzde >= 70 ? "pill-success" : (k.yuzde >= 50 ? "pill-warning" : "pill-critical");
      return '<div class="pool-item"><div class="p-body"><b>' + escapeHtml(veliKazanimEtiketi(k.kod)) + '</b>' +
        '<div class="lbl-hint">' + escapeHtml(k.kod) + '</div></div>' +
        '<span class="pill ' + renk + '">%' + k.yuzde + '</span></div>';
    }).join("") +
    '<div class="lbl-hint" style="margin-top:10px;">%70 üzeri güçlü, %50 altı üzerinde çalışılması ' +
    'önerilen alanlardır. Bu bir not değil, <b>yol göstericidir</b>.</div></div>' +

    (onay
      ? '<div class="card"><div class="card-head"><h3>Öğretmeninizden Bilgi</h3>' +
        '<span class="pill pill-warning">öğretmen onaylı</span></div>' +
        '<p>Çocuğunuz sınav sırasında <b>zorlanmış olabilir</b>. Öğretmeni, sizinle paylaşılmasında ' +
        'yarar gördüğü için bu bilgiyi iletti. Bu bir <b>disiplin bildirimi ya da kopya iddiası ' +
        'değildir</b>; sınav ortamında dikkatin dağıldığına dair bir kayıttır ve internet kesintisi ' +
        'gibi masum nedenlerle de oluşabilir. Ayrıntı için öğretmeniyle görüşebilirsiniz.</p>' +
        '<div class="lbl-hint">Bu bilgi otomatik gönderilmedi; ' + escapeHtml(auditZaman(onay.at)) +
        ' tarihinde <b>öğretmen kararıyla</b> paylaşıldı.</div></div>'
      : "");

  wireParent();
}

function wireParent() {
  document.querySelectorAll('[data-vid]').forEach(function (b) {
    b.onclick = function () { state.parentStudentId = Number(b.dataset.vid); saveState(); renderAll(); };
  });
  wireSyncJoin();
}

/* ==================== DİKKAT SİNYALİ (§28e) ====================
   Sınav bütünlüğü verisi (sekme değişimi, odak kaybı, tam ekrandan çıkış,
   yapıştırma, sınav dışında geçen süre) bugüne kadar yalnızca TEK SINAVIN
   ekranında duruyordu. İstenen: bunu bir uyarıya çevirmek.

   🔴 BU ÖZELLİK ÜRÜNÜN DURUŞUNU BOZABİLİRDİ — dört koruma konuldu:

   1. ÖNCE ÖĞRETMENE. Uyarı doğrudan veliye gitmez. Öğretmen bağlamı bilir:
      internet kesilmiş olabilir, telefon çalmış olabilir.
   2. VELİYE ANCAK ÖĞRETMEN ONAYLARSA. Bu, ürünün HITL deseninin birebir
      aynısıdır: sistem ÖNERİR, insan KARAR VERİR (agents.md §1).
   3. EŞİK TEK OLAYA DEĞİL ÖRÜNTÜYE BAKAR. Tek sınavdaki tek bir odak kaybı
      hiçbir şey ifade etmez. En az İKİ sınavda tekrarlamadıkça bu bir örüntü
      değildir ve ekranda da böyle yazar.
   4. DİL SUÇLAYICI DEĞİLDİR. "Dikkati dağınık" demez; "zorlanmış olabilir"
      der. Rehberlik önerisi ASLA otomatik yapılmaz.

   Ürün "hile önlemiyoruz, kayıt tutuyoruz" diyor. Otomatik bir uyarı bunu
   yaptırıma kaydırırdı; onay zinciri tam olarak bunu engelliyor. */

/** Tek bir sınav oturumunun bütünlük verisinden sinyal çıkar. */
function dikkatSinavSinyali(oturum, ex) {
  const g = (oturum && oturum.integrity) || null;
  if (!g) return null;
  const kesinti = (g.tabSwitch || 0) + (g.blur || 0) + (g.fsExit || 0);
  const sure = Math.max(1, (ex && ex.durationMin ? ex.durationMin : 10) * 60);
  const disariOran = Math.round(((g.awaySec || 0) / sure) * 100);
  // Eşikler: 5 kesinti ya da sürenin dörtte biri kadar dışarıda kalmak.
  const isaret = kesinti >= 5 || disariOran >= 25 || (g.pasteCount || 0) >= 1;
  return isaret ? { kesinti: kesinti, disariOran: disariOran, yapistirma: g.pasteCount || 0 } : null;
}

/** Bir öğrencinin TÜM sınavlarına bakıp örüntü var mı diye sorar. */
function dikkatOgrenciSinyali(sid) {
  const isaretli = [];
  let incelenen = 0;
  (state.exams || []).forEach(function (kayit) {
    const ex = kayit.id === state.activeExamId ? state.exam : kayit;
    if (ex.status !== "published") return;
    const o = kayit.id === state.activeExamId && String(sid) === String(state.activeStudentId)
      ? { integrity: state.integrity, examStatus: state.examStatus }
      : ((kayit.sessions || {})[sid] || null);
    if (!o || !o.examStatus || o.examStatus === "not_started") return;
    incelenen++;
    const s = dikkatSinavSinyali(o, ex);
    if (s) isaretli.push({ sinav: ex.title || "Adsız Sınav", detay: s });
  });
  if (!isaretli.length) return null;
  return {
    sid: sid,
    incelenen: incelenen,
    isaretli: isaretli,
    // ÖRÜNTÜ: en az iki sınavda tekrarlamalı. Tek sınav örüntü sayılmaz.
    oruntu: isaretli.length >= 2
  };
}

function dikkatSinyalleri() {
  return (state.students || [])
    .map(function (o) {
      const s = dikkatOgrenciSinyali(o.id);
      return s ? Object.assign(s, { ad: o.name || ("#" + o.id), sinif: o.sinif || "" }) : null;
    })
    .filter(Boolean);
}

function ensureDikkatOnay() {
  if (!state.dikkatOnay) state.dikkatOnay = {};
  return state.dikkatOnay;
}

/** Öğretmen "veliye bildirilsin" dedi — HITL onayı burada gerçekleşir. */
function dikkatVeliyeOnayla(sid) {
  const s = dikkatOgrenciSinyali(sid);
  if (!s) return false;
  if (!s.oruntu) {
    alert("Bu öğrenci için henüz bir örüntü oluşmadı (yalnızca 1 sınavda işaret var). " +
      "Tek sınavdaki bir kayıt, veliye bildirim için yeterli bir gerekçe değildir.");
    return false;
  }
  const onay = ensureDikkatOnay();
  onay[sid] = { at: Date.now(), sinavSayisi: s.isaretli.length, aktor: "Öğretmen" };
  auditKaydet("dikkat_veliye_bildirildi", { sid: sid, not: s.isaretli.length + " sinavda isaret" });
  saveState();
  renderAll();
  syncOtomatik();
  return true;
}

function dikkatOnayGeriAl(sid) {
  const onay = ensureDikkatOnay();
  delete onay[sid];
  saveState();
  renderAll();
  syncOtomatik();
  return true;
}

function dikkatPanelHtml() {
  const liste = dikkatSinyalleri();
  const onay = ensureDikkatOnay();
  if (!liste.length) {
    return '<div class="card"><div class="card-head"><h3>Dikkat Sinyali</h3>' +
      '<span class="pill pill-success">işaret yok</span></div>' +
      '<div class="empty-state">Sınavlarda dikkat çeken bir bütünlük kaydı oluşmadı.</div></div>';
  }
  return '<div class="card"><div class="card-head"><h3>Dikkat Sinyali</h3>' +
    '<span class="pill pill-warning">' + liste.length + ' öğrenci</span></div>' +
    '<p class="lbl-hint" style="margin-top:0;">Bu bir <b>kopya iddiası değildir</b>. Sınav sırasında ' +
    'sekme değişimi, odak kaybı ya da yapıştırma kaydedilen öğrenciler listelenir; bunlar internet ' +
    'kesintisi ya da gelen bir bildirim gibi masum nedenlerle de oluşabilir. ' +
    '<b>Karar sizindir</b> — sistem kimseye kendiliğinden haber vermez.</p>' +
    liste.map(function (s) {
      const o = onay[s.sid];
      return '<div class="pool-item"><div class="p-body"><b>' + escapeHtml(s.ad) + '</b>' +
        (s.sinif ? ' <span class="pill pill-neutral">' + escapeHtml(s.sinif) + '</span>' : "") +
        '<div class="p-tags">' +
        '<span class="pill ' + (s.oruntu ? "pill-warning" : "pill-neutral") + '">' +
        s.isaretli.length + ' / ' + s.incelenen + ' sınavda işaret</span>' +
        (s.oruntu ? '<span class="pill pill-accent2">örüntü</span>'
                  : '<span class="pill pill-neutral">tek sınav — örüntü sayılmaz</span>') +
        '</div>' +
        '<div class="lbl-hint">' + s.isaretli.map(function (i) {
          const d = i.detay;
          return escapeHtml(i.sinav) + ": " + d.kesinti + " kesinti" +
            (d.disariOran ? " · sürenin %" + d.disariOran + "’ı dışarıda" : "") +
            (d.yapistirma ? " · " + d.yapistirma + " yapıştırma" : "");
        }).join(" — ") + '</div>' +
        '<div class="lbl-hint" style="margin-top:4px;">Önerilen okuma: <i>bu öğrenci sınav sırasında ' +
        'zorlanmış olabilir.</i> Rehberlik görüşmesi <b>otomatik önerilmez</b>; gerekip gerekmediğine siz karar verirsiniz.</div>' +
        '</div>' +
        (o
          ? '<div><span class="pill pill-success">veliye bildirildi</span> ' +
            '<button class="btn btn-secondary btn-sm dikkat-geri" data-sid="' + s.sid + '">Geri al</button></div>'
          : '<button class="btn btn-secondary btn-sm dikkat-onay" data-sid="' + s.sid + '" ' +
            (s.oruntu ? "" : "disabled title=\"Örüntü oluşmadan veliye bildirim önerilmez\"") +
            '>Veliye bildirilsin</button>') +
        '</div>';
    }).join("") + '</div>';
}

function wireDikkat() {
  document.querySelectorAll(".dikkat-onay").forEach(function (b) {
    b.onclick = function () { dikkatVeliyeOnayla(Number(b.dataset.sid)); };
  });
  document.querySelectorAll(".dikkat-geri").forEach(function (b) {
    b.onclick = function () { dikkatOnayGeriAl(Number(b.dataset.sid)); };
  });
}

/* ==================== EXCEL / CSV DIŞA AKTARMA (§28d) ====================
   Okullar sonuçları Excel'de ister. Ürün bugüne kadar yalnızca Karar
   Günlüğü'nü dışa aktarabiliyordu; öğrenci ve sınıf değerlendirmeleri
   ekranda kalıyordu.

   NEDEN .xlsx DEĞİL DE CSV:
   Gerçek bir .xlsx üretmek ZIP + XML yazmayı gerektirir; bu ürün BUILD
   ADIMI OLMAYAN tek dosyalık vanilla JS'tir (§1.2) ve dışarıdan kütüphane
   yüklemek CSP'ye (`script-src 'self'`) takılır. CSV, Excel'in çift tıkla
   açtığı bir biçimdir. İki ayrıntı Türkçe Excel için ZORUNLUDUR ve karar
   günlüğü dışa aktarımında da aynen uygulanmıştı:
     · ayraç NOKTALI VİRGÜL — Türkçe Excel virgülü ondalık ayracı sayar
     · başta UTF-8 BOM — yoksa "ğ ş ı" bozuk görünür
   Ondalık sayılar da virgülle yazılır (12,5), Excel bunu sayı olarak okur. */

/** CSV hücresi kaçışı — auditCsv() ile aynı kural. */
function csvHucre(h) {
  h = String(h == null ? "" : h);
  return /[";\n]/.test(h) ? '"' + h.replace(/"/g, '""') + '"' : h;
}

/** Sayıyı Türkçe Excel'in SAYI olarak okuyacağı biçime çevir. */
function csvSayi(n) {
  if (n == null || n === "" || !Number.isFinite(Number(n))) return "";
  return String(Math.round(Number(n) * 100) / 100).replace(".", ",");
}

function csvSatirlar(basliklar, satirlar) {
  return "﻿" + basliklar.map(csvHucre).join(";") + "\n" +
    satirlar.map(function (r) { return r.map(csvHucre).join(";"); }).join("\n");
}

/** Dosya adında tarih: aynı sınıfın iki farklı günkü raporu karışmasın. */
function disaAktarimAdi(on) {
  const d = new Date();
  return on + "-" + yerelDamga(d).replace("T", "-").replace(":", "") + ".csv";
}

/**
 * ÖĞRENCİ BAZLI: her öğrencinin her sorudaki durumu, tek satır tek yanıt.
 * Sınav puanı, yapay zekâ önerisi ve öğretmenin nihai kararı yan yana durur —
 * bu, ürünün HITL tezinin tablo hâlidir.
 */
function ogrenciCsv() {
  const kayit = (state.exams || []).find(function (x) { return x.id === state.activeExamId; });
  if (!kayit) return null;
  const ex = kayit.id === state.activeExamId ? state.exam : kayit;
  const sorular = (ex.questionIds || [])
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(Boolean);
  const mcP = mcPuani(kayit);

  const basliklar = ["sinav", "ogrenci", "sinif", "soru_no", "soru_turu", "kazanim",
    "soru", "ogrenci_yaniti", "dogru_sik", "isaretlenen_sik",
    "ai_onerisi", "ogretmen_puani", "tam_puan", "ogretmen_degistirdi_mi", "ogretmen_yorumu", "durum"];

  const satirlar = [];
  (state.students || []).forEach(function (ogr) {
    const ss = readSession(ogr.id);
    if (!ss || ss.examStatus === "not_started") return;   // çözmeyen öğrenci satır açmaz
    sorular.forEach(function (q, i) {
      const yanit = (ss.answers || {})[q.id] || {};
      const mc = (ss.mcResults || {})[q.id];
      const ai = (ss.aiEvals || {})[q.id];
      const rv = (ss.reviews || {})[q.id];
      const tam = q.type === "mc" ? mcP : ((state.rubrics[q.id] || {}).maxScore || 0);
      /* ÇSS puanı ancak finishExam() çalışınca hesaplanır (mcResults). Sınav
         hâlâ çözülüyorsa puan HENÜZ YOKTUR; buraya 0 yazmak, doğru işaretlemiş
         bir öğrenciyi sıfır almış gibi gösterirdi — yanlış beyan (§17a-3).
         Puanlanmamış yanıt boş bırakılır. */
      const nihai = q.type === "mc" ? (mc ? (mc.correct ? mcP : 0) : null) : (rv ? rv.finalScore : null);
      const sik = q.type === "mc" && yanit.selectedKey ? yanit.selectedKey : "";
      satirlar.push([
        ex.title || "Adsız Sınav", ogr.name || ("#" + ogr.id), ogr.sinif || "",
        i + 1, q.type === "mc" ? "çoktan seçmeli" : "açık uçlu", q.outcome || "",
        q.body || "",
        q.type === "mc" ? "" : (yanit.text || ""),
        q.type === "mc" ? (q.correctKey || "") : "",
        sik,
        q.type === "mc" ? "" : csvSayi(ai ? ai.aiScore : null),
        csvSayi(nihai), csvSayi(tam),
        q.type === "mc" || !rv || !ai ? "" :
          (Math.abs(Number(rv.finalScore) - Number(ai.aiScore)) > 0.001 ? "evet" : "hayır"),
        rv ? (rv.comment || "") : "",
        ss.examStatus || ""
      ]);
    });
  });
  return { csv: csvSatirlar(basliklar, satirlar), satir: satirlar.length };
}

/**
 * SINIF/KAZANIM BAZLI: ısı haritasının tablo hâli. Zümre toplantısında ve
 * veli bilgilendirmesinde istenen şey budur.
 * "(örnek)" satırları DIŞARIDA BIRAKILIR: demo verisi bir okul raporuna
 * karışmamalıdır (§6.3-5 — simüle veri kendini belli eder, rapora girmez).
 */
function sinifCsv() {
  const satirlarKaynak = realClassRows();
  const kazanimlar = OUTCOMES_LIST();
  const basliklar = ["sinif", "kazanim_kodu", "kazanim", "basari_yuzdesi"];
  const satirlar = [];
  satirlarKaynak.forEach(function (sf) {
    kazanimlar.forEach(function (o) {
      const v = (sf.scores || {})[o.code];
      if (v == null) return;
      satirlar.push([sf.name, o.code, o.label || "", csvSayi(v)]);
    });
  });
  return { csv: csvSatirlar(basliklar, satirlar), satir: satirlar.length };
}

function disaAktarHtml() {
  return '<div class="card"><div class="card-head"><h3>Dışa Aktarma</h3>' +
    '<span class="hint">Excel ile açılır</span></div>' +
    '<p class="lbl-hint" style="margin-top:0;">Değerlendirmeleri okul kayıtlarına ya da zümre toplantısına ' +
    'taşımak için indirin. Dosyalar <b>noktalı virgül ayraçlı CSV</b>\'dir ve Excel\'de çift tıkla açılır; ' +
    'Türkçe karakterler için UTF-8 damgası eklenir.</p>' +
    '<button class="btn btn-secondary btn-sm" id="btnCsvOgrenci">Öğrenci bazlı sonuçlar</button> ' +
    '<button class="btn btn-secondary btn-sm" id="btnCsvSinif">Sınıf · kazanım başarısı</button>' +
    '<div class="lbl-hint" style="margin-top:8px;">Öğrenci dosyası <b>ad-soyad içerir</b> ve doğrudan bu ' +
    'cihaza iner; sunucuya gönderilmez. Sınıf dosyasına <b>"(örnek)" demo satırları dahil edilmez</b>.</div>' +
    '<div id="csvNot" class="lbl-hint" style="margin-top:6px;"></div></div>';
}

function wireDisaAktar() {
  const not = function (m) { const e = document.getElementById("csvNot"); if (e) e.textContent = m; };
  const o = document.getElementById("btnCsvOgrenci");
  if (o) o.onclick = function () {
    const r = ogrenciCsv();
    if (!r) { not("Aktif sınav bulunamadı."); return; }
    if (!r.satir) { not("Henüz sınavı çözen öğrenci yok — dosya boş olurdu, indirilmedi."); return; }
    auditIndir(r.csv, disaAktarimAdi("ogrenci-sonuclari"), "text/csv;charset=utf-8");
    not(r.satir + " satır indirildi.");
  };
  const s = document.getElementById("btnCsvSinif");
  if (s) s.onclick = function () {
    const r = sinifCsv();
    if (!r.satir) { not("Gerçek sınıf verisi yok — dosya boş olurdu, indirilmedi."); return; }
    auditIndir(r.csv, disaAktarimAdi("sinif-kazanim"), "text/csv;charset=utf-8");
    not(r.satir + " satır indirildi.");
  };
}

/* ==================== CİHAZLAR ARASI SENKRON (§28b, §28p) ====================
   3 Eylül'e kadar tüm veri `localStorage` + IndexedDB'deydi; her tarayıcı kendi
   verisini görüyordu ve ÖĞRENCİNİN ÇÖZDÜĞÜ SINAV ÖĞRETMENİN PANELİNE DÜŞMÜYORDU.
   Bu modül o köprüyü kurar.

   TASARIM KARARI — `renderAll()` SENKRON KALIR.
   Uygulamanın tamamı senkron HTML dizesi üretir (§3.1). Okuma yollarını
   asenkrona çevirmek `app.js`'in tamamına dokunurdu. Bunun yerine D1 bir
   ÖNBELLEK DEĞİL, BİR KÖPRÜDÜR: veri çekilir, `state`e yazılır, sonra bir kez
   `renderAll()` çağrılır. Çizim kaynağı hâlâ `state`tir.

   BU BİR KİMLİK DOĞRULAMA DEĞİLDİR ve arayüzde de öyle yazar.

   🔴 §28p — ARAYÜZ YENİDEN TASARLANDI (3 Eylül, ikinci tur).
   İlk sürüm tek bir geniş şerit olarak üst çubukta duruyordu ve HER ROLDE
   görünüyordu — İçerik Uzmanı hiç kullanmadığı bir kavramla karşılaşıyordu.
   Kullanıcının kendi ifadesiyle: "ne işe yaradığını bile bilmiyorum." Kök
   sebep arayüz değil YERLEŞİMDİ: kavram yalnızca İKİ anda anlamlıdır —
   öğretmen bir sınavı paylaşırken, öğrenci/veli bir koda girerken. Onun
   dışında her yerde gürültüdür. Çözüm dört parçaya bölündü:
     · syncChipHtml()      — topbar, YALNIZCA bir koda bağlıyken görünür
     · syncShareLineHtml() — öğretmenin sınav listesi kartında, bağlamsal
     · syncJoinHtml()      — öğrenci/veli boş ekranında, bağlamsal; §28s'den
       beri bosDurumHtml() içinde, boş durum mesajıyla TEK kutuda
     · otomatik eşitleme   — Gönder/Yenile düğmelerini gündelik kullanımdan
       kaldırır; kalan tek elle kontrol topbar çipinin altındadır. */

/* Karışan karakterler (0/O, 1/I) bilinçli olarak dışarıda: kod sesli okunup
   elle yazılacak. Sunucudaki ROOM_RE ile aynı kümedir. */
const ODA_ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ODA_KOD_DESENI = /^[A-HJ-NP-Z2-9]{4,12}$/;

function syncOdaUret() {
  let k = "";
  const rnd = new Uint32Array(6);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < 6; i++) k += ODA_ALFABE[rnd[i] % ODA_ALFABE.length];
  return k;
}

/** Çalışma zamanı senkron durumu. KALICI DEĞİLDİR — yalnızca `syncRoom` kalıcıdır. */
function syncDurum() {
  if (!state.sync) state.sync = { ready: null, busy: false, mesaj: "", sonGonderim: null, sonCekim: null, hata: "" };
  return state.sync;
}

/** Sunucuda D1 bağlı mı? Bağlı değilse arayüz "kapalı" yazar (§6.3-5). */
async function syncProbe() {
  const s = syncDurum();
  try {
    const r = await fetch("/api/sync/status", { cache: "no-store" });
    const j = await r.json();
    s.ready = !!j.ready;
  } catch (e) {
    s.ready = false;
  }
  renderAll();
  return s.ready;
}

/** Bu cihazın gönderebileceği her şeyi tek bir gövdede topla. */
function syncPaket() {
  syncActiveExam();
  const kayit = (state.exams || []).find(function (x) { return x.id === state.activeExamId; });
  if (!kayit) return null;

  /* Sınav gövdesi SORULARI DA TAŞIR. Başka bir cihazdaki öğrencinin sınavı
     çözebilmesi için soru metinleri, şıkları ve uyaran metinleri gerekir;
     yalnızca sınav kaydını göndermek öğrenciye BOŞ bir sınav gösterirdi. */
  const sorular = (kayit.questionIds || [])
    .map(function (id) { return state.questions.find(function (q) { return q.id === id; }); })
    .filter(Boolean);
  const rubrikler = {};
  sorular.forEach(function (q) { if (state.rubrics[q.id]) rubrikler[q.id] = state.rubrics[q.id]; });
  const kaynaklar = (state.sources || []).filter(function (k) {
    return sorular.some(function (q) { return q.srcId === k.id; });
  });

  const sinav = {
    examId: kayit.id,
    title: String(kayit.title || "Adsız Sınav").slice(0, 200),
    payload: JSON.stringify({
      exam: {
        title: kayit.title, questionIds: kayit.questionIds, timeOverrides: kayit.timeOverrides,
        status: kayit.status, durationMin: kayit.durationMin, startMode: kayit.startMode,
        startAtLocal: kayit.startAtLocal, startsAt: kayit.startsAt, mcPoint: mcPuani(kayit),
        targetClass: kayit.targetClass || ""
      },
      questions: sorular, rubrics: rubrikler, sources: kaynaklar,
      /* 🔴 `sinif` BURADA EKSİKTİ (§28q'da bulundu). Sonucu ölçüldü: başka
         cihazdan katılınca öğrenci sınıf etiketi kayboluyordu ("Ali Veli
         (undefined)"). Öğretmenin §28q'da eklediği "kendi eliyle sınıf kur"
         özelliği bu alan olmadan cihazlar arasında anlamsızlaşırdı. */
      students: (state.students || []).map(function (o) { return { id: o.id, name: o.name, sinif: o.sinif || "", demo: !!o.demo }; })
    })
  };

  const ss = examSessions(kayit);
  /* §36 — İKİNCİ KATMAN: kayıtta zaten bozuk bir anahtar varsa (eski
     verilerde olabilir) onu göndermeyiz. Sessizce atmak yerine burada
     ELENİR ve senkron çalışmaya devam eder; tek bir bozuk anahtar yüzünden
     tüm sınıfın verisi gitmemelidir. Anahtar temizliği için ayrıca
     syncActiveExam() içindeki koruma var. */
  const oturumlar = Object.keys(ss).filter(function (sid) {
    return Number.isFinite(Number(sid));
  }).map(function (sid) {
    const o = ss[sid] || {};
    const ogr = (state.students || []).find(function (x) { return String(x.id) === String(sid); });
    return {
      examId: kayit.id,
      studentId: Number(sid),
      studentName: String((ogr && ogr.name) || "").slice(0, 120),
      status: o.examStatus || "not_started",
      payload: JSON.stringify(o)
    };
  }).slice(0, 60);

  return { room: state.syncRoom, exam: sinav, sessions: oturumlar };
}

async function syncGonder() {
  const s = syncDurum();
  if (!state.syncRoom) { s.hata = "Önce bir sınıf kodu oluşturun ya da girin."; renderAll(); return false; }
  const paket = syncPaket();
  if (!paket) { s.hata = "Gönderilecek sınav yok."; renderAll(); return false; }
  s.busy = true; s.hata = ""; renderAll();
  try {
    const r = await fetch("/api/sync/push", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(paket)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Gönderilemedi");
    s.sonGonderim = Date.now();
    s.mesaj = j.sessions + " oturum gönderildi";
  } catch (e) {
    // SESSİZ GERİ DÜŞÜŞ YASAĞI (§6.3-5): başarısızlık ekranda yazar.
    s.hata = (e && e.message) || "Sunucuya yazılamadı";
  }
  s.busy = false; renderAll();
  return !s.hata;
}

async function syncCek() {
  const s = syncDurum();
  if (!state.syncRoom) { s.hata = "Önce bir sınıf kodu oluşturun ya da girin."; renderAll(); return false; }
  s.busy = true; s.hata = ""; renderAll();
  try {
    const r = await fetch("/api/sync/pull", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ room: state.syncRoom })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Okunamadı");
    const say = syncBirlestir(j);
    s.sonCekim = Date.now();
    s.mesaj = say.sinav + " sınav · " + say.oturum + " oturum alındı";
  } catch (e) {
    s.hata = (e && e.message) || "Sunucudan okunamadı";
  }
  s.busy = false;
  renderAll();
  return !s.hata;
}

/**
 * Sunucudan geleni yerel duruma karıştır.
 *
 * 🔴 EN KRİTİK KURAL: ŞU AN ÇÖZÜLMEKTE OLAN OTURUM EZİLMEZ.
 * Öğrenci sınavı yazarken bir çekme işlemi yapılırsa, sunucudaki eski kopya
 * öğrencinin yazdıklarının üstüne binerdi — veri kaybı, üstelik sessiz.
 * Aktif öğrencinin `in_progress` oturumu bu yüzden korunur.
 */
function syncBirlestir(veri) {
  let sinavSay = 0, oturumSay = 0;

  (veri.exams || []).forEach(function (satir) {
    let govde;
    try { govde = JSON.parse(satir.payload); } catch (e) { return; }
    if (!govde || !govde.exam) return;

    // Sorular, rubrikler ve kaynaklar yerelde yoksa eklenir (kimlikler korunur).
    (govde.questions || []).forEach(function (q) {
      if (!state.questions.some(function (x) { return x.id === q.id; })) {
        state.questions.push(q);
        if (q.id >= qIdSeq) qIdSeq = q.id + 1;
      }
    });
    Object.keys(govde.rubrics || {}).forEach(function (qid) {
      if (!state.rubrics[qid]) state.rubrics[qid] = govde.rubrics[qid];
    });
    (govde.sources || []).forEach(function (k) {
      if (!(state.sources || []).some(function (x) { return x.id === k.id; })) state.sources.push(k);
    });
    /* §28r Madde 2 — ESKİDEN yalnızca YOKSA ekleniyordu; öğrencinin adı ya da
       sınıfı SONRADAN değiştirilirse bu değişiklik diğer cihazlara hiç
       yayılmıyordu. Artık var olan kayıt da güncellenir ("son gönderen
       kazanır" — sınav/oturum verilerinin tamamı zaten aynı kuralla
       çalışıyor, agents.md kimlik doğrulama olmadığı için çakışma çözümü
       burada da basit tutuldu). */
    (govde.students || []).forEach(function (o) {
      var mevcut = (state.students || []).find(function (x) { return x.id === o.id; });
      if (!mevcut) { state.students.push(o); return; }
      mevcut.name = o.name;
      mevcut.sinif = o.sinif;
      mevcut.demo = !!o.demo;
    });

    let kayit = state.exams.find(function (x) { return x.id === satir.exam_id; });
    if (!kayit) {
      kayit = { id: satir.exam_id, sessions: {} };
      state.exams.push(kayit);
      if (satir.exam_id >= examIdSeq) examIdSeq = satir.exam_id + 1;
    }
    Object.keys(govde.exam).forEach(function (k) { kayit[k] = govde.exam[k]; });
    if (kayit.id === state.activeExamId) {
      Object.keys(govde.exam).forEach(function (k) { state.exam[k] = govde.exam[k]; });
    }
    sinavSay++;
  });

  (veri.sessions || []).forEach(function (satir) {
    let o;
    try { o = JSON.parse(satir.payload); } catch (e) { return; }
    const kayit = state.exams.find(function (x) { return x.id === satir.exam_id; });
    if (!kayit) return;

    const aktifOturum = kayit.id === state.activeExamId && String(satir.student_id) === String(state.activeStudentId);
    if (aktifOturum && state.examStatus === "in_progress") return;   // çözülmekte — DOKUNMA

    const ss = examSessions(kayit);
    ss[satir.student_id] = o;
    if (aktifOturum) {
      OTURUM_ALANLARI.forEach(function (k) { state[k] = o[k] !== undefined ? o[k] : bosOturum()[k]; });
    }
    oturumSay++;
  });

  saveState();
  return { sinav: sinavSay, oturum: oturumSay };
}

async function syncSil() {
  const s = syncDurum();
  if (!state.syncRoom) return false;
  if (!confirm("“" + state.syncRoom + "” sınıfındaki TÜM veriler sunucudan kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?")) return false;
  s.busy = true; s.hata = ""; renderAll();
  try {
    const r = await fetch("/api/sync/reset", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ room: state.syncRoom })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.message || "Silinemedi");
    s.mesaj = j.deleted + " kayıt sunucudan silindi";
  } catch (e) {
    s.hata = (e && e.message) || "Silinemedi";
  }
  s.busy = false; renderAll();
  return !s.hata;
}

/** Önemli bir olaydan sonra sessizce gönder — başarısızlık çipte görünür. */
function syncOtomatik() {
  if (!state.syncRoom || syncDurum().ready !== true) return;
  syncGonder();
}

function syncZaman(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

/* -------------------- 1) TOPBAR ÇİPİ — her rolde, yalnızca bağlıyken -------
   `.ai-chip` / `.ai-mode-detay` ile AYNI kalıp (renderAiBadge): küçük bir
   durum çipi + tıklayınca açılan ayrıntı paneli. Bağımsız sınıf (§6.3-2). */
function syncChipHtml() {
  if (!state.syncRoom) return "";   // koda bağlı değilken topbar tamamen sadedir
  const s = syncDurum();
  const cls = s.hata ? "pill-warning" : (s.busy ? "pill-accent2" : "pill-success");
  /* §36 — KOD ile DURUM METNİ ayrı biçimlendirilir.
     .sync-metin monospace + 0,06em harf aralığı kullanıyordu. Bu bir SINIF
     KODU için doğrudur (AB2C9 karakter karakter okunur, O/0 ve I/1 karışmasın
     diye), ama aynı stil "eşitleniyor…" / "eşitlenemedi" gibi TÜRKÇE
     CÜMLELERE de uygulanıyordu ve kelime bozuk/aralıklı görünüyordu.
     Artık monospace yalnızca gerçekten kod gösterilirken açılır. */
  const kodMu = !s.busy && !s.hata;
  const metin = s.busy ? "eşitleniyor…" : (s.hata ? "eşitlenemedi" : state.syncRoom);
  return '<button class="sync-chip ' + cls + '" id="btnSyncDetay" aria-expanded="' +
    (state.syncAyrintiAcik ? "true" : "false") + '" title="' +
    (kodMu ? "Sınıf kodu " + escapeHtml(String(state.syncRoom)) + " — ayrıntılar"
           : (s.hata ? "Eşitleme başarısız — ayrıntılar için tıklayın" : "Eşitleniyor…")) + '">' +
    '<span class="sync-nokta">' + (s.hata ? "!" : "●") + "</span>" +
    '<span class="sync-metin' + (kodMu ? " sync-kod" : "") + '">' + escapeHtml(metin) + "</span>" +
    '<span class="sync-ok">' + (state.syncAyrintiAcik ? "▴" : "▾") + "</span></button>" +
    syncDetayHtml();
}

function syncDetayHtml() {
  if (!state.syncAyrintiAcik) return "";
  const s = syncDurum();
  const satir = function (etiket, deger) {
    return '<div class="aim-satir"><span class="aim-etiket">' + escapeHtml(etiket) + "</span>" +
      '<span class="aim-deger">' + escapeHtml(deger) + "</span></div>";
  };
  return '<div class="ai-mode-detay sync-detay" id="syncDetay">' +
    satir("Sınıf kodu", state.syncRoom) +
    satir("Son gönderilen", syncZaman(s.sonGonderim)) +
    satir("Son alınan", syncZaman(s.sonCekim)) +
    (s.hata ? '<div class="aim-not sync-detay-err">' + escapeHtml(s.hata) + "</div>" : "") +
    '<div class="aim-not">Bu bir kimlik doğrulama değildir: kodu bilen herkes bu sınıfın ' +
    "verisini görebilir. Sınav bittikten ve karneler yayınlandıktan sonra silmeniz önerilir.</div>" +
    '<div class="sync-detay-actions">' +
    '<button class="btn btn-secondary btn-sm" id="btnSyncDetayYenile" ' + (s.busy ? "disabled" : "") + ">Şimdi eşitle</button>" +
    '<button class="btn btn-secondary btn-sm" id="btnSyncDetayCik">Kodu değiştir</button>' +
    '<button class="btn btn-secondary btn-sm" id="btnSyncDetaySil">Sunucudaki veriyi sil</button>' +
    "</div></div>";
}

function renderSyncChip() {
  const el = document.getElementById("syncChip");
  if (!el) return;
  el.innerHTML = syncChipHtml();
  wireSyncChip();
}

function syncAyrintiToggle() {
  state.syncAyrintiAcik = !state.syncAyrintiAcik;
  renderSyncChip();
}

function wireSyncChip() {
  const btn = document.getElementById("btnSyncDetay");
  if (btn) btn.onclick = syncAyrintiToggle;
  const yenile = document.getElementById("btnSyncDetayYenile");
  if (yenile) yenile.onclick = function () { syncCek(); syncGonder(); };
  const cik = document.getElementById("btnSyncDetayCik");
  if (cik) cik.onclick = function () {
    state.syncRoom = ""; syncDurum().mesaj = ""; syncDurum().hata = ""; state.syncAyrintiAcik = false;
    saveState(); renderAll();
  };
  const sil = document.getElementById("btnSyncDetaySil");
  if (sil) sil.onclick = function () { syncSil(); };
}

/* -------------------- 2) ÖĞRETMEN — sınav listesi kartındaki paylaşım satırı
   Kavram burada ilk kez karşısına çıkar: "sınavımı öğrencilerime nasıl
   ulaştırırım" sorusunun yanıtı. examSwitcherHtml() içinde kullanılır. */
function syncShareLineHtml() {
  if (syncDurum().ready === false) return "";   // sunucu bağlı değilse hiç gösterme
  if (state.syncRoom) {
    return '<div class="sync-share sync-share-active">' +
      "<span>Sınıf kodu: <b class=\"sync-code\">" + escapeHtml(state.syncRoom) + "</b> — " +
      "öğrencilere verin, sınavları ve sonuçları bu cihazla paylaşsın.</span>" +
      '<button class="btn btn-secondary btn-sm" id="btnSyncKopyala">Kopyala</button></div>';
  }
  return '<div class="sync-share">' +
    "<span>Sınıfınız şu anda yalnızca bu cihazda. Öğrenciler kendi telefonlarından " +
    "girecekse bir kod oluşturun.</span>" +
    '<button class="btn btn-secondary btn-sm" id="btnSyncPaylasKod">Sınıf kodu oluştur</button></div>';
}

function wireSyncShareLine() {
  const olustur = document.getElementById("btnSyncPaylasKod");
  if (olustur) olustur.onclick = function () {
    state.syncRoom = syncOdaUret(); saveState();
    syncGonder();   // ilk gönderim; kendi içinde renderAll çağırır
  };
  const kopyala = document.getElementById("btnSyncKopyala");
  if (kopyala) kopyala.onclick = function () {
    const eskiMetin = kopyala.textContent;
    const bitir = function (metin) {
      kopyala.textContent = metin;
      setTimeout(function () { kopyala.textContent = eskiMetin; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(state.syncRoom).then(function () { bitir("Kopyalandı ✓"); }, function () { bitir("Kopyalanamadı"); });
    } else {
      bitir("Kopyalanamadı");
    }
  };
}

/* -------------------- 3) ÖĞRENCİ / VELİ — boş ekrandaki katılma kutusu ----
   Kavram burada ikinci ve son kez karşısına çıkar: "öğretmenimin verdiği
   kodu nereye yazacağım" sorusunun yanıtı. Yalnızca çözülecek/görülecek
   sınav yokken (boş durumlarda) görünür — dolu ekranlarda gürültü olurdu.

   🔴 §28s (3 Eylül, beşinci tur): bu kutu ARTIK TEK BAŞINA DURMUYOR. Eskiden
   "sonuç yok" mesajı bir kartta, sınıf kodu kutusu apayrı bir kartta duruyordu
   ve aralarında hiçbir görsel bağ yoktu — veli "sonuç yok" yazısını okuyup ne
   yapması gerektiğini anlamıyordu, çünkü çözüm ekranın başka bir yerindeydi.
   Artık her zaman `bosDurumHtml()` içinden çağrılır ve `.empty-state`in
   DEVAMI olarak çizilir: üstte durum, ince ayırıcı, altında o durumu
   değiştirecek tek eylem. */
/* `girisGizle` (§35): yalnızca KOD GİRİŞ FORMUNU (açıklama + kutu + "Gir")
   bastırır. Veli paneli bunu kullanır — sınıf kodunu öğretmen oluşturur,
   öğrenci girer; velinin girecek bir kodu yoktur, kutu orada yalnızca
   kafa karıştırıyordu. Bağlıyken gösterilen durum satırı ("Bu cihaz …
   koduna bağlı" + "Şimdi kontrol et") KALDIRILMADI: o bir giriş formu
   değil, velinin sonuçları tazeleyebildiği tek yer.
   Öğrenci ve öğretmen tarafı bu parametreyi HİÇ vermez, davranışları
   birebir eskisi gibi kalır. */
function syncJoinHtml(girisGizle) {
  if (syncDurum().ready === false) return "";
  if (state.syncRoom) {
    /* Bağlıyken "…yayınladığında burada görünecek" DENMEZ: hemen üstteki boş
       durum mesajı zaten bunu söylüyor, iki kez yazmak kutuyu şişiriyordu. */
    return '<div class="sync-join sync-join-active">' +
      "<span>Bu cihaz <b>" + escapeHtml(state.syncRoom) + "</b> sınıf koduna bağlı.</span> " +
      '<button class="btn btn-secondary btn-sm js-sync-yenile">Şimdi kontrol et</button></div>';
  }
  if (girisGizle) return "";
  return '<div class="sync-join">' +
    "<b>Öğretmeninizden sınıf kodu aldıysanız buraya girin:</b>" +
    '<div class="sync-join-row">' +
    '<input class="sync-join-input js-sync-input" maxlength="12" placeholder="ör. 2D9543" aria-label="Sınıf kodu">' +
    '<button class="btn btn-primary btn-sm js-sync-gir">Gir</button></div>' +
    (syncDurum().hata ? '<span class="sync-join-err">' + escapeHtml(syncDurum().hata) + "</span>" : "") +
    "</div>";
}

/* Boş ekran = DURUM + onu değiştirecek EYLEM, tek görsel birimde (§28s).
   Öğrenci ve veli ekranlarındaki dört boş durumun tamamı buradan geçer;
   böylece "yok" mesajı ile sınıf kodu girişi bir daha ayrı düşemez. */
function bosDurumHtml(mesaj, girisGizle) {
  return '<div class="card"><div class="empty-state">' + mesaj + syncJoinHtml(girisGizle) + "</div></div>";
}

/* 🔴 §28s — BURADA ID KULLANILMAZ, ÖLÇÜLMÜŞ BİR HATADIR.
   Tüm rol panelleri AYNI ANDA DOM'a basılır (yalnızca aktif olan CSS ile
   görünür). Bu yüzden katılma kutusu bir sayfada BİRDEN ÇOK kez bulunur:
   öğrencinin boş ekranında bir, velinin boş ekranında bir. Eskiden düğme ve
   giriş kutusu `id` taşıyordu ve buradaki `getElementById` yalnızca İLKİNİ
   (öğrencininkini) buluyordu.

   Ölçüldü (yerel dev, tarayıcı): veli panelindeki "Gir" düğmesinin `onclick`
   değeri `null`'dı — yani veli sınıf kodunu yazıp "Gir"e bastığında HİÇBİR
   ŞEY OLMUYORDU. Aynı hata `.wait-pill` sayacında da yaşanmıştı (§28a).
   Çözüm orada olduğu gibi burada da: id yerine sınıf, `querySelectorAll` ile
   HEPSİNİ bağla, her kutu kendi girdisini `closest()` ile bulsun. */
function wireSyncJoin() {
  document.querySelectorAll(".js-sync-gir").forEach(function (btn) {
    const kutu = btn.closest(".sync-join");
    const girTikla = function () {
      const inp = kutu ? kutu.querySelector(".js-sync-input") : null;
      const v = String((inp || {}).value || "").trim().toUpperCase();
      if (!ODA_KOD_DESENI.test(v)) {
        syncDurum().hata = "Kod 4-12 karakter olmalı; I, O harfleri ile 0, 1 rakamları kullanılmaz.";
        renderAll(); return;
      }
      /* §28r Madde 3 — bir kod GİRİLEREK gerçek bir sınıfa katılınıyorsa ve bu
         cihazda hâlâ dokunulmamış ÖRNEK liste duruyorsa, katılmadan önce onu
         temizle. Aksi hâlde 4 sahte isim gerçek öğrencilerle karışıyordu ve
         "örnek listeyi temizle" ipucu da bir daha görünmüyordu (liste artık
         tamamen varsayılan olmadığı için). Öğretmenin KENDİ cihazında kod
         OLUŞTURMASına dokunulmadı — yalnızca KATILMA anı. */
      if (varsayilanListeMi()) { state.students = []; state.activeStudentId = null; }
      state.syncRoom = v; syncDurum().hata = ""; saveState();
      syncCek();
    };
    btn.onclick = girTikla;
    const inp = kutu ? kutu.querySelector(".js-sync-input") : null;
    if (inp) inp.onkeydown = function (e) { if (e.key === "Enter") girTikla(); };
  });
  document.querySelectorAll(".js-sync-yenile").forEach(function (b) {
    b.onclick = function () { syncCek(); };
  });
}

/* -------------------- 4) OTOMATİK EŞİTLEME (öğretmen/yönetici kalp atışı) --
   Öğrencinin gönderdiği kağıt önemli olaylarda zaten otomatik gönderiliyor
   (finishExam, publishResults, finalizeReview → syncOtomatik). Eksik olan
   ÇEKME tarafıydı: öğretmen elle "Yenile"ye basmak zorundaydı. Bu kalp atışı
   onu kapatır — yalnızca öğretmen/yönetici ekranındayken ve bir alana
   YAZMIYORKEN çeker (§6.3-3: renderAll() odak kaybettirmemeli, aynı koruma
   §28a'daki bekleme sayacı ticker'ında da kullanıldı). */
setInterval(function () {
  if (!state.syncRoom || syncDurum().ready !== true || syncDurum().busy) return;
  if (state.role !== "teacher" && state.role !== "admin") return;
  const odak = document.activeElement;
  const yaziliyor = !!odak && (odak.tagName === "INPUT" || odak.tagName === "TEXTAREA" || odak.isContentEditable);
  if (yaziliyor) return;
  syncCek();
}, 20000);

/* ==================== Öz-kontrol ====================
   Geliştirme sırasında bir yeniden yazım, çağrılan bir fonksiyonu sessizce
   silebiliyor; hata ancak o ekrana girildiğinde ortaya çıkıyor. Bu liste,
   açılışta eksik tanımı hemen görünür kılar.
   (Gerçekten yaşandı: rubrik ekranı yeniden yazılırken evalCardHtml,
   doneCardHtml, evalFailedCardHtml ve confBadge silinmişti.)          */
(function selfCheck() {
  const gerekli = [
    "renderAll", "renderRoleNav", "renderContentExpert", "renderTeacher", "renderStudent", "renderAdmin",
    "ceCreateHtml", "cePoolHtml", "rejectedPoolHtml", "rejectedAcikMi", "renderPendingQuestionCard", "distractorHtml",
    "teacherTab1Html", "teacherTab2Html", "teacherTab3Html", "teacherTab4Html",
    "wireTeacherTab1", "wireTeacherTab2", "wireTeacherTab3",
    "critRowHtml", "evalCardHtml", "evalFailedCardHtml", "doneCardHtml", "confBadge",
    "injectionWarnHtml", "dilUyarisiHtml",
    "modelKisaAd", "saglayiciAdi", "aiAyrintiToggle", "aiAyrintiHtml",
    "ensureAudit", "auditKaydet", "auditKisalt", "auditOzet", "auditZaman",
    "auditCsv", "auditIndir", "auditSatirHtml", "auditGunluguHtml", "wireAudit",
    "studentTab1Html", "studentTab2Html", "studentTab3Html", "wireStudentTab1", "wireStudentTab2",
    "poolFilterHtml", "poolEditHtml", "coverageHtml", "examSwitcherHtml", "trendHtml",
    "integrityNoticeHtml", "integritySummaryHtml", "remedialBannerHtml", "renderHeatmap",
    "itemAnalysis", "itemAnalysisHtml", "pYorum", "dYorum",
    "bloomDagilimi", "bloomBalanceHtml",
    "runAlignment", "alignmentRowHtml", "alignmentBarHtml", "wireAlignment", "alignAdaylari",
    "kodDanDers", "kodDanSinif", "ensureOutcomeMeta", "outcomeUyar", "uygunKazanimlar",
    "ensureSources", "kaynakEkle", "kaynakBul", "soruKaynakIster", "kaynakBlokHtml",
    "dbAc", "dbIslem", "kitapKaydet", "kitapYukle", "kitapSil", "ensureLibrary", "kitapBul",
    "kitapligaEkle", "kitapAc", "kitapKaldir", "kitapAramaFiltrele", "kitaplikSatirlarHtml", "kitaplikHtml", "wireKitaplik",
    "kitapBoyutEtiketi", "kitapTarihEtiketi", "kitapligiSil", "renderDepoUyarisi",
    "feedbackDraftHtml",
    "bindFieldLabels",
    "kaynakRozetHtml", "sinavKaynakUyarisiHtml",
    "outcomeSeciminiTazele", "outcomeUyusmazlikHtml", "kazanimSecenekleriHtml", "kazanimNotuHtml",
    "calibration", "calibrationHtml",
    "miscKey", "miscQuestions", "miscAnswers", "runMisconceptions", "misconceptionHtml", "wireMisconceptions",
    "katalogYukle", "katalogAc", "katalogModalHtml", "katalogModalGoster", "katalogSatirlari",
    "katalogAnahtari", "mevcutKataloglar",
    "katalogKazanimlari", "katalogHazirla", "kazanimSecildi",
    "aiGenerateQuestions", "aiEvaluate", "aiSuggestRubric", "retryEvaluation",
    "relabelOptionsAndGetKeyMap", "remapCorrectKeyAndRationale", "fisherYatesShuffle", "shuffleQuestionOptions", "moveOption", "previouslyGeneratedQuestionBodies",
    "startExam", "finishExam", "publishResults", "finalizeReview", "deleteQuestion",
    "activateExam", "createExam", "deleteExam", "unpublishExam", "sinavKatilim", "sinavZamanKilitli", "saveState", "loadState", "saveSoon", "kalanMetni", "yerelDamga",
    "ensureStudents", "activeStudent", "readSession", "writeSession", "submittedStudents",
    "activateStudent", "studentPickerHtml", "studentChip", "simulateClass", "examOutcomeScores",
    "examTotalPoints", "examSuggestedSec", "questionUsage", "rubRefreshBar",
    "siniflar", "classOutcomeScores", "realClassRows", "ornekSinifSatirlari", "okulGercekDurum", "demoSinifOturumlari",
    /* §38 — Demo Akışı. renderDemoSerit her renderAll'da çağrılır; düşerse
       şerit sessizce kaybolur ve sunum ortasında rehber ölür. */
    "loadDemoScenario", "demoAdimaGit", "demoBitir", "demoSeridiHtml", "renderDemoSerit",
    "riskOgrencileri", "riskListesiHtml", "veliCocugu", "veliSonuclari", "veliKazanimEtiketi", "renderParent", "wireParent",
    "dikkatSinavSinyali", "dikkatOgrenciSinyali", "dikkatSinyalleri", "ensureDikkatOnay",
    "dikkatVeliyeOnayla", "dikkatOnayGeriAl", "dikkatPanelHtml", "wireDikkat",
    "csvHucre", "csvSayi", "csvSatirlar", "disaAktarimAdi", "ogrenciCsv", "sinifCsv", "disaAktarHtml", "wireDisaAktar",
    "evalCacheKey", "hash32", "evalCacheGet", "evalCachePut", "evalCacheCount", "evalCacheClear",
    "ogrenciSilGuard", "varsayilanListeMi", "sinifYonetimHtml", "wireSinifYonetim", "kaynakKitapligaKaydet",
    "syncOdaUret", "syncDurum", "syncProbe", "syncPaket", "syncGonder", "syncCek",
    "syncBirlestir", "syncSil", "syncOtomatik", "syncZaman",
    "syncChipHtml", "syncDetayHtml", "renderSyncChip", "syncAyrintiToggle", "wireSyncChip",
    "syncShareLineHtml", "wireSyncShareLine", "syncJoinHtml", "bosDurumHtml", "wireSyncJoin",
    "loadMammothLib", "extractDocx", "loadTesseractLib", "ocrPdfSayfalari", "ocrOneriHtml", "runOcrOnScannedPdf",
    "subeRozetiHtml", "outcomeAlan", "pendingRubricCount", "pendingReviewCount",
    "girisKapisiKartlariHtml", "girisKapisiKur",
    /* §33 — rol izolasyonu ve çıkış akışı. rolCikisYap üst çubuktaki tek
       çıkış yolu; düşerse Çıkış düğmesi sessizce ölür (bu projede tam bu
       sınıftan hata yaşandı, bkz. §30/§32). */
    "rolCikisYap", "girisKapisiniAc",
    /* §29 — Sude entegrasyonu: rubrik şablon uyarısı ve öğretmen
       değerlendirme analitiği. (calibration zaten yukarıda listede;
       şık taşıma/karıştırma yardımcıları da öyle — mükerrer eklenmedi.) */
    "rubricTemplateOverwriteGuard", "calibrationFromRecords",
    "teacherExamRecords", "teacherRoster", "teacherWhoamiHtml",
    "teacherDeltaYuzde", "teacherOzetCumlesi", "teacherAnalyticsHtml",
    "teacherReportCardHtml", "wireTeacherAnalytics",
    /* §30 — final birleştirme denetimi: aşağıdaki altı ad üst düzeyde
       tanımlıydı ama bu listede yoktu. Dördü wire* — yani bir merge onları
       düşürürse ekran sorunsuz çizilir, sadece DÜĞMELER SESSİZCE ÖLÜR.
       Projede tam bu sınıftan iki hata yaşandı (veli panelindeki Gir
       düğmesi ve reddedilenler havuzu gizle/göster). Öz-kontrolün var oluş
       sebebi bu; kapsam dışı kalmamaları gerekiyordu. */
    "wireCeTabs", "wirePendingCards", "wireRejectedPool", "wireExamSwitcher",
    "renderAiBadge", "renderPipeline",
    /* §31 — üretim dayanağı (kaynak metin / kazanım) seçimi. */
    "uretimModu", "uretimModuSecHtml", "yonergeAlaniHtml", "kazanimAnahtarlari",
    /* §34 — öğretmen adı hızlı seçim listesi. */
    "ogretmenSecenekleri", "wireTeacherWhoami"
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
/* 🔴 OCR "çalışıyor" bayrağı SAYFA YENİLENİNCE ASILI KALIYORDU (ölçüldü).
   `ceForm` KALICI_ALANLAR içinde, yani tüm alanlarıyla localStorage'a yazılıyor
   — `ocrLoading` ve `ocrProgress` dahil. OCR sürerken sekme kapatılır ya da
   yenilenirse uygulama açılışta bu bayrakları geri yüklüyor ve ekranda hiç
   bitmeyecek bir OCR spinner'ı ("OCR çalışıyor: 1/2 sayfa") gösteriyordu;
   arkada çalışan bir OCR yok, "OCR ile Dene" düğmesi de bu yüzden hiç
   görünmüyor — kullanıcının tek çıkışı "Verileri sıfırla" oluyordu.
   Bunlar oturumluk (geçici) bayraklardır; açılışta sıfırlanmaları gerekir.
   `pdfLoading` de AYNI kusuru taşıyor: yarım kalmış bir PDF/DOCX okuma
   işleminden sonra uygulama açılışta "Dosya okunuyor…" ekranında kilitli
   kalıyordu. Üçü de burada sıfırlanır — durum verisine (kitaplık, sorular,
   oturumlar) dokunulmaz, yalnızca bu geçici bayraklar temizlenir. */
state.ceForm.ocrLoading = false;
state.ceForm.ocrProgress = "";
state.ceForm.pdfLoading = false;
// localStorage'daki eski kazanımlarda subject/grade yok; kod önekinden
// doldurulur ki ders/sınıf filtresi eski verilerde de doğru çalışsın.
ensureOutcomeMeta();
/* AÇILIŞTA SEÇİMİ NORMALLEŞTİR (kullanıcı bildirdi).
   `outcomeSeciminiTazele()` yalnızca ders/sınıf DEĞİŞİNCE çağrılıyordu.
   localStorage'dan uyumsuz bir seçim gelirse (ör. ders Türkçe, sınıf 7 ama
   kazanım FEN.7.1.2) hiç düzeltilmiyor, ekranda "(başka ders/sınıf)" etiketiyle
   duruyordu. Kullanıcı seçimi kendisi bozmadı — eski durum öyle kalmıştı. */
outcomeSeciminiTazele();
ensureSources();
ensureStudents();
ensureExamList();
document.getElementById("btnDemoSeed").onclick = loadDemoScenario;
document.getElementById("btnReset").onclick = resetState;
setInterval(function () { if (state.ai.busy) tickBusy(); }, 250);
renderAll();
girisKapisiKur();
probeAiMode();
// Sunucuda D1 bağlı mı? Bağlı değilse sınıf kodu özellikleri sessizce görünmez
// (§28p): hiçbir düğme yanlış bir başarı iddia etmez, yalnızca teklif edilmez.
syncProbe();
// Açılışta seçili ders/sınıfın MEB kazanım kataloğunu getir — öğretmen
// "Katalog" düğmesine basmadan da kazanımları seçicide görsün.
katalogHazirla();

/* deploy tazeleme — f600c17 */
