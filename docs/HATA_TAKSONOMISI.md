# Hata Taksonomisi — sürüm 0.2.1 (20 Ekim 2026)

> **v0.2.1:** denetim hatalarını sayan ilk ölçüm kodu (`DEN-YP-SIKIFADE`) eklendi; ayrıntı en altta.

> **v0.2:** ilk gerçek ölçümden sonra iki kod eklendi, üç satıra ölçülmüş
> sınır yazıldı. Ayrıntı en altta, "v0.1 → v0.2 değişiklikleri". İlk ölçüm
> v0.1 ile yapıldı.

> Bu liste, Mihenk geliştirilirken modelin (aksi yazılmadıkça Workers AI
> `llama-3.3-70b-instruct-fp8-fast`) ürettiği ölçme-değerlendirme içeriğinde
> **gerçekten gözlenen** hata türlerini kodlar. Her kodun yanında gözlendiği
> PROGRESS.md bölümü verilmiştir. Gözlenmemiş, yalnızca akla gelen türler
> listeye girmez; girdiklerinde "gözlenmedi" diye işaretlenir.
>
> Bağlam ve yöntem: [ARASTIRMA.md](./ARASTIRMA.md) §4.
> Kodlar ölçüm betiğinde ve CSV sütunlarında **aynen** kullanılır; bir kod
> değişirse sürüm numarası artar.

## Sütunların anlamı

- **Denetim:** üretim hattında bugün çalışan deterministik denetim
  (`src/lib/guards.ts` fonksiyonu, ya da `src/routes/ai.ts` içindeki
  kural). "—" yoksa denetim yoktur.
- **Davranış:** `ele` = soru kullanıcıya dönmez ve sayısı `meta` ile
  bildirilir · `bayrak` = soru döner ve İçerik Uzmanına uyarı gösterilir ·
  `düzelt` = sunucu deterministik olarak normalleştirir · `zorla` = bir alan
  güvenli yöne zorlanır.
- **Ölçüm:** `oto` = betik, elle bakmadan sayabilir · `yarı` = betik aday
  işaretler, karar elle verilir · `elle` = yalnızca insan etiketleyebilir.

---

## A. Cevap anahtarı

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `ANH-OLGU` | Anahtar şıklar arasında var ama **yanlış şıkkı** gösteriyor (olgusal ya da işlem hatası) | "2 saatte 40 km → 5 saatte?" doğrusu 100 km, işaretli 120 km (§48.5) · F = μ·m·g doğrusu 3000 N, işaretli 300 N (§48b.2) | *(20 Ekim, ölçülmedi)* A1 `POST /api/ai/solve` → `anahtarUyusmazligi`; sayısal ÇSS'de A2 `hesapDenetimi` → `hesapUyusmazligi`, `hesapBaskaSik` | bayrak (öğretmen rozeti) | elle (denetimin isabeti A5'te ölçülecek) |
| `ANH-BIRIM` | `ANH-OLGU`'nun alt türü: **birim dönüşümü** hatası | "1 kg su kaç cL?" işaretli 1000 cL, doğrusu 100 cL; eski istemle 0/2 doğru, yeni istemle 4/4 (§46.2) | İstem kuralı; *(20 Ekim, ölçülmedi)* A2 `hesapDenetimi` modelin yazdığı "hesap" ifadesiyle (birim dönüşümünü ancak ifadeye yazılırsa görür) | bayrak | elle |
| `ANH-YOK` *(v0.2)* | Anahtar bir şıkkı gösteriyor ama **doğru cevap hiçbir şıkta yok**; hangi şık seçilirse seçilsin soru yanlıştır | İlk ölçümde yanlış anahtarlı ÇSS'lerin A'da 8'inin 4'ü, B'de 5'inin 3'ü (OZET §2, PROGRESS §54) | *(20 Ekim, ölçülmedi)* A1 `anahtarUyusmazligi`; sayısal sorularda A2 `hesapBaskaSik` boş kalır, `hesapUyusmazligi` kalkar | bayrak | elle |
| `ANH-GECERSIZ` | Anahtar şıklardan hiçbirini göstermiyor (`'E'`, `''`, `'AB'`…) | Kod okunarak bulundu: beş geçersiz değerin beşi de sessizce "A" oluyordu (§41) | `cevapAnahtariGecerliMi` → `anahtarBelirsiz` | bayrak | oto |

