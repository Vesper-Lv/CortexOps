---
automation_id: ai
kind: weekly
source_toml: automations/ai-paper-radar.toml
---
请生成本周“AI × 神经科学 × 心理学论文雷达”，面向一个正在成长为全栈型 AI 产品经理的用户。当前日期按运行时日期，时区 Asia/Shanghai。

基础规则：
- 优先遵循 CortexOps 的基础执行参考：/Users/jiexinlv/Documents/CortexOps/docs/source-policy.md。
- 论文/研究信号的采集、解析、字段结构、置信度、候选池路由优先遵循：/Users/jiexinlv/Documents/CortexOps/docs/ingestion-normalization.md。
- 用户当前注意力、GitHub 实践适配度和求职面试证明力规则优先遵循：/Users/jiexinlv/Documents/CortexOps/docs/focus-policy.md。
- 若运行时无法读取上述文件，则以本 prompt 内规则为准。

用户已选择：
- Workflow 方案：方案 B，AI PM 成长型。
- 筛选目标：目标 3，跨学科认知桥梁。
- 每周推送 5 篇论文：AI 为主，同时连接神经科学/心理学到 AI 产品判断与工程练习。

默认配比：
- 3 篇 AI 论文。
- 1 篇神经科学 / 认知科学论文。
- 1 篇心理学 / 行为科学 / HCI 论文。

优先来源：
AI：arXiv cs.AI/cs.LG/cs.CL/cs.CV/stat.ML、Hugging Face Papers、Papers with Code、OpenReview、NeurIPS、ICML、ICLR、ACL、EMNLP、CVPR/ICCV/ECCV、CHI、Nature Machine Intelligence、JMLR、TMLR。
神经科学/认知科学：Nature Neuroscience、Neuron、Nature Reviews Neuroscience、Trends in Cognitive Sciences、Current Biology、eLife Neuroscience、Cognitive Science。
心理学/行为科学/HCI：Nature Human Behaviour、Psychological Science、Annual Review of Psychology、Cognition、Journal of Experimental Psychology、Behavioral and Brain Sciences、CHI/CSCW。

筛选标准：
每篇候选论文按以下标准判断：前沿性、产品启发、工程可落地、认知启发、可信度、是否适合进入论文候选池、是否能产生产品灵感/工程复刻/知识补缺/个人作品、是否能支持 AI PM 面试证明力或快速验证动作。

保存规则：
- 生成完整 Markdown 报告后，必须保存到 /Users/jiexinlv/Documents/CortexOps/state/weekly/paper/YYYY-MM-DD-paper-radar.md。
- YYYY-MM-DD 使用 Asia/Shanghai 运行时日期。
- 若目录不存在，先创建 /Users/jiexinlv/Documents/CortexOps/state/weekly/paper。
- 最终回复必须提供已保存文件的绝对路径链接。
- 不要自动执行 git add、git commit 或 git push，除非用户另行明确要求。

输出结构：

# 本周 AI × 神经科学 × 心理学论文雷达

## 1. 本周 5 篇必读论文
每篇使用统一模板：标题、来源 / 会议 / 期刊、链接、领域、推荐级别、置信度、为什么选它、一句话总结、核心问题、核心方法、关键发现、对 AI 产品经理的启发、对工程 / 全栈能力的启发、面试证明力、可快速验证动作、值得追问的问题、30-60 分钟行动项、候选池路由建议。

## 2. 本周最重要研究信号
用 3-5 条 bullet 总结这一周最值得注意的趋势，不要只是复述论文摘要。

## 3. 对 AI 产品的启发
把 5 篇论文转成产品灵感、交互设计启发、用户需求、agent workflow 或可信 AI 机制。

## 4. 对工程学习的启发
给出可复刻 demo、可读 repo、notebook、eval 设计、API 实验或技术概念学习路径，并标注是否进入工程复刻池或知识补缺池。

## 5. 个人作品池候选
指出哪些论文可转成对外展示成果，例如论文精读报告、产品 memo、架构图、eval 设计、demo README 或作品集页面。

## 6. 面试证明力候选
列出 1-3 个可转成面试表达的研究信号。每个包含：interview_relevance、target_role_signal、proof_artifact、validation_window、interview_story_angle、next_proof_action。

## 7. 阅读顺序
告诉用户先读哪篇、精读哪篇、哪篇只看摘要即可。考虑用户是 AI 产品经理，不是全职研究员。

## 8. 本周行动项
给出 1 个 1-2 小时可完成的小任务，要求能帮助用户从论文转化到产品/工程能力或面试证明力。

质量要求：必须提供可点击来源链接；优先最新一周内的论文；不要只按热度或标题党选择；AI 占主线，但神经科学/心理学论文必须明确连接到 AI 产品设计或人机交互；区分事实、论文作者结论、你的产品/工程推断。
