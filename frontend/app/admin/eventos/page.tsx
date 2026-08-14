"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import {
  Plus,
  Copy,
  Trash2,
  CalendarDays,
  List,
  Download,
  MapPin,
  Search,
  Ticket,
  Save,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, resultsOf } from "@/lib/api";
import type { EventItem, EventStatus } from "@/lib/types";
import { dayOf, formatFullDate, formatTime, groupByMonth, monthShort, MONTHS_PT } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import ThemedSelect from "@/components/ui/ThemedSelect";
import {
  CARD_BG_OPTIONS,
  type CardBgPreset,
  presetSwatchStyle,
} from "@/lib/eventCardBg";

const STATUSES: { value: EventStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "publicado", label: "Publicado" },
  { value: "realizado", label: "Realizado" },
  { value: "oculto", label: "Oculto" },
  { value: "cancelado", label: "Cancelado" },
];

const EMPTY_FORM = {
  name: "Rei dos Peão",
  date: "",
  time: "21:00",
  venue: "",
  city: "",
  state: "PR",
  tickets_link: "",
  external_link: "",
  description: "",
  banner_url: "",
  card_bg_preset: "chair" as CardBgPreset,
  card_bg_color: "#121212",
  card_bg_image_url: "",
  status: "rascunho" as EventStatus,
  internal_notes: "",
  hide_override: "global",
  hide_days_after: 1,
};

