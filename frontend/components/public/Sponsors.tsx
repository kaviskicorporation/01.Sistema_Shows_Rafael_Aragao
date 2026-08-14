"use client";

import { motion } from "framer-motion";
import type { Sponsor } from "@/lib/types";
import TiltCard from "./TiltCard";

export default function Sponsors({
  title = "Patrocinadores",
  sponsors = [],
}: {
  title?: string;
  sponsors?: Sponsor[];
}) {
  const list = sponsors.filter((s) => s.is_active !== false);
  if (!list.length) return null;

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-ink-soft py-10 sm:py-12">
      <div className="bg-grid-soft pointer-events-none absolute inset-0 z-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--theme-primary)_8%,transparent),transparent_60%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center sm:gap-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">
            {title || "Patrocinadores"}
          </p>

          <div className="flex w-full max-w-full flex-wrap items-stretch justify-center gap-3 sm:gap-5">
            {list.map((s, i) => {
              const src = s.image_display || s.image_url || "";
              const mark = s.text_mark || s.name;
              const inner = (
                <TiltCard
                  maxTilt={3}
                  className="flex h-[4.75rem] w-[min(100%,11.5rem)] max-w-full items-center justify-center rounded-2xl border border-white/10 bg-ink/50 px-4 backdrop-blur-sm sm:h-[5.25rem] sm:w-52"
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={s.name}
                      className="h-9 w-auto max-h-10 max-w-[85%] object-contain opacity-85 transition-opacity hover:opacity-100 sm:h-11 sm:max-h-12"
                    />
                  ) : (
                    <span className="max-w-full truncate px-1 font-display text-xl font-black tracking-[0.18em] text-white/75 transition-colors hover:text-gold sm:text-2xl">
                      {mark}
                    </span>
                  )}
                </TiltCard>
              );

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.08, 0.4) }}
                  className="flex max-w-full"
                >
                  {s.link ? (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noreferrer"
                      className="max-w-full"
                      aria-label={s.name}
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
