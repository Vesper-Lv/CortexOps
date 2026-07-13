# 日报文本呈现修复实现计划（Prompts / Policy 变更）

> **For agentic workers:** 本计划改的是 **自动化 prompt 与策略文档**（不是 Web App 代码），遵循 `docs/change-protocol.md`。无单元测试；验证 = TOML 解析 + `rg` 联动检查 + 人工比对"可接受输出示例"。使用 checkbox 逐步执行。

**Goal:** 修复每日 AI PM 雷达日报的三处文本呈现问题：(1) `knowledge_gap` 条目改为"可获得的事实 + 需要额外研究的问题"；(2) 去重/保留说明重复呈现；(3) 30 条信息源缺摘要、P0 对浅页过度解读。

**Change Type（按 change-protocol §2）：** Output Contract Change（日报格式）+ Signal Schema Change（新增字段）+ Policy Change（source-policy 规则），因此走**完整协议**与默认编辑顺序。

**关键前提：** `automations/ai-pm.toml` 是**快照**；live 自动化在 `~/.codex/automations`（仓库外）。改完快照后需由用户把新 prompt 同步到 live Codex 自动化，下次运行才生效（见 Task 5）。

---

## 一、问题分析（根因）

对照 `state/daily/2026-07-02-report.md`：

1. **knowledge_gap 呈现不合理**（report L17-20、L33-36）：阅读包每条固定输出"读的时候看：事实证据…／读完判断：建议进入 X 池"。对 knowledge_gap 文章，"读的时候看什么/读完得到什么判断"往往无法从文章本身得到，需要额外查证——模板化输出造成"看起来给了判断，实则空洞"。
2. **去重说明重复**（report L44）：`reason` 已含保留原因，报告又追加"重复保留原因：material_update，<同一句>"，同一解释出现两次。根因：prompt 未规定去重/保留说明的**单一来源字段**，`reason` 与保留说明各写一遍。
3. **缺摘要 + P0 过度解读**（report L42-67 剩余链接无摘要；L33 P0 指向仅为功能介绍页）：剩余 30 条只有一句理由、无摘要，用户必须逐条打开；且"P0 详细阅读"被用在信息浅的发布/功能页，过度承诺深度。

---

## 二、Change Request（change-protocol §3 模板）

```md
## Change Intent
下一次日报运行后：knowledge_gap 条目给"事实 + 待研究问题"；去重/保留说明只出现一次；每条链接都有事实摘要（AIhot 复用 aihot_summary），仅阅读包条目给推荐理由与关注方向，减少过度解读；P0"详细阅读"仅用于确有深度的来源。

## Target Output Contract
- report: state/daily/YYYY-MM-DD-report.md（及其数据源 links.jsonl）
- changed sections: §2 今日 30mins 阅读包、§3 未入选剩余链接
- required fields: display_summary（全部）、read_reason + focus_direction（阅读包非 knowledge_gap）、known_facts + open_questions（knowledge_gap）、novelty_reason（去重/保留唯一说明）
- examples: 见"三、目标输出契约（前后对比）"

## User Scenario
job search / 2B AI PM judgment / demo replication / engineering learning。

## Required Signal Fields
display_summary, read_reason, focus_direction, known_facts, open_questions, novelty_reason（明确其为去重/保留唯一说明，reason 不得复述）。

## Policy Changes
- 每条链接必须携带事实摘要；AIhot 直接复用 aihot_summary，不改写。
- 仅阅读包条目给推荐理由/关注方向；剩余链接只给摘要 + 状态，克制解读。
- knowledge_gap 用"事实 + 待研究问题"，不假装给出文章未含的判断。
- 去重/保留说明只写入 novelty_reason，报告只呈现一次。
- "P0 详细阅读"仅用于确有深度的来源；浅页降为 P1 扫读，靠摘要让用户判断。

## Automation Binding
- ai-pm.toml：必须发出新字段并按新结构渲染。
- weekly/monthly/demo/paper/engineering：本次不需要消费新字段（未来可选）。

## Acceptance Checks
- TOML 解析通过。
- ai-pm.toml 输出契约显式命名新段落/字段。
- ingestion-normalization.md 定义所有新字段。
- source-policy.md 说明这些字段如何影响呈现与优先级。
- rg 能在 docs 与 automations 中检索到新字段名。
```

---

## 三、目标输出契约（前后对比示例）

### 阅读包 · 非 knowledge_gap（如 GitHub 可复刻项目）

