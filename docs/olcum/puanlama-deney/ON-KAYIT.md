# Ön kayıt — Puanlama isteminde "puan önce" ile "gerekçe önce" (W1, 23 Ekim 2026)

Bu belge **model çağrısından ÖNCE** commit'lendi. Koşumdan sonra
değiştirilmez; sapma olursa §8'e tarihli not olarak eklenir.

## 1. Soru ve gerekçe

Açık uçlu değerlendirme istemi (`src/lib/prompts.ts` → `buildEvaluationPrompt`)
her kriter için çıktı şablonunda **önce puanı** (`"points"`), **sonra
gerekçeyi** (`"reason"`) istiyor. A1 bağımsız çözücüde "harf önce" şablonu
gerekçeyle çelişen kararlar üretmişti (ARASTIRMA §6, tek soruda 3+3 deneme;
düzeltme `1b8f611`). Aynı riskin puanlamada olup olmadığı ölçülmedi
(ARASTIRMA §6, "Açık aday").

**Soru:** Çıktı şablonunda alan sırası "gerekçe önce, puan sonra" yapılırsa,
yapay zekânın önerdiği puan altın puana yaklaşır mı?

## 2. Hipotezler

- **H1 (birincil):** B ("reason önce") koşulunda, normalize toplam puan
  hatası A'dan ("points önce", üretimdeki istem) **düşüktür**.
- **H0:** İki koşulun hatası arasında fark yoktur.
- Yön önceden belirtildi (B < A). Ters yönde anlamlı fark çıkarsa o da
  raporlanır; H1 desteklenmemiş sayılır.

## 3. Koşullar (tek değişken)

| | İstem |
|---|---|
| **A** | `buildEvaluationPrompt` çıktısı, üretimdekiyle **birebir** |
| **B** | A'nın aynısı; YALNIZ şablondaki kriter satırında alan sırası değişir: `{"label": …, "points": 6, "reason": …}` → `{"label": …, "reason": …, "points": 6}` |

B'de başka hiçbir metin (kural, açıklama, talimat) değişmez. İstem boyu iki
koşulda da ortalama 5454 karakterdir (kuru koşumla ölçüldü). Deneysel istem
**canlıya yayınlanmaz**. Yalnız `tools/olcum/puanlama-deney.mjs` içinde,
`src/` dosyaları değiştirilmeden üretilir.

**Sabitler:**
- Model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (üretim modeli).
- Sıcaklık 0,2 ve `max_tokens` 820 (`/api/ai/evaluate` ile aynı).
- Model çağrısı, yeniden deneme ve JSON ayıklama sunucunun kendi `callModelJson`
  koduyla yapılır; yalnız `env.AI.run` Workers AI REST ucuna bağlanır.
- Yedek model tanımlı değildir; yedeğe düşüş olamaz.

## 4. Örneklem

`tools/olcum/puanlama-set-v1.json`:
- **6 açık uçlu soru**, 4 ders:
  - Fen: kuvvet/sürtünme, fotosentez, mevsimler
  - Türkçe: görüş yazma
  - Sosyal Bilgiler: iklim ve tarım
  - Matematik: kesirden ondalığa
- **Rubrikler** uygulamanın kendisinden: demo rubriği (40/30/30) ve
  `RUBRIK_SABLONLARI`'nın üç şablonu (Kavramsal Anlama, Problem Çözme, Yazılı
  Anlatım). Her soruda 3 kriter var; en yüksek puan 20 (S1) ya da 10.
- **Her soruda 8 yanıt, toplam 48.** Yanıtlar kriter düzeyleri ÖNCEDEN
  tasarlanarak yazıldı. Her soruda aynı 8 profil bulunur:
  - tam;
  - içerik tam, ikinci kriter eksik;
  - içerik kısmi, ikinci kriter tam;
  - **içerik yanlış ama akıcı**;
  - kısa ve kısmen doğru;
  - ilgisiz;
  - içerik tam ama dağınık dil;
  - her şey kısmi.
- **Altın puan = yapım altını:** her kriter için üç düzey (0 / kısmi / tam),
  gerekçesi `not` alanında. Düzey kuralı set dosyasında yazılı.
- Denetlendi (koşumdan önce): 48 yanıtın hiçbirinde aralık ya da 0,5 hatası
  yok; normalize toplam 0–1 arası, ortalama 0,49.
- **Tekrar:** her yanıt × koşul **3 kez** (sıcaklık 0,2 olduğu için çıktı
  değişkendir). Toplam **288 çağrı**.
