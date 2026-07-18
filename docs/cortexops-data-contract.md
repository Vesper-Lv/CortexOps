# CortexOps 数据契约

## 用途

这份文档是 `CortexOps` 与 `CortexOps-web-workbench` 之间的稳定接口。

以后无论在哪个项目里开新任务，agent 都应先读取本文件，再改日报导入、Dashboard、INBOX、Library 或数据路径相关逻辑。

## 项目边界

| 项目 | 职责 |
|------|------|
| `/Users/jiexinlv/CortexOps` | 数据管道、日报生成、memory、pools、自动化脚本 |
| `/Users/jiexinlv/CortexOps-web-workbench` | Web 工作台、Dashboard、INBOX、Library、导入和展示 |

前后端保持分开，通过文件契约连接，不把两个项目合并。

## 正式输入面

Web 端只扫描：

```text
/Users/jiexinlv/CortexOps/state/daily/active
```

成功日报写入该目录，即视为进入 web 数据输入面。

## 忽略路径

Web 端不得扫描：

```text
/Users/jiexinlv/CortexOps/state/daily/backups
```

`backups/` 只保存历史成品、A/B test 副本、失败现场、重跑产物和人工备份，不参与当前 web 导入或 memory 路由。

## 每日成功态文件

成功状态下，`active/` 应包含当天这些文件：

```text
YYYY-MM-DD-report.md
YYYY-MM-DD-links.jsonl
YYYY-MM-DD-aihot-raw.json
YYYY-MM-DD-arxiv-raw.xml
YYYY-MM-DD-github-raw.json
YYYY-MM-DD-ingest-manifest.json
YYYY-MM-DD-ingest-ready.signal
```

`YYYY-MM-DD-ingest-error.md` 和 `YYYY-MM-DD-ingest-error.json` 只代表失败现场。当天补跑成功后，应从 `active/` 清除，必要时移入 `backups/`。

## 时间边界

- `2026-07-18` 是当前 web 数据积累起点。
- `2026-07-18` 之前的成品日报只作为备份，不参与当前 web 导入。
- `2026-07-18-report-A.md` 属于 A/B test 产物，应放入备份。

## Web 导入规则

Web 端导入时：

1. 只读取 `active/` 下当天的 `*-links.jsonl` 和 `*-report.md`。
2. 看到当天 `YYYY-MM-DD-report.md` 与 `YYYY-MM-DD-links.jsonl` 即可视为日报导入完成。
3. 不读取 `backups/`。
4. 不把 `ingest-error` 当成成功数据。
5. 周报和回溯优先读 Library，不依赖 Dashboard 历史残留。

## links.jsonl 核心字段

前端展示和交互至少应识别这些字段：

```text
id
date
title
original_url
source_url
source_origin
source_name
published_at
priority
reading_pack_status
suggested_pool
human_status
final_pool
duplicate_status
content_tags
read_reason
focus_direction
priority_rationale
pool_rationale
display_summary
```

`suggested_pool` 是 AI 建议，`final_pool` 才是人工确认后的最终去向。`human_status` 默认可能是 `pending`。

## 变更纪律

任何会影响前端导入或展示的数据变更，都必须同步更新两处文档：

```text
/Users/jiexinlv/CortexOps/docs/cortexops-data-contract.md
/Users/jiexinlv/CortexOps-web-workbench/docs/cortexops-data-contract.md
```

如果代码与本文冲突，以本文为目标契约，随后修正代码。
