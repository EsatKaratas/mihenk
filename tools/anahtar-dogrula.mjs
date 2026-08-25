/**
 * Gemini anahtarını önce GOOGLE'A SORAR, geçerliyse Cloudflare'e yükler.
 *
 * Neden: Cloudflare üzerinden test ederken hata zinciri uzun oluyor
 * (Worker -> Google). Bu araç doğrudan Google'a sorar; böylece sorunun
 * anahtarda mı başka yerde mi olduğu tek adımda anlaşılır.
 *
 * Anahtar ekrana yazılmaz, hiçbir yere gönderilmez; test bittiğinde
 * anahtar.txt silinir.
 */
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DOSYA = 'anahtar.txt';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';
// Yeniden eskiye doğru; ilk çalışan seçilir.
const MODELLER = ['gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
console.log('Google\'a soruluyor…\n');

let calisan = null;
for (const model of MODELLER) {
  try {
    const t0 = Date.now();
    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        max_tokens: 30,
        messages: [{ role: 'user', content: 'Sadece "tamam" yaz.' }],
      }),
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
  console.log('  "Please pass a valid API key" goruyorsaniz:');
  console.log('   - Anahtar silinmis olabilir (aistudio.google.com/apikey)');
  console.log('   - Ya da anahtarin tamami kopyalanmamis olabilir');
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