## B. Çeldirici ve gerekçe

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `GRK-KALIP` | Gerekçe kalıp özneyle başlıyor ("bu şıkkı seçen öğrenci…") | İstem düzeltmesinden sonra 24/24 kalıplı; sunucu temizliğinden sonra 0/24 (§47.3, §47.5) · ilk gerçek Deneyap üretiminde 6/6 (19 Ekim, tek üretim, §51b.9) | `gerekceyiSadelestir` / `gerekceleriSadelestir`; sayaç `meta.sadelestirilenGerekce` / `meta.toplamGerekce` (§51b.5) | düzelt | oto (sunucu sayacı ham davranışı sayar) |
| `GRK-TEKRAR` | İki çeldiricinin gerekçesi **birebir aynı** | B ve D: "İklimi belirleyen faktörlerin sadece bir kısmını dikkate almaktadır." (§47b) | `gerekceTekrariVarMi` → `gerekceTekrari` | bayrak | oto |
| `GRK-GENEL` | Gerekçe şıkkın içeriğine değil genel geçer bir hataya işaret ediyor | "Yanlış bir oranlama yapıyor" (§47.6) | — (eşik kalibre edilmedi, bilerek eklenmedi) | — | elle |
| `GRK-TUTARSIZ` | Gerekçe şıkla çelişiyor ya da doğru şıkkı yanlış diye niteliyor | 1 kg su sorusunda doğru olan 100 cL şıkkı için "çok düşük" gerekçesi (§46.2) · "gerekçeler tutarsız" (§48b.2 aday 4) | — | — | elle |
| `SIK-SACMA` | Hiçbir öğrencinin seçmeyeceği çeldirici | Model karşılaştırmasında "saçma çeldirici" sütunu (§27i). Tarama önerildi, **uygulanmadı** (§27) | — | — | elle |
| `SIK-SAYI` | Çoktan seçmeli soruda 3'ten az şık | Kod okunarak; `elenenGecersiz > 0` yolu uçtan uca **gözlenemedi** (§44.2) | `routes/ai.ts`: `opts.length < 3` → `meta.elenenGecersiz` | ele | oto |
| `SIK-ESANLAM` | İki şık aynı anlama geliyor, birbirinin üst/alt kavramı, ya da birden fazla şık savunulabilir | İlk gözlem 19 Ekim, Deneyap DNY.YZ.1.1: iki sorunun şıkları birbirinin üst/alt kavramıydı (makine öğrenimi / derin öğrenme / yapay sinir ağları), tek doğru cevap tartışmalı (§51b.9) · ilk ölçümde MEB'de A 2/25, B 0/26; ör. 3-4-5, 5-12-13 ve 6-8-10 üçgenlerinin üçü de dik (OZET §2) | — | — | elle |

## C. Tekrar

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `TKR-GOVDE` | Gövde başka bir soruyla anlamca aynı (yeniden yazılmış) | "27 soruda 15 benzer çift" (§41) | `benzerlik` ≥ `BENZERLIK_ESIGI` (0,30; 11 çiftle kalibre) → `meta.elenenTekrar`. **Yan etki (v0.2):** türe bakmaz; açık uçlu soruyu bir ÇSS'nin tekrarı sayıp eleyebilir. İlk ölçümde "açık uçlu istendi, hiç dönmedi": MEB A 1/13, B 2/13; Deneyap 3/5 ve 3/5 çağrı (OZET §5.1). **20 Ekim (A4, ölçülmedi):** aynı turda benzerlik yalnız aynı tür içinde aranıyor; önceki turlarla kıyas değişmedi | ele | oto (eşiğin doğruluğu: yarı) |
| `TKR-SIK` | Gövdeler farklı, **şık kümesi birebir aynı** | FB.8.1.2'de 1. ve 3. soru (§46.1) | `sikImzasi` → `meta.elenenAyniSik` (yalnızca aynı tur içinde) | ele | oto |