之前：
```
- **GitHub 热门或可复刻项目**｜[ghealth...](url)
  - 为什么读：...
  - 读的时候看：事实证据、产品/工程启发、是否能转成作品或面试证明力。   ← 模板化
  - 读完判断：建议进入 demo_replication，human_status: pending。        ← 伪判断
```
之后：
```
- **GitHub 热门或可复刻项目**｜[ghealth...](url)｜建议池：demo_replication｜human_status: pending
  - 摘要：<display_summary / aihot_summary，纯事实>
  - 推荐阅读原因：<read_reason，一句>
  - 关注方向：<focus_direction，读时关注的角度，不臆造文章未必包含的细节>
```

### 阅读包 · knowledge_gap（如"企业 AI 成本控制"）

之后（解决问题 1）：
```
- **P0 详细阅读**｜[花旗、Adobe...](url)｜建议池：knowledge_gap｜human_status: pending
  - 摘要：<display_summary / aihot_summary>
  - 文章可获得的事实：<known_facts：从文章本身能得到的事实点>
  - 需要额外研究的问题：<open_questions：如"管理员能看到哪些 usage/value/cost 维度？默认模型与支出告警如何设计？">
```

### 未入选剩余链接（解决问题 2、3）

之前（video-use，重复）：
```
- [video-use](url)｜P1｜建议池：demo_replication｜...｜<reason 含去重文本>；重复保留原因：material_update，<同一句再来一遍>
```
之后：
```
- [video-use](url)｜P1｜建议池：demo_replication｜reading_pack_status: candidate｜human_status: pending｜建议加入阅读包：是
  - 摘要：<display_summary / aihot_summary，纯事实>
  - 保留/去重说明：material_update — <novelty_reason，仅一次>
```
非重复的剩余链接省略"保留/去重说明"；剩余链接一律**不写**推荐理由/关注方向（克制解读）。

---

## 四、受影响文件清单

| 文件 | 变更 | change-protocol 类别 |
|---|---|---|
| `docs/ingestion-normalization.md` | §4 标准信号 schema 增加字段与取值定义；§4.1 Daily Link State 最小字段补充；明确 `novelty_reason` 为去重/保留唯一说明 | Signal Schema Change |
| `docs/source-policy.md` | §9 每日雷达规则新增摘要/克制/knowledge_gap/去重单一说明/P0 深度规则；§12 输出质量补充 | Policy Change |
| `automations/ai-pm.toml` | prompt：字段清单、§2 阅读包渲染、§3 剩余链接渲染、质量要求 | Output Contract Change |
| `automations/README.md` | 无需改（约定未变）；如需可加一句"日报按条渲染事实摘要" | — |
| （仓库外）`~/.codex/automations` 的 live ai-pm | 同步新 prompt（用户手动，见 Task 5） | 部署 |

> **不改**：Web App 代码与 Phase 2 importer。新字段随 `rawJson` 进入 `Signal`/`Candidate`（importer 容错保留），未来 Phase B/C 需要时再映射为列。

---

## Task 1: 更新信号 schema（`docs/ingestion-normalization.md`）

**Files:** Modify: `docs/ingestion-normalization.md`

- [ ] **Step 1: §4 标准信号 schema 字段清单补充**

在 §4 "Every normalized item should become a signal object with these fields:" 的字段块（现以 `next_action` / `status` 结尾）中追加：
```text
display_summary
read_reason
focus_direction
known_facts
open_questions
```

- [ ] **Step 2: 在 §4 "Field Values" 追加定义**

追加以下定义段：
```md
`display_summary`:

Facts-only summary shown for every daily link (reading pack and remaining).
For AIhot items, copy `aihot_summary` verbatim (do not rewrite). For non-AIhot
items, extract a concise factual summary. No interpretation or recommendation.

`read_reason` and `focus_direction`:

Only for reading-pack items whose pool is not `knowledge_gap`.
`read_reason` is one line on why it is worth reading. `focus_direction` is the
angle to focus on while reading; it must not assert specifics the source may not
contain.

`known_facts` and `open_questions`:

Only for `knowledge_gap` items. `known_facts` lists facts obtainable from the
article itself. `open_questions` lists questions that still need extra research
after reading. Do not fabricate conclusions the article does not support.
```

- [ ] **Step 3: 明确 `novelty_reason` 为去重/保留唯一说明**

在 §4 现有 `duplicate_status` 定义段之后，追加：
```md
`novelty_reason` is the single source of truth for any duplicate / carry-over /
material-update retention explanation. When `duplicate_status` is
`material_update`, `carry_over`, or `duplicate_suppressed`, write the reason ONLY
in `novelty_reason`. Do not repeat that text in `reason`, and the report must
render the retention note exactly once.
```

- [ ] **Step 4: §4.1 Daily Link State 最小字段补充**

