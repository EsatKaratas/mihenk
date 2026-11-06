# Puanlama deneyi — sonuç özeti (otomatik, tools/olcum/puanlama-analiz.mjs)

Ön kayıt: ON-KAYIT.md. Toplam deneme 96. Model @cf/meta/llama-3.3-70b-instruct-fp8-fast, sıcaklık 0,2.

| Ölçüt | A (points önce, üretim) | B (reason önce) |
|---|---|---|
| Deneme / sistem hatası | 48 / 0 | 48 / 0 |
| Şema geçerli — ilk deneme [Wilson %95] | 48/48 = 100,0% [92,6%–100,0%] | 48/48 = 100,0% [92,6%–100,0%] |
| Şema geçerli — yeniden denemeden sonra | 48/48 = 100,0% [92,6%–100,0%] | 48/48 = 100,0% [92,6%–100,0%] |
| Aralık dışı ham puan (kriter) [Wilson %95] | 0/144 = 0,0% [0,0%–2,6%] | 0/144 = 0,0% [0,0%–2,6%] |
| 0,5 katı olmayan ham puan | 0/144 = 0,0% [0,0%–2,6%] | 0/144 = 0,0% [0,0%–2,6%] |
| Manipülasyon: reason, points'ten önce | 0/144 = 0,0% [0,0%–2,6%] | 144/144 = 100,0% [97,4%–100,0%] |
| Normalize toplam hata (deneme ort.) | 0,104 | 0,086 |
| Kriter düzeyi normalize hata | 0,201 | 0,169 |
| Token (girdi / çıktı, çağrı) | 88031 / 14886 (48) | 88015 / 14512 (48) |

**Birincil (yanıt düzeyi, n = 48, eşleştirilmiş):** hata A 0,104 · B 0,086 · d = B − A = -0,018, bootstrap %95 GA [-0,042, 0,004]

**Duyarlılık (soru düzeyi, n = 6):** d %95 GA [-0,039, 0,002] — n küçük, yalnız betimsel.

| Soru | Hata A | Hata B | d |
|---|---|---|---|
| S1 | 0,131 | 0,131 | 0,000 |
| S2 | 0,100 | 0,088 | -0,012 |
| S3 | 0,125 | 0,144 | 0,019 |
| S4 | 0,125 | 0,063 | -0,063 |
| S5 | 0,094 | 0,063 | -0,031 |
| S6 | 0,050 | 0,031 | -0,019 |

| Profil (betimsel) | n | Hata A | Hata B |
|---|---|---|---|
| tam | 6 | 0,117 | 0,067 |
| kavram tam, uygulama kısmi | 1 | 0,050 | 0,050 |
| kavram kısmi, uygulama tam | 1 | 0,000 | 0,050 |
| kavram yanlış, akıcı | 4 | 0,212 | 0,200 |
| kısa, kısmen doğru | 5 | 0,130 | 0,150 |
| ilgisiz | 6 | 0,000 | 0,000 |
| kavram tam, dağınık anlatım | 4 | 0,113 | 0,075 |
| her şey kısmi | 6 | 0,125 | 0,075 |
| kavram tam, ilişki yok | 2 | 0,100 | 0,050 |
| kavram kısmi, ilişki tam | 3 | 0,067 | 0,050 |
| içerik tam, örnek yok | 1 | 0,200 | 0,200 |
| içerik kısmi, örnek tam | 1 | 0,050 | 0,200 |
| örnek görüşle çelişiyor, akıcı | 1 | 0,250 | 0,250 |
| içerik tam, dağınık dil | 1 | 0,050 | 0,000 |
| yöntem tam, işlem hatalı | 1 | 0,250 | 0,300 |
| yöntem kısmi, işlem tam | 1 | 0,300 | 0,050 |
| yöntem yanlış, akıcı | 1 | 0,000 | 0,000 |
| kısa, yalnız sonuç | 1 | 0,000 | 0,000 |
| yöntem ve işlem tam, yorum kısmi | 1 | 0,050 | 0,050 |
| kavram tam, gerekçe yok | 1 | 0,000 | 0,050 |

**Karar kuralı:** GA üst < 0: hayır · şema koşulu: evet · aralık dışı koşulu: evet · manipülasyon ≥ %80: evet

**Sonuç:** Fark gösterilemedi (GA 0'ı içeriyor) — değişiklik önerilmez.
