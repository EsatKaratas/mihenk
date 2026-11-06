# Veli Bilgilendirme ve Açık Rıza Formu (TASLAK)

> **Bu belge hukuki görüş değildir.** Pilot uygulama için hazırlanmış bir taslaktır. Okul/kurum,
> kullanmadan önce bir hukuk danışmanına incelettirmeli, köşeli parantezli alanları doldurmalıdır.
> Dayanılan kaynaklar belgenin sonunda listelenmiştir.

**Okul / Kurum (veri sorumlusu):** [Kurum/Okul Adı] · [adres] · [iletişim e-postası]
**Uygulama:** Mihenk — yapay zekâ destekli ölçme-değerlendirme aracı (pilot)
**Öğretmen:** [ad-soyad] · **Ders / Sınıf:** [ders] / [sınıf-şube]
**Öğrenci:** [ad-soyad]

---

## 1. Kısa bilgilendirme

Öğretmenimiz, açık uçlu sınav sorularına verilen cevapları değerlendirirken Mihenk adlı bir araçtan
**öneri** almak istemektedir. Araç, cevabı öğretmenin belirlediği ölçütlere (rubriğe) göre okuyup bir puan
önerisi ve geri bildirim taslağı üretir. **Puanı her zaman öğretmen verir;** yapay zekânın önerisi öğretmen
onaylamadan öğrenciye ya da karneye yansımaz.

**Yapay zekâya gönderilen:** soru metni, ölçütler ve çocuğunuzun **cevap metni**.
**Gönderilmeyen:** çocuğunuzun adı, soyadı, okul numarası, sınıfı/şubesi ve okul adı. Cevap metninde
çocuğunuzun ya da bir arkadaşının kayıtlı adı geçerse, gönderimden önce `[ÖĞRENCİ]` ile değiştirilir.

**Bilmeniz gereken risk:** Ad maskelenmiş olsa da çocukların serbest yazdığı metin, kendisini tanıtan başka
ayrıntılar (ör. aile, yaşanan bir olay) içerebilir. Bu nedenle cevap metni kişisel veri olarak kabul edilir.

**Nereye gider:** Cevap metni, yapay zekâ hizmetini sağlayan **Cloudflare, Inc.** şirketinin sunucularına
(**Amerika Birleşik Devletleri**) iletilir. Bu, KVKK m.9 kapsamında **yurt dışına aktarım** sayılır. Ücretsiz
hizmet katmanında sağlayıcıyla KVKK standart sözleşmesi imzalanmamaktadır; bu nedenle aktarım için ayrıca
rızanız istenmektedir. Cloudflare, bu hizmette müşteri içeriğini izin olmadan model eğitiminde kullanmadığını
ve ayrı bir depolama ürünü eklenmedikçe saklamadığını beyan etmektedir
(<https://developers.cloudflare.com/workers-ai/platform/privacy/>, [erişim tarihi]). Mihenk sunucusu cevabı
saklamaz; sınav verileri öğretmenin cihazındaki tarayıcıda tutulur. Öğretmen bu verilerin yedeğini alırsa
yedek dosyası (`.mihenk`) öğretmenin cihazına iner, ad içerdiği için parolayla şifrelenir ve Mihenk
sunucusuna gönderilmez.

Ayrıntılı aydınlatma metni: [uygulama adresi]/privacy-policy.html

---

## 2. Rıza vermemek

**Rıza vermemeniz ya da rızanızı sonradan geri almanız çocuğunuzu hiçbir şekilde dezavantajlı duruma
düşürmez.** Bu durumda çocuğunuzun cevabı yapay zekâya gönderilmez ve öğretmen tarafından elle değerlendirilir;
notu, sınav hakkı ya da ders içi etkinlikleri bundan etkilenmez.

Aşağıdaki iki rıza **birbirinden bağımsızdır**. Birini verip diğerini vermeyebilirsiniz. Ancak yapay zekâ
değerlendirmesi ancak **ikisi birden** verildiğinde kullanılabilir; yalnızca biri işaretlenirse cevap elle
değerlendirilir. Öğretmen bu durumda uygulamadaki öğrenci listesinde çocuğunuz için "YZ: izin yok" ayarını
seçer; bu ayar açıkken çocuğunuzun cevabı hiçbir yapay zekâ isteğine (puan önerisi ya da sınıf düzeyinde
yanılgı analizi) girmez.

---

## 3. Açık rıza beyanları

### Rıza 1 — Yapay zekâ ile işleme

Çocuğumun açık uçlu sınav cevap metninin, adı ve kimlik bilgileri çıkarılarak, öğretmene puan önerisi ve geri
bildirim taslağı üretmek amacıyla yapay zekâ ile işlenmesine:

- [ ] **Rıza veriyorum**
- [ ] **Rıza vermiyorum**

### Rıza 2 — Yurt dışına aktarım

Yukarıdaki işleme için çocuğumun cevap metninin, muhtemel riskler hakkında bilgilendirilmiş olarak,
Cloudflare, Inc.'e (Amerika Birleşik Devletleri) aktarılmasına:

- [ ] **Rıza veriyorum**
- [ ] **Rıza vermiyorum**

---

## 4. Haklarınız ve geri alma

KVKK m.11'deki haklarınızı (verinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltme, silme, aktarılan
üçüncü kişileri bilme, itiraz, zararın giderilmesi vb.) [iletişim e-postası] adresine yazarak
kullanabilirsiniz. Rızanızı istediğiniz zaman, aynı adrese yazarak ya da öğretmene bildirerek geri
alabilirsiniz; geri alma, o tarihten sonraki işlemler için geçerlidir (daha önce gönderilmiş bir cevap için
yapılmış değerlendirme geri alınamaz; Mihenk sunucusu o cevabı saklamamıştır).

---

**Veli / vasi adı-soyadı:** ______________________ **Yakınlığı:** __________

**Tarih:** ___ / ___ / ______ **İmza:** ______________________

*(Okul nüshası. Bir nüsha veliye verilir.)*

---

### Dayanılan kaynaklar (05.11.2026)

- Yurt dışına aktarım, standart sözleşme ve arızi aktarım istisnaları: Erdem & Erdem, "Yurt dışına kişisel veri
  aktarımı rehberi", 31.01.2025 — <https://www.erdem-erdem.av.tr/bilgi-bankasi/yurt-disina-kisisel-veri-aktarimi-rehberi-neleri-duzenliyor>
- Çocuk adına velinin hareket etmesi: İstanbul Bilgi Üniversitesi tezi — <https://openaccess.bilgi.edu.tr/items/e347cb00-4ca5-4830-bb9e-bcafa3df5d32/full>
- Açık rızanın ayrı, belirli ve reddetmenin dezavantaj yaratmaması: KVKK rehberine ilişkin haber (NTV) —
  <https://www.ntv.com.tr/teknoloji/kvkk-cerezler-icin-rehber-hazirladi,BdjApRquJEmK4KG6JZ-IpQ>
- Sağlayıcı beyanı: Cloudflare Workers AI Privacy — <https://developers.cloudflare.com/workers-ai/platform/privacy/>
- KVKK üretken yapay zekâ rehberi (24.11.2025; gövdesi bu taslakta incelenmedi) —
  <https://www.kvkk.gov.tr/Icerik/8547/uretken-yapay-zeka-ve-kisisel-verilerin-korunmasi-rehberi-15-soruda>
- Kaynak derlemesi: `reports/Mihenk ücretsiz güvenilir altyapı.md`, bölüm (f).
