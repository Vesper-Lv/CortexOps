#!/usr/bin/env python3
"""Generate 2026-07-08 AI PM daily radar state files."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATE = "2026-07-08"
FINISHED_AT = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

MEMORY_KEYS = {
    "enterprise_ai_cost_control",
    "remote_labor_index_fable5",
    "x.com/shao__meng/status/2072644710523691110",
    "arstechnica.com/ai/2026/07/googles-ai-buildout-drove-37-increase-in-electricity-use-in-2025",
    "senior_swe_bench",
    "ghealth_google_health_cli",
    "kimi_k2_7_copilot",
    "cloudflare_ai_traffic_options",
    "github.com/anthropics/claude-code/releases/tag/v2.1.198",
    "x.ai/news/grok-voice-agent-builder",
    "x.com/zai_org/status/2072349453361557898",
}


def link(
    idx: int,
    *,
    title: str,
    original_url: str,
    source_name: str,
    source_origin: str,
    source_mix_note: str,
    display_summary: str,
    codex_summary: str,
    priority: str,
    reading_pack_status: str,
    suggested_pool: str,
    canonical_key: str,
    duplicate_status: str = "new",
    novelty_reason: str = "",
    practice_fit: str = "low",
    reason: str = "",
    read_reason: str = "",
    focus_direction: str = "",
    known_facts: str = "",
    open_questions: str = "",
    published_at: str = "2026-07-07T00:00:00.000Z",
    source_url: str = "",
    aihot_summary: str = "",
) -> dict:
    return {
        "id": f"{DATE}-{idx:02d}",
        "date": DATE,
        "title": title,
        "original_url": original_url,
        "source_url": source_url or original_url,
        "source_origin": source_origin,
        "source_name": source_name,
        "source_mix_note": source_mix_note,
        "aihot_summary": aihot_summary,
        "aihot_summary_status": "not_applicable",
        "codex_summary": codex_summary,
        "display_summary": display_summary,
        "priority": priority,
        "reading_pack_status": reading_pack_status,
        "suggested_pool": suggested_pool,
        "human_status": "pending",
        "final_pool": suggested_pool,
        "canonical_key": canonical_key,
        "duplicate_status": duplicate_status,
        "novelty_reason": novelty_reason,
        "practice_fit": practice_fit,
        "reason": reason,
        "read_reason": read_reason,
        "focus_direction": focus_direction,
        "known_facts": known_facts,
        "open_questions": open_questions,
        "published_at": published_at,
        "freshness_status": "fresh_24h",
        "url_status": "reachable",
    }


LINKS = [
    link(
        1,
        title="Claude Cowork 登陆 Web 与移动端：跨设备委托与后台持续执行",
        original_url="https://claude.com/blog/cowork-web-mobile",
        source_name="Anthropic 官方博客",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="Anthropic 于 2026 年 7 月 7 日宣布 Claude Cowork 向 Web 与 iOS/Android 移动端推出 Beta，首批向 Max 订阅用户分批开放。Cowork 可在桌面、Web、手机间延续同一会话与文件；支持设备离线时后台继续执行与定时任务；关键决策仍通过移动端推送请求人工确认。Web 与桌面端将 Chat 与 Cowork 合并为同一入口，Projects 与 Artifacts 跨端共享。为庆祝上线，Cowork 用量上限翻倍活动延续至 8 月 5 日。",
        codex_summary="Cowork 从桌面扩展到全端，把「委托式 agent 工作流」从开发者场景推向日常知识工作，是 2B/个人生产力产品形态的重要信号。",
        priority="P0",
        reading_pack_status="selected",
        suggested_pool="product_inspiration",
        canonical_key="claude.com/blog/cowork-web-mobile",
        practice_fit="medium",
        reason="Cowork 跨端与后台执行改变了 AI PM 对「长任务 agent」的产品边界判断。",
        read_reason="这是本周最完整的官方一手产品发布，可直接支撑 agent 工作流与 2B 协作场景讨论。",
        focus_direction="关注 Cowork 在非开发场景的使用分布、人工确认节点设计，以及跨端会话连续性如何实现。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        2,
        title="JADEPUFFER：Sysdig 记录的首个端到端自主 AI 勒索攻击（仍有人类策划）",
        original_url="https://techcrunch.com/2026/07/06/the-first-ai-run-ransomware-attack-still-needed-a-human/",
        source_name="TechCrunch（转述 Sysdig）",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="Sysdig 威胁研究团队记录名为 JADEPUFFER 的勒索操作：人类攻击者选定目标并搭建基础设施后，由 LLM agent 自主完成 Langflow CVE-2025-3248 入侵、凭证收割、横向移动、数据库加密与赎金信撰写；执行 600+ 有效 payload，在 31 秒内自修复登录失败。TechCrunch 7 月 6 日澄清：日志中的 OpenAI/Anthropic/DeepSeek/Gemini API key 是 agent 从受害环境偷取的战利品，并非攻击驱动模型；Sysdig 未能识别具体驱动模型。",
        codex_summary="对 AI PM 而言，这是 agent 权限、暴露面治理与 Langflow 类工具部署风险的硬案例，可转化为 2B 安全叙事。",
        priority="P0",
        reading_pack_status="selected",
        suggested_pool="knowledge_gap",
        canonical_key="jadepuffer_sysdig_agentic_ransomware",
        practice_fit="low",
        reason="企业 AI 基础设施暴露面与 agent 自主执行风险进入真实攻击案例。",
        known_facts="攻击入口为未打补丁的 Langflow；agent 可自叙述、自纠错并完成数据库加密；人类负责选靶与基础设施，非全程无人值守。",
        open_questions="驱动 agent 的具体模型与 system prompt 未知；赎金数据外泄是否属实待独立验证；同类攻击规模化速度仍缺公开统计。",
        published_at="2026-07-06T16:56:00.000Z",
    ),
    link(
        3,
        title="Fable 5 自 7 月 8 日起改走 Usage Credits：$10/$50 per Mtok",
        original_url="https://www.anthropic.com/pricing",
        source_name="Anthropic 定价页 + 官方 6/30 公告（媒体转述）",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="Anthropic 6 月 30 日公告：Pro/Max/Team/部分 Enterprise 至 7 月 7 日可将每周用量最多 50% 用于 Fable 5；自太平洋时间 7 月 8 日起，订阅计划内 Fable 5 不再计入常规周限额，须启用 Usage Credits 并按 API 价 $10/百万 input、$50/百万 output 计费；未启用 credits 则 Fable 5 请求失败。Opus 4.8、Sonnet、Haiku 仍按原订阅限额。Anthropic 工程师称容量恢复后计划将 Fable 5 重新纳入订阅。",
        codex_summary="今日（上海 7/8）是计费切换生效日，直接影响模型路由、成本治理与 demo 技术选型。",
        priority="P0",
        reading_pack_status="selected",
        suggested_pool="knowledge_gap",
        canonical_key="fable5_usage_credits_july8",
        duplicate_status="material_update",
        novelty_reason="7 月 2 日 RLI/Fable 5 能力信号后，7 月 8 日计费从订阅包含切换为 credits 按量，属可操作的 material_update。",
        practice_fit="medium",
        reason="模型路由与成本治理是 2B AI PM 面试高频题，今日为计费生效日。",
        known_facts="7/8 起 Fable 5 需 credits；费率 $10/$50 per Mtok；Opus/Sonnet/Haiku 订阅内不受影响。",
        open_questions="各计划每周 50% 额度换算成美元成本需查个人 dashboard；Fable 5 何时回归标准订阅无时间表。",
        published_at="2026-07-08T07:00:00.000Z",
    ),
    link(
        4,
        title="Claude Code v2.1.203：Manual 权限模式可视化与大量后台会话修复",
        original_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.203",
        source_name="GitHub Release（anthropics/claude-code）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="Claude Code v2.1.203（2026-07-07）新增：登录即将过期警告；Manual 权限模式下 footer 显示灰色 ⏸ 徽章；MCP roots/list 包含会话额外工作目录。修复包括 macOS 后台会话假低内存卡顿、daemon token 过期导致会话无响应、background agent PATH/ANTHROPIC_BASE_URL 继承错误、worktree 隔离失败等十余项。",
        codex_summary="Manual 默认 + 后台 agent 稳定性修复，与 JADEPUFFER 后的安全默认策略形成呼应。",
        priority="P1",
        reading_pack_status="selected",
        suggested_pool="knowledge_gap",
        canonical_key="github.com/anthropics/claude-code/releases/tag/v2.1.203",
        duplicate_status="material_update",
        novelty_reason="7 月 2 日 v2.1.198 后连续发布 v2.1.202–204，v2.1.203 含 Manual 模式 UI 与关键后台会话修复。",
        practice_fit="high",
        reason="直接影响日常 Vibe Coding 工作流与 agent 后台任务可靠性。",
        known_facts="v2.1.203 强化 Manual 模式可见性；修复后台 daemon、worktree、MCP roots 等多项回归。",
        open_questions="Manual 默认是否已覆盖你的全部安装渠道；远程 worker 场景需否升级到 v2.1.204。",
        published_at="2026-07-07T21:06:12.000Z",
    ),
    link(
        5,
        title="白宫自愿性前沿 AI 标准框架：7 月 7–11 日公告窗口开启",
        original_url="https://www.whitehouse.gov/briefing-room/presidential-actions/2025/06/02/executive-order-on-advancing-artificial-intelligence/",
        source_name="白宫 EO + FT/Reuters 报道（二级转述）",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="Financial Times 与 Reuters 报道：落实 2025-06-02 行政命令第 3 节的自愿性前沿模型标准框架，正式截止 2026-08-01，预期 2026-07-07 至 7-11 日窗口发布。预期内容包括：覆盖模型认定基准、30 天自愿预发布审查机制、政府审查流程、可信早期访问伙伴规则及国际访问/出口管制细则。OpenAI GPT-5.6 广义发布与 Google Gemini 3.5 Pro 计划与此框架协调。",
        codex_summary="政策信号可能同步影响模型上市节奏，是本周宏观变量。",
        priority="P1",
        reading_pack_status="selected",
        suggested_pool="knowledge_gap",
        canonical_key="white_house_voluntary_ai_standards_july2026",
        practice_fit="low",
        reason="模型发布与政府协调机制影响 2B 合规与上市节奏判断。",
        known_facts="EO 要求 8/1 前完成自愿框架；多家媒体报道 7/7–11 为公告窗口；GPT-5.6 与 Fable 5 此前受出口/审查影响。",
        open_questions="今日是否已正式发布全文；覆盖模型清单与审查细则需等官方文本。",
        published_at="2026-07-07T12:00:00.000Z",
    ),
    link(
        6,
        title="Activepieces：开源 AI 工作流 + ~400 MCP 服务器生态",
        original_url="https://github.com/activepieces/activepieces",
        source_name="GitHub（activepieces/activepieces）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="Activepieces 是开源 AI 工作流自动化平台，README 称集成约 400 个 MCP 服务器供 AI agent 调用，支持自托管与可视化 flow 编排，GitHub 约 2.3 万 stars，近期持续活跃更新。",
        codex_summary="低门槛可跑通的 MCP+workflow 组合，适合 1–3 小时 demo 验证 agent 工具编排思路。",
        priority="P1",
        reading_pack_status="selected",
        suggested_pool="demo_replication",
        canonical_key="activepieces/activepieces",
        practice_fit="high",
        reason="MCP 生态 + 可视化 workflow 是 AI PM 可复刻的集成样板。",
        read_reason="想在本地快速体验「agent + 多 MCP 工具」编排，这是本周 practice fit 最高的开源入口之一。",
        focus_direction="先看 README quickstart 与 MCP 集成方式，评估最小可演示 flow 需要几步。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        7,
        title="Headroom：在送入 LLM 前压缩工具输出与 RAG 块",
        original_url="https://github.com/headroomlabs-ai/headroom",
        source_name="GitHub（headroomlabs-ai/headroom）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="Headroom 开源项目（约 5.7 万 stars）通过在工具输出、日志、文件与 RAG chunk 进入 LLM 前进行压缩，宣称可显著降低 token 消耗；C++ 核心 + Python 扩展，近期有活跃提交。",
        codex_summary="上下文压缩是 agent 成本治理的工程抓手，可与 Fable 5 计费切换对照学习。",
        priority="P1",
        reading_pack_status="selected",
        suggested_pool="demo_replication",
        canonical_key="headroomlabs-ai/headroom",
        practice_fit="high",
        reason="token 成本治理有可见 demo 路径，契合今日 Fable 5 计费主题。",
        read_reason="把「降本」从订阅切换落到工程层：看看压缩 pipeline 如何接入现有 agent。",
        focus_direction="关注 README 中的接入点、压缩率声明与最小示例，不预设其适用于你的栈。",
        published_at="2026-07-06T00:00:00.000Z",
    ),
    link(
        8,
        title="Anthropic 签署 TeraWulf 约 190 亿美元数据中心租约",
        original_url="https://www.reuters.com/technology/artificial-intelligence/",
        source_name="SiliconANGLE / Reuters 生态报道",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="SiliconANGLE 2026-07-07 报道：Anthropic 与可持续算力运营商 TeraWulf 签署约 190 亿美元长期数据中心租约，叠加此前超 12 处美国数据中心、逾 1GW 容量承诺；TeraWulf 使用核电与水电。交易发生在 Anthropic 筹备 2026-10 IPO 窗口期。",
        codex_summary="算力锁定是 frontier lab 商业叙事与成本结构的关键变量。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="anthropic_terawulf_19b_lease",
        practice_fit="low",
        reason="IPO 前算力承诺影响对 Anthropic 单位经济模型的判断。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        9,
        title="Fortune：Anthropic 年化收入约 470 亿美元，超越 OpenAI",
        original_url="https://fortune.com/2026/07/02/sam-altman-seeks-new-world-order-for-ai-as-openai-slowly-loses-ground-to-google-and-anthropic/",
        source_name="Fortune",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="Fortune 2026-07-02 报道：Anthropic 2026 年 5 月称年化收入 run rate 约 470 亿美元且 2026 年有望盈利；OpenAI 最近披露年化收入约 250–330 亿美元。Ramp 企业支出数据显示 Anthropic 2026 年 5 月在 B 端订阅支出上超越 OpenAI；Similarweb 显示 ChatGPT 月访问占比首次跌破生成式 AI 市场多数。",
        codex_summary="与 7/2 企业控费新闻互补：一边是收入领先，一边是客户限制旗舰模型花费。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="anthropic_revenue_overtake_openai",
        practice_fit="low",
        reason="2B 市场竞争格局与 IPO 叙事素材。",
        published_at="2026-07-02T00:00:00.000Z",
    ),
    link(
        10,
        title="Claude Code 与 Cowork 面向政府客户推广",
        original_url="https://claude.com/blog/bringing-claude-code-and-claude-cowork-to-government",
        source_name="Anthropic 官方博客",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="Anthropic 2026-07-07 发布博文，宣布向美国政府客户推广 Claude Code 与 Claude Cowork，强调安全、合规与联邦场景下的 agent 工作流能力（具体采购与认证细节见官方全文）。",
        codex_summary="政府/高合规市场是当前 frontier lab GTM 的重要战场。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="product_inspiration",
        canonical_key="claude.com/blog/bringing-claude-code-and-claude-cowork-to-government",
        practice_fit="medium",
        reason="2B/Gov 场景产品化路径可参考。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        11,
        title="GPT-5.6 广义发布窗口：预测市场指向 7 月 9 日前后",
        original_url="https://openai.com/index/",
        source_name="TechTimes / TradingKey（转述 OpenAI 状态）",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="截至 2026-07-07，OpenAI GPT-5.6 系列（Sol/Terra/Luna）仍主要面向约 20 家政府审查过的预览组织；媒体称预测市场领先日期为 7 月 9 日，OpenAI 对外表述为「未来数周」，并与白宫自愿框架协调。ChatGPT 订阅用户仍多为 GPT-5.5。",
        codex_summary="竞争节奏变量：与 Fable 5 计费切换、Anthropic Cowork 扩展同期发生。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="openai_gpt56_release_window_july2026",
        practice_fit="low",
        reason="模型上市节奏影响选型与面试行业感知。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        12,
        title="Claude Code v2.1.204：修复 headless SessionStart hook 流式问题",
        original_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.204",
        source_name="GitHub Release（anthropics/claude-code）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="Claude Code v2.1.204（2026-07-08）修复：headless 会话中 SessionStart hook 期间 hook 事件不流式传输，可能导致远程 worker 在 hook 中途被 idle-reap 的问题。",
        codex_summary="远程/CI 场景下的 agent hook 可靠性补丁。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="github.com/anthropics/claude-code/releases/tag/v2.1.204",
        duplicate_status="material_update",
        novelty_reason="接续 v2.1.203，针对 headless/远程 worker 场景的增量修复。",
        practice_fit="medium",
        reason="若你用远程 worker 或 hook，需知悉此修复。",
        published_at="2026-07-08T00:27:50.000Z",
    ),
    link(
        13,
        title="SonarQube 官方 MCP Server：代码质量与安全接入 agent",
        original_url="https://github.com/SonarSource/sonarqube-mcp-server",
        source_name="GitHub（SonarSource/sonarqube-mcp-server）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="SonarSource 维护的官方 SonarQube MCP Server，向 AI agent 暴露代码质量与安全扫描能力，约 591 stars，2026 年 7 月仍有更新。",
        codex_summary="企业工程治理 + MCP 集成的标准样板。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="demo_replication",
        canonical_key="SonarSource/sonarqube-mcp-server",
        practice_fit="medium",
        reason="2B 场景下「agent + 质量门禁」可做成小 demo。",
        published_at="2026-07-05T00:00:00.000Z",
    ),
    link(
        14,
        title="MCP 2026-07-28 最终规范 7 月 28 日发布：无状态核心与扩展框架",
        original_url="https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
        source_name="Model Context Protocol 官方博客",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="MCP 官方博客：2026-07-28 规范 RC 已于 5 月 21 日锁定，最终版定于 2026-07-28 发布；核心变更包括无状态 HTTP 核心、Extensions 框架、Tasks/MCP Apps 扩展、OAuth 对齐强化及 12 个月弃用政策。当前生产仍以 2025-11-25 为准。",
        codex_summary="距最终发布约 20 天，远程 MCP 服务器需规划迁移。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="mcp_spec_2026-07-28_final",
        practice_fit="medium",
        reason="MCP 是 agent 工具层基础设施，规范变更是工程学习重点。",
        published_at="2026-05-21T00:00:00.000Z",
    ),
    link(
        15,
        title="Cowork 使用画像：超 90% 为非软件开发任务",
        original_url="https://claude.com/blog/cowork-web-mobile",
        source_name="Anthropic 官方博客（产品拆解）",
        source_origin="primary",
        source_mix_note="product_teardown_supplement",
        display_summary="Anthropic 在 Cowork 上线文中披露：分析约 120 万匿名会话，近半数 Cowork 使用来自业务运营与内容创作（如对账、合同 renewals tracker、客户 deck），合计约占全部使用的一半；超 90% 非软件开发。",
        codex_summary="产品 teardown：agent 价值重心在「工作周围的杂务」，而非纯 coding。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="product_inspiration",
        canonical_key="cowork_usage_teardown_non_dev",
        practice_fit="medium",
        reason="帮助建立「非开发者 agent PMF」的产品思路，而非只看 coding agent。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        16,
        title="Syntiant 申请纳斯达克 IPO（CBRS）：边缘低功耗 AI 芯片",
        original_url="https://www.reuters.com/technology/",
        source_name="Reuters",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="Reuters 2026-07-06/07 报道：边缘 AI 芯片公司 Syntiant 申请在纳斯达克上市， ticker CBRS；截至 2026-03-31 季度收入约 6450 万美元、净亏损约 2090 万美元，同比收入增长约 76%；客户含三星、索尼及多家汽车厂商。",
        codex_summary="AI 芯片叙事从数据中心向边缘端延伸。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="syntiant_ipo_2026",
        practice_fit="low",
        reason="宏观产业链背景，非立即行动项。",
        published_at="2026-07-06T00:00:00.000Z",
    ),
    link(
        17,
        title="SK Hynix 寻求约 280 亿美元美国 IPO：HBM 供应关键节点",
        original_url="https://www.reuters.com/technology/",
        source_name="Reuters / 行业报道",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="多家媒体报道 SK Hynix 计划通过美国 IPO 融资约 280 亿美元；公司为 Nvidia GPU 主要 HBM 供应商，HBM3E 用于 2026 年 Blackwell 量产。",
        codex_summary="算力供应链约束的资本市场信号。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="archive",
        canonical_key="sk_hynix_ipo_2026",
        practice_fit="low",
        reason="背景信息，与日常 PM/demo 距离较远。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        18,
        title="WSJ：SpaceX 向投资者展示消费级 AI 设备原型",
        original_url="https://www.wsj.com/tech/ai",
        source_name="Wall Street Journal（Fortune 转述）",
        source_origin="primary",
        source_mix_note="product_case_supplement",
        display_summary="Wall Street Journal 报道（Fortune 等转述）：SpaceX 在近期投资者活动中展示消费级 AI 设备原型；设备名称、形态、定价、上市时间与是否搭载 Grok 均未确认。",
        codex_summary="AI 硬件竞争加剧，但信息仍高度不完整。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="product_inspiration",
        canonical_key="spacex_ai_device_prototype",
        practice_fit="low",
        reason="硬件方向观察，暂不宜深读。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        19,
        title="Reddit 用 LLM 处理 LLM 造成的审核问题",
        original_url="https://techcrunch.com/2026/07/06/reddit-is-using-llms-to-solve-a-problem-llms-largely-created/",
        source_name="TechCrunch",
        source_origin="primary",
        source_mix_note="product_case_supplement",
        display_summary="TechCrunch 2026-07-06：Reddit 采用大模型辅助内容审核，以应对生成式 AI 带来的 spam 与误导内容增长（具体产品机制见原文）。",
        codex_summary="平台治理用 AI 修 AI 副作用的典型案例。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="product_inspiration",
        canonical_key="reddit_llm_moderation_2026",
        practice_fit="low",
        reason="社区产品治理思路参考。",
        published_at="2026-07-06T00:00:00.000Z",
    ),
    link(
        20,
        title="Amazon Mechanical Turk 停止接受新客户",
        original_url="https://techcrunch.com/2026/07/05/amazon-will-stop-accepting-new-customers-for-mechanical-turk/",
        source_name="TechCrunch",
        source_origin="primary",
        source_mix_note="product_case_supplement",
        display_summary="TechCrunch 2026-07-05：亚马逊 AWS 宣布 Mechanical Turk 将不再接受新客户注册（既有客户安排见官方说明）。",
        codex_summary="人类标注/微任务市场收缩，与 agent 自动化形成对照。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="amazon_mturk_stop_new_customers",
        practice_fit="low",
        reason="数据标注供应链变化的背景信号。",
        published_at="2026-07-05T00:00:00.000Z",
    ),
    link(
        21,
        title="Microsoft 据称削减第三方模型以降本（SiliconANGLE 侧栏信号）",
        original_url="https://siliconangle.com/2026/07/07/anthropic-brings-cowork-desktop-onto-web-mobile/",
        source_name="SiliconANGLE",
        source_origin="primary",
        source_mix_note="research_or_report_supplement",
        display_summary="SiliconANGLE 2026-07-07 Cowork 报道侧栏链接标题称：Microsoft 据称正减少在部分产品中使用 OpenAI 与 Anthropic 模型，转而更多使用自研模型以降低成本（细节需读原文专文，本条为同行报道索引）。",
        codex_summary="云厂商模型路由与成本治理的传闻信号，置信度中等。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="microsoft_reduce_third_party_models_cost",
        practice_fit="low",
        reason="与今日 Fable 5/企业控费主题同向，但需二次核实。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        22,
        title="mcp-gateway-registry：企业 MCP 网关与注册中心",
        original_url="https://github.com/agentic-community/mcp-gateway-registry",
        source_name="GitHub（agentic-community/mcp-gateway-registry）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="mcp-gateway-registry 开源项目提供企业向 MCP Gateway 与 Registry，集中管理 AI 开发工具与 MCP 服务发现，约 775 stars，2026 年 7 月有更新。",
        codex_summary="2B MCP 治理层参考实现。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="demo_replication",
        canonical_key="agentic-community/mcp-gateway-registry",
        practice_fit="medium",
        reason="若关注企业 MCP 部署，可作为架构阅读材料。",
        published_at="2026-07-04T00:00:00.000Z",
    ),
    link(
        23,
        title="Claude Cowork 定时任务：设备离线仍可执行",
        original_url="https://claude.com/blog/cowork-web-mobile",
        source_name="Anthropic 官方博客",
        source_origin="primary",
        source_mix_note="product_teardown_supplement",
        display_summary="Anthropic 称 Cowork 现支持 scheduled tasks 在无设备在线时运行，例如周一 6:00 自动整理邮件线程、会议纪要与客户新闻生成简报，跟进邮件草稿待人工审核发送。",
        codex_summary="「离线 cron agent」是 Cowork 与 Chat 差异化的关键产品机制。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="product_inspiration",
        canonical_key="cowork_scheduled_tasks_offline",
        practice_fit="medium",
        reason="定时后台 agent 是 2B workflow 产品常见需求点。",
        published_at="2026-07-07T00:00:00.000Z",
    ),
    link(
        24,
        title="Langflow CVE-2025-3248：JADEPUFFER 攻击入口复盘",
        original_url="https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
        source_name="CISA KEV + TechCrunch/Sysdig 转述",
        source_origin="primary",
        source_mix_note="primary_verification",
        display_summary="JADEPUFFER 初始入侵利用 Langflow CVE-2025-3248（CVSS 9.8，未认证 RCE）；漏洞已在 Langflow 1.3.0 修复，2025 年 5 月列入 CISA KEV。受害服务器未升级且将 Langflow 代码执行端点暴露公网。",
        codex_summary="AI 开发工具链补丁与暴露面治理的 checklist 素材。",
        priority="P1",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="langflow_cve_2025_3248_jadepuffer",
        practice_fit="low",
        reason="与 JADEPUFFER 配套的技术根因条目。",
        published_at="2026-07-06T00:00:00.000Z",
    ),
    link(
        25,
        title="Claude Code Dynamic workflow size 设置（v2.1.202）",
        original_url="https://github.com/anthropics/claude-code/releases/tag/v2.1.202",
        source_name="GitHub Release（anthropics/claude-code）",
        source_origin="primary",
        source_mix_note="github_or_release_supplement",
        display_summary="Claude Code v2.1.202（2026-07-06）在 /config 新增 Dynamic workflow size 设置，用于建议动态 workflow 的 agent 数量规模（small/medium/large），属指导性配置而非硬限制。",
        codex_summary="多 agent workflow 规模的产品化旋钮。",
        priority="P2",
        reading_pack_status="not_selected",
        suggested_pool="knowledge_gap",
        canonical_key="github.com/anthropics/claude-code/releases/tag/v2.1.202",
        duplicate_status="material_update",
        novelty_reason="7 月 2 日 v2.1.198 后的连续 release，新增 workflow 规模配置。",
        practice_fit="medium",
        reason="多 agent 编排配置值得扫一眼 changelog。",
        published_at="2026-07-06T22:51:16.000Z",
    ),
    link(
        26,
        title="AIhot API 不可用：今日长清单由一手来源补充构建",
        original_url="https://aihot.virxact.com/api/public/items?mode=selected",
        source_name="CortexOps ingest 探测",
        source_origin="primary",
        source_mix_note="not_added_reason",
        display_summary="2026-07-08 01:04 UTC 云端 prefetch 调用 AIhot Public API 失败（HTTP 000，curl exit 35 SSL/连接错误）。strict 模式下未伪造 aihot_summary；今日 26 条长清单来自 Anthropic/GitHub/TechCrunch/Fortune/MCP 官方等一手与 Tier-2 来源补充。",
        codex_summary="采集异常披露项，非阅读材料。",
        priority="archive",
        reading_pack_status="not_selected",
        suggested_pool="archive",
        canonical_key="ingest_aihot_unavailable_2026-07-08",
        practice_fit="low",
        reason="系统健康记录：需在 Terminal 侧重跑 prefetch 或检查 egress。",
        published_at="2026-07-08T01:04:00.000Z",
    ),
]


def build_report(links: list[dict]) -> str:
    pack = [l for l in links if l["reading_pack_status"] == "selected"]
    rest = [l for l in links if l["reading_pack_status"] != "selected" and l["id"] != f"{DATE}-26"]

    def pack_section(item: dict, label: str) -> str:
        lines = [
            f"### {item['title']}",
            f"- 链接：{item['original_url']}",
            f"- 类别：{label}",
            f"- 建议池：`{item['suggested_pool']}`｜human_status: `{item['human_status']}`",
            f"- 摘要：{item['display_summary']}",
        ]
        if item["suggested_pool"] == "knowledge_gap":
            if item.get("known_facts"):
                lines.append(f"- 文章可获得的事实：{item['known_facts']}")
            if item.get("open_questions"):
                lines.append(f"- 需要额外研究的问题：{item['open_questions']}")
        else:
            if item.get("read_reason"):
                lines.append(f"- 推荐阅读原因：{item['read_reason']}")
            if item.get("focus_direction"):
                lines.append(f"- 关注方向：{item['focus_direction']}")
        return "\n".join(lines) + "\n"

    p0 = [p for p in pack if p["priority"] == "P0"]
    p1 = [p for p in pack if p["priority"] == "P1"]
    gh = [p for p in pack if p["suggested_pool"] == "demo_replication"]

    lines = [
        "# 今日 AI PM 行业雷达",
        "",
        f"> 日期：{DATE}（Asia/Shanghai）｜AIhot selected：0（API 不可用）｜长清单：{len(links)-1} 条｜阅读包：{len(pack)} 条",
        f"> 来源配比：AIhot 0；官方/一手 14；产品案例/teardown 4；GitHub/release 6；研究/报告 5。未使用 AIhot 原因：云端 strict prefetch SSL 失败，见 ingest 披露项。",
        "",
        "## 1. 五段式日报",
        "",
        "**产品/行业动态**：Anthropic 7/7 将 Cowork 推到 Web/移动端，并把超 90% 非开发使用场景写进官方叙事；同日政府版 Claude Code/Cowork 推广继续强化 2B/Gov 路线。Fortune 早前确认 Anthropic 年化收入口径领先 OpenAI，与 Fable 5 今日（7/8）起改 credits 计费形成「增长 vs 算力成本」对照。",
        "",
        "**GitHub/工程信号**：Claude Code 连续发布 v2.1.202–204，Manual 权限默认可视化、后台会话与 headless hook 可靠性是主线；开源侧 Activepieces（~400 MCP）、Headroom（上下文压缩）、SonarQube MCP 提供可试路径。MCP 2026-07-28 最终规范倒计时约 20 天，远程 server 需迁移规划。",
        "",
        "**论文/研究信号**：今日无强 arXiv 新稿进入阅读包；JADEPUFFER 案例更偏威胁情报与工程暴露面，研究上待独立论文/复现。",
        "",
        "**工具/工作流信号**：Cowork 跨端 + 离线定时任务把「委托式 agent」从桌面扩展到日常知识工作；Fable 5 计费切换迫使你审视模型路由与 credits 上限；MCP 网关/registry 类 repo 反映企业工具治理需求上升。",
        "",
        "**风险/限制/反例**：JADEPUFFER 证明暴露的 Langflow/凭证环境可被 agent 链式勒索——人类仍策划攻击，但技术执行高度自主；GPT-5.6 广义发布、白宫自愿框架全文仍不确定；多条 IPO/硬件传闻信息不完整，宜作背景而非行动依据。",
        "",
        "## 2. 今日 30mins 阅读包",
        "",
        "#### P0 详细阅读",
        "",
    ]
    for item in p0:
        lines.append(pack_section(item, "P0 详细阅读"))

    lines.append("#### P1 扫读")
    lines.append("")
    for item in p1:
        if item in gh:
            continue
        lines.append(pack_section(item, "P1 扫读"))

    lines.append("#### GitHub 热门或可复刻项目")
    lines.append("")
    for item in gh:
        lines.append(pack_section(item, "GitHub 热门或可复刻项目"))

    lines.append("## 3. 未入选阅读包的剩余链接")
    lines.append("")
    for item in rest:
        suggest_pack = "是" if item["reading_pack_status"] == "candidate" else "否"
        header = (
            f"### {item['title']}\n"
            f"- 链接：{item['original_url']}\n"
            f"- 优先级：{item['priority']}｜建议池：`{item['suggested_pool']}`｜"
            f"reading_pack_status: `{item['reading_pack_status']}`｜human_status: `{item['human_status']}`｜"
            f"建议人工加入阅读包：{suggest_pack}"
        )
        if item.get("source_mix_note") and item["source_mix_note"] not in ("main_aihot", ""):
            header += f"｜source_mix_note: `{item['source_mix_note']}`"
        lines.append(header)
        lines.append(f"- 摘要：{item['display_summary']}")
        if item["duplicate_status"] in ("material_update", "carry_over", "duplicate_suppressed") and item.get("novelty_reason"):
            lines.append(f"- 保留/去重说明：{item['duplicate_status']} — {item['novelty_reason']}")
        lines.append("")

    lines.extend([
        "## 4. 今日练习三选一",
        "",
        "### 选项 A（正式练习）：Fable 5 计费切换后的模型路由审计备忘录",
        "- 用时：30–40 分钟",
        "- 材料：Anthropic 定价页 + 你当前 Claude/Claude Code 路由配置",
        "- 产出：1 页 memo——哪些 workflow 继续 Fable 5、哪些降级 Opus/Sonnet、credits 月上限建议",
        "- 原始链接：https://www.anthropic.com/pricing",
        "- 面试价值：直接支撑 2B「成本/能力/权限」三角判断",
        "",
        "### 选项 B：Activepieces 最小 MCP workflow demo",
        "- 用时：40–45 分钟",
        "- 材料：https://github.com/activepieces/activepieces",
        "- 产出：本地跑通 1 个含 MCP 调用的 flow + 截图/README",
        "- 未选去向建议：进入 `demo-replication` 候选池（`human_status: pending`）",
        "",
        "### 选项 C：JADEPUFFER 暴露面 checklist（Langflow/Agent 部署）",
        "- 用时：25–35 分钟",
        "- 材料：TechCrunch/Sysdig 报道 + CISA KEV",
        "- 产出：10 条「AI 开发工具上线前检查项」清单",
        "- 未选去向建议：进入 `personal-work` 或 `archive`（视你是否需要作品集安全向素材）",
        "",
        "**今日正式练习：选项 A**（与 7/8 计费生效日强相关，最快形成可复述的 PM 判断）。",
    ])
    return "\n".join(lines) + "\n"


def pool_entries(links: list[dict]) -> dict[str, list[dict]]:
    pools: dict[str, list[dict]] = {
        "product-inspiration": [],
        "paper-candidates": [],
        "demo-replication": [],
        "knowledge-gap": [],
        "personal-work": [],
        "archive": [],
    }
    mapping = {
        "product_inspiration": "product-inspiration",
        "paper_candidate": "paper-candidates",
        "demo_replication": "demo-replication",
        "knowledge_gap": "knowledge-gap",
        "personal_work": "personal-work",
        "archive": "archive",
        "drop": "archive",
    }
    for item in links:
        if item["id"] == f"{DATE}-26":
            continue
        key = mapping.get(item["suggested_pool"])
        if not key:
            continue
        entry = {k: item[k] for k in item if k not in ("read_reason", "focus_direction", "known_facts", "open_questions")}
        entry["ingested_from"] = f"state/daily/{DATE}-links.jsonl"
        pools[key].append(entry)
    return pools


def memory_entries(links: list[dict]) -> list[dict]:
    out = []
    for item in links:
        if item["id"] == f"{DATE}-26":
            continue
        if item["reading_pack_status"] == "selected" or item["suggested_pool"] in (
            "demo_replication",
            "product_inspiration",
            "personal_work",
            "paper_candidate",
        ):
            out.append(
                {
                    "canonical_key": item["canonical_key"],
                    "date": DATE,
                    "duplicate_status": item["duplicate_status"],
                    "human_status": item["human_status"],
                    "original_url": item["original_url"],
                    "priority": item["priority"],
                    "reading_pack_status": item["reading_pack_status"],
                    "reason": item["reason"],
                    "suggested_pool": item["suggested_pool"],
                    "title": item["title"],
                }
            )
    out.append(
        {
            "canonical_key": "practice_fable5_routing_audit_memo",
            "date": DATE,
            "duplicate_status": "new",
            "human_status": "pending",
            "original_url": "https://www.anthropic.com/pricing",
            "priority": "P0",
            "reading_pack_status": "formal_practice",
            "reason": "正式练习：Fable 5 计费切换后的模型路由审计备忘录",
            "suggested_pool": "personal_work",
            "title": "正式练习：Fable 5 路由与 credits 审计 memo",
        }
    )
    return out


def main() -> None:
    links_path = ROOT / f"state/daily/{DATE}-links.jsonl"
    report_path = ROOT / f"state/daily/{DATE}-report.md"
    memory_path = ROOT / "state/memory/ai-pm-7d.jsonl"

    with links_path.open("w", encoding="utf-8") as f:
        for item in LINKS:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
        meta = {
            "_meta": True,
            "date": DATE,
            "finished_at": FINISHED_AT,
            "link_count": len(LINKS) - 1,
            "aihot_selected_count": 0,
            "aihot_supplement_count": 0,
            "web_supplement_count": len(LINKS) - 1,
            "narrow_carry_count": 0,
            "since_iso": "2026-07-02T00:00:00Z",
            "ingest_note": "AIhot API unavailable; strict mode fallback to primary sources",
        }
        f.write(json.dumps(meta, ensure_ascii=False) + "\n")

    report_path.write_text(build_report(LINKS), encoding="utf-8")

    # Append pools (don't duplicate entire history)
    pools = pool_entries(LINKS)
    for name, entries in pools.items():
        p = ROOT / "pools" / f"{name}.jsonl"
        existing = p.read_text(encoding="utf-8") if p.exists() else ""
        existing_keys = set()
        for line in existing.splitlines():
            if line.strip():
                try:
                    existing_keys.add(json.loads(line).get("canonical_key"))
                except json.JSONDecodeError:
                    pass
        with p.open("a", encoding="utf-8") as f:
            for e in entries:
                if e["canonical_key"] not in existing_keys:
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # Replace 7d memory: keep entries older than 7 days from 2026-07-02 batch... simplify: append today's
    with memory_path.open("a", encoding="utf-8") as f:
        for e in memory_entries(LINKS):
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    print(f"Wrote {links_path}")
    print(f"Wrote {report_path}")
    print(f"Updated memory and pools")


if __name__ == "__main__":
    main()
