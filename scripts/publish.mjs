#!/usr/bin/env node
/**
 * 发布入口：@seedcast/publish-core（不依赖 MCP）
 *
 *   node scripts/publish.mjs --platform wechat-mp|csdn --account <id> \
 *     --title "标题" --body-file ./draft.md [--mode draft]
 */
import { readFileSync } from 'node:fs';
import { defaultWechatCover, loadPublishCore } from './lib/resolve-core.mjs';
import {
  applyLearnedRulePatterns,
  checkPrewriteStamp,
  classifyPublishFailure,
  ingestStyleSample,
  notePublishSuccessMemory,
  recallPlatformRules,
  recallPublishLessons,
  recordPlatformRule,
  recordPublishLesson,
} from './lib/memory-store.mjs';

function parseArgs(argv) {
  const out = { mode: 'draft' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--force-rules') {
      out.forceRules = true;
    } else if (a === '--skip-prewrite-gate') {
      out.skipPrewriteGate = true;
    } else if (a.startsWith('--') && next && !next.startsWith('--')) {
      out[a.slice(2)] = next;
      i += 1;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

function fail(message, extra = {}) {
  console.log(JSON.stringify({ ok: false, error: message, ...extra }, null, 2));
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage:
  node scripts/publish.mjs --platform wechat-mp --account <id> \\
    --title "..." --body-file ./draft.md [--cover path]
  node scripts/publish.mjs --platform csdn --account <id> \\
    --title "..." --body-file ./draft.md [--tags a,b] [--categories ...]
  node scripts/publish.mjs --platform jianshu --account <id> \\
    --title "..." --body-file ./draft.md [--notebook-id N]
  node scripts/publish.mjs --platform baijiahao --account <id> \\
    --title "..." --body-file ./draft.md
  node scripts/publish.mjs --platform toutiao --account <id> \\
    --title "..." --body-file ./draft.md [--cover path]
  node scripts/publish.mjs --platform xiaohongshu --account <id> \\
    --title "..." --body-file ./draft.md [--publish-type article|imageText] \\
    [--images path1,path2] [--topics a,b]
  node scripts/publish.mjs --platform zhihu --account <id> \\
    --title "..." --body-file ./draft.md
  node scripts/publish.mjs --platform weibo --account <id> \\
    --title "..." --body-file ./draft.md
  node scripts/publish.mjs --platform bilibili --account <id> \\
    --title "..." --body-file ./draft.md [--tid 4]
  node scripts/publish.mjs --platform douyin --account <id> \\
    --title "..." --body-file ./draft.md [--publish-type article|imageText] \\
    [--images path1,path2]
  node scripts/publish.mjs --platform x --account <id> \\
    --title "..." --body-file ./draft.md [--text "..."]
  node scripts/publish.mjs --platform youtube --account <id> \\
    --title "..." --video-file ./clip.mp4 [--body-file desc.md] \\
    [--privacy private|unlisted|public]

门禁：
  写稿前须 memory.mjs brief（2h 内盖章）；可用 --skip-prewrite-gate 跳过
  命中 learned pattern 拒绝发布；可用 --force-rules 强制

默认 --mode draft。数据目录 ~/.seedcast。`);
    process.exit(0);
  }

  const platform = args.platform;
  if (!platform) {
    fail('缺少 --platform');
  }
  if (args.mode && args.mode !== 'draft') {
    fail('目前仅支持 --mode draft', { mode: args.mode });
  }

  const accountId = args.account;
  if (!accountId) {
    fail('缺少 --account');
  }

  const title = args.title;
  if (!title) {
    fail('缺少 --title');
  }

  let markdown = args.body ?? '';
  if (args['body-file']) {
    markdown = readFileSync(args['body-file'], 'utf8');
  }
  // YouTube 可用空描述；其它平台正文必填
  if (!markdown.trim() && platform !== 'youtube') {
    fail('正文为空');
  }

  // 1) 写稿前 brief 门禁（先于账号，便于明确报错）
  if (!args.skipPrewriteGate) {
    const gate = checkPrewriteStamp({ platform, maxAgeMin: 120 });
    if (!gate.ok) {
      fail(gate.reason || '写稿前 brief 未通过', {
        code: 'PREWRITE_GATE',
        hint: 'node scripts/memory.mjs brief --platform ' + platform,
      });
    }
    console.error(`[brief] 盖章有效 at=${gate.stamp?.at}`);
  } else {
    console.error('[brief] 已跳过 prewrite 门禁 (--skip-prewrite-gate)');
  }

  // 2) 命中 learned pattern → 拒绝发布
  const patternHit = applyLearnedRulePatterns({
    platform,
    title,
    body: markdown,
  });
  if (
    !args.forceRules &&
    (patternHit.errors.length > 0 || patternHit.warns.length > 0)
  ) {
    fail('命中已学习平台规则 pattern，已拒绝发布', {
      code: 'RULE_PATTERN_BLOCK',
      errors: patternHit.errors,
      warns: patternHit.warns,
      matched: patternHit.matched,
      hint: '改文后重试；确需强发加 --force-rules',
    });
  }
  if (args.forceRules && patternHit.matched.length > 0) {
    console.error(
      `[rules] --force-rules：忽略 ${patternHit.matched.length} 条 pattern 命中`,
    );
  }

  // 3) 召回历史教训 / 规则（stderr）
  const priorLessons = recallPublishLessons({ platform, limit: 8 });
  if (priorLessons.length > 0) {
    console.error(
      `[memory] 该平台有 ${priorLessons.length} 条历史教训，请对照 fix/codeHint 后再发`,
    );
    for (const lesson of priorLessons.slice(0, 5)) {
      console.error(
        `[memory] ×${lesson.count} [${lesson.kind || '?'}] ${lesson.sampleError}${
          lesson.fix ? ` → ${lesson.fix}` : ''
        }`,
      );
    }
  }
  const priorRules = recallPlatformRules({ platform, limit: 8 });
  if (priorRules.length > 0) {
    console.error(
      `[rules] 该平台有 ${priorRules.length} 条实战规则，请确认文案未再触发`,
    );
    for (const rule of priorRules.slice(0, 5)) {
      console.error(
        `[rules] ×${rule.count} ${rule.rule}${
          rule.avoid ? `（避免：${rule.avoid}）` : ''
        }`,
      );
    }
  }

  const core = await loadPublishCore();
  const supported = core.SUPPORTED_PLATFORMS || [];
  if (!supported.includes(platform)) {
    fail(`平台尚未迁入 publish-core: ${platform}`, { supported });
  }

  const account = core.getAccount(accountId);
  if (!account || account.pluginId !== platform) {
    fail(`找不到账号或平台不匹配: ${accountId} / ${platform}`);
  }

  const logs = [];
  const onInfo = (m) => {
    logs.push(m);
    console.error(`[info] ${m}`);
  };

  let result;
  if (platform === 'wechat-mp') {
    const cover = args.cover || defaultWechatCover() || undefined;
    result = await core.publishWechatMpDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      accountName: account.name,
      coverFile: cover,
      defaultCoverPath: defaultWechatCover() || undefined,
      author: args.author,
      digest: args.digest,
      showCoverPic: args['show-cover'],
      contentSourceUrl: args['source-url'],
      onInfo,
    });
  } else if (platform === 'csdn') {
    result = await core.publishCsdnDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      tags: args.tags,
      categories: args.categories,
      onInfo,
    });
  } else if (platform === 'jianshu') {
    result = await core.publishJianshuDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      notebookId: args['notebook-id'],
      onInfo,
    });
  } else if (platform === 'baijiahao') {
    result = await core.publishBaijiahaoDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      onInfo,
    });
  } else if (platform === 'toutiao') {
    result = await core.publishToutiaoDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      coverFile: args.cover,
      onInfo,
    });
  } else if (platform === 'xiaohongshu') {
    const images = args.images
      ? String(args.images)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    result = await core.publishXhsDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      mode: args['publish-type'] || args.publishType,
      images,
      topics: args.topics,
      onInfo,
    });
  } else if (platform === 'zhihu') {
    result = await core.publishZhihuDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      onInfo,
    });
  } else if (platform === 'weibo') {
    result = await core.publishWeiboDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      onInfo,
    });
  } else if (platform === 'bilibili') {
    result = await core.publishBilibiliDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      tid: args.tid,
      onInfo,
    });
  } else if (platform === 'douyin') {
    const images = args.images
      ? String(args.images)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    result = await core.publishDouyinDraft({
      profileDir: account.profileDir,
      title,
      markdown,
      mode: args['publish-type'] || args.publishType,
      images,
      onInfo,
    });
  } else if (platform === 'x') {
    result = await core.publishXPost({
      profileDir: account.profileDir,
      title,
      markdown,
      text: args.text,
      onInfo,
    });
  } else if (platform === 'youtube') {
    if (!args['video-file'] && !args.video) {
      fail('youtube 需 --video-file');
    }
    result = await core.publishYouTubeDraft({
      profileDir: account.profileDir,
      title,
      description: markdown,
      videoFile: args['video-file'] || args.video,
      privacyStatus: args.privacy || args['privacy-status'] || 'private',
      categoryId: args['category-id'],
      onInfo,
    });
  } else {
    fail(`未实现发布分支: ${platform}`);
  }

  let memory = {
    priorLessons: priorLessons.length,
    priorRules: priorRules.length,
  };
  if (!result.ok) {
    const errMsg =
      result.error?.message || result.error || 'publish failed';
    const classified = classifyPublishFailure(String(errMsg));
    memory.failureKind = classified.kind;
    memory.failureReason = classified.reason;
    console.error(
      `[classify] 失败分类=${classified.kind}（${classified.reason}）`,
    );

    if (classified.kind === 'rule') {
      try {
        const ruleRec = recordPlatformRule({
          platform,
          trigger: String(errMsg),
          rule: String(errMsg).slice(0, 200),
          category: 'content_policy',
          severity: 'error',
          source: 'publish.mjs',
        });
        memory.recordedRule = ruleRec.entry;
        memory.agentHint =
          '规则类失败已写入 rules。请补全 --rule/--avoid/--pattern 后改文，再 check-rules → publish。';
        console.error(
          `[rules] 已沉淀 fingerprint=${ruleRec.entry.fingerprint}`,
        );
      } catch (memErr) {
        memory.recordError =
          memErr instanceof Error ? memErr.message : String(memErr);
      }
    } else {
      try {
        const recorded = recordPublishLesson({
          platform,
          accountId: account.id,
          error: String(errMsg),
          kind: 'technical',
          source: 'publish.mjs',
        });
        memory.recordedLesson = recorded.lesson;
        memory.aggregate = recorded.aggregate;
        memory.agentHint =
          '技术类失败已写入 publish lessons。请改适配器/选择器后重试；成功后将自动 resolved 计数。';
        console.error(
          `[memory] 已记录技术教训 fingerprint=${recorded.lesson.fingerprint}`,
        );
      } catch (memErr) {
        memory.recordError =
          memErr instanceof Error ? memErr.message : String(memErr);
      }
    }
  } else {
    // 成功：自动 resolved 计数 + 风格学习
    try {
      memory.successResolved = notePublishSuccessMemory({ platform });
      console.error(
        `[memory] 成功：技术教训 auto-resolved=${memory.successResolved.lessonsResolved}，规则 passCount+=${memory.successResolved.rulesPassBumped}`,
      );
    } catch {
      // ignore
    }
    if (markdown && markdown.trim() && platform !== 'youtube') {
      try {
        const style = ingestStyleSample({
          title,
          markdown,
          platform,
          source: 'publish-success',
        });
        memory.styleIngested = true;
        memory.styleSampleId = style.meta.id;
        memory.styleSampleCount = style.profile.sampleCount;
        console.error(
          `[memory] 已纳入风格样本（累计 ${style.profile.sampleCount}）`,
        );
      } catch {
        // 风格学习失败不阻断发布回执
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ...result,
        platform,
        accountId: account.id,
        dataDir: core.getDefaultDataDir(),
        logs,
        memory,
      },
      null,
      2,
    ),
  );
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
