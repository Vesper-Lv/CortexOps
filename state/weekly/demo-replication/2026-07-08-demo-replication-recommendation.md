# 本周 Demo 复刻推荐

生成日期：2026-07-08
时区：Asia/Shanghai
主推 Demo：SafeClawArena mini - Agent 动作风险评测台

## 1. 工程复刻候选池回顾

本周候选池没有 `confirmed` / `changed` 项，以下均为 `pending`，也就是“未人工确认”。主推时避开了 2026-07-04 已主推的 agent session 审计/成本护栏，以及 2026-07-05 已主推的 agentic retrieval + browser action schema。

| 候选 | 来源文件 | 链接 | human_status | practice_fit / entry_barrier | 最小可复刻范围 | 预计耗时 | 是否适合个人作品池 |
|---|---|---|---:|---|---|---:|---|
| SafeClawArena | `pools/demo-replication.jsonl` | https://github.com/sunblaze-ucb/SafeClawArena | pending | high / medium | agent 动作风险评测 mini harness | 4-6h | 是 |
| pxpipe | `pools/demo-replication.jsonl` | https://github.com/teamchong/pxpipe | pending | high / low-medium | token 成本治理链路拆解 | 3-5h | 是，但近期已强推 |
| legal-kb | `pools/demo-replication.jsonl` | https://www.marktechpost.com/2026/07/05/llamaindex-legal-kb-agentic-retrieval-over-index-v2-with-retrieve-find-read-and-grep-tools | pending | high / medium | retrieve/find/read/grep 工具链 | 4-8h | 是，但 2026-07-05 已练习 |
| JuliusBrussee/caveman | `pools/demo-replication.jsonl` | https://github.com/JuliusBrussee/caveman | pending | high / low | agent 输出预算 demo | 3-4h | 是 |
| alibaba/page-agent | `pools/demo-replication.jsonl` | https://github.com/alibaba/page-agent | pending | high / medium | 网页动作 schema + mock runner | 4-6h | 是，但 2026-07-05 已覆盖 |
| Meetily | `pools/demo-replication.jsonl` | https://github.com/Zackriya-Solutions/meetily | pending | medium / medium | 本地会议摘要流程 | 5-8h | 是 |
| Senior SWE-Bench | `state/daily/2026-07-02-links.jsonl` | https://senior-swe-bench.snorkel.ai/ | pending | high / medium | 高级工程任务评测卡片 | 4-6h | 是 |

## 2. 本周主推 Demo

主推：**SafeClawArena mini：Agent 动作风险评测台**

为什么现在做：这周信号集中在 agent 安全、工具调用、浏览器/CLI 自动化、成本与审计。SafeClawArena 本身是 agent 安全评测入口，且还没有被最近 7 天正式练习主推，适合把“会调用工具的 agent”转成“可评估、可解释、可审计的 agent”。

训练能力：eval thinking、agent workflow 设计、风险分级、可观察性字段、README/架构图表达。

用户痛点：AI PM 面试里只会说“我会做 agent demo”不够，需要证明你知道企业为什么担心权限、执行轨迹、失败状态和安全边界。

proof_artifact：README、风险评分截图、3 条真实输入样例、评测结果表、架构图。

interview_story_angle：从一个 agent 安全 benchmark 抽象出企业 agent 上线前的动作风险评估流程。

## 3. 最小可复刻版本

输入：3-5 条 agent action trace JSON，例如 `read_file`、`run_command`、`open_url`、`write_file`，每条带目标、权限、上下文、预期风险。

核心流程：读取任务 -> 按 policy rules 评估 action risk -> 标记 allow / warn / block -> 生成评分和解释 -> 输出报告。

输出：JSON 结果、Markdown report、一个静态 HTML 表格截图。

UI/交互形态：先做 CLI + static HTML；不接真实危险工具，不执行用户命令，只模拟评估。

依赖：优先用 Node/Python 标准库；如后续要接 LLM API 或新增包，需要单独审批。

不做范围：不复刻完整 406 任务集、不做真实攻击/漏洞执行、不做云部署、不做完整浏览器自动化。

## 4. 实现步骤

1. 30-45 分钟：读 SafeClawArena README，提炼 5 个动作风险维度。
2. 45-60 分钟：定义 `traces/sample.json` 和 `policies/default.json`。
3. 60-90 分钟：实现本地 evaluator，输出 allow/warn/block 与解释。
4. 45-60 分钟：做 3 个样例：安全读取、敏感写入、危险命令。
5. 45-60 分钟：生成 Markdown report 和静态 HTML 表格。
6. 30-45 分钟：补 README：背景、运行方式、样例、产品启发。
7. 30-60 分钟：补一张架构图或录屏，沉淀作品集素材。

## 5. 验收标准

- 必须能本地跑通一条命令，读取真实样例 JSON，并输出可读报告。
- 至少包含 3 条输入样例、1 个被允许动作、1 个警告动作、1 个阻断动作。
- 必须有 README、截图或录屏，以及一张说明“trace -> policy -> evaluator -> report”的架构图。

## 6. 个人作品池沉淀

作品集标题可写成：**Agent Action Risk Evaluator：面向企业 AI Agent 的最小安全评测台**。

沉淀材料：README、截图、架构图、风险维度表、3 条 case study、1 段面试讲述。重点讲清楚你不是只做了一个工具，而是把开源安全评测信号转成了可落地的 2B AI PM 产品判断：权限、审计、阻断、解释和上线前验收。
