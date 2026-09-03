# PROJE AKTARIM DOKÜMANI — MİHENK
## T3 Vakfı Bursiyer Yapay Zekâ Creathon — Problem 2 · Takım BİES

> **Bu dokümanı okuyan yapay zekâ asistanına:**
>
> 1. **Kodun tamamı GitHub'dadır**, bu dokümana gömülmemiştir. Bilinçli bir
>    karardır: `public/app.js` tek başına **378 KB / 6.982 satır**; sohbete
>    sığdırılmaya çalışılırsa model kaçınılmaz olarak kısaltır veya
>    hatırlamadığı yeri uydurur. Bu projede bir kez yaşandı (`PROGRESS.md` §5).
>    ```bash
>    git clone https://github.com/EsatKaratas/mihenk
>    cd mihenk && npm install
>    ```
> 2. **`PROGRESS.md` tek doğruluk kaynağıdır** (§0-§27). Bu dosya bir özettir;
>    çelişki görürsen `PROGRESS.md`'ye güven.
> 3. **`agents.md` oturum boyunca bağlayıcı kısıtlardır.** Özellikle §1
>    (Human-in-the-Loop) hiçbir gerekçeyle esnetilemez.
> 4. 🔴 **İLK GÖREV ARTIK `PROGRESS.md` §27'DİR.** Orada 13 maddelik, kök
>    nedenleri ölçülmüş, dosya:satır işaretçileri verilmiş bir iş listesi var.
>    Kullanıcı bu maddeleri **sırayla ve tek tek** yapmak istiyor.
>    Aşağıdaki §5.2 (eski ilk görev) **tamamlanmıştır**, tarihsel kayıttır.
> 5. Kullanıcıya görünen tüm metinler **Türkçe**, kod içindeki adlar İngilizce.
> 6. **§6.4'teki çalışma biçimi kurallarını oku.** Kullanıcı bunları açıkça
>    istedi; uyulmadığında rahatsız oluyor.
> 7. **§6.5'teki "yanlış alarm" dersini oku — EN ÖNEMLİ MADDE.** Bu proje
>    boyunca **on üç kez**, asistanın kendi test aracının kusuru ürün hatası
>    sanıldı. Bir bulguyu bildirmeden önce **ölçütün kendisini doğrula.**
> 8. Ölçmediğin hiçbir sayıyı yazma. Fiyat, sürüm, limit, müfredat — hepsi
>    kaynağa bakılarak verilir (§6.4-3).
>
> **Doküman tarihi:** 3 Eylül 2026 · **Teslim:** yapıldı (27 Ağustos) ·
> **Final sunum:** 5-6 Eylül 2026, BAU Beşiktaş

