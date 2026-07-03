"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findSectionByPath } from "@/shared/navigation";

export function SectionNav() {
  const pathname = usePathname();
  const section = findSectionByPath(pathname);
  if (!section) return null;

  return (
    <nav className="flex gap-2 overflow-x-auto border-b border-border pb-3">
      {section.children.map((child) => {
        const isActive = pathname === child.href;
        return (
          <Link
            key={child.href}
            href={child.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <child.icon className="h-4 w-4" />
            {child.label}
          </Link>
        );
      })}
    </nav>
  );
}
