#!/usr/bin/env node
// ============================================================================
// Ön kayıtlı puanlama deneyi — "points önce" (A, üretimdeki istem) ile
// "reason önce" (B) karşılaştırması. Ön kayıt: docs/olcum/puanlama-deney/ON-KAYIT.md
//
// CANLIYA DOKUNMAZ. Sunucunun KENDİ kodu içe aktarılır (istem, model çağrısı,
// şema); yalnız `env.AI.run` Workers AI REST ucuna bağlanır. Böylece yeniden
// deneme, JSON ayıklama ve şema denetimi üretimdekiyle aynıdır. Yedek model
// tanımlanmaz: her çağrı aynı modelle yapılır (yedeğe düşüş = hata kaydı).
//
// B koşulu: A isteminde YALNIZ çıktı şablonundaki kriter satırının alan sırası
// değişir ("points" ↔ "reason"). Başka hiçbir metin değişmez; değişiklik
// yapılamazsa betik durur.
//
// Kullanım:
//   node tools/olcum/puanlama-deney.mjs --kuru            # model çağırmaz, istem boyu + plan
//   MIHENK_CF_HESAP=<hesap-id> node tools/olcum/puanlama-deney.mjs --kos
//   seçenekler: --tekrar 3 --es-zaman 3 --cikti docs/olcum/puanlama-deney
// Kimlik: wrangler'ın OAuth belirteci (~/.wrangler/config/default.toml) okunur,
// ekrana ve dosyaya YAZILMAZ. Süresi dolmuşsa önce `npx wrangler whoami`.
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { buildEvaluationPrompt } from '../../src/lib/prompts.ts';
import { callModelJson } from '../../src/lib/ai.ts';
import { modelEvaluationSchema } from '../../src/schemas/ai.ts';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (ad, vars) => { const i = process.argv.indexOf(ad); return i > 0 ? process.argv[i + 1] : vars; };
const KURU = process.argv.includes('--kuru');
const KOS = process.argv.includes('--kos');
// §8 değişiklik (koşumdan önce): tekrar 3 → 1, Neuron bütçesi (~9k/gün).
const TEKRAR = Number(arg('--tekrar', 1));
/* Gün bölmesi: yanıtlar tohumlu karıştırılır; ilk PARCA1_YANIT yanıt 1. gün,
   kalanı 2. gün. Bir yanıtın A ve B'si HEP aynı parçadadır (eşleştirme
   bozulmaz). --parca verilmezse tüm plan. */
const PARCA = arg('--parca', null);
const PARCA1_YANIT = 14;   // 14 yanıt × 2 = 28 çağrı (24 Ekim); kalan 34 × 2 = 68 (25 Ekim)
const ES_ZAMAN = Number(arg('--es-zaman', 3));
const CIKTI = path.resolve(KOK, arg('--cikti', 'docs/olcum/puanlama-deney'));
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';   // wrangler.demo.jsonc AI_MODEL ile aynı
const SICAKLIK = 0.2;          // src/routes/ai.ts /evaluate ile aynı
const MAX_TOKENS = 820;        // src/routes/ai.ts /evaluate ile aynı
const TOHUM = 20261023;

const SET = JSON.parse(fs.readFileSync(path.join(KOK, 'tools/olcum/puanlama-set-v1.json'), 'utf8'));

const A_SATIR = '{"label": "kriter adı (yukarıdakiyle birebir aynı)", "points": 6, "reason": "somut gerekçe"}';
const B_SATIR = '{"label": "kriter adı (yukarıdakiyle birebir aynı)", "reason": "somut gerekçe", "points": 6}';

function istem(kosul, q, y) {
  const a = buildEvaluationPrompt({
    questionBody: q.questionBody, outcomeLabel: q.outcomeLabel, maxScore: q.maxScore,
    criteria: q.criteria.map((c) => ({ label: c.label, weight: c.weight })), studentAnswer: y.metin,
  });
  if (kosul === 'A') return a;
  if (a.split(A_SATIR).length !== 2) throw new Error('A şablon satırı istemde tam bir kez bulunamadı — src/lib/prompts.ts değişmiş; DUR.');
  return a.replace(A_SATIR, B_SATIR);
}

