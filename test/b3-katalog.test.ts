// §98 — B3 katalog penceresi ortak seçicide ("coklu" mod) + P3-1 ilk harfle
// atlama + P3-4 okul listesinde olmayan kazanım (W9). İstemci kodu
// public/app.js metninden alınıp yalıtılmış kapsamda kurulur.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

const BILESEN = ['kzHal', 'kzIsaretliler', 'kzSifirla', 'kzIlkHarfHedefi', 'kazanimUnitesi', 'kazanimAgaci', 'kazanimAra',
  'kazanimAgacHtml', 'kzDurumMetni', 'kzAramaAdayi', 'kazanimSeciciHtml', 'katalogSeciciOgeleri', 'katalogEkleMetni',
  'peKazanimOgeleri'];

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kur(outcomes: any[] = []) {
  const kod = BILESEN.map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', 'OUTCOMES_LIST', 'escapeHtml', 'kazanimOgesi',
    'const KZ_SINIR = 200; const _kzHal = {}; const _kzKayit = {}; const KAT_SECICI = "kz-katalog";\n' +
    'const UYGUNLUK_ETIKET = { yazili: { ad: "yazılı sınav", sinif: "pill-success" }, performans: { ad: "performans", sinif: "pill-warning" } };\n' +
    kod + '\nreturn { ' + BILESEN.join(', ') + ', _kzHal };')(
    { katalog: {} },
    () => outcomes,
    esc,
    (kod: string) => ({ deger: kod, kod, etiket: kod === 'YOK.1' ? '' : kod + ' metni', ders: 'Matematik', sinif: '7', unite: '' }),
  );
}

describe('kzIlkHarfHedefi — P3-1 ilk harfle atlama', () => {
  const { kzIlkHarfHedefi } = kur();
  const m = ['Sayılar ve İşlemler', 'MAT.7.1.1 Rasyonel sayılar', 'MAT.7.1.2 Oran', 'Geometri', 'MAT.7.3.1 Açılar'];

  it('tek harf bir SONRAKİ satırdan başlar ve başa sarar', () => {
    expect(kzIlkHarfHedefi(m, 0, 'g')).toBe(3);
    expect(kzIlkHarfHedefi(m, 3, 'g')).toBe(3); // tek eşleşme: kendine sarar
    expect(kzIlkHarfHedefi(m, 4, 's')).toBe(0);
  });

  it('aynı harfi tekrar basmak o harfle başlayanlar arasında döner', () => {
    expect(kzIlkHarfHedefi(m, 1, 'mm')).toBe(2);
    expect(kzIlkHarfHedefi(m, 4, 'mmm')).toBe(1);
  });

  it('çok harf şu anki satırdan başlar; sözcük başı eşleşir (kod ya da metin)', () => {
    expect(kzIlkHarfHedefi(m, 1, 'mat.7.3')).toBe(4);
    expect(kzIlkHarfHedefi(m, 1, 'ma')).toBe(1); // yazmaya devam: yerinde kalır
    expect(kzIlkHarfHedefi(m, 0, 'ora')).toBe(2);
    expect(kzIlkHarfHedefi(m, 0, 'işl')).toBe(0); // tr küçük harf
  });

  it('eşleşme yoksa ya da liste boşsa -1', () => {
    expect(kzIlkHarfHedefi(m, 0, 'z')).toBe(-1);
    expect(kzIlkHarfHedefi([], 0, 'a')).toBe(-1);
    expect(kzIlkHarfHedefi(m, 0, '')).toBe(-1);
  });
});

