# Deneyap Atölye Müfredatı — Kaynak, Yöntem, Doğrulama

> 19 Ekim 2026 · Mihenk Worker 3. Bu belge `public/mufredat/deneyap-*.json`
> dosyalarının **nereden geldiğini** ve **nasıl doğrulandığını** anlatır.
> Kural: **uydurma yok.** Her kazanım cümlesi aşağıdaki kitapların kendi kazanım
> bölümlerinden birebir alınmıştır; sayfası ve kitabın SHA-256 özeti kayıtlıdır.

## 1. Özet

| Kitap | Atölye | Dosya | Kazanım | yazılı | performans | süreç | Tur |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | Tasarım ve Üretim | `deneyap-tasarim-uretim.json` | 60 | 16 | 25 | 19 | 1 |
| 7 | Yazılım Teknolojileri | `deneyap-yazilim-teknolojileri.json` | 50 | 20 | 30 | 0 | 1 |
| 9 | Siber Güvenlik | `deneyap-siber-guvenlik.json` | 41 | 22 | 19 | 0 | 2 |
| 11 | Enerji Teknolojileri | `deneyap-enerji-teknolojileri.json` | 46 | 28 | 18 | 0 | 2 |
| 13 | Yapay Zekâ | `deneyap-yapay-zeka.json` | 66 | 25 | 41 | 0 | 1 |
| 16 | Mobil Uygulama | `deneyap-mobil-uygulama.json` | 48 | 24 | 24 | 0 | 2 |
| 18 | Çevrim İçi Yazılım Teknolojileri | `deneyap-cevrim-ici-yazilim.json` | 53 | 29 | 24 | 0 | 2 |
| 19 | Robotik ve Kodlama | `deneyap-robotik-kodlama.json` | 55 | 13 | 42 | 0 | 1 |
| 21 | Elektronik Programlama ve Nesnelerin İnterneti | `deneyap-epni.json` | 67 | 13 | 54 | 0 | 1 |
| 23 | İleri Robotik | `deneyap-ileri-robotik.json` | 27 | 6 | 21 | 0 | 2 |
| 25 | Havacılık ve Uzay | `deneyap-havacilik-uzay.json` | 61 | 34 | 27 | 0 | 2 |
| 27 | Malzeme Bilimi ve Nanoteknoloji | `deneyap-malzeme-nanoteknoloji.json` | 48 | 42 | 6 | 0 | 2 |
| | **Toplam — 12 atölye** | 12 dosya + `deneyap-index.json` | **622** | **272** | **331** | **19** | |

**622 kaydın hepsi alıntı, türetme 0.** On iki kitabın on ikisinde de her
haftanın, bölümün ya da etkinliğin başında açık bir kazanım listesi var
("KAZANIMLAR", "Haftanın Kazanımları", "Bölüm Kazanımları", "BÖLÜM
KAZANIMLARI", "Kazanımlar: K1…", Malzeme Bilimi'nde etkinlik tablosundaki
"Öğrenci Kazanımları"). Bu yüzden ünite hedeflerinden türetmeye gerek kalmadı.
Şemada `tur` alanı yine de var (`alinti` | `turetildi`), çünkü ileride
eklenecek bir kitapta kazanım bölümü olmayabilir.

