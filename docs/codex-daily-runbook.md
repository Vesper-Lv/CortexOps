# CortexOps 日报 — 命令速查

> 工作目录：`~/Documents/CortexOps`  
> 时区：`Asia/Shanghai`（日期变量用上海日界）

```bash
cd ~/Documents/CortexOps
DATE=$(TZ=Asia/Shanghai date +%Y-%m-%d)
```

---

## 目录口径

- `state/daily` 分成两个逻辑区：`active/` 和 `backups/`
- `active/` 只放当天正式流程要用的日报文件
- `backups/` 只放历史成品、A/B test 副本、重跑产物和临时备份
- **2026-07-18 之前**的成品日报统一视为备份
- **2026-07-18** 起才算当前 web 端的数据积累起点
- `2026-07-18-report-A.md` 归入备份，不留在正式目录
- `ingest-error` 只在失败态保留；当天补跑成功后，从 `active/` 清除，必要时归档到 `backups/`
- `active/` 就是 web 的输入面，成功日报写进去即视为已导入，不再另设同步脚本

## Web 扫描

- web 端只扫描 `state/daily/active/`
- 看到当天 `YYYY-MM-DD-report.md` 和 `YYYY-MM-DD-links.jsonl` 就算导入完成
- `backups/` 不参与扫描，也不参与当前数据积累

---

## 一、环境与代码同步

```bash
git pull origin codex/source-layering-policy
git log --oneline -1

# 本地改动挡住 pull
git stash push -m "temp" <文件路径>
git pull origin codex/source-layering-policy
git stash pop

chmod +x scripts/*.sh
python3 -c 'import tomllib; tomllib.loads(open("automations/ai-pm.toml").read()); print("toml ok")'
```

---

## 二、Codex 日报（最常用）

### 日常全自动（推荐）

```bash
./scripts/codex-daily-run.sh
./scripts/codex-daily-run.sh 2026-07-09
FORCE=1 ./scripts/codex-daily-run.sh          # 覆盖今日 report
tail -f state/daily/codex-daily-run.log
```

### 分步（调试）

```bash
./scripts/codex-daily-prefetch.sh             # 或 ./scripts/daily-prefetch.sh
python3 scripts/verify-daily-ingest.py "$DATE"
SKIP_CODEX=1 ./scripts/codex-daily-run.sh   # 只 prefetch
```

### 统一编排

```bash
RUNNER=codex  ./scripts/daily-ingest-pipeline.sh
RUNNER=cursor ./scripts/daily-ingest-pipeline.sh
RUNNER=both   ./scripts/daily-ingest-pipeline.sh
RUNNER=none   ./scripts/daily-ingest-pipeline.sh   # 只 prefetch
```

---

## 三、Prompt 同步

```bash
cp automations/ai-pm.toml ~/.codex/automations/ai-pm.toml
diff automations/ai-pm.toml ~/.codex/automations/ai-pm.toml && echo "in sync"

python3 -c "import tomllib; print(tomllib.loads(open('automations/ai-pm.toml').read())['prompt'])" | pbcopy

python3 -c "import tomllib; p=tomllib.loads(open('automations/ai-pm.toml').read())['prompt']; print('skipped_no_prefetch' in p, '禁止' in p and 'curl' in p)"
```

---

## 四、验收 / 检查产物

```bash
ls -la state/daily/${DATE}-{aihot-raw.json,arxiv-raw.xml,github-raw.json,ingest-manifest.json}
ls -la state/daily/active/${DATE}-{aihot-raw.json,arxiv-raw.xml,github-raw.json,ingest-manifest.json}
ls -la state/daily/active/${DATE}-{links.jsonl,report.md}
open state/daily/active/${DATE}-report.md

grep -nE 'ingest_mode|skipped_no_prefetch|arxiv_supplement|github_supplement' state/daily/active/${DATE}-report.md

python3 scripts/verify-daily-ingest.py "$DATE"
echo $?

wc -l state/daily/active/${DATE}-links.jsonl
pgrep -fl "codex.*exec"
```

---

## 五、launchd 定时

```bash
./scripts/install-daily-launchd.sh
grep RUNNER ~/Library/LaunchAgents/com.cortexops.daily-ai-pm.plist

sed -i '' 's/RUNNER=both/RUNNER=codex/' ~/Library/LaunchAgents/com.cortexops.daily-ai-pm.plist
launchctl bootout gui/$(id -u)/com.cortexops.daily-ai-pm 2>/dev/null
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cortexops.daily-ai-pm.plist

launchctl kickstart -k gui/$(id -u)/com.cortexops.daily-ai-pm

tail -30 state/daily/launchd.stdout.log
tail -30 state/daily/launchd.stderr.log
```

---

## 五-B、周报 launchd 定时（周日 20:30）

周报不走 prefetch，直接读 daily JSONL / pools / memory，用 Codex CLI 写入
`state/weekly/YYYY-MM-DD-report.md`（日期为当周周日）。

```bash
./scripts/install-weekly-launchd.sh
grep WorkingDirectory ~/Library/LaunchAgents/com.cortexops.weekly-ai-pm.plist

# 手动试跑（补跑上周日或强制覆盖）
FORCE=1 ./scripts/codex-weekly-run.sh
FORCE=1 ./scripts/codex-weekly-run.sh 2026-07-13

tail -30 state/weekly/codex-weekly-run.log
tail -30 state/weekly/launchd.stdout.log
ls -la state/weekly/*-report.md
```

