# DEVRALAN ASİSTAN PROMPT'U — MİHENK (v3)

> **Bu dosya nasıl kullanılır:** Aşağıdaki çizginin altındaki her şeyi kopyalayıp
> yeni Claude oturumuna **olduğu gibi yapıştırın**. Kendi başına yeterlidir;
> devralan asistan depoyu hiç görmeden de ne yapacağını bilir.
>
> **Son durum: 19 Ekim 2026.** v2 (6 Eylül, `ac606cb`) §48b'de kalmıştı;
> v3'te §49-§50n ve 19 Ekim'de başlayan araştırma çalışması eklendi, sayılar
> 19 Ekim'de yeniden ölçüldü.

---

Mihenk adlı bir projeyi devralıyorsun. **Önce oku, sonra doğrula, sonra iş yap.**

## 1. Proje nedir

Mihenk, ortaokul (5-8. sınıf) için uçtan uca bir **ölçme ve değerlendirme**
sistemidir. T3 Vakfı Bursiyer Yapay Zekâ Creathon 2026 · Problem 2 için Takım
BİES (Esat Talha Karataş, İrem Yazıcı, Zeynep Sude Demir, Burak Özçelik)
tarafından yazıldı.

- **Depo:** https://github.com/EsatKaratas/mihenk (public)
- **Canlı:** https://mihenk.bies.workers.dev
- **Yerel çalışma kopyası:** `C:\Users\ASUS\Downloads\mihenk-final`
  (dal `main`; 27 Eylül'de yeni PC'ye taşındı, bkz. `DEVIR_MUDUR_2026-09-27.md`)

⚠️ `C:\Users\ASUS\t3-olcme-degerlendirme` **ESKİ bir kopyadır** (Eylül başında
kalmış). Orada iş yapma. `~/.claude/launch.json` içindeki **"t3-olcme-demo"**
girdisi de o eski kopyayı 8787'de başlatır ve bayat dosya sunar; doğru girdi
**"mihenk-final"**, port **8788**.

**Ürünün tezi tek cümlede:** *Yapay zekâ önerir, insan karar verir.* Yapay zekâ
soru **taslağı** üretir, rubrik **taslağı** önerir, açık uçlu yanıta puan
**önerir** — nihai puan yalnızca öğretmenin onayıyla oluşur.

## 2. İLK YAPACAĞIN ŞEY: doğrula

Hiçbir şeye dokunmadan önce şunları çalıştır ve **çıktılarını göster**:

```bash
npm install
git rev-parse --short HEAD          # 19 Ekim itibarıyla e4a4024'ten yenisi
npm run lint                        # sessiz olmalı
npm test                            # 302/302, 9 dosya
node tools/ozkontrol-dogrula.mjs    # 355 ad · kapsama %100
npm run check:config                # exit 0
node --check public/app.js          # sessiz
curl -s https://mihenk.bies.workers.dev/api/health
curl -s https://mihenk.bies.workers.dev/api/ai/status
```

Beklenen test dökümü:

```
test/guards.test.ts          110
test/prompts.test.ts          51
test/schemas.test.ts          49
test/ai-lib.test.ts           24
test/prompts-guvenlik.test.ts 19
test/sayac-ve-yedek.test.ts   15
test/rota.test.ts             14
test/mufredat.test.ts         11
test/atolye-ve-materyal.test.ts 9
                             ---
                             302
```

Beklenen canlı çıktı:

```json
{"ok":true,"app":"Mihenk — Ölçme ve Değerlendirme Sistemi","env":"demo"}
{"provider":"workers-ai","model":"@cf/meta/llama-3.3-70b-instruct-fp8-fast",
 "ready":true,
 "fallback":{"provider":"workers-ai","model":"@cf/meta/llama-4-scout-17b-16e-instruct"},
 "fallbackSorunu":null}
```

Sayılar tutmuyorsa **DUR ve sor.** Körlemesine devam etme — bu projede
doğrulanmamış varsayımla ilerlemenin bedeli defalarca ödendi.

## 3. Değiştirilemez kurallar

