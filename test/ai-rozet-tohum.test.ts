// ============================================================================
// §90 — Yapay zekâ kaynak rozeti, hata eşlemesi (kota / günlük sınır / geçersiz
// çıktı), toplu çözmenin kota ve günlük sınırda HEMEN durması ve demo tohumu.
// app.js tek dosya ve modül değil: işlevler kaynak metinden çıkarılıp
// new Function ile sınanır (odak-dil-uyari.test.ts deseni).
// ============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'app.js'), 'utf8');

/** Üst düzey `function ad(` tanımının tam metni (bir sonraki üst düzey tanıma kadar). */
function tanim(ad: string): string {
  const bas = app.search(new RegExp('^(async )?function ' + ad + '\\(', 'm'));
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const kalan = app.slice(bas);
  const son = kalan.slice(1).search(/^(async )?function [A-Za-z_$][\w$]*\(|^const |^var |^let |^\/\*/m);
  return son < 0 ? kalan : kalan.slice(0, son + 1);
}

/** Üst düzey `const AD = ...` bildiriminin metni; `bitis` bildirimin son karakterleri. */
function sabit(ad: string, bitis: string): string {
  const bas = app.indexOf('\nconst ' + ad + ' = ');
  expect(bas, ad + ' bulunamadı').toBeGreaterThanOrEqual(0);
  const son = app.indexOf(bitis, bas);
  return app.slice(bas + 1, son + bitis.length);
}

const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

const SABITLER = ['AI_KOTA_METNI', 'AI_GUNLUK_SINIR_METNI', 'AI_BUTCE_METNI', 'AI_GECERSIZ_CIKTI_METNI'].map((a) => sabit(a, ';\n')).join('\n');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// §100: evalFailedActionsHtml artık aiYzsizMod()'a da bakar → state saplaması (varsayılan: mod kapalı).
const k: any = new Function('escapeHtml', 'state',
  SABITLER + '\n' +
  ['modelKisaAd', 'aiKaynak', 'aiKaynakMetinleri', 'aiKaynakRozetiHtml', 'aiHataMetni', 'aiGunlukKapali', 'aiGunlukKapaliMetni', 'aiElleDevam', 'aiButceMetni', 'aiButceKisa', 'aiButceIpucu',
   'topluCozDurdurmaKodu', 'topluCozBeklenirMi', 'topluCozSonucMetni', 'evalFailedActionsHtml', 'demoTohumUyariHtml', 'aiKotaDolu', 'aiYzsizMod']
    .map(tanim).join('\n') +
  '\nreturn { aiKaynak, aiKaynakMetinleri, aiKaynakRozetiHtml, aiHataMetni, aiGunlukKapali, topluCozDurdurmaKodu,' +
  ' topluCozBeklenirMi, topluCozSonucMetni, evalFailedActionsHtml, demoTohumUyariHtml, AI_KOTA_METNI, AI_GUNLUK_SINIR_METNI, AI_BUTCE_METNI, aiButceMetni, aiButceKisa, aiButceIpucu, aiElleDevam };'
)(escapeHtml, { ai: { mode: 'simulation', butce: null } });

describe('§90 kaynak rozeti', () => {
  it('ana model (workers-ai-70b) rozet göstermez', () => {
    const kay = k.aiKaynak({ source: 'workers-ai-70b', yedekModel: false, fellBack: false, model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });
    expect(k.aiKaynakMetinleri(kay)).toEqual([]);
    expect(k.aiKaynakRozetiHtml(kay)).toBe('');
    expect(k.aiKaynakRozetiHtml(null)).toBe('');
    expect(k.aiKaynak(undefined)).toBeNull();
  });

  it('yedek model: "Yedek model (Llama 4 Scout) — kalitesi ölçülmedi", lacivert pill, erişilebilir not', () => {
    const kay = k.aiKaynak({ source: 'workers-ai-scout', yedekModel: true, model: '@cf/meta/llama-4-scout-17b-16e-instruct' });
    expect(k.aiKaynakMetinleri(kay)).toEqual(['Yedek model (Llama 4 Scout) — kalitesi ölçülmedi']);
    const html = k.aiKaynakRozetiHtml(kay);
    expect(html).toContain('role="note"');
    expect(html).toContain('aria-label="Yapay zekâ yanıtının kaynağı"');
    expect(html).toContain('class="pill pill-accent ai-kaynak"');
    expect(html).not.toContain('pill-critical');
  });

  it('eski sunucu: yedekModel yoksa fellBack kullanılır; Scout dışı yedekte model adı yazar', () => {
    expect(k.aiKaynak({ fellBack: true, model: 'gpt-4o-mini' }).yedekModel).toBe(true);
    expect(k.aiKaynakMetinleri(k.aiKaynak({ fellBack: true, model: 'gpt-4o-mini' }))[0])
      .toBe('Yedek model (GPT 4O Mini) — kalitesi ölçülmedi');
    // Açık false, fellBack'i ezer (ÇAPRAZ çözücü: Scout bilerek seçildi, yedek değil).
    expect(k.aiKaynak({ source: 'workers-ai-scout', yedekModel: false, fellBack: false }).yedekModel).toBe(false);
  });

  it('önbellek ve tohum metinleri; önbellekteki yedek yanıt iki rozet taşır', () => {
    expect(k.aiKaynakMetinleri({ source: 'cache' })).toEqual(['Önbellekten (aynı modelin önceki yanıtı)']);
    expect(k.aiKaynakMetinleri({ source: 'seed' })).toEqual(['Önceden hazırlanmış örnek yanıt']);
    expect(k.aiKaynakMetinleri({ source: 'workers-ai-scout', yedekModel: true, onbellek: true })).toEqual([
      'Önbellekten (aynı modelin önceki yanıtı)', 'Yedek model (Llama 4 Scout) — kalitesi ölçülmedi']);
  });

  it('rozet tüm yapay zekâ çıktı yerlerine bağlı', () => {
    expect(app).toContain('kaynak: aiKaynak(j.meta),   // §90');                 // üretilen soru
    expect(app).toContain('const sonuc = { kaynak: aiKaynak(j.meta), aiScore');   // değerlendirme
    expect(app).toContain("aiKaynakRozetiHtml(ev.kaynak) + demoTohumUyariHtml(ev)"); // değerlendirme kartı
    expect(app).toContain('kaynak: aiKaynak(j.meta), at: Date.now() };');          // bağımsız çözüm
    expect(app).toContain('state.rubrics[qid].aiKaynak = aiKaynak(j.meta);');      // rubrik taslağı
    expect(app).toContain('aiKaynakRozetiHtml(rub.aiKaynak)');
    expect(app).toContain('model: (j.meta && j.meta.model) || "", kaynak: aiKaynak(j.meta)'); // kazanım denetimi
    expect(tanim('supheSeridiHtml')).toContain('aiKaynakRozetiHtml(q.kaynak)');    // onay kartı
    expect(tanim('denetimDurumHtml')).toContain('aiKaynakRozetiHtml(c.kaynak)');
    expect(tanim('aiEvaluate')).toContain('hit.kaynak = Object.assign({}, hit.kaynak || {}, { onbellek: true });');
  });
});

describe('§90 hata eşlemesi', () => {
  it('kota (503 ai_kota_bitti), günlük sınır (429 gunluk_sinir), geçersiz çıktı (502)', () => {
    // §93 (W10): elle devam yolu artık uca göre (aiElleDevam); uçsuz çağrıda yol yok.
    expect(k.aiHataMetni(503, { error: 'ai_kota_bitti', message: 'sunucu metni' }))
      .toBe("Bugünkü yapay zekâ kotası doldu; 03:00'te yenilenir.");
    expect(k.aiHataMetni(429, { error: 'gunluk_sinir', message: 'x' })).toBe(k.AI_GUNLUK_SINIR_METNI);
    expect(k.aiHataMetni(429, { error: 'gunluk_sinir' }, '/api/ai/evaluate')).toContain('“Elle Puanla ve Onayla”');
    expect(k.aiHataMetni(502, { error: 'model_output_invalid', message: 'Model beklenen JSON şemasına uymayan…' }))
      .toBe('Model geçerli yanıt üretemedi, tekrar deneyin.');
  });

  it('bilinmeyen kodda sunucunun mesajı, gövde yoksa HTTP kodu (eski davranış)', () => {
    expect(k.aiHataMetni(429, { error: 'rate_limited', message: 'Bir dakika bekleyin.' })).toBe('Bir dakika bekleyin.');
    expect(k.aiHataMetni(500, null)).toBe('HTTP 500');
  });

  it('apiPost eşlemeyi kullanır ve kodu hataya taşır', () => {
    const g = tanim('apiPost');
    expect(g).toContain('new Error(aiHataMetni(r.status, j, url))');
    expect(g).toContain('hata.kod = (j && j.error) || "";');
  });

  it('kota/günlük sınırda değerlendirme kartında İNSAN YOLU birincil düğme', () => {
    const q = { id: 7 }, s = { id: 3 };
    const kota = k.evalFailedActionsHtml(q, s, { failed: true, kod: 'ai_kota_bitti' });
    expect(kota.indexOf('Elle Puanla ve Onayla')).toBeLessThan(kota.indexOf('Yeniden Dene'));
    expect(kota).toMatch(/btn btn-primary revise-approve/);
    expect(kota).toMatch(/btn btn-secondary retry-eval/);
    const ag = k.evalFailedActionsHtml(q, s, { failed: true, kod: '' });
    expect(ag).toMatch(/btn btn-primary retry-eval/);
    expect(ag).toContain('Elle Puanla ve Onayla');           // insan yolu her durumda açık
    expect(tanim('aiEvaluate')).toContain('kod: (e && e.kod) || ""');
  });

  it('canlı modda hata yerel simülasyona SESSİZCE dönmez (Değerlendirme yapılamadı korunur)', () => {
    const g = tanim('aiEvaluate');
    const yakala = g.slice(g.indexOf('} catch (e) {'));
    expect(yakala).not.toContain('simulateAIEvaluation');
    expect(yakala).toContain('return { failed: true');
    expect(tanim('evalFailedCardHtml')).toContain('Değerlendirme yapılamadı');
  });
});

describe('§90 toplu çözme — kota ve günlük sınırda HEMEN durur', () => {
  it('karar işlevleri', () => {
    expect(k.topluCozDurdurmaKodu({ hata: 'x', durumKodu: 503, hataKodu: 'ai_kota_bitti' })).toBe(true);
    expect(k.topluCozDurdurmaKodu({ hata: 'x', durumKodu: 429, hataKodu: 'gunluk_sinir' })).toBe(true);
    expect(k.topluCozBeklenirMi({ hata: 'x', durumKodu: 429, hataKodu: 'gunluk_sinir' })).toBe(false);
    expect(k.topluCozBeklenirMi({ hata: 'x', durumKodu: 503, hataKodu: 'ai_kota_bitti' })).toBe(false);
    expect(k.topluCozBeklenirMi({ hata: 'x', durumKodu: 429, hataKodu: 'rate_limited' })).toBe(true);
    expect(k.topluCozBeklenirMi({ hata: 'x', durumKodu: 429, hataKodu: '' })).toBe(true);
    expect(k.topluCozBeklenirMi({ secilenSik: 'A' })).toBe(false);
  });

  /** bekleyenleriCoz'u sahte bagimsizCoz ve anında setTimeout ile koşturur. */
  async function kosu(hatalar: Array<{ durumKodu: number; hataKodu: string } | null>) {
    const state: any = {
      questions: hatalar.map((_, i) => ({ id: i + 1, status: 'ai_generated', type: 'mc' })),
      topluCoz: null, topluCozSonuc: '',
    };
    let cagri = 0, bekleme = 0;
    const bagimsizCoz = async (q: any) => {
      cagri++;
      const h = hatalar[q.id - 1];
      q.bagimsizCozum = h ? { hata: 'hata', durumKodu: h.durumKodu, hataKodu: h.hataKodu } : { secilenSik: 'A' };
    };
    const duyurular: string[] = [];   // §115 ortak durum bölgesi (sahte)
    const fn = new Function('state', 'bagimsizCoz', 'renderAll', 'setTimeout', 'topluCozDurdurmaKodu', 'topluCozBeklenirMi', 'topluCozSonucMetni', 'durumDuyur',
      tanim('bekleyenleriCoz') + '\nreturn bekleyenleriCoz;')(
      state, bagimsizCoz, () => {}, (r: () => void) => { bekleme++; r(); },
      k.topluCozDurdurmaKodu, k.topluCozBeklenirMi, k.topluCozSonucMetni, (m: string) => duyurular.push(m));
    await fn();
    // §115: başta bir, sonda bir duyuru; sonuncusu ekrandaki sonuç metniyle aynı.
    expect(duyurular.length).toBe(2);
    expect(duyurular[1]).toBe(state.topluCozSonuc);
    return { cagri, bekleme, sonuc: state.topluCozSonuc as string };
  }

  it('503 ai_kota_bitti: tek çağrı, bekleme yok, kalanlar işlenmez, kota mesajı', async () => {
    const r = await kosu([{ durumKodu: 503, hataKodu: 'ai_kota_bitti' }, null, null]);
    expect(r.cagri).toBe(1);
    expect(r.bekleme).toBe(0);
    expect(r.sonuc).toContain(k.AI_KOTA_METNI);
    expect(r.sonuc).toContain('2 soru işlenmedi');
  });

  it('429 gunluk_sinir: tek çağrı, 60 sn bekleme YOK, günlük sınır mesajı', async () => {
    const r = await kosu([null, { durumKodu: 429, hataKodu: 'gunluk_sinir' }, null, null]);
    expect(r.cagri).toBe(2);
    expect(r.bekleme).toBe(0);
    expect(r.sonuc).toContain(k.AI_GUNLUK_SINIR_METNI);
    expect(r.sonuc).toContain('4 sorudan 1 tanesi çözüldü, 2 soru işlenmedi');
  });

  it('dakikalık 429 (başka kod): eski davranış — 2 × 60 sn bekleme, 3 deneme, sıra sürer', async () => {
    const r = await kosu([{ durumKodu: 429, hataKodu: 'rate_limited' }, null]);
    expect(r.cagri).toBe(3 + 1);
    expect(r.bekleme).toBe(120);
    expect(r.sonuc).toBe('2 sorudan 1 tanesi çözüldü, 1 tanesinde hata (kartlarda yazıyor).');
  });
});

describe('§90 demo tohumu', () => {
  const DEMO = [sabit('DEMO_SORULAR', '\n];'), sabit('DEMO_YANIT', '";\n'), sabit('DEMO_TOHUM_DEGERLENDIRME', '\n};')].join('\n');

  /** doldur=false: tohum boşaltılmış gibi sınanır (yer tutucu durumu). */
  function kur(doldur: boolean) {
    const kayit: unknown[] = [];
    const t = new Function('state', 'auditKaydet', 'auditKisalt',
      DEMO + '\n' + (doldur ? '' : 'DEMO_TOHUM_DEGERLENDIRME.dolduruldu = false; DEMO_TOHUM_DEGERLENDIRME.yanit = null;\n') +
      tanim('demoTohumEslesir') + tanim('demoTohumDegerlendirmesi') +
      '\nreturn { demoTohumEslesir, demoTohumDegerlendirmesi, DEMO_SORULAR, DEMO_YANIT, DEMO_TOHUM_DEGERLENDIRME };'
    )({ activeStudentId: 1 }, (_t: string, v: unknown) => kayit.push(v), (s: string) => s);
    return { ...t, kayit };
  }
  const rubrik = () => ({ maxScore: 20, criteria: [
    { label: 'Kavram doğruluğu', weight: 40 }, { label: 'Örnek / uygulama', weight: 30 }, { label: 'Anlatım açıklığı', weight: 30 }] });

  it('depodaki tohum: kayıtlı gerçek canlı yanıt (16/20, 70B), kriter tavanları rubrikle tutarlı', () => {
    const t = kur(true);
    const T = t.DEMO_TOHUM_DEGERLENDIRME;
    expect(T.dolduruldu).toBe(true);
    expect(T.kaynakNotu).toContain('ornek-evaluate-yanit.json');
    expect(T.yanit.aiScore).toBe(16);
    expect(T.yanit.breakdown.map((b: any) => b.points)).toEqual([6, 5, 5]);
    expect(T.yanit.breakdown.map((b: any) => b.max)).toEqual([8, 6, 6]);
    T.yanit.breakdown.forEach((b: any, i: number) => {
      expect(b.label).toBe(T.rubrik.criteria[i][0]);
      expect(b.weight).toBe(T.rubrik.criteria[i][1]);
    });
  });

  it('tohum boşsa (dolduruldu=false) hiçbir şey dönmez', () => {
    const t = kur(false);
    const acik = { id: 9, demo: true, type: 'open', body: t.DEMO_SORULAR[2].body };
    expect(t.demoTohumEslesir(acik, t.DEMO_YANIT, rubrik())).toBe(true);
    expect(t.demoTohumDegerlendirmesi(acik, t.DEMO_YANIT, rubrik(), 'kota')).toBeNull();
  });

  it('YALNIZ birebir demo girdisi eşleşir', () => {
    const t = kur(true);
    const acik = { id: 9, demo: true, type: 'open', body: t.DEMO_SORULAR[2].body };
    expect(t.demoTohumEslesir(acik, t.DEMO_YANIT, rubrik())).toBe(true);
    expect(t.demoTohumEslesir({ ...acik, demo: false }, t.DEMO_YANIT, rubrik())).toBe(false);    // demo dışı soru
    expect(t.demoTohumEslesir({ ...acik, body: acik.body + ' ' }, t.DEMO_YANIT, rubrik())).toBe(true); // yalnız kenar boşluğu
    expect(t.demoTohumEslesir({ ...acik, body: 'Başka soru' }, t.DEMO_YANIT, rubrik())).toBe(false);
    expect(t.demoTohumEslesir(acik, t.DEMO_YANIT + ' Ek cümle.', rubrik())).toBe(false);         // farklı yanıt
    const r2 = rubrik(); r2.criteria[0].weight = 50; r2.criteria[1].weight = 20;
    expect(t.demoTohumEslesir(acik, t.DEMO_YANIT, r2)).toBe(false);                             // değişmiş rubrik
    const r3 = rubrik(); r3.maxScore = 10;
    expect(t.demoTohumEslesir(acik, t.DEMO_YANIT, r3)).toBe(false);
  });

  it('doldurulmuşsa: seed kaynağı, uyarı verisi, denetim izinde "model çağrılmadı"', () => {
    const t = kur(true);
    const acik = { id: 9, demo: true, type: 'open', body: t.DEMO_SORULAR[2].body };
    const s = t.demoTohumDegerlendirmesi(acik, t.DEMO_YANIT, rubrik(), 'Bugünkü yapay zekâ kotası doldu');
    expect(s.kaynak.source).toBe('seed');
    expect(s.demoTohumu).toBe(true);
    expect(s.canliHata).toContain('kotası doldu');
    expect(k.aiKaynakMetinleri(s.kaynak)).toEqual(['Önceden hazırlanmış örnek yanıt']);
    expect(k.demoTohumUyariHtml(s)).toContain('Canlı yapay zekâ çağrısı başarısız oldu.');
    expect(JSON.stringify(t.kayit)).toContain('model çağrılmadı');
    expect(t.demoTohumDegerlendirmesi({ ...acik, demo: false }, t.DEMO_YANIT, rubrik(), 'x')).toBeNull();
  });

  it('tohum yalnız canlı çağrının HATA yolunda, önbelleğe alınmadan kullanılır', () => {
    const g = tanim('aiEvaluate');
    const yakala = g.slice(g.indexOf('} catch (e) {'));
    expect(yakala).toContain('const tohum = demoTohumDegerlendirmesi(q, answerText, rubric, mesaj);');
    expect(tanim('demoTohumDegerlendirmesi')).not.toContain('evalCachePut');
    expect(k.demoTohumUyariHtml({ aiScore: 3 })).toBe('');
  });
});

describe('§90b birim farkı bilgi rozeti (hesapBirimFarki)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const birimFarkiRozetiHtml = new Function(tanim('birimFarkiRozetiHtml') + '\nreturn birimFarkiRozetiHtml;')() as (q: any) => string;

  it('alan true ise lacivert bilgi rozeti; kırmızı değil', () => {
    const h = birimFarkiRozetiHtml({ hesapBirimFarki: true });
    expect(h).toContain('Birim farkı olası (ör. m³ ↔ L) — anahtarı kontrol edin');
    expect(h).toContain('pill-accent');
    expect(h).not.toMatch(/pill-critical|pill-warning/);
  });

  it('alan yoksa ya da true değilse hiçbir şey', () => {
    expect(birimFarkiRozetiHtml({})).toBe('');
    expect(birimFarkiRozetiHtml({ hesapBirimFarki: false })).toBe('');
    expect(birimFarkiRozetiHtml({ hesapBirimFarki: 'true' })).toBe('');
    expect(birimFarkiRozetiHtml(null)).toBe('');
  });

  it('şüphe listesine ve §71 ikinci onaya GİRMEZ; onay kartında gösterilir; üretimde saklanır', () => {
    const turler = app.slice(app.indexOf('const SUPHE_TURLERI = ['), app.indexOf('\n];', app.indexOf('const SUPHE_TURLERI = [')));
    expect(turler).not.toContain('hesapBirimFarki');
    expect(tanim('soruSupheleri')).not.toContain('hesapBirimFarki');
    expect(tanim('supheSeridiHtml')).toContain('birimFarkiRozetiHtml(q)');
    expect(app).toContain('hesapBirimFarki: q.hesapBirimFarki === true ? true : undefined,');
  });
});

