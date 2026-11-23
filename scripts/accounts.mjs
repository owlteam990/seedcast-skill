#!/usr/bin/env node
/**
 * 平台账号 CRUD（写入 ~/.seedcast，供 Agent 对话调用）
 *
 *   node scripts/accounts.mjs list [--platform <id>] [--check]
 *   node scripts/accounts.mjs add --platform <id> --name "..." [--appid --appsecret] [--status]
 *   node scripts/accounts.mjs edit --id <uuid> [--name] [--status] [--appid --appsecret]
 *   node scripts/accounts.mjs delete --id <uuid> [--keep-profile]
 *   node scripts/accounts.mjs check --id <uuid> | --platform <id>
 *   node scripts/accounts.mjs open-login --id <uuid>   # 有头浏览器打开登录页
 */
import { loadPublishCore } from './lib/resolve-core.mjs';

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--check') {
      out.check = true;
    } else if (a === '--keep-profile') {
      out.keepProfile = true;
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
  node scripts/accounts.mjs list [--platform <id>] [--check]
  node scripts/accounts.mjs add --platform <id> --name "显示名" \\
    [--appid wx... --appsecret ...]   # wechat-mp
    [--apikey --apisecret --access-token --access-token-secret]  # x
    [--client-id --client-secret --refresh-token]  # youtube
    [--status unknown|logged_in|expired]
  node scripts/accounts.mjs edit --id <uuid> [--name ...] [--status ...] \\
    [--appid ... --appsecret ...]
  node scripts/accounts.mjs delete --id <uuid> [--keep-profile]
  node scripts/accounts.mjs check --id <uuid> | --platform <已支持平台>
  node scripts/accounts.mjs open-login --id <uuid>

数据目录：~/.seedcast。publishSupported 见 list；Cookie 用 open-login；x/youtube/wechat 用凭证。`);
}

async function enrichCheck(core, accounts, force) {
  if (!force) {
    return accounts;
  }
  const out = [];
  for (const acc of accounts) {
    const row = { ...acc };
    if (acc.pluginId === 'wechat-mp') {
      row.sessionOk = await core.checkWechatMpSession(acc);
    } else if (acc.pluginId === 'csdn') {
      row.sessionOk = await core.checkCsdnSession(acc);
    } else if (acc.pluginId === 'jianshu') {
      row.sessionOk = await core.checkJianshuSession(acc);
    } else if (acc.pluginId === 'baijiahao') {
      row.sessionOk = await core.checkBaijiahaoSession(acc);
    } else if (acc.pluginId === 'toutiao') {
      row.sessionOk = await core.checkToutiaoSession(acc);
    } else if (acc.pluginId === 'xiaohongshu') {
      row.sessionOk = await core.checkXhsSession(acc);
    } else if (acc.pluginId === 'zhihu') {
      row.sessionOk = await core.checkZhihuSession(acc);
    } else if (acc.pluginId === 'weibo') {
      row.sessionOk = await core.checkWeiboSession(acc);
    } else if (acc.pluginId === 'bilibili') {
      row.sessionOk = await core.checkBilibiliSession(acc);
    } else if (acc.pluginId === 'douyin') {
      row.sessionOk = await core.checkDouyinSession(acc);
    } else if (acc.pluginId === 'x') {
      row.sessionOk = await core.checkXSession(acc);
    } else if (acc.pluginId === 'youtube') {
      row.sessionOk = await core.checkYouTubeSession(acc);
    } else {
      row.sessionOk = null;
      row.sessionNote =
        '会话校验见 publishSupported；其它用 open-login 或桌面';
    }
    out.push(row);
  }
  return out;
}

async function cmdList(core, args) {
  const accounts = await enrichCheck(
    core,
    core.listAccounts(args.platform),
    Boolean(args.check),
  );
  print({
    ok: true,
    action: 'list',
    dataDir: core.getDefaultDataDir(),
    recordable: core.RECORDABLE_PLATFORMS,
    publishSupported: core.SUPPORTED_PLATFORMS,
    count: accounts.length,
    accounts,
  });
}

async function cmdAdd(core, args) {
  const platform = args.platform;
  const name = args.name;
  if (!platform) {
    fail('缺少 --platform');
  }
  if (!name) {
    fail('缺少 --name');
  }
  if (!core.isRecordablePlatform(platform)) {
    fail(`不可登记的平台: ${platform}`, {
      recordable: core.RECORDABLE_PLATFORMS,
    });
  }

  if (platform === 'wechat-mp') {
    if (!args.appid || !args.appsecret) {
      fail('wechat-mp 新增需 --appid 与 --appsecret');
    }
    const { account, loggedIn } = await core.bindWechatMpAccount({
      name,
      appid: args.appid,
      appsecret: args.appsecret,
    });
    print({
      ok: true,
      action: 'add',
      loggedIn,
      account,
      dataDir: core.getDefaultDataDir(),
      message: loggedIn
        ? '公众号凭证已校验并写入 ~/.seedcast'
        : '已写入但未校验通过',
    });
    return;
  }

  if (platform === 'x') {
    const apiKey = args.apikey || args['api-key'];
    const apiSecret = args.apisecret || args['api-secret'];
    const accessToken = args['access-token'] || args.accesstoken;
    const accessTokenSecret =
      args['access-token-secret'] || args.accesstokensecret;
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      fail(
        'x 新增需 --apikey --apisecret --access-token --access-token-secret',
      );
    }
    const { account, loggedIn } = await core.bindXAccount({
      name,
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret,
    });
    print({
      ok: true,
      action: 'add',
      loggedIn,
      account,
      dataDir: core.getDefaultDataDir(),
      message: 'X 凭证已校验并写入 ~/.seedcast',
    });
    return;
  }

  if (platform === 'youtube') {
    const clientId = args['client-id'] || args.clientid;
    const clientSecret = args['client-secret'] || args.clientsecret;
    const refreshToken = args['refresh-token'] || args.refreshtoken;
    if (!clientId || !clientSecret || !refreshToken) {
      fail(
        'youtube 新增需 --client-id --client-secret --refresh-token',
      );
    }
    const { account, loggedIn } = await core.bindYouTubeAccount({
      name,
      clientId,
      clientSecret,
      refreshToken,
    });
    print({
      ok: true,
      action: 'add',
      loggedIn,
      account,
      dataDir: core.getDefaultDataDir(),
      message: 'YouTube 凭证已校验并写入 ~/.seedcast',
    });
    return;
  }

  const status = args.status || 'unknown';
  if (!['unknown', 'logged_in', 'expired'].includes(status)) {
    fail('status 须为 unknown | logged_in | expired');
  }
  const account = core.registerAccount({
    pluginId: platform,
    name,
    status,
  });
  print({
    ok: true,
    action: 'add',
    account,
    dataDir: core.getDefaultDataDir(),
    message:
      '已登记账号。扫码：accounts open-login --id <uuid>；然后 accounts check / publish。',
  });
}

async function cmdEdit(core, args) {
  const id = args.id;
  if (!id) {
    fail('缺少 --id');
  }
  const existing = core.getAccount(id);
  if (!existing) {
    fail(`账号不存在: ${id}`);
  }

  if (existing.pluginId === 'wechat-mp' && (args.appid || args.appsecret)) {
    if (!args.appid || !args.appsecret) {
      fail('更新公众号凭证需同时提供 --appid 与 --appsecret');
    }
    const { account, loggedIn } = await core.updateWechatMpCredentials({
      accountId: id,
      appid: args.appid,
      appsecret: args.appsecret,
      name: args.name,
    });
    print({
      ok: true,
      action: 'edit',
      loggedIn,
      account,
      dataDir: core.getDefaultDataDir(),
      message: '公众号凭证已更新',
    });
    return;
  }

  if (!args.name && !args.status) {
    fail('请提供 --name 和/或 --status（公众号还可 --appid/--appsecret）');
  }
  if (args.status && !['unknown', 'logged_in', 'expired'].includes(args.status)) {
    fail('status 须为 unknown | logged_in | expired');
  }
  const account = core.updateAccount(id, {
    name: args.name,
    status: args.status,
  });
  print({
    ok: true,
    action: 'edit',
    account,
    dataDir: core.getDefaultDataDir(),
  });
}

async function cmdDelete(core, args) {
  const id = args.id;
  if (!id) {
    fail('缺少 --id');
  }
  const existing = core.getAccount(id);
  if (!existing) {
    fail(`账号不存在: ${id}`);
  }
  const deleted = core.deleteAccount(id, {
    purgeProfile: !args.keepProfile,
  });
  print({
    ok: deleted,
    action: 'delete',
    id,
    pluginId: existing.pluginId,
    name: existing.name,
    purgedProfile: !args.keepProfile,
    dataDir: core.getDefaultDataDir(),
  });
}

async function cmdOpenLogin(core, args) {
  const id = args.id;
  if (!id) {
    fail('缺少 --id');
  }
  const account = core.getAccount(id);
  if (!account) {
    fail(`账号不存在: ${id}`);
  }
  if (account.pluginId === 'wechat-mp') {
    fail('公众号请用 add/edit 绑定 AppID/AppSecret，无需扫码页');
  }
  const loginUrl =
    (core.PLATFORM_LOGIN_URLS && core.PLATFORM_LOGIN_URLS[account.pluginId]) ||
    args.url ||
    null;
  if (!loginUrl) {
    fail(`未配置登录 URL: ${account.pluginId}`, {
      known: Object.keys(core.PLATFORM_LOGIN_URLS || {}),
    });
  }
  const result = await core.openPlatformLogin({
    profileDir: account.profileDir,
    loginUrl,
  });
  print({
    ok: true,
    action: 'open-login',
    accountId: account.id,
    pluginId: account.pluginId,
    ...result,
  });
}

async function cmdCheck(core, args) {
  if (args.id) {
    const acc = core.getAccount(args.id);
    if (!acc) {
      fail(`账号不存在: ${args.id}`);
    }
    const [row] = await enrichCheck(core, [acc], true);
    print({ ok: true, action: 'check', account: row });
    return;
  }
  if (args.platform) {
    const accounts = await enrichCheck(
      core,
      core.listAccounts(args.platform),
      true,
    );
    print({
      ok: true,
      action: 'check',
      platform: args.platform,
      count: accounts.length,
      accounts,
    });
    return;
  }
  fail('check 需要 --id 或 --platform');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    usage();
    process.exit(0);
  }

  // 兼容旧用法：无子命令时当作 list
  let action = args._[0] || 'list';
  if (
    !args._[0] &&
    (args.platform || args.check) &&
    !args.id &&
    !args.name
  ) {
    action = 'list';
  }

  const core = await loadPublishCore();

  if (action === 'list') {
    await cmdList(core, args);
  } else if (action === 'add') {
    await cmdAdd(core, args);
  } else if (action === 'edit') {
    await cmdEdit(core, args);
  } else if (action === 'delete' || action === 'rm' || action === 'remove') {
    await cmdDelete(core, args);
  } else if (action === 'check') {
    await cmdCheck(core, args);
  } else if (action === 'open-login' || action === 'login-browser') {
    await cmdOpenLogin(core, args);
  } else {
    fail(`未知操作: ${action}`, {
      hint: 'list | add | edit | delete | check | open-login',
    });
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
