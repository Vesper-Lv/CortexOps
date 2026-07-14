import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  FileText,
  Inbox,
  KanbanSquare,
  Library,
  ListTodo,
  Settings,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

export type NavChild = { href: Route; label: string; icon: LucideIcon };
export type NavSection = {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  children: NavChild[];
};

export const navigationSections: NavSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: BookOpen,
    basePath: "/dashboard",
    children: [
      { href: "/dashboard/today", label: "Today", icon: CalendarDays },
      { href: "/dashboard/weekly", label: "Weekly", icon: CalendarRange },
      { href: "/dashboard/monthly", label: "Monthly", icon: CalendarClock },
      { href: "/dashboard/tasks", label: "Tasks", icon: KanbanSquare }
    ]
  },
  {
    key: "inbox",
    label: "Inbox",
    icon: Inbox,
    basePath: "/inbox",
    children: [
      { href: "/inbox/today", label: "Today", icon: CalendarDays },
      { href: "/inbox/backlog" as Route, label: "Backlog", icon: ListTodo },
      { href: "/inbox/pools", label: "Candidate Pools", icon: Archive },
      { href: "/inbox/memo", label: "Memo", icon: ListTodo }
    ]
  },
  {
    key: "library",
    label: "Library",
    icon: Library,
    basePath: "/library",
    children: [
      { href: "/library/reports", label: "Reports", icon: FileText },
      { href: "/library/artifacts", label: "Artifacts", icon: Sparkles }
    ]
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    basePath: "/settings",
    children: [
      { href: "/settings", label: "General", icon: Settings },
      { href: "/settings/focus-rules", label: "Focus Rules", icon: SlidersHorizontal }
    ]
  }
];

export function sectionLandingHref(section: NavSection): Route {
  return section.children[0].href;
}

export function findSectionByPath(pathname: string): NavSection | undefined {
  return [...navigationSections]
    .sort((a, b) => b.basePath.length - a.basePath.length)
    .find((s) => pathname === s.basePath || pathname.startsWith(`${s.basePath}/`));
}
