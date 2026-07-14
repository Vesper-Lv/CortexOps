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
const HIDE_DELAY_MS = 150;

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
  const panelRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearHide();
    const el = triggerRef.current;
    if (!el) return;
    setPos(clampPanel(el.getBoundingClientRect()));
    setOpen(true);
  }, [clearHide]);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => setOpen(false), HIDE_DELAY_MS);
  }, [clearHide]);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const height = panelRef.current?.offsetHeight ?? 160;
    setPos(clampPanel(el.getBoundingClientRect(), height));
  }, []);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !triggerRef.current) return;
    const height = panelRef.current.offsetHeight;
    setPos(clampPanel(triggerRef.current.getBoundingClientRect(), height));
  }, [open, trimmed]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  useEffect(() => () => clearHide(), [clearHide]);

  if (!trimmed) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="block min-w-0"
        onPointerEnter={show}
        onPointerLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
        aria-describedby={open ? panelId : undefined}
      >
        {children}
      </span>
      {mounted &&
        open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="tooltip"
            onPointerEnter={show}
            onPointerLeave={scheduleHide}
            className="fixed z-[100] max-h-[min(40vh,24rem)] overflow-y-auto rounded-md border border-border bg-surface p-3 text-xs leading-5 text-foreground shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {trimmed}
          </div>,
          document.body
        )}
    </>
  );
}
