"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Inbox,
  Mail,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { EmailSettingsPublic } from "@/lib/types";
import NotificationSettingsPanel from "@/components/admin/NotificationSettingsPanel";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-gold disabled:opacity-60";

type SmtpForm = {
  host: string;
  port: string;
  user: string;
  password: string;
  from_email: string;
  use_user: boolean;
};

type ImapForm = SmtpForm & {
  ssl: boolean;
  allow_self_signed: boolean;
};

const EMPTY_SMTP: SmtpForm = {
  host: "",
  port: "",
  user: "",
  password: "",
  from_email: "",
  use_user: false,
};

const EMPTY_IMAP: ImapForm = {
  ...EMPTY_SMTP,
  ssl: true,
  allow_self_signed: true,
};

function smtpFilled(f: SmtpForm) {
  return Boolean(
    f.host.trim() ||
      f.port.trim() ||
      f.user.trim() ||
      f.password ||
      (f.use_user ? "" : f.from_email.trim())
  );
}

function imapFilled(f: ImapForm) {
  return smtpFilled(f);
}

export default function EmailsAlertasPage() {
  const { can, canWrite } = useAuth();
  const writable = canWrite("config");
  const [meta, setMeta] = useState<EmailSettingsPublic>({
    smtp_override: false,
    imap_override: false,
  });
  const [smtp, setSmtp] = useState<SmtpForm>(EMPTY_SMTP);
  const [imap, setImap] = useState<ImapForm>(EMPTY_IMAP);
  const [saving, setSaving] = useState<"all" | "smtp" | "imap" | "">("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const data = await api.get<EmailSettingsPublic>("/email-settings");
    setMeta({
      smtp_override: Boolean(data.smtp_override),
      imap_override: Boolean(data.imap_override),
    });
    setSmtp(EMPTY_SMTP);
    setImap(EMPTY_IMAP);
  }, []);

  useEffect(() => {
    if (!can("config")) return;
    load().catch(() => setErr("Não foi possível carregar as configurações."));
  }, [can, load]);

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

  async function savePayload(body: Record<string, unknown>, which: typeof saving) {
    setSaving(which);
    setErr("");
    try {
      const data = await api.put<EmailSettingsPublic>("/email-settings", body);
      setMeta({
        smtp_override: Boolean(data.smtp_override),
        imap_override: Boolean(data.imap_override),
      });
      setSmtp(EMPTY_SMTP);
      setImap(EMPTY_IMAP);
      flash("Salvo. Os formulários voltam em branco por segurança.");
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving("");
    }
  }

  async function saveSmtp() {
    if (!smtpFilled(smtp)) {
      setErr(
        "SMTP vazio — o servidor interno já está ativo. Preencha o pacote completo só se quiser substituir."
      );
      return;
    }
    await savePayload(
      {
        smtp: {
          host: smtp.host.trim(),
          port: smtp.port.trim(),
          user: smtp.user.trim(),
          password: smtp.password,
          from_email: smtp.use_user ? smtp.user.trim() : smtp.from_email.trim(),
          use_user: smtp.use_user,
        },
      },
      "smtp"
    );
  }

  async function saveImap() {
    if (!imapFilled(imap)) {
      setErr(
        "IMAP vazio — o servidor interno já está ativo. Preencha o pacote completo só se quiser substituir."
      );
      return;
    }
    await savePayload(
      {
        imap: {
          host: imap.host.trim(),
          port: imap.port.trim(),
          user: imap.user.trim(),
          password: imap.password,
          from_email: imap.use_user ? imap.user.trim() : imap.from_email.trim(),
          use_user: imap.use_user,
          ssl: imap.ssl,
          allow_self_signed: imap.allow_self_signed,
        },
      },
      "imap"
    );
  }

  async function saveAll() {
    const body: Record<string, unknown> = {};
    if (smtpFilled(smtp)) {
      body.smtp = {
        host: smtp.host.trim(),
        port: smtp.port.trim(),
        user: smtp.user.trim(),
        password: smtp.password,
        from_email: smtp.use_user ? smtp.user.trim() : smtp.from_email.trim(),
        use_user: smtp.use_user,
      };
    }
    if (imapFilled(imap)) {
      body.imap = {
        host: imap.host.trim(),
        port: imap.port.trim(),
        user: imap.user.trim(),
        password: imap.password,
        from_email: imap.use_user ? imap.user.trim() : imap.from_email.trim(),
        use_user: imap.use_user,
        ssl: imap.ssl,
        allow_self_signed: imap.allow_self_signed,
      };
    }
    await savePayload(body, "all");
  }

  async function clearOverride(target: "smtp" | "imap") {
    setSaving(target);
    setErr("");
    try {
      const data = await api.post<EmailSettingsPublic>("/email-settings/clear", {
        target,
      });
      setMeta({
        smtp_override: Boolean(data.smtp_override),
        imap_override: Boolean(data.imap_override),
      });
      if (target === "smtp") setSmtp(EMPTY_SMTP);
      else setImap(EMPTY_IMAP);
      flash(
        target === "smtp"
          ? "SMTP voltou ao servidor interno."
          : "IMAP voltou ao servidor interno."
      );
    } catch (e) {
      apiErr(e);
    } finally {
      setSaving("");
    }
  }

  if (!can("config") && !can("notifications")) {
    return (
      <>
        <Topbar title="E-mails e alertas" />
        <p className="p-6 text-white/50">
          Sem permissão para ver e-mails e alertas.
        </p>
      </>
    );
  }

  return (
    <>
      <Topbar title="E-mails e alertas" />
      <div className="space-y-5 p-6">
        {can("config") && (
        <>
        <AdminHero
          icon={Mail}
          title="E-mails e alertas"
          subtitle="Se deixar em branco, o sistema usa o servidor interno. Preencha o pacote completo só se quiser usar o e-mail da sua empresa."
          actions={
            writable ? (
              <button
                type="button"
                onClick={() => void saveAll()}
                disabled={Boolean(saving)}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
              >
                <Save size={14} />
                {saving === "all" ? "Salvando…" : "Salvar"}
              </button>
            ) : undefined
          }
          stats={[
            {
              label: "SMTP",
              value: meta.smtp_override ? "Próprio" : "Interno",
              icon: Send,
            },
            {
              label: "IMAP",
              value: meta.imap_override ? "Próprio" : "Interno",
              icon: Inbox,
            },
          ]}
        />

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

        <div className="grid gap-5 lg:grid-cols-2">
          <MailCard
            title="SMTP"
            hint="Envio"
            icon={Send}
            override={meta.smtp_override}
            writable={writable}
            saving={saving === "smtp"}
            onSave={() => void saveSmtp()}
            onClear={() => void clearOverride("smtp")}
          >
            <HostPort
              host={smtp.host}
              port={smtp.port}
              portPlaceholder="ex.: 587"
              onHost={(v) => setSmtp((s) => ({ ...s, host: v }))}
              onPort={(v) => setSmtp((s) => ({ ...s, port: v }))}
              disabled={!writable}
            />
            <Field
              label="User"
              value={smtp.user}
              onChange={(v) =>
                setSmtp((s) => ({
                  ...s,
                  user: v,
                  from_email: s.use_user ? v : s.from_email,
                }))
              }
              disabled={!writable}
              autoComplete="off"
            />
            <Field
              label="Senha"
              type="password"
              value={smtp.password}
              onChange={(v) => setSmtp((s) => ({ ...s, password: v }))}
              disabled={!writable}
              autoComplete="new-password"
              placeholder={
                meta.smtp_override
                  ? "Em branco mantém a senha já salva"
                  : undefined
              }
            />
            <FromRow
              value={smtp.from_email}
              useUser={smtp.use_user}
              user={smtp.user}
              disabled={!writable}
              onValue={(v) => setSmtp((s) => ({ ...s, from_email: v }))}
              onUseUser={(v) =>
                setSmtp((s) => ({
                  ...s,
                  use_user: v,
                  from_email: v ? s.user : s.from_email,
                }))
              }
            />
          </MailCard>

          <MailCard
            title="IMAP"
            hint="Recebimento"
            icon={Inbox}
            override={meta.imap_override}
            writable={writable}
            saving={saving === "imap"}
            onSave={() => void saveImap()}
            onClear={() => void clearOverride("imap")}
          >
            <HostPort
              host={imap.host}
              port={imap.port}
              portPlaceholder="ex.: 993"
              onHost={(v) => setImap((s) => ({ ...s, host: v }))}
              onPort={(v) => setImap((s) => ({ ...s, port: v }))}
              disabled={!writable}
            />
            <Field
              label="User"
              value={imap.user}
              onChange={(v) =>
                setImap((s) => ({
                  ...s,
                  user: v,
                  from_email: s.use_user ? v : s.from_email,
                }))
              }
              disabled={!writable}
              autoComplete="off"
            />
            <Field
              label="Senha"
              type="password"
              value={imap.password}
              onChange={(v) => setImap((s) => ({ ...s, password: v }))}
              disabled={!writable}
              autoComplete="new-password"
              placeholder={
                meta.imap_override
                  ? "Em branco mantém a senha já salva"
                  : undefined
              }
            />
            <FromRow
              value={imap.from_email}
              useUser={imap.use_user}
              user={imap.user}
              disabled={!writable}
              onValue={(v) => setImap((s) => ({ ...s, from_email: v }))}
              onUseUser={(v) =>
                setImap((s) => ({
                  ...s,
                  use_user: v,
                  from_email: v ? s.user : s.from_email,
                }))
              }
            />
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={imap.ssl}
                onChange={(e) =>
                  setImap((s) => ({ ...s, ssl: e.target.checked }))
                }
                disabled={!writable}
                className="accent-gold"
              />
              SSL
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={imap.allow_self_signed}
                onChange={(e) =>
                  setImap((s) => ({
                    ...s,
                    allow_self_signed: e.target.checked,
                  }))
                }
                disabled={!writable}
                className="accent-gold"
              />
              Permitir certificado autoassinado
            </label>
          </MailCard>
        </div>
        </>
        )}
        <NotificationSettingsPanel />
      </div>
    </>
  );
}

