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

export default function Countdown({ target }: { target: string }) {
  const [t, setT] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    const date = new Date(target);
    const id = setInterval(() => setT(diff(date)), 1000);
    // Defer first paint to the interval tick to avoid sync setState-in-effect.
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
    <div className="flex gap-2" suppressHydrationWarning>
      {cells.map((c) => (
        <div
          key={c.l}
          className="flex min-w-[52px] flex-col items-center rounded-lg bg-white/5 px-2 py-1.5 backdrop-blur"
        >
          <span className="font-display text-lg font-bold text-gold tabular-nums">
            {t ? String(c.v).padStart(2, "0") : "--"}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-white/50">
            {c.l}
          </span>
        </div>
      ))}
    </div>
  );
}
