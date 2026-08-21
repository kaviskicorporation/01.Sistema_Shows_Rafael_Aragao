"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PublicEvent } from "@/lib/types";
import { dayOf, monthShort, formatTime } from "@/lib/format";
import TiltCard from "./TiltCard";

export default function EventCard({ event }: { event: PublicEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="[perspective:900px]"
    >
      <TiltCard
        maxTilt={3}
        className="group flex items-center gap-5 overflow-hidden rounded-xl border border-white/10 bg-ink-card p-5 transition-colors hover:border-gold/50"
      >
        <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-gold/10 py-2 text-gold">
          <span className="font-display text-2xl font-black leading-none">
            {dayOf(event.date)}
          </span>
          <span className="text-xs font-semibold tracking-widest">
            {monthShort(event.date)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold text-white">
            {event.city}
            <span className="text-white/40"> / {event.state}</span>
          </h3>
          <p className="truncate text-sm text-white/60">
            {event.venue || "Local a confirmar"}
            {event.time ? ` • ${formatTime(event.time)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/shows/${event.slug}`}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-gold hover:text-gold"
          >
            Detalhes
          </Link>
          {event.tickets_link && (
            <a
              href={event.tickets_link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-ink transition-transform hover:scale-105"
            >
              Ingressos
            </a>
          )}
        </div>
      </TiltCard>
    </motion.div>
  );
}
