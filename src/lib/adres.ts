// ============================================================================
// §129 (W10) — İSTEMCİ ADRESİNİN SINIR ANAHTARI
//
// NEDEN (fikir3-E Y2): IPv6'da bir abone genellikle bütün bir /64 bloğu alır;
// her adres ayrı sayılırsa tek kişi 2^64 farklı "adresle" adres başına
// sınırları (dakikalık tavan, günlük çağrı sınırı, §129 Neuron payı) yok
// sayabilir. Sınırlar bu yüzden IPv6'da /64 öneki üzerinden sayılır.
// IPv4 olduğu gibi kalır; IPv4'e eşlenmiş IPv6 (::ffff:a.b.c.d) IPv4'e döner.
// Ayrıştırılamayan değer olduğu gibi döner (sınır yine uygulanır, gevşemez).
// ============================================================================

/** IPv6 metnini 8 onaltılık gruba açar; geçersizse null. */
function ipv6Gruplari(ip: string): string[] | null {
  let s = ip.toLowerCase().split('%')[0];
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  // Sonda gömülü IPv4 (ör. 64:ff9b::1.2.3.4) iki gruba çevrilir.
  const v4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((x) => x > 255)) return null;
    s = s.slice(0, v4.index) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const iki = s.split('::');
  if (iki.length > 2) return null;
  const sol = iki[0] ? iki[0].split(':') : [];
  const sag = iki.length === 2 && iki[1] ? iki[1].split(':') : [];
  const eksik = 8 - sol.length - sag.length;
  if (iki.length === 1 ? eksik !== 0 : eksik < 1) return null;
  const gruplar = [...sol, ...Array(iki.length === 2 ? eksik : 0).fill('0'), ...sag];
  if (gruplar.length !== 8 || gruplar.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return gruplar.map((g) => g.replace(/^0+(?=.)/, ''));
}

/**
 * Sınır anahtarı: IPv4 → aynen; IPv6 → "<ilk 4 grup>::/64";
 * ::ffff:a.b.c.d → a.b.c.d. Boş girdi boş döner (çağıran "yerel" kovasını seçer).
 */
export function adresAnahtari(ip: string | null | undefined): string {
  const s = String(ip || '').trim();
  if (!s || !s.includes(':')) return s;
  const g = ipv6Gruplari(s);
  if (!g) return s;
  if (g.slice(0, 5).every((x) => x === '0') && g[5] === 'ffff') {
    const a = parseInt(g[6], 16), b = parseInt(g[7], 16);
    return [a >> 8, a & 255, b >> 8, b & 255].join('.');
  }
  return g.slice(0, 4).join(':') + '::/64';
}

/** İsteğin sınır anahtarı (CF-Connecting-IP'den). Başlık yoksa ''. */
export function istekAdresi(baslik: (ad: string) => string | undefined): string {
  return adresAnahtari(baslik('cf-connecting-ip'));
}
