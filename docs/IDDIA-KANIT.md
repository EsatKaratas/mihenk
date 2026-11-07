# İddia → kanıt dizini (README)

> README'deki her sayısal ya da güçlü iddia burada bir satırdır. Her satırda
> kanıt dosyası, yeniden üreten komut ya da PROGRESS bölümü ve son doğrulama
> tarihi var. Son tarama: **7 Kasım 2026**, taban `2c4f3a9` (dal
> `docs/juri-kanit`, PROGRESS §127). Model çağrısı yapılmadı; canlı ölçüm
> gerektiren satırlar eski tarihleriyle bırakıldı.

**Durum anahtarı:**
- ✓ **bugün doğrulandı**: komut ya da sayım 7 Kasım'da yeniden koşuldu.
- ◷ **kayıtlı ölçüm**: PROGRESS'te ölçülmüş, bugün yeniden koşulmadı; tarih yazılı.
- ✎ **düzeltildi**: README'deki ifade bu turda güncel ölçüme çekildi.
- ✗ **ölçülmedi**: iddia yumuşatıldı ya da açıkça "ölçülmedi" diye yazıldı.

## 1. Bu turda düzeltilen çelişkiler

| README'de ne yazıyordu | Gerçek (ölçüm) | Ne yapıldı |
|---|---|---|
| Rozet `test-413/413`; §9 metninde "25 dosyada 538 test"; altbilgide "538 test · öz-kontrol 542 ad" | `npx vitest run` → **1245/1245, 58 dosya**. `node tools/ozkontrol-dogrula.mjs` → **834 ad, %100** | ✎ Rozet, §9 ve altbilgi güncellendi. Dosya bazında eski liste kaldırıldı (bayatlıyordu); dağılım `npx vitest run` çıktısında |
| `ci.yml` satırında "538 test" | CI adımları: lint, `npm test`, `check:config`, öz-kontrol, `olcum:dogrula` (`.github/workflows/ci.yml`) | ✎ Sayı kaldırıldı, adımlar yazıldı |
| "Proje Workers Paid üzerindedir, kota artık engel değil"; "pratik koruma ön ödemeli kredi" | Workers Paid 26 Ekim'de bitti; ücretsiz plan, 9.000 Neuron eşiği, Durable Object sayaçları (PROGRESS §85, §91, §93) | ✎ §3.1 ve §9 güncellendi |
| "İki model … ölçtük ~4 puan fark"; "birincil 15-16/20, yedek 20/20" bugünkü yedek Scout'a bağlanıyordu | O ölçümler Ağustos'taki yedek **gpt-5.6-luna** ile yapıldı (§16, §19). Scout ile karşılaştırma yok | ✎ Ölçümün hangi modelle yapıldığı ve Scout'un ölçülmediği yazıldı |
| "6 istemin hepsinde" / "altı istemin tamamında" / "altı AI ucunun tamamında" | `src/lib/prompts.ts` 7 `build*Prompt`, hepsinde `crypto.randomUUID()` belirteci ve "GÜVENLİK SINIRI" bloğu. `src/routes/ai.ts` 7 POST ucunun hepsinde `rateLimited` | ✎ "7" yapıldı |
| `public/index.html` "~2 KB" (iki yerde) | 6.979 bayt (`wc -c`) | ✎ "~7 KB" |
| "PROGRESS §54'e kadar uzanır" | §127 | ✎ |
| "Dönem filtresi yok" (24 Ekim tablosu) | §103'te eklendi | ✎ Tarihli tabloya güncelleme notu |
| "40 kâğıt yerine birkaçına odaklanma" (§11.2 ve SSS) | **Ölçülmedi.** Zaman kazancı hiç ölçülmedi; kuyruk sıralaması okumayı azaltmaz, her yanıt yine onay ister | ✗ İddia yumuşatıldı: "incelemeye en az emin olunan yanıttan başlar; zaman kazancı ölçülmedi, pilotta ölçülecek" |

## 2. Rozetler ve "Neden farklı"

