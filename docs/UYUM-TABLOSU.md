# Mihenk — MEB Etik Kılavuzu ve AB YZ Yasası uyum tablosu

> **Öz değerlendirmedir, hukuki görüş değildir.** Takım BIES'in kendi ürününe
> bakışıdır. Bir okulda kullanmadan önce okulun yapay zekâ etiği ekibi ve
> hukuk birimi bakmalıdır. Hazırlanma tarihi: 7 Kasım 2026. Güncelleme: dal
> `entegrasyon-7kasim-e` (PROGRESS §130; §124–§129 birleşti). Canlı sürüm: Version `fcd867ef` (7 Kasım, PROGRESS §130).

## 0. Kaynaklar ve sayfa numaraları

| Kaynak | Ayrıntı |
|---|---|
| MEB, *Eğitimde Yapay Zekâ Uygulamaları Etik Kılavuzu*, Ankara 2026 | <https://ttkb.meb.gov.tr/meb_iys_dosyalar/2026_01/09152326_egitimdeyapayzekauygulamalari_etik_kilavuzu.pdf> — 7 Kasım 2026'da indirildi: 36 sayfa, SHA-256 `ba063f15…6630e03d45`. Kılavuzun duyurusu 10.01.2026 ([pilot kontrol listesi](./kvkk/pilot-ogretmen-kontrol-listesi.md) kaynakçası). |
| AB Yapay Zekâ Yasası (Tüzük 2024/1689) | Md. 13, 14, 26 ve Ek III. Metin <https://artificialintelligenceact.eu/> sayfalarından 7 Kasım 2026'da okundu. |

**Sayfa numarası kuralı.** Aşağıdaki "s." kılavuzun **kendi basılı sayfa
numarasıdır**. PDF okuyucunun gösterdiği numara bundan 1 fazladır (kapak
sayılır). Metin `pdftotext` ile çıkarılıp okundu:

| Bölüm | Basılı s. | PDF s. |
|---|---|---|
| Etik ilkeler girişi, Şekil 2 (8 ilke) | 8 | 9 |
| §2.1 İnsan merkezli · §2.2 Eşitlik ve kapsayıcılık | 9 | 10 |
| §2.3 Şeffaflık · §2.4 Mahremiyet ve veri | 10 | 11 |
| §2.5 Güvenilirlik · §2.6 Hesap verebilirlik ve insan denetimi | 11 | 12 |
| §2.7 Eğitsel değer · §2.8 Millî ve manevi değerler | 12 | 13 |
| §4.1 Öğretmen etik beyanı, YAZEK · §4.1.1 zorunlu durumlar | 22 | 23 |
| Tablo 1 (A–D satırları) | 23 | 24 |
| §4.1.2 Beyan formunun alanları | 24 | 25 |

İki düzeltme: fikir dosyasında (`fikir3-D-juri-kanit.md`) "itiraz mekanizması"
maddesi için s. 12 yazıyordu. Bu PDF sayfa numarasıdır; basılı numara **s. 11**.
Aynı dosyadaki "Rev. 0.8" sürüm bilgisi PDF metninde **bulunamadı**. Kapakta
yalnız "Ankara, 2026" yazıyor.

**Durum anahtarı:**
- ✓ **var**: kanıtı bağlantılı.
- ◐ **kısmen**: kanıt var ama maddenin tamamını karşılamıyor.
- ✗ **eksik**: üründe yok.
- ⧗ **geliştiriliyor**: başka bir dalda yapılıyor, bu tabanda yok.
- ○ **ürünün işi değil**: okulun ya da öğretmenin sorumluluğu. Ürün yalnız destekler.

---

## 1. MEB Kılavuzu, Bölüm 2: sekiz ilke ve alt maddeleri

### 2.1 İnsan Merkezli ve Hak Temelli Yaklaşım (s. 9)

