# 平台账号管理（Agent 对话）

账号写入 **`~/.seedcast`**，与 SeedCast 桌面共用。Agent 通过 `scripts/accounts.mjs` 增删改查。

## 命令

| 操作 | 命令 |
|---|---|
| 列出 | `node scripts/accounts.mjs list [--platform <id>] [--check]` |
| 新增 | `node scripts/accounts.mjs add --platform <id> --name "..."` |
| 编辑 | `node scripts/accounts.mjs edit --id <uuid> [--name] [--status]` |
| 删除 | `node scripts/accounts.mjs delete --id <uuid>` |
| 检测 | `node scripts/accounts.mjs check --id <uuid>` |
| 打开登录页 | `node scripts/accounts.mjs open-login --id <uuid>`（非公众号） |

`login.mjs` 是 `accounts add` 的别名。

## 公众号（可完整登录）

```bash
node scripts/accounts.mjs add --platform wechat-mp --name "我的号" \
  --appid wx... --appsecret ...
# 改凭证
node scripts/accounts.mjs edit --id <uuid> --appid wx... --appsecret ...
```

勿在回复中回显完整 AppSecret。

## 其它平台（登记记录）

```bash
node scripts/accounts.mjs add --platform xiaohongshu --name "本地号"
```

仅创建 SQLite 记录 + profile 目录；**扫码登录请在桌面端该插件下完成**。可用 `--status logged_in` 标记（用户确认已在桌面登录后）。

## 删除

```bash
node scripts/accounts.mjs delete --id <uuid>
# 只删库、保留 profile：
node scripts/accounts.mjs delete --id <uuid> --keep-profile
```

删除前向用户确认平台与名称。
