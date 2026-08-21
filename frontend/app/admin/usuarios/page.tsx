"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Users,
  Shield,
  UserCheck,
  UserX,
  LayoutDashboard,
  CalendarDays,
  Kanban,
  Download,
  Settings,
  ScrollText,
  KeyRound,
  Sparkles,
  Save,
  Bell,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, resultsOf } from "@/lib/api";
import { ADMIN_TONES, type AdminToneKey } from "@/lib/adminTones";
import type { ModuleKey, Role, User } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import ThemedSelect from "@/components/ui/ThemedSelect";

const ROLES: { value: Role; label: string }[] = [
  { value: "comercial", label: "Comercial" },
  { value: "gerente", label: "Gerente" },
  { value: "visualizador", label: "Visualizador (somente leitura)" },
  { value: "admin", label: "Administrador" },
];

const DELEGATABLE: {
  key: ModuleKey;
  label: string;
  hint: string;
  Icon: typeof LayoutDashboard;
  tone: AdminToneKey;
}[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    hint: "Visão geral e gráficos",
    Icon: LayoutDashboard,
    tone: "dashboard",
  },
  {
    key: "events",
    label: "Eventos",
    hint: "Agenda e cadastro de shows",
    Icon: CalendarDays,
    tone: "events",
  },
  {
    key: "crm",
    label: "CRM Kanban",
    hint: "Pipeline de contratação",
    Icon: Kanban,
    tone: "crm",
  },
  {
    key: "leads",
    label: "Leads",
    hint: "Exportações e leads",
    Icon: Download,
    tone: "crm",
  },
  {
    key: "config",
    label: "Configurações",
    hint: "Textos, cores, e-mails e redes do site",
    Icon: Settings,
    tone: "config",
  },
  {
    key: "users",
    label: "Equipe",
    hint: "Cadastrar usuários e permissões",
    Icon: Users,
    tone: "users",
  },
  {
    key: "audit",
    label: "Auditoria",
    hint: "Histórico de ações do sistema",
    Icon: ScrollText,
    tone: "audit",
  },
  {
    key: "notifications",
    label: "Notificações",
    hint: "Matriz, destinatários e templates de aviso",
    Icon: Bell,
    tone: "email",
  },
];

const ROLE_TONE: Record<Role, string> = {
  admin: "border-gold/35 bg-gold/15 text-gold",
  gerente: "border-sky-400/35 bg-sky-500/15 text-sky-300",
  comercial: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  visualizador: "border-violet-400/35 bg-violet-500/15 text-violet-300",
};

const EMPTY_PERMS: Record<string, boolean> = Object.fromEntries(
  DELEGATABLE.map((m) => [m.key, false])
);

type FormState = {
  username: string;
  first_name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
  is_active: boolean;
  module_permissions: Record<string, boolean>;
};

const EMPTY_FORM: FormState = {
  username: "",
  first_name: "",
  email: "",
  phone: "",
  role: "comercial",
  password: "",
  is_active: true,
  module_permissions: { ...EMPTY_PERMS, events: true, dashboard: true },
};

