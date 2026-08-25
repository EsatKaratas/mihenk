# PROJE DURUM KAYDI

> Bu dosya, oturumlar arası bağlam kaybına karşı tutulan **tek doğruluk kaynağıdır.**
> Yeni bir yapay zekâ oturumu veya yeni bir ekip arkadaşı buradan devralabilir.
> Buradaki her madde **doğrulanmıştır** — doğrulanmamış olanlar açıkça öyle işaretlidir.
> Son güncelleme: 25 Ağustos 2026

---

## 0. Tek satırda durum

Sistem **canlıda ve gerçek bir dil modeliyle çalışıyor.** Prototip arayüzü (4 rol),
Workers AI üzerinden soru üretiyor ve açık uçlu yanıtları rubriğe göre puanlıyor;
nihai puanı her zaman öğretmen onaylıyor. Kalıcı veritabanı ve kimlik doğrulama
**yok** (bilinçli kapsam kararı — bkz. §6).

---

## 1. Adresler ve hesaplar

| Ne | Nerede |
|---|---|
| Canlı sistem | https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev |
| GitHub (public) | https://github.com/EsatKaratas/t3-olcme-degerlendirme |
| Yerel klasör | `C:\Users\pc\t3-olcme-degerlendirme` |
| Cloudflare hesabı | karatasesat@hotmail.com · account id `8f038be6be2c6e5ad71da437d444584a` |
| GitHub kullanıcısı | EsatKaratas |

**Yarışma:** T3 Vakfı Bursiyer Yapay Zekâ Creathon — **Problem 2**
**Takım:** BİES — İrem Yazıcı, Zeynep Sude Demir, Esat Talha Karataş
**Teslim:** 26 Ağustos 2026 (KIS üzerinden) · **Final:** 5-6 Eylül 2026, BAU Beşiktaş

---

## 2. Çalıştırma

```bash
npm install
npx wrangler login          # bir kez
npm run dev:demo            # http://localhost:8787
npm run deploy:demo         # canlıya al
npm run lint                # tsc --noEmit
```

> **Neden `wrangler.demo.jsonc` var:** Üretim yapılandırması (`wrangler.jsonc`)
> D1 + R2 + Queues bağlar. İkisi de demo akışı için gereksiz ve **deploy'u
> engelliyor**: `database_id` placeholder ve Queues ücretsiz planda yok.
> Demo yapılandırması yalnızca statik varlıkları + Workers AI'ı bağlar.
> Üretim yapılandırması silinmedi, olduğu gibi duruyor.

---

## 3. Mimari — gerçekte ne var

```
public/index.html   tek dosyalık 4 rol prototipi (vanilla JS, build yok)
  └─ fetch ──▶ Cloudflare Worker (Hono)
                 src/index.ts        giriş noktası
                 src/routes/ai.ts    /api/ai/{status,generate-questions,evaluate}
                 src/lib/prompts.ts  model istemleri  ← JÜRİYE GÖSTERİLECEK DOSYA
                 src/lib/ai.ts       sağlayıcı bağımsız çağrı + JSON onarımı
                 src/schemas/ai.ts   Zod şemaları
                 └─ env.AI ──▶ Workers AI
```

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
**Sağlayıcı değiştirme:** `wrangler.demo.jsonc` → `vars.AI_PROVIDER` = `workers-ai` |
`openai` | `anthropic`. Harici sağlayıcı için `npx wrangler secret put AI_API_KEY -c wrangler.demo.jsonc`.
Mimari değişmez, yalnızca model sağlayıcısı değişir.

**Yerel yedek:** Worker'a ulaşılamazsa arayüz şablon tabanlı simülasyona düşer ve
**bunu ekranda açıkça yazar** (sağ üst rozet). Sessiz geri düşüş yoktur — bu
bilinçli bir dürüstlük kararıdır.

---

## 4. Ölçülen değerler (canlı ortam, gerçek model)

| İşlem | Süre | Not |
|---|---|---|
| Soru üretimi (2 ÇSS + 1 açık uçlu) | 10-17 sn | tek denemede |
| Açık uçlu değerlendirme | ~10 sn | tek denemede |
| Boş yanıt | anında | model çağrılmadan 0 puan |
| Prompt injection denemesi | 3,3 sn | **0/20 ile reddedildi** |

