"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, MapPin, ShoppingCart } from "lucide-react";
import type { PublicEvent, SiteConfig } from "@/lib/types";
import { formatFullDate, formatTime } from "@/lib/format";
import {
  PAGE_SOFT_TEXTURE,
  resolveCardBackground,
} from "@/lib/eventCardBg";
import Countdown from "@/components/public/Countdown";
import Gallery from "@/components/public/Gallery";
import AliveTitle from "@/components/public/AliveTitle";

const ease = [0.22, 1, 0.36, 1] as const;

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 28, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.65, delay, ease },
});

export default function ShowDetailView({
  event,
  brandTitle,
}: {
  event: PublicEvent;
  brandTitle: string;
  config?: SiteConfig | null;
}) {
  const hasBanner = Boolean(event.banner_display?.trim());
  const cardBg = resolveCardBackground({
    preset: event.card_bg_preset,
    color: event.card_bg_color,
    imageUrl: event.card_bg_image_display,
  });
  const hasGallery = event.gallery.length > 0;

  return (
    <div className="relative flex min-h-[100svh] flex-col overflow-x-hidden pt-[4.75rem] sm:pt-[5.25rem]">
      <div
        className="pointer-events-none absolute inset-0"
        style={PAGE_SOFT_TEXTURE}
      />
      {hasBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[55svh] opacity-35">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.banner_display}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/45 via-ink/70 to-ink" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,color-mix(in_srgb,var(--theme-primary)_18%,transparent),transparent_52%),radial-gradient(ellipse_at_88%_55%,color-mix(in_srgb,var(--theme-primary)_10%,transparent),transparent_48%)]" />

      {/* Área do card: cabe inteira na viewport (abaixo do header) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-3 pb-4 sm:px-5 sm:pb-5 lg:px-8 lg:pb-6">
        <motion.div {...rise(0.04)} className="mb-2.5 shrink-0 sm:mb-3">
          <Link
            href="/#agenda"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/70 px-3.5 py-2 text-xs font-semibold text-white/70 backdrop-blur-md transition hover:border-gold/45 hover:text-gold sm:text-sm"
          >
            <ArrowLeft
              size={14}
              strokeWidth={2.4}
              className="transition group-hover:-translate-x-0.5"
            />
            <span>Voltar à agenda</span>
            <CalendarDays size={13} className="opacity-55" />
          </Link>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 36, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.08, ease }}
          className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-white/12 shadow-[0_32px_90px_-40px_rgba(0,0,0,0.9)] sm:rounded-3xl"
          style={{
            ...cardBg.style,
            maxHeight: "calc(100svh - 6.75rem)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/88 via-ink/55 to-ink/25 sm:via-ink/48 sm:to-ink/15" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-ink/30" />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-5 sm:p-7 md:p-8 lg:p-10 xl:p-12">
            <div
              className={`flex min-h-full flex-col justify-center gap-6 lg:gap-8 ${
                hasGallery
                  ? "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-10 xl:gap-14"
                  : ""
              }`}
            >
              <div className="min-w-0">
                <motion.span
                  {...rise(0.16)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold backdrop-blur-sm sm:text-xs"
                >
                  <MapPin size={13} />
                  {event.city} / {event.state}
                </motion.span>

                <motion.div {...rise(0.22)} className="mt-4 sm:mt-5">
                  <AliveTitle
                    as="h1"
                    immediate
                    className="font-display text-[clamp(2rem,5.5vw,4.75rem)] font-black leading-[0.92] tracking-tight text-white"
                  >
                    {event.name}
                  </AliveTitle>
                </motion.div>

                <motion.p
                  {...rise(0.3)}
                  className="mt-3 text-[clamp(0.9rem,1.6vw,1.2rem)] text-white/75 sm:mt-4"
                >
                  {formatFullDate(event.date)}
                  {event.time ? ` · ${formatTime(event.time)}` : ""}
                  {event.venue ? ` · ${event.venue}` : ""}
                </motion.p>

                <motion.h2
                  {...rise(0.36)}
                  className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-gold sm:mt-8 sm:text-[11px]"
                >
                  Contagem regressiva
                </motion.h2>
                <motion.div {...rise(0.4)} className="mt-3">
                  <Countdown
                    size="lg"
                    target={`${event.date}T${event.time || "21:00:00"}`}
                  />
                </motion.div>

                {event.description && (
                  <motion.p
                    {...rise(0.46)}
                    className="mt-5 max-w-2xl whitespace-pre-line text-[clamp(0.9rem,1.35vw,1.05rem)] leading-relaxed text-white/70 sm:mt-6"
                  >
                    {event.description}
                  </motion.p>
                )}

                <motion.div
                  {...rise(0.52)}
                  className="mt-6 flex flex-wrap gap-3 sm:mt-8"
                >
                  {event.tickets_link && (
                    <motion.a
                      href={event.tickets_link}
                      target="_blank"
                      rel="noreferrer"
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-live inline-flex items-center gap-2.5 rounded-full bg-gold px-6 py-3 text-[15px] font-bold text-ink sm:px-8 sm:py-3.5 sm:text-base"
                      onMouseMove={(e) => {
                        const el = e.currentTarget;
                        const r = el.getBoundingClientRect();
                        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
                        el.style.setProperty("--my", `${e.clientY - r.top}px`);
                      }}
                    >
                      <ShoppingCart size={18} strokeWidth={2.25} />
                      Comprar ingressos
                    </motion.a>
                  )}
                  {event.external_link && (
                    <a
                      href={event.external_link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 bg-black/25 px-6 py-3 text-[15px] font-semibold text-white/90 backdrop-blur transition hover:border-gold hover:text-gold sm:px-7 sm:py-3.5 sm:text-base"
                    >
                      Mais informações
                    </a>
                  )}
                </motion.div>
              </div>

              {hasGallery && (
                <motion.div {...rise(0.42)} className="min-w-0 lg:pl-2">
                  <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-gold sm:text-[11px]">
                    Galeria
                  </h2>
                  <Gallery images={event.gallery} />
                </motion.div>
              )}
            </div>
          </div>
        </motion.article>

        <motion.p
          {...rise(0.58)}
          className="mt-2.5 shrink-0 text-center text-[11px] text-white/30 sm:mt-3"
        >
          {brandTitle} · Show ao vivo
        </motion.p>
      </div>
    </div>
  );
}
