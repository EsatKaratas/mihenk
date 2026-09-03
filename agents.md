# AGENTS.md — T3 Vakfı Creathon · Problem 2

Bu dosya, bu depoda çalışan **AI kodlama asistanları** (Claude Code, Cursor,
Copilot Workspace vb.) ve **insan katkıda bulunanlar** için geçerli ortak kural
setidir. Bir değişiklik önerirken önce burayı okuyun; burada yazan bir kuralla
çelişen bir öneri, açıkça gerekçelendirilmeden birleştirilmez (merge edilmez).

Bu proje **T3 Vakfı Creathon — Problem 2: Yapay Zekâ Destekli Ölçme ve
Değerlendirme Sistemi** kapsamında geliştirilmektedir. Teknik mimari:
Cloudflare Workers + Hono + D1 (SQLite) + R2 + Workers AI.

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
- **Yetkilendirme:** Her korumalı rota `requireRole(...)` middleware'inden
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
  `max_tokens` (yaklaşık 600–800) açıkça verilir; sınırsız üretim isteği
  kod inceleme sırasında reddedilir.
- **Hız sınırlama:** Bir kullanıcı, aynı kaynak doküman için dakikada en fazla
  **5** "AI ile soru üret" isteği gönderebilir (basit bellek-içi ya da D1 tabanlı
  sayaç yeterlidir; harici bir rate-limit servisi gerekmez).
- **D1 sorgu disiplini:** `SELECT *` yerine ihtiyaç duyulan sütunlar; büyük
  listelerde (soru havuzu, analitik) sayfalama (`LIMIT`/`OFFSET`) zorunludur.
- **Queue kullanımı:** Senkron istek-yanıt döngüsünü 5 saniyeden uzun sürecek
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

1. `main` üzerinde `v-demo` tag'i atılmış mı?
2. `wrangler d1 execute ... --remote --file=./seed.sql` ile demo verisi yüklü mü?
3. Jüri için en az bir İçerik Uzmanı, bir Öğretmen ve bir Öğrenci test hesabı
   hazır mı (bkz. README → Demo Akışı)?
4. Workers Logs açık mı (canlı sorgu/hata göstermek için)?
5. `/privacy-policy` ve `/robots.txt` prod alan adında erişilebiliyor mu?
   (⚠️ Bu madde eskiden `/gizlilik-politikasi` diyordu; **öyle bir yol hiç
   olmadı**, 404 döndürüyordu. Gerçek yol `/privacy-policy` — canlıda 200
   doğrulandı, `public/robots.txt` de bu yolu izin veriyor.)