| İddia | Kanıt | Komut / kaynak | Durum |
|---|---|---|---|
| Testler 1245/1245 | 58 dosya, `test/` | `npm test` (7 Kasım, §130: 1245 geçti) | ✓ |
| Model Llama 3.3 70B, yedek Llama 4 Scout | `wrangler.demo.jsonc` `AI_MODEL`, `AI_FALLBACK_MODEL` | `npm run check:config` (çıktıda iki model yazılı) | ✓ |
| Injection testi 5/5 | `tools/injection-test.py` | PROGRESS §5, §10e, §16. Son koşum Ağustos 2026. Yeniden koşmak model çağrısı ister; bu turda yasaktı | ◷ |
| Karar Günlüğü CSV/JSON | `public/app.js` `auditKaydet`, `AUDIT_LIMIT = 500` | `test/karar-kaydi.test.ts`, `test/havuza-al-izi.test.ts`, `test/iz-izin-paket.test.ts` | ✓ |
| 606 MEB öğrenme çıktısı, 12 katalog dosyası | `public/mufredat/{turkce,fen,matematik}-{5..8}.json` | 7 Kasım sayımı: Türkçe 80+91+96+98 = **365**, Fen 27+36+35+43 = **141**, Matematik 23+24+30+23 = **100** → **606**, 12 dosya | ✓ |
| "606 kodun 606'sı PDF'te, metin birebir" | `tools/mufredat-cikar.py`, `tools/mufredat-katalog-uret.py`, `test/mufredat.test.ts` | PROGRESS §22, §25. PDF karşılaştırması bugün yeniden koşulmadı | ◷ |
| Türkçe 7'de yazılı / performans / süreç = 39 / 43 / 14 | `public/mufredat/turkce-7.json` | 7 Kasım sayımı: yazili 39, performans 43, surec 14 | ✓ |
| Prompt injection: sertleştirmeden önce 20/20 | PROGRESS §5 | | ◷ |

## 3. Tasarım turu ve ikinci tur tabloları (tarihli)

| İddia | Kaynak | Durum |
|---|---|---|
| Kırmızı `#b42318` beyazda 6,57 (WCAG AA); eski hata rengi kontrastı 1,11 | PROGRESS §60 | ◷ (23 Ekim) |
| Hedefler ≥ 24 px; konsol hatası, yinelenen kimlik, taşma 0 | §60–§68; `tools/gorsel-fark.mjs` | ◷ |
| Demo şeridi 5/5 adım; 390 px'te 109 / 129 px | §72 | ◷. Bugünkü demo 5 adım, `tools/dogrula/demo-yuru.mjs` (§123: 1280 ve 390, konsol 0, POST 0) |
| Onay kartı 1053 → 769 px | §75 | ◷ |
| Havuz ağacı 30/30 | §75 | ◷ |
| Kısa metin: ⌊484/180⌋ = 2 | §75; `test/ce-kapasite.test.ts` | ◷ (formül testte ✓) |
| Dil uyarısı: 782 soru + 621 gerekçe, 4 sızıntı; yeni kural 4/4, eski 1/4; 12.017 birimde yanlış alarm 0 | §73 | ◷ |
| Aksansız sözcük: 119 sözcük, 58 çakışan, 1.942 yanlış alarm; eklenmedi | §76; `tools/olcum/aksansiz-say.mjs` | ◷ |
| 10 onay penceresinin hepsi ortak bileşende; yerel `confirm()` 0 | §77, §79, §80; `test/onay-modal.test.ts` | ✓ (test geçti) |
| Şüpheli soruda Enter onaylamaz; klavye testi 9/9 | §71, §81 | ◷ |
| Atama düzeltmesi: 2 yerine 5; %75 → %100 | §78 | ◷ |
| Analitik 3/4, 3/3, 2/2 | §79 | ◷ |
| Testler 346 → 402, öz-kontrol 516 (o tur) | §83 | ◷ tarihsel; bugünkü değer 1245 / 946 |
| Canlı `aba0563e`, 51 dosya bayt bayt aynı | §83 | ◷ tarihsel. Bugünkü canlı `fcd867ef`, canlı = disk = blob (§130) |

## 4. "Son değişiklikler — 6 Eylül" tablosu

| İddia | Kaynak | Durum |
|---|---|---|
| Keşif Kampüsü 18 kazanım, belgeye kilitli üretim | §49–§50 | ◷ |
| `#F2994A` beyazda 2,23; `#9a5410` 5,75 / 4,92 | §26, §49 | ◷ |
| Birim dönüşümü A/B: eski istem 0/2, yeni 4/4 | §46 | ◷ |
| Beceri temelli soru: 11,7 → 24,7 kelime; veri içeren %55 → %100; kalıp 1 → 0; 15 → 25 sn | §48 | ◷ |
| Öğrenci verisi sunucuya gitmez (sınıf kodu söküldü) | §43; `public/veri-nereye-gider.html` | ✓ Sayfa bugün okundu. Not: yapay zekâ çağrılarında cevap metni (maskeli) Workers AI'ya gider. README bunu "yalnızca yapay zekâ çağrısındaki metin" diye zaten yazıyor |

## 5. Ölçüm ve araştırma sayıları

