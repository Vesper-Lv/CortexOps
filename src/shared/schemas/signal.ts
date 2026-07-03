import { z } from "zod";

// 宽松：只要求"顶层是对象"。已知字段用 z.unknown()（记录期望形状，但不强制类型），
// 避免某字段类型不符时整行连同 rawJson 一起被丢弃——recoverability 优先。
// 未知字段透传；真正的字段清洗在 recordMapper 的 s() 中完成（非字符串 → null）。
export const signalObjectSchema = z
  .object({
    id: z.unknown().optional(),
    canonical_key: z.unknown().optional(),
    date: z.unknown().optional(),
    title: z.unknown().optional(),
    source_name: z.unknown().optional(),
    source_url: z.unknown().optional(),
    original_url: z.unknown().optional(),
    priority: z.unknown().optional(),
    suggested_pool: z.unknown().optional(),
    final_pool: z.unknown().optional(),
    human_status: z.unknown().optional(),
    reading_pack_status: z.unknown().optional(),
    duplicate_status: z.unknown().optional(),
    practice_fit: z.unknown().optional(),
    category: z.unknown().optional(),
    published_at: z.unknown().optional(),
    reason: z.unknown().optional(),
    aihot_summary: z.unknown().optional(),
    codex_summary: z.unknown().optional()
  })
  .passthrough();

export type SignalObject = z.infer<typeof signalObjectSchema>;
