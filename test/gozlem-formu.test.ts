// §125 — Türkçe dinleme/konuşma gözlem formu.
// Saf fonksiyonlar app.js metninden alınıp yalıtılmış kapsamda kurulur.
// Odak: yalnız gözlemle ölçülen kazanımlar, işaretleme (dokun/temizle),
// kartta yalnız "kartta göster" formları ve AYRI bölüm (yazılı yüzdeye girmez),
// boş form kâğıdı, tam yedek taşır / araştırma paketi taşımaz, YZ yok.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8').replace(/\r\n/g, '\n');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}
function blokSabit(ad: string, bitis: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad).toBeGreaterThan(0);
  return app.slice(bas, app.indexOf(bitis, bas) + bitis.length);
}

const ADLAR = ['escapeHtml', 'truncate', 'gozlemSinifDuzeyi', 'gozlemAdaylari', 'gozlemDuzeyleriKopya', 'gozlemFormuKur',
  'gozlemPuanla', 'gozlemOgrencileri', 'gozlemDagilim', 'gozlemOgrenciOzeti', 'gozlemTarihMetni',
  'gozlemKartBolumuHtml', 'gozlemKagitBolumuHtml', 'gozlemBosFormHtml'];

function kur() {
  const sabitler = [
    blokSabit('GOZLEM_ALANLARI', ';\n'), blokSabit('GOZLEM_MEB_NOTU', ';\n'),
    blokSabit('GOZLEM_VARSAYILAN_DUZEYLER', '];\n'), blokSabit('GOZLEM_TANIM_EN_FAZLA', ';\n'), blokSabit('GOZLEM_AD_EN_FAZLA', ';\n'),
  ].join('\n');
  const kod = sabitler + '\n' + ADLAR.map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(kod + '\nreturn {' + ADLAR.join(',') + ', GOZLEM_VARSAYILAN_DUZEYLER, GOZLEM_MEB_NOTU };')();
}

const katalog7 = JSON.parse(fs.readFileSync(path.join(kok, 'public', 'mufredat', 'turkce-7.json'), 'utf8'));

describe('§125 kazanım adayları — yalnız gözlemle ölçülenler', () => {
  const g = kur();
  it('varsayılan: yalnız Dinleme/İzleme ve Konuşma, hiç "yazili" yok', () => {
    const a = g.gozlemAdaylari(katalog7, false);
    expect(a.length).toBeGreaterThan(30);
    expect(a.every((k: { alan: string }) => k.alan === 'Dinleme/İzleme' || k.alan === 'Konuşma')).toBe(true);
    const yazili = new Set(katalog7.kazanimlar.filter((k: { uygunluk: string }) => k.uygunluk === 'yazili').map((k: { kod: string }) => k.kod));
    expect(a.some((k: { kod: string }) => yazili.has(k.kod))).toBe(false);
  });
  it('"tümü": okuma/yazma süreç kazanımları da gelir, yazılılar yine gelmez', () => {
    const a = g.gozlemAdaylari(katalog7, true);
    expect(a.some((k: { alan: string }) => k.alan === 'Okuma')).toBe(true);
    expect(a.every((k: { uygunluk: string }) => k.uygunluk !== 'yazili')).toBe(true);
  });
  it('sınıf düzeyi şube adından; aralık dışı → 7', () => {
    expect(g.gozlemSinifDuzeyi('5-B')).toBe(5);
    expect(g.gozlemSinifDuzeyi('8/C')).toBe(8);
    expect(g.gozlemSinifDuzeyi('')).toBe(7);
    expect(g.gozlemSinifDuzeyi('11-A')).toBe(7);
  });
});

