# Mihenk ölçüm özeti — GERÇEK KOŞUM

Üretildi: 2026-10-19T04:59:48.902Z · `node tools/olcum/ozet.mjs --etiket gercek`
Taksonomi: docs/HATA_TAKSONOMISI.md v0.1 · Elle kontrol: Claude (Opus 5.5, Mihenk Worker 5) ile elle kontrol — insan uzman DEĞİL

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

