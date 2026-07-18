# 本周工程学习任务

生成日期：2026-07-08  
时区：Asia/Shanghai  
任务类型：weekly engineering learning  
选择状态：候选池本轮未发现 `confirmed` 或 `changed` 条目；本任务基于 `pending` 高信号候选生成，未人工确认。

## 1. 本周工程主题

**主题名称**：Agentic Retrieval 工具链：把 RAG 拆成可观察的 `retrieve / find / read / grep`

**来源池**：`demo-replication.jsonl`，辅以 `personal-work.jsonl`

**来源链接**：

- [legal-kb 参考应用](https://www.marktechpost.com/2026/07/05/llamaindex-legal-kb-agentic-retrieval-over-index-v2-with-retrieve-find-read-and-grep-tools)
- [Copilot browser tools](https://github.blog/changelog/2026-07-01-browser-tools-for-github-copilot-in-vs-code-are-generally-available/)
- [Copilot agent session streaming](https://github.blog/changelog/2026-07-02-copilot-agent-session-streaming-is-now-in-public-preview/)

**human_status**：`pending`，未人工确认。

**为什么本周学**：它同时覆盖 RAG、Agent workflow、工具调用、前端状态展示、日志/审计，是当前 2B AI PM 和独立开发者最容易转成作品的交叉点。

**practice_fit**：high

**entry_barrier**：medium。完整 legal-kb 可能涉及解析、索引、模型和账号配置；本周只做本地 mock，所以可控。

**面试证明力**：high。能讲清楚“企业知识库 agent 为什么不能只给答案，还要展示检索路径、引用、失败状态和权限边界”。

## 2. 本周最小任务

**输入**：3-5 个本地文档片段，例如 README、产品说明、政策文档、日报 JSONL 摘要。

**产出**：一个本地小 demo + README：用户输入问题后，展示 `findFiles -> retrieve -> readFile -> grepFile -> answer` 的工具调用轨迹、命中文档、引用片段、失败状态和日志字段。

**技术栈**：优先用现有前端栈；没有现成项目就用纯 HTML/JS 或轻量 React/Vite。检索可先用关键词/BM25 mock，不接真实向量库。

**完成后能展示什么**：一个“企业文档 agent 可观察 trace”原型截图、工具 schema、3 个 eval case。

**不做什么**：不部署完整 legal-kb；不接真实法律数据；不做登录/auth；不接复杂向量数据库；不追求答案质量，只验证工具链可解释性。

## 3. 学习路径

1. **30-45 分钟**：读 legal-kb 案例，提取四个工具的输入、输出、失败状态。
2. **45-75 分钟**：设计工具 schema：`findFiles`、`retrieve`、`readFile`、`grepFile`，加上 `permission`、`trace_id`、`citation`、`latency_ms` 字段。
3. **60-90 分钟**：实现本地 mock demo：输入问题，返回工具调用列表和可读答案。
4. **45-60 分钟**：加 3 个 eval case：找得到、找不到、命中多文档但引用冲突。
5. **30-45 分钟**：写 README 复盘：架构图、边界、不足、下一步可接向量检索或真实 API。

## 4. 推荐资料

- [legal-kb 参考应用介绍](https://www.marktechpost.com/2026/07/05/llamaindex-legal-kb-agentic-retrieval-over-index-v2-with-retrieve-find-read-and-grep-tools)
- [run-llama/legal-kb 代表 repo](https://github.com/run-llama/legal-kb)
- [GitHub Copilot browser tools GA](https://github.blog/changelog/2026-07-01-browser-tools-for-github-copilot-in-vs-code-are-generally-available/)
- [GitHub Copilot agent session streaming](https://github.blog/changelog/2026-07-02-copilot-agent-session-streaming-is-now-in-public-preview/)
- [Vercel AI SDK tools and tool calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)

## 5. 验收标准

- 能本地打开。
- 有至少 3 个真实输入样例。
- 每次输出包含工具调用 trace、引用片段和最终答案。
- README 说明技术取舍。
- 至少有 3 个 eval case，覆盖成功、失败和冲突场景。

## 6. 面试与作品沉淀

**proof_artifact**：`agentic-retrieval-trace-demo`，包含 demo 截图、README、工具 schema、eval cases。

**STAR 角度**：Situation：企业知识库 agent 难以信任；Task：让检索过程可解释；Action：拆成四类工具并展示 trace；Result：用户能看到答案来源、失败原因和权限边界。

**作品池材料**：一页架构图、工具字段表、3 条 eval case、README 复盘，后续可扩展成“企业知识库 agent 产品 spec”。
