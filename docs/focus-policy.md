# CortexOps Focus Policy

This document defines the user-controlled attention layer for CortexOps.

`source-policy.md` defines what is valuable.
`ingestion-normalization.md` defines how raw inputs become signal objects.
`focus-policy.md` defines what the user wants CortexOps to emphasize next.

Every automation prompt should treat this file as an optional but important
policy layer. When focus rules are active, automations should use them to adjust
selection, prioritization, candidate pool routing, and follow-up actions.

## 1. Purpose

Focus rules let the user manually adjust CortexOps before the next automation
run.

Use focus rules when the user wants to:

- pay more attention to a source type, such as GitHub repositories
- track a topic for a limited period
- bias outputs toward demo, engineering learning, or portfolio work
- prefer signals that can be tried, replicated, or turned into an artifact
- bias outputs toward job-search readiness and interview proof
- reduce attention on noisy topics
- make weekly or monthly recommendations reflect current personal goals

Focus rules should guide prioritization. They should not override source
quality, confidence, or basic relevance checks.

## 2. Operating Principles

1. Focus rules modify attention; they do not guarantee inclusion.
2. High-quality primary sources still outrank low-quality sources.
3. A focus rule can upgrade a borderline signal from P2 to P1, or from P1 to P0
   when the signal is also timely, actionable, and well-supported.
4. Low-confidence signals should still require manual review before entering
   product inspiration, demo replication, or personal work pools.
5. Expired focus rules should not affect new automation runs.
6. Every active focus rule should be visible, editable, pausable, and removable.

## 3. Focus Rule Schema

Use this schema for each focus rule:

```text
focus_id
name
description
status
priority_boost
source_types
content_tags
candidate_pool_boost
applies_to
start_date
end_date
review_cadence
created_at
updated_at
notes
```

Allowed `status` values:

```text
active
paused
expired
archived
```

Allowed `priority_boost` values:

```text
low
medium
high
```

Suggested `applies_to` values:

```text
daily_radar
weekly_execution_review
paper_radar
demo_recommendation
monthly_review
```

Suggested `candidate_pool_boost` values:

```text
product
paper
engineering
```

## 4. Active Focus Rules

### GitHub Practice Fit

```yaml
focus_id: focus-github-practice-fit
name: GitHub Practice Fit
description: Prefer GitHub repositories, releases, issues, and pull requests
  that can be directly tried, lightly replicated, or converted into a small
  AI PM / indie developer artifact. Stars and engineering popularity are
  secondary to practice fit for the user's current stage.
status: active
priority_boost: high
source_types:
  - github_repo
  - github_release
  - github_issue
  - github_pull_request
content_tags:
  - agent
  - AI coding
  - eval
  - memory
  - workflow
  - developer tool
  - infra
  - demo
  - MVP
  - portfolio
candidate_pool_boost:
  - product
  - engineering
applies_to:
  - daily_radar
  - weekly_execution_review
  - demo_recommendation
  - start_date: 2026-07-01
end_date: 2026-07-14
review_cadence: weekly
created_at: 2026-07-01
updated_at: 2026-07-01
notes: Prefer projects with a clear trial path, low-to-medium entry barrier,
  1-3 hour minimum replication scope, product insight for AI PM work, and
  visible portfolio potential. Downgrade high-star projects that are mainly
  deep infra, hard to run, or useful only as architecture appreciation.
```

### Job Interview Proof

```yaml
focus_id: focus-job-interview-proof
name: Job Interview Proof
description: Prioritize information that helps the user prove AI PM job
  readiness: 2B product judgment, AI PM workflow thinking, fast industry
  adaptation, Vibe Coding execution, and the ability to validate results
  quickly through demos, memos, teardowns, or portfolio artifacts.
status: active
priority_boost: high
source_types:
  - official_blog
  - product_launch
  - github_repo
  - github_release
  - github_issue
  - github_pull_request
  - newsletter
  - podcast
  - personal_blog
  - industry_report
  - media_article
  - community_discussion
content_tags:
  - 2B
  - B2B
  - enterprise AI
  - AI PM
  - AI product management
  - Vibe Coding
  - AI coding
  - workflow automation
  - agent workflow
  - eval
  - MVP
  - prototype
  - product validation
  - GTM
  - ROI
  - integration
  - security
  - collaboration
  - portfolio
  - interview story
candidate_pool_boost:
  - product
  - paper
  - engineering
applies_to:
  - daily_radar
  - weekly_execution_review
  - paper_radar
  - demo_recommendation
  -   - monthly_review
start_date: 2026-07-02
end_date: 2026-08-31
review_cadence: weekly
created_at: 2026-07-02
updated_at: 2026-07-02
notes: Prefer signals that can become interview-ready proof within 1-3 days:
  demo, product memo, competitive teardown, validation note, workflow diagram,
  eval case, or portfolio artifact. Downgrade interesting but non-actionable
  news, consumer AI novelty, and deep technical topics that cannot support a
  job-search narrative or rapid validation evidence.
```