---

## 5. Bulunan ve düzeltilen hatalar (kronolojik)

Bunların hepsi **gerçek hatalardı** ve çoğu jüri gününde ortaya çıkardı.

1. **`prototip.html` / `mimari.html` geçerli HTML belgesi değildi** — Artifact gövdesi
   olarak yazılmışlar; `<!doctype>`, `<html>`, `<head>`, **`<meta charset>` yok.**
   Türkçe karakter riski. → Sarmalandı, `public/` altına taşındı.
2. **`mimari.html` Mermaid diyagramları bağımsız barındırmada render olmuyordu.**
   → CDN yükleyici eklendi, yüklenemezse sayfa bozulmuyor.
3. **`tsconfig.json` hiç yoktu** — TypeScript derlenemiyordu. → Eklendi (strict).
4. **`assets.run_worker_first` dizi biçimi Wrangler 4 gerektiriyor**, `package.json`
   Wrangler 3'e sabitti. **Proje mevcut hâliyle deploy edilemiyordu.**
   → Wrangler 4.125 + workers-types 5. `@cloudflare/vitest-pool-workers` çözülemez
   peer çakışması yarattığı için kaldırıldı (yalnızca testler için gerekliydi).
5. **Zod hataları `agents.md` §2 hata biçimine uymuyordu** → özel hata kancası.
6. **`evaluate.outcomeLabel` `.min(1).default('')`** — Zod varsayılanı da doğruladığı
   için opsiyonel alan fiilen zorunlu olmuştu. → `.min(1)` kaldırıldı.
7. **Model kullanımdan kaldırılmıştı** — `@cf/meta/llama-3.1-8b-instruct` 2026-05-30'da
   emekli. → `llama-3.3-70b-instruct-fp8-fast`.
8. **Workers AI `response` alanı bu modelde nesne dönüyor**, string değil.
   `String(...)` → `"[object Object]"` → JSON.parse patlıyordu. → Tip kontrolü eklendi.
9. **`max_tokens` yetersizdi** (220/soru) — yanıt kesiliyor, ilk deneme başarısız
   olup gereksiz retry ile süre 27 sn'ye çıkıyordu. → 420/soru, tek denemede ~17 sn.
10. **🔴 Sadece-ÇSS sınavı sonsuza dek kilitleniyordu.** `maybeCompleteGrading()`
    yalnızca bir açık uçlu soru onaylandığında çağrılıyordu; sınavda açık uçlu soru
    yoksa hiç tetiklenmiyor, `examStatus` sonsuza dek `"submitted"` kalıyor,
    **öğrenci karnesi hiç oluşmuyordu.** → Açık `publishResults()` akışı.
11. **Öğrenci sınav ekranındaki şıklar hiç stil almıyordu** — `.opt-row` kuralları
    yalnızca `.q-card` içinde tanımlıydı, şık harfi metne yapışıyordu (`AF = m * a`).
    → Ayrı `.answer-opt` kural seti.
12. **README "9 tablo" diyordu**, `schema.sql`'de 14 tablo var. → Şemadan okunarak
    düzeltildi (ilk düzeltmede iki tablo adı yanlış yazılmış, `schema.sql`'e karşı
    kontrol edilip tekrar düzeltildi).

---

## 6. Bilinçli olarak YAPILMAYANLAR

Bunlar unutulmuş değil, **kasıtlı olarak kapsam dışı** bırakıldı. Gerekçe: teslime
kalan süre ve Kreaton rehberinin *"yarım ürün, tam problem çözümü"* ilkesi. Hiçbiri
jüriye görünmüyor, hepsi zaman yiyor.

- Better Auth / gerçek kimlik doğrulama (rol geçişi arayüzden yapılıyor)
- `migrations/` klasörü (şema `d1 execute --file` ile uygulanıyor)
- Vitest testleri
- `routes.ts`'in gerçek `src/routes/*` yapısına tam bölünmesi (yalnızca AI uçları yazıldı)
- Kalıcı veritabanı yazımı (prototip durumu tarayıcı belleğinde)
- PDF ayrıştırma
- TurkishMMLU'nun demoya sokulması — gated dataset, sınıf aralığı uyuşmuyor
  (dataset 9-12, prototip 5-8). Türevleri `.gitignore`'da.