在 §4.1 "Each line should use the standard signal schema and include at minimum:" 的字段列表末尾追加：
```text
display_summary
read_reason
focus_direction
known_facts
open_questions
novelty_reason
```

- [ ] **Step 5: Commit**

```bash
git add docs/ingestion-normalization.md
git commit -m "docs(schema): add summary/read_reason/focus_direction/knowledge_gap fields and single dedup note rule"
```

---

## Task 2: 更新策略（`docs/source-policy.md`）

**Files:** Modify: `docs/source-policy.md`

- [ ] **Step 1: §9 Daily Radar Rules 追加规则**

在 §9 列表末尾（"The daily radar is the entry point…"之前）追加：
```md
16. Every daily link must carry a facts-only `display_summary`. For AIhot items,
    reuse `aihot_summary` verbatim; for non-AIhot items, extract a concise
    factual summary. The report shows this summary for every link so the user can
    judge without opening each source.
17. Only reading-pack items get `read_reason` and `focus_direction`. Remaining
    (non-selected) links show summary + state only; do not over-interpret them.
18. For `knowledge_gap` items, do not output generic "what to look for / what you
    conclude" lines. Output two parts instead: `known_facts` (facts obtainable
    from the article) and `open_questions` (questions needing extra research).
19. Put any duplicate / carry-over / material-update retention explanation only in
    `novelty_reason`, and render it once in the report. `reason` must not repeat
    the dedup text.
20. Reserve "P0 detailed reading" for sources with genuine depth. If a source is a
    thin feature/announcement page, prefer "P1 skim" and let the summary carry the
    facts; do not over-claim depth or over-interpret.
```

- [ ] **Step 2: §12 Output Quality Requirements 追加**

在 §12 列表追加：
```md
- Attach a facts-only summary to every daily link; reuse `aihot_summary` for
  AIhot items without rewriting.
- Keep remaining links summary-first and restrained; reserve reasoning for
  reading-pack items.
- Render any dedup / retention explanation exactly once, sourced from
  `novelty_reason`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/source-policy.md
git commit -m "docs(policy): daily radar summary/restraint/knowledge_gap/single-dedup/P0-depth rules"
```

---

## Task 3: 更新自动化 prompt（`automations/ai-pm.toml`）

**Files:** Modify: `automations/ai-pm.toml`（编辑 prompt 三引号字符串内的段落）

- [ ] **Step 1: 扩充"每条 JSONL link object 至少包含"字段清单**

将：
```
id, date, title, original_url, source_url, source_origin, source_name, source_mix_note, aihot_summary, codex_summary, priority, reading_pack_status, suggested_pool, human_status, final_pool, canonical_key, duplicate_status, practice_fit, reason。
```
改为：
```
id, date, title, original_url, source_url, source_origin, source_name, source_mix_note, aihot_summary, codex_summary, display_summary, priority, reading_pack_status, suggested_pool, human_status, final_pool, canonical_key, duplicate_status, novelty_reason, practice_fit, reason, read_reason, focus_direction, known_facts, open_questions。
其中：display_summary 为每条必填的事实摘要（AIhot 直接复用 aihot_summary，不改写）；read_reason/focus_direction 仅阅读包非 knowledge_gap 条目填写；known_facts/open_questions 仅 knowledge_gap 条目填写；去重/保留说明只写入 novelty_reason，reason 不得复述。
```

- [ ] **Step 2: 替换 §2 阅读包渲染规则**

将 §2 段（"## 2. 今日 30mins 阅读包 …候选池建议。"）整体替换为：
```
## 2. 今日 30mins 阅读包
按阅读顺序列出 P0 详细阅读、P1 扫读和 GitHub 热门/可复刻项目，不要另列为独立顶层章节。每条首行：标题、原始链接、建议池、human_status。随后：
- 摘要：display_summary（AIhot 直接用 aihot_summary，纯事实，不加解读）。
- 若建议池不是 knowledge_gap：给「推荐阅读原因」（read_reason，一句）和「关注方向」（focus_direction，读时关注的角度，不要臆造文章未必包含的细节）。不要再输出"读的时候看/读完判断"模板句。
- 若建议池是 knowledge_gap：改为两部分——「文章可获得的事实」（known_facts）与「需要额外研究的问题」（open_questions）。
"P0 详细阅读"仅用于确有深度的来源；若来源只是产品功能/发布介绍页（信息浅），降为 P1 扫读，靠摘要让用户判断，不要为凑深度而过度解读。
```

- [ ] **Step 3: 替换 §3 剩余链接渲染规则**

