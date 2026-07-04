# CortexOps Source Policy

This document is the base execution reference for all CortexOps automations.
Every automation prompt should treat this file as the primary policy layer unless
an automation-specific instruction explicitly overrides it.

## 1. Mission

CortexOps is the AI PM information operating system for an AI product manager
who is becoming a full-stack builder and preparing for AI PM interviews. Its
job is to convert fragmented external information into:

- durable signal
- manually confirmed product inspiration
- demo candidates
- paper candidates
- engineering learning tasks
- personal work artifacts
- interview-ready proof points
- weekly and monthly execution decisions

The system should optimize for judgment and action, not information hoarding.
When the user is in job-search mode, it should prioritize signals that help
prove fast industry adaptation, 2B product judgment, AI PM workflow thinking,
and rapid validation through Vibe Coding or small artifacts.

## 2. Core Operating Principles

1. Prefer official, primary, or first-hand sources over reposts and aggregators.
2. Prefer current product, engineering, or research signals over generic AI news.
3. Prefer actionable signals that can become a task, demo, memo, portfolio item,
   or interview story.
4. Avoid repeating low-value listicles, tool directories, and shallow trend posts.
5. Separate signal detection from deep analysis.
6. Treat manual review as part of the system, not a failure of automation.
7. Preserve weak signals in lightweight form when they may become stronger later.
8. Use weekly and monthly layers for prioritization, not duplicate summaries.
9. Do not repeat the same signal, source link, repo, paper, product, model,
   candidate-pool item, or practice recommendation within 7 days unless there is
   a material update, new primary evidence, measurable repo/release change, or
   an explicit user focus override.
10. During job-search periods, favor signals that support 2B AI PM roles, AI
    product judgment, rapid prototyping, Vibe Coding, and measurable validation.
11. Treat JSONL state and candidate pool files as the reusable system interface.
    Markdown reports are user-facing views, not the source of truth for later
    automations.

## 3. Source Hierarchy

### Tier 1: Highest priority

- Official model / product / company blogs
- Official GitHub repositories and release notes
- Top-tier conference / journal / proceedings pages
- Direct product documentation
- First-party engineering or research posts

### Tier 2: Strong supporting sources

- High-signal newsletters
- Credible industry reports
- Strong technical blogs
- Well-known researchers or builders on X / blog / podcast
- Repo activity, issue threads, and release signals

### Tier 3: Contextual supporting sources

- Chinese market coverage
- Local product announcements
- Community discussions
- Secondary commentary that helps interpret Tier 1 and Tier 2 signals

### Tier 4: Low priority

- Generic AI tool directories
- Thinly rewritten news mirrors
- SEO content with no source transparency
- Clickbait trend posts without concrete evidence

## 4. Source Usage Cadence

CortexOps should choose sources by cadence and decision role, not only by topic
or popularity.

### daily_discovery

Use for fresh 24-hour signal detection.

Primary sources:

- AIhot selected items as the main daily industry discovery feed
- official model / product / company blogs
- official GitHub repositories, releases, and changelogs
- GitHub Trending or topic searches for fresh AI / agent / MCP / developer tool
  projects
- key RSS feeds from credible product, engineering, research, and market sources

Rules:

- Daily discovery sources may enter the daily link list when they are fresh,
  reachable, and relevant.
- AIhot is a discovery feed, not a final proof source. P0 / P1 items should
  still be checked against the original source URL when possible.
- GitHub Trending should be treated as a fresh project radar. Do not recommend a
  repo only because it is trending; apply practice fit, entry barrier, and
  portfolio potential checks.
- Awesome lists and monthly background sources should not be used to fill daily
  quotas unless a listed project has a material new update.

### weekly_candidate

Use for refreshing candidate pools and selecting next actions.

Primary sources:

- awesome-llm-apps for runnable AI app, RAG, agent, and workflow demo candidates
- awesome-mcp-servers for MCP tools, integration opportunities, and agent tool
  ecosystems
- AI-Papers-of-the-Week for research candidates and product / engineering
  implications
- weekly GitHub release, issue, and repo activity checks for projects surfaced
  by daily discovery

Rules:

- Weekly candidate sources should feed the demo replication pool, paper
  candidate pool, knowledge gap pool, and personal work pool.
- Prefer candidates with a clear first action, recent activity, readable
  documentation, and a 3-8 hour replication path.
- Do not promote a weekly candidate into next week's execution card unless it
  has practice value and can produce a visible artifact.

### monthly_background

Use for direction calibration, missed-signal detection, and knowledge map
updates.

Primary sources:

