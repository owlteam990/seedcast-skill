# 自进化：发布教训 + 写作风格 + 平台规则

数据目录：`~/.seedcast/skill-memory/`（可用 `SEEDCAST_DATA_DIR` 覆盖根目录）。

## 0. 写稿前 Brief（强制）

```bash
node scripts/memory.mjs brief --platform zhihu
```

- stderr 打印风格 tips / 近期开头 + 该平台实战规则  
- 写入 `prewrite-stamp.json`（默认 **2 小时**内 `publish.mjs` 认可）  
- 未盖章或过期 / 平台不一致 → publish 报 `PREWRITE_GATE`  
- 调试：`publish.mjs --skip-prewrite-gate`

## 1. 发布错误自进化（技术类）

```bash
node scripts/memory.mjs publish recall --platform douyin
node scripts/memory.mjs publish record --platform douyin \
  --error "..." --fix "..." --code-hint "path:hint" [--resolved]
```

- **失败时**：`classifyPublishFailure` → `technical` 只写入 publish lessons  
- **成功时**：同平台 open 教训自动 `status=resolved`，`successCount` / `resolvedCount++`  
- Agent 仍应补 `fix`/`codeHint` 便于下次召回可读  

可读：`~/.seedcast/skill-memory/publish/lessons.md`

### 「改代码」边界

- 优先改 `@seedcast/publish-core` 或平台 notes  
- 禁止为过检伪造内容；禁止绕过登录/验证码  

## 2. 写作风格自学习

```bash
node scripts/memory.mjs style show          # brief 已含 tips，可选用
node scripts/memory.mjs style rebuild --from-db
node scripts/memory.mjs style ingest --title "..." --body-file ./draft.md
```

- **写前**：经 `brief` 强制看到 tips  
- **发成功**：`publish.mjs` 自动 ingest  

可读：`~/.seedcast/skill-memory/style/brief.md`

## 3. 平台规则实战沉淀

静态总表：`references/platforms/rules-overview.md` + `rules/platforms.json`。

```bash
node scripts/memory.mjs rules recall --platform xiaohongshu
node scripts/memory.mjs rules record --platform xiaohongshu \
  --trigger "..." --rule "..." --avoid "..." --pattern "..." \
  --category content_policy --severity error
```

- **失败时**：分类为 `rule` → 只写入 rules（粗记 trigger）；Agent 补 avoid/pattern  
- **check-rules / publish**：命中 pattern → **拒绝**（publish 退出码 1，`RULE_PATTERN_BLOCK`）  
- 强发：`--force-rules`  
- **成功时**：规则不自动 resolved（继续拦下次），仅 `passCount++`  

可读：`~/.seedcast/skill-memory/rules/learned.md`

## 4. 失败自动分类

| kind | 特征（示例） | 写入 |
|---|---|---|
| rule | 违规/审核/限流/字数/配图/导流/policy… | `rules` |
| technical | cookie/选择器/timeout/5xx/默认其它 | `publish lessons` |

## 5. 流水线

```
memory brief --platform
  → 写/改 → check-rules（静态+pattern）
  → publish（门禁+pattern 拒绝）
        ├─ 失败 rule → rules record → 改文
        ├─ 失败 technical → publish record → 改代码
        └─ 成功 → auto-resolved 计数 + rules passCount + style ingest
```