| Alt madde (kısaltılmış) | Durum | Mihenk'teki kanıt |
|---|---|---|
| Öğrenci özerkliği ve tercih hakkı | ◐ | Öğrenci verisinin yapay zekâya gitmesi öğrenci başına kapatılabilir ("YZ: izin yok"). Yeni öğrenci "rıza bekleniyor" ile başlar (`yeniGercekOgrenci`, `yzIzinsizSonuc` — PROGRESS §88b, §107b; `test/kvkk-yz-izin.test.ts`). Kararı öğrenci değil öğretmen ya da veli verir. |
| Fiziksel, psikolojik ve sosyal zarar en aza | ◐ | Veli ekranında sınıf ortalaması ve sıralama yok (README §2). Sınav bütünlüğü sinyali veliye ancak öğretmen onaylarsa gider (`public/privacy-policy.html` "Sınav bütünlüğü verisi"). Zarar riski ölçülmedi. |
| Dijital esenlik: ekran süresi, bilişsel yük | ○ | Ürün bir ölçme aracıdır, öğrencinin ekran süresi sınavla sınırlıdır. Ayrıca ölçülmedi. |
| Öğrenciye zarar verebilecek yönlendirici karar üretilmemeli | ✓ | Yapay zekâ çıktısı nihai karar olamaz (`agents.md` §1). Öğrenciye yalnız öğretmenin onayladığı puan ve geri bildirim gider (§51; `ogrenmeCiktisiHesapla` `aiEvals` okumaz — §102, `test/ogrenme-ciktisi.test.ts`). |
| Katılım, geri bildirim ve ifade hakkı | ✓ | **Var (§126).** Öğrenci ya da veli yayınlanmış bir açık uçlu puan için "Yeniden incelensin" der (en çok 300 karakter gerekçe); talep öğretmenin Puanlama ekranındaki "İtirazlar" kuyruğuna düşer; karar ve açıklama Karar Günlüğü'ne ve CSV'nin itiraz sütununa yazılır (`test/itiraz.test.ts`). Sınır: tek cihaz, öğretmene bildirim gitmez (README §3 "Bedeli açık"). |
| Bireysel ihtiyaçlara uyarlanabilirlik | ◐ | Öğrenme çıktısı kartı kazanım bazında "Sıradaki adım" önerir; kurala dayalıdır, yapay zekâ kullanmaz (§102). |
| Eleştirel düşünme, yaratıcılık, problem çözme | ◐ | Soru istemi beceri temelli soru ister (bağlam → veri → görev). A/B ölçüldü: veri içeren soru %55 → %100 (README "Son değişiklikler", §48). Öğrenci üzerindeki etkisi ölçülmedi. |
| Sosyal-duygusal gelişim, insan etkileşimi | ○ | Ürünün kapsamı dışında. |

### 2.2 Eşitlik ve Kapsayıcılık (s. 9)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Ayrımcı veya ön yargılı sonuç üretilmemeli | ◐ | Puanlama kararı öğretmende. "YZ Puanlayıcı Denetimi" kartı YZ ile öğretmen arasındaki farkı ölçer: QWK, SMD, yanıt uzunluğu–fark ilişkisi (Spearman ρ), sıra kayması (§121, `yzDenetimOzeti`, `test/yz-denetim.test.ts`). **Öğrenci grupları (cinsiyet, okul, dil vb.) arasında yanlılık ölçülmedi**; Mihenk bu bilgileri zaten toplamıyor. |
| Dezavantajlı ve özel gereksinimli öğrencinin katılımı | ◐ | Erişilebilirlik cilası yapıldı: axe ile 52 ekran × açık/koyu tema taranıyor, ihlal 0; en küçük yazı 12 px; hareket azaltma desteği var (§115, `tools/erisilebilirlik-tara.mjs`, `test/erisilebilirlik.test.ts`). Ekran okuyucuyla (NVDA) dinlenmedi. |
| Kullanılan veri temsil edici ve ön yargısız | ○ / ✗ | Model eğitilmedi; hazır Llama modeli kullanılıyor (README "Sık sorulan iki soru"). Eğitim verisi Meta'nındır ve denetlenmedi. |
| Erişimi sınırlı öğrenci için çözüm | ◐ | Kâğıt sınav modu: sınav kâğıtta yapılır, sonuç sisteme girilir (§106, `test/kagit-sinav.test.ts`). |
| Farklı öğrenci gruplarında eşit performans | ✗ | Ölçülmedi. Sistem grup bilgisi tutmuyor. |
| Erişilebilirlik özellikleri (sesli okuma, basit arayüz) | ◐ | Ortak durum duyurusu (`role="status"`), görünür odak, klavyeyle kullanım (§115). Sesli okuma ürüne eklenmedi. |

