# 各平台规则总表（静态基线）

硬数字以 `rules/platforms.json` 为准（`check-rules.mjs`）。  
本表汇总**写作/改写/发布前**必读约束；与平台实战冲突时，以实战沉淀为准并写入：

```bash
node scripts/memory.mjs rules record --platform <id> --trigger "平台提示原文" --rule "抽象规则" [--avoid "..."] [--pattern "..."]
node scripts/memory.mjs rules recall --platform <id>
```

可读文件：`~/.seedcast/skill-memory/rules/learned.md`。

---

## 速查表

| 平台 | variant | 标题上限 | 正文 | 配图 | Skill 默认 | 特别注意 |
|---|---|---|---|---|---|---|
| wechat-mp | article | 64 | ≤5万；摘要≤120；作者≤8 | 封面建议 900×383 | 草稿 | 外链看账号类型；正式群发后台确认 |
| xiaohongshu | imageText | 20 | ≤1000 | ≥1 本地图 | 草稿 | 忌硬导流外链/联系方式；话题 ≤10 |
| xiaohongshu | article | 64 | 不强制最短 | 不强制 | 草稿 | 需开通「写长文」 |
| zhihu | article | 100 | 非空 | 封面可选 | 草稿 | 少营销腔；不做「回答某问题 ID」 |
| zhihu | pin | 无 | ≤2000 | 0 | （桌面） | Skill 暂未接想法 |
| zhihu | question | 50 | ≤5000 | — | — | 仅提问体裁 |
| csdn | draft | 100 | 非空 | 0 | 草稿 | 技术结构+代码块；标签勿堆砌 |
| jianshu | draft | 50 | 非空 | 0 | 草稿 | **9902=账号冻结**；需有文集 |
| baijiahao | draft | 64 | 非空 | 0 | 草稿 | 后台确认发表 |
| toutiao | draft | 64 | 非空 | 封面可选 | 草稿 | 禁止假成功 `pgc_id=0` |
| weibo | draft | 64 | 非空 | 0 | 草稿 | 头条文章草稿；会话易失效 |
| bilibili | draft | 80 | 非空 | 0 | 草稿 | 专栏；`--tid` 默认 4 |
| douyin | article | 64 | 建议≥20 | 0 | 草稿 | UI 改版频繁；暂存离开 |
| douyin | imageText | 55 | 短文案 | ≥1 本地图 | 草稿 | 必须本地图 |
| x | post | — | 标题+正文压 ≤280 | 0 | 发帖 | OAuth 1.0a；可用 `--text` |
| youtube | video | — | 描述可空 | 视频文件 | private | ≤512MB；OAuth refresh |

---

## 通用软规则（全平台）

详见 `references/compliance.md`：

- 避免极限词、震惊体、标题党、未标注医疗/投资建议  
- 禁止同质化只改标题多发  
- 不编造事实与外链  

---

## 按平台改写要点（摘要）

### 微信公众号
开头三节内给价值点；小标题分层；摘要独立写。

### 小红书
图文短口语可扫读；长文可千字；优先站内话题。

### 知乎
论证清晰、小标题；话题 1～3；忌营销腔。

### CSDN
背景→方案→步骤/代码→坑点→总结；代码标明语言。

### 简书
中长叙事完整；注意冻结态 9902。

### 百家号 / 头条 / 微博
资讯或观点向标题；HTML 由 Markdown 转换；发表后台确认。

### B站专栏
科普/资讯；分区 tid 合理。

### 抖音
文章略长于图文；图文强依赖配图。

### X
极短；单帖信息密度高。

### YouTube
标题+描述服务检索；隐私默认 private。

---

## 实战规则如何沉淀

与平台交互时出现审核驳回、限流提示、字数/配图拦截、账号策略错误等：

1. **立刻记录**（`publish.mjs` 若识别为规则类错误会自动记一条；Agent 应补全 `rule`/`avoid`/`pattern`）  
2. **改写阶段召回** `rules recall`，按 `avoid` 改文  
3. **可检测则加 `--pattern`**，使下次 `check-rules` 自动 warn/error  
4. 规则确认过时后 `--resolved`  

流水线：

```
rules recall + rules-overview → 写/改 → check-rules（含 learned pattern）
  → publish recall → publish →（规则类失败）rules record → 改文/改码重试
```
