import type { CSSProperties } from "react";

export type AdminToneKey =
  | "dashboard"
  | "events"
  | "crm"
  | "form"
  | "users"
  | "audit"
  | "email"
  | "config";

export type AdminTone = {
  key: AdminToneKey;
  hex: string;
};

/** Cor de destaque de cada aba do painel. */
export const ADMIN_TONES: Record<AdminToneKey, AdminTone> = {
  dashboard: { key: "dashboard", hex: "var(--theme-primary)" },
  events: { key: "events", hex: "#f59e0b" },
  crm: { key: "crm", hex: "#34d399" },
  form: { key: "form", hex: "#38bdf8" },
  users: { key: "users", hex: "#818cf8" },
  audit: { key: "audit", hex: "#c084fc" },
  email: { key: "email", hex: "#a78bfa" },
  config: { key: "config", hex: "#fb7185" },
};

export function toneFromPath(pathname: string): AdminTone {
  if (pathname.startsWith("/admin/eventos")) return ADMIN_TONES.events;
  if (pathname.startsWith("/admin/crm")) return ADMIN_TONES.crm;
  if (pathname.startsWith("/admin/formulario-contato")) return ADMIN_TONES.form;
  if (pathname.startsWith("/admin/usuarios")) return ADMIN_TONES.users;
  if (pathname.startsWith("/admin/auditoria")) return ADMIN_TONES.audit;
  if (pathname.startsWith("/admin/notificacoes")) return ADMIN_TONES.email;
  if (pathname.startsWith("/admin/emails-alertas")) return ADMIN_TONES.email;
  if (pathname.startsWith("/admin/configuracoes")) return ADMIN_TONES.config;
  return ADMIN_TONES.dashboard;
}

export function toneStyle(hex: string): CSSProperties {
  return { ["--admin-tone" as string]: hex };
}
