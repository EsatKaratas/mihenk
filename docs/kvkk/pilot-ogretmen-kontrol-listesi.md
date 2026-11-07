# Pilot Öğretmen Kontrol Listesi — KVKK ve Etik

> **Bu belge hukuki görüş değildir.** Pilot öncesi pratik bir hatırlatma listesidir; kurumun hukuk
> danışmanının ve okul yönetiminin yerine geçmez. Kaynaklar sonda.

## A. Pilottan önce

- [ ] **Okul yönetiminin onayı** alındı; veri sorumlusu (okul/kurum) belli ve aydınlatma metnindeki köşeli
      parantezli alanlar dolduruldu (`public/privacy-policy.html`).
- [ ] **MEB YAZEK etik beyanı:** Kamu okulunda çalışıyorsanız, MEB Eğitimde Yapay Zekâ Uygulamaları Etik
      Kılavuzu ve YAZEK beyan sistemi kapsamındaki **çevrimiçi etik beyanınızı** yaptınız. (MEB Yapay Zekâ
      Uygulamaları Etik Kurulu Yönergesi 22/23 Ekim 2025'te yürürlüğe girdi; kılavuz 10.01.2026'da duyuruldu.)
      Puan önerisi kılavuzun Tablo 1 C satırına girer, beyan zorunludur. "Açıklama" alanı için hazır metin ve
      ilke ilke uyum tablosu: [`docs/UYUM-TABLOSU.md`](../UYUM-TABLOSU.md) §2 ve §5.
- [ ] **Veli rıza formu** (`docs/kvkk/veli-riza-formu-taslak.md`) hukuk incelemesinden geçti ve her veliye
      dağıtıldı. Formda **iki ayrı açık rıza** (işleme; yurt dışına aktarım) ve "reddetmek dezavantaj
      yaratmaz" cümlesi var.
- [ ] Rıza vermeyen öğrencilerin listesi tutuluyor; bu öğrencilerin cevapları **yapay zekâya gönderilmeyecek,
      elle puanlanacak**.
- [ ] Bu öğrenciler için, **sınav başlamadan önce**, Öğretmen → Öğrenciler listesinde "YZ: izin yok" seçildi
      (iki rızadan biri eksikse de). Listeye yeni eklenen öğrenci (tekli ya da e-Okul'dan toplu) "YZ: rıza
      bekleniyor" ile başlar; rıza formu alınanları tek tek ya da "Tümünü işaretle (rıza formu alındıysa)"
      düğmesiyle açın (§107). Ayar sonradan kapatılırsa önceden gönderilmiş cevap geri alınamaz.
- [ ] **Sağlayıcı koşullarının tarihli kopyası** alındı ve saklandı (PDF ya da ekran görüntüsü, tarih görünür):
  - [ ] Cloudflare Workers AI Privacy — <https://developers.cloudflare.com/workers-ai/platform/privacy/>
  - [ ] Cloudflare Workers AI fiyat/kota sayfası — <https://developers.cloudflare.com/workers-ai/platform/pricing/>
  - [ ] Varsa AI Gateway kayıt ayarlarının ekran görüntüsü (içerik kaydı kapalı ya da yalnız meta veri).
  - Kopya tarihi: [GG.AA.YYYY] · Saklandığı yer: [klasör]
- [ ] Yalnız Cloudflare Workers AI kullanılıyor. **Gemini ücretsiz katmanı kullanılmıyor** (18 yaş altı
      uygulamalar koşullarda yasak; içerik eğitimde kullanılabiliyor). Yedek sağlayıcı varsa ona yalnız
      sentetik demo içeriği gidiyor.

## B. Demo ve tanıtım

- [ ] Demolarda **yalnızca sentetik (uydurma) öğrenci adları ve cevapları** ya da öğretmenin kendi yazdığı
      cevaplar kullanılıyor. Uygulamadaki "sınıf simüle et" ve örnek öğrenciler (Ada Yılmaz, Kerem Aydın…)
      sentetiktir.
- [ ] Ekran görüntüsü ve videoda gerçek öğrenci adı, cevabı ya da sınıf listesi görünmüyor.

## C. Kullanım sırasında

- [ ] Öğrencilere cevaplarına **ad, numara ya da kişisel ayrıntı yazmamaları** söylendi (sistem kayıtlı
      adları maskeler, ama her ayrıntıyı yakalayamaz).
- [ ] Değerlendirme ekranında "🔒 Ad bilgisi yapay zekâya gönderilmedi" notu görülürse, cevapta bir ad
      vardı ve istekten çıkarıldı demektir; bir işlem gerekmez.
- [ ] Yapay zekâ puanı **öneridir**; her puan öğretmen tarafından okunup onaylanıyor ya da değiştiriliyor.
- [ ] Okul cihazında çalışılıyorsa, ders sonunda tarayıcı oturumu kapatılıyor; paylaşılan cihazda
      "Verileri sıfırla" ile yerel veri temizleniyor. Dışa aktarılan CSV dosyaları (ad içerir) korunuyor.
- [ ] Yedek (⋯ → Yedekle) alınıyorsa: `.mihenk` dosyası **cihazdan çıkar** ve öğrenci adı içerdiği için
      **parolayla şifrelenir** (parola dosyada ya da tarayıcıda saklanmaz; unutulursa açılamaz). Paylaşmak
      gerekiyorsa "Adsız yedek" seçiliyor. Yedek Mihenk sunucusuna gitmez; dosya kurumun onayladığı yerde
      saklanıyor.

## D. Pilot sonunda

- [ ] Kurumun belirlediği süre sonunda cihazlardaki yerel veri "Verileri sıfırla" ile silindi; indirilen CSV
      dosyaları ve `.mihenk` yedekleri imha edildi.
- [ ] Veli başvuruları (m.11) ve rıza geri almaları kayda geçirildi ve en geç 30 gün içinde yanıtlandı (m.13).

---

### Kaynaklar (05.11.2026)

- MEB YZ Etik Kurulu Yönergesi yürürlüğü: Evrensel — <https://www.evrensel.net/haber/579534/meb-yapay-zeka-uygulamalari-etik-kurulu-yonergesi-yururluge-girdi>
- MEB Eğitimde YZ Uygulamaları Etik Kılavuzu ve YAZEK beyanı (10.01.2026) — <https://meb.gov.tr/egitimde-yapay-zeka-uygulamalari-etik-kilavuzu-yayimlandi/haber/39496/tr>
- KVKK Üretken Yapay Zekâ rehberi (24.11.2025; gövdesi incelenmedi) — <https://www.kvkk.gov.tr/Icerik/8547/uretken-yapay-zeka-ve-kisisel-verilerin-korunmasi-rehberi-15-soruda>
- Cloudflare Workers AI Privacy — <https://developers.cloudflare.com/workers-ai/platform/privacy/>
- Gemini API Terms (18 yaş altı, ücretsiz katmanda eğitim) — <https://aistudio.google.com/docs/terms>
- Kaynak derlemesi: `reports/Mihenk ücretsiz güvenilir altyapı.md`, bölüm (f).