将 §3 段（"## 3. 未入选阅读包的剩余链接 …注明保留原因。"）整体替换为：
```
## 3. 未入选阅读包的剩余链接
列出剩余链接，尽量保持今日信息面完整。每条首行标注：优先级、AI 建议池、reading_pack_status、human_status、是否建议人工加入阅读包；非 AIhot 补充来源标注 source_mix_note。随后另起一行给「摘要」（display_summary，AIhot 用 aihot_summary，纯事实）。剩余链接不写推荐阅读原因/关注方向，克制解读。
去重/保留说明只出现一次：仅当 duplicate_status 为 material_update / carry_over / duplicate_suppressed 时，追加一行「保留/去重说明：<duplicate_status> — <novelty_reason>」。novelty_reason 只写一次，reason 不得复述该内容。
```

- [ ] **Step 4: 质量要求追加**

在"质量要求："列表追加：
```
- 每条链接都要有 display_summary；AIhot 来源直接复用 aihot_summary，不改写。
- 事实、AIhot 摘要、Codex 判断分离；剩余链接以事实摘要为主，克制解读。
- 去重/保留原因只写入 novelty_reason，并在报告中只呈现一次，reason 不复述。
- knowledge_gap 用"可获得的事实 + 需要额外研究的问题"呈现，不假装给出文章未包含的判断。
```

- [ ] **Step 5: Commit**

```bash
git add automations/ai-pm.toml
git commit -m "feat(prompt): daily radar per-link summary, knowledge_gap facts/questions, single dedup note, restrained P0"
```

---

## Task 4: 验证（change-protocol §6）

- [ ] **Step 1: TOML 解析**

Run: `python3 -c 'import tomllib, pathlib; [tomllib.loads(p.read_text()) for p in pathlib.Path("automations").glob("*.toml")]; print("all toml ok")'`
Expected: `all toml ok`。

- [ ] **Step 2: 联动检查（字段在 docs 与 automations 均出现）**

Run:
```bash
rg -n "display_summary|read_reason|focus_direction|known_facts|open_questions|novelty_reason" docs automations
```
Expected: 每个字段在 `docs/ingestion-normalization.md`、`docs/source-policy.md`（相关规则）、`automations/ai-pm.toml` 中均可检索到。

- [ ] **Step 3: 人工比对可接受输出**

对照"三、目标输出契约"逐项确认 prompt 的 §2/§3 措辞能产出该结构（knowledge_gap 两部分、剩余链接带摘要、去重说明单次、P0 深度约束）。

---

## Task 5: 同步 live 自动化（仓库外，用户执行）

- [ ] **Step 1:** 将 `automations/ai-pm.toml` 中更新后的 `prompt` 同步到 live Codex 自动化（`~/.codex/automations` 下对应的 ai-pm 配置）。仓库内只是快照，不同步则下次运行不生效（见 `automations/README.md`）。
- [ ] **Step 2:** 运行一次每日雷达，核对新版 `state/daily/YYYY-MM-DD-report.md` 是否符合"三、目标输出契约"。

---

## Linkage Matrix（change-protocol §5）

```text
Desired output: knowledge_gap 事实+问题；单次去重说明；每条摘要；克制解读
Required field(s): display_summary, read_reason, focus_direction, known_facts, open_questions, novelty_reason
Defined in ingestion-normalization.md? yes (Task 1)
Prioritized in source-policy.md? yes (Task 2)
Boosted in focus-policy.md? not needed
Emitted by daily radar? yes (Task 3, ai-pm.toml)
Consumed by weekly review? not needed（未来可选）
Consumed by demo recommendation? not needed
Consumed by engineering learning? not needed
Consumed by monthly review? not needed
Verification: TOML parse + rg 字段检索 + 人工比对示例 (Task 4)
```

## Self-Review

- **协议覆盖**：Output Contract（ai-pm.toml §2/§3/质量要求）、Signal Schema（ingestion-normalization §4/§4.1）、Policy（source-policy §9/§12）三层齐备，编辑顺序符合 change-protocol §4（schema→policy→prompt→verify）。
- **三问题对应**：问题1→knowledge_gap 的 known_facts/open_questions（Task1/2/3）；问题2→novelty_reason 单一来源 + 报告单次渲染（Task1 Step3、Task2 §9-19、Task3 §3）；问题3→display_summary 全量摘要 + 仅阅读包给理由/方向 + P0 深度约束（Task1/2/3）。
- **无占位符**：每步给出确切编辑文本与命令。
- **一致性**：新字段名 `display_summary/read_reason/focus_direction/known_facts/open_questions/novelty_reason` 在 schema 定义、policy 规则、prompt 发出三处一致；importer 通过 `rawJson` 容纳，无需本次改代码。
