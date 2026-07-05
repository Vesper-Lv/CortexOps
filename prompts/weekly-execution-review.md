---
automation_id: ai-pm-2
kind: weekly
source_toml: automations/weekly-execution-review.toml
---
请生成本周“AI PM 执行周报”，面向一个正在成长为全栈型 AI 产品经理和个人独立开发者的用户。当前日期按运行时日期，时区 Asia/Shanghai。

基础规则：
- 优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/source-policy.md。
- 信号字段、候选池路由、JSONL 状态、去重和人工确认规则优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/ingestion-normalization.md。
- 用户当前注意力、GitHub 实践适配度和求职面试证明力规则优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/focus-policy.md。

必须优先读取的文件：
- /Users/jiexinlv/Documents/CortexOps/state/memory/ai-pm-7d.jsonl
- /Users/jiexinlv/Documents/CortexOps/state/daily/*.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/product-inspiration.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/paper-candidates.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/demo-replication.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/knowledge-gap.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/personal-work.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/archive.jsonl

目标：
周报不是从日报长文里重新猜，而是调度候选池。优先使用 human_status 为 confirmed 或 changed 的条目；pending 条目可以作为新鲜候选，但必须标注“未人工确认”。如果 human_status 为 changed，必须使用 final_pool，而不是 suggested_pool。

周报原则：
1. 不要重复日报，不要做新闻堆砌。
2. 从候选池和 7 天 memory 中判断本周哪些方向值得推进、观察、归档或丢弃。
3. 每周最多选择：主推 Demo 1 个、论文精读 1-2 篇、工程学习主题 1 个、产品灵感调研 1-2 个、个人作品推进 1-2 个。
4. weekly_candidate sources 可用于刷新池子，但不能绕过 practice_fit、entry_barrier 和人工确认状态。
5. 输出必须服务 2B AI PM、AI workflow、eval、agent/MCP、Vibe Coding 和作品证明力。

请按以下结构输出：

# 本周 AI PM 执行周报

## 1. 本周最高信号趋势
从 daily state、memory 和候选池归纳 3-5 个趋势。每个包含代表链接、来源池、人工确认状态、为什么重要、下周处理方式。

## 2. 候选池状态盘点
按产品灵感池、论文候选池、工程复刻池、知识补缺池、个人作品池输出。每池区分 confirmed/changed/pending，并说明本周应推进、继续观察或归档的条目。

## 3. 下周执行卡
给出下周只做的核心任务：主推 Demo、论文精读、工程学习主题、产品调研、个人作品推进。每个任务包含来源文件/链接、为什么选、预计耗时、最小产出物、成功标准、proof_artifact、interview_story_angle。

## 4. 面试证明力任务
列出 1-3 个最适合形成面试证明力的任务，包含 target_role_signal、validation_window、next_proof_action。

## 5. 看板任务建议
把下周执行卡转成 Inbox、This Week、Blocked 风险和 Done 定义。

## 6. 暂缓与丢弃
列出本周看起来热但不值得投入的方向，说明重新激活条件。

## 7. 一句话周度判断
用 3-5 句话总结下周应该押注什么。
