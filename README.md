# T3 Vakfı Creathon — Problem 2
## Yapay Zekâ Destekli Ölçme ve Değerlendirme Sistemi

Soru hazırlama, açık uçlu sınavları değerlendirme ve kazanım analizini yapay
zekâ ile hızlandıran; **son puan onayını her zaman öğretmende tutan**
(Human-in-the-Loop) bir ölçme-değerlendirme platformu.

> ## 🔴 Canlı sistem
>
> **https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev**
>
> Cloudflare Workers üzerinde çalışıyor; soru üretimi ve açık uçlu puanlama
> **gerçek bir dil modeli** tarafından yapılır (Workers AI —
> `@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
>
> - [Mimari dokümantasyonu](https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev/mimari.html) — uçtan uca akış, D1 şeması, API rotaları, bileşen ağacı
> - [KVKK aydınlatma metni](https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev/privacy-policy.html)
>
> Arayüzün sağ üstündeki rozet, o an gerçek modelin mi yoksa yerel yedeğin mi
> çalıştığını gösterir. Ölçülen değerler (canlı ortam, tek deneme):
> soru üretimi ~10-17 sn, açık uçlu değerlendirme ~10 sn.

---

## 1. Problem ve çözüm

**Problem 2**, eğitimde ölçme-değerlendirme sürecinin üç aşamasını
(soru hazırlama, açık uçlu yanıt değerlendirme, kazanım analizi) yapay zekâ ile
hızlandırmayı, **ancak nihai kararı ve puan onayını öğretmende bırakmayı**
şart koşar. Bu depodaki sistem bu şartı mimari bir ilke olarak ele alır:

- Yapay zekâ **öneri üretir** (soru, çözüm süresi tahmini, açık uçlu puan +
  gerekçe) — hiçbir çıktı kullanıcıya doğrudan "sonuç" olarak ulaşmaz.
- Her AI çıktısı, ilgili insan rolünün (İçerik Uzmanı veya Öğretmen) onayından
  geçmeden bir sonraki aşamaya taşınmaz.
- Bu onay zinciri veritabanı düzeyinde de görünürdür: `questions.status`,
  `ai_evaluations` → `teacher_reviews` tabloları arasındaki geçişler, atlanamayan
  bir durum makinesi (state machine) olarak modellenmiştir (bkz. `schema.sql`).

## 2. Dört kullanıcı rolü

| Rol | Panel özeti |
|---|---|
| **İçerik Uzmanı** | Ders notu/metin yükler, konu/sınıf/kazanım belirler; AI'nin ürettiği çoktan seçmeli ve açık uçlu soruları düzenleyip onaylayarak ortak soru havuzuna aktarır. |
| **Öğretmen** | Soru havuzundan kazanım/zorluğa göre sınav oluşturur, AI'nin süre önerisini gerekirse değiştirir; açık uçlu sorular için rubrik tanımlar; AI'nin puan/gerekçe önerilerini tek tek inceleyip onaylar veya revize eder; sınıf analitiklerini ve kazanım ısı haritasını görür. |
| **Öğrenci** | Aktif/yaklaşan sınavlarını görür; geri sayımlı çözüm ekranında soruları yanıtlar (açık uçlu yanıtlar otomatik kaydedilir); öğretmen onayından sonra gerekçeli karnesini okur. |
| **Eğitim Yöneticisi** | Okul genelinde sınav tamamlanma oranını, öğretmenlerin bekleyen onaylarını ve kazanım bazlı başarı ısı haritasını tek bir özet panodan takip eder. |

Rollerin birbirini nasıl beslediğinin çalışan bir simülasyonu
`public/index.html` içinde yer alır (bkz. §6 Demo Akışı).

## 3. Mimari

```
                 ┌───────────────────────────┐
   Tarayıcı  ───▶│  Cloudflare Worker (Hono) │
                 │  src/index.ts             │
                 └─────────────┬─────────────┘
                                │
        ┌───────────────┬──────┴───────┬────────────────┐
        ▼               ▼              ▼                ▼
   D1 (SQLite)      Workers AI      R2 depolama      Queues
   binding: DB      binding: AI     kaynak dosyalar   AI_TASKS_QUEUE
   şema: schema.sql (soru üretimi,  ve dışa aktarılan  (uzun sürecek AI
                     puan önerisi)  raporlar           işlerini asenkron
                                                        işlemek için)
```

- **Cloudflare Workers + Hono** — tüm API rotaları tek bir Worker üzerinde
  çalışır; rota haritası `routes.ts` dosyasındadır (`/api/documents`,
  `/api/questions`, `/api/exams`, `/api/student/*`, `/api/admin/*`, …).
- **D1 (SQLite)** — 14 tablo:
  `ai_evaluations`, `analytics_snapshots`, `exam_assignments`,
  `exam_questions`, `exams`, `learning_outcomes`, `questions`, `rubrics`,
  `schools`, `source_document_outcomes`, `source_documents`, `submissions`,
  `teacher_reviews`, `users`.
  Tam tanım: `schema.sql`.
- **Workers AI** — soru üretimi ve açık uçlu yanıtların ilk (öneri niteliğinde)
  puanlanması için model çağrıları.
- **R2** — içerik uzmanının yüklediği kaynak dosyalar ve öğretmenin dışa
  aktardığı analiz raporları için nesne depolama.
- **Queues** — AI çağrılarını istek-yanıt döngüsünden ayırarak zaman aşımı
  riskini azaltır (`internal/ai/generate-questions`, `internal/ai/evaluate-submission`).
- **Better Auth** — e-posta/parola ve kurumsal OAuth (örn. Google Workspace)
  ile kimlik doğrulama; rol bilgisi `users.role` alanında tutulur ve girişte
  kullanıcıyı ilgili panele yönlendirir.

Mimari kararların gerekçeli anlatımı için üstteki **Mimari dokümantasyonu**
bağlantısına bakın.

## 4. Proje yapısı

```
├── package.json           # bağımlılıklar ve npm script'leri
├── tsconfig.json          # TypeScript strict yapılandırması
├── wrangler.jsonc         # ÜRETİM: Workers + D1 + R2 + Queues + AI
├── wrangler.demo.jsonc    # DEMO: yalnızca statik varlıklar + AI (bkz. §5)
├── schema.sql             # D1 şeması — 14 tablo
├── routes.ts              # tam rota iskeleti (referans; handler'lar TODO)
├── agents.md              # geliştirici/AI asistan kuralları
├── README.md              # bu dosya
├── src/
│   ├── index.ts           # Worker giriş noktası (Hono)
│   ├── routes/ai.ts       # /api/ai/* — soru üretimi ve ön değerlendirme
│   ├── lib/ai.ts          # sağlayıcı bağımsız model çağrısı + JSON onarımı
│   ├── lib/prompts.ts     # model istemleri (jüriye gösterilebilir tek dosya)
│   └── schemas/ai.ts      # Zod şemaları (agents.md §7.2 gereği)
├── seed/turkishmmlu/      # dataset dönüştürme katmanı
└── public/
    ├── index.html         # interaktif 4-rol prototipi (demo arayüzü)
    ├── mimari.html        # mimari dokümantasyon sayfası
    ├── 404.html           # bilinmeyen rotalar için hata sayfası
    ├── privacy-policy.html# KVKK aydınlatma metni / gizlilik politikası
    └── robots.txt         # arama motoru indeksleme kuralları
```

## 5. Yerelde çalıştırma

**Gereksinimler:** Node.js ≥ 18 (https://nodejs.org — LTS sürümü) ve bir
Cloudflare hesabı. Wrangler `npx` ile çalışır, ayrıca kurmaya gerek yoktur.

### 5.1 Hızlı yol — demo yapılandırması (önerilen)

Demo akışı D1, R2 ve Queues kullanmaz. Üretim yapılandırması bunları bağladığı
için iki engel çıkarır: `database_id` doldurulmadan deploy başarısız olur ve
Queues ücretsiz planda kullanılamaz. `wrangler.demo.jsonc` yalnızca statik
varlıkları ve Workers AI'ı bağlar:

```bash
npm install
npx wrangler login
npm run dev:demo      # http://localhost:8787
npm run deploy:demo   # https://t3-olcme-degerlendirme.<hesap>.workers.dev
```

Arayüzün sağ üstündeki rozet hangi modda çalışıldığını gösterir:
**"Gerçek model"** (Worker'a ulaşılıyor) veya **"Yerel simülasyon"** (ulaşılamıyor,
şablon tabanlı yedek devrede). Bu rozet bilinçlidir — sistemin sessizce
simülasyona düşüp gerçek yapay zekâ gibi görünmesini engeller.

### 5.2 Model sağlayıcısını değiştirme

Workers AI üzerindeki küçük modeller Türkçede yer yer zayıf kalabilir. Kalite
yetersizse mimari değişmeden sağlayıcı değiştirilebilir — `wrangler.demo.jsonc`
içindeki `vars` bloğunda:

```jsonc
"AI_PROVIDER": "openai",              // veya "anthropic"
"AI_MODEL": "<model-adı>",
"AI_BASE_URL": "<sağlayıcı-uç-noktası>"
```

```bash
npx wrangler secret put AI_API_KEY -c wrangler.demo.jsonc
```

Model istemlerinin tamamı `src/lib/prompts.ts` içindedir.

### 5.3 Tam üretim yapılandırması

```bash
# 1) Bağımlılıkları kurun
npm install

# 2) Cloudflare hesabınıza giriş yapın
npx wrangler login

# 3) D1 veritabanını oluşturun ve dönen database_id'yi wrangler.jsonc'a yapıştırın
npx wrangler d1 create olcme-db

# 4) Şemayı yerel D1'e uygulayın
npm run db:migrate:local

# 5) (opsiyonel) R2 bucket ve Queue oluşturun — yalnızca bu servisleri
#    kullanan rotaları test edecekseniz gereklidir
npm run r2:create
npm run queue:create

# 6) Gizli değerleri yerel geliştirme için .dev.vars dosyasına yazın
#    (bu dosya .gitignore'da olmalıdır — bkz. §7)
echo 'BETTER_AUTH_SECRET=degistirin-bu-cok-gizli-bir-deger' >> .dev.vars

# 7) Geliştirme sunucusunu başlatın
npm run dev
```

`npm run dev` komutu Worker'ı `http://localhost:8787` üzerinde açar;
`public/index.html` aynı adresten servis edilir, API rotaları `/api/*`
altındadır.

## 6. Demo akışı (jüri için önerilen sıra)

`public/index.html` üzerinden, backend'e bağlanmadan da çalışan interaktif
prototipte şu sıra izlenebilir:

1. **İçerik Uzmanı** sekmesinde bir ders notu yapıştırıp "AI ile Soru Üret"e
   basın; üretilen 2 çoktan seçmeli + 1 açık uçlu soruyu inceleyip onaylayın.
2. **Öğretmen → 1. Sekme**'de onaylı sorulardan bir sınav oluşturun, süre
   önerisini isterseniz değiştirin.
3. **Öğretmen → 2. Sekme**'de açık uçlu soru için rubriği tamamlayın (ağırlıklar
   %100 olmalı) ve sınavı yayınlayın.
4. **Öğrenci** sekmesinde sınava girin, soruları yanıtlayıp "Sınavı Bitir"e
   basın.
5. **Öğretmen → 3. Sekme**'de AI'nin puan/gerekçe önerisini görün; tek tıkla
   onaylayın veya puanı değiştirip onaylayın.
6. **Öğrenci → 3. Sekme**'de karneyi, **Eğitim Yöneticisi** panelinde ise
   kazanım ısı haritasının canlı güncellendiğini gösterin.

Üretim ortamında bu akışın backend karşılığı `routes.ts`'teki rotalardır;
prototipteki AI adımları şablon tabanlı bir simülasyon olup, üretimde
`c.env.AI.run(...)` çağrılarıyla değiştirilir.

## 7. Ortam değişkenleri ve sırlar

| Değişken | Nerede | Açıklama |
|---|---|---|
| `APP_NAME`, `APP_ENV` | `wrangler.jsonc` → `vars` | Gizli olmayan, ortama özgü ayarlar |
| `BETTER_AUTH_SECRET` | `wrangler secret put BETTER_AUTH_SECRET` | Oturum imzalama anahtarı |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `wrangler secret put ...` | Kurumsal OAuth girişi (opsiyonel) |

Yerel geliştirmede bu sırlar `.dev.vars` dosyasına yazılır; bu dosya **asla**
commit edilmez (`.gitignore`'a ekleyin). Üretimde:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
```

## 8. Deploy (üretim)

```bash
npm run db:migrate:remote   # uzak D1'e şemayı uygula
npx wrangler secret put BETTER_AUTH_SECRET
npm run deploy
```

`wrangler deploy`, Worker'ı `*.workers.dev` alt alan adında yayınlar; kurumsal
bir alan adı için `wrangler.jsonc` içindeki yorumlu `routes` bloğunu etkinleştirin.

## 9. Bilinen sınırlamalar ve yol haritası

- **Backend kapsamı:** Yalnızca `/api/ai/*` uçları uygulanmıştır (soru üretimi
  ve açık uçlu ön değerlendirme). `routes.ts` içindeki diğer rotalar hâlâ
  iskelettir; kimlik doğrulama (Better Auth), kalıcı D1 yazımı ve rol bazlı
  yetkilendirme henüz uygulanmamıştır.
- **Veri kalıcılığı yok:** Prototip durumu yalnızca tarayıcı belleğinde tutulur;
  sayfa yenilenince sıfırlanır. Roller arası geçiş tek oturumda simüle edilir.
- **Yedek mod:** Worker'a ulaşılamazsa AI adımları anahtar-kelime tabanlı yerel
  simülasyona düşer. Bu durum arayüzde açıkça gösterilir; sessiz bir geri düşüş
  değildir.
- Prototip tek bir demo öğrenci üzerinden akışı gösterir; çoklu öğrenci/sınıf
  yönetimi backend'de `exam_assignments` tablosu üzerinden desteklenir ancak
  prototipte ayrıca görselleştirilmemiştir.
- Geliştirici kuralları (branch stratejisi, token/kaynak sınırları) için
  `agents.md` dosyasına bakın.

## 10. Gizlilik ve veri koruma

Sistem, önemli bir kısmı 18 yaşından küçük olabilecek öğrencilerin sınav ve
performans verilerini işler. Ayrıntılar için `public/privacy-policy.html`
(KVKK aydınlatma metni) dosyasına bakın; üretime almadan önce hukuki inceleme
önerilir.

---

**Takım:** T3 Vakfı Creathon katılımcısı · **Kapsam:** Problem 2 — Yapay Zekâ
Destekli Ölçme ve Değerlendirme Sistemi
