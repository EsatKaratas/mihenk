// `npm run deploy` koruması: ücretli bağlamalı yapılandırmayla yayın durur.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
// @ts-expect-error — düz .mjs, tür bildirimi yok
import { jsoncSoy, ucretliBaglamalar } from '../tools/deploy-guard.mjs';

const kok = path.resolve(__dirname, '..');
const oku = (f: string) => JSON.parse(jsoncSoy(fs.readFileSync(path.join(kok, f), 'utf8')));

describe('deploy koruması (ücretsiz plan)', () => {
  it('wrangler.jsonc: D1, R2 ve Queues ücretli bağlama olarak yakalanır', () => {
    expect(ucretliBaglamalar(oku('wrangler.jsonc'))).toEqual(['d1_databases', 'r2_buckets', 'queues']);
  });

  it('wrangler.demo.jsonc: ücretli bağlama yok (canlı yayının yapılandırması)', () => {
    expect(ucretliBaglamalar(oku('wrangler.demo.jsonc'))).toEqual([]);
  });

  it('boş dizi / boş producers sayılmaz', () => {
    expect(ucretliBaglamalar({ d1_databases: [], queues: { producers: [], consumers: [] } })).toEqual([]);
    expect(ucretliBaglamalar({ r2_buckets: [{ binding: 'X' }] })).toEqual(['r2_buckets']);
  });

  it('JSONC: yorumlar ve sondaki virgül atılır, dize içindeki // ve /* korunur', () => {
    const j = JSON.parse(jsoncSoy('{\n // yorum\n "u": "https://a.b//c", /* blok */ "v": "x/*y*/z",\n "d": [1, 2,],\n}'));
    expect(j).toEqual({ u: 'https://a.b//c', v: 'x/*y*/z', d: [1, 2] });
    expect(JSON.parse(jsoncSoy('{"k": "a\\"//b"}'))).toEqual({ k: 'a"//b' });
  });

  it('package.json: deploy korumadan geçer, deploy:demo değişmedi', () => {
    const s = JSON.parse(fs.readFileSync(path.join(kok, 'package.json'), 'utf8')).scripts;
    expect(s.deploy).toBe('node tools/deploy-guard.mjs wrangler.jsonc');
    expect(s.deploy).not.toMatch(/^wrangler deploy/);
    expect(s['deploy:demo']).toBe('wrangler deploy -c wrangler.demo.jsonc');
  });

  it('CLI: wrangler.jsonc ile çıkış kodu 1, açık hata, wrangler çağrılmaz', () => {
    const r = spawnSync(process.execPath, ['tools/deploy-guard.mjs', 'wrangler.jsonc'], { cwd: kok, encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('YAYIN DURDURULDU');
    expect(r.stderr).toContain('npm run deploy:demo');
    expect(r.stdout).not.toMatch(/wrangler/i);
  });
});
