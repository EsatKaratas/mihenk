# Ölçüm panosu — manşet sayıların yeniden üretimi

> **Otomatik üretilir:** `npm run olcum:dogrula` (`tools/olcum/dogrula.mjs`). Elle düzenlemeyin.
> Depodaki ham veriden yeniden hesaplanan her sayı, belgedeki metinden okunan sayıyla
> belgenin kendi yuvarlama hassasiyetinde karşılaştırılır. Tutmayan varsa betik 1 ile çıkar
> ve CI kırmızı olur. Model çağrısı yok; ağ yok.
>
> **Etiketleyicilerin hepsi yapay zekâdır (Claude), insan alan uzmanı değil** (ARASTIRMA §6.7, §8.2).
> Aşağıdaki κ değerleri aynı model ailesinin iki oturumunun uyumudur; insan–insan ve insan–YZ
> uyumu henüz ölçülmedi (araç: `tools/etiket/`, hesap: `npm run olcum:uyum`).

**Sonuç:** 37 / 37 kontrol tuttu.

| Bölüm | Ölçü | Belgede | Yeniden hesap | Durum | Girdi |
|---|---|---|---|:---:|---|
| §6.2 | İlk ölçüm ÇSS sayısı A · B | 25 · 26 | 25 · 26 | ✓ | elle-kontrol.json |
| §6.2 | İlk ölçüm anahtar doğru — A [Wilson] | 12 (%48) [30,0–66,5] | 12 (%48) [30,0–66,5] | ✓ | elle-kontrol.json |
| §6.2 | İlk ölçüm anahtar doğru — B [Wilson] | 16 (%62) [42,5–77,6] | 16 (%62) [42,5–77,6] | ✓ | elle-kontrol.json |
| §6.2 | İlk ölçüm anahtar yanlış A · B | 8 · 5 | 8 · 5 | ✓ | elle-kontrol.json |
| §6.2 | İlk ölçüm anahtar belirsiz A · B | 5 · 5 | 5 · 5 | ✓ | elle-kontrol.json |
| §6.3 | Kör ikinci kontrol uyuşma | 32 / 37 (%86) | 32 / 37 (%86) | ✓ | anahtar-kor-esleme + anahtar-ikinci-kontrol |
| §6.3 | Kör ikinci kontrol Cohen κ | 0,79 | 0,79 | ✓ | anahtar-kor-esleme + anahtar-ikinci-kontrol |
| §6.8 | Etiketli ÇSS (W4 + W1) | 225 (113 + 112) | 225 (113 + 112) | ✓ | a5-etiketli.csv |
| §6.8 | Birincil ÇSS | 392 | 392 | ✓ | a5-birlesik.csv (fellBack hariç) |
| §6.8 | Bayraklı ÇSS (hepsi etiketli) | 144 | 144 | ✓ | a5-birlesik.csv + a5-etiketli.csv |
| §6.8 | İkinci kontrol n | 45 | 45 | ✓ | ikinci-kontrol-esleme + w3 |
| §6.8 | İkinci kontrol uyuşma (3 sınıf) | %88,9 | %88,9 | ✓ | ikinci-kontrol-esleme + w3 |
| §6.8 | İkinci kontrol Cohen κ | 0,81 | 0,81 | ✓ | ikinci-kontrol-esleme + w3 |
| §6.8 | Doğru ↔ yanlış karşıtlığı | 0 | 0 | ✓ | ikinci-kontrol-esleme + w3 |
| §6.8 | Taban küme A: n · doğru [Wilson] · yanlış · belirsiz | 32 · 22 (%68,8) [51,4–82,0] · 3 · 7 | 32 · 22 (%68,8) [51,4–82,0] · 3 · 7 | ✓ | a5-etiketli.csv (küme a) |
| §6.8 | Taban küme B: n · doğru [Wilson] · yanlış · belirsiz | 36 · 22 (%61,1) [44,9–75,2] · 5 · 9 | 36 · 22 (%61,1) [44,9–75,2] · 5 · 9 | ✓ | a5-etiketli.csv (küme a) |
| §6.8 | Bootstrap tekrar · tohum | 1000 · 20261019 | 1000 · 20261019 | ✓ | dogrula.mjs (a5-birlestir.mjs ile aynı) |
| §6.8 | A1 bağımsız çözüm, istem sürüm 2 — yakalama (yanlış) | %62,9 [47,9–82,2] | %62,9 [47,9–82,2] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A1 bağımsız çözüm, istem sürüm 2 — yakalama (kusurlu) | %52,2 [42,3–64,8] | %52,2 [42,3–64,8] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A1 bağımsız çözüm, istem sürüm 2 — yanlış alarm | %2,9 [0,8–5,4] | %2,9 [0,8–5,4] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A2 sayısal hesap — yakalama (yanlış) | %53,5 [39,1–73,5] | %53,5 [39,1–73,5] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A2 sayısal hesap — yakalama (kusurlu) | %30,8 [23,3–39,6] | %30,8 [23,3–39,6] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A2 sayısal hesap — yanlış alarm | %2,4 [0,8–4,4] | %2,4 [0,8–4,4] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A1 (v2) ∪ A2 — yakalama (yanlış) | %77,7 [60,6–98,4] | %77,7 [60,6–98,4] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A1 (v2) ∪ A2 — yakalama (kusurlu) | %61,1 [51,2–74,6] | %61,1 [51,2–74,6] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A1 (v2) ∪ A2 — yanlış alarm | %5,3 [2,6–8,4] | %5,3 [2,6–8,4] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A3 "doğru şık en uzun" — yakalama (yanlış) | %0 [0–0] | %0 [0–0] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A3 "doğru şık en uzun" — yakalama (kusurlu) | %1,4 [0–3,4] | %1,4 [0–3,4] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | A3 "doğru şık en uzun" — yanlış alarm | %10,6 [4,2–18,0] | %10,6 [4,2–18,0] | ✓ | a5-birlesik + a5-etiketli, bootstrap |
| §6.8 | a5-bootstrap.json "Toplam" ile birebir (1e-12) | 36 / 36 | 36 / 36 | ✓ | a5-bootstrap.json |
| §6.8 | Kusurlu tahmini (≈ÇSS, ≈%) | ≈146 · ≈%37 | ≈146 · ≈%37 | ✓ | ağırlıklı toplam |
| §6.8 | Uyarısız geçen kusurlu (≈ÇSS) | ≈57 | ≈57 | ✓ | ağırlıklı toplam |
| §6.8 | Ağırlıksız yakalama (yanlış) [Wilson] · % | 55/59 [83,8–97,3] · %93 | 55/59 [83,8–97,3] · %93 | ✓ | a5-etiketli.csv |
| §6.8 | A2 bayraklı · bunlardan DEN-YP-SIKIFADE yanlış alarmı | 51 · 4 | 51 · 4 | ✓ | a5-etiketli.csv (SIKIFADE toplam 6; 4'ü "doğru" etiketli) |
| Puanlama | Birincil d = B − A [%95 GA] — OZET.md | n = 48 · d = −0,018 [−0,042; 0,004] | n = 48 · d = −0,018 [−0,042; 0,004] | ✓ | puanlama-deney/ham.jsonl |
| Puanlama | Birincil d = B − A [%95 GA] — PROGRESS.md | n = 48 · d = −0,018 [−0,042; 0,004] | n = 48 · d = −0,018 [−0,042; 0,004] | ✓ | puanlama-deney/ham.jsonl |
| Puanlama | ARASTIRMA.md bu sonucu içeriyor mu | hayır (yalnız OZET.md ve PROGRESS.md) | hayır (yalnız OZET.md ve PROGRESS.md) | ✓ | bilgi |

## Yöntem notları

- **Wilson** %95 GA, z = 1,96 (`a5-birlestir.mjs` ile aynı).
- **A5 başarımı:** ağırlıklar `a5-birlesik.csv`'den yeniden kurulur (bayraklı = 1; bayraksız = tabakadaki
  bayraksız sayısı / tabakadaki etiketli bayraksız sayısı). Tabakalı bootstrap: 1000 tekrar, tohum 20261019,
  mulberry32; her tabaka × {bayraklı, bayraksız} hücresi kendi içinde yeniden örneklenir. Sınırlar 2,5. ve
  97,5. yüzdelik. Aynı RNG ve aynı çekim sırası olduğu için `a5-bootstrap.json` birebir yeniden üretilir.
