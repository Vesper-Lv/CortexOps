# 月度 AI 方向复盘

运行日期：2026-07-01  
时区：Asia/Shanghai  
归档说明：这是 2026-07-01 生成的月度复盘归档副本。后续月度复盘固定保存到 `/Users/jiexinlv/Documents/CortexOps/state/monthly/YYYY-MM-DD-monthly-ai-direction-review.md`。

## 1. 上月高信号趋势

| 趋势 | 代表信号 | 为什么重要 | 对 AI PM 的意义 | 独立开发者机会 | 可信度 |
|---|---|---|---|---|---|
| Agent 从聊天转向可委派工作流 | OpenAI、Anthropic、GitHub 生态强化异步执行、工具调用、代码任务和工作流交付 | 竞争点不再是“能不能回答”，而是能不能被安全交付 | 要理解权限、预算、日志、失败恢复、验收标准 | 做 Agent Ops / workflow control 小工具 | 高 |
| AI coding 进入“任务执行 + 审查”阶段 | GitHub Copilot、OpenHands、Codex 类工具强化 issue-to-PR、代码代理、工作区执行 | AI coding 的瓶颈变成上下文、评估和可回滚 | PM 要会设计任务边界和验收标准 | 做代码任务看板、PR review assistant、agent runbook | 高 |
| Agent 观测、评估、权限成为基础设施机会 | 成本预算、权限控制、执行日志、eval harness 频繁出现 | 企业和个人都需要“信任层” | 这是 AI PM 能讲清楚的系统型能力 | CortexOps 可直接切入 | 高 |
| 研究/科学工作台产品化 | Anthropic Claude Science AI Workbench 类方向强化研究流、综述、假设生成 | AI 不只是内容工具，而是研究协作界面 | 适合连接论文雷达、知识库、产品洞察 | 做 paper-to-product workbench | 中高 |
| 浏览器/网页自动化 agent 变成可复刻 Demo | Stagehand 等项目把自然语言、DOM 操作和自动化结合 | 很适合 3-8 小时 demo | 可训练 workflow、异常处理、结果可视化 | 做“网页任务录制 + agent 执行 + 日志” | 高 |
| 人在回路重新升权 | HumanLayer 等项目强调审批、人工确认、敏感操作 gate | 纯自动化风险高，审批流是刚需 | PM 要设计何时自动、何时确认 | 做轻量 approval layer | 高 |
| 泛 AI 工具目录继续降权 | 大量工具榜单、wrapper、目录站缺少工程和作品价值 | 信息密度低，容易过载 | 不利于形成产品判断 | 除非能转成具体 workflow，否则丢弃 | 高 |

## 2. 本月方向决策

继续追：
- Agent Ops：预算、权限、日志、eval、验收、run history。
- AI coding workflow：从 issue 到实现、测试、PR 说明、回滚。
- 可复刻浏览器 agent：网页任务自动化 + 可视化执行轨迹。
- 研究工作台：paper radar 到产品机会卡的转化。

降权观察：
- 多模态视频/生成式内容工具，除非能服务作品集展示。
- 大模型榜单和参数竞赛，只保留对产品能力边界有帮助的部分。
- 企业级复杂多 agent 平台，先观察架构，不急着复刻。

暂时放弃：
- 泛 AI 工具导航站。
- 只换壳的 chatbot / prompt library。
- 无法 3-8 小时验证的庞大 agent platform。
- 只读论文不产出 demo / 产品卡的研究方向。

本月动手做：
- 主方向：CortexOps Agent Ops Workbench MVP。
- 备选方向：Paper-to-Product Workbench 小 Demo。
- 建议只选 1 个主项目，另一个作为周末轻量 spike。

## 3. 五个池整理

### 产品灵感池

| 灵感 | 目标用户 | 痛点 | MVP 形态 | 推荐动作 |
|---|---|---|---|---|
| Agent Run Log Workbench | AI PM / 独立开发者 | agent 做了什么不可追踪 | 输入任务，展示步骤、成本、结果、失败点 | 本月主推 |
| AI Coding Task Card | Vibe Coding 用户 | 给 AI 的任务边界模糊 | 任务卡生成 spec、验收、测试清单 | 合并进 CortexOps |
| Agent Budget Guard | 小团队 / 个人 | token 和 API 成本不可控 | 每个任务设置预算和超限提示 | 做轻量组件 |
| Human Approval Layer | agent 工具开发者 | 敏感操作需要确认 | 操作前弹出审批、记录决策 | 复刻 HumanLayer 思路 |
| Browser Agent Recorder | 运营/研究人员 | 网页重复操作难自动化 | 录制网页任务并回放执行日志 | 作为 demo 候选 |
| Paper-to-Product Card | AI PM / PCD 作品集 | 论文启发难转成产品机会 | 论文摘要 -> 用户痛点 -> MVP | 适合文章/作品集 |
| Signal Review Inbox | CortexOps 用户 | 信息进入后缺少人工决策层 | P0/P1/P2/Drop 审核界面 | 继续建设 |
| Portfolio Artifact Generator | 求职/作品集用户 | Demo 做完难包装 | 自动生成 README、架构图、录屏脚本 | 后续扩展 |