describe('B3 — katalogSeciciOgeleri', () => {
  const { katalogSeciciOgeleri } = kur();
  const satirlar = [
    { kod: 'MAT.7.1.1', metin: 'Rasyonel', alan: 'Matematik', grup: 'Sayılar ve İşlemler', uygunluk: 'yazili', ekli: false },
    { kod: 'T.O.7.1', metin: 'Okuma', alan: 'Okuma', uygunluk: 'performans', ekli: true },
  ];

  it('ünite = grup, yoksa alan; ders/sınıf boş (ağaçta atlanır); ekli → kilitli', () => {
    const o = katalogSeciciOgeleri(satirlar, false);
    expect(o.map((x: any) => x.unite)).toEqual(['Sayılar ve İşlemler', 'Okuma']);
    expect(o.map((x: any) => x.kilitli)).toEqual([false, true]);
    expect(o[0]).toMatchObject({ deger: 'MAT.7.1.1', kod: 'MAT.7.1.1', etiket: 'Rasyonel', ders: '', sinif: '' });
  });

  it('rozetler eski satırla aynı: alan, uygunluk, zaten ekli', () => {
    const o = katalogSeciciOgeleri(satirlar, false);
    expect(o[0].rozetler.map((b: any) => b.metin)).toEqual(['Matematik', 'yazılı sınav']);
    expect(o[1].rozetler.map((b: any) => b.metin)).toEqual(['Okuma', 'performans', 'zaten ekli']);
    expect(o[1].rozetler[1].sinif).toBe('pill-warning');
  });

  it('Deneyap: sayfa ve "kaynakta böyle" rozetleri (title ile kitap/not)', () => {
    const o = katalogSeciciOgeleri([{ kod: 'DNY.TU.2.1', metin: 'Tasarım', alan: 'Tasarım', uygunluk: 'yazili', ekli: false,
      kaynak: { kitap: 'Kitap A', sayfa: 12 }, not: 'yazım hatası' }], true);
    expect(o[0].rozetler.slice(2)).toEqual([{ metin: 's.12', title: 'Kitap A' }, { metin: 'kaynakta böyle yazılmış', title: 'yazım hatası' }]);
    // MEB kataloğunda bu rozetler çıkmaz
    expect(katalogSeciciOgeleri([{ kod: 'X', metin: 'm', alan: 'A', uygunluk: 'yazili', kaynak: { kitap: 'K', sayfa: 1 } }], false)[0].rozetler.length).toBe(2);
  });
});

