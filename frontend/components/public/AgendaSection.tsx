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
import SoftCursor, { type SoftCursorMode } from "./SoftCursor";
import { useSoftCursorZone } from "./useSoftCursorZone";
import SectionAura from "./SectionAura";
import TiltCard from "./TiltCard";
import { tourYearsLabel } from "@/lib/tourYears";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type AgendaView = "calendar" | "list";

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function AgendaSection({
  events,
  defaultView = "calendar",
}: {
  events: PublicEvent[];
  defaultView?: AgendaView;
}) {
  const [state, setState] = useState("todos");
  const [view, setView] = useState<AgendaView>(
    defaultView === "list" ? "list" : "calendar"
  );
  const [cityQuery, setCityQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectAck, setSelectAck] = useState(0);
  const detailPulse = useAnimationControls();
  const {
    zoneRef,
    active: cursorActive,
    mode: cursorMode,
    setMode: setCursorMode,
    onZoneEnter,
    onZoneLeave,
  } = useSoftCursorZone();

  useEffect(() => {
    setView(defaultView === "list" ? "list" : "calendar");
  }, [defaultView]);

  function setTip(mode: SoftCursorMode) {
    setCursorMode(mode);
  }

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

  const listGroups = useMemo(() => groupByMonth(listEvents), [listEvents]);

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
      className="relative overflow-hidden bg-ink-soft py-16 sm:py-20"
    >
      <SectionAura variant="rings" />
      <SoftCursor active={cursorActive} mode={cursorMode} />

      {/* Bleed glow from hero */}
      <div className="pointer-events-none absolute -top-32 left-1/2 z-[1] h-64 w-[80%] -translate-x-1/2 rounded-full bg-gold/8 blur-[100px]" />
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
              className="inline-flex self-end rounded-full border border-white/10 bg-ink/70 p-1"
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

        {view === "list" ? (
          <div className="mt-6">
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
                  className="w-full rounded-xl border border-white/10 bg-ink py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold/50"
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
                {listEvents.length} de {filtered.length} shows
              </p>
            </div>

            {listEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-ink/40 px-5 py-10 text-center text-sm text-white/45">
                Nenhum show encontrado
                {cityQuery.trim() ? ` para “${cityQuery.trim()}”` : ""}.
              </div>
            ) : (
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
                                    rel="noreferrer"
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
            )}
          </div>
        ) : null}

        {/* Calendar + detail */}
        <div
          ref={zoneRef}
          className={`mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] lg:items-start lg:gap-0 ${
            view !== "calendar" ? "hidden" : ""
          } ${cursorActive ? "md:cursor-none" : ""}`}
          onMouseEnter={onZoneEnter}
          onMouseLeave={onZoneLeave}
        >
          {/* Calendar panel — altura natural (não estica com o painel) */}
          <div className="h-fit self-start [perspective:1000px]">
          <TiltCard
            maxTilt={1}
            glare={false}
            onMouseEnter={() => setTip("idle")}
            className="relative h-auto overflow-hidden rounded-2xl border border-white/10 bg-ink lg:rounded-tr-none lg:border-r-0"
          >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {/* Month nav */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-6">
              <button
                disabled={monthIndex <= 0}
                onClick={() =>
                  monthIndex > 0 && setCursor(monthsWithShows[monthIndex - 1])
                }
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-gold hover:text-gold disabled:opacity-30"
              >
                ←
              </button>
              <div className="text-center">
                <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                  {cursor ? (
                    <>
                      <span className="text-gold">{MONTHS_PT[cursor.m]}</span>{" "}
                      {cursor.y}
                    </>
                  ) : (
                    "—"
                  )}
                </h3>
                <p className="text-[11px] uppercase tracking-widest text-white/35">
                  {monthIndex + 1}/{monthsWithShows.length || 1} meses com shows
                </p>
              </div>
              <button
                disabled={monthIndex < 0 || monthIndex >= monthsWithShows.length - 1}
                onClick={() =>
                  monthIndex < monthsWithShows.length - 1 &&
                  setCursor(monthsWithShows[monthIndex + 1])
                }
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/70 transition hover:border-gold hover:text-gold disabled:opacity-30"
              >
                →
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 px-2 pt-3 sm:gap-1.5 sm:px-4">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/35 sm:text-xs"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days — altura fixa idêntica em todos os meses */}
            <div className="cal-days-grid grid grid-cols-7 gap-1 p-2 pb-3 sm:gap-1.5 sm:p-4 sm:pb-4">
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
                    onMouseEnter={() => has && setTip("day")}
                    onMouseLeave={() => setTip("idle")}
                    data-active={active}
                    className={`cal-day-live group relative flex h-14 w-full flex-col items-center overflow-hidden rounded-lg pt-1 sm:h-16 sm:rounded-xl sm:pt-1.5 ${
                      !day.inMonth
                        ? "opacity-20"
                        : has
                          ? "border border-gold/30 bg-ink-card animate-pulse-gold"
                          : "border border-white/[0.04] bg-white/[0.02]"
                    } ${active ? "ring-2 ring-gold" : ""} ${
                      has ? "hover:-translate-y-0.5 hover:border-gold" : ""
                    } transition-all duration-200`}
                  >
                    <span
                      className={`relative z-10 text-[10px] font-semibold leading-none sm:text-xs ${
                        has ? "text-gold" : "text-white/30"
                      }`}
                    >
                      {day.date.getDate()}
                    </span>
                    {has && main && (
                      <>
                        <span className="relative z-10 mt-0.5 line-clamp-2 w-full px-0.5 text-center text-[7px] font-bold leading-[1.05] text-white sm:mt-0.5 sm:text-[9px] sm:leading-tight">
                          {main.city}
                        </span>
                        <span className="absolute bottom-0.5 left-1/2 z-10 h-1 w-1 -translate-x-1/2 rounded-full bg-gold sm:bottom-1" />
                        <span className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-gold/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Month strip of show days — densifies bottom */}
            {cursor && (
              <div className="cal-month-chips thin-scroll flex gap-2 overflow-x-auto overscroll-x-contain border-t border-white/10 px-3 py-3 pb-2.5 sm:px-4">
                {calendarDays
                  .filter((d) => d.inMonth && d.events.length > 0)
                  .map((d) => (
                    <button
                      key={`chip-${d.key}`}
                      onClick={() => pickShow(d.key)}
                      onMouseEnter={() => setTip("day")}
                      onMouseLeave={() => setTip("idle")}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        selectedKey === d.key
                          ? "bg-gold text-ink"
                          : "bg-white/5 text-white/70 hover:bg-gold/20 hover:text-gold"
                      }`}
                    >
                      {d.date.getDate()} · {d.events[0].city}
                    </button>
                  ))}
              </div>
            )}
          </motion.div>
          </TiltCard>
          </div>

          {/* Detail panel — denso, com tilt */}
          <motion.div
            animate={detailPulse}
            className="h-fit self-start [perspective:1000px] lg:-ml-px"
          >
            <TiltCard
              maxTilt={1}
              glare={false}
              onMouseEnter={() => setTip("view")}
              onMouseLeave={() => setTip("idle")}
              className="relative h-auto overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-b from-ink-card to-ink lg:rounded-tl-none"
            >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/15 blur-[70px]" />

            {/* Flash ao re-clicar o mesmo (ou qualquer) show — confirma a seleção */}
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

            <div className="relative z-10 flex h-full flex-col gap-4 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
                Show selecionado
              </p>

              <AnimatePresence mode="wait">
                {selectedEvents.length > 0 ? (
                  <motion.div
                    key={selectedKey}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
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
                            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gold/15 text-gold">
                              <span className="font-display text-2xl font-black leading-none">
                                {parseDate(ev.date).getDate()}
                              </span>
                              <span className="text-[10px] font-bold tracking-wider">
                                {MONTHS_PT[parseDate(ev.date).getMonth()]
                                  .slice(0, 3)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-display text-2xl font-black leading-tight text-white">
                                {ev.city}
                                <span className="text-white/35"> / {ev.state}</span>
                              </h4>
                              <p className="mt-0.5 text-sm text-white/55">
                                {formatFullDate(ev.date)}
                                {ev.time ? ` · ${formatTime(ev.time)}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3.5">
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

                          {/* Preenche o painel com vida — countdown */}
                          <div className="rounded-xl border border-gold/20 bg-gold/5 p-3.5">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                              Contagem regressiva
                            </p>
                            <Countdown
                              target={`${ev.date}T${ev.time || "21:00:00"}`}
                            />
                          </div>

                          {/* Outros shows do mês — densifica o espaço */}
                          {monthShows.length > 0 && (
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                                Também neste mês
                              </p>
                              <ul className="space-y-1.5">
                                {monthShows.slice(0, 4).map((other) => (
                                  <li key={other.id}>
                                    <button
                                      onClick={() => pickShow(other.date)}
                                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-gold/10"
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

                          <div className="mt-auto flex flex-wrap gap-2 pt-1">
                            <Link
                              href={`/shows/${ev.slug}`}
                              className="btn-live rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-gold hover:text-gold"
                              onMouseMove={trackBtn}
                              onMouseEnter={() => setTip("view")}
                            >
                              Ver detalhes
                            </Link>
                            {ev.tickets_link && (
                              <a
                                href={ev.tickets_link}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-live inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink"
                                onMouseMove={trackBtn}
                                onMouseEnter={() => setTip("cta")}
                              >
                                <ShoppingCart size={16} strokeWidth={2.25} />
                                Comprar ingressos
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-1 flex-col justify-center gap-3 py-6 text-center"
                  >
                    <div className="mx-auto h-10 w-10 rounded-full border border-dashed border-gold/40" />
                    <p className="text-sm text-white/45">
                      Selecione um dia iluminado no calendário.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </motion.div>
            </TiltCard>
          </motion.div>
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
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-white/35">{label}</span>
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