说明：
- `StartCalendarInterval` 为每周日 20:30（`TZ=Asia/Shanghai`）
- `RunAtLoad=true`：若周日 20:30 未联网，开机后会补跑（检测本周周报是否已存在）
- 请在 Codex App 中**关闭**同名 automation 的 cron，避免与 launchd 重复执行

### 周一论文 / Demo / 工程学习 + 月报 launchd

```bash
./scripts/install-automation-launchd.sh

FORCE=1 ./scripts/codex-automation-run.sh paper-radar
FORCE=1 ./scripts/codex-automation-run.sh demo
FORCE=1 ./scripts/codex-automation-run.sh engineering
FORCE=1 ./scripts/codex-automation-run.sh monthly

ls -la state/weekly/paper/ state/weekly/demo/ state/weekly/engineering/ state/monthly/
```

| 任务 | 路径 |
|------|------|
| 论文雷达 | `state/weekly/paper/YYYY-MM-DD-paper-radar.md` |
| Demo 推荐 | `state/weekly/demo/YYYY-MM-DD-demo-recommendation.md` |
| 工程学习 | `state/weekly/engineering/YYYY-MM-DD-engineering-learning.md` |
| 月报 | `state/monthly/YYYY-MM-01-monthly-review.md` |

`YYYY-MM-DD`（周报子目录）= 当周周日，与执行周报日期一致。

---

## 六、Cursor Webhook

```bash
mkdir -p ~/.cortexops
cp scripts/cursor-webhook.env.example ~/.cortexops/cursor-webhook.env
chmod 600 ~/.cortexops/cursor-webhook.env

./scripts/cursor-trigger-daily.sh
./scripts/cursor-trigger-daily.sh "$DATE"

source ~/.cortexops/cursor-webhook.env
curl -4 -sS -X POST "$CURSOR_AUTOMATION_WEBHOOK_URL" \
  -H "Authorization: Bearer $CURSOR_AUTOMATION_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test":true}' -w "\nHTTP=%{http_code}\n"
```

---

## 七、A/B 模型对比

```bash
./scripts/codex-daily-prefetch.sh --ab "$DATE"

cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl
cp state/daily/active/${DATE}-report.md     state/daily/backups/2026-07-18-ab-test/${DATE}-report.a.md

rm -f state/daily/active/${DATE}-links.jsonl state/daily/active/${DATE}-report.md
FORCE=1 ./scripts/codex-daily-run.sh "$DATE"

cp state/daily/active/${DATE}-links.jsonl state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl
cp state/daily/active/${DATE}-report.md     state/daily/backups/2026-07-18-ab-test/${DATE}-report.b.md

python3 scripts/compare-daily-links.py \
  state/daily/backups/2026-07-18-ab-test/${DATE}-links.a.jsonl \
  state/daily/backups/2026-07-18-ab-test/${DATE}-links.b.jsonl
```

对比结束后，A 版本与其它临时副本都应移入 `state/daily/backups/`，不要留在正式目录。

---

## 八、Git 推送日报

```bash
git add state/daily/active/${DATE}-links.jsonl state/daily/active/${DATE}-report.md
git commit -m "chore(daily): ${DATE} report"
git push origin codex/source-layering-policy
```

---

## 九、网络预检

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
curl -4 -sS -H "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=selected&take=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('ok', len(d.get('items',[])))"

cat state/daily/active/${DATE}-ingest-error.md
```

---

## 十、Codex CLI

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
codex --version
which codex
```

---

## 场景对照

| 场景 | 命令 |
|------|------|
| 每天正常跑 | `./scripts/codex-daily-run.sh` |
| 只拉数据 | `./scripts/codex-daily-prefetch.sh` |
| 检查门禁 | `python3 scripts/verify-daily-ingest.py "$DATE"` |
| 重跑今天 | `FORCE=1 ./scripts/codex-daily-run.sh` |
| 是否在跑 | `pgrep -fl codex` + `tail -f state/daily/codex-daily-run.log` |
| PR-A 验收 | `grep skipped_no_prefetch state/daily/active/${DATE}-report.md` |
| 周报正常跑 | `./scripts/codex-weekly-run.sh` |
| 周报重跑 | `FORCE=1 ./scripts/codex-weekly-run.sh` |
| 周报日志 | `tail -f state/weekly/codex-weekly-run.log` |

---

## 关键路径

| 用途 | 路径 |
|------|------|
| 当天正式区 | `state/daily/active/` |
| 历史备份区 | `state/daily/backups/` |
| AIhot raw | `state/daily/active/YYYY-MM-DD-aihot-raw.json` |
| manifest | `state/daily/active/YYYY-MM-DD-ingest-manifest.json` |
| links | `state/daily/active/YYYY-MM-DD-links.jsonl` |
| report | `state/daily/active/YYYY-MM-DD-report.md` |
| 日志 | `state/daily/codex-daily-run.log` |
| 周报 report | `state/weekly/YYYY-MM-DD-report.md` |
| 周报日志 | `state/weekly/codex-weekly-run.log` |
| Codex 配置 | `~/.codex/automations/ai-pm.toml` |
| Cursor webhook | `~/.cortexops/cursor-webhook.env` |

---

## 每日三板斧

```bash
cd ~/Documents/CortexOps
git pull origin codex/source-layering-policy
./scripts/codex-daily-run.sh
tail -f state/daily/codex-daily-run.log
```

---

## 相关文档（CortexOps 仓库内）

- `docs/codex-terminal-prefetch.md`
- `docs/daily-orchestration-cursor-codex.md`
- `docs/supplemental-prefetch-api.md`
- `docs/backlog.md` — 搁置项（含 PR-C）
- `automations/SYNC-CHECKLIST.md`
