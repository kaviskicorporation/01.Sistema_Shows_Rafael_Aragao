"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Kanban,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, module: "events" },
  { href: "/admin/crm", label: "CRM Kanban", icon: Kanban, module: "crm" },
  { href: "/admin/formulario-contato", label: "Formulário", icon: ClipboardList, module: "config" },
  { href: "/admin/usuarios", label: "Equipe", icon: Users, module: "users" },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, module: "audit" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, module: "config" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => can(n.module));

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="font-display text-lg font-extrabold text-white">
          <span className="text-gold">RA</span> Admin
        </p>
        <p className="mt-1 truncate text-xs text-white/40">
          {user?.first_name || user?.username} · {user?.role}
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-gold/15 text-gold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gold" />
              )}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  active ? "bg-gold/20" : "bg-white/5 group-hover:bg-white/8"
                }`}
              >
                <Icon size={16} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => logout()}
        className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
      >
        <LogOut size={18} />
        Sair
      </button>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-white/10 bg-ink-card p-2 text-white lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-ink-soft transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-4 text-white/50 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        {content}
      </aside>
    </>
  );
}
