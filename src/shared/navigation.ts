import {
  Archive,
  Bot,
  CalendarDays,
  FileText,
  Inbox,
  KanbanSquare,
  Settings,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

export const navigationItems = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/review", label: "Review Inbox", icon: Inbox },
  { href: "/pools", label: "Candidate Pools", icon: Archive },
  { href: "/tasks", label: "Tasks", icon: KanbanSquare },
  { href: "/artifacts", label: "Artifacts", icon: Sparkles },
  { href: "/focus-rules", label: "Focus Rules", icon: SlidersHorizontal },
  { href: "/automations", label: "Automations", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;
