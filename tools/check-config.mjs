// -*- coding: utf-8 -*-
/**
 * JSONC yapılandırma doğrulayıcısının ÇAPRAZ PLATFORM sarmalayıcısı.
 *
 * NEDEN VAR: `npm run check:config` doğrudan `python tools/check-jsonc.py`
 * çağırıyordu. Windows'ta çalışıyor ama **modern macOS'ta `python` komutu
 * YOKTUR** (macOS 12.3'ten itibaren kaldırıldı, yalnızca `python3` var).
 * Takım Creathon'a MacBook götüreceği için bu komut orada kırılacaktı.
 *
 * Bu dosya doğrulama mantığını DEĞİŞTİRMEZ — `check-jsonc.py` neyse odur
 * (§6.3-8: JSONC'u regex ile ayrıştırma; o iş Python tarafında doğru
 * yapılıyor ve dokunulmadı). Buradaki tek iş, çalışan Python yorumlayıcısını
 * bulup betiği ona vermektir.
 *
 * Kullanım: node tools/check-config.mjs <dosya...>
 */
import { spawnSync } from 'node:child_process';

const ADAYLAR = ['python3', 'python', 'py'];
const dosyalar = process.argv.slice(2);
if (!dosyalar.length) {
  console.error('Kullanım: node tools/check-config.mjs <jsonc-dosyası...>');
  process.exit(2);
}

function calisiyorMu(komut) {
  const r = spawnSync(komut, ['--version'], { stdio: 'ignore', shell: false });
  return r.status === 0;
}

const yorumlayici = ADAYLAR.find(calisiyorMu);

if (!yorumlayici) {
  console.error('HATA: Python bulunamadı (python3 / python / py denendi).');
  console.error('macOS: Python 3 kuruludur, "python3" olarak çağrılır.');
  console.error('Windows: python.org kurulumu "python" komutunu sağlar.');
  process.exit(1);
}

const sonuc = spawnSync(yorumlayici, ['tools/check-jsonc.py', ...dosyalar], {
  stdio: 'inherit',
  shell: false,
});

process.exit(sonuc.status === null ? 1 : sonuc.status);
