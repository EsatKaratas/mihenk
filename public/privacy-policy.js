// Gizlilik politikası sayfası — "açık rıza" önizlemesindeki onay kutusu.
//
// NEDEN HARİCİ DOSYA: Bu kod privacy-policy.html içinde inline <script> olarak
// duruyordu ve `public/_headers` içindeki CSP (`script-src 'self' ...`,
// bilinçli olarak 'unsafe-inline' YOK) onu engelliyordu. Ölçüldü, konsolda:
//
//   "Executing inline script violates the following Content Security Policy
//    directive 'script-src 'self' https://cdn.jsdelivr.net'. ... blocked."
//
// Sonuç: onay kutusu işaretlense bile düğme PASİF kalıyordu; yani sayfanın
// gösterdiği "açık rıza akışı" örneği fiilen çalışmıyordu. Bu, PROGRESS §14e'de
// mermaid yükleyicisinde yaşanan hatanın aynısıdır — çözümü de aynı.
try {
  var cb = document.getElementById('policyConsent');
  var btn = document.querySelector('.consent-preview button');
  if (cb && btn) {
    cb.addEventListener('change', function () { btn.disabled = !cb.checked; });
  }
} catch (e) {
  console.warn('Rıza önizlemesi bağlanamadı:', e);
}