- Awesome-LLM for LLM capability maps, evaluations, training / inference
  themes, and application direction
- awesome-ai-agents and awesome-agents for agent frameworks, automation,
  evaluation, and ecosystem categories
- awesome-llm-apps for durable demo and app-pattern candidates
- awesome-mcp-servers for MCP ecosystem and integration direction
- AI-Papers-of-the-Week for research direction calibration
- awesome-ChatGPT-repositories for OpenAI / Codex / API-specific project
  discovery

Rules:

- Monthly background sources should not answer "what happened today".
- Use them to ask whether an ecosystem direction is still worth following,
  whether CortexOps missed an important repo / paper / tool category, which
  directions should enter next month's demo / engineering / personal work pools,
  and which high-heat but low-practice directions should be downgraded.
- A background source cannot enter P0 / P1 only because it has high stars,
  historical fame, or broad coverage.
- Upgrade a background-source item only when it has a new release, visible
  maintenance activity, ecosystem shift, primary-source reinforcement, or a
  strong match with the active monthly focus.

## 5. Information Source Rules

### Podcasts

- Use podcasts as strategic signal sources, not as long-form notes.
- Extract one to three actionable signals only.
- Prefer hosts or guests who ship products, run labs, or influence AI tooling.

### GitHub

- Prefer repos with recent activity, clear product relevance, and reusable workflows.
- Do not optimize only for historical stars.
- Consider:
  - recent growth
  - release cadence
  - issue / PR quality
  - engineering signal
  - repeatability
  - fit for AI PM learning

### Research / Papers

- Use papers to scan research direction and product implications.
- Do not deeply unpack papers in the daily radar.
- If a paper is worth reading deeply, label it as a weekly paper candidate.
- Use weekly paper radar for deep reading.

### Newsletters / Blogs / X

- Prefer first-hand commentary from builders, researchers, and product leaders.
- Use these mainly to detect direction, language shifts, and emerging workflows.

### Industry Reports

- Use for macro direction, market framing, and category validation.
- Do not let reports override recent product or repo signals.

### Job Search / Interview Proof

- Prefer information that can become a concrete interview proof point.
- Prioritize 2B / enterprise AI, AI PM workflows, Vibe Coding, rapid MVP
  validation, evaluation, workflow automation, and productized agent use cases.
- Ask whether a signal can support a STAR-style interview story:
  situation, judgment, action, result.
- Prefer signals that can be converted within 1-3 days into a demo, product
  memo, validation note, competitive teardown, workflow diagram, or portfolio
  artifact.
- Downgrade signals that are interesting but cannot support interview narrative,
  role readiness, or fast validation evidence.

## 6. Signal Evaluation Criteria

Every signal should be judged on:

1. Relevance to AI PM / full-stack AI builder growth
2. Timeliness
3. Novelty
4. Product potential
5. Engineering learnability
6. Demo potential
7. Career / portfolio value
8. Interview proof value
9. Speed-to-validation
10. Confidence and source quality

## 7. Priority Rules

### P0

- Immediate relevance to the current week
- Can become a demo, memo, portfolio item, or interview story
- Strong multi-source validation

### P1

- Worth tracking during the week
- Might become a task, demo, or opportunity if reinforced

### P2

- Archive lightly
- Keep only the topic and source

### Drop

- Do not retain unless later sources materially change the picture

## 8. Escalation Rules

Upgrade a signal when:

- the same theme appears 2-3 days in a row
- GitHub, paper, and product sources converge
- the signal can become product inspiration or a demo
- the signal is clearly tied to the user's current portfolio, job search, or learning gap

Downgrade or drop when:

- it is generic AI noise
- it is not actionable
- it does not connect to product, engineering, or career outcomes
- it is too far from the user's current focus
- it appeared in the previous 7 days with no material update
- for GitHub projects, it has high engineering popularity but low practice fit,
  no clear first action, or no realistic path to a demo or artifact

### Continuity Rule

Daily outputs should suppress items that appeared in the previous 7 days by
default. Reintroduce an item only when there is material new evidence, such as a
new official announcement, release, changelog, issue, PR, paper update, repo
activity inflection, or explicit user override.

When an older item is reintroduced, label it as a carry-over or material update
and explain what changed. Do not present it as a fresh daily signal.

## 9. Daily Radar Rules

The daily AI PM radar should:

0. Prefer sources published or materially updated within the last 24 hours.
   Older sources may appear only as carry-over context, not as fresh daily
   signals.
1. Read `state/memory/ai-pm-7d.jsonl` before selecting P0/P1, reading-pack,
   GitHub, practice, or candidate-pool items.
