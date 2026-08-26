# -*- coding: utf-8 -*-
"""MEB Maarif Modeli müfredat PDF'lerinden ÖĞRENME ÇIKTILARINI çıkarır.

Yapı (Fen ve Matematik):
    FB.5.1.1. Güneş'in yapısı ve dönme hareketi ile ilgili bilgi toplayabilme
    a) ...   <- SÜREÇ BİLEŞENİ, kazanım değil
    b) ...

Kural: kod satırından sonra gelen metin, bir sonraki "a)" ya da yeni kod
görülene kadar sürer. Öğrenme çıktıları "-bilme/-abilme/-ebilme" ile biter.

TUZAKLAR (Türkçe 7 çıkarımında yaşandı, PROGRESS §12b):
  1. Satır sonu tiresi:  "değer -\nlendirir" -> "değerlendirir"
  2. Metin içi atıflar:  "(T.D.7.7.)" satır başına düşüp kazanım sanılabilir
  3. Sayfa üstbilgisi metne karışır ("78 FEN BILIMLERI DERSI ÖĞRETIM PROGRAMI78")
"""
import io, re, json, sys, unicodedata

# --- 1. Satır sonu tirelerini birleştir --------------------------------------
def tire_birlestir(t):
    # "kul-\nlanımına" -> "kullanımına" ; "değer -\nlendirir" -> "değerlendirir"
    t = re.sub(r'(\w)\s*[-‐‑–]\s*\n\s*(\w)', r'\1\2', t)
    return t

# --- 2. Sayfa üstbilgisi/altbilgisi satırlarını at ---------------------------
GURULTU = re.compile(
    r'^\s*\d{1,3}\s*$'                                   # yalnız sayfa numarası
    r'|^\s*\d{0,3}\s*(FEN BILIMLERI|FEN BİLİMLERİ|MATEMATİK|MATEMATIK|ORTAOKUL)'
    r'.*?(ÖĞRETIM|ÖĞRETİM) PROGRAMI\s*\d{0,3}\s*$',
    re.I)

def temizle(t):
    t = tire_birlestir(t)
    satirlar = [s for s in t.split("\n") if not GURULTU.match(s)]
    return "\n".join(satirlar)

# --- 3. Çıkarım --------------------------------------------------------------
def cikar(metin, kod_kalibi):
    """Kod -> öğrenme çıktısı metni.

    Bir kod PDF'te BİRDEN FAZLA yerde geçebilir: öğrenme çıktısı listesinde
    ve "Öğrenme-Öğretme Uygulamaları" bölümünde. İkincisinde kodun ardından
    pedagojik NOT gelir, kazanım değil (Matematik'te 16 kayıtta yaşandı).

    Bu yüzden "ilk geçen kazanır" YANLIŞTIR. Tüm adaylar toplanır ve öğrenme
    çıktısı kalıbına uyan seçilir: "-bilme" ile biter ve makul uzunluktadır.
    """
    t = temizle(metin)
    # Kod SATIR BAŞINDA OLMAYABİLİR. Matematik'te tablo başlığı aynı satıra
    # düşüyor: "ÖĞRENME ÇIKTILARI\nVE SÜREÇ BİLEŞENLERİ MAT.5.1.3. Gerçek…"
    # Bu yüzden satır başı şartı kaldırıldı; kod, satır başında ya da bir
    # boşluktan sonra gelebilir.
    kod_re = re.compile(r'(?:^|\s)(' + kod_kalibi + r')\.?\s*\n?[ \t]*(.*)$', re.M)
    surec_re = re.compile(r'^\s*[a-zçğıöşü]\)\s')

    bulunanlar = list(kod_re.finditer(t))
    adaylar = {}
    for i, m in enumerate(bulunanlar):
        kod = m.group(1)
        son = bulunanlar[i + 1].start() if i + 1 < len(bulunanlar) else len(t)
        govde = m.group(2) + "\n" + t[m.end():son]

        parcalar = []
        for satir in govde.split("\n"):
            if surec_re.match(satir):
                break
            parcalar.append(satir.strip())
        cikti = re.sub(r'\s+', ' ', " ".join(p for p in parcalar if p)).strip()


        # Öğrenme çıktısı "-bilme" ile BİTER. Çok sütunlu tablolarda yan
        # sütunun başlığı aynı satıra düşüp metne yapışabiliyor
        # ("…kullanabilme Yazma"). İlk "bilme" ile biten kelimeden sonrası
        # kesilir — kural biçimsel, tahmin değil.
        # NOT: `\bbilme` YANLIŞTI — "kullanabilme" içinde "bilme"den önce
        # kelime sınırı yoktur, hiç eşleşmiyordu. Doğrusu: "bilme" ile BİTEN
        # bir kelime ara (sonrasında kelime sınırı olsun).
        kes = re.search(r'^(.*?bilme)\b', cikti)
        if kes:
            cikti = kes.group(1)

        if cikti:
            adaylar.setdefault(kod, []).append(cikti)

    def puan(metin):
        """Öğrenme çıktısı olma olasılığı. Yüksek = daha iyi aday."""
        p = 0
        if re.search(r'bilme$', metin): p += 100          # kesin işaret
        if 15 <= len(metin) <= 200: p += 20
        if len(metin) > 260: p -= 40                      # açıklama paragrafı
        if re.search(r'[A-ZÇĞİÖŞÜ]{1,4}\.\d+\.\d+\.\d+', metin): p -= 30
        # Pedagojik not kalıpları
        if re.search(r'beklenir|yapılabilir|sağlanır|verilir|öğrencilerden', metin, re.I): p -= 25
        return p

    return {k: max(v, key=puan) for k, v in adaylar.items()}

# --- 4. Kalite denetimi ------------------------------------------------------
def denetle(kayitlar, ad):
    sorun = {"bilme_ile_bitmeyen": [], "cok_uzun": [], "cok_kisa": [],
             "icinde_kod_gecen": [], "tire_kalan": [], "parantezle_baslayan": []}
    for kod, metin in kayitlar.items():
        if not re.search(r'bilme$', metin):
            sorun["bilme_ile_bitmeyen"].append((kod, metin[:70]))
        if len(metin) > 220:
            sorun["cok_uzun"].append((kod, metin[:70]))
        if len(metin) < 12:
            sorun["cok_kisa"].append((kod, metin))
        if re.search(r'\b[A-ZÇĞİÖŞÜ]{1,4}\.\d+\.\d+\.\d+', metin):
            sorun["icinde_kod_gecen"].append((kod, metin[:70]))
        if re.search(r'\w-\s', metin):
            sorun["tire_kalan"].append((kod, metin[:70]))
        if metin.startswith((")", "(")):
            sorun["parantezle_baslayan"].append((kod, metin[:70]))
    print("--- %s kalite denetimi ---" % ad)
    for k, v in sorun.items():
        print("  %-24s %d" % (k, len(v)))
        for kod, ornek in v[:4]:
            print("        %s  %s" % (kod, ornek))
    return sorun


if __name__ == "__main__":
    hedef = sys.argv[1]
    kalip = sys.argv[2]
    t = io.open(hedef + ".txt", encoding="utf-8").read()
    k = cikar(t, kalip)
    print("%s -> %d benzersiz kod" % (hedef, len(k)))
    denetle(k, hedef)
    io.open(hedef + "-ham.json", "w", encoding="utf-8").write(
        json.dumps(k, ensure_ascii=False, indent=1))