### 2.3 Şeffaflık ve Açıklanabilirlik (s. 10)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Etkileşimin yapay zekâ ile olduğu açıkça bildirilmeli | ✓ | Üst çubuktaki model çipi o an yanıt verenin birincil model, yedek model, yerel simülasyon ya da örnek veri olduğunu yazar (README §3.1; §90 kaynak rozeti; `test/ai-rozet-tohum.test.ts`). Öğrenci ekranında "yapay zekâ bir puan önerir; kararı öğretmenin verir" yazar. |
| Kararın dayandığı veri ve ölçüt sade dille açıklanmalı | ✓ | Puan önerisi ölçüt bazında puan ve gerekçeyle gelir. Karnede "Puanın nereden geldiği" bölümü var (`public/app.js` karne bloğu, README §2). |
| **YZ çıktısı ile öğretmen katkısı ayırt edilebilir ve izlenebilir** | ✓ | Karnede üç ayrı cümle var: "Yapay zekâ bu puanı önerdi; öğretmenin yanıtını okuyup onayladı.", "Yapay zekâ N puan önermişti; öğretmen … olarak belirledi." ve "Bu puanı öğretmenin kendisi verdi" (`public/app.js` ~16045–16055). Karar Günlüğü her öneriyi ve kararı ayrı kayıt olarak tutar (§104, §107a, `test/karar-kaydi.test.ts`). Elle yazılan soru "✍ Elle yazıldı" rozetini taşır (§99). |
| Öğretmen kararın dayandığı veriye erişebilmeli | ✓ | Onay kartında öğrenci yanıtı, rubrik, ölçüt dökümü ve gerekçe yan yana durur (README ekran 02; §112 ölçüt düzeltme). |
| Halüsinasyon riski belirtilmeli; eleştirel sorgulama teşvik edilmeli | ✓ | Şüphe rozetleri: hesap tutmuyor, anahtar muhtemelen başka şık, bağımsız çözüm farklı ve diğerleri. Denetim yapılmadıysa "temiz" değil "denetlenmedi" yazar (README §11.2, ARASTIRMA §6.8). Kusurlu soruların ≈57/146'sı yine uyarısız geçer (`docs/olcum/PANO.md`). |
| Açıklamalar öğrenci, veli ve öğretmen düzeyinde anlaşılır | ◐ | Öğrenciye "sen", veliye "siz" dili (§102). "Veriniz nereye gider?" sayfası sade dille yazıldı (`public/veri-nereye-gider.html`, §110). Okunabilirlik kullanıcıyla sınanmadı. |

### 2.4 Mahremiyet, Gizlilik ve Veri Yönetişimi (s. 10)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Asgari veri, ölçülülük | ✓ | Öğrenci kaydı yalnız `{id, name, sinif, demo}`. Okul numarası ve okul adı yok (§88 denetim tablosu). Yapay zekâya giden gövdelerde öğrenci alanı yok (`test/kvkk-sunucu.test.ts`). |
| Güvenli altyapıda saklama | ◐ | Mihenk'in veritabanı yok; kayıtlar öğretmenin tarayıcısında tutulur (README §3, `veri-nereye-gider.html` §2). Ortak bilgisayarda bunu herkes görebilir; sayfada bu açıkça yazıyor. Tam yedek parolayla şifrelenir: PBKDF2 310.000 yineleme + AES-GCM (§108, `test/tam-yedek.test.ts`). |
| Öğrenci ve veli bilgilendirilmeli | ◐ | KVKK aydınlatma metni (`public/privacy-policy.html`), `veri-nereye-gider.html` ve veli rıza formu taslağı (`docs/kvkk/veli-riza-formu-taslak.md`) var. Rıza formları **taslak**; hukuk onayı yok. |
| Anonimleştirilmiş veya şifrelenmiş koruma | ◐ | Cevaptaki kayıtlı adlar gönderimden önce `[ÖĞRENCİ]` olarak maskelenir (`kisiselMaskele`, §88, `test/kvkk-ad-maske.test.ts`). Sınıf listesinde olmayan ad maskelenmez. Araştırma paketi beyaz listeyle anonimdir (§111). Tarayıcı deposu şifreli değildir. |
| Model eğitimi ve üçüncü tarafla paylaşmama | ◐ | Mihenk modeli eğitmez. Yapay zekâ çağrıları Cloudflare Workers AI'ya (ABD) gider; bu yurt dışına aktarımdır ve sayfada yazılıdır (`veri-nereye-gider.html` §1, §3). Cloudflare'in "eğitimde kullanmaz" beyanı onların beyanıdır, tarafımızdan doğrulanmadı. |
| Erişme, düzeltme, silme hakkı | ◐ | Veri öğretmenin cihazındadır. Silme: Sıfırla; Karar Günlüğü tek tuşla silinir (README §11.2). Öğrencinin kendi başvuru yolu ürün içinde yok; okulun KVKK süreci ile yürür. |
| Fotoğraf, ses, video için açık rıza | ○ | Toplanmaz. Ekran görüntüsü, kamera, mikrofon ve tuş kaydı yok (README §10). `Permissions-Policy` kamera ve mikrofonu kapatır (README §11.1). |

