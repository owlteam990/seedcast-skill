# 发布运行时（不依赖 MCP）

## 定位

发布走 **`@seedcast/publish-core`**（源码：`code/packages/publish-core`），由 Skill `scripts/*.mjs` 直接调用。

- ❌ 不要求 SeedCast 桌面端正在运行  
- ❌ 不要求配置 `seedcast-mcp`  
- ✅ 数据目录 **`~/.seedcast`**（与桌面共用账号与凭证）  
- ✅ 已支持发布：桌面已接平台全量迁入 Skill（含 `x` OAuth1 / `youtube` OAuth2；`weibo`/`bilibili` 待扫码补测）

## 脚本入口

| 脚本 | 作用 |
|---|---|
| `scripts/bootstrap.mjs` | 检测 Node / publish-core 是否已构建 |
| `scripts/check-rules.mjs` | 硬规则检查 |
| `scripts/accounts.mjs` | 账号 list / add / edit / delete / check |
| `scripts/login.mjs` | `accounts add` 别名 |
| `scripts/publish.mjs` | 调用 publish-core 写草稿 |

## 构建依赖

在仓库 `code/` 下：

```bash
pnpm install
pnpm --filter @seedcast/publish-core build
```

`scripts/lib/resolve-core.mjs` 会优先加载 monorepo 的 `dist/index.js`。

## 公众号示例

```bash
node scripts/accounts.mjs --platform wechat-mp
node scripts/publish.mjs --platform wechat-mp --account <id> \
  --title "标题" --body-file ./draft.md
```
