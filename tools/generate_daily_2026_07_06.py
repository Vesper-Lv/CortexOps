#!/usr/bin/env python3
"""Generate 2026-07-06 AI PM daily radar state files."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATE = "2026-07-06"
SINCE_ISO = "2026-07-05T03:42:00.000Z"

AIHOT_PATHS = [
    ROOT / "state/daily/2026-07-06-aihot-raw-selected.json",
    ROOT / "state/daily/2026-07-06-aihot-raw-since-jul3.json",
]


def load_aihot_pool():
    pool = {}
    for p in AIHOT_PATHS:
        data = json.loads(p.read_text())
        for it in data.get("items", []):
            pool[it["id"]] = it
    return pool


def normalize_url(url: str) -> str:
    if not url:
        return ""
    u = url.split("?")[0].rstrip("/").lower()
    return u


def canonical_key(url: str, title: str = "") -> str:
    u = normalize_url(url)
    if "github.com" in u:
        m = re.match(r"https?://github\.com/([^/]+/[^/]+)", u)
        if m:
            return f"github.com/{m.group(1).lower()}"
    if "arxiv.org/abs/" in u:
        return u.split("arxiv.org/abs/")[-1].split("/")[0]
    if "x.com/" in u or "twitter.com/" in u:
        return u.replace("https://", "").replace("http://", "")
    host_path = u.replace("https://", "").replace("http://", "")
    # product announcements
    tl = title.lower()
    if "longcat" in tl and "开源" in title:
        return "longcat_2_0_mit_opensource"
    if "enterprise" in tl or "旗舰模型" in title:
        return "enterprise_ai_cost_control"
    return host_path


def load_memory_keys(exclude_date=None):
    mem_path = ROOT / "state/memory/ai-pm-7d.jsonl"
    keys = {}
    if mem_path.exists():
        for line in mem_path.read_text().splitlines():
            if not line.strip():
                continue
            o = json.loads(line)
            if exclude_date and o.get("date") == exclude_date:
                continue
            keys[o["canonical_key"]] = o
    return keys


def aihot_row(item, mix="main_aihot", dup="new", novelty="", **overrides):
    url = item["url"]
    ck = overrides.get("canonical_key") or canonical_key(url, item.get("title", ""))
    base = {
        "aihot_id": item["id"],
        "aihot_summary": item.get("summary", ""),
        "aihot_summary_status": "verified",
        "aihot_score": item.get("score"),
        "category": item.get("category"),
        "date": DATE,
        "title": item.get("title", ""),
        "original_url": overrides.get("original_url", url),
        "source_url": f"https://aihot.virxact.com/items/{item['id']}",
        "source_origin": overrides.get("source_origin", "aggregator"),
        "source_name": item.get("source", ""),
        "source_role": "daily_discovery",
        "source_mix_note": mix,
        "aihot_summary_status": "verified",
        "codex_summary": "",
        "display_summary": item.get("summary", ""),
        "published_at": item.get("publishedAt"),
        "canonical_key": ck,
        "duplicate_status": dup,
        "novelty_reason": novelty,
        "human_status": "pending",
        "final_pool": overrides.get("suggested_pool", "archive"),
        "practice_fit": overrides.get("practice_fit", "low"),
        "reading_pack_status": overrides.get("reading_pack_status", "not_selected"),
        "priority": overrides.get("priority", "P2"),
        "reason": "",
        "read_reason": overrides.get("read_reason", ""),
        "focus_direction": overrides.get("focus_direction", ""),
        "known_facts": overrides.get("known_facts", []),
        "open_questions": overrides.get("open_questions", []),
        "suggested_pool": overrides.get("suggested_pool", "archive"),
    }
    base.update({k: v for k, v in overrides.items() if k not in ("canonical_key",)})
    base["final_pool"] = overrides.get("final_pool", base["suggested_pool"])
    return base


def manual_row(**fields):
    row = {
        "date": DATE,
        "aihot_summary": "",
        "aihot_summary_status": "not_applicable",
        "display_summary": fields.get("display_summary", ""),
        "source_origin": fields.get("source_origin", "primary"),
        "source_role": "daily_discovery",
        "source_mix_note": fields.get("source_mix_note", "github_or_release_supplement"),
        "human_status": "pending",
        "duplicate_status": fields.get("duplicate_status", "new"),
        "novelty_reason": fields.get("novelty_reason", ""),
        "practice_fit": fields.get("practice_fit", "medium"),
        "reading_pack_status": fields.get("reading_pack_status", "not_selected"),
        "known_facts": fields.get("known_facts", []),
        "open_questions": fields.get("open_questions", []),
        "read_reason": fields.get("read_reason", ""),
        "focus_direction": fields.get("focus_direction", ""),
    }
    row.update(fields)
    row["final_pool"] = fields.get("final_pool", fields.get("suggested_pool", "archive"))
    return row


def apply_dedup(row, mem):
    ck = row["canonical_key"]
    if ck in mem and row.get("duplicate_status") == "new":
        row["duplicate_status"] = "duplicate_suppressed"
        row["novelty_reason"] = f"7 天内已在 {mem[ck]['date']} 日报出现，无 material update 证据，长清单保留供信息面完整但降级。"
        if row["priority"] in ("P0", "P1"):
            row["priority"] = "P2"
        row["reading_pack_status"] = "not_selected"


def main():
    pool = load_aihot_pool()
    mem = load_memory_keys(exclude_date=DATE)

    # IDs to include
    selected_ids = [it["id"] for it in json.loads(AIHOT_PATHS[0].read_text())["items"]]
    supplement_ids = [
        "cmr65ieko002tslf0xiomac0c",  # 26000 students
        "cmr4w2clt05kasll56e54tanx",  # AI agent ransomware
        "cmr5cef1q017islc779xjrcy6",  # pxpipe
        "cmr4s179804l5sll5u47j7031",  # Safari MCP
        "cmr4rs02404h6sll50myozvz0",  # 网信办
        "cmr5blxyu00ykslc7kiaaxqam",  # Fable judgement
        "cmr4q????",  # need forge train id
    ]

    # find supplement ids by title fragment
    def find_id(fragment):
        for it in pool.values():
            if fragment in it.get("title", ""):
                return it["id"]
        return None

    supplement_ids = [
        find_id("26000名学生"),
        find_id("全球首例 AI Agent 勒索"),
        find_id("pxpipe"),
        find_id("Safari MCP"),
        find_id("国家网信办"),
        find_id("Fable 的判断力"),
        find_id("ForgeTrain"),
        find_id("ASPIRE"),
        find_id("生数科技发布 Vidu"),
        find_id("忆阻器神经动力学芯片"),
    ]

    rows = []
    seq = 0

    def add(row):
        nonlocal seq
        seq += 1
        row["id"] = f"{DATE}-{seq:02d}"
        if not row.get("reason"):
            row["reason"] = row.get("codex_summary", "")
        apply_dedup(row, mem)
        rows.append(row)

    # --- selected 14 with judgments ---
    judgments = {
        "cmr91yrn100noslmpusn7u7q0": dict(
            priority="P1",
            suggested_pool="knowledge_gap",
            codex_summary="竞品安全测试伦理争议，可作为 agent 安全与合规讨论素材。",
            practice_fit="low",
            reading_pack_status="candidate",
        ),
        "cmr8zxj6s006cslmpf6ki0ld7": dict(
            priority="archive",
            suggested_pool="archive",
            codex_summary="历史产业政策背景，与当前 AI PM 行动关联弱。",
            practice_fit="low",
        ),
        "cmr8yq2xv01phsllsc7sv9v5u": dict(
            priority="drop",
            suggested_pool="drop",
            codex_summary="原始页无可核验产品信息，仅 Cookie 说明，不满足质量门槛。",
            practice_fit="low",
            display_summary="Runway 宣布设立巴黎办公室；AIhot 摘要注明原文页仅含 Cookie 设置说明，未提供部门、规模、职能或开业时间等具体信息。",
        ),
        "cmr8tzbde00jjsllsayhpgjqg": dict(
            priority="P2",
            suggested_pool="knowledge_gap",
            codex_summary="语音多语种 ASR 产品发布，偏模型能力新闻。",
            practice_fit="low",
            reading_pack_status="candidate",
        ),
        "cmr8reau2005fslvpmqjll6du": dict(
            priority="P1",
            suggested_pool="demo_replication",
            original_url="https://github.com/synthetic-sciences/openscience",
            codex_summary="开源科研 agent 工作台，npm 可跑，适合拆最小 demo 观察 multi-model 科研循环。",
            practice_fit="high",
            reading_pack_status="candidate",
            read_reason="OpenScience 把文献—实验—分析串成可切换模型的 agent 工作台，接近 AI PM 关心的科研自动化产品形态。",
            focus_direction="安装/启动路径、技能与数据库工具边界、与 Claude Science 的差异点。",
        ),
        "cmr8j9weh02kxsl0dy08683oe": dict(
            priority="archive",
            suggested_pool="archive",
            codex_summary="Fable 5 下线前 prompt 清单，偏技巧收藏，非一手验证来源。",
            practice_fit="low",
        ),
        "cmr8j82w402k0sl0ddfe6f7zv": dict(
            priority="P2",
            suggested_pool="knowledge_gap",
            codex_summary="AI 基础设施资本周期信号，面试背景可用。",
            practice_fit="low",
            reading_pack_status="candidate",
        ),
        "cmr8ajv5h00e0sl0d7rzs38ei": dict(
            priority="P2",
            suggested_pool="knowledge_gap",
            codex_summary="算力供给延迟影响模型部署节奏，属宏观 infra 观察。",
            practice_fit="low",
        ),
        "cmr84d4v901hssl04oav0ki73": dict(
            priority="P1",
            suggested_pool="knowledge_gap",
            codex_summary="巨头集中资本与千兆瓦集群，影响 2B AI 成本与部署叙事。",
            practice_fit="low",
            reading_pack_status="candidate",
            known_facts=[
                "扎克伯格称 Prometheus 为首个千兆瓦级单一集群，涉及数千亿美元资本投入。",
                "AIhot 摘要将其表述为集中精英、资本与基础设施的战略选择。",
            ],
            open_questions=[
                "Prometheus 集群的具体上线时间表与对外服务能力是否公开？",
                "该投入如何转化为 Meta 企业客户可购买的产品或算力服务？",
            ],
        ),
        "cmr83ashr0189sl04hhietwtx": dict(
            priority="P1",
            suggested_pool="personal_work",
            source_mix_note="product_case_supplement",
            codex_summary="独立开发者从个人痛点到 PMF 的真实路径，可转化为作品集/面试故事。",
            practice_fit="medium",
            reading_pack_status="candidate",
            read_reason="非语言儿童沟通 App 从治疗室验证到产品化决策，是 Vibe Coding + 产品判断的完整小故事。",
            focus_direction="问题定义、验证信号、资源取舍（睡眠/规模）而非技术细节。",
        ),
        "cmr815l2z00pgsl04wayrv4tr": dict(
            priority="P1",
            suggested_pool="knowledge_gap",
            codex_summary="加密通信扫描法规影响 messenger AI 集成与隐私设计。",
            practice_fit="low",
            reading_pack_status="selected",
            known_facts=[
                "欧盟理事会通过快速通道程序推进 Chat Control 2.0，要求对加密通信进行扫描。",
                "AIhot 摘要称过渡规定 4 月 3 日到期，草案可能在夏季休会前紧急提交欧洲议会。",
            ],
            open_questions=[
                "最终议会表决时间与绝对多数反对是否仍有可能？",
                "对 AI agent 读取用户消息的产品设计会产生哪些合规约束？",
            ],
        ),
        "cmr7z00up0065sl0472bil7hs": dict(
            priority="P1",
            suggested_pool="demo_replication",
            original_url="https://github.com/Trystan-SA/claude-design-system-prompt",
            codex_summary="反向工程的设计系统 prompt/skill，可直接 fork 做 AI 设计协作 demo。",
            practice_fit="high",
            reading_pack_status="candidate",
            read_reason="把设计规范、无障碍和反 AI-slop 约束封装成 skill，是 AI PM 做 UX/agent 协作的现成模板。",
            focus_direction="20 章 prompt 结构、14 项 skill 分工、Fable 5 自主决策条款如何落地。",
        ),
        "cmr7vpphy007oslgnz4aotpx4": dict(
            priority="P1",
            suggested_pool="knowledge_gap",
            canonical_key="longcat_2_0_mit_opensource",
            duplicate_status="material_update",
            novelty_reason="7 月 2 日已收录 LongCat-2.0 发布；今日新增 MIT 完全开源、公开权重与推理代码及更多 benchmark 细节。",
            codex_summary="国产万亿 MoE 完全开源，SWE-bench 成绩与 Claude Code 集成值得跟踪。",
            practice_fit="medium",
            reading_pack_status="selected",
            known_facts=[
                "美团宣布 LongCat-2.0 MIT 开源，公开权重与推理代码。",
                "模型为 1.6T MoE，约 48B 激活/token，支持 1M 上下文；SWE-bench Pro 59.5。",
            ],
            open_questions=[
                "开源权重托管位置与商用许可边界是否已在官方仓库 README 明确？",
                "与 7 月 2 日公众号版本相比，推理代码开放范围有无新增限制？",
            ],
        ),
        "cmr7ita5g00reslxdrprk52b0": dict(
            priority="P1",
            suggested_pool="demo_replication",
            codex_summary="legal-kb 示范 Index v2 上 agentic RAG 工具链，1-3 小时可复刻检索 harness。",
            practice_fit="high",
            reading_pack_status="selected",
            read_reason="retrieve/find/read/grep 四工具链是 2B 知识库 agent 的常见产品模式，可直接当 teardown 对象。",
            focus_direction="工具调用顺序约束、版本元数据如何处理、Vercel AI SDK ToolLoopAgent 结构。",
        ),
    }

    for aid in selected_ids:
        item = pool[aid]
        ov = judgments.get(aid, {})
        mix = ov.pop("source_mix_note", "main_aihot")
        add(aihot_row(item, mix=mix, **ov))

    supp_judgments = {
        find_id("26000名学生"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P0",
            suggested_pool="knowledge_gap",
            codex_summary="大规模纵向研究揭示 AI 辅助作业的 eval 陷阱，直接关联 AI 教育/工具产品 ROI 与风险。",
            practice_fit="low",
            reading_pack_status="selected",
            known_facts=[
                "追踪 26000 名 7-12 年级学生 30 个月：作业分 +18%、考试时间 -20%、升学考试 -18% 至 -24%。",
                "81% 长期用户作业完成时间低于 50 分钟；每周使用 AI 约 1 小时对应约 5% 成绩损失。",
            ],
            open_questions=[
                "研究是否区分不同学科/题型下的 causal 机制？",
                "对 enterprise 知识工作 assistant 的外推边界是什么？",
            ],
        ),
        find_id("全球首例 AI Agent 勒索"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P0",
            suggested_pool="knowledge_gap",
            codex_summary="首个全程自主 agent 勒索链，是 2B agent 部署安全与权限设计的反面教材。",
            practice_fit="medium",
            reading_pack_status="selected",
            known_facts=[
                "Sysdig 记录 AI Agent JADEPUFFER 利用 Langflow CVE-2025-3248 远程执行代码。",
                "Agent 自主收集多云/API 密钥、横向移动并加密 1342 条 Nacos 配置，累计 600+ 攻击载荷。",
            ],
            open_questions=[
                "受害环境是否缺少 Langflow 鉴权以外的 agent 工具白名单？",
                "同类 LangChain/Langflow 部署的最佳实践清单是否由厂商更新？",
            ],
        ),
        find_id("pxpipe"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P1",
            suggested_pool="demo_replication",
            original_url="https://github.com/teamchong/pxpipe",
            codex_summary="图像化压缩 prompt token 降本 59-70%，可小范围试验 Claude Code 成本优化。",
            practice_fit="high",
            reading_pack_status="candidate",
            read_reason="把系统提示/工具文档转 PNG 降 token 是可验证的成本实验，适合 indie dev 快速试。",
            focus_direction="默认仅处理 claude-fable-5 的限制、有损场景与 SWE-bench 复现结果。",
        ),
        find_id("Safari MCP"): dict(
            source_mix_note="primary_verification",
            priority="P1",
            suggested_pool="demo_replication",
            original_url="https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers",
            codex_summary="Apple 官方 Safari MCP，浏览器调试 agent 的一手工程信号。",
            practice_fit="high",
            reading_pack_status="selected",
            read_reason="官方浏览器 MCP 定义了 web 调试 agent 的工具面，可对照 Playwright/Puppeteer MCP 做产品比较。",
            focus_direction="内置工具列表、Remote Automation 启用步骤、与 STP 247 绑定关系。",
        ),
        find_id("国家网信办"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P1",
            suggested_pool="knowledge_gap",
            codex_summary="国内 AI 服务合规专章草案，影响 2B 产品公示、标识与算法义务。",
            practice_fit="low",
            reading_pack_status="candidate",
            known_facts=[
                "修订草案新增智能信息服务专章，要求公示技术原理与训练数据来源。",
                "要求对生成合成内容标识，禁止强制用户使用智能服务；意见反馈截止 8 月 2 日。",
            ],
            open_questions=[
                "与现行算法备案/深度合成规定的衔接细则？",
                "6 个月不登录账号注销条款对 SaaS AI 产品的账户策略影响？",
            ],
        ),
        find_id("Fable 的判断力"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P1",
            suggested_pool="knowledge_gap",
            codex_summary="Claude Code 团队实践：用模型判断力+子模型委托降 token，是 AI PM workflow 一手叙述。",
            practice_fit="medium",
            reading_pack_status="candidate",
            read_reason="Simon Willison 记录的 Fable 工作流技巧，可直接写进个人 Claude Code 记忆/规则。",
            focus_direction="判断力 vs 硬规则、Sonnet/Haiku 委托边界、token 节省是否可量化。",
        ),
        find_id("ForgeTrain"): dict(
            source_mix_note="aihot_48h_supplement",
            priority="P2",
            suggested_pool="paper_candidate",
            codex_summary="AI 自动生成预训练框架，偏 research/infra，日常行动性弱。",
            practice_fit="low",
        ),
        find_id("ASPIRE"): dict(
            source_mix_note="research_or_report_supplement",
            priority="P2",
            suggested_pool="paper_candidate",
            codex_summary="机器人自我改进框架用 Claude Code 写控制程序，研究向，weekly paper 更合适。",
            practice_fit="low",
            reading_pack_status="candidate",
        ),
        find_id("生数科技发布 Vidu"): dict(
            source_mix_note="product_case_supplement",
            priority="P2",
            suggested_pool="product_inspiration",
            codex_summary="视频生成产品从离线渲染走向实时交互，可观察 latency/UX 产品取舍。",
            practice_fit="low",
            reading_pack_status="not_selected",
        ),
        find_id("忆阻器神经动力学芯片"): dict(
            source_mix_note="research_or_report_supplement",
            priority="P2",
            suggested_pool="paper_candidate",
            codex_summary="忆阻器神经动力学芯片属 hardware research 信号，weekly paper 更合适。",
            practice_fit="low",
            reading_pack_status="not_selected",
        ),
    }

    for aid in supplement_ids:
        if not aid or aid in selected_ids:
            continue
        item = pool[aid]
        ov = supp_judgments.get(aid, {})
        mix = ov.pop("source_mix_note", "aihot_48h_supplement")
        add(aihot_row(item, mix=mix, **ov))

    # GitHub release supplement
    add(
        manual_row(
            title="Claude Code v2.1.200：AskUserQuestion 与默认 Manual 权限模式",
            original_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.200",
            source_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.200",
            source_name="Anthropic Claude Code Releases",
            source_origin="primary",
            source_mix_note="github_or_release_supplement",
            display_summary="Claude Code v2.1.200（2026-07-03）：AskUserQuestion 对话框默认不再 auto-continue，可通过 /config 配置 idle timeout；默认 permission mode 在 CLI、VS Code、JetBrains 统一改为 Manual。v2.1.201 进一步调整 Claude Sonnet 5 会话不再使用 mid-conversation system role 传递 harness reminders。",
            canonical_key="github.com/anthropics/claude-code",
            duplicate_status="material_update",
            novelty_reason="7 月 2 日已收录 v2.1.198；v2.1.200 变更 AskUserQuestion 默认行为与 Manual 权限模式，属可行动的 release 更新。",
            priority="P1",
            suggested_pool="product_inspiration",
            codex_summary="权限与提问 UX 默认值变化，影响 agent 工作流设计与团队规范。",
            practice_fit="medium",
            reading_pack_status="candidate",
            read_reason="Release 变更直接影响 Claude Code 人机协作默认体验，值得对照团队规范更新。",
            focus_direction="Manual vs 其他 permission mode 差异、AskUserQuestion auto-continue 关闭的产品含义。",
        )
    )

    # OpenScience GitHub primary (verify) - skip duplicate, already have openscience via github url in row

    finished_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Write links jsonl
    links_path = ROOT / f"state/daily/{DATE}-links.jsonl"
    aihot_supp_count = len([x for x in supplement_ids if x])
    with links_path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
        f.write(json.dumps({"finished_at": finished_at, "meta": True, "since_iso": SINCE_ISO, "aihot_selected_count": 14, "aihot_supplement_count": aihot_supp_count, "web_supplement_count": 1, "longlist_count": len(rows)}) + "\n")

    # Build report
    report = build_report(rows, finished_at)
    (ROOT / f"state/daily/{DATE}-report.md").write_text(report, encoding="utf-8")

    # Update memory - reading pack + practice + pool candidates
    mem_entries = []
    pool_names = {"product_inspiration", "paper_candidate", "demo_replication", "knowledge_gap", "personal_work", "archive"}
    for r in rows:
        if r.get("meta"):
            continue
        if r["reading_pack_status"] == "selected":
            mem_entries.append(
                {
                    "canonical_key": r["canonical_key"],
                    "date": DATE,
                    "duplicate_status": r["duplicate_status"],
                    "human_status": r["human_status"],
                    "original_url": r["original_url"],
                    "priority": r["priority"],
                    "reading_pack_status": r["reading_pack_status"],
                    "reason": r["reason"],
                    "suggested_pool": r["suggested_pool"],
                    "title": r["title"],
                }
            )
        elif r.get("suggested_pool") in pool_names and r.get("human_status") == "pending" and r["priority"] in ("P0", "P1"):
            mem_entries.append(
                {
                    "canonical_key": r["canonical_key"],
                    "date": DATE,
                    "duplicate_status": r["duplicate_status"],
                    "human_status": r["human_status"],
                    "original_url": r["original_url"],
                    "priority": r["priority"],
                    "reading_pack_status": r["reading_pack_status"],
                    "reason": r["reason"],
                    "suggested_pool": r["suggested_pool"],
                    "title": r["title"],
                }
            )

    # practice target
    mem_entries.append(
        {
            "canonical_key": "practice_safari_mcp_debug_demo",
            "date": DATE,
            "duplicate_status": "new",
            "human_status": "pending",
            "original_url": "https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers",
            "priority": "practice",
            "reading_pack_status": "formal_practice",
            "reason": "正式练习：30 分钟 Safari MCP 最小调试 demo",
            "suggested_pool": "demo_replication",
            "title": "正式练习：Safari MCP 最小 Web 调试 demo",
        }
    )

    mem_path = ROOT / "state/memory/ai-pm-7d.jsonl"
    # prune entries older than 7 days from DATE
    cutoff = datetime.strptime(DATE, "%Y-%m-%d")
    kept = []
    for line in mem_path.read_text().splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        d = datetime.strptime(o["date"], "%Y-%m-%d")
        if (cutoff - d).days < 7:
            kept.append(o)
    # add new, dedupe by canonical_key keeping newest
    all_mem = {m["canonical_key"]: m for m in kept}
    for e in mem_entries:
        all_mem[e["canonical_key"]] = e
    with mem_path.open("w") as f:
        for e in all_mem.values():
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Update pools
    update_pools(rows)

    print(f"Wrote {len(rows)} links to {links_path}")
    print(f"Report: {ROOT / f'state/daily/{DATE}-report.md'}")


def update_pools(rows):
    pool_files = {
        "product_inspiration": ROOT / "pools/product-inspiration.jsonl",
        "paper_candidate": ROOT / "pools/paper-candidates.jsonl",
        "demo_replication": ROOT / "pools/demo-replication.jsonl",
        "knowledge_gap": ROOT / "pools/knowledge-gap.jsonl",
        "personal_work": ROOT / "pools/personal-work.jsonl",
        "archive": ROOT / "pools/archive.jsonl",
    }
    (ROOT / "pools/personal-work.jsonl").touch(exist_ok=True)

    # Remove prior entries for this date (idempotent re-run)
    for path in pool_files.values():
        if not path.exists():
            path.touch()
            continue
        kept = []
        for line in path.read_text().splitlines():
            if not line.strip():
                continue
            o = json.loads(line)
            if o.get("date") != DATE:
                kept.append(line)
        path.write_text("\n".join(kept) + ("\n" if kept else ""))

    def append_pool(path, row):
        entry = {k: row.get(k) for k in [
            "id", "date", "title", "original_url", "source_url", "canonical_key",
            "suggested_pool", "final_pool", "human_status", "priority",
            "codex_summary", "display_summary", "practice_fit", "duplicate_status",
        ]}
        entry["reason"] = row.get("reason", "")
        with path.open("a") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    for r in rows:
        if r.get("meta"):
            continue
        pool = r.get("suggested_pool")
        if pool in pool_files and pool != "drop":
            append_pool(pool_files[pool], r)


def build_report(rows, finished_at):
    data_rows = [r for r in rows if not r.get("meta")]
    aihot_supp = sum(1 for r in data_rows if r.get("source_mix_note", "").startswith("aihot_") or r.get("source_mix_note") in ("primary_verification", "product_case_supplement", "research_or_report_supplement") and r.get("aihot_id"))
    # count non-selected AIhot supplements
    aihot_supp = sum(1 for r in data_rows if r.get("aihot_id") and r.get("source_mix_note") != "main_aihot")
    total = len(data_rows)
    pack = [r for r in data_rows if r.get("reading_pack_status") == "selected"]
    rest = [r for r in data_rows if r.get("reading_pack_status") != "selected"]

    def fmt_pack_item(r, label):
        lines = [
            f"### {r['title']}",
            f"- 链接：{r['original_url']}",
            f"- 类别：{label}",
            f"- 建议池：`{r['suggested_pool']}`｜human_status：`{r['human_status']}`",
            f"- 摘要：{r['display_summary']}",
        ]
        if r["suggested_pool"] == "knowledge_gap":
            if r.get("known_facts"):
                lines.append("- 文章可获得的事实：")
                for f in r["known_facts"]:
                    lines.append(f"  - {f}")
            if r.get("open_questions"):
                lines.append("- 需要额外研究的问题：")
                for q in r["open_questions"]:
                    lines.append(f"  - {q}")
        else:
            if r.get("read_reason"):
                lines.append(f"- 推荐阅读原因：{r['read_reason']}")
            if r.get("focus_direction"):
                lines.append(f"- 关注方向：{r['focus_direction']}")
        return "\n".join(lines)

    p0 = [r for r in pack if r["priority"] == "P0"]
    p1 = [r for r in pack if r["priority"] == "P1" and r.get("practice_fit") != "high"]
    gh = [r for r in pack if r.get("practice_fit") == "high" and r not in p0]

    pack_sections = []
    for r in p0:
        pack_sections.append(fmt_pack_item(r, "P0 详细阅读"))
    for r in p1:
        pack_sections.append(fmt_pack_item(r, "P1 扫读"))
    for r in gh:
        if r not in p0 and r not in p1:
            pack_sections.append(fmt_pack_item(r, "GitHub 热门或可复刻项目"))

    # ensure all selected in report
    for r in pack:
        if r not in p0 and r not in p1 and r not in gh:
            pack_sections.append(fmt_pack_item(r, "P1 扫读"))

    rest_lines = []
    for r in rest:
        suggest = "是" if r.get("reading_pack_status") == "candidate" and r["priority"] in ("P0", "P1") else "否"
        head = f"### {r['title']}\n- 链接：{r['original_url']}\n- 优先级：{r['priority']}｜建议池：`{r['suggested_pool']}`｜reading_pack_status：`{r['reading_pack_status']}`｜human_status：`{r['human_status']}`｜建议人工加入阅读包：{suggest}"
        if r.get("source_mix_note") and r["source_mix_note"] not in ("main_aihot", ""):
            head += f"\n- source_mix_note：`{r['source_mix_note']}`"
        rest_lines.append(head)
        rest_lines.append(f"- 摘要：{r['display_summary']}")
        if r["duplicate_status"] in ("material_update", "carry_over", "duplicate_suppressed") and r.get("novelty_reason"):
            rest_lines.append(f"- 保留/去重说明：{r['duplicate_status']} — {r['novelty_reason']}")

    report = f"""# 今日 AI PM 行业雷达