## D. Dil

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `DIL-ALFABE` | Türkçe metinde Latin dışı, Latin Extended Additional ya da (Türkçe ğ ı İ ş hariç) Latin Extended-A karakter | "açıkla**йте**", 10 soruda 1 (§20) · "durumlar**下的**" (§45.2) · "ph**ứ**cekli" önce kaçtı, sonra aralık eklendi (§48.4) · `重要` (§48.5) · "t**ă**ngdı" (U+0103) önce kaçtı, Latin Extended-A eklendi; 1.228 kazanımda yanlış alarm 0 (§51b.6) | `yabanciAlfabeVarMi` · `soruDilUyarisi` (soru) · `metinDilUyarisi` (değerlendirme) → `dilUyarisi` | bayrak | oto |
| `DIL-LATIN` | Türkçe cümlede Latin harfli yabancı kelime ya da Latin-1'deki yabancı harf (é, ñ, ã, ß) | "**necessary**" (§48b.2 aday 3, §48b.3) | — (bilerek açık: bu harfler Türkçenin ç ö ü â î û harfleriyle aynı blokta; sözlük yanlış pozitif üretir, §51b.6) | — | elle |

## E. Gövde ve soru niteliği

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `GVD-KISA` | Beceri temelli hedefin (40-110 kelime) altında kalan gövde | 40+ kelime: yerelde 0/9, canlıda 2/5 (§48.3, §48.8) | — (eşik ölçülmeden konmaz, §48.7) | — | oto (kelime sayısı) |
| `GVD-KALIP` | Klasik hatırlatma kalıbı ("… nedir?", "Aşağıdakilerden hangisi …") | Eski istemde 1, yeni istemde 0 (§48.3) · eski demo tohumu (§48b.2) | — (yalnızca istem yasağı) | — | yarı (kalıp listesi + elle kontrol) |
| `GVD-TEKADIM` | Tek adımlı, akıl yürütme gerektirmeyen soru | §48b.2 aday 2 | — | — | elle |
| `GVD-YINELEME` | Soru cümlesi gövde içinde iki kez tekrarlanıyor | §48b.2 aday 2 | — | — | yarı |
| `GVD-VERIFAZLA` | Görevle ilgisiz, gereksiz veri | §48b.2 aday 4 | — | — | elle |
| `GVD-KOKYOK` *(v0.2)* | Soru kökü yok: yalnız bağlam ve şıklar var, öğrenciden ne istendiği yazmıyor | İlk ölçümde "belirsiz" anahtarın dört durumundan biri; ayrı sayılmadı (OZET §2) | — | — | elle |

## F. Müfredat hizalaması

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `KZN-DISI` | Soru seçilen kazanımı ölçmüyor | Hız-zaman (§48b.2 aday 2), iş/Joule (aday 4) FEN.7.1.2 için. Model tabanlı denetim isteğe bağlı: "Türkiye'nin başkenti" sorusunu "ölçmüyor" işaretledi (§16, §19d) | `/api/ai/outcome-alignment` (model tabanlı, **deterministik değil**, üretim hattında otomatik çalışmaz) | — | elle (model denetiminin isabeti ayrıca ölçülecek) |
| `SNF-DISI` | Soru sınıf düzeyinin üstünde ya da altında | Sürtünme katsayısı (μ), 7. sınıf kapsamı dışı (§48b.2 aday 1) | — | — | elle |

## G. Kaynak metne atıf

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `KYN-ATIF` | Gövde metne atıf yapıyor ("metinde", "yukarıdaki"…) ama `needsSource` false geliyor; öğrenci metni görmeden cevaplayamaz | Tasarım gereği: model alanı unutabiliyor (`guards.ts` notu). Demo tohumunda kaçınıldı (§48b.2) | `kaynakGerektirirMi` (`KAYNAK_ATIF` deseni); kazanım modunda `needsSource` false'a sabitlenir. **Kapsam sınırı (v0.2):** grafik/tablo atfı desende yok, gösterilmeyen grafiğe atıf (B, DNY.RK.4.7) kaçtı; kazanım modunda öğrencinin kendi yazacağı metne atıf 5/5 yanlış pozitif verdi (OZET §5.2) | zorla | oto |

