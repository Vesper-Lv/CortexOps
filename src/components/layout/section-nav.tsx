"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findSectionByPath } from "@/shared/navigation";

export function SectionNav() {
  const pathname = usePathname();
  const section = findSectionByPath(pathname);
  if (!section) return null;

  return (
    <nav className="w-52 shrink-0 border-r border-border py-6 pr-4">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {section.label}
      </p>
      <ul className="flex flex-col gap-1">
        {section.children.map((child) => {
          const isActive = pathname === child.href;
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <child.icon className="h-4 w-4 shrink-0" />
                {child.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
