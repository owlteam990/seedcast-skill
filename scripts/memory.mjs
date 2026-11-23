#!/usr/bin/env node
/**
 * Skill 自进化记忆
 *
 * 发布教训：
 *   node scripts/memory.mjs publish recall [--platform douyin]
 *   node scripts/memory.mjs publish record --platform douyin --error "..." [--fix "..."] [--code-hint "file:hint"] [--resolved]
 *   node scripts/memory.mjs publish rebuild
 *
 * 写作风格：
 *   node scripts/memory.mjs style show
 *   node scripts/memory.mjs style rebuild [--from-db] [--limit 40]
 *   node scripts/memory.mjs style ingest --title "..." --body-file ./a.md [--platform zhihu]
 *
 * 平台规则实战：
 *   node scripts/memory.mjs rules recall [--platform douyin]
 *   node scripts/memory.mjs rules record --platform douyin --trigger "..." --rule "..." [--avoid "..."] [--pattern "..."] [--category content_policy] [--severity warn|error] [--resolved]
 *   node scripts/memory.mjs rules rebuild
 */
import { readFileSync } from 'node:fs';
import {
  ensureMemoryDirs,
  importStyleFromContentsDb,
  ingestStyleSample,
  memoryPaths,
  printPrewriteBrief,
  rebuildLessonsMarkdown,
  rebuildRulesMarkdown,
  rebuildStyleProfile,
  recallPlatformRules,
  recallPublishLessons,
  recordPlatformRule,
  recordPublishLesson,
} from './lib/memory-store.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--resolved') {
      out.resolved = true;
    } else if (a === '--from-db') {
      out.fromDb = true;
    } else if (a === '--force-rules') {
      out.forceRules = true;
    } else if (a === '--skip-prewrite-gate') {
      out.skipPrewriteGate = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a.startsWith('--') && next && !next.startsWith('--')) {
      out[a.slice(2)] = next;
      i += 1;
    } else if (!a.startsWith('--')) {
      out._.push(a);
    }
  }
  return out;
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function fail(message, extra = {}) {
  print({ ok: false, error: message, ...extra });
  process.exit(1);
}