describe('§125 form kurma ve işaretleme', () => {
  const g = kur();
  const kz = [{ kod: 'T.K.7.6', metin: 'Yaratıcı konuşma yapabilme', alan: 'Konuşma' },
    { kod: 'T.D.7.19', metin: 'Dinlediğini özetleyebilme', alan: 'Dinleme/İzleme' }];

  it('kazanımsız form kurulmaz (hata metni)', () => {
    expect(g.gozlemFormuKur({ kazanimlar: [] }).hata).toMatch(/kazanım/);
  });
  it('4 düzey, varsayılan tanımlar dolu; boş düzey adı varsayılana döner', () => {
    const f = g.gozlemFormuKur({ kazanimlar: kz, duzeyler: [{ ad: '', tanim: 'x' }, { ad: 'B' }, { ad: 'C' }, { ad: 'D' }] });
    expect(f.duzeyler).toHaveLength(4);
    expect(f.duzeyler[0].ad).toBe('Başlangıç');
    expect(f.duzeyler[0].tanim).toBe('x');
    const v = g.gozlemFormuKur({ kazanimlar: kz });
    expect(v.duzeyler.map((d: { tanim: string }) => d.tanim.length > 40)).toEqual([true, true, true, true]);
    expect(v.kartta).toBe(false);   // kartta gösterim öğretmen kararıyla açılır
  });
  it('dokun → işaretli; aynı düzeye ikinci dokunuş → temizler; geçersiz düzey değiştirmez', () => {
    const f = g.gozlemFormuKur({ kazanimlar: kz });
    expect(g.gozlemPuanla(f, '1', 'T.K.7.6', 3)).toBe(3);
    expect(f.puanlar['1']['T.K.7.6']).toBe(3);
    expect(g.gozlemPuanla(f, '1', 'T.K.7.6', 4)).toBe(4);
    expect(g.gozlemPuanla(f, '1', 'T.K.7.6', 9)).toBe(4);
    expect(g.gozlemPuanla(f, '1', 'T.K.7.6', 0)).toBe(4);
    expect(g.gozlemPuanla(f, '1', 'T.K.7.6', 4)).toBeNull();
    expect(f.puanlar['1']).toBeUndefined();   // boş satır tutulmaz
  });
  it('dağılım: işaretli/toplam ve düzey sayaçları', () => {
    const f = g.gozlemFormuKur({ kazanimlar: kz, sinif: '7-A' });
    const ogr = [{ id: 1, sinif: '7-A' }, { id: 2, sinif: '7-A' }, { id: 3, sinif: '7-B' }];
    g.gozlemPuanla(f, '1', 'T.K.7.6', 2); g.gozlemPuanla(f, '2', 'T.K.7.6', 2);
    const s = g.gozlemOgrencileri(f, ogr);
    expect(s.map((x: { id: number }) => x.id)).toEqual([1, 2]);
    expect(g.gozlemDagilim(f, s, 'T.K.7.6')).toEqual({ isaretli: 2, toplam: 2, sayac: [0, 2, 0, 0] });
  });
});

