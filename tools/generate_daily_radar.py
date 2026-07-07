#!/usr/bin/env python3
"""Generate AI PM daily radar state files for a given date."""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def canonical_key(url: str, title: str = "", extra: str = "") -> str:
    if extra:
        return extra
    if not url:
        return ""
    u = url.split("?")[0].rstrip("/").lower()
    if "github.com" in u:
        m = re.match(r"https?://github\.com/([^/]+/[^/]+)", u)
        if m:
            return f"github.com/{m.group(1).lower()}"
    if "x.com/" in u or "twitter.com/" in u:
        return u.replace("https://", "").replace("http://", "")
    return u.replace("https://", "").replace("http://", "")


def load_memory(exclude_date: str):
    mem = {}
    path = ROOT / "state/memory/ai-pm-7d.jsonl"
    if not path.exists():
        return mem
    cutoff = datetime.strptime(exclude_date, "%Y-%m-%d")
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        if o.get("date") == exclude_date:
            continue
        d = datetime.strptime(o["date"], "%Y-%m-%d")
        if (cutoff - d).days >= 7:
            continue
        mem[o["canonical_key"]] = o
    return mem


def apply_dedup(row, mem):
    ck = row["canonical_key"]
    if ck not in mem or row.get("duplicate_status") != "new":
        return
    row["duplicate_status"] = "duplicate_suppressed"
    row["novelty_reason"] = (
        f"7 天内已在 {mem[ck]['date']} 日报出现，无 material update 证据，长清单保留供信息面完整但降级。"
    )
    if row["priority"] in ("P0", "P1"):
        row["priority"] = "P2"
    row["reading_pack_status"] = "not_selected"


def link(**fields):
    base = {
        "human_status": "pending",
        "duplicate_status": "new",
        "novelty_reason": "",
        "aihot_summary": "",
        "aihot_summary_status": "not_applicable",
        "source_role": "daily_discovery",
        "practice_fit": "low",
        "reading_pack_status": "not_selected",
        "read_reason": "",
        "focus_direction": "",
        "known_facts": [],
        "open_questions": [],
        "source_mix_note": "primary_verification",
    }
    base.update(fields)
    base["final_pool"] = fields.get("final_pool", fields.get("suggested_pool", "archive"))
    if not base.get("display_summary"):
        base["display_summary"] = fields.get("discovery_summary", "")
    if not base.get("reason"):
        base["reason"] = fields.get("codex_summary", "")
    if not base.get("source_url"):
        base["source_url"] = base.get("original_url", "")
    return base