function usage() {
  console.log(`Usage:
  node scripts/memory.mjs brief [--platform <id>]
      # 写稿前强制打印 style + rules brief 并盖章（2h 内 publish 有效）

  node scripts/memory.mjs publish recall [--platform <id>] [--limit N]
  node scripts/memory.mjs publish record --platform <id> --error "..." \\
    [--fix "下次如何避免"] [--code-hint "path:说明"] [--resolved]
  node scripts/memory.mjs publish rebuild

  node scripts/memory.mjs style show
  node scripts/memory.mjs style rebuild [--from-db] [--limit 40]
  node scripts/memory.mjs style ingest --title "..." --body-file ./draft.md [--platform <id>]

  node scripts/memory.mjs rules recall [--platform <id>] [--limit N]
  node scripts/memory.mjs rules record --platform <id> \\
    --trigger "平台原文提示" --rule "抽象规则" \\
    [--avoid "改写应避免"] [--pattern "正则"] [--category content_policy|length|media|account|api|soft] \\
    [--severity warn|error] [--variant article] [--resolved]
  node scripts/memory.mjs rules rebuild

数据目录：~/.seedcast/skill-memory/`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || args._.length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const domain = args._[0];
  const action = args._[1];
  const paths = ensureMemoryDirs();

  // 写稿前 brief（单命令域）
  if (domain === 'brief') {
    const result = printPrewriteBrief({ platform: args.platform });
    print({
      ok: true,
      action: 'brief',
      ...result,
    });
    return;
  }

  if (domain === 'publish') {
    if (action === 'recall') {
      const lessons = recallPublishLessons({
        platform: args.platform,
        limit: args.limit ? Number(args.limit) : 20,
      });
      print({
        ok: true,
        action: 'publish.recall',
        count: lessons.length,
        lessonsPath: paths.lessonsMd,
        lessons,
        agentHint:
          '发布前阅读 lessons；若有 fix/codeHint，先应用再 publish，避免重复踩坑。',
      });
      return;
    }
    if (action === 'record') {
      if (!args.platform) {
        fail('缺少 --platform');
      }
      if (!args.error) {
        fail('缺少 --error');
      }
      const result = recordPublishLesson({
        platform: args.platform,
        accountId: args.account || args['account-id'],
        error: args.error,
        fix: args.fix,
        codeHint: args['code-hint'] || args.codeHint,
        status: args.resolved ? 'resolved' : 'open',
      });
      print({
        ok: true,
        action: 'publish.record',
        ...result,
        agentHint:
          '若 codeHint 指向适配器/选择器，应立刻改代码并重试发布；成功后可用 --resolved --fix 更新。',
      });
      return;
    }
    if (action === 'rebuild') {
      const md = rebuildLessonsMarkdown();
      print({ ok: true, action: 'publish.rebuild', lessonsMd: md });
      return;
    }
    fail(`未知 publish 操作: ${action}`);
  }

  if (domain === 'style') {
    if (action === 'show') {
      let profile = null;
      try {
        profile = JSON.parse(
          readFileSync(paths.profileJson, 'utf8'),
        );
      } catch {
        profile = rebuildStyleProfile();
      }
      print({
        ok: true,
        action: 'style.show',
        briefMd: paths.briefMd,
        profile,
        agentHint:
          '写稿/改写前阅读 briefMd；模仿 tips 与开头节奏，事实以用户素材为准。',
      });
      return;
    }
    if (action === 'rebuild') {
      let result;
      if (args.fromDb) {
        result = importStyleFromContentsDb({
          limit: args.limit ? Number(args.limit) : 40,
        });
      } else {
        result = {
          imported: 0,
          profile: rebuildStyleProfile(),
          note: '仅重建 samples',
        };
      }
      print({
        ok: true,
        action: 'style.rebuild',
        briefMd: paths.briefMd,
        ...result,
      });
      return;
    }
    if (action === 'ingest') {
      let markdown = args.body || '';
      if (args['body-file']) {
        markdown = readFileSync(args['body-file'], 'utf8');
      }
      if (!args.title) {
        fail('缺少 --title');
      }
      const result = ingestStyleSample({
        title: args.title,
        markdown,
        platform: args.platform,
        source: 'manual',
      });
      print({
        ok: true,
        action: 'style.ingest',
        briefMd: paths.briefMd,
        ...result,
      });
      return;
    }
    fail(`未知 style 操作: ${action}`);
  }

  if (domain === 'rules') {
    if (action === 'recall') {
      const rules = recallPlatformRules({
        platform: args.platform,
        limit: args.limit ? Number(args.limit) : 50,
      });
      print({
        ok: true,
        action: 'rules.recall',
        count: rules.length,
        rulesPath: paths.rulesMd,
        staticOverview: 'references/platforms/rules-overview.md',
        rules,
        agentHint:
          '写稿/改写前对照静态总表 + 本列表；命中 avoid/pattern 须改文后再 check-rules。',
      });
      return;
    }
    if (action === 'record') {
      if (!args.platform) {
        fail('缺少 --platform');
      }
      if (!args.trigger && !args.rule) {
        fail('缺少 --trigger 或 --rule');
      }
      const result = recordPlatformRule({
        platform: args.platform,
        variant: args.variant,
        category: args.category,
        severity: args.severity,
        trigger: args.trigger,
        rule: args.rule,
        avoid: args.avoid,
        pattern: args.pattern,
        example: args.example,
        status: args.resolved ? 'resolved' : 'open',
        source: 'manual',
      });
      print({
        ok: true,
        action: 'rules.record',
        ...result,
        agentHint:
          '已沉淀平台规则。若可脚本检测请补 --pattern；改写流程须在下次 check 前召回。',
      });
      return;
    }
    if (action === 'rebuild') {
      const md = rebuildRulesMarkdown();
      print({ ok: true, action: 'rules.rebuild', rulesMd: md });
      return;
    }
    fail(`未知 rules 操作: ${action}`);
  }

  fail(`未知域: ${domain}`, { hint: 'brief | publish | style | rules' });
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