## H. Açık uçlu değerlendirme (rubrik puanı)

| Kod | Tanım | Gerçek örnek (PROGRESS) | Denetim | Davranış | Ölçüm |
|---|---|---|---|---|---|
| `DEG-INJ` | Öğrenci cevabındaki talimat puanı etkiliyor | İlk sürümde otorite taklidi 20/20 aldı; düzeltmeden sonra 5/5 vektör savunuldu (§10e, §19d) | Rastgele sınır belirteci + istemde güvenlik bloğu; model `injectionAttempt` bayrağını öğretmene gösterir | bayrak (model tabanlı; yedek modelde 4'te 1 kaçtı, §16) | oto (`tools/injection-test.py`) |
| `DEG-BOSGEREKCE` | İçi boş gerekçe ("Mükemmel", "Tam puan") | Injection vakasında tüm gerekçeler "Mükemmel" (§10e) | — (yalnızca istem kuralı 4) | — | elle |
| `DEG-FARK` | Yapay zekâ puanı ile öğretmenin nihai puanı arasındaki fark | Karar Günlüğü bu farkı kaydeder (§21); sahada ölçülmedi | — (tanım gereği insan kararı) | — | oto (pilotta Karar Günlüğü'nden) |

---

## Ölçüm betiği için özet

**Betiğin `guards.ts` ile otomatik sayabileceği kodlar:**
`ANH-GECERSIZ`, `GRK-KALIP` (ham çıktıda), `GRK-TEKRAR`, `SIK-SAYI`,
`TKR-GOVDE`, `TKR-SIK`, `DIL-ALFABE`, `KYN-ATIF`, `GVD-KISA` (yalnızca
kelime sayısı; eşik raporlanır, eleme yapılmaz), `DEG-INJ`.

**Elle etiketlenecek kodlar:** `ANH-OLGU`, `ANH-YOK`, `ANH-BIRIM`, `GRK-GENEL`,
`GRK-TUTARSIZ`, `SIK-SACMA`, `SIK-ESANLAM`, `DIL-LATIN`, `GVD-TEKADIM`,
`GVD-VERIFAZLA`, `GVD-KOKYOK`, `KZN-DISI`, `SNF-DISI`, `DEG-BOSGEREKCE`. Bunlar için
otomatik bir oran **yazılmaz**.

**Yarı otomatik kodlar** (betik aday işaretler, karar elle verilir):
`GVD-KALIP`, `GVD-YINELEME`.

**Pilotta ölçülecek kod:** `DEG-FARK` (Karar Günlüğü'nden, öğretmen kararı
gerektirir).

Toplam: 10 otomatik + 14 elle + 2 yarı otomatik + 1 pilot = **27 kod** (v0.1'de 25).

Bu ayrım araştırma sorusunun ikinci yarısına doğrudan cevap verir. Elle
etiketlenen türlerin hiçbirinde bugün deterministik denetim yok. Bu
türleri yakalayan tek katman insan onayıdır (`agents.md` §1).

---

## v0.1 → v0.2 değişiklikleri (19 Ekim 2026)

İlk gerçek ölçüm v0.1 kodlarıyla **aynen** yapıldı ([ARASTIRMA §6](./ARASTIRMA.md),
[`docs/olcum/OZET.md`](./olcum/OZET.md), PROGRESS §54). v0.2, o ölçümde
görülen eksiklikleri işler. v0.1 ile etiketlenmiş veri geçersiz olmaz:
`ANH-YOK` vakaları v0.1'de `ANH-OLGU`, `GVD-KOKYOK` vakaları "belirsiz
anahtar" içinde sayılmıştı.

| Değişiklik | Gerekçe (ölçülen) | Kaynak |
|---|---|---|
| **Yeni kod `ANH-YOK`:** doğru cevap hiçbir şıkta yok (`ANH-OLGU`'dan ayrıldı) | Yanlış anahtarlı ÇSS'lerin A'da 8'inin 4'ünde, B'de 5'inin 3'ünde doğru cevap şıklarda yoktu | OZET §2 · PROGRESS §54 |
| **Yeni kod `GVD-KOKYOK`:** soru kökü yok (yalnız bağlam + şıklar) | "Belirsiz" anahtarın dört durumundan biri olarak görüldü; ayrı sayılmadı | OZET §2 ("Belirsiz"in tanımı) |
| `TKR-GOVDE` satırına **yan etki** eklendi: türe bakmadığı için açık uçlu soruyu bir ÇSS'nin tekrarı sayıp eleyebiliyor | "Açık uçlu istendi, hiç dönmedi": MEB A 1/13, B 2/13; Deneyap 3/5 ve 3/5 çağrı. Kod değiştirilmedi | OZET §5.1 |
| `KYN-ATIF` satırına **kapsam sınırı** eklendi: grafik/tablo atfı desende yok; kazanım modunda öğrencinin kendi yazacağı metne atıf yanlış pozitif | Gösterilmeyen grafiğe atıf (B, DNY.RK.4.7) kaçtı; 5/5 eşleşme yanlış pozitifti | OZET §5.2 |
| `SIK-ESANLAM` satırına ölçüm eklendi | MEB'de A 2/25, B 0/26 | OZET §2 |
| Not: `GVD-KALIP` ve `GVD-YINELEME` için betiğin aday işaretleyicisi zayıf | Elle 9 yineleme bulundu, aday işaretleyici 0 buldu; elle sayılar esas alındı | OZET §7 |

Kod sayısı 25 → **27**. Sütun tanımları ve diğer 23 kod değişmedi.

---

## Denetim güncellemesi (20 Ekim 2026) — yazıldı, henüz ölçülmedi

Kod sayısı değişmedi (27). Yukarıdaki satırlara yeni denetimler işlendi;
ayrıntı ve bedeller [ARASTIRMA §4.5](./ARASTIRMA.md).

- **A1 bağımsız çözüm** (`POST /api/ai/solve`) → `ANH-OLGU`, `ANH-YOK`.
- **A2 sayısal hesap** (`hesapDenetimi`) → `ANH-OLGU`, `ANH-BIRIM`, `ANH-YOK`;
  yalnız modelin "hesap" ifadesi yazdığı sayısal ÇSS'lerde.
- **A3 uzun şık** (`uzunSikIpucu`): taksonomide karşılık gelen kod yok; yalnız
  ölçüm alanı, rozet yok, eşik 1,5 kalibre değil (N=11).
- **A4 tür içi tekrar** → `TKR-GOVDE` yan etkisi.

Bu denetimler "elle" sütununu değiştirmez: yakalama ve yanlış alarm oranları
ölçülene kadar bu kodlar elle etiketlenmeye devam eder.

---

## v0.2.1 — denetim yanlış pozitifi kodu (20 Ekim 2026)

Bu bölümdeki kodlar **modelin değil denetimin** hatasını sayar. Model hata
kodlarıyla (27) karıştırılmaz; denetimin kesinliğini ölçmek için kullanılır.

| Kod | Tanım | Gerçek örnek | Denetim | Ölçüm |
|---|---|---|---|---|
| `DEN-YP-SIKIFADE` | A2 sayısal hesap denetimi, **doğru** anahtarlı bir soruda "hesap tutmuyor" der, çünkü şık metni kendisi bir işlem ifadesidir ve ayrıştırıcı şıktaki ilk sayıyı alır | A5, W4 yarısı: K113 `40 km * 5 saat / 2 saat`, K175 `2 * (30 + 10)`. Şık metni işlem ifadesi olan 16 doğru maddeden 2'si ([ASAMA2-W4](./olcum/a5/ASAMA2-W4.md) §3) | A2 `hesapDenetimi` | elle (eşleme açıldıktan sonra) |

Aynı ölçümde tek vakayla görülen ve **koda alınmayan** bir yanlış pozitif
daha var: yaklaşık değer (hesap 1515, şık 1500; K069). Bir vaka daha
görülürse ayrı kod olarak değerlendirilir.
