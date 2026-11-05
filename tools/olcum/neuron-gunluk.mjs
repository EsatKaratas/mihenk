#!/usr/bin/env node
// ============================================================================
// Günlük Workers AI Neuron tüketimi — SALT OKUMA (Cloudflare GraphQL analitiği)
// ============================================================================
// W1'in tools/olcum/puanlama-deney.mjs içindeki sorgunun aynısı
// (aiInferenceAdaptiveGroups.sum.totalNeurons), yalnız okuma için ayrı dosya.
// Gün sınırı Cloudflare'in ücretsiz payıyla aynı: 00:00 UTC (03:00 TR).
//
// Kullanım:  MIHENK_CF_HESAP=<hesap-id> node tools/olcum/neuron-gunluk.mjs
// Kimlik: wrangler'ın OAuth belirteci (~/.wrangler/config/default.toml).
// Belirteç ekrana YAZILMAZ ve hiçbir dosyaya kaydedilmez.
// ============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HESAP = process.env.MIHENK_CF_HESAP || '';
if (!HESAP) { console.error('MIHENK_CF_HESAP gerekli (wrangler whoami çıktısındaki hesap kimliği).'); process.exit(1); }

function belirtec() {
  for (const f of [path.join(os.homedir(), '.wrangler/config/default.toml'),
                   path.join(process.env.APPDATA || '', 'xdg.config/.wrangler/config/default.toml')]) {
    if (!fs.existsSync(f)) continue;
    const t = (fs.readFileSync(f, 'utf8').match(/oauth_token = "([^"]+)"/) || [])[1];
    if (t) return t;
  }
  throw new Error('wrangler OAuth belirteci bulunamadı (wrangler login gerekli).');
}

const q = 'query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){aiInferenceAdaptiveGroups(limit:100,filter:{datetime_geq:$s,datetime_leq:$e}){sum{totalNeurons}}}}}';
const simdi = new Date();
const bas = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth(), simdi.getUTCDate()));
const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: { authorization: 'Bearer ' + belirtec(), 'content-type': 'application/json' },
  body: JSON.stringify({ query: q, variables: { a: HESAP, s: bas.toISOString(), e: simdi.toISOString() } }),
});
const j = await r.json();
if (j.errors) { console.error('analitik sorgusu hatası: ' + JSON.stringify(j.errors).slice(0, 300)); process.exit(1); }
const toplam = (j.data.viewer.accounts[0]?.aiInferenceAdaptiveGroups || []).reduce((s, g) => s + (g.sum.totalNeurons || 0), 0);
console.log(JSON.stringify({ gunBasi: bas.toISOString(), simdi: simdi.toISOString(), toplamNeuron: Math.round(toplam), ucretsizPay: 10000, kalan: Math.round(10000 - toplam) }));
