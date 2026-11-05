// -*- coding: utf-8 -*-
/**
 * `npm run deploy` KORUMASI — ücretli kaynak bağlayan yapılandırmayla yayın durur.
 *
 * NEDEN VAR: `wrangler.jsonc` hedef üretim mimarisini anlatır: D1, R2 ve
 * Queues bağlar. Cloudflare Workers Paid aboneliği 26 Ekim 2026'da bitti; hesap
 * ücretsiz planda. R2 hesapta etkin değil, Queues ücretli plan ister. Bu
 * yapılandırmayla `wrangler deploy` ya başarısız olur ya da ücretli bir kaynağı
 * açmaya çalışır. Kural (Esat, 5 Kasım): hiçbir ödeme yapılmaz; canlı yayın
 * YALNIZ `npm run deploy:demo` (wrangler.demo.jsonc: ai + assets + vars).
 *
 * Bu betik yapılandırmayı okur. R2 / D1 / Queues bağlaması varsa açık bir
 * hatayla durur ve hiçbir şey yüklemez. Yoksa `wrangler deploy --minify -c
 * <dosya>`yı çalıştırır. Bayrakla atlatma YOKTUR, bilinçli olarak.
 *
 * JSONC regex ile ayrıştırılmaz: yorumlar karakter karakter, dize içi
 * korunarak soyulur, sonra JSON.parse. Dize içindeki "//" (URL) bozulmaz.
 *
 * Kullanım: node tools/deploy-guard.mjs [yapılandırma.jsonc]   (varsayılan wrangler.jsonc)
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Ücretli plan isteyen ya da bu hesapta açılmaması gereken bağlamalar. */
export const UCRETLI_ANAHTARLAR = ['d1_databases', 'r2_buckets', 'queues'];

/** JSONC → JSON metni: // ve /* *\/ yorumları ile sondaki virgüller atılır. */
export function jsoncSoy(metin) {
  let cikti = '', i = 0, dize = false;
  while (i < metin.length) {
    const c = metin[i], s = metin[i + 1];
    if (dize) {
      cikti += c;
      if (c === '\\') { cikti += s ?? ''; i += 2; continue; }
      if (c === '"') dize = false;
      i++; continue;
    }
    if (c === '"') { dize = true; cikti += c; i++; continue; }
    if (c === '/' && s === '/') { while (i < metin.length && metin[i] !== '\n') i++; continue; }
    if (c === '/' && s === '*') { i += 2; while (i < metin.length && !(metin[i] === '*' && metin[i + 1] === '/')) i++; i += 2; continue; }
    cikti += c; i++;
  }
  // Sondaki virgül: dize dışında, yalnız boşlukla ayrılmış } ya da ] öncesi.
  let sonuc = '', d = false;
  for (let j = 0; j < cikti.length; j++) {
    const c = cikti[j];
    if (d) { sonuc += c; if (c === '\\') { sonuc += cikti[++j] ?? ''; } else if (c === '"') d = false; continue; }
    if (c === '"') { d = true; sonuc += c; continue; }
    if (c === ',') {
      let k = j + 1; while (k < cikti.length && /\s/.test(cikti[k])) k++;
      if (cikti[k] === '}' || cikti[k] === ']') continue;
    }
    sonuc += c;
  }
  return sonuc;
}

/** Yapılandırmada dolu olan ücretli bağlamaların adları (boş dizi/nesne sayılmaz). */
export function ucretliBaglamalar(yapilandirma) {
  return UCRETLI_ANAHTARLAR.filter((a) => {
    const v = yapilandirma[a];
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some((x) => (Array.isArray(x) ? x.length > 0 : x != null));
    return true;
  });
}

function main() {
  const dosya = process.argv[2] || 'wrangler.jsonc';
  let yap;
  try { yap = JSON.parse(jsoncSoy(readFileSync(dosya, 'utf8'))); }
  catch (e) { console.error(`HATA: ${dosya} okunamadı ya da geçerli JSONC değil: ${e.message}`); process.exit(1); }
  const ucretli = ucretliBaglamalar(yap);
  if (ucretli.length) {
    console.error(`\nYAYIN DURDURULDU: ${dosya} ücretli plan isteyen bağlamalar içeriyor: ${ucretli.join(', ')}.`);
    console.error('Hesap Cloudflare ücretsiz planında; ödeme yapılmaz, R2 açılmaz.');
    console.error('Canlı yayın için:  npm run deploy:demo   (wrangler.demo.jsonc: ai + assets + vars)\n');
    process.exit(1);
  }
  const r = spawnSync('npx', ['wrangler', 'deploy', '--minify', '-c', dosya], { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(r.status === null ? 1 : r.status);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
