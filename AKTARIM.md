# PROJE AKTARIM DOKÜMANI
## T3 Vakfı Bursiyer Yapay Zekâ Creathon — Problem 2 · Takım BIES

> **Bu dokümanı okuyan yapay zekâ asistanına:**
>
> 1. **Kodun tamamı GitHub'dadır**, bu dokümana gömülmemiştir. Bilinçli bir
>    karardır: `public/app.js` tek başına 237 KB; sohbete sığdırılmaya
>    çalışılırsa model kaçınılmaz olarak kısaltır veya hatırlamadığı yeri
>    uydurur. Bu projede bir kez yaşandı (`PROGRESS.md` §5).
>    ```bash
>    git clone https://github.com/EsatKaratas/t3-olcme-degerlendirme
>    cd t3-olcme-degerlendirme && npm install
>    ```
> 2. **`PROGRESS.md` tek doğruluk kaynağıdır** (81 KB). Bu dosya bir özettir;
>    çelişki görürsen `PROGRESS.md`'ye güven. Oradaki §10-§14 en yeni bilgidir.
> 3. **`agents.md` oturum boyunca geçerli kısıtlardır.** Özellikle §1
>    (Human-in-the-Loop) hiçbir gerekçeyle esnetilemez.
> 4. Aşağıdaki **§5 "İlk Görev"** ile başla. Kullanıcı başka bir şey
>    söylemediyse kendi başına yeni bir yön seçme.
> 5. Kullanıcıya görünen tüm metinler **Türkçe**, kod içindeki adlar İngilizce.
>
> **Doküman tarihi:** 26 Ağustos 2026 · **Teslim:** 27 Ağustos 2026 ·
> **Final sunum:** 5-6 Eylül 2026, BAU Beşiktaş

| Ne | Nerede |
|---|---|
| Canlı sistem | https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev |
| Mimari dokümantasyonu | `/mimari` (aynı alan adında) |
| Depo (public) | https://github.com/EsatKaratas/t3-olcme-degerlendirme |
| Yerel klasör | `C:\Users\pc\t3-olcme-degerlendirme` |
| Cloudflare hesabı | karatasesat@hotmail.com · account id `8f038be6be2c6e5ad71da437d444584a` |
| Takım BIES | Esat Talha Karataş · İrem Yazıcı · Zeynep Sude Demir · Burak Özçelik |

---

# 1. Projenin Amacı ve Mimari Yapısı

## 1.1 Problem ve değiştirilemez tez

**Problem 2 (brief):** Soru hazırlama, açık uçlu sınav değerlendirme ve
öğrenme çıktısı analizini yapay zekâ ile hızlandırmak; **nihai kararı ve puan
onayını her zaman eğitmende tutmak.**

**Değiştirilemez tez — Human-in-the-Loop:** Yapay zekâ soru, süre, rubrik,
puan ve geri bildirim *önerir*. Hiçbir AI çıktısı insan onayından geçmeden bir
sonraki aşamaya geçemez. **Otomatik onay eşiği eklemek yasaktır** (`agents.md`
§1). Bir öneri kabul edilirken bunun bir öneri olduğu ekranda yazılıdır.

Bu tez ürünün her katmanında görünür:
- Üretilen soru `ai_generated` durumunda bekler, İçerik Uzmanı onaylayana
  kadar havuza girmez.
- AI puanı `aiEvals`'ta durur; öğretmen `reviews`'a yazmadan öğrenciye gitmez.
- Öğrenciye geri bildirim taslağı ayrı bir kutuda durur; öğretmen "Nota Aktar"
  demeden karneye geçmez.
- Injection denemesi, kavram yanılgısı, sınav bütünlüğü kaydı — hepsi
  **sinyal**, hiçbiri otomatik yaptırım değil.

## 1.2 Çalışma zamanı mimarisi

```
Tarayıcı (vanilla JS, build adımı YOK)
  public/index.html   ~2 KB iskelet
  public/app.js       252 KB — 4 rolün tüm mantığı, tek dosya
  public/app.css      54 KB
        │
        │ fetch  (yalnızca /api/ai/* — başka sunucu çağrısı yok)
        ▼
Cloudflare Worker (Hono)
  src/index.ts        giriş noktası, app.route("/api/ai", ai)
  src/routes/ai.ts    7 uç — Zod doğrulama + hız sınırı + normalleştirme
  src/lib/prompts.ts  6 model istemi  ← JÜRİYE GÖSTERİLECEK DOSYA
  src/lib/ai.ts       sağlayıcı bağımsız çağrı + otomatik yedek + JSON onarımı
  src/lib/guards.ts   saf yardımcılar (test edilebilir)
  src/schemas/ai.ts   Zod şemaları (girdi + model çıktısı)
        │
        ▼
  env.AI ──▶ Workers AI · @cf/meta/llama-3.3-70b-instruct-fp8-fast
        └──▶ (birincil düşerse) OpenAI-uyumlu yedek · gemini-3.7-flash
```

**Neden vanilla JS ve tek dosya:** Build adımı yok, `wrangler deploy` tek
komutla yayınlıyor. Jüri demosunda kırılacak bir derleme zinciri yok. Bedeli:
237 KB'lık tek dosya, bu yüzden §6.3'teki kurallar var.

## 1.3 Dört rol, tek zincir

