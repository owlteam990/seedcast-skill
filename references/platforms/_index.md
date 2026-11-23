# 平台规则索引

1. **总表（优先）**：[`rules-overview.md`](./rules-overview.md)  
2. **硬数字**：`rules/platforms.json`（`check-rules.mjs`）  
3. **实战沉淀**：`memory.mjs rules recall` → `~/.seedcast/skill-memory/rules/learned.md`  
4. **分平台细则**：下表对应文件  

| pluginId | 文件 | 常见 variant |
|---|---|---|
| wechat-mp | `wechat-mp.md` | article |
| xiaohongshu | `xiaohongshu.md` | imageText / article |
| zhihu | `zhihu.md` | article / pin / question |
| csdn | `csdn.md` | draft |
| jianshu | `jianshu.md` | draft |
| baijiahao | `baijiahao.md` | draft |
| toutiao | `toutiao.md` | draft |
| weibo | `weibo.md` | draft |
| bilibili | `bilibili.md` | draft |
| douyin | `douyin.md` | article / imageText |
| x | `x.md` | post |
| youtube | `youtube.md` | video |
| cnblogs | `cnblogs.md` | draft |

未列出的平台：先查 SeedCast `code/plugins/<id>/NOTES.md`，再补本目录、总表与 `platforms.json`。