### 2.5 Güvenilirlik, Emniyet ve Teknik Sağlamlık (s. 11)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Standart senaryolarda doğru ve tutarlı çıktı | ◐ | Ölçüldü, **hedef tutmuyor**: ilk ölçümde kazanımdan üretilen 25 ÇSS'nin 8'inde anahtar yanlıştı. A5 ölçümünde kusurlu oranı ≈%37 (ARASTIRMA §6.2, §6.8; `npm run olcum:dogrula` 37/37). Etiketleyiciler yapay zekâ, insan uzman değil. Bu yüzden onay zorunlu. |
| Beklenmedik girdi ve teknik hataya dayanıklılık | ✓ | Zod şema doğrulaması, JSON onarımı, istek başına en çok 3 model çağrısı (§86, `test/guvenilirlik.test.ts`). Ağ hatası Türkçe mesaja çevrilir, sessiz yedek yok (§119). |
| Uygulama öncesi doğruluk ve güvenilirlik testi | ◐ | `npm test` 1072/1072 (52 dosya, 7 Kasım 2026). Model doğruluğu yalnız ön bulgu düzeyinde ölçüldü (yukarıda). Puanlama istemi A/B deneyi ön kayıtlıydı (§92). |
| Kesinti ya da hatada alternatif plan | ✓ | Otomatik yedek model (README §3.1). Kota dolunca yapay zekâsız mod: elle soru, elle puanlama ve analiz çalışmaya devam eder (§100, `test/kota-dayaniklilik.test.ts`). Kâğıt sınav modu da var (§106). |
| Uygunsuz ve yaşa aykırı içerik engellenmeli | ◐ | İstem "yaşa uygun ve tarafsız bağlam" ister (`src/lib/prompts.ts` ~317). Her soru insan onayından geçer. Ayrıca bir içerik filtresi yok; ölçülmedi. |
| Riskli çıktı öğretmen denetimiyle düzeltilmeli | ✓ | Soru onay kartında düzenlenir. Puan ölçüt ölçüt düzeltilir (§112). Enjeksiyon işaretli cevapta "Tek Tıkla Onayla" çizilmez (§103, `test/enjeksiyon-donem.test.ts`). |
| Siber güvenlik | ◐ | İstem enjeksiyonu savunması: 5 vektörde 5/5. Son ölçüm Ağustos 2026 (PROGRESS §5, §16; `tools/injection-test.py`); o tarihten sonra yeniden koşulmadı. Güvenlik başlıkları (CSP, `X-Frame-Options: DENY` vb.) canlıda doğrulandı (§118). **Kimlik doğrulama yok** (README §9). |

### 2.6 Hesap Verebilirlik ve İnsan Denetimi (s. 11)

