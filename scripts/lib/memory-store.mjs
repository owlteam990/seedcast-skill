/**
 * Skill 自进化记忆：发布教训 + 写作风格（存 ~/.seedcast/skill-memory）
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @returns {string}
 */
export function getDataDir() {
  if (process.env.SEEDCAST_DATA_DIR?.trim()) {
    return process.env.SEEDCAST_DATA_DIR.trim();
  }
  return join(homedir(), '.seedcast');
}

/**
 * @param {string} [dataDir]
 * @returns {object}
 */
export function memoryPaths(dataDir = getDataDir()) {
  const root = join(dataDir, 'skill-memory');
  const publishDir = join(root, 'publish');
  const styleDir = join(root, 'style');
  const rulesDir = join(root, 'rules');
  return {
    root,
    publishDir,
    styleDir,
    rulesDir,
    lessonsJsonl: join(publishDir, 'lessons.jsonl'),
    lessonsMd: join(publishDir, 'lessons.md'),
    fingerprints: join(publishDir, 'fingerprints.json'),
    profileJson: join(styleDir, 'profile.json'),
    briefMd: join(styleDir, 'brief.md'),
    samplesDir: join(styleDir, 'samples'),
    rulesJsonl: join(rulesDir, 'learned.jsonl'),
    rulesMd: join(rulesDir, 'learned.md'),
    rulesFingerprints: join(rulesDir, 'fingerprints.json'),
    prewriteStamp: join(root, 'prewrite-stamp.json'),
  };
}

/**
 * @param {string} [dataDir]
 */
export function ensureMemoryDirs(dataDir = getDataDir()) {
  const p = memoryPaths(dataDir);
  mkdirSync(p.publishDir, { recursive: true });
  mkdirSync(p.styleDir, { recursive: true });
  mkdirSync(p.samplesDir, { recursive: true });
  mkdirSync(p.rulesDir, { recursive: true });
  return p;
}

/** 平台规则学习：分类 */
export const RULE_CATEGORIES = [
  'content_policy',
  'length',
  'media',
  'account',
  'api',
  'soft',
];

/**
 * 判断错误文案是否像「触发平台内容/运营规则」
 *
 * @param {string} message
 * @returns {boolean}
 */
export function looksLikePlatformRuleError(message) {
  const s = String(message || '');
  return /违规|敏感|审核|不合规|不符合|限流|禁止|不允许|字数|超长|过短|配图|封面|外链|导流|联系方式|广告|spam|forbidden|policy|violate|reject|拒绝发布|内容质量|原创|搬运|营销|极限词|标题党/i.test(
    s,
  );
}

/**
 * 发布失败自动分类：rule（内容/运营规则）vs technical（适配器/会话/网络）
 *
 * @param {string} message
 * @returns {{ kind: 'rule'|'technical', reason: string }}
 */
export function classifyPublishFailure(message) {
  const s = String(message || '');
  if (looksLikePlatformRuleError(s)) {
    return {
      kind: 'rule',
      reason: '文案命中审核/限流/字数/配图/导流等内容规则特征',
    };
  }
  if (
    /cookie|登录|login|session|未登录|扫码|超时|timeout|selector|找不到|getByRole|导航|network|ECONN|ETIMEDOUT|401|403|502|503|playwright|浏览器|profile/i.test(
      s,
    )
  ) {
    return {
      kind: 'technical',
      reason: '文案命中会话/选择器/网络等技术失败特征',
    };
  }
  return {
    kind: 'technical',
    reason: '未识别为内容规则，默认归入技术类',
  };
}

/**
 * 写稿前 brief：打印风格 + 规则，并盖章（供门禁）
 *
 * @param {object} input
 * @returns {object}
 */
