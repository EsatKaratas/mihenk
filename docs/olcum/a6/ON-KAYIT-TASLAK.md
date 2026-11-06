# ⚠️ TASLAK — Esat onayı ve OSF/Zenodo kaydı bekliyor

> **Bu belge henüz bir ön kayıt DEĞİLDİR.** Yayımlanmadı, zaman damgası yok.
> Ön kayıt sayılması için üç adım gerekir: (1) Esat metni onaylar,
> (2) metin OSF Registries'e ya da Zenodo'ya yüklenir ve DOI/zaman damgası alır,
> (3) bu damga, **ilk model çağrısından önce** §12'ye yazılır. O zamana kadar
> metin değişebilir. `[…]` ile işaretli alanlar karar bekliyor.

# Ön kayıt — A6 büyük ölçüm: 600 ÇSS, kazanım modu + kaynak metin modu

- **Hazırlayan:** belge worker'ı (Mihenk Orchestrator 3 adına), 6 Kasım 2026
- **Biçim:** `docs/olcum/puanlama-deney/ON-KAYIT.md` ile aynı yapı; OSF "Preregistration" şablonunun bölümleri (hipotez, tasarım, örneklem, ölçütler, analiz) karşılandı.
- **Dayanak:** `docs/ARASTIRMA.md` §6.8 (A5 sonuçları) ve §7.1 (Ay 1 hedefleri: ≥600 madde, kaynak metin modu, ≥2 öğretmen etiketleyici, ön kayıt).

## 1. Soru ve gerekçe

A5 (19–20 Ekim 2026) yalnız **kazanım modunda** ölçüldü. 225 ÇSS etiketlendi ve etiketleyicilerin hepsi yapay zekâydı (ARASTIRMA §6.8, §8.2). A5'in manşet bulgusu: A1 (bağımsız çözüm, istem sürüm 2) ile A2 (sayısal hesap) denetimleri birlikte, "yanlış" anahtarlı ÇSS'lerin **%77,7**'sini yakaladı [%95 GA 60,6–98,4]. Yanlış alarm oranı **%5,3** [2,6–8,4] idi. Aralık geniştir ve sıcaklık 0,2 tabakasının gürültüsüne duyarlıdır.

A6 bu bulguyu üç yönden sınar:
1. **Tekrar:** daha büyük bir örneklemde yakalama A5 düzeyinde kalıyor mu?
2. **Yeni mod:** öğretmenin verdiği kaynak metinle üretimde (ürünün asıl kullanım biçimi) durum ne?
3. **İnsan etiketi:** etiketleri yapay zekâ değil, öğretmenler koyar.

**Soru:** Llama-3.3-70b'nin kazanım modunda ve kaynak metin modunda ürettiği ÇSS'lerde, A1v2 ∪ A2 denetimi yanlış cevap anahtarlarını ne oranda yakalıyor? Yanlış alarm oranı nedir? Bu oranlar A5'te ölçülen düzeyin altına düşüyor mu?

## 2. Hipotezler

Tüm oranlar **insan etiketine** göre hesaplanır (§6).

- **H1 (birincil, eşdeğer-altı olmama):** İki modun birleşik örnekleminde, A1v2 ∪ A2'nin "yanlış" anahtarlı ÇSS'leri yakalama oranının %95 GA **alt sınırı > %77,7 − δ**.
  - δ (eşdeğerlik payı) = **15 puan**; eşik **%62,7**.
  - **Karar: δ = 15 (müdür, 6.11; gerekçe: δ=10 ile güç %46–56, δ=15 ile ≈%80).** Ayrıntı §5.
  - **H0:** yakalama oranı ≤ %77,7 − δ.
- **H2 (ikincil, yönlü):** Kaynak metin modunda "yanlış" anahtar oranı kazanım modundan **düşüktür**.
  - Gerekçe: modelin dayanacağı bir metin vardır.
  - Ölçüt: fark (kaynak − kazanım) ve %95 GA. GA üst sınırı < 0 ise H2 desteklenmiş sayılır.
- **H3 (ikincil, üst sınır):** A1v2 ∪ A2'nin yanlış alarm oranının %95 GA **üst sınırı ≤ %10**.
  - Yanlış alarm, anahtarı "doğru" etiketlenen ÇSS'lerde bayrak çıkması demektir.
  - Referans: A5'te %5,3, üst sınır 8,4.
