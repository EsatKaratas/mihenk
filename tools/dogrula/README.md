# tools/dogrula — yayın öncesi/sonrası canlı doğrulama

Bağımsız canlı doğrulamanın betikleri (W8, 24 Ekim – 5 Kasım 2026; PROGRESS §83–§85).
Depo kökünden çalıştırılır. Tarayıcı: `playwright-core` + kurulu Chrome
(`channel: 'chrome'`, yoksa Playwright'ın kendi Chromium'u).

| Betik | Ne yapar | Model çağrısı |
|---|---|---|
| `sha-karsilastir.sh [commit] [url]` | `public/` altındaki izlenen her dosyayı `curl -L` ile canlıdan çeker; **canlı = disk dosyası** ve **canlı = git blob'u** (bayt bayt) karşılaştırır. `_headers` ve `_redirects` varlık olarak sunulmaz, atlanır | 0 |
| `demo-yuru.mjs <url> <çıktı-klasörü> [genişlik] [--model-evaluate]` | Rehberli demonun 5 adımını **gerçek tıklamayla** yürür. `/api/ai/*` POST engelli; `--model-evaluate` verilirse yalnız `/api/ai/evaluate` geçer (**1 çağrı**) ve yanıt `evaluate-yanit-<genişlik>.json` olarak kaydedilir | 0 ya da 1 |
| `kontroller.mjs <url> <genişlik> [ornek-evaluate-yanit.json]` | 28 denetim, gerçek tuşlarla: §71 şüpheli soru (TOHUMLA), karar günlüğü, Sıfırla (odak ⋯), katalog (seçim varken Escape eklemez), sınavı bitir + "Evet, bitir" sonrası odak (§84), yönetici filtresi ×3, kısa metin uyarısı, 12 rol/sekme ekranında konsol hatası ve taşma. `/evaluate`, verilen kayıtlı **gerçek** yanıtla 1,5 sn gecikmeli karşılanır | 0 |
| `ornek-evaluate-yanit.json` | 5 Kasım'da canlıdan alınmış gerçek bir `/evaluate` yanıtı (sentetik demo yanıtı; kişisel veri yok) | — |

Örnek (yayından sonra):

```bash
bash tools/dogrula/sha-karsilastir.sh HEAD
node tools/dogrula/kontroller.mjs https://mihenk.bies.workers.dev 1280 tools/dogrula/ornek-evaluate-yanit.json
node tools/dogrula/kontroller.mjs https://mihenk.bies.workers.dev 390 tools/dogrula/ornek-evaluate-yanit.json
node tools/dogrula/demo-yuru.mjs https://mihenk.bies.workers.dev ./.dogrula-cikti 1280 --model-evaluate
node tools/dogrula/demo-yuru.mjs https://mihenk.bies.workers.dev ./.dogrula-cikti 390
```

Ücretsiz planda günlük bütçe ≤ 9.000 Neuron; tüketim
`MIHENK_CF_HESAP=<hesap-id> node tools/olcum/neuron-gunluk.mjs` ile okunur.

**Statik sunucuda dikkat:** `/api/ai/status` yanıt vermezse arayüz yerel
simülasyona düşer ve değerlendirme eşzamanlı biter. Bu yüzden asenkron yeniden
çizim hataları (§84) statik sunucuda **görünmez**; canlıda ya da status
sahtelenerek ölçülmelidir.