> 采集状态：AIhot API 成功｜selected=14｜AIhot 补充={aihot_supp}｜Web/GitHub 补充=1｜长清单={total} 条｜since={SINCE_ISO}｜finished_at={finished_at}
> 来源配比：AIhot 24 条；GitHub release 补充 1 条；产品案例 2 条（Extelligence 独立开发、Vidu S1）；一手来源核验 1 条（WebKit Safari MCP）。fresh signals 在 24h 窗口偏薄，已用 48h AIhot 补充与 GitHub release 填充至 25 条。

## 1. 五段式日报

**产品 / 行业动态**：今天的主线不是新模型参数，而是 **AI 落地后的治理与副作用**：26000 人长期研究揭示 AI 辅助作业的隐藏学习成本；Sysdig 披露首个全程自主 AI agent 勒索链；欧盟 Chat Control 2.0 与国内网信办「智能信息服务」专章草案并行推进。LongCat-2.0 宣布 MIT 完全开源则是国产大模型开放策略的 material update。

**GitHub / 工程信号**：Safari MCP、legal-kb、OpenScience、pxpipe、claude-design-system-prompt 共同指向 **agent 工具面标准化**：浏览器调试、法律 RAG harness、科研循环、token 降本、设计 skill 库。Claude Code v2.1.200 把默认 permission mode 改为 Manual，说明 coding agent 产品正在收紧默认权限。

