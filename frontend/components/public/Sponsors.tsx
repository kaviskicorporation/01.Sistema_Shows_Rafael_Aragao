"use client";

import { motion } from "framer-motion";
import TiltCard from "./TiltCard";

/** Só marcas reais de patrocínio — a foto do artista não entra aqui. */
const SPONSORS: {
  name: string;
  src?: string;
  textMark?: string;
}[] = [
  {
    name: "CDC",
    textMark: "CDC",
  },
  {
    name: "Sistema Fiep | SENAI",
    src: "/images/senai.png",
  },
];

export default function Sponsors() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-ink-soft py-12">
      <div className="bg-grid-soft pointer-events-none absolute inset-0 z-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--theme-primary)_8%,transparent),transparent_60%)]" />

      <div className="relative z-10 mx-auto max-w-4xl px-5">
        <div className="flex flex-col items-center gap-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/40">
            Patrocinadores
          </p>

          <div className="flex w-full flex-wrap items-stretch justify-center gap-6 [perspective:900px] sm:gap-10">
            {SPONSORS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex"
              >
                <TiltCard
                  maxTilt={3}
                  className="flex h-[5.75rem] w-[13.5rem] items-center justify-center rounded-2xl border border-white/10 bg-ink/50 px-6 backdrop-blur-sm sm:h-24 sm:w-60"
                >
                  {s.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.src}
                      alt={s.name}
                      className="h-12 w-auto max-w-[90%] object-contain opacity-80 transition-opacity hover:opacity-100 md:h-14"
                    />
                  ) : (
                    <span className="font-display text-2xl font-black tracking-[0.22em] text-white/75 transition-colors hover:text-gold md:text-3xl">
                      {s.textMark}
                    </span>
                  )}
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
