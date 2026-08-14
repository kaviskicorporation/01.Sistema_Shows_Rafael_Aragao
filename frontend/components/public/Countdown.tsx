"use client";

import { useEffect, useState } from "react";

function diff(target: Date) {
  const total = target.getTime() - Date.now();
  const clamp = Math.max(total, 0);
  return {
    days: Math.floor(clamp / 86400000),
    hours: Math.floor((clamp % 86400000) / 3600000),
    minutes: Math.floor((clamp % 3600000) / 60000),
    seconds: Math.floor((clamp % 60000) / 1000),
  };
}

export default function Countdown({
  target,
  size = "md",
}: {
  target: string;
  size?: "md" | "lg";
}) {
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);
  const large = size === "lg";

  useEffect(() => {
    const date = new Date(target);
    const id = setInterval(() => setT(diff(date)), 1000);
    const boot = setTimeout(() => setT(diff(date)), 0);
    return () => {
      clearInterval(id);
      clearTimeout(boot);
    };
  }, [target]);

  const cells = [
    { v: t?.days ?? 0, l: "dias" },
    { v: t?.hours ?? 0, l: "horas" },
    { v: t?.minutes ?? 0, l: "min" },
    { v: t?.seconds ?? 0, l: "seg" },
  ];

  return (
    <div
      className={`flex ${large ? "gap-2 sm:gap-3" : "gap-1.5 sm:gap-2"}`}
      suppressHydrationWarning
    >
      {cells.map((c) => (
        <div
          key={c.l}
          className={`flex flex-col items-center rounded-xl border border-white/10 bg-black/35 backdrop-blur-sm ${
            large
              ? "min-w-[3.5rem] px-2.5 py-2.5 sm:min-w-[4.5rem] sm:rounded-2xl sm:px-3.5 sm:py-3"
              : "min-w-[48px] px-2 py-1.5 sm:min-w-[54px]"
          }`}
        >
          <span
            className={`font-display font-bold tabular-nums text-gold ${
              large
                ? "text-xl sm:text-2xl md:text-3xl"
                : "text-base sm:text-lg"
            }`}
          >
            {t ? String(c.v).padStart(2, "0") : "--"}
          </span>
          <span
            className={`uppercase tracking-wider text-white/45 ${
              large ? "text-[9px] sm:text-[10px]" : "text-[9px]"
            }`}
          >
            {c.l}
          </span>
        </div>
      ))}
    </div>
  );
}