1. **HITL zincirine dokunma.** Otomatik onay, toplu onay, puan eşiği, yapay
   zekânın nihai karar vermesi — dördü de kapsam dışıdır ve gerekçesi ne
   olursa olsun reddedilir (`agents.md` §1). Bu bir tercih değil, ürünün
   varlık sebebi. Ölçülebilir değişmez: `status = "approved"` yalnızca **iki**
   yerde atanır — demo tohumu ve **insan tıklaması**.
2. **Türkçe konuş ve yaz.** Kod yorumları, commit mesajları, değişken adları
   (`hizSinirli`, `bosDurumHtml`), belgeler — hepsi Türkçe.
3. **Ölçmeden iddia etme.** "Çalışıyor olmalı" diye bir şey yok. Çalıştır,
   çıktıyı göster. Test etmediysen "test etmedim" de. Bir yorum/belge satırına
   "doğrulandı" yazmadan önce **gerçekten doğrula** — bu hata bir kez yapıldı
   ve düzeltildi.
4. **`PROGRESS.md`'yi her adımda güncelle** — yaptığın işi, **kök nedeni** ve
   **ölçüm sonucunu** yaz. Bu dosya projenin hafızası ve **tek doğruluk
   kaynağıdır**; §50n'e kadar dolu, 19 Ekim çalışması §51 ve sonrasına yazılır.
5. **Sessiz düşüş yasak.** Bir şey başarısız olduysa, elendiyse, kısıldıysa
   kullanıcıya **söylenmeli**. Projede en çok ihlal edilen ve en çok
   düzeltilen kural budur.
6. **Yeni üst düzey fonksiyon → `selfCheck` listesine ekle.**
   `tools/ozkontrol-dogrula.mjs` çift yönlü denetler; eklemezsen CI kırılır.