---

## 7. Jüri kriterleri ve karşılıkları

Kreaton rehberi §5'teki dört kritik tavsiye:

| Jüri kriteri | Bizdeki karşılığı | Durum |
|---|---|---|
| 1. Rakip analizi tablosu | `canva.docx`'te var, **deck'e taşınmadı** | ❌ açık |
| 2. Brief'i aşan mikro inovasyon | rate limit, veri görselleştirme, güven skoru, kapalı döngü | 🟡 kısmen |
| 3. Uçtan uca çalışır akış | canlı sistem + 4 rol döngüsü çalışıyor | ✅ |
| 4. Ekip kapasitesine uygun kapsam | dar tutuldu, §6'daki kesme listesi | ✅ |

> Rehber, 2. madde için örnek olarak **"rate limit güvenliği"** ve
> **"veri görselleştirme"** sayıyor. İkisi de üründe var (agents.md §7.4 rate limit
> `src/routes/ai.ts` içinde uygulandı; ısı haritası `renderHeatmap`), ama
> **hiçbir yerde jüriye anlatılmıyor.** Deck'te öne çıkarılmalı.

---

## 7b. 6 ZORUNLU MVP MADDESİ — DENETİM

Eleme bu tablodan yapılıyor: *"Bir madde eksikse ekip sonraki değerlendirme
aşamasına geçemez."* Brief'in kendi ifadeleriyle karşılaştırma:

| # | Brief'in cümlesi | Üründeki karşılığı | Durum |
|---|---|---|---|
| 1 | "Eğitmen kaynak içeriği, konu, kazanım, seviye ve soru türünü sisteme **tanımlar**" | Metin yapıştırma **+ .txt/.md dosya yükleme**; ders serbest metin (yeni ders eklenebilir); sınıf 1-12; **kazanım ekle/sil**; ÇSS ve açık uçlu adedi seçimi | ✅ |
| 2 | "Sistem içerikten **çoktan seçmeli ve açık uçlu** soru taslakları üretir; eğitmen **düzenler ve onaylar**" | Gerçek model (llama-3.3-70b) her iki türü üretir; soru metni ve şıklar düzenlenebilir; doğru şık değiştirilebilir; onayla/reddet | ✅ |
| 3 | "Onaylanan sorular havuza alınır; **seçilerek** sınav/ölçme seti oluşturulur" | Onaylılar havuza girer; **kazanım/zorluk/tür filtresi**; seçilerek sınav kurulur; **kazanım kapsama göstergesi** | ✅ |
| 4 | Eğitmen "**değerlendirme kriterlerini** belirler" (Rol 02) | Rubrik sekmesi; kriter + ağırlık; **ağırlık %100 olmadan sınav yayınlanamaz** | ✅ |
| 5 | "AI, **tanımlı rubriğe göre** cevap için **puan ve gerekçe** önerir; **nihai karar eğitmene aittir**" | Kriter bazında puan + gerekçe + güven skoru; öğretmen onaylar veya revize eder; **sonuçlar öğretmen yayınlamadan öğrenciye gitmez** | ✅ |
| 6 | "Öğrenme çıktısı analizi" · "sınıfın öğrenme durumunu tek ekrandan görür" | Kazanım ısı haritası (öğretmen + yönetici); en zayıf kazanım aksiyon kartı; **kapalı döngü: analizden soru üretimine dönüş** | ✅ |

**Gelişim trendi eklendi (25 Ağustos).** `MODEL PROMT #1.docx`'teki
*"öğrencilerin ... önceki sınavlara göre değişimini görebilecek"* vaadinin
karşılığı. Tek sınavla hesaplanamazdı; çoklu sınav desteğinden sonra mümkün oldu.
Hem öğretmen 4. sekmesinde hem yönetici panelinde: kazanım × sınav tablosu ve
son iki sınav arasındaki fark (▲/▼). Yüzdeler **öğretmen onayından geçmiş
gerçek sonuçlardan** hesaplanır. Doğrulandı: iki sınavda FEN.7.1.2 %10→%95
(▲ +85), MAT.7.2.1 %0→%100 (▲ +100).