- **Tur 1** (commit 9f7e304): öncelikli 5 atölye.
- **Tur 2** (commit a92c521…da1304f, her atölye ayrı commit): kalan 7 ortaokul atölyesi.
- **Eklenmeyen:** Robotik ve Kodlama'nın EV3 sürümü (#3) ve EPNİ'nin eski
  sürümü (#5). Orchestrator kararıyla atlandı: aynı atölyenin ikinci kitabı,
  katalog değeri düşük (bkz. §2).

**`deneyap-index.json`**: atölye adı → dosya, kitap no, ISBN, kazanım sayısı,
uygunluk dağılımı. Arayüz atölye listesini buradan okuyacak (Faz 2). Yeni
atölye eklemek = katalog JSON'u + indeksi yeniden üretmek; `app.js` değişmez.

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
betikle ayrı katalog yapılabilir. Tur 2'de Orchestrator bunları **atlama**
kararı verdi (aynı atölyenin ikinci kitabı, değeri düşük).

**Çevrim İçi Yazılım Teknolojileri (#18) ile Yazılım Teknolojileri (#7)** aynı
yazar ekibinin kitapları. 11 haftalık iskeletleri ve kazanımlarının bir kısmı
**birebir aynı** (ör. 2., 3., 7., 9., 10., 11. haftalar). İkisi Deneyap'ta ayrı
atölye olarak listelendiği için ayrı katalog yapıldı. Aynı cümle iki katalogda
farklı kodla (DNY.YT.… / DNY.CY.…) yer alıyor; bu bir çift kayıt hatası değil,
kaynaktaki durum.

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
| 9 | Siber Güvenlik (Ortaokul) | Doç. Dr. Çelebi Uluyol, Doç. Dr. Mehmet Demirci | 2022 | 2023 | (künyede yok) | 978-605-312-481-8 | 114 | `e6b21d8161dd87bc17fc45cba06dacd09977c9ac1d111d26b2e450b0d7d30835` |
| 11 | Enerji Teknolojileri (Ortaokul) | Prof. Dr. Bülent Oral, Prof. Dr. Şafak Sağlam | 2022 | 2023 | (künyede yok) | 978-605-312-496-2 | 110 | `1bb290b8117e39e65e31b113a57caa2593a53ff3c234b2065ebfe61314f48761` |
| 16 | Mobil Uygulama (Ortaokul) | Çağdaş Mollaoğlu | 2023 | 2023 | (künyede yok) | 978-605-312-530-3 | 88 | `514e8cf78f9f6617d7d031ece3c02266aaccae02d915aaf80925c1bc52a84614` |
| 18 | Çevrim İçi Yazılım Teknolojileri (Ortaokul) | Doç. Dr. Caner Özcan, Doç. Dr. Rafet Durgut, Dr. Öğr. Üyesi Sevil Orhan Özen, Sercan Özen | 2023 | 2023 | (künyede yok) | 978-605-312-532-7 | 259 | `1af36d6761a072e7a7d5dd278135656c579fccb96a0a88969120cbcaa8ab85b6` |
| 23 | İleri Robotik (Ortaokul) | Doç. Dr. Cüneyt Yılmaz, Dr. Öğr. Üyesi Mehmet Emin Aktan, Prof. Dr. Vasfi Emre Ömürlü, Arş. Gör. Mehmet İşcan | 2021 | 2024 | (künyede yok) | 978-605-312-545-7 | 119 | `73d1b3770b1598e62c6150205b1c5352b2e9c3c0589b453abf858087480e582c` |
| 25 | Havacılık ve Uzay (Ortaokul) | Dr. Öğr. Üyesi Rıfat Benveniste, Doç. Dr. Barış Gökçe, Prof. Dr. Hüseyin Akıllı | 2021 | 2024 | (künyede yok) | 978-605-312-550-1 | 224 | `089f9042c399b5c3fdea3b2a0a558fd90746992e07a8cb6b31ece7a12c133ffa` |
| 27 | Malzeme Bilimi ve Nanoteknoloji (Ortaokul) | Prof. Dr. Yunus Eren Kalay, Ar. Gör. Can Okuyucu, Ar. Gör. Doğuhan Sarıtürk | 2021 | 2024 | (künyede yok) | 978-605-312-607-2 | 307 | `1a44a7a6d419ca9da4d142a07757e1de4db189e497120412529a76c6b8504401` |
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
6. **Kod**: `DNY.<atölye>.<hafta/bölüm>.<sıra>` — TU, RK, EP, YZ, YT; tur 2'de
   SG, EN, MU, CY, IR, HU. Malzeme Bilimi'nde birim hafta değil **etkinlik**
   olduğu için kod kitabın etkinlik numarasını taşır: `DNY.MB.<etkinlik no>.<sıra>`
   (ör. `DNY.MB.3.1.2` = Etkinlik 3.1'in 2. kazanımı).
6b. **Tur 2'de çıkan biçim farkları** (`uret2.py`, iki mod):
   - *madde* modu: `●`, `•`, PUA işareti (U+F0B7), `1-`, `K1.` ve `• K1.` hepsi
     madde başı sayılır. Giriş satırları ("Bu bölümü tamamlayan bir öğrenci,")
     atlanır.
   - *cümle* modu: madde işareti olmayan listeler. `.` ile biten satır kaydı
     kapatır, noktasız biten bir parça kalırsa betik **durur**. Malzeme
     Bilimi'nin 39 etkinlik tablosu ve Havacılık s.60'taki ("Öğrenciler;"
     girişli) liste bu modla okundu.
   - Havacılık s.29'da bir maddenin altında "1- …", "2- …" alt maddeleri var.
     Her biri ayrı kazanım cümlesi olduğu için **ayrı kayıt** yapıldı
     (DNY.HU.2.3, 2.4). Üst madde ("…tahmin etmeleri istenir. …sınıflandırmaları
     beklenir.") iki cümlesiyle tek kayıttır, kitapta tek madde böyle.
   - Malzeme Bilimi'nde etkinlik 2.3=2.4 ve 9.1=9.2 kazanımları birebir aynı.
     Tekrar kuralıyla birer kez kaydedildi, ikinci etkinliğin sayfası
     `tekrarSayfalari`'nda. Bu yüzden 39 etkinlikten 37'si katalogda kendi
     grubuyla görünür.
   - Siber Güvenlik s.38 ve s.59'da maddeler virgülle bitiyor. Kitapta böyle,
     aynen korundu.
7. **Kapsam dışı bırakılan**: Tasarım ve Üretim kılavuzundaki "Tablo 1"
   (haftalık kazanımların özet tablosu; ders sayfalarıyla aynı içerik, birkaçı
   "İki/Üç boyutlu" diye birleştirilmiş) ve "Tablo 3 İlave etkinlikler" (isteğe
   bağlı etkinlikler, kazanım değil "kazanım ve amaçlar" karışık). Ders
   sayfalarındaki kazanım listeleri esas alındı.

Betikler (depoda değil, W2/tools sahipliğine girmemek için):
`C:\Users\ASUS\Downloads\deneyap-betikler\` → `indir.py`/`indir2.py`, `cikar.py`,
`uret.py` (tur 1), `uret2.py` (tur 2), `dogrula.py`, `indeks.py` (deneyap-index.json),
`kesif.py`/`dok.py` (yapı keşfi, yalnız okur).

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

Atölye başına dağılım §1'deki tabloda. Toplam: **yazılı 272 · performans 331 ·
süreç 19** (622).

Tur 2'de fiil listesine kitaplarda yeni çıkan bilgi fiilleri eklendi (sayar,
sıralar, özetler, sınıflar, sınıflandırır, bilgi sahibi olur, öğrenecektir,
öğrenilecektir, kavranacaktır). Tur 1'in 298 kaydında bu fiillerle biten kayıt
yoktu, yani ekleme tur 1 dağılımını değiştirmez. Tur 2'de elle düzeltme
**yapılmadı**.

Dağılım atölyeye göre çok değişiyor: Malzeme Bilimi 42/48 yazılı (kitap
kazanımları "…öğrenirler" diye yazılmış), İleri Robotik 6/27 yazılı (neredeyse
her kazanım bir kartı/motoru çalıştırmak). Bu, kuralın değil kitapların
farkıdır. Yine de fiil kuralı kabadır: "öğrenirler" bir bilgi kazanımını değil
bir etkinliği anlatıyor olabilir. Esat'ın gözden geçirmesine açıktır.

## 5. Doğrulama — "her kazanım sayfasına karşı ikinci kez"

Üç katman, üç ayrı araç:

| Katman | Araç | Ne ölçüldü | Sonuç |
|---|---|---|---|
| 1. Çıkarım | pymupdf | Kazanım bölümleri ayrıştırıldı | 298 kayıt |
| 2. İkinci okuma | **pypdf** (farklı okuyucu) | Her kaydın metni, kaydın `pdfSayfa`'sından pypdf ile yeniden çıkarılan metinde aranır | Birebir: **291/298**. Kalan 7'nin hepsi pypdf'in kelime içine koyduğu boşluk ("ele ktronik", "değerlendirm e", "“ antecedent"). Boşluktan bağımsız karşılaştırma: **298/298**, uyuşmazlık **0** |
| 3. Göz | sayfa görüntüsü (110 dpi) | Yazım hatası taşıyan 9 kayıt + boşluk farkı çıkan 4 EPNİ kaydı + her kitaptan en az bir sayfa: **13 sayfa** | 13/13 sayfada metin JSON'la aynı; yazım hataları **kitapta da var** |
| Bütünlük | sha256sum (üçüncü araç) | Diskteki PDF ↔ JSON künyesi | 5/5 eş |
| Biçim | Python `json` | UTF-8 çözülüyor, kod tekrarı yok | temiz |

**Tur 2 (7 atölye, 324 kayıt), aynı üç katman:**

| Katman | Sonuç |
|---|---|
| pypdf ikinci okuma | Birebir **319/324**. Kalan 5 (EN.8.1, EN.8.2, HU.2.7, IR.1.6, MB.3.1.3) yine yalnız boşluk farkı. Boşluktan bağımsız: **324/324**, uyuşmazlık 0 |
| Göz (105 dpi) | Yazım hatası şüphesi olan ve yapısı farklı **16 sayfa** (Havacılık 5, İleri Robotik 2, Enerji 2, Malzeme 3, Siber 2, Mobil 1, Çevrim İçi 1). Hepsinde metin JSON'la aynı |
| SHA-256 | 7/7 eş |

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
| DNY.HU.1.3 | "Hava **araçaların** uçuş esaslarını yorumlar." | ✓ s.16 (PDF 17) |
| DNY.HU.9.1 | "atmosferin **katmalarını** ve özelliklerini…" | ✓ s.173 (PDF 174) |
| DNY.HU.10.2 | "…yerleşimi ve **çalımasını** prensiplerini kavrar." | ✓ s.201 (PDF 202) |
| DNY.HU.10.5 | "Uydu haberleşme **usulleri** kavrar." | ✓ s.201 (PDF 202) |
| DNY.IR.3.5 | "**Öğrencileri** motor kontrol parametrelerinin…" | ✓ s.40 (PDF 42) |
| DNY.EN.4.3 | "…meydana gelen ısı **transferinin görür**." | ✓ s.29 (PDF 43) |
| DNY.MB.3.4.1 | "…irdelemeyi öğrenirler **.**" (noktadan önce boşluk) | ✓ s.109 (PDF 111) |
| DNY.MB.6.1.2 | "Aerojellerin termal özellikleri deneyle **irdilenecektir**." | ✓ s.179 (PDF 181) |

Görselle doğrulanmadığı için **not düşülmeyen** olası hatalar da var (ör.
EN.10.3–10.4 "biyogazı", MB.3.4.1 dışındaki boşluklar). Metin iki okuyucuda
aynı; yalnız "kitapta da böyle mi" sorusu gözle bakılmadı.

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
- **Ortaokul listesindeki 14 kitabın 12'si eklendi.** Eklenmeyen 2 kitap aynı
  atölyelerin ikinci sürümü (EV3 #3, eski EPNİ #5), Orchestrator kararıyla.
  Lise kitapları (14 adet) kapsam dışı, çünkü Mihenk 5–8. sınıf.
- **Arayüze henüz bağlı değil.** Kataloglar ve indeks depoda; `app.js`
  entegrasyonu (Faz 2) ayrı iş.
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
