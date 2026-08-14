"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import type { SiteConfig } from "@/lib/types";
import { jumpToContactForm } from "@/lib/scroll";
import AliveTitle from "./AliveTitle";
import Typewriter from "./Typewriter";
import AnimatedArrow from "./AnimatedArrow";
import SectionAura from "./SectionAura";
import TiltCard from "./TiltCard";

const ARTIST_CUTOUT = "/images/rafael-cutout.png";

export default function About({ config }: { config: SiteConfig }) {
  if (!config.about_text) return null;

  const aboutImage =
    config.about_image_display ||
    config.about_image ||
    config.about_image_url ||
    ARTIST_CUTOUT;

  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const imgX = useTransform(sx, [-0.5, 0.5], [16, -16]);
  const imgY = useTransform(sy, [-0.5, 0.5], [10, -10]);
  const glowX = useTransform(sx, [-0.5, 0.5], [-20, 20]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      id="sobre"
      ref={ref}
      onMouseMove={onMove}
      className="relative overflow-hidden bg-ink py-16 sm:py-24 noise-bg"
    >
      <SectionAura variant="ribbons" />
      <div className="pointer-events-none absolute left-0 top-0 z-[1] h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-6 px-5 md:grid-cols-[1.05fr_0.95fr] md:gap-2 lg:gap-6">
        {/* Text column */}
        <motion.div
          initial={{ opacity: 0, x: -28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative z-20 order-2 md:order-1"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">
            {config.about_title}
          </span>

          {/* Keep AliveTitle — hover laranja nas letras */}
          <AliveTitle className="mt-3 font-display text-4xl font-black text-white sm:text-5xl lg:text-6xl">
            {config.hero_title}
          </AliveTitle>

          {/* Typewriter tagline — efeito do vídeo */}
          <Typewriter
            text="O humorista que lota teatros pelo Brasil"
            className="mt-4 min-h-[1.6em] font-display text-lg italic text-gold sm:text-xl"
            speed={42}
            startDelay={400}
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-5 max-w-lg whitespace-pre-line text-base leading-relaxed text-white/65 sm:text-lg"
          >
            {config.about_text}
          </motion.p>

          <div className="mt-7 flex flex-wrap gap-3 [perspective:800px]">
            {[
              { k: "Humor", v: "Stand-up" },
              { k: "Espetáculo", v: "Rei dos Peão" },
              { k: "Brasil", v: "Turnê nacional" },
            ].map((item, i) => (
              <motion.div
                key={item.k}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i }}
              >
                <TiltCard
                  maxTilt={3}
                  className="rounded-xl border border-white/10 bg-ink-card/80 px-4 py-3 backdrop-blur"
                >
                  <p className="text-[10px] uppercase tracking-widest text-white/35">
                    {item.k}
                  </p>
                  <p className="font-display text-sm font-bold text-gold">
                    {item.v}
                  </p>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="#contato"
            onClick={jumpToContactForm}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-gold"
            whileHover={{ x: 4 }}
          >
            Contrate para o seu evento
            <span className="text-gold">
              <AnimatedArrow />
            </span>
          </motion.a>
        </motion.div>

        {/* Cutout — sem caixa/quadro, mesclado no fundo */}
        <div className="relative order-1 flex justify-center md:order-2 md:justify-end">
          {/* Glow behind figure */}
          <motion.div
            style={{ x: glowX }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/25 blur-[80px]"
          />
          <motion.div
            className="pointer-events-none absolute bottom-[8%] left-[10%] h-3 w-3 rounded-full bg-gold"
            animate={{ scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="pointer-events-none absolute right-[12%] top-[18%] h-16 w-16 rounded-full border border-gold/25"
            animate={{ y: [0, -14, 0], rotate: [0, 12, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            style={{ x: imgX, y: imgY }}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring", stiffness: 80 }}
            className="relative w-full max-w-md lg:max-w-lg"
          >
            {/* Soft floor shadow — suggests figure sitting in space */}
            <div className="pointer-events-none absolute bottom-[4%] left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-[100%] bg-black/60 blur-xl" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              src={aboutImage}
              alt={config.hero_title}
              className="relative z-10 w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.65)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Floating badge crossing the figure — intentional overlap */}
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-2, 1, -2] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-2 bottom-[12%] z-20 rounded-full border border-gold/50 bg-ink/90 px-4 py-2 text-xs font-semibold text-gold shadow-lg backdrop-blur sm:-left-6"
            >
              Rei dos Peão
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -right-1 top-[22%] z-20 rounded-full border border-white/15 bg-ink-card/90 px-3 py-1.5 text-[10px] font-medium text-white/70 shadow-lg backdrop-blur sm:right-0 sm:text-xs"
            >
              Lota teatros pelo Brasil
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