export default function UsuariosPage() {
  const { can, user: me } = useAuth();
  const isAdmin = me?.role === "admin";
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const roleOptions = useMemo(
    () => (isAdmin ? ROLES : ROLES.filter((r) => r.value !== "admin")),
    [isAdmin]
  );

  const load = useCallback(async () => {
    const data = await api.get<{ results: User[] } | User[]>("/users/");
    setUsers(resultsOf(data));
  }, []);

  useEffect(() => {
    if (can("users")) load().catch(() => {});
  }, [can, load]);

  if (!can("users")) {
    return (
      <>
        <Topbar title="Equipe" />
        <p className="p-6 text-white/50">
          Sem permissão para gerenciar a equipe.
        </p>
      </>
    );
  }

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.length - activeCount;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal("create");
  }

  function openEdit(u: User) {
    setEditing(u);
    const perms = { ...EMPTY_PERMS, ...(u.module_permissions || {}) };
    if (!u.module_permissions || Object.keys(u.module_permissions).length === 0) {
      for (const m of DELEGATABLE) {
        perms[m.key] = Boolean(u.permissions?.[m.key]);
      }
    }
    setForm({
      username: u.username,
      first_name: u.first_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      password: "",
      is_active: u.is_active,
      module_permissions: perms,
    });
    setModal("edit");
  }

  async function save() {
    if (!form.username.trim()) return;
    if (modal === "create" && !form.password) {
      alert("Defina uma senha para o novo usuário.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        is_active: form.is_active,
        module_permissions:
          form.role === "admin" ? {} : form.module_permissions,
        ...(form.password ? { password: form.password } : {}),
      };
      if (editing) {
        await api.patch(`/users/${editing.id}/`, payload);
      } else {
        await api.post("/users/", payload);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    if (u.id === me?.id) {
      alert("Você não pode excluir a si mesmo.");
      return;
    }
    if (!confirm(`Excluir usuário ${u.username}?`)) return;
    await api.delete(`/users/${u.id}/`);
    await load();
  }

  function togglePerm(key: string) {
    setForm((f) => ({
      ...f,
      module_permissions: {
        ...f.module_permissions,
        [key]: !f.module_permissions[key],
      },
    }));
  }

  return (
    <>
      <Topbar title="Equipe" />
      <div className="space-y-5 p-6">
        <AdminHero
          icon={Users}
          title="Equipe e permissões"
          subtitle="Cadastre logins (ex.: comercial1, gerente2) e marque exatamente quais abas cada pessoa pode abrir — inclusive Equipe e Auditoria."
          actions={
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-full admin-tone-btn px-4 py-2.5 text-sm font-semibold shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--admin-tone)_55%,transparent)] transition hover:scale-[1.02]"
            >
              <Plus size={16} /> Novo usuário
            </button>
          }
          stats={[
            { label: "Na equipe", value: users.length, icon: Users },
            { label: "Ativos", value: activeCount, icon: UserCheck },
            { label: "Inativos", value: inactiveCount, icon: UserX },
          ]}
        />

        <div className="overflow-hidden admin-glass">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-soft/80 text-white/50">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Acessos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const mods = DELEGATABLE.filter(
                  (m) => u.permissions?.[m.key]
                );
                return (
                  <tr
                    key={u.id}
                    className="border-t border-white/5 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/15 font-display text-sm font-bold text-gold">
                          {(u.first_name || u.username).slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-white">
                            {u.first_name || u.username}
                          </p>
                          <p className="text-xs text-white/40">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize ${
                          ROLE_TONE[u.role] ||
                          "border-white/10 bg-white/5 text-white/70"
                        }`}
                      >
                        <Shield size={12} />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gold">
                          <Sparkles size={12} /> Acesso total
                        </span>
                      ) : mods.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {mods.map((m) => (
                            <span
                              key={m.key}
                              title={m.label}
                              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px]"
                              style={{
                                color: ADMIN_TONES[m.tone].hex,
                                borderColor: `color-mix(in srgb, ${ADMIN_TONES[m.tone].hex} 35%, transparent)`,
                                background: `color-mix(in srgb, ${ADMIN_TONES[m.tone].hex} 12%, transparent)`,
                              }}
                            >
                              <m.Icon size={11} />
                              {m.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-white/35">
                          Nenhum módulo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/10 text-white/40"
                        }`}
                      >
                        {u.is_active ? (
                          <UserCheck size={12} />
                        ) : (
                          <UserX size={12} />
                        )}
                        {u.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg border border-white/10 p-2 text-white/50 transition hover:border-gold/40 hover:text-gold"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => remove(u)}
                          className="rounded-lg border border-white/10 p-2 text-white/50 transition hover:border-red-400/40 hover:text-red-400"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-white/40"
                  >
                    <Users className="mx-auto mb-2 h-8 w-8 text-white/20" />
                    Nenhum usuário ainda. Crie o primeiro login da equipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto admin-glass p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
                {editing ? <Pencil size={18} /> : <Plus size={18} />}
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-white">
                  {editing ? "Editar usuário" : "Novo usuário"}
                </h3>
                <p className="mt-0.5 text-xs text-white/40">
                  Ex.: username{" "}
                  <span className="text-white/60">comercial1</span>, nome{" "}
                  <span className="text-white/60">Comercial 1</span>
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field
                label="Usuário (login)"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                placeholder="comercial1"
              />
              <Field
                label="Nome de exibição"
                value={form.first_name}
                onChange={(v) => setForm({ ...form, first_name: v })}
                placeholder="Comercial 1"
              />
              <Field
                label="E-mail"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <Field
                label="Telefone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1.5 text-white/60">
                  <Shield size={12} /> Perfil base
                </span>
                <ThemedSelect
                  value={form.role}
                  onChange={(v) =>
                    setForm({ ...form, role: v as Role })
                  }
                  options={roleOptions.map((r) => ({
                    value: r.value,
                    label: r.label,
                  }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 flex items-center gap-1.5 text-white/60">
                  <KeyRound size={12} />
                  {editing ? "Nova senha (opcional)" : "Senha"}
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 outline-none focus:border-gold"
                />
              </label>

              {form.role !== "admin" && (
                <div className="rounded-xl border border-gold/20 bg-gradient-to-br from-gold/8 to-transparent p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles size={14} className="text-gold" />
                    Delegar acessos
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Marque as abas que este usuário poderá abrir no painel.
                  </p>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-1">
                    {DELEGATABLE.map((m) => {
                      const on = Boolean(form.module_permissions[m.key]);
                      return (
                        <li key={m.key}>
                          <label
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                              on ? "" : "border-white/8 bg-ink/40 hover:bg-white/5"
                            }`}
                            style={
                              on
                                ? {
                                    borderColor: `color-mix(in srgb, ${ADMIN_TONES[m.tone].hex} 42%, transparent)`,
                                    background: `color-mix(in srgb, ${ADMIN_TONES[m.tone].hex} 12%, transparent)`,
                                  }
                                : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => togglePerm(m.key)}
                              className="mt-1"
                              style={{ accentColor: ADMIN_TONES[m.tone].hex }}
                            />
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink"
                              style={{ color: ADMIN_TONES[m.tone].hex }}
                            >
                              <m.Icon size={15} />
                            </span>
                            <span>
                              <span className="block text-sm text-white">
                                {m.label}
                              </span>
                              <span className="text-xs text-white/40">
                                {m.hint}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="accent-gold"
                />
                Conta ativa
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                disabled={saving}
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
              >
                <Save size={15} />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/60">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-ink px-3 py-2 outline-none focus:border-gold"
      />
    </label>
  );
}