| Alt madde | Durum | Kanıt |
|---|---|---|
| YZ katkısı açıkça belirtilmeli; nihai sorumluluk kullanıcıda | ✓ | 2.3'teki karne cümleleri. Fişteki ibare "Yapay zekâ önerisi öğretmen tarafından gözden geçirildi" yalnız gerçekten bir öneri varsa basılır (§122, `test/adsiz-puanlama.test.ts`). |
| Öneri nihai karar değildir, insan onayı gerekir | ✓ | `agents.md` §1 (değiştirilemez ilke). Soru `ai_generated` durumunda bekler; puan öğretmen onaylamadan öğrenciye gitmez (README §2; `soruyuOnayla`, `finalizeReview`). |
| Öğretmen YZ çıktısını düzeltebilmeli | ✓ | Soru düzenleme, anahtar değiştirme (§104), ölçüt bazında puan düzeltme (§112, `test/kriter-puan.test.ts`). |
| **Karar süreçleri kayıt altına alınmalı, geriye dönük denetlenebilmeli** | ✓ | Yapay Zekâ Karar Günlüğü: öneri, onay, red (red nedeni kodlu), anahtar değişimi, onaydan sonra düzenleme, havuza geri alma. CSV/JSON indirilir (§104, §104b, §107a; `test/karar-kaydi.test.ts`, `test/havuza-al-izi.test.ts`). Sınır: en çok 500 kayıt (`AUDIT_LIMIT`). Aşılırsa en eski kayıt düşer ve ekranda yazar. |
| İnsan denetimi olmadan otomatik karar yok | ✓ | Otomatik onay eşiği yasak (`agents.md` §1). §121 YZ denetim kartı ve §122 adsız puanlama bloklarında onay ya da yazma çağrısı olmadığı testle denetleniyor (`test/yz-denetim.test.ts`, `test/adsiz-puanlama.test.ts`). |
| **Öğrenci/veli için itiraz mekanizması** | ✓ | **Var (§126).** Akış: öğrenci ya da veli "yeniden incelensin" ister → öğretmenin kuyruğuna düşer → öğretmen karar verir (puan değişti / aynı kaldı, açıklamayla) → Karar Günlüğü'ne ve CSV'ye yazılır. Yapay zekâ yeniden çağrılmaz. Kâğıt sınav ya da başka cihazdan gelen talebi öğretmen elle ekler. "Adları gizle" açıkken kuyrukta da ad yerine "Yanıt N" görünür (§130). Tek cihazlı yapı nedeniyle itiraz sınıf içinde, öğretmenin cihazında kalır. |

### 2.7 Eğitsel Değer ve Nitelikli Katkı (s. 12)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Eğitsel hedeflerle doğrudan ilişki | ✓ | Her soru bir MEB öğrenme çıktısına bağlıdır. Katalogda 606 çıktı var, 606'sının da kaynak PDF'te olduğu doğrulandı (README "Neden farklı"). Kazanım hizalama denetimi ayrı bir çağrıyla yapılır. |
| Somut eğitsel katkı | ◐ | Madde analizi (p, d, çeldirici tablosu), KR-20/alfa, kazanım grafiği, öğrenme çıktısı kartı (§101, §102, §121). **Öğretmene zaman kazandırdığı ölçülmedi** ([IDDIA-KANIT.md](./IDDIA-KANIT.md)). |
| Anlamlı ve derin öğrenme | ○ | Ölçülmedi. |
| Üst düzey düşünme becerileri | ◐ | Bloom dengesi uyarısı ve beceri temelli istem (README §11.2, §48). Öğrenci düzeyinde etkisi ölçülmedi. |

### 2.8 Millî ve Manevi Değerlere Uyum (s. 12)