**论文 / 研究信号**：26000 学生面板研究与 ASPIRE 机器人框架（Claude Code 写控制程序）提示：eval 需要纵向真实场景，research agent 开始进入物理世界闭环，但日常行动仍以产品/工程信号为主。

**工具 / 工作流信号**：Simon Willison 记录的 Fable「判断力+子模型委托」、pxpipe 图像 token 压缩、Safari MCP 官方浏览器工具，都在回答 indie dev / AI PM 同一问题：**如何在成本、权限、可观测性约束下让 agent 稳定产出**。

**风险 / 限制 / 反例**：JADEPUFFER 勒索链是 agent 权限失控的极端反例；AI 学习成本研究说明「短期效率提升」不等于长期结果；Meta 竞品诱导测试与 Runway 原文缺失提醒：二手摘要必须回到一手链接核验。

## 2. 今日 30mins 阅读包

{chr(10).join(pack_sections)}

## 3. 未入选阅读包的剩余链接

{chr(10).join(rest_lines)}

## 4. 今日练习三选一

1. **【正式练习】Safari MCP 最小 Web 调试 demo（25–35 分钟）**  
   在 Safari Technology Preview 247 启用 Remote Automation，用任意 MCP 客户端连接，对本地静态页完成一次 `screenshot` + `browser_console_messages` 调用，记录工具 JSON 结构与启用步骤。  
   来源：https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers

2. **备选：legal-kb 检索 harness 拆解（30–40 分钟）**  
   画出 retrieve → findFiles → readFile → grepFile 的调用顺序约束表，并写 3 条可复用到 CortexOps 的 RAG 产品规则。  
   人工去向建议：产品灵感池（若发现可产品化模式）或每周 Demo 候选池。

3. **备选：pxpipe 成本实验设计（20–30 分钟）**  
   不写完整部署，只设计一份「Claude Code 会话 token 降本」实验方案：输入类型、有损边界、成功指标（$/task）。  
   人工去向建议：每周 Demo 候选池；若暂无环境则 archive。
"""
    return report


if __name__ == "__main__":
    main()