export function printPrewriteBrief(input = {}) {
  const dataDir = input.dataDir || getDataDir();
  const platform = input.platform || null;
  const p = ensureMemoryDirs(dataDir);
  let styleProfile = null;
  let styleBrief = '';
  try {
    if (existsSync(p.profileJson)) {
      styleProfile = JSON.parse(readFileSync(p.profileJson, 'utf8'));
    }
    if (existsSync(p.briefMd)) {
      styleBrief = readFileSync(p.briefMd, 'utf8');
    }
  } catch {
    // ignore
  }
  if (!styleProfile) {
    styleProfile = rebuildStyleProfile(dataDir);
    if (existsSync(p.briefMd)) {
      styleBrief = readFileSync(p.briefMd, 'utf8');
    }
  }
  const rules = recallPlatformRules({ platform, dataDir, limit: 20 });
  if (!existsSync(p.rulesMd)) {
    rebuildRulesMarkdown(dataDir);
  }

  console.error('======== SeedCast 写稿前 Brief（强制）========');
  console.error(`[style] 样本数=${styleProfile.sampleCount || 0}  brief=${p.briefMd}`);
  for (const tip of styleProfile.tips || []) {
    console.error(`[style] · ${tip}`);
  }
  if ((styleProfile.recentOpenings || []).length > 0) {
    console.error(
      `[style] 近期开头：${styleProfile.recentOpenings.slice(0, 2).join(' | ')}`,
    );
  }
  console.error(
    `[rules] 平台=${platform || '*'} 条数=${rules.length} 总表=references/platforms/rules-overview.md`,
  );
  for (const r of rules.slice(0, 8)) {
    console.error(
      `[rules] · [${r.severity || 'warn'}] ${r.rule}${
        r.avoid ? ` → 避免：${r.avoid}` : ''
      }`,
    );
  }
  if (styleBrief) {
    const excerpt = styleBrief.split('\n').slice(0, 40).join('\n');
    console.error('-------- style/brief.md（摘录）--------');
    console.error(excerpt);
  }
  console.error('==========================================');

  const stamp = {
    at: new Date().toISOString(),
    platform: platform || null,
    styleSampleCount: styleProfile.sampleCount || 0,
    rulesCount: rules.length,
  };
  writeFileSync(p.prewriteStamp, JSON.stringify(stamp, null, 2), 'utf8');
  return {
    ok: true,
    stamp,
    paths: { briefMd: p.briefMd, rulesMd: p.rulesMd, stamp: p.prewriteStamp },
    styleProfile,
    rules,
    agentHint:
      '已打印风格与规则 brief 并盖章。请按 tips/avoid 写稿；随后 check-rules → publish。',
  };
}

/**
 * 检查写稿前 brief 盖章是否仍有效
 *
 * @param {object} input
 * @returns {{ ok: boolean, reason?: string, stamp?: object }}
 */
export function checkPrewriteStamp(input = {}) {
  const dataDir = input.dataDir || getDataDir();
  const p = memoryPaths(dataDir);
  const maxAgeMin = input.maxAgeMin ?? 120;
  if (!existsSync(p.prewriteStamp)) {
    return {
      ok: false,
      reason: '未执行写稿前 brief。请先：node scripts/memory.mjs brief [--platform id]',
    };
  }
  let stamp;
  try {
    stamp = JSON.parse(readFileSync(p.prewriteStamp, 'utf8'));
  } catch {
    return { ok: false, reason: 'prewrite-stamp.json 损坏，请重新 brief' };
  }
  const ageMs = Date.now() - Date.parse(stamp.at || 0);
  if (!Number.isFinite(ageMs) || ageMs > maxAgeMin * 60 * 1000) {
    return {
      ok: false,
      reason: `brief 盖章已过期（>${maxAgeMin} 分钟），请重新 memory.mjs brief`,
      stamp,
    };
  }
  if (
    input.platform &&
    stamp.platform &&
    stamp.platform !== input.platform &&
    stamp.platform !== '*'
  ) {
    return {
      ok: false,
      reason: `brief 盖章平台为 ${stamp.platform}，与当前 ${input.platform} 不一致，请重新 brief`,
      stamp,
    };
  }
  return { ok: true, stamp };
}

/**
 * 发布成功：对同平台 open 技术教训自动 resolved 并计数；规则累加 passCount
 *
 * @param {object} input
 * @returns {object}
 */
