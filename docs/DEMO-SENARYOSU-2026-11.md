# Mihenk — Demo senaryosu (Kasım 2026, ≈5 dakika + 60 sn kanıt turu)

> **Kaynak:** Esat'ın masaüstündeki "Mihenk - Mülakat Demo Senaryosu.md"
> (Worker 4, 23 Ekim 2026; main `106a0d3`). O dosya yalnız okundu, değiştirilmedi.
> **Bu sürüm:** 7 Kasım 2026, taban `2c4f3a9` (PROGRESS §123). §99–§123
> eklemelerine göre yeniden yazıldı. **§132 (7 Kasım, yayın 7):** W10'un canlı
> provasına göre düzeltildi: şerit adı, onay kartlarındaki puanlar, K2 düğmesi,
> Deneyap adımı; demo alanında üst bant artık "Demo · model çağrılmaz" der.
>
> **Kural (aynen):** Söylenen her sayı ölçülmüştür. Ölçülmemiş bir şeyi söyleme.
> Sayının kaynağı satırında yazılıdır.

## ⚠ Önce: bu senaryo hangi sürümde geçerli?

Canlıdaki sürüm `fcd867ef`'dir (7 Kasım, PROGRESS §130). §119–§129 canlıda.
Aşağıdaki akış şu eklemelere dayanır:
- demonun ayrı alanda çalışması;
- 24 öğrencili dolu sınıf;
- "Örnek veri" puan önerisi;
- YZ Puanlayıcı Denetimi kartı;
- adsız puanlama.

Yayın kararı müdüründür. Yayın olmazsa demo günü bu senaryo **yerel
sunucuda** (`npm run dev:demo`) ya da eski 23 Ekim senaryosuyla yürütülür.

**Ölçüm (7 Kasım, yerel statik sunucu `127.0.0.1`, `/api/ai` POST engelli, model çağrısı 0):**
- `tools/dogrula/demo-yuru.mjs` 1280 px'te 5 adım geçti; konsol hatası 0.
- Ek kanıt turu betiği 1280 ve 390 px'te koştu; konsol hatası 0, POST 0.
- Bir tıklamanın işlenmesi 170–220 ms (Playwright tıklaması + 150 ms bekleme dahil).
- "Evet, bitir"den sonra değerlendirme beklemesi **4 ms**. Demo alanı modeli hiç çağırmaz; öneriler kayıtlı örnek veriden gelir (§120).
- Beş adımın bütün tıklamaları 4,2 sn sürdü. **Süreyi konuşma belirler.**

---

## 0. Başlamadan önce (jüri gelmeden, 3 dk)

1. Chrome'da **yeni gizli pencere** aç, adres `mihenk.bies.workers.dev`, ardından **Ctrl+F5**.
2. **Kota:** ikinci sekmede `mihenk.bies.workers.dev/api/ai/butce` adresini aç (salt okunur GET).
   - `"doldu": true` görünürse §2'deki canlı soru üretimi (⊕) yapılamaz. O satırda "kota dolu" şeridi gösterilir.
   - Sayaç 00:00 UTC'de (03:00 TR) sıfırlanır (§93).
