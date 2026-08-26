/**
 * Yedek sağlayıcı anahtarını eklemek için YEREL bir ekran açar.
 *
 * NEDEN VAR: `anahtar.txt` oluşturma adımı Windows'ta hataya açık —
 * dosya uzantıları gizli olduğu için kullanıcı farkında olmadan
 * `anahtar.txt.txt` oluşturabiliyor ve araç dosyayı bulamıyor.
 * Bu ekran o adımı tamamen ortadan kaldırır.
 *
 * GÜVENLİK:
 *  - Sunucu YALNIZCA 127.0.0.1'e bağlanır; dışarıdan erişilemez.
 *  - Anahtar diske YAZILMAZ, konsola YAZILMAZ, günlüğe düşmez.
 *  - Anahtar önce sağlayıcıya sorulur; GEÇERSİZSE Cloudflare'e YÜKLENMEZ.
 *  - Geçerliyse doğrudan `wrangler secret put`'un stdin'ine verilir.
 *  - İşlem bitince sunucu kendini kapatır.
 *
 * Kullanım:  node tools/anahtar-ekran.mjs   ->  http://127.0.0.1:8799
 */
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';

const PORT = 8799;
const SECRET_ADI = 'AI_FALLBACK_API_KEY';

const SAGLAYICILAR = {
  openai: {
    ad: 'OpenAI',
    base: 'https://api.openai.com/v1',
    modeller: ['gpt-5-mini', 'gpt-5.6-luna', 'gpt-5-nano'],
  },
  gemini: {
    ad: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modeller: ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'],
  },
};

/** Anahtarı temizler — Not Defteri BOM ekleyebiliyor (yaşanmış hata). */
const temizle = (k) =>
  String(k || '').replace(/^﻿/, '').replace(/[​-‍⁠]/g, '').trim();

/** GPT-5 ailesi max_tokens yerine max_completion_tokens istiyor (olculdu). */
function istekGovdesi(model, tavan) {
  const govde = { model, messages: [{ role: 'user', content: 'Sadece "tamam" yaz.' }] };
  if (/^(gpt-5|gpt-6|o[1-9])/i.test(model)) govde.max_completion_tokens = tavan;
  else govde.max_tokens = tavan;
  return govde;
}

/** Anahtarı sağlayıcıya sorar; çalışan ilk modeli döndürür. */
async function dogrula(sag, key) {
  const denemeler = [];
  for (const model of sag.modeller) {
    try {
      const t0 = Date.now();
      const r = await fetch(sag.base + '/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify(istekGovdesi(model, 20)),
      });
      const ms = Date.now() - t0;
      if (r.ok) {
        denemeler.push({ model, ok: true, ms });
        return { calisan: model, denemeler };
      }
      let mesaj = '';
      const govde = await r.text();
      try { mesaj = JSON.parse(govde)?.error?.message || govde.slice(0, 200); }
      catch { mesaj = govde.slice(0, 200) || '(boş gövde)'; }
      denemeler.push({ model, ok: false, durum: r.status, mesaj });
    } catch (e) {
      denemeler.push({ model, ok: false, mesaj: 'Bağlantı hatası: ' + (e?.message || e) });
    }
  }
  return { calisan: null, denemeler };
}

/** Geçerli anahtarı Cloudflare'e yükler. Anahtar yalnızca stdin'den geçer. */
function yukle(key) {
  const r = spawnSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', SECRET_ADI, '-c', 'wrangler.demo.jsonc'],
    { input: key, encoding: 'utf8' }
  );
  const cikti = (r.stdout || '') + (r.stderr || '');
  return { basarili: /Success/i.test(cikti), cikti: cikti.split('\n').filter((s) => /Success|Creating|error|Error|✘/.test(s)).join('\n').slice(0, 600) };
}

const SAYFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Yedek Sağlayıcı Anahtarı</title><style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
  background:#0c0f18;color:#e8ebf3;font:15px/1.6 system-ui,Segoe UI,sans-serif;padding:24px}
.kutu{width:100%;max-width:560px;background:#131826;border:1px solid #262d42;
  border-radius:14px;padding:28px 30px}
