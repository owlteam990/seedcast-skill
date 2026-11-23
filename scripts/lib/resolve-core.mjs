/**
 * 加载 @seedcast/publish-core（优先 workspace dist，其次 package 名）
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @returns {Promise<typeof import('@seedcast/publish-core')>}
 */
export async function loadPublishCore() {
  const monorepoDist = join(
    __dirname,
    '../../../../code/packages/publish-core/dist/index.js',
  );
  if (existsSync(monorepoDist)) {
    return import(pathToFileURL(monorepoDist).href);
  }
  try {
    return await import('@seedcast/publish-core');
  } catch {
    throw new Error(
      '找不到 @seedcast/publish-core。请在 code/ 下执行: pnpm install && pnpm --filter @seedcast/publish-core build',
    );
  }
}

/**
 * 解析仓库内公众号默认封面
 * @returns {string|null}
 */
export function defaultWechatCover() {
  const p = join(
    __dirname,
    '../../../../code/plugins/wechat-mp/fixtures/cover.png',
  );
  return existsSync(p) ? p : null;
}
