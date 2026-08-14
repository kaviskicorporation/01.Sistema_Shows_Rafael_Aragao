"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Mic2,
  Sparkles,
} from "lucide-react";
import type { PublicEvent, SiteConfig } from "@/lib/types";
import { jumpToContactForm } from "@/lib/scroll";
import { tourYearsLabel } from "@/lib/tourYears";
import { dayOf, monthShort, parseDate } from "@/lib/format";
import AliveTitle from "./AliveTitle";
import { SITE_DEFAULTS } from "@/lib/siteDefaults";
import { resolveNavIcon } from "@/lib/navIcons";

const FALLBACK_ART = "/images/aragones.png";
const ease = [0.22, 1, 0.36, 1] as const;

function withYear(text: string | undefined, year: string, fallback: string) {
  const raw = (text || "").trim() || fallback;
  return raw.replaceAll("{year}", year).replaceAll("{ano}", year);
}

function splitArtistName(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { lead: "", main: title || "Rafael Aragão" };
  return { lead: parts[0], main: parts.slice(1).join(" ") };
}

function nextUpcoming(events: PublicEvent[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    [...events]
      .filter((e) => parseDate(e.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

export default function Hero({
  config,
  events = [],
}: {
  config: SiteConfig;
  nextEvent?: PublicEvent | null;
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
  const sx = useSpring(mx, { stiffness: 50, damping: 22 });
  const sy = useSpring(my, { stiffness: 50, damping: 22 });
  const artX = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const artY = useTransform(sy, [-0.5, 0.5], [12, -12]);

  const years = useMemo(
    () => tourYearsLabel(events.map((e) => e.date)),
    [events]
  );
  const nextShow = useMemo(() => nextUpcoming(events), [events]);
  const { lead, main } = splitArtistName(config.hero_title || "Rafael Aragão");
  const wordmark = (
    config.hero_wordmark || SITE_DEFAULTS.hero_wordmark || "Rei dos Peão"
  ).trim();
  const subtitleLead = (
    config.hero_subtitle_lead?.trim() ||
    SITE_DEFAULTS.hero_subtitle_lead ||
    "Espetáculo"
  ).trim();
  const subtitleLine = (
    config.hero_subtitle?.trim() ||
    SITE_DEFAULTS.hero_subtitle ||
    "O artista que lota teatros pelo Brasil"
  ).trim();
  const subtitleParts = useMemo(() => {
    // Compat: se o lead estiver vazio e o subtítulo antigo vier com "—", separa.
    if (!config.hero_subtitle_lead?.trim()) {
      const parts = subtitleLine
        .split(/[—–]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        return { brand: parts[0]!, line: parts.slice(1).join(" — ") };
      }
    }
    return { brand: subtitleLead, line: subtitleLine };
  }, [config.hero_subtitle_lead, subtitleLead, subtitleLine]);
  const badge = withYear(
    config.hero_badge,
    years,
    SITE_DEFAULTS.hero_badge || "Ao vivo · Turnê {year}"
  );
  const ctaPrimary =
    config.hero_cta_primary?.trim() ||
    SITE_DEFAULTS.hero_cta_primary ||
    "Ver agenda";
  const ctaSecondary =
    config.hero_cta_secondary?.trim() ||
    SITE_DEFAULTS.hero_cta_secondary ||
    "Contratar show";
  const CtaPrimaryIcon = resolveNavIcon(
    config.hero_cta_icon_primary,
    SITE_DEFAULTS.hero_cta_icon_primary || "calendar-days"
  );
  const CtaSecondaryIcon = resolveNavIcon(
    config.hero_cta_icon_secondary,
    SITE_DEFAULTS.hero_cta_icon_secondary || "handshake"
  );
  const nextLabel =
    config.hero_next_label?.trim() ||
    SITE_DEFAULTS.hero_next_label ||
    "Próximo show";
  const scrollLabel =
    config.hero_scroll_label?.trim() ||
    SITE_DEFAULTS.hero_scroll_label ||
    "Role";
  const [sheenOn, setSheenOn] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSheenOn(true), 1400);
    return () => window.clearTimeout(t);
  }, []);

  const highlights = useMemo(
    () =>
      [
        {
          Icon: Mic2,
          label: withYear(
            config.hero_tag_1,
            years,
            SITE_DEFAULTS.hero_tag_1 || "Humor de palco"
          ),
        },
        {
          Icon: MapPin,
          label: withYear(
            config.hero_tag_2,
            years,
            SITE_DEFAULTS.hero_tag_2 || "Turnê nacional"
          ),
        },
        {
          Icon: CalendarDays,
          label: withYear(
            config.hero_tag_3,
            years,
            SITE_DEFAULTS.hero_tag_3 || "Agenda {year}"
          ),
        },
        {
          Icon: Sparkles,
          label: withYear(
            config.hero_tag_4,
            years,
            SITE_DEFAULTS.hero_tag_4 || "Teatros lotados"
          ),
        },
      ].filter((item) => item.label.trim()),
    [
      years,
      config.hero_tag_1,
      config.hero_tag_2,
      config.hero_tag_3,
      config.hero_tag_4,
    ]
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
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink noise-bg lg:h-[100svh] lg:max-h-[100svh]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_42%,color-mix(in_srgb,var(--theme-primary)_16%,transparent),transparent_55%),radial-gradient(ellipse_at_78%_48%,color-mix(in_srgb,var(--theme-primary)_22%,transparent),transparent_46%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid-soft opacity-40" />
      <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-ink via-transparent to-ink lg:block" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[5.6rem] z-[1] hidden overflow-hidden lg:block"
        initial={{ opacity: 0, y: 28, scale: 1.04 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.15, delay: 0.08, ease }}
      >
        <p className="hero-wordmark whitespace-nowrap text-center text-[10.8vw] leading-none">
          {wordmark}
        </p>
      </motion.div>

      {heroImage && (
        <motion.div
          className="pointer-events-none absolute inset-y-0 right-[-4%] z-[2] hidden w-[58%] lg:block xl:right-[-2%] xl:w-[56%]"
          initial={{ opacity: 0, x: 80, scale: 1.08 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.15, delay: 0.18, ease }}
        >
          <motion.div className="relative h-full w-full" style={{ x: artX, y: artY }}>
            <div className="hero-stage-glow absolute bottom-[6%] left-1/2 h-[38%] w-[72%] rounded-[100%] bg-gold/28 blur-[90px]" />
            <div className="absolute right-[10%] top-[14%] h-28 w-28 border-r border-t border-gold/35" />
            <div className="absolute bottom-[16%] left-[8%] h-28 w-28 border-b border-l border-gold/25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={config.hero_title || "Rafael Aragão"}
              className="relative h-full w-full object-contain object-bottom drop-shadow-[0_40px_80px_rgba(0,0,0,0.55)]"
            />
          </motion.div>
        </motion.div>
      )}

      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] hidden w-[48%] bg-gradient-to-r from-ink via-ink/80 to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_34%)] lg:block xl:w-[44%]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] hidden h-40 bg-gradient-to-t from-ink via-ink/70 to-transparent lg:block" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-16 bg-gradient-to-b from-ink/80 to-transparent lg:h-20" />

      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease }}
        className="pointer-events-none absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 xl:flex"
      >
        <div className="flex items-center gap-3">
          <span className="h-16 w-px bg-gradient-to-b from-transparent via-gold/70 to-transparent" />
          <span className="origin-center -rotate-90 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.42em] text-gold/80">
            {badge}
          </span>
        </div>
      </motion.div>

      <div className="relative z-20 mx-auto flex w-full max-w-6xl shrink-0 flex-col px-5 pb-3 pt-[4.75rem] sm:px-8 lg:min-h-0 lg:flex-1 lg:justify-center lg:px-10 lg:pb-20 lg:pt-24">
        <div className="max-w-lg xl:max-w-[34rem]">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, delay: 0.12, ease }}
            className="inline-flex items-center gap-2.5 rounded-full border border-gold/35 bg-ink/50 px-3.5 py-1.5 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold/60" />
              <span className="relative h-2 w-2 rounded-full bg-gold" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
              {badge}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.12, ease }}
            className="mt-3 lg:mt-5"
          >
            {lead ? (
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.22, ease }}
                className="mb-1 font-display text-base font-semibold uppercase tracking-[0.34em] text-gold sm:text-xl"
              >
                {lead}
              </motion.p>
            ) : null}
            <AliveTitle
              as="h1"
              immediate
              className="font-display text-[2.85rem] font-black leading-[0.86] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[5.25rem]"
            >
              {main}
            </AliveTitle>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, delay: 0.48, ease }}
            className="mt-4 max-w-xl sm:mt-6"
          >
            {subtitleParts.brand ? (
              <>
                <span className="block font-display text-xl font-bold tracking-tight text-gold sm:text-2xl lg:text-[1.65rem]">
                  {subtitleParts.brand}
                </span>
                <span className="mt-2 block max-w-[28rem] text-[15px] font-medium leading-snug text-white/72 sm:mt-2.5 sm:text-lg sm:leading-snug">
                  {subtitleParts.line}
                </span>
              </>
            ) : (
              <span className="block max-w-[28rem] text-[15px] font-medium leading-snug text-white/72 sm:text-lg">
                {subtitleParts.line}
              </span>
            )}
          </motion.p>

          <div className="mt-4 flex w-full flex-row gap-2 sm:mt-8 sm:flex-wrap sm:items-center sm:gap-3">
            <motion.a
              href="#agenda"
              initial={{ opacity: 0, y: 28, x: -16 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.6, delay: 0.62, ease }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onMouseMove={(e) => {
                const el = e.currentTarget;
                const r = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                el.style.setProperty("--my", `${e.clientY - r.top}px`);
              }}
              className="btn-live group relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-gold px-3 py-3 text-[13px] font-bold leading-none text-ink shadow-[0_16px_40px_-12px_color-mix(in_srgb,var(--theme-primary)_75%,transparent)] sm:w-auto sm:flex-none sm:px-6 sm:py-3.5 sm:text-sm"
            >
              <CtaPrimaryIcon
                size={16}
                strokeWidth={2.25}
                className="relative z-10 shrink-0"
              />
              <span className="relative z-10">{ctaPrimary}</span>
              {sheenOn ? <span className="btn-sheen-line" aria-hidden /> : null}
            </motion.a>

            <motion.a
              href="#contato"
              onClick={jumpToContactForm}
              initial={{ opacity: 0, y: 28, x: 16 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.6, delay: 0.72, ease }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full border border-gold/45 bg-ink/55 px-3 py-3 text-[13px] font-semibold leading-none text-white backdrop-blur-md transition hover:border-gold hover:bg-gold/10 hover:text-gold sm:w-auto sm:flex-none sm:px-6 sm:py-3.5 sm:text-sm"
            >
              <CtaSecondaryIcon
                size={16}
                strokeWidth={2.25}
                className="relative z-10 shrink-0 text-gold transition group-hover:text-gold"
              />
              <span className="relative z-10">{ctaSecondary}</span>
              {sheenOn ? (
                <span className="btn-sheen-line is-ghost" aria-hidden />
              ) : null}
            </motion.a>
          </div>

          {nextShow && (
            <motion.a
              href="#agenda"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.86, ease }}
              className="group mt-3 flex max-w-sm items-stretch overflow-hidden rounded-2xl border border-gold/25 bg-ink/80 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)] backdrop-blur-md transition hover:border-gold/50 sm:mt-7"
            >
              <div className="flex w-[4.1rem] shrink-0 flex-col items-center justify-center bg-gold px-2 py-3 text-ink">
                <span className="font-display text-2xl font-black leading-none">
                  {dayOf(nextShow.date)}
                </span>
                <span className="mt-0.5 text-[10px] font-bold tracking-[0.18em]">
                  {monthShort(nextShow.date)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                    {nextLabel}
                  </p>
                  <p className="mt-0.5 truncate font-display text-[15px] font-bold text-white">
                    {nextShow.city}
                    {nextShow.state ? (
                      <span className="text-white/40"> / {nextShow.state}</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {nextShow.venue || "Local a confirmar"}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-gold/80 transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </motion.a>
          )}
        </div>
      </div>

      <div className="relative z-[5] flex min-h-0 flex-1 flex-col lg:hidden">
        <motion.div
          className="flex min-h-[2.25rem] flex-[0.85] flex-col items-center justify-center px-4"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease }}
        >
          <p className="hero-wordmark max-w-full text-center text-[clamp(1.2rem,7.8vw,2.6rem)] leading-[0.95]">
            {wordmark}
          </p>
          <span className="mt-2 h-px w-14 bg-gradient-to-r from-transparent via-gold/55 to-transparent" />
        </motion.div>

        {heroImage && (
          <motion.div
            className="relative flex min-h-[9.5rem] flex-[1.35] items-end justify-center overflow-hidden"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, delay: 0.28, ease }}
          >
            <div className="hero-stage-glow absolute bottom-[8%] left-1/2 h-[48%] w-[72%] rounded-[100%] bg-gold/25 blur-[70px]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt=""
              className="relative h-full w-auto object-contain object-bottom drop-shadow-[0_20px_36px_rgba(0,0,0,0.45)]"
            />
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.95, ease }}
        className="relative z-20 shrink-0 border-t border-gold/20 bg-ink/80 backdrop-blur-md lg:absolute lg:inset-x-0 lg:bottom-0"
      >
        <div className="overflow-hidden py-2.5">
          <div className="hero-marquee-track flex w-max items-center gap-8 pr-8">
            {[...highlights, ...highlights, ...highlights, ...highlights].map(
              ({ Icon, label }, i) => (
                <span
                  key={`${label}-${i}`}
                  className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55"
                >
                  <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={2.2} />
                  {label}
                  <span className="ml-5 h-1 w-1 rounded-full bg-gold/50" />
                </span>
              )
            )}
          </div>
        </div>
      </motion.div>

      <motion.a
        href="#agenda"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.55, ease }}
        className="absolute bottom-14 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/40 transition hover:text-gold lg:flex"
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.3em]">
          {scrollLabel}
        </span>
        <motion.div
          className="flex h-8 w-5 items-start justify-center rounded-full border border-current/80 p-1"
          animate={{ y: [0, 3, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="h-1.5 w-0.5 rounded-full bg-gold" />
        </motion.div>
      </motion.a>
    </section>
  );
}