**Dürüstlük notu (MVP 6):** Isı haritasındaki *diğer sınıfların* ortalamaları
`state.baseline` içindeki demo verisinden geliyor; canlı sınıf satırı (8-A) ve
gelişim trendi ise **gerçek veriden** hesaplanıyor. Yani mekanizma gerçek,
karşılaştırma sınıfları simüle. Brief çoklu öğrenci şartı koşmuyor, madde
karşılanıyor — ama **jüri sorarsa açıkça söylenmelidir.**

**3 zorunlu akış (brief slayt 05):**
- Akış 01 İçerik Uzmanı: yükle → kazanım seç → AI üret → onayla ✅
- Akış 02 Eğitmen: sınav oluştur → açık uçlu cevapları gör → AI önerisini incele → nihai puanı onayla ✅
- Akış 03 Öğrenci: sınavı tamamla → cevaplar kaydedilsin → **sonuç onay sonrası oluşsun** ✅

---

## 7c. Arayüz mimarisi (25 Ağustos, kullanıcı isteği)

**İçerik Uzmanı paneli iki sekmeye ayrıldı:** 1 · Soru Üret (kaynak + AI
çıktılarının incelenmesi) · 2 · Soru Havuzu (onaylı + reddedilenler). Panel
tek sayfada dört bölüm taşıyacak kadar uzamıştı; ayrıca öğretmen ve öğrenci
panelleri zaten sekmeliydi, tutarlılık sağlandı.

**Çoklu sınav desteği eklendi.** `state.exams[]` + `state.activeExamId`.

> **Neden gerekliydi (kullanıcı isteğinin ötesinde):** Tek sınavla
> *"öğrencinin önceki sınavlara göre değişimi"* hesaplanamaz. Bu iddia
> `MODEL PROMT #1.docx`'te ürün tarifinin parçası ama üründe karşılığı yoktu
> ve **çoklu sınav olmadan hiçbir zaman olamazdı.** Şimdi mümkün.

**Risk yönetimi kararı:** `state.exam` ve oturum alanları (`answers`,
`examStatus`, `aiEvals`, `reviews`, `mcResults`, `integrity`) olduğu gibi
bırakıldı — bunlar artık "aktif sınavın canlı alanları". Sınav değişirken
`syncActiveExam()` mevcut alanları kayda yazar, `activateExam()` hedefinkileri
yükler. Böylece mevcut kodun tamamı değişmeden çalışmaya devam etti; yalnızca
liste ve geçiş arayüzü eklendi.

**Doğrulandı:** 2 sınav, birbirinden tamamen yalıtık (sınav 1: 3 soru/3 yanıt/
in_progress; sınav 2: 2 soru/0 yanıt). Geçişler ve sayfa yenilemesi sonrası
veriler korundu. Öğrenci artık tüm yayındaki sınavları görüp seçebiliyor.

---

## 7d. Kullanıcı geri bildirimi turu (25 Ağustos)

**PDF yükleme.** Ders notu / müfredat / kitap bölümü PDF olarak yüklenebiliyor.
pdf.js istemci tarafında çalışır, **dosya sunucuya gönderilmez.** Öğretmen sayfa
sayısını görür ve **hangi sayfa aralığından** soru üretileceğini seçer — 40
sayfalık bir kitabın tamamından soru istemek istemez. Seçilen aralığın karakter
sayısı canlı gösterilir, 6000'i aşarsa uyarır. Taranmış (metin katmanı olmayan)
PDF'ler tespit edilip kullanıcıya açıkça söylenir.
Sayfa metinleri bilinçli olarak `state` dışında tutulur (localStorage kotası).

**Sekmeler segment kontrolüne çevrildi.** Alt çizgili yazılar yeterince belirgin
değildi; hangi sekmede olunduğu ilk bakışta anlaşılmıyordu. Aktif sekme artık
dolu renkli. Kullanılamayan sekmeler (öğrencide "Sınavı Çöz" / "Karne") pasif.

