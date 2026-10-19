# A5 Aşama 2 — W4 yarısı (tek numaralı 113 ÇSS) · ÖN BULGU

> 20 Ekim 2026 · Mihenk Worker 4. Girdi: kör etiketler
> [`etiket-W4.json`](./etiket-W4.json) (`6c83bcf`, eşleme açılmadan
> commit'lendi) ve eşleme [`etiket-esleme.json`](./etiket-esleme.json)
> (`51728b4`). **Kontrolcü bir yapay zekâdır, insan alan uzmanı değil.**
> Bu dosya yalnız W4'ün yarısıdır; W1'in çift numaralı yarısıyla
> birleştirilmeden genel oran yazılmaz.

## 1. Kör etiket dağılımı (113)

doğru 59 · yanlış 32 (`ANH-OLGU` 17, `ANH-YOK` 15) · belirsiz 22.
Eşlemedeki işaretli şık kör dosyayla 113/113 aynı (bütünlük denetimi).

## 2. Denetimlerin yakalama ve yanlış alarm sayıları

"Hatalı" = yanlış + belirsiz. **Okuma uyarısı:** küme b tanım gereği bir
denetimin işaretlediği maddelerden, küme c işaretlenmemiş rastgele
maddelerden oluşur. Bu yüzden tüm satırların ham oranı yanlıdır. **Yanlı
olmayan tek taban küme a'dır.**

| Denetim | Küme a (taban, N=32) yakalama | Küme a yanlış alarm | Tümü (yanlı) yakalama | Tümü yanlış alarm |
|---|---:|---:|---:|---:|
| A1 bağımsız çözüm | 5 / 12 | 4 / 20 | 35 / 54 | 15 / 59 |
| A2 sayısal hesap | 2 / 12 | 1 / 20 | 21 / 54 | 3 / 59 |
| A3 uzun şık | 0 / 12 | 2 / 20 | 1 / 54 | 5 / 59 |
| A1 veya A2 | 6 / 12 | 5 / 20 | 43 / 54 | 17 / 59 |

Küme a'nın N'si çok küçük (12 hatalı); model bazında bölünmez. Ağırlıklı
yakalama oranı, iki yarı birleştirilip küme boyutlarıyla (a 68 · b 144 ·
c 40) hesaplanmalıdır. Kapsama: A2'nin "hesap" alanı 113 maddenin 56'sında
dolu; A1 sonucu 113/113.

## 3. A2'nin işaretlediği 24 madde — elle ayrım

| Sınıf | Sayı | Maddeler |
|---|---:|---|
| (i) Gerçek anahtar hatası, doğru şık başka | **12** | K007 K015 K025 K029 K033 K061 K063 K123 K129 K141 K157 K201. 10'unda `hesapBaskaSik` kör etiketteki doğru şıkla aynı. K025: doğru değer 28,6, en yakın şık 28 toleransın dışında, öneri yok. K123: modelin kendi hesabı yanlış (`(15/0,5)−1` = 29; doğrusu 30) ama uyarı doğru maddede |
| (ii) Doğru şık hiçbir şıkta yok (`ANH-YOK`) | **9** | K035 K045 K137 K143 K167 K173 K215 K219 + K019. K019'da uyarı doğru maddede ama sebebi tesadüf: şık bir formül metni |
| (iii) A2 yanlış pozitifi — şık metni işlem ifadesi | **2** | K113 (`40 km * 5 saat / 2 saat`), K175 (`2 * (30 + 10)`). Anahtar doğru; ayrıştırıcı şıktaki ilk sayıyı aldı |
| Diğer yanlış pozitif — yaklaşık değer | **1** | K069: hesap 1515 g, doğru kabul edilen şık 1500 g; tolerans şık yazımından türediği için uyarı kalktı |

**Yanlış pozitif oranı, işlem ifadeli doğru şıklarda:** 16 doğru maddede şık
metni işlem ifadesi; A2 bunların 2'sinde yanlış alarm verdi.

## 4. A1 yanlış alarmlarında harf–gerekçe çelişkisi (hipotez)

A1'in doğru anahtarlı maddelerde verdiği 15 yanlış alarmın **9'unda**
çözücünün kendi gerekçesi doğru değeri buluyor ama başka bir harf seçiyor.
Maddeler: K001, K067, K069, K097, K133, K139, K145, K169, K171. Örnek: K001
gerekçesi "3 saat sonra 40 bakteri", seçilen B (60); doğru şık A (40).
Kalan 6'sı gerçek uyuşmazlık: K049, K071, K111, K191, K193, K205.

Olası açıklamalar: şıklar çözücüye üretimden farklı sırayla ya da harfle
gidiyor olabilir, ya da model harfi değerden bağımsız seçiyor olabilir.
**Doğrulanmadı;** `/api/ai/solve` isteğinin şık sırası kodda kontrol
edilmeli. Doğrulanırsa A1'in yanlış alarm oranı büyük ölçüde bu hatadan
gelir ve yeniden ölçülmelidir.

## 5. Taksonomi

`DEN-YP-SIKIFADE` (denetim yanlış pozitifi: şık metni işlem ifadesi) bu
yarıda **2 vakayla gözlendi** ve taksonomiye v0.2.1 notuyla eklendi. Bu
kod modelin değil denetimin hatasını sayar.
