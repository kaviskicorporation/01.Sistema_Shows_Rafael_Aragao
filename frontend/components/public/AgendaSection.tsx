"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
} from "framer-motion";
import { CalendarDays, Clock, List, MapPin, Search, ShoppingCart, Ticket, X } from "lucide-react";
import type { PublicEvent } from "@/lib/types";
import {
  MONTHS_PT,
  formatFullDate,
  formatTime,
  groupByMonth,
  monthShort,
  parseDate,
} from "@/lib/format";
import AliveTitle from "./AliveTitle";
import Countdown from "./Countdown";
import SectionAura from "./SectionAura";
import { tourYearsLabel } from "@/lib/tourYears";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type AgendaView = "calendar" | "list";

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AgendaSection({
  events,
  defaultView = "calendar",
  listPageSize = 20,
}: {
  events: PublicEvent[];
  defaultView?: AgendaView;
  listPageSize?: number;
}) {
  const pageSize = Math.max(1, Math.min(200, Number(listPageSize) || 20));
  const [state, setState] = useState("todos");
  const [view, setView] = useState<AgendaView>(
    defaultView === "list" ? "list" : "calendar"
  );
  const [cityQuery, setCityQuery] = useState("");
  const [listVisible, setListVisible] = useState(pageSize);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectAck, setSelectAck] = useState(0);
  const detailPulse = useAnimationControls();

  useEffect(() => {
    setView(defaultView === "list" ? "list" : "calendar");
  }, [defaultView]);

  useEffect(() => {
    setListVisible(pageSize);
  }, [pageSize, state, cityQuery]);

  /** Seleciona um dia e dá feedback no card — inclusive se já estiver ativo. */
  function pickShow(key: string) {
    setSelectedKey(key);
    setSelectAck((n) => n + 1);
    void detailPulse.start({
      scale: [1, 1.018, 1],
      transition: { duration: 0.45, ease: "easeOut" },
    });
  }

  const states = useMemo(
    () => Array.from(new Set(events.map((e) => e.state))).sort(),
    [events]
  );

  const filtered = useMemo(
    () =>
      events.filter((e) => state === "todos" || e.state === state),
    [events, state]
  );

  const listEvents = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    return [...filtered]
      .filter((e) => {
        if (!q) return true;
        return (
          e.city.toLowerCase().includes(q) ||
          e.state.toLowerCase().includes(q) ||
          (e.venue || "").toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return (a.time || "").localeCompare(b.time || "");
      });
  }, [filtered, cityQuery]);

  const visibleListEvents = useMemo(
    () => listEvents.slice(0, listVisible),
    [listEvents, listVisible]
  );

  const listGroups = useMemo(
    () => groupByMonth(visibleListEvents),
    [visibleListEvents]
  );
  const hasMoreList = listVisible < listEvents.length;

  const byDate = useMemo(() => {
    const map = new Map<string, PublicEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [filtered]);

  const monthsWithShows = useMemo(() => {
    const keys = new Set<string>();
    for (const e of filtered) {
      const d = parseDate(e.date);
      keys.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return Array.from(keys)
      .map((k) => {
        const [y, m] = k.split("-").map(Number);
        return { y, m };
      })
      .sort((a, b) => a.y - b.y || a.m - b.m);
  }, [filtered]);

  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    if (monthsWithShows.length === 0) {
      setCursor(null);
      return;
    }
    setCursor((prev) => {
      if (
        prev &&
        monthsWithShows.some((x) => x.y === prev.y && x.m === prev.m)
      ) {
        return prev;
      }
      return monthsWithShows[0];
    });
  }, [monthsWithShows]);

  const calendarDays = useMemo(() => {
    if (!cursor) return [];
    const first = new Date(cursor.y, cursor.m, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday start
    const start = new Date(cursor.y, cursor.m, 1 - startOffset);
    const days: {
      date: Date;
      key: string;
      inMonth: boolean;
      events: PublicEvent[];
    }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
      days.push({
        date: d,
        key,
        inMonth: d.getMonth() === cursor.m,
        events: byDate.get(key) || [],
      });
    }
    // Remove semanas finais só com dias fora do mês → mesma densidade em todos os meses
    let weeks = 6;
    while (weeks > 4) {
      const slice = days.slice((weeks - 1) * 7, weeks * 7);
      if (slice.some((d) => d.inMonth)) break;
      weeks -= 1;
    }
    return days.slice(0, weeks * 7);
  }, [cursor, byDate]);

  const tourYears = useMemo(
    () => tourYearsLabel(filtered.map((e) => e.date)),
    [filtered]
  );

  const monthIndex = cursor
    ? monthsWithShows.findIndex((x) => x.y === cursor.y && x.m === cursor.m)
    : -1;

  const selectedEvents = selectedKey ? byDate.get(selectedKey) || [] : [];

  // Auto-select first show day of current month when month changes
  useEffect(() => {
    if (!cursor) return;
    const firstShow = calendarDays.find((d) => d.inMonth && d.events.length > 0);
    if (firstShow) setSelectedKey(firstShow.key);
    else setSelectedKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor?.y, cursor?.m, state]);

  const showCount = filtered.length;

  return (
    <section
      id="agenda"
      className="relative overflow-hidden bg-ink py-16 noise-bg sm:py-20"
    >
      <div className="bg-grid-soft pointer-events-none absolute inset-0 z-0 opacity-55" aria-hidden />
      <SectionAura variant="dots" />

      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 18% 12%, color-mix(in srgb, var(--theme-primary) 16%, transparent), transparent 48%),
            radial-gradient(ellipse at 88% 70%, color-mix(in srgb, var(--theme-primary) 10%, transparent), transparent 52%),
            radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.03), transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 28px, color-mix(in srgb, var(--theme-primary) 5%, transparent) 28px, color-mix(in srgb, var(--theme-primary) 5%, transparent) 29px)",
          maskImage:
            "linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -left-24 top-24 z-[1] h-64 w-64 rounded-full bg-gold/15 blur-[100px]"
        animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-20 z-[1] h-72 w-72 rounded-full bg-gold/10 blur-[110px]"
        animate={{ opacity: [0.2, 0.38, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div className="section-beam -top-10 z-[1]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-5">
        {/* Header — dense */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <motion.span
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gold"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Turnê {tourYears} · {showCount} shows
            </motion.span>
            <AliveTitle className="mt-3 font-display text-4xl font-black leading-[0.95] text-white sm:text-5xl lg:text-6xl">
              Agenda de Shows
            </AliveTitle>
            <p className="mt-3 text-sm leading-snug text-white/55 sm:text-[15px]">
              {view === "calendar"
                ? "Clique em um dia iluminado para ver cidade, horário e ingressos."
                : "Lista compacta dos shows — busque a cidade e filtre por estado."}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            {/* View toggle — canto direito */}
            <div
              role="group"
              aria-label="Formato da agenda"
              className="inline-flex self-end rounded-full border border-white/10 bg-ink/70 p-1 backdrop-blur-md"
            >
              <ViewToggleBtn
                active={view === "calendar"}
                onClick={() => setView("calendar")}
                icon={CalendarDays}
                label="Calendário"
              />
              <ViewToggleBtn
                active={view === "list"}
                onClick={() => setView("list")}
                icon={List}
                label="Lista"
              />
            </div>

            {/* State chips */}
            <div className="flex max-w-xl flex-wrap gap-2 lg:justify-end">
              <Chip active={state === "todos"} onClick={() => setState("todos")}>
                Todos
              </Chip>
              {states.map((s) => (
                <Chip
                  key={s}
                  active={state === s}
                  onClick={() => setState(s)}
                >
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Palco texturizado do calendário / lista */}
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-ink/45 p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.75)] backdrop-blur-sm sm:mt-7 sm:p-4 md:p-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            aria-hidden
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--theme-primary) 14%, transparent), transparent 55%),
                radial-gradient(ellipse at 100% 45%, rgba(255,255,255,0.035), transparent 45%),
                linear-gradient(165deg, rgba(255,255,255,0.035), transparent 42%)
              `,
            }}
          />
          <div className="bg-grid-soft pointer-events-none absolute inset-0 opacity-35" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            aria-hidden
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px)",
            }}
          />
          <div className="relative z-[1]">
        {view === "list" ? (
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block min-w-0 flex-1 sm:max-w-sm">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                />
                <input
                  type="search"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Buscar cidade, teatro ou show…"
                  className="w-full rounded-xl border border-white/10 bg-ink/80 py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold/50"
                />
                {cityQuery && (
                  <button
                    type="button"
                    onClick={() => setCityQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
                    aria-label="Limpar busca"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <p className="shrink-0 text-xs text-white/40 sm:text-right">
                Mostrando {Math.min(listVisible, listEvents.length)} de{" "}
                {listEvents.length} shows
              </p>
            </div>

            {listEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-ink/40 px-5 py-10 text-center text-sm text-white/45">
                Nenhum show encontrado
                {cityQuery.trim() ? ` para “${cityQuery.trim()}”` : ""}.
              </div>
            ) : (
              <>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-ink">
                {listGroups.map((group) => (
                  <div key={group.key}>
                    <div className="sticky top-0 z-[1] border-b border-white/10 bg-ink-card/95 px-3 py-1.5 backdrop-blur-sm sm:px-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                        {group.label}
                      </p>
                    </div>
                    <ul className="divide-y divide-white/[0.06]">
                      {group.items.map((ev) => {
                        const d = parseDate(ev.date);
                        return (
                          <li key={ev.id}>
                            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 transition hover:bg-white/[0.03] sm:gap-x-4 sm:px-4 sm:py-2">
                              <div className="flex items-baseline gap-1.5 tabular-nums">
                                <span className="font-display text-lg font-black leading-none text-gold sm:text-xl">
                                  {String(d.getDate()).padStart(2, "0")}
                                </span>
                                <span className="text-[10px] font-bold tracking-wider text-white/40">
                                  {monthShort(ev.date)}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <h3 className="truncate font-display text-[15px] font-bold leading-tight text-white sm:text-base">
                                    {ev.city}
                                    <span className="font-semibold text-white/35">
                                      {" "}
                                      / {ev.state}
                                    </span>
                                  </h3>
                                  {ev.time && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
                                      <Clock size={11} className="text-gold/70" />
                                      {formatTime(ev.time)}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-white/45">
                                  <MapPin
                                    size={11}
                                    className="shrink-0 text-white/25"
                                  />
                                  <span className="truncate">
                                    {ev.venue || "Local a confirmar"}
                                    <span className="text-white/25"> · </span>
                                    {ev.name}
                                  </span>
                                </p>
                              </div>

                              <div className="col-span-3 flex items-center justify-end gap-1.5 sm:col-span-1 sm:col-auto">
                                <Link
                                  href={`/shows/${ev.slug}`}
                                  className="rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:border-gold/50 hover:text-gold"
                                >
                                  Detalhes
                                </Link>
                                {ev.tickets_link ? (
                                  <a
                                    href={ev.tickets_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1.5 text-[11px] font-bold text-ink transition hover:brightness-110"
                                  >
                                    <Ticket size={12} />
                                    Ingressos
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {hasMoreList && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setListVisible((n) =>
                        Math.min(n + pageSize, listEvents.length)
                      )
                    }
                    className="rounded-full border border-gold/40 bg-gold/10 px-6 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold hover:text-ink"
                  >
                    Ver mais{" "}
                    {Math.min(pageSize, listEvents.length - listVisible)} shows
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        ) : null}

        {/* Calendar + detail — largura total, sem faixas vazias */}
        <div
          className={`mt-0 grid w-full grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)] lg:gap-5 ${
            view !== "calendar" ? "hidden" : ""
          }`}
        >
          {/* Calendar panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="relative min-w-0 w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/95 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.75)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              aria-hidden
              style={{
                backgroundImage:
                  "radial-gradient(ellipse at 12% 0%, color-mix(in srgb, var(--theme-primary) 18%, transparent), transparent 55%)",
              }}
            />

            {/* Month nav */}
            <div className="relative z-10 flex items-center gap-3 border-b border-white/10 px-3 py-3.5 sm:px-4 sm:py-4">
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={monthIndex <= 0}
                onClick={() =>
                  monthIndex > 0 && setCursor(monthsWithShows[monthIndex - 1])
                }
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-base text-white/75 transition hover:border-gold hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              >
                ←
              </button>
              <div className="min-w-0 flex-1 text-center">
                <h3 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {cursor ? (
                    <>
                      <span className="text-gold">{MONTHS_PT[cursor.m]}</span>{" "}
                      {cursor.y}
                    </>
                  ) : (
                    "—"
                  )}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
                  {monthIndex + 1}/{monthsWithShows.length || 1} meses com shows
                </p>
              </div>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={
                  monthIndex < 0 || monthIndex >= monthsWithShows.length - 1
                }
                onClick={() =>
                  monthIndex < monthsWithShows.length - 1 &&
                  setCursor(monthsWithShows[monthIndex + 1])
                }
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-base text-white/75 transition hover:border-gold hover:bg-gold/10 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
              >
                →
              </button>
            </div>

            {/* Weekdays */}
            <div className="relative z-10 grid grid-cols-7 gap-1 px-2.5 pt-3 sm:gap-1.5 sm:px-4 sm:pt-4">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 sm:text-[11px]"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days — ocupa 100% da largura do painel */}
            <div className="cal-days-grid relative z-10 grid w-full grid-cols-7 gap-1 px-2.5 pb-2.5 pt-1.5 sm:gap-1.5 sm:px-4 sm:pb-3">
              {calendarDays.map((day) => {
                const has = day.events.length > 0;
                const active = selectedKey === day.key;
                const main = day.events[0];

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={!has}
                    onClick={() => has && pickShow(day.key)}
                    data-active={active}
                    className={`cal-day-live group relative flex w-full flex-col items-center justify-start overflow-hidden rounded-lg px-0.5 pt-1 sm:rounded-xl sm:pt-1.5 ${
                      !day.inMonth
                        ? "pointer-events-none opacity-[0.18]"
                        : has
                          ? "cursor-pointer border border-gold/35 bg-ink-card animate-pulse-gold"
                          : "cursor-default border border-white/[0.05] bg-white/[0.025]"
                    } ${
                      active ? "z-[1] ring-2 ring-gold shadow-[0_0_28px_-8px_rgba(212,175,55,0.55)]" : ""
                    } ${
                      has
                        ? "hover:-translate-y-0.5 hover:border-gold hover:bg-gold/[0.08]"
                        : ""
                    } transition-all duration-200`}
                  >
                    <span
                      className={`relative z-10 text-[11px] font-bold leading-none sm:text-sm ${
                        has ? "text-gold" : "text-white/40"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {has && main && (
                      <>
                        <span className="relative z-10 mt-1 line-clamp-2 w-full px-0.5 text-center text-[8px] font-semibold leading-[1.15] text-white/90 sm:mt-1.5 sm:text-[10px] sm:leading-tight">
                          {main.city}
                        </span>
                        {day.events.length > 1 && (
                          <span className="relative z-10 mt-0.5 text-[8px] font-bold text-gold/80">
                            +{day.events.length - 1}
                          </span>
                        )}
                        <span className="absolute bottom-1 left-1/2 z-10 h-1 w-1 -translate-x-1/2 rounded-full bg-gold sm:bottom-1.5" />
                        <span className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-gold/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Atalhos do mês — colados no grid */}
            {cursor && (
              <div className="relative z-10 border-t border-white/10 bg-black/20 px-2.5 py-2.5 sm:px-4 sm:py-3">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Shows neste mês
                </p>
                <div className="cal-month-chips thin-scroll flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5">
                  {calendarDays
                    .filter((d) => d.inMonth && d.events.length > 0)
                    .map((d) => (
                      <button
                        key={`chip-${d.key}`}
                        type="button"
                        onClick={() => pickShow(d.key)}
                        className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium transition sm:text-xs ${
                          selectedKey === d.key
                            ? "bg-gold text-ink shadow-[0_0_18px_-4px_rgba(212,175,55,0.55)]"
                            : "bg-white/[0.06] text-white/75 hover:bg-gold/20 hover:text-gold"
                        }`}
                      >
                        {d.date.getDate()} · {d.events[0].city}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Detail panel */}
          <motion.div
            animate={detailPulse}
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="relative h-fit min-w-0 w-full overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-ink-card to-ink shadow-[0_20px_50px_-28px_rgba(0,0,0,0.65)] ring-1 ring-gold/15 lg:sticky lg:top-24"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-[70px]"
              aria-hidden
            />

            <AnimatePresence>
              {selectAck > 0 && (
                <motion.div
                  key={selectAck}
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-gold/25 ring-2 ring-inset ring-gold"
                  aria-hidden
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex h-full flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">
                  Show selecionado
                </p>
                {selectedEvents.length > 0 && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/40">
                    {selectedEvents.length} neste dia
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {selectedEvents.length > 0 ? (
                  <motion.div
                    key={selectedKey}
                    initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-1 flex-col gap-4"
                  >
                    {selectedEvents.map((ev) => {
                      const monthShows = calendarDays
                        .filter((d) => d.inMonth && d.events.length > 0)
                        .flatMap((d) => d.events)
                        .filter((e) => e.id !== ev.id);

                      return (
                        <div key={ev.id} className="flex flex-1 flex-col gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-gold/30 bg-gold/12 text-gold">
                              <span className="font-display text-2xl font-black leading-none">
                                {parseDate(ev.date).getDate()}
                              </span>
                              <span className="text-[9px] font-bold tracking-wider">
                                {MONTHS_PT[parseDate(ev.date).getMonth()]
                                  .slice(0, 3)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <h4 className="font-display text-lg font-black leading-tight text-white sm:text-xl">
                                {ev.city}
                                <span className="text-white/35">
                                  {" "}
                                  / {ev.state}
                                </span>
                              </h4>
                              <p className="mt-0.5 text-sm text-white/50">
                                {formatFullDate(ev.date)}
                                {ev.time ? ` · ${formatTime(ev.time)}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-0 overflow-hidden rounded-xl border border-white/10 bg-black/25">
                            <Row label="Espetáculo" value={ev.name} />
                            <Row
                              label="Local"
                              value={ev.venue || "A confirmar"}
                            />
                            <Row
                              label="Horário"
                              value={formatTime(ev.time) || "—"}
                            />
                          </div>

                          {ev.description && (
                            <p className="text-sm leading-relaxed text-white/50">
                              {ev.description}
                            </p>
                          )}

                          <div className="rounded-xl border border-gold/20 bg-gold/[0.06] p-4">
                            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                              Contagem regressiva
                            </p>
                            <Countdown
                              target={`${ev.date}T${ev.time || "21:00:00"}`}
                            />
                          </div>

                          <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
                            <Link
                              href={`/shows/${ev.slug}`}
                              className="cursor-pointer rounded-full border border-white/20 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-gold/50 hover:text-gold"
                              onMouseMove={trackBtn}
                            >
                              Ver detalhes
                            </Link>
                            {ev.tickets_link ? (
                              <a
                                href={ev.tickets_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-110"
                                onMouseMove={trackBtn}
                              >
                                <ShoppingCart size={16} strokeWidth={2.25} />
                                Comprar ingressos
                              </a>
                            ) : null}
                          </div>

                          {monthShows.length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                                Também neste mês
                              </p>
                              <ul className="space-y-1">
                                {monthShows.slice(0, 5).map((other) => (
                                  <li key={other.id}>
                                    <button
                                      type="button"
                                      onClick={() => pickShow(other.date)}
                                      className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-gold/10"
                                    >
                                      <span className="font-medium text-white/80">
                                        <span className="text-gold">
                                          {parseDate(other.date).getDate()}
                                        </span>{" "}
                                        {other.city}/{other.state}
                                      </span>
                                      <span className="text-xs text-white/35">
                                        {formatTime(other.time) || "—"}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-gold/40 bg-gold/[0.06]">
                      <CalendarDays
                        size={20}
                        className="text-gold/70"
                        aria-hidden
                      />
                    </div>
                    <p className="max-w-[16rem] text-sm leading-relaxed text-white/45">
                      Clique em um dia iluminado no calendário para ver cidade,
                      horário e ingressos.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
          </div>
        </div>

        {/* Bottom density: next cities ticker */}
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-ink/80 py-3">
          <div className="absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent" />
          <div className="absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent" />
          <motion.div
            className="flex gap-8 whitespace-nowrap px-8"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, ease: "linear", repeat: Infinity }}
          >
            {[...filtered, ...filtered].map((e, i) => (
              <button
                key={`${e.id}-${i}`}
                onClick={() => {
                  const d = parseDate(e.date);
                  setView("calendar");
                  setCursor({ y: d.getFullYear(), m: d.getMonth() });
                  pickShow(e.date);
                }}
                className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-gold"
              >
                <span className="font-semibold text-gold">
                  {parseDate(e.date).getDate()}/
                  {parseDate(e.date).getMonth() + 1}
                </span>
                {e.city}/{e.state}
                <span className="text-white/20">◆</span>
              </button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bridge into next section */}
      <div className="section-beam bottom-0 translate-y-1/2" />
    </section>
  );
}

function ViewToggleBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
        active
          ? "bg-gold text-ink shadow-[0_0_20px_-6px_color-mix(in_srgb,var(--theme-primary)_70%,transparent)]"
          : "text-white/55 hover:text-gold"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
        active
          ? "bg-gold text-ink shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--theme-primary)_70%,transparent)]"
          : "border border-white/10 bg-ink/60 text-white/60 hover:border-gold/40 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/8 px-3.5 py-2.5 text-sm last:border-b-0">
      <span className="text-white/40">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}

function trackBtn(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  el.style.setProperty("--my", `${e.clientY - rect.top}px`);
}
