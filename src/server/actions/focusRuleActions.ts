"use server";

import { revalidatePath } from "next/cache";
import {
  activateFocusRule,
  archiveFocusRule,
  extendFocusRule,
  exportFocusPolicyMarkdown,
  pauseFocusRule
} from "@/server/services/focusRules";

export async function pauseFocusRuleAction(focusId: string) {
  await pauseFocusRule(focusId);
  revalidatePath("/settings/focus-rules");
}

export async function activateFocusRuleAction(focusId: string) {
  await activateFocusRule(focusId);
  revalidatePath("/settings/focus-rules");
}

export async function archiveFocusRuleAction(focusId: string) {
  await archiveFocusRule(focusId);
  revalidatePath("/settings/focus-rules");
}

export async function extendFocusRuleAction(focusId: string, newEndDate: string) {
  await extendFocusRule(focusId, newEndDate);
  revalidatePath("/settings/focus-rules");
}

export async function exportFocusPolicyAction(): Promise<string> {
  return exportFocusPolicyMarkdown();
}
