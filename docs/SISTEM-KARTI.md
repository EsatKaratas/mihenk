# Mihenk — Sistem Kartı

> Model kartı yapısında (Mitchell ve ark., 2019, <https://arxiv.org/abs/1810.03993>)
> ve AB YZ Yasası Md. 13(3)'teki "kullanım talimatı" başlıklarıyla yazıldı.
> AB Yasası Türkiye'de bağlayıcı değildir; burada yalnız referans çerçevesidir
> ([UYUM-TABLOSU.md](./UYUM-TABLOSU.md) §3). Sürüm: 7 Kasım 2026, taban `2c4f3a9`
> (PROGRESS §123; §130'da güncellendi). Canlı sürüm: Version `fcd867ef` (7 Kasım, PROGRESS §130).
> Her sayının kaynağı satırında yazılıdır. Kaynağı yazılmamış sayı yoktur;
> ölçülmeyen şey "ölçülmedi" diye geçer.

## 1. Amaç

Ortaokulda (5–8. sınıf) öğretmenin üç işini hızlandırmak: **soru hazırlama**,
**açık uçlu yanıt okuma** ve **kazanım analizi**. Yapay zekâ yalnız öneri
üretir. Soruyu içerik uzmanı, puanı öğretmen onaylar (`agents.md` §1).
Kullanıcılar: içerik uzmanı, öğretmen, eğitim yöneticisi, öğrenci, veli.

## 2. Kapsam dışı kullanımlar

- **Notu tek başına belirlemek.** Onaysız puan öğrenciye ve veliye gitmez. Otomatik onay eşiği proje kuralıyla yasak (`agents.md` §1). MEB Tablo 1 C satırı da bunu ister ([UYUM-TABLOSU](./UYUM-TABLOSU.md) §2).
- LGS, OYSS ya da başka yerleştirme kararı. Sınıf geçme, disiplin, burs gibi yüksek etkili kararlar (MEB §2.6).
- Öğrenciyi seviye grubuna ayırmak ya da BEP tanısı koymak. "Risk listesi" bir tahmin değil, bir özettir (README §2).
- Ortak yazılı sınavda okullar ya da şubeler arası karşılaştırma. Ürün bunu kendiliğinden dışarıda tutar (§119, ÖDSGM 11.09.2025 yazısı md. 11).
- Hile tespiti. Sınav bütünlüğü kaydı yalnız bağlamdır, puanı etkilemez (README §11.2).
- Çok kullanıcılı ya da çok cihazlı kullanım. Kimlik doğrulama yok, ürün tek tarayıcıda çalışır (README §9).

## 3. Model ayrıntıları

| | Değer | Kanıt |
|---|---|---|
| Birincil | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Cloudflare Workers AI) | `wrangler.demo.jsonc` `AI_MODEL` |
| Yedek | `@cf/meta/llama-4-scout-17b-16e-instruct` (aynı hesap, aynı Neuron havuzu) | `wrangler.demo.jsonc` `AI_FALLBACK_*`; `src/lib/ai.ts` `fallbackConfigured` |
| Bağımsız çözücü | Çapraz modda Scout bilerek seçilir (`/solve`) | §86 madde 2 |
| Eğitim | **Yapılmadı.** Hazır model istemlerle yönlendirilir | README "Sık sorulan iki soru"; `src/lib/prompts.ts` |
| İstemler | 7 istem (üretim, değerlendirme, rubrik, örnek yanıt, kavram yanılgısı, hizalama, çözüm). Hepsinde her çağrıda değişen sınır belirteci ve güvenlik bloğu var | `src/lib/prompts.ts`, `test/prompts-guvenlik.test.ts`, `test/cozucu.test.ts` |
| Sıcaklık / `max_tokens` | Değerlendirme 0,2 / 820. Çözüm 0,2 / 400. Rubrik 0,3 / 600. Üretim 0,5 / `700 + soru × 700`, tavan 5.600 | `src/routes/ai.ts`; `agents.md` güncellik notu |
| Çıktı doğrulama | Zod şeması. İstek başına en çok 3 gerçek model çağrısı (onarım ve yedek dahil) | §86, `test/guvenilirlik.test.ts` |

## 4. Girdiler ve çıktılar

| Uç (`/api/ai/…`) | Girdi | Çıktı (hepsi öneri) |
|---|---|---|
| `generate-questions` | Kaynak metin (≤ 6.000 karakter) ya da yönerge; ders, sınıf, kazanım | ÇSS ve açık uçlu taslak, çeldirici gerekçeleri, Bloom düzeyi |
| `evaluate` | Soru, rubrik, kazanım, **öğrenci cevabı (adlar maskeli)** | Ölçüt bazında puan, gerekçe, güven, geri bildirim taslağı, `injectionAttempt` |
| `rubric`, `sample-answers` | Soru, kazanım | Rubrik taslağı; sınıf simülasyonu için örnek yanıt |
| `misconceptions` | Soru, sınıfın cevapları (maskeli, izinsizler hariç) | Kavram yanılgısı kümeleri |
| `outcome-alignment`, `solve` | Soru, şıklar, kazanım listesi | Ölçüyor / kısmen / ölçmüyor; bağımsız çözüm |

Kaynak: README §11.1–11.2, §88 denetim tablosu. Öğrenci adı, numarası, sınıfı
ve okulu hiçbir gövdede yok (`test/kvkk-sunucu.test.ts`, `test/kvkk-ad-maske.test.ts`).

## 5. İnsan denetimi noktaları

1. **Soru onayı.** `ai_generated` → içerik uzmanı onaylar ya da reddeder. Red nedeni taksonomi koduyla kaydedilir (§104). Şüpheli soruda ikinci onay istenir ve Enter onaylamaz (README "İkinci tur"). Elle yazılan soru da aynı kapıdan geçer (§99).
2. **Puan onayı.** Öğretmen "Tek Tıkla Onayla" ya da "Puanı Güncelle ve Onayla" der; ölçüt ölçüt düzeltebilir (§112). Enjeksiyon işaretli cevapta tek tık çizilmez (§103).
3. **Geri bildirim.** Taslak "Nota Aktar" denmeden öğrenciye gitmez (README §11.2).
4. **Yayın.** "Sonuçları Öğrenciye Yayınla" ile yapılır. Karne ve veli kartı yalnız onaylı sonucu okur (§102).
5. **Kayıt.** Karar Günlüğü (§104, §104b, §107a) ve YZ Puanlayıcı Denetimi kartı (§121). Kart karar vermez; testte onay ya da yazma çağrısı 0.
6. **Veri izni.** Öğrenci başına "YZ: izin yok"; yeni öğrenci "rıza bekleniyor" ile başlar (§88b, §107b).
7. **Adsız puanlama** (isteğe bağlı): öğretmen kuyruğu "Yanıt N" olarak görür (§122).

## 6. Ölçümler ve bilinen sınırlar

| Ölçü | Değer | Kaynak |
|---|---|---|
| Anahtar doğruluğu, ilk ölçüm (kazanımdan, 25 ÇSS) | 12 doğru (%48), **8 yanlış**, 5 belirsiz | ARASTIRMA §6.2; `docs/olcum/PANO.md` |
| A5: kusurlu ÇSS tahmini | ≈146 (≈%37) | ARASTIRMA §6.8; PANO |
| Denetim yakalaması (A1 v2 ∪ A2), kusurlu / yanlış | %61,1 [51,2–74,6] / %77,7 [60,6–98,4]; yanlış alarm %5,3 | PANO |
| Uyarısız geçen kusurlu | ≈57 / 146 | PANO |
| "Doğru şık en uzun" denetimi (A3), yakalama | %0 (yanlış alarm %10,6) | PANO |
| Puanlama istemi A/B (gerekçe önce mi) | d = −0,018 [−0,042; 0,004], n = 48; fark gösterilemedi | §92; PANO |
| Birincil ve yedek modelin aynı yanıtlara puanı | Önceki yedek gpt-5.6-luna ~4 puan daha cömertti; sıralama ikisinde de doğruydu. **Bugünkü yedek Scout ile ölçülmedi** | PROGRESS §19 (26 Ağustos) |
| İstem enjeksiyonu | 5/5 savunuldu. Son ölçüm Ağustos 2026, sonra yeniden koşulmadı | §5, §16; `tools/injection-test.py` |
| Değerlendirme süresi | 6–12 sn (27 Ağustos); ücretsiz planda tek çağrı 7,6 sn (5 Kasım) | README "Canlıda ölçülen"; §85 |

**Etiketleyicilerin hepsi yapay zekâdır** (Claude), insan alan uzmanı değil.
κ değerleri aynı model ailesinin iki oturumunun uyumudur (PANO başlığı).
Ölçülmeyenler:
- öğrenci gruplarına göre performans;
- gerçek sınıfta öğretmen–YZ uyumu (demodaki QWK 0,98 ekibin yazdığı örnek veriden gelir, §123);
- öğretmene zaman kazancı.

Diğer sınırlar:
- Tek cihaz. Kimlik doğrulama yok.
- Karar Günlüğü en çok 500 kayıt tutar (`AUDIT_LIMIT`).
- Maskeleme sınıf listesinde olmayan adı yakalamaz (§88).
- Kaynak metin maskelenmez (`veri-nereye-gider.html` §3).

## 7. İzlemede yakalanan yanlılık ve hata örnekleri, yapılan düzeltme

| # | Ne görüldü | Nasıl yakalandı | Düzeltme |
|---|---|---|---|
| 1 | Öğrenciye gidecek geri bildirim taslağına CJK karakteri sızdı | Ölçüm | Dil denetimi değerlendirme çıktısına da eklendi, testle kilitlendi (README "Son değişiklikler", §45) |
| 2 | Canlıda üretilen `phứcekli` (Vietnamca `ứ`) uyarısız geçti | Canlı kullanım | Denetlenen karakter aralığı genişletildi (§48) |
| 3 | "necessário" uyarısız geçti. Ölçüm: 782 soru ve 621 gerekçede 4 gerçek sızıntı; eski kural 1'ini, yeni kural 4'ünü yakalıyor | Canlı + geriye dönük tarama | Latin-1 aksanları ve ayrık işaretler eklendi. İnsan yazımı Türkçede yanlış alarm 0 (README "İkinci tur") |
| 4 | Dil uyarısının **hangi sözcükten** çıktığı görünmüyordu, uyarı tanılanamıyordu | 24 Ekim canlı | Tetikleyen sözcük gösteriliyor: "Türkçe olmayan: luôn" (§84) |
| 5 | Aksansız yabancı sözcük listesi denendi: Türkçeyle çakışan 58 sözcük 1.942 yanlış alarm verdi | Ölçüm | **Eklenmedi**; dürüst sınır olarak yazıldı (README "İkinci tur") |
| 6 | O günkü yedek model (gpt-5.6-luna) aynı yanıtlara ~4 puan daha cömert puan verdi; D yanıtına llama 0, luna 3,5 | "ChatGPT cıvık" gözlemi ölçüldü (§19, 26 Ağustos) | Yedek yalnız gerçek arızada devreye girer; rozet hangi modelin yanıtladığını yazar (README §3.1). Bugünkü yedek Scout ile bu karşılaştırma yapılmadı |
| 7 | Yönetici ekranı sınavı herkese atanmış sayıyordu; sınava girme hakkı olmayan öğrenci adıyla "girmemiş" görünüyordu | Bağımsız doğrulama | Atama sınavın hedef sınıfına göre yapılıyor (README "İkinci tur") |
| 8 | Ortak yazılı sınavda şubeler yan yana karşılaştırılıyordu (MEB yazısına aykırı) | §119 ölçümü | Ortak sınav şube karşılaştırmasından çıkarıldı (`test/meb-ortak-sinav.test.ts`) |

Puanlayıcıdaki uzunluk yanlılığını izlemek için §121'de Spearman ρ (yanıt
uzunluğu ile YZ − öğretmen farkı) eklendi. Gerçek sınıf verisiyle henüz
ölçülmedi.

