// ============================================================================
// §42 — HIZ SAYACI BUDAMA + YEDEK SAĞLAYICI YAPILANDIRMA TEŞHİSİ
//
// Bu turda eklenen üç saf yardımcıyı dondurur:
//   · budaHizSayaci()   — bellek içi sayaç haritasının sınırsız büyümesi
//   · saglayiciHazirMi() — BOM'lu/boşluklu anahtarın "hazır" görünmesi
//   · fallbackSorunu()   — TANIMLI ama ANAHTARSIZ yedeğin sessiz kalması
//
// Üçü de `agents.md` §6 gereği test edilir; üçü de gerçek, ölçülmüş birer
// soruna karşılık gelir (gerekçeler ilgili fonksiyonların başında yazılı).
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  budaHizSayaci,
  HIZ_SAYACI_TAVANI,
  rateLimited,
  RATE_LIMIT_PER_MIN,
} from '../src/lib/guards';
import { saglayiciHazirMi, fallbackSorunu, temizAnahtar, type AiEnv } from '../src/lib/ai';

describe('budaHizSayaci — sayaç haritası sınırsız büyümez', () => {
  it('penceresi kapanmış anahtarları siler, canlıları korur', () => {
    const t0 = 1_000_000;
    const hits = new Map<string, number[]>([
      ['eski1', [t0 - 120_000]],
      ['eski2', [t0 - 90_000, t0 - 61_000]],
      ['canli', [t0 - 10_000]],
    ]);
    const atilan = budaHizSayaci(hits, t0);
    expect(atilan).toBe(2);
    expect(hits.has('canli')).toBe(true);
    expect(hits.has('eski1')).toBe(false);
    expect(hits.has('eski2')).toBe(false);
  });

  it('bir anahtarın TEK canlı damgası varsa silinmez', () => {
    const t0 = 1_000_000;
    const hits = new Map<string, number[]>([['k', [t0 - 300_000, t0 - 5_000]]]);
    expect(budaHizSayaci(hits, t0)).toBe(0);
    expect(hits.has('k')).toBe(true);
  });

  it('boş haritada güvenle çalışır', () => {
    const hits = new Map<string, number[]>();
    expect(budaHizSayaci(hits, Date.now())).toBe(0);
    expect(hits.size).toBe(0);
  });

  it('rateLimited tavanı aşınca ölü anahtarları otomatik süpürür', () => {
    const t0 = 1_000_000;
    const hits = new Map<string, number[]>();
    // Tavanı aşacak kadar ÖLÜ anahtar (hepsi 60 sn'den eski).
    for (let i = 0; i <= HIZ_SAYACI_TAVANI; i++) hits.set('olu' + i, [t0 - 120_000]);
    expect(hits.size).toBeGreaterThan(HIZ_SAYACI_TAVANI);
    rateLimited(hits, 'yeni', RATE_LIMIT_PER_MIN, t0);
    // Süpürme sonrası yalnızca yeni anahtar kalmalı.
    expect(hits.size).toBe(1);
    expect(hits.has('yeni')).toBe(true);
  });

  it('budama SINIR DAVRANIŞINI değiştirmez — sayım aynen sürer', () => {
    const t0 = 1_000_000;
    const hits = new Map<string, number[]>();
    for (let i = 0; i <= HIZ_SAYACI_TAVANI; i++) hits.set('olu' + i, [t0 - 120_000]);
    for (let i = 0; i < RATE_LIMIT_PER_MIN; i++) {
      expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, t0)).toBe(false);
    }
    expect(rateLimited(hits, 'k', RATE_LIMIT_PER_MIN, t0)).toBe(true);
  });
});

