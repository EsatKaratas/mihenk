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
import aiRoutes from './routes/ai';
import type { AiEnv } from './lib/ai';

type Bindings = AiEnv & {
  ASSETS?: Fetcher;
  APP_NAME?: string;
  APP_ENV?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) =>
  c.json({ ok: true, app: c.env.APP_NAME ?? 'Mihenk — Ölçme ve Değerlendirme Sistemi', env: c.env.APP_ENV ?? 'development' })
);

app.route('/api/ai', aiRoutes);

/* §43 — /api/sync/* KALDIRILDI (4 uç: status, push, pull, reset).
   Sınıf kodu köprüsü söküldü; Worker artık yalnızca /api/health ve /api/ai/*
   sunar. Öğrenci yanıtı sunucuya HİÇ gitmez, D1 bağlaması da gerekmez. */

// agents.md §2: her hata yanıtı tutarlı JSON gövdesi döner.
app.notFound((c) => c.json({ error: 'not_found', message: 'Böyle bir API ucu yok.' }, 404));

app.onError((err, c) => {
  console.error(JSON.stringify({ ev: 'unhandled_error', message: err.message }));
  return c.json({ error: 'internal_error', message: 'Beklenmeyen bir hata oluştu.' }, 500);
});

export default app;