- **Sıra:** 288 deneme tohumlu (20261023) karıştırılır. Böylece iki koşul
  zamana (model yükü, saat) eşit yayılır. Eşzamanlılık 3.

Örneklem büyüklüğü bütçe ve zaman kısıtıyla seçildi (Workers Paid 26 Ekim'de
bitiyor). Güç analizi yapılmadı. Küçük bir etkiyi kaçırma riski yüksektir:
"fark bulunamadı" sonucu "fark yok" diye yorumlanmayacak.

## 5. Ölçütler

Bir denemenin puanı, sunucunun yaptığı işlemle hesaplanır: ham puan kriter
aralığına kırpılır, 0,5'e yuvarlanır ve toplanır.

**Birincil:**
- **Normalize toplam hata** = |yapay zekâ toplamı − altın toplam| ÷ sorunun
  en yüksek puanı.
- Önce yanıt başına 3 tekrarın ortalaması alınır. Sonra her yanıt için
  eşleştirilmiş fark hesaplanır: d = hata(B) − hata(A).

**İkincil** (koşul başına oran + Wilson %95 GA):
1. **Aralık dışı ham puan oranı.** Kırpmadan ÖNCE ham `points` değerine
   bakılır: <0, kriterin en yüksek puanından büyük, sayı değil ya da kriter
   bulunamadı. Ayrıca 0,5'in katı olmayan puanlar ayrı sayılır.
2. **Şema geçerliliği.** (a) `modelEvaluationSchema`'ya uyan ve ilk denemede
   geçen oran. (b) Yeniden denemeden sonra geçen oran.
3. **Kriter düzeyi mutlak hata** (normalize, kriter başına).
4. **Profil kırılımı.** Yalnız betimsel; özellikle "içerik yanlış ama akıcı"
   profili.

**Manipülasyon denetimi:** model çıktısında `reason` anahtarının `points`'ten
önce gelme oranı, koşul başına. B'de bu oran düşükse (<%80), model şablonu
izlememiş demektir. O durumda sonuç "istem değişikliği uygulanamadı" diye
raporlanır, H1 hakkında karar verilmez.

## 6. Analiz ve karar kuralı

- **Analiz birimi yanıttır (n = 48).** d'nin ortalaması ve %95 GA,
  **yanıtlar üzerinden yeniden örnekleme (bootstrap)** ile hesaplanır:
  10.000 tekrar, tohum 20261023, yüzdelik yöntemi.
- **Duyarlılık:** aynı analiz soru düzeyinde de yapılır (n = 6, soru
  ortalamaları), yalnız raporlanır.
- **Dışlama:**
  - API/sistem hatası veren denemeler analizden çıkarılır ve sayılır.
  - Şemaya hiç uymayan deneme, birincil ölçütte o tekrar için dışlanır;
    ikincil ölçütte (geçerlilik) sayılır.
  - Bir koşulda dışlanan deneme %10'u aşarsa sonuç "kararsız" sayılır.
  - Bir yanıtın bir koşulda hiç geçerli tekrarı yoksa o yanıt eşleştirmeden
    çıkar (sayısı raporlanır).

**Karar kuralı.** B'ye geçiş önerisi ŞU ÜÇÜ BİRDEN sağlanırsa yapılır:
1. d ortalamasının %95 GA üst sınırı **< 0** (B daha iyi);
2. B'nin ilk denemede şema geçerliliği A'dan **en fazla 5 puan düşük**;
3. B'nin aralık dışı ham puan oranı A'dan **yüksek değil**: B'nin oranının GA
   alt sınırı A'nın oranının üstünde değil.

**Diğer sonuçlar:**
- GA 0'ı içeriyorsa sonuç "fark gösterilemedi". Değişiklik önerilmez, örneklem
  büyütme önerisi yazılır.
- GA alt sınırı > 0 ise A daha iyidir; mevcut istem korunur ve bu raporlanır.

Karar W1'in değil, müdürün. Bu belge yalnız önerinin hangi koşulda
yapılacağını sabitler. `src/` değişikliği bu dalda yapılmaz.

## 7. Sınırlılıklar (önceden bilinen)

- **Altın puan tek yazarlı ve yapım gereğidir.** Yanıtları ve düzeylerini aynı
  kişi (W1) belirledi; bağımsız ikinci etiketleyici ya da öğretmen puanı yok.
  Bu, "öğretmenle uyum" değil, **tasarlanmış düzeylerle uyum** ölçer.
- Tek model, tek sıcaklık, Türkçe, 6 soru. Genelleme yapılmaz.
- Yapım yanıtları gerçek öğrenci yanıtlarından daha "temiz" olabilir.
- B yalnız alan sırasını değiştirir; "önce düşün" türü ek talimat test
  edilmez. Ayrı bir deney gerektirir.
