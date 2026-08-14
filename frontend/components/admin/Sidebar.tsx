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
import { ADMIN_TONES, type AdminToneKey } from "@/lib/adminTones";

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: string;
  tone: AdminToneKey;
}[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard", tone: "dashboard" },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, module: "events", tone: "events" },
  { href: "/admin/crm", label: "CRM Kanban", icon: Kanban, module: "crm", tone: "crm" },
  { href: "/admin/formulario-contato", label: "Formulário", icon: ClipboardList, module: "config", tone: "form" },
  { href: "/admin/usuarios", label: "Equipe", icon: Users, module: "users", tone: "users" },
  { href: "/admin/auditoria", label: "Auditoria", icon: ScrollText, module: "audit", tone: "audit" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, module: "config", tone: "config" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => can(n.module));

  const content = (
    <div className="relative z-10 flex h-full flex-col">
      <div className="relative overflow-hidden border-b border-white/10 px-5 py-5">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/12 via-transparent to-transparent"
          aria-hidden
        />
        <p className="relative font-display text-lg font-extrabold text-white">
          <span className="text-gold">RA</span> Admin
        </p>
        <p className="relative mt-1 truncate text-xs text-white/40">
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
          const hex = ADMIN_TONES[item.tone].hex;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              data-active={active ? "true" : "false"}
              className="admin-nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{ ["--nav-tone" as string]: hex }}
            >
              <span className="admin-nav-rail absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full" />
              <span className="admin-nav-well flex h-8 w-8 items-center justify-center rounded-lg">
                <Icon size={16} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => logout()}
        className="m-3 flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-white/50 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
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
        className="fixed left-4 top-4 z-40 rounded-xl border border-gold/20 bg-ink-card/90 p-2.5 text-white shadow-lg backdrop-blur-md lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#161616]/95 via-ink-soft/95 to-[#0c0c0c]/98 shadow-[12px_0_40px_-24px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-gold/[0.08] blur-[90px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent"
          aria-hidden
        />
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-4 z-20 text-white/50 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
        {content}
      </aside>
    </>
  );
}