| Alt madde | Durum | Kanıt |
|---|---|---|
| Anayasa ve mevzuata aykırılık yok | ◐ | ÖDSGM'nin ortak sınav karşılaştırma yasağına uyuldu: ortak yazılı sınav şube karşılaştırmasına girmez (§119 madde 3, `test/meb-ortak-sinav.test.ts`). KVKK metinleri taslak. |
| Ayrıştırıcı, nefret söylemi içeren içerik yok | ◐ | İstem siyasi ve hassas içeriği yasaklar (`prompts.ts` ~317). Her soru insan onayından geçer. Filtre yok, ölçülmedi. |
| Dil ve kaynak kültürel hassasiyetlere saygılı | ◐ | Dil uyarısı yabancı alfabe ve aksan sızıntısını işaretler; tetikleyen sözcüğü gösterir (§84). Türkçe dışı içerik otomatik düzeltilmez, insana gösterilir. |
| Toplumsal etik normlar | ○ | İçerik uzmanı onayına bırakılır. |
| Aldatıcı yönlendirmeye karşı koruma | ✓ | Yedi istemin hepsinde her çağrıda değişen sınır belirteci ve güvenlik bloğu var (`src/lib/prompts.ts`, `test/prompts-guvenlik.test.ts`, `test/cozucu.test.ts`). İstemci tarafında enjeksiyon kalıbı işareti (§103). |
| Nezaket, saygı, akran nezaketi | ○ | Öğrenciler arası etkileşim yok. |

---

## 2. YAZEK etik beyanı (Bölüm 4)

**Beyan zorunlu mu? Evet, puanlama için.** Kılavuz §4.1.1 (s. 22): yapay zekâ
çıktısı öğrenci hakkında bir değerlendirme ya da not için kullanılıyorsa beyan
zorunludur. Tablo 1 (s. 23) Mihenk'in kullanımlarını şöyle karşılar:

| Mihenk kullanımı | Tablo 1 satırı | Beyan |
|---|---|---|
| Açık uçlu yanıta puan önerisi, öğrenciye geri bildirim taslağı | **C) Ölçme, Değerlendirme ve Karar Desteği**: "Öğrenci ürünlerinin değerlendirilmesi, puanlanması veya geri bildirim üretiminde YZ kullanımı" | **EVET** |
| Kavram yanılgısı analizi (sınıfın cevap metinleri) | **B) Öğrenci Verisinin İşlenmesi**: kılavuza göre "isimler gizlenmiş ve anonimleştirilmiş olsa dahi" beyan gerekir | **EVET** |
| Yalnız soru üretimi; öğrenci verisi gitmez | **Ç) Ders hazırlığı, materyal üretimi** | HAYIR. Kılavuz, materyalin doğruluğunun öğretmenin sorumluluğu olduğunu ayrıca hatırlatır. |
| Kazanım başarı yüzdesi, madde analizi (yapay zekâ kullanılmaz, tarayıcıda hesap) | B satırı "kazanım verilerinin işlenmesi (başarı yüzdesi…)" **YZ ile** yapılan işlemi kapsar | Mihenk bu hesabı yapay zekâyla yapmadığı için bu satıra girmediğini düşünüyoruz. Bu bizim yorumumuz, MEB'e sorulmadı. |

Tablo 1 C satırındaki uyarı: "Yapay zekâ sadece bir yardımcıdır; hiçbir koşulda
öğrenciye verilecek notu tek başına belirleyemez." Mihenk'teki karşılığı
`agents.md` §1'dir.

**Form alanları (§4.1.2, s. 24).** Kişisel bilgiler MEBBİS'ten otomatik gelir.
Okul adı, sınıf düzeyi, ders ve şube öğretmenin kendi durumudur. Kalanlar:
- **Uygulamanın kapsamı:** "ölçme ve değerlendirme".
- **Yapay zekâ aracı:** listede yoksa "diğer" → "Mihenk (Cloudflare Workers AI üzerinde Meta Llama 3.3 70B; yedek Llama 4 Scout)".
- **Açıklama:** aşağıdaki hazır metin.
- **Etik ilkelere uygunluk bildirimi:** öğretmen verir.

---

## 3. AB Yapay Zekâ Yasası: referans çerçevesi

> **Türkiye'de bağlayıcı değildir.** Türkiye AB üyesi değildir. Burada yalnız
> alandaki en ayrıntılı ölçüt olarak, kendimizi sınamak için kullanıldı.
> Ek III 3(b) yükümlülüklerinin ertelendiği bilgisi yalnız ikincil kaynakta
> geçiyor; **doğrulanamadı** (fikir3-D).

