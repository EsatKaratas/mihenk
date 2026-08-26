# PROJE AKTARIM DOKÜMANI — MİHENK
## T3 Vakfı Bursiyer Yapay Zekâ Creathon — Problem 2 · Takım BİES

> **Bu dokümanı okuyan yapay zekâ asistanına:**
>
> 1. **Kodun tamamı GitHub'dadır**, bu dokümana gömülmemiştir. Bilinçli bir
>    karardır: `public/app.js` tek başına **284 KB**; sohbete sığdırılmaya
>    çalışılırsa model kaçınılmaz olarak kısaltır veya hatırlamadığı yeri
>    uydurur. Bu projede bir kez yaşandı (`PROGRESS.md` §5).
>    ```bash
>    git clone https://github.com/EsatKaratas/t3-olcme-degerlendirme
>    cd t3-olcme-degerlendirme && npm install
>    ```
> 2. **`PROGRESS.md` tek doğruluk kaynağıdır** (136 KB, §0-§22). Bu dosya bir
>    özettir; çelişki görürsen `PROGRESS.md`'ye güven. **§17-§22 en yenidir.**
> 3. **`agents.md` oturum boyunca bağlayıcı kısıtlardır.** Özellikle §1
>    (Human-in-the-Loop) hiçbir gerekçeyle esnetilemez.
> 4. Aşağıdaki **§5 "İlk Görev"** ile başla. Kullanıcı başka bir şey
>    söylemediyse kendi başına yeni bir yön seçme.
> 5. Kullanıcıya görünen tüm metinler **Türkçe**, kod içindeki adlar İngilizce.
> 6. **§6.4'teki çalışma biçimi kurallarını oku.** Kullanıcı bunları açıkça
>    istedi; uyulmadığında rahatsız oluyor.
>
> **Doküman tarihi:** 26 Ağustos 2026 · **Teslim:** 27 Ağustos 2026 ·
> **Final sunum:** 5-6 Eylül 2026, BAU Beşiktaş

| Ne | Nerede |
|---|---|
| **Canlı sistem** | https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev |
| Mimari dokümantasyonu | `/mimari` (aynı alan adında) |
| Gizlilik / KVKK | `/privacy-policy` |
| Depo (public) | https://github.com/EsatKaratas/t3-olcme-degerlendirme |
| Yerel klasör | `C:\Users\pc\t3-olcme-degerlendirme` |
| Cloudflare hesabı | karatasesat@hotmail.com · account id `8f038be6be2c6e5ad71da437d444584a` |
| Takım BİES | Esat Talha Karataş · İrem Yazıcı · Zeynep Sude Demir · Burak Özçelik |
| Son commit | `223ee12` · toplam **68 commit** · etiket `v1.0-teslim` |

---

# 1. Projenin Amacı ve Mimari Yapısı

## 1.1 Ürün adı ve tez

**MİHENK** — *"mihenk taşı"*, kalitenin kendisiyle karşılaştırıldığı ölçüt.
Alt başlık ürünün tezidir:

> **Yapay zekâ önerir, öğretmen karar verir.**

**Problem 2 (brief):** Soru hazırlama, açık uçlu sınav değerlendirme ve öğrenme
çıktısı analizini yapay zekâ ile hızlandırmak; **nihai kararı ve puan onayını
her zaman eğitmende tutmak.**

**DEĞİŞTİRİLEMEZ TEZ — Human-in-the-Loop:** Yapay zekâ soru, süre, rubrik, puan
ve geri bildirim *önerir*. Hiçbir AI çıktısı insan onayından geçmeden bir
sonraki aşamaya geçemez. **Otomatik onay eşiği eklemek yasaktır** (`agents.md`
§1). Bir öneri kabul edilirken bunun bir öneri olduğu ekranda yazılıdır.

Bu tez ürünün her katmanında görünür:
- Üretilen soru `ai_generated` durumunda bekler; İçerik Uzmanı onaylayana kadar
  havuza girmez.
- AI puanı `aiEvals`'ta durur; öğretmen `reviews`'a yazmadan öğrenciye gitmez.
- Öğrenciye geri bildirim taslağı ayrı bir kutuda durur; öğretmen "Nota Aktar"
  demeden karneye geçmez.
- Injection denemesi, kavram yanılgısı, sınav bütünlüğü kaydı, dil uyarısı —
  hepsi **sinyal**, hiçbiri otomatik yaptırım değil.
- **Yapay Zekâ Karar Günlüğü** (§4.3) bu tezi artık *ispatlar*.

## 1.2 Çalışma zamanı mimarisi

```
Tarayıcı (vanilla JS, BUILD ADIMI YOK)
  public/index.html    1 KB  iskelet
  public/app.js      284 KB  4 rolün TÜM mantığı, tek dosya, 5.468 satır
  public/app.css      63 KB  tüm stiller
  public/mufredat/*   12 dosya · 606 MEB kazanımı
        │
        │ fetch  (yalnızca /api/ai/* ve /mufredat/* — başka sunucu çağrısı yok)
        ▼
Cloudflare Worker (Hono)
  src/index.ts         1 KB  giriş noktası, app.route("/api/ai", ai)
  src/routes/ai.ts    22 KB  ★ 7 AI ucu — Zod + hız sınırı + normalleştirme
  src/lib/prompts.ts  26 KB  ★ 6 model istemi — JÜRİYE GÖSTERİLECEK DOSYA
  src/lib/ai.ts       13 KB  sağlayıcı bağımsız çağrı + yedek + JSON onarımı
  src/lib/guards.ts    5 KB  saf yardımcılar (test edilebilir)
  src/schemas/ai.ts    6 KB  Zod şemaları (girdi + model çıktısı)
        │
        ▼
  env.AI ──▶ Workers AI · @cf/meta/llama-3.3-70b-instruct-fp8-fast   (BİRİNCİL)
        └──▶ (birincil düşerse) OpenAI · gpt-5.6-luna                (YEDEK)
```

**Neden vanilla JS ve tek dosya:** Build adımı yok, `wrangler deploy` tek
komutla yayınlıyor. Jüri demosunda kırılacak bir derleme zinciri yok. Bedeli:
284 KB'lık tek dosya — bu yüzden §6.3'teki kurallar var.

## 1.3 Dört rol, tek zincir

| Rol | Panel | Ne yapar |
|---|---|---|
| **İçerik Uzmanı** | 2 sekme | Kaynak metin yükler (yapıştır / .txt / .md / PDF), ders-sınıf-kazanım tanımlar, AI'ın ürettiği soruları düzenler ve **onaylar** |
| **Öğretmen** | 4 sekme | Havuzdan sınav kurar, rubrik tanımlar, AI puan önerilerini inceleyip **onaylar**, sınıf analitiğini görür |
| **Öğrenci** | 3 sekme | Sınavı çözer (geri sayımlı), yanıtları otomatik kaydedilir, öğretmen onayından sonra gerekçeli karnesini okur |
| **Eğitim Yöneticisi** | tek sayfa | Okul geneli tamamlanma, bekleyen onaylar, kazanım ısı haritası, **Yapay Zekâ Karar Günlüğü** |

