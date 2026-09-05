# DEVRALAN ASİSTAN PROMPT'U — MİHENK

> Bu dosyanın içeriği, projeyi devralacak yapay zekâ asistanına **olduğu gibi
> yapıştırılmak** üzere yazılmıştır. Aşağıdaki çizginin altındaki her şey
> prompt'tur.

---

Mihenk adlı bir projeyi devralıyorsun. Aşağıdakileri **önce oku, sonra iş yap**.

## 1. Proje nedir

Mihenk, ortaokul (5-8. sınıf) için uçtan uca bir **ölçme ve değerlendirme**
sistemidir. T3 Vakfı Bursiyer Yapay Zekâ Creathon 2026 · Problem 2 için Takım
BİES (Esat Talha Karataş, İrem Yazıcı, Zeynep Sude Demir, Burak Özçelik)
tarafından yazıldı.

- **Depo:** https://github.com/EsatKaratas/mihenk
- **Canlı:** https://mihenk.bies.workers.dev
- **Yerel çalışma kopyası:** `C:\Users\pc\Downloads\mihenk-final`
  (dal `main` = `final-birlestirme`)

⚠️ `C:\Users\pc\t3-olcme-degerlendirme` **ESKİ bir kopyadır** (Eylül başında
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
git rev-parse --short HEAD
npm run lint                        # sessiz olmalı
npm test                            # 227/227
node tools/ozkontrol-dogrula.mjs    # 319 ad · kapsama %100
npm run check:config                # exit 0
curl -s https://mihenk.bies.workers.dev/api/health
curl -s https://mihenk.bies.workers.dev/api/ai/status
```

Sayılar tutmuyorsa **DUR ve sor.** Körlemesine devam etme — bu projede
doğrulanmamış varsayımla ilerlemenin bedeli defalarca ödendi.

## 3. Değiştirilemez kurallar

1. **HITL zincirine dokunma.** Otomatik onay, toplu onay, puan eşiği, yapay
   zekânın nihai karar vermesi — dördü de kapsam dışıdır ve gerekçesi ne
   olursa olsun reddedilir (`agents.md` §1). Bu bir tercih değil, ürünün
   varlık sebebi.
2. **Türkçe konuş ve yaz.** Kod yorumları, commit mesajları, değişken adları
   (`hizSinirli`, `bosDurumHtml`), belgeler — hepsi Türkçe.
3. **Ölçmeden iddia etme.** "Çalışıyor olmalı" diye bir şey yok. Çalıştır,
   çıktıyı göster. Test etmediysen "test etmedim" de.
4. **`PROGRESS.md`'yi her adımda güncelle** — yaptığın işi, **kök nedeni** ve
   **ölçüm sonucunu** yaz. Bu dosya projenin hafızası ve **tek doğruluk
   kaynağıdır**; şu an §47b'ye kadar dolu.
5. **Sessiz düşüş yasak.** Bir şey başarısız olduysa, elendiyse, kısıldıysa
   kullanıcıya **söylenmeli**. Bu, projede en çok ihlal edilen ve en çok
   düzeltilen kuraldır.
6. **Yeni üst düzey fonksiyon → `selfCheck` listesine ekle.**
   `tools/ozkontrol-dogrula.mjs` çift yönlü denetler; eklemezsen CI kırılır.
7. Commit biçimi: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`,
   `test:`, `chore:`).

## 4. Mimari — bilmezsen yanılırsın

- **`routes.ts` ÇALIŞAN KOD DEĞİLDİR.** Depo kökündeki bu dosya bir referans
  iskeletidir; her handler `c.json({ todo: ... })` döndürür. İlk bakan biri
  auth/exams/grading rotalarının var olduğunu sanır — **yoktur.**
- **Gerçek Worker `src/index.ts`'tir** ve yalnızca iki şey sunar:
  `GET /api/health` ve `/api/ai/*` (7 uç). Başka hiçbir uç yok.
- **Ürünün tamamı `public/app.js` içindedir** (~9.400 satır, tarayıcıda çalışır).
  Beş rol paneli **aynı anda DOM'dadır**; yalnızca aktif olan CSS ile görünür.
- **Sunucuda ürün verisi YOKTUR.** Sınav, yanıt, öğrenci adı, puan hiçbir
  koşulda sunucuya gitmez; her şey `localStorage` + IndexedDB'de. D1 bağlaması
  kaldırıldı. Yalnızca yapay zekâ çağrılarında ilgili metin modele iletilir.
- **Kimlik doğrulama yoktur.** Roller bir `state.role` seçimidir. Eskiden bir
  "sınıf kodu" vardı; kimlik doğrulama olmadığı ve kodu bilen herkes o sınıfın
  yanıtlarını okuyabildiği için **tamamen kaldırıldı** (PROGRESS §43).
  **Bedeli:** ürün artık tek cihazda yaşar. "Öğrenci kendi telefonundan girer"
  iddiası **geçersizdir**, sunumda söylenmemeli.