export function notePublishSuccessMemory(input) {
  const dataDir = input.dataDir || getDataDir();
  const platform = String(input.platform || '');
  const now = new Date().toISOString();
  const lessonFps = loadFingerprints(dataDir);
  let lessonsResolved = 0;
  for (const row of Object.values(lessonFps)) {
    if (platform && row.platform !== platform) {
      continue;
    }
    row.successCount = (row.successCount || 0) + 1;
    row.lastSuccessAt = now;
    if (row.status !== 'resolved') {
      row.status = 'resolved';
      row.resolvedCount = (row.resolvedCount || 0) + 1;
      row.autoResolvedAt = now;
      lessonsResolved += 1;
    } else {
      row.resolvedCount = (row.resolvedCount || 0) + 1;
    }
  }
  saveFingerprints(lessonFps, dataDir);
  rebuildLessonsMarkdown(dataDir);

  const ruleFps = loadRuleFingerprints(dataDir);
  let rulesPassBumped = 0;
  for (const row of Object.values(ruleFps)) {
    if (platform && row.platform !== platform && row.platform !== '*') {
      continue;
    }
    row.passCount = (row.passCount || 0) + 1;
    row.lastPassAt = now;
    rulesPassBumped += 1;
  }
  saveRuleFingerprints(ruleFps, dataDir);
  rebuildRulesMarkdown(dataDir);

  return {
    lessonsResolved,
    rulesPassBumped,
    at: now,
  };
}

/**
 * 归一化错误文案 → 指纹（去掉易变数字/UUID/URL）
 *
 * @param {string} message
 * @returns {string}
 */
export function fingerprintError(message) {
  const norm = String(message || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '<uuid>',
    )
    .replace(/\b\d{4,}\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  return createHash('sha1').update(norm).digest('hex').slice(0, 12);
}

/**
 * @param {string} path
 * @returns {object[]}
 */
export function readJsonl(path) {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * @param {string} path
 * @param {object} row
 */
export function appendJsonl(path, row) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(row)}\n`, 'utf8');
}

/**
 * @param {string} [dataDir]
 * @returns {Record<string, object>}
 */
export function loadFingerprints(dataDir = getDataDir()) {
  const p = memoryPaths(dataDir);
  if (!existsSync(p.fingerprints)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(p.fingerprints, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, object>} map
 * @param {string} [dataDir]
 */
export function saveFingerprints(map, dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  writeFileSync(p.fingerprints, JSON.stringify(map, null, 2), 'utf8');
}

/**
 * 记录一次发布失败教训
 *
 * @param {object} input
 * @returns {object}
 */
export function recordPublishLesson(input) {
  const dataDir = input.dataDir || getDataDir();
  const p = ensureMemoryDirs(dataDir);
  const error = String(input.error || '').trim();
  if (!error) {
    throw new Error('缺少 error');
  }
  const platform = String(input.platform || 'unknown');
  const fp = fingerprintError(`${platform}:${error}`);
  const now = new Date().toISOString();
  const kind =
    input.kind === 'rule' || input.kind === 'technical'
      ? input.kind
      : classifyPublishFailure(error).kind;
  const lesson = {
    id: `pl_${Date.now().toString(36)}`,
    at: now,
    platform,
    accountId: input.accountId || null,
    error,
    fingerprint: fp,
    kind,
    fix: input.fix || null,
    codeHint: input.codeHint || null,
    status: input.status || 'open',
    source: input.source || 'publish',
  };
  appendJsonl(p.lessonsJsonl, lesson);

  const fps = loadFingerprints(dataDir);
  const prev = fps[fp] || {
    fingerprint: fp,
    platform,
    count: 0,
    firstAt: now,
    sampleError: error,
    fix: null,
    codeHint: null,
    kind,
  };
  prev.count = (prev.count || 0) + 1;
  prev.lastAt = now;
  prev.sampleError = error;
  prev.kind = kind;
  if (lesson.fix) {
    prev.fix = lesson.fix;
  }
  if (lesson.codeHint) {
    prev.codeHint = lesson.codeHint;
  }
  if (lesson.status === 'resolved') {
    prev.status = 'resolved';
  } else if (!prev.status) {
    prev.status = 'open';
  }
  fps[fp] = prev;
  saveFingerprints(fps, dataDir);
  rebuildLessonsMarkdown(dataDir);
  return { lesson, aggregate: prev, paths: p };
}

/**
 * 召回某平台相关教训
 *
 * @param {object} input
 * @returns {object[]}
 */
export function recallPublishLessons(input = {}) {
  const dataDir = input.dataDir || getDataDir();
  const fps = loadFingerprints(dataDir);
  const platform = input.platform;
  const rows = Object.values(fps)
    .filter((r) => {
      if (!platform) {
        return true;
      }
      return r.platform === platform;
    })
    .sort((a, b) => {
      return (b.count || 0) - (a.count || 0);
    });
  const limit = input.limit ?? 20;
  return rows.slice(0, limit);
}

/**
 * 重建 Agent 可读 lessons.md
 *
 * @param {string} [dataDir]
 */
export function rebuildLessonsMarkdown(dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  const rows = recallPublishLessons({ dataDir, limit: 100 });
  const lines = [
    '# 发布错误教训（自动生成）',
    '',
    `更新于：${new Date().toISOString()}`,
    '',
    'Agent 在发布前必须阅读与目标平台相关的条目；失败后调用 `memory.mjs publish record` 追加。',
    '',
  ];
  if (rows.length === 0) {
    lines.push('_暂无记录。_');
  } else {
    for (const r of rows) {
      lines.push(`## [${r.platform}] ${r.fingerprint} ×${r.count}`);
      lines.push('');
      lines.push(`- 状态：${r.status || 'open'}`);
      lines.push(`- 分类：${r.kind || 'technical'}`);
      lines.push(`- 样例：${r.sampleError}`);
      if (r.fix) {
        lines.push(`- 修复要点：${r.fix}`);
      }
      if (r.codeHint) {
        lines.push(`- 代码提示：${r.codeHint}`);
      }
      if (r.successCount) {
        lines.push(`- 成功计数：${r.successCount}（resolved×${r.resolvedCount || 0}）`);
      }
      lines.push(`- 最近：${r.lastAt || r.firstAt}`);
      lines.push('');
    }
  }
  writeFileSync(p.lessonsMd, `${lines.join('\n')}\n`, 'utf8');
  return p.lessonsMd;
}

