---
automation_id: ai-pm
kind: daily
source_toml: automations/ai-pm.toml
---
请生成今日“AI PM 行业雷达”，面向一个正在成长为全栈型 AI 产品经理和个人独立开发者的用户。当前日期按运行时日期，时区 Asia/Shanghai。

基础规则：
- 优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/source-policy.md。
- 采集、字段标准化、JSONL 状态、候选池路由、去重和人工确认规则优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/ingestion-normalization.md。
- 用户当前注意力、GitHub 实践适配度和求职面试证明力规则优先遵循 /Users/jiexinlv/Documents/CortexOps/docs/focus-policy.md。
- 先读取 /Users/jiexinlv/Documents/CortexOps/state/memory/ai-pm-7d.jsonl 做 7 天去重；再用最近日报 Markdown 作为补充复核。

总目标：
日报不是只生成一篇自然语言摘要，而是维护一个文件驱动的信息工作台。请先形成结构化链接状态，再生成用户阅读版日报。用户端最终应先看到五段式方向判断，再看今日 30mins 阅读包，然后处理未入选阅读包的剩余链接和今日练习。每条链接后面带 AI 建议池、优先级、阅读包状态、人工确认状态；若 7 天内重复但因 material_update 或 carry_over 被保留，直接在该链接后注明原因。

必须维护的状态文件：
- /Users/jiexinlv/Documents/CortexOps/state/daily/YYYY-MM-DD-links.jsonl
- /Users/jiexinlv/Documents/CortexOps/state/daily/YYYY-MM-DD-report.md
- /Users/jiexinlv/Documents/CortexOps/state/memory/ai-pm-7d.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/product-inspiration.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/paper-candidates.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/demo-replication.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/knowledge-gap.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/personal-work.jsonl
- /Users/jiexinlv/Documents/CortexOps/pools/archive.jsonl

AIhot 采集契约（强制，按顺序执行）：