**Öğrenci akışı sadeleştirildi.** "Bu sınavı aç" + "Sınava Gir" ikilisi, iç kavram
olan *aktif sınav*ı öğrenciye sızdırıyordu — çoklu sınav eklenirken yapılan bir
tasarım hatasıydı. Artık her sınav kartında duruma göre **tek buton** var:
Sınava Başla / Kaldığın Yerden Devam Et / Karnemi Gör / (pasif) Öğretmen onayı
bekleniyor. Gerekirse aktif sınav arkada sessizce değiştirilir.

**Kesinti sonrası devam — iki gerçek hata düzeltildi:**

1. 🔴 **Açık uçlu yanıtlar diske hiç yazılmıyordu.** Yazarken `renderAll()`
   çağrılmıyordu (odak kaybolmasın diye) ve `saveState()` de ona bağlıydı.
   Ekrandaki **"Kaydedildi ✓" göstergesi tamamen görseldi** — tarayıcı kapanırsa
   öğrencinin yazdığı her şey kayboluyordu. Geciktirilmiş kayıt (`saveSoon`,
   400 ms) eklendi. Doğrulandı: yazılan metin localStorage'da göründü.
2. **Süre sayfa kapalıyken duruyordu.** `remainingSec` her saniye 1 azaltılıyordu.
   Artık sınav başlarken **mutlak bitiş anı** (`endsAt`) saklanıyor; kalan süre
   ondan hesaplanıyor. Sayfa kapansa, tarayıcı çökse, bağlantı kopsa bile süre
   gerçekte olduğu gibi işliyor.

Ayrıca sınav kartı ilerlemeyi gösteriyor ("1/3 soru yanıtlandı") ve devam
notunda kalan süre yazıyor.

**Değerlendirme sırasında bağlantı koparsa.** Önceden sessizce yerel simülasyona
düşüp **sahte bir puanı "yapay zekâ önerisi" diye gösteriyordu.** Artık gerçek
model modundayken çağrı başarısız olursa değerlendirme "yapılamadı" işaretlenir;
öğretmene **"Yapay Zekâ ile Yeniden Dene"** ve **"Elle Puanla ve Onayla"**
seçenekleri sunulur. Öğrencinin yanıtının kaybolmadığı ekranda yazar.
Doğrulandı: kesinti simülasyonunda sahte puan üretilmedi, bağlantı gelince
yeniden deneme başarılı oldu.

---

## 8. Sıradaki işler (öncelik sırasıyla)

### A. Bedava kazançlar — TAMAMLANDI (25 Ağustos)
- [x] **Bloom etiketi** — inceleme kartında, onaylı havuzda ve öğretmen havuzunda rozet
- [x] **Çeldirici gerekçeleri** — inceleme kartında ayrı kutu, her yanlış şık için AI analizi
- [x] **Kriter gerekçeleri öğrenci karnesinde** — puan kırılımı + her kriterin gerekçesi
      + "Bu puanı öğretmeniniz AI önerisini (14) değiştirerek belirledi" satırı

### B. Demo güvenliği — TAMAMLANDI (25 Ağustos)
- [x] **localStorage kalıcılığı** (`STORE_KEY = t3-olcme-durum-v1`) — sayfa yenilemesi
      testinde durum ve geri sayım korundu (591 sn kalanla devam etti)
- [x] **"Demo senaryosu" butonu** — üst çubukta. Yüklediği sorular UYDURMA DEĞİL,
      llama-3.3-70b'nin gerçekten ürettiği çıktılar (`DEMO_SORULAR` sabiti).
      Değerlendirme canlı çalışır, önceden doldurulmaz.
- [x] **"Sıfırla" butonu** + **model bekleme sayacı** (buton üzerinde geçen saniye)

### C. Ayrışma
- [x] **Kazanıma tekrar sorusu üret — KAPALI DÖNGÜ (25 Ağustos)**
      Isı haritasının altında (hem öğretmen 4. sekme hem yönetici paneli)
      %60 altındaki kazanımlar için aksiyon butonu: "7-B · MAT.7.3.4 (%58) →
      tekrar sorusu üret". Tıklayınca İçerik Uzmanı paneline geçer, kazanımı
      seçer ve talebi açıklayan afişi gösterir. Zincir böyle kapanıyor:
      içerik → sınav → değerlendirme → analiz → YENİ İÇERİK.
