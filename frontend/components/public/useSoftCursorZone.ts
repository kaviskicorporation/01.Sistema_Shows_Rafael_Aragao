"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SoftCursorMode } from "./SoftCursor";

/**
 * Cursor customizado só enquanto o ponteiro está sobre a zona —
 * desliga no scroll/resize mesmo sem mover o mouse.
 */
export function useSoftCursorZone() {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: -1, y: -1 });
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<SoftCursorMode>("idle");

  const isPointerInside = useCallback(() => {
    const el = zoneRef.current;
    if (!el) return false;
    const { x, y } = pointer.current;
    if (x < 0 || y < 0) return false;
    const r = el.getBoundingClientRect();
    return (
      x >= r.left &&
      x <= r.right &&
      y >= r.top &&
      y <= r.bottom
    );
  }, []);

  const deactivate = useCallback(() => {
    setActive(false);
    setMode("idle");
  }, []);

  useEffect(() => {
    const trackPointer = (e: MouseEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };

    const sync = () => {
      if (!isPointerInside()) deactivate();
    };

    window.addEventListener("mousemove", trackPointer, { passive: true });
    // capture: pega scroll em qualquer container
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("mousemove", trackPointer);
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [deactivate, isPointerInside]);

  const onZoneEnter = useCallback(() => {
    setActive(true);
    setMode("idle");
  }, []);

  const onZoneLeave = useCallback(() => {
    deactivate();
  }, [deactivate]);

  return {
    zoneRef,
    active,
    mode,
    setMode,
    onZoneEnter,
    onZoneLeave,
  };
}