### 论文候选池

| 方向 | 为什么保留 | 下月动作 |
|---|---|---|
| Agentic AI workflow / future of work | 直接支撑 Agent Ops 产品判断 | 精读 1 篇，写 1 张产品机会卡 |
| Human-in-the-loop agent governance | 对权限、审批、信任层很关键 | 复刻审批流 demo |
| AI coding evaluation / benchmark | 影响代码代理是否可信 | 做一个小型 acceptance check harness |
| Scientific workbench / AI for research | 连接论文雷达和产品灵感 | 做 paper-to-product 模板 |
| Cognitive load / decision support | 适合 AI PM 与心理学交叉定位 | 写成作品集文章，不急着工程化 |

### 工程复刻池

| 工程方向 | 推荐原因 | 本月动作 |
|---|---|---|
| Stagehand-style browser agent | 可视化强、demo 价值高 | 复刻一个“抓取竞品页面并生成机会卡”流程 |
| HumanLayer-style approval gate | Agent Ops 核心能力 | 做最小审批组件 |
| OpenHands-style coding workflow | 理解代码代理工作边界 | 拆解 README 和任务流，不全量复刻 |
| CortexOps Review Inbox | 和个人主项目强相关 | 做静态 seed data UI |
| Eval / acceptance checklist runner | 可展示 PM 的工程判断 | 做任务验收小模块 |

### 知识补缺池

已补齐能力：
- 已形成 CortexOps 的信号路由、候选池、优先级、focus rule 文档基础。
- 已明确 Vibe Coding 应按“小 spec -> 小实现 -> 验收 -> commit”推进。

仍薄弱能力：
- Agent 执行日志的数据模型。
- eval / acceptance check 的最小实现。
- 浏览器自动化与失败恢复。
- 作品集包装：README、架构图、产品复盘、录屏脚本。

本月应补：
- 工程主题 1：Agent run schema + SQLite/Prisma 最小数据层。
- 工程主题 2：AI coding 任务验收标准和 eval harness。

推荐练习路径：
- 第 1 周：用 seed data 画出 Review Inbox / Run Log UI。
- 第 2 周：接一个真实 agent/code task 样例。
- 第 3 周：加入预算、审批、验收状态。
- 第 4 周：写 README、架构图和 1 分钟 demo 脚本。

### 个人作品池

| 成果 | 类型 | 状态 | 补齐动作 |
|---|---|---|---|
| CortexOps source / ingestion / focus docs | 产品系统设计 | Polishing | 补一张系统架构图 |
| AI PM daily radar 规则 | 信息产品方法论 | Draft | 整理成案例页 |
| Agent Ops Workbench MVP | Demo / side project | Draft | 本月主做 |
| Paper-to-Product Card 模板 | 产品机会卡 | Draft | 做 2 个真实样例 |
| Vibe Coding Project Guide | 学习方法论 | Portfolio Ready | 加截图和项目进度 |
| Monthly AI Direction Review | 复盘文章 | Draft | 精简成公开版文章 |

## 4. 本月个人路线图

本月主题：把“AI 信息判断”升级为“Agent 工作流控制台”。

每周重点：
- Week 1：定义 Agent Run schema，做 Review Inbox + Run Log 静态页面。
- Week 2：接入一个真实任务样例，展示输入、执行步骤、输出、人工判断。
- Week 3：加入预算、权限、审批、验收 checklist。
- Week 4：打磨作品集材料：README、架构图、录屏、产品复盘文章。

本月 Demo / side project 目标：
- CortexOps Agent Ops Workbench MVP。
- 最小闭环：导入一个 agent task -> 标准化信号/任务 -> 展示执行日志 -> 标记验收结果 -> 生成作品材料。

本月输出物：
- 1 个可运行 demo。
- 1 篇产品复盘。
- 1 张架构图。
- 1 个 README。
- 1 个个人主页项目块。

验收标准：
- 本地能跑。
- 有 3 条真实或拟真的 agent run 样例。
- 每条 run 有成本、状态、人工决策、验收结果。
- README 能解释目标用户、痛点、架构、下一步。
- 可录制 60 秒演示。

## 5. 个人主页 / 作品集更新建议

最值得放的成果：
- CortexOps Agent Ops Workbench：补截图、架构图、demo video。
- CortexOps 信息系统规则：补“为什么这样分池”的产品设计说明。
- Paper-to-Product Card：补 2 个论文转产品机会样例。
- Vibe Coding Project Guide：补从文档到 demo 的执行日志。
- Monthly Direction Review：整理成“AI PM 如何做方向判断”的文章。

## 6. 一句话战略判断

这个月不要追所有 AI 热点，押注 Agent Ops。  
对 AI PM 来说，最稀缺的不是知道哪个模型更强，而是能设计“AI 怎么被安全、可控、可验收地交付工作”。  
对独立开发者来说，最容易做出作品集价值的方向，是把 agent 的预算、权限、日志、审批和验收做成一个小而完整的工作台。  
如果只能做一件事，就做 CortexOps Agent Ops Workbench MVP；它同时服务求职、PCD 作品集、Vibe Coding 训练和个人产品雏形。