2. Build and write the structured daily longlist first:
   `state/daily/YYYY-MM-DD-links.jsonl`.
3. Aim for 25-30 links in the daily longlist. AIhot is the main discovery
   source, but the longlist should not default to 30 AIhot-only links. Evaluate
   official / primary sources, product cases, product teardowns, strong product
   practice examples, GitHub / release / changelog sources, and research or
   report sources as supplements.
4. Use this daily source-mix target unless the day clearly argues otherwise:
   AIhot about 18-24 links; official / primary sources 2-5 links; product cases,
   product teardowns, or strong product practice examples 1-3 links; GitHub /
   release / changelog sources 2-4 links. If the longlist is still AIhot-only,
   record why other sources were not added.
5. For AIhot items, use AIhot as discovery and summary support. Confirm the
   original source URL before promoting to P0/P1 or the reading pack, and keep
   `aihot_summary` separate from CortexOps judgment.
6. Generate the user-facing report at `state/daily/YYYY-MM-DD-report.md` from
   the structured daily longlist.
7. Use this visible daily order: five-part daily summary, 30-minute reading
   pack, remaining links not selected for the reading pack, then three daily
   practice options.
8. The 30-minute reading pack should contain the P0 detailed-reading items, P1
   skim-reading items, and GitHub practice-fit candidates. Do not repeat those
   as separate top-level report sections.
9. Show the remaining non-selected links after the reading pack. Each remaining
   link should display AI suggested pool, priority, reading-pack candidacy, and
   whether it is waiting for human confirmation.
10. Run the 7-day continuity check as a background gate. Do not output a fixed
   continuity-check section. If a duplicate or carry-over item is retained
   because of material update, explain the reason directly on that link.
11. AI may suggest candidate-pool routing for every link, but this is not final.
   Write suggested pool entries to `pools/*.jsonl` with
   `human_status: pending`; later human edits to `final_pool` override the AI
   suggestion. Do not output a separate candidate-pool suggestion table in the
   daily report; show suggested routing as a per-link UI label or state field.
12. Do not automatically produce today's AI product inspiration. Keep the
   product inspiration pool for manually confirmed or manually changed items.
13. Produce three daily practice options, select one formal practice, and give
    manual routing suggestions for the other two: product inspiration pool,
    weekly demo candidate, archive, or drop.
14. After the user chooses any remaining links to add to the reading pack or
    chooses today's formal practice, update JSONL / pool state and provide a
    short confirmation summary. Do not regenerate a full candidate-pool table.
15. Apply the 7-day no-repeat rule to links, repos, papers, product/model
    announcements, candidate-pool items, reading-pack items, and practice
    recommendations.
16. Every daily link must carry a facts-only `display_summary`. For AIhot items,
    reuse `aihot_summary` verbatim; for non-AIhot items, extract a concise factual
    summary. The report shows this summary for every link so the user can judge
    without opening each source.
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

The daily radar is the entry point, not the final output.

## 10. Weekly and Monthly Rules

### Weekly

- Weekly outputs should select and schedule.
- They should choose what to read, what to build, and what to investigate next.
- Weekly outputs should not simply restate the daily radar.

### Monthly

- Monthly outputs should judge direction, not report news.
- They should answer:
  - continue
  - observe with lower weight
  - stop
  - build this month

## 11. Manual Review Points

The user should manually confirm:

- whether a signal is truly important
- whether priority should change
- whether the signal should go to product / paper / demo / learning / career paths
- whether the signal should be tracked longer
- whether the signal deserves a backlog item

Manual review is part of the control loop.

## 12. Output Quality Requirements

- Separate fact, inference, and recommendation.
- Prefer concrete sources and clickable links.
- Do not include broken, unreachable, or unverified URLs in P0/P1 items, reading
  packs, GitHub recommendations, candidate-pool entries, or daily exercises.
- Clearly separate fresh 24-hour signals from carry-over context.
- Avoid over-expanding daily content into a knowledge warehouse.
- Keep daily outputs decision-oriented: a compact reading pack first, followed
  by a structured longlist with AI suggestions for manual review.
- Keep weekly outputs actionable.
- Keep monthly outputs strategic.
- Attach a facts-only summary to every daily link; reuse `aihot_summary` for
  AIhot items without rewriting.
- Keep remaining links summary-first and restrained; reserve reasoning for
  reading-pack items.
- Render any dedup / retention explanation exactly once, sourced from
  `novelty_reason`.

## 13. Maintenance Rule

If a new source type or evaluation rule becomes important, update this file first.
Then update automation prompts to reference the revised policy.
