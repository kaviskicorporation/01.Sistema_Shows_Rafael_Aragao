"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import type { FaqItem } from "@/lib/types";
import { resolveNavIcon } from "@/lib/navIcons";
import AliveTitle from "./AliveTitle";
import AnimatedArrow from "./AnimatedArrow";
import SectionAura from "./SectionAura";
import TiltCard from "./TiltCard";

export default function FaqSection({
  eyebrow = "Dúvidas",
  title = "Perguntas frequentes",
  items,
}: {
  eyebrow?: string;
  title?: string;
  items: FaqItem[];
}) {
  const visible = items.filter((item) => item.is_active !== false);
  const [openId, setOpenId] = useState<number | null>(null);

  if (!visible.length) return null;

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-ink py-16 sm:py-24 noise-bg"
    >
      <SectionAura variant="ribbons" />
      <div className="pointer-events-none absolute left-0 top-0 z-[1] h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          className="max-w-3xl"
        >
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            <Sparkles size={13} />
            {eyebrow}
          </p>
          <div className="mt-3 flex items-end gap-3">
            <AliveTitle className="font-display text-4xl font-black text-white sm:text-5xl lg:text-6xl">
              {title}
            </AliveTitle>
            <span className="mb-1 hidden text-gold sm:inline-flex">
              <AnimatedArrow />
            </span>
          </div>
        </motion.div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5 [perspective:1100px]">
          {visible.map((item, index) => {
            const open = openId === item.id;
            const Icon = resolveNavIcon(item.icon, "help-circle");
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (index % 4) * 0.06 }}
              >
                <TiltCard
                  as="article"
                  maxTilt={5}
                  intense
                  className={`overflow-hidden rounded-2xl border bg-ink-card/80 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.9)] backdrop-blur-sm transition-colors ${
                    open
                      ? "border-gold/45 shadow-[0_0_60px_-18px_color-mix(in_srgb,var(--theme-primary)_55%,transparent)]"
                      : "border-white/10 hover:border-gold/40"
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : item.id)}
                    className="flex w-full items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5 sm:py-5"
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                        open
                          ? "bg-gold text-ink"
                          : "bg-gold/12 text-gold"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-[15px] font-bold leading-snug text-white sm:text-lg">
                      {item.question}
                    </span>
                    <span
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                        open
                          ? "border-gold/50 bg-gold/15 text-gold"
                          : "border-white/10 text-gold/80"
                      }`}
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-300 ${
                          open ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mx-4 mb-4 border-t border-gold/20 px-1 pb-1 pt-3 sm:mx-5 sm:mb-5">
                          <div className="flex gap-3 rounded-xl bg-gold/[0.06] px-3 py-3 sm:px-4">
                            <HelpCircle
                              size={15}
                              className="mt-0.5 shrink-0 text-gold/80"
                            />
                            <div
                              className="faq-answer text-sm leading-relaxed text-white/75 sm:text-[15px] [&_a]:font-semibold [&_a]:text-gold [&_a]:underline [&_a]:decoration-gold/50 [&_a]:underline-offset-2 [&_a]:transition hover:[&_a]:text-gold/80"
                              dangerouslySetInnerHTML={{
                                __html: item.answer_html || item.answer,
                              }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
