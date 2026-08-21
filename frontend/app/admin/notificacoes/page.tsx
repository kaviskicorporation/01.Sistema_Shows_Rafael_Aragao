"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, resultsOf } from "@/lib/api";
import type { AppNotification } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import ThemedSelect from "@/components/ui/ThemedSelect";

const GROUPS = [
  { value: "", label: "Todas" },
  { value: "crm", label: "CRM" },
  { value: "events", label: "Eventos" },
  { value: "forms", label: "Formulários" },
  { value: "users", label: "Equipe" },
  { value: "system", label: "Sistema" },
];

export default function NotificacoesPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState("");
  const [group, setGroup] = useState("");
  const pageSize = 30;

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (readFilter === "unread") params.set("is_read", "0");
    if (readFilter === "read") params.set("is_read", "1");
    if (group) params.set("group", group);
    const data = await api.get<{ results: AppNotification[]; count: number }>(
      `/notifications?${params}`,
    );
    setItems(resultsOf(data));
    setCount(typeof data.count === "number" ? data.count : resultsOf(data).length);
  }, [page, readFilter, group]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function markOne(n: AppNotification) {
    if (n.is_read) return;
    await api.patch(`/notifications/${n.id}/`, { is_read: true });
    setItems((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)),
    );
  }

  async function markAll() {
    await api.post("/notifications/read-all", {});
    setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }

  const pages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <>
      <Topbar title="Notificações" />
      <div className="space-y-5 p-6">
        <AdminHero
          icon={Bell}
          title="Histórico de notificações"
          subtitle="Marcar como lida tira o aviso da lista pendente, mas ele permanece aqui."
          actions={
            <button
              type="button"
              onClick={() => void markAll()}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80"
            >
              <CheckCheck size={14} />
              Marcar todas como lidas
            </button>
          }
          stats={[
            { label: "Nesta página", value: items.length },
            { label: "Total", value: count },
          ]}
        />

        <div className="flex flex-wrap gap-3">
          <ThemedSelect
            value={readFilter}
            onChange={(v) => {
              setPage(1);
              setReadFilter(v);
            }}
            options={[
              { value: "", label: "Todas" },
              { value: "unread", label: "Não lidas" },
              { value: "read", label: "Lidas" },
            ]}
          />
          <ThemedSelect
            value={group}
            onChange={(v) => {
              setPage(1);
              setGroup(v);
            }}
            options={GROUPS}
          />
        </div>

        <div className="admin-glass divide-y divide-white/5">
          {items.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-white/40">
              Nenhuma notificação neste filtro.
            </p>
          )}
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.link || "/admin"}
              onClick={() => void markOne(n)}
              className={`block px-5 py-4 hover:bg-white/5 ${n.is_read ? "opacity-55" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{n.title}</p>
                  {n.message && (
                    <p className="mt-1 text-sm text-white/55">{n.message}</p>
                  )}
                </div>
                {!n.is_read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                )}
              </div>
              <p className="mt-2 text-[11px] text-white/35">
                {formatDateTime(n.created_at)}
              </p>
            </Link>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm text-white/60">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </>
  );
}
