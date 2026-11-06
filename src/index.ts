// ============================================================================
// T3 Vakfı Creathon — Problem 2
// Cloudflare Worker giriş noktası
//
// wrangler.jsonc -> assets.run_worker_first: ["/api/*", "/internal/*"]
// olduğu için Worker YALNIZCA bu yollarda çalışır; diğer tüm istekler
// public/ altındaki statik dosyalardan (index.html, mimari.html,
// privacy-policy.html, 404.html, robots.txt) doğrudan servis edilir.
// ============================================================================

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import aiRoutes from './routes/ai';
import type { AiEnv } from './lib/ai';
import { kisiselKoruma } from './lib/kisisel'; // §88 KVKK

type Bindings = AiEnv & {
  ASSETS?: Fetcher;
  APP_NAME?: string;
  APP_ENV?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) =>
  c.json({ ok: true, app: c.env.APP_NAME ?? 'Mihenk — Ölçme ve Değerlendirme Sistemi', env: c.env.APP_ENV ?? 'development' })
);

app.use('/api/ai/*', kisiselKoruma); // §88 KVKK: kişisel alan reddi + kendini tanıtma maskesi (src/lib/kisisel.ts)
app.route('/api/ai', aiRoutes);

/* §43 — /api/sync/* KALDIRILDI (4 uç: status, push, pull, reset).
   Sınıf kodu köprüsü söküldü; Worker artık yalnızca /api/health ve /api/ai/*
   sunar. Öğrenci yanıtı sunucuya HİÇ gitmez, D1 bağlaması da gerekmez. */

// agents.md §2: her hata yanıtı tutarlı JSON gövdesi döner.
app.notFound((c) => c.json({ error: 'not_found', message: 'Böyle bir API ucu yok.' }, 404));

app.onError((err, c) => {
  /* §51b — BOZUK/BOŞ JSON GÖVDESİ 500 DÖNÜYORDU.
     Ölçüldü (19 Ekim, yerel): `--data '{bozuk'` ve gövdesiz POST →
     HTTP 500 internal_error, Workers Logs'a "unhandled_error". Kök: zValidator
     ayrıştıramadığı gövde için HTTPException(400) fırlatıyor; burası onu da
     500'e çeviriyordu. İstemci hatası sunucu hatası gibi görünüyor ve hata
     oranını şişiriyordu. HTTPException kendi durum koduyla döner. */
  if (err instanceof HTTPException) {
    const durum = err.status;
    return c.json(
      durum === 400
        ? { error: 'invalid_json', message: 'İstek gövdesi geçerli bir JSON değil.' }
        : { error: 'http_error', message: 'İstek işlenemedi.' },
      durum
    );
  }
  /* §86 KVKK: hata mesajı istek gövdesinden parça taşıyabilir (ör. JSON
     ayrıştırma hataları); kayda yalnız sınıf adı ve uzunluk yazılır. */
  console.error(JSON.stringify({ ev: 'unhandled_error', hataSinifi: err.name, mesajUzunlugu: String(err.message || '').length }));
  return c.json({ error: 'internal_error', message: 'Beklenmeyen bir hata oluştu.' }, 500);
});

export default app;

/* §86 — günlük adres sayacı Durable Object sınıfı. Wrangler sınıfı ana
   modülün dışa aktarımlarında arar; bağlama (GUNLUK_SAYAC) wrangler.demo.jsonc'ta
   henüz YORUM olarak bekliyor — bağlanmadıkça bu dışa aktarım hiçbir şey
   oluşturmaz ve sayaç bellek içi çalışır. */
export { GunlukSayac } from './lib/gunluk-sinir';

/* §93 — hesap düzeyi günlük Neuron bütçesi Durable Object sınıfı
   (bağlama NEURON_BUTCE, migration v2-neuron-butce). */
export { NeuronButce } from './lib/neuron-butce';
