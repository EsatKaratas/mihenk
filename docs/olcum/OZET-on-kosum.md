# Mihenk ölçüm özeti — ÖN KOŞUM

Üretildi: 2026-10-19T04:59:48.960Z · `node tools/olcum/ozet.mjs --etiket on-kosum`
Taksonomi: docs/HATA_TAKSONOMISI.md v0.1 · Elle kontrol: Claude (Opus 5.5, Mihenk Worker 5) ile elle kontrol — insan uzman DEĞİL

## 2026-10-19-llama-3.3-70b-instruct-fp8-fast-on-kosum · MEB

Model (sunucu): `@cf/meta/llama-3.3-70b-instruct-fp8-fast` · tarih 2026-10-19 · set set-v1 · betik `f52f838`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 14 (HTTP 200: 12, hata: 2) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 2 — MAT.7.1.7, FB.5.5.3 (yeniden koşuldu) |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 12 / 12 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 1 |
| Süre (sn) ort · en kısa · en uzun · toplam | 15.7 · 0.5 · 31.7 · 219 |
| İstenen soru (başarılı çağrılarda) | 36 (ÇSS 24, açık 12) |
| Kullanıcıya dönen | 31 (ÇSS 22, açık 9) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 5 / 36 (%13,9) | istenen soru |
| `TKR-SIK` | ele | 0 / 36 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 36 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 22 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 1 / 22 (%4,5) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 31 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | **ölçülemedi** — API yalnızca temizlik SONRASI gerekçeyi döndürüyor; ham çıktı yanıtta yok. Temizlik sonrası kalan: 0 / 66 (%0,0) | gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 2 / 31 (%6,5) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 19 / 31 (%61,3) | ÇSS: 15 / 22 (%68,2) · açık: 4 / 9 (%44,4) · ort 36,2 kelime |
| `GVD-KALIP` adayı (yarı) | 0 / 31 (%0,0) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 31 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 3 / 12 (%25,0) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 36 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 12 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 66 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

_Bu koşum için elle kontrol yok._

## 2026-10-19-llama-4-scout-17b-16e-instruct-on-kosum · MEB

Model (sunucu): `@cf/meta/llama-4-scout-17b-16e-instruct` · tarih 2026-10-19 · set set-v1 · betik `f52f838`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 15 (HTTP 200: 11, hata: 4) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 3 — MAT.6.4.1, MAT.8.1.1, T.Y.5.15 (yeniden koşuldu) |
| Sunucu/model hatası | 1 — T.Y.5.15: 502 ai_call_failed (Expected ',' or ']' after array element in JSON at position 378 (line 9 column 1) |
| Başarılı çağrısı olan kazanım | 11 / 12 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 3 |
| Süre (sn) ort · en kısa · en uzun · toplam | 30.3 · 2.2 · 53.7 · 455 |
| İstenen soru (başarılı çağrılarda) | 33 (ÇSS 22, açık 11) |
| Kullanıcıya dönen | 32 (ÇSS 22, açık 10) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 1 / 33 (%3,0) | istenen soru |
| `TKR-SIK` | ele | 0 / 33 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 33 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 22 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 0 / 22 (%0,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 1 / 32 (%3,1) | dönen soru |
| `GRK-KALIP` | düzelt | **ölçülemedi** — API yalnızca temizlik SONRASI gerekçeyi döndürüyor; ham çıktı yanıtta yok. Temizlik sonrası kalan: 0 / 66 (%0,0) | gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 1 / 32 (%3,1) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 26 / 32 (%81,3) | ÇSS: 19 / 22 (%86,4) · açık: 7 / 10 (%70,0) · ort 28,3 kelime |
| `GVD-KALIP` adayı (yarı) | 0 / 32 (%0,0) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 32 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 1 / 11 (%9,1) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 33 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 11 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 66 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

_Bu koşum için elle kontrol yok._