| Ne | Nerede |
|---|---|
| **Canlı sistem** | https://mihenk.bies.workers.dev  ← **birincil**<br>eski adres de çalışıyor: https://mihenk.bies.workers.dev (başvuru bu adresle yapıldı, **silinmedi**) |
| Mimari dokümantasyonu | `/mimari` (aynı alan adında) |
| Gizlilik / KVKK | `/privacy-policy` |
| Depo (public) | https://github.com/EsatKaratas/mihenk |
| Yerel klasör | `C:\Users\pc\t3-olcme-degerlendirme` |
| Cloudflare hesabı | karatasesat@hotmail.com · account id `8f038be6be2c6e5ad71da437d444584a` |
| Takım BİES | Esat Talha Karataş · İrem Yazıcı · Zeynep Sude Demir · Burak Özçelik |
| Son commit | `a1eded6` · etiketler `v1.0-teslim`, `v1.1-basvuru` (**`v-demo` HENÜZ ATILMADI** — bkz. §5.6) |
| 🔴 **SIRADAKİ İŞ** | **`PROGRESS.md` §28s'ten sonrası.** Esat'ın 7 maddesi + 8 maddelik ikinci liste 3 Eylül'de bitti. Sude ve Burak'ın 7'şer maddesi hâlâ onlardadır ve BİRLEŞTİRİLMEMİŞTİR — bu devrin asıl amacı odur. |
| ⚠️ En yeni bölümler | `PROGRESS.md` **§27** (iyileştirme planı) · **§28** (Esat'ın 7 maddesi) · **§28g–28s** (D1 senkron, sınıf yönetimi, ders kütüphanesi, 8 maddelik liste, veli hata düzeltmesi). Bu dosyanın gövdesi §24'e kadarını özetler; **§5.6 bu turun tam özetidir.** |
| CI | GitHub Actions — `.github/workflows/ci.yml` · lint + 133 test + yapılandırma + öz-kontrol |
| Senkron durumu | yerel kod = GitHub `origin/main` = canlı sistem (üçü aynı) |

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
  public/index.html    2 KB  iskelet
  public/app.js      378 KB  5 rolün TÜM mantığı, tek dosya, 6.982 satır
  public/app.css      69 KB  tüm stiller
  public/mufredat/*   12 dosya · 606 MEB kazanımı
        │
        │ fetch  (yalnızca /api/ai/* ve /mufredat/* — başka sunucu çağrısı yok)
        ▼
Cloudflare Worker (Hono)
  src/index.ts         1 KB  giriş noktası, app.route("/api/ai", ai)
  src/routes/ai.ts    23 KB  ★ 7 AI ucu — Zod + hız sınırı + normalleştirme
  src/lib/prompts.ts  27 KB  ★ 6 model istemi — JÜRİYE GÖSTERİLECEK DOSYA
  src/lib/ai.ts       13 KB  sağlayıcı bağımsız çağrı + yedek + JSON onarımı
  src/lib/guards.ts    5 KB  saf yardımcılar (test edilebilir)
  src/schemas/ai.ts    7 KB  Zod şemaları (girdi + model çıktısı)
        │
        ▼
  env.AI ──▶ Workers AI · @cf/meta/llama-3.3-70b-instruct-fp8-fast   (BİRİNCİL)
        └──▶ (birincil düşerse) OpenAI · gpt-5.6-luna                (YEDEK)
```

**Neden vanilla JS ve tek dosya:** Build adımı yok, `wrangler deploy` tek
komutla yayınlıyor. Jüri demosunda kırılacak bir derleme zinciri yok. Bedeli:
290 KB'lık tek dosya — bu yüzden §6.3'teki kurallar var.

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
| `/api/ai/generate-questions` | ÇSS + açık uçlu taslak; Bloom düzeyi, çeldirici gerekçeleri, `needsSource`, `dilUyarisi` |
| `/api/ai/evaluate` | Kriter bazında puan + gerekçe, güven skoru, `studentFeedback`, `injectionAttempt` |
| `/api/ai/rubric` | Soruya özgü rubrik taslağı (ağırlıklar %100'e normalleştirilir) |
| `/api/ai/sample-answers` | Farklı başarı düzeylerinde örnek yanıt (`simulated: true`) |
| `/api/ai/misconceptions` | Sınıfın yanıtlarında tekrarlayan kavram yanılgıları (öğrenci adı gönderilmez) |
| `/api/ai/outcome-alignment` | İçerik geçerliği: soru seçilen kazanımı ölçüyor mu (**bağımsız çağrı**) |

Ayrıca `GET /api/health` → `{ok, app, env}`.

## 1.5 Model sağlayıcısı ve yedek

```
Birincil : workers-ai · @cf/meta/llama-3.3-70b-instruct-fp8-fast
Yedek    : openai     · gpt-5.6-luna
```

**26 Ağustos'ta Cloudflare Workers Paid planına geçildi ($5/ay).** Günlük 10.000
ücretsiz neuron **hâlâ var**, ama kota aşılınca istek **hata vermiyor,
faturalanıyor** ($0,011 / 1.000 neuron). Ücretsiz planda aynı istek `4006`
hatasıyla ölüyordu — bu 26 Ağustos'ta fiilen yaşandı (`PROGRESS.md` §16d).

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
| D1 (SQLite, 17 tablo) | ✅ | ✅ **BAĞLI ve YAZIYOR** (3 Eylül) — sınıf koduyla cihazlar arası senkron + hız sınırı sayacı |
| R2 nesne depolama | ✅ | ❌ bağlı değil (PDF istemcide işlenir) |
| Queues (asenkron AI) | ✅ | ❌ ücretsiz planda kullanılamaz |
| Better Auth | ✅ | ❌ rol geçişi arayüzden simüle edilir |

**Sebep teknik:** `d1_databases[].database_id` doldurulmadan `wrangler deploy`
başarısız olur. Bu yüzden **iki yapılandırma dosyası** var (§6.1).

> 🔴 **3 EYLÜL GÜNCELLEMESİ — D1 ARTIK BAĞLI.** Yukarıdaki tabloda D1 satırı
> değişti. `wrangler.demo.jsonc` gerçek bir D1 veritabanına (`olcme-db`,
> id `daeb141d-bc0a-4471-b369-928832fda984`) bağlıdır ve canlıda **yazıp
> okuyor.** Ne saklandığı sınırlıdır ve bilinçlidir: yalnızca **sınıf kodu
> senkronu** (`sync_exams`, `sync_sessions`) ve **hız sınırı sayacı**
> (`rate_limits`). Soru havuzu, kazanımlar, kullanıcılar hâlâ istemcide —
> yani "D1 kalıcı yazım" maddesi KISMEN kapandı, tamamen değil. Ayrıntı §3.1
> ve `PROGRESS.md` §28g/§28r.

## 1.7 ★ Görsel kimlik — LACİVERT ZEMİN + BEYAZ KUTULAR (26 Ağustos, nihai)

Kullanıcının nihai kararı: *"böyle bir lacivert rengini yapmanı istiyoruz, son
kararımız. kutular beyaz kalsın."* Bu **bir tercih değil, kilitli bir karardır**;
yeni bir tema önerme.

**Tema HTML'de sabitlendi.** Dört sayfanın da kök etiketi
`<html lang="tr" data-theme="light">`. Sebep: palet zaten token'lıydı ve açık
tema `:root` varsayılanıydı, ama `@media (prefers-color-scheme: dark)` bloğu
işletim sistemi tercihine uyuyordu — yani ürün, koyu tema kullanan bir
bilgisayarda koyu açılıyordu. **Jüri sunumunda hangi görünümün çıkacağı sunum
yapılan bilgisayarın ayarına bırakılamaz.** Koyu bloklar **silinmedi**;
`data-theme` özniteliği kaldırılırsa eski davranış aynen döner.

🔴 **Burada bilinmesi gereken tasarım kısıtı — İKİ AYRI METİN RENGİ VAR:**
Palet başlangıçta tek bir `--text` kullanıyordu, çünkü hem zemin hem kartlar
açıktı. Zemin laciverte dönünce bu varsayım çöktü: doğrudan zemin üzerinde
duran yazılar (marka adı, alt başlık, boru hattı, alt bilgi) koyu kalırsa
okunmaz. Bu yüzden ayrı bir katman eklendi:

| Token | Nerede kullanılır | Ölçülen kontrast |
|---|---|---|
| `--text` / `--text-muted` | **kart içinde** | 17,45:1 (beyaz kart) |
| `--on-bg` | **lacivert zemin üstünde** (marka, başlık) | 11,70:1 |
| `--on-bg-muted` | zemin üstü ikincil metin | 7,46:1 |
| `--on-bg-line` | zemin üstü çizgi/nokta | 3,28:1 (grafik eşiği 3,0) |
| `--bg: #173058` ↔ `--surface: #ffffff` | zemin/kart ayrımı | 13,12:1 |

> **YENİ BİR ÖĞE EKLERKEN:** Öğe doğrudan sayfa zemininde mi duracak, yoksa bir
> kartın içinde mi? Zemindeyse `--on-bg*`, kart içindeyse `--text*` kullan.
> `body` rengi bilinçli olarak KOYU bırakıldı (kartlar onu miras alıyor);
> tersini yapmak onlarca kapsayıcıda tek tek düzeltme gerektirirdi.

**Ara tuşlar gri:** Aktif sekme laciverten nötr griye alındı
(`--neutral: #545a63`, beyaz metinle 8,23:1). **Dolgu kaldırılmadı** — §7d'de
sekmeler bilinçli olarak alt çizgili yazıdan dolgulu segmente çevrilmişti,
çünkü hangi sekmede olunduğu anlaşılmıyordu. Rozetler, çipler ve rol kartları
**lacivert kaldı**.

**Doküman sayfaları** (`/mimari`, `/privacy-policy`, `404`) bilinçli olarak
**açık zeminde** bırakıldı — uzun hukuki/teknik metni laciverte taşımak
okunabilirliği düşürür. Nötrleri uygulamanın soğuk açık tonlarına çekildi ki
aynı sistemin parçası görünsünler. **Bu bir eksik değil, karardır** ama
kullanıcı isterse değiştirilebilir (o zaman bu sayfaların da kendi `--on-bg`
katmanı gerekir).

---

# 2. Güncel Dosya Ağacı

**60 takipli dosya.** Boyutlar gerçek ölçümdür (26 Ağustos, gece).

```
t3-olcme-degerlendirme/
│
├── AKTARIM.md              ~50 KB  bu dosya — devir özeti
├── PROGRESS.md            146 KB  ★ TEK DOĞRULUK KAYNAĞI (§0-§24)
├── README.md               36 KB  jüri odaklı tanıtım (rozetler, mermaid akış)
├── agents.md                8 KB  ★ ZORUNLU kurallar (HITL, mimari, sınırlar)
│
├── package.json             2 KB  bağımlılıklar + 16 npm script
├── package-lock.json      109 KB
├── tsconfig.json            0 KB  TypeScript strict
├── wrangler.jsonc           4 KB  ÜRETİM yapılandırması (D1+R2+Queues+AI)
├── wrangler.demo.jsonc      4 KB  ★ DEMO yapılandırması — KULLANILAN BU
├── schema.sql              10 KB  D1 şeması, 17 tablo (3'ü canlıda AKTİF: sync_*, rate_limits)
├── routes.ts                9 KB  tam rota iskeleti (referans; handler'lar TODO)
├── .gitattributes           1 KB  Linguist: dokümantasyon HTML'i kod sayılmasın
├── .gitignore               0 KB  .dev.vars, anahtar.txt, node_modules…
├── .dev.vars.example        1 KB  yerel sır şablonu (gerçeği .gitignore'da)
├── ANAHTAR-EKLE.bat         0 KB  yedek anahtarı doğrula + Cloudflare'e yükle
├── ANAHTAR-EKRAN.bat        0 KB  aynısı için tarayıcı ekranı (127.0.0.1)
│
├── src/
│   ├── index.ts             1 KB  Worker giriş noktası + /api/health
│   ├── routes/ai.ts        23 KB  ★ 7 AI ucu
│   ├── lib/prompts.ts      27 KB  ★ 6 model istemi (jüriye gösterilecek)
│   ├── lib/ai.ts           13 KB  sağlayıcı katmanı + yedek + JSON onarımı
│   ├── lib/guards.ts        5 KB  saf yardımcılar (hız sınırı, kaynak tespiti,
│   │                              yabancı alfabe denetimi) — TEST EDİLEBİLİR
│   └── schemas/ai.ts        7 KB  Zod şemaları
│
├── test/                          ★ 98 test, `npm test` ile koşar
│   ├── guards.test.ts       8 KB  47 test — kaynak tespiti, hız sınırı, DİL
│   ├── schemas.test.ts      8 KB  27 test — şema sınırları, normalleştirme
│   └── ai-lib.test.ts       5 KB  24 test — extractJson, sağlayıcı, BOM
│
├── public/
│   ├── index.html           2 KB  iskelet · data-theme="light" SABİT
│   ├── app.js             290 KB  ★ 4 rolün TÜM mantığı · 5.577 satır ·
│   │                              229 fonksiyon · öz-kontrol 154 ad denetler
│   ├── app.css             69 KB  tüm stiller · lacivert palet + --on-bg katmanı
│   ├── _headers             2 KB  ★ güvenlik başlıkları (CSP dahil)
│   ├── mimari.html         52 KB  mimari dokümantasyonu (2 mermaid diyagram)
│   ├── mimari.js            2 KB  mermaid yükleyici (inline OLAMAZ — §6.3-7)
│   ├── privacy-policy.html 22 KB  KVKK aydınlatma metni
│   ├── privacy-policy.js    1 KB  🆕 rıza kutusu (inline OLAMAZ — §6.3-7)
│   ├── 404.html             7 KB  özel hata sayfası
│   ├── 404.js               1 KB  🆕 istenen yolu yazar (inline OLAMAZ — §6.3-7)
│   ├── robots.txt           1 KB  /api/ ve /internal/ disallow
│   └── mufredat/                  ★ 606 MEB ÖĞRENME ÇIKTISI — 12 dosya
│       ├── turkce-5.json   15 KB  80 kazanım (32 yazılı)
│       ├── turkce-6.json   17 KB  91 (37)
│       ├── turkce-7.json   18 KB  96 (39)  ← elle doğrulanmış referans
│       ├── turkce-8.json   18 KB  98 (40)
│       ├── matematik-5.json 6 KB  23 (23)
│       ├── matematik-6.json 6 KB  24 (24)
│       ├── matematik-7.json 8 KB  30 (30)
│       ├── matematik-8.json 7 KB  23 (23)
│       ├── fen-5.json       7 KB  27 (19)
│       ├── fen-6.json       9 KB  36 (27)
│       ├── fen-7.json       9 KB  35 (25)
│       └── fen-8.json      11 KB  43 (32)
│
├── tools/
│   ├── injection-test.py    6 KB  ★ 5 vektörlü güvenlik testi (tekrar koşulur)
│   ├── mufredat-cikar.py    6 KB  ★ PDF'ten kazanım çıkarımı
│   ├── mufredat-katalog-uret.py 6 KB ★ katalog dosyalarını üretir + doğrular
│   ├── check-jsonc.py       2 KB  JSONC doğrulayıcı (npm run check:config)
│   ├── anahtar-dogrula.mjs  5 KB  yedek anahtarı sağlayıcıya sorup CF'e yükler
│   ├── anahtar-ekran.mjs   10 KB  aynısı için yerel tarayıcı ekranı
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
**🆕 ile işaretliler** bu oturumda eklendi.

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
- **`grup`**: seçicide `optgroup` başlığı olarak kullanılır. Fen/Matematik'te
  **ünite**, Türkçe'de **beceri alanı** (Türkçe kodunda ünite yoktur — §5.4).

---

# 3. Veritabanı ve Veri Akışı

## 3.1 Veriler nerede tutuluyor

**ÜÇ katman vardır.** İlk ikisi istemcide, üçüncüsü (3 Eylül'den beri)
sunucuda — ama sunucuya YALNIZCA kullanıcı bir **sınıf kodu** girdiğinde
yazılır. Kod girilmemişse ürün eskisi gibi tamamen istemci taraflıdır ve
sunucuya hiçbir şey gitmez.

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

> **Paylaşım notu — 3 EYLÜL'DE DEĞİŞTİ.** Eskiden burada şu yazıyordu:
> *"her cihaz/tarayıcı kendi verisini görür, A'nın ürettiği soruyu B göremez."*
> **Bu artık koşullu doğrudur.** Sınıf kodu girilmemişse hâlâ öyledir. Ama bir
> sınıf kodu paylaşıldığında sınavlar ve öğrenci oturumları cihazlar arasında
> D1 üzerinden senkronlanır — kullanıcının "farklı PC'lerde farklı şeyler
> çıkmasın" talebi bununla karşılandı.

### Katman 3 — D1 (`olcme-db`), YALNIZCA sınıf kodu senkronu

`schema.sql` artık **17 tablo**. İlk 14'ü hedef mimarinin şeması olarak duruyor
(canlıda yazılmıyor): `schools · users · learning_outcomes ·
source_documents · source_document_outcomes · questions · rubrics · exams ·
exam_questions · exam_assignments · submissions · ai_evaluations ·
teacher_reviews · analytics_snapshots`

**Canlıda gerçekten kullanılan 3 tablo:**

| Tablo | Ne tutar |
|---|---|
| `sync_exams` | oda (sınıf kodu) başına paylaşılan sınav paketi (JSON payload) |
| `sync_sessions` | oda + sınav + öğrenci başına oturum durumu ve yanıtlar |
| `rate_limits` | `"<uç>:<ip>"` başına sabit pencereli istek sayacı (§28r Madde 6) |

Uçlar: `POST /api/sync/push` · `POST /api/sync/pull` · `POST /api/sync/reset` ·
`GET /api/sync/status` (`src/routes/sync.ts`, şemalar `src/schemas/sync.ts`).

> ⚠️ **Sınıf kodu KİMLİK DOĞRULAMA DEĞİLDİR.** Paylaşılan bir sırdır; kodu
> bilen herkes o odaya yazıp okuyabilir. Bu sınır arayüzde ve gizlilik
> metninde açıkça yazılıdır ve jüriye de böyle söylenmelidir.

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

> ✅ **26 Ağustos'ta canlıda test edildi:** 6 öğrenci arasında ileri geri geçiş
> yapıldı, her birinin 4 yanıt / 1 inceleme / `graded` durumu **bozulmadan**
> kaldı. Bozulma 0.

## 3.3 Kazanım kataloğu akışı

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
> filtrelere ve analitiğe girer.

> 🔴 **BURADA BİR HATA VARDI, DÜZELTİLDİ (§4.1-1).** Seçicinin altındaki bilgi
> satırı kataloğu saymıyordu ve "0 kazanım · tanımlı değil" yazıyordu. Yeni bir
> şey eklerken **`kazanimNotuHtml()` ile `kazanimSecenekleriHtml()` aynı
> filtreyi uygulamalıdır**; ayrışırlarsa satır yeniden seçiciyi yalanlar.

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

> **Adet alanları `change` olayında bağlanır**, `input`'ta değil. Gerçek
> kullanıcı yazıp alandan çıkınca çalışır; programatik test yaparken bunu bil.

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
  kümelemede yanıtlar anonim ve numaralıdır. (26 Ağustos'ta canlıda doğrulandı:
  sonuçta hiçbir öğrenci adı geçmedi.)
- **Karar Günlüğü'nde de öğrenci adı yazılmaz** — yalnızca sistem içi numara
  ve sorunun ilk 80 karakteri. CSV indirmesinde de ad yok (doğrulandı).
- PDF dosyaları **istemcide** `pdf.js` ile çözümlenir; dosya sunucuya
  gönderilmez. Çıkarılan metin IndexedDB'de saklanır, cihazdan çıkmaz.
- Sınav bütünlüğü kaydında yapıştırılan metnin **içeriği** saklanmaz, yalnızca
  karakter sayısı tutulur.
- `agents.md` §7: öğrenci verisiyle ilgili her değişiklikte
  `public/privacy-policy.html` güncellenmek **zorundadır**.

---

# 4. Çözülen Son Sorunlar ve Mevcut Durum

26 Ağustos'ta toplam **24 commit** atıldı (toplam 71). Bu oturumda (§23-§24)
**sekiz gerçek hata** bulundu ve düzeltildi. Ayrıntılar `PROGRESS.md`
§15-§24'te; burada özet.

## 4.1 🔴 Bu oturumda bulunan ve düzeltilen 8 GERÇEK HATA

| # | Hata | Nasıl bulundu |
|---|---|---|
| 1 | **Kazanım sayısı seçiciyi yalanlıyordu.** Türkçe 7'de seçicide 39 MEB kazanımı listeliyken altında *"0 kazanım · bu ders ve sınıf için henüz kazanım tanımlı değil"* yazıyordu. 12 ders/sınıf kombinasyonunun **10'unda**, üstelik **varsayılan açılış ekranında**. Kök neden: `kazanimNotuHtml()` yalnızca `OUTCOMES_LIST()`'e bakıyor, `kazanimSecenekleriHtml()` kataloğu da listeliyordu | Kullanıcı elle kullanırken |
| 2 | **Isı haritası açıklaması TERSTİ.** *"Koyu renk = düşük başarı"* yazıyordu; oysa `scaleStep()` yüksek yüzdeye yüksek adım, `--seq-5` en koyu rengi veriyor. Efsane de "Düşük→Yüksek" diyordu. Jüri en başarılı sınıfları en başarısız sanardı. Ölçüldü: %50 → parlaklık 0,681, %84 → 0,246 | Kullanıcı bildirdi |
| 3 | **Isı haritası metin kontrastı AA altında.** `bestTextColor()` eşiği 0,42 idi ve yanlış yerdeydi; `--seq-4` hücreleri açık metin alıp **3,31:1** veriyordu. Doğru eşik hesaplandı (iki metin renginin kontrastının eşitlendiği nokta): **0,195**. Sonuç: seq-4 **4,95:1** | Kontrast taraması |
| 4 | **404 sayfası hep yanlış yol gösteriyordu.** Gerçek yolu yazan betik **inline** olduğu için CSP tarafından bloklanıyordu; sabit `/bilinmeyen-sayfa` yer tutucusu ekranda kalıyordu | Konsol ölçümü |
| 5 | **Gizlilik sayfasındaki rıza kutusu çalışmıyordu.** Aynı sebep: inline betik CSP tarafından bloklu, düğme sonsuza dek pasif kalıyordu | Konsol ölçümü |
| 6 | **`mimari.html` sayfayı yatay kaydırıyordu.** §14g'de eklenen "Dürüstlük notu" kutusu `inline-flex` + `nowrap` + `max-width` yokluğuyla 729 px'e büyüyordu. Ölçüldü: scrollWidth 1001 / viewport 953 = **48 px taşma** | Taşma taraması |
| 7 | **Türkçe ek hatası.** Karar günlüğü özeti *"%0'ini değiştirdi"* diyordu (doğrusu "%0'ını"). Sabit ek hiçbir sayıda güvenli değil: %50'sini, %100'ünü. Cümle ek almayacak biçimde yeniden kuruldu | Ekran incelemesi |
| 8 | **Denetim izi özetinde sayım yanlıştı.** *"Kullanılan modeller: llama · 14"* yazıyordu ama o turda **8** model çağrısı yapılmıştı. `auditOzet()` `model` alanı taşıyan HER kaydı sayıyordu; insan kararları da bu alanı taşır (doğrudur, hangi modelin ürettiği çıktıya karar verildiğini gösterir). Artık yalnızca modelin ÜRETTİĞİ olaylar sayılıyor, etiket **"Model çağrısı yapılan adımlar"** oldu | Uçtan uca denetim |

**4 ve 5, `PROGRESS §14e`'nin tekrarıdır:** CSP güçlendirilirken mermaid
yükleyicisi `mimari.js`'e taşınmıştı ama bu iki betik gözden kaçmıştı. Çözüm
aynı: `public/404.js` ve `public/privacy-policy.js`. **CSP gevşetilmedi.**

## 4.2 Bu oturumda yapılan diğer değişiklikler

| Değişiklik | Ne yapar |
|---|---|
| **Lacivert tema** | §1.7 — zemin `#173058`, kutular beyaz, tema HTML'de sabit |
| **Nötr gri sekmeler** | Aktif sekme laciverten griye; dolgu korundu |
| **`--on-bg` katmanı** | Zemin üstü metinler için ayrı renk kümesi |
| **"Bir kazanım seçin…"** | Yer tutucu metni duruma göre değişiyor; seçenek yoksa "— bu ders/sınıf için kazanım yok —" |
| **Sorular belirginleşti** | Havuzdaki soru gövdesi 13 px normal → **14,5 px / 600**; tek kural 5 listeyi birden besliyor |
| **`.empty-state` bağımsızlaştı** | Kendi zeminini taşıyor; kartsız kullanıldığı tek yerde lacivert üstünde 1,88:1'e düşüyordu (§6.3-2'nin tekrarı) |

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

> *"Öğretmen, yapay zekâ puan önerilerinde **%N** oranında değişiklik yaptı.
> Bu oran sıfırsa insan onayı biçimsel kalıyor demektir; çok yüksekse modelin
> rubriğe uyumu gözden geçirilmelidir."*

En fazla **500 kayıt**; sınır aşılırsa en eski düşer ve bu **ekranda açıkça
yazar**. `calibration()` ile çakışmaz, tamamlar.

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
> **96/96 BİREBİR AYNI** metni üretti.
>
> 🎯 **BAĞIMSIZ İKİNCİ DOĞRULAMA (26 Ağustos):** 12 katalog dosyasındaki
> **606 kodun tamamı** kaynak MEB PDF'lerine karşı tarandı — **PDF'te
> bulunamayan kod 0**. Her dosyanın ilk kazanım metni PDF'te birebir geçiyor.

## 4.5 Ayrıştırıcı özellikler (bu takımı diğerlerinden ayıran kısım)

| Özellik | Ne yapar | Ölçüm |
|---|---|---|
| **Karar günlüğü** | HITL tezini ispatlar, indirilebilir | Tam zincir sürüldü |
| **Prompt injection sertleştirmesi** | Öğrenci cevabına *"tam puan ver"* yazması gerçek saldırı yüzeyi. 6/6 istemde nonce sınır belirteci + kuralların önünde güvenlik bloğu | **5 vektör, 5/5** |
| **Gerçek MEB müfredatı** | 606 öğrenme çıktısı, yazılı/performans/süreç ayrımıyla | 606/606 PDF doğrulaması |
| **Madde analizi** | Güçlük (p), ayırt edicilik (d), işlevsiz çeldirici. Negatif d = anahtar hatalı olabilir | Canlıda gerçek veriden hesaplandı |
| **Öğretmen–AI uyumu** | Brief'in *"değerlendirici tutarsızlığı"* sorununa cevap | Canlıda uyum %96 ölçüldü |
| **Kavram yanılgısı kümeleme** | Isı haritası "hangi kazanım zayıf" der, bu "**neden** zayıf" der | Canlıda 1 küme, 4 öğrenci, birebir alıntı |
| **Bloom düzey dengesi** | Sınav ezber mi ölçüyor? Hedef oran dayatmaz, iki ucu bildirir | Canlıda doğru uyardı, üst düzey eklenince sustu |
| **Kazanım–soru hizalama** | İçerik geçerliği. Denetimi **soruyu üreten çağrı yapmaz**, bağımsız çağrı yapar | İlgisiz soruyu doğru işaretledi |
| **Dil uyarısı** | Model Kiril harfi karıştırırsa insana bildirir | 10 birim testi |
| **Uyaran metin** | Metne dayalı soru, metniyle birlikte gösterilir | Sunucuda regex güvencesi |

## 4.6 ✅ Doğrulanmış son durum (26 Ağustos, gece — CANLI sistemde)

| Kontrol | Sonuç |
|---|---|
| `npm run lint` (tsc --noEmit) | **temiz** |
| `npm test` | **98/98 geçti** (guards 47 · schemas 27 · ai-lib 24) |
| `npm run check:config` | **2/2 geçerli** |
| `node --check` (4 js dosyası) | hepsi geçerli |
| Açılış öz-kontrolü | temiz (**154 ad** denetleniyor) |
| **Kontrast** (545 metin öğesi × 10 rol/sekme) | **düşük kontrast 0** |
| **Kontrast, mobil 375 px, canlı** (525 öğe) | **0 ihlal** |
| 4 rol × tüm sekmeler | render **0** · konsol **0** · yatay taşma **0** |
| **XSS** (20 alan × 10 sekme) | enjekte eleman **0** · tetiklenme **0** |
| **Prompt injection** (5 vektör) | **5/5** |
| Erişilebilirlik | bağsız label **0** · adsız düğme **0** · 24×24 altı **0** |
| Canlı statik yollar (11) | tümü **200** · bilinmeyen yol **404** |
| API hata sözleşmesi | 9 senaryo, hepsi `{error, message}` + doğru HTTP kodu |
| **Uçtan uca zincir (canlı, gerçek model)** | soru üret → onayla → sınav kur → rubrik → çöz → değerlendir → onayla → yayınla → karne → analitik: **tamamı çalışıyor** |
| Oturum yalıtımı (6 öğrenci) | **bozulma 0** |
| Karar günlüğü CSV | UTF-8 BOM · **öğrenci adı yok** |
| Sıfırlama | soru/günlük sıfırlandı · IndexedDB boşaldı · tema korundu |

**Ölçülen süreler (canlı, llama-3.3-70b, 26 Ağustos gece):**
soru üretimi **12,2 sn** · rubrik taslağı **5,8 sn** · değerlendirme
**19,8 sn** (tek çağrı 11,2 sn ölçüldü) · kavram yanılgısı ~5 sn ·
sınıf simülasyonu (5 öğrenci) ~90 sn · önbellekten **0-6 ms**.

> ⚠️ **Değişkenlik yüksek:** aynı uç 6,0 sn ile 29,0 sn arasında ölçüldü.
> Demo senaryosu ve değerlendirme önbelleği bu yüzden önemlidir.
> **Sahnede 29 saniye sessizlik ölümcüldür** — demo akışı buna göre kurulmalı.

## 4.7 Maliyet gerçeği

| Sağlayıcı | Tam demo turu (1 sınıf, 6 öğrenci) |
|---|---:|
| Workers AI llama-3.3-70b (kota üstü) | **$0,0116** |
| OpenAI gpt-5.6-luna (yedek) | $0,0162 |

- Günde 10.000 neuron ücretsiz ≈ **9-10 tur**; üstü faturalanır
- Workers Paid: **$5/ay taban** + kullanım
- Gerçekçi okul kullanımı çok ucuz; **maliyet bu ölçekte karar değişkeni değil**

## 4.8 Model kalitesi gözlemi (kod hatası DEĞİL — demo riski)

26 Ağustos denetiminde model, ürettiği açık uçlu soruda **"Sürtünme" yerine
"Sürünme"** yazdı (iki kez) ve bu yanlış terim rubriğe, değerlendirme geri
bildirimine ve kavram yanılgısı kümesine kadar yayıldı.

`dilUyarisi` bunu **yakalamaz** — yabancı alfabe yok, yalnızca yanlış Türkçe
sözcük var. Ürünün cevabı zaten insan onayıdır: inceleme kartında soru gövdesi
düzenlenebilir.

> **Demo notu:** Jüri önünde canlı soru üretimi yapılacaksa, üretilen metin
> onaylanmadan önce **okunmalıdır.** Bu aslında HITL tezinin canlı kanıtı olarak
> da sunulabilir.

---

# 5. Kalan Eksikler ve İlk Görev

## 5.1 ★ KULLANICININ (İNSANIN) YAPACAĞI İŞLER — kod dışı

| # | İş | Durum | Not |
|---|---|---|---|
| 1 | **İş Modeli Kanvası** | ekip arkadaşlarında | Zorunlu teslimat |
| 2 | **Pitch Deck** | ekip arkadaşlarında | ~15 ayrıştırıcı özelliğin hiçbiri deck'te yok |
| 3 | **Tanıtım & Demo Videosu** | ekip arkadaşlarında | Zorunlu teslimat |
| 4 | 🔴 **Deck'te Burak Özçelik'in adı yok** | slayt 1'de üç isim var | Takım dört kişi — **en acil** |
| 5 | 🔴 Deck ürün adını **"AI-Destekli Eğitim Değerlendirme Platformu"** diyor | ürün adı **Mihenk** | İsim birliği |
| 6 | 🔴 Deck'te **"hile önleyici kontroller"** ifadesi | yanlış | Doğrusu: **"sınav bütünlüğü kaydı — öğretmene şeffaf sinyal"**. Üründe engelleme yok, kayıt var. Jüride tek soruyla çöker |
| 7 | Deck'te rakip tablosu ve pazar sayısı yok | Kreaton rehberi §5.1 şart koşuyor | |
| 8 | ~~**Ekran görüntüleri**~~ | ✅ **YAPILDI** | `docs/ekran/` altında 4 görsel (2880×1800, canlı sistemden Playwright ile), README'nin başına "Ekranlar" bölümü olarak yerleştirildi. Yeniden üretmek için: `scratchpad/shot.mjs` kalıbı — 4 rol × demo senaryosu |
| 9 | **`v-demo` tag'i** | atılmadı | `agents.md` §8: sunumdan 24 saat önce (≈4 Eylül) |
| 10 | **Adres kısaltma** | karar bekliyor | §5.5 |
| 11 | **Workers Paid iptali** | — | Yarışma sonrası, aylık $5 |

## 5.2 ★★ İLK GÖREV — YENİ OTURUMDA BURADAN BAŞLA

**Sıra: (a) ekip geri bildirimi → (b) kaynak metin bölümü.**

### (a) Ekip denemesi geri bildirimlerini topla ve önceliklendir

26 Ağustos gecesi kullanıcı, uygulamayı **kendisi ve üç ekip arkadaşıyla**
denemeye başladı. Onlara bir **deneme kılavuzu** verildi (canlı adres, iki
deneme yolu, "bunlar hata değil" listesi, bildirim şablonu). Kılavuz depoda
DEĞİL — kullanıcıda PDF olarak duruyor.

Yeni oturumda kullanıcı büyük olasılıkla **bir geri bildirim listesiyle**
gelecek. Bunlar bu projedeki en değerli bulgulardır (§6.4-9): en ciddi
düzeltmelerin çoğu kullanıcının elle kullanmasından çıktı — bu oturumdaki
kazanım sayısı hatası ve ısı haritası çelişkisi dâhil.

**Yapılacak:** listeyi al, her maddeyi **doğrula** (ürün hatası mı, yanlış
alarm mı — §6.5), etkiye göre sırala, sonra düzelt.

### (b) Öğretmenin kendi metnini / PDF'ini eklediği bölüm

> **Kullanıcının kendi ifadesiyle "en çok endişelendiren kısım".**
>
> *"öğretmenin kendi metnini ya da pdfini ekleyip soru hazırladığı kısım var.
> o kısım beni en çok endişelendiren kısım. çünkü kullanışlı bişi yapmamız
> gerekiyor önerilerine açığım. öğretmenin eklediği pdf bi köşede kalabilir
> mesela. o konuda iyice bi düşün sonrasında değişikliklerini uygula"*

**Tespit edilen sorun (asistanın analizi, kullanıcıya HENÜZ SUNULMADI):**
Kaynak metin ile kazanım **birbirinden kopuk**. Öğretmen PDF yüklüyor, ayrıca
kazanım seçiyor; ikisinin uyup uymadığını sistem söylemiyor. Ayrıca seçilen
kitap/sayfa aralığı formda görsel olarak kayboluyor.

**26 Ağustos'ta elle sürüldü:** bölüm **çalışıyor** — PDF yükleniyor, kitaplığa
kaydediliyor, sayfa aralığı seçilebiliyor, metin forma aktarılıyor. Yani bu bir
hata değil, bir **kullanılabilirlik** işi.

**Önerilecek yön (kullanıcı onayı alınmadı):** Kaynağı **kalıcı bir bağlam
çubuğuna** almak — seçilen kitap + sayfa aralığı + konu/kazanım hep görünür
kalsın, form onların altında çalışsın. Kullanıcının "bir köşede kalabilir"
fikrine yakın ama bir adım ötesi.

**ÖNCE ÖNERİYİ ARTILARI-EKSİLERİYLE SUN, ONAY AL, SONRA UYGULA.** Kullanıcı
bu çalışma biçimini açıkça istedi (§6.4-1, §6.4-8).

## 5.3 Kod tarafında bilinçli bırakılanlar (finale, 5-6 Eylül)

Hiçbiri demoyu engellemez. Öncelik sırasıyla:

| # | Eksik | Not |
|---|---|---|
| 1 | ~~Hız sınırı dağıtık değil~~ → **SENKRON UÇLARINDA ÇÖZÜLDÜ (3 Eylül)** | `/api/sync/*` sayacı D1'e taşındı (`rate_limits`, atomik `INSERT…ON CONFLICT…RETURNING`). **Canlıda ölçüldü:** sıralı 65 istek → 60×200 + 5×429; paralel 80 istek → 60×200 + 20×429. **KALAN:** `/api/ai/*` ucundaki sayaç (`src/routes/ai.ts` + `guards.ts`) hâlâ bellek içi/isolate başına — orası bilinçli bırakıldı, oda kodu tarama riski taşımıyor |
| 2 | **CSP'de `style-src 'unsafe-inline'`** | `app.js` **86 yerde** inline `style="…"` kullanıyor. Stiller sınıflara taşınırsa bu izin kaldırılabilir |
| 3 | Isı haritasındaki **"(örnek)" satırları** | Karşılaştırma sınıfları (6-A, 8-B, 8-C) demo verisi. Arayüzde "(örnek)" etiketli — yanıltma yok |
| 4 | **Isı haritası yönü** | Koyu = yüksek başarı. Yani **zayıf hücreler soluk kalıyor**, dikkat çekmesi gereken en az göze çarpıyor. "%55 altı" uyarı listesi bunu telafi ediyor. Ölçek tersine çevrilebilir ama efsane + skala + açıklama birlikte değişmeli |
| 5 | **Maliyet şeffaflığı paneli** | "Bu sınav kaç kuruşa mal oldu" |
| 6 | **Soru havuzu benzerlik denetimi** | Mükerrer soru yakalar |
| 7 | **Öğrenci erişilebilirliği** | Süre uzatma, disleksi dostu font — kapsayıcılık, jüride iyi durur |
| 8 | D1 kalıcı yazım (**kısmen kapandı**) · R2 · Queues · Better Auth | D1: senkron + hız sınırı canlıda yazıyor; soru havuzu/kazanım/kullanıcı hâlâ istemcide. R2/Queues/Better Auth: bilinçli kapsam kararı (`PROGRESS.md` §6) |

## 5.4 Reddedilmiş / kapatılmış işler (tekrar önerilmemeli)

| İş | Neden |
|---|---|
| **Ayrı "Konu" alanı** | Konu bağımsız bir seçim değil; her kazanım tam olarak bir konuya ait. Çözüm: konu, seçicinin **içinde** `optgroup` başlığı |
| **Türkçe'ye tema/ünite alanı** | **Türkçe kodunda ünite YOKTUR.** Temalar kazanımlara diktir. Tema dayatmak müfredatta olmayan yapı uydurmak olurdu |
| **`gpt-5-nano` kullanımı** | Test edildi: 3 uçta da HTTP 502, **boş yanıt**. Akıl yürüten modellerde `max_completion_tokens` düşünme tokenlarını da sayıyor |
| **Zincir yedek (WorkersAI→Gemini→OpenAI)** | Workers Paid ile kota duvarı kalktığı için gereksizleşti |
| **Gemini yedek** | Ücretsiz katman **günde 20 istek**; bir tam tur 11 istek → günde ~1,8 tur |
| **Hazır soru bankası entegrasyonu** | Ana değer önerisiyle çelişiyor: ürün "AI soru üretiyor" diyor |
| **`sorular.json` düzeltme** | 85 kaydın %46'sında iki sütun birleşmiş, hiçbir kayıtta doğru cevap yok |
| **Modelden "kendi kendine yeten soru üret" istemek** | Türkçe okuma kazanımlarını imkânsız kılardı. Doğru çözüm uyaran metin oldu |
| **Türkçe başlıkları küçük harfe çevirme** | `ELEKTRİĞİN İLETİMİ` → `Elektriğin I` diye bozdu (İ/I/ı/i tuzağı) |
| **🆕 Kırık beyaz / açık zemin teması** | Bir tur denendi, kullanıcı **laciverte karar verdi** (§1.7). Yeni tema önerme |
| **🆕 Doküman sayfalarını laciverte taşıma** | Uzun hukuki/teknik metnin okunabilirliğini düşürür. Kullanıcı isterse yapılır |

## 5.5 ✅ KARAR VERİLDİ: adres kısaltıldı (3 Eylül 2026)

**Nihai adres — jüriye ve ekibe verilecek tek link:**

```
https://mihenk.bies.workers.dev
```

Adres iki parçadan oluşur ve 3 Eylül'de **ikisi de** değiştirildi:

```
mihenk  .  bies  .  workers.dev
└ Worker  └ Cloudflare hesap alt alan adı
  adı       (panelden değişir, HESAP GENELİ)
  wrangler*.jsonc "name"
```

**Yapılanlar (sırasıyla):**

1. Worker adı `t3-olcme-degerlendirme` → **`mihenk`**. Wrangler'da yeniden
   adlandırma yoktur; yeni ad = yeni Worker. Bu yüzden önce ikinci bir Worker
   açıldı ve eskisi geçici olarak canlı bırakıldı.
2. Hesap alt alan adı `t3-olcme-degerlendirme-sistemi` → **`bies`**
   (Cloudflare paneli → Workers & Pages → Account details → Subdomain).
   Kullanıcı bastı; wrangler'da bu ayarın komutu yok.
3. Gereksiz kalan `t3-olcme-degerlendirme` Worker'ı **silindi**
   (`npx wrangler delete --name t3-olcme-degerlendirme`).
4. `wrangler.jsonc` ve `wrangler.demo.jsonc` içindeki `"name"` alanı
   **`mihenk`** yapıldı — aksi hâlde `npm run deploy:demo` silinen Worker'ı
   YENİDEN YARATIRDI.

> 🔴 **ÖLEN ADRESLER — bilinçli, geri dönüşü yok:**
> ```
> t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev   ← başvuru linki
> mihenk.t3-olcme-degerlendirme-sistemi.workers.dev
> t3-olcme-degerlendirme.bies.workers.dev
> ```
> Hesap alt alan adı değiştiği anda ilk ikisi öldü; üçüncüsü Worker silinince.
> **Kararı veren soru** eskiden *"teslim mevcut adresle yapıldı mı?"* idi ve
> cevabı evetti — ama **ön eleme tamamlandığı** (takım finale kaldı) için o
> linkin kritik işi bitmişti. Kullanıcı bunu bilerek onayladı.

**Ölçüldü (canlı):** alt alan adı değişiminden sonra yayılma **~90 saniye**
sürdü (iki deneme 000, üçüncüsü 200). Worker silindikten sonra
`mihenk.bies.workers.dev` 200 ve `app.js` yerelle birebir; D1 (`olcme-db`)
Worker'dan bağımsız bir kaynak olduğu için silinmeden kaldı ve bağlı olduğu
`{"ready":true}` ile doğrulandı.

**Depoda güncellenen adres sayısı:** README 7 · package.json 1 ·
AKTARIM 3 · PROGRESS 4. `package-lock.json`'daki eski paket adı bilinçli
olarak **değiştirilmedi**: adres değil npm paket adıdır, kullanıcıya
görünmez ve final öncesi kilit dosyasına dokunmak gereksiz risktir.

> ⚠️ **Yarışma sonrası:** tek Worker kaldı. Kullanılmayacaksa Workers Paid
> aboneliğiyle birlikte kapatılmalı (§5.1-11).

---

## 5.6 ★★ 3 EYLÜL İKİNCİ GÜN — BU TURDA YAPILAN HER ŞEY (devir için özet)

Bu bölüm, `AKTARIM.md`'nin gövdesinden (§24'e kadar) SONRA yapılan tüm işi tek
yerde toplar. Yeni bir oturum ya da yeni bir ekip arkadaşı devralıyorsa, kod
tarafında bilmesi gereken güncel durum budur. Her maddenin tam kaydı
`PROGRESS.md`'dedir.

### (a) D1 SENKRON — ürünün en büyük mimari değişikliği (§28g, §28k)

Kullanıcının şikâyeti: *"artık farklı PC'lerde farklı şeyler çıkmasın."*
Çözüm **sınıf kodu** kavramıdır: öğretmen bir kod üretir, öğrenci/veli o kodu
girer, sınavlar ve oturumlar D1 üzerinden paylaşılır.

- Uçlar: `POST /api/sync/push|pull|reset`, `GET /api/sync/status`
- Kod: `src/routes/sync.ts` · şemalar: `src/schemas/sync.ts` · tablolar:
  `sync_exams`, `sync_sessions`
- İstemci: `syncPaket()` / `syncGonder()` / `syncCek()` / `syncBirlestir()`
  (`public/app.js`)
- **Kimlik doğrulama DEĞİLDİR** — paylaşılan sır. Bu sınır arayüzde ve
  gizlilik metninde yazılıdır.

### (b) SINIF YÖNETİMİ + DERS KÜTÜPHANESİ + 5 ROL DÜZENİ (§28q)

Kullanıcının talebi: *"öğretmen kendi sınıfını kendi eliyle oluştursun, kendi
ders oluşturabilsin, ders notlarını oraya ekler orada kayıtlı durur"* + rol
sekmelerinin düzeni + *"simülasyon yazısı saçma onu kaldır."*

- Öğretmene **"Sınıfım"** kartı: elle öğrenci ekleme/silme/sınıf atama
- **Ders Kütüphanesi**: mevcut Kitaplık/IndexedDB altyapısı ders notları için
  yeniden kullanıldı
- 5 rol sekmesi tek satırda eşit düzene alındı (veli artık tek başına durmuyor)
- "simülasyon" dili arayüzden temizlendi

### (c) 8 MADDELİK LİSTE — 6'sı yapıldı, 2'si bilinçli açık (§28r)

| # | Madde | Durum | Commit |
|---|---|---|---|
| 1 | Sınava "kime yayınlansın" sınıf filtresi (`state.exam.targetClass`) | ✅ | `b678cc5` |
| 2 | Öğrenci ad/sınıf değişikliğinin senkronu (son yazan kazanır) | ✅ | `cacd444` |
| 3 | Sınıf koduna katılınca örnek listenin otomatik temizlenmesi | ✅ | `30baa17` |
| 4 | Kütüphanedeki notların ad/ders/sınıf etiketinin düzenlenebilmesi | ✅ | `d438834` |
| 5 | Kütüphanede arama/filtreleme (odak kaybettirmeyen `oninput`) | ✅ | `81d50d2` |
| 6 | Hız sınırının D1'e taşınması | ✅ | `da29ef9` |
| 7 | `v-demo` etiketi | ⏸️ **bilinçli ertelendi** — `agents.md` §8 sunumdan 24 saat önce şart koşuyor; 3 Eylül'de atmak kuralı boşa düşürürdü | — |
| 8 | Sunum (deck) metin düzeltmeleri | ⏳ kod dışı, sunumu hazırlayan kişide | — |

### (d) VELİ "GİR" DÜĞMESİ ÖLÜYDÜ — gerçek hata (§28s)

Boş ekran düzeni birleştirilirken bulundu ve ölçülerek doğrulandı:

**Tüm rol panelleri aynı anda DOM'a basılır** (yalnızca aktif olan CSS ile
görünür). Katılma kutusu hem öğrenci hem veli panelinde bulunduğu için
`#btnSyncJoin` id'si sayfada **iki kez** vardı; `wireSyncJoin()` içindeki
`getElementById` yalnızca **ilkini** (öğrencininkini) buluyordu. Sonuç: **veli
sınıf kodunu yazıp "Gir"e bastığında hiçbir şey olmuyordu.**

Düzeltme: id yerine sınıf (`.js-sync-gir`, `.js-sync-input`, `.js-sync-yenile`),
`querySelectorAll` ile hepsini bağla, her kutu kendi girdisini `closest()` ile
bulsun. Aynı hata daha önce `.wait-pill` sayacında yaşanmıştı (§28a).

> 🔴 **BU BİR DERS: bu projede `getElementById` KULLANMADAN ÖNCE DÜŞÜN.**
> Aynı bileşen birden fazla rol panelinde render ediliyorsa id tekil değildir.
> Bu tuzağa iki kez düşüldü.

Aynı turda boş ekran düzeni de birleştirildi: "sonuç/sınav yok" mesajı ile
sınıf kodu kutusu artık tek kutuda (`bosDurumHtml()`), üstte durum, altında
o durumu değiştiren eylem.

### (e) BU TURUN DOĞRULAMA ÖZETİ

| Kontrol | Sonuç |
|---|---|
| `npm run lint` | temiz |
| `npm test` | **133/133** |
| CI (GitHub Actions) | yeşil |
| Canlı `/api/health` | `{"ok":true,...}` 200 |
| Canlı/yerel `app.js` + `app.css` | **byte byte aynı** |
| Canlı hız sınırı (sıralı 65 istek) | 60×200 + 5×429 |
| Canlı hız sınırı (paralel 80 istek) | 60×200 + 20×429 |
| Mobil 375 px | yatay taşma yok |
| Yerel kod = `origin/main` = canlı | ✅ üçü aynı |

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
| Node | `>=18.0.0` | **24.19.0** |
| npm | — | 11.17.0 |
| hono | `^4.6.14` | **4.13.4** |
| zod | `^3.24.1` | **3.25.76** |
| @hono/zod-validator | `^0.4.2` | 0.4.3 |
| **wrangler** | `^4.125.0` | **4.125.0** |
| vitest | `^2.1.8` | **2.1.9** |
| typescript | `^5.7.2` | **5.9.3** |
| @cloudflare/workers-types | `^5.20260825.1` | 5.20260825.1 |
| better-auth | `^1.1.3` | 1.7.1 *(kullanılmıyor)* |
| kysely / kysely-d1 | `^0.27.4` / `^0.3.0` | 0.27.6 / 0.3.0 *(kullanılmıyor)* |

**Wrangler 4 şarttır, 3 değil:** `assets.run_worker_first` dizi biçimi
Wrangler 4 gerektiriyor. Bu yüzden `@cloudflare/workers-types` da 5 olmalı.
`@cloudflare/vitest-pool-workers` **kaldırıldı** — Wrangler 4 ile çözülemez
peer çakışması yaratıyordu. Testler düz `vitest` ile Node altında koşuyor;
**bu yüzden test edilecek kod Cloudflare çalışma zamanına bağlı olmamalıdır**
(bkz. `src/lib/guards.ts`).

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
- `max_tokens` her model çağrısında **açıkça** verilir. **GPT-5 ailesinde alan
  adı `max_completion_tokens`'tır** — `callOpenAiUyumlu` bunu uyarlamalı halleder.
- Kaynak metin **6.000 karakterle** sınırlı (`MAX_SOURCE_CHARS`). Aşılırsa
  sessizce kırpılmaz, hata döner.
- Her AI ucunda **dakika bazlı hız sınırı**: soru üretimi/rubrik/örnek yanıt
  **5/dk**, değerlendirme **45/dk**.
- D1'e string birleştirmeyle SQL yazılmaz; `db.prepare(…).bind(…)` kullanılır.
- Sırlar `wrangler secret put` ile yönetilir, **koda veya depoya asla girmez.**
- Öğrenci verisiyle ilgili her değişiklikte `public/privacy-policy.html`
  güncellenir (§7).
- `main` her zaman deploy edilebilir kalır. Commit mesajları Conventional
  Commits (`feat:` `fix:` `docs:` `sec:` `test:` `chore:`).

## 6.3 ★★ BU PROJEYE ÖZGÜ, SERT ÖĞRENİLMİŞ DERSLER

Bunların her biri **gerçekten yaşanmış bir hatanın** sonucudur.

**1. `public/app.js` 290 KB — blok değiştirirken SINIRLARI DOĞRULA.**
Bir yeniden yazımda iki fonksiyon arasındaki aralık fazladan 4 fonksiyon
kapsadı ve onlar silindi; öğretmen sekmesi canlıda kırıldı. Bu yüzden dosya
sonunda **öz-kontrol** var: **197 adın** varlığını denetler, eksikse ekranda
kırmızı uyarı basar. **Yeni fonksiyon eklediysen `selfCheck` listesine ekle.**

**2. CSS sınıflarını kapsayıcıya bağlı tanımlama.**
`.opt-row` yalnızca `.q-card` içinde tanımlıydı; öğrenci sınav ekranında hiç
stil almadı. `.cv-warn` ile tekrarlanmak üzereydi. **🆕 Bu oturumda üçüncü kez
yaşandı:** `.empty-state` kendi zeminini taşımıyordu ve kartsız kullanıldığı
tek yerde lacivert üstünde 1,88:1 kontrasta düştü. Sonradan eklenen tüm
sınıflar bilinçli olarak **bağımsızdır**.

**3. Metin girdilerinde `renderAll()` çağırma — odak kaybolur.**
Açık uçlu yanıtlar bir dönem hiç kaydedilmiyordu. Çözüm: `saveSoon()` (400 ms
geciktirmeli kayıt). "Nota Aktar" düğmesi de bu yüzden `renderAll` çağırmaz.

**4. Prompt'taki örnek değerler kopyalanır.**
İstemdeki `"confidence": 0.72` örneği yüzünden model her yanıta 0.72 yazıyordu.
**Örneklere sabit sayı koyma.**

**5. SESSİZ GERİ DÜŞÜŞ YASAK.**
Model çağrısı başarısız olursa simülasyona düşüp sahte çıktıyı "AI üretti" diye
gösterme. Ne olduğu **ekranda yazar:** yedek model kullanıldıysa, sonuç
önbellekten geldiyse, veri simüleyse, depolama başarısızsa, günlükten kayıt
düştüyse.

**6. Model çıktısı güvenilmezdir — sunucuda normalleştir.**
Şema doğrulaması yeterli değil: `studentCount` analiz edilen yanıt sayısını
aşamaz; hizalama önerisi aday listesinde yoksa temizlenir; `needsSource`
gövdeden deterministik denetlenir; **Kiril harfi sızması** tespit edilip insana
bildirilir.

**7. İNLINE SCRIPT CSP İLE ÇALIŞMAZ — BU OTURUMDA İKİ KEZ DAHA YAŞANDI.**
`script-src 'self'` var, `'unsafe-inline'` **yok** (bilinçli). Bu yüzden HTML
içindeki `<script>…</script>` blokları **hiç çalışmaz ve sessizce başarısız
olur.** `mimari.html` (mermaid), `404.html` (istenen yol) ve
`privacy-policy.html` (rıza kutusu) bu yüzden ayrı `.js` dosyalarına taşındı.
**Yeni bir HTML sayfasına betik eklersen harici dosya yap.**

**8. JSONC'u regex ile ayrıştırma.** `//` dizisi URL'lerin içinde de geçer.
`npm run check:config` kullan. Bu dosyada daha önce sondaki virgül deploy'u kırdı.

**9. Yama dosyaya yazılmadan hata verirse DUR.**
Sonraki adımlar o değişikliklere bağımlı kod yazmasın.

**10. Hız sınırı — İKİ AYRI SAYAÇ VAR, KARIŞTIRMA.**
`/api/sync/*` sayacı **D1 tabanlıdır** (3 Eylül'den beri, `rate_limits`
tablosu) ve canlıda gerçekten tetiklenir — ölçüldü: 80 paralel istekte
60×200 + 20×429. `/api/ai/*` sayacı ise hâlâ **bellek içi ve isolate
başınadır** (`guards.ts` + `src/routes/ai.ts`). Jüri sorarsa dürüst cevap:
*"Senkron uçları D1 üzerinden dağıtık korunuyor; AI ucundaki sayaç tek
isolate içinde çalışır, orada pratik koruma ön ödemeli kredi ve otomatik
yüklemenin kapalı olmasıdır."*

> ⚠️ `test/sync-schemas.test.ts`'teki hız sınırı testleri `guards.ts`'in
> GENEL algoritmasını ve seçilen sabitleri dondurur; gerçek D1 entegrasyonunu
> test ETMEZ (D1 mock'u yok, proje `@cloudflare/vitest-pool-workers`'ı §6.1'de
> kaldırmıştı). Doğrulama canlı ölçümle yapıldı.

**11. KAÇIŞ DİZİSİ TUZAĞI.** `printf` ve Python heredoc içinde `\n`, `\a`, `\t`
**gerçek karaktere dönüşür**. `ANAHTAR-EKLE.bat`'ta `tools\anahtar` →
`toolsnahtar` oldu ve dosya hiç çalışmadı. **Dosyaya kod yazarken `Write`
aracını kullan**, kabuk kaçışına güvenme.

**12. Bir alanın "her zaman dolu" olduğunu VARSAYMA.**
`mcResults[qid].correct` ve `aiEvals[qid].breakdown` — ikisi de öğrenci
karnesini çökertti.

**13. "İhlal 0" gibi iddiaları tekrarlanabilir betikle ölç.**
Belgede "WCAG 2.5.8 ihlali 0" yazıyordu; ölçüldüğünde 9 ihlal çıktı.

**14. Türkçe büyük/küçük harf VE SAYI EKİ tehlikelidir.**
`İ/I/ı/i` tuzağı: `ELEKTRİĞİN İLETİMİ` → `Elektriğin I`.
**🆕 Sayı eki de sabit yazılamaz:** "%0'ını" ama "%50'sini", "%100'ünü".
Çözüm: cümleyi ek almayacak biçimde kur ("**%N oranında** değişiklik yaptı",
"**N tanesi** MEB programından").

**15. Test ölçütünün kendisi hatalı olabilir.** → §6.5'e bakınız, bu oturumda
beş kez yaşandı.

**16. 🆕 TEMADA İKİ AYRI METİN RENGİ VAR.**
Zemin lacivert, kartlar beyaz. Kart içindeki metin `--text`, zemin üstündeki
metin `--on-bg` kullanır. **Bir rengi yalnızca `@media` ya da `[data-theme]`
bloğunun içinde tanımlama** — o renk, damgasız durumda hiç uygulanmaz ve sayfa
bir temanın metnini diğerinin zeminine basar.

**17. 🆕 PYTHON `str.replace` İLE GİRİNTİLİ BLOK EKLERKEN DİKKAT.**
Bu oturumda **iki kez** yaşandı: 4 boşluklu bir desen, 6 boşluklu bir bloğun
içine de uydu ve token'lar iki kez yazıldı. Değiştirmeden önce `count()` ile
eşleşme sayısını doğrula; 1 değilse dokunma.

**18. 🆕 EKRAN GÖRÜNTÜSÜ KOORDİNATLARI GERÇEK GÖRÜNÜM ALANIYLA AYNI DEĞİL.**
Tarayıcı aracında ekran görüntüsü 800×758, gerçek görünüm 968×918 idi; sayfanın
alt kısmında tıklamalar ~113 px kayıyordu. **Küçük hedeflere `ref` ile tıkla**,
koordinatla değil.

**19. 🆕 `node --check` ÇALIŞMA ZAMANINI DENETLEMEZ.**
`const MC_VARSAYILAN_PUAN`, onu kullanan `state` nesnesinden SONRA tanımlanmıştı.
`const` hoist edilmez: sayfa `Cannot access ... before initialization` ile
**açılışta ölüyordu.** `node --check` temiz, `tsc` temiz, **98/98 test geçiyordu.**
Aynı turda ikinci örnek: `renderAdmin` içinden `const rows` kaldırılmış ama
`renderHeatmap("adminHeatmap", rows)` çağrısı kalmıştı.
**`public/app.js` değişikliği TARAYICIDA AÇILMADAN tamamlanmış sayılmaz.**

**20. 🆕 `wrangler deploy` VARLIĞI SESSİZCE ATLAYABİLİR.**
`public/app.js` değiştiği hâlde wrangler üç deploy boyunca
**"No updated asset files to upload"** dedi; canlı eski dosyayı sunmaya devam
etti (yerel 316.501 / canlı 316.334 bayt). `.wrangler/tmp` silmek ve `touch`
işe yaramadı; **dosyanın İÇERİĞİNİ değiştiren bir damga** eklenince
"Found 1 new or modified static asset" çıktı.
Ayrıca **kenar önbelleği gecikir** — yayılma birkaç dakika sürebilir ve arada
"inmemiş" gibi görünür.
> Her deploy'dan sonra ÖLÇ:
> `curl -s -H 'Cache-Control: no-cache' <taban>/app.js | grep -c <yeni_ad>`
> Tarayıcıda `location.reload()` yetmez; `fetch(url, {cache:'no-store'})` kullan.

**21. 🆕 KONTRAST ÖLÇERKEN YARI SAYDAM ZEMİNLERİ HARMANLA.**
Tarama karnede 4 ihlal bildirdi; hepsi `.sc-class` idi ve zemini
`rgb(127,127,127)` sanılmıştı. Gerçeği `rgba(127,127,127,**.18**)` —
harmanlanınca **14,2:1** ve **7,4:1** çıkıyor. **Ürün doğruydu, ölçüt hatalıydı.**
Zemin ararken alfa kanalını yok sayma; katmanları üst üste harmanla.

## 6.4 ★★ KULLANICININ AÇIKÇA İSTEDİĞİ ÇALIŞMA BİÇİMİ

1. **Önce kontrol, sonra işlem.** Önemli değişikliklerde önce riskleri listele,
   önlemini al, sonra uygula. *"Hata istemem."*
2. **Rasyonel ol, karşı çık.** Yanlış bir şey görürsen söyle; katılmıyorsan
   gerekçesiyle itiraz et. Kullanıcı bunu defalarca istedi ve **itiraz ettiğinde
   memnun oldu.**
3. **UYDURMA.** Fiyat, limit, sürüm, müfredat gibi bilgileri hafızadan verme —
   kaynağa bak.
4. **Her değişikliği test et, ölçtüğün sayıları raporla, sonra commit et.**
5. **`PROGRESS.md`'yi her adımda güncel tut** — bağlam kaybına karşı tek sigorta.
6. **İşlem öncesi tahmini süre (ETA) ver.** Kullanıcının kalıcı tercihi.
7. **Türkçe konuş.** Kullanıcıya görünen metinler Türkçe, kod içi adlar İngilizce.
8. **Madde madde plan sun, artı-eksi düşün, sonra uygula.**
9. **Kullanıcı ürünü elle kullanırken bulduğu hatalar en değerlileridir.**
   Bu oturumdaki iki en ciddi bulgu (kazanım sayısı, ısı haritası çelişkisi)
   oradan çıktı.
10. **🆕 Dışa dönük işlemi önce sor.** Canlıya alma (`deploy:demo`) ve
    GitHub'a gönderme (`git push`) jüriye açık yüzeyleri etkiler. Kullanıcı
    "yayınla" / "pushla" demeden yapma.

## 6.5 🆕 ★ YANLIŞ ALARM DERSİ — BUNU MUTLAKA OKU

Bu oturumda **beş kez**, kendi test aracımın kusurunu ürün hatası sandım.
Bir bulguyu bildirmeden önce **ölçütün kendisini doğrula.** Yaşananlar:

| Sandığım | Gerçek |
|---|---|
| `examTotalPoints()` çöküyor | Fonksiyon zorunlu argüman alıyor; ben yanlış argüman geçmiştim (`PROGRESS §15g`'de aynısı kayıtlı) |
| Soru adedi alanı state'i güncellemiyor | Alan `change` olayında bağlı; ben `input` göndermiştim |
| Yayın düğmesi sebepsiz pasif | Gerekçe pill'i ekranda **var**; arama regex'im panelin başındaki sekme metnine takılmıştı |
| Kavram yanılgısı 0 küme döndü | Sonuç `examId:questionId` anahtarında; ben sonuç yerleşmeden okumuştum |
| Rol kendiliğinden sıfırlanıyor · radyo 18×18 | Koordinat tıklamaları ıskalıyordu; radyonun dokunma hedefi onu saran **871×54 px**'lik `<label>` |

**Kural:** Bir hata bulduğunu düşündüğünde, önce *"benim ölçüm yöntemim doğru
mu?"* diye sor. Kodun ilgili yerini oku. Ancak ondan sonra bildir.

## 6.6 Yedek sağlayıcı anahtarını değiştirme

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

1. **Bu dosya** (§5.2 İlk Görev · §6.3 dersler · §6.4 çalışma biçimi · §6.5
   yanlış alarm dersi — özellikle bunlar)
2. `agents.md` — bağlayıcı kurallar
3. `PROGRESS.md` §17 → §24 (en yeni; §23 ve §24 son oturum)
4. `src/lib/prompts.ts` — ürünün kalbi, jüriye gösterilen dosya
5. `src/routes/ai.ts` → `src/schemas/ai.ts` → `src/lib/ai.ts` → `src/lib/guards.ts`
6. `public/app.js` — **yalnızca değiştireceğin bölümü**, sınırlarını doğrulayarak
7. `public/app.css` ilk 100 satırı — palet ve `--on-bg` katmanı (§1.7)

## Demo günü kontrol listesi

1. `npm run lint` · `npm test` · `npm run check:config` → hepsi temiz mi?
2. `curl <taban>/api/ai/status` → `ready: true` ve beklenen model mi?
3. İlk gerçek çağrıda `meta.fellBack` **false** mu? (true ise birincil düşmüş)
4. `python tools/injection-test.py <taban-url>` → 5/5 mi?
   *(Araç tarayıcı User-Agent'ı gönderir; göndermezse Cloudflare 403/1010 döner
   — bu bir ürün hatası değildir.)*
5. Workers Logs açık mı (canlı sorgu/hata göstermek için)?
6. `/privacy-policy` ve `/robots.txt` erişilebiliyor mu?
7. `v-demo` tag'i atıldı mı? (sunumdan 24 saat önce)
8. Demo senaryosu yüklenip 4 rol hızlıca gezildi mi?
9. **Canlı üretim gösterilecekse:** üretilen soruyu onaylamadan önce OKU
   (§4.8 — model Türkçe terimi yanlış yazabiliyor).
10. **Süre riski:** değerlendirme 6-29 sn arasında değişiyor. Sahnede canlı
    değerlendirme yapılacaksa önbellekten gelen bir örnek hazırda olsun.
