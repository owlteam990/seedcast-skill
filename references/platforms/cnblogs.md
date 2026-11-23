# 博客园（cnblogs）

## 登录方式（二选一）

### A. Cookie（推荐，与 CSDN 类似）

```bash
node scripts/accounts.mjs add --platform cnblogs --name "我的博客园"
node scripts/accounts.mjs open-login --id <uuid>
# 浏览器登录后关闭窗口
node scripts/accounts.mjs check --platform cnblogs
```

- 登录页：https://account.cnblogs.com/signin
- 会话探测：`GET https://account.cnblogs.com/user/userinfo`
- **发草稿前必须已开通博客**（userinfo 中 `blogApp` 非空）。未开通：https://account.cnblogs.com/blog-apply

### B. MetaWeblog 访问令牌

- 端点：`https://rpc.cnblogs.com/metaweblog/<博客名>`
- 启用：https://i.cnblogs.com/settings#enableServiceAccess（勾选「博客客户端访问」并复制 **访问令牌**）

```bash
node scripts/accounts.mjs add --platform cnblogs --name "我的博客" \
  --username <登录名> --token <访问令牌> --blog-name <博客名>
```

- `blog-name`：取自 MetaWeblog 访问地址，如 `https://rpc.cnblogs.com/metaweblog/owlteam` → `owlteam`（也等于 `www.cnblogs.com/<blog>/`）

## 发布

```bash
node scripts/publish.mjs --platform cnblogs --account <id> \
  --title "标题" --markdown-file ./article.md
```

- 默认写**草稿**（不公开）
- Cookie：`POST https://i.cnblogs.com/api/posts` + `x-xsrf-token`
- MetaWeblog：`newPost` 且 `publish=false`；自动加 `[Markdown]`
- 回执编辑页：`https://i.cnblogs.com/articles/edit;postid={id}`

## 选型说明

1. 官方 MetaWeblog / OpenAPI 可用，但个人常用 Cookie 后台写草稿更贴近桌面登录态
2. Cookie 路径参考社区适配器协议（自研实现，非拷贝 GPL 代码）
3. Cookie 优先；无 Cookie 或失败时若已绑令牌则回退 MetaWeblog

## 自测清单

- [ ] `accounts add` + `open-login` 后 `check` 为 sessionOk
- [ ] 已开通博客（blogApp 有值）
- [ ] `publish` 得到草稿编辑 URL
- [ ] （可选）MetaWeblog 令牌绑定后亦可发布