7. Commit biçimi: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`).
8. **Bedeli olan bir değişiklik yapıyorsan bedelini de yaz.**

## 4. Mimari — bilmezsen yanılırsın

- **`routes.ts` ÇALIŞAN KOD DEĞİLDİR.** Depo kökündeki bu dosya bir referans
  iskeletidir; her handler `c.json({ todo: ... })` döndürür. İlk bakan biri
  auth/exams/grading rotalarının var olduğunu sanır — **yoktur.**
- **`agents.md` de kısmen HEDEF mimariyi anlatır.** Üstünde bir güncellik bandı
  var (§48b'de eklendi): `requireRole`, D1 erişimi, `AI_TASKS_QUEUE`,
  `src/routes/auth.ts`, `migrations/` — **hiçbiri kurulu değil.** §1 (HITL) ve
  §7 (yasaklar) tam bağlayıcıdır. §3'ün "PR zorunlu" maddesi **fiilen
  uygulanmıyor** (iş doğrudan `main` üzerinde yürüyor) ve bu da orada yazılı.
- **Gerçek Worker `src/index.ts`'tir** ve yalnızca iki şey sunar:
  `GET /api/health` ve `/api/ai/*` (**7 uç**: `status`, `generate-questions`,
  `evaluate`, `rubric`, `sample-answers`, `misconceptions`,
  `outcome-alignment`). Başka hiçbir uç yok.
- **Gerçek dosya ağacı:** `src/index.ts`, `src/routes/ai.ts`,
  `src/lib/{ai,guards,prompts}.ts`, `src/schemas/ai.ts`. Hepsi bu.
- **Ürünün tamamı `public/app.js` içindedir** (~10.000 satır, tarayıcıda
  çalışır). Beş rol paneli **aynı anda DOM'dadır**; yalnızca aktif olan CSS ile
  görünür.
- **Sunucuda ürün verisi YOKTUR.** Sınav, yanıt, öğrenci adı, puan hiçbir
  koşulda sunucuya gitmez; her şey `localStorage` + IndexedDB'de. D1 bağlaması
  kaldırıldı. Yalnızca yapay zekâ çağrılarında ilgili metin modele iletilir.
  **Ölçüldü (§48):** PDF yüklendikten sonra giden isteklerin hepsi `GET`, en
  büyük gövde 0 bayt; üretim isteği yalnızca seçilen metni taşıyor (5,7 KB).
- **Kimlik doğrulama yoktur.** Roller bir `state.role` seçimidir. Eskiden bir
  "sınıf kodu" vardı; kimlik doğrulama olmadığı ve kodu bilen herkes o sınıfın
  yanıtlarını okuyabildiği için **tamamen kaldırıldı** (§43).
  **Bedeli:** ürün artık tek cihazda yaşar. "Öğrenci kendi telefonundan girer"
  iddiası **geçersizdir**, sunumda söylenmemeli.
- **Model:** Cloudflare Workers AI · `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
  Yedek: `@cf/meta/llama-4-scout-17b-16e-instruct` (aynı hesapta, anahtar
  gerektirmez, **çalışır durumda**). **Yedek kota tükenmesine karşı KORUMAZ** —
  ikisi de aynı Neuron havuzundan yer; koruduğu şey modele özgü arızadır.
- **Eğitim yapılmadı.** Ne fine-tuning, ne LoRA, ne kendi modelimiz. Hazır bir
  temel model + istem mühendisliği + sunucu tarafı doğrulama.
- **Token bütçesi:** `700 + soru×700`, tavan **5600** (§48). Sayılar modelin
  token sayacıyla ölçülmedi; ölçülen şey "yanıt kesilmedi" davranışıdır.

## 5. TUZAKLAR — hepsi bu projede GERÇEKTEN yaşandı

1. **`node --check` YETMEZ.** Yalnızca sözdizimi doğrular. `public/app.js`'te
   yaptığın değişiklik **gerçek tarayıcıda açılmadan "bitti" sayılmaz.**

2. **ÖLÇÜM ARACIN YANILIR — bu projede ONİKİ kez oldu.** Bir hata bulduğunu
   sanıyorsan **önce ölçümünün doğru olduğunu kanıtla.** Yaşananlar:
   - test yardımcısı yanlış bloğu ayıklıyordu
   - `wrangler dev` bayat dosya sunuyordu
   - `launch.json` yanlış depoyu başlatıyordu
   - `grep` deseni Türkçe karakterde eşleşmiyordu ("kod yüklenmemiş" sanıldı)
   - konsol cp1252 olduğu için UTF-8 Türkçe bozuk göründü (dosya sağlamdı)
   - Python `subprocess`, MSYS `/c/...` yolunu çeviremediği için `pdftotext`
     dosyayı hiç açamadı ve "0 karakter" döndü
   - araç bir PDF için yanlış sayfa sayısı bildirdi (44 dedi, gerçek 25)
   - Playwright imzası `waitForFunction(fn, arg, options)` — `{timeout}`
     ikinci sıraya konunca sessizce 30 sn varsayılanı kullanıldı
   - giriş kapısı modalı **gerçek fare tıklamasını** engelliyordu (DOM
     `.click()` çalışıyordu, o yüzden fark edilmedi)
   - **gizli sekmede CSS `transition` ilerlemez**; `getComputedStyle` başlangıç
     değerini döndürdüğü için "karanlık temada beyaz üstüne beyaz" diye
     OLMAYAN bir kusur bulundu (`document.visibilityState === "hidden"`)
   - sahte test verisi eksik alanla üretildi ve ürün hatası sanıldı

   **Yerel doğrulamadan önce servis edilen dosyanın diskteki dosyayla aynı
   olduğunu kanıtla:**
   ```bash
   curl -s http://localhost:8788/app.js | sha256sum
   sha256sum < public/app.js
   ```

3. **Yinelenen `id` sessizce düğme öldürür.** Beş panel aynı anda DOM'da
   olduğu için aynı `id` iki panelde üretilirse `getElementById` ilkini bulur,
   ikinci düğme çalışmaz. Çözüm: `id` değil **sınıf + `querySelectorAll`**.
   (Şu an 75 id, yinelenen 0 — bozarsan ölçümden anlarsın.)

4. **`oninput` içinden `renderAll()` çağırma** — kullanıcı yazarken odak
   kaybeder.

5. **`const` hoist edilmez.** Sabiti `state`'ten sonra tanımlarsan sayfa
   açılışta ölür.

6. **Yeni `state.exam` alanı eklersen** `activateExam()` **ve** `createExam()`
   içindeki literallere de ekle; yoksa sınav değiştirilince alan **sessizce
   kaybolur** (`endsAt` ve `mcPoint` böyle kaybolmuştu).

7. **İkiz koşul yazma.** Aynı ölçütü iki yerde ayrı ayrı yazarsan ayrışırlar
   ve üründe hataya dönüşür — iki kez yaşandı. Ölçütü **tek fonksiyona** al
   (`rubrikGecerliMi()` bunun için var).

8. **Türkçe ek tuzağı.** Ek, sayının **okunuşuna** göre değişir (%50'sini ama
   %100'ünü). Sabit ek çoğu değerde yanlış olur — cümleyi ek almayacak şekilde
   kur.

9. **Sabitleri tahminle koyma.** `guards.ts`'teki `BENZERLIK_ESIGI = 0.30`
   gerçek soru çiftleriyle **kalibre edildi**. Yeni bir eşik gerekiyorsa ya
   ölç, ya da eşik gerektirmeyen bir ölçüt tasarla (birebir eşitlik gibi).

10. **Düzenleme araçları Türkçe karakteri bozabilir.** Hedef bölgede `\uXXXX`
    kaçış dizileri varsa (örn. `guards.ts`'teki regex) bazı araçlar senin
    yazdığın Türkçe metni de kaçış dizisine çevirir. Yaşandı. **Yazdıktan
    sonra dosyayı UTF-8 okuyup doğrula**; gerekirse düzenlemeyi Python ile yap.

11. **Demo tohumu sunucudan GEÇMEZ.** `DEMO_SORULAR` istemcide sabittir;
    `gerekceyiSadelestir`, `shuffleOptions`, dil denetimi gibi sunucu
    korumaları ona uygulanmaz. Sunucuda bir kusuru düzelttiğinde **demo
    tohumunu da elle düzelt**, yoksa ürün kendi düzelttiği kusuru jüriye
    sergiler (§48b'de tam olarak bu oldu).

12. **Soru gövdesinde `KAYNAK_ATIF` kalıpları kullanma** ("metinde", "parçada",
    "yukarıdaki", "verilen metin"...). `guards.ts` bunları görürse
    `needsSource`'u **zorla true** yapar; gösterilecek uyaran metin yoksa
    öğrenci ekranında boş kutu çıkar. "Buna göre..." güvenlidir.

## 6. Model çıktısı GÜVENİLMEZ kabul edilir

Sunucu her yanıtı Zod ile doğrular ve normalleştirir. Var olan korumalar —
bunları bilmeden yenisini ekleme:

- Şık karıştırma (Fisher-Yates; doğru cevap **içeriği** takip eder, harfi değil)
- Geçersiz cevap anahtarı → `anahtarBelirsiz` ile işaretlenir, uzman seçer
- Yabancı **alfabe** denetimi (soru üretiminde **ve** değerlendirme çıktısında);
  §48'de Latin Extended Additional (U+1E00–1EFF) eklendi — canlıda `phứcekli`
  kaçmıştı
- Tekrar denetimi (gövde Jaccard ≥ 0,30) **ve** aynı şık kümesi (`sikImzasi`)
- Kullanılamaz soru (3'ten az şık) → `meta.elenenGecersiz`
- Çeldirici gerekçesindeki kalıp açılış sunucuda kesilir (`gerekceyiSadelestir`)
- İki çeldiriciye birebir aynı gerekçe → `gerekceTekrari` ile **gösterilir**
- Metne atıf tespiti → `needsSource` zorla true (`kaynakGerektirirMi`)
- Hız sınırı **altı ucun hepsinde** bağlı; kaynak metin 6.000 karakterde
  sunucuda reddedilir

Ortak ilke: **otomatik düzeltme değil, insana gösterme.** Bir kusuru gizleme.

**Korumaların YAKALAYAMADIĞI şeyler (bilerek):**
- **Olgusal hata / yanlış cevap anahtarı.** Şema yakalayamaz. Canlıda üç kez
  görüldü ("1 kg su kaç cL", "2 saatte 40 km → 5 saatte", sürtünme kuvveti
  hesabı). Ürünün cevabı mimarîdir: soru onay bekleyenlerde durur.
- **Latin harfli yabancı DİL.** `dilUyarisi` *alfabe* arar; Türkçe cümlenin
  içindeki "necessary" uyarı üretmez.
- **Genel geçer çeldirici gerekçesi** ("yanlış bir oranlama yapıyor").
- **Birbirinin eşanlamlısı iki şık** (ikisi de savunulabilir olur).

## 7. Şu anki durum (son durum: 19 Ekim 2026)

| | |
|---|---|
| Depo | dal `main`. `origin/main` = `e4a4024`; 19 Ekim commit'leri **pushlanmadı** |
| Test | **302/302** (9 dosya) — 19 Ekim |
| Lint (`tsc --noEmit`) · `check:config` · `node --check` | temiz · exit 0 · temiz — 19 Ekim |
| Öz-kontrol | **355 ad · kapsama %100** — 19 Ekim |
| Canlı ↔ disk | `app.js` · `app.css` · `/` **SHA-256 eş** — 19 Ekim (CRLF'li disk dosyasıyla; CR'ler atılınca HEAD ile eş) |
| `/api/health` · `/api/ai/status` | `ok:true` · `ready:true`, `fallbackSorunu: null` — 19 Ekim |
| Son canlı yayın | 6 Eylül (§50 turları) |
| Konsol hatası · yinelenen `id` | 0 · 0 (son ölçüm 6 Eylül) |
| Keşif kazanımı | **18** (§50f) |
| Üretim süresi | **15-25 sn** (§48'de beceri temelli soruyla arttı) |
| Cloudflare | Workers Paid; rehbere göre (18.10) **26 Ekim'de bitecek şekilde iptal kurulu** — "Cancel downgrade"a basma, ücretli özellik açma |

## 8. §43'ten bugüne ne oldu (özet — ayrıntı `PROGRESS.md`'de)

- **§43** Sınıf kodu / cihazlar arası senkron **tamamen kaldırıldı**; yedek
  model gerçekten çalışır hâle geldi.
- **§44** Boş kriter adıyla sınav yayınlanabiliyordu (hata puanlama anında
  çıkıyordu); şıkkı eksik sorular sessizce düşüyordu.
- **§45** Ekran görüntüleri ürünü yalanlıyordu → `tools/ekran-goruntusu-al.mjs`
  yazıldı; değerlendirme çıktısına dil denetimi eklendi; favicon eklendi.
- **§46** Gövdesi farklı ama **şıkları aynı** sorular (`sikImzasi`); "1 kg su
  kaç santilitre" sorusunda yanlış cevap anahtarı → istem sertleştirildi, A/B
  ölçüldü (eski 0/2 → yeni 4/4).
- **§47 + §47b** Çeldirici gerekçeleri hep aynı kalıpla başlıyordu; kaynağı
  **istemin kendi JSON örneğiydi**. İstem düzeltmesi ÖLÇÜLDÜ ve **hiç işe
  yaramadı** (24/24 hâlâ kalıplı) → sunucuda deterministik temizlik
  (`gerekceyiSadelestir`) ile 0/24.
- **§48** **Beceri temelli (yeni nesil) soru** istemi + **ders/kazanım
  sekmeleri** (kullanıcı kendi dersini/kazanımını ekleyip silebiliyor).
  Dışarıdan gelen yamanın tabanı §43 öncesiydi; 6 dosyanın 2'si elle işlendi
  ki §46/§47 geri alınmasın. `lib/ai.ts`'te gerçek bir hata düzeltildi
  (kesilme sonrası bütçe **düşebiliyordu**). İki kusur daha kapatıldı:
  `YABANCI_ALFABE` Vietnamca `ứ`'yi kaçırıyordu, `extractKeywords` "İzmir"i
  "Zmir" yapıyordu.
- **§48b** Tam denetim. **Demo tohumu ürünü yalanlıyordu** (klasik sorular +
  §47'nin temizlediği kalıp) → düzeltildi. Ekran görüntüleri yenilendi ve
  betiğin yanlış sekmeyi çektiği bulundu. `agents.md`'ye güncellik bandı.
- **§49** **Keşif Kampüsü** + **belgeye kilitli üretim**: üç atölye, kazanımlar
  okulun kendi ders belgelerinden (`public/dersler/`, MEB kataloğu yok). Belge
  okunamazsa üretim yapılmaz, sebebi yazılır; kırpma sessiz değildir.
  **Kazanım başarı grafiği** ısı haritasının yerini aldı (%55 eşik çizgisi
  kırmızı). Mavi palette hata rengi de maviye döndü; ölçülmüş alternatif
  sunuldu, **kullanıcı kararıyla böyle kaldı** (§49.4). Açık: belgeden
  gerçekten üretildiği gerçek model çağrısıyla ölçülmedi (§49.8).
- **§50 · §50b** Atölye *sınıf* olmaktan çıktı (Sınıf: 5-8 · **Keşif**).
  **İki veri göçü** `loadState()` içinde: eski atölye-sınıfı kayıtlarını taşır;
  yeni varsayılan kazanımları **yalnızca ekler**. Yazılmasalardı sessiz veri
  kaybı olurdu; ikisi de canlıda bayat kayıtla ölçüldü.
- **§50c-§50f** Turkuaz → **turuncu** `#F2994A` (metinde `#9a5410`, WCAG AA);
  Keşif alanı Sınıf ile Şube arasına; Keşif seçilince boş ekran kusuru
  düzeltildi; Fizik kazanımları eklendi → toplam **18** Keşif kazanımı.
- **§50g-§50n** Depo ve vitrin turları: bayat sayılar, README tabloları, sır
  denetimi, "dürüstlük notu"nun çerçevesi, D1: **"kurulu, demoda kapalı"**.
- **19 Ekim — T3 AI araştırma bursu çalışması (sürüyor):**
  [`docs/ARASTIRMA.md`](./docs/ARASTIRMA.md) (araştırma sorusu, doğrulanmış
  5 ön bulgu, 6 aylık plan, etik/KVKK) · [`docs/HATA_TAKSONOMISI.md`](./docs/HATA_TAKSONOMISI.md)
  (v0.2, 27 kod) · sabit set + ölçüm betiği (`tools/olcum/`) · kazanım metni sınırı
  200 → 400 (`fc1750c`, MAT.8.3.5) · T3 AI'ya dışarıdan erişim **bulunamadı**
  (denenmedi, ölçülmedi). **İlk ölçüm** (ön bulgu): ARASTIRMA §6,
  PROGRESS §54, `docs/olcum/OZET.md`. **Deneyap:** 12 atölye, 622 kazanım
  (`docs/DENEYAP_KAYNAK.md`), arayüze bağlandı (PROGRESS §52): ders
  "Deneyap Atölyeleri", katalog penceresi, `kaynakTuru: "deneyap"`.

### ⚠️ Sunumda SÖYLENMEMESİ gerekenler

1. **"Demo sorularını model üretti."** §48b'de elle yazıldılar. Gerçek modele
   ürettirmek denendi; adaylardan birinin **cevap anahtarı yanlıştı**, biri
   Türkçe cümle içinde "necessary" taşıyordu. Canlı üretimi göstermek istersen
   **"AI ile Soru Üret"** düğmesine bas — o gerçek modeli çağırır.
2. **"Öğrenci kendi telefonundan girer."** Çok cihazlılık §43'te kaldırıldı.
3. **"Sorularımız beceri temelli."** Ölçülen şu: gövde 11,7 → 24,7 kelime,
   veri içeren soru %55 → %100, yasak klasik kalıp 1 → 0. Ama istemin kendi
   koyduğu **40+ kelime hedefine yerelde hiçbir soru ulaşmadı** (canlıda 5'te
   2). "Ölçtük, şu kadar iyileşti" de; "başardık" deme.
4. **"Creathon'u kazandık."** Finalist olundu, derece yok.
5. **"T3 AI ile entegre."** Erişim yok, denenmedi; doğrusu "planlanıyor".
6. **"1 kg su sorusunda model 100 dedi."** Ters: model **1000 cL** işaretledi,
   doğrusu **100 cL** (§46.2).

## 9. Açık kalan işler

- **40-110 kelime hedefi tutturulamadı.** Gerçekten isteniyorsa yol istem değil
  **sunucu tarafıdır**: gövde kelime sayısı ölçülüp kısa sorular elenebilir.
  Eleme eşiği **ölçülerek** konmalı.
- **Token bütçesi sayıları (700 / 5600) doğrulanmadı** — yalnızca "kesilme
  olmadı" davranışı ölçüldü. Workers Logs'taki `ev: "ai_call"` kayıtlarına bak.
- **Çok cihazlılık yok.** Gerçek çözüm oda kodu değil, **Better Auth +
  `users` tablosu**; şema `schema.sql`'de hazır duruyor.
- **OCR gerçek taranmış PDF ile hiç denenmedi.** §48'de sentetik (eğik/gölgeli
  üretilmiş) bir taramayla denendi ve çalıştı, ama **gerçek bir tarayıcı/telefon
  çıktısıyla değil.** O denemede bulunan gerçek kusur: **OCR iki sütunlu
  sayfada sütunları iç içe geçiriyor** (kelime isabeti %90 ama okuma sırası
  bozuk); metin katmanı yolunda böyle bir sorun yok.
- **Benzerlik eşiği (0,30) saha doğrulaması** yapılmadı.
- **Model karşılaştırması tekrarlanmalı** — eski ölçüm, soru sayısı sınırı ve
  tekrar denetimi eklenmeden önce yapıldı.
- **Latin harfli yabancı dil denetimi** eklenmedi (sözlük gerektirir, yanlış
  pozitif üretir).

## 10. İZİN İSTE — bunları kendi başına yapma

- `npm run deploy:demo` — **canlı adresin üzerine yazar** (ayrı bir demo
  adresi açmaz). `npm run deploy` ise ücretsiz planda Queues yüzünden kırılır.
- `git push`, `git push --force`, rebase, geçmiş yeniden yazma
- `--remote` ile herhangi bir D1 komutu
- Cloudflare hesabında ücret doğuran herhangi bir işlem
- API anahtarı/secret girmek — bunu **kullanıcı yapar**, sen yapamazsın

Gerçek model çağrısı ücretlidir (Workers Paid · Neuron). Birkaç çağrı kuruş
mertebesindedir ama **önce söyle**, sonra çağır.

## 11. Nasıl davran

- Emin değilsen **"emin değilim" de.** Bu projede doğrulanmamış bir şeyi
  doğrulanmış gibi yazmanın bedeli defalarca ödendi.
- Bir kusur bulduğunda **önce yeniden üret**, sonra düzelt, sonra tekrar ölç.
  Düzeltmenin işe yaradığını **A/B ile göster** — "istem değişikliği yaptım"
  yeterli değil. (§47'de bir istem düzeltmesi ölçüldü ve **hiç işe yaramadığı**
  görüldü; çözüm kodda bulundu.)
- **Kendi ölçüm hatanı da rapor et.** Bu depo onları kaydeder; gizlemek,
  sonraki okuyucunun aynı tuzağa düşmesi demektir.
- Bedeli olan bir değişiklik yapıyorsan **bedelini de yaz.**
- Kullanıcı bağlam kaybına ve uydurma bilgiye karşı hassas. Kısa konuş,
  ölçümü göster, uydurma.

## 12. İlk üç adım

1. §2'deki komutları **çalıştır ve çıktılarını göster.**
2. `PROGRESS.md`'yi **sondan başa** oku: en yeni bölümden (19 Ekim, §51 ve
   sonrası) §50n → §49 → §48b → … → §43'e in. Ardından `docs/ARASTIRMA.md`.
3. `agents.md`'yi oku — **önce üstündeki güncellik bandını**, sonra kuralları.
   Ayrıca `DEVIR.md` (uzun devir belgesi) elinin altında dursun.

Hazır olduğunda "doğrulama çıktıları şunlar, şu işi yapmaya hazırım" diye
başla. **Doğrulamadan iş yapma.**
