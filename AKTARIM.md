# PROJE AKTARIM DOKÜMANI (MASTER PROMPT)
## T3 Vakfı Creathon — Problem 2 · Takım BIES

> **Bu dokümanı okuyan yapay zekâ asistanına:**
>
> Bu, devam eden bir yarışma projesinin aktarım paketidir.
>
> 1. **Kodun tamamı GitHub'dadır** — bu dokümana kod gömülmemiştir, bilinçli
>    bir karardır (gerekçe §4). Önce şunu çalıştır:
>    `git clone https://github.com/EsatKaratas/t3-olcme-degerlendirme`
> 2. Depodaki **`PROGRESS.md`** dosyası bu projenin **tek doğruluk kaynağıdır**;
>    bulunan her hata, verilen her karar ve gerekçesi orada kayıtlıdır. Onu oku.
> 3. **`agents.md`** dosyasındaki kurallar oturum boyunca geçerli kısıtlardır.
>    Özellikle §7.1 (Human-in-the-Loop) hiçbir gerekçeyle esnetilemez.
> 4. §6'daki **"KALDIĞIMIZ NOKTA"** başlığından devam et. Kullanıcı başka bir
>    şey söylemediyse oradan başla, kendi başına yeni bir yön seçme.
> 5. Kullanıcıya görünen tüm metinler **Türkçe**, kod içindeki adlar İngilizce.
>
> Doküman tarihi: 25 Ağustos 2026

---

## 1. Projenin Amacı ve Mimari Özeti

**Problem 2:** Soru hazırlama, açık uçlu sınav değerlendirme ve kazanım
analizini yapay zekâ ile hızlandırmak; **nihai kararı ve puan onayını her zaman
öğretmende tutmak.**

**Değiştirilemez tez (Human-in-the-Loop):** Yapay zekâ soru, süre, rubrik ve
puan *önerir*. Hiçbir AI çıktısı insan onayından geçmeden bir sonraki aşamaya
geçemez. Otomatik onay eşiği eklemek yasaktır.

### Canlı adresler
| Ne | Nerede |
|---|---|
| Canlı sistem | https://t3-olcme-degerlendirme.t3-olcme-degerlendirme-sistemi.workers.dev |
| Depo (public) | https://github.com/EsatKaratas/t3-olcme-degerlendirme |
| Cloudflare hesabı | karatasesat@hotmail.com · `8f038be6be2c6e5ad71da437d444584a` |

**Takım BIES:** Esat Talha Karataş · İrem Yazıcı · Zeynep Sude Demir · Burak Özçelik
**Teslim:** 26 Ağustos 2026 · **Final:** 5-6 Eylül 2026, BAU Beşiktaş

### Mimari
```
public/index.html   1,9 KB — sadece iskelet
public/app.css      37 KB  — tüm stiller
public/app.js       176 KB — 4 rol prototipi (vanilla JS, build adımı yok)
   └─ fetch ─▶ Cloudflare Worker (Hono)
                 src/index.ts        giriş noktası
                 src/routes/ai.ts    /api/ai/{status,generate-questions,
                                              evaluate,rubric,sample-answers}
                 src/lib/prompts.ts  model istemleri ← JÜRİYE GÖSTERİLECEK DOSYA
                 src/lib/ai.ts       sağlayıcı bağımsız çağrı + yedek + JSON onarımı
                 src/schemas/ai.ts   Zod şemaları
                 └─ env.AI ─▶ Workers AI
```

**Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (birincil)
**Yedek:** `gemini-3.7-flash` (Gemini'nin OpenAI uyumlu ucu) — otomatik devreye girer

**MODEL EĞİTİLMEDİ.** Eğitilmiş bir model kullanılıyor. Yapılan iş modeli
rubrik/kaynak kısıtlarına, şema doğrulamasına ve insan onay zincirine tabi
kılmaktır. Jüri sorarsa cevap `PROGRESS.md` §7f'de hazır.

---

## 2. Dosya Ağacı

```
t3-olcme-degerlendirme/
├── AKTARIM.md              bu dosya
├── PROGRESS.md             TEK DOĞRULUK KAYNAĞI — önce bunu oku
├── README.md               jüri odaklı dokümantasyon
├── agents.md               geliştirme kuralları (ZORUNLU)
├── package.json            bağımlılıklar + 15 npm script
├── tsconfig.json           TypeScript strict
├── wrangler.jsonc          ÜRETİM yapılandırması (D1+R2+Queues+AI)
├── wrangler.demo.jsonc     DEMO yapılandırması (kullanılan bu)
├── schema.sql              D1 şeması — 14 tablo
├── routes.ts               tam rota iskeleti (referans; handler'lar TODO)
├── ANAHTAR-EKLE.bat        Gemini anahtarı doğrula + yükle (çift tıkla)
├── tools/
│   ├── check-jsonc.py      JSONC doğrulayıcı (npm run check:config)
│   ├── anahtar-dogrula.mjs anahtarı Google'a sorup Cloudflare'e yükler
│   └── test-gemini.mjs     yerel anahtar testi
├── src/
│   ├── index.ts            Worker giriş noktası
│   ├── routes/ai.ts        AI uçları
│   ├── lib/ai.ts           sağlayıcı katmanı + otomatik yedek
│   ├── lib/prompts.ts      4 model istemi
│   └── schemas/ai.ts       Zod şemaları
├── seed/turkishmmlu/       dataset dönüştürme (demoda KULLANILMIYOR)
└── public/
    ├── index.html · app.css · app.js
    ├── mimari.html · privacy-policy.html · 404.html · robots.txt
```

---

## 3. Teknolojiler ve Bağımlılıklar

| Katman | Teknoloji |
|---|---|
| Çalışma zamanı | Cloudflare Workers · `compatibility_date` 2025-03-10 · `nodejs_compat` |
| Framework | Hono ^4.6.14 |
| Doğrulama | zod ^3.24.1 · @hono/zod-validator ^0.4.2 |
| CLI | **wrangler ^4** (v3 DEĞİL — gerekçe §7) |
| Tipler | @cloudflare/workers-types **^5** (wrangler 4 şart koşuyor) |
| Frontend | Vanilla JS + CSS, build adımı yok, tek dosya |
| PDF | pdf.js 4.7.76 (CDN, istemci tarafı) |
| Node | ≥ 18 (kurulu: 24.19.0) |

**Kaldırıldı:** `@cloudflare/vitest-pool-workers` — wrangler 4 ile çözülemez
peer çakışması yaratıyordu, yalnızca testleri workerd içinde koşturmaya yarıyor.

```bash
npm install
npx wrangler login
npm run dev:demo       # http://localhost:8787
npm run deploy:demo    # canlıya al
npm run lint           # tsc --noEmit
npm run check:config   # JSONC doğrula
```

---

## 4. Tüm Güncel Kodlar

**Kod bu dokümana gömülmemiştir. Bu bilinçli bir karardır:**

- `public/app.js` tek başına **176 KB**, `app.css` **37 KB**, toplam kod
  ~250 KB. Bir sohbet mesajına sığmaz; sığdırılmaya çalışılırsa model
  kaçınılmaz olarak kısaltır veya **hatırlamadığı yerleri uydurur.**
- Depodan `git clone` ile alınan kod **kayıpsız, versiyonlu ve doğrulanabilir.**
- Bu projede daha önce bir aktarım denemesinde tam da bu yaşandı; `PROGRESS.md`
  §5'te kayıtlı.

```bash
git clone https://github.com/EsatKaratas/t3-olcme-degerlendirme
cd t3-olcme-degerlendirme && npm install
```

**Okuma sırası:** `PROGRESS.md` → `agents.md` → `src/lib/prompts.ts` →
`src/lib/ai.ts` → `src/routes/ai.ts` → `public/app.js`

---

## 5. Mevcut Durum

### 6 zorunlu MVP maddesinin tamamı ✅
Ayrıntılı denetim tablosu `PROGRESS.md` §7b'de. Özet: içerik+kazanım tanımlama ·
ÇSS ve açık uçlu üretimi · havuz+filtre+sınav kurma · rubrik · rubrik tabanlı
AI ön değerlendirme + öğretmen onayı · kazanım analizi. Üç zorunlu akış da
uçtan uca çalışıyor.

### Brief'i aşan özellikler
kapalı döngü (analizden soru üretimine dönüş) · kazanım kapsama denetimi ·
sınav bütünlüğü kaydı (yapıştırma tespiti dahil) · AI güven skoruna göre
sıralama · Bloom etiketi · çeldirici gerekçeleri · çoklu sınav · çoklu öğrenci ·
sınıflar arası ısı haritası · gelişim trendi · değerlendirme önbelleği ·
otomatik yedek sağlayıcı · KVKK metni

### Ölçülen değerler (canlı)
| İşlem | Süre |
|---|---|
| Soru üretimi (2 ÇSS + 1 açık uçlu) | 10-17 sn |
| Açık uçlu değerlendirme | 3-10 sn |
| Önbellekten değerlendirme | **0-6 ms** |
| Prompt injection denemesi | 0/20 ile reddedildi |

### Doğrulanmış son durum
`npm run lint` temiz · açılıştaki öz-kontrol temiz · 4 rol × tüm sekmeler
render hatasız · üretim 200 dönüyor (son test: puan 8, 3,7 sn, birincil model).

---

## 6. Çözülmemiş Sorunlar ve Sonraki Adımlar

### 🔴 KALDIĞIMIZ NOKTA — buradan devam et

**Gemini yedek sağlayıcısının son testi tamamlanmadı.**

Yaşanan zincir (hepsi çözüldü, sonuncusu doğrulanmadı):
1. Anahtar sohbete yapıştırıldı → iptal edildi, yenisi alındı
2. Terminale yapıştırma çalışmadı (tek karakter gitti) → dosya tabanlı
   yükleme aracı yazıldı (`ANAHTAR-EKLE.bat`)
3. Google "Please pass a valid API key" dedi → geçici `/api/ai/_diag` ucu
   eklendi, **saklanan anahtarın başında UTF-8 BOM (U+FEFF) olduğu görüldü**
4. `temizAnahtar()` eklendi (BOM + sıfır genişlikli karakter + boşluk temizliği),
   sunucu tarafında da uygulanıyor → anahtar hatası bitti
5. Yeni hata: **Gemini yanıtı token sınırında kesiliyordu**
   (`JSON dengeli biçimde kapanmıyor`)
6. `callOne()` içine **kesilme tespitinde token bütçesini 2 katına çıkarma**
   eklendi (`src/lib/ai.ts`) — TypeScript temiz, deploy edildi
   **ANCAK BU DÜZELTMENİN GEMİNİ ÜZERİNDE TESTİ YAPILMADI**

**Yapılacak ilk iş:**
```bash
# 1) Birincili geçici boz
#    wrangler.demo.jsonc → "AI_MODEL": "@cf/meta/GECICI-TEST"
npm run deploy:demo
# 2) Bir değerlendirme isteği at, meta.fellBack true mu ve puan geliyor mu bak
# 3) BAŞARILI OLSUN OLMASIN birincili GERİ AL:
#    "AI_MODEL": "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
npm run deploy:demo
```
⚠️ **Test sırasında üretim birincil model bozuk çalışır.** Bu oturumda iki kez
geri almayı geciktirdik ve site kısa süre AI'sız kaldı. Testten hemen sonra
geri al ve 200 döndüğünü doğrula.

Kesilme sorunu devam ederse: yedek için `maxTokens`'ı taban seviyede artır ya da
`gemini-2.0-flash` (düşünme yapmayan, daha kısa yazan) modeline geç.

### Diğer açık işler
- **Mobil uyum ve erişilebilirlik turu** — hiç yapılmadı
- Öğretmen kalibrasyonu (AI'dan ortalama sapma göstergesi)
- Isı haritasındaki "(örnek)" satırları hâlâ demo verisi (gerçek şubeler
  gerçek veriden; bu dürüstlük notu `PROGRESS.md`'de yazılı)
- Yerel yedek (simülasyon) modu soru türü/adet seçimini yok sayıyor
- **Kod dışı teslimatlar:** İş Modeli Kanvası (HİÇ YOK, zorunlu teslimat),
  pitch deck düzeltmeleri, demo videosu — bunları ekip arkadaşları yapıyor
- Deck'te **"hile önleyici kontroller"** ifadesi **"sınav bütünlüğü kaydı"**
  olarak düzeltilmeli (üründe engelleme yok, kayıt var)

---

## 7. Geliştirme Kuralları

### Kullanıcının açıkça istediği çalışma biçimi
1. **Önce kontrol, sonra işlem.** "Önemli kararları alırken gerekli kontrolleri
   sağla, önlemlerini al, sonra işleme geç. Hata istemem."
2. **Rasyonel ol, karşı çık.** Yanlış bir şey görürsen söyle; katılmıyorsan
   gerekçesiyle itiraz et. Kullanıcı bunu açıkça istedi.
3. **Uydurma.** Fiyat, limit, sürüm gibi bilgileri hafızadan verme — kaynağa bak.
   Bu oturumda "anahtar AIza ile başlar" varsayımı yanlış çıktı ve kullanıcıyı
   boşuna uğraştırdı.
4. **Her değişikliği test et, sonra commit et.** Ölçülen sayıları raporla.
5. **`PROGRESS.md`'yi güncel tut** — bağlam kaybına karşı tek sigorta.
6. **ETA ver.** İşlem öncesi tahmini süreyi söyle.

### Mimari kurallar (`agents.md` özeti)
- **§7.1 HITL değiştirilemez.** Otomatik onay eşiği eklenemez.
- Her `POST` gövdesi Zod ile doğrulanır.
- Her hata yanıtı `{ error, message }` biçiminde döner.
- `max_tokens` her çağrıda açıkça verilir; rate limit dakikada 5.
- Kaynak metin 6000 karakterle sınırlı.
- Sırlar `wrangler secret` ile yönetilir, koda/deponun içine ASLA girmez.
- Öğrenci verisiyle ilgili değişiklikte `privacy-policy.html` güncellenir.

### Bu projeye özgü, sert öğrenilmiş dersler
- **Sessiz geri düşüş yasak.** Model çağrısı başarısız olursa simülasyona düşüp
  sahte çıktıyı "AI üretti" diye gösterme. Kullanıcının ilk şikâyeti buydu.
- **Ne olduğunu ekranda yaz.** Yedek model kullanıldıysa, sonuç önbellekten
  geldiyse, veri simüleyse — hepsi arayüzde görünür.
- **Prompt'taki örnek değerler kopyalanır.** `"confidence": 0.72` örneği
  yüzünden model her yanıta 0.72 yazıyordu; sıralama özelliği işlevsizdi.
  Örneklere sabit sayı koyma.
- **Blok değiştirirken sınırları doğrula.** Bir yeniden yazımda `critRowHtml`
  ile `teacherTab3Html` arasındaki aralık fazladan 4 fonksiyon kapsadı ve
  onlar silindi; öğretmen sekmesi canlıda kırıldı. Bunun için `app.js` başında
  **öz-kontrol** var (50+ fonksiyonun varlığını denetler) — listeye yeni
  fonksiyon eklemeyi unutma.
- **JSONC'u regex ile ayrıştırma.** `//` dizisi URL'lerin içinde de geçiyor.
  `npm run check:config` kullan.
- **Yapılandırma değiştirdiysen `npm run check:config` çalıştır.** Bu dosyada
  daha önce sondaki virgül deploy'u kırdı.
- **Metin girdilerinde `renderAll()` çağırma** (odak kaybolur); `saveSoon()` ile
  diske yaz. Açık uçlu yanıtlar bir dönem hiç kaydedilmiyordu, "Kaydedildi ✓"
  göstergesi tamamen görseldi.
- **Yama dosyaya yazılmadan hata verirse, sonraki adımlar o değişikliklere
  bağımlı kod yazmasın.** Bu oturumda bir kez oldu, uygulama tutarsız kaldı.