/**
 * 从正文提取简单风格特征
 *
 * @param {string} title
 * @param {string} markdown
 * @returns {object}
 */
export function extractStyleFeatures(title, markdown) {
  const body = String(markdown || '').replace(/\r\n/g, '\n').trim();
  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  const lines = body.split('\n').filter((l) => l.trim());
  const headings = lines.filter((l) => /^#{1,3}\s+/.test(l)).length;
  const lists = lines.filter((l) => /^[-*+]\s+|^\d+\.\s+/.test(l)).length;
  const questions = (body.match(/[？?]/g) || []).length;
  const exclaims = (body.match(/[！!]/g) || []).length;
  const titleChars = [...String(title || '')].length;
  const bodyChars = [...body].length;
  const avgPara =
    paragraphs.length > 0
      ? Math.round(
          paragraphs.reduce((s, p) => s + [...p].length, 0) / paragraphs.length,
        )
      : 0;
  const opening = paragraphs[0]?.replace(/\s+/g, ' ').trim().slice(0, 80) || '';
  const closing =
    paragraphs.length > 1
      ? paragraphs[paragraphs.length - 1]
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80)
      : '';
  return {
    titleChars,
    bodyChars,
    paragraphs: paragraphs.length,
    headings,
    lists,
    questions,
    exclaims,
    avgParaChars: avgPara,
    opening,
    closing,
  };
}

/**
 * @param {object[]} samples
 * @returns {object}
 */
export function aggregateStyleProfile(samples) {
  if (samples.length === 0) {
    return {
      updatedAt: new Date().toISOString(),
      sampleCount: 0,
      averages: {},
      tips: ['尚无样本：成功发布或手动 ingest 后自动学习。'],
      recentOpenings: [],
      recentTitles: [],
    };
  }
  const avg = (key) => {
    const nums = samples
      .map((s) => s.features?.[key])
      .filter((n) => typeof n === 'number');
    if (nums.length === 0) {
      return 0;
    }
    return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  };
  const tips = [];
  const titleAvg = avg('titleChars');
  const bodyAvg = avg('bodyChars');
  const paraAvg = avg('avgParaChars');
  tips.push(`标题常见长度约 ${titleAvg} 字，改写时贴近此量级。`);
  tips.push(`正文常见长度约 ${bodyAvg} 字，段落均长约 ${paraAvg} 字。`);
  if (avg('headings') >= 1) {
    tips.push('习惯使用小标题分层，改写时保留清晰结构。');
  }
  if (avg('lists') >= 2) {
    tips.push('常用列表呈现要点，避免大段堆砌。');
  }
  if (avg('questions') >= 1) {
    tips.push('文中常有设问，可保留对话感，但勿过度标题党。');
  }
  tips.push('开头/结尾参考 recentOpenings；事实与素材仍以用户本次输入为准，禁止编造。');

  return {
    updatedAt: new Date().toISOString(),
    sampleCount: samples.length,
    averages: {
      titleChars: titleAvg,
      bodyChars: bodyAvg,
      paragraphs: avg('paragraphs'),
      headings: avg('headings'),
      lists: avg('lists'),
      questions: avg('questions'),
      exclaims: avg('exclaims'),
      avgParaChars: paraAvg,
    },
    tips,
    recentTitles: samples.slice(0, 8).map((s) => s.title).filter(Boolean),
    recentOpenings: samples
      .slice(0, 5)
      .map((s) => s.features?.opening)
      .filter(Boolean),
    byPlatform: summarizeByPlatform(samples),
  };
}

