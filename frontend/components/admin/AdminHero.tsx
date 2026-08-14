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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="admin-glass relative p-5 sm:p-6"
    >
      <motion.div
        className="admin-tone-glow pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full blur-3xl"
        animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.12, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-[20%] h-40 w-40 rounded-full bg-gold/10 blur-3xl"
        aria-hidden
      />
      <div
        className="admin-tone-line pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <motion.span
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            className="admin-tone-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
          >
            <Icon size={22} strokeWidth={2.2} />
          </motion.span>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/50">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="flex flex-wrap items-center gap-2 sm:justify-end"
          >
            {actions}
          </motion.div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="relative mt-5 grid gap-2.5 sm:grid-cols-3">
          {stats.map((s, i) => {
            const StatIcon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                className="admin-glass-soft flex items-center gap-3 px-3.5 py-2.5 transition hover:border-[color-mix(in_srgb,var(--admin-tone)_35%,transparent)]"
              >
                {StatIcon && (
                  <span className="admin-tone-chip flex h-9 w-9 items-center justify-center rounded-xl border">
                    <StatIcon size={15} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[11px] uppercase tracking-wider text-white/40">
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