| İddia | Kanıt | Komut | Durum |
|---|---|---|---|
| Kusurlu soruların %61'i işaretlendi, sağlamlarda %5 yanlış alarm, ≈57/146 uyarısız | `docs/olcum/PANO.md`, ARASTIRMA §6.8 | `npm run olcum:dogrula` → **37/37** (7 Kasım; PANO.md değişmedi) | ✓ |
| Dil sızıntısı "~10 soruda 1" | PROGRESS §20 (26 Ağustos, küçük örneklem) | | ◷ |
| Önbellek 6012 ms → 0 ms; 0–6 ms | §7h (25 Ağustos) | | ◷ |
| Süre tablosu (7–13 sn üretim, 6–12 sn değerlendirme…) | README "Canlıda ölçülen değerler", son ölçüm 27 Ağustos. Ücretsiz planda tek değerlendirme 7,6 sn (§85, 5 Kasım) | | ◷. Yeniden ölçmek model çağrısı ister |
| 6 modelli karşılaştırma; birincili geçen tek aday Scout | §43 (README §3.1 "§43.1"); `wrangler.demo.jsonc` yorumu | | ◷ |
| Yedek devreye giriyor (bozuk model adıyla kanıt) | README §3.1; `test/rota.test.ts` "birincil model ÇÖKERSE … yedeğe geçer" | `npm test` | ✓ (birim) / ◷ (canlı) |
| D1 şeması 14 tablo | `schema.sql` | `grep -c "CREATE TABLE" schema.sql` → 14 | ✓ |
| Backend `/api/ai/*` 7 uç | `src/routes/ai.ts` 7 `ai.post` (+ `GET /status`, `GET /butce`) | grep | ✓ |
| `max_tokens` her çağrıda açık | `src/routes/ai.ts` `callModelJson(…, { maxTokens … })` | grep | ✓ |
| Kaynak metin 6.000 karakter | `MAX_SOURCE_CHARS`, `test/guards.test.ts` | `npm test` | ✓ |
| Deploy koruması ücretli bağlamada durur | `tools/deploy-guard.mjs`, `test/deploy-guard.test.ts` | `npm test` | ✓ |
| Kazanım grafiği kritik eşik %55; tekrar sorusu %60 altı | `public/app.js` `KRITIK_ESIK = 55`; telafi kutusu `v < 60` | grep | ✓ |
| Madde analizi n < 10'da "gösterge niteliğinde" | `public/app.js` (madde analizi, güvenirlik) | `test/guvenirlik-katsayilari.test.ts` | ✓ |
| GitHub dil istatistiği %84 HTML → gerçek %81 JS / %18 CSS / %1 HTML | §7f (25 Ağustos) | | ◷ tarihsel |

## 6. Ölçülmemiş ya da kanıtı zayıf iddialar

| İddia | Durum | Ne yapılmalı |
|---|---|---|
| Öğretmene zaman kazandırır ("40 kâğıt yerine birkaçı") | ✗ Ölçülmedi. README'de yumuşatıldı | Pilotta kronometreyle: Mihenk'li ve Mihenk'siz, yanıt başına puanlama süresi (fikir3-D madde 4) |
| "İnsan onayı hataları şu kadar azaltır" | ✗ Ölçülmedi (A6 ön kayıt taslağı yalnız model hatasını ölçer) | `docs/olcum/a6/ON-KAYIT-TASLAK.md` + insan etiketi |
| Güven skoru isabetle ilişkili | ✗ Gerçek sınıf verisiyle ölçülmedi. Ürün içinde denetleyen kart var (README §11.2 "Öğretmen-AI uyumu") | Pilot verisi |
| Demo QWK 0,98, SMD +0,10 | Ekibin elle yazdığı örnek veri ve kayıtlı öneriden gelir (§120, §123). **Model performansı değildir** | Jüriye böyle söylenmeli |
| İstem enjeksiyonu 5/5 bugün de geçerli | ◷ Ağustos'tan beri yeniden koşulmadı; aradaki istem değişikliklerinden sonra geçerliliği ölçülmedi | Bir sonraki kota gününde `tools/injection-test.py` |
| AGENTS.md güncellik notundaki "338 test", "380 ad" | Tarihsel (20 Ekim). Bu tur AGENTS'ta yalnız §8'e dokunma izni vardı | Ayrı bir belge işi |

## 7. Yeniden üretme

```bash
npm ci
npm test                         # 1245/1245, 58 dosya
npm run lint                     # tsc --noEmit
npm run check:config             # iki yapılandırma GEÇERLİ
node tools/ozkontrol-dogrula.mjs # 946 ad, %100
npm run olcum:dogrula            # 37/37, docs/olcum/PANO.md
```