function summarizeByPlatform(samples) {
  const map = {};
  for (const s of samples) {
    const plat = s.platform || 'general';
    if (!map[plat]) {
      map[plat] = { count: 0, titles: [] };
    }
    map[plat].count += 1;
    if (s.title && map[plat].titles.length < 5) {
      map[plat].titles.push(s.title);
    }
  }
  return map;
}

/**
 * 写入风格 brief.md
 *
 * @param {object} profile
 * @param {string} [dataDir]
 */
export function writeStyleBrief(profile, dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  const lines = [
    '# 写作风格画像（自动生成）',
    '',
    `更新于：${profile.updatedAt}`,
    `样本数：${profile.sampleCount}`,
    '',
    'Agent 写稿/改写前阅读本文件，模仿语气与结构，但不得编造事实。',
    '',
    '## 要点',
    '',
  ];
  for (const tip of profile.tips || []) {
    lines.push(`- ${tip}`);
  }
  lines.push('', '## 均值', '');
  lines.push('```json');
  lines.push(JSON.stringify(profile.averages || {}, null, 2));
  lines.push('```');
  if ((profile.recentTitles || []).length) {
    lines.push('', '## 近期标题', '');
    for (const t of profile.recentTitles) {
      lines.push(`- ${t}`);
    }
  }
  if ((profile.recentOpenings || []).length) {
    lines.push('', '## 近期开头摘录', '');
    for (const o of profile.recentOpenings) {
      lines.push(`- ${o}`);
    }
  }
  if (profile.byPlatform && Object.keys(profile.byPlatform).length) {
    lines.push('', '## 分平台样本', '');
    for (const [plat, info] of Object.entries(profile.byPlatform)) {
      lines.push(`- **${plat}**：${info.count} 篇`);
    }
  }
  writeFileSync(p.briefMd, `${lines.join('\n')}\n`, 'utf8');
  writeFileSync(p.profileJson, JSON.stringify(profile, null, 2), 'utf8');
  return { briefMd: p.briefMd, profileJson: p.profileJson };
}

/**
 * 收录一篇文章到风格库
 *
 * @param {object} input
 * @returns {object}
 */
export function ingestStyleSample(input) {
  const dataDir = input.dataDir || getDataDir();
  const p = ensureMemoryDirs(dataDir);
  const title = String(input.title || '').trim() || 'untitled';
  const markdown = String(input.markdown || '').trim();
  if (!markdown) {
    throw new Error('正文为空');
  }
  const features = extractStyleFeatures(title, markdown);
  const id = `st_${Date.now().toString(36)}`;
  const meta = {
    id,
    at: new Date().toISOString(),
    title,
    platform: input.platform || null,
    source: input.source || 'ingest',
    features,
  };
  const samplePath = join(p.samplesDir, `${id}.json`);
  writeFileSync(
    samplePath,
    JSON.stringify({ ...meta, markdown }, null, 2),
    'utf8',
  );
  const profile = rebuildStyleProfile(dataDir);
  return { meta, samplePath, profile };
}

/**
 * 读取 samples 并重建画像
 *
 * @param {string} [dataDir]
 * @returns {object}
 */
export function rebuildStyleProfile(dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  const samples = [];
  if (existsSync(p.samplesDir)) {
    for (const name of readdirSync(p.samplesDir)) {
      if (!name.endsWith('.json')) {
        continue;
      }
      try {
        const raw = JSON.parse(
          readFileSync(join(p.samplesDir, name), 'utf8'),
        );
        samples.push(raw);
      } catch {
        // skip
      }
    }
  }
  samples.sort((a, b) => {
    return String(b.at || '').localeCompare(String(a.at || ''));
  });
  const profile = aggregateStyleProfile(samples.slice(0, 80));
  writeStyleBrief(profile, dataDir);
  return profile;
}

