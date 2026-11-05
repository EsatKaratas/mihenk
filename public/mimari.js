// Mermaid yükleyici — mimari.html için.
//
// İKİ HATA BURADA DÜZELTİLDİ (güvenlik denetimi sırasında bulundu,
// PROGRESS §14e):
//
// 1) Kod eskiden mimari.html içinde inline <script type="module"> olarak
//    duruyordu. CSP eklenince sorun büyüdü: 'unsafe-inline' izni inline
//    MODULE script'lerde geçersizdir (modüller nonce/hash ister). Harici
//    dosyaya taşındı; böylece CSP'den 'unsafe-inline' de kaldırılabildi.
//
// 2) ASIL HATA — CSP'den ÖNCE DE VARDI: mermaid `startOnLoad: true` ile
//    başlatılıyordu. startOnLoad, DOMContentLoaded olayını bekler; ama
//    `await import(...)` asenkron olduğu için mermaid yüklendiğinde o olay
//    çoktan geçmiş oluyor ve tarama hiç tetiklenmiyordu. Sonuç: diyagramlar
//    ham metin olarak kalıyordu ve try/catch bir hata da yakalamadığı için
//    sessizce başarısız oluyordu.
//    Çözüm: startOnLoad kapatılıp render açıkça run() ile tetiklenir.
//
// Yüklenemezse sayfa bozulmaz; diyagram ham metin olarak kalır ve konsola
// açık bir uyarı düşer (sessiz başarısızlık yok).
try {
  // Yerel, TAM sürüme sabit kopya (PROGRESS §87). Eskiden jsdelivr'den
  // `mermaid@11` aralığıyla geliyordu; aralık her yeni 11.x'te sessizce
  // değişebiliyordu. 11.17.2 = jsdelivr'in 05.11.2026'da @11 için çözdüğü sürüm.
  const m = await import('/vendor/mermaid@11.17.2/mermaid.esm.min.mjs');
  const koyu = matchMedia('(prefers-color-scheme: dark)').matches
    && document.documentElement.getAttribute('data-theme') !== 'light';
  m.default.initialize({ startOnLoad: false, theme: koyu ? 'dark' : 'default' });
  await m.default.run({ querySelector: 'pre.mermaid' });
} catch (e) {
  console.warn('Mermaid yüklenemedi veya render edilemedi:', e);
}