h1{margin:0 0 6px;font-size:19px}
.alt{margin:0 0 22px;color:#8d96ad;font-size:13.5px}
label{display:block;font-size:12.5px;font-weight:600;margin:16px 0 6px;color:#c7cee0}
input,select{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #333c58;
  background:#0c0f18;color:#e8ebf3;font:14px/1.4 ui-monospace,Consolas,monospace}
input:focus,select:focus{outline:2px solid #7ea0e8;outline-offset:1px}
select{font-family:system-ui,sans-serif}
button{margin-top:20px;width:100%;padding:13px;border:none;border-radius:9px;
  background:#2e4c8a;color:#fff;font:600 15px system-ui;cursor:pointer}
button:hover{background:#3a5da3} button:disabled{opacity:.55;cursor:not-allowed}
.not{margin-top:18px;padding:11px 13px;border-radius:9px;background:#1a2033;
  border-left:3px solid #7ea0e8;font-size:12.5px;color:#a8b2c8}
#sonuc{margin-top:18px;padding:13px 15px;border-radius:9px;font-size:13.5px;display:none;
  white-space:pre-wrap;word-break:break-word}
.ok{background:#12301f;border-left:3px solid #3fa66a;color:#c8ebd6}
.hata{background:#33150f;border-left:3px solid #d9534f;color:#f3ccc6}
.bekle{background:#1a2033;border-left:3px solid #7ea0e8;color:#a8b2c8}
code{background:#0c0f18;padding:1px 5px;border-radius:4px;font-size:12px}
</style></head><body>
<div class="kutu">
  <h1>Yedek sağlayıcı anahtarı</h1>
  <p class="alt">Anahtar önce sağlayıcıya sorulur. <b>Geçerliyse</b> Cloudflare'e
  <code>${SECRET_ADI}</code> olarak yüklenir. Geçersizse hiçbir şey yüklenmez.</p>

  <label for="sag">Sağlayıcı</label>
  <select id="sag">
    <option value="openai">OpenAI (gpt-5-mini → luna → nano)</option>
    <option value="gemini">Google Gemini</option>
  </select>

  <label for="key">API anahtarı</label>
  <input id="key" type="password" autocomplete="off" spellcheck="false"
         placeholder="sk-..." autofocus>

  <button id="gonder">Doğrula ve Cloudflare'e yükle</button>
  <div id="sonuc"></div>

  <div class="not">Anahtar diske yazılmaz, ekrana basılmaz ve bu bilgisayardan
  yalnızca sağlayıcıya ve Cloudflare'e gider. Bu sayfa yalnızca
  <code>127.0.0.1</code> üzerinden erişilebilir.</div>
</div>
<script>
const $ = (id) => document.getElementById(id);
const kutu = $("sonuc");
function goster(sinif, metin){ kutu.className = sinif; kutu.style.display = "block"; kutu.textContent = metin; }
$("gonder").onclick = async () => {
  const key = $("key").value.trim();
  if (!key) { goster("hata", "Anahtar alanı boş."); return; }
  $("gonder").disabled = true;
  goster("bekle", "Sağlayıcıya soruluyor…");
  try {
    const r = await fetch("/yukle", { method:"POST", headers:{"content-type":"application/json"},
      body: JSON.stringify({ key, saglayici: $("sag").value }) });
    const j = await r.json();
    if (j.ok) {
      $("key").value = "";
      goster("ok", "✓ Anahtar geçerli ve Cloudflare'e yüklendi.\\n\\nÇalışan model: " + j.model +
                   " (" + j.ms + " ms)\\n\\nBu satırı Claude'a bildirin:\\nCALISAN MODEL: " + j.model +
                   "\\n\\nBu pencereyi kapatabilirsiniz.");
    } else {
      goster("hata", "✗ " + j.mesaj + (j.ayrinti ? "\\n\\n" + j.ayrinti : ""));
      $("gonder").disabled = false;
    }
  } catch (e) {
    goster("hata", "İstek başarısız: " + e.message);
    $("gonder").disabled = false;
  }
};
$("key").addEventListener("keydown", e => { if (e.key === "Enter") $("gonder").click(); });
</script></body></html>`;

const sunucu = createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(SAYFA);
    return;
  }
  if (req.method === 'POST' && req.url === '/yukle') {
    let gövde = '';
    req.on('data', (c) => { gövde += c; if (gövde.length > 8000) req.destroy(); });
    req.on('end', async () => {
      const cevap = (kod, o) => { res.writeHead(kod, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
      let veri;
      try { veri = JSON.parse(gövde); } catch { return cevap(400, { ok: false, mesaj: 'Geçersiz istek.' }); }

      const sag = SAGLAYICILAR[veri.saglayici] || SAGLAYICILAR.openai;
      const key = temizle(veri.key);
      if (!key) return cevap(400, { ok: false, mesaj: 'Anahtar boş.' });

      console.log('  → ' + sag.ad + ' anahtarı soruluyor (' + key.length + ' karakter)…');
      const { calisan, denemeler } = await dogrula(sag, key);
      if (!calisan) {
        const ayrinti = denemeler.map((d) => '· ' + d.model + ' → ' + (d.durum ? 'HTTP ' + d.durum + ' ' : '') + (d.mesaj || '')).join('\n');
        console.log('  ✗ Anahtar reddedildi — Cloudflare\'e YÜKLENMEDİ.');
        return cevap(200, { ok: false, mesaj: sag.ad + ' anahtarı kabul etmedi. Cloudflare\'e yüklenmedi.', ayrinti });
      }

      const basarili = denemeler.find((d) => d.ok);
      console.log('  ✓ Geçerli. Çalışan model: ' + calisan + '. Cloudflare\'e yükleniyor…');
      const y = yukle(key);
      if (!y.basarili) {
        console.log('  ✗ Cloudflare yüklemesi başarısız.');
        return cevap(200, { ok: false, mesaj: 'Anahtar geçerli ama Cloudflare\'e yüklenemedi.', ayrinti: y.cikti });
      }
      console.log('  ✓ TAMAMDIR — secret yüklendi: ' + SECRET_ADI);
      cevap(200, { ok: true, model: calisan, ms: basarili ? basarili.ms : 0 });
      setTimeout(() => { console.log('\n(sunucu kapatildi)'); process.exit(0); }, 1500);
    });
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('yok');
});

sunucu.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Anahtar ekrani hazir:  http://127.0.0.1:' + PORT);
  console.log('  (Tarayicida acin. Kapatmak icin bu pencerede Ctrl+C.)');
  console.log('');
});
