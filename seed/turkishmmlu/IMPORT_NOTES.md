# TurkishMMLU (test split) → D1 içe aktarım notları

Kaynak: `AYueksel/TurkishMMLU`, test split, 900 soru (9 ders × 100 soru,
9-12. sınıf, lise). Dönüştürücü: `convert_turkishmmlu.py`.

## Ne çözüldü

| # | Orijinal sorun | Uygulanan çözüm |
|---|---|---|
| 1 | Ders adları İngilizce, taksonomiyle uyuşmuyor | `SUBJECT_MAP` ile lise ders adı + kısa kod eşlemesi (`Biology→Biyoloji/BIY`, vb.) |
| 2 | Kazanım (learning_outcome) kodu hiç yok | Ders+sınıf başına **placeholder** kazanım satırı (`BIY.10.GENEL` gibi) — `01_learning_outcomes.sql` |
| 3 | `answer` 0-4 index, `choices` düz liste | `correct_option_key` (A-E) + `options` JSON (`[{"key":"A","text":...}]`) dönüşümü |
| 4 | `ai_estimated_time_sec` alanı veride yok | Zorluğa göre heuristik: easy=45s, medium=75s, hard=120s |
| 5 | ~%16 soru LaTeX/formül/tablo işaretine bağımlı (bazıları görsele bağlı, düz metinle anlamsız) | Ayrıştırılıp `excluded_latex_flagged.json`'a alındı, varsayılan seed'e girmedi |
| 6 | HITL ilkesi: içeri aktarılan sorular onaysız kullanılamaz | Tüm satırlar `status='pending_review'` ile girer — İçerik Uzmanı onayından geçmeden soru havuzunda "approved" görünmez |

## Sonuç sayıları (gerçek `schema.sql` üzerinde SQLite ile doğrulandı)

- Kaynak: 900 soru
- İçe aktarılan (temiz): **758** soru → `02_questions.sql`
- Formül/tablo nedeniyle dışlanan: **142** soru → `excluded_latex_flagged.json`
- Oluşturulan placeholder kazanım sayısı: **34** (ders × sınıf kombinasyonu; her ders her sınıfta yok, örn. Felsefe sadece 10-11)
- Zorluk dağılımı (içe aktarılan): easy 242 / medium 338 / hard 178
- Bütünlük kontrolü: 0 yetim soru (her soru geçerli bir `learning_outcome_id`'ye bağlı), 0 bozuk/uyumsuz `options` JSON'u — bkz. doğrulama komutları aşağıda.

## Bilerek çözülMEYEN / hâlâ manuel iş gerektiren noktalar

- **Placeholder kazanımlar ince taneli değil.** `BIY.10.GENEL` gerçek bir kazanım
  kodu değildir — İçerik Uzmanı panelinden, her soruya asıl müfredat kazanımı
  (örn. `BIY.10.3.2`) atanmalı. Bu placeholder'lar sadece "sorunun hangi
  ders+sınıfa ait olduğu" bilgisini taşır, sistemi bloklamaz.
- **Açık uçlu/rubrik verisi yok.** Bu içe aktarım sadece çoktan seçmeli soru
  havuzunu (`questions.type='multiple_choice'`) besler; AI puanlama/öğretmen
  onayı (`ai_evaluations`/`teacher_reviews`) demosu için hâlâ ayrı pilot veri
  gerekiyor.
- **142 dışlanan soru** kayıp değil, `excluded_latex_flagged.json` içinde
  duruyor. Prototipe bir KaTeX/MathJax render katmanı eklenirse (veya bu
  sorular manuel düzenlenirse) sonradan aynı script mantığıyla içeri
  alınabilir. Bir kısmı (örn. genotip çaprazlama tabloları) düz metinle zaten
  anlamsız olduğu için görsel/tablo editörü gerektirir.
- **Sınıf aralığı 9-12 (lise), prototipteki demo sabitleri (`GRADES`,
  `OUTCOMES`) 5-8 (ortaokul) için kurgulu.** `prototip.html`'i bu grade
  aralığını gösterecek şekilde genişletmek istenirse ayrı bir adım olarak
  yapılmalı — bu dönüştürücü sadece veritabanı/seed tarafını çözer.
- **Lisans/kullanım kapsamı:** bu, dataset'in gated **test** split'idir; ham
  JSON'u genel erişime açık bir repoya commit'lemeyin, sadece yerel/demo D1
  seed'i olarak kullanın ve kaynağı README'de atıf ile belirtin.

## Nasıl yüklenir

```bash
# yerel D1'e
npx wrangler d1 execute olcme-db --local --file=./seed/turkishmmlu/01_learning_outcomes.sql
npx wrangler d1 execute olcme-db --local --file=./seed/turkishmmlu/02_questions.sql

# doğrulama (örnek)
npx wrangler d1 execute olcme-db --local --command \
  "SELECT status, count(*) FROM questions GROUP BY status;"
```

## Yeniden üretmek / farklı bir dosyaya uygulamak için

```bash
python3 convert_turkishmmlu.py /path/to/TurkishMMLU_test.json
```

Bu script deterministiktir: aynı girdi için her çalıştırmada aynı 4 çıktıyı
(`01_learning_outcomes.sql`, `02_questions.sql`,
`excluded_latex_flagged.json`, `import_summary.json`) üretir.
