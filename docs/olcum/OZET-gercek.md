# Mihenk ölçüm özeti — GERÇEK KOŞUM

Üretildi: 2026-10-19T05:08:57.757Z · `node tools/olcum/ozet.mjs --etiket gercek`
Taksonomi: docs/HATA_TAKSONOMISI.md v0.1 · Elle kontrol: Claude (Opus 5.5, Mihenk Worker 5) ile elle kontrol — insan uzman DEĞİL

## 2026-10-19-llama-3.3-70b-instruct-fp8-fast-gercek-deneyap · Deneyap

Model (sunucu): `@cf/meta/llama-3.3-70b-instruct-fp8-fast` · tarih 2026-10-19 · set set-v1.1 · betik `bfbfd2d+degisiklik`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 5 (HTTP 200: 5, hata: 0) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 0 |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 5 / 5 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 0 |
| Süre (sn) ort · en kısa · en uzun · toplam | 20.5 · 13.3 · 36.3 · 103 |
| İstenen soru (başarılı çağrılarda) | 15 (ÇSS 10, açık 5) |
| Kullanıcıya dönen | 8 (ÇSS 6, açık 2) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 7 / 15 (%46,7) | istenen soru |
| `TKR-SIK` | ele | 0 / 15 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 15 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 6 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 0 / 6 (%0,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 8 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | 30 / 30 (%100,0) (meta.sadelestirilenGerekce / toplamGerekce, tekrar elemesinden önce; 5 çağrı) | ham gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 0 / 8 (%0,0) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 4 / 8 (%50,0) | ÇSS: 3 / 6 (%50,0) · açık: 1 / 2 (%50,0) · ort 40,6 kelime |
| `GVD-KALIP` adayı (yarı) | 0 / 8 (%0,0) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 8 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 3 / 5 (%60,0) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 15 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 5 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 18 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

Elle bakılan: 6 soru (ÇSS 6). Oranların paydası yalnızca bakılan sorulardır.

| Kod | Sayı / bakılan |
|---|---|
| Cevap anahtarı DOĞRU (ÇSS) | 4 / 6 (%66,7) |
| Cevap anahtarı YANLIŞ (`ANH-OLGU`, `ANH-BIRIM` dahil) | 0 / 6 (%0,0) |
| Cevap anahtarı belirsiz / birden çok doğru | 2 / 6 (%33,3) |
| `GRK-GENEL` | 1 / 6 (%16,7) |
| `GVD-TEKADIM` | 4 / 6 (%66,7) |
| `GVD-VERIFAZLA` | 1 / 6 (%16,7) |
| `GVD-YINELEME` | 2 / 6 (%33,3) |
| `KZN-DISI` | 1 / 6 (%16,7) |

## 2026-10-19-llama-3.3-70b-instruct-fp8-fast-gercek-mebsayac · MEB

Model (sunucu): `@cf/meta/llama-3.3-70b-instruct-fp8-fast` · tarih 2026-10-19 · set set-v1.1 · betik `cd91a6d+degisiklik`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 3 (HTTP 200: 3, hata: 0) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 0 |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 3 / 3 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 0 |
| Süre (sn) ort · en kısa · en uzun · toplam | 20.5 · 13.8 · 25.3 · 61 |
| İstenen soru (başarılı çağrılarda) | 9 (ÇSS 6, açık 3) |
| Kullanıcıya dönen | 6 (ÇSS 4, açık 2) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 2 / 9 (%22,2) | istenen soru |
| `TKR-SIK` | ele | 1 / 9 (%11,1) | istenen soru |
| `SIK-SAYI` | ele | 0 / 9 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 4 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 1 / 4 (%25,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 6 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | 12 / 18 (%66,7) (meta.sadelestirilenGerekce / toplamGerekce, tekrar elemesinden önce; 3 çağrı) | ham gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 0 / 6 (%0,0) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 3 / 6 (%50,0) | ÇSS: 2 / 4 (%50,0) · açık: 1 / 2 (%50,0) · ort 41,5 kelime |
| `GVD-KALIP` adayı (yarı) | 2 / 6 (%33,3) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 6 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 1 / 3 (%33,3) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 9 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 3 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 12 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

_Bu koşum için elle kontrol yok._

## 2026-10-19-llama-3.3-70b-instruct-fp8-fast-gercek · MEB

Model (sunucu): `@cf/meta/llama-3.3-70b-instruct-fp8-fast` · tarih 2026-10-19 · set set-v1.1 · betik `f61a628`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 16 (HTTP 200: 13, hata: 3) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 3 — FB.5.5.3, FB.6.2.3, T.Y.6.18 (yeniden koşuldu) |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 13 / 13 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 1 |
| Süre (sn) ort · en kısa · en uzun · toplam | 22.6 · 0.2 · 145.1 · 362 |
| İstenen soru (başarılı çağrılarda) | 39 (ÇSS 26, açık 13) |
| Kullanıcıya dönen | 37 (ÇSS 25, açık 12) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 2 / 39 (%5,1) | istenen soru |
| `TKR-SIK` | ele | 0 / 39 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 39 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 25 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 2 / 25 (%8,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 37 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | **ölçülemedi** — API yalnızca temizlik SONRASI gerekçeyi döndürüyor; ham çıktı yanıtta yok. Temizlik sonrası kalan: 0 / 75 (%0,0) | gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 3 / 37 (%8,1) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 24 / 37 (%64,9) | ÇSS: 17 / 25 (%68,0) · açık: 7 / 12 (%58,3) · ort 35,6 kelime |
| `GVD-KALIP` adayı (yarı) | 1 / 37 (%2,7) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 37 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 1 / 13 (%7,7) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 39 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 13 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 75 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

Elle bakılan: 25 soru (ÇSS 25). Oranların paydası yalnızca bakılan sorulardır.

| Kod | Sayı / bakılan |
|---|---|
| Cevap anahtarı DOĞRU (ÇSS) | 12 / 25 (%48,0) |
| Cevap anahtarı YANLIŞ (`ANH-OLGU`, `ANH-BIRIM` dahil) | 8 / 25 (%32,0) |
| Cevap anahtarı belirsiz / birden çok doğru | 5 / 25 (%20,0) |
| `ANH-OLGU` | 8 / 25 (%32,0) |
| `DIL-LATIN` | 1 / 25 (%4,0) |
| `GRK-GENEL` | 1 / 25 (%4,0) |
| `GRK-TUTARSIZ` | 7 / 25 (%28,0) |
| `GVD-TEKADIM` | 4 / 25 (%16,0) |
| `GVD-VERIFAZLA` | 1 / 25 (%4,0) |
| `GVD-YINELEME` | 7 / 25 (%28,0) |
| `KZN-DISI` | 6 / 25 (%24,0) |
| `SIK-ESANLAM` | 2 / 25 (%8,0) |
| `SNF-DISI` | 1 / 25 (%4,0) |

## 2026-10-19-llama-4-scout-17b-16e-instruct-gercek-deneyap · Deneyap

Model (sunucu): `@cf/meta/llama-4-scout-17b-16e-instruct` · tarih 2026-10-19 · set set-v1.1 · betik `bfbfd2d+degisiklik`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 5 (HTTP 200: 5, hata: 0) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 0 |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 5 / 5 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 0 |
| Süre (sn) ort · en kısa · en uzun · toplam | 39.3 · 35.3 · 48.6 · 197 |
| İstenen soru (başarılı çağrılarda) | 15 (ÇSS 10, açık 5) |
| Kullanıcıya dönen | 11 (ÇSS 9, açık 2) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 4 / 15 (%26,7) | istenen soru |
| `TKR-SIK` | ele | 0 / 15 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 15 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 9 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 0 / 9 (%0,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 11 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | 0 / 30 (%0,0) (meta.sadelestirilenGerekce / toplamGerekce, tekrar elemesinden önce; 5 çağrı) | ham gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 0 / 11 (%0,0) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 5 / 11 (%45,5) | ÇSS: 4 / 9 (%44,4) · açık: 1 / 2 (%50,0) · ort 38,5 kelime |
| `GVD-KALIP` adayı (yarı) | 1 / 11 (%9,1) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 11 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 3 / 5 (%60,0) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 15 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 5 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 27 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

Elle bakılan: 9 soru (ÇSS 9). Oranların paydası yalnızca bakılan sorulardır.

| Kod | Sayı / bakılan |
|---|---|
| Cevap anahtarı DOĞRU (ÇSS) | 3 / 9 (%33,3) |
| Cevap anahtarı YANLIŞ (`ANH-OLGU`, `ANH-BIRIM` dahil) | 1 / 9 (%11,1) |
| Cevap anahtarı belirsiz / birden çok doğru | 5 / 9 (%55,6) |
| `ANH-OLGU` | 1 / 9 (%11,1) |
| `GRK-TUTARSIZ` | 2 / 9 (%22,2) |
| `GVD-KALIP` | 2 / 9 (%22,2) |
| `GVD-TEKADIM` | 2 / 9 (%22,2) |
| `GVD-VERIFAZLA` | 1 / 9 (%11,1) |
| `KZN-DISI` | 1 / 9 (%11,1) |
| `SIK-ESANLAM` | 2 / 9 (%22,2) |

## 2026-10-19-llama-4-scout-17b-16e-instruct-gercek-mebsayac · MEB

Model (sunucu): `@cf/meta/llama-4-scout-17b-16e-instruct` · tarih 2026-10-19 · set set-v1.1 · betik `82fc014+degisiklik`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 3 (HTTP 200: 3, hata: 0) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 0 |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 3 / 3 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 0 |
| Süre (sn) ort · en kısa · en uzun · toplam | 36.5 · 28.5 · 44.5 · 110 |
| İstenen soru (başarılı çağrılarda) | 9 (ÇSS 6, açık 3) |
| Kullanıcıya dönen | 8 (ÇSS 5, açık 3) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 1 / 9 (%11,1) | istenen soru |
| `TKR-SIK` | ele | 0 / 9 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 9 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 5 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 0 / 5 (%0,0) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 0 / 8 (%0,0) | dönen soru |
| `GRK-KALIP` | düzelt | 6 / 18 (%33,3) (meta.sadelestirilenGerekce / toplamGerekce, tekrar elemesinden önce; 3 çağrı) | ham gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 0 / 8 (%0,0) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 7 / 8 (%87,5) | ÇSS: 5 / 5 (%100,0) · açık: 2 / 3 (%66,7) · ort 25,8 kelime |
| `GVD-KALIP` adayı (yarı) | 0 / 8 (%0,0) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 8 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 0 / 3 (%0,0) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 9 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 3 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 15 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

_Bu koşum için elle kontrol yok._

## 2026-10-19-llama-4-scout-17b-16e-instruct-gercek · MEB

Model (sunucu): `@cf/meta/llama-4-scout-17b-16e-instruct` · tarih 2026-10-19 · set set-v1.1 · betik `f61a628`

### Çağrılar

| Ölçü | Değer |
|---|---|
| Çağrı | 18 (HTTP 200: 13, hata: 5) |
| Ortam hatası (wrangler yeniden yükleme, 503) | 5 — MAT.7.1.7, MAT.8.1.1, T.Y.6.18, MAT.8.3.5, MAT.8.3.5 (yeniden koşuldu) |
| Sunucu/model hatası | 0 |
| Başarılı çağrısı olan kazanım | 13 / 13 |
| 429 (hız sınırı) beklemesi | 0 |
| Yedek modele düşen | 0 |
| Model içi yeniden deneme (attempts > 1) | 1 |
| Süre (sn) ort · en kısa · en uzun · toplam | 20.7 · 0.2 · 43.8 · 372 |
| İstenen soru (başarılı çağrılarda) | 39 (ÇSS 26, açık 13) |
| Kullanıcıya dönen | 37 (ÇSS 26, açık 11) |

### Otomatik sayılan kodlar (sunucu denetimi)

| Kod | Davranış | Sayı / payda | Payda |
|---|---|---|---|
| `TKR-GOVDE` | ele | 2 / 39 (%5,1) | istenen soru |
| `TKR-SIK` | ele | 0 / 39 (%0,0) | istenen soru |
| `SIK-SAYI` | ele | 0 / 39 (%0,0) | istenen soru |
| `ANH-GECERSIZ` | bayrak | 0 / 26 (%0,0) | dönen ÇSS |
| `GRK-TEKRAR` | bayrak | 1 / 26 (%3,8) | dönen ÇSS |
| `DIL-ALFABE` | bayrak | 1 / 37 (%2,7) | dönen soru |
| `GRK-KALIP` | düzelt | **ölçülemedi** — API yalnızca temizlik SONRASI gerekçeyi döndürüyor; ham çıktı yanıtta yok. Temizlik sonrası kalan: 0 / 78 (%0,0) | gerekçe |

### Otomatik sayılan kodlar (denetimden KAÇAN — sunucu işaretlemiyor, betik sayıyor)

| Kod | Sayı / payda | Not |
|---|---|---|
| `KYN-ATIF` | 2 / 37 (%5,4) | Kazanım modunda `needsSource` koşulsuz false yapılıyor; atıf yapan gövde bayraksız kalıyor |
| `GVD-KISA` (< 40 kelime) | 34 / 37 (%91,9) | ÇSS: 26 / 26 (%100,0) · açık: 8 / 11 (%72,7) · ort 25,7 kelime |
| `GVD-KALIP` adayı (yarı) | 2 / 37 (%5,4) | aday; karar elle |
| `GVD-YINELEME` adayı (yarı) | 0 / 37 (%0,0) | aday; karar elle |
| (taksonomide yok) açık uçlu istendi, hiç dönmedi | 2 / 13 (%15,4) çağrı | eleme ya da model; ham JSON'dan ayrıştırılır |
| (taksonomide yok) eksik üretim | 0 / 39 (%0,0) | model istenenden az soru döndürdü; meta'da sayacı YOK |
| (taksonomide yok) istenenden fazla tür | 0 / 13 (%0,0) çağrı | ör. 2 ÇSS istendi, 3 döndü |
| (taksonomide yok) eksik çeldirici gerekçesi | 0 / 78 (%0,0) | çeldirici |

### Elle etiketlenen kodlar

Elle bakılan: 26 soru (ÇSS 26). Oranların paydası yalnızca bakılan sorulardır.

| Kod | Sayı / bakılan |
|---|---|
| Cevap anahtarı DOĞRU (ÇSS) | 16 / 26 (%61,5) |
| Cevap anahtarı YANLIŞ (`ANH-OLGU`, `ANH-BIRIM` dahil) | 5 / 26 (%19,2) |
| Cevap anahtarı belirsiz / birden çok doğru | 5 / 26 (%19,2) |
| `ANH-OLGU` | 5 / 26 (%19,2) |
| `DIL-ALFABE` | 1 / 26 (%3,8) |
| `GRK-TUTARSIZ` | 3 / 26 (%11,5) |
| `GVD-KALIP` | 4 / 26 (%15,4) |
| `GVD-TEKADIM` | 6 / 26 (%23,1) |
| `GVD-VERIFAZLA` | 1 / 26 (%3,8) |
| `KZN-DISI` | 6 / 26 (%23,1) |

