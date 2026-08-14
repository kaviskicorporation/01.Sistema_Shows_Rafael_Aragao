"use client";

import { useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CalendarDays, MapPin, Mic2, ShoppingCart, Sparkles } from "lucide-react";
import type { PublicEvent, SiteConfig } from "@/lib/types";
import { formatFullDate } from "@/lib/format";
import { jumpToContactForm } from "@/lib/scroll";
import { tourYearsLabel } from "@/lib/tourYears";
import Countdown from "./Countdown";
import AliveTitle from "./AliveTitle";
import SoftCursor from "./SoftCursor";
import { useSoftCursorZone } from "./useSoftCursorZone";
import TiltCard from "./TiltCard";
import SectionAura from "./SectionAura";

const FALLBACK_ART = "/images/rei-dos-peao.png";

export default function Hero({
  config,
  nextEvent,
  events = [],
}: {
  config: SiteConfig;
  nextEvent: PublicEvent | null;
  events?: PublicEvent[];
}) {
  const heroImage =
    config.hero_image_display ||
    config.hero_image ||
    config.hero_image_url ||
    FALLBACK_ART;
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const artX = useTransform(sx, [-0.5, 0.5], [10, -10]);
  const artY = useTransform(sy, [-0.5, 0.5], [6, -6]);
  const cardX = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const cardY = useTransform(sy, [-0.5, 0.5], [-8, 8]);

  const {
    zoneRef,
    active: cursorActive,
    onZoneEnter,
    onZoneLeave,
  } = useSoftCursorZone();

  const years = useMemo(
    () => tourYearsLabel(events.map((e) => e.date)),
    [events]
  );

  const highlights = useMemo(
    () => [
      { Icon: Mic2, label: "Humor de palco" },
      { Icon: MapPin, label: "Turnê nacional" },
      { Icon: CalendarDays, label: `Agenda ${years}` },
      { Icon: Sparkles, label: "Teatros lotados" },
    ],
    [years]
  );

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      id="top"
      ref={ref}
      onMouseMove={onMove}
      className="relative flex h-[100svh] max-h-[100svh] flex-col overflow-hidden bg-ink noise-bg"
    >
      {/* Só o anel + pontinho dourado (sem texto VER) */}
      <SoftCursor active={cursorActive} mode="idle" />
      <div className="bg-grid-soft pointer-events-none absolute inset-0 z-0" aria-hidden />
      <SectionAura variant="beams" />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_30%_35%,color-mix(in_srgb,var(--theme-primary)_16%,transparent),transparent_50%),radial-gradient(ellipse_at_85%_65%,color-mix(in_srgb,var(--theme-primary)_10%,transparent),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/90 via-transparent to-ink" />
      <div className="pointer-events-none absolute -left-24 top-1/4 z-[1] h-[20rem] w-[20rem] rounded-full bg-gold/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-10 right-0 z-[1] h-72 w-72 rounded-full bg-gold/12 blur-[90px]" />

      {heroImage && (
        <motion.div
          className="relative z-[5] flex shrink-0 justify-center px-3 pt-14 sm:pt-12 translate-y-[1.3cm]"
          style={{ x: artX, y: artY }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt="Rei dos Peão"
            className="h-auto w-[min(100vw,1280px)] max-h-[38vh] object-contain opacity-55 mix-blend-screen sm:max-h-[42vh] sm:opacity-60 md:max-h-[46vh]"
          />
        </motion.div>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 items-center px-5 pb-14">
        <div className="mx-auto grid w-full max-w-6xl -translate-y-[1cm] items-center gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-10 lg:gap-14">
          <div className="min-w-0">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-gold backdrop-blur"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Turnê {years}
            </motion.span>

            <AliveTitle
              as="h1"
              className="mt-3 font-display text-5xl font-black leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-7xl"
            >
              {config.hero_title}
            </AliveTitle>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 max-w-xl text-pretty text-base leading-snug text-white/75 sm:text-lg"
            >
              {config.hero_subtitle}
            </motion.p>

            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 }}
              className="mt-5 grid max-w-md grid-cols-2 gap-x-4 gap-y-2.5"
            >
              {highlights.map(({ Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={1.75} />
                  <span className="leading-tight">{label}</span>
                </li>
              ))}
            </motion.ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <a
                href="#agenda"
                className="btn-live rounded-full bg-gold px-7 py-3.5 font-semibold text-ink"
                onMouseMove={track}
              >
                Explorar calendário
              </a>
              <a
                href="#contato"
                onClick={jumpToContactForm}
                className="btn-live rounded-full border border-white/25 px-7 py-3.5 font-semibold text-white hover:border-gold hover:text-gold"
                onMouseMove={track}
              >
                Contratar show
              </a>
            </motion.div>
          </div>

          {nextEvent && (
            <motion.div
              style={{ x: cardX, y: cardY }}
              className={`flex justify-center [perspective:1000px] md:justify-end ${
                cursorActive ? "md:cursor-none" : ""
              }`}
            >
              <div
                ref={zoneRef}
                onMouseEnter={onZoneEnter}
                onMouseLeave={onZoneLeave}
                className="w-full max-w-sm"
              >
                <TiltCard
                  maxTilt={1}
                  glare={false}
                  className="group w-full overflow-hidden rounded-2xl border border-gold/30 bg-ink/85 p-6 backdrop-blur-xl gold-glow"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 z-0 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
                    <div className="absolute left-0 top-0 z-0 h-full w-1 rounded-full bg-gradient-to-b from-gold via-gold/40 to-transparent" />

                    <div className="relative pl-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                        Próximo show
                      </p>
                      <h3 className="mt-2 font-display text-3xl font-black text-white">
                        {nextEvent.city}
                        <span className="text-white/35">/{nextEvent.state}</span>
                      </h3>
                      <p className="mt-1 text-sm text-white/55">
                        {formatFullDate(nextEvent.date)}
                        {nextEvent.venue ? ` · ${nextEvent.venue}` : ""}
                      </p>

                      <div className="mt-5">
                        <Countdown
                          target={`${nextEvent.date}T${nextEvent.time || "21:00:00"}`}
                        />
                      </div>

                      {nextEvent.tickets_link && (
                        <a
                          href={nextEvent.tickets_link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-live mt-5 flex items-center justify-center gap-2 rounded-full bg-gold py-3 text-center text-sm font-semibold text-ink"
                          onMouseMove={track}
                        >
                          <ShoppingCart size={16} strokeWidth={2.25} />
                          Comprar ingressos
                        </a>
                      )}
                    </div>
                  </motion.div>
                </TiltCard>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <a
        href="#agenda"
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/40 transition hover:text-gold sm:bottom-5"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">Agenda</span>
        <div className="h-9 w-5 rounded-full border-2 border-current p-1">
          <div className="mx-auto h-2 w-1 animate-bounce rounded-full bg-gold" />
        </div>
      </a>
    </section>
  );
}

function track(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--my", `${e.clientY - rect.top}px`);
}
