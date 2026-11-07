// ============================================================================
// §128 — Test yardımcısı (test dosyası değil): app.js'ten tek durum şeması
// doğrulayıcısını ve kurtarma başlatıcıyı kaynak metin olarak çıkarır.
// loadState / yedekCoz'u new Function ile sınayan testler bunu ekler.
// Gerektirdiği dış adlar: depoAnahtari, demoAlaniMi, localStorage, state,
// KALICI_ALANLAR, _ilkDurum, qIdSeq (çağıran sağlar).
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function islev(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  if (bas < 0) throw new Error(ad + ' bulunamadı');
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  if (bas < 0) throw new Error(ad + ' bulunamadı');
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}

export const DURUM_SEMASI_ISLEVLERI = ['durumDegerTuru', 'durumTurUyar', 'durumAltSorunu', 'durumuDogrula',
  'durumHataMetni', 'durumKaydiniCoz', 'kurtarmaBaslat', 'karantinaAnahtarlari', 'durumuVarsayilanaDondur'];

/** Sabitler + işlevler + `var _kurtarma = null`. */
export function durumSemasiKodu(): string {
  return ['DURUM_EN_BUYUK', 'DURUM_SEMASI', 'DURUM_ALT_SEMA', 'DURUM_TUR_ADI'].map(sabit).join('\n') +
    '\nvar _kurtarma = null; var _acilisHam = null;\n' + DURUM_SEMASI_ISLEVLERI.map(islev).join('\n') + '\n';
}

export { app as appKaynak, islev as appIslev, sabit as appSabit };
