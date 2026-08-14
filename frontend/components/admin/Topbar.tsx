"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { api, resultsOf } from "@/lib/api";
import type { AppNotification, EventItem, Lead } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default function Topbar({ title }: { title: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    events: EventItem[];
    leads: Lead[];
  } | null>(null);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    api
      .get<{ count: number }>("/notifications/unread-count/")
      .then((r) => setUnread(r.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const [ev, ld] = await Promise.all([
          api.get<{ results: EventItem[] } | EventItem[]>(
            `/events/?search=${encodeURIComponent(query)}`
          ),
          api.get<{ results: Lead[] } | Lead[]>(
            `/leads/?search=${encodeURIComponent(query)}`
          ),
        ]);
        setResults({ events: resultsOf(ev), leads: resultsOf(ld) });
      } catch {
        /* ignore */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function openBell() {
    setBellOpen((v) => !v);
    if (!bellOpen) {
      try {
        const data = await api.get<
          { results: AppNotification[] } | AppNotification[]
        >("/notifications/");
        setNotifs(resultsOf(data));
      } catch {
        /* ignore */
      }
    }
  }

  async function markAllRead() {
    await api.post("/notifications/read-all/");
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/10 bg-ink/80 px-6 py-4 backdrop-blur">
      <h1 className="ml-10 font-display text-xl font-bold text-white lg:ml-0">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca global..."
            className="w-56 rounded-full border border-white/10 bg-ink-card py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-gold lg:w-72"
          />
          {results && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-white/10 bg-ink-card p-2 shadow-2xl">
              {results.events.length === 0 && results.leads.length === 0 && (
                <p className="px-3 py-2 text-sm text-white/40">Sem resultados</p>
              )}
              {results.events.map((e) => (
                <Link
                  key={`e${e.id}`}
                  href="/admin/eventos"
                  onClick={() => setQuery("")}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span className="text-gold">Evento</span> · {e.name} — {e.city}
                </Link>
              ))}
              {results.leads.map((l) => (
                <Link
                  key={`l${l.id}`}
                  href="/admin/crm"
                  onClick={() => setQuery("")}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5"
                >
                  <span className="text-gold">Lead</span> · {l.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={openBell}
            className="relative rounded-full border border-white/10 bg-ink-card p-2 text-white/70 hover:text-gold"
            aria-label="Notificações"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-white/10 bg-ink-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-semibold text-white">
                  Notificações
                </span>
                <button
                  onClick={markAllRead}
                  className="text-xs text-gold hover:underline"
                >
                  Marcar todas
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-white/40">
                    Nenhuma notificação
                  </p>
                )}
                {notifs.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || "/admin"}
                    onClick={() => setBellOpen(false)}
                    className={`block border-b border-white/5 px-4 py-3 hover:bg-white/5 ${
                      n.is_read ? "opacity-60" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    {n.message && (
                      <p className="text-xs text-white/50">{n.message}</p>
                    )}
                    <p className="mt-1 text-[10px] text-white/30">
                      {formatDateTime(n.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
