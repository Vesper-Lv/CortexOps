---
automation_id: demo
kind: demo
source_toml: automations/demo.toml
---
请生成本周“Demo 复刻推荐”，面向一个正在成长为全栈型 AI 产品经理和个人独立开发者的用户。当前日期按运行时日期，时区 Asia/Shanghai。

基础规则：
- 优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/source-policy.md。
- GitHub / 产品 / 论文 / 练习信号的采集、标准化、去重和候选池路由优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/ingestion-normalization.md。
- 用户当前注意力、GitHub 实践适配度和求职面试证明力规则优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/focus-policy.md。

必须优先读取：
- /Users/jiexinlv/Documents/CortexOps/pools/demo-replication.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/knowledge-gap.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/personal-work.jsonl
- /Users/jiexinlv/Documents/CortexOps/state/memory/ai-pm-7d.jsonl
- /Users/jiexinlv/Documents/CortexOps/state/daily/*.jsonl

目标：
从工程复刻池中选出 1 个最值得本周复刻的 Demo。优先使用 human_status 为 confirmed 或 changed 的候选；pending 候选可以进入备选，但必须标注未人工确认。不要从日报自然语言段落里凭空选题。

选择标准：
1. practice_fit 为 high/medium，entry_barrier 不高于 medium。
2. 可在 3-8 小时内做出最小可运行 demo。
3. 能生成 README、截图、录屏、架构图或作品集素材。
4. 能服务 AI PM 面试证明力、Vibe Coding 和快速验证。
5. 7 天内已主推且无 material update 的项目不要再次主推。

请按以下结构输出：

# 本周 Demo 复刻推荐

## 1. 工程复刻候选池回顾
列出 5-8 个候选，包含来源文件、链接、human_status、practice_fit、entry_barrier、最小可复刻范围、预计耗时、是否适合个人作品池。

## 2. 本周主推 Demo
选 1 个主推，说明为什么现在做、训练什么能力、对应什么用户痛点、proof_artifact 和 interview_story_angle。

## 3. 最小可复刻版本
定义输入、核心流程、输出、UI/交互形态、依赖和不做范围。

## 4. 实现步骤
给出 5-8 个 30-90 分钟步骤。

## 5. 验收标准
必须能跑、有真实输入样例、输出可读、有 README 或截图/录屏。

## 6. 个人作品池沉淀
说明如何沉淀为作品集材料。
