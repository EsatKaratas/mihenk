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
> Doküman tarihi: **26 Ağustos 2026** (son güncelleme)
>
> ⚠️ **Bu dosya bir özettir. Tek doğruluk kaynağı `PROGRESS.md`'dir** ve orada
> §10-§14 arası bu dosyadan daha yeni bilgi vardır. Çelişki görürsen
> `PROGRESS.md`'ye güven.

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
                 src/routes/ai.ts    7 uç: /api/ai/{status,generate-questions,
                                              evaluate,rubric,sample-answers,
                                              misconceptions,outcome-alignment}
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

**26 Ağustos'ta eklenenler** (ayrıntı `PROGRESS.md` §11-§14):
prompt injection sertleştirmesi + öğretmene sinyal · **madde analizi**
(güçlük/ayırt edicilik/işlevsiz çeldirici) · **öğretmen-AI uyumu** ve güven
skoru kalibrasyonu · **kavram yanılgısı kümeleme** · **gerçek MEB müfredat
kataloğu** (96 kazanım, yazılı/performans/süreç ayrımıyla) · **Bloom düzey
dengesi** · **kazanım-soru hizalama denetimi** (içerik geçerliği) ·
**uyaran metin** (metne dayalı soru artık metinle birlikte sunuluyor) ·
**öğrenciye geri bildirim taslağı** · mobil uyum · güvenlik başlıkları

### Ölçülen değerler (canlı, 26 Ağustos)
| İşlem | Süre |
|---|---|
| Soru üretimi (1 ÇSS + 1 açık uçlu) | ~9,7 sn |
| Soru üretimi (2 ÇSS + 1 açık uçlu) | 10-17 sn |
| Açık uçlu değerlendirme | 3,3-5,5 sn |
| Rubrik taslağı | ~2,7 sn |
| Kavram yanılgısı kümeleme | ~5,1 sn |
| Kazanım hizalama denetimi | 2,5-3,3 sn |
| Önbellekten değerlendirme | **0-6 ms** |
| **Prompt injection (5 vektör)** | **5/5 savunuldu** |

### Doğrulanmış son durum (26 Ağustos)
`npm run lint` temiz · `npx tsc --noEmit` temiz · `npm run check:config` 2/2 ·
açılıştaki öz-kontrol temiz · 4 rol × tüm sekmeler render hatasız · 7 AI ucu
canlıda 200 · mobilde yatay taşma yok (375 px) · XSS testi 14 alanda sızma yok ·
güvenlik başlıkları aktif (CSP dahil) · mimari sayfasındaki Mermaid diyagramları
render ediliyor.

---

## 6. Çözülmemiş Sorunlar ve Sonraki Adımlar

### 🔴 KALDIĞIMIZ NOKTA — buradan devam et

**Teslim 27 Ağustos 2026.** Kod tarafı güçlü durumda; sıradaki iş **kod dışı
teslimatlar**.

#### Bitmiş olanlar (ayrıntı: `PROGRESS.md` §10-§14)

| Konu | Durum |
|---|---|
| Gemini yedek sağlayıcı testi | ✅ `gemini-3.7-flash` canlıda doğrulandı (§10f) |
| Prompt injection savunması | ✅ 6/6 istemde sertleştirme, 5 vektörle test (§10e, §14e) |
| Madde analizi · kalibrasyon · kavram yanılgısı | ✅ (§11) |
| MEB müfredat kataloğu (96 kazanım) | ✅ (§12) |
| Bloom dengesi · kazanım-soru hizalama denetimi | ✅ (§13) |
| Ders-sınıf-kazanım tutarlılığı | ✅ (§14a) |
| **Uyaran metin** — "Metne göre…" sorusu artık metinle gösteriliyor | ✅ (§14c) |
| Öğrenciye geri bildirim taslağı | ✅ (§14d) |
| Güvenlik denetimi (rate limit, CSP, gizlilik metni) | ✅ (§14e) |
| Mobil uyum ve erişilebilirlik turu | ✅ (§10h) |

#### 🔴 Sıradaki iş — KOD DIŞI TESLİMATLAR

1. **İş Modeli Kanvası — hâlâ hiç yok, ZORUNLU TESLİMAT.**
2. **Deck bugünkü işlerin hiçbirini bilmiyor.** Eklenen ~12 ayrıştırıcı
   özelliğin hiçbiri sunumda yok. Jüri kodu okumaz; anlatılmayan özellik yok
   sayılır. Malzeme `README.md` §11 ve `PROGRESS.md` §11-§14'te hazır.
3. Deck'te **"hile önleyici kontroller"** → **"sınav bütünlüğü kaydı"**
   olarak düzeltilmeli (üründe engelleme yok, kayıt var).
4. Rakip analizi tablosu `canva.docx`'te var, deck'e taşınmadı.
5. Demo videosu.

#### ⚠️ Demo günü için bilinmesi gerekenler

- **Workers AI günlük kotası 26 Ağustos'ta doldu.** Kota dolduğunda sistem
  yedeğe düşer; yedek **Gemini ücretsiz katmanı günde yalnızca 20 istek**
  kabul eder (ölçüldü, §14f). İkisi de tükendiğinde AI uçları 502 döner ve
  bu ekranda açıkça yazılır (sessiz düşüş yok) — ama demo yapılamaz.
  **Sunumdan önce kota tazeliğini kontrol edin** ve gereksiz deneme yapmayın.
- Değerlendirme önbelleği (§7h) aynı yanıt+rubrik için yeniden ücret ödemez;
  provada bunu kullanın.
- `v-demo` tag'i (`agents.md` §8) sunumdan 24 saat önce atılmalı.

### Diğer açık işler (kod tarafı)

Aşağıdakiler bilinçli olarak finale (5-6 Eylül) bırakıldı; hiçbiri jüri
demosunu engellemez:

- **`label`/`for` erişilebilirlik turu** — `app.js` genelinde
  `<div class="field"><label>…</label><input></div>` kalıbı var; `label`'da
  `for`, `input`'ta `id` yok, ekran okuyucu ikisini bağlamıyor. Rubrik
  ekranındaki kritik alanlar `aria-label` ile tek tek düzeltildi (§10h);
  kalanı onlarca yerde tekrarlanıyor, teslim günü toplu değişiklik riskli
  görüldü.
- **`npm test` boş** — `agents.md` §6 vitest testlerini zorunlu tutuyor.
  Bugün eklenen saf hesap fonksiyonları (madde analizi, kalibrasyon, Bloom,
  rate limit) birim testine çok uygun; tarayıcıda ve Node'da doğrulandılar
  ama kalıcı test dosyası yok.
- Isı haritasındaki "(örnek)" satırları hâlâ demo verisi. Canlı şubeler
  (7-A, 7-B) gerçek veriden hesaplanıyor; yalnızca karşılaştırma sınıfları
  (6-A, 8-B, 8-C) simüle ve arayüzde "(örnek)" etiketli.
- Yerel yedek (simülasyon) modu soru türü/adet seçimini yok sayıyor.
  Gerçek model seçime uyuyor (ölçüldü, §10a).
- **CSP'de `style-src 'unsafe-inline'`** gerekli çünkü `app.js` 87 yerde
  inline `style="…"` kullanıyor. Stiller sınıflara taşınırsa bu izin de
  kaldırılabilir.
- Gemini yedeğinin günlük 20 istek limiti (§14f). Dayanıklı çözüm zincir
  yedek (Workers AI → Gemini → OpenAI) ya da kredi bazlı bir sağlayıcı.

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