// Tohumlu karıştırma (mulberry32) — çağrı sırası iki koşulu zamana yayar.
function rastgele(t) { return function () { t |= 0; t = (t + 0x6D2B79F5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

const karistir = (dizi, r) => { for (let i = dizi.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [dizi[i], dizi[j]] = [dizi[j], dizi[i]]; } return dizi; };
const rnd = rastgele(TOHUM);
const tumYanitlar = karistir(SET.sorular.flatMap((q) => q.yanitlar.map((y) => ({ q, y }))), rnd);
const parcaYanit = PARCA === '1' ? tumYanitlar.slice(0, PARCA1_YANIT)
  : PARCA === '2' ? tumYanitlar.slice(PARCA1_YANIT) : tumYanitlar;
if (PARCA && !['1', '2'].includes(PARCA)) { console.error('--parca 1 ya da 2'); process.exit(1); }
const denemeler = [];
for (const { q, y } of parcaYanit) for (const k of ['A', 'B']) for (let t = 1; t <= TEKRAR; t++) denemeler.push({ q, y, k, t });
karistir(denemeler, rnd);   // parça içinde A/B sırası da karışık

if (KURU || !KOS) {
  const boy = { A: [], B: [] };
  for (const q of SET.sorular) for (const y of q.yanitlar) for (const k of ['A', 'B']) boy[k].push(istem(k, q, y).length);
  const ort = (v) => Math.round(v.reduce((s, x) => s + x, 0) / v.length);
  console.log(JSON.stringify({ parca: PARCA || 'tümü', parcaYanit: parcaYanit.length, parcaYanitlari: parcaYanit.map((x) => x.y.id).join(','), yanit: SET.sorular.reduce((s, q) => s + q.yanitlar.length, 0), tekrar: TEKRAR,
    cagri: denemeler.length, istemKarakterOrt: { A: ort(boy.A), B: ort(boy.B) }, model: MODEL, sicaklik: SICAKLIK, maxTokens: MAX_TOKENS }, null, 1));
  console.log('Kuru koşum: model çağrılmadı. Koşmak için --kos ve MIHENK_CF_HESAP.');
  process.exit(0);
}

// ---------------------------------------------------------------- kimlik
const HESAP = process.env.MIHENK_CF_HESAP || '';
if (!/^[a-f0-9]{32}$/.test(HESAP)) { console.error('MIHENK_CF_HESAP (32 haneli hesap kimliği) gerekli.'); process.exit(1); }
function belirtecOku() {
  let enGec = null;
  for (const f of [path.join(os.homedir(), '.wrangler/config/default.toml'),
                   path.join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml')]) {
    if (!fs.existsSync(f)) continue;
    const s = fs.readFileSync(f, 'utf8');
    const t = (s.match(/oauth_token = "([^"]+)"/) || [])[1];
    const son = Date.parse((s.match(/expiration_time = "([^"]+)"/) || [])[1] || '');
    if (t && son && (!enGec || son > enGec.son)) enGec = { t, son };
  }
  return enGec;
}
/* Belirteç koşum sırasında dolabilir (1 sa ömürlü). Bitimine 2 dk'dan az
   kaldıysa süresinin dolması beklenir ve `wrangler whoami` ile yenilenir
   (wrangler süresi DOLMUŞ belirteci yeniler). Yenileme tek seferde yapılır. */
let yenileme = null;
async function belirtec() {
  const b = belirtecOku();
  if (b && b.son > Date.now() + 2 * 60 * 1000) return b.t;
  if (!yenileme) {
    yenileme = (async () => {
      const bekle = b ? Math.max(0, b.son - Date.now() + 5000) : 0;
      console.log(`belirteç yenileniyor (${Math.round(bekle / 1000)} sn bekleme)`);
      await new Promise((s) => setTimeout(s, bekle));
      execSync('npx wrangler whoami', { cwd: KOK, stdio: 'ignore', timeout: 120000 });
    })().finally(() => { yenileme = null; });
  }
  await yenileme;
  const y = belirtecOku();
  if (!y || y.son <= Date.now() + 60 * 1000) throw new Error('wrangler belirteci yenilenemedi — `npx wrangler login` gerekli.');
  return y.t;
}

/* Her çağrı kendi kullanım dizisini taşır (eşzamanlı işçiler karışmaz;
   callModelJson'un yeniden denemesi de ayrı kayıt olarak sayılır). */
let sahteSayac = 0;   // MIHENK_SAHTE_KOTA sınaması
function sahteEnv(kullanimlar) {
  return {
    AI_PROVIDER: 'workers-ai', AI_MODEL: MODEL,
    AI: {
      async run(model, girdi) {
        /* YALNIZ SINAMA: MIHENK_SAHTE_KOTA=N → model ÇAĞRILMAZ; ilk N çağrıya
           sahte geçerli yanıt, sonrakilere 429/3036 döner (kota durdurmasını
           ücretsiz sınamak için). Gerçek koşumda tanımlı olmamalı. */
        if (process.env.MIHENK_SAHTE_KOTA != null) {
          sahteSayac++;
          if (sahteSayac > Number(process.env.MIHENK_SAHTE_KOTA)) throw new Error('REST 429: [{"code":3036,"message":"daily free allocation exceeded"}]');
          kullanimlar.push({ prompt_tokens: 1, completion_tokens: 1 });
          return { response: { breakdown: [{ label: 'x', points: 0, reason: 'sahte' }], justification: 'sahte', studentFeedback: 'sahte', confidence: 0.5, injectionAttempt: false } };
        }
        const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${HESAP}/ai/run/${model}`, {
          method: 'POST', headers: { authorization: 'Bearer ' + (await belirtec()), 'content-type': 'application/json' },
          body: JSON.stringify(girdi),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.success) throw new Error(`REST ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 200)}`);
        kullanimlar.push(j.result?.usage || null);
        return j.result;
      },
    },
  };
}

// ---------------------------------------------------------------- ölçüm
const norm = (s) => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
const round05 = (x) => Math.round(x * 2) / 2;
function cozumle(q, y, data) {
  const maxlar = q.criteria.map((c) => Math.round(q.maxScore * (c.weight / 100) * 10) / 10);
  const sema = modelEvaluationSchema.safeParse(data);
  const ham = Array.isArray(data?.breakdown) ? data.breakdown : [];
  // Ham anahtar sırası (JSON.parse metindeki sırayı korur): manipülasyon denetimi
  const sira = ham.map((o) => { const ks = Object.keys(o || {}); return ks.indexOf('reason') >= 0 && ks.indexOf('points') >= 0 ? (ks.indexOf('reason') < ks.indexOf('points') ? 'reason-once' : 'points-once') : 'eksik'; });
  const kr = q.criteria.map((c, i) => {
    const bulunan = ham.find((r) => norm(r?.label) === norm(c.label)) ?? ham[i] ?? null;
    const hamPuan = bulunan ? Number(bulunan.points) : null;
    const gecerliSayi = hamPuan != null && Number.isFinite(hamPuan);
    const aralikDisi = !gecerliSayi || hamPuan < 0 || hamPuan > maxlar[i];
    const yarimDisi = gecerliSayi && Math.round(hamPuan * 2) !== hamPuan * 2;
    // Sunucunun işlediği puan (src/routes/ai.ts ile aynı: kırp + 0,5'e yuvarla)
    const islenen = gecerliSayi ? round05(Math.min(maxlar[i], Math.max(0, hamPuan))) : 0;
    return { etiketEslesti: !!ham.find((r) => norm(r?.label) === norm(c.label)), hamPuan, aralikDisi, yarimDisi, islenen, altin: y.altin[i], max: maxlar[i] };
  });
  const toplam = round05(kr.reduce((s, x) => s + x.islenen, 0));
  const altinToplam = y.altin.reduce((s, x) => s + x, 0);
  return { semaGecerli: sema.success, sira, kr, toplam, altinToplam, normHata: Math.abs(toplam - altinToplam) / q.maxScore };
}

fs.mkdirSync(CIKTI, { recursive: true });
const HAM = path.join(CIKTI, 'ham.jsonl');
/* Çift koşum kilidi (müdür, 24 Ekim): zamanlayıcı ve elle tetikleme aynı anda
   çalışırsa ikisi de aynı "yapılmamış" listesini okuyup aynı yanıtı iki kez
   koşardı. Kilit dosyası ÖZEL oluşturulur ('wx'); varsa ve 3 saatten yeniyse
   ikinci koşum çağrı yapmadan çıkar (çıkış 5). Kilit çıkışta silinir; depoya
   girmez. Ham dosyada zaten bulunan yanıt|koşul|tekrar anahtarları ayrıca atlanır. */
const KILIT = path.join(CIKTI, '.kosum.kilit');
if (KOS) {
  try {
    fs.writeFileSync(KILIT, JSON.stringify({ pid: process.pid, bas: new Date().toISOString(), parca: PARCA }), { flag: 'wx' });
  } catch {
    let eski = null;
    try { eski = JSON.parse(fs.readFileSync(KILIT, 'utf8')); } catch { /* bozuk kilit */ }
    if (eski && Date.now() - Date.parse(eski.bas) < 3 * 3600 * 1000) {
      console.log(`BAŞKA KOŞUM SÜRÜYOR (pid ${eski.pid}, ${eski.bas}) — çağrı yapılmadı.`);
      process.exit(5);
    }
    fs.writeFileSync(KILIT, JSON.stringify({ pid: process.pid, bas: new Date().toISOString(), parca: PARCA, eskiKilit: eski }));
  }
  const birak = () => { try { const k = JSON.parse(fs.readFileSync(KILIT, 'utf8')); if (k.pid === process.pid) fs.unlinkSync(KILIT); } catch { /* yok */ } };
  process.on('exit', birak);
  process.on('SIGINT', () => { birak(); process.exit(130); });
}
const hamSatirlar = fs.existsSync(HAM) ? fs.readFileSync(HAM, 'utf8').trim().split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
const yapilmis = new Set(hamSatirlar.map((s) => s.anahtar));

/* ---------------------------------------------------------------- bütçe
   Neuron = girdi token × 26.668/1e6 + çıktı token × 204.805/1e6
   (llama-3.3-70b-fp8-fast, Workers AI fiyat tablosu). Günlük sayaç 00:00 UTC
   (03:00 TR) sıfırlanır; günün tüketimi GraphQL analitiğinden okunur. */
const SINIR = Number(arg('--sinir', 9000));
/* Bu çalıştırmanın KENDİ tüketim tavanı (müdür: 24 Ekim'de W5 de ~4,5k kullanıyor). */
const KENDI_SINIR = Number(arg('--kendi-sinir', Infinity));
const CIFT_UST = 2 * Math.round((2000 * 26668 + 820 * 204805) / 1e6 * 1.1);   // çift başına üst sınır ≈ 486
const neuron = (u) => (u ? (u.prompt_tokens || 0) * 26668 / 1e6 + (u.completion_tokens || 0) * 204805 / 1e6 : 0);
function toplaKullanim(dizi) {
  const v = dizi.filter(Boolean);
  if (!v.length) return null;
  const t = { prompt_tokens: 0, completion_tokens: 0, cagri: dizi.length };
  v.forEach((u) => { t.prompt_tokens += u.prompt_tokens || 0; t.completion_tokens += u.completion_tokens || 0; });
  t.neuron = Math.round(neuron(t) * 10) / 10;
  return t;
}
async function gunlukTuketim() {
  const q = 'query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){aiInferenceAdaptiveGroups(limit:100,filter:{datetime_geq:$s,datetime_leq:$e}){sum{totalNeurons}}}}}';
  const simdi = new Date();
  const bas = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate()));
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST',
    headers: { authorization: 'Bearer ' + (await belirtec()), 'content-type': 'application/json' },
    body: JSON.stringify({ query: q, variables: { a: HESAP, s: bas.toISOString(), e: simdi.toISOString() } }) });
  const j = await r.json();
  if (j.errors) throw new Error('analitik sorgusu: ' + JSON.stringify(j.errors).slice(0, 200));
  return (j.data.viewer.accounts[0]?.aiInferenceAdaptiveGroups || []).reduce((s, g) => s + (g.sum.totalNeurons || 0), 0);
}

// Çift birimi: bir yanıtın A ve B'si birlikte koşulur (aynı gün, ardışık).
const ciftler = [];
for (const { q, y } of parcaYanit) {
  for (let t = 1; t <= TEKRAR; t++) {
    const eksik = ['A', 'B'].filter((k) => !yapilmis.has(`${y.id}|${k}|${t}`));
    if (eksik.length) ciftler.push({ q, y, t, kosullar: rnd() < 0.5 ? eksik : eksik.slice().reverse() });
  }
}
/* GraphQL analitiği birkaç dakika gecikmeli (24 Ekim'de ölçüldü: koşumdan hemen
   sonra 105 gösterdi, token sayımı 3.097). Başlangıç tüketimi = max(GraphQL,
   bugün (UTC) ham dosyaya yazılmış kendi token sayımı). */
const bugunUtc = new Date().toISOString().slice(0, 10);
const kendiBugun = hamSatirlar.filter((s) => String(s.zaman || '').slice(0, 10) === bugunUtc)
  .reduce((t, s) => t + ((s.kullanim && s.kullanim.neuron) || 0), 0);
const grafik = await gunlukTuketim();
const baslangic = Math.max(grafik, kendiBugun);
console.log(`günün tüketimi: GraphQL ${Math.round(grafik)} · kendi (ham, bugün) ${Math.round(kendiBugun)} → ${Math.round(baslangic)}`);
const parcaUst = ciftler.length * CIFT_UST;
console.log(`parça ${PARCA || 'tümü'} · bekleyen çift ${ciftler.length} · bugünkü tüketim ${Math.round(baslangic)} Neuron · parça üst sınırı ${parcaUst} · günlük sınır ${SINIR} · kendi tavan ${KENDI_SINIR}`);
/* Müdür kuralı (1. parça): kalan bütçe ≥ parça üst sınırı + 1000 değilse başlama. */
if (PARCA === '1' && SINIR - baslangic < parcaUst + 1000 && !process.argv.includes('--zorla')) {
  console.log(`BAŞLANMADI: kalan ${Math.round(SINIR - baslangic)} < ${parcaUst + 1000}. W5'in işi bitince yeniden deneyin.`);
  process.exit(3);
}

let kendi = 0, i = 0, biten = 0, durdu = false, acik = 0, kotaBitti = false, atilanYarim = 0, kotaMesaji = '';
async function tek(q, y, k, t) {
  const anahtar = `${y.id}|${k}|${t}`;
  const prompt = istem(k, q, y);
  for (let h = 1; h <= 3; h++) {
    const bas = Date.now();
    const kullanimlar = [];
    try {
      const r = await callModelJson(sahteEnv(kullanimlar), prompt, { maxTokens: MAX_TOKENS, temperature: SICAKLIK });
      const c = cozumle(q, y, r.data);
      const ku = toplaKullanim(kullanimlar);
      kendi += ku ? ku.neuron : 0;
      return { anahtar, yanit: y.id, soru: q.id, profil: y.profil, kosul: k, tekrar: t, parca: PARCA, zaman: new Date().toISOString(), durum: 'ok', sistemHatasi: h - 1,
        denemeSayisi: r.attempts, ilkDenemedeGecerli: r.attempts === 1 && c.semaGecerli, model: r.usedModel, yedek: r.fellBack,
        kullanim: ku, sureMs: Date.now() - bas, ...c, ham: r.data };
    } catch (e) {
      const ku = toplaKullanim(kullanimlar);
      kendi += ku ? ku.neuron : 0;
      const m = String(e && e.message || e);
      /* Ücretsiz plan (müdür, 5 Kasım): 429 + kod 3036 = günlük Neuron kotası
         bitti. Yeniden denemek kotayı açmaz; deneme kaydedilmeden koşum durur. */
      if (/REST 429/.test(m) && /3036/.test(m)) { kotaBitti = true; return { kotaBitti: true, hata: m.slice(0, 300) }; }
      if (h < 3 && /REST (429|5\d\d)|fetch failed/.test(m)) { await new Promise((s) => setTimeout(s, 20000 * h)); continue; }
      return { anahtar, yanit: y.id, soru: q.id, profil: y.profil, kosul: k, tekrar: t, parca: PARCA, zaman: new Date().toISOString(), durum: 'hata', sistemHatasi: h, kullanim: ku, hata: m.slice(0, 300) };
    }
  }
}
async function isci() {
  while (i < ciftler.length) {
    /* Gün sınırı yalnız ÇİFT ARALARINDA denetlenir: yarım çift kalmaz.
       Açık çiftlerin üst sınırı da hesaba katılır. */
    /* Çift tahmini: ilk çiftlerde üst sınır (486); 3 çift bittikten sonra
       ölçülen ortalama × 1,25 (tavanın çok altında durmamak için). */
    const ciftTahmin = biten >= 3 ? Math.min(CIFT_UST, (kendi / biten) * 1.25) : CIFT_UST;
    const yeniAcik = (acik + 1) * ciftTahmin;
    if (kotaBitti || baslangic + kendi + yeniAcik > SINIR || kendi + yeniAcik > KENDI_SINIR) { durdu = true; return; }
    const c = ciftler[i++];
    acik++;
    /* Çiftin iki denemesi birlikte yazılır: kota çiftin ortasında biterse
       (429/3036) yarım çift ham dosyaya GİRMEZ; çift bir sonraki gün baştan
       koşulur (eşleştirme aynı gün kalır, ON-KAYIT §8.1). */
    const sonuclar = [];
    for (const k of c.kosullar) {
      const sonuc = await tek(c.q, c.y, k, c.t);
      if (sonuc.kotaBitti) break;
      sonuclar.push(sonuc);
    }
    acik--;
    if (kotaBitti) {
      atilanYarim += sonuclar.length ? 1 : 0;
      kotaMesaji = kotaMesaji || ('kota bitti (429/3036) — ' + c.y.id + ' çifti yazılmadı');
      durdu = true;
      return;
    }
    sonuclar.forEach((s) => fs.appendFileSync(HAM, JSON.stringify(s) + '\n'));
    biten++;
    if (biten % 5 === 0 || biten === ciftler.length) console.log(`${biten}/${ciftler.length} çift · bu koşumun tüketimi ≈ ${Math.round(kendi)} Neuron`);
  }
}
await Promise.all(Array.from({ length: ES_ZAMAN }, isci));
if (kotaBitti) console.log(`KOTA BİTTİ (429/3036): ${kotaMesaji} · yarım kalıp atılan çift ${atilanYarim} (token'ları harcandı, verisi yazılmadı)`);
console.log(`${kotaBitti ? 'KOTADA DURDU' : durdu ? 'GÜN SINIRINDA DURDU' : 'bitti'} · tamamlanan çift ${biten}/${ciftler.length} · bu koşumun tüketimi ≈ ${Math.round(kendi)} Neuron (token'lardan) · ham → ${path.relative(KOK, HAM)}`);
if (kotaBitti) process.exit(6);
if (durdu) process.exit(4);