**Sınıf.** Ek III 3(b) "öğrenme çıktılarını değerlendirmek için kullanılması
amaçlanan" sistemleri yüksek riskli sayar. Mihenk'in puan önerisi bu tanıma
yakındır. Ek III 3(d) "sınav sırasında yasak davranışı izleme ve tespit"
sistemlerini sayar. Mihenk'in **sınav bütünlüğü kaydı** (sekme değişimi, odak
kaybı, yapıştırma) bu maddeyle ilişkili okunabilir. Kayıt puanı etkilemez ve
yalnız öğretmene bağlam olarak gösterilir. Md. 6(3)'teki muafiyetlerin
uygulanıp uygulanmadığını **değerlendirmedik**; hukuki görüş gerekir.

| Madde | İstenen (özet) | Mihenk | Durum |
|---|---|---|---|
| **13(1)–(2)** | Çıktı yorumlanabilir olmalı; sistemin kullanım talimatı olmalı | [SISTEM-KARTI.md](./SISTEM-KARTI.md) bu talimatın taslağıdır | ◐ |
| 13(3)(a) | Sağlayıcı kimliği, iletişim | README başlığı, `package.json` `author`/`bugs` | ✓ |
| 13(3)(b)(i)–(iii) | Amaç; doğruluk ve ölçütleri; öngörülebilir riskler ve kötüye kullanım | Sistem kartı §1–§2, §6. Doğruluk yalnız ön bulgu (PANO 37/37) | ◐ |
| 13(3)(b)(iv), (vii) | Çıktıyı açıklama; yorumlamaya yardım | Ölçüt dökümü, gerekçe, şüphe rozetleri, model çipi | ✓ |
| 13(3)(b)(v) | Belirli kişi ve gruplarda performans | Ölçülmedi | ✗ |
| 13(3)(b)(vi) | Girdi özellikleri, eğitim ve test verisi | Girdi: Sistem kartı §4. Eğitim verisi Meta'nın, bilinmiyor | ◐ |
| 13(3)(d) | İnsan denetimi önlemleri | Sistem kartı §5 | ✓ |
| 13(3)(e) | Kaynak ve bakım | Sistem kartı §8 (kota, maliyet) | ◐ |
| 13(3)(f) | Kayıt (log) mekanizmasının tarifi | Karar Günlüğü + Workers Logs `ai_call` kaydı (`agents.md` güncellik notu, §86) | ✓ |
| **14(4)(a)** | Sistemin kapasite ve sınırlarını anlama | Sistem kartı §6 "Bilinen sınırlar"; ekranda "denetlenmedi" etiketi | ◐ |
| 14(4)(b) | **Otomasyon yanlılığının** farkında olma | Şüpheli soruda ikinci onay; Enter ile onaylanmaz (README "İkinci tur"). Ölçüt düzeltilince Tek Tık kapanır (§112, §113). YZ Puanlayıcı Denetimi kartı (§121). Uyum raporunda "aynen kabul" oranı görünür; sıfır değişiklik biçimsel onay uyarısıdır (README §11.2). | ✓ |
| 14(4)(c) | Çıktıyı doğru yorumlama | Güven rozeti, ölçüt dökümü, kaynak rozeti | ✓ |
| 14(4)(d) | Çıktıyı kullanmama, yok sayma, **tersine çevirme** | Red (nedenli), puanı değiştirme, elle puanlama, YZ izni kapatma | ✓ |
| 14(4)(e) | Müdahale, "dur" düğmesi | Öğrenci başına YZ izni; kota dolunca yapay zekâsız mod. Tüm yapay zekâyı kapatan **tek bir kullanıcı düğmesi yok** | ◐ |
| **26(1)–(2)** | Kullanıcı kurum talimata uygun kullanır; denetimi yetkin kişiye verir | Okulun işi. Mihenk: [pilot kontrol listesi](./kvkk/pilot-ogretmen-kontrol-listesi.md), öğretmen onam taslağı | ○ |
| 26(4) | Girdi verisi amaca uygun | Kaynak metin 6.000 karakter sınırı, kısa metin uyarısı (README "İkinci tur") | ◐ |
| 26(5) | İzleme, riski bildirme | YZ Puanlayıcı Denetimi, A7 uyum raporu. Sağlayıcıya bildirim kanalı: GitHub issues (`package.json` `bugs`) | ◐ |
| 26(6) | Kayıtları **en az 6 ay** saklama | Karar Günlüğü tarayıcıda, en çok 500 kayıt; süreye bağlı saklama yok. CSV/JSON ile dışa aktarılıp okulda saklanabilir. Kapasite yetmeyebilir | ◐ |
| 26(11) | Karara konu kişiyi bilgilendirme | Öğrenci ekranı ve karne "yapay zekâ önerdi, öğretmen onayladı" der; `veri-nereye-gider.html`; veli rıza formu taslağı | ✓ |

