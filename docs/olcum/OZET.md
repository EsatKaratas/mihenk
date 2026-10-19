# Mihenk ölçümü — ilk gerçek koşum (19 Ekim 2026) · ÖN BULGU

> **Bu bir ön bulgudur.** Model başına yalnızca 18 kazanım ve tek bir koşum var
> (sıcaklık 0,5). Cevap anahtarı kontrolünü **bir YZ asistanı (Claude) yaptı,
> insan alan uzmanı değil**. Kontrolün kendisi de yanılabilir. Bağımsız ikinci
> kontrol (kör) sürüyor: [`anahtar-kor-kontrol.json`](./anahtar-kor-kontrol.json).
> Sonuç gelince bu sayılar güncellenecek. Eşik, otomatik onay ya da kalibre
> edilmemiş sabit **eklenmedi**.

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

## 6. Sınırlar — okurken akılda tutulacaklar

- **N küçük, tek koşum, tek sıcaklık.** Model başına 25-26 MEB ÇSS. Model
  farkları (A %32 / B %19 yanlış anahtar) bu N'de güven aralığı geniş bir
  gözlemdir, "B daha iyi" sonucu **çıkarılmaz**.
- **Kontrolü bir YZ yaptı.** Kör ikinci kontrol 37 maddede sürüyor (31
  sorunlu + 6 rastgele "doğru"). Uyuşmazlıklar ayrıca raporlanacak.
- **Kazanım modu en zor koşul.** Kaynak metinli üretimde oranlar farklı
  olabilir (§46.2'de metin dönüşümü açıkça verince hata kaybolmuştu).
- **Açık uçlu sorular** için cevap anahtarı/rubrik kontrolü yapılmadı.
- `GVD-YINELEME` ve `GVD-KALIP` için betikteki aday işaretleyici zayıf çıktı
  (elle 9 yineleme bulundu, aday 0). Elle sayılar esas alındı.
- Ölçüm koşulları: yerel `wrangler dev`, Workers AI uzak çağrı, aynı hesap.
  Canlı (`mihenk.bies.workers.dev`) ölçülmedi.
