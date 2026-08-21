"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useIsCoarsePointer } from "./useIsCoarsePointer";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Inclinação máxima em graus */
  maxTilt?: number;
  /** Intensidade do brilho que segue o mouse */
  glare?: boolean;
  /** Tom do fundo no hover (gold / white) */
  glow?: "gold" | "white";
  /** Brilho de fundo mais visível (FAQ / cards de destaque) */
  intense?: boolean;
  as?: "div" | "article";
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
};

/**
 * Card com tilt 3D + fundo que reage ao mouse (estilo portfólio).
 * Em touch/celular o tilt é desligado (evita bugs de layout e fixed).
 */
export default function TiltCard({
  children,
  className = "",
  maxTilt = 3,
  glare = true,
  glow = "gold",
  intense = false,
  as = "div",
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const coarse = useIsCoarsePointer();
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const hover = useMotionValue(0);

  const springX = useSpring(rawX, { stiffness: 160, damping: 28, mass: 0.4 });
  const springY = useSpring(rawY, { stiffness: 160, damping: 28, mass: 0.4 });
  const springHover = useSpring(hover, { stiffness: 140, damping: 26 });

  const tilt = coarse ? 0 : maxTilt;
  const rotateX = useTransform(springY, [-0.5, 0.5], [tilt, -tilt]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-tilt, tilt]);

  const glareX = useTransform(springX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(springY, [-0.5, 0.5], ["0%", "100%"]);
  const glareOpacity = useTransform(
    springHover,
    [0, 1],
    [0, intense ? 0.48 : 0.28],
  );

  const tint =
    glow === "gold"
      ? `color-mix(in srgb, var(--theme-primary) ${intense ? 22 : 8}%, transparent)`
      : intense
        ? "rgba(255,255,255,0.10)"
        : "rgba(255,255,255,0.05)";
  const bg = useMotionTemplate`radial-gradient(${intense ? "640px" : "520px"} circle at ${glareX} ${glareY}, ${tint}, transparent ${intense ? "62%" : "55%"})`;
  const shine = useMotionTemplate`radial-gradient(280px circle at ${glareX} ${glareY}, rgba(255,255,255,0.12), transparent 50%)`;

  function handleMove(e: React.MouseEvent) {
    if (coarse || tilt === 0) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rawX.set(px);
    rawY.set(py);
    hover.set(1);
  }

  function handleLeave(e: React.MouseEvent) {
    rawX.set(0);
    rawY.set(0);
    hover.set(0);
    onMouseLeave?.(e);
  }

  const Comp = as === "article" ? motion.article : motion.div;

  if (coarse) {
    if (as === "article") {
      return (
        <article className={`relative isolate ${className}`}>
          <div className="relative z-10 h-auto">{children}</div>
        </article>
      );
    }
    return (
      <div className={`relative isolate ${className}`}>
        <div className="relative z-10 h-auto">{children}</div>
      </div>
    );
  }

  return (
    <Comp
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        transformPerspective: 900,
      }}
      className={`relative isolate ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{ background: bg, opacity: springHover }}
      />
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: shine, opacity: glareOpacity }}
        />
      )}
      <div
        className="relative z-10 h-auto"
        style={{ transform: "translateZ(12px)" }}
      >
        {children}
      </div>
    </Comp>
  );
}
