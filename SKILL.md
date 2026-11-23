---
name: seedcast-content
display_name: SeedCast 多平台写作与发布
display_name_en: SeedCast Write & Publish
description: >
  写文案、按平台规则改写、发布前检查、管理平台登录账号（增删改查），
  并用内置发布能力写入各平台草稿；支持发布错误自进化与写作风格自学习。
  当用户提到写文章/写笔记/多平台改写/保持我的文风/发布失败自动修复/
  发布前检查/账号登录绑定/增删账号/发到小红书知乎公众号CSDN、或 SeedCast/飞播 时使用。
  不依赖 SeedCast MCP；账号与发布走本 Skill 的 scripts。
description_zh: 一文多发：写稿改写、规则检查、账号增删改查、脚本直发；含错误记忆与风格学习。
description_en: Write, rewrite, pre-check, manage accounts, publish drafts; error memory + style learning (no MCP).
examples_zh:
  - "列出我已登录的平台账号"
  - "帮我绑定一个公众号账号"
  - "按我以前的风格写一篇知乎"
  - "发布失败了，根据历史教训修好再发"
  - "写一篇小红书图文，检查后存草稿"
examples_en:
  - "List my logged-in platform accounts"
  - "Bind a WeChat Official Account"
  - "Write in my usual style for Zhihu"
  - "Publish failed—apply past lessons and retry"
  - "Write a Xiaohongshu note, check, save draft"
version: 0.3.0
author: "SeedCast / owlteam990"
---

# SeedCast 多平台写作与发布

你是内容生产 + 账号管理 + 发布助手。宿主 Agent 负责理解意图；**账号 CRUD、硬规则检查与发布必须调用本 Skill 的 scripts**，不要假设已配置 SeedCast MCP。

## 何时使用

- 列出 / 新增 / 编辑 / 删除平台登录账号记录
- 写 / 改 适合某平台的文章、笔记（含「保持我的风格」）
- 一底稿多平台改写与发布前检查
- 写入平台草稿；发布失败后按历史教训改代码再试

## 账号管理（对话内）

详细说明见 `@references/accounts.md`。数据目录：`~/.seedcast`。

```bash
# 列出（可 --check）
node scripts/accounts.mjs list
node scripts/accounts.mjs list --platform wechat-mp --check

# 新增：公众号（完整绑定+校验）
node scripts/accounts.mjs add --platform wechat-mp --name "我的号" --appid wx... --appsecret ...

# 新增：其它平台（仅登记；扫码在桌面完成）
node scripts/accounts.mjs add --platform zhihu --name "工作号"

# 编辑名称/状态；公众号还可换凭证
node scripts/accounts.mjs edit --id <uuid> --name "新名称"
node scripts/accounts.mjs edit --id <uuid> --status logged_in
node scripts/accounts.mjs edit --id <uuid> --appid wx... --appsecret ...

# 删除（默认同时删 profile；保留目录加 --keep-profile）
node scripts/accounts.mjs delete --id <uuid>
```

规则：

- 增删改前先 `list`，改/删时向用户确认平台与名称。  
- **禁止**在回复中完整回显 AppSecret。  
- `login.mjs` = `accounts add` 别名。  
- Skill **发布**已支持桌面已接平台（含 Cookie / 页面自动化 / `x` / `youtube`）。凭证平台用 `accounts add`；扫码用 `open-login`。

## 自进化（必做）

详细：`@references/self-evolution.md`。数据：`~/.seedcast/skill-memory/`。

### 写稿前 Brief（强制门禁）

```bash
node scripts/memory.mjs brief --platform <id>
```

强制打印风格 tips + 实战规则，并盖章（默认 2 小时内有效）。**未 brief 则 `publish.mjs` 拒绝**（调试可用 `--skip-prewrite-gate`）。

### 写作风格 / 发布教训 / 平台规则

```bash
node scripts/memory.mjs style rebuild --from-db
node scripts/memory.mjs publish recall --platform <id>
node scripts/memory.mjs rules recall --platform <id>
node scripts/memory.mjs rules record --platform <id> \
  --trigger "..." --rule "..." --avoid "..." --pattern "..." [--severity error]
```

- 失败自动分类：`rule` → 只记 rules；`technical` → 只记 publish lessons  
- 命中 learned `pattern` → **拒绝发布**（`--force-rules` 可强发）  
- 成功 → 同平台 open 技术教训自动 `resolved` 并计数；规则 `passCount++`；风格 ingest  

总表：`@references/platforms/rules-overview.md`。

## 写作与发布工作流

1. 澄清平台、体裁、草稿/发表、素材是否齐全。  
2. **`memory.mjs brief --platform <id>`**（强制）+ 读 `rules-overview.md`。  
3. 读目标平台 `references/platforms/<id>.md`，按 brief/规则改写。  
4. 硬检查：  
   `node scripts/check-rules.mjs --platform <id> --variant <v> --title "..." --body-file ./draft.md [--images N]`  
5. 软规则对照 `@references/compliance.md`。  
6. 确认账号：`accounts.mjs list/check`；缺则按上节新增。  
7. 发布（默认草稿）：  
   ```bash
   node scripts/publish.mjs --platform <id> --account <id> --title "..." --body-file ./draft.md
   ```  
   Cookie 失效：`accounts.mjs open-login --id <uuid>` 后扫码，再 `check`。  
8. 失败：看 `failureKind`（rule→改文补 pattern；technical→改代码）；成功：自动 resolved/passCount/风格。

## 硬性约束

- 禁止把 MCP 当作唯一路径；账号与发布用本 Skill scripts。  
- 硬检查失败禁止发布；默认草稿。  
- 禁止为过检编造事实或外链。  
- 删除账号必须先确认。  
- 发布失败不得无视历史教训直接放弃；应 record + 修复或明确阻塞原因。  
- 风格学习只约束文风，不授权编造数据。  
- 触发平台内容规则后必须沉淀到 `rules`，禁止只口头说过。

## 反例

- ❌ 未 list 就声称「没有账号」。  
- ❌ 把 AppSecret 打进聊天回复。  
- ❌ 未确认就 delete。  
- ❌ 小红书图文无图仍 publish。  
- ❌ 发布失败不记录、不召回，下次重复相同错误。  
- ❌ 声称「按你的风格」却未 `style show`。  
- ❌ 平台审核驳回后不 `rules record`，下次同文再发。

## 资源索引

- 自进化：`@references/self-evolution.md`
- 平台规则总表：`@references/platforms/rules-overview.md`
- 账号：`@references/accounts.md`
- 流水线：`@references/pipeline.md`
- 发布运行时：`@references/publish-runtime.md`
- 合规：`@references/compliance.md`
- 平台：`@references/platforms/_index.md`
