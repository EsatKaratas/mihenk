// 404 sayfası — istenen yolu ekrana yazar.
//
// NEDEN HARİCİ DOSYA: Bu kod 404.html içinde inline <script> olarak duruyordu
// ve `public/_headers` içindeki CSP `script-src 'self' https://cdn.jsdelivr.net`
// olduğu için (bilinçli olarak 'unsafe-inline' YOK) tarayıcı tarafından
// engelleniyordu. Ölçüldü, konsol çıktısı:
//
//   "Executing inline script violates the following Content Security Policy
//    directive 'script-src 'self' https://cdn.jsdelivr.net'. ... blocked."
//
// Sonuç: sayfa gerçek yolu HİÇ yazmıyor, HTML'deki sabit yer tutucu
// (/bilinmeyen-sayfa) ekranda kalıyordu — yani her 404'te yanlış yol
// gösteriliyordu ve bu sessizce oluyordu.
//
// Bu, PROGRESS §14e'de mimari.html'in mermaid yükleyicisi için yaşanan
// hatanın aynısıdır ve çözümü de aynı: harici dosyaya taşımak. Böylece CSP
// gevşetilmeden özellik çalışır.
try {
  var p = window.location && window.location.pathname;
  var el = document.getElementById('reqPath');
  if (p && el) el.textContent = p;
} catch (e) {
  // Yol yazılamazsa sayfa yine kullanılabilir kalır; sessiz düşüş değil,
  // yalnızca bilgi satırı eksik kalır.
  console.warn('İstenen yol yazılamadı:', e);
}
