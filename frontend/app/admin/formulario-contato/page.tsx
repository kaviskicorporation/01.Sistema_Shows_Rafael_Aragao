"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2,
  RotateCcw,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SiteConfig } from "@/lib/types";
import {
  DEFAULT_CONTACT_FORM,
  SYSTEM_FIELD_KEYS,
  slugifyOption,
  type ContactFormConfig,
  type ContactFormField,
  type ContactOption,
} from "@/lib/contactForm";
import ThemedSelect from "@/components/ui/ThemedSelect";

type Tab = "fields" | "areas" | "categories";

export default function FormularioContatoPage() {
  const { can, canWrite } = useAuth();
  const writable = canWrite("config");
  const [cfg, setCfg] = useState<ContactFormConfig | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!can("config")) return;
    api
      .get<SiteConfig>("/site-config/")
      .then((data) => {
        setCfg(
          (data.contact_form_config as ContactFormConfig) ||
            structuredClone(DEFAULT_CONTACT_FORM)
        );
      })
      .catch(() => setCfg(structuredClone(DEFAULT_CONTACT_FORM)));
  }, [can]);

  if (!can("config")) {
    return (
      <>
        <Topbar title="Formulário de contato" />
        <p className="p-6 text-white/50">Sem permissão para este módulo.</p>
      </>
    );
  }

  if (!cfg) {
    return (
      <>
        <Topbar title="Formulário de contato" />
        <p className="p-6 text-white/50">Carregando...</p>
      </>
    );
  }

  async function save() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const updated = await api.put<SiteConfig>("/site-config/", {
        contact_form_config: cfg,
      });
      setCfg(
        (updated.contact_form_config as ContactFormConfig) ||
          structuredClone(DEFAULT_CONTACT_FORM)
      );
      setMsg("Formulário salvo. As mudanças já valem no site.");
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message || "Erro ao salvar." : "Erro ao salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetAll() {
    setCfg(structuredClone(DEFAULT_CONTACT_FORM));
  }

  function moveField(index: number, dir: -1 | 1) {
    setCfg((c) => {
      if (!c) return c;
      const next = [...c.fields];
      const j = index + dir;
      if (j < 0 || j >= next.length) return c;
      [next[index], next[j]] = [next[j], next[index]];
      return { ...c, fields: next };
    });
  }

  function updateField(index: number, patch: Partial<ContactFormField>) {
    setCfg((c) => {
      if (!c) return c;
      const fields = c.fields.map((f, i) =>
        i === index ? { ...f, ...patch } : f
      );
      return { ...c, fields };
    });
  }

  function removeField(index: number) {
    setCfg((c) => {
      if (!c) return c;
      const field = c.fields[index];
      if (SYSTEM_FIELD_KEYS.has(field.key)) {
        // Campos do sistema: só desliga, não apaga (mantém lead intacto)
        return {
          ...c,
          fields: c.fields.map((f, i) =>
            i === index ? { ...f, enabled: false } : f
          ),
        };
      }
      return { ...c, fields: c.fields.filter((_, i) => i !== index) };
    });
  }

  function addCustomField() {
    const id = `custom_${Date.now()}`;
    setCfg((c) => {
      if (!c) return c;
      const field: ContactFormField = {
        id,
        key: id,
        type: "text",
        label: "Novo campo",
        placeholder: "",
        required: false,
        enabled: true,
        width: "full",
        options: null,
        custom_options: [],
      };
      return { ...c, fields: [...c.fields, field] };
    });
  }

  function updateOptions(
    listKey: "areas" | "categories",
    next: ContactOption[]
  ) {
    setCfg((c) => (c ? { ...c, [listKey]: next } : c));
  }

  return (
    <>
      <Topbar title="Formulário de contato" />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <AdminHero
          icon={ClipboardList}
          title="Formulário de contratação"
          subtitle="Edite campos, áreas de atuação e tipos de evento do formulário público."
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-white/10 bg-ink/60 p-1">
            {(
              [
                ["fields", "Campos"],
                ["areas", "Áreas de atuação"],
                ["categories", "Tipos de evento"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === id
                    ? "bg-gold text-ink"
                    : "text-white/55 hover:text-gold"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {writable && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:border-gold/40 hover:text-gold"
              >
                <RotateCcw size={12} />
                Voltar ao padrão
              </button>
            )}
            <button
              type="button"
              disabled={!writable || saving}
              onClick={save}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {msg && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            {msg}
          </p>
        )}
        {err && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {err}
          </p>
        )}

        {tab === "fields" && (
          <section className="space-y-3 rounded-2xl border border-white/10 bg-ink-card p-5">
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">
                Texto do botão enviar
              </span>
              <input
                value={cfg.submit_label}
                disabled={!writable}
                onChange={(e) =>
                  setCfg((c) =>
                    c ? { ...c, submit_label: e.target.value } : c
                  )
                }
                className={inputCls}
              />
            </label>

            <div className="space-y-2">
              {cfg.fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`rounded-xl border border-white/10 bg-ink/50 p-3 ${
                    field.enabled ? "" : "opacity-55"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold/80">
                      {SYSTEM_FIELD_KEYS.has(field.key)
                        ? "Campo do sistema"
                        : "Campo extra"}
                      {!field.enabled ? " · oculto" : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <IconBtn
                        title="Subir"
                        disabled={!writable || index === 0}
                        onClick={() => moveField(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </IconBtn>
                      <IconBtn
                        title="Descer"
                        disabled={!writable || index === cfg.fields.length - 1}
                        onClick={() => moveField(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </IconBtn>
                      <IconBtn
                        title={field.enabled ? "Ocultar" : "Mostrar"}
                        disabled={!writable}
                        onClick={() =>
                          updateField(index, { enabled: !field.enabled })
                        }
                      >
                        {field.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </IconBtn>
                      <IconBtn
                        title={
                          SYSTEM_FIELD_KEYS.has(field.key)
                            ? "Ocultar campo do sistema"
                            : "Excluir"
                        }
                        disabled={!writable}
                        onClick={() => removeField(index)}
                      >
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <FieldInput
                      label="Rótulo"
                      value={field.label}
                      disabled={!writable}
                      onChange={(v) => updateField(index, { label: v })}
                    />
                    <FieldInput
                      label="Placeholder"
                      value={field.placeholder || ""}
                      disabled={!writable}
                      onChange={(v) => updateField(index, { placeholder: v })}
                    />
                    <label className="block text-xs text-white/50">
                      Tipo
                      <div className="mt-1">
                        <ThemedSelect
                          value={field.type}
                          disabled={!writable || SYSTEM_FIELD_KEYS.has(field.key)}
                          onChange={(v) =>
                            updateField(index, {
                              type: v as ContactFormField["type"],
                              options:
                                v === "select"
                                  ? field.options || "custom"
                                  : null,
                            })
                          }
                          options={[
                            { value: "text", label: "Texto" },
                            { value: "email", label: "E-mail" },
                            { value: "tel", label: "Telefone" },
                            { value: "textarea", label: "Texto longo" },
                            { value: "select", label: "Lista (select)" },
                          ]}
                        />
                      </div>
                    </label>
                    <label className="block text-xs text-white/50">
                      Largura
                      <div className="mt-1">
                        <ThemedSelect
                          value={field.width}
                          disabled={!writable}
                          onChange={(v) =>
                            updateField(index, {
                              width: v === "half" ? "half" : "full",
                            })
                          }
                          options={[
                            { value: "full", label: "Linha inteira" },
                            { value: "half", label: "Meia linha" },
                          ]}
                        />
                      </div>
                    </label>
                  </div>

                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-white/55">
                    <input
                      type="checkbox"
                      checked={field.required}
                      disabled={!writable}
                      onChange={(e) =>
                        updateField(index, { required: e.target.checked })
                      }
                    />
                    Obrigatório
                  </label>

                  {field.type === "select" &&
                    !SYSTEM_FIELD_KEYS.has(field.key) && (
                      <label className="mt-2 block text-xs text-white/50">
                        Fonte das opções
                        <div className="mt-1">
                          <ThemedSelect
                            value={field.options || "custom"}
                            disabled={!writable}
                            onChange={(v) =>
                              updateField(index, {
                                options: v as
                                  | "areas"
                                  | "categories"
                                  | "custom",
                              })
                            }
                            options={[
                              { value: "areas", label: "Áreas de atuação" },
                              {
                                value: "categories",
                                label: "Tipos de evento",
                              },
                              { value: "custom", label: "Opções próprias" },
                            ]}
                          />
                        </div>
                      </label>
                    )}
                </div>
              ))}
            </div>

            {writable && (
              <button
                type="button"
                onClick={addCustomField}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-xs font-semibold text-white/70 hover:border-gold/50 hover:text-gold"
              >
                <Plus size={14} />
                Adicionar campo
              </button>
            )}
            <p className="text-[11px] text-white/35">
              Campos do sistema (nome, e-mail, etc.) não são apagados — só
              ocultados. Campos extras vão no lead como informações
              adicionais.
            </p>
          </section>
        )}

        {tab === "areas" && (
          <OptionsEditor
            title="Áreas de atuação"
            items={cfg.areas}
            writable={writable}
            onChange={(items) => updateOptions("areas", items)}
          />
        )}

        {tab === "categories" && (
          <OptionsEditor
            title="Tipos de evento"
            items={cfg.categories}
            writable={writable}
            onChange={(items) => updateOptions("categories", items)}
          />
        )}
      </div>
    </>
  );
}

function OptionsEditor({
  title,
  items,
  writable,
  onChange,
}: {
  title: string;
  items: ContactOption[];
  writable: boolean;
  onChange: (items: ContactOption[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-ink-card p-5">
      <h2 className="font-display text-lg font-bold text-gold">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink/50 px-3 py-2"
          >
            <input
              value={item.label}
              disabled={!writable}
              onChange={(e) => {
                const label = e.target.value;
                const next = items.map((it, idx) =>
                  idx === i
                    ? {
                        ...it,
                        label,
                        id:
                          it.id === "outros"
                            ? "outros"
                            : slugifyOption(label) || it.id,
                      }
                    : it
                );
                onChange(next);
              }}
              className={`${inputCls} flex-1`}
            />
            <IconBtn
              title="Subir"
              disabled={!writable || i === 0}
              onClick={() => move(i, -1)}
            >
              <ArrowUp size={14} />
            </IconBtn>
            <IconBtn
              title="Descer"
              disabled={!writable || i === items.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDown size={14} />
            </IconBtn>
            <IconBtn
              title="Excluir"
              disabled={!writable}
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 size={14} />
            </IconBtn>
          </div>
        ))}
      </div>
      {writable && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...items,
              { id: `novo_${Date.now()}`, label: "Nova opção" },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-xs font-semibold text-white/70 hover:border-gold/50 hover:text-gold"
        >
          <Plus size={14} />
          Adicionar opção
        </button>
      )}
    </section>
  );
}

function FieldInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} mt-1`}
      />
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-white/10 p-1.5 text-white/55 transition hover:border-gold/40 hover:text-gold disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold disabled:opacity-60";