describe('§93 bütçe metni ve göstergesi', () => {
  it('gunluk_butce kendi cümlesine çevrilir; uçsuz/diğer uçta yol vaat edilmez', () => {
    expect(k.aiHataMetni(503, { error: 'gunluk_butce', message: 'x' })).toBe(k.AI_BUTCE_METNI);
    expect(k.aiHataMetni(503, { error: 'gunluk_butce' }, '/api/ai/solve')).toBe(k.AI_BUTCE_METNI);
    expect(k.aiHataMetni(503, { error: 'ai_kota_bitti' }, '/api/ai/rubric')).toBe(k.AI_KOTA_METNI);
    expect(k.AI_BUTCE_METNI).toMatch(/03:00'te yenilenir\.$/);
  });
  it('elle devam yolu uca göre ve TEK kaynaktan; üç kod da aynı eşlemeyi kullanır', () => {
    const uret = k.aiElleDevam('/api/ai/generate-questions');
    const puan = k.aiElleDevam('/api/ai/evaluate');
    expect(uret).toContain('havuzdaki onaylı sorularla sınav kurmaya');
    expect(puan).toContain('“Elle Puanla ve Onayla”');
    expect(k.aiElleDevam('/api/ai/solve')).toBe('');
    for (const [kod, taban] of [['ai_kota_bitti', k.AI_KOTA_METNI], ['gunluk_sinir', k.AI_GUNLUK_SINIR_METNI], ['gunluk_butce', k.AI_BUTCE_METNI]]) {
      expect(k.aiHataMetni(503, { error: kod }, '/api/ai/generate-questions')).toBe(taban + uret);
      expect(k.aiHataMetni(503, { error: kod }, '/api/ai/evaluate')).toBe(taban + puan);
    }
  });
  it('vaat edilen düğme adı arayüzde gerçekten var', () => {
    expect(app).toContain('>Elle Puanla ve Onayla</button>');
  });
  it('gunluk_butce gün sonuna kadar kapalıdır: toplu çözme HEMEN durur, beklemez', () => {
    expect(k.aiGunlukKapali('gunluk_butce')).toBe(true);
    const c = { hata: true, hataKodu: 'gunluk_butce', durumKodu: 503 };
    expect(k.topluCozDurdurmaKodu(c)).toBe(true);
    expect(k.topluCozBeklenirMi(c)).toBe(false);
    expect(k.topluCozSonucMetni({ toplam: 5, bitti: 2, hata: 1 }, 'gunluk_butce')).toContain(k.AI_BUTCE_METNI);
  });
  it('gösterge: "Bugün ≈%X (tahmini)", eşikte "doldu"; ipucu kaynağı açıklar', () => {
    const b = { yuzde: 37, doldu: false, havuz: 10000, esik: 9000, tahminiNeuron: 3712 };
    expect(k.aiButceMetni(b)).toBe('Bugün ≈%37 (tahmini)');
    expect(k.aiButceMetni({ ...b, doldu: true })).toBe('Bugünkü bütçe doldu (tahmini)');
    expect(k.aiButceMetni(null)).toBe('');
    // W6 P2-a: çipte kısa biçim; tam biçim ipucunda ve erişilebilir adda kalır.
    expect(k.aiButceKisa(b)).toBe('· ≈%37');
    expect(k.aiButceKisa({ ...b, doldu: true })).toBe('· doldu');
    expect(k.aiButceKisa(null)).toBe('');
    const ip = k.aiButceIpucu(b);
    expect(ip).toContain('token');
    expect(ip).toContain('yalnız bu uygulamanın');
    expect(ip).toContain('10.000');
  });
});