- Koşum yalnız Workers AI REST ucuyla yapılır. Binding ile aynı modele gittiği
  varsayılır, ayrıca doğrulanmaz.

## 8. Sapma kaydı

### 8.1 Değişiklik — KOŞUMDAN ÖNCE (23 Ekim 2026, müdür kararı)

Bu değişiklik **hiçbir model çağrısı yapılmadan** yazıldı ve ayrı bir commit
olarak eklendi. Yukarıdaki metin değiştirilmedi.

- **Tekrar 3 → 1.** Gerekçe: Neuron bütçesi. Günde 10.000 Neuron ücretsiz,
  aşan kısım ücretli. Ekip günlük toplamı ~9.000 altında tutuyor; sayaç
  03:00 TR'de sıfırlanıyor. Workers Paid 26 Ekim'de bitiyor, model çağrıları
  25 Ekim akşamına kadar bitmeli. §9'daki 288 çağrılık plan (≈42–70 bin
  Neuron) bu pencereye sığmıyor. Sıcaklık 0,2'de tekrarların bilgi katkısı
  düşük; tekrar arası varyans bu deneyde ölçülmüyor.
- **Yeni plan:** 48 yanıt × 2 koşul × 1 = **96 çağrı ≈ 14.000 Neuron** (üst
  sınır ≈ 23.000).
- **Gün bölmesi.** Yanıtlar tohumlu (20261023) karıştırılır. İlk 14 yanıt
  **1. parça** (28 çağrı, 24 Ekim 03:00 TR'den sonra), kalan 34 yanıt
  **2. parça** (68 çağrı, 25 Ekim). Bir yanıtın A ve B'si **daima aynı
  gün** koşulur, eşleştirme gün etkisiyle bozulmaz. Parça içinde A/B sırası
  da karışıktır. Parça listeleri koşumdan önce sabitlendi
  (`puanlama-deney.mjs --kuru --parca 1|2`):
  - 1. parça: S5-2, S3-8, S1-3, S4-1, S1-1, S4-8, S6-1, S4-2, S3-4, S2-6,
    S2-5, S3-6, S5-4, S2-1
  - 2. parça: kalan 34 yanıt
- **Analiz değişmedi.** Birincil analiz yanıt düzeyinde, n = 48 eşleştirilmiş
  fark, bootstrap %95 GA. Her yanıtta koşul başına tek ölçüm olduğundan
  yanıt içi gürültü farka doğrudan karışır: GA genişler, küçük etkiyi kaçırma
  riski artar. **Örneklem küçüktür; "fark gösterilemedi" sonucu "fark yok"
  demek değildir.** Wilson GA'ları 96 çağrı / 288 kriter puanı üzerinden
  hesaplanır.
- **Dışlama eşiği** (%10) ve **karar kuralı** aynı kalır.
- **Her gün başlamadan** o günkü Neuron tüketimi W5 ile birlikte Cloudflare
  panelinden kontrol edilir. Gerçek kullanım `usage` alanından toplanıp
  raporlanır.

**Ek not (23 Ekim, koşumdan önce, müdür):** Gün bölmesi yalnız bütçe
kaynaklıdır, deney tasarımının parçası değildir.
- 24 Ekim'de bu deneyin kendi tüketimi en çok **4.500 Neuron** olacak (W5 de
  aynı gün ~4,5k kullanıyor).
- 1. parçanın sığmayan çiftleri 25 Ekim'in başına kayar; 2. parçanın taşanı
  26 Ekim'e kayar.
- Betik sınırı yalnız **çift aralarında** uygular. Bir yanıtın A ve B'si
  hep aynı gün koşulur, **eşleştirme korunur**.
- Her denemenin hangi gün koşulduğu `ham.jsonl`'de zaman ve parça bilgisiyle
  kayıtlıdır.

## 9. Maliyet tahmini (koşumdan önce)

- Çağrı başına yaklaşık: girdi ≈ 2.000 token (5454 karakter), çıktı ≈ 450 token.
- Workers AI fiyat tablosuyla (llama-3.3-70b-fp8-fast: girdi 26.668, çıktı
  204.805 Neuron / milyon token): çağrı başına ≈ 145 Neuron.
- 288 çağrı ≈ **42.000 Neuron (≈ 0,46 $)**.
- Üst sınır: tüm çıktılar 820 token + %10 yeniden deneme ≈ **70.000 Neuron
  (≈ 0,77 $)**.
- Gerçek kullanım koşumda `usage` alanından toplanıp raporlanır.