3. Yakınlaştırma %100, pencere ≥ 1280 px.
4. Üçüncü sekme: `mihenk.bies.workers.dev/veri-nereye-gider`.
5. Dördüncü sekme: GitHub'da `docs/olcum/PANO.md`.
6. B planı klasörü: `docs/ekran/` (23 Ekim görüntüleri). Dolu sınıf görüntüleri depo dışında, `Downloads\Mihenk\ekran-demo-120\` klasöründe.

---

## 1. Ana akış (≈4:30)

Tırnak içindeki her ad ekrandaki düğmenin kendisidir. Adlar 7 Kasım'da `public/app.js`'ten ve yerel yürüyüşten alındı.

| Süre | Tıklama | Esat'ın tek cümlesi | Kaynak |
|---|---|---|---|
| 0:00 | Giriş: rol kartları → **"▶ Rehberli demo (5 adım)"** | "Mihenk ortaokul için uçtan uca bir ölçme-değerlendirme sistemi. Tezi tek cümle: yapay zekâ önerir, öğretmen karar verir." | — |
| 0:15 | Şerit: **"DEMO AKIŞI"** + numaralı daireler ①–⑤ (yalnız şu anki adımın adı yazılı; dar ekranda rozet de gizli) · "Örnek veri · kendi veriniz korunuyor"; üst bantta **"Demo · model çağrılmaz"** | "Demo kendi ayrı alanında açılıyor. Örnek sınıf 24 kişilik, kimsenin gerçek verisine dokunmuyor, yapay zekâya da istek göndermiyor." | §120 |
| 0:25 | Onay bekleyen kart → **"✓ Onayla → Havuza Aktar"** → **"Sonraki Adım → Öğretmen"** | "Yapay zekânın ürettiği soru, bir içerik uzmanı onaylamadan havuza giremez. Reddederse nedenini hata taksonomisinden seçebilir." | `agents.md` §1, §104 |
| 0:45 | **"Tüm sınıflar"** kartı (24 öğrenci) → sınav kartında **"Yayınla"** → **"Sonraki Adım → Öğrenci"** | "Sorular yalnız onaylı havuzdan geliyor. İsterse sınavı kâğıtta yapıp sonuçları ızgaraya girebiliyor." | §106 |
| 1:05 | **"Sınava Başla"** → **"Gözden geçir ve bitir"** → **"Sınavı bitir"** → **"Evet, bitir"** | "Öğrenci bitirmeden önce boş ve işaretli sorularını görüyor." | — |
| 1:25 | **"Sonraki Adım → Öğretmen Onayı"**: **"Açık Uçlu — Onay Bekleyen (2)"** | "Öğretmen önerinin puanını, ölçüt dökümünü ve gerekçesini yan yana görüyor. Bu öneriler örnek veri; rozet de bunu söylüyor." | §120 |
| 1:45 | ⊕ Kartta **"Ölçüt puanlarını düzelt"**'i aç ve kapat (kapatmak vazgeçmektir) | "Puanı ölçüt ölçüt düzeltebilir. Düzelttiği anda 'Tek Tıkla Onayla' kapanır, düzeltmesi sessizce kaybolmasın diye." | §112, §113 |
| 2:00 | İki onay kartı: **"✓ Tek Tıkla Onayla (YZ puanı: 16)"** ve **"✓ Tek Tıkla Onayla (YZ puanı: 17)"** → **"✓ Sonuçları Öğrenciye Yayınla"** | "Karar onun. Her öneri ve karar zaman damgasıyla Karar Günlüğü'ne yazılıyor." | §104 |
| 2:15 | ⊕ Öğretmen → **Analitik**: "YZ Puanlayıcı Denetimi" kartı | "Burada yapay zekânın öğretmenden ne kadar saptığı ölçülüyor: QWK 0,98, 48 çift. Ama bu **demonun örnek verisi**, modelin gerçek başarısı değil. 20 çiftin altında kart sayı göstermiyor." | §121; yerel ölçüm 7 Kasım |
| 2:35 | **"Sonraki Adım → Eğitim Yöneticisi"**: "Önce buraya bakın" + Kazanım Başarı Grafiği | "Yönetici yalnız onaylı sonucu görüyor. Ortak yazılı sınav şube karşılaştırmasına girmiyor, çünkü MEB'in yazısı bunu yasaklıyor." | §119 |
| 2:50 | **→ 60 sn kanıt turu (§2)** | | |
| 3:50 | Şeritte **"Demoyu Bitir"** → giriş ekranında "Demodan çıktınız…" | "Demo verisi silindi; kendi verim olduğu gibi duruyor." | §120 |
| 4:00 ⊕ | **İçerik Uzmanı** → ders **"Deneyap Atölyeleri"** (adına bas, × silmeye sorar) → açılır listede seçenek **"Yapay Zekâ (66 kazanım · 25 yazılı)"** → önce bir **hafta grubunu aç** → bir kazanım işaretle → **"Seçilenleri Ekle"** (⚠ hiçbir kazanım işaretli değilken basma) → **"🎯 Yalnız kazanım"** zaten seçili gelir → **"🤖 Yapay Zekâ ile Soru Üret"** | (beklerken) "Araştırma sorum burası: model bu soruları üretirken hangi hataları yapıyor, denetimler ne kadarını yakalıyor. A5 ölçümünde denetimler kusurlu soruların %61'ini işaretledi; ≈57'si yine uyarısız geçti. Bu yüzden onay zorunlu." | PANO 37/37; ARASTIRMA §6.8 |
| 4:30 | Kapanış | "Etiketleri şimdilik bir yapay zekâ verdi. Burs süresinde öğretmenlerle kör etiketleme yapacağım; aracı hazır." | §109 |

**⊕ satırları** süre aşılırsa kesilir: ölçüt düzeltme, YZ denetim kartı, Deneyap
üretimi. Deneyap üretimi gerçek model çağrısıdır (≈400 Neuron, §86). Kota
doluysa yapay zekâ düğmeleri pasiftir ve şerit "Yapay zekâ bugünlük kotasını
doldurdu…" der (§100). Bunu göster ve şunu söyle: "Kota bitince sistem durmuyor;
elle soru, elle puanlama ve analiz çalışıyor."

> Deneyap adımının tıklama sırası 7 Kasım'da W10'un canlı provasında yürünüp
> düzeltildi (§132): atölye bir açılır listede seçenektir, kazanımlar hafta
> gruplarındadır, üretim türü "🎯 Yalnız kazanım" seçili gelir. Boş seçimle
> "Seçilenleri Ekle"ye basılırsa hiçbir kazanım eklenmez; önce işaretle.

---

## 2. 60 saniyelik kanıt turu

Adım 5'teyken, **"Demoyu Bitir"den önce** yapılır. Demodan çıkınca demo verisi
silinir. Süreler 7 Kasım'da yerel yürüyüşte ölçüldü (1280 / 390 px).

| # | Tıklama | Ne görünür | Cümle | Kaynak |
|---|---|---|---|---|
| K1 (15 sn) | Yönetici sayfasında **"Yapay Zekâ Karar Günlüğü"** kartına in → **"CSV indir (Excel)"** | "97 kayıt · 48 YZ puan önerdi · 25 aynen onaylandı · 23 öğretmen değiştirdi" ve "Öğretmen, yapay zekâ puan önerilerinde %48 oranında değişiklik yaptı." İnen dosya: `yapay-zeka-karar-gunlugu.csv` | "'İnsan onayını nasıl ispatlıyorsunuz?' sorusunun cevabı bir cümle değil, bu dosya. Buradaki %48 demonun örnek kararlarından; gerçek sınıfta bu oranı öğretmenin kendi kararları verir." | §21, §104; yerel ölçüm (K1 118 / 867 ms) |
| K2 (15 sn) | Şeritte **"✓ Öğrenci"** düğmesi: tamamlanan 3. adım ekranda yalnız **✓** dairesidir (üzerine gelince "3. Öğrenci"; ekran okuyucu "Öğrenci — adım 3/5") → **"Karne"** sekmesi | "Yapay zekâ bu puanı önerdi; öğretmenin yanıtını okuyup onayladı." | "Öğrenci puanın nasıl oluştuğunu görüyor. Öğretmen değiştirdiyse 'Yapay zekâ N puan önermişti; öğretmen … olarak belirledi' yazıyor. MEB kılavuzunun 'YZ çıktısı ile öğretmen katkısı ayırt edilebilir olmalı' maddesi." | MEB §2.3, s. 10; `app.js` karne; yerel ölçüm |
| K3 (15 sn) | Üçüncü sekme: `/veri-nereye-gider` | "Her şey yerelde" demeyen sayfa | "Kayıtlar tarayıcıda. Yapay zekâya giden metin ABD'deki Cloudflare'e gidiyor; öğrenci adı gitmiyor, cevaptaki adlar maskeleniyor. Bunu biz de açıkça yazıyoruz." | §110; [SISTEM-KARTI §8](./SISTEM-KARTI.md) |
| K4 (15 sn) | Dördüncü sekme: `docs/olcum/PANO.md` | "Sonuç: 37 / 37 kontrol tuttu." | "README'deki araştırma sayılarını depodaki ham veriden yeniden hesaplayan betik CI'da koşuyor. Tutmayan sayı CI'ı kırar." | §109; `npm run olcum:dogrula` (7 Kasım: 37/37) |

Dönüş: şeritte **"5 Yönetici"** → **"Demoyu Bitir"**.

---

## 3. §99–§123'te gelenler: sorulursa nerede gösterilir

| Konu | Yer | § |
|---|---|---|
| Elle soru yazma | İçerik Uzmanı → sihirbazın altı "✍ Çoktan seçmeli / ✍ Açık uçlu" | §99 |
| Kota dolunca yapay zekâsız mod | Kabukta şerit; "Elle Puanla ve Onayla" | §100 |
| OYSS paketi, e-Okul puan tablosu, KR-20/alfa | Öğretmen → Sınavlar › Gözden geçir; Analitik | §101 |
| Öğrenme çıktısı kartı, karne yazdırma | Öğrenci → Karne; Veli | §102 |
| Enjeksiyon kalıbı uyarısı | Puanlama kartı; işaretli cevapta Tek Tık yok | §103 |
| Red nedeni, anahtar değişimi oranı | Onay kartında Reddet yanı; Karar Günlüğü | §104 |
| Kâğıt sınav | Sınav kartı ⋯ → "Kâğıt sonuçlarını gir" | §106 |
| Yeni öğrencide "YZ: rıza bekleniyor" | Öğretmen → Öğrenciler | §107b |
| Tam yedek (parolalı) | ⋯ → "Yedekle…" (demo alanında kapalı) | §108 |
| Anonim araştırma paketi | Karar Günlüğü → "Araştırma paketi (anonim)" | §111 |
| OYSS senaryosundan sınav, 2024 → 2026 kod çevirisi | Sınav sihirbazı 1. adım | §114, §117 |
| Erişilebilirlik (axe 0, 12 px) | — (rapor: §115) | §115 |
| Sekme çakışması koruması; ortak sınav kutusu | "Veri başka sekmede değişti" kutusu; sihirbaz 1. adım | §119 |
| Adsız puanlama ve soru soru puanlama | Puanlama → "Adları gizle" | §122 |

---

## 4. Söylenmemesi gerekenler (güncel)

- "T3 AI ile çalışıyor" — **değil** (ARASTIRMA §5.2).
- "MEB kılavuzuna tam uyuyoruz" — **hayır.** "Kılavuzla madde madde karşılaştırdık. İtiraz mekanizması artık var ama tek cihazda, sınıf içinde çalışıyor; grup bazında yanlılığı ölçmedik" ([UYUM-TABLOSU](./UYUM-TABLOSU.md)).
- "Öğretmene şu kadar zaman kazandırıyor" ya da "40 kâğıt yerine birkaçı" — **ölçülmedi** ([IDDIA-KANIT](./IDDIA-KANIT.md) §6).
- "QWK 0,98, yapay zekâ öğretmenle uyumlu" — **hayır**, o demonun örnek verisi.
- "İnsan onayı hataları şu kadar azaltıyor" — ölçülmedi.
- "Yüksek riskli değiliz" ya da "AB Yasasına uyuyoruz" — AB Yasası Türkiye'de bağlayıcı değil; yalnız referans olarak karşılaştırdık. Hukuki değerlendirme yok.
- "Çok kullanıcılı" — bugün tek cihaz.
- "Llama 4 Scout aynı puanı verir" — Scout'la puan karşılaştırması yapılmadı (§19 eski yedekle).
- Eski senaryodaki "Dönem filtresi yok" cümlesi artık **yanlış**: §103'te eklendi.

---

## 5. Olası jüri soruları ve kanıtlı kısa cevaplar

1. **"MEB'e ya da AB'ye göre yüksek riskli misiniz?"**
   MEB kılavuzu puanlamada yapay zekâ kullanımı için öğretmenin YAZEK'te etik beyan vermesini zorunlu tutuyor (Tablo 1, C satırı, s. 23). Bunun için hazır bir açıklama metni yazdık. AB Yasası Türkiye'de bağlayıcı değil; ama Ek III 3(b), öğrenme çıktısını değerlendiren sistemleri yüksek riskli sayıyor ve biz kendimizi Md. 13, 14 ve 26'ya göre sınadık. Hukuki görüş değil, öz değerlendirme. → [UYUM-TABLOSU](./UYUM-TABLOSU.md)

2. **"Öğretmen gerçekten zaman kazanıyor mu?"**
   Bilmiyoruz, ölçmedik. Ürün içinde süre tutulmuyor. Pilotta kronometreyle, Mihenk'li ve Mihenk'siz, yanıt başına puanlama süresini ölçmeyi planlıyoruz. Bugün söyleyebileceğimiz: yapay zekâ hiçbir puanı kesinleştirmiyor, öğretmen her yanıtı öneriyle birlikte okuyor. → [IDDIA-KANIT](./IDDIA-KANIT.md) §6

3. **"Yapay zekâ kotası biterse?"**
   Ücretsiz planda günlük 10.000 Neuron havuz var; kendi eşiğimiz 9.000. Eşik dolunca model çağrılmıyor ve yapay zekâ düğmeleri kapanıyor. Elle soru, elle puanlama, analiz ve kâğıt sınav çalışmaya devam ediyor; sessiz sahte puan yok. Kaba hesap: yalnız puanlama yapılırsa günde ≈81 açık uçlu değerlendirme (≈110 Neuron/çağrı ortalamasıyla; tahmin). → §85, §86, §93, §100; [SISTEM-KARTI §9](./SISTEM-KARTI.md)

4. **"Öğrenci puana itiraz edebiliyor mu?"**
   Evet (§126). MEB kılavuzu bunu istiyor (§2.6, s. 11). Öğrenci ya da veli "Yeniden incelensin" der, talep öğretmenin İtirazlar kuyruğuna düşer, öğretmen karar verir, karar Karar Günlüğü'ne yazılır; yapay zekâ yeniden çağrılmaz. Sınırı: tek cihaz, öğretmene bildirim gitmez; kâğıt ya da başka cihazdan gelen talebi öğretmen elle ekler.

5. **"İnsan onayının biçimsel olmadığını nasıl biliyorsunuz?"**
   Karar Günlüğü her öneriyi ve kararı ayrı kaydediyor ve "öğretmen %N oranında değiştirdi" diyor; oran sıfırsa kart bunun biçimsel onay olduğunu yazıyor. Şüpheli soruda ikinci onay isteniyor ve Enter ile onaylanamıyor. Ölçüt düzeltilince tek tık kapanıyor. → §104, §71, §112; K1

6. **"Model hiç uyduruyor mu?"**
   Evet. İlk ölçümde kazanımdan üretilen 25 ÇSS'nin 8'inde anahtar yanlıştı. A5'te kusurlu oranı ≈%37; denetimler kusurluların %61'ini yakaladı, ≈57'si uyarısız geçti. Etiketleyiciler yapay zekâ, insan değil; bu ön bulgudur. → PANO 37/37

7. **"Yanlılık ölçtünüz mü?"**
   Öğrenci gruplarına göre hayır; cinsiyet ya da okul bilgisi toplamıyoruz. İzlemede bulduklarımız ve düzeltmeleri sistem kartında: dile sızan yabancı harfler, o günkü yedek modelin ~4 puan daha cömert olması, ortak sınavda şube karşılaştırması. Puanlayıcıdaki uzunluk yanlılığını izleyen ölçü kartta var, gerçek sınıf verisiyle henüz ölçülmedi. → [SISTEM-KARTI §7](./SISTEM-KARTI.md)

8. **"Öğrenci verisi nereye gidiyor?"**
   Kayıtlar öğretmenin tarayıcısında; veritabanımız yok. Puan önerisi için cevap metni, içindeki kayıtlı adlar maskelenerek, ABD'deki Cloudflare Workers AI'ya gidiyor. Velisi izin vermeyen öğrencinin cevabı hiç gitmiyor. → `/veri-nereye-gider`, §88, §107b; K3

---

## 6. B planı (güncel)

| Belirti | Ne yap |
|---|---|
| Kota dolu şeridi | Göster: "kota bitince elle devam". Deneyap üretimini atla |
| Canlıda demo eski (24 öğrenci yok, "Örnek veri" rozeti yok) | §123 yayınlanmamış demektir. Eski 23 Ekim senaryosuna dön ya da yerelde `npm run dev:demo` kullan |
| Demo şeridi takıldı | Şeritte **"Demoyu Bitir"** → **"▶ Rehberli demo (5 adım)"**. Demo alanında Sıfırla yok, "Demodan çık" var (§120) |
| İnternet yok | `docs/ekran/` görüntüleriyle anlat. Dolu sınıf ve kanıt turu için `Downloads\Mihenk\ekran-demo-120\` |
| "Veri başka sekmede değişti" kutusu | **"Yeniden yükle"**. Aynı siteyi iki sekmede açma (§119) |