- **Keşifsel (hipotez değil, yalnız betimsel):** mod başına yakalama oranı, ders kırılımı, sınıf kırılımı ve A1 ile A2'nin ayrı ayrı katkısı. Bu sayılardan sonuç **iddia edilmez**.

## 3. Tasarım

| | Sabit |
|---|---|
| Model | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (üretim modeli). Yedek model **kapalı** (`AI_FALLBACK_PROVIDER` boş), yani sonuç saf tek model |
| Sunucu kodu | Koşumdan önce sabitlenen bir commit `[SHA]`. Bu commit'ten yalıtılmış `git worktree` ile servis edilir. Koşum süresince `src/` değişmez |
| Sıcaklık, `max_tokens` | Ürünün bu commit'teki ayarı `[değer, koşum öncesi koddan okunup yazılır]` |
| Soru üretim istemi | Sürüm `[n]`; A1 çözücü istemi sürüm 2 (`meta.cozucuIstemSurumu`) |
| Çağrı başına istek | Kazanım başına **2 ÇSS + 1 açık uçlu** (A5 ile aynı). Açık uçlular bu ölçümde etiketlenmez; yalnız sayılır |
| Denetimler | A1 (bağımsız çözüm, v2) ve A2 (sayısal hesap) sunucunun kendi kodundan. A3 raporlanır, hipoteze girmez |

**İki mod (tek değişken):**
- **Kazanım modu** (`mode: "kazanim"`): yalnız kazanım kodu, kazanım metni ve ders/sınıf gönderilir.
- **Kaynak metin modu:** aynı kazanımlar, ayrıca o kazanıma uygun bir kaynak metin (≤ 6.000 karakter) gönderilir.

**Kaynak metinlerin kökeni:**
- Ekip yazar ya da kaynak metin açık lisanslıdır (CC BY / kamu malı) ve kaynağı kaydedilir.
- **MEB ve yayınevi ders kitabı metinleri kullanılmaz.** Bu metinler açık sete giremez (ARASTIRMA §7.1, Lisans).
- Her metin üretimden önce dondurulur ve SHA-256'sı `[a6-set dosyası]`na yazılır.

## 4. Örneklem

**Set (`tools/olcum/set-a6.json`, koşumdan önce dondurulur):**
- **55 kazanım.** 5, 6 ve 7. sınıflardan; Türkçe, Matematik, Fen Bilimleri ve Sosyal Bilgiler dersleri.
- Kazanımlar `public/mufredat` kataloğundan **tohumlu** (20261106) tabakalı rastgele seçimle alınır. Tabakalar ders × sınıftır; tabaka başına sayı `[tablo]`.
- Yalnız yazılı sınava uygun kazanımlar alınır.
- A5'in 18 kazanımı da havuzda kalır. Çakışma sayısı raporlanır.

**Üretim planı:**
- Her kazanım × mod için **3 tekrar**.
- 55 × 2 mod × 3 = **330 üretim çağrısı**.
- A5 oranıyla (392 ÇSS / 216 çağrı = 1,81 ÇSS/çağrı) beklenen sonuç **≈ 597 ÇSS** ve ≈ 330 açık uçlu sorudur.

**Birim ve analiz kümesi:**
- **Madde = ÇSS.** "600 madde" hedefi ÇSS sayısıdır.
- Tekrar edilen gövdeler (`TKR-GOVDE`) sunucuda zaten elenir.
- Dönen ÇSS'lerin **hepsi** etiketlenir; A5'teki gibi tabakalı alt örnekleme ve ağırlıklandırma **yoktur**. Analiz kümesi tamdır.

## 5. Güç gerekçesi

H1'in birimi, insan etiketinde **"yanlış" anahtarlı ÇSS**'lerdir. Bu ÇSS'lerin sayısını taban oran belirler. A5 taban kümesinde "yanlış" oranı A modeli için 3/32 (%9), B modeli için 5/36 (%14) idi. 600 ÇSS'de bu, beklenen **≈ 55–85 "yanlış" madde** demektir.