## 4.1 GitHub Practice Fit Rules

When the `GitHub Practice Fit` focus rule is active, GitHub recommendations
should be selected for practice value before engineering popularity.

### Selection Gate

A GitHub project should usually match at least two of these traits before it is
recommended as a main repo:

- It has an online demo, playground, hosted app, example output, or a very clear
  local quickstart.
- The README lets a non-expert full-stack learner understand the use case and
  first run path within 30 minutes.
- It can be reduced to a 1-3 hour minimum replication scope.
- It can produce a visible artifact, such as a screenshot, small demo, README,
  workflow template, evaluation case, or portfolio page material.
- It creates product insight for an AI PM, not only engineering architecture
  appreciation.
- It exposes a concrete knowledge gap that can become a small engineering
  learning task.

### Downgrade Conditions

Downgrade or avoid GitHub projects when:

- the project is mainly deep infrastructure and cannot be tried or replicated in
  the near term
- the setup requires heavy cloud resources, complex deployment, private models,
  or long configuration before any result is visible
- the README assumes a senior engineer audience and does not provide a clear
  beginner path
- the main value is high stars, trendiness, or architecture admiration, without
  a clear next action for the user
- it cannot become a demo, product inspiration, knowledge gap, or portfolio
  artifact within one week

### Required GitHub Recommendation Fields

When a GitHub project is included in the daily radar, demo recommendation, or
weekly execution review, include these practice-fit fields:

```text
practice_fit: high / medium / low
entry_barrier: low / medium / high
minimum_replication_scope
first_action_within_30_minutes
portfolio_potential
why_it_matches_current_stage
```

### Background Source Adaptation

When monthly background sources are scanned under this focus rule:

- Prefer repositories that can be tried, lightly replicated, or turned into a
  small visible artifact.
- Prioritize low-to-medium entry barrier projects with recent commits, releases,
  active issues, readable docs, examples, screenshots, hosted demos, or a clear
  quickstart.
- Use curated lists such as awesome-llm-apps, awesome-mcp-servers,
  Awesome-LLM, awesome-ai-agents, awesome-agents, and
  awesome-ChatGPT-repositories as discovery maps, not proof sources.
- Downgrade high-star projects that are not runnable, have unclear first
  actions, lack recent maintenance, or are useful only for background
  understanding.
- Promote a monthly background-source item only when it can feed next month's
  demo replication pool, engineering learning task, knowledge gap, product
  inspiration, or personal work pool.

## 4.2 Job Interview Proof Rules

When the `Job Interview Proof` focus rule is active, automation outputs should
prioritize signals that can strengthen the user's AI PM interview narrative and
portfolio evidence.

### Selection Gate

A signal is a strong fit when it can answer at least two of these questions:

- Does it help the user discuss 2B / enterprise AI product judgment, such as
  ROI, workflow integration, security, collaboration, admin controls, or change
  management?
- Does it help explain an AI PM workflow, such as problem framing, model
  capability boundaries, eval, agent workflow design, launch risk, or user
  validation?
- Can it become a fast validation artifact within 1-3 days, such as a demo,
  product memo, competitive teardown, workflow diagram, landing-page test,
  eval case, or small Vibe Coding prototype?
- Can it support a STAR-style interview story: situation, judgment, action,
  result?
- Does it show the user's ability to adapt to current industry rhythm and turn
  new information into action quickly?

### Downgrade Conditions

Downgrade or avoid signals when:

- they are interesting industry news but do not support job-search readiness,
  interview narrative, or a next action
- they are consumer AI novelty without relevance to 2B, AI PM, workflow, or
  validation
- they require deep technical investment before any visible result can be shown
- they cannot become a demo, memo, teardown, validation note, learning task, or
  portfolio artifact within one week