describe('§125 kart ve karne — ayrı bölüm, yalnız kartta gösterilenler', () => {
  const g = kur();
  const kz = [{ kod: 'T.K.7.6', metin: 'Yaratıcı konuşma yapabilme', alan: 'Konuşma' },
    { kod: 'T.K.7.10', metin: 'Konuşmasında karşılaştırma yapabilme', alan: 'Konuşma' }];
  function formlar() {
    const a = g.gozlemFormuKur({ id: 'a', kazanimlar: kz, tarih: '2026-10-01' });
    const b = g.gozlemFormuKur({ id: 'b', kazanimlar: kz.slice(0, 1), tarih: '2026-11-05' });
    const c = g.gozlemFormuKur({ id: 'c', kazanimlar: kz.slice(0, 1), tarih: '2026-11-06' });
    g.gozlemPuanla(a, '1', 'T.K.7.6', 2); g.gozlemPuanla(a, '1', 'T.K.7.10', 3);
    g.gozlemPuanla(b, '1', 'T.K.7.6', 4);
    g.gozlemPuanla(c, '1', 'T.K.7.6', 1);   // c kartta DEĞİL
    a.kartta = true; b.kartta = true;
    return [a, b, c];
  }
  it('kazanım başına en yeni gözlem; kartta olmayan form sayılmaz; sıralama doğal (7.6 < 7.10)', () => {
    const o = g.gozlemOgrenciOzeti(1, formlar());
    expect(o.map((x: { kod: string; duzey: number }) => x.kod + ':' + x.duzey)).toEqual(['T.K.7.6:4', 'T.K.7.10:3']);
  });
  it('başka öğrenci ya da hiç kartta form yoksa boş', () => {
    expect(g.gozlemOgrenciOzeti(2, formlar())).toEqual([]);
    const f = formlar(); f.forEach((x: { kartta: boolean }) => { x.kartta = false; });
    expect(g.gozlemOgrenciOzeti(1, f)).toEqual([]);
    expect(g.gozlemOgrenciOzeti(1, undefined)).toEqual([]);
    expect(g.gozlemKartBolumuHtml([])).toBe('');
    expect(g.gozlemKagitBolumuHtml([])).toBe('');
  });
  it('kart bölümü: "Gözlem" başlığı, düzey biçimi, yüzde YOK, kaynak notu', () => {
    const h = g.gozlemKartBolumuHtml(g.gozlemOgrenciOzeti(1, formlar()));
    expect(h).toContain('Gözlem (uygulamalı)');
    expect(h).toContain('Düzey 4/4 · İleri');
    expect(h).not.toMatch(/%\d/);
    expect(h).toMatch(/Yazılı sınav yüzdelerine katılmaz/);
    expect(h).toMatch(/öğretmen gözlemi \(son: 5 Kasım 2026\)/);
  });
  it('karne bölümü: düzey ve kaynak; yüzde yok', () => {
    const h = g.gozlemKagitBolumuHtml(g.gozlemOgrenciOzeti(1, formlar()));
    expect(h).toContain('Düzey 3/4 (Yeterli)');
    expect(h).not.toMatch(/%\d/);
  });
});

describe('§125 boş form kâğıdı', () => {
  const g = kur();
  it('öğrenci × kazanım, her hücrede 1–4 kutusu; düzey tanımları ve MEB notu; işaret yok', () => {
    const f = g.gozlemFormuKur({ kazanimlar: [{ kod: 'T.K.7.6', metin: 'Yaratıcı konuşma' }, { kod: 'T.D.7.19', metin: 'Özetleme' }], sinif: '7-A' });
    g.gozlemPuanla(f, '1', 'T.K.7.6', 3);
    const h = g.gozlemBosFormHtml(f, [{ id: 1, name: 'Ada <Y>' }, { id: 2, name: 'Kerem' }]);
    expect((h.match(/class="gz-k-kutu"/g) || []).length).toBe(2 * 2 * 4);
    expect(h).toContain('Ada &lt;Y&gt;');
    expect(h).toContain('Başlangıç');
    expect(h).toContain('140379263');
    expect(h).not.toMatch(/aria-pressed|Düzey 3\/4/);   // kâğıt boş: işaretli değer basılmaz
  });
});