Normal yaklaşımla, gerçek yakalama oranının A5 düzeyinde (%77,7) olduğu varsayıldığında tek yönlü α = 0,025 için güç:

| "Yanlış" madde sayısı | δ = 10 (eşik %67,7) | δ = 15 (eşik %62,7) |
|---:|---:|---:|
| 60 | ≈ %46 | ≈ %80 |
| 78 | ≈ %56 | ≈ %89 |
| 136 | ≈ %80 | ≈ %99 |

- Hesap: SE = √(0,777·0,223/n), güç = Φ(δ/SE − 1,96).
- **Bu bütçeyle δ = 10 savunulamaz.** δ = 10 için %80 güç ≈ 136 "yanlış" madde ister, yani ≈ 1.000–1.500 ÇSS.
- **Karar (müdür, 6.11): δ = 15 ve en az 60 "yanlış" madde.**
- Aynı nedenle mod başına H1 testi yapılmaz; mod kırılımı keşifseldir.
- H2 için güç hesabı yapılmadı. Bir mod farkını yakalamak için örneklem küçüktür. H2'de "fark gösterilemedi" sonucu "fark yok" diye **yorumlanmaz**.

## 6. Etiketleme protokolü

**Etiketleyiciler:**
- En az **2 öğretmen** (ARASTIRMA §7.1); ilgili dersin branş öğretmeni olmalılar.
- Öğretmen onam metni: `docs/kvkk/OGRETMEN-ONAM-TASLAK.md`.
- Etiketleyiciler model, mod, tekrar ve denetim bayrağını **görmez**.

**Araç: `tools/etiket/`**
- ⚠️ Araç **henüz depoda yok**; A6'dan önce yazılmalı. Gerekenler:
  - Kör sunum: yalnız kazanım, soru gövdesi, şıklar ve modelin işaretlediği anahtar gösterilir. Kaynak metin modunda kaynak metin de gösterilir, çünkü anahtar ona göre değerlendirilir.
  - Sıra tohumlu karıştırılır ve etiketleyici başına farklıdır.
  - Madde kimliği opaktır (`K###`). Eşleme dosyası ayrı tutulur ve etiketler commit'lenene kadar açılmaz (A5'teki `etiket-esleme.json` yöntemi).
  - Etiketleyici "doğru şık bence şu" alanını doldurur. Bu alan, anahtar dışındaki doğruyu kayda geçirmek içindir.
  - Çıktı etiketleyici başına JSON'dur. Her oturum sonunda commit'lenir.

**Etiket şeması:**
- Üç sınıf: **doğru / yanlış / belirsiz**. Tanımlar `docs/olcum/OZET.md` §2'deki gibidir. "Belirsiz" dört durumu kapsar: birden çok savunulabilir doğru, eksik veri, kök yok ya da tutarsız kurgu.
- Etiketleyici ayrıca isteğe bağlı olarak `HATA_TAKSONOMISI.md` kodlarını işaretler: `KZN-DISI`, `GRK-TUTARSIZ` vb.

**Kalibrasyon:**
- Etiketlemeden önce 20 maddelik bir alıştırma seti kullanılır. Set A5 maddelerinden seçilir ve analize **girmez**.
- Etiketleyiciler tanımlar üzerinde anlaşır ve bu not commit'lenir.

**Paylaşım ve uyum:**
- Her ÇSS'yi bir öğretmen etiketler. Rastgele **%25**'i (≈150 madde) ikinci öğretmene de verilir.
- İnsan–insan uyumu için Cohen κ ve %95 GA raporlanır.
- Çakışmalar üçüncü bir kişiyle `[kim?]` uzlaşı toplantısında çözülür. Analizde uzlaşı etiketi kullanılır.
- **İkincil:** aynı 150 madde yapay zekâ etiketleyiciye (Claude, A5 yöntemi) de verilir. İnsan–YZ κ raporlanır. YZ etiketi hiçbir birincil hesapta kullanılmaz.

**Süre tahmini:** madde başına ≈ 1,5–2 dk. 600 + 150 madde ≈ 19–25 öğretmen-saati eder.

## 7. Ölçütler

**Birincil:**
- Tanım: A1v2 ∪ A2 **yakalama (yanlış)** = bayraklı "yanlış" ÇSS sayısı ÷ "yanlış" etiketli ÇSS sayısı.
- Kapsam: iki mod birleşik.