### Required Interview-Proof Fields

When a signal is promoted by this focus rule, include:

```text
interview_relevance: high / medium / low
target_role_signal: 2B / AI PM / Vibe Coding / rapid validation / portfolio
proof_artifact
validation_window: same day / 1-3 days / one week
interview_story_angle
next_proof_action
```

### Monthly Background Calibration

When monthly background sources are scanned under this focus rule:

- Use them to decide which AI PM, agent, MCP, eval, workflow automation, and
  Vibe Coding directions are worth next month's attention.
- Keep only directions that can support 2B AI PM judgment, AI workflow design,
  eval thinking, agent / MCP integration, rapid validation, or portfolio
  evidence.
- Downgrade background directions that are intellectually interesting but cannot
  become a demo, memo, teardown, validation note, workflow diagram, eval case, or
  portfolio artifact within one month.
- Treat background sources as calibration signals. They can justify "continue",
  "observe with lower weight", "stop", or "build this month", but they should
  not become daily news items by themselves.

## 5. How Automations Should Apply Focus Rules

### Daily AI PM Radar

When a matching focus rule is active:

- increase representation of matching source types in the link list
- prefer matching P1 candidates over equally credible non-matching P1 items
- call out matching GitHub or engineering signals in the 30-minute reading pack
- route strong matching items to the appropriate candidate pool
- flag uncertain but relevant items for manual review

The daily radar should still avoid low-quality directories, shallow listicles,
and unverified social claims.

### Weekly Execution Review

When a matching focus rule is active:

- check whether the week's signals support the focus
- promote matching signals into the unified signal pool when justified
- consider matching items for next week's execution card
- explain whether the focus should continue, narrow, pause, or expire

### Demo Recommendation

When a matching focus rule is active:

- prefer demo candidates that match the source type, tags, and pool boost
- select projects that can be replicated in 3-8 hours
- emphasize reusable workflow, README quality, and portfolio value

### Engineering Learning

When a matching focus rule is active:

- derive learning tasks from matching repos, releases, or engineering patterns
- prefer tasks that unblock the current demo or portfolio direction
- keep the weekly task small enough to finish in 2-5 hours

### Monthly Review

When a matching focus rule is active or recently expired:

- evaluate whether the focus produced useful signals, tasks, or artifacts
- recommend continue, lower weight, stop, or turn into a monthly build theme

## 6. Priority Adjustment Rules

A focus rule may upgrade a signal when:

- the signal matches active source types or tags
- the source is Tier 1 or Tier 2
- the signal has recent activity or concrete evidence
- the signal can become a task, demo, memo, or artifact within one week

Upgrade examples:

```text
P2 -> P1:
Matching signal is relevant and credible, but still needs more evidence.

P1 -> P0:
Matching signal is timely, actionable, and connected to current work, portfolio,
or a demo candidate.
```

A focus rule should not upgrade a signal when:

- the source is low quality
- the item has no clear product, engineering, research, or career implication
- the content is duplicate with no new information
- the item cannot support a next action

## 7. Manual Review Requirements

Send a focused signal to manual review when:

- confidence is medium or low
- the priority was upgraded because of a focus rule
- the item may become a demo or personal work artifact
- the routing decision is ambiguous
- the source is strong but metadata is incomplete

The review UI should show:

```text
Matched focus rule
Original suggested priority
Adjusted priority
Reason for adjustment
Suggested candidate pool
Recommended next action
```

## 8. Editing and Expiration

The user should be able to:

- create a focus rule
- edit its description, scope, tags, and boosts
- pause it without deleting it
- archive it after it is no longer useful
- delete it if it was created by mistake
- set a start and end date
- review its impact weekly

Expired rules should stay visible in history but should not affect future
automation runs.

## 9. Impact Preview

Before saving a focus rule, the UI should preview expected effects.

Example:

```text
Expected impact:
- Daily radar will give more space to GitHub repositories and releases.
- P1 GitHub items with strong activity may be considered for P0.
- Demo recommendation will favor reproducible open-source workflows.
- Engineering learning tasks may be derived from repo patterns.
- Low-confidence GitHub items will still require manual review.
```

## 10. Maintenance Rule

When user priorities change, update this file before updating individual
automation prompts. Automation prompts should reference this file instead of
duplicating focus rules in long prompt bodies.