Zincir kapanıyor: **içerik → sınav → çözüm → onay → analiz → yeni içerik.**
Analiz ekranında %60 altındaki kazanım için "tekrar sorusu üret" düğmesi
İçerik Uzmanı paneline döner.

## 1.4 Yedi AI ucu

Hepsi `POST` (yalnızca `/status` `GET`), hepsi Zod ile doğrulanır, hepsinde
dakika bazlı hız sınırı ve **prompt injection sertleştirmesi** vardır.

| Uç | Ne döndürür |
|---|---|
| `/api/ai/status` | Etkin sağlayıcı/model, yedek tanımlı mı |
| `/api/ai/generate-questions` | ÇSS + açık uçlu taslak; Bloom düzeyi, çeldirici gerekçeleri, `needsSource`, **`dilUyarisi`** |
| `/api/ai/evaluate` | Kriter bazında puan + gerekçe, güven skoru, `studentFeedback`, `injectionAttempt` |
| `/api/ai/rubric` | Soruya özgü rubrik taslağı (ağırlıklar %100'e normalleştirilir) |
| `/api/ai/sample-answers` | Farklı başarı düzeylerinde örnek yanıt (`simulated: true`) |
| `/api/ai/misconceptions` | Sınıfın yanıtlarında tekrarlayan kavram yanılgıları (öğrenci adı gönderilmez) |
| `/api/ai/outcome-alignment` | İçerik geçerliği: soru seçilen kazanımı ölçüyor mu (**bağımsız çağrı**) |

Ayrıca `GET /api/health` → `{ok, app, env}`.

## 1.5 Model sağlayıcısı ve yedek — GÜNCEL DURUM

```
Birincil : workers-ai · @cf/meta/llama-3.3-70b-instruct-fp8-fast
Yedek    : openai     · gpt-5.6-luna
```

**26 Ağustos'ta Cloudflare Workers Paid planına geçildi ($5/ay).** Bunun anlamı:
günlük 10.000 ücretsiz neuron **hâlâ var**, ama kota aşılınca istek **hata
vermiyor, faturalanıyor** ($0,011 / 1.000 neuron). Ücretsiz planda aynı istek
`4006` hatasıyla ölüyordu — bu 26 Ağustos'ta fiilen yaşandı ve sistem çalışmaz
hâle geldi (`PROGRESS.md` §16d).

**Yedek kaldırılmadı.** Artık kota için değil, **Cloudflare kesintisi / model
kaldırılması** sigortası. OpenAI hesabında ~$4,99 ön ödemeli kredi var
(≈309 tam demo turu). Otomatik yükleme **KAPALI** — sürpriz fatura riski yok.

**Geçiş sessiz değildir:** yanıtın `meta.fellBack` alanı ve arayüzdeki durum
çipi hangi modelin yanıtladığını yazar; Workers Logs'a `ai_fallback` olayı düşer.

> ⚠️ **Abonelik aylık yenilenir.** Yarışma bittiğinde (Eylül sonrası)
> kullanılmayacaksa iptal edilmeli.

## 1.6 🔴 Canlıda ne bağlı, ne bağlı değil (dürüstlük notu)

Bu ayrım **jüriye açıkça söylenmelidir** ve `README.md` ile `/mimari`
sayfasında da yazılıdır.

| Bileşen | Hedef mimari | Canlı demo |
|---|---|---|
| Cloudflare Workers + Hono | ✅ | ✅ **çalışıyor** |
| Workers AI (Workers **Paid**) | ✅ | ✅ **çalışıyor, kota duvarı yok** |
| Otomatik yedek sağlayıcı | ✅ | ✅ **çalışıyor** |
| MEB kazanım katalogları | ✅ | ✅ **606 kazanım, 12 dosya** |
| D1 (SQLite, 14 tablo) | ✅ | ❌ şema hazır, **yazım yok** |
| R2 nesne depolama | ✅ | ❌ bağlı değil (PDF istemcide işlenir) |
| Queues (asenkron AI) | ✅ | ❌ ücretsiz planda kullanılamaz |
| Better Auth | ✅ | ❌ rol geçişi arayüzden simüle edilir |

**Sebep teknik:** `d1_databases[].database_id` doldurulmadan `wrangler deploy`
başarısız olur. Bu yüzden **iki yapılandırma dosyası** var (§6.1).

---

# 2. Güncel Dosya Ağacı

**58 takipli dosya.** Boyutlar gerçek ölçümdür (26 Ağustos).

```
t3-olcme-degerlendirme/
│
├── AKTARIM.md              46 KB  bu dosya — devir özeti
├── PROGRESS.md            136 KB  ★ TEK DOĞRULUK KAYNAĞI (§0-§22)
├── README.md               36 KB  jüri odaklı tanıtım (rozetler, mermaid akış)
├── agents.md                7 KB  ★ ZORUNLU kurallar (HITL, mimari, sınırlar)
│
├── package.json             1 KB  bağımlılıklar + 16 npm script
├── package-lock.json      109 KB
├── tsconfig.json            0 KB  TypeScript strict
├── wrangler.jsonc           4 KB  ÜRETİM yapılandırması (D1+R2+Queues+AI)
├── wrangler.demo.jsonc      4 KB  ★ DEMO yapılandırması — KULLANILAN BU
├── schema.sql               8 KB  D1 şeması, 14 tablo (canlıda bağlı değil)
├── routes.ts                9 KB  tam rota iskeleti (referans; handler'lar TODO)
├── .gitattributes           0 KB  Linguist: dokümantasyon HTML'i kod sayılmasın
├── .gitignore               0 KB  .dev.vars, anahtar.txt, node_modules…
├── .dev.vars.example        0 KB  yerel sır şablonu (gerçeği .gitignore'da)
├── ANAHTAR-EKLE.bat         0 KB  yedek anahtarı doğrula + Cloudflare'e yükle
├── ANAHTAR-EKRAN.bat        0 KB  aynısı için tarayıcı ekranı (127.0.0.1)
│
├── src/
│   ├── index.ts             1 KB  Worker giriş noktası + /api/health
│   ├── routes/ai.ts        22 KB  ★ 7 AI ucu
│   ├── lib/prompts.ts      26 KB  ★ 6 model istemi (jüriye gösterilecek)
│   ├── lib/ai.ts           13 KB  sağlayıcı katmanı + yedek + JSON onarımı
│   ├── lib/guards.ts        5 KB  saf yardımcılar (hız sınırı, kaynak tespiti,
│   │                              yabancı alfabe denetimi) — TEST EDİLEBİLİR
│   └── schemas/ai.ts        6 KB  Zod şemaları
│
├── test/                          ★ 98 test, `npm test` ile koşar
│   ├── guards.test.ts       8 KB  47 test — kaynak tespiti, hız sınırı, DİL
│   ├── schemas.test.ts      7 KB  27 test — şema sınırları, normalleştirme
│   └── ai-lib.test.ts       4 KB  24 test — extractJson, sağlayıcı, BOM
│
├── public/
│   ├── index.html           1 KB  iskelet (marka: Mihenk)
│   ├── app.js             284 KB  ★ 4 rolün TÜM mantığı · 5.468 satır ·
│   │                              229 fonksiyon · öz-kontrol 154 ad denetler
│   ├── app.css             63 KB  tüm stiller
│   ├── _headers             1 KB  ★ güvenlik başlıkları (CSP dahil)
│   ├── mimari.html         51 KB  mimari dokümantasyonu (4 mermaid diyagram)
│   ├── mimari.js            1 KB  mermaid yükleyici (inline OLAMAZ — §6.3-7)
│   ├── privacy-policy.html 22 KB  KVKK aydınlatma metni
│   ├── 404.html             6 KB  özel hata sayfası
│   ├── robots.txt           0 KB  /api/ ve /internal/ disallow
│   └── mufredat/                  ★ 606 MEB ÖĞRENME ÇIKTISI — 12 dosya
│       ├── turkce-5.json   14 KB  80 kazanım
│       ├── turkce-6.json   16 KB  91
│       ├── turkce-7.json   17 KB  96   ← elle doğrulanmış referans
│       ├── turkce-8.json   17 KB  98
│       ├── matematik-5.json 6 KB  23
│       ├── matematik-6.json 6 KB  24
│       ├── matematik-7.json 7 KB  30
│       ├── matematik-8.json 6 KB  23
│       ├── fen-5.json       6 KB  27
│       ├── fen-6.json       9 KB  36
│       ├── fen-7.json       8 KB  35
│       └── fen-8.json      10 KB  43
│
├── tools/
│   ├── injection-test.py    5 KB  ★ 5 vektörlü güvenlik testi (tekrar koşulur)
│   ├── mufredat-cikar.py    5 KB  ★ PDF'ten kazanım çıkarımı
│   ├── mufredat-katalog-uret.py 6 KB ★ katalog dosyalarını üretir + doğrular
│   ├── check-jsonc.py       1 KB  JSONC doğrulayıcı (npm run check:config)
│   ├── anahtar-dogrula.mjs  5 KB  yedek anahtarı sağlayıcıya sorup CF'e yükler
│   ├── anahtar-ekran.mjs    9 KB  aynısı için yerel tarayıcı ekranı
│   └── test-gemini.mjs      2 KB  (eski) Gemini anahtarını yerelde sınar
│
├── seed/turkishmmlu/              dataset dönüştürme — DEMODA KULLANILMIYOR
│   ├── 01_learning_outcomes.sql
│   ├── convert_turkishmmlu.py
│   ├── import_summary.json
│   └── IMPORT_NOTES.md
│
└── .claude/launch.json      0 KB  dev server tanımı (port 8787)
```

**★ ile işaretliler**, değişiklik yapmadan önce mutlaka okunmalıdır.

## 2.1 Katalog dosyalarının biçimi

```json
{
  "ders": "Fen Bilimleri",
  "sinif": 5,
  "kaynak": "MEB Ortaokul Fen Bilimleri Dersi Öğretim Programı — 5. sınıf öğrenme çıktıları",
  "not": "uygunluk alanı ürünün kendi sınıflandırmasıdır, müfredatın parçası değildir…",
  "kazanimlar": [
    {
      "kod": "FB.5.1.1",
      "alan": "Fen Bilimleri",
      "metin": "Güneş'in yapısı ve dönme hareketi ile ilgili bilgi toplayabilme",
      "uygunluk": "performans",
      "grup": "1. Ünite · GÖKYÜZÜNDEKİ KOMŞULARIMIZ VE BİZ"
    }
  ]
}
```

- **`uygunluk`**: `yazili` (yazılı sınavla ölçülebilir) · `performans`
  (gözlem gerektirir) · `surec` (öğrenme sürecine aittir, sınav sorusu olmaz).
  **Bu ayrım ürünün kendi katkısıdır, müfredatın parçası değildir.**
- **`grup`**: seçicide başlık olarak kullanılır. Fen/Matematik'te **ünite**,
  Türkçe'de **beceri alanı** (Türkçe kodunda ünite yoktur — §5.4).

---

# 3. Veritabanı ve Veri Akışı

## 3.1 Veriler nerede tutuluyor

**Prototipte sunucuda hiçbir veri saklanmaz.** İki katmanlı istemci depolaması:

### Katman 1 — `localStorage` (tek anahtar: `t3-olcme-durum-v1`)

Kalıcı yazılan **33 üst düzey alan** (`KALICI_ALANLAR`, `public/app.js`):

```
role · teacherTab · studentTab · ceTab · genCount · ceForm · questions ·
rubrics · rubricSelectedQ · exam · answers · examStatus · currentQIndex ·
remainingSec · aiEvals · reviews · mcResults · remedial · integrity ·
outcomes · subjects · poolFilter · exams · activeExamId · students ·
activeStudentId · evalCache · misconceptions · alignment · sources ·
library · auditLog · auditDusen
```

> `state.katalog` **KALICI DEĞİLDİR** — bellekte tutulan bir önbellektir,
> sayfa yenilenince yeniden yüklenir.

### Katman 2 — IndexedDB (`t3-mufredat` / store `kitaplar`)

**Müfredat Kitaplığı**: yüklenen PDF'lerin sayfa metinleri. `state.library[]`
yalnızca **indeksi** tutar (ad, sayfa sayısı, karakter, ders, sınıf, tarih);
ağır veri IndexedDB'dedir.

**Neden ikiye ayrıldı:** Uygulamanın tüm durumu tek bir localStorage anahtarında
ve ~5 MB paylaşımlı kotada. 200 sayfalık bir kitabın metni 400-800 KB; birkaç
kitap kotayı doldurup `saveState()`'i bozardı — yani sorular, sınavlar ve
puanlar sessizce kaydedilmemeye başlardı. İndeksin localStorage'da kalması
mimari zorunluluktur: uygulamanın tamamı **senkron `renderAll()`** ile HTML
dizesi üretir; liste senkron veriden çizilmelidir.

> **Kota uyarısı:** `saveState()` eskiden kota hatasını **sessizce yutuyordu**.
> Artık `depoHatasi` doldurulur ve gövdeye sabit konumlu bir uyarı şeridi
> basılır (`renderDepoUyarisi`). Sessiz düşüş yasağı burada da geçerlidir.

### D1 şeması — hazır ama bağlı değil

`schema.sql`, 14 tablo: `schools · users · learning_outcomes ·
source_documents · source_document_outcomes · questions · rubrics · exams ·
exam_questions · exam_assignments · submissions · ai_evaluations ·
teacher_reviews · analytics_snapshots`

## 3.2 İki katmanlı oturum modeli (DİKKAT: burada kolay hata yapılır)

Aynı anda **çok sınav** ve **çok öğrenci** desteklenir:

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
**Okuma/yazma her zaman `readSession(sid)` / `writeSession(sid, …)` ile
yapılmalıdır**, doğrudan `state.answers` üzerinden değil — aksi hâlde yanlış
öğrencinin verisi okunur.

## 3.3 Kazanım kataloğu akışı (YENİ — §22)

```
Ders/Sınıf seçildi
   │
   ├─▶ katalogHazirla()  →  MUFREDAT_KATALOGLARI["Türkçe|7"]
   │                        fetch("/mufredat/turkce-7.json")
   │                        state.katalog[anahtar] = veri   (bellek önbelleği)
   │
   ├─▶ katalogKazanimlari()  →  seçiciye optgroup'lar hâlinde basılır
   │                            Fen/Mat: ünite · Türkçe: beceri alanı
   │                            varsayılan filtre: uygunluk === "yazili"
   │
   └─▶ kazanimSecildi(kod)  →  seçilen kazanım state.outcomes'a TAŞINIR
```

> 🔴 **KRİTİK TASARIM KARARI:** Katalog `OUTCOMES_LIST()`'e **karıştırılmaz**.
> O liste **ısı haritasının sütunlarını** üretiyor; katalog oraya dökülseydi
> 8. sınıf Türkçe'de **98 sütunlu, kullanılamaz** bir tablo çıkardı. Katalog
> yalnızca soru üretim seçicisinde görünür; öğretmen bir kazanım seçtiği anda
> o kazanım kalıcı listeye taşınır ve **ancak o zaman** ısı haritasına,
> filtrelere ve analitiğe girer. "Okulun çalıştığı kazanımlar" listesi
> kullanıldıkça büyür, baştan 606 kayıtla dolmaz.

## 3.4 Soru üretim akışı

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
   │      · dilUyarisi: gövde/şık/gerekçede Türkçe dışı alfabe var mı
   │
   └─▶ state.questions[] += { status: "ai_generated", srcId, needsSource,
                              dilUyarisi, uretenModel, … }
```

Onaylanınca `status: "approved"`, reddedilirse `status: "rejected"`.
**Her iki karar da Karar Günlüğü'ne yazılır.**

## 3.5 Değerlendirme akışı

```
Öğrenci yanıtı (answers[qid].text)
   │
   ├─▶ evalCacheKey(q, rubric, answerText)   — önbellek anahtarı
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
   │      + Karar Günlüğü: "degerlendirme_onerildi"
   │
   └─▶ Öğretmen onayı → state.reviews[qid] = { finalScore, comment,
                                                decision, aiScore }
           + Karar Günlüğü: "puan_karari" (AI önerisi ↔ nihai puan ↔ değişti mi)
           │
           └─▶ publishResults() → examStatus: "graded" → öğrenci karnesi
```

**Sessiz geri düşüş yasağı:** Gerçek model modunda çağrı başarısız olursa
sistem simülasyona düşüp sahte puan göstermez. Değerlendirme "yapılamadı"
işaretlenir; öğretmene "Yapay Zekâ ile Yeniden Dene" ve "Elle Puanla ve Onayla"
seçenekleri sunulur.

## 3.6 Uyaran metin (kaynak metin) akışı

Bir soru kaynak metne dayanıyorsa (`needsSource: true`), o metin **sınavda
öğrenciye soruyla birlikte gösterilir.** Türkçe okuma kazanımları metin olmadan
ölçülemez.

```
state.sources[] = [{ id, title, subject, grade, text, at }]
state.questions[i].srcId ──▶ kaynakBul(srcId)
   ├─ öğrenci sınav ekranı : kaynakBlokHtml(q, "student")  → metin AÇIK
   ├─ öğretmen inceleme    : kaynakBlokHtml(q, "review")   → katlanabilir
   └─ sınav kurma          : sinavKaynakUyarisiHtml(secili)
```

Kaynak silinmişse **sessizce metinsiz soru gösterilmez**; öğrenciye ve
öğretmene farklı, açık uyarı çıkar.

## 3.7 Gizlilik sınırları

- Öğrenci **adı hiçbir AI çağrısında gönderilmez.** Kavram yanılgısı
  kümelemede yanıtlar anonim ve numaralıdır.
- **Karar Günlüğü'nde de öğrenci adı yazılmaz** — yalnızca sistem içi numara
  ve sorunun ilk 80 karakteri.
- PDF dosyaları **istemcide** `pdf.js` ile çözümlenir; dosya sunucuya
  gönderilmez. Çıkarılan metin IndexedDB'de saklanır, cihazdan çıkmaz.
- Sınav bütünlüğü kaydında yapıştırılan metnin **içeriği** saklanmaz, yalnızca
  karakter sayısı tutulur.
- `agents.md` §7: öğrenci verisiyle ilgili her değişiklikte
  `public/privacy-policy.html` güncellenmek **zorundadır**.

---

# 4. Çözülen Son Sorunlar ve Mevcut Durum

26 Ağustos'ta **21 commit** atıldı (toplam 68). Ayrıntılar `PROGRESS.md`
§15-§22'de; burada özet.

## 4.1 🔴 Bulunan ve düzeltilen 7 GERÇEK HATA

Bunların **5'i demo günü ürünü kıracaktı.**

| # | Hata | Etkisi | Nasıl bulundu |
|---|---|---|---|
| 1 | **XSS — 13 yerde kaçırılmamış veri** | Kazanım kodu ve şık harfi `escapeHtml`'siz basılıyordu. DOM'a gerçek `<img>/<svg>/<iframe>` giriyordu; **yalnızca CSP engelliyordu.** Deponun kendi notu "asıl savunma escapeHtml, CSP ikinci katman" diyor — tersine dönmüştü | Geniş denetim |
| 2 | **Öğrenci karnesi çöküyordu** | Öğretmen AI olmadan elle puanlarsa `aiEvals[qid]` hiç oluşmuyor, karne `ev.breakdown` okuyup patlıyordu. Öğrenci karnesini **hiç açamıyordu** | Geniş denetim |
| 3 | **`max_tokens` GPT-5 ailesinde reddediliyor** | Yedek OpenAI'a alınıp test edilmeseydi, Workers AI kotası dolduğu an yedek de **her çağrıda 400** dönecekti — yani demo ortasında | Anahtar doğrulanırken |
| 4 | **WCAG 2.5.8 — 9 dokunma hedefi ihlali** | Soru seçme kutuları 13×13'tü; **tabletle sınav kurulamıyordu**. Belgede "ihlal 0" yazıyordu | Geniş denetim |
| 5 | **`ANAHTAR-EKLE.bat` hiç çalışmıyordu** | `node toolsnahtar-dogrula.mjs` — ters eğik çizgi kaçış dizisi olarak yutulmuş | Anahtar eklerken |
| 6 | **Açılışta uyumsuz kazanım seçimi** | `outcomeSeciminiTazele()` yalnızca ders/sınıf değişince çağrılıyordu; localStorage'dan gelen uyumsuz seçim (Türkçe 7 + `FEN.7.1.2`) hiç düzeltilmiyordu | Kullanıcı bildirdi |
| 7 | **Yanlış beyan** | AI hiç kullanılmadığı hâlde öğrenciye *"bu puan yapay zekâ önerisi onaylanarak kesinleşti"* deniyordu — HITL şeffaflığına aykırı | Geniş denetim |

## 4.2 Eklenen özellikler

| Özellik | Ne yapar |
|---|---|
| **Müfredat Kitaplığı** | Yüklenen PDF artık kalıcı (IndexedDB). Öğretmen bir kez yükler, her oturumda yeniden yüklemez. 36 sayfalık gerçek PDF ile uçtan uca doğrulandı |
| **606 MEB kazanımı** | 3 ders × 4 sınıf, 12 katalog. Ders/sınıf seçilince kendiliğinden gelir (§4.4) |
| **"Konu ve Kazanım" seçici** | İki katmanlı: konu `optgroup` başlığı, kazanım seçenek. Ayrı alan AÇILMADI (§5.4) |
| **Yapay Zekâ Karar Günlüğü** | HITL tezinin ispatı (§4.3) |
| **Dil uyarısı** | Model Türkçe metne Kiril harfi karıştırırsa İçerik Uzmanına bildirilir (ölçüldü: ~10 soruda 1) |
| **Model durum çipi** | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` yerine `● Gerçek model · Llama 3.3 70B`; tıklayınca tam kimlik + yedek durumu |
| **Ürün adı: Mihenk** | "Onay Döngüsü" bir süreç adıydı; alt başlık artık ürünün tezi |

## 4.3 ★ Yapay Zekâ Karar Günlüğü (denetim izi)

Ürünün tezi *"yapay zekâ önerir, insan karar verir"* — bu tez ekranda
görünüyordu ama **ispatlanmıyordu.** Artık her adım kayıtlı:

```
soru_uretildi ──▶ soru_onaylandi | soru_reddedildi
degerlendirme_onerildi | degerlendirme_basarisiz ──▶ puan_karari
geri_bildirim_aktarildi
```

Her kayıt: zaman damgası · olay · **aktör** · model adı · yedeğe düşüldü mü ·
AI önerisi · insanın verdiği nihai puan · **değiştirilip değiştirilmediği**.

Eğitim Yöneticisi panelinde özet + son 25 kayıt + **CSV/JSON indirme**.
Özetin en değerli satırı:

> *"Öğretmen, yapay zekâ puan önerilerinin **%N**'ini değiştirdi. Bu oran
> sıfırsa insan onayı biçimsel kalıyor demektir; çok yüksekse modelin rubriğe
> uyumu gözden geçirilmelidir."*

En fazla **500 kayıt**; sınır aşılırsa en eski düşer ve bu **ekranda açıkça
yazar**. `calibration()` (§11b) ile çakışmaz, tamamlar.

## 4.4 ★ MEB müfredatı — nasıl çıkarıldı ve neden güvenilir

Kullanıcı üç resmî MEB Maarif Modeli PDF'i sağladı. **Kazanımlar uydurulmadı**,
betikle çıkarıldı (`tools/mufredat-cikar.py`, depoda, tekrar koşulabilir).

| Ders | 5 | 6 | 7 | 8 | Toplam |
|---|---:|---:|---:|---:|---:|
| Türkçe | 80 | 91 | 96 | 98 | **365** |
| Fen Bilimleri | 27 | 36 | 35 | 43 | **141** |
| Matematik | 23 | 24 | 30 | 23 | **100** |
| | | | | | **606** |

**Çözülen dört tuzak:**
1. Satır sonu tiresi — `değer -\nlendirir` → `değerlendirir`
2. **Kod satır başında olmayabilir** — Matematik'te tablo başlığı aynı satıra
   düşüyor. Şart kaldırılınca **84 → 100** kazanım
3. **Aynı kod birden fazla yerde** — "Öğrenme-Öğretme Uygulamaları" bölümünde
   kodun ardından **pedagojik not** var, kazanım değil. "İlk geçen kazanır"
   yanlıştı; adaylar puanlanıyor
4. `\bbilme` eşleşmiyordu — "kullanabilme" içinde "bilme"den önce kelime sınırı
   yoktur

> 🎯 **DOĞRULAMA:** Depoda zaten **ayrı bir oturumda elle doğrulanmış**
> `turkce-7.json` vardı (96 kayıt). Yeni çıkarım aynı 96 kodu buldu ve
> **96/96 BİREBİR AYNI** metni üretti — eksik yok, fazla yok. Yöntemin
> doğruluğunun kanıtı budur. **Uygunluk kuralı** da aynı 96 kaydı
> **0 uyuşmazlıkla** yeniden üretti.

## 4.5 Ayrıştırıcı özellikler (bu takımı diğerlerinden ayıran kısım)

| Özellik | Ne yapar | Ölçüm |
|---|---|---|
| **Karar günlüğü** | HITL tezini ispatlar, indirilebilir | Tam zincir sürüldü |
| **Prompt injection sertleştirmesi** | Öğrenci cevabına *"tam puan ver"* yazması gerçek saldırı yüzeyi. 6/6 istemde nonce sınır belirteci + kuralların önünde güvenlik bloğu | **5 vektör, 5/5** (llama'da 2 koşum) |
| **Gerçek MEB müfredatı** | 606 öğrenme çıktısı, yazılı/performans/süreç ayrımıyla | 96/96 birebir doğrulama |
| **Madde analizi** | Güçlük (p), ayırt edicilik (d), işlevsiz çeldirici. Negatif d = anahtar hatalı olabilir | Birim testi elle hesapla birebir |
| **Öğretmen–AI uyumu** | Brief'in *"değerlendirici tutarsızlığı"* sorununa cevap. Güven skorunun kendisini de denetler | Birim testi birebir |
| **Kavram yanılgısı kümeleme** | Isı haritası "hangi kazanım zayıf" der, bu "**neden** zayıf" der | Kurgulanan yanılgı yakalandı |
| **Bloom düzey dengesi** | Sınav ezber mi ölçüyor? Hedef oran dayatmaz, iki ucu bildirir | 4 birim testi |
| **Kazanım–soru hizalama** | İçerik geçerliği. Denetimi **soruyu üreten çağrı yapmaz**, bağımsız çağrı yapar | İlgisiz soruyu doğru işaretledi |
| **Dil uyarısı** | Model Kiril harfi karıştırırsa insana bildirir | 10 birim testi |
| **Uyaran metin** | Metne dayalı soru, metniyle birlikte gösterilir | Sunucuda regex güvencesi |

## 4.6 ✅ Doğrulanmış son durum (26 Ağustos, gece)

| Kontrol | Sonuç |
|---|---|
| `npm run lint` (tsc --noEmit) | **temiz** |
| `npm test` | **98/98 geçti** (3 dosya) |
| `npm run check:config` | **2/2 geçerli** |
| `node --check public/app.js` | geçerli |
| Açılış öz-kontrolü | temiz (**154 fonksiyon** denetleniyor) |
| 4 rol × tüm sekmeler | render hatası **0**, konsol hatası **0** |
| **XSS** (20 alan × 4 payload × 10 sekme) | enjekte eleman **0**, tetiklenme **0** |
| **Prompt injection** (llama, 5 vektör × 2 koşum) | **5/5 · 5/5** |
| `injectionAttempt` güvenilirliği | 10 saldırı gözleminin **10'u** doğru |
| Erişilebilirlik | bağlanmamış label **0** · adsız düğme **0** · 24×24 altı **0** |
| Mobil (375 px) | 10 rol/sekme, yatay taşma **0** |
| Canlı statik yollar | tümü **200** · 12 katalog dosyası **200** |
| API hata sözleşmesi | 7 senaryo, hepsi `{error, message}` |
| Arıza davranışı (AI 502) | sahte veri **YOK**, dürüst hata, başarısız değerlendirme önbelleğe **alınmadı** |

**Ölçülen süreler (canlı, llama-3.3-70b):** soru üretimi ~7,2 sn ·
değerlendirme 6,0-8,3 sn (bir ölçümde 19,9 sn) · rubrik ~5,0 sn · örnek
yanıtlar ~6,8 sn · kavram yanılgısı ~4,2 sn · hizalama ~2,7 sn ·
önbellekten **0-6 ms**.

> ⚠️ Değişkenlik yüksek: aynı uç 6,0 sn ile 19,9 sn arasında ölçüldü. Demo
> senaryosu ve değerlendirme önbelleği bu yüzden önemlidir.

## 4.7 Maliyet gerçeği

| Sağlayıcı | Tam demo turu (1 sınıf, 6 öğrenci) |
|---|---:|
| Workers AI llama-3.3-70b (kota üstü) | **$0,0116** |
| OpenAI gpt-5.6-luna (yedek) | $0,0162 |

- Günde 10.000 neuron ücretsiz ≈ **9-10 tur**; üstü faturalanır
- Workers Paid: **$5/ay taban** + kullanım
- Gerçekçi okul kullanımı çok ucuz; **maliyet bu ölçekte karar değişkeni değil**

---

# 5. Kalan Eksikler ve İlk Görev

## 5.1 ★ KULLANICININ (İNSANIN) YAPACAĞI İŞLER — kod dışı

| # | İş | Durum | Not |
|---|---|---|---|
| 1 | **İş Modeli Kanvası** | ekip arkadaşlarında | Zorunlu teslimat |
| 2 | **Pitch Deck** | ekip arkadaşlarında | ~15 ayrıştırıcı özelliğin hiçbiri deck'te yok |
| 3 | **Tanıtım & Demo Videosu** | ekip arkadaşlarında | Zorunlu teslimat |
| 4 | Deck'te **"hile önleyici kontroller"** ifadesi | 🔴 yanlış | Doğrusu: **"sınav bütünlüğü kaydı — öğretmene şeffaf sinyal"**. Üründe engelleme yok, kayıt var |
| 5 | **Ekran görüntüleri** | README'de ürün görseli yok | Asistanın tarayıcı aracı dosyaya kaydedemiyor; kullanıcı alıp `docs/` altına koyarsa asistan yerleştirir |
| 6 | **`v-demo` tag'i** | atılmadı | `agents.md` §8: sunumdan 24 saat önce (≈4 Eylül) |
| 7 | **Workers Paid iptali** | — | Yarışma sonrası, aylık $5 |

## 5.2 ★★ İLK GÖREV — YENİ OTURUMDA BURADAN BAŞLA

> **Kullanıcının kendi ifadesiyle "en çok endişelendiren kısım":**
> **öğretmenin kendi metnini / PDF'ini ekleyip soru hazırladığı bölüm.**

**Kullanıcının sözleri:** *"öğretmenin kendi metnini ya da pdfini ekleyip soru
hazırladığı kısım var. o kısım beni en çok endişelendiren kısım. çünkü
kullanışlı bişi yapmamız gerekiyor önerilerine açığım. öğretmenin eklediği pdf
bi köşede kalabilir mesela. o konuda iyice bi düşün sonrasında değişikliklerini
uygula"*

**Tespit edilen sorun (asistanın analizi, kullanıcıya henüz sunulmadı):**
Kaynak metin ile kazanım **birbirinden kopuk**. Öğretmen PDF yüklüyor, ayrıca
kazanım seçiyor; ikisinin uyup uymadığını sistem söylemiyor. Ayrıca seçilen
kitap/sayfa aralığı formda görsel olarak kayboluyor.

**Önerilecek yön (kullanıcı onayı alınmadı):** Kaynağı **kalıcı bir bağlam
çubuğuna** almak — seçilen kitap + sayfa aralığı + konu/kazanım hep görünür
kalsın, form onların altında çalışsın. Kullanıcının "bir köşede kalabilir"
fikrine yakın ama bir adım ötesi.

**ÖNCE ÖNERİYİ ARTILARI-EKSİLERİYLE SUN, ONAY AL, SONRA UYGULA.** Kullanıcı
bu çalışma biçimini açıkça istedi (§6.4-1).

## 5.3 Kod tarafında bilinçli bırakılanlar (finale, 5-6 Eylül)

Hiçbiri demoyu engellemez. Öncelik sırasıyla:

| # | Eksik | Not |
|---|---|---|
| 1 | **Hız sınırı dağıtık değil** | Sayaç bellek içi ve her isolate için ayrı. **Ölçüldü:** canlıda 7 istek de 200 döndü, sınır hiç tetiklenmedi. Birim testler fonksiyonun doğru olduğunu kanıtlıyor. Pratik koruma: ön ödemeli kredi + otomatik yükleme kapalı. Üretimde D1/KV'ye taşınmalı |
| 2 | **CSP'de `style-src 'unsafe-inline'`** | `app.js` **86 yerde** inline `style="…"` kullanıyor. Stiller sınıflara taşınırsa bu izin kaldırılabilir |
| 3 | Isı haritasındaki **"(örnek)" satırları** | Karşılaştırma sınıfları (6-A, 8-B, 8-C) demo verisi. Arayüzde "(örnek)" etiketli — yanıltma yok |
| 4 | **Maliyet şeffaflığı paneli** | "Bu sınav kaç kuruşa mal oldu" |
| 5 | **Soru havuzu benzerlik denetimi** | Mükerrer soru yakalar |
| 6 | **Öğrenci erişilebilirliği** | Süre uzatma, disleksi dostu font — kapsayıcılık, jüride iyi durur |
| 7 | D1 kalıcı yazım · R2 · Queues · Better Auth | Bilinçli kapsam kararı (`PROGRESS.md` §6) |

## 5.4 Reddedilmiş / kapatılmış işler (tekrar önerilmemeli)

| İş | Neden |
|---|---|
| **Ayrı "Konu" alanı** | Konu bağımsız bir seçim değil; her kazanım tam olarak bir konuya ait. Ayrı alan §14a'daki ders/sınıf/kazanım uyuşmazlığını konu düzeyinde tekrarlardı. Çözüm: konu, seçicinin **içinde** `optgroup` başlığı |
| **Türkçe'ye tema/ünite alanı** | **Türkçe kodunda ünite YOKTUR.** Temalar kazanımlara diktir — aynı okuma kazanımı her temada çalışılır. Tema dayatmak müfredatta olmayan yapı uydurmak olurdu |
| **`gpt-5-nano` kullanımı** | Test edildi: 3 uçta da HTTP 502, **boş yanıt**. Sebep ölçüldü: akıl yürüten modellerde `max_completion_tokens` düşünme tokenlarını da sayıyor; nano bütçeyi tüketip içeriği boş bırakıyor |
| **Zincir yedek (WorkersAI→Gemini→OpenAI)** | Workers Paid ile kota duvarı kalktığı için gereksizleşti |
| **Gemini yedek** | Ücretsiz katman **günde 20 istek**; bir tam tur 11 istek → günde ~1,8 tur. Emniyet ağı değildi |
| **Hazır soru bankası entegrasyonu** | Ana değer önerisiyle çelişiyor: ürün "AI soru üretiyor" diyor; hazır havuz jüriye *"AI'a ne gerek var?"* dedirtir |
| **`sorular.json` düzeltme** | 85 kaydın %46'sında iki sütun birleşmiş, hiçbir kayıtta doğru cevap yok. Koordinat bilgisi kayıp |
| **Modelden "kendi kendine yeten soru üret" istemek** | Türkçe okuma kazanımlarını imkânsız kılardı. Doğru çözüm uyaran metin oldu |
| **Türkçe başlıkları küçük harfe çevirme** | Denendi: `ELEKTRİĞİN İLETİMİ` → `Elektriğin I` diye bozdu (İ/I/ı/i tuzağı). Müfredattaki resmî hâl korunuyor |

---

# 6. Özel Kurallar

## 6.1 Çalıştırma ve sürümler

```bash
npm install
npx wrangler login          # bir kez
npm run dev:demo            # http://localhost:8787
npm run deploy:demo         # ★ CANLIYA AL (demo yapılandırması)
npm run lint                # tsc --noEmit
npm test                    # vitest run — 98 test
npm run check:config        # JSONC doğrula (yapılandırma değiştiyse ZORUNLU)
python tools/injection-test.py <taban-url>   # güvenlik testi
```

> ⚠️ **`npm run deploy` (üretim) DEĞİL, `npm run deploy:demo` kullanılır.**
> Üretim yapılandırması D1+R2+Queues bağlar ve deploy başarısız olur.

| Bağımlılık | package.json | Kurulu gerçek |
|---|---|---|
| Node | `>=18` | **24.19.0** |
| npm | — | 11.17.0 |
| hono | `^4.6.14` | **4.13.4** |
| zod | `^3.24.1` | **3.25.76** |
| **wrangler** | `^4.125.0` | **4.125.0** |
| vitest | `^2.1.8` | **2.1.9** |
| typescript | `^5.7.2` | **5.9.3** |
| @cloudflare/workers-types | `^5.20260825.1` | — |
| @hono/zod-validator | `^0.4.2` | — |

**Wrangler 4 şarttır, 3 değil:** `assets.run_worker_first` dizi biçimi
Wrangler 4 gerektiriyor. Bu yüzden `@cloudflare/workers-types` da 5 olmalı.
`@cloudflare/vitest-pool-workers` **kaldırıldı** — Wrangler 4 ile çözülemez
peer çakışması yaratıyordu. Testler düz `vitest` ile Node altında koşuyor;
**bu yüzden test edilecek kod Cloudflare çalışma zamanına bağlı olmamalıdır**
(bkz. `src/lib/guards.ts`).

`better-auth`, `kysely`, `kysely-d1` bağımlılıkları duruyor ama **kullanılmıyor**
(hedef mimarinin parçası).

**MODEL EĞİTİLMEDİ.** Hazır bir model kullanılıyor; yapılan iş onu rubrik ve
kaynak kısıtlarına, şema doğrulamasına ve insan onay zincirine tabi kılmaktır.
Jüri sorarsa cevap `PROGRESS.md` §7f'de hazır.

## 6.2 Mimari kurallar (`agents.md` özeti — BAĞLAYICIDIR)

- **§1 HITL değiştirilemez.** Otomatik onay eşiği eklenemez. Bir PR öğretmen
  onayını bypass ediyorsa gerekçesi ne olursa olsun reddedilir.
- Her `POST`/`PATCH` gövdesi **Zod** ile doğrulanır. Doğrulamasız
  `c.req.json()` code review'da otomatik reddedilir.
- Her hata yanıtı `{ "error": "<kısa_kod>", "message": "…" }` biçiminde döner.
  Zod hataları `onInvalid` kancasıyla bu biçime normalleştirilir.
- `max_tokens` her model çağrısında **açıkça** verilir. Sınırsız üretim isteği
  reddedilir. **GPT-5 ailesinde alan adı `max_completion_tokens`'tır** —
  `callOpenAiUyumlu` bunu uyarlamalı olarak halleder.
- Kaynak metin **6.000 karakterle** sınırlı (`MAX_SOURCE_CHARS`). Aşılırsa
  sessizce kırpılmaz, hata döner.
- Her AI ucunda **dakika bazlı hız sınırı** vardır: soru üretimi/rubrik/örnek
  yanıt **5/dk**, değerlendirme **45/dk** (bir sınıfın tamamı meşru olarak
  değerlendirilir).
- D1'e string birleştirmeyle SQL yazılmaz; `db.prepare(…).bind(…)` kullanılır.
- Sırlar `wrangler secret put` ile yönetilir, **koda veya depoya asla girmez.**
  `.dev.vars` ve `anahtar.txt` `.gitignore`'da.
- Öğrenci verisiyle ilgili her değişiklikte `public/privacy-policy.html`
  güncellenir (§7).
- `main` her zaman deploy edilebilir kalır. Commit mesajları Conventional
  Commits (`feat:` `fix:` `docs:` `sec:` `test:` `chore:`).

## 6.3 ★★ BU PROJEYE ÖZGÜ, SERT ÖĞRENİLMİŞ DERSLER

Bunların her biri **gerçekten yaşanmış bir hatanın** sonucudur.

**1. `public/app.js` 284 KB — blok değiştirirken SINIRLARI DOĞRULA.**
Bir yeniden yazımda `critRowHtml` ile `teacherTab3Html` arasındaki aralık
fazladan 4 fonksiyon kapsadı ve onlar silindi; öğretmen sekmesi canlıda
kırıldı. Bu yüzden dosya başında **öz-kontrol** var: **154 fonksiyonun**
varlığını denetler, eksikse ekranda kırmızı uyarı basar.
**Yeni fonksiyon eklediysen `selfCheck` listesine eklemeyi unutma.**

**2. CSS sınıflarını kapsayıcıya bağlı tanımlama.**
`.opt-row` yalnızca `.q-card` içinde tanımlıydı; öğrenci sınav ekranında
kullanıldığında hiç stil almadı (şık harfi metne yapıştı). Aynı hata `.cv-warn`
ile tekrarlanmak üzereydi. Sonradan eklenen tüm sınıflar (`.kit-*`, `.au-*`,
`.dil-uyari`, `.ai-chip`, `.aim-*`, `.empty-rich`, `.depo-uyari`, `.ia-*`,
`.cal-*`, `.mis-*`, `.kat-*`, `.bl-*`, `.al-*`, `.src-*`, `.fb-draft`,
`.inj-warn`, `.oc-*`) **bilinçli olarak bağımsızdır.**

**3. Metin girdilerinde `renderAll()` çağırma — odak kaybolur.**
Açık uçlu yanıtlar bir dönem hiç kaydedilmiyordu; "Kaydedildi ✓" göstergesi
tamamen görseldi. Çözüm: `saveSoon()` (400 ms geciktirmeli kayıt).
"Nota Aktar" düğmesi de bu yüzden `renderAll` çağırmaz, DOM'u doğrudan günceller.

**4. Prompt'taki örnek değerler kopyalanır.**
İstemdeki `"confidence": 0.72` örneği yüzünden model her yanıta 0.72 yazıyordu
ve güven skoruna göre sıralama işlevsizdi. **Örneklere sabit sayı koyma.**

**5. SESSİZ GERİ DÜŞÜŞ YASAK.**
Model çağrısı başarısız olursa simülasyona düşüp sahte çıktıyı "AI üretti" diye
gösterme. Kullanıcının ilk şikâyeti buydu. Ne olduğu **ekranda yazar:** yedek
model kullanıldıysa, sonuç önbellekten geldiyse, veri simüleyse, depolama
başarısızsa, günlükten kayıt düştüyse.

**6. Model çıktısı güvenilmezdir — sunucuda normalleştir.**
Şema doğrulaması yeterli değil. Örnekler: `studentCount` analiz edilen yanıt
sayısını aşamaz; hizalama önerisi aday listesinde yoksa temizlenir;
`needsSource` gövdeden deterministik olarak da denetlenir; **Kiril harfi
sızması** tespit edilip insana bildirilir.

**7. İnline module script CSP ile çalışmaz.**
`unsafe-inline` izni inline `<script type="module">` için **geçersizdir**.
`mimari.html`'in yükleyicisi bu yüzden `mimari.js`'e taşındı.

**8. JSONC'u regex ile ayrıştırma.** `//` dizisi URL'lerin içinde de geçer.
`npm run check:config` kullan. Bu dosyada daha önce sondaki virgül deploy'u kırdı.

**9. Yama dosyaya yazılmadan hata verirse DUR.**
Sonraki adımlar o değişikliklere bağımlı kod yazmasın.

**10. Hız sınırı isolate başınadır.** Ölçüldü: canlıda hiç tetiklenmiyor
(§5.3-1). Jüri sorarsa dürüst cevap: *"tek isolate içinde çalışır, üretimde
D1/KV'ye taşınır."*

**11. 🆕 KAÇIŞ DİZİSİ TUZAĞI — bu oturumda ÜÇ KEZ yaşandı.**
`printf` ve Python heredoc içinde `\n`, `\a`, `\t` **gerçek karaktere dönüşür**:
- `ANAHTAR-EKLE.bat`'ta `tools\anahtar` → `toolsnahtar` oldu ve dosya **hiç
  çalışmadı** (hatanın orijinal kaynağı da buydu)
- Python ile JS yazarken `\\n` gerçek satır sonuna dönüşüp sözdizimini bozdu
**Dosyaya kod yazarken `Write` aracını kullan**, kabuk kaçışına güvenme.

**12. 🆕 Bir alanın "her zaman dolu" olduğunu VARSAYMA.**
Bu kod tabanında iki kez yanlış çıktı: `mcResults[qid].correct` ve
`aiEvals[qid].breakdown`. İkisi de öğrenci karnesini **çökertti**.

**13. 🆕 "İhlal 0" gibi iddiaları tekrarlanabilir betikle ölç.**
Belgede "WCAG 2.5.8 ihlali 0" yazıyordu; ölçüldüğünde **9 ihlal** çıktı.
Önceki tarama onay kutularını hiç kapsamamıştı.

**14. 🆕 Türkçe büyük/küçük harf dönüşümü tehlikelidir.**
`İ/I/ı/i` tuzağı: `ELEKTRİĞİN İLETİMİ` → `Elektriğin I`. Gerekmedikçe yapma.

**15. 🆕 Test ölçütünün kendisi hatalı olabilir.**
Injection testinin 3. vektörü `0 < puan < tavan` istiyordu; temiz cevabı zaten
tam puanla değerlendiren bir modelde bu ölçüt **asla sağlanamaz**. Ölçüt
"temiz cevabın puanını aşmasın" olarak düzeltildi.

## 6.4 ★★ KULLANICININ AÇIKÇA İSTEDİĞİ ÇALIŞMA BİÇİMİ

1. **Önce kontrol, sonra işlem.** Önemli değişikliklerde önce riskleri listele,
   önlemini al, sonra uygula. *"Hata istemem."*
2. **Rasyonel ol, karşı çık.** Yanlış bir şey görürsen söyle; katılmıyorsan
   gerekçesiyle itiraz et. Kullanıcı bunu defalarca istedi ve **itiraz ettiğinde
   memnun oldu** (ör. birincil modeli değiştirme önerisine karşı çıkması doğruydu).
3. **UYDURMA.** Fiyat, limit, sürüm, müfredat gibi bilgileri hafızadan verme —
   kaynağa bak. Bu projede "anahtar AIza ile başlar" varsayımı yanlış çıktı ve
   kullanıcıyı boşuna uğraştırdı.
4. **Her değişikliği test et, ölçtüğün sayıları raporla, sonra commit et.**
5. **`PROGRESS.md`'yi her adımda güncel tut** — bağlam kaybına karşı tek sigorta.
6. **İşlem öncesi tahmini süre (ETA) ver.** Kullanıcının kalıcı tercihi.
7. **Türkçe konuş.** Kullanıcıya görünen metinler Türkçe, kod içi adlar İngilizce.
8. **Madde madde plan sun, artı-eksi düşün, sonra uygula.** Kullanıcı birden
   fazla kez bunu açıkça istedi.
9. **Kullanıcı ürünü elle kullanırken bulduğu hatalar en değerlileridir.**
   Bu projedeki en ciddi düzeltmelerin çoğu oradan çıktı (§14c, §15a, §22b, §22g).

## 6.5 Yedek sağlayıcı anahtarını değiştirme

Anahtar **koda girmez**. İki yol:

```bash
# 1) Doğrula + yükle (anahtar.txt oluştur, içine yapıştır)
ANAHTAR-EKLE.bat              # OpenAI (varsayılan)
ANAHTAR-EKLE.bat gemini       # Gemini

# 2) Tarayıcı ekranı (anahtar.txt gerekmez)
ANAHTAR-EKRAN.bat             # http://127.0.0.1:8799
```

Araç anahtarı **önce sağlayıcıya sorar**; geçersizse Cloudflare'e **yüklemez**.
Her durumda `anahtar.txt` silinir. Anahtar ekrana tam yazılmaz.

Elle: `npx wrangler secret put AI_FALLBACK_API_KEY -c wrangler.demo.jsonc`

---

## Okuma sırası (yeni asistan için)

1. **Bu dosya** (§5.2 İlk Görev'e ve §6.3 / §6.4'e özellikle dikkat)
2. `agents.md` — bağlayıcı kurallar
3. `PROGRESS.md` §17 → §22 (en yeni; §22 bugünün tamamı)
4. `src/lib/prompts.ts` — ürünün kalbi, jüriye gösterilen dosya
5. `src/routes/ai.ts` → `src/schemas/ai.ts` → `src/lib/ai.ts` → `src/lib/guards.ts`
6. `public/app.js` — **yalnızca değiştireceğin bölümü**, sınırlarını doğrulayarak

## Demo günü kontrol listesi

1. `npm run lint` · `npm test` · `npm run check:config` → hepsi temiz mi?
2. `curl <taban>/api/ai/status` → `ready: true` ve beklenen model mi?
3. İlk gerçek çağrıda `meta.fellBack` **false** mu? (true ise birincil düşmüş)
4. `python tools/injection-test.py <taban-url>` → 5/5 mi?
5. Workers Logs açık mı (canlı sorgu/hata göstermek için)?
6. `/privacy-policy` ve `/robots.txt` erişilebiliyor mu?
7. `v-demo` tag'i atıldı mı? (sunumdan 24 saat önce)
8. Demo senaryosu yüklenip 4 rol hızlıca gezildi mi?
