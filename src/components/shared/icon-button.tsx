"use client";

import { Pencil, Trash2, ArrowUpRight, Plus, type LucideIcon } from "lucide-react";

const ICONS = {
  edit: Pencil,
  delete: Trash2,
  promote: ArrowUpRight,
  add: Plus
} as const;

export type IconButtonKind = keyof typeof ICONS;

export function IconButton({
  kind,
  label,
  onClick,
  disabled,
  className = ""
}: {
  kind: IconButtonKind;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const Icon: LucideIcon = ICONS[kind];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 ${className}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