- **Model A tabakalarında** "yanlış" yakalama 13/13 ve 17/17 olduğu için bootstrap aralığı [100–100]'e çöker
  (ARASTIRMA §6.8 okuma uyarısı i); bu pano o uyarıyı değiştirmez.
- **Puanlama deneyi:** yanıt düzeyinde eşleştirilmiş d = B − A, bootstrap 10000 tekrar, tohum 20261023
  (`puanlama-analiz.mjs` ile aynı). Bu sonuç ARASTIRMA.md'de değil, `puanlama-deney/OZET.md` ve PROGRESS'te.

## Veri dosyaları (SHA-256)

Bu sayılar yalnız aşağıdaki baytlarla geçerlidir. Bir dosya değişirse bu tablo da değişir ve CI farkı yakalar.

| Dosya | SHA-256 |
|---|---|
| `docs/olcum/elle-kontrol.json` | `1296b2cc773a2bf84397af7c6ff71743f77a81e22c95d945a06f74b80e80a7f8` |
| `docs/olcum/anahtar-ikinci-kontrol.json` | `0231638ed1b339181b44345d6ada63462aff2e2568f75b28c8a2deb8a09d1a7a` |
| `docs/olcum/anahtar-kor-esleme.json` | `97c4008ec1d9d6f1b9d920e65c91b422ba1cd27e4f7082c3272deb03918838ac` |
| `docs/olcum/a5/a5-birlesik.csv` | `f26b356e4d7447261b3e657de6519cf0122cebea03e4b84179d128b0f077db6b` |
| `docs/olcum/a5/a5-etiketli.csv` | `0f420e89ca8a85bf21b89c9add5018bad8decf5d9b72992836b676930c330242` |
| `docs/olcum/a5/etiket-W1.json` | `8f60adb7d167964e5e9736ad2a93866b570a86ee76a1c996e5c8cfed0c1f7926` |
| `docs/olcum/a5/etiket-W4.json` | `2cca324562417b58d9195cac4e1285550c7dcbaaf168f9e96d8a9230f66e9e35` |
| `docs/olcum/a5/ikinci-kontrol-w3.json` | `30c5c725e1e8e6689b6438bd0cd4a7dde9e6e63e1aaaee777617a992ac85c59e` |
| `docs/olcum/a5/ikinci-kontrol-esleme.json` | `2f6d79f2932838d9b775271d326de083053d1a8b4431ccbd19f4fe1cefca67d2` |
| `docs/olcum/a5/a5-bootstrap.json` | `67b7f33a3ebbbaebffb7ba39e16645524e5717f6a16b372c11fe6c27c70d4148` |
| `docs/olcum/puanlama-deney/ham.jsonl` | `edde0cb47de117203825775bf14a03aeffe6ab8087dccfd8c80546658be51587` |