## 8. Veri akışı

[`public/veri-nereye-gider.html`](../public/veri-nereye-gider.html) ile aynıdır:
- **Tarayıcıda kalanlar:** öğrenci listesi, sınavlar, cevaplar, puanlar, Karar Günlüğü, kitaplık. Mihenk'in veritabanı yok.
- **Yapay zekâya gidenler:** tarayıcı → Mihenk Worker (`/api/ai/…`) → Cloudflare Workers AI (ABD). Bu yurt dışına aktarımdır.
  - Kaynak metin maskelenmez.
  - Öğrenci cevabı maskelenir.
  - Puan önerisi isteği öğrenci sınavı bitirince kendiliğinden gider; izinsiz öğrencinin cevabı gitmez.
- **Sunucu kaydı (Workers Logs):** uç, model, istem uzunluğu, `maxTokens`, süre. İstek gövdesi saklanmaz.
- **Demo alanı** ayrı kayıtta çalışır ve yapay zekâya hiç istek göndermez (§120).

## 9. Kota ve maliyet

| | Değer | Kaynak |
|---|---|---|
| Plan | Cloudflare **ücretsiz** plan. Workers Paid 26 Ekim 2026'da bitti; ödeme yapılmaz | §85 |
| Günlük havuz | 10.000 Neuron. Ürün eşiği **9.000** (`AI_GUNLUK_NEURON_ESIGI`); sıfırlanma 00:00 UTC = 03:00 TR | §85, §93 |
| Adres başına | Günde 60 model çağrısı; dakikada en çok 60 istek. Aynı belge, soru ya da kazanım için dakikada 5 istek; değerlendirmede 45; üretim ayrıca adres başına dakikada 10 | §86, §129; `src/lib/guards.ts` (`RATE_LIMIT_PER_MIN`, `RATE_LIMIT_EVAL_PER_MIN`, `RATE_LIMIT_IP_PER_MIN`, `RATE_LIMIT_GEN_ADRES_PER_MIN`) |
| Adres başına Neuron payı | Günde **4.500 Neuron** (eşiğin yarısı; `AI_IP_NEURON_PAYI`, 1–10.000). Tek adres havuzun yarısından fazlasını alamaz; aşılırsa 429 `adres_payi`. IPv6 adresler **/64 önekiyle** sayılır. `/api/ai/*` POST gövdesi en çok 256 KB (fazlası 413) | §129; `src/lib/gunluk-sinir.ts`, `src/lib/adres.ts`, `test/butce-saglamlik.test.ts`. Sınır: birden çok adresi olan biri havuzu yine bitirebilir (Turnstile yok) |
| Çağrı başına Neuron | **Ölçüldü (§97):** canlıda tek kısa, 2 ölçütlü değerlendirme = **98 Neuron**. Uygulamanın sayacı Cloudflare analitiğiyle birebir aynı (98 = 98); Workers AI bağlaması `usage` döndürüyor. Kapasite hesabındaki 110 sabiti temkinli tarafta bırakıldı (3 ölçütlü, uzun yanıtlar biraz daha pahalı). Üretim ≈400 (ortalama), en kötü üretim isteği ≈4.250 (§86, ölçüm değil hesap) | §97, §86 |
| Kapasite (hesap) | 9.000 / 110 ≈ **81 açık uçlu değerlendirme/gün**, yalnız puanlama yapılırsa | §100 sihirbaz ön hesabıyla aynı formül; bir tahmindir, ölçülmedi |
| Kota dolunca | Yapay zekâ düğmeleri kapanır, elle soru, elle puanlama ve analiz sürer; sessiz yedek yok | §100, §119 |
| Para maliyeti | 0 TL (ücretsiz plan). Ücretli plana geçilirse fiyat Cloudflare sayfasından yeniden hesaplanmalı | §85, §93 |

**Yedek, kotaya karşı korumaz:** iki model aynı havuzdan harcar (README §3.1).
