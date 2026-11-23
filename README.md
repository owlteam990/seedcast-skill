# SeedCast Skill（飞播 · 多平台写作与发布）

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-owlteam990%2Fseedcast--skill-181717?logo=github)](https://github.com/owlteam990/seedcast-skill)
[![Desktop](https://img.shields.io/badge/Desktop-owlteam990%2Fseedcast-0A7-?logo=github)](https://github.com/owlteam990/seedcast)

开源 Agent Skill：在 Cursor / WorkBuddy / Qoder 等对话里完成  
**写稿 → 按平台改写 → 规则检查 → 写入各平台草稿**，不依赖 SeedCast MCP。

- **本仓库**：https://github.com/owlteam990/seedcast-skill  
- **桌面端（同源发布）**：https://github.com/owlteam990/seedcast  

---

## 合作与联系

欢迎体验反馈、平台适配共建、上架渠道合作。

| 方式 | 联系 |
|---|---|
| **微信** | `brightwise2020` |
| **GitHub** | [@owlteam990](https://github.com/owlteam990) |

加好友请备注「SeedCast Skill」。

---

## 能做什么

| 能力 | 说明 |
|---|---|
| 多平台写改 | 按平台体裁与语气改写，硬规则脚本校验 |
| 账号管理 | `accounts.mjs` 增删改查；扫码 / AppID / OAuth |
| 一键草稿 | `publish.mjs` → `@seedcast/publish-core`，数据目录 `~/.seedcast` |
| 自进化 | 写稿前 brief；失败自动分类；风格学习；规则 pattern 拒发 |

### 已支持平台（草稿优先）

微信公众号 · 知乎 · CSDN · 简书 · 百家号 · 今日头条 · 微博 · B站 · 抖音 · 小红书 · X · YouTube · 博客园  

规则总表：[`references/platforms/rules-overview.md`](./references/platforms/rules-overview.md)

---

## 本仓（multipublisher）布局

完整 Skill 包在 `skill/seedcast-content/`；上架 / 独立仓库内容与之对应。  
独立仓库：https://github.com/owlteam990/seedcast-skill

## 目录

```
.
├── README.md
├── LICENSE                 # Apache-2.0
├── SKILL.md                # Agent 入口
├── references/             # 平台规则、自进化、合规
├── rules/platforms.json    # 硬规则
├── scripts/                # accounts / check-rules / publish / memory
└── templates/
```

---

## 快速开始

### 1. 安装到 Agent

将本仓库克隆到宿主 skills 目录，确保能加载 `SKILL.md`。

```bash
git clone https://github.com/owlteam990/seedcast-skill.git
```

### 2. 准备发布运行时

发布依赖 SeedCast 的 `@seedcast/publish-core`（与桌面同源）：

```bash
git clone https://github.com/owlteam990/seedcast.git
cd seedcast/code
pnpm install
pnpm --filter @seedcast/publish-core build
```

推荐把 Skill 放在桌面仓库的 `skill/seedcast-content/` 下联调（相对路径可自动找到 `publish-core`）。  
数据目录默认 `~/.seedcast`，可用 `SEEDCAST_DATA_DIR` 覆盖。

### 3. 常用命令

在本仓库根目录执行：

```bash
# 写稿前强制 brief（风格 + 规则盖章，2h 内 publish 有效）
node scripts/memory.mjs brief --platform zhihu

# 账号
node scripts/accounts.mjs list
node scripts/accounts.mjs add --platform wechat-mp --name "我的号" --appid wx... --appsecret ...
node scripts/accounts.mjs open-login --id <uuid>

# 硬规则检查
node scripts/check-rules.mjs --platform xiaohongshu --variant imageText \
  --title "标题" --body-file ./draft.md --images 1

# 发布草稿
node scripts/publish.mjs --platform zhihu --account <id> \
  --title "标题" --body-file ./draft.md
```

自进化说明：[`references/self-evolution.md`](./references/self-evolution.md)

---

## 设计原则

1. **不依赖 MCP**：账号与发布走本仓库 `scripts/`。  
2. **Agent 写改，脚本发与硬校验**：字数/配图用 `check-rules`；软合规见 `references/compliance.md`。  
3. **与桌面同源**：会话与发布来自 SeedCast，数据默认 `~/.seedcast`。  
4. **默认草稿**：正式发表由用户在平台后台确认。

---

## 上架目标

- [WorkBuddy 开放平台 · 技能](https://open.workbuddy.cn/docs/skill)
- [Qoder Marketplace](https://qoder.com/zh/marketplace)

---

## 许可证

[Apache License 2.0](./LICENSE) — 可商用，保留版权与变更声明。

---

## 相关链接

- Skill：https://github.com/owlteam990/seedcast-skill  
- 桌面 SeedCast：https://github.com/owlteam990/seedcast  
- 合作微信：`brightwise2020`
