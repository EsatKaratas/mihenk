# Etiketleme yönergesi (öğretmen için, 1 sayfa)

**Ne yapıyorsunuz?** Yapay zekânın ürettiği 225 çoktan seçmeli soruyu bir öğretmen gözüyle
değerlendiriyorsunuz. Bugüne kadar bu soruları yalnız yapay zekâ etiketledi; sizin kararlarınız,
o etiketlerin ne kadar güvenilir olduğunu ölçmek için kullanılacak (ARASTIRMA §7.1, Ay 1 hedefi).

**Süre:** soru başına 1–2 dakika, toplam **≈ 4–6 saat**. Tek oturumda bitirmeniz gerekmez; ilerleme
tarayıcınızda saklanır, aynı kodla döndüğünüzde kaldığınız yerden devam edersiniz.

## Başlarken

1. Size gönderilen `etiket` klasörünü açın ve **`index.html`** dosyasına çift tıklayın (Chrome, Edge
   ya da Firefox). İnternet gerekmez; sayfa hiçbir yere veri göndermez.
2. **Takma kod** girin: size verilen kodu (ör. `OGR-07`) ya da "Rastgele kod üret" düğmesinin
   verdiği kodu kullanın. **Adınızı, e-postanızı ya da okulunuzu yazmayın.** Kodu bir yere not edin.
3. "Başla / devam et" deyin. Soruların sırası size özeldir; başka öğretmenle karşılaştırmayın.

## Her soruda üç karar

Sistemin cevap anahtarını, soruyu hangi modelin ürettiğini ve yapay zekânın kararını **görmezsiniz**.
Soruyu kendiniz çözün.

1. **Doğru cevap hangisi?** Doğru şıkkı seçin. Doğru cevap hiçbir şıkta yoksa *"Hiçbir şık doğru
   değil"*; birden çok şık savunulabiliyorsa, veri eksikse ya da soru kendi içinde tutarsızsa
   *"Tek doğru belirlenemiyor"* seçin.
2. **Soru kusurlu mu?** Bu soruyu bu hâliyle öğrencinize sorar mıydınız? Sormazsanız "Evet, kusurlu".
   (Doğru cevap yoksa ya da belirlenemiyorsa araç bunu kendisi "Evet" yapar.)
3. **Gördüğünüz sorunlar** (isteğe bağlı, birden çok): soru kökü yok, iki şık aynı anlamda, kazanım
   ya da sınıf düzeyi dışında, tek adımlı, gereksiz veri, gösterilmeyen metne/grafiğe atıf, yabancı
   harf/kelime… Her kodun açıklaması seçeneğin altında yazar ([HATA_TAKSONOMISI.md](../HATA_TAKSONOMISI.md)).

Emin olamadığınız bir soruda ilk izleniminizi verin ve isterseniz "Not" alanına kısaca yazın
(en çok 300 karakter, **kişi adı yazmayın**). Başkasına danışmayın; bağımsız karar ölçülüyor.

## Nasıl gönderilir?

1. Bitince (ya da ara verirken yedek almak için) üstteki **"Sonuçları indir (JSON)"** düğmesine basın.
   `mihenk-etiket-<KODUNUZ>.json` adlı bir dosya iner.
2. Bu dosyayı size yönergeyi gönderen kişiye e-postayla ya da size söylenen klasöre yükleyerek iletin.
3. Başka bir bilgisayarda devam etmek için giriş ekranındaki **"İndirdiğim dosyadan devam et"**
   bağlantısıyla aynı dosyayı yükleyin.

## Gizlilik

- Sorular yapay zekâ çıktısıdır; **öğrenci verisi yoktur**, sizden öğrenci bilgisi istenmez.
- İnen dosyada yalnız **takma kodunuz**, kararlarınız ve soru başına süre (saniye) bulunur.
  Takma kod ile kimliğiniz arasındaki eşlemeyi yalnız araştırmacı tutar; yayınlarda kullanılmaz.
- Tarayıcınızın gizli penceresinde ilerleme saklanmayabilir; bu durumda sık sık dosyayı indirin.

---

*Araştırmacı için:* uyum hesabı `npm run olcum:uyum -- <dosyalar ya da klasör>` (insan–insan ve
insan–YZ Cohen κ, 2+ öğretmende Fleiss κ, bootstrap %95 GA). Araç verisi `npm run etiket:veri` ile
`docs/olcum/a5/etiket-kor.json`'dan üretilir. Klasörü öğretmene gönderirken yalnız
`tools/etiket/` içindeki `index.html`, `cekirdek.js` ve `sorular.js` dosyalarını verin
(`veri-uret.mjs` gerekmez); depodaki öteki dosyalar YZ etiketlerini ve anahtarı içerir.