/**
 * @param {string} [dataDir]
 * @returns {Record<string, object>}
 */
export function loadRuleFingerprints(dataDir = getDataDir()) {
  const p = memoryPaths(dataDir);
  if (!existsSync(p.rulesFingerprints)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(p.rulesFingerprints, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * @param {Record<string, object>} map
 * @param {string} [dataDir]
 */
export function saveRuleFingerprints(map, dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  writeFileSync(p.rulesFingerprints, JSON.stringify(map, null, 2), 'utf8');
}

/**
 * 记录一次「触发平台规则」的实战教训（改写/发布时召回）
 *
 * @param {object} input
 * @returns {object}
 */
export function recordPlatformRule(input) {
  const dataDir = input.dataDir || getDataDir();
  const p = ensureMemoryDirs(dataDir);
  const trigger = String(input.trigger || input.error || '').trim();
  const rule = String(input.rule || '').trim();
  if (!trigger && !rule) {
    throw new Error('缺少 --trigger 或 --rule');
  }
  const platform = String(input.platform || 'unknown');
  const category = RULE_CATEGORIES.includes(input.category)
    ? input.category
    : 'soft';
  const severity =
    input.severity === 'error' || input.severity === 'warn'
      ? input.severity
      : 'warn';
  const fp = fingerprintError(
    `${platform}:${category}:${trigger || rule}`,
  );
  const now = new Date().toISOString();
  const entry = {
    id: `pr_${Date.now().toString(36)}`,
    at: now,
    platform,
    variant: input.variant || null,
    category,
    severity,
    trigger: trigger || null,
    rule: rule || trigger,
    avoid: input.avoid || null,
    pattern: input.pattern || null,
    example: input.example || null,
    fingerprint: fp,
    status: input.status || 'open',
    source: input.source || 'manual',
  };
  appendJsonl(p.rulesJsonl, entry);

  const fps = loadRuleFingerprints(dataDir);
  const prev = fps[fp] || {
    fingerprint: fp,
    platform,
    category,
    count: 0,
    firstAt: now,
    sampleTrigger: entry.trigger,
    rule: entry.rule,
    avoid: null,
    pattern: null,
    severity,
  };
  prev.count = (prev.count || 0) + 1;
  prev.lastAt = now;
  prev.sampleTrigger = entry.trigger || prev.sampleTrigger;
  prev.rule = entry.rule || prev.rule;
  prev.category = category;
  prev.severity = severity;
  if (entry.avoid) {
    prev.avoid = entry.avoid;
  }
  if (entry.pattern) {
    prev.pattern = entry.pattern;
  }
  if (entry.variant) {
    prev.variant = entry.variant;
  }
  if (entry.status === 'resolved') {
    prev.status = 'resolved';
  } else if (!prev.status) {
    prev.status = 'open';
  }
  fps[fp] = prev;
  saveRuleFingerprints(fps, dataDir);
  rebuildRulesMarkdown(dataDir);
  return { entry, aggregate: prev, paths: p };
}

/**
 * 召回某平台已学习规则
 *
 * @param {object} [input]
 * @returns {object[]}
 */
export function recallPlatformRules(input = {}) {
  const dataDir = input.dataDir || getDataDir();
  const fps = loadRuleFingerprints(dataDir);
  const platform = input.platform;
  const rows = Object.values(fps)
    .filter((r) => {
      if (!platform) {
        return true;
      }
      return r.platform === platform || r.platform === '*';
    })
    .sort((a, b) => {
      return (b.count || 0) - (a.count || 0);
    });
  return rows.slice(0, input.limit ?? 50);
}

/**
 * 用已学习 pattern 对文稿做附加检查
 *
 * @param {object} input
 * @returns {{ errors: string[], warns: string[], matched: object[] }}
 */
export function applyLearnedRulePatterns(input) {
  const text = `${input.title || ''}\n${input.body || ''}`;
  const rules = recallPlatformRules({
    platform: input.platform,
    dataDir: input.dataDir,
    limit: 100,
  });
  const errors = [];
  const warns = [];
  const matched = [];
  for (const r of rules) {
    if (!r.pattern || r.status === 'resolved') {
      continue;
    }
    let re;
    try {
      re = new RegExp(r.pattern, 'i');
    } catch {
      continue;
    }
    if (!re.test(text)) {
      continue;
    }
    matched.push(r);
    const tip = r.avoid
      ? `${r.rule}（避免：${r.avoid}）`
      : r.rule || r.sampleTrigger;
    const msg = `[learned:${r.fingerprint}] ${tip}`;
    if (r.severity === 'error') {
      errors.push(msg);
    } else {
      warns.push(msg);
    }
  }
  return { errors, warns, matched };
}

/**
 * 重建 Agent 可读 learned.md
 *
 * @param {string} [dataDir]
 * @returns {string}
 */
export function rebuildRulesMarkdown(dataDir = getDataDir()) {
  const p = ensureMemoryDirs(dataDir);
  const rows = recallPlatformRules({ dataDir, limit: 200 });
  const lines = [
    '# 平台规则实战沉淀（自动生成）',
    '',
    `更新于：${new Date().toISOString()}`,
    '',
    '静态硬规则见 Skill `rules/platforms.json` 与 `references/platforms/rules-overview.md`。',
    '本文件为与平台实际交互中触发后沉淀的规则；写稿/check/publish 前必读目标平台条目。',
    '',
  ];
  if (rows.length === 0) {
    lines.push('_暂无实战规则。用 `memory.mjs rules record` 追加。_');
  } else {
    const byPlatform = new Map();
    for (const r of rows) {
      const key = r.platform || 'unknown';
      if (!byPlatform.has(key)) {
        byPlatform.set(key, []);
      }
      byPlatform.get(key).push(r);
    }
    for (const [plat, list] of byPlatform) {
      lines.push(`## ${plat}`);
      lines.push('');
      for (const r of list) {
        lines.push(
          `### ${r.fingerprint} ×${r.count} [${r.category}/${r.severity || 'warn'}]`,
        );
        lines.push('');
        lines.push(`- 状态：${r.status || 'open'}`);
        if (r.sampleTrigger) {
          lines.push(`- 触发原文：${r.sampleTrigger}`);
        }
        lines.push(`- 规则：${r.rule}`);
        if (r.avoid) {
          lines.push(`- 避免写法：${r.avoid}`);
        }
        if (r.pattern) {
          lines.push(`- 检测 pattern：\`${r.pattern}\``);
        }
        if (r.passCount) {
          lines.push(`- 发布通过计数：${r.passCount}`);
        }
        lines.push(`- 最近：${r.lastAt || r.firstAt}`);
        lines.push('');
      }
    }
  }
  writeFileSync(p.rulesMd, `${lines.join('\n')}\n`, 'utf8');
  return p.rulesMd;
}

/**
 * 从 ~/.seedcast contents 表导入样本
 *
 * @param {object} [opts]
 * @returns {object}
 */
export function importStyleFromContentsDb(opts = {}) {
  const dataDir = opts.dataDir || getDataDir();
  const limit = opts.limit ?? 40;
  const dbPath = join(dataDir, 'db', 'seedcast.sqlite');
  if (!existsSync(dbPath)) {
    return {
      imported: 0,
      profile: rebuildStyleProfile(dataDir),
      note: '无 contents 库，仅重建现有 samples',
    };
  }

  let Database;
  try {
    const require = createRequire(
      join(__dirname, '../../../../code/packages/publish-core/package.json'),
    );
    Database = require('better-sqlite3');
  } catch {
    return {
      imported: 0,
      profile: rebuildStyleProfile(dataDir),
      note: '无法加载 better-sqlite3，跳过 DB 导入',
    };
  }

  const db = new Database(dbPath, { readonly: true });
  let rows = [];
  try {
    rows = db
      .prepare(
        `SELECT title, markdown, content_type, updated_at
         FROM contents
         WHERE markdown IS NOT NULL AND length(trim(markdown)) > 20
         ORDER BY updated_at DESC
         LIMIT ?`,
      )
      .all(limit);
  } catch (err) {
    db.close();
    return {
      imported: 0,
      profile: rebuildStyleProfile(dataDir),
      note: `读 contents 失败: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  db.close();

  let imported = 0;
  for (const row of rows) {
    ingestStyleSample({
      dataDir,
      title: row.title,
      markdown: row.markdown,
      platform: row.content_type || 'article',
      source: 'contents-db',
    });
    imported += 1;
  }
  return {
    imported,
    profile: rebuildStyleProfile(dataDir),
    note: `从 contents 导入 ${imported} 篇`,
  };
}