function MailCard({
  title,
  hint,
  icon: Icon,
  override,
  writable,
  saving,
  onSave,
  onClear,
  children,
}: {
  title: string;
  hint: string;
  icon: typeof Send;
  override: boolean;
  writable: boolean;
  saving: boolean;
  onSave: () => void;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <section className="admin-glass flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/15 text-violet-300">
            <Icon size={16} />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <p className="text-[11px] uppercase tracking-wider text-white/40">
              {hint}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            override
              ? "bg-amber-400/15 text-amber-200"
              : "bg-white/8 text-white/45"
          }`}
        >
          {override ? "Personalizado" : "Servidor interno"}
        </span>
      </div>
      {override && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-xs text-amber-100/80">
          Pacote próprio em uso. Os campos ficam em branco de propósito — o
          sistema não mostra as credenciais.
        </p>
      )}
      <div className="space-y-3">{children}</div>
      {writable && (
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Salvando…" : `Salvar ${title}`}
          </button>
          {override && (
            <button
              type="button"
              onClick={onClear}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Limpar e voltar ao servidor interno
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function HostPort({
  host,
  port,
  portPlaceholder,
  onHost,
  onPort,
  disabled,
}: {
  host: string;
  port: string;
  portPlaceholder: string;
  onHost: (v: string) => void;
  onPort: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
        Host : Porta
      </p>
      <div className="mt-1 flex items-center gap-2">
        <input
          value={host}
          onChange={(e) => onHost(e.target.value)}
          className={`${inputCls} flex-1`}
          placeholder="host"
          autoComplete="off"
          disabled={disabled}
        />
        <span className="text-white/35">:</span>
        <input
          value={port}
          onChange={(e) => onPort(e.target.value.replace(/[^\d]/g, ""))}
          className={`${inputCls} w-20 text-center`}
          placeholder={portPlaceholder}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  disabled,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-white/40">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} mt-1`}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function FromRow({
  value,
  useUser,
  user,
  disabled,
  onValue,
  onUseUser,
}: {
  value: string;
  useUser: boolean;
  user: string;
  disabled: boolean;
  onValue: (v: string) => void;
  onUseUser: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="block min-w-0 flex-1 text-xs font-medium uppercase tracking-wider text-white/40">
        From
        <input
          type="email"
          value={useUser ? user : value}
          onChange={(e) => onValue(e.target.value)}
          className={`${inputCls} mt-1`}
          disabled={disabled || useUser}
          autoComplete="off"
        />
      </label>
      <label className="mb-2 flex shrink-0 items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={useUser}
          onChange={(e) => onUseUser(e.target.checked)}
          disabled={disabled}
          className="accent-gold"
        />
        Usar o User
      </label>
    </div>
  );
}
