#!/usr/bin/env node
/**
 * 环境检测：Node + publish-core。不依赖 MCP。
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPublishCore } from './lib/resolve-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const checks = [];

function push(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const major = Number(process.versions.node.split('.')[0]);
push('node', major >= 18, `v${process.versions.node}`);

// scripts/ → seedcast-content → skill → repo root → code/...
const dist = join(
  __dirname,
  '../../../code/packages/publish-core/dist/index.js',
);
push(
  'publish-core-dist',
  existsSync(dist),
  existsSync(dist)
    ? '已构建'
    : '未构建：在 code/ 执行 pnpm --filter @seedcast/publish-core build',
);

try {
  const core = await loadPublishCore();
  push('publish-core-load', true, `dataDir=${core.getDefaultDataDir()}`);
  push(
    'platforms',
    true,
    `supported=${core.SUPPORTED_PLATFORMS.join(',')}`,
  );
} catch (e) {
  push('publish-core-load', false, e instanceof Error ? e.message : String(e));
}

const ok = checks.every((c) => c.ok);
console.log(
  JSON.stringify(
    {
      ok,
      message:
        'Skill 发布主路径：scripts/publish.mjs → @seedcast/publish-core → ~/.seedcast（无 MCP）',
      checks,
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
