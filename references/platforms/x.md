# X（Twitter）

## 体裁

- 短帖：标题 + 正文压成 ≤280 字（可用 `--text` 覆盖）

## 绑定

```bash
node scripts/accounts.mjs add --platform x --name "主号" \
  --apikey ... --apisecret ... \
  --access-token ... --access-token-secret ...
```

官方 API（OAuth 1.0a），需开发者 App「Keys and tokens」。

## 检查清单

- [ ] 凭证校验通过（`accounts check`）  
- [ ] 文案非空且符合长度  
