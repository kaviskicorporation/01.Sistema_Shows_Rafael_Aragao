"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Mode = "idle" | "view" | "day" | "cta" | "send";

const LABELS: Record<Mode, string> = {
  idle: "",
  view: "Ver",
  day: "Abrir",
  cta: "Ir",
  send: "Enviar",
};

/**
 * Cursor circular nítido: sem backdrop-blur e sem scale no texto
 * (scale + blur eram a causa do “borrado”).
 */
export default function SoftCursor({
  active,
  mode = "idle",
}: {
  active: boolean;
  mode?: Mode;
}) {
  const [ready, setReady] = useState(false);
  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const springX = useSpring(rawX, { stiffness: 450, damping: 34, mass: 0.22 });
  const springY = useSpring(rawY, { stiffness: 450, damping: 34, mass: 0.22 });
  const tipX = useTransform(springX, (v) => Math.round(v));
  const tipY = useTransform(springY, (v) => Math.round(v));

  useEffect(() => {
    setReady(true);
    const onMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  if (!ready) return null;

  const label = LABELS[mode];
  const expanded = active && mode !== "idle";
  const size = !active ? 18 : expanded ? (label ? 66 : 36) : 26;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[90] hidden md:block ${
        active ? "opacity-100" : "opacity-0"
      } transition-opacity duration-150`}
    >
      <motion.div
        className="absolute top-0 left-0"
        style={{ left: tipX, top: tipY }}
      >
        <motion.div
          className="flex items-center justify-center rounded-full border border-white/85 bg-black/55"
          style={{
            borderRadius: 9999,
            // GPU layer sem blur de filtros
            transform: "translate(-50%, -50%) translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitFontSmoothing: "antialiased",
          }}
          animate={{ width: size, height: size }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
        >
          {label ? (
            <span
              key={label}
              className="select-none px-1 text-center text-[9px] font-bold uppercase leading-none tracking-[0.16em] text-white"
            >
              {label}
            </span>
          ) : (
            <span
              className="block h-1.5 w-1.5 rounded-full bg-gold"
              style={{ borderRadius: 9999 }}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

export type SoftCursorMode = Mode;
