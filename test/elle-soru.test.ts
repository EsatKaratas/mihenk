// ============================================================================
// §99 — İçerik uzmanı "elle soru yaz" (W10). Tasarım notu:
// Downloads\Mihenk\mihenk-elle-soru-tasarim.md (§6 test listesi, madde 1–9).
// İstemci fonksiyonları public/app.js metninden alınıp yalıtılmış kapsamda
// kurulur (kazanim-secici.test.ts kalıbı); state sahte nesnedir.
// Madde 10 (tarayıcı akışı) PROGRESS §99'da ölçüm olarak kayıtlı.
// ============================================================================
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

/** Üst düzey `function ad(` gövdesi, bir sonraki üst düzey tanıma kadar. */
function govde(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas + 1);
  const son = kalan.search(/^(async )?function [A-Za-z_$][\w$]*\(/m);
  return son < 0 ? kalan : kalan.slice(0, son);
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kur() {
  const state: any = {
    questions: [], auditLog: [], cozuluyor: {},
    ceForm: { outcomeCode: 'FEN.7.1.2', sube: '7-A' },
  };
  const cagrilar: string[] = [];
  const kod = ['elleSoruOlustur', 'elleSoruEksikleri', 'elleEksikMetni', 'soruyuOnayla', 'auditOzet',
    'soruKaynakTuru', 'denetimDurumHtml', 'cozumImzasi', 'filteredPool'].map(fonksiyonMetni).join('\n');
  // eslint-disable-next-line no-new-func
  const api = new Function('state', 'cagrilar', 'escapeHtml',
    'let qIdSeq = 100; const ELLE_SIKLAR = ["A", "B", "C", "D"];\n' +
    'function renderAll() { cagrilar.push("renderAll"); }\n' +
    'function ensureAudit() { state.auditLog = state.auditLog || []; }\n' +
    'function auditKaydet(tur, veri) { const k = { tur }; Object.keys(veri || {}).forEach(function (x) {' +
    ' if (veri[x] !== undefined && veri[x] !== null) k[x] = veri[x]; }); state.auditLog.push(k); }\n' +
    'function auditKisalt(s) { return String(s || ""); }\n' +
    'function soruSupheleri() { return []; }\n' +
    'function aiKaynakMetinleri() { return []; }\n' +
    'function aiKaynakRozetiHtml() { return ""; }\n' +
    'function dilTetikleyiciMetni() { return ""; }\n' +
    kod +
    '\nreturn { elleSoruOlustur, elleSoruEksikleri, elleEksikMetni, soruyuOnayla, auditOzet, soruKaynakTuru, denetimDurumHtml, filteredPool };',
  )(state, cagrilar, esc);
  return { state, cagrilar, ...api };
}

/** Tamamlanmış elle ÇSS (uzmanın kartta yapacağı düzenlemeler). */
function doldur(q: any) {
  q.body = 'Pürüzlü zeminde sürtünme nasıl değişir?';
  q.options.forEach((o: any, i: number) => { o.text = 'Şık ' + (i + 1); });
  q.correctKey = 'B';
  q.anahtarBelirsiz = false;   // var olan .correct-radio bağlayıcısının yaptığı
  return q;
}

describe('1 · elleSoruOlustur — boş taslak, bekleyen kuyruğu', () => {
  it('ÇSS: status ai_generated, yazan insan, model yok, 4 boş şık, anahtar belirsiz', () => {
    const { elleSoruOlustur, state } = kur();
    const q = elleSoruOlustur('mc');
    expect(state.questions).toHaveLength(1);
    expect(q).toMatchObject({ type: 'mc', status: 'ai_generated', yazan: 'insan', elleTaslak: true,
      uretenModel: null, anahtarBelirsiz: true, correctKey: '', body: '', outcome: 'FEN.7.1.2', sube: '7-A',
      needsSource: false, srcId: null });
    expect(q.options.map((o: any) => o.key + ':' + o.text)).toEqual(['A:', 'B:', 'C:', 'D:']);
  });

  it('açık uçlu: options boş, anahtar şüphesi yok', () => {
    const { elleSoruOlustur } = kur();
    const q = elleSoruOlustur('open');
    expect(q).toMatchObject({ type: 'open', options: [], anahtarBelirsiz: false, status: 'ai_generated' });
  });

  it('denetim izine soru_elle_yazildi yazılır; onay YAZILMAZ', () => {
    const { elleSoruOlustur, state } = kur();
    elleSoruOlustur('mc');
    expect(state.auditLog.map((k: any) => k.tur)).toEqual(['soru_elle_yazildi']);
  });
});

describe('2 · elleSoruEksikleri — yalnız yapısal eksik', () => {
  it('boş ÇSS taslağında üç eksik', () => {
    const { elleSoruOlustur, elleSoruEksikleri } = kur();
    expect(elleSoruEksikleri(elleSoruOlustur('mc'))).toEqual(['soru metni boş', '4 şık boş', 'doğru şık seçilmedi']);
  });

  it('tam ÇSS ve tam açık uçlu → []', () => {
    const { elleSoruOlustur, elleSoruEksikleri } = kur();
    expect(elleSoruEksikleri(doldur(elleSoruOlustur('mc')))).toEqual([]);
    const a = elleSoruOlustur('open'); a.body = 'Açıklayınız.';
    expect(elleSoruEksikleri(a)).toEqual([]);
  });

  it('tek boş şık ve seçilmemiş anahtar ayrı ayrı yakalanır', () => {
    const { elleSoruOlustur, elleSoruEksikleri } = kur();
    const q = doldur(elleSoruOlustur('mc')); q.options[2].text = '  ';
    expect(elleSoruEksikleri(q)).toEqual(['1 şık boş']);
    q.options[2].text = 'x'; q.correctKey = 'Z';
    expect(elleSoruEksikleri(q)).toEqual(['doğru şık seçilmedi']);
  });

  it('YZ sorusunda (yazan alanı yok) her zaman [] — eski onay davranışı değişmez', () => {
    const { elleSoruEksikleri } = kur();
    expect(elleSoruEksikleri({ type: 'mc', body: '', options: [{ key: 'A', text: '' }], correctKey: '', anahtarBelirsiz: true })).toEqual([]);
  });
});

describe('3 · onay yolu — tek yol, kestirme yok (agents.md §1)', () => {
  it('onay işleyicisi eksik elle taslakta soruyuOnayla çağırmadan döner; §70 ikinci onay yolu aynen', () => {
    const g = govde('wirePendingCards');
    const onay = g.slice(g.indexOf('.approve-btn'));
    const koruma = onay.indexOf('elleSoruEksikleri(q).length');
    expect(koruma).toBeGreaterThan(0);
    expect(koruma).toBeLessThan(onay.indexOf('soruyuOnayla(q)'));
    expect(onay).toContain('supheliOnayModali(q, yuksek)');
  });

  it('kart: eksik varsa onay düğmesi disabled, nedeni aria-describedby ile bağlı', () => {
    const g = govde('renderPendingQuestionCard');
    expect(g).toContain('elleSoruEksikleri(q)');
    expect(g).toMatch(/eksik\.length \? ' disabled aria-describedby="elleEksik-/);
  });

  it('status = "approved" yalnız soruyuOnayla ve demo tohumunda atanır (ikinci yol yok)', () => {
    const atamalar = app.split('\n').filter((s) => /\.status\s*=\s*"approved"/.test(s));
    expect(atamalar).toHaveLength(2);
    expect(govde('soruyuOnayla')).toMatch(/q\.status = "approved"/);
    expect(govde('loadDemoScenario')).toMatch(/kopya\.status = "approved"/);
    expect(govde('elleSoruOlustur')).not.toMatch(/approved/);
  });

  it('elle düğmeleri yalnız elleSoruOlustur çağırır', () => {
    const g = govde('renderContentExpert');   // btnGenerate de burada bağlanır
    expect(g).toContain('elleMc.onclick = function () { elleSoruOlustur("mc"); }');
    expect(g).toContain('elleAcik.onclick = function () { elleSoruOlustur("open"); }');
  });

  it('onaylanmamış elle soru sınav havuzunda (filteredPool) yok; onaydan sonra var', () => {
    const { elleSoruOlustur, soruyuOnayla, filteredPool, state } = kur();
    state.poolFilter = { outcome: '', difficulty: '', type: '', sube: '' };
    const q = doldur(elleSoruOlustur('mc'));
    expect(filteredPool()).toHaveLength(0);
    soruyuOnayla(q);
    expect(filteredPool().map((x: any) => x.id)).toEqual([q.id]);
  });
});

describe('4 · soruyuOnayla denetim kaydı', () => {
  it('elle soruda elle:true, model yok, elleTaslak silinir', () => {
    const { elleSoruOlustur, soruyuOnayla, state } = kur();
    const q = doldur(elleSoruOlustur('mc'));
    soruyuOnayla(q);
    const k = state.auditLog.find((x: any) => x.tur === 'soru_onaylandi');
    expect(k.elle).toBe(true);
    expect(k.model).toBeUndefined();
    expect(q.status).toBe('approved');
    expect('elleTaslak' in q).toBe(false);
  });

  it('YZ sorusunda elle alanı yazılmaz (geri uyum)', () => {
    const { soruyuOnayla, state } = kur();
    soruyuOnayla({ id: 1, body: 'x', uretenModel: 'llama', status: 'ai_generated' });
    const k = state.auditLog.find((x: any) => x.tur === 'soru_onaylandi');
    expect('elle' in k).toBe(false);
    expect(k.model).toBe('llama');
  });
});

describe('5 · denetim özeti', () => {
  it('elle onaylar YZ kabul sayısına girmez, ayrı sayılır; model sayımına girmez', () => {
    const { auditOzet, state } = kur();
    state.auditLog = [
      { tur: 'soru_uretildi', adet: 2, model: 'llama' },
      { tur: 'soru_onaylandi', model: 'llama' },
      { tur: 'soru_elle_yazildi', qid: 9 },
      { tur: 'soru_onaylandi', elle: true },
    ];
    const o = auditOzet();
    expect(o.uretilen).toBe(2);
    expect(o.onaylanan).toBe(1);
    expect(o.elleOnay).toBe(1);
    expect(o.modeller).toEqual({ llama: 1 });
  });

  it('AUDIT_ETIKET soru_elle_yazildi: aktör içerik uzmanı', () => {
    expect(app).toMatch(/soru_elle_yazildi:\s*\{ ad: "Soru elle yazıldı",[^}]*aktor: "içerik uzmanı" \}/);
  });
});

describe('6 · denetimDurumHtml', () => {
  it('elle ÇSS: "elle yazıldı" der, "eklenmeden önce üretildi" demez; bağımsız çöz düğmesi kalır', () => {
    const { elleSoruOlustur, denetimDurumHtml } = kur();
    const h = denetimDurumHtml(doldur(elleSoruOlustur('mc')));
    expect(h).toContain('<b>elle yazıldı</b>');
    expect(h).not.toContain('eklenmeden önce üretildi');
    expect(h).not.toContain('denetlenmedi</b>');
    expect(h).toContain('js-coz');
  });

  it('YZ sorusunda eski metin aynen', () => {
    const { denetimDurumHtml } = kur();
    const h = denetimDurumHtml({ id: 1, type: 'mc', body: 'x', options: [], correctKey: 'A' });
    expect(h).toContain('hesap denetimi: <b>denetlenmedi</b>');
  });
});

describe('7 · havuz kaynak filtresi', () => {
  it('elle soru "elle", demo önce gelir, diğerleri eskisi gibi', () => {
    const { soruKaynakTuru } = kur();
    expect(soruKaynakTuru({ yazan: 'insan', outcome: 'FEN.7.1.2' })).toBe('elle');
    expect(soruKaynakTuru({ yazan: 'insan', demo: true })).toBe('demo');
    expect(soruKaynakTuru({ srcId: 3 })).toBe('metin');
    expect(soruKaynakTuru({ outcome: 'DNY.1' })).toBe('deneyap');
    expect(soruKaynakTuru({ outcome: 'FEN.7.1.2' })).toBe('kazanim');
  });

  it('HAVUZ_KAYNAKLARI "Elle yazılan" seçeneğini içerir', () => {
    expect(app).toMatch(/\{ id: "elle", ad: "Elle yazılan" \}/);
  });
});

describe('8 · geri uyum — göç yok', () => {
  it('KALICI_ALANLAR yeni alan içermez (ceElleOdak yalnız arayüz)', () => {
    const bas = app.indexOf('const KALICI_ALANLAR');
    const son = app.indexOf('];', bas);
    const liste = app.slice(bas, son);
    expect(liste).not.toMatch(/"(ceElleOdak|elleTaslak|yazan)"/);
  });

  it('yazan alanı olmayan eski kayıt: kaynak türü ve eksik listesi eskisi gibi', () => {
    const { soruKaynakTuru, elleSoruEksikleri } = kur();
    const eski = { id: 5, type: 'mc', status: 'ai_generated', body: 'x', options: [], outcome: 'FEN.7.1.2' };
    expect(soruKaynakTuru(eski)).toBe('kazanim');
    expect(elleSoruEksikleri(eski)).toEqual([]);
  });
});

describe('9 · öz-kontrol listesi', () => {
  it('yeni adlar selfCheck listesinde, birer kez', () => {
    const bas = app.indexOf('(function selfCheck()');
    const sc = app.slice(bas);
    for (const ad of ['elleSoruOlustur', 'elleSoruEksikleri', 'elleEksikMetni', 'elleEksikYenile', 'elleSoruBilgiHtml']) {
      expect(sc.split('"' + ad + '"').length - 1, ad).toBe(1);
    }
  });

  it('A2 kazanım seçicisi değiştirilmeden çağrılır', () => {
    expect(govde('elleSoruBilgiHtml')).toContain('peKazanimSeciciHtml(q)');
  });
});
