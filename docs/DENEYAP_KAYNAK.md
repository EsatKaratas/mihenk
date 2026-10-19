# Deneyap Atölye Müfredatı — Kaynak, Yöntem, Doğrulama

> 19 Ekim 2026 · Mihenk Worker 3. Bu belge `public/mufredat/deneyap-*.json`
> dosyalarının **nereden geldiğini** ve **nasıl doğrulandığını** anlatır.
> Kural: **uydurma yok.** Her kazanım cümlesi aşağıdaki kitapların kendi kazanım
> bölümlerinden birebir alınmıştır; sayfası ve kitabın SHA-256 özeti kayıtlıdır.

## 1. Özet

| Atölye | Dosya | Kazanım | Alıntı | Türetme | Kitap |
|---|---|---:|---:|---:|---|
| Tasarım ve Üretim | `deneyap-tasarim-uretim.json` | 60 | 60 | 0 | Deneyap Kitapları 1 |
| Robotik ve Kodlama | `deneyap-robotik-kodlama.json` | 55 | 55 | 0 | Deneyap Kitapları 19 |
| Elektronik Programlama ve Nesnelerin İnterneti | `deneyap-epni.json` | 67 | 67 | 0 | Deneyap Kitapları 21 |
| Yapay Zekâ | `deneyap-yapay-zeka.json` | 66 | 66 | 0 | Deneyap Kitapları 13 |
| Yazılım Teknolojileri | `deneyap-yazilim-teknolojileri.json` | 50 | 50 | 0 | Deneyap Kitapları 7 |
| **Toplam** | 5 dosya | **298** | **298** | **0** | |

