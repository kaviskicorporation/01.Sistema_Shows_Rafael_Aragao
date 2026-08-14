"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Settings2, X, Kanban, Columns3, GripVertical, Flame, Save } from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import { api, resultsOf } from "@/lib/api";
import type { CardItem, KanbanColumn } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import ThemedSelect from "@/components/ui/ThemedSelect";

const PRIORITY_COLORS = {
  alta: "bg-red-500",
  media: "bg-amber-400",
  baixa: "bg-sky-400",
};

export default function CrmPage() {
  const { canWrite } = useAuth();
  const writable = canWrite("crm");
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<CardItem | null>(null);
  const [colModal, setColModal] = useState(false);
  const [leadModal, setLeadModal] = useState(false);
  const [lossPrompt, setLossPrompt] = useState<{
    cardId: number;
    columnId: number;
  } | null>(null);
  const [lossReason, setLossReason] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const load = useCallback(async () => {
    const [cols, cds] = await Promise.all([
      api.get<{ results: KanbanColumn[] } | KanbanColumn[]>("/columns/"),
      api.get<{ results: CardItem[] } | CardItem[]>("/cards/?page_size=500"),
    ]);
    setColumns(resultsOf(cols).sort((a, b) => a.order - b.order));
    setCards(resultsOf(cds));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const cardsByCol = useMemo(() => {
    const map = new Map<number, CardItem[]>();
    for (const c of columns) map.set(c.id, []);
    for (const card of cards) {
      const list = map.get(card.column);
      if (list) list.push(card);
      else map.set(card.column, [card]);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [columns, cards]);

  const activeCard = cards.find((c) => c.id === activeId) || null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  async function moveCard(
    cardId: number,
    columnId: number,
    order: number,
    reason = ""
  ) {
    const updated = await api.post<CardItem>(`/cards/${cardId}/move/`, {
      column: columnId,
      order,
      loss_reason: reason,
    });
    setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
    if (selected?.id === cardId) setSelected(updated);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !writable) return;

    const cardId = Number(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    let targetColId: number;
    let order = 0;

    const overId = String(over.id);
    if (overId.startsWith("col-")) {
      targetColId = Number(overId.replace("col-", ""));
      order = (cardsByCol.get(targetColId) || []).length;
    } else {
      const overCard = cards.find((c) => c.id === Number(overId));
      if (!overCard) return;
      targetColId = overCard.column;
      order = overCard.order;
    }

    const targetCol = columns.find((c) => c.id === targetColId);
    if (targetCol?.is_lost && !card.loss_reason) {
      setLossPrompt({ cardId, columnId: targetColId });
      return;
    }

    // Optimistic
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, column: targetColId, order } : c
      )
    );
    await moveCard(cardId, targetColId, order);
  }

  async function confirmLoss() {
    if (!lossPrompt || !lossReason.trim()) return;
    await moveCard(
      lossPrompt.cardId,
      lossPrompt.columnId,
      0,
      lossReason.trim()
    );
    setLossPrompt(null);
    setLossReason("");
  }

  async function openCard(id: number) {
    const full = await api.get<CardItem>(`/cards/${id}/`);
    setSelected(full);
  }

  async function updateCard(patch: Partial<CardItem>) {
    if (!selected) return;
    const updated = await api.patch<CardItem>(`/cards/${selected.id}/`, patch);
    setSelected(updated);
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function addComment(text: string) {
    if (!selected || !text.trim()) return;
    await api.post(`/cards/${selected.id}/comments/`, { text });
    await openCard(selected.id);
  }

  async function addChecklist(text: string) {
    if (!selected || !text.trim()) return;
    await api.post("/checklist-items/", {
      card: selected.id,
      text,
      order: selected.checklist.length,
    });
    await openCard(selected.id);
  }

  async function toggleCheck(itemId: number, done: boolean) {
    await api.patch(`/checklist-items/${itemId}/`, { done });
    if (selected) await openCard(selected.id);
  }

  return (
    <>
      <Topbar title="CRM Kanban" />
      <div className="space-y-4 p-6">
        <AdminHero
          icon={Kanban}
          title="CRM Kanban"
          subtitle="Arraste os cards entre as colunas. Priorize leads e feche contratos."
          stats={[
            {
              label: "Colunas",
              value: columns.length,
              icon: Columns3,
            },
            {
              label: "Cards",
              value: cards.length,
              icon: GripVertical,
            },
            {
              label: "Alta prioridade",
              value: cards.filter((c) => c.priority === "alta").length,
              icon: Flame,
            },
          ]}
          actions={
            writable ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLeadModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--theme-primary)_55%,transparent)] transition hover:scale-[1.02]"
                >
                  <Plus size={16} /> Novo lead
                </button>
                <button
                  onClick={() => setColModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-ink/40 px-4 py-2.5 text-sm transition hover:border-gold hover:text-gold"
                >
                  <Settings2 size={16} /> Gerenciar colunas
                </button>
              </div>
            ) : undefined
          }
        />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4 thin-scroll">
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={cardsByCol.get(col.id) || []}
                onOpen={openCard}
                disabled={!writable}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard ? <CardPreview card={activeCard} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card detail */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-ink-card p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold">
                  {selected.lead.name}
                </h2>
                <p className="text-sm text-white/50">
                  {selected.lead.area_display} · {selected.lead.email}
                </p>
              </div>
              <button onClick={() => setSelected(null)}>
                <X size={20} className="text-white/50" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-xs text-white/50">
                Prioridade
                <div className="mt-1">
                  <ThemedSelect
                    disabled={!writable}
                    value={selected.priority}
                    onChange={(v) =>
                      updateCard({
                        priority: v as CardItem["priority"],
                      })
                    }
                    options={[
                      { value: "alta", label: "Alta" },
                      { value: "media", label: "Média" },
                      { value: "baixa", label: "Baixa" },
                    ]}
                  />
                </div>
              </label>
              <label className="text-xs text-white/50">
                Follow-up
                <input
                  type="date"
                  disabled={!writable}
                  value={selected.follow_up_date || ""}
                  onChange={(e) =>
                    updateCard({ follow_up_date: e.target.value || null })
                  }
                  className={inputCls}
                />
              </label>
              <label className="text-xs text-white/50">
                Cor do card
                <input
                  type="color"
                  disabled={!writable}
                  value={selected.color || "#1b1b21"}
                  onChange={(e) => updateCard({ color: e.target.value })}
                  className="mt-1 h-9 w-full cursor-pointer rounded border border-white/10 bg-ink"
                />
              </label>
              <label className="text-xs text-white/50">
                Telefone
                <input
                  readOnly
                  value={selected.lead.phone}
                  className={inputCls}
                />
              </label>
            </div>

            {selected.lead.message && (
              <div className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-white/70">
                {selected.lead.message}
              </div>
            )}

            {selected.loss_reason && (
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                Motivo da perda: {selected.loss_reason}
              </div>
            )}

            {/* Checklist */}
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-gold">Checklist</h3>
              <ul className="mt-2 space-y-1">
                {selected.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.done}
                      disabled={!writable}
                      onChange={(e) => toggleCheck(item.id, e.target.checked)}
                    />
                    <span className={item.done ? "line-through opacity-50" : ""}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              {writable && (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem(
                      "check"
                    ) as HTMLInputElement;
                    addChecklist(input.value);
                    input.value = "";
                  }}
                >
                  <input
                    name="check"
                    placeholder="Nova tarefa..."
                    className={inputCls}
                  />
                  <button type="submit" className="rounded-lg bg-gold/20 px-3 text-gold">
                    <Plus size={16} />
                  </button>
                </form>
              )}
            </section>

            {/* Comments */}
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-gold">Comentários</h3>
              <ul className="mt-2 space-y-2">
                {selected.comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-white/5 p-3 text-sm">
                    <p className="text-xs text-white/40">
                      {c.author_name} · {formatDateTime(c.created_at)}
                    </p>
                    <p className="mt-1">{c.text}</p>
                  </li>
                ))}
              </ul>
              {writable && (
                <form
                  className="mt-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.elements.namedItem(
                      "comment"
                    ) as HTMLInputElement;
                    addComment(input.value);
                    input.value = "";
                  }}
                >
                  <input
                    name="comment"
                    placeholder="Escrever comentário..."
                    className={inputCls}
                  />
                </form>
              )}
            </section>

            {/* History */}
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-gold">Histórico</h3>
              <ul className="mt-2 space-y-1">
                {selected.history.map((h) => (
                  <li key={h.id} className="text-xs text-white/40">
                    {formatDateTime(h.created_at)} — {h.text}
                    {h.user_name ? ` (${h.user_name})` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* Loss reason prompt */}
      {lossPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-card p-6">
            <h3 className="font-display text-lg font-bold">Motivo da perda</h3>
            <p className="mt-1 text-sm text-white/50">
              Obrigatório ao mover para a coluna Perdido.
            </p>
            <textarea
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              rows={3}
              className={`mt-4 ${inputCls}`}
              placeholder="Por que o lead foi perdido?"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setLossPrompt(null);
                  setLossReason("");
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLoss}
                disabled={!lossReason.trim()}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirmar perda
              </button>
            </div>
          </div>
        </div>
      )}

      {colModal && (
        <ColumnsModal
          columns={columns}
          onClose={() => setColModal(false)}
          onSaved={async () => {
            await load();
            setColModal(false);
          }}
        />
      )}

      {leadModal && (
        <NewLeadModal
          onClose={() => setLeadModal(false)}
          onCreated={async (card) => {
            setLeadModal(false);
            await load();
            setSelected(card);
          }}
        />
      )}
    </>
  );
}

