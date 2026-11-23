#!/usr/bin/env node
/**
 * 兼容入口：等同 accounts add（公众号绑定 / 其它平台登记）
 *
 *   node scripts/login.mjs --platform wechat-mp --name "..." --appid ... --appsecret ...
 *   node scripts/login.mjs --platform zhihu --name "..."
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const accountsScript = join(__dirname, 'accounts.mjs');

const forwarded = ['add', ...process.argv.slice(2)];
const result = spawnSync(process.execPath, [accountsScript, ...forwarded], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
