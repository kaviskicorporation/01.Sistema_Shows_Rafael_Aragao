"use client";

import { useEffect, useState } from "react";

/** Cursor spotlight + floating orbs — ambient life layer for the public site. */
export default function Ambient() {
  const [pos, setPos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      {/* Spotlight that follows the cursor */}
      <div
        className="absolute inset-0 transition-[background] duration-300 ease-out"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, color-mix(in srgb, var(--theme-primary) 7%, transparent), transparent 42%)`,
        }}
      />

      {/* Floating orbs */}
      <div className="animate-floaty-slow absolute -left-20 top-[20%] h-64 w-64 rounded-full bg-gold/10 blur-[80px]" />
      <div
        className="animate-floaty absolute -right-16 top-[55%] h-72 w-72 rounded-full bg-gold/8 blur-[90px]"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="animate-floaty-slow absolute left-[40%] top-[75%] h-48 w-48 rounded-full bg-white/[0.03] blur-[60px]"
        style={{ animationDelay: "3s" }}
      />
    </div>
  );
}
