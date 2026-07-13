"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationSections, sectionLandingHref } from "@/shared/navigation";

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto">
      {navigationSections.map((section) => {
        const isActive =
          pathname === section.basePath || pathname.startsWith(`${section.basePath}/`);
        return (
          <Link
            key={section.key}
            href={sectionLandingHref(section)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
