// Kör etiketleme aracı — saf mantık (DOM yok). Klasik <script> olarak yüklenir
// (file:// altında ES modülü engellendiği için), globalThis.MihenkEtiket'e bağlanır.
// Testler (vitest) aynı dosyayı içe aktarır: test/arastirma-araclari.test.ts.
// RNG ve tohum fonksiyonu tools/olcum/uyum-lib.mjs ile birebir aynıdır.
(function (kok) {
  'use strict';

  function mulberry32(tohum) {
    var t = tohum | 0;
    return function () {
      t = (t + 0x6d2b79f5) | 0;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** FNV-1a 32 bit — etiketleyici kodu + veri sürümünden tohum. */
  function metinTohumu(metin) {
    var h = 0x811c9dc5;
    for (var i = 0; i < metin.length; i++) {
      h ^= metin.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  /** Takma kod: 3–20 karakter, büyük harf/rakam/tire, EN AZ BİR RAKAM
   *  (ad-soyad yazılmasını zorlaştırmak için). */
  var KOD_DESENI = /^(?=.*[0-9])[A-Z0-9](?:[A-Z0-9-]{1,18})[A-Z0-9]$/;
  function kodNormalle(kod) { return String(kod || '').trim().toUpperCase(); }
  function kodGecerliMi(kod) { return KOD_DESENI.test(kodNormalle(kod)); }

  /** Etiketleyiciye özgü, deterministik sıra (Fisher–Yates). Girdiyi değiştirmez. */
  function karistir(idler, kod, veriSurumu) {
    var r = mulberry32(metinTohumu(kodNormalle(kod) + '|' + veriSurumu));
    var a = idler.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var g = a[i]; a[i] = a[j]; a[j] = g;
    }
    return a;
  }

  var OZEL = { YOK: 'Hiçbir şık doğru değil', BELIRSIZ: 'Tek doğru belirlenemiyor' };

  /** Bir etiketin kaydedilebilir olup olmadığı; hata listesi döndürür. */
  function etiketDenetle(e, siklar) {
    var h = [];
    if (!e) return ['etiket yok'];
    var harfler = (siklar || []).map(function (s) { return s.harf; });
    if (!(e.dogruSik in OZEL) && harfler.indexOf(e.dogruSik) < 0) h.push('Doğru cevabı seçin.');
    if (e.kusurlu !== true && e.kusurlu !== false) h.push('"Soru kusurlu mu?" sorusunu cevaplayın.');
    if ((e.dogruSik === 'YOK' || e.dogruSik === 'BELIRSIZ') && e.kusurlu === false) {
      h.push('Doğru cevap yoksa ya da belirlenemiyorsa soru kusurludur.');
    }
    if (e.not && e.not.length > 300) h.push('Not en çok 300 karakter.');
    return h;
  }

  /** İndirilecek JSON. Yalnız takma kod — ad, e-posta, okul YOK. */
  function disaAktar(durum, veri, simdi) {
    var etiketler = {};
    Object.keys(durum.etiketler || {}).sort().forEach(function (id) {
      var e = durum.etiketler[id];
      etiketler[id] = { dogruSik: e.dogruSik, kusurlu: e.kusurlu, kodlar: (e.kodlar || []).slice().sort(), not: e.not || '', sureSn: e.sureSn || 0 };
    });
    return {
      arac: veri.arac, aracSurumu: 1, veriSurumu: veri.veriSurumu, taksonomiSurumu: veri.taksonomi.surum,
      etiketleyici: kodNormalle(durum.kod), baslangic: durum.baslangic || null, disaAktarim: simdi || null,
      toplamMadde: veri.n, tamamlanan: Object.keys(etiketler).length, etiketler: etiketler,
    };
  }

  kok.MihenkEtiket = {
    mulberry32: mulberry32, metinTohumu: metinTohumu, kodNormalle: kodNormalle, kodGecerliMi: kodGecerliMi,
    karistir: karistir, etiketDenetle: etiketDenetle, disaAktar: disaAktar, OZEL: OZEL,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