describe('B3 — kazanimSeciciHtml mod "coklu"', () => {
  const ogeler = (k: any) => k.katalogSeciciOgeleri([
    { kod: 'MAT.7.1.1', metin: 'Rasyonel <b>', alan: 'Matematik', grup: 'Sayılar', uygunluk: 'yazili', ekli: false },
    { kod: 'MAT.7.1.2', metin: 'Oran', alan: 'Matematik', grup: 'Sayılar', uygunluk: 'yazili', ekli: true },
  ], false);

  it('ağaç aria-multiselectable; öğeler aria-checked (aria-selected yok); ekli öğe işaretli + aria-disabled', () => {
    const k = kur();
    const h = k.kazanimSeciciHtml({ kimlik: 'kz-katalog', mod: 'coklu', etiket: 'Katalog kazanımları', ogeler: ogeler(k) });
    expect(h).toContain('role="tree" id="kz-katalog-agac" aria-label="Katalog kazanımları" aria-multiselectable="true"');
    const li = h.match(/<li role="treeitem" class="kz-oge[^>]*>/g) || [];
    expect(li.length).toBe(2);
    expect(li[0]).toContain('aria-checked="false"');
    expect(li[0]).not.toContain('aria-selected');
    expect(li[1]).toContain('aria-checked="true" aria-disabled="true"');
    expect(li[1]).toContain('kilitli');
    expect(h).toContain('class="kz-kutu" aria-hidden="true"');
    expect(h).toContain('Rasyonel &lt;b&gt;'); // metin kaçışlı
    expect(h).toContain('<span class="pill pill-neutral">zaten ekli</span>');
  });

  it('işaret _kzHal\'de tutulur, yeniden çizimde korunur; kzSifirla temizler; kilitli sayılmaz', () => {
    const k = kur();
    k.kzHal('kz-katalog').isaret['MAT.7.1.1'] = true;
    const h = k.kazanimSeciciHtml({ kimlik: 'kz-katalog', mod: 'coklu', etiket: 'K', ogeler: ogeler(k) });
    expect(h).toMatch(/class="kz-oge isaretli"[^>]*aria-checked="true"/);
    expect(k.kzIsaretliler('kz-katalog')).toEqual(['MAT.7.1.1']);
    expect(k.katalogEkleMetni()).toBe('Seçilenleri Ekle (1)');
    k.kzSifirla('kz-katalog');
    expect(k.kzIsaretliler('kz-katalog')).toEqual([]);
    expect(k.katalogEkleMetni()).toBe('Seçilenleri Ekle');
  });

  it('diğer modlar değişmedi: "tekli" aria-selected, aria-multiselectable yok, kutu yok', () => {
    const k = kur();
    const h = k.kazanimSeciciHtml({ kimlik: 'kz-t', mod: 'tekli', etiket: 'T', ogeler: ogeler(k), secili: 'MAT.7.1.2' });
    expect(h).not.toContain('aria-multiselectable');
    expect(h).not.toContain('aria-checked');
    expect(h).not.toContain('kz-kutu');
    expect(h).toMatch(/class="kz-oge secili kilitli"[^>]*aria-selected="true"/);
  });

  it('boş katalog filtresinde bosMetin', () => {
    const k = kur();
    const h = k.kazanimSeciciHtml({ kimlik: 'kz-katalog', mod: 'coklu', etiket: 'K', ogeler: [], bosMetin: 'Bu filtreyle eşleşen kazanım yok.' });
    expect(h).toContain('<div class="kz-bos">Bu filtreyle eşleşen kazanım yok.</div>');
  });
});

describe('P3-4 — A2: okul listesinde olmayan kazanım', () => {
  it('sorunun kodu listede yoksa başa eklenir, "okul listesinde yok" işaretlenir ve seçili görünür', () => {
    const k = kur();
    const o = k.peKazanimOgeleri({ outcome: 'MAT.7.3.1' }, [{ code: 'MAT.7.1.1' }]);
    expect(o.map((x: any) => x.deger)).toEqual(['MAT.7.3.1', 'MAT.7.1.1']);
    expect(o[0].etiket).toBe('MAT.7.3.1 metni (okul listesinde yok)');
    expect(o[0].disi).toBe(true);
    const h = k.kazanimSeciciHtml({ kimlik: 'kz-pe-1', mod: 'tekli', etiket: 'S', ogeler: o, secili: 'MAT.7.3.1' });
    expect(h).toMatch(/class="kz-oge secili kz-disi"[^>]*aria-selected="true"/);
  });

  it('etiketi olmayan kod da işaretlenir; kod listedeyse yinelenmez; kazanımsız soruda ekleme yok', () => {
    const k = kur();
    expect(k.peKazanimOgeleri({ outcome: 'YOK.1' }, [])[0].etiket).toBe('(okul listesinde yok)');
    expect(k.peKazanimOgeleri({ outcome: 'MAT.7.1.1' }, [{ code: 'MAT.7.1.1' }]).length).toBe(1);
    expect(k.peKazanimOgeleri({ outcome: '' }, [{ code: 'MAT.7.1.1' }]).length).toBe(1);
  });
});

describe('B3 — kaynak metni bağlantıları', () => {
  it('katalog penceresi ortak seçiciyi kullanır; eski onay kutusu ve #katAra kalmadı', () => {
    const html = fonksiyonMetni('katalogModalHtml');
    expect(html).toContain('kazanimSeciciHtml({');
    expect(html).toContain('mod: "coklu"');
    expect(html).not.toContain('kat-sec');
    expect(html).not.toContain('katAra');
    const goster = fonksiyonMetni('katalogModalGoster');
    expect(goster).toContain('kazanimSeciciBagla(KAT_SECICI');
    expect(goster).toContain('kzIsaretliler(KAT_SECICI)');
    expect(app.slice(app.indexOf('\nasync function katalogAc('), app.indexOf('\nfunction katalogModalGoster('))).toContain('kzSifirla(KAT_SECICI)');
  });

  it('ağaç klavyesinde ilk harfle atlama bağlı (P3-1)', () => {
    expect(fonksiyonMetni('kazanimSeciciBagla')).toContain('kzIlkHarfHedefi(hepsi.map(satirMetni), i, tusTampon)');
  });
});