**Türetilmiş kayıt yok.** Beş kitabın beşinde de her haftanın/bölümün başında açık
bir kazanım listesi var ("KAZANIMLAR", "Haftanın Kazanımları", "Bölüm
Kazanımları", "Kazanımlar: K1…"). Bu yüzden ünite hedeflerinden türetmeye gerek
kalmadı. Şemada `tur` alanı yine de var (`alinti` | `turetildi`), çünkü ileride
eklenecek bir atölyenin kitabında kazanım bölümü olmayabilir.

Görevdeki öncelikli 5 atölyenin hepsi tamamlandı. Kalan 9 ortaokul atölyesi
(Siber Güvenlik, Enerji Teknolojileri, Mobil Uygulama, Çevrim İçi Yazılım
Teknolojileri, İleri Robotik, Havacılık ve Uzay, Malzeme Bilimi ve
Nanoteknoloji, ayrıca Robotik ve EPNİ'nin ikinci sürümleri) **eklenmedi**
(bkz. §7).

## 2. Kaynak ve seçim gerekçesi

**Birincil kaynak: TÜBİTAK Yayınları — <https://yayinlar.tubitak.gov.tr/deneyap-atolyesi>**
(14 ortaokul + 14 lise PDF). Esat'ın kararı: 2025–2026 döneminde kullanılan
müfredat yeterli; Mihenk 5–8. sınıf olduğu için yalnız **ortaokul** kitapları alındı.

**deneyap.org'a da bakıldı** (`/tr/hakkimizda/yayinlarimiz/`, `/tr/egitim/basliklar/`).
Karşılaştırma ölçüldü:

| Ölçüt | TÜBİTAK Yayınları | deneyap.org |
|---|---|---|
| Yayıncı | Kitabın kendi yayıncısı (TÜBİTAK Bilim ve Toplum Başkanlığı) | Program sitesi (DENEYAP Türkiye) |
| Künye (ISBN, yayım/güncellenme tarihi) | Var, her kitapta | Robotik kopyasında **yok** (ilk sayfalarda ISBN aranıp bulunamadı) |
| Kitabın kendi gösterdiği adres | Her künye sayfası "elektronik nüshaya yayinlar.tubitak.gov.tr/deneyap-atolyesi adresinden ulaşılabilir" diyor | — |
| Dosya özdeşliği | — | Tasarım ve Üretim: **bayt düzeyinde aynı** (SHA-256 eş). Diğer 10 ortaokul dosyasının boyutu farklı |
| Kazanım içeriği | — | Robotik (künyesiz kopya, 152 s.): bizim 55 Robotik kazanımının **55'i** metinde birebir geçiyor |
| "Eğitim Başlıklarımız" sayfası | — | Atölye başına tek cümlelik "dersin amacı"; kazanım listesi yok |

**Karar:** Kaynak TÜBİTAK Yayınları. Gerekçe: künyeli, yayıncının kendisi, kitap
kendi elektronik nüshası için bu adresi gösteriyor. deneyap.org'daki kopyalar
**çelişmiyor, teyit ediyor** (bir kitap aynı dosya, bir kitapta kazanımlar aynı).
deneyap.org'un ders listesi kazanım düzeyinde bilgi vermediği için katalog
kaynağı olarak yetersiz.

### İki sürümü olan atölyeler — hangisi neden

| Atölye | Seçilen | Seçilmeyen | Gerekçe |
|---|---|---|---|
| Robotik ve Kodlama | **19** — Sözcük Blokları (LEGO SPIKE Prime), © 2023, güncellenme Ocak 2025 | 3 — EV3 (LEGO Mindstorms EV3), © 2021, güncellenme Ocak 2025 | İkisi de güncel listede. 19 daha yeni yazım; deneyap.org da ortaokul için "Sözcük Blokları" sürümünü dağıtıyor. EV3 seti üreticisince satıştan kaldırıldı (genel bilgi, burada ölçülmedi). |
| EPNİ | **21** — "Deneyap Teknoloji Atölyelerine Yönelik Ortaokul EPNİ Modülleri", © 2023 | 5 — EPNİ Ortaokul, © 2021 | Daha yeni yazım ve Deneyap Kart / Deneyap Blok ortamına göre yazılmış. |

Seçilmeyen iki kitap da indirildi ve SHA-256'ları aşağıda; istenirse aynı
betikle ayrı katalog yapılabilir.

## 3. Künyeler

Tümü: Yayıncı TÜBİTAK Bilim ve Toplum Başkanlığı · Yayıncı Sertifika No 47703 ·
"TÜBİTAK Deneyap Kitapları DENEYAP TÜRKİYE Projesi kapsamında hazırlanmıştır."
Kaynak sayfa: <https://yayinlar.tubitak.gov.tr/deneyap-atolyesi> · İndirme tarihi 19.10.2026.

| No | Kitap | Yazarlar | © | Yayım | Güncellenme | ISBN | PDF s. | SHA-256 |
|---|---|---|---|---|---|---|---:|---|
| 1 | Tasarım ve Üretim (Ortaokul) | Doç. Dr. Pınar Kaygan ve 6 yazar | 2021 | 2023 | Ocak 2025 | 978-605-312-437-5 | 313 | `0bccf30fc62c939cd701fcbd2ba7a22b489c0dbc7e3d3e3a0bb220c15ca818d1` |
| 19 | Robotik ve Kodlama — Sözcük Blokları (Ortaokul) | Doç. Dr. Memet Üçgül, Prof. Dr. İbrahim Çetin, Prof. Dr. Erman Yükseltürk, Prof. Dr. Ercan Top | 2023 | 2023 | Ocak 2025 | 978-605-312-535-8 | 155 | `4146c8ea9092031ab1975afa4f1f7669b7f39d73b38b12f4cd065eea24af7d9c` |
| 21 | EPNİ — Ortaokul EPNİ Modülleri | Doç. Dr. İlker Yakın, Dr. Öğr. Üyesi Erman Uzun, Dr. Öğr. Üyesi Ali Gök | 2023 | 2023 | (künyede yok) | 978-605-312-537-2 | 326 | `b94433c6806fdbced6a549fa2be20269ec750b8f905abf9d3166463c88f76625` |
| 13 | Yapay Zekâ (Ortaokul) | Doç. Dr. Utku Köse, Doç. Dr. Koray Özsoy, Dr. Öğr. Üyesi Bekir Aksoy | 2023 | 2023 | (künyede yok) | 978-605-312-517-4 | 188 | `e71a4cb53869a86d0860af205729389e1f45f2ca7ed75b78936dd328bf1102e7` |
| 7 | Yazılım Teknolojileri (Ortaokul) | Dr. Öğr. Üyesi Caner Özcan, Dr. Öğr. Üyesi Rafet Durgut, Arş. Gör. Dr. Sevil Orhan Özen, Sercan Özen | 2021 | 2023 | (künyede yok) | 978-605-312-442-9 | 296 | `f4b1d45c16cda684929caa4029d1dcdf9313977995cdc1b529a29a6ab2453f5b` |
| 3 | *(seçilmedi)* Robotik ve Kodlama — EV3 (Ortaokul) | Üçgül, Çetin, Yükseltürk, Top | 2021 | 2023 | Ocak 2025 | 978-605-312-438-2 | 160 | `6e8f1fb388878817fe64911c1cf6013ed03c46bd8ec2bb41d3ec6e5161de771c` |
| 5 | *(seçilmedi)* EPNİ (Ortaokul) | Prof. Dr. İbrahim Çetin, Doç. Dr. Polat Şendurur, Prof. Dr. Ercan Top | 2021 | 2023 | (künyede yok) | 978-605-312-440-5 | 374 | `738ac9dfb56dcfe2052687b0c5b4f74d1ef0f7607556fb1e2d923842d9d0cac6` |

PDF adresleri her JSON'un `kunye.pdfUrl` alanında, sayfa adresi `kunye.sayfaUrl` alanındadır.

## 4. Yöntem

1. **İndirme** depo dışına: `C:\Users\ASUS\Downloads\deneyap-kaynak\pdf\`
   (güvenilmeyen veri; betikler ayrı klasörde, `python -I` ile). Dosya adlarındaki
   Türkçe karakter yüzde-kodlanmadan istenince sunucu **404** döndü; ilk
   denemede üç kitap "yok" görünmüştü. Kodlanarak indirildi, hepsi `%PDF` ile
   başlıyor.
2. **Metin çıkarma** (pymupdf, sayfa sayfa). PDF'lerin metin katmanı var, OCR gerekmedi.
3. **Kazanım bölümünü bulma**: her kitabın kendi başlığı (`KAZANIMLAR`,
   `Haftanın Kazanımları:`, `Bölüm Kazanımları:`, `Kazanımlar`) ile başlayıp
   kitabın bir sonraki başlığında (`BECERİLER`, `Kullanılacak Malzemeler`,
   `Haftanın Amacı`, `Amaç`) duruluyor. Madde işareti olmayan bir satır gelirse
   betik **durur** (sessizce kabul etmez).
4. **Metin işleme**: yalnızca satır sonu kırılmaları birleştirildi ve madde
   işaretleri atıldı. **Kelime değiştirilmedi.** Kitaptaki yazım hataları
   (aşağıda) aynen duruyor.
5. **Tekrarlar**: Tasarım ve Üretim'de aynı cümle birden çok haftada geçiyor
   (ör. "Üretim çalışmalarında hedeflenen tasarıma ulaşmak için sebatla çalışmada
   kararlılık gösterir." 5 haftada). Bir kez kaydedildi; diğer basılı sayfalar
   `kaynak.tekrarSayfalari` alanında. Küçük farkı olan iki cümle ("kullanır" ↔
   "kullanabilir") **ayrı** kaldı, çünkü birebir aynı değiller.
6. **Kod**: `DNY.<atölye>.<hafta/bölüm>.<sıra>` — TU, RK, EP, YZ, YT.
7. **Kapsam dışı bırakılan**: Tasarım ve Üretim kılavuzundaki "Tablo 1"
   (haftalık kazanımların özet tablosu; ders sayfalarıyla aynı içerik, birkaçı
   "İki/Üç boyutlu" diye birleştirilmiş) ve "Tablo 3 İlave etkinlikler" (isteğe
   bağlı etkinlikler, kazanım değil "kazanım ve amaçlar" karışık). Ders
   sayfalarındaki kazanım listeleri esas alındı.

Betikler (depoda değil, W2/tools sahipliğine girmemek için):
`C:\Users\ASUS\Downloads\deneyap-betikler\` → `indir.py`, `cikar.py`, `uret.py`, `dogrula.py`.

### Sayfa numarası

Her kayıtta iki numara var: `kaynak.sayfa` = **kitabın basılı sayfa numarası**
(öğretmenin kitapta göreceği), `kaynak.pdfSayfa` = PDF dosyasındaki sıra.
Örn. Tasarım ve Üretim'de PDF s.53 = basılı s.43.

### `uygunluk` alanı — ürünün sınıflandırması, müfredatın parçası DEĞİL

MEB kataloglarındaki üçlü ayrımın aynısı (`yazili` / `performans` / `surec`).
Kural:

- Kitap kazanımı **duyuşsal alan** diye vermişse → `surec`; **psikomotor alan** → `performans`.
- Diğerleri fiile göre: bilgi/kavrama fiiliyle biten (açıklar, tanımlar, bilir,
  söyler, kavrar, ayırt eder, ifade eder, analiz eder, anlar, yordar, tanır,
  öğrenir, bilgi sahibidir…) → `yazili`; uygulama/üretim fiili (kullanır, oluşturur,
  programlayabilir, tasarlar, geliştirir, test eder…) → `performans`.
- Kuralın yanıldığı **2 kayıt elle düzeltildi**, gerekçesi kayıtta (`uygunlukNotu`):
  `DNY.YZ.2.3` ("uygulayarak öğrenir") ve `DNY.TU.12.5` (sunum haftasında
  "kendini ifade eder").

> **Ölçüm hatam — kayda geçsin.** Kuralın ilk sürümü "bilir" kalıbını kelime
> sınırı olmadan aradı ve "oluştur**abilir**", "programlay**abilir**" gibi her
> yeterlik fiilini "bilir" saydı: EPNİ'nin **67 kazanımının 67'si** yazılı
> çıktı. Dağılımın tuhaflığı fark edilip kelime sınırı eklendi (EPNİ 13 yazılı /
> 54 performans). Sayılar aşağıda düzeltilmiş hâliyle.

| Atölye | yazılı | performans | süreç |
|---|---:|---:|---:|
| Tasarım ve Üretim | 16 | 25 | 19 |
| Robotik ve Kodlama | 13 | 42 | 0 |
| EPNİ | 13 | 54 | 0 |
| Yapay Zekâ | 25 | 41 | 0 |
| Yazılım Teknolojileri | 20 | 30 | 0 |
| **Toplam** | **87** | **192** | **19** |

Deneyap atölyeleri uygulamalıdır. Kazanımların yaklaşık üçte ikisinin
"performans" çıkması bunun doğal sonucu; yazılı sınavla ölçülebilir olanlar
87 kayıtla sınırlı.

## 5. Doğrulama — "her kazanım sayfasına karşı ikinci kez"

Üç katman, üç ayrı araç:

| Katman | Araç | Ne ölçüldü | Sonuç |
|---|---|---|---|
| 1. Çıkarım | pymupdf | Kazanım bölümleri ayrıştırıldı | 298 kayıt |
| 2. İkinci okuma | **pypdf** (farklı okuyucu) | Her kaydın metni, kaydın `pdfSayfa`'sından pypdf ile yeniden çıkarılan metinde aranır | Birebir: **291/298**. Kalan 7'nin hepsi pypdf'in kelime içine koyduğu boşluk ("ele ktronik", "değerlendirm e", "“ antecedent"). Boşluktan bağımsız karşılaştırma: **298/298**, uyuşmazlık **0** |
| 3. Göz | sayfa görüntüsü (110 dpi) | Yazım hatası taşıyan 9 kayıt + boşluk farkı çıkan 4 EPNİ kaydı + her kitaptan en az bir sayfa: **13 sayfa** | 13/13 sayfada metin JSON'la aynı; yazım hataları **kitapta da var** |
| Bütünlük | sha256sum (üçüncü araç) | Diskteki PDF ↔ JSON künyesi | 5/5 eş |
| Biçim | Python `json` | UTF-8 çözülüyor, kod tekrarı yok | temiz |

İkinci katmanın sınırı: iki okuyucu **aynı** PDF metin katmanını okur. Metin
katmanının kendisi yanlışsa (gömülü fontta yanlış eşleme) ikisi de aynı yanlışı
görür. Üçüncü katman bu yüzden var, ama 298 kaydın hepsini değil **13 sayfayı**
kapsar. Türkçe karakterlerin (ğ, ı, ş, İ, ü, ç, ö) görüntüyle uyuştuğu bu 13
sayfada görüldü; kalan sayfalar için kanıt iki okuyucunun uyuşmasıdır.

### Kitapta böyle basılmış yazım hataları (aynen korundu, kayıtta `not` var)

| Kod | Kitaptaki | Görüntüde doğrulandı |
|---|---|---|
| DNY.RK.6.5 | "Hub'ın **sallanama**, tıklatılma…" | ✓ s.73 (PDF 81) |
| DNY.RK.9.4 | "…hata için **düzetmeyi** belirleyebilirler." | ✓ s.122 (PDF 130) |
| DNY.RK.10.2 | "…blok oluşturup **programların** kullanabilir." | ✓ s.134 (PDF 142) |
| DNY.RK.10.4 | "**Öğrencilere** bloklara birden fazla…" | ✓ s.134 (PDF 142) |
| DNY.RK.12.1 | "**Prototipe çalışmasını** test eder." | ✓ s.145 (PDF 153) |
| DNY.EP.3.5 | "Deneyap Kart **kartın** dijital girdi…" | ✓ s.53 (PDF 62) |
| DNY.EP.5.4 | "**Öğrencileri** ihtiyaçlarına göre multimetreyi…" | ✓ s.102 (PDF 111) |
| DNY.EP.6.4 | "2 DC motor içeren araba **oluşturabilir programlayabilir**." | ✓ s.146 (PDF 155) |
| DNY.YZ.2.2 | "yaya **geçiti** trafik sinyalizasyonuna…" | ✓ s.34 (PDF 37) |

Düzeltmeme kararının gerekçesi: kayıt `tur: "alinti"` diyor. Alıntıyı
düzeltirsek kaynakta olmayan bir cümle alıntı gibi görünür. Bu da bu depoda
yasak (PROGRESS §50f: "birebir alıntı olmayanı alıntı gibi göstermek yasak").
Ürün ekranında düzeltilmiş hâli göstermek istenirse ayrı bir `gosterimMetni`
alanı eklenir ve `metin` yine kaynakla aynı kalır.

## 6. JSON biçimi

Mevcut `public/mufredat/fen-5.json` ile uyumlu: üst düzeyde `ders`, `sinif`,
`kaynak`, `not`, `kazanimlar[]`; her kayıtta `kod`, `alan`, `metin`, `uygunluk`,
`grup`. **Ek alanlar** (mevcut kod bunları okumaz, bozmaz):

```json
{
  "kod": "DNY.YZ.1.1",
  "alan": "Yapay Zekâ",
  "metin": "Öğrenciler “yapay zekâ” kavramını temel düzeyde açıklar.",
  "uygunluk": "yazili",
  "grup": "1. Hafta · Python ile Yapay Zekâ",
  "tur": "alinti",
  "kaynak": { "kitap": "TÜBİTAK Deneyap Kitapları 13 — Yapay Zekâ (Ortaokul)",
              "sayfa": 13, "pdfSayfa": 16, "url": "https://yayinlar.tubitak.gov.tr/…/13_yapay_zeka_ortaokul_16022024.pdf" }
}
```

Üst düzeyde ayrıca `atolye` ve `kunye` (ISBN, tarihler, yayıncı, `sayfaUrl`,
`pdfUrl`, `sha256`). Tasarım ve Üretim kayıtlarında `boyut` (bilişsel /
duyuşsal / psikomotor) vardır; kitap bu ayrımı yalnız orada yapıyor.

**`sinif: "Ortaokul"`** — MEB kataloglarındaki sayı (5, 6…) yerine metin.
Kitaplar sınıf düzeyi **ayırmıyor**, ortaokulun tamamı için yazılmış. Bunu bir
sınıfa (ör. 7) bağlamak uydurma olurdu. Arayüz entegrasyonu bunu hesaba
katmalı (`katalogModalHtml` bugün `k.sinif + ". sınıf"` yazıyor).

## 7. Sınırlar — söylenmesi gerekenler

- **Kitaplar müfredat değil, öğretim kılavuzu.** Bu kazanımlar Deneyap'ın
  **eğitmen kitaplarındaki** haftalık kazanımlardır. MEB'in resmî gazetede
  yayımlanan öğretim programı gibi ayrı bir "Deneyap öğretim programı" belgesi
  bulunamadı. deneyap.org'da da yok, yalnız tek cümlelik ders amaçları var.
  "Resmî" derken anlam şudur: kurumun kendi yayınladığı, künyeli eğitim kitabı.
- **Sınıf düzeyi yok** (bkz. §6). Kitap ortaokul diyor, 5. ve 8. sınıfı ayırmıyor.
- **"2025–2026'da kullanılan" varsayımı.** Kitapların güncellenme tarihi Ocak
  2025 (üçünde künyede güncellenme tarihi yok). Bir atölyenin bu dönemde
  gerçekten hangi kitapla işlendiği **ölçülmedi**; Esat'ın eğitmenlik
  bilgisiyle teyit edilmeli.
- **Sürüm seçimi** (Robotik 19 vs 3, EPNİ 21 vs 5) bir karardır, §2'de gerekçeli.
  Bir atölye EV3 setiyle çalışıyorsa doğru katalog 3 numaralı kitaptır.
- **9 ortaokul atölyesi eklenmedi** (öncelik 5'teydi, "yarım 14'ten tam 5").
  Yöntem ve betik hazır, her biri yaklaşık 20–30 dakika ister.
- **Telif.** PDF'ler depoya konmadı. Künye "TÜBİTAK'ın yazılı izni olmadan
  tümüyle veya kısmen çoğaltılamaz" diyor. Depoda yalnız kısa kazanım
  cümleleri, kitap adı, sayfa, URL ve SHA-256 var. Kısa kazanım cümlelerinin
  kaynak gösterilerek kullanımı alıntı sınırında kabul edildi. Bu bir hukuk
  görüşü **değil**; yarışma dışı yayında TÜBİTAK'tan izin istenmesi önerilir.
- **Keşif Kampüsü ile ilişki — gözlem, doğrulanmadı.** deneyap.org atölye
  listesinde "Gaziantep Keşif Kampüsü Deneyap Teknoloji Atölyesi" ve "Samsun
  Keşif Kampüsü Deneyap Teknoloji Atölyesi" adları geçiyor; yani Mihenk'teki
  "Keşif Kampüsü" de bir Deneyap atölyesi olabilir. Ürün kararı (Orchestrator,
  19.10): Deneyap **ayrı ders** olarak kalır, Keşif'in altına girmez. Gerekçe:
  kaynaklar farklı (Keşif = okulun kendi ders belgeleri, belge kilitli üretim;
  Deneyap = TÜBİTAK kitabı, belge kilidi yok).
- **`uygunluk` ürün kararıdır**, kural tabanlıdır, 298 kaydın her biri tek tek
  pedagojik incelemeden geçmedi (yalnız 2 düzeltme). Esat'ın gözden geçirmesine açıktır.
