"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export default function AdminHero({
  icon: Icon,
  title,
  subtitle,
  actions,
  stats,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  stats?: { label: string; value: string | number; icon?: LucideIcon }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-card via-ink-card to-gold/5 p-5 sm:p-6"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl"
        animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-gold/5 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/15 text-gold shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--theme-primary)_50%,transparent)]"
          >
            <Icon size={22} strokeWidth={2.2} />
          </motion.span>
          <div>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/45">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="flex flex-wrap items-center gap-2 sm:justify-end"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="relative mt-5 grid gap-2 sm:grid-cols-3">
          {stats.map((s, i) => {
            const StatIcon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-ink/40 px-3.5 py-2.5 transition hover:border-gold/25 hover:bg-ink/55"
              >
                {StatIcon && (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <StatIcon size={15} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[11px] uppercase tracking-wider text-white/35">
                    {s.label}
                  </p>
                  <p className="font-display text-lg font-bold text-white">
                    {s.value}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
