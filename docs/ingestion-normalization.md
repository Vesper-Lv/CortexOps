# CortexOps Ingestion & Normalization

This document defines how CortexOps collects, parses, cleans, and normalizes
external information before it enters the signal judgment layer.

`source-policy.md` defines what is valuable. This file defines how raw inputs
become usable signal objects.

## 1. Purpose

The ingestion and normalization layer converts fragmented external inputs into a
standard signal format that can be routed into:

- product inspiration pool
- paper candidate pool
- demo replication pool
- knowledge gap pool
- personal work pool
- archive / drop

This layer should run mostly in the background. The user should only see the
result, exceptions, and items that require judgment.

The normalized JSONL files are the reusable source of truth. Markdown reports
are human reading views generated from those files.

## 2. Supported Source Types

Supported source types:

- official blog
- product launch page
- GitHub repository
- GitHub release / issue / pull request
- research paper / arXiv / PDF
- newsletter
- podcast / transcript
- personal blog
- X / social post
- industry report
- media article
- community discussion

Each source should be classified as one of:

- Tier 1: official or primary source
- Tier 2: strong supporting source
- Tier 3: contextual source
- Tier 4: low-priority or low-confidence source

Tier rules are defined in `source-policy.md`.

Each source should also receive:

- `source_role`: `daily_discovery`, `weekly_candidate`, or `monthly_background`
- `review_cadence`: `daily`, `weekly`, `monthly`, or `ad_hoc`
- `source_origin`: `primary`, `aggregator`, `curated_list`, or `community_index`

Source role defines when a source should influence automation outputs. Source
origin defines how much verification is required before the item can become a
recommendation.

## 3. Extraction Rules by Source Type

### Official Blog / Product Launch Page

Extract:

- title
- publisher / company
- URL
- publish date
- product or model name
- key announcement
- affected users
- product implication
- engineering implication
- pricing / availability if relevant

Rules:

- Treat official announcements as primary sources.
- Separate announced facts from product interpretation.
- If the post is mostly marketing language, extract only concrete changes.

### AIhot Discovery Item

Extract:

- AIhot title
- AIhot URL or item ID if available
- original source URL
- original publisher / author
- AIhot summary
- publish date or observed date
- source origin
- source role
- candidate pool fit
- whether the original URL is reachable

Rules:

- Treat AIhot as a `daily_discovery` aggregator and discovery source, not as
  final proof.
- Daily AIhot fetch order (mandatory):
  1. `mode=selected` + `since=last_run_finished_at` (rolling 24h primary path).
  2. If selected count < 12: supplement with new keys only—AIhot daily/48h,
     then GitHub/Anthropic/OpenAI/arXiv; narrow carry-over max 3–5 items
     (`candidate`, `material_update`, high practice_fit skipped for pack size).
     Never bulk carry yesterday's generic remaining links.
  3. If longlist < 25: report `fresh signals thin, supplements dominated`; do
     not pad to 30.
- Use the AIhot title as the daily title candidate when it is clearer than the
  original title.
- Confirm the original source link before promoting an item into P0, P1, the
  30-minute reading pack, a GitHub recommendation, or a formal daily practice.
- Copy AIhot's summary into `aihot_summary` and `display_summary` after the
  original source URL has been identified. Use the API summary verbatim; do not
  rewrite. Keep `aihot_summary` separate from `codex_summary`, `reason`, and
  recommendation fields.
- If the original URL cannot be confirmed, keep the item as pending manual
  review or archive it; do not present the AIhot summary as verified original
  evidence.

### GitHub Repository

Extract:

- repo name
- owner
- URL
- stars
- recent growth if available
- last commit / release date if available
- README summary
- problem solved
- tech category
- install / run difficulty
- demo potential
- reusable workflow / component
- practice fit: high / medium / low
- entry barrier: low / medium / high
- minimum replication scope
- first action within 30 minutes
- portfolio potential

Rules:

- Do not rank only by historical stars.
- Prefer recent activity, clear use case, and replicability.
- Practice fit matters more than engineering popularity when the user is
  choosing what to try next.
- A strong GitHub candidate should have a visible trial path, a small
  replication scope, or a clear path into a demo, learning task, product
  inspiration, or portfolio artifact.
