# Supplemental prefetch — GitHub & arXiv (Terminal only)

CortexOps daily ingest **supplemental** sources are fetched in macOS Terminal
(`scripts/ai-pm-ingest-prefetch.sh`), not in Codex/Cursor sandbox.

AIhot remains **required**; GitHub and arXiv are **optional** — failure →
`status: skipped`, daily report may continue AIhot-only.

## Output files

| Source | Raw path | Manifest `fetch_mode` |
|--------|----------|------------------------|
| arXiv | `state/daily/YYYY-MM-DD-arxiv-raw.xml` | `export_api` |
| GitHub | `state/daily/YYYY-MM-DD-github-raw.json` | `search_api` |

Manifest `sources.*.status`:

| status | Meaning |
|--------|---------|
| `ok` | raw exists, `item_count >= 1` — Automation may map |
| `skipped` | Terminal fetch failed — Automation **must not curl** |

## arXiv

```text
GET https://export.arxiv.org/api/query
  ?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL
  &sortBy=submittedDate
  &sortOrder=descending
  &max_results=20
```

Transient timeouts (curl exit 28) are common behind proxies. Prefetch retries up
to `ARXIV_ATTEMPTS` (default **3**) with `--connect-timeout` /
`--max-time` (`ARXIV_CONNECT_TIMEOUT` default 15s, `ARXIV_MAX_TIME` default 60s)
and backoff sleep `attempt * 2` seconds. Still non-blocking: all failures →
`status: skipped`.

### Atom entry → JSONL

| arXiv | JSONL field | Rule |
|-------|-------------|------|
| `<id>` | `original_url` | `https://arxiv.org/abs/{short_id}` |
| `<title>` | `title` | trim newlines |
| `<summary>` | `discovery_summary` | verbatim |
| — | `display_summary` | same as `discovery_summary` |
| — | `source_origin` | `primary` |
| — | `source_mix_note` | `arxiv_export_supplement` |
| — | `aihot_summary` | empty |
| — | `aihot_summary_status` | `not_applicable` |

## GitHub Search API

Config: `config/github-prefetch.toml`

```toml
[search]
query = "(topic:agent OR topic:llm OR topic:mcp) stars:>50"
per_page = 15
since_days = 7
```

Optional token: `~/.cortexops/github-prefetch.env` → `GITHUB_TOKEN=ghp_...`

Normalized `*-github-raw.json`:

```json
{
  "fetched_at": "ISO8601",
  "query": "...",
  "items": [
    {
      "full_name": "owner/repo",
      "html_url": "https://github.com/owner/repo",
      "description": "...",
      "stargazers_count": 123,
      "pushed_at": "ISO8601",
      "topics": ["agent"]
    }
  ]
}
```

### items[] → JSONL

| GitHub | JSONL field | Rule |
|--------|-------------|------|
| `html_url` | `original_url` | repo homepage |
| `full_name` | `title` | primary title |
| `description` | `discovery_summary` | verbatim if non-empty |
| — | `display_summary` | same as `discovery_summary` |
| — | `source_origin` | `primary` |
| — | `source_mix_note` | `github_search_supplement` |
| — | `aihot_summary` | empty |
| — | `aihot_summary_status` | `not_applicable` |

## Automation rules (strict)

1. **Never** curl GitHub, arXiv, or any external URL inside Codex/Cursor sandbox.
2. Read supplemental raw only when manifest `status==ok` and file exists.
3. On `skipped`, disclose in report §1: `*_supplement=skipped_no_prefetch`.
4. Do not fabricate supplemental links.

## Verify

```bash
./scripts/codex-daily-prefetch.sh
python3 scripts/verify-daily-ingest.py $(TZ=Asia/Shanghai date +%Y-%m-%d)
```

## See also

- `docs/aihot-api.md` — AIhot primary source
- `docs/codex-terminal-prefetch.md` — operator workflow
