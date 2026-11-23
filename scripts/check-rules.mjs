#!/usr/bin/env node
/**
 * 硬规则检查：对照 rules/platforms.json + 实战沉淀的 learned pattern
 * 用法:
 *   node scripts/check-rules.mjs --platform xiaohongshu --variant imageText \
 *     --title "标题" --body-file ./draft.md --images 1
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLearnedRulePatterns,
  recallPlatformRules,
} from './lib/memory-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(__dirname, '..', 'rules', 'platforms.json');

function parseArgs(argv) {
  const out = { images: 0 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--platform') {
      out.platform = next;
      i += 1;
    } else if (a === '--variant') {
      out.variant = next;
      i += 1;
    } else if (a === '--title') {
      out.title = next;
      i += 1;
    } else if (a === '--body-file') {
      out.bodyFile = next;
      i += 1;
    } else if (a === '--body') {
      out.body = next;
      i += 1;
    } else if (a === '--images') {
      out.images = Number(next) || 0;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

function charLen(s) {
  return Array.from(s ?? '').length;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.platform) {
    console.log(
      `Usage: node scripts/check-rules.mjs --platform <id> [--variant <v>] --title "..." (--body-file f | --body "...") [--images N]`,
    );
    process.exit(args.help ? 0 : 2);
  }

  const rules = JSON.parse(readFileSync(rulesPath, 'utf8'));
  const platform = rules.platforms[args.platform];
  if (!platform) {
    printReport({
      ok: false,
      errors: [`未知平台: ${args.platform}`],
      warns: [],
      meta: { platform: args.platform },
    });
    process.exit(1);
  }

  const variantKeys = Object.keys(platform.variants || {});
  const variantId = args.variant || variantKeys[0];
  const variant = platform.variants?.[variantId];
  if (!variant) {
    printReport({
      ok: false,
      errors: [`未知 variant: ${variantId}；可选: ${variantKeys.join(', ')}`],
      warns: [],
      meta: { platform: args.platform, variant: variantId },
    });
    process.exit(1);
  }

  const title = args.title ?? '';
  let body = args.body ?? '';
  if (args.bodyFile) {
    body = readFileSync(args.bodyFile, 'utf8');
  }

  // X：标题+正文合并计字
  let checkTitle = title;
  let checkBody = body;
  let combinedLen = null;
  if (args.platform === 'x' && variantId === 'post') {
    const combined = [title, body].filter((s) => String(s || '').trim()).join('\n');
    checkTitle = '';
    checkBody = combined;
    combinedLen = charLen(combined);
  }

  const errors = [];
  const warns = [];
  const titleLen = charLen(title);
  const bodyLen = charLen(body);
  const effectiveBodyLen =
    combinedLen !== null ? combinedLen : charLen(checkBody);

  if (
    !title &&
    (variant.titleMaxChars === undefined || variant.titleMaxChars > 0)
  ) {
    if (variant.titleMaxChars !== 0 && args.platform !== 'x') {
      errors.push('标题为空');
    }
  }
  if (
    typeof variant.titleMaxChars === 'number' &&
    variant.titleMaxChars > 0 &&
    titleLen > variant.titleMaxChars
  ) {
    errors.push(`标题 ${titleLen} 字，超过上限 ${variant.titleMaxChars}`);
  }
  if (
    typeof variant.bodyMaxChars === 'number' &&
    effectiveBodyLen > variant.bodyMaxChars
  ) {
    errors.push(
      `正文 ${effectiveBodyLen} 字，超过上限 ${variant.bodyMaxChars}`,
    );
  }
  if (
    typeof variant.bodyMinChars === 'number' &&
    variant.bodyMinChars > 0 &&
    effectiveBodyLen < variant.bodyMinChars
  ) {
    warns.push(
      `正文 ${effectiveBodyLen} 字，建议至少 ${variant.bodyMinChars}`,
    );
  }
  if (typeof variant.minImages === 'number' && args.images < variant.minImages) {
    errors.push(`配图 ${args.images} 张，至少需要 ${variant.minImages} 张`);
  }
  if (args.platform === 'youtube') {
    // 视频平台正文可空
  } else if (!String(checkBody || body).trim() && args.platform !== 'x') {
    errors.push('正文为空');
  } else if (args.platform === 'x' && !String(checkBody).trim()) {
    errors.push('推文内容为空');
  }

  // 实战沉淀规则（pattern）
  let learned = { errors: [], warns: [], matched: [] };
  try {
    learned = applyLearnedRulePatterns({
      platform: args.platform,
      title: checkTitle || title,
      body: checkBody || body,
    });
    errors.push(...learned.errors);
    warns.push(...learned.warns);
  } catch {
    // 记忆目录异常不阻断静态检查
  }

  const recalled = recallPlatformRules({
    platform: args.platform,
    limit: 12,
  });

  const ok = errors.length === 0;
  printReport({
    ok,
    errors,
    warns,
    meta: {
      platform: args.platform,
      displayName: platform.displayName,
      variant: variantId,
      titleLen,
      bodyLen,
      combinedLen,
      images: args.images,
      notes: variant.notes || '',
      overview: 'references/platforms/rules-overview.md',
      learnedMatched: learned.matched.length,
      learnedRulesHint: recalled.slice(0, 8).map((r) => ({
        fingerprint: r.fingerprint,
        rule: r.rule,
        avoid: r.avoid,
        severity: r.severity,
        count: r.count,
      })),
      agentHint:
        recalled.length > 0
          ? `该平台有 ${recalled.length} 条实战规则，改写时对照 avoid；总表见 rules-overview.md`
          : '对照 rules-overview.md；实战触发后用 memory rules record 沉淀',
    },
  });
  process.exit(ok ? 0 : 1);
}

function printReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

main();
