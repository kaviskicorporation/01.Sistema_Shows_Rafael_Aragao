"use client";

import { useCallback, useEffect, useState } from "react";
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
  LayoutDashboard,
  MapPin,
  Activity,
  ArrowRight,
  FileSpreadsheet,
  Kanban,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import AdminFade from "@/components/admin/AdminFade";
import ChartTooltip from "@/components/admin/ChartTooltip";
import { api, resultsOf } from "@/lib/api";
import type { AuditLog, DashboardData } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { DEFAULT_PRIMARY, THEME_EVENT } from "@/lib/theme";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { can, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canAudit = can("audit");
  const [data, setData] = useState<DashboardData | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [demoBusy, setDemoBusy] = useState(false);
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);

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

  const reload = useCallback(async () => {
    try {
      const d = await api.get<DashboardData>("/dashboard/");
      setData(d);
    } catch {
      setData(null);
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

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="space-y-6 p-6">
        <AdminHero
          icon={LayoutDashboard}
          title="Visão geral"
          subtitle="Acompanhe agenda, leads e conversão em um só lugar."
          actions={
            <>
              {can("events") && (
                <Link
                  href="/admin/eventos"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/40 px-4 py-2 text-sm transition hover:border-gold hover:text-gold"
                >
                  <CalendarDays size={14} /> Eventos
                  <ArrowRight size={12} />
                </Link>
              )}
              {can("crm") && (
                <Link
                  href="/admin/crm"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/40 px-4 py-2 text-sm transition hover:border-gold hover:text-gold"
                >
                  <Kanban size={14} /> CRM
                  <ArrowRight size={12} />
                </Link>
              )}
            </>
          }
        />

        {isAdmin && (
          <div
            className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
              demoActive
                ? "border-gold/40 bg-gold/10"
                : "border-white/10 bg-ink-card"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {demoActive
                    ? "Dados de demonstração ativos"
                    : "Simulação para o cliente"}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  {demoActive
                    ? "O CRM/dashboard usam leads fake. Antes de entregar o site, exclua a simulação."
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              {
                icon: CalendarDays,
                label: "Próximos eventos",
                value: cards?.upcoming_events ?? "—",
                accent: "text-gold",
                glow: "from-gold/20",
              },
              {
                icon: Users,
                label: "Leads (30 dias)",
                value: cards?.leads_last_30d ?? "—",
                accent: "text-sky-400",
                glow: "from-sky-400/20",
              },
              {
                icon: Handshake,
                label: "Contratos fechados",
                value: cards?.won ?? "—",
                accent: "text-emerald-400",
                glow: "from-emerald-400/20",
              },
              {
                icon: TrendingUp,
                label: "Taxa de conversão",
                value: cards ? `${cards.conversion_rate}%` : "—",
                accent: "text-violet-400",
                glow: "from-violet-400/20",
              },
            ] as const
          ).map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.4 }}
            >
              <Kpi {...kpi} />
            </motion.div>
          ))}
        </div>

        <AdminFade delay={0.2} className="flex flex-wrap gap-3">
          <a
            href="/api/dashboard/export-pdf"
            className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2 text-sm font-medium text-gold transition hover:bg-gold/25 hover:scale-[1.02]"
          >
            <Download size={14} /> Exportar PDF
          </a>
          {can("events") && (
            <a
              href="/api/exports/events"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-gold hover:text-gold hover:scale-[1.02]"
            >
              <FileSpreadsheet size={14} /> CSV Eventos
            </a>
          )}
          {can("leads") && (
            <a
              href="/api/exports/leads"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm transition hover:border-gold hover:text-gold hover:scale-[1.02]"
            >
              <FileSpreadsheet size={14} /> CSV Leads
            </a>
          )}
        </AdminFade>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminFade delay={0.25}>
            <div className="flex h-[21rem] flex-col rounded-2xl border border-white/10 bg-ink-card p-5 transition hover:border-white/15">
              <h2 className="mb-4 flex shrink-0 items-center gap-2 font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
                  <CalendarDays size={15} />
                </span>
                Eventos por mês
              </h2>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.events_series || []}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <XAxis dataKey="month" stroke="#666" fontSize={12} />
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
                      maxBarSize={42}
                      activeBar={{
                        fill: primary,
                        stroke: "rgba(255,255,255,0.35)",
                        strokeWidth: 1.5,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AdminFade>

          <AdminFade delay={0.3}>
            <div className="flex h-[21rem] flex-col rounded-2xl border border-white/10 bg-ink-card p-5 transition hover:border-white/15">
              <h2 className="mb-4 flex shrink-0 items-center gap-2 font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-400/15 text-sky-400">
                  <Users size={15} />
                </span>
                Leads por status
              </h2>
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.leads_by_status || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ status }) => status}
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={1}
                    >
                      {(data?.leads_by_status || []).map((entry, i) => (
                        <Cell key={i} fill={entry.color || primary} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip valueLabel="leads" />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AdminFade>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AdminFade delay={0.35}>
            <div className="flex h-[21rem] flex-col rounded-2xl border border-white/10 bg-ink-card p-5">
              <h2 className="mb-4 flex shrink-0 items-center gap-2 font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-400">
                  <MapPin size={15} />
                </span>
                Top cidades
              </h2>
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
                {(data?.top_cities || []).map((c, i) => (
                  <li
                    key={c.city}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm transition hover:translate-x-0.5 hover:bg-white/[0.08]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gold/10 text-[10px] font-bold text-gold">
                        {i + 1}
                      </span>
                      {c.city}
                    </span>
                    <span className="font-semibold text-gold">{c.count}</span>
                  </li>
                ))}
                {(data?.top_cities || []).length === 0 && (
                  <p className="text-sm text-white/40">Sem dados ainda.</p>
                )}
              </ul>
            </div>
          </AdminFade>

          <AdminFade delay={0.4}>
            {canAudit ? (
              <div className="flex h-[21rem] flex-col rounded-2xl border border-white/10 bg-ink-card p-5">
                <h2 className="mb-4 flex shrink-0 items-center gap-2 font-semibold text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/15 text-violet-400">
                    <Activity size={15} />
                  </span>
                  Linha do tempo
                </h2>
                <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto thin-scroll pr-1">
                  {timeline.map((log) => (
                    <li
                      key={log.id}
                      className="border-l-2 border-gold/40 pl-3 transition hover:border-gold"
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
              <div className="flex h-[21rem] flex-col rounded-2xl border border-white/10 bg-ink-card p-5">
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-white">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40">
                    <Activity size={15} />
                  </span>
                  Atividades
                </h2>
                <p className="text-sm text-white/40">
                  A linha do tempo aparece quando você tiver acesso à Auditoria.
                </p>
              </div>
            )}
          </AdminFade>
        </div>
      </div>
    </>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
  glow,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  accent: string;
  glow: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-card p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_40px_-20px_color-mix(in_srgb,var(--theme-primary)_35%,transparent)]">
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${glow} to-transparent blur-2xl`}
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <div className={`rounded-xl bg-white/5 p-2.5 ${accent}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className="font-display text-2xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