export default function EventosPage() {
  const { canWrite } = useAuth();
  const writable = canWrite("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selected, setSelected] = useState<number[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (stateFilter) params.set("state", stateFilter);
    params.set("page_size", "200");
    const data = await api.get<{ results: EventItem[] } | EventItem[]>(
      `/events/?${params}`
    );
    setEvents(resultsOf(data));
  }, [status, search, stateFilter]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal("create");
  }

  function openEdit(e: EventItem) {
    setEditing(e);
    setForm({
      name: e.name,
      date: e.date,
      time: e.time ? e.time.slice(0, 5) : "21:00",
      venue: e.venue,
      city: e.city,
      state: e.state,
      tickets_link: e.tickets_link,
      external_link: e.external_link,
      description: e.description,
      banner_url: e.banner_url,
      card_bg_preset: (e.card_bg_preset || "chair") as CardBgPreset,
      card_bg_color: e.card_bg_color || "#121212",
      card_bg_image_url: e.card_bg_image_url || "",
      status: e.status,
      internal_notes: e.internal_notes,
      hide_override: e.hide_override,
      hide_days_after: e.hide_days_after,
    });
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        time: form.time ? `${form.time}:00` : null,
      };
      if (editing) {
        await api.patch(`/events/${editing.id}/`, payload);
      } else {
        await api.post("/events/", payload);
      }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function duplicate(e: EventItem) {
    await api.post(`/events/${e.id}/duplicate/`);
    await load();
  }

  async function remove(e: EventItem) {
    if (!confirm(`Excluir "${e.name} — ${e.city}"?`)) return;
    await api.delete(`/events/${e.id}/`);
    await load();
  }

  async function bulkStatus(newStatus: EventStatus) {
    if (selected.length === 0) return;
    await api.post("/events/bulk/", { ids: selected, status: newStatus });
    setSelected([]);
    await load();
  }

  const toggle = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );

  const calendarDays = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday start
    const days: { date: Date; inMonth: boolean; events: EventItem[] }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        date: d,
        inMonth: d.getMonth() === calMonth.m,
        events: events.filter((e) => e.date === key),
      });
    }
    return days;
  }, [calMonth, events]);

  const eventsByMonth = useMemo(() => groupByMonth(events), [events]);

  const colSpan = writable ? 6 : 5;

  return (
    <>
      <Topbar title="Eventos" />
      <div className="space-y-5 p-6">
        <AdminHero
          icon={CalendarDays}
          title="Agenda de eventos"
          subtitle="Cadastre shows, publique na página e controle status em lote."
          stats={[
            {
              label: "Total",
              value: events.length,
              icon: Ticket,
            },
            {
              label: "Publicados",
              value: events.filter((e) => e.status === "publicado").length,
              icon: CalendarDays,
            },
            {
              label: "Cidades",
              value: new Set(events.map((e) => e.city).filter(Boolean)).size,
              icon: MapPin,
            },
          ]}
          actions={
            writable ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-full admin-tone-btn px-4 py-2.5 text-sm font-semibold shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--admin-tone)_55%,transparent)] transition hover:scale-[1.02]"
              >
                <Plus size={16} /> Novo evento
              </button>
            ) : undefined
          }
        />

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 admin-glass p-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome/cidade..."
              className="rounded-lg border border-white/10 bg-ink py-2 pl-9 pr-3 text-sm outline-none focus:border-gold"
            />
          </div>
          <ThemedSelect
            compact
            className="min-w-[9rem]"
            value={status}
            onChange={setStatus}
            options={STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
          <ThemedSelect
            compact
            className="min-w-[9rem]"
            value={stateFilter}
            onChange={setStateFilter}
            options={[
              { value: "", label: "Todos os estados" },
              ...["PR", "SC", "RS", "SP"].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />

          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 text-xs text-white/40">
              {events.length} evento{events.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg p-2 ${view === "list" ? "bg-gold/20 text-gold" : "text-white/50 hover:text-white"}`}
              title="Lista"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`rounded-lg p-2 ${view === "calendar" ? "bg-gold/20 text-gold" : "text-white/50 hover:text-white"}`}
              title="Calendário"
            >
              <CalendarDays size={18} />
            </button>
            <a
              href="/api/exports/events"
              className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-gold/40 hover:text-gold"
              title="Exportar CSV"
            >
              <Download size={18} />
            </a>
          </div>
        </div>

        {selected.length > 0 && writable && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
            <span>{selected.length} selecionado(s)</span>
            <button
              onClick={() => bulkStatus("publicado")}
              className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-300"
            >
              Publicar
            </button>
            <button
              onClick={() => bulkStatus("oculto")}
              className="rounded-full bg-white/10 px-3 py-1"
            >
              Ocultar
            </button>
            <button
              onClick={() => bulkStatus("cancelado")}
              className="rounded-full bg-red-500/20 px-3 py-1 text-red-300"
            >
              Cancelar
            </button>
            <button
              onClick={() => setSelected([])}
              className="ml-auto text-white/50 hover:text-white"
            >
              Limpar
            </button>
          </div>
        )}

        {view === "list" ? (
          <div className="overflow-hidden admin-glass">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-soft text-white/50">
                <tr>
                  {writable && <th className="w-10 px-3 py-3" />}
                  <th className="px-3 py-3">Data</th>
                  <th className="px-3 py-3">Evento</th>
                  <th className="px-3 py-3">Cidade</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {eventsByMonth.map((group) => {
                  const groupIds = group.items.map((e) => e.id);
                  const allSelected =
                    groupIds.length > 0 &&
                    groupIds.every((id) => selected.includes(id));
                  const someSelected =
                    !allSelected &&
                    groupIds.some((id) => selected.includes(id));

                  return (
                    <Fragment key={group.key}>
                      <tr className="border-t border-white/10 bg-ink-soft/80">
                        {writable && (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={() => {
                                setSelected((prev) => {
                                  if (allSelected) {
                                    return prev.filter(
                                      (id) => !groupIds.includes(id)
                                    );
                                  }
                                  const set = new Set([...prev, ...groupIds]);
                                  return Array.from(set);
                                });
                              }}
                              title={`Selecionar ${group.label}`}
                            />
                          </td>
                        )}
                        <td colSpan={5} className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-sm font-bold text-gold">
                              {group.label}
                            </span>
                            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">
                              {group.items.length} show
                              {group.items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.items.map((e) => (
                        <tr
                          key={e.id}
                          className="border-t border-white/5 hover:bg-white/[0.03]"
                        >
                          {writable && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selected.includes(e.id)}
                                onChange={() => toggle(e.id)}
                              />
                            </td>
                          )}
                          <td className="whitespace-nowrap px-3 py-3">
                            <span className="font-semibold text-gold">
                              {dayOf(e.date)} {monthShort(e.date)}
                            </span>
                            {e.time && (
                              <span className="ml-2 text-white/40">
                                {formatTime(e.time)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => openEdit(e)}
                              className="font-medium hover:text-gold"
                            >
                              {e.name}
                            </button>
                            {e.venue && (
                              <p className="text-xs text-white/40">{e.venue}</p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {e.city}/{e.state}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge
                              status={e.status}
                              label={e.status_display}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              {writable && (
                                <>
                                  <button
                                    onClick={() => duplicate(e)}
                                    title="Duplicar"
                                    className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-gold"
                                  >
                                    <Copy size={15} />
                                  </button>
                                  <button
                                    onClick={() => remove(e)}
                                    title="Excluir"
                                    className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-red-400"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td
                      colSpan={colSpan}
                      className="px-3 py-10 text-center text-white/40"
                    >
                      Nenhum evento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-glass p-5">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() =>
                  setCalMonth((c) => {
                    const d = new Date(c.y, c.m - 1, 1);
                    return { y: d.getFullYear(), m: d.getMonth() };
                  })
                }
                className="rounded-lg border border-white/10 px-3 py-1 text-sm"
              >
                â†
              </button>
              <h2 className="font-display text-lg font-bold">
                {MONTHS_PT[calMonth.m]} {calMonth.y}
              </h2>
              <button
                onClick={() =>
                  setCalMonth((c) => {
                    const d = new Date(c.y, c.m + 1, 1);
                    return { y: d.getFullYear(), m: d.getMonth() };
                  })
                }
                className="rounded-lg border border-white/10 px-3 py-1 text-sm"
              >
                →
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/40">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <div key={d} className="py-2 font-semibold">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  className={`min-h-[80px] rounded-lg border border-white/5 p-1.5 ${
                    day.inMonth ? "bg-ink" : "bg-ink-soft/40 opacity-40"
                  }`}
                >
                  <div className="text-xs text-white/50">
                    {day.date.getDate()}
                  </div>
                  {day.events.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => openEdit(e)}
                      className="mt-0.5 block w-full truncate rounded bg-gold/20 px-1 py-0.5 text-left text-[10px] text-gold hover:bg-gold/30"
                    >
                      {e.city}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto admin-glass p-6">
            <h2 className="font-display text-xl font-bold">
              {editing ? "Editar evento" : "Novo evento"}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Status">
                <ThemedSelect
                  value={form.status}
                  onChange={(v) =>
                    setForm({ ...form, status: v as EventStatus })
                  }
                  options={STATUSES.filter((s) => s.value).map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </Field>
              <Field label="Data">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Horário">
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Estado">
                <input
                  maxLength={2}
                  value={form.state}
                  onChange={(e) =>
                    setForm({ ...form, state: e.target.value.toUpperCase() })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Local">
                <input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Banner do topo (opcional)">
                <input
                  value={form.banner_url}
                  onChange={(e) =>
                    setForm({ ...form, banner_url: e.target.value })
                  }
                  className={inputCls}
                  placeholder="Vazio = textura suave (recomendado)"
                />
              </Field>
              <p className="sm:col-span-2 -mt-2 text-xs text-white/35">
                Deixe o banner vazio para usar a textura suave fixa no topo. Só
                preencha se quiser uma imagem específica neste show.
              </p>

              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs text-white/50">
                  Fundo do card de detalhes
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CARD_BG_OPTIONS.map((opt) => {
                    const active = form.card_bg_preset === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            card_bg_preset: opt.value,
                          })
                        }
                        className={`overflow-hidden rounded-xl border text-left transition ${
                          active
                            ? "border-gold ring-1 ring-gold/40"
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        <div
                          className="h-14 w-full"
                          style={presetSwatchStyle(
                            opt.value,
                            form.card_bg_color
                          )}
                        />
                        <div className="px-2.5 py-2">
                          <p className="text-xs font-semibold text-white">
                            {opt.label}
                          </p>
                          <p className="text-[10px] text-white/40">{opt.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {form.card_bg_preset === "solid" && (
                <Field label="Cor do card">
                  <input
                    type="color"
                    value={form.card_bg_color || "#121212"}
                    onChange={(e) =>
                      setForm({ ...form, card_bg_color: e.target.value })
                    }
                    className="h-10 w-full cursor-pointer rounded border border-white/10"
                  />
                </Field>
              )}
              {form.card_bg_preset === "custom_image" && (
                <Field label="URL da imagem do card">
                  <input
                    value={form.card_bg_image_url}
                    onChange={(e) =>
                      setForm({ ...form, card_bg_image_url: e.target.value })
                    }
                    className={inputCls}
                    placeholder="/images/... ou https://..."
                  />
                </Field>
              )}

              <Field label="Link de ingressos">
                <input
                  value={form.tickets_link}
                  onChange={(e) =>
                    setForm({ ...form, tickets_link: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Link externo">
                <input
                  value={form.external_link}
                  onChange={(e) =>
                    setForm({ ...form, external_link: e.target.value })
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Ocultação">
                <ThemedSelect
                  value={form.hide_override}
                  onChange={(v) => setForm({ ...form, hide_override: v })}
                  options={[
                    { value: "global", label: "Regra global" },
                    { value: "immediate", label: "Imediatamente" },
                    { value: "next_day", label: "1 dia depois" },
                    { value: "days_after", label: "X dias depois" },
                    { value: "never", label: "Nunca ocultar" },
                  ]}
                />
              </Field>
              {form.hide_override === "days_after" && (
                <Field label="Dias após">
                  <input
                    type="number"
                    min={1}
                    value={form.hide_days_after}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        hide_days_after: Number(e.target.value),
                      })
                    }
                    className={inputCls}
                  />
                </Field>
              )}
              <div className="sm:col-span-2">
                <Field label="Descrição">
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Observações internas">
                  <textarea
                    rows={2}
                    value={form.internal_notes}
                    onChange={(e) =>
                      setForm({ ...form, internal_notes: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(null)}
                className="rounded-full border border-white/15 px-5 py-2 text-sm"
              >
                Cancelar
              </button>
              {writable && (
                <button
                  onClick={save}
                  disabled={saving || !form.date || !form.city}
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  <Save size={15} />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              )}
            </div>
            {editing && (
              <p className="mt-3 text-xs text-white/30">
                {formatFullDate(editing.date)} · slug: {editing.slug}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none focus:border-gold";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colors: Record<string, string> = {
    rascunho: "bg-white/10 text-white/60",
    publicado: "bg-emerald-500/15 text-emerald-300",
    realizado: "bg-sky-500/15 text-sky-300",
    oculto: "bg-zinc-500/20 text-zinc-300",
    cancelado: "bg-red-500/15 text-red-300",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || ""}`}
    >
      {label}
    </span>
  );
}
