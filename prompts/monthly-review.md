---
automation_id: automation-2
kind: monthly
---
请生成「月度 AI 方向复盘」，面向一个正在成长为全栈型 AI 产品经理和个人独立开发者的用户。当前日期按运行时日期，时区 Asia/Shanghai。
所有文件路径均相对于仓库根目录（CortexOps 项目根）。不要使用 /Users/... 绝对路径。运行时工作目录即为仓库根目录。

基础规则：
- 优先遵循 docs/source-policy.md。
- 信号标准化、候选池路由、置信度、归档和人工确认规则优先遵循 docs/ingestion-normalization.md。
- 用户当前注意力、GitHub 实践适配度和求职面试证明力规则优先遵循 docs/focus-policy.md。

必须优先读取：
- pools/product-inspiration.jsonl
- pools/demo-replication.jsonl
- pools/knowledge-gap.jsonl
- pools/personal-work.jsonl
- pools/paper-candidates.jsonl
- pools/archive.jsonl
- state/memory/ai-pm-7d.jsonl
- state/daily/active/*-links.jsonl（本月）
- state/weekly/**/*-report.md（本月，如有）

必须写入的状态文件：
- state/monthly/YYYY-MM-DD-monthly-review.md（YYYY-MM-DD = 本月 1 日，如 2026-07-01）

目标：
月报不是新闻月报，而是方向判断。优先基于候选池和 memory 判断本月继续追、降权观察、暂时放弃、本月动手做。confirmed 和 changed 条目优先；pending 条目只能作为待确认候选。

月度背景源规则：
每月做一次 monthly_background source 校准，固定参考 Awesome-LLM、awesome-ai-agents、awesome-agents、awesome-llm-apps、awesome-mcp-servers、AI-Papers-of-the-Week、awesome-ChatGPT-repositories。背景源只用于方向校准，不直接变成日报新闻。

请按以下结构输出，并**完整写入** `state/monthly/YYYY-MM-DD-monthly-review.md`：

# 月度 AI 方向复盘

## 1. 上月高信号趋势
列出 5-8 个趋势，每个包含代表候选池条目、human_status、为什么重要、面试证明力、可信度。

## 2. 本月方向决策
按继续追、降权观察、暂时放弃、本月动手做分类。

## 3. 三个池整理
分别整理产品池、工程池、论文池。每池优先 confirmed/changed，再列 pending 待确认。`archive` 和 `drop` 是后续处置，不计入这三个常规池。

## 4. 面试证明力整理
整理 3-5 个最适合转成面试表达的证据，包含 proof_artifact、validation_window、interview_story_angle、next_proof_action。

## 5. 本月个人路线图
给出本月主题、每周重点、本月产品调研 / 论文精读目标、本月输出物和验收标准。

## 6. 个人主页 / 作品集更新建议
说明最值得放到个人主页或作品集的成果，以及需要补齐的材料。

## 7. 一句话战略判断
用 3-5 句话总结本月押注。
