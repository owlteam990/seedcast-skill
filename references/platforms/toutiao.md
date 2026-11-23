# 今日头条

## 体裁

- `draft`：图文写入（优先 `save=0` 草稿；失败回退 `save=1` 提交）

## 改写要点

- 资讯/观点向标题；正文 Markdown → HTML  
- 封面可选（`--cover` / 正文首图 / 头像兜底）  
- 正式对外展示以头条后台为准；回执禁止 `pgc_id=0`

## 检查清单

- [ ] Cookie 有效（`accounts check --platform toutiao`）  
- [ ] 标题、正文非空  
- [ ] 回执 URL 含真实 `pgc_id`  
