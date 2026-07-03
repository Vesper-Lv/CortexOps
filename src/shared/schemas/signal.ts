import { z } from "zod";

// 宽松：所有业务字段可空，未知字段透传（原始行另存 rawJson）。
// daily / memory / pool 三种来源共用此 schema。
export const signalObjectSchema = z
  .object({
    id: z.string().optional(),
    canonical_key: z.string().optional(),
    date: z.string().optional(),
    title: z.string().optional(),
    source_name: z.string().optional(),
    source_url: z.string().optional(),
    original_url: z.string().optional(),
    priority: z.string().optional(),
    suggested_pool: z.string().optional(),
    final_pool: z.string().optional(),
    human_status: z.string().optional(),
    reading_pack_status: z.string().optional(),
    duplicate_status: z.string().optional(),
    practice_fit: z.string().optional(),
    category: z.string().optional(),
    published_at: z.string().optional(),
    reason: z.string().optional(),
    aihot_summary: z.string().optional(),
    codex_summary: z.string().optional()
  })
  .passthrough();

export type SignalObject = z.infer<typeof signalObjectSchema>;
