"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  NotificationEventSetting,
  NotificationRecipient,
  NotificationSettingsPayload,
} from "@/lib/types";
import ThemedSelect from "@/components/ui/ThemedSelect";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold disabled:opacity-60";

const ROLE_COLS: {
  key: keyof Pick<
    NotificationEventSetting,
    | "notify_admin"
    | "notify_gerente"
    | "notify_comercial"
    | "notify_visualizador"
  >;
  label: string;
}[] = [
  { key: "notify_admin", label: "Administrador" },
  { key: "notify_comercial", label: "Comercial" },
  { key: "notify_gerente", label: "Gerente" },
  { key: "notify_visualizador", label: "Visualizador" },
];

export default function NotificationSettingsPanel() {
  const { can, canWrite } = useAuth();
  const allowed = can("notifications");
  const writable = canWrite("notifications");
  const [events, setEvents] = useState<NotificationEventSetting[]>([]);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [mailbox, setMailbox] = useState<string[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [tplKey, setTplKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const data = await api.get<NotificationSettingsPayload>(
      "/notification-settings",
    );
    setEvents(
      (data.events || []).map((e) => ({
        ...e,
        email_recipient_ids: Array.isArray(e.email_recipient_ids)
          ? e.email_recipient_ids.map((id) => Number(id)).filter((id) => id > 0)
          : [],
      })),
    );
    setRecipients(data.recipients || []);
    setMailbox(data.mailbox_addresses || []);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    load().catch(() => setErr("Não foi possível carregar as notificações."));
  }, [allowed, load]);

  const current = useMemo(
    () => events.find((e) => e.key === tplKey) || events[0],
    [events, tplKey],
  );

  useEffect(() => {
    if (!tplKey && events[0]) setTplKey(events[0].key);
  }, [events, tplKey]);

  useEffect(() => {
    if (!current) return;
    setSubject(current.subject);
    setBody(current.body);
  }, [current?.key]);

  function flash(ok: string) {
    setErr("");
    setMsg(ok);
    window.setTimeout(() => setMsg(""), 4000);
  }

  function apiErr(e: unknown) {
    if (e instanceof ApiError) {
      const data = e.data;
      if (data && typeof data === "object") {
        const parts = Object.values(data as Record<string, unknown>)
          .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
          .filter(Boolean);
        if (parts.length) {
          setErr(parts.join(" "));
          return;
        }
      }
      setErr(e.message);
      return;
    }
    setErr("Falha ao salvar.");
  }

  function toggle(
    key: string,
    field: (typeof ROLE_COLS)[number]["key"],
  ) {
    setEvents((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, [field]: !row[field] } : row,
      ),
    );
  }

  function toggleRecipient(key: string, recipientId: number) {
    setEvents((prev) => {
      const next = prev.map((row) => {
        if (row.key !== key) return row;
        const has = row.email_recipient_ids.includes(recipientId);
        const ids = has
          ? row.email_recipient_ids.filter((id) => id !== recipientId)
          : [...row.email_recipient_ids, recipientId];
        return { ...row, email_recipient_ids: ids, send_email: ids.length > 0 };
      });
      if (writable) {
        window.setTimeout(() => {
          void persistMatrix(next);
        }, 0);
      }
      return next;
    });
  }

  async function persistMatrix(rows: NotificationEventSetting[]) {
    setSaving(true);
    setErr("");
    try {
      await api.put("/notification-settings/preferences", {
        preferences: rows.map((e) => ({
          event_type: e.key,
          notify_admin: e.notify_admin,
          notify_gerente: e.notify_gerente,
          notify_visualizador: e.notify_visualizador,
          notify_comercial: e.notify_comercial,
          send_email: (e.email_recipient_ids || []).length > 0,
          email_recipient_ids: e.email_recipient_ids || [],
        })),
      });
      flash("Matriz de notificações salva.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveMatrix() {
    await persistMatrix(events);
  }

  async function addRecipient() {
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    if (mailbox.includes(email)) {
      setErr(
        "Este é o e-mail da caixa do CRM. Cadastre o endereço pessoal de quem deve receber o aviso.",
      );
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await api.post<NotificationRecipient>(
        "/notification-recipients",
        {
          email,
          is_primary: recipients.length === 0,
          is_active: true,
        },
      );
      setAddEmail("");
      await load();
      flash("Destinatário adicionado e associado a todos os avisos.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  async function patchRecipient(
    row: NotificationRecipient,
    patch: Partial<NotificationRecipient>,
  ) {
    setSaving(true);
    try {
      const updated = await api.patch<NotificationRecipient>(
        `/notification-recipients/${row.id}/`,
        patch,
      );
      setRecipients((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item)),
      );
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  async function removeRecipient(row: NotificationRecipient) {
    setSaving(true);
    try {
      await api.delete(`/notification-recipients/${row.id}/`);
      setRecipients((prev) => prev.filter((item) => item.id !== row.id));
      flash("Destinatário removido.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    if (!current) return;
    setSaving(true);
    try {
      await api.put("/notification-settings/templates", {
        event_type: current.key,
        subject,
        body,
      });
      setEvents((prev) =>
        prev.map((e) =>
          e.key === current.key
            ? { ...e, subject, body, is_custom: true }
            : e,
        ),
      );
      flash("Template salvo.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  async function restoreTemplate() {
    if (!current) return;
    setSaving(true);
    try {
      const data = await api.post<{
        subject: string;
        body: string;
        is_custom: boolean;
      }>("/notification-settings/templates", { event_type: current.key });
      setSubject(data.subject);
      setBody(data.body);
      setEvents((prev) =>
        prev.map((e) =>
          e.key === current.key
            ? {
                ...e,
                subject: data.subject,
                body: data.body,
                is_custom: false,
              }
            : e,
        ),
      );
      flash("Template restaurado para o padrão.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving(false);
    }
  }

  if (!allowed) return null;

  return (
    <div className="space-y-5">
      {(msg || err) && (
        <p
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            err
              ? "border-red-400/30 bg-red-400/10 text-red-200"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {err || msg}
        </p>
      )}

      <section className="admin-glass p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail size={16} className="text-gold" />
          <h3 className="font-display text-base font-bold text-white">
            Destinatários das notificações por e-mail
          </h3>
        </div>
        <div className="space-y-2">
          {recipients.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-ink/40 px-3 py-2.5"
            >
              <span className="min-w-0 flex-1 text-sm text-white">
                {row.email}
                {row.is_primary && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">
                    principal
                  </span>
                )}
              </span>
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={row.is_active}
                  disabled={!writable}
                  onChange={() =>
                    void patchRecipient(row, { is_active: !row.is_active })
                  }
                  className="accent-gold"
                />
                Ativo
              </label>
              {!row.is_primary && writable && (
                <button
                  type="button"
                  onClick={() => void patchRecipient(row, { is_primary: true })}
                  className="text-xs text-white/50 hover:text-gold"
                >
                  Tornar principal
                </button>
              )}
              {writable && (
                <button
                  type="button"
                  onClick={() => void removeRecipient(row)}
                  className="text-white/40 hover:text-red-300"
                  aria-label="Remover"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {writable && (
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void addRecipient();
            }}
          >
            <input
              type="email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              placeholder="ex.: administracao@empresa.com.br"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gold/40 px-4 py-2 text-sm font-semibold text-gold disabled:opacity-50"
            >
              <Plus size={14} />
              Adicionar destinatário
            </button>
          </form>
        )}
      </section>

      <section className="admin-glass overflow-x-auto p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-gold" />
            <h3 className="font-display text-base font-bold text-white">
              Quem é notificado
            </h3>
          </div>
          {writable && (
            <button
              type="button"
              onClick={() => void saveMatrix()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              <Save size={14} />
              Salvar matriz
            </button>
          )}
        </div>
        <p className="mb-3 text-xs text-white/45">
          Os perfis recebem o aviso no sino do /admin. Os e-mails à direita
          recebem o mesmo aviso na caixa pessoal, com o link para acessar. Um
          destinatário novo entra automaticamente em todos os eventos. Marque ou
          desmarque e a matriz é salva na hora.
        </p>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-white/40">
              <th className="pb-2 pr-3 font-medium">Evento</th>
              {ROLE_COLS.map((col) => (
                <th key={col.key} className="pb-2 px-2 text-center font-medium">
                  {col.label}
                </th>
              ))}
              <th className="pb-2 pl-3 font-medium">E-mails cadastrados</th>
            </tr>
          </thead>
          <tbody>
            {events.map((row) => (
              <tr key={row.key} className="border-b border-white/5 align-top">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-white">{row.label}</p>
                  <p className="text-[11px] text-white/35">{row.group_label}</p>
                </td>
                {ROLE_COLS.map((col) => (
                  <td key={col.key} className="px-2 py-2.5 text-center">
                    <input
                      type="checkbox"
                      className="accent-gold"
                      checked={Boolean(row[col.key])}
                      disabled={!writable}
                      onChange={() => toggle(row.key, col.key)}
                    />
                  </td>
                ))}
                <td className="py-2.5 pl-3">
                  {recipients.length === 0 ? (
                    <p className="text-[11px] text-white/35">
                      Cadastre um destinatário acima.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {recipients.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs text-white/70"
                        >
                          <input
                            type="checkbox"
                            className="accent-gold"
                            checked={row.email_recipient_ids.includes(item.id)}
                            disabled={!writable || !item.is_active}
                            onChange={() => toggleRecipient(row.key, item.id)}
                          />
                          <span className="truncate" title={item.email}>
                            {item.email}
                            {item.is_primary ? (
                              <span className="ml-1 text-[10px] uppercase tracking-wider text-gold">
                                principal
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {current && (
        <section className="admin-glass p-5">
          <h3 className="font-display text-base font-bold text-white">
            Template do e-mail
          </h3>
          <div className="mt-3 max-w-md">
            <ThemedSelect
              value={current.key}
              onChange={(v) => setTplKey(v)}
              options={events.map((e) => ({
                value: e.key,
                label: e.label,
              }))}
            />
          </div>
          <p className="mt-3 text-xs text-white/45">
            Variáveis disponíveis:{" "}
            {current.placeholders.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBody((prev) => `${prev}{{${p}}}`)}
                className="mr-1 inline-flex rounded-md border border-gold/30 px-1.5 py-0.5 font-mono text-[11px] text-gold"
              >
                {`{{${p}}}`}
              </button>
            ))}
          </p>
          <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-white/40">
            Assunto
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${inputCls} mt-1`}
              disabled={!writable}
            />
          </label>
          <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-white/40">
            Corpo
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className={`${inputCls} mt-1 min-h-[160px]`}
              disabled={!writable}
            />
          </label>
          {writable && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveTemplate()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
              >
                <Save size={14} />
                Salvar template
              </button>
              <button
                type="button"
                onClick={() => void restoreTemplate()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"
              >
                <RotateCcw size={14} />
                Restaurar padrão
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