const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none focus:border-gold";

function Column({
  column,
  cards,
  onOpen,
  disabled,
}: {
  column: KanbanColumn;
  cards: CardItem[];
  onOpen: (id: number) => void;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-ink-soft ${
        isOver ? "border-gold/50" : "border-white/10"
      }`}
    >
      <div
        className="flex items-center gap-2 rounded-t-xl px-3 py-3"
        style={{ borderTop: `3px solid ${column.color}` }}
      >
        <h3 className="flex-1 truncate text-sm font-semibold">{column.title}</h3>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
          {cards.length}
        </span>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  card,
  onOpen,
}: {
  card: CardItem;
  onOpen: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeftColor: card.color || undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className={`cursor-grab rounded-lg border border-white/10 bg-ink-card p-3 active:cursor-grabbing min-h-[6.25rem] ${
        card.color ? "border-l-4" : ""
      }`}
    >
      <CardPreview card={card} />
    </div>
  );
}

function CardPreview({
  card,
  dragging,
}: {
  card: CardItem;
  dragging?: boolean;
}) {
  return (
    <div
      className={
        dragging
          ? "flex min-h-[5.5rem] w-72 flex-col rounded-lg border border-gold bg-ink-card p-3 shadow-2xl"
          : "flex min-h-[5.5rem] flex-col"
      }
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_COLORS[card.priority]}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{card.lead.name}</p>
          <p className="truncate text-xs text-white/40">
            {card.lead.area_display || "—"}
          </p>
          {card.follow_up_date && (
            <p className="mt-1 text-[10px] text-amber-300">
              Follow-up: {card.follow_up_date}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex min-h-[1.35rem] flex-wrap gap-1 pt-1.5">
        {card.labels.map((l) => (
          <span
            key={l.id}
            className="rounded px-1.5 py-0.5 text-[10px]"
            style={{ background: `${l.color}33`, color: l.color }}
          >
            {l.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function ColumnsModal({
  columns,
  onClose,
  onSaved,
}: {
  columns: KanbanColumn[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [list, setList] = useState(columns);
  const [newTitle, setNewTitle] = useState("");

  async function saveColumn(col: KanbanColumn) {
    await api.patch(`/columns/${col.id}/`, {
      title: col.title,
      color: col.color,
      is_lost: col.is_lost,
      is_won: col.is_won,
      order: col.order,
    });
  }

  async function addColumn() {
    if (!newTitle.trim()) return;
    await api.post("/columns/", {
      title: newTitle.trim(),
      order: list.length,
      color: "#64748b",
    });
    setNewTitle("");
    onSaved();
  }

  async function removeColumn(id: number) {
    if (!confirm("Excluir coluna? Cards serão movidos para outra coluna.")) return;
    await api.delete(`/columns/${id}/`);
    onSaved();
  }

  async function saveAll() {
    await Promise.all(list.map(saveColumn));
    await api.post("/columns/reorder/", {
      columns: list.map((c, i) => ({ id: c.id, order: i })),
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-ink-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Colunas do Kanban</h2>
            <p className="mt-0.5 text-xs text-white/40">
              Marque <span className="text-emerald-300">Ganho</span> ou{" "}
              <span className="text-red-300">Perdido</span> para a coluna final.
            </p>
          </div>
          <button onClick={onClose}>
            <X size={20} className="text-white/50" />
          </button>
        </div>

        <ul className="mt-5 space-y-3">
          {list.map((col, i) => (
            <li
              key={col.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 p-3"
            >
              <input
                type="color"
                value={col.color}
                onChange={(e) =>
                  setList((prev) =>
                    prev.map((c, idx) =>
                      idx === i ? { ...c, color: e.target.value } : c
                    )
                  )
                }
                className="h-8 w-8 cursor-pointer rounded"
              />
              <input
                value={col.title}
                onChange={(e) =>
                  setList((prev) =>
                    prev.map((c, idx) =>
                      idx === i ? { ...c, title: e.target.value } : c
                    )
                  )
                }
                className="min-w-0 flex-1 rounded border border-white/10 bg-ink px-2 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                <input
                  type="checkbox"
                  checked={col.is_won}
                  onChange={(e) =>
                    setList((prev) =>
                      prev.map((c, idx) =>
                        idx === i ? { ...c, is_won: e.target.checked } : c
                      )
                    )
                  }
                  className="accent-emerald-400"
                />
                Ganho
              </label>
              <label className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300">
                <input
                  type="checkbox"
                  checked={col.is_lost}
                  onChange={(e) =>
                    setList((prev) =>
                      prev.map((c, idx) =>
                        idx === i ? { ...c, is_lost: e.target.checked } : c
                      )
                    )
                  }
                  className="accent-red-400"
                />
                Perdido
              </label>
              <button
                onClick={() => removeColumn(col.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nova coluna..."
            className="flex-1 rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm"
          />
          <button
            onClick={addColumn}
            className="rounded-lg bg-white/10 px-3 text-sm hover:bg-white/15"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={saveAll}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink"
          >
            <Save size={15} />
            Salvar colunas
          </button>
        </div>
      </div>
    </div>
  );
}

const LEAD_CATEGORIES = [
  { value: "corporativo", label: "Evento corporativo" },
  { value: "particular", label: "Evento particular" },
  { value: "prefeitura", label: "Prefeitura" },
  { value: "casa_shows", label: "Casa de shows" },
  { value: "teatro", label: "Teatro" },
  { value: "festival", label: "Festival" },
  { value: "comercial", label: "Comercial" },
  { value: "outros", label: "Outros" },
];

const AREA_OPTIONS = [
  "Eventos / Produção",
  "Marketing / Comunicação",
  "RH / Endomarketing",
  "Agência",
  "Construção Civil",
  "Setor Público / Prefeitura",
  "Serviços",
  "outros",
];

function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (card: CardItem) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [categories, setCategories] = useState(LEAD_CATEGORIES);
  const [areas, setAreas] = useState(AREA_OPTIONS);
  const [form, setForm] = useState({
    name: "",
    area_atuacao: AREA_OPTIONS[0],
    area_outros: "",
    email: "",
    phone: "",
    category: "corporativo",
    message: "",
  });

  useEffect(() => {
    api
      .get<{
        contact_form_config?: {
          areas?: { id: string; label: string }[];
          categories?: { id: string; label: string }[];
        };
      }>("/site-config/")
      .then((data) => {
        const areasCfg = data.contact_form_config?.areas;
        const catsCfg = data.contact_form_config?.categories;
        if (areasCfg?.length) {
          const labels = areasCfg.map((a) =>
            a.id === "outros" ? "outros" : a.label
          );
          setAreas(labels);
          setForm((f) => ({ ...f, area_atuacao: labels[0] || f.area_atuacao }));
        }
        if (catsCfg?.length) {
          const cats = catsCfg.map((c) => ({ value: c.id, label: c.label }));
          setCategories(cats);
          setForm((f) => ({
            ...f,
            category: cats[0]?.value || f.category,
          }));
        }
      })
      .catch(() => {});
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setErr("Preencha nome, e-mail e telefone.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const card = await api.post<CardItem>("/cards/create-lead/", {
        name: form.name.trim(),
        area_atuacao: form.area_atuacao,
        area_outros:
          form.area_atuacao === "outros" ? form.area_outros.trim() : "",
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
        message: form.message.trim(),
      });
      await onCreated(card);
    } catch (error) {
      setErr(
        error instanceof Error ? error.message : "Não foi possível criar o lead."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => void submit(e)}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-ink-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Plus size={18} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">Novo lead</h2>
              <p className="mt-0.5 text-xs text-white/40">
                Entra direto na primeira coluna do Kanban.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}>
            <X size={20} className="text-white/50" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-xs text-white/50">
            Nome / empresa
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Ex.: Prefeitura de Curitiba"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/50">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputCls}
                required
              />
            </label>
            <label className="block text-xs text-white/50">
              Telefone
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
                required
              />
            </label>
          </div>
          <label className="block text-xs text-white/50">
            Tipo de evento
            <div className="mt-1">
              <ThemedSelect
                value={form.category}
                onChange={(v) => set("category", v)}
                options={categories.map((c) => ({
                  value: c.value,
                  label: c.label,
                }))}
              />
            </div>
          </label>
          <label className="block text-xs text-white/50">
            Área de atuação
            <div className="mt-1">
              <ThemedSelect
                value={form.area_atuacao}
                onChange={(v) => set("area_atuacao", v)}
                options={areas.map((a) => ({
                  value: a,
                  label: a === "outros" ? "Outros" : a,
                }))}
              />
            </div>
          </label>
          {form.area_atuacao === "outros" && (
            <label className="block text-xs text-white/50">
              Descreva a área
              <input
                value={form.area_outros}
                onChange={(e) => set("area_outros", e.target.value)}
                className={inputCls}
                required
              />
            </label>
          )}
          <label className="block text-xs text-white/50">
            Observações
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              className={inputCls}
              placeholder="Detalhes do contato, data desejada..."
            />
          </label>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {saving ? "Criando..." : "Criar lead"}
          </button>
        </div>
      </form>
    </div>
  );
}
