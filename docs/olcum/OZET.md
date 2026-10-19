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
