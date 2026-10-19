# Mihenk ölçümü — ilk gerçek koşum (19 Ekim 2026) · ÖN BULGU

> **Bu bir ön bulgudur.** Model başına yalnızca 18 kazanım ve tek bir koşum var
> (sıcaklık 0,5). Cevap anahtarı kontrolünü **bir YZ asistanı (Claude) yaptı,
> insan alan uzmanı değil**. Kontrolün kendisi de yanılabilir. Kör yapılan ikinci
> kontrol de bir YZ'ye ait; uyuşma 32/37, κ = 0,79 (§6). Eşik, otomatik onay ya
> da kalibre edilmemiş sabit **eklenmedi**.

Araştırma sorusu: *Türkçe LLM'ler MEB/Deneyap öğrenme çıktılarına göre
ölçme-değerlendirme içeriği üretirken hangi hataları ne sıklıkla yapıyor;
otomatik denetim + insan onayı bunları ne ölçüde azaltıyor?*

## 1. Ne, nasıl ölçüldü

| | |
|---|---|
| Uç | `POST /api/ai/generate-questions`, `mode: "kazanim"` (kaynak metin yok, en zor koşul, bkz. PROGRESS §46.2) |
| Set | [`tools/olcum/set-v1.1.json`](../../tools/olcum/set-v1.1.json): 13 MEB kazanımı (Mat/Fen/Türkçe, 5-8. sınıf) + 5 Deneyap kazanımı (5 atölye, `uygunluk: yazili`). Kazanım başına **2 ÇSS + 1 açık uçlu** istenir |
| Model A | `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, ürünün canlıdaki ayarı (yedek açık; hiçbir çağrı yedeğe düşmedi) |
| Model B | `@cf/meta/llama-4-scout-17b-16e-instruct`, **yedek KAPALI** (`--var AI_FALLBACK_PROVIDER:`), yani sonuç saf B modelidir |
| Sunucu kodu | MEB satırları: src **fc1750c** (`src_ozet d384c3177df2`; çalışma ağacında yalnız satır sonu farkı vardı, içerik fc1750c ile aynı). Deneyap + "MEB sayaç" satırları: **e35628f** (W2'nin `kaynakTuru` ve gerekçe sayacı). İkincisi yalıtılmış bir `git worktree`'den servis edildi |
| Betik | [`tools/olcum/olc.mjs`](../../tools/olcum/olc.mjs) (sunucunun `guards.ts`'ini doğrudan içe aktarır), [`ozet.mjs`](../../tools/olcum/ozet.mjs). Ölçüm commit'leri `f61a628` → `549efad` → `7da4398` |
| Ham veri | Her çağrının istek + yanıtı `ham/<koşum>/<kazanım>.json`, satır düzeyi `*.csv` |
| Ayrıntılı tablolar | [`OZET-gercek.md`](./OZET-gercek.md) (betik çıktısı) · [`OZET-on-kosum.md`](./OZET-on-kosum.md) |

**Çağrı sayısı ve süre.** Gerçek koşum: model başına 13 MEB + 5 Deneyap + 3 MEB
sayaç çağrısı, toplam **42 başarılı çağrı**. Ayrıca **8 ortam hatası** oldu
(`wrangler dev` dosya değişince yeniden yüklendi, istek 503 ile düştü). Bunlar
model hatası sayılmadı, her biri yeniden koşuldu. **Model hatası: 0.** Ön koşum
(set-v1, 12 kazanım): 24 + 5 tekrar çağrısı. B'de **1 gerçek model hatası**
çıktı (T.Y.5.15, iki denemede de geçersiz JSON → 502), kayıtlıdır. Başarılı
çağrı süresi (MEB): A ort 26,9 sn / medyan 15,8 sn · B ort 27,2 / medyan 25,4 sn.

## 2. Ana tablo — model × hata kodu (MEB, 13 kazanım)

Kodlar [`HATA_TAKSONOMISI.md`](../HATA_TAKSONOMISI.md) v0.1. "Oto" satırları
betiğin ya da sunucunun saydığı, "elle" satırları tek tek bakılan sorulardır.

| Kod | Ölçüm | A llama-3.3-70b | B llama-4-scout |
|---|---|---|---|
| İstenen → dönen soru | oto | 39 → 37 | 39 → 37 |
| `TKR-GOVDE` (elendi) | oto | 2 / 39 (%5,1) | 2 / 39 (%5,1) |
| `TKR-SIK` · `SIK-SAYI` (elendi) | oto | 0 · 0 | 0 · 0 |
| `ANH-GECERSIZ` (bayrak) | oto | 0 / 25 | 0 / 26 |
| `GRK-TEKRAR` (bayrak) | oto | 2 / 25 (%8,0) | 1 / 26 (%3,8) |
| `DIL-ALFABE` (bayrak) | oto | 0 / 37 | 1 / 37 (`整理`) |
| `GRK-KALIP` (ham, sayaç) | oto, 3 kazanım | 12 / 18 (%66,7) | 6 / 18 (%33,3) |
| `GVD-KISA` (< 40 kelime) | oto | 24 / 37 (%64,9) · ort 35,6 kelime | 34 / 37 (%91,9) · ort 25,7 · **ÇSS 26/26** |
| `KYN-ATIF` deseni eşleşti | oto | 3 / 37, **elle: 3'ü de yanlış pozitif** | 2 / 37, **elle: 2'si de yanlış pozitif** |
| **Cevap anahtarı doğru** | elle | **12 / 25 (%48,0)** | **16 / 26 (%61,5)** |
| **Cevap anahtarı yanlış** (`ANH-OLGU`) | elle | **8 / 25 (%32,0)** | **5 / 26 (%19,2)** |
| **Cevap anahtarı belirsiz** | elle | 5 / 25 (%20,0) | 5 / 26 (%19,2) |
| `GRK-TUTARSIZ` | elle | 7 / 25 | 3 / 26 |
| `KZN-DISI` | elle | 6 / 25 | 6 / 26 |
| `GVD-YINELEME` | elle | 7 / 25 | 0 / 26 |
| `GVD-TEKADIM` | elle | 4 / 25 | 6 / 26 |
| `GVD-KALIP` | elle | 0 / 25 | 4 / 26 |
| `SIK-ESANLAM` | elle | 2 / 25 | 0 / 26 |
| `DIL-LATIN` | elle | 1 / 25 ("aspectsini") | 0 / 26 |
| `GVD-VERIFAZLA` · `GRK-GENEL` · `SNF-DISI` | elle | 1 · 1 · 1 | 1 · 0 · 0 |

**"Belirsiz"in tanımı.** İşaretli şık savunulamıyor ama tek bir doğru da
belirlenemiyor. Dört durum var: (a) birden çok şık savunulabilir doğru
(ör. 3-4-5, 5-12-13 ve 6-8-10 üçgenlerinin üçü de dik), (b) soruda gereken veri
eksik (ör. Bayes'te ön olasılık yok), (c) soru kökü yok (yalnız bağlam + şıklar),
(d) kurgu kendi içinde tutarsız. "Yanlış" ise işaretli şıkkın yanlış olduğu,
doğru cevabın başka bir şıkta **ya da hiçbir şıkta olmadığı** durumdur.
A'nın 8 yanlışının 4'ünde ve B'nin 5 yanlışının 3'ünde doğru cevap hiçbir şıkta
yoktu.

## 3. Deneyap (5 kazanım, `kaynakTuru: "deneyap"`, e35628f)

| | A llama-3.3-70b | B llama-4-scout |
|---|---|---|
| İstenen → dönen | 15 → 8 | 15 → 11 |
| `TKR-GOVDE` (elendi) | **7 / 15 (%46,7)** | 4 / 15 (%26,7) |
| Açık uçlu istendi, hiç dönmedi | 3 / 5 çağrı | 3 / 5 çağrı |
| `GRK-KALIP` (ham) | **30 / 30 (%100)** | **0 / 30 (%0)** |
| Anahtar doğru · yanlış · belirsiz | 4 · 0 · 2 (N=6) | 3 · 1 · 5 (N=9) |
| `GVD-KISA` | 4 / 8 | 5 / 11 |

N çok küçük (6 ve 9 ÇSS); Deneyap için oran **iddia edilmez**. Görülen iki şey
şu: tekrar elemesi MEB'in yaklaşık 5-9 katı sık tetiklendi, ve iki model kalıp
gerekçede tam zıt davrandı.

## 4. Araştırma sorusunun ikinci yarısı — otomatik denetim ne yakaladı?

| | Sayı |
|---|---|
| Elle bakılan ÇSS (MEB + Deneyap, iki model) | 66 |
| Cevap anahtarı yanlış ya da belirsiz | **31** (14 yanlış + 17 belirsiz) |
| Bunlardan herhangi bir sunucu bayrağı taşıyan | **1** (B, FB.7.5.8: `dilUyarisi`; bayrak anahtar için değil, yabancı alfabe için kalktı) |
| En az bir elle kod alan ÇSS | 55 / 66 |

Okuma: sunucu denetimleri tasarlandıkları şeyi yakalıyor. Tekrar ve aynı şık
kümesi eleniyor, iki çeldiriciye aynı gerekçe ve yabancı alfabe işaretleniyor,
kalıp gerekçe temizleniyor. **Ama bu koşumda en pahalı hatayı, yanlış ya da
belirsiz cevap anahtarını, 31 vakadan hiçbirinde anahtar sorunu olarak
yakalamadılar.** Bu, taksonominin "elle" sütunuyla ve ürünün tasarımıyla
tutarlı: o katman insan onayıdır (agents.md §1). Bu sayı "insan onayı hataları
şu kadar azaltıyor" demez. Öğretmenle pilot yapılmadı (6 aylık plan, Ay 4).

## 5. Denetimin yan etkileri ve ölçümde bulunan açıklar

1. **`TKR-GOVDE` açık uçlu soruyu ÇSS'nin tekrarı diye eliyor.** Gövde
   benzerliği türe bakmıyor. Örnek: ön koşum A, MAT.5.4.4'te 3 sorudan 2'si
   elendi, geriye tek ÇSS kaldı, açık uçlu hiç dönmedi. Gerçek koşumda "açık
   uçlu istendi, hiç dönmedi": MEB A 1/13 · B 2/13 çağrı, **Deneyap 3/5 + 3/5**.
   Kod değiştirilmedi (karar: Orchestrator). Elenen sorunun metni yanıtta
   olmadığı için hangi çiftin eşleştiği görülemiyor.
2. **`KAYNAK_ATIF` kazanım modunda 5/5 yanlış pozitif.** Desen "metinde,
   şiirinde" gibi sözcükleri yakalıyor, oysa sorular öğrencinin KENDİ yazacağı
   metinden söz ediyor. Kazanım modunda `needsSource` zaten false'a
   sabitlendiği için zararı yok. Tersine, gösterilmeyen bir **grafiğe** atıf
   ("Grafikte … görülüyor", B, DNY.RK.4.7) desende olmadığı için kaçtı.
3. **`GRK-KALIP` fc1750c'de ölçülemiyordu.** API yalnız temizlenmiş gerekçeyi
   döndürüyordu. Temizlik sonrası kalan kalıp her koşumda 0'dı. Ham sayım W2'nin
   e35628f sayacıyla mümkün oldu (§3, §2 "MEB sayaç" satırı).
4. **Kazanım metni 200 karakter sınırı** (MAT.8.3.5, 213 karakter): şema isteği
   400 ile reddediyordu, arayüzde bu kazanımla üretim yapılamıyordu. Bu ölçüm
   sırasında bulundu, W2 fc1750c ile düzeltti (sınır 400).
5. **Gövde kelime hedefi (40-110):** A'da ÇSS'lerin 8/25'i, B'de 0/26'sı
   40 kelimeye ulaştı. §48'deki gözlem tekrarlandı: istem kuralı tek başına
   tutmuyor.

## 6. İkinci bağımsız kontrol (kör)

**Yöntem.** Birinci kontrolün (W5) "yanlış" ve "belirsiz" dediği 31 ÇSS'ye
rastgele seçilmiş 6 "doğru" ÇSS eklendi (tohum 20261019). 37 madde karışık
sırayla, K01–K37 kimlikleriyle verildi. Dosyada yalnız gövde, şıklar ve modelin
işaretlediği harf vardı: [`anahtar-kor-kontrol.json`](./anahtar-kor-kontrol.json).
Birinci kontrolün kararları dosyada yoktu. İkinci kontrolcü (Mihenk Worker 1)
birinci kararları görmeden çözdü ve elle-kontrol dosyasını açmadığını beyan
etti: [`anahtar-ikinci-kontrol.json`](./anahtar-ikinci-kontrol.json) (`a06dde2`).
Eşleme [`anahtar-kor-esleme.json`](./anahtar-kor-esleme.json) (`2c71203`),
kör kontrol bittikten sonra commit'lendi. Uyuşmayı Orchestrator hesapladı.
**İkinci kontrolcü de bir YZ'dir (Claude), insan değil.**

| Ölçü | Sonuç |
|---|---|
| Tam uyuşma (3 sınıf) | **32 / 37 (%86)** · Cohen κ = **0,79** |
| "Anahtar yanlış mı?" ikili uyuşma | 35 / 37 |
| W5 yanlış → W1 yanlış | **14 / 14** |
| W5 doğru → W1 doğru (rastgele 6) | 6 / 6 |
| W5 belirsiz → W1 belirsiz | 12 / 17 |
| W5 belirsiz → W1 doğru | 3: A·FB.7.5.8·2, A·MAT.6.4.1·1, B·T.Y.5.15·1 |
| W5 belirsiz → W1 yanlış | 2: B·T.Y.7.17·2, B·MAT.7.1.7·1 |

Uyuşmazlıkların **5'i de "belirsiz" sınırında**. Birinci kontrolün "yanlış"
kararlarının hiçbiri itiraz görmedi. Birincil etiket W5'inkidir; §2 ve §3'teki
sayılar değiştirilmedi. İki kontrolcüye göre aralık:

| | Yanlış anahtar | Belirsiz | Doğru (W1 yalnız 6'sına baktı) |
|---|---|---|---|
| A · MEB (N=25) | **8** (iki kontrolcü hemfikir) | 5 (W1: 3) | 12 (W1'e göre en az 14) |
| B · MEB (N=26) | **5** (W1: 7) → aralık **5–7** | 5 (W1: 2) | 16 (W1'e göre en az 17) |
| Deneyap A · B | 0 · 1 (uyuşmazlık yok) | 2 · 5 | 4 · 3 |

Sınır: iki kontrolcü de aynı model ailesinden. Ortak bir yanılgı her iki
kontrolde de görünmez. İnsan alan uzmanı kontrolü 6 aylık planda.

## 7. Sınırlar — okurken akılda tutulacaklar

- **N küçük, tek koşum, tek sıcaklık.** Model başına 25-26 MEB ÇSS. Model
  farkları (A %32 / B %19 yanlış anahtar) bu N'de güven aralığı geniş bir
  gözlemdir, "B daha iyi" sonucu **çıkarılmaz**.
- **İki kontrolü de YZ yaptı** (§6). Kör ikinci kontrol yalnız 37 maddeye
  bakıldı. Birincinin "doğru" dediği 35 ÇSS'nin 29'u ikinci kez kontrol edilmedi.
- **Kazanım modu en zor koşul.** Kaynak metinli üretimde oranlar farklı
  olabilir (§46.2'de metin dönüşümü açıkça verince hata kaybolmuştu).
- **Açık uçlu sorular** için cevap anahtarı/rubrik kontrolü yapılmadı.
- `GVD-YINELEME` ve `GVD-KALIP` için betikteki aday işaretleyici zayıf çıktı
  (elle 9 yineleme bulundu, aday 0). Elle sayılar esas alındı.
- Ölçüm koşulları: yerel `wrangler dev`, Workers AI uzak çağrı, aynı hesap.
  Canlı (`mihenk.bies.workers.dev`) ölçülmedi.

## 8. A5 koşumu — istem sürümü 2, A1–A4 denetimleri (19 Ekim 2026, W2) · ETİKETLENMEDİ

> **Bu bölümdeki sayılar OTOMATİK denetimlerin ne kadar sık İŞARET koyduğudur.
> "Yanlış anahtar oranı" DEĞİLDİR.** Doğrulama elle etiketlemeyle yapılacak
> (`a5/etiket-kor.json`). Ayrıca istem sürümü 2'dir (PROGRESS §55.3); §2'deki
> sürüm 1 sonuçlarıyla karşılaştırma istem değişikliğiyle karışıktır.

**Düzen.**
- 18 kazanım (set-v1.1) × 3 tekrar × 2 sıcaklık (0,5 / 0,2) × 2 model.
  - A: llama-3.3-70b, yedeği Scout.
  - B: Scout, yedeği 70b — B'de bağımsız çözüm için çapraz model gerektiği için.
- Her ÇSS için bağımsız çözüm (`/api/ai/solve`, çapraz).
- Sabit worktree (`18319d1`), ölçüm modunda dört yerel sunucu (`APP_ENV=olcum`,
  `OLCUM_HAM=1`). Sıcaklık her çağrıda sunucunun `meta.sicaklik` değeriyle doğrulandı.
- Ham: `ham/*-gercek-a5s0{5,2}/` · CSV: `*-gercek-a5s0{5,2}.csv`.

**Çağrılar.**
- 216 üretim çağrısının **216'sı HTTP 200**; ortam hatası, 503 ve 429 **0**.
- 392 çözücü çağrısının 392'si 200.
- **Yedeğe düşen üretim: 2 çağrı** (A s0,5'te 1, B s0,5'te 1) → 4 ÇSS
  `a5/yedege-dusenler.json`'a ayrıldı. Aşağıdaki oranlar yalnız birincil modelin
  ürettikleridir.

| | A s0,5 | A s0,2 | B s0,5 | B s0,2 |
|---|---|---|---|---|
| ÇSS (birincil) | 92 | 94 | 101 | 105 |
| sayısal ÇSS (gövde + tüm şıklarda rakam) | 37 | 30 | 61 | 60 |
| Açık uçlu istenen / dönen (**A4**) | 54 / 54 | 54 / 54 | 54 / 54 | 54 / 54 |
| `elenenTekrar` (hepsi aynı tür) | 14 | 14 | 5 | 3 |
| **hesap yazma — sayısal ÇSS'de** | 34/37 (%91,9) | 29/30 (%96,7) | 37/61 (%60,7) | 43/60 (%71,7) |
| **hesap yazma — SAYISAL OLMAYAN ÇSS'de** | 10/55 (%18,2) | 14/64 (%21,9) | 1/40 (%2,5) | 1/45 (%2,2) |
| hesap okunamadı (ayrıştırıcı reddetti) | 7 | 14 | 5 | 7 |
| hesap ↔ doğru şık: uyuşmaz / uyuşur | 16 / 15 | 16 / 10 | 6 / 26 | 13 / 24 |
| hesap başka bir şıkla tutuyor | 4 | 5 | 4 | 9 |
| çözücü anahtardan farklı şık seçti (**A1**) | 27/92 (%29,3) | 23/94 (%24,5) | 23/101 (%22,8) | 23/105 (%21,9) |
| çözücü "çözülemedi" | 0 | 0 | 0 | 0 |
| `uzunSikIpucu` (**A3**, yalnız ölçüm) | 3 (%3,3) | 4 (%4,3) | 7 (%6,9) | 4 (%3,8) |

**Gözlemler (etiketlemeden önce, dikkatle).**
- **A4 kaybı kapandı:** sabah (§54, sürüm 1) 42 açık uçlu istenip 32 geliyordu;
  A5'te 216 / 216. Bu doğrudan ölçümdür.
- **Hesap alanı:** A sayısal soruların %92–97'sinde yazıyor, B %61–72'sinde.
  A, kural 10'a rağmen sayısal OLMAYAN soruların %18–22'sinde de ifade yazıyor
  (ör. "(10 / 2) < 6"); B neredeyse hiç yazmıyor (%2).
- **Hesap uyuşmazlığının bilinen yanlış pozitifi:** doğru şıkkın kendisi bir
  işlem ifadesiyse ("40 km * 5 saat / 2 saat") ilk sayı alınıyor. 392 ÇSS'nin
  30'unda doğru şıkta işlem ifadesi var (`sikIfadeIceriyor`, birleşik CSV'de).
  Etiketlemede ayrı kodla bakılacak; ürün kodu etiketlemeden önce değiştirilmedi.
- Elle bakılan ilk örneklerde uyuşmazlıkların çoğu **gerçek tutarsızlık** gibi
  duruyor (ör. (8×2)+(5×2) = 26, anahtar 22 cm; hesap ve çözücü ikisi de 26'yı
  gösteren şıkkı seçti). Bu bir ÖN İZLENİM; oranı etiketleme verecek.

**Etiket kümeleri** (`a5/`, tohum 2026; W4'ün iki aşamalı kör yöntemi):
- (a) tekrar 1 · s0,5 · iki model · tüm ÇSS: 68
- (b) A1/A2 bayraklı tüm ÇSS (çözücü uyuşmazlığı, hesap uyuşmazlığı, hesap
  başka şıkla tutuyor, doğru şıkta işlem ifadesi): 144
- (c) bayraksızlardan tabakalı (model × sıcaklık, 4 × 10): 40
- **Tekil soru: 225.** Bir soru birden çok kümede olabilir; her soru bir kez
  etiketlenir.
- Kör dosya: `etiket-kor.json` (gövde, şıklar, işaretli harf, kazanım, sınıf;
  model / sıcaklık / çözücü / hesap / bayrak yok).
- Eşleme: `etiket-esleme.json` — Aşama 1 commit'lenene kadar etiketleyiciye verilmez.
- Kör ikinci kontrol (W3): `ikinci-kontrol-kor.json`, 225'in tohumlu %20'si = 45,
  kendi numaraları; birinci kontrolün kararları ve K-no yok.

**Maliyet (ölçüldü, Cloudflare analitiği, 09:39 → 10:38 UTC):** Scout +329 çağrı
+21.848 Neuron · 70b +335 çağrı +38.584 Neuron · toplam ≈ **60.430 Neuron ≈ 0,66 $**
(bugün ücretsiz 10.000'lik pay daha önce dolmuştu, tamamı ücretli).
**Üst sınırdır:** pencere başka oturumların çağrılarını da içerebilir (bu
bölümün dışında W2 canlı doğrulaması 2 çağrı yaptı). Tahminim 35–50 bin idi;
gerçek değer daha yüksek çıktı.

## 9. A5 etiketli sonuçlar — denetimlerin yakalama ve yanlış alarmı (19 Ekim 2026, W2)

> **§57 güncellemesi:** aşağıdaki (2) tablosundaki **A1** ve **A1 ∪ A2** sayıları
> ÇÖZÜCÜ İSTEMİ SÜRÜM 1'e aittir (harf önce, gerekçe sonra). Sürüm 1'in bir
> istem tasarım hatası vardı; düzeltilmiş sürüm 2'nin sonuçları **§9.6**'da.
> Ürünün bugünkü çözücüsü sürüm 2'dir. A2, A3, (1), (3), (4) değişmedi.

**Etiketler.**
- Birincil: W4 tek K, 113 madde (`etiket-W4.json`, `6c83bcf`) + W1 çift K, 112 madde
  (`etiket-W1.json`, `0387114`). Toplam 225 tekil ÇSS, iki aşamalı kör.
- Kör ikinci kontrol: W3, 45 madde (`ikinci-kontrol-w3.json`, `efa9277`).
- Birleştirme ve hesap: `tools/olcum/a5-birlestir.mjs` → `a5/a5-etiketli.csv`,
  `a5/a5-basarim.txt`.
- **Kusurlu = yanlış ya da belirsiz** (müdür tanımı); sağlam = doğru.

**Ağırlıklandırma.**
- Bayraklı (A1 ∪ A2 ∪ doğru şıkta işlem ifadesi) 144 ÇSS'nin **hepsi** etiketli
  (tam sayım, ağırlık 1).
- Bayraksızlar, aynı model × sıcaklık tabakasındaki etiketli bayraksızlarla temsil
  edilir. Etiketli bayraksızlar (a) ∩ bayraksız + (c) kümelerinden gelir.

| Tabaka | Bayraksız ÇSS | Etiketli bayraksız | Ağırlık |
|---|---|---|---|
| A s0,5 | 52 | 28 | 1,86 |
| A s0,2 | 59 | 10 | 5,90 |
| B s0,5 | 69 | 33 | 2,09 |
| B s0,2 | 68 | 10 | 6,80 |

- **s0,2 hücreleri yalnız 10'ar etiketli bayraksız maddeye dayanır → gürültülü.**
- (a) ile (c)'nin birleşimini rastgele örneklem saymak bir VARSAYIMDIR.

**(1) Anahtar doğruluğu — (a) kümesi (tekrar 1 · s0,5, tüm ÇSS):**

| Model | n | doğru | yanlış | belirsiz | ANH-YOK |
|---|---|---|---|---|---|
| A (70b) | 32 | 22 (%68,8) | 3 | 7 | 2 |
| B (Scout) | 36 | 22 (%61,1) | 5 | 9 | 1 |

İstem sürümü 2 ile ölçüldü; §2'deki sürüm 1 sonuçları (A %48, B %62; N≈25) ile
karşılaştırma istem değişikliğiyle **karışıktır**. Örneklem küçük.

**(2) Yakalama ve yanlış alarm** — ağırlıklı, 392 birincil ÇSS'ye genellenmiş:

| | Kusurlu ≈ | Sağlam ≈ | A1 yak. / y.a. | A2 yak. / y.a. | **A1 ∪ A2 yak. / y.a.** | A3 yak. / y.a. |
|---|---|---|---|---|---|---|
| **Toplam** | 146,0 | 246,0 | %43,1 / %13,4 | %30,8 / %2,4 | **%56,2 / %15,4** | %1,4 / %10,6 |
| A s0,5 | 39,7 | 52,3 | %42,8 / %19,1 | %32,7 / %5,7 | %55,4 / %24,9 | %2,5 / %3,6 |
| A s0,2 | 33,8 | 60,2 | %53,3 / %8,3 | %41,4 / %3,3 | %65,1 / %11,6 | %0,0 / %19,6 |
| B s0,5 | 37,9 | 63,1 | %39,6 / %12,7 | %13,2 / %1,6 | %44,8 / %12,7 | %2,6 / %16,6 |
| B s0,2 | 34,6 | 70,4 | %37,6 / %14,2 | %37,6 / %0,0 | %60,7 / %14,2 | %0,0 / %2,8 |

**Okuma notları.**
- Ağırlıklı tahminle 392 birincil ÇSS'nin ≈146'sı (**≈%37**) kusurlu (yanlış ya
  da belirsiz).
- A1 ∪ A2 bunların ≈%56'sını yakalıyor. **≈64 kusurlu ÇSS'yi kaçırıyor** —
  insan onayı hâlâ zorunlu (agents.md §1).
- **A2'nin yanlış alarmı çok düşük (%2,4).** A2 bayraklı 51 ÇSS'nin 6'sında
  doğru şıkta işlem ifadesi var; bunların 4'ü "doğru" etiketli, yani A2'nin
  yanlış alarmlarının 4'ü bu bilinen türden.
- A1 daha çok yakalıyor (%43) ama yanlış alarmı daha yüksek (%13).
- **A3 işe yaramıyor:** yakalaması %1,4, yanlış alarmı %10,6 — rozet yapmama
  kararı (§55.2) doğrulandı.

**(3) Tekrarlar arası tutarlılık.**
- Aynı kazanım × model × sıcaklık × sıra, FARKLI tekrarda üretilmiş sorular:
  etiketli 121 çiftin 86'sında (%71,1) kusurlu/sağlam kararı aynı.
- (b) bayraklı seçildiği için örneklem yanlı; yalnız gösterge.

**(4) Kör ikinci kontrol — W3 ↔ birincil (n = 45):**

| birincil \ W3 | doğru | yanlış | belirsiz |
|---|---|---|---|
| doğru | 23 | 0 | 1 |
| yanlış | 0 | 14 | 0 |
| belirsiz | 2 | 2 | 3 |

- Üç sınıf: uyuşma **%88,9**, **κ = 0,81**. İkili ("kusurlu mu?"): uyuşma
  %93,3, **κ = 0,87**.
- Doğru ↔ yanlış karşıtlığı **hiç yok**; uyuşmazlıkların 4'ü "belirsiz" sınırında.
- W3, kökü soru cümlesi değil niyet cümlesi olan maddeleri "kök var" saydığını
  bildirdi; uyuşmazlık nedenlerinden biri bu olabilir.

**(5) Özel kontrol — Vietnamca sızıntı (W4: K159 "ngược", K205 "đúngudur").**
- İkisinde de `dilUyarisi = true`.
- K205: "đ" (U+0111, Latin Extended-A — §55 eki) yakaladı.
- K159: yakalanma "ư" sayesinde DEĞİL, aynı kelimedeki "ợ" (U+1EE3, Latin
  Extended Additional) sayesinde.
- **Kapsam açığı (ürün kodu değiştirilmedi):** "ư" (U+01B0) ve "ơ" (U+01A1)
  Latin Extended-B'de; `YABANCI_ALFABE` bu bloğu kapsamıyor. Yalnız bu harfleri
  içeren bir kelime ("thư", "sư") yakalanmaz. Ayrı karar konusu.

### 9.6 A1 çözücü istemi sürüm 2 — "harf önce, akıl yürütme sonra" etkisi (§57)

**Bulgu (W4, Aşama 2).** A1 v1'in 15 yanlış alarmının 9'unda çözücünün
gerekçesi doğru değeri buldu, ama BAŞKA bir harf seçti. Örnek K001: gerekçe
"…3 saat sonra 40 bakteri", seçilen B = 60, doğru A = 40.

**Kök neden.**
- Şık sırası, harf eşlemesi ve yanıt ayrıştırması doğruydu (ham kayıt ve
  yeniden kurulan istemle denetlendi).
- Hata çıktı şablonundaydı: `{"secilenSik", "gerekce", …}`. Model harfi hesap
  yapmadan yazmaya zorlanıyordu.

**Kontrollü deney** (K001 istemi, llama-3.3-70b, Workers AI REST, sıcaklık 0,2):

| Çıktı şablonu | Seçilen harf (3 deneme) | Sonuç |
|---|---|---|
| harf önce (v1) | B, B, B (60) | **3/3 yanlış**; gerekçe her seferinde "40" |
| gerekçe önce (v2) | A, A, A (40) | **3/3 doğru**, güven 1 |

**Düzeltme** (`1b8f611`, merge `3af821b`):
- Kural 1 "önce gerekçede çöz, sonra harfi seç"; şablon sırası gerekce →
  secilenSik → guven → cozulemedi.
- `meta.cozucuIstemSurumu = 2`.
- Üretim istemi ve MEB parmak izi değişmedi.

**Yeniden ölçüm** (`tools/olcum/a5-cozucu-v2.mjs` → `a5/cozucu-v2.json`):
- Aynı 225 etiketli ÇSS yeniden çözüldü (225/225 HTTP 200, 225 çapraz).
- Üretim yeniden YAPILMADI; etiketler ve tasarım ağırlıkları aynı.

| | A1 v1 yak. / y.a. | **A1 v2 yak. / y.a.** | A1∪A2 v1 | **A1v2∪A2** |
|---|---|---|---|---|
| **Toplam** | %43,1 / %13,4 | **%52,2 / %2,9** | %56,2 / %15,4 | **%61,1 / %5,3** |
| A s0,5 | %42,8 / %19,1 | %50,0 / %7,7 | %55,4 / %24,9 | %60,1 / %13,4 |
| A s0,2 | %53,3 / %8,3 | %50,3 / %1,7 | %65,1 / %11,6 | %65,1 / %5,0 |
| B s0,5 | %39,6 / %12,7 | %59,0 / %3,3 | %44,8 / %12,7 | %61,6 / %4,9 |
| B s0,2 | %37,6 / %14,2 | %49,1 / %0,0 | %60,7 / %14,2 | %57,8 / %0,0 |

- W4'ün 9 "harf kayması" maddesinin **8'i** v2'de anahtarla uyuşuyor (K169 hariç).
- A1 bayrağı 53 maddede değişti: v1 bayraklı → v2 bayraksız 36, tersi 17.
- Kaçırılan kusurlu (A1 ∪ A2): v1 ≈64 → v2 **≈57** / ≈146.
- **Yanlış alarm 13,4 → 2,9 puan.** A1 artık A2 gibi düşük yanlış alarmlı bir
  sinyal; yakalama da arttı.

**Sınır.** Tasarım ağırlıkları v1 bayraklarıyla kuruldu. v2'nin bayrakladığı
ama v1'in bayraklamadığı maddeler bayraksız tabakadan ağırlıkla temsil
ediliyor; bu tahmin s0,2 hücrelerinde gürültülü (tabaka başına 10 etiketli madde).

**Araştırma için genel bulgu.** Bir dil modelinden yapılandırılmış çıktıyla
karar istenirken, karar alanının akıl yürütme alanından ÖNCE gelmesi kararı
hesaptan bağımsızlaştırabilir. Bu deneyde etki tamdı (3/3 → 3/3). Ürünün
diğer istemlerindeki alan sırası da bu açıdan gözden geçirilmeli.
**Açık aday (ÖLÇÜLMEDİ):** açık uçlu değerlendirme isteminde her kriterin
içinde `"points"`, `"reason"`dan ÖNCE geliyor (`src/lib/prompts.ts`,
`breakdown` şablonu) — aynı "karar önce" riskini taşıyabilir. Etkisi ayrı bir
kontrollü deneyle ölçülmeden değiştirilmemeli.

### 9.7 İstatistik ve tekrarlanabilirlik (W2)

**Yöntem.**
- Tabakalı bootstrap: 1.000 tekrar, tohum 20261019 (`tools/olcum/a5-birlestir.mjs`
  [5], ham sonuç `a5/a5-bootstrap.json`).
- Her model × sıcaklık tabakasında iki hücre kendi içinde, yerine koyarak yeniden
  örneklenir: bayraklı ve etiketli bayraksız. Tasarım ağırlıkları sabit kalır.
- Bayraklı hücre tasarımda tam sayımdır; onu da yeniden örneklemek etiketlerin
  süper-popülasyon değişkenliğini katar (bilerek tutucu).
- %95 GA = 2,5. ve 97,5. yüzdelikler.
- Çözücü **v2** (bugünkü ürün).
- **Yakalama iki tanımla verilir:**
  - **yanlış** (manşet): yalnız karar = yanlış.
  - **kusurlu** (ikincil): yanlış ∪ belirsiz.
- Yanlış alarm = doğru etiketlilerden işaretlenen.

**Toplam (392 birincil ÇSS'ye ağırlıklı), nokta [%95 GA]:**

| | Yakalama — yanlış (manşet) | Yakalama — kusurlu | Yanlış alarm |
|---|---|---|---|
| A1 v2 | 62,9 [47,9–82,2] | 52,2 [42,3–64,8] | 2,9 [0,8–5,4] |
| A2 | 53,5 [39,1–73,5] | 30,8 [23,3–39,6] | 2,4 [0,8–4,4] |
| **A1 v2 ∪ A2** | **77,7 [60,6–98,4]** | 61,1 [51,2–74,6] | **5,3 [2,6–8,4]** |
| A3 | 0,0 [0,0–0,0] | 1,4 [0,0–3,4] | 10,6 [4,2–18,0] |

**Tabaka başına (A1 v2 ∪ A2):**

| Tabaka | Yakalama — yanlış | Yakalama — kusurlu | Yanlış alarm | Etiketli "yanlış" (bayraklı / bayraksız) |
|---|---|---|---|---|
| A s0,5 | 100 [100–100]* | 60,1 [44,7–77,7] | 13,4 [5,8–23,0] | 12 / 1 |
| A s0,2 | 100 [100–100]* | 65,1 [44,6–100] | 5,0 [0,0–11,0] | 17 / 0 |
| B s0,5 | 86,3 [59,3–100] | 61,6 [42,8–81,5] | 4,9 [0,0–13,2] | 9 / 3 |
| B s0,2 | 49,0 [26,3–100] | 57,8 [35,5–100] | 0,0 [0,0–0,0]* | 15 / 2 |

Tüm dedektörlerin tabaka sonuçları `a5/a5-basarim.txt` [5]'tedir.

\* **Çöken aralıklar.**
- A tabakalarında etiketli hiçbir "yanlış" madde kaçırılmamış (13/13 ve 17/17).
  Sıfır kaçırma gözlenince yüzdelik bootstrap belirsizliği gösteremez; aralık
  [100–100] çöker.
- Daha dürüst alt sınır (ağırlıksız Wilson): A s0,5 13/13 → [77,2–100]; A s0,2
  17/17 → [81,6–100]; B s0,5 11/12 → [64,6–98,5]; B s0,2 14/17 → [59,0–93,8];
  toplam 55/59 → [83,8–97,3].
- **Ağırlıksız %93 ile ağırlıklı %77,7 arasındaki fark:** B s0,2'de kaçırılan 3
  "yanlış" madde (K126, K076, K203) bayraksız tabakadan geliyor ve her biri
  6,8 ağırlık taşıyor.
- B s0,2'nin yanlış alarmı 0'dır, ama yalnız 10 etiketli bayraksız maddeye dayanır.

**Basit oranlar — Wilson %95 GA:**

| Oran | k / n | Nokta | %95 GA |
|---|---|---|---|
| A5 (a) anahtar doğru — A (70b), istem v2 | 22 / 32 | %68,8 | [51,4–82,0] |
| A5 (a) anahtar doğru — B (Scout), istem v2 | 22 / 36 | %61,1 | [44,9–75,2] |
| §54 ilk ölçüm anahtar doğru — A, istem v1 | 12 / 25 | %48,0 | [30,0–66,5] |
| §54 ilk ölçüm anahtar doğru — B, istem v1 | 16 / 26 | %61,5 | [42,5–77,6] |
| Harf-önce deneyi (v1 şablon) yanlış | 3 / 3 | %100 | [43,8–100] |
| Gerekçe-önce deneyi (v2 şablon) doğru | 3 / 3 | %100 | [43,8–100] |

**Okuma.**
- A'nın anahtar doğruluğu v1 → v2'de %48 → %69, ama aralıklar örtüşüyor
  ([30–67] ve [51–82]).
- Ayrıca istem değişti, kazanım alt kümesi ve etiketleyiciler farklı. **Bu fark
  bir iyileşme kanıtı DEĞİLDİR.**
- Harf-önce deneyi n=3 ile yönü gösterir; etkinin büyüklüğü için daha büyük
  deney gerekir. A1 v2'nin yanlış alarm düşüşü (13,4 → 2,9) 225 maddede ayrıca
  ölçüldü (§9.6).

**Tekrarlanabilirlik.**

| Öğe | Değer |
|---|---|
| Model A | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Workers AI) |
| Model B | `@cf/meta/llama-4-scout-17b-16e-instruct` (Workers AI) |
| Model sürümü | Cloudflare model kimlikleri bir sürüm ya da ağırlık özeti taşımıyor. Aynı kimliğin arkasındaki modelin değişip değişmediği dışarıdan **doğrulanamaz**. `fp8-fast` bir nicemleme/hız varyantının adıdır, sürüm değildir. Sonuçlar aşağıdaki tarih ve saatlere bağlıdır. |
| Çağrı pencereleri (UTC, 19 Ekim 2026) | §54 ilk ölçüm: A 04:43–04:54, B 04:43–04:57 · A5 üretim + çözücü v1: A 09:42–10:16, B 09:42–10:38 · çözücü v2 yeniden ölçümü: bitiş 10:56 · harf-önce deneyi: v2 ölçümünden önce, saat kaydı yok |
| Değerlendirme seti | `set-v1.1` (`tools/olcum/set-v1.1.json`, 13 MEB + 5 Deneyap = 18 kazanım) |
| Üretim istemi | §54: sürüm 1 · A5: sürüm 2 (`ISTEM_SURUMU`; MEB parmak izi v1 `f9f636a4…`, v2 `6659c1e8…`) |
| Çözücü istemi | A5 koşumu: v1 (harf önce) · yeniden ölçüm ve ürün: v2 (`COZUCU_ISTEM_SURUMU`) |
| Sıcaklık / max_tokens | üretim 0,5 ve 0,2 (`OLCUM_SICAKLIK`, her çağrıda `meta.sicaklik` ile doğrulandı) / 700 + 700 × soru, tavan 5.600 · çözücü 0,2 / 400 |
| Sunucu kodu | §54: `fc1750c` (ham kayıtta "+kaydedilmemis": o sırada ana ağaçta W2'nin satır sonu düzeltmesi vardı, içerik farkı 0) · A5: src `156b0a2`, betik `18319d1` · çözücü v2: `3af821b` |
| Tohumlar | etiket örneklemi 2026 · kör ikinci kontrol 2027 · bootstrap 20261019 |
| Etiketler | W1 `0387114` (çift K) · W4 `6c83bcf` (tek K) · W3 `efa9277` (ikinci kontrol, I-no) |
| Veri commit'leri | A5 ham + CSV + kümeler `51728b4` · çözücü v2 `0ffc977` |
| Betikler | `tools/olcum/olc.mjs`, `a5-orneklem.mjs`, `a5-cozucu-v2.mjs`, `a5-birlestir.mjs` |
| Yeniden üretim | `node tools/olcum/a5-birlestir.mjs` — model çağırmaz; bu bölümdeki tüm sayıları depodaki verilerden yeniden hesaplar |