describe('§125 bütünlük — kalıcılık, yedek, araştırma paketi, YZ yok, kart entegrasyonu', () => {
  it('gozlemFormlari KALICI_ALANLAR içinde → tam yedek (§108) taşır', () => {
    const bas = app.indexOf('const KALICI_ALANLAR');
    expect(app.slice(bas, app.indexOf('];', bas))).toContain('"gozlemFormlari"');
    expect(fonksiyonMetni('yedekDurumAl')).toMatch(/KALICI_ALANLAR\.forEach/);
  });
  it('anonim araştırma paketi (§111) gözlem verisini taşımaz (gerçek çalıştırma)', async () => {
    const bas = app.indexOf('\nasync function arastirmaPaketi(');
    expect(bas).toBeGreaterThan(0);
    const govde = app.slice(bas, app.indexOf('\n}\n', bas) + 3);
    expect(govde).not.toMatch(/gozlem/i);
    const kod = blokSabit('ARASTIRMA_ALANLARI', ';\n') + '\n' + fonksiyonMetni('arastirmaKriterFarklari') + '\n' + govde;
    const state = { auditDusen: 0, gozlemFormlari: [{ id: 'gz', ad: 'Konuşma gözlemi', kazanimlar: [{ kod: 'T.K.7.6', metin: 'Yaratıcı konuşma' }],
      puanlar: { 1: { 'T.K.7.6': 3 } }, kartta: true }] };
    // eslint-disable-next-line no-new-func
    const paketi = new Function('state', 'AUDIT_ETIKET', 'sha256Hex', kod + '\nreturn arastirmaPaketi;')(
      state, { puan_karari: { aktor: 'ogretmen' } }, async (m: string) => 'h' + m.length);
    const p = await paketi([{ tur: 'puan_karari', at: Date.now(), qid: 5, sid: 1, aiScore: 10, finalScore: 12 }], [{ id: 5, type: 'open' }], 'tuz');
    const metin = JSON.stringify(p);
    expect(p.kayitSayisi).toBe(1);
    expect(metin).not.toMatch(/T\.K\.7\.6|gozlem|Gözlem|Konuşma gözlemi/);
    const gbas = app.indexOf('§125 GÖZLEM FORMU');
    const blok = app.slice(gbas, app.indexOf('§125 ÖĞRETMEN NOTUNA', gbas));
    expect(blok).not.toMatch(/auditKaydet\(/);   // günlüğe yazılmaz → pakete giremez
  });
  it('YZ yok: gözlem bölümünde ağ/model çağrısı yok', () => {
    const bas = app.indexOf('§125 GÖZLEM FORMU');
    const blok = app.slice(bas, app.indexOf('§125 ÖĞRETMEN NOTUNA', bas));
    expect(blok).not.toMatch(/apiPost|\/api\/|aiEvaluate|aiGenerate/);
  });
  it('yazılı yüzde hesabı gözleme dokunmaz; kart ve karne gözlemi ayrı bölümle ekler', () => {
    expect(fonksiyonMetni('ogrenmeCiktisiHesapla')).not.toMatch(/gozlem/);
    expect(fonksiyonMetni('ogrenmeCiktisiVerisi')).not.toMatch(/gozlem/);
    expect(fonksiyonMetni('ogrenmeCiktisiKartiHtml')).toMatch(/gozlemKartBolumuHtml\(gz\)/);
    expect(fonksiyonMetni('karneKagidiHtml')).toMatch(/gozlemKagitBolumuHtml\(gz\)/);
    expect(fonksiyonMetni('karneYazdir')).toMatch(/gozlemOgrenciOzeti/);
  });
  it('kaynaklar kodda: MEB madde 13 URL ve Türkçe programı URL', () => {
    expect(app).toContain('https://www.memurlar.net/haber/1146648/');
    expect(app).toContain('https://tymm.meb.gov.tr/assets/pdf/ortaokul-turkce-dersi_20260902_111157_977.pdf');
  });
  it('öğretmen sınıf sayfasında "Gözlem" sekmesi (data-tab 6) ve çizimi', () => {
    expect(fonksiyonMetni('sinifSayfasiHtml')).toMatch(/\{ id: 6, ad: "Gözlem" \}/);
    expect(fonksiyonMetni('renderTeacher')).toMatch(/state\.teacherTab === 6\) \{ content\.innerHTML = gozlemHtml\(\); wireGozlem\(\)/);
  });
  it('gozlem.css yüklü; düzey düğmesi 44 px hedef', () => {
    expect(fs.readFileSync(path.join(kok, 'public', 'index.html'), 'utf8')).toContain('href="css/gozlem.css"');
    const css = fs.readFileSync(path.join(kok, 'public', 'css', 'gozlem.css'), 'utf8');
    expect(css).toMatch(/\.gz-d \{ width: calc\(var\(--sp-8\) \+ var\(--sp-3\)\); height: calc\(var\(--sp-8\) \+ var\(--sp-3\)\)/);
  });
});
