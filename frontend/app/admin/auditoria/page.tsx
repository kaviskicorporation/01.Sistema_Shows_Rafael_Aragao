"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  ScrollText,
  Filter,
  Search,
  Activity,
  UserRound,
  Clock,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, resultsOf } from "@/lib/api";
import type { AuditLog } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import ThemedSelect from "@/components/ui/ThemedSelect";

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-300",
  update: "bg-sky-500/15 text-sky-300",
  delete: "bg-red-500/15 text-red-300",
  login: "bg-violet-500/15 text-violet-300",
  move: "bg-amber-500/15 text-amber-300",
};

export default function AuditoriaPage() {
  const { can } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search) params.set("search", search);
    params.set("page_size", "100");
    const data = await api.get<{ results: AuditLog[] } | AuditLog[]>(
      `/audit-logs/?${params}`
    );
    setLogs(resultsOf(data));
  }, [action, dateFrom, dateTo, search]);

  useEffect(() => {
    if (can("audit")) load().catch(() => {});
  }, [can, load]);

  const uniqueUsers = useMemo(
    () => new Set(logs.map((l) => l.user_name).filter(Boolean)).size,
    [logs]
  );

  if (!can("audit")) {
    return (
      <>
        <Topbar title="Auditoria" />
        <p className="p-6 text-white/50">Sem permissão para ver a auditoria.</p>
      </>
    );
  }

  const exportUrl = `/api/audit-logs/export?${new URLSearchParams({
    ...(action && { action }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo && { date_to: dateTo }),
    ...(search && { search }),
  })}`;

  return (
    <>
      <Topbar title="Auditoria" />
      <div className="space-y-5 p-6">
        <AdminHero
          icon={ScrollText}
          title="Auditoria"
          subtitle="Acompanhe criações, edições, exclusões e logins feitos no painel."
          actions={
            <a
              href={exportUrl}
              className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/25"
            >
              <Download size={14} /> Exportar CSV
            </a>
          }
          stats={[
            { label: "Registros", value: logs.length, icon: Activity },
            { label: "Usuários", value: uniqueUsers, icon: UserRound },
            {
              label: "Último",
              value: logs[0] ? formatDateTime(logs[0].created_at) : "—",
              icon: Clock,
            },
          ]}
        />

        <div className="rounded-2xl border border-white/10 bg-ink-card/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/40">
            <Filter size={13} className="text-gold" /> Filtros
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-white/50">
              Ação
              <div className="mt-1 min-w-[10rem]">
                <ThemedSelect
                  compact
                  value={action}
                  onChange={setAction}
                  options={[
                    { value: "", label: "Todas" },
                    { value: "create", label: "Criação" },
                    { value: "update", label: "Edição" },
                    { value: "delete", label: "Exclusão" },
                    { value: "login", label: "Login" },
                    { value: "move", label: "Movimentação" },
                  ]}
                />
              </div>
            </label>
            <label className="text-xs text-white/50">
              De
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 block rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-white/50">
              Até
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 block rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm"
              />
            </label>
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar objeto..."
                className="w-full rounded-lg border border-white/10 bg-ink py-2 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-card/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-soft/80 text-white/50">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Modelo</th>
                <th className="px-4 py-3">Objeto</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-t border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-white/50">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} className="text-gold/70" />
                      {formatDateTime(log.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound size={12} className="text-white/35" />
                      {log.user_name || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ACTION_STYLE[log.action] || "bg-gold/10 text-gold"
                      }`}
                    >
                      {log.action_display}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{log.model_name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-white/70">
                    {log.object_repr}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-white/40"
                  >
                    <ScrollText className="mx-auto mb-2 h-8 w-8 text-white/20" />
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