- **Model:** Cloudflare Workers AI · `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
  Yedek: `@cf/meta/llama-4-scout-17b-16e-instruct` (aynı hesapta, anahtar
  gerektirmez). **Yedek kota tükenmesine karşı KORUMAZ** — ikisi de aynı
  Neuron havuzundan yer; koruduğu şey modele özgü arızadır.
- **Eğitim yapılmadı.** Ne fine-tuning, ne LoRA, ne kendi modelimiz. Hazır bir
  temel model + istem mühendisliği + sunucu tarafı doğrulama.

## 5. TUZAKLAR — hepsi bu projede GERÇEKTEN yaşandı

1. **`node --check` YETMEZ.** Yalnızca sözdizimi doğrular. `public/app.js`'te
   yaptığın değişiklik **gerçek tarayıcıda açılmadan "bitti" sayılmaz.**
2. **Ölçüm aracın yanılabilir — bu projede yedi kez oldu.** Bir hata bulduğunu
   sanıyorsan **önce ölçümünün doğru olduğunu kanıtla.** Yaşananlar: test
   yardımcısı yanlış bloğu ayıklıyordu; `wrangler dev` bayat dosya sunuyordu;
   launch.json yanlış depoyu başlatıyordu; `grep` deseni Türkçe karakterde
   eşleşmediği için "kod yüklenmemiş" sanıldı. **Yerel doğrulamadan önce
   servis edilen dosyanın diskteki dosyayla aynı olduğunu kanıtla:**
   ```bash
   curl -s http://localhost:8788/app.js | sha256sum
   sha256sum < public/app.js
   ```
3. **Yinelenen `id` sessizce düğme öldürür.** Beş panel aynı anda DOM'da
   olduğu için aynı `id` iki panelde üretilirse `getElementById` ilkini bulur,
   ikinci düğme çalışmaz. Çözüm: `id` değil **sınıf + `querySelectorAll`**.
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

## 6. Model çıktısı GÜVENİLMEZ kabul edilir

Sunucu her yanıtı Zod ile doğrular ve normalleştirir. Var olan korumalar —
bunları bilmeden yenisini ekleme:

- Şık karıştırma (Fisher-Yates; doğru cevap **içeriği** takip eder, harfi değil)
- Geçersiz cevap anahtarı → `anahtarBelirsiz` ile işaretlenir, uzman seçer
- Yabancı alfabe denetimi (soru üretiminde **ve** değerlendirme çıktısında)
- Tekrar denetimi (gövde Jaccard ≥ 0,30) **ve** aynı şık kümesi (`sikImzasi`)
- Kullanılamaz soru (3'ten az şık) → `meta.elenenGecersiz`
- Çeldirici gerekçesindeki kalıp açılış sunucuda kesilir (`gerekceyiSadelestir`)
- İki çeldiriciye birebir aynı gerekçe → `gerekceTekrari` ile **gösterilir**

Ortak ilke: **otomatik düzeltme değil, insana gösterme.** Bir kusuru gizleme.

## 7. Şu anki durum (5 Eylül 2026, commit `a1afcce`)

| | |
|---|---|
| Test | 227/227 |
| Lint (`tsc --noEmit`) | temiz |
| Öz-kontrol | 319 ad · kapsama %100 |
| Konsol hatası | 0 |
| Canlı ↔ disk | `app.js`, `app.css`, `index.html` SHA-256 eş |
| Yedek model | çalışıyor (`fallbackSorunu: null`) |
| Cloudflare | Workers Paid, `Active`, **26 Eylül'de yenilenir** |

## 8. Açık kalan işler

- **Çok cihazlılık yok.** Gerçek çözüm oda kodu değil, **Better Auth +
  `users` tablosu**; şema `schema.sql`'de hazır duruyor.
- **OCR gerçek taranmış PDF ile hiç denenmedi** — elle taranmış, eğik/gölgeli
  bir belgeyle test edilmedi. "Çalışıyor" kabul etme.
- **Benzerlik eşiği (0,30) saha doğrulaması** yapılmadı; meşru soru eleniyorsa
  ölçümü tekrarla, **sabiti tahminle değiştirme**.
- **Model karşılaştırması tekrarlanmalı** — eski ölçüm, soru sayısı sınırı ve
  tekrar denetimi eklenmeden önce yapıldı.
- **Genel geçer çeldirici gerekçeleri** ("yanlış bir oranlama yapıyor") hâlâ
  çıkabiliyor; gerekçeler arası benzerlik eşiği **bilerek eklenmedi** (kalibre
  edecek veri yok).

## 9. İZİN İSTE — bunları kendi başına yapma

- `npm run deploy:demo` — **canlı adresin üzerine yazar** (ayrı bir demo
  adresi açmaz). `npm run deploy` ise ücretsiz planda Queues yüzünden kırılır.
- `--remote` ile herhangi bir D1 komutu
- `git push --force`, rebase, geçmiş yeniden yazma
- Cloudflare hesabında ücret doğuran herhangi bir işlem
- API anahtarı/secret girmek — bunu **kullanıcı yapar**, sen yapamazsın

## 10. Nasıl davran

- Emin değilsen **"emin değilim" de.** Bu projede doğrulanmamış bir şeyi
  doğrulanmış gibi yazmanın bedeli defalarca ödendi.
- Bir kusur bulduğunda **önce yeniden üret**, sonra düzelt, sonra tekrar ölç.
  Düzeltmenin işe yaradığını **A/B ile göster** — "istem değişikliği yaptım"
  yeterli değil, ölçüm gerekir. (§47'de bir istem düzeltmesi ölçüldü ve
  **hiç işe yaramadığı** görüldü; çözüm kodda bulundu.)
- Bedeli olan bir değişiklik yapıyorsan **bedelini de yaz.** Sınıf kodu
  kaldırıldığında "çok cihazlılık gitti" cümlesi belgelere böyle girdi.
- Kullanıcı bağlam kaybına ve uydurma bilgiye karşı hassas. Kısa konuş,
  ölçümü göster, uydurma.

## 11. İlk üç adım

1. `PROGRESS.md`'yi **sondan başa** oku: §47b → §47 → §46 → §45 → §44 → §43.
2. `agents.md`'yi oku — öneri değil, anayasa.
3. `DEVIR.md`'yi oku (bu prompt'un uzun hâli) ve §2'deki komutları
   **çalıştırıp çıktılarını göster.**

Hazır olduğunda "doğrulama çıktıları şunlar, şu işi yapmaya hazırım" diye
başla. Doğrulamadan iş yapma.
