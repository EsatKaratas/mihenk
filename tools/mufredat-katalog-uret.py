# -*- coding: utf-8 -*-
"""Çıkarılan kazanımlardan ders/sınıf bazlı katalog dosyaları üretir.

UYGUNLUK SINIFLANDIRMASI ürünün kendi katkısıdır, müfredatın parçası DEĞİLDİR
(PROGRESS §12c). Amacı: bir Türkçe öğretmeni konuşma kazanımını çoktan seçmeli
soruyla ölçemez; sistem bunu bilmeli ve uyarmalı.

Kural mevcut (doğrulanmış) turkce-7.json'dan TÜRETİLDİ, uydurulmadı:
  surec      : "…yönetebilme" (materyal/strateji/süreç seçimi) ya da
               "…sürecini değerlendirebilme"
  yazili     : Okuma, Yazma
  performans : Dinleme/İzleme, Konuşma
Bu kuralın aynı 96 kaydı birebir yeniden ürettiği sınanır (dogrula()).
"""
import io, json, re, collections, sys

ALAN = {"D": "Dinleme/İzleme", "O": "Okuma", "K": "Konuşma", "Y": "Yazma"}

def uygunluk_turkce(kod, metin):
    harf = kod.split(".")[1]
    if re.search(r'yönetebilme$', metin) or re.search(r'sürecini değerlendirebilme$', metin):
        return "surec"
    return "yazili" if harf in ("O", "Y") else "performans"

# Fen/Matematik: dil becerisi değil, o yüzden alan bazlı ayrım geçersiz.
# Ölçüt fiilin kendisi: gözlemlenebilir bir ÜRÜN/EYLEM gerektiren çıktılar
# yazılı sınavla ölçülemez.
PERFORMANS_FIIL = re.compile(
    r'(model oluştur|model geliştir|tasarlayabilme|deney yap|deney tasarla|'
    r'gözlem yap|araştırabilme|bilgi toplayabilme|ürün|üretebilme|'
    r'oluşturabilme|hazırlayabilme|uygulayabilme)', re.I)
SUREC_FIIL = re.compile(r'(sürecini değerlendirebilme|yönetebilme)$', re.I)

def uygunluk_fenmat(kod, metin):
    if SUREC_FIIL.search(metin): return "surec"
    if PERFORMANS_FIIL.search(metin): return "performans"
    return "yazili"

def dogrula_turkce_kurali(yeni_tr):
    """Kural, doğrulanmış turkce-7.json'u birebir yeniden üretiyor mu?"""
    eski = json.load(io.open(
        r"C:\Users\pc\t3-olcme-degerlendirme\public\mufredat\turkce-7.json", encoding="utf-8"))
    beklenen = {k["kod"]: k["uygunluk"] for k in eski["kazanimlar"]}
    hata = []
    for kod, bek in beklenen.items():
        if kod not in yeni_tr: hata.append((kod, bek, "KAYIP")); continue
        bul = uygunluk_turkce(kod, yeni_tr[kod])
        if bul != bek: hata.append((kod, bek, bul))
    print("UYGUNLUK KURALI DOGRULAMASI (Türkçe 7): %d kayıt, %d uyuşmazlık"
          % (len(beklenen), len(hata)))
    for k, b, y in hata[:8]:
        print("   %s  beklenen=%s  bulunan=%s" % (k, b, y))
    return not hata


def sinif_no(kod):
    return int(re.match(r'(?:T\.[ODKY]|FB|MAT)\.(\d+)\.', kod).group(1))


def uret(ders, kaynak_ad, kayitlar, uyg_fn, alan_fn, cikti_onek):
    gruplar = collections.defaultdict(list)
    for kod, metin in kayitlar.items():
        gruplar[sinif_no(kod)].append((kod, metin))

    ozet = []
    for sinif in sorted(gruplar):
        kazanimlar = []
        for kod, metin in sorted(gruplar[sinif], key=lambda x: (
                x[0].split(".")[1] if ders == "Türkçe" else "",
                int(x[0].split(".")[-1]), x[0])):
            kazanimlar.append({
                "kod": kod,
                "alan": alan_fn(kod),
                "metin": metin,
                "uygunluk": uyg_fn(kod, metin),
            })
        veri = {
            "ders": ders,
            "sinif": sinif,
            "kaynak": kaynak_ad + " — %d. sınıf öğrenme çıktıları" % sinif,
            "not": ("uygunluk alanı ürünün kendi sınıflandırmasıdır, müfredatın parçası "
                    "değildir. yazili: yazılı sınavla ölçülebilir · performans: "
                    "gözlem/performans gerektirir · surec: öğrenme sürecine aittir, "
                    "sınav sorusu olmaz."),
            "kazanimlar": kazanimlar,
        }
        yol = r"C:\Users\pc\t3-olcme-degerlendirme\public\mufredat\%s-%d.json" % (cikti_onek, sinif)
        io.open(yol, "w", encoding="utf-8").write(json.dumps(veri, ensure_ascii=False, indent=1))
        say = collections.Counter(k["uygunluk"] for k in kazanimlar)
        ozet.append((sinif, len(kazanimlar), dict(say)))
    return ozet


if __name__ == "__main__":
    tr = json.load(io.open("turkce-liste.json", encoding="utf-8"))
    fen = json.load(io.open("fen-ham.json", encoding="utf-8"))
    mat = json.load(io.open("mat-ham.json", encoding="utf-8"))

    if not dogrula_turkce_kurali(tr):
        print("\n!! Uygunluk kuralı doğrulanamadı — üretim durduruldu.")
        sys.exit(1)
    print()

    for ders, kaynak, veri, uyg, alan_fn, onek in [
        ("Türkçe", "MEB Ortaokul Türkçe Dersi Öğretim Programı", tr,
         uygunluk_turkce, lambda k: ALAN[k.split(".")[1]], "turkce"),
        ("Fen Bilimleri", "MEB Ortaokul Fen Bilimleri Dersi Öğretim Programı", fen,
         uygunluk_fenmat, lambda k: "Fen Bilimleri", "fen"),
        ("Matematik", "MEB Ortaokul Matematik Dersi Öğretim Programı", mat,
         uygunluk_fenmat, lambda k: "Matematik", "matematik"),
    ]:
        ozet = uret(ders, kaynak, veri, uyg, alan_fn, onek)
        print("%-14s" % ders, " ".join("%d.sınıf:%d %s" % (s, n, d) for s, n, d in ozet))
