"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/shared/navigation";

type NavigationListProps = {
  variant: "sidebar" | "mobile";
};

export function NavigationList({ variant }: NavigationListProps) {
  const pathname = usePathname();

  return (
    <>
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const baseClass =
          variant === "sidebar"
            ? "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition"
            : "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition";
        const activeClass =
          variant === "sidebar"
            ? "bg-muted text-foreground"
            : "border-primary bg-primary text-primary-foreground";
        const inactiveClass =
          variant === "sidebar"
            ? "text-muted-foreground hover:bg-muted hover:text-foreground"
            : "border-border bg-surface text-muted-foreground hover:text-foreground";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
