// ============================================================================
// §100 — Kota dayanıklılığı (0 Neuron): kota doluyken yapay zekâsız mod,
// sihirbaz 3. adım kapasite ön hesabı, navigator.storage.persist() ve
// /vendor/* önbellek kararı. app.js modül değil: işlevler kaynak metinden
// çıkarılıp new Function ile sınanır (ai-rozet-tohum.test.ts deseni).
// ============================================================================
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const kok = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(kok, 'public', 'app.js'), 'utf8');

function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}
function sabit(ad: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  return app.slice(bas + 1, app.indexOf(';\n', bas) + 2);
}
const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

const SABITLER = ['AI_KOTA_SERIT_METNI', 'AI_KOTA_DUGME_IPUCU', 'AI_DUGME_SECICI',
  'KAPASITE_DEGERLENDIRME_NEURON', 'KAPASITE_VARSAYILAN_ESIK', 'KAPASITE_VARSAYILAN_IP_SINIRI'].map(sabit).join('\n');

type Durum = { ai: { mode: string; butce: unknown } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function yukle(state: Durum, document: any = {}): any {
  return new Function('escapeHtml', 'state', 'document', 'aiGunlukKapali',
    SABITLER + '\n' +
    ['aiKotaDolu', 'aiYzsizMod', 'renderAiKotaSeridi', 'aiDugmeleriniKilitle', 'kapasiteHesabi', 'kapasiteHtml', 'evalFailedActionsHtml']
      .map(tanim).join('\n') +
    '\nreturn { aiKotaDolu, aiYzsizMod, renderAiKotaSeridi, aiDugmeleriniKilitle, kapasiteHesabi, kapasiteHtml, evalFailedActionsHtml,' +
    ' AI_KOTA_SERIT_METNI, AI_KOTA_DUGME_IPUCU, AI_DUGME_SECICI, KAPASITE_DEGERLENDIRME_NEURON };'
  )(escapeHtml, state, document, (kod: string) => kod === 'ai_kota_bitti' || kod === 'gunluk_sinir' || kod === 'gunluk_butce');
}

const YARIN = new Date(Date.now() + 3600_000).toISOString();
const DUN = new Date(Date.now() - 3600_000).toISOString();
const DOLU = { doldu: true, tukendi: false, esik: 9000, tahminiNeuron: 9100, sifirlanmaUtc: YARIN };

describe('§100-1 yapay zekâsız mod: tetikleyici', () => {
  const k = yukle({ ai: { mode: 'live', butce: null } });
  it('doldu ya da tukendi → açık; sıfırlanma anı geçtiyse kapalı', () => {
    expect(k.aiKotaDolu(DOLU)).toBe(true);
    expect(k.aiKotaDolu({ doldu: false, tukendi: true, sifirlanmaUtc: YARIN })).toBe(true);
    expect(k.aiKotaDolu({ doldu: false, tukendi: false, sifirlanmaUtc: YARIN })).toBe(false);
    expect(k.aiKotaDolu({ ...DOLU, sifirlanmaUtc: DUN })).toBe(false);
    expect(k.aiKotaDolu(null)).toBe(false);
    // Sunucu sıfırlanma anı vermezse "doldu" sözüne güvenilir (temkinli).
    expect(k.aiKotaDolu({ doldu: true })).toBe(true);
  });
  it('yalnız gerçek model modunda (simülasyonda kota yok)', () => {
    expect(yukle({ ai: { mode: 'live', butce: DOLU } }).aiYzsizMod()).toBe(true);
    expect(yukle({ ai: { mode: 'simulation', butce: DOLU } }).aiYzsizMod()).toBe(false);
    expect(yukle({ ai: { mode: 'live', butce: { ...DOLU, doldu: false } } }).aiYzsizMod()).toBe(false);
  });
});

describe('§100-1 kabukta tek bilgi şeridi', () => {
  function sahteDoc() {
    const yuva = { innerHTML: '' };
    return {
      yuva,
      getElementById: (id: string) => id === 'aiKotaSeritYuva' ? yuva
        : id === 'aiKotaSerit' ? (yuva.innerHTML.includes('id="aiKotaSerit"') ? {} : null) : null,
    };
  }
  it('mod açıkken şerit metni birebir; role="status"; ikinci çizimde çoğalmaz', () => {
    const d = sahteDoc();
    const k = yukle({ ai: { mode: 'live', butce: DOLU } }, d);
    k.renderAiKotaSeridi();
    expect(d.yuva.innerHTML).toContain("Yapay zekâ bugünlük kotasını doldurdu; 03:00'te (TR) açılır. Elle soru, havuz, elle puanlama ve analiz çalışıyor.".replace(/'/g, '&#39;'));
    expect(d.yuva.innerHTML).toContain('role="status"');
    const ilk = d.yuva.innerHTML;
    k.renderAiKotaSeridi();
    expect(d.yuva.innerHTML).toBe(ilk);
    expect((d.yuva.innerHTML.match(/ai-kota-serit"/g) || []).length).toBe(1);
  });
  it('mod kapalıyken yuva boşalır', () => {
    const d = sahteDoc();
    d.yuva.innerHTML = '<div class="ai-kota-serit" id="aiKotaSerit"></div>';
    yukle({ ai: { mode: 'live', butce: { ...DOLU, doldu: false } } }, d).renderAiKotaSeridi();
    expect(d.yuva.innerHTML).toBe('');
  });
  it('yuva index.html kabuğunda, demo şeridinin altında; renderAll şeridi kabuk yüksekliğinden ÖNCE çizer', () => {
    const html = fs.readFileSync(path.join(kok, 'public', 'index.html'), 'utf8');
    const ust = html.slice(html.indexOf('<header class="topbar kabuk-ust">'), html.indexOf('</header>'));
    expect(ust).toContain('<div id="aiKotaSeritYuva"></div>');
    expect(ust.indexOf('demoSeritYuva')).toBeLessThan(ust.indexOf('aiKotaSeritYuva'));
    const ra = tanim('renderAll');
    expect(ra.indexOf('renderAiKotaSeridi();')).toBeGreaterThan(0);
    expect(ra.indexOf('renderAiKotaSeridi();')).toBeLessThan(ra.indexOf('kabukYuksekliginiYaz();'));
    expect(ra.indexOf('aiDugmeleriniKilitle();')).toBeLessThan(ra.indexOf('renderOdaginiKurtar(odakIzi);'));
  });
});

describe('§100-1 yapay zekâ düğmeleri pasif, title + aria açıklamalı', () => {
  function dugme() {
    const attr: Record<string, string> = {}; const cls = new Set<string>();
    return { disabled: false, attr, cls, onclick: () => 'eski',
      setAttribute: (a: string, v: string) => { attr[a] = v; }, classList: { add: (c: string) => cls.add(c) } };
  }
  it('mod açıkken seçicideki her düğme disabled, aria-disabled, title, aria-describedby; onclick DEĞİŞMEZ', () => {
    const b1 = dugme(), b2 = dugme();
    let secici = '';
    const d = { querySelectorAll: (s: string) => { secici = s; return [b1, b2]; }, getElementById: (id: string) => id === 'aiKotaSerit' ? {} : null };
    const k = yukle({ ai: { mode: 'live', butce: DOLU } }, d);
    expect(k.aiDugmeleriniKilitle()).toBe(2);
    expect(secici).toBe(k.AI_DUGME_SECICI);
    for (const b of [b1, b2]) {
      expect(b.disabled).toBe(true);
      expect(b.attr['aria-disabled']).toBe('true');
      expect(b.attr.title).toBe(k.AI_KOTA_DUGME_IPUCU);
      expect(b.attr['aria-describedby']).toBe('aiKotaSerit');
      expect(b.onclick()).toBe('eski');   // başka yola yönlendirme yok
    }
  });
  it('mod kapalıyken hiçbir düğmeye dokunulmaz', () => {
    const d = { querySelectorAll: vi.fn(() => []), getElementById: () => null };
    expect(yukle({ ai: { mode: 'live', butce: { ...DOLU, doldu: false } } }, d).aiDugmeleriniKilitle()).toBe(0);
    expect(d.querySelectorAll).not.toHaveBeenCalled();
  });
  it('seçici, AI uçlarına POST atan her işlevin düğmesini kapsar (wire satırlarıyla eşleşir)', () => {
    const k = yukle({ ai: { mode: 'live', butce: null } });
    const parcalar = String(k.AI_DUGME_SECICI).split(',').map((x: string) => x.trim());
    const beklenen: Record<string, RegExp> = {
      '#btnGenerate': /getElementById\("btnGenerate"\)\.onclick = onGenerateQuestions/,
      '#btnRemedialGen': /getElementById\("btnRemedialGen"\);\n\s*if \(rg\) rg\.onclick = onGenerateQuestions/,
      '#btnAlign': /getElementById\("btnAlign"\);\n\s*if \(b\) b\.onclick = function \(\) \{ runAlignment\(\); \}/,
      '.js-coz': /querySelectorAll\("\.js-coz"\)[\s\S]{0,80}bagimsizCoz\(/,
      '#btnTopluCoz': /getElementById\("btnTopluCoz"\);\n\s*if \(tc\) tc\.onclick = bekleyenleriCoz/,
      '#btnAiRubric': /getElementById\("btnAiRubric"\)[\s\S]{0,400}aiSuggestRubric\(/,
      '#btnSimClass': /getElementById\("btnSimClass"\);\n\s*if \(simBtn\) simBtn\.onclick = function \(\) \{ simulateClass\(/,
      '.retry-eval': /querySelectorAll\("\.retry-eval"\)[\s\S]{0,80}retryEvaluation\(/,
      '.mis-run': /querySelectorAll\("\.mis-run"\)[\s\S]{0,80}runMisconceptions\(/,
    };
    expect(parcalar.sort()).toEqual(Object.keys(beklenen).sort());
    for (const [s, re] of Object.entries(beklenen)) expect(app, s).toMatch(re);
    // POST atan işlevlerin hepsi yukarıdaki düğmelerden birine bağlı (yeni uç eklenirse test düşer).
    const postAtan = app.split('apiPost(AI_API.').length - 1;
    expect(postAtan).toBe(7);
  });
});

describe('§100-1 elle puanlama baştan önerilir; sessiz yedek yok', () => {
  const q = { id: 3 }, s = { id: 9 };
  it('mod açıkken hata kodu ne olursa olsun "Elle Puanla ve Onayla" birincil ve önde', () => {
    const k = yukle({ ai: { mode: 'live', butce: DOLU } });
    for (const kod of ['', 'ai_call_failed', 'model_output_invalid']) {
      const h = k.evalFailedActionsHtml(q, s, { failed: true, kod });
      expect(h.indexOf('revise-approve')).toBeLessThan(h.indexOf('retry-eval'));
      expect(h).toContain('btn btn-primary revise-approve');
      expect(h).toContain('btn btn-secondary retry-eval');
    }
  });
  it('mod kapalı + sıradan hata → eski düzen (yeniden dene birincil)', () => {
    const h = yukle({ ai: { mode: 'live', butce: null } }).evalFailedActionsHtml(q, s, { failed: true, kod: '' });
    expect(h.indexOf('retry-eval')).toBeLessThan(h.indexOf('revise-approve'));
  });
  it('özet kutusu yapay zekâsız modda "elle puanlayın" der', () => {
    expect(app).toContain("(aiYzsizMod() ? \"elle puanlayın (yapay zekâ 03:00'te açılır)\" : 'yeniden deneyin')");
  });
  it('çağrı yolları modu bilmez: apiPost / aiEvaluate / aiGenerateQuestions başka yola düşmez', () => {
    for (const ad of ['apiPost', 'aiEvaluate', 'aiGenerateQuestions']) {
      const g = tanim(ad);
      expect(g, ad).not.toContain('aiYzsizMod');
      expect(g, ad).not.toContain('aiKotaDolu');
    }
  });
  it('bütçe yenilenince mod değiştiyse tam çizim, sıfırlanma için tek zamanlayıcı (GET, POST yok)', () => {
    const g = tanim('aiButceYenile');
    expect(g).toContain('if (aiYzsizMod() !== onceki) renderAll(); else renderAiBadge();');
    expect(g).toContain('aiKotaSifirlanmaKur(state.ai.butce);');
    const z = tanim('aiKotaSifirlanmaKur');
    expect(z).toContain('if (_aiKotaZamanlayici || !aiKotaDolu(b)) return;');
    expect(z).toContain('aiButceYenile();');
    expect(z).not.toContain('apiPost');
    expect(z).not.toContain('setInterval');
  });
});

describe('§100-2 sihirbaz 3. adım kapasite ön hesabı', () => {
  const k = yukle({ ai: { mode: 'live', butce: null } });
  it('sabit tek yerde, değeri 110 (§86 ölçümü)', () => {
    expect(k.KAPASITE_DEGERLENDIRME_NEURON).toBe(110);
    expect(app.match(/KAPASITE_DEGERLENDIRME_NEURON = /g)?.length).toBe(1);
    const i = app.indexOf('const KAPASITE_DEGERLENDIRME_NEURON');
    expect(app.slice(i - 900, i)).toContain('§86');
  });
  it('N × M = K, ≈ X Neuron, kalan = eşik − tahmini', () => {
    const h = k.kapasiteHesabi(28, 2, { esik: 9000, tahminiNeuron: 3000, doldu: false }, 60);
    expect(h).toMatchObject({ ogrenci: 28, acik: 2, degerlendirme: 56, neuron: 6160, esik: 9000, kalan: 6000,
      ipSiniri: 60, gunuAsar: false, kalaniAsar: true, ipAsar: false });
  });
  it('metin birebir biçimde; Türkçe binlik ayırıcı', () => {
    const html = k.kapasiteHtml(k.kapasiteHesabi(28, 2, { esik: 9000, tahminiNeuron: 3000 }, 60), 0);
    expect(html).toContain('28 öğrenci × 2 açık uçlu = 56 değerlendirme ≈ 6.160 Neuron; günlük sınır ~9.000; bugün kalan ≈ 6.000.');
    expect(html).toContain('günde en çok 60 model çağrısı');
    expect(html).toContain('role="note"');
    expect(html).toContain('bugün kalanı');
  });
  it('bütçe bilinmiyorsa kalan "bilinmiyor", eşik varsayılanı 9.000; doluysa kalan 0', () => {
    const b = k.kapasiteHtml(k.kapasiteHesabi(5, 1, null, null), 0);
    expect(b).toContain('günlük sınır ~9.000; bugün kalan bilinmiyor.');
    expect(b).toContain('günde en çok 60 model çağrısı');
    expect(k.kapasiteHesabi(5, 1, DOLU, 60).kalan).toBe(0);
  });
  it('adres sınırı aşımı ve izinsiz öğrenciler yazılır; açık uçlu yoksa 0 Neuron', () => {
    const h = k.kapasiteHesabi(31, 2, { esik: 9000, tahminiNeuron: 0 }, 60);
    expect(h.ipAsar).toBe(true);
    const html = k.kapasiteHtml(h, 3);
    expect(html).toContain('(bu sınav en az 62 çağrı ister)');
    expect(html).toContain('Yapay zekâ izni olmayan 3 öğrenci elle puanlanır, hesaba katılmadı.');
    expect(k.kapasiteHtml(k.kapasiteHesabi(20, 0, null, 60), 0)).toContain('açık uçlu soru yok; yapay zekâ değerlendirmesi gerekmez (0 Neuron)');
  });
  it('yalnız bilgi: 3. adımda gösterilir, yayın düğmesinin koşulu değişmedi', () => {
    const g = tanim('sihirbazAdim3Html');
    expect(g).toContain('kapasiteHtml(kapasiteHesabi(izinli, acik, state.ai.butce, state.ai.gunlukSinir), hedefOgr.length - izinli)');
    expect(g).toContain("'<button class=\"btn btn-primary\" id=\"btnPublishExam\" ' + (canPublishExam() ? \"\" : \"disabled\") + '>Sınavı Yayınla</button>'");
    expect(tanim('kapasiteHtml')).not.toMatch(/disabled|canPublishExam/);
    expect(tanim('probeAiMode')).toContain('state.ai.gunlukSinir = (j.gunlukSinir && Number(j.gunlukSinir.limit)) || null;');
  });
});

describe('§100-3 navigator.storage.persist()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function yukleDepo(): any {
    const info = vi.fn();
    const render = vi.fn();
    const f = new Function('console', 'renderDepoUyarisi',
      sabit('DEPO_KALICI_RET_METNI') + '\n' + tanim('depoKaliciIste') + '\nreturn depoKaliciIste;')({ info }, render);
    return { depoKaliciIste: f, info, render };
  }
  it('destek yoksa null, sessiz', async () => {
    const d = yukleDepo();
    expect(await d.depoKaliciIste(null)).toBeNull();
    expect(await d.depoKaliciIste({})).toBeNull();
    expect(await d.depoKaliciIste({ storage: {} })).toBeNull();
    expect(d.info).not.toHaveBeenCalled();
  });
  it('zaten kalıcıysa yeniden istemez', async () => {
    const d = yukleDepo();
    const persist = vi.fn(async () => true);
    expect(await d.depoKaliciIste({ storage: { persisted: async () => true, persist } })).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
  it('ret → yalnız console.info, arayüzde kutu YOK; kabul → sessiz; hata → null', async () => {
    const d = yukleDepo();
    expect(await d.depoKaliciIste({ storage: { persisted: async () => false, persist: async () => false } })).toBe(false);
    expect(d.info).toHaveBeenCalledTimes(1);
    expect(String(d.info.mock.calls[0][0])).toContain('kalıcı depolama izni vermedi');
    expect(d.render).not.toHaveBeenCalled();
    const d2 = yukleDepo();
    expect(await d2.depoKaliciIste({ storage: { persist: async () => true } })).toBe(true);
    expect(d2.info).not.toHaveBeenCalled();
    const d3 = yukleDepo();
    expect(await d3.depoKaliciIste({ storage: { persist: async () => { throw new Error('x'); } } })).toBeNull();
    expect(d3.render).not.toHaveBeenCalled();
  });
  it("sonuç state'e yazılmaz; açılışta bir kez; renderDepoUyarisi main ile aynı (yalnız gerçek kayıt hatası)", () => {
    const g = tanim('depoKaliciIste');
    expect(g).not.toContain('state.');
    expect(g).not.toContain('renderDepoUyarisi');
    expect(app).toMatch(/\nprobeAiMode\(\);\ndepoKaliciIste\(typeof navigator !== "undefined" \? navigator : null\);/);
    const r = tanim('renderDepoUyarisi');
    expect(r).toContain('if (!depoHatasi) { if (el) el.remove(); return; }');
    expect(r).toContain('el.setAttribute("role", "alert");');
    expect(r).not.toMatch(/depo-bilgi|depoKaliciBilgi|role", "status/);
    expect(app).not.toContain('depoKaliciBilgi');
  });
});

describe('§100-4 /vendor/* immutable önbellek — YAPILMADI (sürüm adlı olmayan yol var)', () => {
  it('vendor altında sürüm adı taşımayan klasör/dosya var → _headers immutable içermez', () => {
    const vendor = path.join(kok, 'public', 'vendor');
    const surumsuz = fs.readdirSync(vendor).filter((ad) => !/-\d+\.\d+\.\d+$/.test(ad));
    // fonts/ (fonts.css + woff2) ve SHA256SUMS sürüm adı taşımıyor: içerik değişirse yol aynı kalır.
    expect(surumsuz.sort()).toEqual(['SHA256SUMS', 'fonts']);
    const basliklar = fs.readFileSync(path.join(kok, 'public', '_headers'), 'utf8');
    expect(basliklar).not.toMatch(/immutable/);
    expect(basliklar).not.toMatch(/^\/vendor\//m);
  });
});
