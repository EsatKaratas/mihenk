# AGENTS.md — T3 Vakfı Creathon · Problem 2

Bu dosya, bu depoda çalışan **AI kodlama asistanları** (Claude Code, Cursor,
Copilot Workspace vb.) ve **insan katkıda bulunanlar** için geçerli ortak kural
setidir. Bir değişiklik önerirken önce burayı okuyun; burada yazan bir kuralla
çelişen bir öneri, açıkça gerekçelendirilmeden birleştirilmez (merge edilmez).

Bu proje **T3 Vakfı Creathon — Problem 2: Yapay Zekâ Destekli Ölçme ve
Değerlendirme Sistemi** kapsamında geliştirilmektedir.

> ## ⚠️ GÜNCELLİK NOTU — son durum 19 Ekim 2026 (ilk yazım 6 Eylül, PROGRESS §50f)
>
> **Bu dosyanın bir kısmı HEDEF mimariyi anlatır, KURULU olanı değil.** Kural
> setinin kendisi geçerlidir; ama §2, §4 ve §5'teki bazı teknik ayrıntılar
> ürünün bugünkü hâliyle örtüşmez. Yeni katkıda bulunan buna göre okumalıdır:
>
> | Bu dosyada yazan | Ürünün bugünkü hâli |
> |---|---|
> | `D1 (SQLite) + R2` bağlı | **D1 bağlaması YOK** (§43'te söküldü, tek kullanıcısı sınıf kodu senkronuydu). R2 hiç bağlanmadı. Sunucuda ürün verisi tutulmaz; her şey `localStorage` + IndexedDB'dedir |
> | §2 `requireRole(...)` middleware'i | **Kimlik doğrulama YOKTUR.** Rol bir `state.role` seçimidir; sunucuda korunan rota yoktur |
> | §2 rota yapısı, `routes.ts` durum makinesi | `routes.ts` **çalışan kod değil**, referans iskelettir; her handler `c.json({ todo })` döner |
> | §5 dosya ağacı (`routes/auth.ts`, `documents.ts`, `lib/rubric.ts`, `migrations/`) | Gerçek ağaç: `src/index.ts`, `src/routes/ai.ts`, `src/lib/{ai,guards,prompts}.ts`, `src/schemas/ai.ts`. `migrations/` yok |
> | §4 `AI_TASKS_QUEUE` ile asenkron işleme | Queue **kullanılmıyor**; çağrılar senkron. (Ücretsiz planda Queues yüzünden `npm run deploy` kırılır — `deploy:demo` kullanılır) |
> | §4 `max_tokens` **yaklaşık 600–800** | Bu sayı tek soru içindi. Bugün istek başına hesaplanır: `700 + soru×700`, tavan **5600** (§48). Sınır hâlâ AÇIKÇA verilir — "sınırsız üretim" yasağı aynen geçerlidir |
> | §6 "yetkisiz rol erişemez" testi | Sunucuda rol olmadığı için yazılamaz. Yerine `test/` altındaki 12 dosyada **338 test** (`guards`, `schemas`, `rota`, `mufredat`, `hesap`, `cozucu` ve diğerleri; 20 Ekim'de ölçüldü) ile `tools/ozkontrol-dogrula.mjs` (380 ad, %100) koşar. Şüphe rozetleri (B1) ve uyum raporu (A7) da §1'e bağlıdır: hiçbiri onayı engellemez ya da otomatik karar vermez |
> | §8 demo kontrol listesi (`d1 execute --remote`, test hesapları) | D1 ve hesap yok; demo tohumu istemcide (`loadDemoScenario`). §8.5'teki `/privacy-policy` ve `/robots.txt` maddeleri geçerlidir ve canlıda doğrulanmıştır |
>
> **Değişmeyen ve tam bağlayıcı olanlar:** §1 (Human-in-the-Loop), §7
> (yasaklar), §3'ün commit biçimi (Conventional Commits) ve §4'ün kaynak
> disiplini ilkeleri. Son üçü ölçülerek doğrulandı: kaynak metin istemcide
> 6.000 karaktere kırpılıyor (`app.js`) ve sunucuda `MAX_SOURCE_CHARS` ile
> reddediliyor; hız sınırı **altı ucun hepsinde** bağlı (`rateLimited(...)`);
> `max_tokens` her çağrıda açıkça veriliyor ve `ev: "ai_call"` kaydı
> `approxPromptChars` + `maxTokens` ile Workers Logs'a yazılıyor.
>
> **§3'te fiilen UYGULANMAYAN madde:** "PR zorunlu · `main`'e doğrudan push
> yasaktır". 180 commit'in yalnızca 5'i birleştirmedir (19 Ekim'de sayıldı); §43'ten beri iş
> doğrudan `main` üzerinde yürüyor (tek kişilik bakım + yarışma ve burs takvimi).
> Kural yazılı bırakıldı çünkü ekip çalışmasına dönüldüğünde geçerli olmalı;
> ama **bugün böyle çalışılmadığı burada kayıtlıdır** — okuyan yanılmasın.
>
> **19 Ekim 2026'dan itibaren** proje T3 AI Lisans Araştırmacı bursu için bir
> araştırma çalışmasına da temel oluyor: [`docs/ARASTIRMA.md`](./docs/ARASTIRMA.md)
> (araştırma sorusu, ön bulgular, 6 aylık plan) ve
> [`docs/HATA_TAKSONOMISI.md`](./docs/HATA_TAKSONOMISI.md) (gözlenen hata
> türleri, kodlu). Ölçüm seti ve betiği `tools/olcum/` altında. Bu çalışma da
> §1'e bağlıdır: hiçbir otomatik denetim "otomatik kabul" için kullanılmaz.
>
> Tek doğruluk kaynağı `PROGRESS.md`'dir.


## 1. Değiştirilemez ilke: Human-in-the-Loop

Bu, jüri değerlendirmesinde projenin ayırt edici noktasıdır ve **hiçbir
refactor, "otomasyon iyileştirmesi" ya da performans gerekçesiyle
zayıflatılamaz**:

- Yapay zekânın ürettiği hiçbir çıktı (soru, çözüm süresi önerisi, açık uçlu
  puan/gerekçe) kullanıcıyı etkileyen **nihai** bir karar olamaz.
- `questions.status`, `ai_evaluations` ve `teacher_reviews` tabloları arasındaki
  onay zincirini atlayan hiçbir kısayol eklenemez (örn. "puan eşiği X üzerindeyse
  otomatik onayla" gibi bir özellik bu projenin kapsamı dışındadır).
- Bir PR, öğretmen/içerik uzmanı onayını devre dışı bırakan ya da bypass eden bir
  yol açıyorsa, gerekçesi ne olursa olsun reddedilir.

## 2. Mimari standartlar

- **Kaynak referansları:** Veritabanı şeması `schema.sql`, rota iskeleti
  `routes.ts` içindedir; yeni bir tablo veya endpoint eklerken önce bu iki
  dosyadaki adlandırma ve durum makinesi (status enum) kalıplarını izleyin.
- **Rota yapısı:** Her panel/sekme kendi Hono alt-router'ında yaşar
  (`app.route("/api/exams", exams)` gibi). Yeni bir panel eklenmeden yeni bir
  üst-seviye router açmayın.
- **Yetkilendirme:** *(HEDEF — bugün kimlik doğrulama yok, bkz. güncellik notu.)*
  Her korumalı rota `requireRole(...)` middleware'inden
  geçmelidir. Rol kontrolünü route handler içine gömülü `if` ifadeleriyle
  tekrar tekrar yazmayın.
- **Girdi doğrulama:** Dışarıdan gelen her `POST`/`PATCH` gövdesi
  `@hono/zod-validator` ile bir Zod şemasına karşı doğrulanır. Doğrulamasız
  `c.req.json()` kullanımı code review'da otomatik reddedilir.
- **Veritabanı erişimi:** D1'e doğrudan string birleştirmeyle SQL yazmayın;
  `db.prepare(...).bind(...)` parametre bağlama kullanın. Ham kullanıcı girdisi
  hiçbir zaman sorgu metnine enterpole edilmez (SQL injection sınırı).
- **Zaman damgaları:** Tüm `TEXT` zaman damgaları `datetime('now')` (UTC, ISO
  benzeri) formatındadır; istemci tarafı yerel saat dönüşümünü UI katmanında
  yapın, veritabanında değil.
- **Hata biçimi:** Her hata yanıtı `{ "error": "<kısa_kod>", "message": "..." }`
  şeklinde tutarlı bir JSON gövdesi döner; düz metin veya HTML hata sayfası
  sadece `/404.html` için geçerlidir.

## 3. Git ve branch stratejisi

- **`main` her zaman deploy edilebilir durumda kalır.** `main`'e doğrudan push
  yasaktır; korumalı branch ayarı açık tutulur.
- **Branch adlandırma:** `feature/<kısa-açıklama>`, `fix/<kısa-açıklama>`,
  `docs/<kısa-açıklama>`. Türkçe veya İngilizce kısa açıklama kabul edilir,
  boşluk yerine tire kullanın.
- **Commit mesajları:** [Conventional Commits](https://www.conventionalcommits.org/)
  formatı — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Pull Request zorunlu:** Her değişiklik en az bir takım arkadaşı tarafından
  review edilmeden `main`'e girmez. `npm run lint` ve `npm run test` CI'da
  yeşil olmadan merge edilmez.
- **Merge stratejisi:** Squash-and-merge — `main` geçmişi tek satırlık,
  okunabilir bir özet zinciri olarak kalır.
- **Demo günü dondurması (freeze):** Jüri sunumundan **24 saat önce** `main`
  üzerinde bir `v-demo` tag'i oluşturulur. Bu tag'den sonra `main`'e sadece
  kritik hata düzeltmesi (`fix:`) girer; yeni özellik eklenmez.

## 4. Token ve kaynak sınırları

Bu proje Cloudflare'in ücretsiz/deneme kotalarıyla çalışacak şekilde
tasarlanmalıdır — jüri günü kotanın dolması nedeniyle demonun çökmesi kabul
edilemez bir risktir.

- **Workers AI istek boyutu:** İçerik uzmanının yükleyebileceği ders notu
  istemci tarafında **6.000 karaktere** kırpılır/uyarılır; bu sınırı aşan
  istekler `413`-benzeri bir hata ile reddedilir (`internal/ai/generate-questions`).
- **Üretim çıktı sınırı:** Soru üretimi isteklerinde model çağrısına
  `max_tokens` **açıkça** verilir; sınırsız üretim isteği kod inceleme
  sırasında reddedilir. *(Değer güncellendi: 600–800 tek soru içindi; bugün
  `700 + soru×700`, tavan 5600 — bkz. PROGRESS §48.)*
- **Hız sınırlama:** Bir kullanıcı, aynı kaynak doküman için dakikada en fazla
  **5** "AI ile soru üret" isteği gönderebilir (basit bellek-içi ya da D1 tabanlı
  sayaç yeterlidir; harici bir rate-limit servisi gerekmez).
- **D1 sorgu disiplini:** `SELECT *` yerine ihtiyaç duyulan sütunlar; büyük
  listelerde (soru havuzu, analitik) sayfalama (`LIMIT`/`OFFSET`) zorunludur.
- **Queue kullanımı:** *(HEDEF — bugün Queue kullanılmıyor, çağrılar senkron.)*
  Senkron istek-yanıt döngüsünü 5 saniyeden uzun sürecek
  bir AI çağrısıyla bloklamayın — `AI_TASKS_QUEUE` üzerinden asenkron işleyin.
- **Maliyet görünürlüğü:** Her AI çağrısının tahmini token sayısı
  `console.log` ile Workers Logs'a yazılır; demo öncesi ekip bu logları
  gözden geçirir.

## 5. Kod stili ve dosya yapısı

```
src/
  index.ts              # Hono app + tüm app.route() bağlamaları (routes.ts referans alınır)
  routes/
    auth.ts  documents.ts  questions.ts  exams.ts  grading.ts  student.ts  admin.ts  internal.ts
  lib/
    auth.ts              # Better Auth kurulumu (D1/Kysely adapter)
    ai.ts                # Workers AI çağrı sarmalayıcıları
    rubric.ts            # Rubrik puanlama yardımcı fonksiyonları
  schemas/               # Zod şemaları (route girdileri)
migrations/              # schema.sql'den türetilen sıralı migration dosyaları
public/                  # 404.html, privacy-policy.html, robots.txt, index.html (prototip)
schema.sql                # Referans şema — migrations/ ile senkron tutulur
```

- TypeScript **strict** modu açık kalır; gerekçesiz `any` kullanılmaz.
- Dosya ve değişken adları İngilizce, kullanıcıya görünen metinler Türkçe.
- Bir fonksiyon 40 satırı geçiyorsa, bölünüp bölünemeyeceği değerlendirilir.

## 6. Test ve doğrulama beklentisi

- Rubrik puanlama ve MC otomatik değerlendirme mantığı için `vitest` birim
  testleri zorunludur (`npm run test`).
- Yeni bir endpoint eklendiğinde, en az bir "yetkisiz rol erişemez" testi
  eklenir (`requireRole` regresyonunu yakalamak için).
- Manuel QA: her PR, [interaktif prototip](./public/index.html) üzerindeki
  4 rol döngüsünü (İçerik Uzmanı → Öğretmen → Öğrenci → Öğretmen onayı →
  Eğitim Yöneticisi) bozmadığını doğrulamalıdır.

## 7. Yasaklar

- `.dev.vars`, gerçek D1 `database_id` dışındaki sırlar veya OAuth
  client secret'ları **asla** commit edilmez; sırlar `wrangler secret put`
  ile yönetilir.
- Üretim (`--remote`) D1 veritabanına migration dosyası olmadan elle
  `ALTER TABLE`/`DROP TABLE` çalıştırılmaz.
- `robots.txt` ve `/api/`, `/internal/` disallow kuralları gevşetilmez.
- Küçüklerin (öğrenci) verisiyle ilgili herhangi bir değişiklik
  `privacy-policy.html`'deki ilgili bölüm güncellenmeden birleştirilmez.

## 8. Demo günü kontrol listesi

*(7 Kasım 2026'da güncellendi, PROGRESS §127. Eski liste D1 tohumu ve test
hesapları istiyordu; ikisi de bugün yok. Senaryo:
[`docs/DEMO-SENARYOSU-2026-11.md`](./docs/DEMO-SENARYOSU-2026-11.md).)*

1. **Sürüm:** `main` üzerinde `v-demo` tag'i atılmış mı (§3 dondurma, 24 saat
   önce)? Canlıdaki sürüm demoda anlatılacak özellikleri içeriyor mu? Bunun
   için `bash tools/dogrula/sha-karsilastir.sh HEAD` çalıştır: canlı = disk = blob
   olmalı. §119–§122 (demo alanı, 24 öğrencili sınıf) ancak §123 dalı
   yayınlandıktan sonra canlıdadır.
2. **Demo verisi:** D1 yok; demo tohumu istemcidedir (`loadDemoScenario`, §120
   demo alanı). Gizli pencerede **"▶ Rehberli demo (5 adım)"** baştan sona
   yürünür; `node tools/dogrula/demo-yuru.mjs <canlı-url> <klasör> 1280` ve
   `390` çalıştır: 5 adım, konsol hatası 0, `/api/ai` POST 0.
3. **Hesaplar:** kimlik doğrulama yok, test hesabı gerekmez. Rol giriş
   ekranından seçilir. Arayüzde "Demo sürümü: kimlik doğrulama yoktur" yazar.
4. **Kota:** `GET /api/ai/butce` → `doldu: false` mu? Doluysa canlı soru
   üretimi (senaryodaki ⊕ satırı) atlanır, "kota dolu" şeridi gösterilir.
   Sayaç 00:00 UTC'de (03:00 TR) sıfırlanır (§93). Demo günü öncesinde
   gereksiz model çağrısı yapılmaz.
5. **Durum:** `GET /api/ai/status` → `ready`; birincil model
   `llama-3.3-70b-instruct-fp8-fast`, yedek Scout. Workers Logs açık mı?
6. **Sayfalar:** `/`, `/privacy-policy`, `/veri-nereye-gider`, `/robots.txt`
   prod alan adında 200 dönüyor mu, güvenlik başlıkları yerinde mi (§118)?
   (⚠️ Eski madde `/gizlilik-politikasi` diyordu; **öyle bir yol hiç olmadı**.
   Gerçek yol `/privacy-policy`.)
7. **Kanıt turu sekmeleri** hazır mı: `/veri-nereye-gider` ve GitHub'da
   `docs/olcum/PANO.md` (37/37). Kanıt turu, "Demoyu Bitir"den **önce**
   yapılır; demodan çıkınca demo verisi silinir.
8. **Ölçüm seti yeşil mi:** `npm test`, `npm run lint`, `npm run check:config`,
   `node tools/ozkontrol-dogrula.mjs`, `npm run olcum:dogrula`. README rozeti
   ve altbilgideki sayılar bu çıktılarla aynı mı ([`docs/IDDIA-KANIT.md`](./docs/IDDIA-KANIT.md))?
9. **B planı:** `docs/ekran/` ve dolu sınıf görüntüleri açılabilir durumda
   mı? Senaryonun §6'sına bak.
