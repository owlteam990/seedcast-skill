# 内容流水线

```
memory brief --platform（强制盖章）
  → 素材 → 底稿 → 改写 → check-rules（静态 + pattern）
  → 软规则 → accounts → publish（无 brief / 命中 pattern 则拒）
        ├─ 失败 technical → 自动记 lessons → 改代码重试
        ├─ 失败 rule → 自动记 rules → 改文重试
        └─ 成功 → lessons auto-resolved 计数 + rules passCount + style ingest
```

## 产物约定

每次改写至少产出：

1. `title`  
2. `body`（Markdown）  
3. `platform` + `variant`  
4. `settings` 建议（话题、封面路径、作者、摘要等）  
5. `assets`（本地图片路径列表）  
6. `rewriteNotes`（相对底稿的变更说明）  
7. （可选）对照风格画像的说明

## 检查与发布顺序

必须先 `check-rules` 通过（无 error），再 `publish`。  
`warn` 项展示给用户；用户未表态时默认不发布。  
发布前 `memory publish recall`；失败后必须留痕并尝试修复。详见 `self-evolution.md`。