| Rol | Panel | Ne yapar |
|---|---|---|
| **İçerik Uzmanı** | 2 sekme | Kaynak metin yükler (yapıştır / .txt / .md / PDF), ders-sınıf-kazanım tanımlar, AI'ın ürettiği soruları düzenler ve onaylar |
| **Öğretmen** | 4 sekme | Havuzdan sınav kurar, rubrik tanımlar, AI puan önerilerini inceleyip onaylar, sınıf analitiğini görür |
| **Öğrenci** | 3 sekme | Sınavı çözer (geri sayımlı), yanıtları otomatik kaydedilir, öğretmen onayından sonra gerekçeli karnesini okur |
| **Eğitim Yöneticisi** | tek sayfa | Okul geneli tamamlanma, bekleyen onaylar, kazanım ısı haritası |

Zincir kapanıyor: **içerik → sınav → çözüm → onay → analiz → yeni içerik.**
Analiz ekranında %60 altındaki kazanım için "tekrar sorusu üret" düğmesi
İçerik Uzmanı paneline döner.

## 1.4 Yedi AI ucu

Hepsi `POST` (yalnızca `/status` `GET`), hepsi Zod ile doğrulanır, hepsinde
dakika bazlı hız sınırı ve **prompt injection sertleştirmesi** vardır.