describe('saglayiciHazirMi — BOM/boşluk anahtar "hazır" sayılmaz', () => {
  it('workers-ai için AI binding şarttır', () => {
    expect(saglayiciHazirMi({} as AiEnv)).toBe(false);
    expect(saglayiciHazirMi({ AI: {} as any })).toBe(true);
  });

  it('harici sağlayıcıda gerçek anahtar gerekir', () => {
    expect(saglayiciHazirMi({ AI_PROVIDER: 'openai', AI_API_KEY: 'sk-gercek' })).toBe(true);
    expect(saglayiciHazirMi({ AI_PROVIDER: 'openai' })).toBe(false);
  });

  it('🔴 yalnızca BOM içeren anahtar hazır SAYILMAZ (eski hata)', () => {
    // Eski `/status` `!!c.env.AI_API_KEY` diyordu: aşağıdaki değer truthy
    // olduğu için rozet YEŞİL yanıyor, ama callModel() aynı anahtarı
    // temizleyip boş bulunca hata fırlatıyordu.
    const bomlu = '﻿   ';
    expect(!!bomlu).toBe(true);              // eski ölçüt "hazır" derdi
    expect(temizAnahtar(bomlu)).toBe('');    // gerçek durum: anahtar yok
    expect(saglayiciHazirMi({ AI_PROVIDER: 'openai', AI_API_KEY: bomlu })).toBe(false);
  });

  it('sıfır genişlikli karakter ve boşluklar temizlenir', () => {
    expect(saglayiciHazirMi({ AI_PROVIDER: 'openai', AI_API_KEY: '​‌ ' })).toBe(false);
    expect(saglayiciHazirMi({ AI_PROVIDER: 'openai', AI_API_KEY: '  sk-x  ' })).toBe(true);
  });
});

describe('fallbackSorunu — tanımlı ama çalışmayan yedek sessiz kalmaz', () => {
  it('yedek hiç tanımlanmamışsa sorun bildirmez (bilinçli tercih)', () => {
    expect(fallbackSorunu({})).toBeNull();
    expect(fallbackSorunu({ AI_PROVIDER: 'workers-ai', AI: {} as any })).toBeNull();
  });

  it('yedek tanımlı VE anahtarı varsa sorun bildirmez', () => {
    expect(fallbackSorunu({
      AI_FALLBACK_PROVIDER: 'openai',
      AI_FALLBACK_MODEL: 'gpt-5.6-luna',
      AI_FALLBACK_API_KEY: 'sk-gercek',
    })).toBeNull();
  });

  it('🔴 yedek TANIMLI ama anahtarsızsa açık bir uyarı döner (canlıdaki durum)', () => {
    // 5 Eylül ölçümü: wrangler.demo.jsonc AI_FALLBACK_PROVIDER="openai"
    // tanımlıyor, canlı /api/ai/status ise "fallback": null dönüyordu.
    const m = fallbackSorunu({
      AI_FALLBACK_PROVIDER: 'openai',
      AI_FALLBACK_MODEL: 'gpt-5.6-luna',
    });
    expect(m).toBeTruthy();
    expect(m).toContain('AI_FALLBACK_API_KEY');
    expect(m).toContain('wrangler secret put');
  });

  it('BOM\'lu yedek anahtar da "yok" sayılır', () => {
    const m = fallbackSorunu({ AI_FALLBACK_PROVIDER: 'openai', AI_FALLBACK_API_KEY: '﻿ ' });
    expect(m).toBeTruthy();
  });

  it('workers-ai yedeği binding yoksa uyarır', () => {
    const m = fallbackSorunu({ AI_FALLBACK_PROVIDER: 'workers-ai' });
    expect(m).toBeTruthy();
    expect(m).toContain('AI binding');
  });

  /* §43 — CANLIDAKİ YAPILANDIRMANIN KENDİSİ. wrangler.demo.jsonc yedeği
     workers-ai + llama-4-scout olarak tanımlar ve AI binding bağlıdır; yani
     secret OLMADAN yedek gerçekten çalışır durumdadır. Bu test o kararı
     kilitler: biri yedeği tekrar harici bir sağlayıcıya çevirir ve anahtarı
     koymayı unutursa, /api/ai/status yeniden kırmızı uyarı basacaktır. */
  it('🟢 workers-ai yedeği binding VARKEN sorun bildirmez (canlıdaki yapılandırma)', () => {
    const env: AiEnv = {
      AI: {} as AiEnv['AI'],
      AI_PROVIDER: 'workers-ai',
      AI_MODEL: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      AI_FALLBACK_PROVIDER: 'workers-ai',
      AI_FALLBACK_MODEL: '@cf/meta/llama-4-scout-17b-16e-instruct',
    };
    expect(fallbackSorunu(env)).toBeNull();
    expect(saglayiciHazirMi(env)).toBe(true);
  });
});
