# AIhot Public API — CortexOps 采集契约

CortexOps 日报 automation 通过 AIhot REST API 获取 daily_discovery 主清单。
参考上游 Skill：https://github.com/KKKKhazix/khazix-skills/blob/main/aihot/SKILL.md

## 端点选择（CortexOps 默认）

日报 automation **默认不用** `/api/public/daily`（UTC 日切片成品）。
使用滚动窗口精选池：

```text
GET /api/public/items?mode=selected&since=<ISO8601 UTC>&take=50
```

`since` 默认：Asia/Shanghai 运行时「过去 24 小时」对应的 UTC ISO8601。
需要更多条目时用 `cursor` 翻页，串行请求，遵守 600 req/min。

## 强制 User-Agent

`/api/public/*` 必须带浏览器 UA，裸 curl 会被拒绝：

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
curl -sS -H "User-Agent: $UA" "https://aihot.virxact.com/api/public/items?mode=selected&take=5"
```

## API → CortexOps JSONL 映射

| API 字段 | JSONL 字段 | 规则 |
|----------|------------|------|
| `id` | `aihot_id` | 必填（AIhot 条目） |
| `summary` | `aihot_summary` | verbatim，禁止 agent 改写/压缩 |
| `summary` | `display_summary` | AIhot 条目与 aihot_summary 相同 |
| `url` | `original_url` | 一手来源 |
| `https://aihot.virxact.com/items/{id}` | `source_url` | AIhot item 页 |
| `source` | `source_name` | 如 OpenAI Blog |
| `category` | 内部 category 参考 | ai-models / ai-products / industry / paper / tip |
| `publishedAt` | `published_at` | ISO8601 |
| — | `source_origin` | `aggregator` |
| — | `source_role` | `daily_discovery` |
| — | `aihot_summary_status` | `verified` |

## 禁止行为

- 禁止裸 curl `https://aihot.virxact.com` 首页代替 API
- 禁止用 ai-bot.cn 或其他聚合站内容填入 `aihot_summary`
- 禁止无 `aihot_id` 时填写 `aihot_summary`
- 禁止在摘要中写「AIhot 摘要称…」除非 `aihot_summary_status=verified`

## API 不可用时的 fallback

1. report 必须披露：「AIhot API 不可用，今日未生成 AIhot 长清单」
2. 可用 Web/Chrome 或 GitHub/arXiv 补充，但不得伪造 AIhot 字段
3. 补充条目标 `source_origin: primary` 或 `community_index`，`aihot_summary` 为空

## 可选审计文件

`state/daily/active/YYYY-MM-DD-aihot-raw.json` — 保存 API 响应原文，便于 provenance 审计。

GitHub / arXiv supplemental raw：见 `docs/supplemental-prefetch-api.md`。