**İkincil:**
1. A1v2 ∪ A2 **yanlış alarm** = bayraklı "doğru" ÇSS ÷ "doğru" ÇSS (H3).
2. "Yanlış" anahtar oranı, mod başına; ayrıca fark (H2).
3. Yakalama (kusurlu) = bayraklı (yanlış ∪ belirsiz) ÷ (yanlış ∪ belirsiz).
4. Hiçbir uyarı almadan geçen kusurlu ÇSS sayısı. Bu, araştırma sorusunun ikinci yarısının ölçüsüdür.
5. İnsan–insan κ ve insan–YZ κ.

**Betimsel:** ders, sınıf ve mod kırılımı. A1 ve A2 ayrı ayrı. A3. Taksonomi kodlarının sıklığı.

## 8. Analiz planı

- **Oranlar:** nokta tahmin + Wilson %95 GA.
- **Kümelenme duyarlılığı:** aynı kazanımdan gelen ÇSS'ler bağımsız değildir. Bu yüzden ek olarak **kazanım düzeyinde küme bootstrap** yapılır (10.000 tekrar, tohum 20261106, yüzdelik yöntemi).
- **H1 kararı:** H1 kararı küme bootstrap alt sınırına göre verilir. Bu iki yöntemden tutucu olanıdır. İki yöntem farklı karar verirse bu raporlanır.
- **H2:** iki oran farkı. Küme bootstrap ile %95 GA hesaplanır; kazanım çiftleri eşleştirilmiş olarak yeniden örneklenir.
- **Dışlama:**
  - API/sistem hatası veren üretim çağrıları yeniden koşulur ve sayılır. Model hatası (geçersiz JSON, 502) yeniden koşulmaz, sayılır.
  - A1 ya da A2 bir ÇSS'de hata verirse o ÇSS denetim ölçütlerinden çıkar, sayısı raporlanır. Bu oran %5'i aşarsa sonuç "kararsız" sayılır.
  - Etiketleyicinin "değerlendiremedim" dediği maddeler uzlaşıya gider. Uzlaşıda da karar çıkmazsa "belirsiz" sayılır.
- **Betik:** `tools/olcum/a6-analiz.mjs` `[yazılacak]`. Betik, etiketler açılmadan önce sahte (rastgele) etiketle kuru koşturulur ve commit'lenir.
- **Raporlama:** her sayı bir PROGRESS bölümüne bağlanır. Tutmayan hipotezler de yazılır. Sonuçlar ARASTIRMA §6'ya yeni bir alt bölüm olarak eklenir; A5 sayıları değiştirilmez.

## 9. Durdurma kuralı

1. **Sabit N:** 330 üretim çağrısının hepsi koşulur. Etiketler bitmeden yakalama oranı **hesaplanmaz** ve ara analiz yapılmaz.
2. **Tek uzatma:** etiketleme bittiğinde "yanlış" madde sayısı **< 60** ise bir kez uzatma yapılabilir.
   - Uzatma: aynı 55 kazanım × 2 mod × 1 tekrar, yani +110 çağrı ≈ +200 ÇSS.
   - Uzatma kararı **yalnız sayıya** bakılarak verilir; yakalama oranı görülmeden. Karar sapma kaydına yazılır.
   - Uzatmadan sonra da sayı 60'ın altında kalırsa H1 "yetersiz güç" olarak raporlanır.
3. **Günlük durdurma:** o günün bütçesi dolarsa (§10) ya da `3036`/`429` dönerse o gün durulur. Kalan çağrılar sıradaki güne kayar. Bu bir sapma sayılmaz.
4. **Tüm ölçümü durdurma:** model sürümü değişirse ya da kaldırılırsa (Cloudflare duyurusu) koşum durur. Koşulan kısım ayrı raporlanır ve sapma kaydına yazılır. Sunucu commit'i koşum ortasında değişirse de aynı kural uygulanır.

## 10. Neuron bütçesi ve gün bölme

**Bütçe sınırları:**
- **Günlük tavan:** bu ölçüm için günde **≤ 8.000 Neuron**.
  - Ücretsiz plan sınırı 10.000'dir; ürünün kendi bütçe eşiği 9.000'dir (`/api/ai/butce`).
  - Demo ve öteki işler aynı havuzu kullanır. O günkü diğer tüketim biliniyorsa tavan buna göre düşürülür.
