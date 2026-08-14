"use client";

import { motion } from "framer-motion";
import { Clapperboard } from "lucide-react";
import AliveTitle from "./AliveTitle";
import SectionAura from "./SectionAura";
import YoutubePlayer from "./YoutubePlayer";
import { parseYoutubeUrl } from "@/lib/youtube";

export default function VideoSection({
  url,
  title = "Especial de comédia",
}: {
  url: string;
  title?: string;
}) {
  if (!parseYoutubeUrl(url)) return null;

  return (
    <section
      id="video"
      className="relative overflow-hidden bg-ink-soft py-16 sm:py-24"
    >
      <SectionAura variant="wash" />
      <div className="pointer-events-none absolute left-0 top-0 z-[1] h-px w-full bg-gradient-to-r from-transparent via-gold/35 to-transparent" />

      <div className="relative z-10 mx-auto max-w-5xl px-5">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center sm:mb-10"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            <Clapperboard size={14} />
            Assista
          </span>
          <AliveTitle className="mt-3 font-display text-3xl font-black text-white sm:text-4xl lg:text-5xl">
            {title}
          </AliveTitle>
          <p className="mx-auto mt-3 max-w-lg text-sm text-white/50 sm:text-base">
            Um gostinho do espetáculo — aperte o play.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          <YoutubePlayer url={url} />
        </motion.div>
      </div>
    </section>
  );
}