- Downgrade abandoned or unclear repos.
- Downgrade high-star repositories that are mostly deep infrastructure,
  difficult to run, or valuable only as architecture reference.
- If the repo can be replicated in 3-8 hours, mark as demo candidate.

### GitHub Release / Issue / Pull Request

Extract:

- repo
- URL
- release / issue / PR title
- date
- change summary
- affected feature
- why it matters

Rules:

- Use releases and issue discussions as engineering signals.
- Do not over-interpret a single issue unless it reflects a broader user pain.

### Research Paper / arXiv / PDF

Extract:

- title
- authors
- institution if visible
- URL / DOI / arXiv link
- date
- abstract summary
- field
- method / contribution at high level
- product implication
- engineering implication
- whether it should become a weekly paper candidate

Rules:

- Daily radar only scans research signal.
- Do not write deep paper notes in the daily flow.
- If worth deep reading, mark as weekly paper candidate.
- If the paper has no product or engineering implication, archive lightly.

### Newsletter

Extract:

- newsletter name
- author
- URL
- date
- main claim
- referenced primary sources
- why it matters
- suggested follow-up source

Rules:

- Prefer newsletters that cite primary sources.
- Downgrade newsletters that summarize without links.
- Use newsletters for framing, not as sole evidence.

### Podcast / Transcript

Extract:

- podcast name
- episode title
- guest / host
- URL
- publish date
- transcript availability
- one to three actionable signals
- quoted idea or paraphrased thesis

Rules:

- Prefer transcript-based extraction.
- Without transcript, keep confidence lower.
- Do not create long podcast notes in the daily radar.

### Personal Blog / X / Social Post

Extract:

- author
- author role
- URL
- date
- claim or observation
- evidence cited
- relevance
- whether it needs verification

Rules:

- Treat social posts as signal, not proof.
- Upgrade only when supported by product, GitHub, research, or official sources.

### Industry Report

Extract:

- publisher
- URL
- publish date
- market / category
- key finding
- methodology if available
- product implication
- strategic implication

Rules:

- Use reports for macro framing.
- Do not let reports override recent primary product or repo signals.
- Mark unclear methodology as medium or low confidence.

### Media Article / Community Discussion

Extract:

- publication / community
- URL
- date
- claim
- primary source if linked
- signal category
- confidence

Rules:

- Prefer media that links to primary evidence.
- Community discussion can reveal pain points but should not be treated as fact.

### Background Source / Curated List

Extract:

- source name
- source URL
- source maintainer / owner
- source role
- review cadence
- source origin
- represented categories
- newly added or materially updated items if visible
- active repositories or papers worth follow-up
- ecosystem gaps or repeated themes
- candidate pool fit

Rules:

- Background sources include Awesome-LLM, awesome-ai-agents, awesome-agents,
  awesome-ChatGPT-repositories, and other broad curated maps.
- Background sources should extract directory changes, active projects,
  representative categories, ecosystem gaps, and durable reference value.
- Background sources default to `archive` or `knowledge_gap`; they should not
  directly enter the daily link list, 30-minute reading pack, P0/P1 selection,
  GitHub recommendation, product inspiration, or daily practice.
- A background-source item may enter `demo_replication` or `personal_work` only
  when the referenced project has strong practice fit, low or medium entry
  barrier, recent activity, and a visible artifact path.
- High stars, historical popularity, or broad list coverage are not enough to
  upgrade a background-source item.

## 4. Standard Signal Schema

Every normalized item should become a signal object with these fields:

```text
signal_id
date
published_at
observed_at
title
source_name
source_url
original_url
source_type
source_tier
source_role
review_cadence
source_origin
source_mix_note
original_format
aihot_summary
codex_summary
url_status
url_checked_at
duplicate_window_status
canonical_key
duplicate_status
freshness_status
novelty_reason
summary
why_it_matters
tags
priority
confidence
reading_pack_status
suggested_pool
candidate_pool
human_status
final_pool
practice_fit
requires_manual_review
next_action
status
display_summary
read_reason
focus_direction
known_facts
open_questions
```

### Field Values

`source_type`:

```text
official_blog
product_launch
github_repo
github_release
paper
newsletter
podcast
personal_blog
x_post
industry_report
media_article
community_discussion
```

`source_role`:

```text
daily_discovery
weekly_candidate
monthly_background
```

`review_cadence`:

```text
daily
weekly
monthly
ad_hoc
```

`source_origin`:

```text
primary
aggregator
curated_list
community_index
```

`source_mix_note`:

```text
main_aihot
primary_verification
product_case_supplement
product_teardown_supplement
github_or_release_supplement
research_or_report_supplement
not_added_reason
```

Use `source_mix_note` to explain why a non-AIhot item was added to the daily
longlist, or why no non-AIhot supplement was used. Product case and product
teardown sources may route to `product_inspiration`, `knowledge_gap`, or
`personal_work`, but still require human confirmation.

`priority`:

```text
P0
P1
P2
archive
drop
```

`confidence`:

```text
high
medium
low
```

`candidate_pool`:

```text
product_inspiration
paper_candidate
demo_replication
knowledge_gap
personal_work
archive
drop
```

`reading_pack_status`:

```text
selected
candidate
not_selected
```

`suggested_pool` uses the same values as `candidate_pool`. It is the AI's
recommendation, not the final routing decision.

`suggested_pool` is also the UI label shown beside each daily link. The daily
report does not need an additional candidate-pool summary table when every link
already carries its suggested pool, `human_status`, and `final_pool` fields.

`human_status`:

```text
pending
confirmed
changed
rejected
```

`final_pool` uses the same values as `candidate_pool`. When `human_status` is
`changed`, downstream automations must use `final_pool` instead of
`suggested_pool`.

`duplicate_status`:

```text
new
duplicate_suppressed
material_update
carry_over
manual_override
```

`novelty_reason` is the single source of truth for any duplicate / carry-over /
material-update retention explanation. When `duplicate_status` is
`material_update`, `carry_over`, or `duplicate_suppressed`, write the reason ONLY
in `novelty_reason`. Do not repeat that text in `reason`, and the daily report
must render the retention note beside the affected link exactly once, instead of
creating a fixed 7-day continuity-check section.

`status`:

```text
inbox
confirmed
watching
scheduled
in_progress
done
archived
dropped
```

`url_status`:

```text
reachable
unreachable
parse_failed
verification_unavailable
```

`duplicate_window_status`:

```text
new
duplicate_7d
material_update
user_override
```

`freshness_status`:

```text
fresh_24h
recent_7d
carry_over
stale
```

`display_summary`:

Facts-only summary shown for every daily link (reading pack and remaining). For
AIhot items, copy `aihot_summary` verbatim (do not rewrite). For non-AIhot items,
extract a concise factual summary. No interpretation or recommendation.

`read_reason` and `focus_direction`:

Only for reading-pack items whose pool is not `knowledge_gap`. `read_reason` is
one line on why it is worth reading. `focus_direction` is the angle to focus on
while reading; it must not assert specifics the source may not contain.

`known_facts` and `open_questions`:

Only for `knowledge_gap` items. `known_facts` lists facts obtainable from the
article itself. `open_questions` lists questions that still need extra research
after reading. Do not fabricate conclusions the article does not support.

## 4.1 State File Contracts

Daily AI PM radar runs should write state before producing or updating the
human-readable report.

### Daily Link State

Write every collected daily link to:

```text
state/daily/YYYY-MM-DD-links.jsonl
```

Each line should use the standard signal schema and include at minimum:

```text
id
date
title
original_url
source_url
source_origin
source_name
aihot_summary
codex_summary
priority
reading_pack_status
suggested_pool
human_status
final_pool
canonical_key
duplicate_status
practice_fit
reason
display_summary
read_reason
focus_direction
known_facts
open_questions
novelty_reason
```

The daily Markdown report at `state/daily/YYYY-MM-DD-report.md` is a view over
this JSONL file. It should not be the primary data source for future automation
runs.

### 7-Day Memory

Write selected and action-oriented items to:

```text
state/memory/ai-pm-7d.jsonl
```

This file is the first source for 7-day duplicate checks. It should include:

- selected 30-minute reading pack items
- main GitHub recommendations
- formal daily practice selections
- links written to a candidate pool with `human_status: pending`, `confirmed`,
  or `changed`

Use stable `canonical_key` values:

- GitHub repositories: `owner/repo`
- papers: DOI or arXiv ID when available
- product / model announcements: normalized product or model name plus date
- ordinary URLs: normalized canonical URL without tracking parameters

If memory and a long-form report disagree, trust memory for duplicate detection
and use the report only as context for why the item mattered.

### Candidate Pool Files

AI may suggest pool routing, but the user owns the final route.

Write suggested candidates to:

```text
pools/product-inspiration.jsonl
pools/paper-candidates.jsonl
pools/demo-replication.jsonl
pools/knowledge-gap.jsonl
pools/personal-work.jsonl
pools/archive.jsonl
```

Initial AI-written entries should use:

```text
human_status: pending
final_pool: <same value as suggested_pool>
```

If the user accepts the route, set `human_status: confirmed`. If the user
changes the route, set `human_status: changed` and update `final_pool`. If the
user rejects the item, set `human_status: rejected`.

Weekly, monthly, demo, and engineering-learning automations must prefer
`confirmed` and `changed` entries. They may use `pending` entries only when they
need fresh candidates and should clearly label them as unconfirmed.

## 4.2 Pre-Inclusion Gates

Run these gates before a candidate enters the daily link list, P0/P1 selection,
30-minute reading pack, GitHub recommendation, product inspiration, or daily
practice.

1. URL Reachability Gate
   - Keep only reachable URLs for P0/P1 and action-oriented sections.
   - Drop 404, broken, blocked, or unverified links unless they require manual
     review for strategic reasons.

2. 7-Day Duplicate Gate
   - Check `state/memory/ai-pm-7d.jsonl` first, then recent long-form reports
     only as fallback context.
   - Match by URL, repo, paper/arXiv ID, product/model name, announcement,
     product inspiration, and practice target.
   - Suppress duplicates unless there is a material update or explicit user
     override.

3. 24-Hour Freshness Gate
   - Prefer sources published or materially updated within 24 hours.
   - Treat older sources as carry-over context unless new evidence changes their
     status.
   - Do not use stale items to fill category quotas.

4. Background Source Gate
   - Keep `monthly_background` sources out of daily outputs unless a specific
     referenced item has a material new update.
   - Route background-source findings to monthly review, knowledge gap, archive,
     or manual review by default.
   - Require practice fit and recent activity before a background-source project
     enters demo replication or personal work pools.

## 5. Deduplication Rules

Deduplicate before daily output.

Rules:

- Same product announcement across multiple sources becomes one signal.
- Same GitHub repo across multiple days should not repeat unless there is a new release, growth inflection, or new use case.
- Same paper discussed by multiple sources should merge into one research signal.
- Same trend appearing repeatedly should be marked as recurring rather than expanded each time.
- A signal that appeared in the previous 7 days should be suppressed by default,
  including repeated links, repos, papers, product/model announcements, product
  inspirations, and daily practice targets. Reintroduce it only when there is a
  material update, new primary evidence, measurable repo/release change, or an
  explicit user override.

Merged signal should keep:

- primary source
- supporting sources
- multi-source validation note
- updated confidence
- previous recommendation history

## 6. Tagging Rules

Each signal should receive content tags and use-case tags.

### Content Tags

Use one or more:

```text
agent
RAG
eval
AI coding
multimodal
workflow
memory
infra
developer tool
productivity
research
consumer AI
enterprise AI
security
data
UX
business model
2B
B2B
AI PM
Vibe Coding
product validation
prototype
ROI
integration
collaboration
interview story
```

### Use-Case Tags

Use one or more:

```text
product inspiration
paper candidate
demo replication
knowledge gap
personal work
light archive
drop
```

Content tags describe what the signal is. Use-case tags describe what it is for.

## 7. Priority Pre-classification

Before final signal judgment, pre-classify priority:

### P0 Candidate

- Strong relevance to current week
- Supports portfolio, job search, PCD, CortexOps, or demo work
- Has strong primary evidence or multi-source validation
- Can become an action within one week
- Can strengthen an interview story, role-readiness proof, or fast validation
  artifact