- **Gün sınırı:** sayaç 00:00 UTC'de (03:00 TR) sıfırlanır.
- **Her gün başlamadan önce:** o günkü tüketim `/api/ai/butce` ve Cloudflare panelinden okunur ve günlüğe yazılır.

**Üretim başına maliyet** (A1 çözücü çağrıları dahil): **280–1.055 Neuron**.
- Alt değer A5'in ortalamasıdır: ≈60.430 Neuron / 216 çağrı ≈ 280. Bu bir üst sınır tahminidir, çünkü pencere başka çağrıları da içeriyor olabilir.
- Üst değer, ölçülmüş tek bir turdur: ≈1.055 Neuron (PROGRESS §19).
- Gerçek değer, koşumdan önce 5 çağrılık ölçümle daraltılır. Ölçüm `usage` alanından yapılır ve bu ölçüm analize **girmez**.

| | Alt (280) | Üst (1.055) |
|---|---:|---:|
| 330 çağrı toplam | ≈ 92.400 Neuron | ≈ 348.150 Neuron |
| **Gün sayısı (toplam ÷ 8.000)** | **12** | **44** |
| Günde tam çağrı (8.000 ÷ maliyet, aşağı yuvarlı) | 28 | 7 |
| Gün sayısı, çağrılar bölünemediği için | 12 | 48 |
| Gün sayısı, mod çifti aynı gün kuralıyla (günde 14 / 3 çift) | 12 | 55 |
| Uzatma (+110 çağrı, toplam ÷ 8.000) | +4 gün | +15 gün |

**Dürüstlük notu:** 12–44 gün aralığı Neuron toplamının 8.000'e bölünmesidir. Üst maliyette
gerçek takvim daha uzundur: çağrılar bölünemez (48 gün) ve mod çifti aynı güne konur (55 gün).
Koşum öncesi 5 çağrılık ölçüm maliyeti daraltınca takvim yeniden hesaplanır.

**Gün bölme:**
- 330 çağrı tohumlu (20261106) karıştırılır.
- Eşleştirme birimi **(kazanım, tekrar) çiftidir**: aynı kazanımın aynı tekrarındaki kazanım modu ve kaynak metin modu çağrısı **aynı gün** koşulur. Böylece mod karşılaştırması gün etkisiyle bozulmaz (§92'deki eşleştirme ilkesi). Bütçe yalnız çift aralarında uygulanır.
- Blok listesi koşumdan önce `--kuru` ile üretilir ve commit'lenir.
- Her çağrının günü, saati ve `usage` değeri ham kayda yazılır.

**Para karşılığı:** aşan kısım ücretli plana geçilirse $0,011 / 1.000 Neuron. 348 bin Neuron ≈ 3,8 $. Ücretsiz planda kalınırsa maliyet sıfırdır; bedeli takvimdir (12–44 gün).

## 11. Sınırlılıklar (önceden bilinen)

- Tek model ailesi (Meta Llama), hem üretici hem çözücü olarak. İlişkili hata riski ölçülmez.
- Kaynak metinleri ekip yazıyor. Gerçek öğretmen metinlerinden daha "temiz" olabilirler.
- Etiketleyici sayısı küçük (2 öğretmen). κ yüksek çıksa da ortak yanılgı dışlanamaz.
- Yakalama oranı, insan etiketinin doğru olduğu varsayımına dayanır. Altın standart değil, **uzlaşı etiketidir**.
- Sonuç bu model, istem ve commit için geçerlidir. Model sürümü değişirse yeniden ölçüm gerekir.

## 12. Kayıt ve sapma kaydı

- **OSF/Zenodo kaydı:** `[DOI / URL — henüz yok]`
- **Kayıt zaman damgası:** `[—]`
- **Sunucu commit'i:** `[—]`
- **İlk model çağrısı:** `[—]`. Bu zaman, kayıt damgasından **sonra** olmalı.

### Sapmalar

_(Henüz yok. Kayıttan sonraki her değişiklik buraya tarihli olarak eklenir; yukarıdaki metin değiştirilmez.)_
