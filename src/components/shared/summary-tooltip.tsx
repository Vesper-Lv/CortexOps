"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";

type SummaryTooltipProps = {
  summary: string;
  children: ReactNode;
};

type PanelPos = { top: number; left: number; width: number };

const PANEL_WIDTH = 320;
const GAP = 8;
const VIEWPORT_PAD = 8;

function clampPanel(anchor: DOMRect, panelHeight = 160): PanelPos {
  const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);
  let left = anchor.left;
  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD));

  const below = anchor.bottom + GAP;
  const fitsBelow = below + panelHeight <= window.innerHeight - VIEWPORT_PAD;
  const top = fitsBelow
    ? below
    : Math.max(VIEWPORT_PAD, anchor.top - GAP - panelHeight);

  return { top, left, width };
}

export function SummaryTooltip({ summary, children }: SummaryTooltipProps) {
  const trimmed = summary.trim();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const height = panelRef.current?.offsetHeight ?? 160;
    setPos(clampPanel(el.getBoundingClientRect(), height));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open, updatePos, trimmed]);

  useLayoutEffect(() => {
    if (!open || !pos || !panelRef.current) return;
    const height = panelRef.current.offsetHeight;
    const next = clampPanel(triggerRef.current!.getBoundingClientRect(), height);
    if (next.top !== pos.top || next.left !== pos.left || next.width !== pos.width) {
      setPos(next);
    }
  }, [open, pos, trimmed]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onScroll = () => {
      updatePos();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePos);
    // Close when the pointer leaves the page (e.g. drag outside).
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("blur", close);
    };
  }, [open, updatePos]);

  if (!trimmed) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="inline"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? panelId : undefined}
      >
        {children}
      </span>
      {mounted &&
        open &&
        pos &&
        createPortal(
          <span
            ref={panelRef}
            id={panelId}
            role="tooltip"
            className="pointer-events-none fixed z-[100] max-h-[min(40vh,24rem)] overflow-y-auto rounded-md border border-border bg-surface p-3 text-xs leading-5 text-foreground shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {trimmed}
          </span>,
          document.body
        )}
    </>
  );
}