### P1 Candidate

- Worth watching this week
- Needs more evidence or a second source
- May become a product inspiration, demo, paper, or knowledge task

### P2 Candidate

- Useful context, but not actionable now
- Keep only topic, source, and reason

### Drop Candidate

- Low-quality source
- No clear relevance
- No product, engineering, research, or career implication
- Duplicate with no new information

## 8. Confidence Rules

### High Confidence

- Official source or primary artifact
- Clear date and author / publisher
- Concrete product, research, or engineering evidence
- Supported by multiple credible sources

### Medium Confidence

- Strong secondary source
- Some evidence but not enough for P0
- Needs follow-up verification

### Low Confidence

- Social-only claim
- No primary source
- Unclear date, author, or methodology
- Community rumor or vague commentary

Low-confidence signals can be kept, but should require manual review before
entering product inspiration, demo, or personal work pools.

## 9. Candidate Pool Routing

Route signals by use, not by content type.

### Product Inspiration Pool

Route when:

- there is a clear user pain or workflow gap
- the signal suggests an AI-enabled product hypothesis
- a 1-2 week MVP or research task is possible
- it can support a 2B / AI PM interview discussion, product judgment, or
  validation story

Requires manual confirmation before becoming a real backlog item.

### Paper Candidate Pool

Route when:

- the research signal is worth weekly deep reading
- it connects to AI product, engineering, cognition, HCI, trust, eval, or workflow design

### Demo Replication Pool

Route when:

- the item can become a runnable demo in 3-8 hours
- it trains a useful AI engineering skill
- output can become README, recording, screenshot, or portfolio artifact
- it can become proof of rapid validation, Vibe Coding execution, or AI PM
  workflow understanding
- the item did not appear in the previous 7 days unless it has a material
  update, new primary evidence, measurable repo/release change, or explicit user
  override

### Knowledge Gap Pool

Route when:

- the signal exposes a missing concept or skill
- the gap blocks demo work, product judgment, interview readiness, or portfolio clarity
- the gap can be addressed through a small learning task

### Personal Work Pool

Route when:

- the result can be shown externally
- it strengthens portfolio, personal website, interview narrative, or personal brand
- it has a clear artifact: demo, report, product card, architecture diagram, README, recording, or essay
- it can be explained as a STAR-style interview story: situation, judgment,
  action, result

## 9.1 Interview Proof Metadata

When a signal is connected to job search, 2B AI PM readiness, Vibe Coding, or
rapid validation, add:

```text
interview_relevance: high / medium / low
target_role_signal: 2B / AI PM / Vibe Coding / rapid validation / portfolio
proof_artifact
validation_window: same day / 1-3 days / one week
interview_story_angle
next_proof_action
```

Use `interview_relevance: high` only when the signal can plausibly become
evidence the user can discuss in an interview within one week.

## 10. Error and Exception Handling

Common exceptions:

- link unavailable
- page parse failure
- PDF parse failure
- podcast has no transcript
- GitHub metadata unavailable
- source credibility unclear
- duplicate detected
- insufficient content for judgment

Handling rules:

- Broken or unreachable URL: exclude from P0/P1, reading pack, GitHub
  recommendation, product inspiration, and daily practice. Route to manual
  review only if strategically important.
- Duplicate within 7 days without material update: suppress from the daily
  radar.
- Older-than-24-hour source without material update: keep only as carry-over
  context or archive.
- Important but failed source: send to manual review.
- Low-quality failed source: drop.
- Missing metadata but strong source: keep with medium confidence.
- Conflicting sources: keep with low confidence and flag for verification.
- Duplicate with no new information: merge or drop.

## 11. Dashboard Exposure Rules

The dashboard should not expose all ingestion steps.

Show:

- inbox signals requiring confirmation
- candidate pools
- weekly tasks
- blocked items
- completed artifacts
- lightweight system health

Do not show by default:

- every fetched raw item
- every parsing step
- every duplicate candidate
- long cleaning logs

Optional system health indicators:

```text
sources checked
signals created
duplicates merged
low-quality items dropped
parse failures
manual review required
```

The user-facing workflow begins at `Inbox`, not at raw collection.