- [ ] Öğretmen kalibrasyonu (AI'dan ortalama sapma)
- [ ] Kazanım kapsama göstergesi (sınav kurarken)
- [ ] AI rubrik taslağı önerisi

### D. Brief uyumu
- [ ] **Kazanım/ders/sınıf tanımlama** — şu an 3 kazanım koda gömülü
- [ ] `.txt` dosya yükleme (brief "içerik yükleme" diyor)
- [ ] Çoklu öğrenci (sınıf ortalaması şu an sahte `baseline` verisinden)

### E. Kod dışı teslimatlar
- [ ] **İş Modeli Kanvası — hiç yok, ZORUNLU TESLİMAT**
- [ ] Deck: isim birliği, rakip tablosu, pazar sayıları, mimari slaytı, ekip slaytı,
      6-madde uyum tablosu, "brief'te olmayan eklerimiz" slaytı
- [ ] Demo videosu
- [ ] Alt alan adını kısalt (URL videoda görünecek, çok uzun)

### ✅ Sınav bütünlüğü kaydı — YAPILDI (25 Ağustos)

Deck slayt 5'teki "Güvenli Öğrenci Deneyimi" maddesinin karşılığı üründe yoktu.
Uygulandı — **ancak iddia bilinçli olarak değiştirildi.**

**Neden "hile önleme" değil "bütünlük kaydı":** Tarayıcı tabanlı hiçbir sistem
hileyi önleyemez (öğrenci yandaki telefona bakabilir). "Hile önleyici kontroller"
iddiası jüride teknik bir soruyla çöker. Bunun yerine sistem sekme değişimi,
pencere odağı kaybı ve tam ekrandan çıkışı **kaydeder** ve öğretmene **bağlam**
olarak sunar. Karar insanındır — projenin HITL ilkesiyle aynı mantık.

**v2 eklemeleri (kullanıcı fikri üzerine):**
- **Yanıta metin yapıştırma tespiti** — açık uçlu yanıtlar yapay zekâya okutulduğu
  için, öğrencinin dışarıdan (örn. bir sohbet modelinden) hazır metin yapıştırması
  bu üründeki **en doğrudan bütünlük sinyalidir**. Sekme değişimi dolaylı sinyal,
  yapıştırma doğrudan sinyal. Yalnızca karakter SAYISI tutulur, metnin kendisi
  kaydedilmez.
- **Sınav dışında kalınan toplam süre** — "3 kez, toplam 6 saniye" ile
  "3 kez, toplam 4 dakika" farklı sinyallerdir; sadece sayı yetmiyor.

- Öğrenci sınav ekranında ne kaydedildiğini açıkça görür (gizli izleme yok)
- Öğretmen onay ekranında özet + olay günlüğü, "tek başına kopya kanıtı değildir" notuyla
- Hiçbir puanı otomatik etkilemez
- Tam ekran reddedilirse sınav çalışmaya devam eder (zarif düşüş — gömülü
  tarayıcıda test edildi, `fsGranted:false` ile sorunsuz çalıştı)
- `agents.md` §7 gereği `privacy-policy.html` §2 güncellendi: ne toplandığı,
  kime gösterildiği, ekran görüntüsü/kamera/mikrofon/tuş kaydı toplanMAdığı

**⚠️ DECK'TE DEĞİŞTİRİLMESİ GEREKEN İFADE:**
~~"tam ekran güvencesi ve hile önleyici kontroller"~~
→ **"sınav bütünlüğü kaydı — öğretmene şeffaf sinyal"**

---

## 9. Bilinen sınırlamalar (dürüstlük notu)

- Prototip durumu tarayıcı belleğinde; sayfa yenilenince sıfırlanır.
- Tek demo öğrenci; sınıf ortalamaları `state.baseline` içindeki sabit demo verisinden.
- Yerel yedek modu soru türü/adet seçimini yok sayar (hep 2 ÇSS + 1 açık uçlu).
  Gerçek model seçime uyar.
- Backend yalnızca `/api/ai/*` uçlarını kapsar; `routes.ts`'teki diğer rotalar iskelettir.