时区与窗口：
- 用户时区 Asia/Shanghai；report date 与文件名用 Shanghai 的 YYYY-MM-DD。
- published_at 一律按 UTC ISO 比较；禁止用 /api/public/daily/{UTC-date} 条数替代 mode=selected 条数做验收。
- since = 上次日报成功写入 state/daily/*-links.jsonl 的 finished_at（优先）；若无记录，则用 rolling 24h 锚点（上次计划运行时刻）。

步骤 1 — 主路径（fresh discovery）：
- GET /api/public/items?mode=selected&since=<since>&take=50
- 禁止将 /api/public/daily 作为主路径替代 mode=selected。
- 对每条 API 返回项：确认 original_url；aihot_summary 与 display_summary 必须直接等于 API summary，不改写。
- 经 canonical_key 与 state/memory/ai-pm-7d.jsonl 去重后写入 longlist。

步骤 2 — selected 偏少（count < 12）时，按优先级扩「新信息」：
- 禁止 bulk carry 昨日全部 remaining（普通 not_selected 且摘要已消费的链接不得整包重播）。

  2a. AIhot 补充（优先新 canonical_key）：
      - 可选 A：mode=selected，since 扩至 36–48h；或
      - 可选 B：/api/public/daily/<date>，date 用 Shanghai 日界（非 UTC calendar date）。
      - 只纳入 canonical_key ∉ 昨日 state/daily/*-links.jsonl 的新条目。
      - source_mix_note: aihot_48h_supplement 或 aihot_daily_supplement。

  2b. 固定一手源（多样性，新 canonical_key）：
      - GitHub Changelog / Release、Anthropic / OpenAI 官方博客或 changelog、arXiv。
      - source_mix_note 说明为何补充进入 longlist。

  2c. 窄 carry_over（上限 3–5 条，不是整包 remaining）：
      - 仅允许：reading_pack_status=candidate；或 practice_fit=high 且昨日因阅读包容量未选；或 duplicate_status=material_update。
      - 写入 duplicate_status=carry_over，novelty_reason 说明未闭环原因。

步骤 3 — longlist 仍不足 25 条：
- 在五段式日报末尾或「来源说明」段落如实写：「今日 fresh 信号偏少，longlist 以补充源为主」。
- 报告必须记录：aihot_selected_count、aihot_supplement_count、web_supplement_count、narrow_carry_count、since_iso。
- 禁止为凑满 30 条而重复内容、硬凑低质量链接或整包重播昨日 remaining。
- 目标仍为 25–30 条，但质量优先于数量。

采集与长清单规则：
1. AIhot 是 daily_discovery 主入口，但不是唯一填充来源。每日 longlist 不能默认 30 条全部来自 AIhot；必须评估官方/一手来源、产品案例、产品 teardown、优秀产品实践、GitHub/release/changelog、研究/报告是否需要补充进入 25-30 条清单。
2. 建议配比：AIhot 约 18-24 条；官方/一手来源 2-5 条；产品案例/产品 teardown/优秀产品实践 1-3 条；GitHub/release/changelog 2-4 条。若最终全部来自 AIhot，必须在 daily state 或 report 中说明其他来源未补充的原因。
3. 非 AIhot 补充来源应写入 source_mix_note，说明为什么补充进入 longlist，尤其是产品案例如何帮助建立产品思路。
4. AIhot 条目使用 AIhot 标题作为日报标题候选；确认原始来源链接后，把 AIhot 摘要写入 aihot_summary。
5. P0/P1、30 分钟阅读包、GitHub 主推和正式练习必须尽量指向原始来源 URL，而不是 AIhot 聚合页。
6. Codex 自己的判断写入 codex_summary 和 reason，不能和 AIhot 摘要混在一起。
7. 每条链接都给 suggested_pool；AI 建议不是最终入池决定，human_status 默认 pending。

每条 JSONL link object 至少包含：
id, date, title, original_url, source_url, source_origin, source_name, source_mix_note, aihot_summary, codex_summary, display_summary, priority, reading_pack_status, suggested_pool, human_status, final_pool, canonical_key, duplicate_status, novelty_reason, practice_fit, reason, read_reason, focus_direction, known_facts, open_questions。
其中：display_summary 为每条必填的事实摘要（AIhot 直接复用 aihot_summary，不改写）；read_reason/focus_direction 仅阅读包非 knowledge_gap 条目填写；known_facts/open_questions 仅 knowledge_gap 条目填写；去重/保留说明只写入 novelty_reason，reason 不得复述。

写入规则：
- 所有采集链接先写入 state/daily/YYYY-MM-DD-links.jsonl。
- 用户阅读版写入 state/daily/YYYY-MM-DD-report.md。
- 入选 30 分钟阅读包、GitHub 主推、正式练习、候选池 pending/confirmed/changed 的链接写入 state/memory/ai-pm-7d.jsonl。
- AI 建议进入候选池的链接写入对应 pools/*.jsonl，human_status: pending，final_pool 默认等于 suggested_pool。
- 产品灵感池只保留手动确认或人工改入的候选；日报不要自动生成“今日 AI 产品灵感”段落。

用户阅读版输出结构：

# 今日 AI PM 行业雷达

## 1. 五段式日报
用五段判断今天的大方向：产品/行业动态、GitHub/工程信号、论文/研究信号、工具/工作流信号、风险/限制/反例。

## 2. 今日 30mins 阅读包
按阅读顺序列出 P0 详细阅读、P1 扫读和 GitHub 热门/可复刻项目，不要另列为独立顶层章节。每条首行：标题、原始链接、类别（P0 详细阅读 / P1 扫读 / GitHub 热门或可复刻项目）、建议池、human_status。随后：
- 摘要：display_summary（AIhot 直接用 aihot_summary，纯事实，不加解读）。
- 若建议池不是 knowledge_gap：给「推荐阅读原因」（read_reason，一句）和「关注方向」（focus_direction，读时关注的角度，不要臆造文章未必包含的细节）。不要再输出"读的时候看/读完判断"模板句。
- 若建议池是 knowledge_gap：改为两部分——「文章可获得的事实」（known_facts，从文章本身能得到的事实点）与「需要额外研究的问题」（open_questions，读完仍需另行查证的问题）。
"P0 详细阅读"仅用于确有深度的来源；若来源只是产品功能/发布介绍页（信息浅），降为 P1 扫读，靠摘要让用户判断，不要为凑深度而过度解读。

## 3. 未入选阅读包的剩余链接
列出剩余链接，尽量保持今日信息面完整。每条首行标注：优先级、AI 建议池、reading_pack_status、human_status、是否建议人工加入阅读包；非 AIhot 补充来源标注 source_mix_note。随后另起一行给「摘要」（display_summary，AIhot 用 aihot_summary，纯事实）。剩余链接不写推荐阅读原因/关注方向，克制解读。
去重/保留说明只出现一次：仅当 duplicate_status 为 material_update / carry_over / duplicate_suppressed 时，追加一行「保留/去重说明：<duplicate_status> — <novelty_reason>」。novelty_reason 只写一次，reason 不得复述该内容。

## 4. 今日练习三选一
给 3 个 20-45 分钟练习选项，并明确选择其中 1 个作为正式练习。未选的 2 个给人工去向建议：产品灵感池、每周 Demo 候选池、archive 或 drop。

质量要求：
- 必须提供可点击来源链接。
- 区分事实、AIhot 摘要、原作者观点、Codex 判断。
- 长清单要完整，阅读包要克制。
- 候选池建议只作为每条链接的状态字段和 UI 标签输出，不要额外生成“候选池建议表”段落。
- 不要为了凑数加入不可验证、过期或低质量链接。
- 每条链接都要有 display_summary；AIhot 来源直接复用 aihot_summary，不改写。
- 事实、AIhot 摘要、Codex 判断分离；剩余链接以事实摘要为主，克制解读。
- 去重/保留原因只写入 novelty_reason，并在报告中只呈现一次，reason 不复述。
- knowledge_gap 用“可获得的事实 + 需要额外研究的问题”呈现，不假装给出文章未包含的判断。
