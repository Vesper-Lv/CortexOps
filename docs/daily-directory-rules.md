# state/daily 目录规则

## 目标

把 `state/daily` 分成两类用途：

- **正式区**：服务当前 web 导入与当日工作流
- **备份区**：保存历史成品与实验产物，不再参与当前 web 导入

正式区采用“**目录即导入**”口径：当天成功产物写入 `state/daily/active/`，就视为已经进入 web 的数据输入面，不需要额外的同步脚本。
web 端的读取步骤就是扫描 `state/daily/active/` 下当天的文件；备份区不参与扫描。

## 时间边界

- **2026-07-18 是分界线**
- **2026-07-18 之前**的成品日报，统一视为备份
- **2026-07-18 及之后**的日报，才算当前 web 端的数据积累起点

## 正式区保留什么

正式区只保留当天需要使用的文件：

- `YYYY-MM-DD-report.md`
- `YYYY-MM-DD-links.jsonl`
- `YYYY-MM-DD-aihot-raw.json`
- `YYYY-MM-DD-arxiv-raw.xml`
- `YYYY-MM-DD-github-raw.json`
- `YYYY-MM-DD-ingest-manifest.json`
- `YYYY-MM-DD-ingest-ready.signal`

如果有 A/B 对比当天的正式产物，也只保留当天要比较的版本；比较结束后转入备份区。

## 备份区规则

备份区保存这些内容：

- **2026-07-18 之前**的所有成品日报
- `2026-07-18-report-A.md`
- 当天做 A/B test 产生、但不进入正式流程的报告或 links 文件
- 历史重跑产物、临时副本、人工保底备份
- `ingest-error` 仅在失败态保留；当天补跑成功后，从 `active/` 清除，必要时移入备份区

备份区中的文件**不参与 web 导入**，也**不作为当前 memory / 路由输入**。

## 目录建议

建议保留下面这两个逻辑区：

```text
state/daily/
  ├── active/
  │   └── 2026-07-18-*.*
  └── backups/
      └── 2026-07-17-or-before/
          └── ...
```

如果暂时不改脚本，也可以先继续使用平铺文件名，只把历史文件迁到 `backups/`。

## 处理原则

1. **当天文件留在正式区**
2. **成品日报只保留当前口径需要的版本**
3. **旧体系产物只做历史备份**
4. **`ingest-error` 只作为失败现场记录，成功后从 `active/` 删除**
5. **web 只读 `active/`，不扫备份区**
6. **不再需要单独的“导入 web”脚本**
7. **周报和回溯优先读 Library，不回头依赖 Dashboard 历史残留**

## 本次迁移口径

需要迁入备份区的典型文件：

- `state/daily/2026-07-18-report-A.md`
- `2026-07-18` 之前的所有成品日报
- 旧 A/B test 副本

保留在正式区的典型文件：

- `state/daily/active/2026-07-18-report.md`
- `state/daily/active/2026-07-18-links.jsonl`
- `state/daily/active/2026-07-18-ingest-manifest.json`
- `state/daily/active/2026-07-18-aihot-raw.json`

## 一句话版本

**18 号之前的成品日报都进备份；18 号起才算新数据积累；`report-A` 也进备份。**
