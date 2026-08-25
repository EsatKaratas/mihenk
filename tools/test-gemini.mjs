/**
 * Gemini API anahtarını YEREL olarak sınar.
 *
 * Anahtar ekrana yazılmaz, dosyaya kaydedilmez, hiçbir yere gönderilmez —
 * yalnızca Google'ın kendi ucuna gider. Çıktı, anahtarın çalışıp
 * çalışmadığını ve çalışmıyorsa sebebini söyler.
 *
 * Çalıştırma: ANAHTAR-TEST.bat (çift tıkla)
 */

const key = (process.env.GKEY || '').trim();
const BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

function maske(k) {
  if (!k) return '(boş)';
  if (k.length <= 10) return k[0] + '***';
  return k.slice(0, 4) + '…' + k.slice(-4) + '  (' + k.length + ' karakter)';
}

console.log('');
console.log('Anahtar          :', maske(key));

if (!key) {
  console.log('\nHATA: Anahtar girilmedi.');
  process.exit(1);
}

// NOT: Anahtar biçimi hakkında varsayımda BULUNMUYORUZ. Google zaman içinde
// farklı önekler kullanıyor (eski "AIza...", yeni "AQ..."). Biçime bakarak
// karar vermek yanlış teşhise yol açar — tek doğru test, Google'a sormaktır.
console.log('Biçim            : kontrol edilmiyor (Google birden fazla önek kullanıyor)');

const modeller = ['gemini-2.5-flash', 'gemini-3.7-flash', 'gemini-2.0-flash'];

console.log('\nGoogle ucuna bağlanılıyor…\n');

let calisan = null;
for (const model of modeller) {
  try {
    const t0 = Date.now();
    const r = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        messages: [{ role: 'user', content: 'Tek kelimeyle cevapla: Türkiye\'nin başkenti neresidir?' }],
      }),
    });
    const ms = Date.now() - t0;
    const govde = await r.text();
    if (r.ok) {
      let yanit = '';
      try { yanit = JSON.parse(govde)?.choices?.[0]?.message?.content ?? ''; } catch (e) { /* yok say */ }
      console.log('  ✓ ' + model.padEnd(20) + ' ÇALIŞIYOR  (' + ms + ' ms)  yanıt: "' + yanit.trim().slice(0, 40) + '"');
      if (!calisan) calisan = model;
    } else {
      let mesaj = govde.slice(0, 200) || '(boş gövde)';
      try {
        const j = JSON.parse(govde);
        if (j?.error?.message) mesaj = j.error.message;
      } catch (e) { /* yok say */ }
      console.log('  ✗ ' + model.padEnd(20) + ' HTTP ' + r.status + '  ' + mesaj);
    }
  } catch (e) {
    console.log('  ✗ ' + model.padEnd(20) + ' BAĞLANTI HATASI: ' + (e?.message || e));
  }
}

console.log('');
if (calisan) {
  console.log('SONUÇ: Anahtar çalışıyor. Kullanılacak model: ' + calisan);
  console.log('Bu satırı olduğu gibi bildirin, gerisini ben ayarlarım.');
} else {
  console.log('SONUÇ: Anahtar hiçbir modelde çalışmadı.');
  console.log('Yukarıdaki hata mesajını olduğu gibi bildirin (anahtarı DEĞİL).');
}
console.log('');
