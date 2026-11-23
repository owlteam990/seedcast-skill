# YouTube

## 体裁

- 视频上传（默认 `private`；可选 unlisted/public）

## 绑定

```bash
node scripts/accounts.mjs add --platform youtube --name "频道" \
  --client-id ... --client-secret ... --refresh-token ...
```

官方 Data API v3（OAuth 2.0 refresh_token）。

## 发布

```bash
node scripts/publish.mjs --platform youtube --account <id> \
  --title "..." --video-file ./clip.mp4 [--privacy private]
```

## 检查清单

- [ ] 本地视频存在且 ≤512MB  
- [ ] 凭证可刷新 token  
