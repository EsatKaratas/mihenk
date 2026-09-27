# MÜDÜR DEVİR TESLİM RAPORU — MİHENK (T3 Creathon · Problem 2)

- **Tarih:** 27 Eylül 2026
- **Bağlam:** Esat eski PC'den yeni PC'ye geçiyor. Eski PC sıfırlanacak, geri dönüş yok.
- **Kime:** Yeni PC'deki AI asistanı.
- **Hazırlayan:** Bu projeyi 6 Eylül'de §49-§50n arası yürüten oturum. Rapor, 27 Eylül'de **yeniden ölçülerek** yazıldı; hafızadan yazılmadı.

> ### ⚠️ ÖNCE OKU — bu raporun kapsamı ve bir dürüstlük notu
>
> **1. Bu projede orkestratör/Worker yapısı HİÇ KULLANILMADI.** Devir şablonunun
> 4. maddesi ("Worker'lara hangi görevleri dağıttın") bu projede karşılıksızdır.
> Sera ve Shopify projelerinde 4 worker sekmesi vardı; Mihenk'te yoktu — tek
> oturum, tek çalışma ağacı. 4. bölümde ne olduğunu uydurmadan yazdım.
>
> **2. Depodaki iki eski devir belgesi BAYAT.** `DEVIR.md` ve
> `DEVRALAN_PROMPT.md` yalnızca **§48b**'ye kadar anlatıyor. §49 ve §50'nin
> tamamı (Keşif Kampüsü, belgeye kilitli üretim, kazanım grafiği, turuncu
> palet, iki veri göçü) o belgelerde **yok**. Sayıları 27 Eylül'de düzelttim
> ama içerik boşluğu duruyor. **Tek doğruluk kaynağı `PROGRESS.md`'dir**
> (7.549 satır, §50n'e kadar dolu).
>
> **3. Yarışma sunumu 6 Eylül'deydi.** Sunumun yapılıp yapılmadığı ve sonucu
> bu oturumda **kayıtlı değil**. Depoda 6 Eylül'den sonra commit yok.

---

## 0. Esat'ın kalıcı çalışma kuralları (bunları kaçırma)

1. **Süre tahmini:** Her işlemden önce dakika cinsinden tahmin ver.
2. **Türkçe.** Kod yorumları, commit mesajları, değişken adları (`hizSinirli`,
   `bosDurumHtml`), belgeler — hepsi Türkçe.
3. **Ölçmeden iddia etme.** "Çalışıyor olmalı" yok. Çalıştır, çıktıyı göster.
   Test etmediysen "test etmedim" de. Bir yoruma/belgeye "doğrulandı" yazmadan
   önce gerçekten doğrula.
4. **`PROGRESS.md`'yi her adımda güncelle** — yapılan iş, **kök neden** ve
   **ölçüm sonucu**. Bu dosya projenin hafızası ve tek doğruluk kaynağı.
5. **Sessiz düşüş yasak.** Bir şey başarısız olduysa, elendiyse, kısıldıysa
   kullanıcıya söylenmeli. Bu projede en çok ihlal edilen kural budur.
6. **Yeni üst düzey fonksiyon → `selfCheck` listesine ekle.**
   `tools/ozkontrol-dogrula.mjs` çift yönlü denetler; eklemezsen CI kırılır.
7. Commit biçimi: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`).
8. **Bedeli olan bir değişiklik yapıyorsan bedelini de yaz.**
9. **PowerShell tuzağı:** `Get-Content`/`Set-Content` Türkçe dosyayı bozar.
   Düzenleme için `Edit` aracını ya da bir Python betiğini kullan.

### İZİN İSTE — kendi başına yapma

- `npm run deploy:demo` — **canlı adresin üzerine yazar** (ayrı adres açmaz).
  `npm run deploy` ücretsiz planda Queues yüzünden kırılır.
- `git push --force`, rebase, geçmiş yeniden yazma
- `--remote` ile herhangi bir D1 komutu
- Cloudflare hesabında ücret doğuran herhangi bir işlem
- API anahtarı/secret girmek — bunu **kullanıcı yapar**

Gerçek model çağrısı ücretlidir (Workers Paid · Neuron). Birkaç çağrı kuruş
mertebesindedir ama **önce söyle**, sonra çağır.

---

## 1. Proje mimarisi ve hedef

### Nihai amaç

Mihenk, ortaokul (5-8. sınıf) için uçtan uca bir **ölçme ve değerlendirme**
sistemidir. T3 Vakfı Bursiyer Yapay Zekâ Creathon 2026 · Problem 2 için Takım
BİES (Esat Talha Karataş, İrem Yazıcı, Zeynep Sude Demir, Burak Özçelik)
tarafından yazıldı.

**Ürünün tezi tek cümlede:** *Yapay zekâ önerir, insan karar verir.* Yapay zekâ
soru **taslağı** üretir, rubrik **taslağı** önerir, açık uçlu yanıta puan
**önerir** — nihai puan yalnızca öğretmenin onayıyla oluşur.

Zinciri beş rol taşır:

```
İçerik Uzmanı → Öğretmen → Öğrenci → Öğretmen onayı → Eğitim Yöneticisi
                                                        (+ Veli, salt okunur)
```

### Değiştirilemez ilke (agents.md §1)

HITL zincirine dokunulmaz. Otomatik onay, toplu onay, puan eşiği, yapay zekânın
nihai karar vermesi — dördü de kapsam dışıdır ve gerekçesi ne olursa olsun
reddedilir. **Ölçülebilir değişmez:** `status = "approved"` yalnızca **iki**
yerde atanır — demo tohumu ve **insan tıklaması**.

### Sistem mimarisi — bilmezsen yanılırsın

| Gerçek | Not |
|---|---|
| **`routes.ts` ÇALIŞAN KOD DEĞİLDİR** | Depo kökündeki bu dosya referans iskeletidir; her handler `c.json({ todo })` döner. İlk bakan auth/exams/grading rotaları var sanır — **yoktur**. |
| **Gerçek Worker `src/index.ts`** | Yalnızca `GET /api/health` ve `/api/ai/*` (**7 uç**: status, generate-questions, evaluate, rubric, sample-answers, misconceptions, outcome-alignment). Başka uç yok. |
| **Ürünün tamamı `public/app.js`** | 10.028 satır, tarayıcıda çalışır. Beş rol paneli **aynı anda DOM'dadır**; yalnızca aktif olan CSS ile görünür. |
| **Sunucuda ürün verisi YOK** | Sınav, yanıt, öğrenci adı, puan hiçbir koşulda sunucuya gitmez; her şey `localStorage` + IndexedDB'de. Yalnızca yapay zekâ çağrılarında ilgili metin modele iletilir. |
| **Kimlik doğrulama YOK** | Roller bir `state.role` seçimidir. Eskiden "sınıf kodu" vardı; kimlik doğrulama olmadığı için §43'te tamamen kaldırıldı. **Bedeli:** ürün tek cihazda yaşar. |
| **Model** | Workers AI · `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Yedek: `@cf/meta/llama-4-scout-17b-16e-instruct` (aynı hesap, anahtar gerektirmez, çalışır). |
| **Eğitim yapılmadı** | Ne fine-tuning, ne LoRA. Hazır temel model + istem mühendisliği + sunucu tarafı doğrulama. |

**Yedek modelin sınırı:** kota tükenmesine karşı **KORUMAZ** — ikisi de aynı
Neuron havuzundan yer. Koruduğu şey modele özgü arızadır.

### Model çıktısı GÜVENİLMEZ kabul edilir

Sunucu her yanıtı Zod ile doğrular ve normalleştirir. Var olan korumalar —
bunları bilmeden yenisini ekleme:

- Şık karıştırma (Fisher-Yates; doğru cevap **içeriği** takip eder, harfi değil)
- Geçersiz cevap anahtarı → `anahtarBelirsiz` ile işaretlenir, uzman seçer
- Yabancı **alfabe** denetimi (üretimde **ve** değerlendirme çıktısında)
- Tekrar denetimi (gövde Jaccard ≥ 0,30) **ve** aynı şık kümesi (`sikImzasi`)
- Kullanılamaz soru (3'ten az şık) → `meta.elenenGecersiz`
- Çeldirici gerekçesindeki kalıp açılış sunucuda kesilir (`gerekceyiSadelestir`)
- İki çeldiriciye aynı gerekçe → `gerekceTekrari` ile **gösterilir**
- Metne atıf tespiti → `needsSource` zorla true (`kaynakGerektirirMi`)
- Hız sınırı **altı ucun hepsinde**; kaynak metin 6.000 karakterde reddedilir

**Ortak ilke: otomatik düzeltme değil, insana gösterme.**

**Korumaların YAKALAYAMADIĞI (bilerek):** olgusal hata / yanlış cevap anahtarı
(canlıda üç kez görüldü), Latin harfli yabancı DİL ("necessary"), genel geçer
çeldirici gerekçesi, birbirinin eşanlamlısı iki şık.

---

## 2. Dosya yolları ve altyapı

### ⚠️ En güvenilir kopya GitHub'dır

| Yer | Durum (27 Eylül, ölçüldü) |
|---|---|
| **GitHub** | `https://github.com/EsatKaratas/mihenk` — **HEAD `58d7b1f` = `origin/main`**, pushlanmamış commit **0**, takip edilmeyen dosya **0** |
| Eski PC | `C:\Users\pc\Downloads\mihenk-final` (dal `main`) — **sıfırlanacak** |
| Flash | `E:\_TASIMA\Projeler\Downloads\mihenk-final` |
| Yeni PC | Muhtemelen `C:\Users\karat\Downloads\mihenk-final` — **doğrulanmadı** |
| Canlı | `https://mihenk.bies.workers.dev` · Version `518cdeb7` |

**Yeni PC'de ilk iş:** klasörü flash'tan kopyalamak yerine `git clone` yapmak
daha temizdir; flash kopyasında `node_modules` yok, zaten `npm install`
gerekiyor.

### 🔴 ESKİ KOPYA TUZAĞI — bu projede defalarca yaşandı

`C:\Users\pc\t3-olcme-degerlendirme` **ESKİ bir kopyadır** (Eylül başında
kalmış). Orada iş yapma. `~/.claude/launch.json` içindeki **"t3-olcme-demo"**
girdisi de o eski kopyayı 8787'de başlatır ve **bayat dosya sunar**; doğru
girdi **"mihenk-final"**, port **8788**. Flash'ta ikisi de var — karıştırma.

### Teknoloji yığını

```
Çalışma zamanı : Cloudflare Workers (+ Workers AI)
Dil            : TypeScript (strict), tarayıcı tarafı düz JavaScript
Çatı           : Hono 4 + @hono/zod-validator
Doğrulama      : Zod 3
Test           : Vitest 2
Dağıtım        : Wrangler 4  (npm run deploy:demo)
Ekran görüntüsü: playwright-core (tools/ekran-goruntusu-al.mjs)
Node           : >= 18
```

### Gerçek dosya ağacı

```
src/
  index.ts              Worker girişi — /api/health, /api/ai/*
  lib/ai.ts             Sağlayıcı soyutlaması, JSON ayıklama, yedek mantığı
  lib/prompts.ts        6 istem kurucusu — "modele ne söylüyoruz" dosyası
  lib/guards.ts         Saf yardımcılar: hız sınırı, şık karıştırma, benzerlik,
                        şık imzası, gerekçe temizliği, dil denetimi
  routes/ai.ts          7 AI ucu
  schemas/ai.ts         Zod girdi + model çıktı şemaları
public/
  app.js                ÜRÜNÜN TAMAMI (10.028 satır)
  index.html            Giriş kapısı + 5 panel iskeleti
  app.css               Tema (açık/koyu) — lacivert #0d3db0 + turuncu #F2994A
  mufredat/*.json       606 MEB öğrenme çıktısı (Türkçe 365 · Fen 141 · Mat 100)
  dersler/*             Keşif Kampüsü ders belgeleri (6 txt + 1 pdf)
  _headers              CSP ve güvenlik başlıkları
test/                   263 test, 7 dosya
tools/
  ozkontrol-dogrula.mjs selfCheck listesi ↔ tanımlar (çift yönlü)
  check-config.mjs      JSONC doğrulayıcı (saf Node — Python GEREKMEZ)
  ekran-goruntusu-al.mjs README görüntülerini CANLIDAN üretir
  injection-test.py     5 saldırı vektörü
routes.ts               ⚠️ REFERANS İSKELETİ — çalışan kod DEĞİL
schema.sql              14 üretim tablosu (canlıda hiçbiri aktif değil)
PROGRESS.md             Kronolojik günlük — TEK DOĞRULUK KAYNAĞI (§50n'e kadar)
agents.md               Proje anayasası (üstünde güncellik bandı var, §50f)
DEVIR.md                ⚠️ §48b'de kalmış
DEVRALAN_PROMPT.md      ⚠️ §48b'de kalmış
docs/ekran/*.png        6 ekran görüntüsü — betikle, canlıdan üretilir
```

---

## 3. Mevcut durum ve entegrasyon

### Doğrulama — 27 Eylül 2026'da yeniden koşuldu

| Kontrol | Sonuç |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **temiz** (exit 0) |
| `npm test` | **263/263 · 7 dosya** |
| `node tools/ozkontrol-dogrula.mjs` | **336 ad · kapsama %100** |
| `npm run check:config` | **exit 0** |
| `node --check public/app.js` | **temiz** |
| Depo | `main` = `origin/main` = `58d7b1f`, çalışma ağacı temiz |
| 6 Eylül'den sonra commit | **0** — proje donmuş |
| Canlı `/api/health` | `{"ok":true,"env":"demo"}` |
| Canlı `/api/ai/status` | `ready:true`, `fallbackSorunu: null` |
| Cloudflare aboneliği (26 Eylül'de yenilenecekti) | **sorunsuz** — canlı ayakta |

Test dökümü: `guards 105 · prompts 47 · schemas 44 · ai-lib 24 ·
prompts-guvenlik 19 · sayac-ve-yedek 15 · atolye-ve-materyal 9 = 263`

### Tamamlanan ve ana sisteme entegre edilen modüller

Ayrıntısı `PROGRESS.md`'de; burada yalnızca **ne entegre edildi** listesi:

| § | Ne |
|---|---|
| §43 | Sınıf kodu / cihazlar arası senkron **tamamen kaldırıldı**; yedek model gerçekten çalışır hâle geldi |
| §44 | Boş kriter adıyla sınav yayınlanabiliyordu → rubrik geçerliliği tek ölçüte (`rubrikGecerliMi`) bağlandı; şıkkı eksik sorular sessizce düşüyordu → `elenenGecersiz` |
| §45 | Ekran görüntüsü betiği yazıldı (canlıdan üretir); değerlendirme çıktısına dil denetimi; favicon |
| §46 | Aynı şık kümeli sorular eleniyor (`sikImzasi`); birim dönüşümü istemi sertleştirildi (A/B: eski 0/2 → yeni 4/4) |
| §47 + §47b | Çeldirici gerekçelerindeki kalıp açılış sunucuda temizleniyor (`gerekceyiSadelestir`); iki çeldiriciye aynı gerekçe → `gerekceTekrari` |
| §48 | Beceri temelli (yeni nesil) soru istemi + ders/kazanım sekmeleri; `lib/ai.ts`'te kesilme sonrası bütçeyi **düşüren** gerçek hata düzeltildi |
| §48b | Demo tohumu ürünü yalanlıyordu → elle yeniden yazıldı; ekran görüntüleri yenilendi |
| **§49** | **Keşif Kampüsü + belgeye kilitli üretim**; kazanım başarı grafiği (ısı haritası kaldırıldı); mavi palet |
| **§50–§50f** | Atölye *sınıf* ekseninden **müfredat** eksenine taşındı; 18 Keşif kazanımı belgelerden eklendi; turkuaz → **turuncu** (#F2994A); Keşif alanı Sınıf ile Şube arasına |
| **§50g–§50n** | Depo eksiksizlik turu: belgelerdeki bayat sayılar, üründe kalan "ısı haritası" metinleri, README vitrin çerçevesi, sır denetimi |

### Öne çıkan iki entegrasyon

**Belgeye kilitli üretim (§49-§50).** Keşif Kampüsü dersi, üç atölye
(Kimya ve İnsan Bilimleri · Kişisel Gelişim · Fizik) ve **18 kazanım**; hepsi
okulun kendi ders belgesine bağlı. "Kazanımdan" modunda üretim o belgeye
**kilitlenir** — model belgenin dışına çıkamaz, belge okunamazsa **üretim hiç
yapılmaz** ve sebebi ekranda yazar. 6.000 karakter kırpması **sessiz değildir**:
kaç karakterin dışarıda kaldığı yazılır. Canlıda uçtan uca ölçüldü.

**İki veri göçü (§50, §50b) — yazılmasaydı sessiz veri kaybı olurdu.**
`loadState()` içinde: (1) eski atölye-sınıfı olan kazanımları `Keşif` + `atolye`
alanına taşır; (2) sürümle gelen yeni varsayılan kazanımları kayıtlı listeye
**yalnızca ekler** (kullanıcının sildiğini geri getirmez). İkisi de canlıda
gerçek bayat kayıtla ölçüldü.

### 🔴 Bilinen belge boşluğu

`DEVIR.md` ve `DEVRALAN_PROMPT.md` **§48b'de kalmış**. Sayıları 27 Eylül'de
güncelledim (263 test, 336 ad) ama §49-§50 içeriği o belgelerde yok. Devralan
kişi onlara bakarsa Keşif Kampüsü'nden, belge kilidinden, grafikten ve turuncu
paletten habersiz kalır. **`PROGRESS.md` §49-§50n'i oku.**

---

## 4. "Worker geçmişi" — bu projede Worker YOKTU

Şablonun bu maddesi Mihenk'te karşılıksızdır. Uydurmamak için ne olduğunu
yazıyorum:

**Orkestratör/Worker sekmesi yapısı bu projede hiç kullanılmadı.** Tek oturum,
tek çalışma ağacı, tüm işi oturumun kendisi yaptı. (Sera ve Shopify
projelerinde 4 worker vardı — Mihenk'i onlarla karıştırma.)

Worker'ın yerini tutan şey **dış yamalardı**: başka bir sohbette üretilen ve
Esat tarafından `.patch` + `.md` olarak getirilen hazır değişiklik paketleri.
İki kez geldi:

| Yama | Ne getirdi | Sorun |
|---|---|---|
| `MIHENK-TUM-DEGISIKLIKLER.md` (§48) | Beceri temelli soru + ders/kazanım sekmeleri | Tabanı §43 öncesiydi; 6 dosyanın 2'si reddedildi |
| `EKLENTILER` #2 ve #3 (§49) | Keşif Kampüsü, belge kilidi, grafik, palet | Tabanı `4688477`; HEAD'den **6 commit geride** |

### Kullanılan yöntem — devralan bunu bilmeli

Dış yama **asla doğrudan uygulanmadı**. İzlenen yol:

1. `git apply --check` ile tut/tutmadığını ölç
2. Yama tabanına **ayrı bir worktree**'de uygula, orada commit'le
3. O commit'i `main`'e **3-yollu merge** et
4. Çakışmaları **tek tek karara bağla** (yorum çakışmalarında main, içerik
   eklemelerinde yama)
5. Lint + test + öz-kontrol + `node --check` + **gerçek tarayıcı**

**Bu yöntem iki kez gerçek bir geri alımı önledi:** §48'de §47'nin ölçülmüş
kök neden düzeltmesini, §49'da §48'in `guards.ts` dil denetimi düzeltmesini
sessizce geri alacaktı.

---

## 5. Yarım kalan iş

**Aktif bekleyen bir iş YOK.** Depo 6 Eylül'den beri donmuş, çalışma ağacı
temiz, her şey pushlanmış, canlı ayakta ve diskle eş.

En somut yarım iş **belge boşluğudur**: `DEVIR.md` + `DEVRALAN_PROMPT.md`
§48b'de kalmış (bkz. §3).

### Kapatılmamış teknik maddeler (PROGRESS §48.7, §49, DEVIR §6)

| Madde | Durum |
|---|---|
| **40-110 kelime hedefi tutturulamadı** | Yerelde 0/9, canlıda 2/5. Gerçekten isteniyorsa yol istem değil **sunucu tarafıdır**: gövde kelime sayısı ölçülüp kısa sorular elenebilir. Eleme eşiği **ölçülerek** konmalı. |
| **Token bütçesi (700 / 5600) doğrulanmadı** | Yalnızca "kesilme olmadı" davranışı ölçüldü. Workers Logs'taki `ev: "ai_call"` kayıtlarına bakılmalı. |
| **Çok cihazlılık yok** | §43'te kaldırıldı. Gerçek çözüm oda kodu değil **Better Auth + `users` tablosu**; şema `schema.sql`'de hazır. |
| **OCR gerçek taranmış PDF ile denenmedi** | §48'de sentetik taramayla denendi. Bulunan gerçek kusur: **iki sütunlu sayfada sütunları iç içe geçiriyor**. |
| **Benzerlik eşiği (0,30) saha doğrulaması** | Yapılmadı. |
| **Model karşılaştırması tekrarlanmalı** | Eski ölçüm, soru sayısı sınırı ve tekrar denetimi eklenmeden önce yapıldı. |
| **Latin harfli yabancı dil denetimi** | Eklenmedi — sözlük gerektirir, yanlış pozitif üretir. Bilerek açık. |
| **Fizik atölyesinde 2 kazanım türetme** | `KK.FIZ.1.1` ve `1.2` belgenin "KAVRAMLAR" bölümünden türetildi, birebir alıntı değil. Kodda işaretli. |

---

## 6. Gelecek iş planı ve delegasyon

Depo donmuş olduğu için bu bir **öneri sırasıdır**; Esat onaylamadan başlama.

### Görev 1 — Belge boşluğunu kapat (~30-40 dk, kod yok)

`DEVIR.md` ve `DEVRALAN_PROMPT.md`'yi §50n'e taşı. `PROGRESS.md` §49-§50n
zaten yazılı; iş özetleme ve sayı güncellemesi. **Öncelik bu** çünkü bir
sonraki devralan yanlış bilgiyle başlar.

### Görev 2 — 40-110 kelime hedefini sunucu tarafında çöz (~2-3 sa, ölçüm dahil)

İstem bir rica, garanti değil — bu §47'de ölçülerek kanıtlandı. Yol: üretilen
gövdenin kelime sayısını sunucuda ölç, eşiğin altındakileri **ele ve sebebini
`meta` ile bildir** (sessiz düşüş yasak). **Eşik tahminle konmaz**: önce 30-40
gerçek üretimde dağılımı ölç, sonra eşiği o dağılımdan seç.

### Görev 3 — OCR'ı gerçek taranmış belgeyle sertleştir (~2-3 sa)

Bilinen kusur: iki sütunlu sayfada okuma sırası bozuluyor. Gerçek bir
tarayıcı/telefon çıktısıyla ölç, sütun tespiti ekle, kelime isabetini
öncesi/sonrası karşılaştır.

### Nasıl bölüştürülür

Mihenk'te worker yapısı yoktu ve **kurulması da gerekmiyor**: kod tabanı tek
kişilik (`public/app.js` + 5 TS dosyası) ve paralel çalışma çakışma üretir.
Eğer yine de bölünecekse doğal sınır şudur:

| Hat | Dosyalar | Çakışmaz çünkü |
|---|---|---|
| **A — Sunucu/ölçüm** | `src/lib/*`, `src/routes/ai.ts`, `test/*` | Görev 2 ve 3'ün ikisi de burada |
| **B — Arayüz** | `public/app.js`, `public/app.css` | Tek dosya, tek sahip olmalı |
| **C — Belge** | `*.md`, `docs/` | Görev 1; koddan bağımsız |

**A ve B'yi aynı anda çalıştırma.** `public/app.js` 10.028 satırlık tek bir
dosya; iki kişi aynı anda dokunursa birleştirme maliyeti işin kendisinden
büyük olur.

---

## 7. Tuzaklar — hepsi bu projede GERÇEKTEN yaşandı

1. **`node --check` YETMEZ.** Yalnızca sözdizimi doğrular. `public/app.js`'te
   yaptığın değişiklik **gerçek tarayıcıda açılmadan "bitti" sayılmaz.**
2. **ÖLÇÜM ARACIN YANILIR — bu projede ONÜÇ kez oldu.** Bir hata bulduğunu
   sanıyorsan **önce ölçümünün doğru olduğunu kanıtla.** Yaşananlardan
   birkaçı: `wrangler dev` bayat dosya sunuyordu · `launch.json` yanlış depoyu
   başlatıyordu · `grep` Türkçe karakterde eşleşmiyordu · konsol cp1252 olduğu
   için sağlam dosya bozuk göründü · gizli sekmede CSS `transition` ilerlemediği
   için OLMAYAN bir kusur "bulundu" · **Bash aracında çalışma dizini çağrılar
   arası korunduğu için yanlış dosya ölçüldü.**
   **Yerel doğrulamadan önce servis edilen dosyanın diskteki dosyayla aynı
   olduğunu kanıtla:** `curl -s http://localhost:8788/app.js | sha256sum` ↔
   `sha256sum < public/app.js`
3. **Yinelenen `id` sessizce düğme öldürür.** Beş panel aynı anda DOM'da; aynı
   `id` iki panelde üretilirse `getElementById` ilkini bulur. Çözüm: `id` değil
   **sınıf + `querySelectorAll`**.
4. **`oninput` içinden `renderAll()` çağırma** — kullanıcı yazarken odak kaybeder.
5. **`const` hoist edilmez.** Sabiti `state`'ten sonra tanımlarsan sayfa ölür.
6. **Yeni `state.exam` alanı eklersen** `activateExam()` **ve** `createExam()`
   içindeki literallere de ekle; yoksa alan sessizce kaybolur.
7. **İkiz koşul yazma.** Aynı ölçütü iki yerde yazarsan ayrışırlar
   (`rubrikGecerliMi()` ve `outcomeUyar()` bunun için tek fonksiyondur).
8. **Türkçe ek tuzağı.** Ek sayının **okunuşuna** göre değişir (%50'sini ama
   %100'ünü). Cümleyi ek almayacak şekilde kur.
9. **Sabitleri tahminle koyma.** `BENZERLIK_ESIGI = 0.30` gerçek soru
   çiftleriyle kalibre edildi.
10. **Düzenleme araçları Türkçe karakteri bozabilir.** Yazdıktan sonra dosyayı
    UTF-8 okuyup doğrula; gerekirse düzenlemeyi Python ile yap.
11. **Demo tohumu sunucudan GEÇMEZ.** `DEMO_SORULAR` istemcide sabittir;
    sunucu korumaları ona uygulanmaz. Sunucuda bir kusuru düzeltince **demo
    tohumunu da elle düzelt**.
12. **Soru gövdesinde `KAYNAK_ATIF` kalıpları kullanma** ("metinde",
    "yukarıdaki"...). `guards.ts` bunları görürse `needsSource`'u zorla true
    yapar ve öğrenci ekranında boş kutu çıkar. "Buna göre..." güvenlidir.
13. **Yeni varsayılan kazanım eklersen göçü unutma.** `OUTCOMES_LIST()` kayıtlı
    liste doluysa varsayılanlara hiç bakmaz; `loadState()` içindeki ekleme göçü
    olmasaydı yeni kazanımlar mevcut tarayıcılarda **hiç görünmezdi** (§50b).

---

## 8. Sunumda söylenmemesi gerekenler

1. **"Demo sorularını model üretti."** §48b'de elle yazıldılar. Canlı üretim
   göstermek istersen **"AI ile Soru Üret"** düğmesine bas.
2. **"Öğrenci kendi telefonundan girer."** Çok cihazlılık §43'te kaldırıldı.
3. **"Sorularımız beceri temelli."** Ölçülen: gövde 11,7 → 24,7 kelime, veri
   içeren soru %55 → %100, yasak klasik kalıp 1 → 0. Ama 40+ kelime hedefine
   yerelde hiçbir soru ulaşmadı (canlıda 5'te 2). "Ölçtük, şu kadar iyileşti"
   de; "başardık" deme.
4. **"D1 bağlı / veritabanı çalışıyor."** Demoda bağlı değil. Doğrusu: şema
   hazır (14 tablo), üretim yapılandırmasında bağlı, demoda gizlilik kararıyla
   kapalı.
5. **"Yedek model kota bitince kurtarır."** Kurtarmaz — aynı Neuron havuzu.
6. **"Token bütçesini doğruladık."** Ölçülen tek şey "yanıt kesilmedi".
7. **"OCR taranmış PDF'te çalışıyor."** Yalnızca sentetik taramayla denendi.

---

## 9. İlk üç adım (yeni PC'de)

1. `git clone https://github.com/EsatKaratas/mihenk.git` → `npm install`
2. Doğrulama paketini **çalıştır ve çıktısını göster**:
   `npm run lint` · `npm test` (263/263) ·
   `node tools/ozkontrol-dogrula.mjs` (336 ad · %100) ·
   `npm run check:config` (exit 0) · `node --check public/app.js` ·
   `curl -s https://mihenk.bies.workers.dev/api/ai/status` (`fallbackSorunu: null`)
3. `PROGRESS.md`'yi **sondan başa** oku: §50n → §50 → §49 → §48b → §48.
   Sonra `agents.md` (önce üstündeki güncellik bandı).

**Sayılar tutmuyorsa DUR ve Esat'a sor.** Bu projede doğrulanmamış varsayımla
ilerlemenin bedeli defalarca ödendi.