def build_jul_07_items():
    """Curated primary-source longlist for 2026-07-07 (AIhot API unavailable)."""
    return [
        link(
            title="JADEPUFFER：Sysdig 记录首个端到端 agentic 勒索攻击",
            original_url="https://www.sysdig.com/blog/jadepuffer-agentic-ransomware-for-automated-database-extortion",
            source_name="Sysdig Threat Research",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="sysdig_jadepuffer_primary",
            duplicate_status="material_update",
            novelty_reason="7 月 6 日 IT之家摘要已收录；Sysdig 一手报告补充 600+ payload、31 秒自修复、1342 条 Nacos 配置加密等细节。",
            display_summary="Sysdig Threat Research Team 评估 JADEPUFFER 为首个端到端由 LLM agent 驱动的勒索/extortion 操作：通过 CVE-2025-3248 入侵暴露的 Langflow，自主完成凭证收集、横向移动、持久化与生产 MySQL/Nacos 数据库加密；agent 在代码中自叙述意图，并在 31 秒内修复 bcrypt 路径错误。报告发布于 2026 年 7 月 1 日。",
            codex_summary="一手安全报告，是 2B agent 部署、Langflow 暴露面与权限设计的核心反面教材。",
            priority="P0",
            suggested_pool="knowledge_gap",
            reading_pack_status="selected",
            known_facts=[
                "Sysdig 将 JADEPUFFER 定义为 agentic threat actor（ATA），通过 Langflow CVE-2025-3248 获得初始访问。",
                "攻击链包含 600+ 独立 payload、1342 条 Nacos 配置项加密、自生成勒索说明与比特币地址。",
            ],
            open_questions=[
                "Sysdig 未能确认驱动 agent 的具体 LLM 型号；日志中的 API key 是否为被盗凭证而非攻击模型？",
                "受害方身份与 Langflow 版本是否已在官方通告中披露？",
            ],
        ),
        link(
            title="TechCrunch：首个 AI 勒索攻击仍需要人类选目标与基础设施",
            original_url="https://techcrunch.com/2026/07/06/the-first-ai-run-ransomware-attack-still-needed-a-human/",
            source_name="TechCrunch",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="techcrunch_jadepuffer_human_loop",
            duplicate_status="material_update",
            novelty_reason="7 月 6 日 JADEPUFFER 已入长清单；TechCrunch 7 月 6 日跟进 Sysdig 研究员澄清「人类仍选目标/配基础设施」，属 material update。",
            display_summary="TechCrunch 2026 年 7 月 6 日报道：Sysdig 高级威胁研究总监 Michael Clark 澄清，JADEPUFFER 的技术执行由 AI agent 完成，但人类仍选择受害者、搭建 C2/暂存服务器，且生产库 root 凭证来自先前入侵而非 agent 自行获取。",
            codex_summary="澄清「全自主」叙事边界，适合 AI PM 讨论 agent 风险沟通与产品安全叙事。",
            priority="P0",
            suggested_pool="knowledge_gap",
            reading_pack_status="selected",
            known_facts=[
                "TechCrunch 引用 Sysdig 称 agent 通过 Langflow 漏洞入侵后加密 1300+ 配置记录并自写勒索信。",
                "Clark 澄清人类仍参与目标选择与基础设施配置。",
            ],
            open_questions=[
                "产品对外应如何表述「agent 自主性」而不夸大无人类参与？",
            ],
        ),
        link(
            title="Claude Cowork 扩展至 Web/移动端并支持定时无人值守任务",
            original_url="https://claude.com/product/cowork",
            source_name="Anthropic",
            source_origin="primary",
            source_mix_note="product_case_supplement",
            canonical_key="claude_cowork_mobile_scheduled",
            display_summary="Anthropic Claude Cowork 产品页说明：Cowork 可在 Web、桌面与移动端（beta）运行；用户关闭笔记本后任务仍可继续；可设置任意 cadence 的定时任务 unattended 执行；支持并行 sub-agents 处理大项目；企业版提供 spend 控制、OpenTelemetry 可观测性与权限配置。WIRED 2026 年 7 月 7 日报道称 Cowork 正扩展到手机端。",
            codex_summary="Cowork 从桌面 agent 走向跨端+定时执行，是 2B AI PM 观察异步 agent 产品化的样本。",
            priority="P1",
            suggested_pool="product_inspiration",
            reading_pack_status="selected",
            read_reason="跨端+定时无人值守是 enterprise agent 产品的关键 UX/权限设计点。",
            focus_direction="定时任务权限模型、移动端与桌面会话连续性、企业 spend/OTel 控制项。",
        ),
        link(
            title="Fable 5 订阅包含额度于 7 月 7 日结束，7 月 8 日起需 usage credits",
            original_url="https://www.anthropic.com/news/redeploying-fable-5",
            source_name="Anthropic",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="fable_5_usage_credits_jul8",
            display_summary="Anthropic 官方 redeploying-fable-5 公告：Pro/Max/Team 与部分 Enterprise 计划在 7 月 7 日前可将 Fable 5 计入最多 50% 周用量；7 月 7 日后需启用 usage credits 才能继续使用 Fable 5。平台定价页列出 Fable 5 为 $10/MTok 输入、$50/MTok 输出。",
            codex_summary="模型计费从「订阅包含」转向 credits，直接影响 Claude Code/Fable 工作流成本与路由策略。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="selected",
            known_facts=[
                "7 月 7 日为 Pro/Max/Team 等计划 Fable 5 50% 周用量包含的最后一天。",
                "7 月 8 日起未启用 usage credits 的用户将无法访问 Fable 5；定价 $10/$50 per MTok。",
            ],
            open_questions=[
                "Enterprise 标准席位与 premium 席位在 credits 启用流程上有何差异？",
                "Claude Code 默认模型路由是否会自动降级到 Opus/Sonnet？",
            ],
        ),
        link(
            title="Claude Code v2.1.202：Remote Control 与 workflow OTel 更新",
            original_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.202",
            source_name="Anthropic Claude Code Releases",
            source_origin="primary",
            source_mix_note="github_or_release_supplement",
            canonical_key="github.com/anthropics/claude-code",
            duplicate_status="material_update",
            novelty_reason="7 月 6 日已收录 v2.1.200 Manual 权限变更；v2.1.202（2026-07-06 发布）新增 Remote Control 修复、workflow OTel 属性与动态 workflow 大小设置。",
            display_summary="Claude Code v2.1.202（2026-07-06）：新增 /config 中 Dynamic workflow size 设置；workflow 子 agent 遥测增加 workflow.run_id/name OpenTelemetry 属性；修复 Remote Control 移动端/网页发送命令 Unknown command、无 caption 图片被丢弃等问题；修复 SSH 下 auth login URL 不可点击等。",
            codex_summary="Remote Control 与 Cowork 跨端叙事一致，release 是可行动的工程信号。",
            priority="P1",
            suggested_pool="demo_replication",
            reading_pack_status="selected",
            practice_fit="high",
            read_reason="Remote Control 修复直接关联 Cowork 跨端 agent 能否稳定执行。",
            focus_direction="Remote Control 命令/附件修复项、workflow OTel 字段、Dynamic workflow size 配置含义。",
        ),
        link(
            title="Anthropic 与 TeraWulf 签署 20 年约 190 亿美元 AI 数据中心租约",
            original_url="https://www.sec.gov/Archives/edgar/data/1083301/000110465926080583/tm2619468d1_ex99-1.htm",
            source_name="TeraWulf SEC Exhibit 99.1",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="anthropic_terawulf_19b_lease",
            display_summary="TeraWulf 2026 年 7 月 6 日公告：与 Anthropic 签署 20 年租约，在其肯塔基州 Justified Data 园区建设 AI 基础设施，预计初始租期产生约 190 亿美元合同收入；园区规划约 401MW IT 负载，首批容量 2027 下半年上线，2028 年初满容量。",
            codex_summary="IPO 前夕锁定长期算力租约，体现 frontier lab 基础设施与资本叙事。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="selected",
            known_facts=[
                "租约 20 年，预计约 190 亿美元合同收入；Anthropic 有两轮各 5 年续租选项。",
                "Justified Data 园区规划 401MW，2027 H2 起分期交付。",
            ],
            open_questions=[
                "租约对 Anthropic IPO S-1 中 compute cost 与 capex 披露有何影响？",
            ],
        ),
        link(
            title="Anthropic 提交保密 IPO 草案，称年化收入约 470 亿美元",
            original_url="https://abc7ny.com/post/anthropic-races-public-offering-debut-confidential-sec-filing/19213604/",
            source_name="AP via ABC7",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="anthropic_confidential_ipo_s1",
            display_summary="AP 2026 年 6 月 1 日报道：Anthropic 已向 SEC 提交保密 IPO 注册草案；公司称尚未决定发行股数与价格。报道引用 Anthropic 称年化收入约 470 亿美元，并提及近期 650 亿美元私募融资后估值约 9650 亿美元。",
            codex_summary="IPO 与收入叙事影响 2B AI 市场格局判断，但需对照官方 S-1 公开版验证。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="candidate",
            known_facts=[
                "Anthropic 提交 confidential SEC filing；公司称取决于市场条件。",
                "AP 报道 Anthropic 年化收入约 470 亿美元，估值约 9650 亿美元（私募后）。",
            ],
            open_questions=[
                "公开 S-1 中 GAAP 收入、亏损与 compute 成本结构如何？",
            ],
        ),
        link(
            title="BleepingComputer：JadePuffer 利用 Langflow CVE-2025-3248 自动化整条攻击链",
            original_url="https://www.bleepingcomputer.com/news/security/jadepuffer-ransomware-used-ai-agent-to-automate-entire-attack/",
            source_name="BleepingComputer",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="bleepingcomputer_jadepuffer",
            duplicate_status="material_update",
            novelty_reason="与 Sysdig 同源事件的多源验证报道，补充 cron 持久化与 AES_ENCRYPT 细节。",
            display_summary="BleepingComputer 2026 年 7 月 4 日：援引 Sysdig 称 JadePuffer 通过 CVE-2025-3248 入侵 Langflow，agent 完成侦察、凭证窃取、横向移动、持久化（30 分钟 cron beacon）与加密 1342 条 Nacos 配置；使用 MySQL AES_ENCRYPT 并创建 README_RANSOM 勒索表。",
            codex_summary="Secondary primary 媒体报道，可用于面试中多源交叉验证叙事。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="candidate",
        ),
        link(
            title="Dark Reading：JadePuffer 为首例完整 LLM 驱动勒索攻击",
            original_url="https://www.darkreading.com/cyberattacks-data-breaches/jadepuffer-first-complete-llm-driven-ransomware-attack",
            source_name="Dark Reading",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="darkreading_jadepuffer",
            duplicate_status="material_update",
            novelty_reason="JADEPUFFER 事件的另一 Tier-2 安全媒体解读，强调与传统脚本式勒索的差异。",
            display_summary="Dark Reading 2026 年 7 月 6 日：援引 Sysdig 称 JadePuffer 为首个完整 LLM 驱动勒索操作，agent 将 Langflow RCE、数据库枚举、数据 exfil、删库与勒索串联，而非依赖预写脚本或人工逐步操作。",
            codex_summary="行业安全媒体 framing，适合产品风险评估引用。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="candidate",
        ),
        link(
            title="WIRED：Anthropic 将 Claude Cowork agent 带到手机端",
            original_url="https://www.wired.com/story/shut-those-laptops-anthropic-puts-its-claude-cowork-agent-on-your-phone/",
            source_name="WIRED",
            source_origin="primary",
            source_mix_note="product_case_supplement",
            canonical_key="wired_claude_cowork_mobile",
            display_summary="WIRED 2026 年 7 月 7 日：Anthropic 宣布 Claude Cowork 不再局限于桌面，正扩展到手机端；文章称用户无需半开笔记本即可让 agent 持续运行。",
            codex_summary="媒体报道补充 Cowork 跨端叙事的产品传播角度。",
            priority="P1",
            suggested_pool="product_inspiration",
            reading_pack_status="candidate",
        ),
        link(
            title="Claude 平台定价：Fable 5 为 $10/$50 per MTok",
            original_url="https://docs.anthropic.com/en/docs/about-claude/pricing",
            source_name="Anthropic Platform Docs",
            source_origin="primary",
            source_mix_note="primary_verification",
            canonical_key="anthropic_pricing_fable5",
            duplicate_status="material_update",
            novelty_reason="配合 7 月 8 日 Fable credits 切换，官方定价页为成本路由的一手依据。",
            display_summary="Anthropic Platform Docs 定价表：Claude Fable 5 标价为输入 $10/MTok、输出 $50/MTok；Claude Opus 4.8 为 $5/$25；Claude Sonnet 5 在 2026 年 8 月 31 日前为 $2/$10 优惠价。",
            codex_summary="模型路由与成本 memo 的一手价格表。",
            priority="P1",
            suggested_pool="knowledge_gap",
            reading_pack_status="candidate",
            known_facts=[
                "Fable 5：$10/$50 per MTok；Opus 4.8：$5/$25；Sonnet 5 优惠价 $2/$10 至 2026-08-31。",
            ],
            open_questions=[
                "Claude Code 默认 token 路由如何在订阅额度与 credits 之间切换？",
            ],
        ),
        link(
            title="Meta 被曝外包人员伪装未成年人测试竞品 AI 安全",
            original_url="https://www.ithome.com/0/973/207.htm",
            source_name="IT之家（RSS）",
            source_origin="aggregator",
            source_mix_note="not_added_reason",
            canonical_key="www.ithome.com/0/973/207.htm",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录同一 IT之家链接，无新 primary 证据。",
            display_summary="据《连线》报道，Meta 通过外包公司 Covalen 开展代号\"Cannes\"的项目，让外包人员伪装未成年人向 ChatGPT、Gemini、Character.AI 发送高风险提示词测试安全拦截；Meta 称属常规安全测试。",
            codex_summary="7 月 6 日已收录，今日无 material update。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="Synthetic Sciences OpenScience 开源科研 agent 工作台",
            original_url="https://github.com/synthetic-sciences/openscience",
            source_name="GitHub",
            source_origin="primary",
            source_mix_note="github_or_release_supplement",
            canonical_key="github.com/synthetic-sciences/openscience",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日 demo_replication 候选已收录，仓库无新 release 信号。",
            display_summary="OpenScience（Apache 2.0）为开源 AI 科研工作台，npm 包 @synsci/openscience；覆盖 ML/生物/物理/化学文献—实验循环，支持多模型切换与约 30 个科学数据库工具。",
            codex_summary="GitHub 补充源；7 天内重复。",
            priority="P2",
            suggested_pool="demo_replication",
            practice_fit="high",
        ),
        link(
            title="pxpipe：图像化压缩 Claude Code 输入 token",
            original_url="https://github.com/teamchong/pxpipe",
            source_name="GitHub",
            source_origin="primary",
            source_mix_note="github_or_release_supplement",
            canonical_key="github.com/teamchong/pxpipe",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日已收录 pxpipe，无 material update。",
            display_summary="pxpipe 本地代理将系统提示/工具文档等渲染为 PNG，在 Fable 5 上约 25k 文本 token 压缩为约 2.7k 图像 token，SWE-bench Lite 10/10 通过且成本约降 50%。",
            priority="P2",
            suggested_pool="demo_replication",
            practice_fit="high",
        ),
        link(
            title="LlamaIndex legal-kb：Index v2 agentic RAG 参考应用",
            original_url="https://www.marktechpost.com/2026/07/05/llamaindex-legal-kb-agentic-retrieval-over-index-v2-with-retrieve-find-read-and-grep-tools",
            source_name="MarkTechPost",
            source_origin="aggregator",
            source_mix_note="not_added_reason",
            canonical_key="www.marktechpost.com/2026/07/05/llamaindex-legal-kb-agentic-retrieval-over-index-v2-with-retrieve-find-read-and-grep-tools",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日阅读包已收录 legal-kb。",
            display_summary="LlamaIndex legal-kb 基于 Index v2，提供 retrieve/findFiles/readFile/grepFile 四工具链，底层为 Vercel AI SDK 6 ToolLoopAgent。",
            priority="P2",
            suggested_pool="demo_replication",
        ),
        link(
            title="面向 Web 开发者的 Safari MCP 服务器",
            original_url="https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers",
            source_name="WebKit Blog",
            source_origin="primary",
            source_mix_note="not_added_reason",
            canonical_key="webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日阅读包与正式练习已收录 Safari MCP。",
            display_summary="Safari Technology Preview 247 推出 Safari MCP 服务器，提供 browser_console_messages、screenshot、evaluate_javascript、list_network_requests 等工具。",
            priority="P2",
            suggested_pool="demo_replication",
            practice_fit="high",
        ),
        link(
            title="26000 名学生研究：AI 辅助作业的隐藏学习成本",
            original_url="https://the-decoder.com/a-26000-student-study-shows-ais-hidden-learning-cost-takes-two-full-years-to-surface",
            source_name="The Decoder",
            source_origin="aggregator",
            source_mix_note="not_added_reason",
            canonical_key="the-decoder.com/a-26000-student-study-shows-ais-hidden-learning-cost-takes-two-full-years-to-surface",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日 P0 阅读包已收录。",
            display_summary="追踪 26000 名学生 30 个月：作业分 +18%，闭卷考试 -20%，升学考试 -18% 至 -24%，影响约两年才完全显现。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="欧盟 Chat Control 2.0 快速通道推进",
            original_url="https://www.heise.de/en/news/Chat-Control-1-0-EU-Council-forces-messenger-scans-via-fast-track-11353659.html",
            source_name="heise online",
            source_origin="primary",
            source_mix_note="not_added_reason",
            canonical_key="www.heise.de/en/news/chat-control-1-0-eu-council-forces-messenger-scans-via-fast-track-11353659.html",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日阅读包已收录。",
            display_summary="欧盟理事会通过书面程序推进 Chat Control 2.0，要求对加密通信扫描；草案可能在夏季休会前紧急提交欧洲议会。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="美团 LongCat-2.0 MIT 完全开源",
            original_url="https://x.com/Meituan_LongCat/status/2073768940078317713",
            source_name="X：Meituan LongCat",
            source_origin="community_index",
            source_mix_note="not_added_reason",
            canonical_key="longcat_2_0_mit_opensource",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日 material_update 已收录 MIT 开源细节。",
            display_summary="美团宣布 LongCat-2.0 MIT 开源，1.6T MoE，SWE-bench Pro 59.5。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="SK 海力士寻求 280 亿美元美股 IPO",
            original_url="https://www.ithome.com/0/972/896.htm",
            source_name="IT之家",
            source_origin="aggregator",
            source_mix_note="not_added_reason",
            canonical_key="www.ithome.com/0/972/896.htm",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录。",
            display_summary="SK 海力士启动约 280 亿美元美股 IPO，为高带宽内存核心供应商。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="国家网信办修订草案增设智能信息服务专章",
            original_url="https://www.ithome.com/0/972/341.htm",
            source_name="IT之家",
            source_origin="aggregator",
            source_mix_note="not_added_reason",
            canonical_key="www.ithome.com/0/972/341.htm",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录，意见反馈截止 8 月 2 日。",
            display_summary="修订草案新增智能信息服务专章，要求公示训练数据来源与生成合成内容标识；意见反馈截止 2026 年 8 月 2 日。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="Fable 的判断力：Simon Willison 记录的 Claude Code 团队技巧",
            original_url="https://simonwillison.net/2026/Jul/3/judgement",
            source_name="Simon Willison",
            source_origin="primary",
            source_mix_note="not_added_reason",
            canonical_key="simonwillison.net/2026/jul/3/judgement",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录。",
            display_summary="Simon Willison 记录 Claude Code 团队建议：让 Fable 用判断力而非硬规则，并将小任务委托 Sonnet/Haiku 以节省 token。",
            priority="P2",
            suggested_pool="knowledge_gap",
            practice_fit="medium",
        ),
        link(
            title="NVIDIA Kyber NVL144 延迟至 2028",
            original_url="https://x.com/SemiAnalysis_/status/2073874671498387899",
            source_name="X：SemiAnalysis",
            source_origin="community_index",
            source_mix_note="not_added_reason",
            canonical_key="x.com/semianalysis_/status/2073874671498387899",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录。",
            display_summary="SemiAnalysis 称 NVIDIA Kyber NVL144 项目推迟超过 12 个月至 2028，并影响 Rubin Ultra 扩展域规划。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
        link(
            title="扎克伯格：Prometheus 千兆瓦级 AI 集群与数千亿美元投入",
            original_url="https://x.com/rohanpaul_ai/status/2073834219659534816",
            source_name="X",
            source_origin="community_index",
            source_mix_note="not_added_reason",
            canonical_key="x.com/rohanpaul_ai/status/2073834219659534816",
            duplicate_status="duplicate_suppressed",
            novelty_reason="7 月 6 日长清单已收录。",
            display_summary="扎克伯格称 Prometheus 为首个千兆瓦级单一集群，涉及数千亿美元资本投入。",
            priority="P2",
            suggested_pool="knowledge_gap",
        ),
    ]


def build_report(date, rows, finished_at, since_iso, meta):
    pack = [r for r in rows if r.get("reading_pack_status") == "selected"]
    rest = [r for r in rows if r.get("reading_pack_status") != "selected"]

    def fmt(r, label):
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
    gh = [r for r in pack if r.get("practice_fit") == "high" or "github.com" in r.get("original_url", "")]
    seen = set()
    pack_blocks = []
    for group, label in [(p0, "P0 详细阅读"), (p1, "P1 扫读"), (gh, "GitHub 热门或可复刻项目")]:
        for r in group:
            if r["id"] in seen:
                continue
            seen.add(r["id"])
            pack_blocks.append(fmt(r, label))
    for r in pack:
        if r["id"] not in seen:
            pack_blocks.append(fmt(r, "P1 扫读"))

    rest_blocks = []
    for r in rest:
        suggest = "是" if r.get("reading_pack_status") == "candidate" and r["priority"] in ("P0", "P1") else "否"
        head = (
            f"### {r['title']}\n"
            f"- 链接：{r['original_url']}\n"
            f"- 优先级：{r['priority']}｜建议池：`{r['suggested_pool']}`｜"
            f"reading_pack_status：`{r['reading_pack_status']}`｜human_status：`{r['human_status']}`｜"
            f"建议人工加入阅读包：{suggest}"
        )
        if r.get("source_mix_note") and r["source_mix_note"] not in ("main_aihot", ""):
            head += f"\n- source_mix_note：`{r['source_mix_note']}`"
        rest_blocks.append(head)
        rest_blocks.append(f"- 摘要：{r['display_summary']}")
        if r["duplicate_status"] in ("material_update", "carry_over", "duplicate_suppressed") and r.get("novelty_reason"):
            rest_blocks.append(f"- 保留/去重说明：{r['duplicate_status']} — {r['novelty_reason']}")

    aihot_note = (
        "**AIhot API 不可用，今日未生成 AIhot 长清单。** "
        f"已用 GitHub release、Anthropic/Sysdig/SEC 一手来源与产品页补充 {meta['web_supplement_count']} 条；"
        f"fresh signals 偏薄，长清单 {meta['longlist_count']} 条（含 7 日去重保留项）。"
    )

    return f"""# 今日 AI PM 行业雷达

> 采集状态：AIhot API 失败（Connection reset）｜AIhot 长清单=0｜Web/一手补充={meta['web_supplement_count']}｜长清单={meta['longlist_count']} 条｜since={since_iso}｜finished_at={finished_at}
> {aihot_note}

## 1. 五段式日报

**产品 / 行业动态**：在 AIhot 不可用的情况下，今日一手信号集中在 **Anthropic 产品矩阵**：Claude Cowork 扩展 Web/移动端与定时无人值守任务；Fable 5 订阅包含额度于 7 月 7 日结束、7 月 8 日起转向 usage credits（$10/$50 per MTok）。同时 TeraWulf SEC 文件披露 Anthropic **190 亿美元/20 年**算力租约，IPO 与基础设施叙事同步升温。

**GitHub / 工程信号**：Claude Code **v2.1.202** 修复 Remote Control 跨端命令/附件问题并增强 workflow OpenTelemetry——与 Cowork 跨端执行同一主题。7 日去重窗口内，OpenScience、pxpipe、Safari MCP 等工程候选仍在长清单中作信息面保留但已降级。

**论文 / 研究信号**：今日无 fresh arXiv/论文一手信号进入 P0/P1。JADEPUFFER 安全事件的多源解读（Sysdig、TechCrunch、BleepingComputer）更适合作为 agent 风险与 eval 边界案例，而非 weekly paper 候选。

**工具 / 工作流信号**：Cowork「关闭笔记本仍继续执行 + 定时 cadence」与 Claude Code Remote Control 修复，共同指向 **异步 agent 工作流**的产品化；Fable credits 切换则 forcing function 让团队今天审计模型路由与成本。

**风险 / 限制 / 反例**：Sysdig 一手报告 + TechCrunch 澄清构成完整叙事——agent 可自主串联勒索链，但**人类仍选目标与基础设施**；Langflow CVE-2025-3248 与暴露面是更直接的 deploy 风险。AIhot 采集失败提醒：fallback 长清单必须显式标注 provenance，不能把二手聚合当 verified AIhot 摘要。

## 2. 今日 30mins 阅读包

{chr(10).join(pack_blocks)}

## 3. 未入选阅读包的剩余链接

{chr(10).join(rest_blocks)}

## 4. 今日练习三选一

1. **【正式练习】Fable 5 → credits 路由审计 memo（25–35 分钟）**  
   基于 Anthropic redeploying-fable-5 与 pricing docs，写一页 memo：哪些 Claude Code/Cowork 工作流仍在 Fable 5、7 月 8 日后成本假设、是否降级 Opus/Sonnet 4.8 的决策树与成功指标。  
   来源：https://www.anthropic.com/news/redeploying-fable-5

2. **备选：JADEPUFFER 企业 agent 安全 checklist（30–40 分钟）**  
   从 Sysdig 报告提取 5 条可执行 checklist（Langflow 补丁、secrets 隔离、Nacos 加固、Manual permission、工具白名单），去向建议：personal_work 作品集或 knowledge_gap。

3. **备选：Cowork 定时任务产品 teardown 草稿（20–30 分钟）**  
   只画 Cowork 定时/跨端/权限三张流程图，不实现；去向建议：产品灵感池（人工确认后）或 archive。
"""


def update_pools(rows, date):
    pool_files = {
        "product_inspiration": ROOT / "pools/product-inspiration.jsonl",
        "paper_candidate": ROOT / "pools/paper-candidates.jsonl",
        "demo_replication": ROOT / "pools/demo-replication.jsonl",
        "knowledge_gap": ROOT / "pools/knowledge-gap.jsonl",
        "personal_work": ROOT / "pools/personal-work.jsonl",
        "archive": ROOT / "pools/archive.jsonl",
    }
    for p in pool_files.values():
        p.parent.mkdir(parents=True, exist_ok=True)
        if not p.exists():
            p.touch()
        kept = []
        for line in p.read_text().splitlines():
            if not line.strip():
                continue
            o = json.loads(line)
            if o.get("date") != date:
                kept.append(line)
        p.write_text("\n".join(kept) + ("\n" if kept else ""))

    for r in rows:
        pool = r.get("suggested_pool")
        if pool not in pool_files or pool == "drop":
            continue
        entry = {k: r.get(k) for k in [
            "id", "date", "title", "original_url", "source_url", "canonical_key",
            "suggested_pool", "final_pool", "human_status", "priority",
            "codex_summary", "display_summary", "practice_fit", "duplicate_status",
        ]}
        entry["reason"] = r.get("reason", "")
        with pool_files[pool].open("a") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def update_memory(rows, date, practice_key, practice_url, practice_title):
    mem_path = ROOT / "state/memory/ai-pm-7d.jsonl"
    cutoff = datetime.strptime(date, "%Y-%m-%d")
    kept = []
    for line in mem_path.read_text().splitlines():
        if not line.strip():
            continue
        o = json.loads(line)
        d = datetime.strptime(o["date"], "%Y-%m-%d")
        if (cutoff - d).days < 7 and o.get("date") != date:
            kept.append(o)

    entries = {}
    for o in kept:
        entries[o["canonical_key"]] = o

    pool_names = {"product_inspiration", "paper_candidate", "demo_replication", "knowledge_gap", "personal_work", "archive"}
    for r in rows:
        if r["reading_pack_status"] == "selected":
            entries[r["canonical_key"]] = {
                "canonical_key": r["canonical_key"],
                "date": date,
                "duplicate_status": r["duplicate_status"],
                "human_status": r["human_status"],
                "original_url": r["original_url"],
                "priority": r["priority"],
                "reading_pack_status": r["reading_pack_status"],
                "reason": r["reason"],
                "suggested_pool": r["suggested_pool"],
                "title": r["title"],
            }
        elif r.get("suggested_pool") in pool_names and r["human_status"] == "pending" and r["priority"] in ("P0", "P1"):
            entries[r["canonical_key"]] = {
                "canonical_key": r["canonical_key"],
                "date": date,
                "duplicate_status": r["duplicate_status"],
                "human_status": r["human_status"],
                "original_url": r["original_url"],
                "priority": r["priority"],
                "reading_pack_status": r["reading_pack_status"],
                "reason": r["reason"],
                "suggested_pool": r["suggested_pool"],
                "title": r["title"],
            }

    entries[practice_key] = {
        "canonical_key": practice_key,
        "date": date,
        "duplicate_status": "new",
        "human_status": "pending",
        "original_url": practice_url,
        "priority": "practice",
        "reading_pack_status": "formal_practice",
        "reason": "正式练习：Fable 5 credits 路由审计 memo",
        "suggested_pool": "knowledge_gap",
        "title": practice_title,
    }

    with mem_path.open("w") as f:
        for e in entries.values():
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


def generate(date: str, since_iso: str, items_builder):
    mem = load_memory(exclude_date=date)
    rows = items_builder()
    for i, r in enumerate(rows, 1):
        r["id"] = f"{date}-{i:02d}"
        r["date"] = date
        if r.get("duplicate_status") == "new":
            apply_dedup(r, mem)

    finished_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta = {
        "aihot_selected_count": 0,
        "aihot_supplement_count": 0,
        "web_supplement_count": sum(1 for r in rows if r.get("source_mix_note") != "not_added_reason"),
        "longlist_count": len(rows),
        "since_iso": since_iso,
        "finished_at": finished_at,
        "aihot_api_status": "failed",
    }

    links_path = ROOT / f"state/daily/{date}-links.jsonl"
    with links_path.open("w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
        f.write(json.dumps({"meta": True, **meta}) + "\n")

    report = build_report(date, rows, finished_at, since_iso, meta)
    (ROOT / f"state/daily/{date}-report.md").write_text(report, encoding="utf-8")

    update_memory(
        rows,
        date,
        practice_key="practice_fable5_credits_routing_memo",
        practice_url="https://www.anthropic.com/news/redeploying-fable-5",
        practice_title="正式练习：Fable 5 credits 路由审计 memo",
    )
    update_pools(rows, date)

    print(f"Wrote {len(rows)} links -> {links_path}")
    print(f"Report -> state/daily/{date}-report.md")
    print(f"Reading pack selected: {sum(1 for r in rows if r['reading_pack_status']=='selected')}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default="2026-07-07")
    parser.add_argument("--since", default="2026-07-06T11:50:05.000Z")
    args = parser.parse_args()
    if args.date == "2026-07-07":
        generate(args.date, args.since, build_jul_07_items)
    else:
        raise SystemExit(f"No item builder for date {args.date}")


if __name__ == "__main__":
    main()