---

## 4. Eksikler ve plan (gizlenmeden)

1. **İtiraz mekanizması** (MEB §2.6 son madde): ✓ §126 ile var, sınıf içi (tek cihaz). Uzaktan başvuru yolu ve öğretmene bildirim yok.
2. **Grup bazında performans ve yanlılık** (MEB §2.2, AB 13(3)(b)(v)): ölçülmedi. Mihenk grup bilgisi toplamıyor; ölçmek için pilotta ayrı bir çalışma tasarlanmalı.
3. **İnsan uzmanın doğruluk ölçümü**: etiketleyicilerin hepsi yapay zekâ. Kör etiketleme aracı hazır (`tools/etiket/`, §109); insan etiketi henüz yok.
4. **6 aylık kayıt saklama** (AB 26(6), referans): ürün içinde yok; dışa aktarım ve okulda saklama ile karşılanabilir.
5. **Tek "yapay zekâyı kapat" düğmesi** (AB 14(4)(e), referans): yok.
6. **Öğretmene etkisi** (zaman kazancı): ölçülmedi; bkz. [IDDIA-KANIT.md](./IDDIA-KANIT.md).
7. Rıza ve onam metinleri **taslak**; hukuk onayı yok.

---

## 5. YAZEK "Açıklama" alanı için hazır metin

> Öğretmen kendi okulu, dersi ve şubesine göre köşeli parantezleri doldurur.
> Formdaki karakter sınırı **doğrulanamadı** (YAZEK'e erişimimiz yok). Aşağıdaki
> metin yaklaşık 1.150 karakterdir. Sınır daha kısaysa ilk iki cümle yeter.

```text
[Ders] dersinde [sınıf/şube] öğrencilerinin yazılı sınav ve kısa sınavlarında Mihenk adlı ölçme-değerlendirme aracı kullanılacaktır. Yapay zekâ (Cloudflare Workers AI üzerinde Meta Llama 3.3 70B; yedek Llama 4 Scout) yalnız ÖNERİ üretir: MEB öğrenme çıktısına bağlı soru taslağı ve açık uçlu cevaplar için rubriğe göre puan ve geri bildirim önerisi. Hiçbir soru öğretmen onayı olmadan sınava girmez. Hiçbir puan öğretmen okuyup onaylamadan öğrenciye ve veliye ulaşmaz; öğretmen her öneriyi değiştirebilir ya da reddedebilir. Öğrenci karnesinde puanın yapay zekâ önerisi mi, öğretmen kararı mı olduğu ayrıca yazar. Her öneri ve karar zaman damgasıyla Karar Günlüğü'ne kaydedilir ve okulda saklanmak üzere dışa aktarılabilir. Öğrenci adı, numarası ve okul bilgisi yapay zekâya gönderilmez; cevap metnindeki kayıtlı adlar gönderimden önce maskelenir. Cevap metinleri yurt dışındaki (ABD) yapay zekâ hizmetine iletilir; velisi rıza vermeyen öğrencinin cevabı gönderilmez ve öğretmen tarafından elle puanlanır. Kayıtlar okul bilgisayarının tarayıcısında tutulur; ürünün sunucuda veritabanı yoktur. Puana itiraz Mihenk'teki "Yeniden incelensin" düğmesiyle ya da [okulun mevcut itiraz yolu] ile öğretmene yapılır; karar Karar Günlüğü'ne yazılır.
```

Son cümle §130'da güncellendi: ürün içi itiraz (§126) var, ama tek cihazda çalıştığı
için okulun kendi itiraz yolu da açık tutulur (§4 madde 1).
