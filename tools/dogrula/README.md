# tools/dogrula — yayın öncesi/sonrası canlı doğrulama

Bağımsız canlı doğrulamanın betikleri (W8, 24 Ekim – 5 Kasım 2026; PROGRESS §83–§85).
Depo kökünden çalıştırılır. Tarayıcı: `playwright-core` + kurulu Chrome
(`channel: 'chrome'`, yoksa Playwright'ın kendi Chromium'u).

| Betik | Ne yapar | Model çağrısı |
|---|---|---|
| `sha-karsilastir.sh [commit] [url]` | `public/` altındaki izlenen her dosyayı `curl -L` ile canlıdan çeker; **canlı = disk dosyası** ve **canlı = git blob'u** (bayt bayt) karşılaştırır. `_headers` ve `_redirects` varlık olarak sunulmaz, atlanır | 0 |
| `demo-yuru.mjs <url> <çıktı-klasörü> [genişlik] [--model-evaluate]` | Rehberli demonun 5 adımını **gerçek tıklamayla** yürür; adım 5'te dolu sınıf analitiğini (KR-20, α, ısı haritası), sonda demodan çıkışı yazar. `/api/ai/*` POST engelli. §120'den beri demo ayrı kayıt alanında ve modele **hiç** istek göndermez (örnek veri); `--model-evaluate` artık demoda çağrı üretmez | 0 |
| `kontroller.mjs <url> <genişlik> [ornek-evaluate-yanit.json]` | 38 denetim, gerçek tuşlarla. §120: kendi verisi olan tarayıcıda demo → çıkış boyunca kullanıcı kaydı **bayt bayt aynı**, demo menüsünde yedek/sıfırla yok, dolu sınıfta KR-20 sayısal ve "gösterge" uyarısı yok, boş havuzdan ilk yayına ≤ 12 tık ve yalnız Öğretmen rolü (örnek paket ve elle soru). Ayrıca: §71 şüpheli soru (TOHUMLA), karar günlüğü, Sıfırla (odak ⋯, kendi veride), katalog (seçim varken Escape eklemez), sınavı bitir + "Evet, bitir" sonrası odak (§84), yönetici filtresi ×3, kısa metin uyarısı, 12 rol/sekme ekranında konsol hatası ve taşma. `/evaluate`, verilen kayıtlı **gerçek** yanıtla 1,5 sn gecikmeli karşılanır | 0 |
| `sekme-cakisma.mjs <url>` | §119: aynı origin iki-altı Playwright sayfası. Başka sekmenin yazımı eski bellekli sekmece sessizce silinemiyor mu, "Veri başka sekmede değişti" kutusu ve "Yeniden yükle" çalışıyor mu, çakışmada kitaplığa (IndexedDB) yazılmıyor mu, açık bağlantı Sıfırla'yı bloklamıyor mu; §123: demo sekmesi ile kullanıcı sekmesi birbirini kilitlemiyor ve demo kullanıcı kaydına/sürümüne dokunmuyor mu; §130: yalnız ekran (rol, sekme) değiştiren yeni sekme ilk sekmeyi kilitlemiyor mu. Çıkış kodu 0 = 18/18 | 0 |
| `veri-saglamligi.mjs <url> [genişlik]` | §128: bozuk kayıt (raporun 5 biçimi + yarım kayıt + dizi) ile açılışta kayıt bayt bayt aynı, karantina kopyası, kurtarma ekranı ve dört çıkışı (indir/yeniden dene/okunabilenle devam/iki adımlı Sıfırla); açılış hatasında varsayılanla açılış; şemasız `.mihenk` yedeğin reddi; KVKK "Öğrencinin verisini sil" (demo + kendi veri, yönetici rolü) sonrası localStorage/sessionStorage/IndexedDB'de ad 0; dört CSV'de formül nötrleme; demo alanında bozuk demo kaydı. Çıkış kodu 0 = 39/39 | 0 |
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
