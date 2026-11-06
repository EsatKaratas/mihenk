// §93 — Ortak kazanım seçicisi (W1). İstemci kodu public/app.js metninden
// alınıp yalıtılmış kapsamda kurulur (state burada sahte nesnedir).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { matematikV4Yolu } from '../src/lib/prompts';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

function fonksiyonMetni(ad: string): string {
  const bas = app.indexOf('\nfunction ' + ad + '(');
  expect(bas, ad + ' app.js içinde bulunmalı').toBeGreaterThan(0);
  const son = app.indexOf('\n}\n', bas);
  return app.slice(bas, son + 3);
}

const BILESEN = ['kzHal', 'kazanimUnitesi', 'kazanimAgaci', 'kazanimAra', 'kazanimAgacHtml', 'kzDurumMetni', 'kzAramaAdayi', 'kazanimSeciciHtml'];

type Oge = { deger: string; kod: string; etiket: string; ders: string; sinif: string; sinifAd?: string; unite: string; sayi?: number };

function kur(outcomes: any[] = [], katalog: any = {}) {
  const kod = BILESEN.map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('state', 'OUTCOMES_LIST', 'escapeHtml',
    'const KZ_SINIR = 200; const _kzHal = {}; const _kzKayit = {};\n' + kod +
    '\nreturn { kzHal, kazanimUnitesi, kazanimAgaci, kazanimAra, kazanimAgacHtml, kzDurumMetni, kzAramaAdayi, kazanimSeciciHtml, _kzKayit };')(
    { katalog },
    () => outcomes,
    (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  );
}

const oge = (kod: string, ders: string, sinif: string, unite: string, sayi = 1): Oge =>
  ({ deger: kod, kod, etiket: kod + ' metni', ders, sinif, sinifAd: sinif + '. sınıf', unite, sayi });

describe('kazanimAgaci — ders → sınıf → ünite', () => {
  const { kazanimAgaci } = kur();

  it('tek değerli düzeyler atlanır (B2: ders ve sınıf formdan gelir)', () => {
    const a = kazanimAgaci([oge('M1', 'Matematik', '7', '1. Ünite'), oge('M2', 'Matematik', '7', '2. Ünite')], {});
    expect(a.cocuk.map((g: any) => g.alan + ':' + g.ad)).toEqual(['unite:1. Ünite', 'unite:2. Ünite']);
  });

  it('sabitDuzey ders ve sınıfı hep çizer; grup değeri "ders|sınıf" (C, cePool.dugum biçimi)', () => {
    const a = kazanimAgaci([oge('M1', 'Matematik', '7', '')], {
      sabitDuzey: ['ders', 'sinif'],
      grupDegeri: (alan: string, x: Oge) => (alan === 'ders' ? x.ders : alan === 'sinif' ? x.ders + '|' + x.sinif : null),
    });
    expect(a.cocuk[0].deger).toBe('Matematik');
    expect(a.cocuk[0].cocuk[0].deger).toBe('Matematik|7');
    expect(a.cocuk[0].cocuk[0].ogeler[0].kod).toBe('M1');
  });

  it('sınıf sayısal sıralanır, Ünitesiz sonda, sayılar toplanır', () => {
    const a = kazanimAgaci([
      oge('A', 'Fen', '8', 'X', 2), oge('B', 'Fen', '5', '', 3), oge('C', 'Fen', '5', 'Y', 1),
    ], {});
    expect(a.cocuk.map((g: any) => g.ad)).toEqual(['5. sınıf', '8. sınıf']);
    expect(a.cocuk[0].sayi).toBe(4);
    expect(a.cocuk[0].cocuk.map((g: any) => g.ad)).toEqual(['Y', 'Ünitesiz']);
  });
});

describe('kazanimAra', () => {
  const { kazanimAra } = kur();
  const liste = [oge('T.O.7.4', 'Türkçe', '7', 'Okuma'), { ...oge('MAT.7.1', 'Matematik', '7', ''), etiket: 'İşlem önceliği' }];
  it('kod ve metinde, Türkçe küçük harfle arar', () => {
    expect(kazanimAra(liste, 'işlem').map((x: Oge) => x.kod)).toEqual(['MAT.7.1']);
    expect(kazanimAra(liste, 't.o').map((x: Oge) => x.kod)).toEqual(['T.O.7.4']);
    expect(kazanimAra(liste, '  ')).toHaveLength(2);
  });
});

describe('kazanimUnitesi — sessiz yanlış ünite yok', () => {
  it('katalog grup\'u önce gelir; MAT kaydındaki alan = ders ünite SAYILMAZ', () => {
    const outcomes = [{ code: 'MAT.7.3.1', subject: 'Matematik', alan: 'Matematik' }];
    expect(kur(outcomes).kazanimUnitesi('MAT.7.3.1')).toBe('');
    const katalog = { 'Matematik|7': { kazanimlar: [{ kod: 'MAT.7.3.1', grup: '3. Ünite · DÖNÜŞÜM', alan: 'Matematik' }] } };
    expect(kur(outcomes, katalog).kazanimUnitesi('MAT.7.3.1')).toBe('3. Ünite · DÖNÜŞÜM');
  });
  it('Türkçe beceri alanı ve Deneyap atölyesi', () => {
    const outcomes = [
      { code: 'T.O.7.10', subject: 'Türkçe', alan: 'Okuma' },
      { code: 'DNY.X.1', subject: 'Deneyap Atölyeleri', atolye: 'Robotik' },
      { code: 'OZEL.1', subject: 'Fen Bilimleri' },
    ];
    const { kazanimUnitesi } = kur(outcomes);
    expect(kazanimUnitesi('T.O.7.10')).toBe('Okuma');
    expect(kazanimUnitesi('DNY.X.1')).toBe('Robotik');
    expect(kazanimUnitesi('OZEL.1')).toBe('');
    expect(kazanimUnitesi('YOK')).toBe('');
  });
});

describe('kazanimSeciciHtml / kazanimAgacHtml — erişilebilirlik ve sınır', () => {
  it('tree/treeitem, aria-level, aria-selected; filtre modunda "Tümü" ilk satır', () => {
    const k = kur();
    const html = k.kazanimSeciciHtml({ kimlik: 'kz-t', mod: 'filtre', etiket: 'Kazanım', secili: 'B',
      ogeler: [oge('A', 'Fen', '7', 'U1'), oge('B', 'Fen', '7', 'U2')], tumuEtiketi: 'Tümü' });
    expect(html).toContain('role="tree"');
    expect(html).toMatch(/<li role="treeitem" class="kz-oge kz-tumu" aria-level="1" aria-selected="false"[^>]*data-kz-deger="">/);
    expect(html).toMatch(/data-kz-anahtar="k:B" data-kz-deger="B"/);
    expect(html).toContain('aria-selected="true"');
    expect(html).not.toContain('kz-ara'); // ≤ 6 öğede arama kutusu yok
  });

  it('açılır mod: düğme aria-expanded/aria-controls, kapalı gövde hidden; boşsa düğme devre dışı', () => {
    const k = kur();
    const html = k.kazanimSeciciHtml({ kimlik: 'kz-a', mod: 'ekle', acilir: true, etiket: 'Ekle', etiketId: 'lbl',
      ogeler: [oge('A', 'Fen', '7', '')], dugmeMetni: 'Kazanım ekleyin… (1 kazanım)' });
    expect(html).toContain('aria-expanded="false" aria-controls="kz-a-govde"');
    expect(html).toContain('aria-labelledby="lbl kz-a-metin"');
    expect(html).toMatch(/id="kz-a-govde" hidden/);
    const bos = k.kazanimSeciciHtml({ kimlik: 'kz-b', mod: 'ekle', acilir: true, etiket: 'Ekle', ogeler: [], dugmeMetni: '— yükleniyor… —' });
    expect(bos).toMatch(/<button[^>]*disabled/);
    expect(bos).toContain('— yükleniyor… —');
  });

  it('kapalı dalların içi çizilmez; aramada ilk 200 gösterilir ve durum satırı söyler', () => {
    const k = kur();
    const cok = Array.from({ length: 450 }, (_, i) => oge('K' + i, 'Deneyap', 'D', 'U' + (i % 5)));
    k.kazanimSeciciHtml({ kimlik: 'kz-c', mod: 'ekle', etiket: 'E', ogeler: cok });
    const kapali = k.kazanimAgacHtml('kz-c');
    expect((kapali.match(/class="kz-oge/g) || []).length).toBe(0);
    k.kzHal('kz-c').ara = 'k';
    const arama = k.kazanimAgacHtml('kz-c');
    expect((arama.match(/class="kz-oge/g) || []).length).toBe(200);
    expect(k.kzDurumMetni('kz-c')).toBe('450 kazanım bulundu — ilk 200 tanesi gösteriliyor, aramayı daraltın.');
  });

  it('kaçırma: tırnaklı kod özniteliği kapatamaz', () => {
    const k = kur();
    const html = k.kazanimSeciciHtml({ kimlik: 'kz-x', mod: 'tekli', etiket: 'E', ogeler: [oge('A"><b>x', 'F', '7', '')] });
    expect(html).not.toContain('"><b>x');
    expect(html).toContain('A&quot;&gt;&lt;b&gt;x');
  });
});

describe('bağlantılar ve sınırlar (statik)', () => {
  it('eski koşulsuz #ceOutcome / #fltOutcome / .pe-outcome bağlamaları kalmadı', () => {
    expect(app).not.toMatch(/getElementById\("ceOutcome"\)/);
    expect(app).not.toMatch(/getElementById\("fltOutcome"\)/);
    expect(app).not.toMatch(/querySelectorAll\("\.pe-outcome"\)/);
  });

  it('TUZAK 13: bileşen VARSAYILAN_* okumaz, KALICI_ALANLAR\'a geçici hâl girmez', () => {
    for (const ad of BILESEN) expect(fonksiyonMetni(ad), ad).not.toMatch(/VARSAYILAN_/);
    const kalici = app.slice(app.indexOf('const KALICI_ALANLAR'), app.indexOf(';', app.indexOf('const KALICI_ALANLAR')));
    expect(kalici).not.toMatch(/_kz|kzHal/);
  });

  it('yazılan alanlar aynı: poolFilter.outcome, q.outcome, kazanimSecildi, cePool.dugum', () => {
    expect(app).toMatch(/kazanimSeciciBagla\("kz-ogt-filtre", function \(kod\) \{ state\.poolFilter\.outcome = kod;/);
    expect(app).toMatch(/kazanimSeciciBagla\(el\.id, function \(kod\) \{ const q = findQuestion\(qid\); if \(q\) \{ q\.outcome = kod;/);
    expect(app).toMatch(/kazanimSeciciBagla\("kz-ce-ekle", function \(kod\) \{[\s\S]{0,80}kazanimSecildi\(kod\);/);
    expect(app).toMatch(/kazanimSeciciBagla\("kz-havuz", function \(yol\) \{ f\(\)\.dugum = yol;/);
  });
});

describe('matematikV4Yolu — B2 üzerinden seçilen kazanımla bozulmaz', () => {
  // kazanimSecildi + uretimKaynakTuru app.js'ten; seçici yalnız kazanimSecildi(kod) çağırır.
  function kurUretim(outcomes: any[], katalog: any[]) {
    const kod = ['kazanimSecildi', 'uretimKaynakTuru'].map(fonksiyonMetni).join('\n');
    const state: any = { ceForm: { outcomeCode: '' }, outcomes };
    // eslint-disable-next-line no-new-func
    const f = new Function('state', 'OUTCOMES_LIST', 'katalogKazanimlari', 'saveSoon', 'DENEYAP_DERSI',
      kod + '\nreturn { kazanimSecildi, uretimKaynakTuru };')(state, () => state.outcomes, () => katalog, () => {}, 'Deneyap Atölyeleri');
    return { state, ...f };
  }

  it('MAT katalog kazanımı → kayıt Matematik, kaynakTuru gönderilmez, v4 yolu açık', () => {
    const { state, kazanimSecildi, uretimKaynakTuru } = kurUretim([], [
      { code: 'MAT.7.3.1', label: 'MAT.7.3.1 — Yansıma', subject: 'Matematik', grade: 7, uygunluk: 'yazili', alan: 'Matematik', grup: '3. Ünite · DÖNÜŞÜM' },
    ]);
    kazanimSecildi('MAT.7.3.1');
    expect(state.ceForm.outcomeCode).toBe('MAT.7.3.1');
    expect(state.outcomes[0]).toMatchObject({ code: 'MAT.7.3.1', subject: 'Matematik', grade: 7 });
    const doc = { mode: 'kazanim', outcome: 'MAT.7.3.1', subject: 'Matematik' };
    const kaynakTuru = uretimKaynakTuru(doc);
    expect(kaynakTuru).toBeUndefined();
    expect(matematikV4Yolu({ subject: 'Matematik', mode: 'kazanim', kaynakTuru })).toBe(true);
  });

  it('Deneyap kazanımı → kaynakTuru "deneyap", v4 yolu kapalı', () => {
    const { kazanimSecildi, uretimKaynakTuru } = kurUretim([], [
      { code: 'DNY.R.1', label: 'DNY.R.1 — Robot', subject: 'Deneyap Atölyeleri', grade: 'Deneyap', atolye: 'Robotik', uygunluk: 'yazili', alan: 'Uygulama' },
    ]);
    kazanimSecildi('DNY.R.1');
    const kaynakTuru = uretimKaynakTuru({ mode: 'kazanim', outcome: 'DNY.R.1', subject: 'Matematik' });
    expect(kaynakTuru).toBe('deneyap');
    expect(matematikV4Yolu({ subject: 'Matematik', mode: 'kazanim', kaynakTuru })).toBe(false);
  });
});

describe('W9 P3 — B2 erişilebilir ad ve aramada Enter', () => {
  it('P3-3: görünür etiket yoksa düğmenin adı bileşen etiketi ("… kazanım ekle"), metin açıklama', () => {
    const k = kur();
    const html = k.kazanimSeciciHtml({ kimlik: 'kz-ce-ekle', mod: 'ekle', acilir: true, etiket: 'MEB öğretim programından kazanım ekle',
      ogeler: [oge('A', 'Fen', '7', '')], dugmeMetni: 'MEB öğretim programından kazanım ekleyin… (1 kazanım)' });
    expect(html).toContain('aria-label="MEB öğretim programından kazanım ekle" aria-describedby="kz-ce-ekle-metin"');
    expect(html).not.toContain('aria-labelledby');
    // etiketId verilen yerlerde (A1, A2) eski davranış
    const a1 = k.kazanimSeciciHtml({ kimlik: 'kz-a1', mod: 'filtre', acilir: true, etiket: 'K', etiketId: 'lbl', ogeler: [oge('A', 'Fen', '7', '')] });
    expect(a1).toContain('aria-labelledby="lbl kz-a1-metin"');
    expect(a1).not.toMatch(/<button[^>]*aria-label=/);
    // B2 gerçekten etiketsiz çağrılıyor ve etiketi "… kazanım ekle"
    expect(fonksiyonMetni('ceKazanimEkleSeciciHtml')).toMatch(/etiket: kaynakAd \+ " kazanım ekle"/);
    expect(fonksiyonMetni('ceKazanimEkleSeciciHtml')).not.toContain('etiketId');
  });

  it('P3-2: Enter adayı yalnız tek eşleşmede ya da kod birebir eşleşince; başka durumda null', () => {
    const { kzAramaAdayi } = kur();
    const l = [oge('MAT.7.1.1', 'Matematik', '7', ''), oge('MAT.7.1.10', 'Matematik', '7', ''), oge('MAT.7.2.1', 'Matematik', '7', '')];
    expect(kzAramaAdayi(l, '')).toBeNull();
    expect(kzAramaAdayi(l, '   ')).toBeNull();
    expect(kzAramaAdayi(l, 'mat.7.2')).toBe('MAT.7.2.1');           // tek eşleşme
    expect(kzAramaAdayi(l, 'MAT.7.1.1')).toBe('MAT.7.1.1');         // 2 eşleşme, kod birebir
    expect(kzAramaAdayi(l, 'mat.7.1.1 ')).toBe('MAT.7.1.1');        // büyük/küçük harf, boşluk
    expect(kzAramaAdayi(l, 'mat.7.1')).toBeNull();                  // belirsiz: hiçbir şey seçilmez
    expect(kzAramaAdayi(l, 'yok')).toBeNull();
    // C: değer "ders|sınıf|kod" biçimindedir; dönen değer KOD değil değerdir
    const c = [{ ...oge('FEN.7.1.2', 'Fen', '7', ''), deger: 'Fen|7|FEN.7.1.2' }];
    expect(kzAramaAdayi(c, 'fen.7.1.2')).toBe('Fen|7|FEN.7.1.2');
  });

  it('P3-2: durum satırı Enter’ı söyler; bağlama başka hiçbir şeyi otomatik yapmaz', () => {
    const k = kur();
    k.kazanimSeciciHtml({ kimlik: 'kz-d', mod: 'ekle', etiket: 'E', ogeler: [oge('A1', 'F', '7', ''), oge('B2', 'F', '7', '')] });
    k.kzHal('kz-d').ara = 'a1';
    k.kazanimAgacHtml('kz-d');
    expect(k.kzDurumMetni('kz-d')).toBe('1 kazanım bulundu. Enter ile seçebilirsiniz.');
    k.kzHal('kz-d').ara = 'zz';
    k.kazanimAgacHtml('kz-d');
    expect(k.kzDurumMetni('kz-d')).toBe('Aramaya uyan kazanım yok.');
    const bag = fonksiyonMetni('kazanimSeciciBagla');
    const enterBas = bag.indexOf('e.key === "Enter"');
    const enter = bag.slice(enterBas, bag.indexOf('};', enterBas));
    expect(enter).toContain('kzAramaAdayi(r.ogeler, ara.value)');
    expect(enter).toMatch(/if \(li\) sec\(li\);/);
    expect(enter).not.toMatch(/renderAll|kazanimSecildi|poolFilter|cePool/);
  });
});