| Uç | Ne döndürür |
|---|---|
| `/api/ai/status` | Etkin sağlayıcı/model, yedek tanımlı mı |
| `/api/ai/generate-questions` | ÇSS + açık uçlu taslak; Bloom düzeyi, çeldirici gerekçeleri, `needsSource` |
| `/api/ai/evaluate` | Kriter bazında puan + gerekçe, güven skoru, `studentFeedback`, `injectionAttempt` |
| `/api/ai/rubric` | Soruya özgü rubrik taslağı (ağırlıklar %100'e normalleştirilir) |
| `/api/ai/sample-answers` | Farklı başarı düzeylerinde örnek yanıt (`simulated: true`) |
| `/api/ai/misconceptions` | Sınıfın yanıtlarında tekrarlayan kavram yanılgıları (öğrenci adı gönderilmez) |
| `/api/ai/outcome-alignment` | İçerik geçerliği: soru seçilen kazanımı ölçüyor mu (bağımsız çağrı) |

## 1.5 Otomatik yedek sağlayıcı

`AI_FALLBACK_*` yapılandırılmışsa birincil sağlayıcı başarısız olduğu anda
(kota, kesinti, model kaldırılması) sistem yedeğe geçer. **Geçiş sessiz
değildir:** yanıtın `meta.fellBack` alanı ve arayüzdeki rozet hangi modelin
yanıtladığını yazar; Workers Logs'a `ai_fallback` olayı düşer.

## 1.6 🔴 Canlıda ne bağlı, ne bağlı değil (dürüstlük notu)

Bu ayrım **jüriye açıkça söylenmelidir** ve `README.md` §3 ile `/mimari`
sayfasında da yazılıdır.

| Bileşen | Hedef mimari | Canlı demo |
|---|---|---|
| Cloudflare Workers + Hono | ✅ | ✅ **çalışıyor** |
| Workers AI | ✅ | ✅ **çalışıyor** |
| Otomatik yedek sağlayıcı | ✅ | ✅ **çalışıyor** |
| D1 (SQLite, 14 tablo) | ✅ | ❌ şema hazır, **yazım yok** |
| R2 nesne depolama | ✅ | ❌ bağlı değil (PDF istemcide işlenir) |
| Queues (asenkron AI) | ✅ | ❌ ücretsiz planda kullanılamaz |
| Better Auth | ✅ | ❌ rol geçişi arayüzden simüle edilir |

**Sebep teknik:** `d1_databases[].database_id` doldurulmadan `wrangler deploy`
başarısız olur ve Queues Cloudflare ücretsiz planında yoktur. Bu yüzden iki
yapılandırma dosyası var (§6.1).

---

# 2. Güncel Dosya Ağacı

43 takipli dosya. Boyutlar gerçek ölçümdür.

```
t3-olcme-degerlendirme/
│
├── AKTARIM.md              15 KB  bu dosya — devir özeti
├── PROGRESS.md             89 KB  ★ TEK DOĞRULUK KAYNAĞI (§0-§15)
├── README.md               36 KB  jüri odaklı tanıtım (rozetler, mermaid akış)
├── agents.md              7,7 KB  ★ ZORUNLU kurallar (HITL, mimari, sınırlar)
│
├── package.json           1,6 KB  bağımlılıklar + 16 npm script
├── tsconfig.json          0,5 KB  TypeScript strict
├── wrangler.jsonc         4,2 KB  ÜRETİM yapılandırması (D1+R2+Queues+AI)
├── wrangler.demo.jsonc    3,5 KB  ★ DEMO yapılandırması — KULLANILAN BU
├── schema.sql             8,5 KB  D1 şeması, 14 tablo (canlıda bağlı değil)
├── routes.ts              9,4 KB  tam rota iskeleti (referans; handler'lar TODO)
├── .gitattributes         0,7 KB  Linguist: dokümantasyon HTML'i kod sayılmasın
├── .dev.vars.example      0,5 KB  yerel sır şablonu (gerçeği .gitignore'da)
├── ANAHTAR-EKLE.bat       0,3 KB  Gemini anahtarını doğrula + Cloudflare'e yükle
│
├── src/
│   ├── index.ts           1,3 KB  Worker giriş noktası
│   ├── routes/ai.ts        22 KB  ★ 7 AI ucu
│   ├── lib/prompts.ts      27 KB  ★ 6 model istemi (jüriye gösterilecek)
│   ├── lib/ai.ts           10 KB  sağlayıcı katmanı + yedek + JSON onarımı
│   ├── lib/guards.ts      3,5 KB  saf yardımcılar (hız sınırı, kaynak tespiti)
│   └── schemas/ai.ts      6,6 KB  Zod şemaları
│
├── test/                          ★ 88 test, npm test ile koşar
│   ├── guards.test.ts     6,0 KB  37 test — kaynak tespiti, hız sınırı
│   ├── schemas.test.ts    7,5 KB  27 test — şema sınırları, normalleştirme
│   └── ai-lib.test.ts     4,9 KB  24 test — extractJson, sağlayıcı, BOM
│
├── public/
│   ├── index.html         1,9 KB  iskelet
│   ├── app.js             252 KB  ★ 4 rolün TÜM mantığı (tek dosya)
│   ├── app.css             57 KB  tüm stiller
│   ├── _headers           1,6 KB  ★ güvenlik başlıkları (CSP dahil)
│   ├── mimari.html         51 KB  mimari dokümantasyonu (4 mermaid diyagram)
│   ├── mimari.js          1,5 KB  mermaid yükleyici (inline OLAMAZ — §6.3)
│   ├── privacy-policy.html 20 KB  KVKK aydınlatma metni
│   ├── 404.html           6,8 KB  özel hata sayfası
│   ├── robots.txt         0,8 KB  /api/ ve /internal/ disallow
│   └── mufredat/
│       └── turkce-7.json   17 KB  ★ MEB 96 öğrenme çıktısı + 6 tema
│
├── tools/
│   ├── injection-test.py  4,7 KB  ★ 5 vektörlü güvenlik testi (tekrar koşulabilir)
│   ├── check-jsonc.py     1,9 KB  JSONC doğrulayıcı (npm run check:config)
│   ├── anahtar-dogrula.mjs 3,7 KB yedek anahtarı Google'a sorup CF'e yükler
│   └── test-gemini.mjs    2,8 KB  yedek anahtarını yerelde sınar
│
├── seed/turkishmmlu/              dataset dönüştürme — DEMODA KULLANILMIYOR
│   ├── 01_learning_outcomes.sql
│   ├── convert_turkishmmlu.py
│   ├── import_summary.json
│   └── IMPORT_NOTES.md
│
└── .claude/launch.json    0,2 KB  dev server tanımı (port 8787)
```

**★ ile işaretliler**, değişiklik yapmadan önce mutlaka okunmalıdır.

---

# 3. Veritabanı ve Veri Akışı

## 3.1 Veriler nerede tutuluyor

**Prototipte sunucuda hiçbir veri saklanmaz.** Tüm durum tarayıcının
`localStorage`'ında, tek bir anahtar altındadır: `t3-olcme-durum-v1`.

Kalıcı yazılan 31 üst düzey alan (`KALICI_ALANLAR`, `public/app.js`):

```
role · teacherTab · studentTab · ceTab · genCount · ceForm · questions ·
rubrics · rubricSelectedQ · exam · answers · examStatus · currentQIndex ·
remainingSec · aiEvals · reviews · mcResults · remedial · integrity ·
outcomes · subjects · poolFilter · exams · activeExamId · students ·
activeStudentId · evalCache · misconceptions · alignment · sources · library
```

D1 şeması (`schema.sql`, 14 tablo) hazırdır ama **canlıda bağlı değildir**:
`schools · users · learning_outcomes · source_documents ·
source_document_outcomes · questions · rubrics · exams · exam_questions ·
exam_assignments · submissions · ai_evaluations · teacher_reviews ·
analytics_snapshots`

## 3.2 İki katmanlı oturum modeli (dikkat: burada kolay hata yapılır)

Aynı anda **çok sınav** ve **çok öğrenci** desteklenir. Bu, iç içe iki takas
mekanizmasıyla çözüldü ve **mevcut kodun tamamı değişmeden çalışmaya devam
etti** — yeni kod yazarken bu modeli bozmamak önemlidir.

```
state.exams[]                       ← tüm sınav kayıtları
state.activeExamId                  ← hangi sınav "canlı" alanlarda
   └── kayit.sessions[ogrenciId]    ← öğrenci başına oturum
state.activeStudentId               ← hangi öğrenci "canlı" alanlarda
```

**Aktif sınavın + aktif öğrencinin** oturum alanları `state` kökünde "canlı"
durur; diğerleri kayıtlara yazılır. Sekiz oturum alanı (`OTURUM_ALANLARI`):

```
answers · examStatus · currentQIndex · remainingSec ·
aiEvals · reviews · mcResults · integrity
```

Geçiş fonksiyonları: `syncActiveExam()` mevcut alanları kayda yazar,
`activateExam()` / `activateStudent()` hedefinkileri yükler.
**Okuma/yazma her zaman `readSession(sid)` / `writeSession(sid, ...)` ile
yapılmalıdır**, doğrudan `state.answers` üzerinden değil — aksi halde yanlış
öğrencinin verisi okunur.

## 3.3 Soru üretim akışı

```
İçerik Uzmanı formu (ceForm: title, subject, grade, outcomeCode, text,
                     mcCount, openCount)
   │
   ├─▶ kaynakEkle(doc)  → state.sources[]'a yazılır, srcId döner
   │                       (en fazla 10 kaynak; sınır aşılırsa en eski atılır)
   │
   ├─▶ POST /api/ai/generate-questions
   │      · Zod doğrulama (kaynak metin 30-6000 karakter)
   │      · hız sınırı: aynı docKey için 5/dk
   │      · istemde kaynak metin nonce ile sarılır (injection savunması)
   │      · model çıktısı normalleştirilir: şık harfleri A-B-C-D'ye dizilir,
   │        doğru şık yeniden eşlenir, aiTime kırpılır
   │      · needsSource: model kararı VEYA gövdede kaynak atıf kalıbı
   │
   └─▶ state.questions[] += { status: "ai_generated", srcId, needsSource, ... }
```

Öğretmen/İçerik Uzmanı onaylayınca `status: "approved"` olur ve havuza girer.
Reddedilirse `status: "rejected"`.

## 3.4 Değerlendirme akışı

```
Öğrenci yanıtı (answers[qid].text)
   │
   ├─▶ evalCacheKey(q, rubric, answerText) — önbellek anahtarı
   │      soru gövdesi + kazanım + rubrik (maxScore + kriter/ağırlık) +
   │      yanıt + MODEL ADI
   │      · isabet varsa 0-6 ms, model çağrılmaz
   │      · başarısız değerlendirme ASLA önbelleğe alınmaz
   │      · "Yeniden Dene" önbelleği atlar
   │
   ├─▶ POST /api/ai/evaluate  (önbellek ıskalarsa)
   │      · kriter tavanları sunucuda hesaplanır, puan tavana kırpılır
   │      · 0,5 katına yuvarlanır
   │      · studentFeedback + injectionAttempt döner
   │
   ├─▶ state.aiEvals[qid] = { aiScore, breakdown, confidence,
   │                          studentFeedback, injectionAttempt }
   │
   └─▶ Öğretmen onayı → state.reviews[qid] = { finalScore, comment,
                                                decision, aiScore }
           │
           └─▶ publishResults() → examStatus: "graded" → öğrenci karnesi
```

**Sessiz geri düşüş yasağı:** Gerçek model modunda çağrı başarısız olursa
sistem simülasyona düşüp sahte puan göstermez. Değerlendirme "yapılamadı"
işaretlenir; öğretmene "Yapay Zekâ ile Yeniden Dene" ve "Elle Puanla ve
Onayla" seçenekleri sunulur.

## 3.5 Uyaran metin (kaynak metin) akışı

Bir soru kaynak metne dayanıyorsa (`needsSource: true`), o metin **sınavda
öğrenciye soruyla birlikte gösterilir.** Türkçe okuma kazanımları metin
olmadan ölçülemez.

```
state.sources[] = [{ id, title, subject, grade, text, at }]
state.questions[i].srcId ──▶ kaynakBul(srcId)
   ├─ öğrenci sınav ekranı : kaynakBlokHtml(q, "student")  → metin AÇIK
   ├─ öğretmen inceleme    : kaynakBlokHtml(q, "review")   → katlanabilir
   └─ sınav kurma          : sinavKaynakUyarisiHtml(secili)
```

Kaynak silinmişse (limit aşımı) **sessizce metinsiz soru gösterilmez**;
öğrenciye ve öğretmene farklı, açık uyarı çıkar.

## 3.6 Gizlilik sınırları

- Öğrenci **adı hiçbir AI çağrısında gönderilmez.** Kavram yanılgısı
  kümelemede yanıtlar anonim ve numaralıdır.
- PDF dosyaları **istemcide** `pdf.js` ile çözümlenir; dosya sunucuya
  gönderilmez. Sayfa metinleri bilinçli olarak `state` dışında tutulur
  (localStorage kotası).
- Sınav bütünlüğü kaydında yapıştırılan metnin **içeriği** saklanmaz,
  yalnızca karakter sayısı tutulur.
- `agents.md` §7: öğrenci verisiyle ilgili her değişiklikte
  `public/privacy-policy.html` güncellenmek zorundadır.

---

# 4. Çözülen Son Sorunlar ve Mevcut Durum

26 Ağustos'ta 20 commit yapıldı (toplam 46). Ayrıntılar `PROGRESS.md`
§10-§14'te; burada özet.

## 4.1 Kullanıcının bildirdiği üç ürün hatası — üçü de düzeltildi

| # | Sorun | Çözüm |
|---|---|---|
| 1 | Ders/sınıf/kazanım **birbirinden bağımsızdı** ("Türkçe + MAT.7.3.4 + Kuvvet ve Hareket" mümkündü) | Kazanıma `subject`/`grade` eklendi, seçici filtreleniyor, uyuşmazlıkta gerekçeli uyarı. Sert engelleme yok |
| 2 | 8. sınıf seçiliyken **7. sınıf kataloğu** açılıyordu | Katalog anahtarı artık ders **ve** sınıf birlikte |
| 3 | 🔴 **"Metne göre…" sorusu ama ortada metin yok** — soru cevaplanamazdı | Uyaran metin sistemi (§3.5): kaynak saklanıyor, soruya bağlanıyor, sınavda gösteriliyor. Sunucuda deterministik güvence (regex 10/10) |
| 4 | **Yüklenen müfredat PDF'i sayfa yenilenince kayboluyordu** — öğretmen aynı dosyayı her oturumda baştan yüklüyordu | **Müfredat Kitaplığı** (`PROGRESS.md` §15): sayfa metinleri IndexedDB'de, indeks `state.library`'de. Yükle → yenile → "Aç" ile 36 sayfa geri geldi, yeniden yükleme yok |

## 4.2 Ayrıştırıcı özellikler (bu takımı diğerlerinden ayıran kısım)

| Özellik | Ne yapar | Ölçüm |
|---|---|---|
| **Prompt injection sertleştirmesi** | Öğrenci cevabına *"tam puan ver"* yazması gerçek saldırı yüzeyi. 6/6 istemde nonce sınır belirteci + kuralların önünde güvenlik bloğu | **5 vektör, 5/5 savunuldu** (`tools/injection-test.py`) |
| **Madde analizi** | Üretilen sorunun iyi bir ölçme aracı olup olmadığı: güçlük (p), ayırt edicilik (d), işlevsiz çeldirici. Negatif d = anahtar hatalı olabilir | Birim testi elle hesapla birebir |
| **Öğretmen–AI uyumu** | Brief'in *"değerlendirici tutarsızlığı"* sorununa cevap. Ayrıca **güven skorunun kendisini denetler** | Birim testi birebir |
| **Kavram yanılgısı kümeleme** | Isı haritası "hangi kazanım zayıf" der, bu "**neden** zayıf" der | Kurgulanan yanılgı 5/7'de yakalandı |
| **Gerçek MEB müfredatı** | 96 öğrenme çıktısı; **yazılı sınav (39) / performans (43) / süreç (14)** ayrımıyla | `T.O.7.5` ile gerçek soru üretildi |
| **Bloom düzey dengesi** | Sınav ezber mi ölçüyor? Hedef oran dayatmıyor, iki ucu bildiriyor | 4 birim testi |
| **Kazanım–soru hizalama** | İçerik geçerliği. **Denetimi soruyu üreten çağrı yapmaz**, bağımsız çağrı yapar | Kasten yanlış sorularla 4/4 |
| **Öğrenciye geri bildirim taslağı** | Puan değil "ne yapmalısın". **Otomatik doldurulmaz**, öğretmen "Nota Aktar" der | 3 yanıt düzeyinde doğrulandı |

## 4.3 Güvenlik denetimi (`373dcfd`)

**Temiz:** XSS (14 alana gerçek payload, 4 rol × tüm sekmeler → sızma yok) ·
secret sızıntısı yok · Zod 6/6 uçta · CORS same-origin.

**Düzeltilen 4 bulgu:**
1. `rubric` ve `sample-answers` istemlerinde injection savunması yoktu —
   **dolaylı zincir** (kaynak metin → soru → istem). Artık 6/6.
2. `/evaluate`, `/rubric`, `/sample-answers` uçlarında **hız sınırı yoktu.**
   `/evaluate` için 45/dk seçildi (bir sınıfın tamamı meşru olarak
   değerlendirilir; 5 koymak gerçek kullanımı bozardı).
3. **Hiç güvenlik başlığı yoktu** → `public/_headers`: CSP,
   `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
   `Permissions-Policy`. pdf.js + mermaid + fontlar + API ile test edildi.
4. Gizlilik politikası eksikti (`agents.md` §7 ihlali).

## 4.4 Denetim sırasında ortaya çıkan iki gizli hata

- **Mermaid diyagramları hiç render edilmiyordu** (jüriye gösterilen sayfa!).
  `startOnLoad` `DOMContentLoaded`'ı bekliyor ama `await import()` asenkron
  olduğu için o olay geçmiş oluyordu; `try/catch` de yakalamadığı için
  **sessizce** başarısızdı. Yükleyici `mimari.js`'e taşındı, `run()` ile
  açıkça tetikleniyor.
- **Karne ekranı çöküyordu.** `mcResults[q.id].correct` doğrudan okunuyordu;
  kayıt yoksa öğrenci karnede hiçbir şey göremiyordu. Artık "puanlanmadı"
  etiketiyle sebebi yazılıyor ve puana dahil edilmiyor.

## 4.5 Doğrulanmış son durum (26 Ağustos)

| Kontrol | Sonuç |
|---|---|
| `npm run lint` (tsc --noEmit) | temiz |
| `npm test` | **88/88 geçti** (3 dosya, 1,1 sn) |
| `npm run check:config` | 2/2 geçerli |
| `node --check public/app.js` | geçerli |
| Açılış öz-kontrolü | temiz (**136 fonksiyon** denetleniyor) |
| 4 rol × tüm sekmeler | render hatasız, konsol hatası 0 |
| Canlı statik yollar | `/` `/app.js` `/app.css` `/mimari` `/privacy-policy` `/robots.txt` `/mufredat/turkce-7.json` `/mimari.js` → 200, bilinmeyen → 404 |
| Güvenlik başlıkları | 5/5 aktif |
| Mobil (375 px) | 4 rol × tüm sekmeler, yatay taşma **yok** |
| Erişilebilirlik | bağlanmamış label **0** · WCAG 2.5.8: ilk ölçüm eksikti, `PROGRESS.md` §15g'de 9 ihlal bulundu ve **düzeltildi** |
| XSS | 14 alanda sızma yok |

**Ölçülen süreler (canlı, gerçek model):** soru üretimi ~9,7 sn (1 ÇSS +
1 açık uçlu) · değerlendirme 3,3-5,5 sn · rubrik ~2,7 sn · kavram yanılgısı
~5,1 sn · hizalama denetimi 2,5-3,3 sn · önbellekten **0-6 ms**.

## 4.6 🔴 KOTA GERÇEĞİ — demo öncesi mutlaka okunmalı

26 Ağustos'ta test sırasında **Workers AI günlük kotası doldu.** Sistem
yedeğe düştü ve Gemini'nin gerçek sınırı ortaya çıktı:

```
Quota exceeded for metric:
generativelanguage.googleapis.com/generate_content_free_tier_requests,
limit: 20
```

- Workers AI ücretsiz kotası ≈ **günde 10 tam demo turu**.
- Gemini ücretsiz katmanı **günde 20 istek** — gerçek bir emniyet ağı değil.
- İkisi de tükenince AI uçları 502 döner; sistem bunu ekranda açıkça yazar
  (sessiz düşüş yok) ama **demo yapılamaz.**

**Önlem:** Sunumdan önce kota tazeliğini kontrol et, gereksiz deneme yapma,
değerlendirme önbelleğini kullan, provayı aynı girdilerle yap.

---

# 5. Kalan Eksikler ve İlk Görev

## 5.1 ★ KULLANICININ (İNSANIN) YAPACAĞI İŞLER — kod dışı, teslim kritik

Bunlar **yapay zekânın tek başına bitirebileceği işler değildir**; ekip
kararı, tasarım aracı ya da kamera gerektirir. Yeni oturumda asistan bunlara
**içerik üretimiyle destek olabilir** ama teslim eden insandır.

| # | İş | Durum | Asistan nasıl yardım eder |
|---|---|---|---|
| 1 | **İş Modeli Kanvası** | 🔴 **HİÇ YOK — ZORUNLU TESLİMAT** | 9 kutunun metnini ürüne özel yazabilir; ekip Canva'ya aktarır |
| 2 | **Deck güncellemesi** | 🔴 ~12 ayrıştırıcı özelliğin **hiçbiri deck'te yok** | Slayt metinlerini yazabilir. Malzeme `README.md` §11 ve `PROGRESS.md` §11-§14'te hazır |
| 3 | Deck'te **"hile önleyici kontroller"** ifadesi | 🔴 yanlış — üründe engelleme yok, kayıt var | Doğru ifade: **"sınav bütünlüğü kaydı — öğretmene şeffaf sinyal"** |
| 4 | **Rakip analizi tablosu** | `canva.docx`'te var, deck'e taşınmadı | Kreaton rehberi bunu kritik tavsiye sayıyor |
| 5 | **Demo videosu** | yok | Çekim senaryosu yazabilir (hangi ekran, hangi sıra, kaç saniye) |
| 6 | **Ekran görüntüleri** | README'de tek ürün görseli yok | Asistanın tarayıcı aracı dosyaya kaydedemiyor; kullanıcı alıp `docs/` altına koyarsa asistan yerleştirir |
| 7 | **`v-demo` tag'i** | atılmadı | `agents.md` §8: sunumdan 24 saat önce (≈4 Eylül) |
| 8 | **Kota kontrolü** | — | Sunum öncesi §4.6'yı oku |

## 5.2 ★ İLK GÖREV — yeni oturumda buradan başla

> **GÜNCELLEME (26 Ağustos akşamı, kullanıcı kararı):** Yukarıdaki 1-5 numaralı
> teslimatlar (İş Modeli Kanvası, Pitch Deck, rakip analizi, demo videosu)
> **ekip arkadaşlarına devredildi.** Kullanıcının kendi görevi **çalışan,
> eksiksiz ürün.** Bu yüzden yeni oturumun varsayılan görevi artık kanvas
> yazmak değildir.
>
> **Yeni varsayılan: ürün açıklarını kapatmak.** Sıradaki iş listesi §5.3'tedir;
> tamamlananlar `PROGRESS.md` §15'te kayıtlıdır. Kullanıcı bir eksik bildirirse
> o önceliklidir — bu projede en değerli düzeltmelerin tamamı kullanıcının
> ürünü elle kullanırken bulduğu hatalardan çıktı (§14c, §15a).

**Eski gerekçe (kayıt için):** Kod tarafı güçlü ve doğrulanmış durumdaydı
(§4.5), ama **jüri kodu okumaz, deck'i izler**; 12 ayrıştırıcı özelliğin
hiçbiri sunumda değildi. Bu değerlendirme hâlâ doğrudur — yalnızca işi
yapacak kişi değişti.

Kanvas yazarken kullanılacak gerçek malzeme:
- **Değer önerisi:** `README.md` "Neden bu proje farklı" tablosu
- **Müşteri segmentleri:** brief'in 4 rolü (`PROGRESS.md` §7b)
- **Maliyet yapısı:** `PROGRESS.md` §7g'de ölçülmüş gerçek maliyetler
  (tam demo turu $0,0116 Workers AI / $0,0020 gpt-5-nano)
- **Ayrıştırıcılar:** `PROGRESS.md` §11-§14

## 5.3 Kod tarafında bilinçli bırakılanlar (finale, 5-6 Eylül)

Hiçbiri demoyu engellemez. Öncelik sırasıyla:

| # | Eksik | Not |
|---|---|---|
| 1 | **Zincir yedek** (Workers AI → Gemini → OpenAI) | §4.6'daki kota sorununun tek gerçek çözümü. `callModelJson` değişikliği + test gerekir; OpenAI anahtarı/kredisi kullanıcıda |
| 2 | **CSP'de `style-src 'unsafe-inline'`** | `app.js` 87 yerde inline `style="..."` kullanıyor. Stiller sınıflara taşınırsa bu izin kaldırılabilir ve CSP güçlenir |
| 3 | Isı haritasındaki **"(örnek)" satırları** | Karşılaştırma sınıfları (6-A, 8-B, 8-C) demo verisi. Canlı şubeler (7-A, 7-B) gerçek veriden. Arayüzde "(örnek)" etiketli — yanıltma yok |
| 4 | **Diğer dersler için kazanım katalogları** | Türkçe 7 yapıldı, kalıp hazır (`public/mufredat/turkce-7.json`). Matematik/Fen eklenebilir |
| 5 | **AI karar günlüğü / denetim izi** | Hangi model, hangi istem, ne önerdi, öğretmen ne yaptı — indirilebilir. HITL tezinin en güçlü kanıtı olurdu |
| 6 | Maliyet şeffaflığı paneli · soru havuzu benzerlik denetimi · öğrenci erişilebilirliği (süre uzatma, disleksi dostu font) | `PROGRESS.md` §11f'deki seçenek havuzu |

## 5.4 Reddedilmiş işler (tekrar önerilmemeli, gerekçeleri kayıtlı)

| İş | Neden reddedildi |
|---|---|
| **Hazır soru bankası entegrasyonu** | Ana değer önerisiyle çelişiyor: ürün "AI soru üretiyor" diyor; hazır havuz jüriye *"AI'a ne gerek var?"* dedirtir. Ayrıntı `PROGRESS.md` §13a |
| `sorular.json` düzeltme | 85 kaydın %46'sında iki sütun birleşmiş, %35'inde ters yazım, şıklarda iki sorunun seçenekleri karışık (bir kayıtta 43 şık) ve **hiçbir kayıtta doğru cevap yok**. Sütun ayrımı için gereken koordinat bilgisi kayıp. `PROGRESS.md` §12a |
| Modelden "kendi kendine yeten soru üret" istemek | Türkçe okuma kazanımlarını imkânsız kılardı. Doğru çözüm uyaran metin oldu (§3.5) |
| Better Auth / kalıcı D1 yazımı / migrations | Bilinçli kapsam kararı. `PROGRESS.md` §6 |

---

# 6. Özel Kurallar

## 6.1 Çalıştırma ve sürümler

```bash
npm install
npx wrangler login          # bir kez
npm run dev:demo            # http://localhost:8787
npm run deploy:demo         # ★ CANLIYA AL (demo yapılandırması)
npm run lint                # tsc --noEmit
npm test                    # vitest run — 88 test
npm run check:config        # JSONC doğrula (yapılandırma değiştiyse ZORUNLU)
python tools/injection-test.py <taban-url>   # güvenlik testi
```

**⚠️ `npm run deploy` (üretim) DEĞİL, `npm run deploy:demo` kullanılır.**
Üretim yapılandırması D1+R2+Queues bağlar ve deploy başarısız olur.

| Bağımlılık | package.json | Kurulu gerçek |
|---|---|---|
| Node | `>=18` | **24.19.0** |
| npm | — | 11.17.0 |
| hono | `^4.6.14` | 4.13.4 |
| zod | `^3.24.1` | 3.25.76 |
| **wrangler** | `^4.125.0` | **4.125.0** |
| vitest | `^2.1.8` | 2.1.9 |
| typescript | `^5.7.2` | 5.9.3 |
| @cloudflare/workers-types | `^5.20260825.1` | — |

**Wrangler 4 şarttır, 3 değil:** `assets.run_worker_first` dizi biçimi
Wrangler 4 gerektiriyor. Bu yüzden `@cloudflare/workers-types` da 5 olmalı.
`@cloudflare/vitest-pool-workers` **kaldırıldı** — Wrangler 4 ile çözülemez
peer çakışması yaratıyordu. Testler düz `vitest` ile Node altında koşuyor;
bu yüzden test edilecek kod Cloudflare çalışma zamanına bağlı olmamalı
(bkz. `src/lib/guards.ts`).

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (birincil) ·
`gemini-3.7-flash` (yedek, OpenAI uyumlu uç).
**MODEL EĞİTİLMEDİ.** Hazır bir model kullanılıyor; yapılan iş onu rubrik ve
kaynak kısıtlarına, şema doğrulamasına ve insan onay zincirine tabi kılmaktır.
Jüri sorarsa cevap `PROGRESS.md` §7f'de hazır.

## 6.2 Mimari kurallar (`agents.md` özeti — bunlar bağlayıcıdır)

- **§1 HITL değiştirilemez.** Otomatik onay eşiği eklenemez. Bir PR öğretmen
  onayını bypass ediyorsa gerekçesi ne olursa olsun reddedilir.
- Her `POST`/`PATCH` gövdesi **Zod** ile doğrulanır. Doğrulamasız
  `c.req.json()` code review'da otomatik reddedilir.
- Her hata yanıtı `{ "error": "<kısa_kod>", "message": "..." }` biçiminde
  döner. Zod hataları `onInvalid` kancasıyla bu biçime normalleştirilir.
- `max_tokens` her model çağrısında **açıkça** verilir. Sınırsız üretim
  isteği reddedilir.
- Kaynak metin **6.000 karakterle** sınırlı (`MAX_SOURCE_CHARS`). Aşılırsa
  sessizce kırpılmaz, 413 döner.
- Her AI ucunda **dakika bazlı hız sınırı** vardır. Limit uca göre değişir:
  soru üretimi/rubrik/örnek yanıt 5/dk, değerlendirme 45/dk (bir sınıfın
  tamamı meşru olarak değerlendirilir).
- D1'e string birleştirmeyle SQL yazılmaz; `db.prepare(...).bind(...)`
  kullanılır.
- Sırlar `wrangler secret put` ile yönetilir, **koda veya depoya asla
  girmez.** `.dev.vars` `.gitignore`'da.
- Öğrenci verisiyle ilgili her değişiklikte `public/privacy-policy.html`
  güncellenir (§7).
- `main` her zaman deploy edilebilir durumda kalır. Commit mesajları
  Conventional Commits (`feat:` `fix:` `docs:` `sec:` `test:` `chore:`).

## 6.3 ★ Bu projeye özgü, sert öğrenilmiş dersler

Bunların her biri **gerçekten yaşanmış bir hatanın** sonucudur. Yeni kod
yazarken bunlara uyulmazsa aynı hatalar tekrarlanır.

**1. `public/app.js` 238 KB — blok değiştirirken sınırları doğrula.**
Bir yeniden yazımda `critRowHtml` ile `teacherTab3Html` arasındaki aralık
fazladan 4 fonksiyon kapsadı ve onlar silindi; öğretmen sekmesi canlıda
kırıldı. Bu yüzden dosya başında **öz-kontrol** var: 136 fonksiyonun varlığını
denetler, eksikse ekranda kırmızı uyarı basar.
**Yeni fonksiyon eklediysen `selfCheck` listesine eklemeyi unutma.**

**2. CSS sınıflarını kapsayıcıya bağlı tanımlama.**
`.opt-row` yalnızca `.q-card` içinde tanımlıydı; öğrenci sınav ekranında
kullanıldığında hiç stil almadı (şık harfi metne yapıştı: `AF = m * a`).
Aynı hata `.cv-warn` ile tekrarlanmak üzereydi. Bugün eklenen tüm sınıflar
(`.ia-*`, `.cal-*`, `.mis-*`, `.kat-*`, `.bl-*`, `.al-*`, `.src-*`,
`.fb-draft`, `.inj-warn`, `.oc-*`) **bilinçli olarak bağımsızdır.**

**3. Metin girdilerinde `renderAll()` çağırma — odak kaybolur.**
Açık uçlu yanıtlar bir dönem hiç kaydedilmiyordu; "Kaydedildi ✓" göstergesi
tamamen görseldi. Çözüm: `saveSoon()` (400 ms geciktirmeli kayıt).
"Nota Aktar" düğmesi de bu yüzden `renderAll` çağırmaz, DOM'u doğrudan
günceller.

**4. Prompt'taki örnek değerler kopyalanır.**
İstemdeki `"confidence": 0.72` örneği yüzünden model her yanıta 0.72 yazıyordu
ve güven skoruna göre sıralama işlevsizdi. **Örneklere sabit sayı koyma.**

**5. Sessiz geri düşüş yasak.**
Model çağrısı başarısız olursa simülasyona düşüp sahte çıktıyı "AI üretti"
diye gösterme. Kullanıcının ilk şikâyeti buydu. Ne olduğu **ekranda yazar:**
yedek model kullanıldıysa, sonuç önbellekten geldiyse, veri simüleyse.

**6. Model çıktısı güvenilmezdir — sunucuda normalleştir.**
Şema doğrulaması yeterli değil. Örnekler: `studentCount` analiz edilen yanıt
sayısını aşamaz; hizalama önerisi aday listesinde yoksa temizlenir (model kod
uyduramaz); `needsSource` gövdeden deterministik olarak da denetlenir.

**7. İnline module script CSP ile çalışmaz.**
`unsafe-inline` izni inline `<script type="module">` için **geçersizdir**
(modüller nonce/hash ister). `mimari.html`'in yükleyicisi bu yüzden
`mimari.js`'e taşındı. Yeni sayfa eklerken script'i harici dosyaya koy.

**8. JSONC'u regex ile ayrıştırma.**
`//` dizisi URL'lerin içinde de geçer. `npm run check:config` kullan.
Bu dosyada daha önce sondaki virgül deploy'u kırdı.

**9. Yama dosyaya yazılmadan hata verirse dur.**
Sonraki adımlar o değişikliklere bağımlı kod yazmasın. Bir kez oldu, uygulama
tutarsız kaldı.

**10. Hız sınırı isolate başınadır.**
`hits` Map'i bellek içidir ve Cloudflare Workers'da her isolate için ayrıdır;
dağıtık garanti değildir. `agents.md` §7.4 buna izin veriyor ama jüri sorarsa
dürüst cevap: *"tek isolate içinde çalışır, üretimde D1/KV'ye taşınır."*

## 6.4 Kullanıcının açıkça istediği çalışma biçimi

1. **Önce kontrol, sonra işlem.** Önemli değişikliklerde önce riskleri
   listele, önlemini al, sonra uygula. *"Hata istemem."*
2. **Rasyonel ol, karşı çık.** Yanlış bir şey görürsen söyle; katılmıyorsan
   gerekçesiyle itiraz et. Kullanıcı bunu açıkça istedi.
3. **Uydurma.** Fiyat, limit, sürüm gibi bilgileri hafızadan verme — kaynağa
   bak. Bu projede "anahtar AIza ile başlar" varsayımı yanlış çıktı ve
   kullanıcıyı boşuna uğraştırdı.
4. **Her değişikliği test et, ölçtüğün sayıları raporla, sonra commit et.**
5. **`PROGRESS.md`'yi her adımda güncel tut** — bağlam kaybına karşı tek
   sigorta.
6. **İşlem öncesi tahmini süre (ETA) ver.**
7. Türkçe konuş. Kullanıcıya görünen metinler Türkçe, kod içi adlar İngilizce.

---

## Okuma sırası (yeni asistan için)

1. Bu dosya (§5 İlk Görev'e özellikle dikkat)
2. `agents.md` — bağlayıcı kurallar
3. `PROGRESS.md` §0 → §14 (özellikle §14f kota gerçeği)
4. `src/lib/prompts.ts` — ürünün kalbi, jüriye gösterilen dosya
5. `src/routes/ai.ts` → `src/schemas/ai.ts` → `src/lib/ai.ts`
6. `public/app.js` — yalnızca değiştireceğin bölümü, sınırlarını doğrulayarak
