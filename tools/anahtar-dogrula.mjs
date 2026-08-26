/**
 * Yedek sağlayıcı anahtarını önce SAĞLAYICIYA SORAR, geçerliyse Cloudflare'e
 * yükler (AI_FALLBACK_API_KEY).
 *
 * Neden: Cloudflare üzerinden test ederken hata zinciri uzun oluyor
 * (Worker -> sağlayıcı). Bu araç doğrudan sağlayıcıya sorar; böylece sorunun
 * anahtarda mı başka yerde mi olduğu tek adımda anlaşılır.
 *
 * Anahtar ekrana yazılmaz, hiçbir yere gönderilmez; test bittiğinde
 * anahtar.txt silinir.
 *
 * Kullanım:
 *   node tools/anahtar-dogrula.mjs           -> openai (varsayılan yedek)
 *   node tools/anahtar-dogrula.mjs gemini    -> Google Gemini
 */
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DOSYA = 'anahtar.txt';

// Her sağlayıcı için: OpenAI uyumlu taban adres + denenecek modeller.
// Modeller iyiden ucuza doğru sıralıdır; ilk ÇALIŞAN seçilir ve raporlanır.
const SAGLAYICILAR = {
  openai: {
    ad: 'OpenAI',
    base: 'https://api.openai.com/v1',
    modeller: ['gpt-5-mini', 'gpt-5.6-luna', 'gpt-5-nano'],
    ipucu: [
      '   - Anahtar silinmis ya da suresi dolmus olabilir (platform.openai.com/api-keys)',
      '   - Kredi bakiyesi 0 ise de hata doner (Billing > Credit balance)',
      '   - Anahtarin tamami kopyalanmamis olabilir (sk- ile baslar)',
    ],
  },
  gemini: {
    ad: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modeller: ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    ipucu: [
      '   - Anahtar silinmis olabilir (aistudio.google.com/apikey)',
      '   - Ya da anahtarin tamami kopyalanmamis olabilir',
    ],
  },
};

const secim = (process.argv[2] || 'openai').toLowerCase();
const SAG = SAGLAYICILAR[secim];
if (!SAG) {
  console.log('\nHATA: bilinmeyen saglayici "' + secim + '". Secenekler: ' + Object.keys(SAGLAYICILAR).join(', '));
  process.exit(1);
}
const BASE = SAG.base;
const MODELLER = SAG.modeller;

/**
 * GPT-5 ailesi `max_tokens` kabul etmiyor, `max_completion_tokens` istiyor.
 * (26 Agustos'ta gercek anahtarla olculdu: gpt-5-nano ve gpt-5.6-luna
 * "Unsupported parameter: 'max_tokens'" dondu.) src/lib/ai.ts ayni mantigi
 * uyarlamali olarak uyguluyor; bu arac da ayni davranisi taklit etmeli ki
 * dogrulama gercek cagriyi temsil etsin.
 */
function istekGovdesi(model, tavan) {
  const govde = { model, messages: [{ role: 'user', content: 'Sadece "tamam" yaz.' }] };
  if (/^(gpt-5|gpt-6|o[1-9])/i.test(model)) govde.max_completion_tokens = tavan;
  else govde.max_tokens = tavan;
  return govde;
}

function bitir(kod) {
  if (existsSync(DOSYA)) {
    try { unlinkSync(DOSYA); console.log('\n(anahtar.txt silindi)'); } catch (e) { console.log('\nUYARI: anahtar.txt silinemedi, elle silin.'); }
  }
  process.exit(kod);
}

if (!existsSync(DOSYA)) {
  console.log('\nHATA: anahtar.txt bulunamadi.');
  process.exit(1);
}

const key = readFileSync(DOSYA, 'utf8')
  .replace(/^\uFEFF/, '')            // Not Defteri BOM ile kaydediyor
  .replace(/[\u200B-\u200D\u2060]/g, '') // sifir genislikli karakterler
  .trim();
if (!key) {
  console.log('\nHATA: anahtar.txt BOS. Not Defteri\'nde Ctrl+S ile kaydettiniz mi?');
  bitir(1);
}

console.log('');
console.log('Okunan anahtar : ' + key.slice(0, 3) + '…' + key.slice(-3) + '  (' + key.length + ' karakter)');
console.log(SAG.ad + '\'a soruluyor…\n');

let calisan = null;
for (const model of MODELLER) {
  try {
    const t0 = Date.now();
    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify(istekGovdesi(model, 30)),
    });
    const ms = Date.now() - t0;
    const govde = await r.text();
    if (r.ok) {
      console.log('  ✓ ' + model.padEnd(20) + ' CALISIYOR (' + ms + ' ms)');
      if (!calisan) calisan = model;
    } else {
      let mesaj = '(bos govde)';
      try { mesaj = JSON.parse(govde)?.error?.message || govde.slice(0, 160); }
      catch (e) { mesaj = govde.slice(0, 160) || '(bos govde)'; }
      console.log('  ✗ ' + model.padEnd(20) + ' HTTP ' + r.status + ' — ' + mesaj);
    }
  } catch (e) {
    console.log('  ✗ ' + model.padEnd(20) + ' BAGLANTI HATASI: ' + (e?.message || e));
  }
}

console.log('');
if (!calisan) {
  console.log('SONUC: Anahtar hicbir modelde calismadi.');
  console.log('');
  console.log('  Anahtar reddedildiyse:');
  SAG.ipucu.forEach(function (satir) { console.log(satir); });
  console.log('   Yeni bir anahtar olusturup tekrar deneyin.');
  console.log('');
  console.log('Cloudflare\'e YUKLENMEDI (gecersiz anahtar yuklenmez).');
  bitir(1);
}

console.log('SONUC: Anahtar gecerli. Calisan model: ' + calisan);
console.log('Cloudflare\'e yukleniyor…\n');

const r = spawnSync(
  process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', 'AI_FALLBACK_API_KEY', '-c', 'wrangler.demo.jsonc'],
  { input: key, encoding: 'utf8' }
);
const cikti = (r.stdout || '') + (r.stderr || '');
console.log(cikti.split('\n').filter(function (s) { return /Success|Creating|error|Error/.test(s); }).join('\n'));

if (/Success/.test(cikti)) {
  console.log('\n=== TAMAMDIR ===');
  console.log('Bu satiri bildirin:  CALISAN MODEL: ' + calisan);
} else {
  console.log('\nYukleme basarisiz oldu; yukaridaki mesaji bildirin.');
}
bitir(0);
