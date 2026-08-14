"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarDays,
  Users,
  Handshake,
  TrendingUp,
  Download,
  Trash2,
  Sparkles,
  MapPin,
  Activity,
  ArrowRight,
  FileSpreadsheet,
  Kanban,
  Clock,
  Ticket,
  Flame,
  Mail,
  Target,
  Layers,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminFade from "@/components/admin/AdminFade";
import ChartTooltip from "@/components/admin/ChartTooltip";
import { api, resultsOf } from "@/lib/api";
import type { AuditLog, DashboardData, DashboardNextEvent } from "@/lib/types";
import { formatDateTime, formatFullDate, formatTime, parseDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { DEFAULT_PRIMARY, THEME_EVENT } from "@/lib/theme";
import { motion } from "framer-motion";

function greetingForHour(h: number) {
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function daysUntil(dateStr: string) {
  const d = parseDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const idx = Number(m) - 1;
  return `${names[idx] || m}/${String(y).slice(2)}`;
}

export default function AdminDashboard() {
  const { can, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canAudit = can("audit");
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    function syncPrimary() {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue("--theme-primary")
        .trim();
      if (v) setPrimary(v);
    }
    syncPrimary();
    window.addEventListener(THEME_EVENT, syncPrimary);
    return () => window.removeEventListener(THEME_EVENT, syncPrimary);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const reload = useCallback(async () => {
    try {
      const d = await api.get<DashboardData>("/dashboard/");
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
    if (canAudit) {
      try {
        const r = await api.get<AuditLog[] | { results: AuditLog[] }>(
          "/dashboard/timeline/"
        );
        setTimeline(resultsOf(Array.isArray(r) ? r : r));
      } catch {
        setTimeline([]);
      }
    } else {
      setTimeline([]);
    }
  }, [canAudit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadDemo() {
    setDemoBusy(true);
    try {
      await api.post("/dashboard/demo/");
      await reload();
    } finally {
      setDemoBusy(false);
    }
  }

  async function clearDemo() {
    if (
      !confirm(
        "Remover todos os leads/cards de demonstração do CRM? Isso limpa a simulação do dashboard."
      )
    ) {
      return;
    }
    setDemoBusy(true);
    try {
      await api.delete("/dashboard/demo/");
      await reload();
    } finally {
      setDemoBusy(false);
    }
  }

  const cards = data?.cards;
  const demoActive = Boolean(data?.demo_data_active);
  const nextEvents = data?.next_events || [];
  const nextShow: DashboardNextEvent | null = nextEvents[0] || null;
  const recentLeads = data?.recent_leads || [];
  const displayName =
    user?.first_name || user?.username || "equipe";
  const siteTitle = data?.site_title || "Rafael Aragão";

  const chartSeries = useMemo(
    () =>
      (data?.events_series || []).map((s) => ({
        ...s,
        label: monthLabel(s.month),
      })),
    [data?.events_series]
  );

  const n = (v: number | undefined) =>
    loading && !data ? "…" : v === undefined || v === null ? 0 : v;

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="space-y-6 p-4 sm:p-6">
        {/* —— Hero de impacto —— */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="admin-glass relative overflow-hidden p-5 sm:p-7 lg:p-8"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            aria-hidden
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 12% 20%, color-mix(in srgb, var(--theme-primary) 28%, transparent), transparent 50%),
                radial-gradient(ellipse at 88% 10%, rgba(255,255,255,0.06), transparent 42%),
                radial-gradient(ellipse at 70% 90%, color-mix(in srgb, var(--theme-primary) 12%, transparent), transparent 48%)
              `,
            }}
          />
          <motion.div
            className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-gold/20 blur-[90px]"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />
          <div
            className="admin-tone-line pointer-events-none absolute inset-x-0 top-0 h-px"
            aria-hidden
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-stretch">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="admin-tone-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em]">
                  <Sparkles size={11} />
                  Painel ao vivo
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/45">
                  {now.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
              </div>

              <h2 className="mt-4 font-display text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-[1.05] tracking-tight text-white">
                {greetingForHour(now.getHours())},{" "}
                <span className="text-gold">{displayName}</span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55 sm:text-[15px]">
                Central de comando de{" "}
                <span className="font-semibold text-white/80">{siteTitle}</span>
                — agenda, CRM e conversão em um só olhar. O que importa agora
                está aqui.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {can("events") && (
                  <Link
                    href="/admin/eventos"
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink shadow-[0_0_28px_-8px_color-mix(in_srgb,var(--theme-primary)_60%,transparent)] transition hover:brightness-110"
                  >
                    <CalendarDays size={15} />
                    Gerenciar eventos
                    <ArrowRight size={13} />
                  </Link>
                )}
                {can("crm") && (
                  <Link
                    href="/admin/crm"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/85 backdrop-blur transition hover:border-gold/40 hover:text-gold"
                  >
                    <Kanban size={15} />
                    Abrir CRM
                  </Link>
                )}
                <a
                  href="/api/dashboard/export-pdf"
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm text-white/70 transition hover:border-gold/35 hover:text-gold"
                >
                  <Download size={14} />
                  PDF
                </a>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  {
                    label: "Próximos shows",
                    value: n(cards?.upcoming_events),
                    icon: Ticket,
                  },
                  {
                    label: "Leads hoje",
                    value: n(cards?.leads_today),
                    icon: Flame,
                  },
                  {
                    label: "Pipeline",
                    value: n(cards?.in_progress),
                    icon: Layers,
                  },
                  {
                    label: "Conversão",
                    value:
                      loading && !data
                        ? "…"
                        : `${cards?.conversion_rate ?? 0}%`,
                    icon: Target,
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    className="rounded-2xl border border-white/10 bg-black/25 px-3 py-3 backdrop-blur-sm"
                  >
                    <s.icon size={14} className="text-gold/80" />
                    <p className="mt-2 font-display text-2xl font-black text-white">
                      {s.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/40">
                      {s.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Spotlight próximo show */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/15 via-black/40 to-black/60 p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.9)]"
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold/25 blur-3xl"
                aria-hidden
              />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold">
                  Próximo show
                </p>
                {nextShow ? (
                  <>
                    <h3 className="mt-3 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
                      {nextShow.name}
                    </h3>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} className="text-gold" />
                        {nextShow.city}/{nextShow.state}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-gold" />
                        {formatFullDate(nextShow.date)}
                      </span>
                      {nextShow.time && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-gold" />
                          {formatTime(nextShow.time)}
                        </span>
                      )}
                    </p>
                    {nextShow.venue && (
                      <p className="mt-1 text-xs text-white/40">
                        {nextShow.venue}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="mt-4">
                    <p className="font-display text-xl font-bold text-white/80">
                      Nenhum show publicado à frente
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Cadastre ou publique eventos para ver o spotlight aqui.
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-end justify-between gap-3">
                {nextShow ? (
                  <div>
                    <p className="font-display text-4xl font-black text-gold sm:text-5xl">
                      {daysUntil(nextShow.date)}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-white/45">
                      dias restantes
                    </p>
                  </div>
                ) : (
                  <div />
                )}
                {can("events") && (
                  <Link
                    href="/admin/eventos"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/80 transition hover:border-gold/40 hover:text-gold"
                  >
                    Ver agenda
                    <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {isAdmin && (
          <div
            className={`admin-glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
              demoActive ? "border-gold/45" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/15 text-gold">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {demoActive
                    ? "Dados de demonstração ativos"
                    : "Simulação para o cliente"}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  {demoActive
                    ? "O CRM/dashboard usam leads fake. Remova antes de entregar."
                    : "Carregue leads demo para mostrar gráficos e o Kanban preenchidos."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!demoActive ? (
                <button
                  disabled={demoBusy}
                  onClick={() => void loadDemo()}
                  className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  {demoBusy ? "Carregando..." : "Carregar dados demo"}
                </button>
              ) : (
                <button
                  disabled={demoBusy}
                  onClick={() => void clearDemo()}
                  className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {demoBusy ? "Removendo..." : "Excluir simulação"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* KPIs principais */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              {
                icon: CalendarDays,
                label: "Shows à frente",
                value: n(cards?.upcoming_events),
                hint: `${n(cards?.events_published)} publicados`,
                accent: "text-gold",
                glow: "bg-gold/25",
                ring: "border-gold/30",
              },
              {
                icon: Users,
                label: "Leads (30 dias)",
                value: n(cards?.leads_last_30d),
                hint: `${n(cards?.leads_week)} nesta semana`,
                accent: "text-sky-300",
                glow: "bg-sky-400/20",
                ring: "border-sky-400/25",
              },
              {
                icon: Handshake,
                label: "Contratos fechados",
                value: n(cards?.won),
                hint: `${n(cards?.lost)} perdidos · ${n(cards?.pipeline_total)} no funil`,
                accent: "text-emerald-300",
                glow: "bg-emerald-400/20",
                ring: "border-emerald-400/25",
              },
              {
                icon: TrendingUp,
                label: "Taxa de conversão",
                value:
                  loading && !data ? "…" : `${cards?.conversion_rate ?? 0}%`,
                hint: `${n(cards?.in_progress)} em andamento`,
                accent: "text-violet-300",
                glow: "bg-violet-400/20",
                ring: "border-violet-400/25",
              },
            ] as const
          ).map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05 }}
              className="admin-kpi"
            >
              <div className="admin-kpi-inner admin-glass admin-glass-hover p-4 sm:p-5">
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${kpi.glow} blur-3xl`}
                  aria-hidden
                />
                <div className="relative flex items-start gap-3">
                  <div
                    className={`rounded-2xl border ${kpi.ring} bg-white/[0.04] p-2.5 ${kpi.accent}`}
                  >
                    <kpi.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                      {kpi.label}
                    </p>
                    <p className="mt-0.5 font-display text-3xl font-black text-white">
                      {kpi.value}
                    </p>
                    <p className="mt-1 truncate text-[11px] text-white/40">
                      {kpi.hint}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <AdminFade delay={0.12} className="flex flex-wrap gap-2.5">
          {can("events") && (
            <a
              href="/api/exports/events"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm backdrop-blur transition hover:border-gold/40 hover:text-gold"
            >
              <FileSpreadsheet size={14} /> CSV Eventos
            </a>
          )}
          {can("leads") && (
            <a
              href="/api/exports/leads"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm backdrop-blur transition hover:border-gold/40 hover:text-gold"
            >
              <FileSpreadsheet size={14} /> CSV Leads
            </a>
          )}
          <span className="self-center text-xs text-white/30">
            {n(cards?.events_total)} eventos · {n(cards?.leads_total)} leads ·{" "}
            {n(cards?.events_draft)} rascunhos
          </span>
        </AdminFade>

        {/* Próximos shows + leads recentes */}
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFade delay={0.15}>
            <div className="admin-glass flex h-full min-h-[22rem] flex-col p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/15 text-gold">
                    <CalendarDays size={15} />
                  </span>
                  Agenda próxima
                </h2>
                {can("events") && (
                  <Link
                    href="/admin/eventos"
                    className="text-xs font-semibold text-gold/80 hover:text-gold"
                  >
                    Ver todos
                  </Link>
                )}
              </div>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
                {nextEvents.length === 0 && (
                  <li className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/40">
                    Nenhum show publicado nos próximos dias.
                  </li>
                )}
                {nextEvents.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      href="/admin/eventos"
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition hover:border-gold/30 hover:bg-gold/[0.06]"
                    >
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                        <span className="font-display text-sm font-black leading-none">
                          {parseDate(ev.date).getDate()}
                        </span>
                        <span className="text-[8px] font-bold uppercase">
                          {parseDate(ev.date)
                            .toLocaleDateString("pt-BR", { month: "short" })
                            .replace(".", "")}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {ev.city}
                          <span className="text-white/35"> / {ev.state}</span>
                        </p>
                        <p className="truncate text-xs text-white/45">
                          {ev.name}
                          {ev.time ? ` · ${formatTime(ev.time)}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold text-gold">
                        {daysUntil(ev.date)}d
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </AdminFade>

          <AdminFade delay={0.2}>
            <div className="admin-glass flex h-full min-h-[22rem] flex-col p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15 text-sky-300">
                    <Mail size={15} />
                  </span>
                  Leads recentes
                </h2>
                {can("crm") && (
                  <Link
                    href="/admin/crm"
                    className="text-xs font-semibold text-sky-300/80 hover:text-sky-300"
                  >
                    Abrir CRM
                  </Link>
                )}
              </div>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
                {recentLeads.length === 0 && (
                  <li className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/40">
                    Ainda não há solicitações de contratação.
                  </li>
                )}
                {recentLeads.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-gold">
                      {(lead.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {lead.name}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {lead.email}
                        {lead.area ? ` · ${lead.area}` : ""}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/30">
                        {formatDateTime(lead.created_at)}
                        {lead.category ? ` · ${lead.category}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </AdminFade>
        </div>

        {/* Gráficos */}
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFade delay={0.22}>
            <div className="admin-glass admin-glass-hover flex h-[21rem] flex-col p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/15 text-gold">
                  <CalendarDays size={15} />
                </span>
                Eventos por mês
              </h2>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartSeries}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <XAxis dataKey="label" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      cursor={{
                        fill: "color-mix(in srgb, var(--theme-primary) 10%, transparent)",
                        radius: 8,
                      }}
                      content={<ChartTooltip valueLabel="eventos" />}
                    />
                    <Bar
                      dataKey="count"
                      name="Eventos"
                      fill={primary}
                      radius={[8, 8, 4, 4]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AdminFade>

          <AdminFade delay={0.26}>
            <div className="admin-glass admin-glass-hover flex h-[21rem] flex-col p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15 text-sky-300">
                  <Kanban size={15} />
                </span>
                Funil do CRM
              </h2>
              <div className="min-h-0 flex-1">
                {(data?.leads_by_status || []).length === 0 ? (
                  <p className="flex h-full items-center justify-center text-sm text-white/40">
                    Sem colunas/leads no CRM ainda.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.leads_by_status || []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        innerRadius={42}
                        label={({ name }) => String(name ?? "")}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={1}
                      >
                        {(data?.leads_by_status || []).map((entry, i) => (
                          <Cell key={i} fill={entry.color || primary} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip valueLabel="leads" />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </AdminFade>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <AdminFade delay={0.3}>
            <div className="admin-glass admin-glass-hover flex h-[21rem] flex-col p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-300">
                  <MapPin size={15} />
                </span>
                Top cidades
              </h2>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
                {(data?.top_cities || []).map((c, i) => {
                  const max = data?.top_cities?.[0]?.count || 1;
                  const pct = Math.round((c.count / max) * 100);
                  return (
                    <li key={c.city} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-white/85">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold/15 text-[10px] font-bold text-gold">
                            {i + 1}
                          </span>
                          {c.city}
                        </span>
                        <span className="font-semibold text-gold">{c.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold/80 to-gold/40"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
                {(data?.top_cities || []).length === 0 && (
                  <p className="text-sm text-white/40">Sem dados de cidades.</p>
                )}
              </ul>
            </div>
          </AdminFade>

          <AdminFade delay={0.34}>
            {canAudit ? (
              <div className="admin-glass admin-glass-hover flex h-[21rem] flex-col p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/15 text-violet-300">
                    <Activity size={15} />
                  </span>
                  Linha do tempo
                </h2>
                <ul className="min-h-0 flex-1 space-y-2.5 overflow-y-auto thin-scroll pr-1">
                  {timeline.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-r-xl border-l-2 border-gold/40 bg-white/[0.03] py-2 pl-3 pr-2 transition hover:border-gold hover:bg-gold/[0.05]"
                    >
                      <p className="text-sm text-white">
                        <span className="text-gold">
                          {log.user_name || "Sistema"}
                        </span>{" "}
                        {log.action_display.toLowerCase()} {log.model_name}
                      </p>
                      <p className="truncate text-xs text-white/40">
                        {log.object_repr}
                      </p>
                      <p className="text-[10px] text-white/30">
                        {formatDateTime(log.created_at)}
                      </p>
                    </li>
                  ))}
                  {timeline.length === 0 && (
                    <p className="text-sm text-white/40">
                      Nenhuma atividade recente.
                    </p>
                  )}
                </ul>
              </div>
            ) : (
              <div className="admin-glass flex h-[21rem] flex-col p-5">
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
                  <Activity size={15} className="text-white/40" />
                  Atividades
                </h2>
                <p className="text-sm text-white/40">
                  A linha do tempo aparece com acesso à Auditoria.
                </p>
              </div>
            )}
          </AdminFade>
        </div>
      </div>
    </>
  );
}
