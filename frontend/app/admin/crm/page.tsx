"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Flame,
  Handshake,
  History,
  Layers,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  Plus,
  Save,
  Search,
  Send,
  Settings2,
  StickyNote,
  Tag,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import EmailThreadPanel from "@/components/admin/EmailThreadPanel";
import { api, resultsOf, ApiError } from "@/lib/api";
import type { CardItem, KanbanColumn, Label } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import {
  detectEmailProvider,
  EMAIL_PROVIDER_META,
  emailComposeUrl,
  whatsappUrl,
} from "@/lib/contactLinks";
import { useAuth } from "@/lib/auth";
import ThemedSelect from "@/components/ui/ThemedSelect";

const PRIORITY_META = {
  alta: {
    label: "Alta",
    dot: "bg-red-500",
    chip: "bg-white/8 text-white/70 border-white/12",
    btn: "border-gold/40 bg-gold text-ink",
    idle: "border-white/8 bg-white/[0.03] text-white/50 hover:border-white/16 hover:text-white/80",
  },
  media: {
    label: "Média",
    dot: "bg-amber-400",
    chip: "bg-white/8 text-white/70 border-white/12",
    btn: "border-gold/40 bg-gold text-ink",
    idle: "border-white/8 bg-white/[0.03] text-white/50 hover:border-white/16 hover:text-white/80",
  },
  baixa: {
    label: "Baixa",
    dot: "bg-white/50",
    chip: "bg-white/8 text-white/70 border-white/12",
    btn: "border-gold/40 bg-gold text-ink",
    idle: "border-white/8 bg-white/[0.03] text-white/50 hover:border-white/16 hover:text-white/80",
  },
};

const CARD_SWATCHES = [
  "",
  "#ef4444",
  "#f97316",
  "#f5b301",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

type DrawerTab = "chat" | "notes" | "files" | "history" | "emails";

const DRAWER_TABS: {
  id: DrawerTab;
  label: string;
  Icon: typeof MessageSquare;
  active: string;
  idle: string;
}[] = [
  {
    id: "chat",
    label: "Chat",
    Icon: MessageSquare,
    active: "bg-sky-400 text-ink",
    idle: "text-sky-300/70 hover:bg-sky-400/10 hover:text-sky-200",
  },
  {
    id: "notes",
    label: "Anotações",
    Icon: StickyNote,
    active: "bg-amber-400 text-ink",
    idle: "text-amber-300/70 hover:bg-amber-400/10 hover:text-amber-200",
  },
  {
    id: "files",
    label: "Anexos",
    Icon: Paperclip,
    active: "bg-emerald-400 text-ink",
    idle: "text-emerald-300/70 hover:bg-emerald-400/10 hover:text-emerald-200",
  },
  {
    id: "history",
    label: "Histórico",
    Icon: History,
    active: "bg-violet-400 text-ink",
    idle: "text-violet-300/70 hover:bg-violet-400/10 hover:text-violet-200",
  },
  {
    id: "emails",
    label: "Troca de e-mails",
    Icon: Mail,
    active: "bg-indigo-400 text-ink",
    idle: "text-indigo-300/70 hover:bg-indigo-400/10 hover:text-indigo-200",
  },
];

type QuickFilter = "all" | "overdue" | "today" | "alta" | "sem_retorno";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d) < today;
}

function isFollowUpToday(dateStr: string | null) {
  if (!dateStr) return false;
  const t = new Date();
  const key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return dateStr === key;
}

function formatFollowUpShort(dateStr: string) {
  if (isFollowUpToday(dateStr)) return "Hoje";
  if (isOverdue(dateStr)) return "Atrasado";
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "1 dia";
  return `${days} dias`;
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 45_000) return "agora";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return formatDateTime(iso);
}

function wasEdited(created?: string, updated?: string) {
  if (!created || !updated) return false;
  return new Date(updated).getTime() - new Date(created).getTime() > 4000;
}

function chatDayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function chatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - that.getTime()) / 86400000;
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR");
}

export default function CrmPage() {
  const { canWrite, user } = useAuth();
  const writable = canWrite("crm");
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selected, setSelected] = useState<CardItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("chat");
  const [colModal, setColModal] = useState(false);
  const [leadModal, setLeadModal] = useState(false);
  const [labelModal, setLabelModal] = useState(false);
  const [lossPrompt, setLossPrompt] = useState<{
    cardId: number;
    columnId: number;
  } | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<number | "all">("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState<CardItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState("");
  const [flashErr, setFlashErr] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const handledQuery = useRef("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const load = useCallback(async () => {
    const [cols, cds, lbs] = await Promise.all([
      api.get<{ results: KanbanColumn[] } | KanbanColumn[]>("/columns/"),
      api.get<{ results: CardItem[] } | CardItem[]>("/cards/?page_size=500"),
      api.get<{ results: Label[] } | Label[]>("/labels/"),
    ]);
    setColumns(resultsOf(cols).sort((a, b) => a.order - b.order));
    setCards(resultsOf(cds));
    setLabels(resultsOf(lbs));
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    if (!cards.length) return;
    const id = Number(searchParams.get("card") || "");
    if (!id) return;
    const tab = searchParams.get("tab") || "";
    const key = `${id}:${tab}`;
    if (handledQuery.current === key) return;
    handledQuery.current = key;
    const valid = DRAWER_TABS.some((t) => t.id === tab);
    void openCard(id, valid ? (tab as DrawerTab) : "chat");
  }, [cards.length, searchParams]);

  useEffect(() => {
    try {
      setPipelineOpen(localStorage.getItem("crm-pipeline-open") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function togglePipeline(next?: boolean) {
    setPipelineOpen((open) => {
      const value = typeof next === "boolean" ? next : !open;
      try {
        localStorage.setItem("crm-pipeline-open", value ? "1" : "0");
      } catch {
        /* ignore */
      }
      return value;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePipeline(true);
        window.setTimeout(() => searchRef.current?.focus(), 30);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (labelFilter !== "all" && !c.labels.some((l) => l.id === labelFilter))
        return false;
      if (quickFilter === "overdue" && !isOverdue(c.follow_up_date)) return false;
      if (quickFilter === "today" && !isFollowUpToday(c.follow_up_date))
        return false;
      if (quickFilter === "alta" && c.priority !== "alta") return false;
      if (quickFilter === "sem_retorno" && c.follow_up_date) return false;
      if (!q) return true;
      const hay = [
        c.lead.name,
        c.lead.email,
        c.lead.phone,
        c.lead.area_display,
        c.lead.category,
        c.lead.message,
        ...c.labels.map((l) => l.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [cards, query, priorityFilter, labelFilter, quickFilter]);

  const cardsByCol = useMemo(() => {
    const map = new Map<number, CardItem[]>();
    for (const c of columns) map.set(c.id, []);
    for (const card of filteredCards) {
      const list = map.get(card.column);
      if (list) list.push(card);
      else map.set(card.column, [card]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        // Follow-up atrasado / hoje sobe no topo
        const aScore =
          (isOverdue(a.follow_up_date) ? -2 : 0) +
          (isFollowUpToday(a.follow_up_date) ? -1 : 0) +
          (a.priority === "alta" ? -0.5 : 0);
        const bScore =
          (isOverdue(b.follow_up_date) ? -2 : 0) +
          (isFollowUpToday(b.follow_up_date) ? -1 : 0) +
          (b.priority === "alta" ? -0.5 : 0);
        if (aScore !== bScore) return aScore - bScore;
        return a.order - b.order;
      });
    }
    return map;
  }, [columns, filteredCards]);

  const crmStats = useMemo(() => {
    const wonIds = new Set(columns.filter((c) => c.is_won).map((c) => c.id));
    const lostIds = new Set(columns.filter((c) => c.is_lost).map((c) => c.id));
    const won = cards.filter((c) => wonIds.has(c.column)).length;
    const lost = cards.filter((c) => lostIds.has(c.column)).length;
    const open = cards.filter(
      (c) => !wonIds.has(c.column) && !lostIds.has(c.column)
    ).length;
    const alta = cards.filter((c) => c.priority === "alta").length;
    const overdue = cards.filter((c) => isOverdue(c.follow_up_date)).length;
    const today = cards.filter((c) => isFollowUpToday(c.follow_up_date)).length;
    const semRetorno = cards.filter((c) => !c.follow_up_date).length;
    return { won, lost, open, alta, overdue, today, semRetorno, total: cards.length };
  }, [cards, columns]);

  const activeCard = cards.find((c) => c.id === activeId) || null;
  const filtersActive =
    quickFilter !== "all" ||
    priorityFilter !== "all" ||
    labelFilter !== "all" ||
    query.trim().length > 0;

  function clearFilters() {
    setQuickFilter("all");
    setPriorityFilter("all");
    setLabelFilter("all");
    setQuery("");
  }

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

  async function openCard(id: number, tab: DrawerTab = "chat") {
    try {
      const full = await api.get<CardItem>(`/cards/${id}/`);
      setSelected(full);
      setDrawerTab(tab);
    } catch {
      setSelected(null);
    }
  }

  async function refreshSelected(id: number) {
    const full = await api.get<CardItem>(`/cards/${id}/`);
    setSelected(full);
    setCards((prev) => prev.map((c) => (c.id === full.id ? full : c)));
  }

  useEffect(() => {
    if (!selected || drawerTab !== "emails") return;
    const t = window.setInterval(() => {
      void refreshSelected(selected.id);
    }, 12000);
    return () => window.clearInterval(t);
  }, [selected?.id, drawerTab]);

  async function sendLeadEmail(payload: {
    subject: string;
    body: string;
    kind: "text" | "html";
    files: File[];
    replyTo?: number;
  }) {
    if (!selected) return;
    setEmailSending(true);
    try {
      const fd = new FormData();
      fd.append("subject", payload.subject);
      fd.append("body", payload.body);
      fd.append("kind", payload.kind);
      if (payload.replyTo) fd.append("reply_to", String(payload.replyTo));
      payload.files.forEach((f) => fd.append("files", f));
      await api.post(`/cards/${selected.id}/emails`, fd);
      await refreshSelected(selected.id);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Falha ao enviar o e-mail.";
      window.alert(message);
      throw e;
    } finally {
      setEmailSending(false);
    }
  }

  async function syncLeadEmails() {
    if (!selected) return "";
    const res = await api.post<{ fetched: number }>(
      `/cards/${selected.id}/emails/sync`,
      {},
    );
    await refreshSelected(selected.id);
    return res.fetched > 0
      ? `${res.fetched} nova(s) mensagem(ns) importada(s) da caixa de entrada.`
      : "Caixa de entrada lida. Nenhuma resposta nova por enquanto.";
  }

  async function updateCard(patch: Record<string, unknown>) {
    if (!selected) return;
    const updated = await api.patch<CardItem>(`/cards/${selected.id}/`, patch);
    setSelected(updated);
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function toggleLabel(labelId: number) {
    if (!selected || !writable) return;
    const current = selected.labels.map((l) => l.id);
    const next = current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId];
    await updateCard({ label_ids: next });
  }

  async function addComment(text: string) {
    if (!selected || !text.trim()) return;
    await api.post(`/cards/${selected.id}/comments/`, { text });
    await refreshSelected(selected.id);
  }

  async function editComment(id: number, text: string) {
    await api.patch(`/card-comments/${id}/`, { text });
    if (selected) await refreshSelected(selected.id);
  }

  async function removeComment(id: number) {
    if (!confirm("Apagar esta mensagem?")) return;
    await api.delete(`/card-comments/${id}/`);
    if (selected) await refreshSelected(selected.id);
  }

  async function addChecklist(text: string) {
    if (!selected || !text.trim()) return;
    await api.post("/checklist-items/", {
      card: selected.id,
      text,
      order: selected.checklist.length,
    });
    await refreshSelected(selected.id);
  }

  async function toggleCheck(itemId: number, done: boolean) {
    await api.patch(`/checklist-items/${itemId}/`, { done });
    if (selected) await refreshSelected(selected.id);
  }

  async function removeChecklist(itemId: number) {
    if (!confirm("Remover esta tarefa?")) return;
    await api.delete(`/checklist-items/${itemId}/`);
    if (selected) await refreshSelected(selected.id);
  }

  async function changeStatus(columnId: number) {
    if (!selected || columnId === selected.column) return;
    const target = columns.find((c) => c.id === columnId);
    if (target?.is_lost && !selected.loss_reason) {
      setLossPrompt({ cardId: selected.id, columnId });
      return;
    }
    await moveCard(selected.id, columnId, 0);
  }

  async function addNote(text: string) {
    if (!selected || !text.trim()) return;
    await api.post("/card-notes/", { card: selected.id, text: text.trim() });
    await refreshSelected(selected.id);
  }

  async function removeNote(id: number) {
    if (!confirm("Remover esta anotação?")) return;
    await api.delete(`/card-notes/${id}/`);
    if (selected) await refreshSelected(selected.id);
  }

  async function editNote(id: number, text: string) {
    await api.patch(`/card-notes/${id}/`, { text });
    if (selected) await refreshSelected(selected.id);
  }

  async function togglePinNote(id: number, pinned: boolean) {
    await api.patch(`/card-notes/${id}/`, { pinned });
    if (selected) await refreshSelected(selected.id);
  }

  async function uploadAttachment(file: File) {
    if (!selected) return;
    if ((selected.attachments?.length || 0) >= 5) {
      alert("Máximo de 5 anexos por card.");
      return;
    }
    const fd = new FormData();
    fd.append("card", String(selected.id));
    fd.append("file", file);
    fd.append("name", file.name);
    await api.post("/attachments/", fd);
    await refreshSelected(selected.id);
  }

  async function removeAttachment(id: number) {
    if (!confirm("Remover este anexo?")) return;
    await api.delete(`/attachments/${id}/`);
    if (selected) await refreshSelected(selected.id);
  }

  useEffect(() => {
    if (!flash && !flashErr) return;
    const t = window.setTimeout(() => {
      setFlash("");
      setFlashErr("");
    }, 4000);
    return () => window.clearTimeout(t);
  }, [flash, flashErr]);

  async function confirmDeleteLead() {
    if (!deletePrompt || deleting) return;
    setDeleting(true);
    setFlash("");
    setFlashErr("");
    try {
      await api.delete(`/cards/${deletePrompt.id}`);
      const removedId = deletePrompt.id;
      setCards((prev) => prev.filter((c) => c.id !== removedId));
      setSelected((cur) => (cur?.id === removedId ? null : cur));
      setDeletePrompt(null);
      setFlash("Lead excluído com sucesso.");
    } catch {
      setFlashErr("Não foi possível excluir o lead. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Topbar title="CRM Kanban" />
      {(flash || flashErr) && (
        <p
          className={`mx-3 mt-2 shrink-0 rounded-xl border px-4 py-2 text-sm sm:mx-5 ${
            flashErr
              ? "border-red-400/30 bg-red-400/10 text-red-200"
              : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {flashErr || flash}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-2 pt-1.5 sm:gap-3 sm:px-5 sm:pb-3 sm:pt-2">
        {/* Hero + toolbar comercial */}
        <div className="admin-glass relative shrink-0 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 8% 0%, color-mix(in srgb, var(--admin-tone, var(--theme-primary)) 22%, transparent), transparent 48%),
                radial-gradient(ellipse at 95% 30%, rgba(255,255,255,0.04), transparent 40%)
              `,
            }}
          />
          <div
            className="admin-tone-line pointer-events-none absolute inset-x-0 top-0 h-px"
            aria-hidden
          />

          <div className="relative flex items-center gap-2 px-2.5 py-2 sm:px-4">
            <button
              type="button"
              onClick={() => togglePipeline()}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-white/[0.03]"
              aria-expanded={pipelineOpen}
            >
              <span className="admin-tone-chip inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]">
                <Zap size={11} />
                Pipeline
              </span>
              <span className="truncate text-[12px] text-white/55">
                {filteredCards.length} visível
                {filteredCards.length === 1 ? "" : "is"}
                {filtersActive ? ` · filtro ativo` : ""}
              </span>
              {pipelineOpen ? (
                <ChevronUp size={16} className="ml-auto shrink-0 text-white/40" />
              ) : (
                <ChevronDown size={16} className="ml-auto shrink-0 text-white/40" />
              )}
            </button>
            {writable && (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLabelModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] p-2 text-xs font-semibold text-white/70 hover:border-gold/40 hover:text-gold sm:px-3"
                  title="Etiquetas"
                >
                  <Tag size={14} />
                  <span className="hidden sm:inline">Etiquetas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setColModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] p-2 text-xs font-semibold text-white/70 hover:border-gold/40 hover:text-gold sm:px-3"
                  title="Colunas"
                >
                  <Settings2 size={14} />
                  <span className="hidden sm:inline">Colunas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeadModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-2 text-xs font-bold text-ink sm:px-3.5"
                >
                  <Plus size={14} />
                  <span className="sm:hidden">Lead</span>
                  <span className="hidden sm:inline">Novo lead</span>
                </button>
              </div>
            )}
          </div>

          {pipelineOpen && (
            <div className="relative flex flex-col gap-2.5 border-t border-white/8 px-2.5 pb-3 pt-2.5 sm:gap-3.5 sm:px-4">
              <div>
                <h1 className="font-display text-lg font-black tracking-tight text-white sm:text-2xl">
                  Pipeline comercial
                </h1>
                <p className="mt-0.5 hidden max-w-xl text-xs text-white/45 sm:block sm:text-[13px]">
                  Arraste leads · priorize · acompanhe follow-ups. Foque no que
                  vence hoje e no que está atrasado.
                </p>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 thin-scroll sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-6">
                <StatPill icon={Layers} label="Abertos" value={crmStats.open} />
                <StatPill icon={Handshake} label="Ganhos" value={crmStats.won} tone="emerald" />
                <StatPill icon={Flame} label="Alta" value={crmStats.alta} tone="red" />
                <StatPill icon={AlertTriangle} label="Atrasados" value={crmStats.overdue} tone="amber" />
                <StatPill icon={CalendarDays} label="Hoje" value={crmStats.today} tone="gold" />
                <StatPill icon={Target} label="Sem retorno" value={crmStats.semRetorno} />
              </div>

              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 thin-scroll">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "today", label: `Hoje (${crmStats.today})` },
                    { id: "overdue", label: `Atrasados (${crmStats.overdue})` },
                    { id: "alta", label: `Alta (${crmStats.alta})` },
                    {
                      id: "sem_retorno",
                      label: `Sem retorno (${crmStats.semRetorno})`,
                    },
                  ] as { id: QuickFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setQuickFilter(f.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      quickFilter === f.id
                        ? "bg-gold text-ink"
                        : "border border-white/10 bg-white/[0.03] text-white/60 hover:border-gold/35 hover:text-gold"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/50 hover:text-white"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
                  />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar lead, e-mail, telefone…"
                    className="w-full rounded-full border border-white/10 bg-ink/80 py-2 pl-9 pr-4 text-sm outline-none backdrop-blur focus:border-gold sm:pr-14"
                  />
                  <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/35 sm:inline">
                    ⌘K
                  </kbd>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <ThemedSelect
                    value={priorityFilter}
                    onChange={setPriorityFilter}
                    options={[
                      { value: "all", label: "Prioridade" },
                      { value: "alta", label: "Alta" },
                      { value: "media", label: "Média" },
                      { value: "baixa", label: "Baixa" },
                    ]}
                  />
                  <ThemedSelect
                    value={labelFilter === "all" ? "all" : String(labelFilter)}
                    onChange={(v) =>
                      setLabelFilter(v === "all" ? "all" : Number(v))
                    }
                    options={[
                      { value: "all", label: "Etiquetas" },
                      ...labels.map((l) => ({
                        value: String(l.id),
                        label: l.name,
                      })),
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Board full-height */}
        <div className="flex min-h-0 flex-1 flex-col">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto overflow-y-hidden pb-1 thin-scroll sm:gap-3">
              {columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  cards={cardsByCol.get(col.id) || []}
                  onOpen={openCard}
                  disabled={!writable}
                />
              ))}
              {columns.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-white/40">
                  Nenhuma coluna. Crie em Gerenciar colunas.
                </div>
              )}
            </div>
            <DragOverlay>
              {activeCard ? <CardPreview card={activeCard} dragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 backdrop-blur-[3px] sm:items-stretch"
          onClick={() => setSelected(null)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="crm-drawer noise-bg relative flex h-[min(96dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-gold/20 pb-[env(safe-area-inset-bottom)] shadow-2xl sm:h-full sm:rounded-none sm:border-y-0 sm:border-l sm:border-r-0"
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-grid-soft opacity-[0.18]"
              aria-hidden
            />
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gold/35 sm:hidden" />
            <header className="crm-drawer-header relative z-[1] shrink-0 px-4 py-3 sm:px-5 sm:py-4">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent sm:block"
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_META[selected.priority].chip}`}
                    >
                      {PRIORITY_META[selected.priority].label}
                    </span>
                    <span className="text-[11px] text-white/35">
                      há {daysAgo(selected.created_at)}
                    </span>
                  </div>
                  <h2 className="truncate font-display text-lg font-bold sm:text-xl">
                    {selected.lead.name}
                  </h2>
                  <p className="truncate text-sm text-white/45">
                    {[selected.lead.area_display, selected.lead.category]
                      .filter(Boolean)
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1.5">
                  {writable && (
                    <button
                      type="button"
                      onClick={() => setDeletePrompt(selected)}
                      className="rounded-full border border-white/10 p-2 text-white/50 hover:border-red-400/40 hover:text-red-300"
                      title="Excluir lead"
                      aria-label="Excluir lead"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-full border border-white/10 p-2 text-white/50 hover:border-gold/40 hover:text-gold"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {selected.lead.phone && (
                  <ContactPhoneChip phone={selected.lead.phone} />
                )}
                {selected.lead.email && (
                  <ContactEmailChip email={selected.lead.email} />
                )}
              </div>
            </header>

            <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-2 sm:px-4">
              <div className="crm-panel shrink-0 space-y-2.5 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Status
                    </p>
                    <ThemedSelect
                      compact
                      disabled={!writable}
                      value={String(selected.column)}
                      onChange={(v) => void changeStatus(Number(v))}
                      options={columns.map((c) => ({
                        value: String(c.id),
                        label: c.is_won
                          ? `${c.title} · Ganho`
                          : c.is_lost
                            ? `${c.title} · Perda`
                            : c.title,
                      }))}
                    />
                  </div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    Follow-up
                    <input
                      type="date"
                      disabled={!writable}
                      value={selected.follow_up_date || ""}
                      onChange={(e) =>
                        updateCard({ follow_up_date: e.target.value || null })
                      }
                      className={`${inputCls} mt-1 py-1.5`}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                    {(["alta", "media", "baixa"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={!writable}
                        onClick={() => updateCard({ priority: p })}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide transition ${
                          selected.priority === p
                            ? PRIORITY_META[p].btn
                            : PRIORITY_META[p].idle
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[p].dot}`}
                        />
                        {PRIORITY_META[p].label}
                      </button>
                    ))}
                  </div>
                  <CardColorPicker
                    value={selected.color || ""}
                    disabled={!writable}
                    onChange={(color) => updateCard({ color })}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {labels.map((l) => {
                    const on = selected.labels.some((x) => x.id === l.id);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        disabled={!writable}
                        onClick={() => toggleLabel(l.id)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                          on ? "border-transparent text-ink" : "border-white/12 text-white/50 hover:text-white/80"
                        }`}
                        style={
                          on
                            ? { background: l.color, color: "#111" }
                            : undefined
                        }
                      >
                        {l.name}
                      </button>
                    );
                  })}
                  {writable && (
                    <button
                      type="button"
                      onClick={() => setLabelModal(true)}
                      className="rounded-full px-2 py-0.5 text-[10px] text-white/35 hover:text-gold"
                    >
                      + etiqueta
                    </button>
                  )}
                </div>

                {selected.lead.message && (
                  <details className="group border-t border-white/6 pt-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[11px] font-medium text-white/50 [&::-webkit-details-marker]:hidden">
                      Mensagem do lead
                      <ChevronDown
                        size={14}
                        className="shrink-0 transition group-open:rotate-180"
                      />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {selected.lead.message}
                    </p>
                  </details>
                )}
              </div>

              {selected.loss_reason && (
                <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
                  Motivo da perda: {selected.loss_reason}
                </div>
              )}

              <div className="crm-panel shrink-0 p-2.5">
                <ChecklistBlock
                  items={selected.checklist}
                  writable={writable}
                  onToggle={toggleCheck}
                  onRemove={removeChecklist}
                  onAdd={addChecklist}
                />
              </div>

              <div className="crm-activity-card relative flex min-h-0 flex-1 flex-col">
                <div className="relative z-[1] flex shrink-0 justify-center px-3 pt-2.5">
                  <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-black/40 p-1">
                    {DRAWER_TABS.map((tab) => {
                      const count =
                        tab.id === "chat"
                          ? selected.comments?.length || 0
                          : tab.id === "notes"
                            ? selected.notes?.length || 0
                            : tab.id === "files"
                              ? selected.attachments?.length || 0
                              : tab.id === "emails"
                                ? selected.emails?.length || 0
                                : selected.history?.length || 0;
                      const on = drawerTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDrawerTab(tab.id)}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition sm:px-3 ${
                            on ? tab.active : tab.idle
                          }`}
                        >
                          <tab.Icon size={13} />
                          {tab.label}
                          {count > 0 && (
                            <span className={on ? "opacity-70" : "opacity-50"}>
                              {tab.id === "files" ? `${count}/5` : count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="relative z-[1] flex min-h-0 flex-1 flex-col py-2 pl-3 pr-2 sm:pl-4">
                  {drawerTab === "chat" && (
                    <ChatPanel
                      comments={selected.comments}
                      currentUser={user?.username || ""}
                      currentUserId={user?.id}
                      isAdmin={user?.role === "admin"}
                      writable={writable}
                      onSend={addComment}
                      onEdit={editComment}
                      onRemove={removeComment}
                    />
                  )}

                  {drawerTab === "notes" && (
                    <NotesPanel
                      notes={selected.notes || []}
                      currentUserId={user?.id}
                      isAdmin={user?.role === "admin"}
                      writable={writable}
                      onAdd={addNote}
                      onEdit={editNote}
                      onPin={togglePinNote}
                      onRemove={removeNote}
                    />
                  )}

                  {drawerTab === "files" && (
                    <AttachmentsPanel
                      attachments={selected.attachments || []}
                      writable={writable}
                      onUpload={uploadAttachment}
                      onRemove={removeAttachment}
                    />
                  )}

                  {drawerTab === "history" && (
                    <HistoryPanel history={selected.history || []} />
                  )}

                  {drawerTab === "emails" && (
                    <EmailThreadPanel
                      emails={selected.emails || []}
                      leadEmail={selected.lead.email}
                      writable={writable}
                      sending={emailSending}
                      onSend={sendLeadEmail}
                      onSync={syncLeadEmails}
                    />
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {deletePrompt && (
        <ModalShell
          onClose={() => {
            if (!deleting) setDeletePrompt(null);
          }}
        >
          <h3 className="font-display text-lg font-bold">Excluir lead</h3>
          <p className="mt-2 text-sm text-white/70">
            Tem certeza de que deseja excluir permanentemente este lead?
          </p>
          <p className="mt-1 text-sm text-white/45">
            Esta ação não poderá ser desfeita.
            {deletePrompt.lead.name ? (
              <>
                {" "}
                <span className="text-white/70">
                  ({deletePrompt.lead.name})
                </span>
              </>
            ) : null}
          </p>
          {flashErr && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {flashErr}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => setDeletePrompt(null)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDeleteLead()}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
            >
              {deleting ? "Excluindo…" : "Sim, excluir"}
            </button>
          </div>
        </ModalShell>
      )}

      {lossPrompt && (
        <ModalShell onClose={() => { setLossPrompt(null); setLossReason(""); }}>
          <h3 className="font-display text-lg font-bold">Motivo da perda</h3>
          <p className="mt-1 text-sm text-white/50">
            Obrigatório ao mover para o status Perdido.
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
              type="button"
              onClick={() => {
                setLossPrompt(null);
                setLossReason("");
              }}
              className="rounded-full border border-white/15 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmLoss()}
              disabled={!lossReason.trim()}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirmar perda
            </button>
          </div>
        </ModalShell>
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

      {labelModal && (
        <LabelsModal
          labels={labels}
          writable={writable}
          onClose={() => setLabelModal(false)}
          onChanged={async () => {
            await load();
            if (selected) await refreshSelected(selected.id);
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
    </div>
  );
}

function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ContactPhoneChip({ phone }: { phone: string }) {
  const wa = whatsappUrl(phone);
  if (wa) {
    return (
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        title="Abrir no WhatsApp"
        className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/15 px-3 py-1.5 text-xs font-medium text-[#B6F5C9] transition hover:bg-[#25D366]/25 hover:text-white"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-white">
          <WhatsAppGlyph size={12} />
        </span>
        {phone}
      </a>
    );
  }
  return (
    <a
      href={`tel:${phone}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink/60 px-3 py-1.5 text-xs text-white/75"
    >
      <Phone size={12} /> {phone}
    </a>
  );
}

function ContactEmailChip({ email }: { email: string }) {
  const provider = detectEmailProvider(email);
  const meta = EMAIL_PROVIDER_META[provider];
  const href = emailComposeUrl(email);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`Enviar e-mail (${meta.label})`}
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:brightness-110 ${meta.bg} ${meta.border} ${meta.text}`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${meta.iconBg}`}
      >
        {provider === "gmail" ? (
          <span className="text-[10px] font-black leading-none">M</span>
        ) : provider === "outlook" ? (
          <span className="text-[9px] font-black leading-none">O</span>
        ) : provider === "yahoo" ? (
          <span className="text-[10px] font-black leading-none">Y</span>
        ) : provider === "icloud" ? (
          <span className="text-[9px] font-black leading-none">☁</span>
        ) : provider === "proton" ? (
          <span className="text-[9px] font-black leading-none">P</span>
        ) : (
          <Mail size={11} strokeWidth={2.5} />
        )}
      </span>
      <span className="min-w-0 truncate">{email}</span>
    </a>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tone = "gold",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone?: "gold" | "emerald" | "red" | "amber";
}) {
  const tones = {
    gold: "text-gold border-gold/20 bg-gold/10",
    emerald: "text-emerald-300 border-emerald-400/20 bg-emerald-400/10",
    red: "text-red-300 border-red-400/20 bg-red-400/10",
    amber: "text-amber-300 border-amber-400/20 bg-amber-400/10",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm min-w-[8.75rem] shrink-0 sm:min-w-0">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg border ${tones[tone]}`}
        >
          <Icon size={13} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/40">
            {label}
          </p>
          <p className="font-display text-lg font-black leading-none text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[min(90dvh,820px)] w-full overflow-y-auto admin-glass p-5 shadow-2xl sm:p-6 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        {children}
      </div>
    </div>
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
  const overdueInCol = cards.filter((c) => isOverdue(c.follow_up_date)).length;
  const altaInCol = cards.filter((c) => c.priority === "alta").length;

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[min(272px,78vw)] shrink-0 snap-start flex-col admin-glass sm:w-[min(300px,84vw)] ${
        isOver
          ? "border-gold/55 shadow-[0_0_0_1px_color-mix(in_srgb,var(--theme-primary)_35%,transparent)]"
          : ""
      }`}
    >
      <div
        className="flex shrink-0 flex-col gap-1.5 rounded-t-2xl px-3 py-3"
        style={{ borderTop: `3px solid ${column.color}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: column.color }}
          />
          <h3 className="flex-1 truncate text-sm font-semibold text-white">
            {column.title}
          </h3>
          {column.is_won && (
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
              Ganho
            </span>
          )}
          {column.is_lost && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-300">
              Perda
            </span>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-white/60">
            {cards.length}
          </span>
        </div>
        {(overdueInCol > 0 || altaInCol > 0) && (
          <div className="flex flex-wrap gap-1.5 pl-4">
            {overdueInCol > 0 && (
              <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                {overdueInCol} atrasado{overdueInCol > 1 ? "s" : ""}
              </span>
            )}
            {altaInCol > 0 && (
              <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                {altaInCol} alta
              </span>
            )}
          </div>
        )}
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 thin-scroll">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpen} />
          ))}
          {cards.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-[11px] text-white/30">
              Solte leads aqui
            </div>
          )}
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    borderLeftColor: card.color || undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className={`cursor-grab rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-[#141414]/95 p-3 shadow-[0_10px_28px_-18px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_16px_36px_-16px_color-mix(in_srgb,var(--theme-primary)_35%,transparent)] active:cursor-grabbing ${
        card.color ? "border-l-[3px]" : ""
      } ${isOverdue(card.follow_up_date) ? "ring-1 ring-amber-400/25" : ""}`}
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
  const overdue = isOverdue(card.follow_up_date);
  const today = isFollowUpToday(card.follow_up_date);
  const done = card.checklist.filter((i) => i.done).length;
  const total = card.checklist.length;
  const wa = card.lead.phone ? whatsappUrl(card.lead.phone) : null;

  return (
    <div
      className={
        dragging
          ? "flex w-[280px] flex-col rounded-xl border border-gold bg-ink-card p-3 shadow-2xl"
          : "flex flex-col"
      }
    >
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-[11px] font-bold text-gold">
          {initials(card.lead.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[card.priority].dot}`}
              title={PRIORITY_META[card.priority].label}
            />
            <p className="truncate text-sm font-semibold leading-snug text-white">
              {card.lead.name}
            </p>
          </div>
          <p className="truncate text-[11px] text-white/40">
            {card.lead.area_display || card.lead.category || "—"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {overdue && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            <AlertTriangle size={10} /> Atrasado
          </span>
        )}
        {!overdue && today && (
          <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
            <CalendarClock size={10} /> Hoje
          </span>
        )}
        {!overdue && !today && card.follow_up_date && (
          <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/45">
            <CalendarClock size={10} /> {formatFollowUpShort(card.follow_up_date)}
          </span>
        )}
        {!card.follow_up_date && (
          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
            Sem retorno
          </span>
        )}
        {card.labels.map((l) => (
          <span
            key={l.id}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: `${l.color}28`, color: l.color }}
          >
            {l.name}
          </span>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/5 pt-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            title="WhatsApp"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 text-[#25D366] transition hover:bg-[#25D366]/35"
          >
            <WhatsAppGlyph size={11} />
          </a>
        )}
        {card.lead.email && (
          <a
            href={emailComposeUrl(card.lead.email)}
            target="_blank"
            rel="noreferrer"
            title="E-mail"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <Mail size={11} />
          </a>
        )}
        <span className="ml-auto flex items-center gap-2 text-[10px] text-white/35">
          <span className="inline-flex items-center gap-0.5" title="Anotações">
            <StickyNote size={11} /> {card.notes?.length || 0}
          </span>
          <span className="inline-flex items-center gap-0.5" title="Mensagens">
            <MessageSquare size={11} /> {card.comments?.length || 0}
          </span>
          <span className="inline-flex items-center gap-0.5" title="Anexos">
            <Paperclip size={11} /> {card.attachments?.length || 0}
          </span>
          {total > 0 && (
            <span className="inline-flex items-center gap-0.5" title="Checklist">
              <CheckSquare size={11} /> {done}/{total}
            </span>
          )}
          <span>{daysAgo(card.created_at)}</span>
        </span>
      </div>
    </div>
  );
}
function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function CardColorPicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (color: string) => void;
}) {
  const VISIBLE = 5;
  const custom = value && !CARD_SWATCHES.includes(value.toLowerCase());
  const maxStart = Math.max(0, CARD_SWATCHES.length - VISIBLE);
  const [start, setStart] = useState(0);
  const visible = CARD_SWATCHES.slice(start, start + VISIBLE);

  useEffect(() => {
    const idx = CARD_SWATCHES.findIndex((h) => (value || "") === h);
    if (idx < 0) return;
    setStart((s) => {
      if (idx < s) return idx;
      if (idx >= s + VISIBLE) return Math.min(maxStart, idx - VISIBLE + 1);
      return s;
    });
  }, [value, maxStart]);

  return (
    <div className="flex shrink-0 items-center gap-0.5" title="Cor do card">
      <button
        type="button"
        disabled={disabled || start <= 0}
        onClick={() => setStart((s) => Math.max(0, s - 1))}
        className="rounded-md p-0.5 text-white/25 transition hover:text-gold disabled:opacity-20"
        aria-label="Cores anteriores"
      >
        <ChevronLeft size={14} />
      </button>
      <div className="flex items-center gap-1 overflow-hidden">
        {visible.map((hex) => {
          const active = (value || "") === hex;
          return (
            <button
              key={hex || "none"}
              type="button"
              disabled={disabled}
              title={hex ? "Cor do card" : "Sem cor"}
              onClick={() => onChange(hex)}
              className={`relative h-5 w-5 shrink-0 rounded-full border transition ${
                active
                  ? "border-white ring-2 ring-gold/70"
                  : "border-white/20 hover:border-white/50"
              }`}
              style={{
                background: hex
                  ? hex
                  : "linear-gradient(135deg,#2a2a2a 50%,#111 50%)",
              }}
            >
              {active && (
                <Check
                  size={9}
                  strokeWidth={3}
                  className={`absolute inset-0 m-auto ${
                    hex && ["#f5b301", "#22c55e", "#14b8a6", "#f97316"].includes(hex)
                      ? "text-ink"
                      : "text-white"
                  }`}
                />
              )}
            </button>
          );
        })}
        {custom && (
          <span
            className="h-5 w-5 shrink-0 rounded-full ring-2 ring-gold/70"
            style={{ background: value }}
          />
        )}
      </div>
      <button
        type="button"
        disabled={disabled || start >= maxStart}
        onClick={() => setStart((s) => Math.min(maxStart, s + 1))}
        className="rounded-md p-0.5 text-white/25 transition hover:text-gold disabled:opacity-20"
        aria-label="Próximas cores"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

function ChecklistBlock({
  items,
  writable,
  onToggle,
  onRemove,
  onAdd,
}: {
  items: CardItem["checklist"];
  writable: boolean;
  onToggle: (id: number, done: boolean) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onAdd: (text: string) => Promise<void>;
}) {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-gold">
          <CheckSquare size={13} /> Checklist
          {total > 0 && (
            <span className="font-normal text-white/40">
              {done}/{total}
            </span>
          )}
        </h3>
      </div>
      {total > 0 && (
        <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <ul className="max-h-28 space-y-1 overflow-y-auto crm-scroll">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-2 text-sm"
          >
            <button
              type="button"
              disabled={!writable}
              onClick={() => void onToggle(item.id, !item.done)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                item.done
                  ? "border-gold bg-gold text-ink"
                  : "border-white/25 bg-transparent hover:border-gold/60"
              }`}
              aria-label={item.done ? "Desmarcar" : "Concluir"}
            >
              {item.done && <Check size={12} strokeWidth={3} />}
            </button>
            <span
              className={`min-w-0 flex-1 leading-snug ${
                item.done ? "text-white/40 line-through" : "text-white/90"
              }`}
            >
              {item.text}
            </span>
            {writable && (
              <button
                type="button"
                onClick={() => void onRemove(item.id)}
                className="rounded-lg p-1.5 text-white/25 opacity-100 transition hover:bg-red-500/10 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
                title="Remover tarefa"
              >
                <Trash2 size={14} />
              </button>
            )}
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
            void onAdd(input.value);
            input.value = "";
          }}
        >
          <input
            name="check"
            placeholder="Nova tarefa..."
            className={`${inputCls} mt-0 py-1.5`}
          />
          <button
            type="submit"
            className="rounded-xl border border-gold/30 bg-gold/15 px-3 text-gold hover:bg-gold/25"
          >
            <Plus size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function NotesPanel({
  notes,
  currentUserId,
  isAdmin,
  writable,
  onAdd,
  onEdit,
  onPin,
  onRemove,
}: {
  notes: CardItem["notes"];
  currentUserId?: number;
  isAdmin?: boolean;
  writable: boolean;
  onAdd: (text: string) => Promise<void>;
  onEdit: (id: number, text: string) => Promise<void>;
  onPin: (id: number, pinned: boolean) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(id: number) {
    if (!editText.trim()) return;
    await onEdit(id, editText.trim());
    setEditingId(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          <StickyNote size={14} />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-amber-200">Anotações internas</p>
          <p className="text-[10px] text-white/35">Só o time vê · pin as importantes</p>
        </div>
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto crm-scroll">
        {notes.length === 0 && (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-amber-400/[0.06] text-center">
            <StickyNote size={22} className="text-amber-300/70" />
            <p className="max-w-[15rem] text-xs text-white/45">
              Lembretes do lead: valores, prazos, o que combinou no WhatsApp.
            </p>
          </div>
        )}
        {notes.map((n) => {
          const mine = currentUserId != null && n.author === currentUserId;
          const canManage = writable && (mine || isAdmin);
          const editing = editingId === n.id;
          return (
            <article
              key={n.id}
              className={`relative overflow-hidden rounded-2xl px-3.5 py-3 ${
                n.pinned
                  ? "bg-amber-400/16 shadow-[inset_3px_0_0_#fbbf24]"
                  : "bg-amber-400/[0.08] shadow-[inset_3px_0_0_rgba(251,191,36,0.45)]"
              }`}
            >
              <div className="mb-1.5 flex items-center gap-2">
                {n.pinned && (
                  <Pin size={11} className="shrink-0 text-amber-300" />
                )}
                <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-amber-100/90">
                  {mine ? "Você" : n.author_name || "Usuário"}
                  <span className="ml-1.5 font-normal text-white/35">
                    {relativeTime(n.created_at)}
                    {wasEdited(n.created_at, n.updated_at) ? " · editada" : ""}
                  </span>
                </p>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => copyText(n.text)}
                    className="rounded-md p-1 text-white/30 hover:text-amber-200"
                    title="Copiar"
                  >
                    <Copy size={12} />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => void onPin(n.id, !n.pinned)}
                        className={`rounded-md p-1 hover:text-amber-200 ${
                          n.pinned ? "text-amber-300" : "text-white/30"
                        }`}
                        title={n.pinned ? "Desafixar" : "Fixar no topo"}
                      >
                        <Pin size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(n.id);
                          setEditText(n.text);
                        }}
                        className="rounded-md p-1 text-white/30 hover:text-amber-200"
                        title="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemove(n.id)}
                        className="rounded-md p-1 text-white/30 hover:text-red-300"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editing ? (
                <div className="space-y-1.5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className={`${inputCls} mt-0 resize-none py-2`}
                    autoFocus
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-2.5 py-1 text-[11px] text-white/50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(n.id)}
                      className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-ink"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                  {n.text}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {writable && (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-2 flex items-end gap-2 rounded-2xl bg-amber-400/10 p-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            placeholder="Nova anotação… Ctrl+Enter salva"
            className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-ink disabled:opacity-40"
            title="Salvar anotação"
          >
            <StickyNote size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function ChatPanel({
  comments,
  currentUser,
  currentUserId,
  isAdmin,
  writable,
  onSend,
  onEdit,
  onRemove,
}: {
  comments: CardItem["comments"];
  currentUser: string;
  currentUserId?: number;
  isAdmin?: boolean;
  writable: boolean;
  onSend: (text: string) => Promise<void>;
  onEdit: (id: number, text: string) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText("");
      if (inputRef.current) inputRef.current.style.height = "auto";
    } finally {
      setSending(false);
    }
  }

  async function saveEdit(id: number) {
    if (!editText.trim()) return;
    await onEdit(id, editText.trim());
    setEditingId(null);
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
          <MessageSquare size={14} />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-sky-200">Chat da equipe</p>
          <p className="text-[10px] text-white/35">Enter envia · Shift+Enter nova linha</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto crm-scroll">
        {comments.length === 0 && (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl bg-sky-400/[0.06] text-center">
            <MessageSquare size={22} className="text-sky-300/70" />
            <p className="max-w-[16rem] text-xs text-white/45">
              Alinhe o comercial aqui: o que falou, o que falta, próximo passo.
            </p>
          </div>
        )}
        {comments.map((c, i) => {
          const mine =
            (currentUserId != null && c.author === currentUserId) ||
            (!!currentUser &&
              c.author_name?.toLowerCase() === currentUser.toLowerCase());
          const canManage = writable && (mine || isAdmin);
          const editing = editingId === c.id;
          const showDay =
            i === 0 ||
            chatDayKey(c.created_at) !== chatDayKey(comments[i - 1].created_at);
          return (
            <div key={c.id}>
              {showDay && (
                <p className="mb-2 mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-sky-300/50">
                  {chatDayLabel(c.created_at)}
                </p>
              )}
              <div className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    mine ? "bg-sky-400 text-ink" : "bg-white/10 text-white/70"
                  }`}
                >
                  {initials(c.author_name || "?")}
                </div>
                <div className={`max-w-[82%] ${mine ? "items-end" : ""}`}>
                  <div
                    className={`rounded-2xl px-3 py-2 ${
                      mine
                        ? "rounded-tr-md bg-sky-400/25 text-white"
                        : "rounded-tl-md bg-white/[0.07] text-white/90"
                    }`}
                  >
                    <div className="mb-0.5 flex items-baseline gap-2">
                      <span className="text-[11px] font-semibold text-sky-200">
                        {mine ? "Você" : c.author_name || "Usuário"}
                      </span>
                      <span
                        className="text-[10px] text-white/35"
                        title={formatDateTime(c.created_at)}
                      >
                        {relativeTime(c.created_at)}
                      </span>
                    </div>
                    {editing ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-white/15 bg-ink/60 px-2 py-1.5 text-sm outline-none focus:border-sky-400"
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-[11px] text-white/50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEdit(c.id)}
                            className="text-[11px] font-bold text-sky-300"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {c.text}
                      </p>
                    )}
                  </div>
                  <div
                    className={`mt-0.5 flex gap-0.5 ${
                      mine ? "justify-end" : ""
                    } opacity-100 sm:opacity-0 sm:group-hover:opacity-100`}
                  >
                    <button
                      type="button"
                      onClick={() => copyText(c.text)}
                      className="rounded-md p-1 text-white/30 hover:text-sky-300"
                      title="Copiar"
                    >
                      <Copy size={11} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditText(c.text);
                          }}
                          className="rounded-md p-1 text-white/30 hover:text-sky-300"
                          title="Editar"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onRemove(c.id)}
                          className="rounded-md p-1 text-white/30 hover:text-red-300"
                          title="Apagar"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {writable && (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-2 flex items-end gap-2 rounded-2xl bg-sky-400/10 p-2"
        >
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            placeholder="Mensagem… Enter envia"
            className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-400 text-ink disabled:opacity-40"
            title="Enviar"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </section>
  );
}

function AttachmentsPanel({
  attachments,
  writable,
  onUpload,
  onRemove,
}: {
  attachments: CardItem["attachments"];
  writable: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      await onUpload(file);
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Falha no upload."
          : "Falha no upload."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col space-y-3 overflow-y-auto crm-scroll">
      <p className="text-xs text-white/40">
        Até 5 arquivos por card (PDF, imagens, docs…).
      </p>
      <ul className="space-y-2">
        {attachments.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <FileText size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={a.file_url || a.file}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-white hover:text-gold"
              >
                {a.name || "Arquivo"}
              </a>
              <p className="text-[10px] text-white/35">
                {a.uploaded_by_name || "equipe"} · {formatDateTime(a.uploaded_at)}
              </p>
            </div>
            {writable && (
              <button
                type="button"
                onClick={() => void onRemove(a.id)}
                className="rounded-lg p-2 text-white/35 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
        {attachments.length === 0 && (
          <li className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-xs text-white/40">
            <Paperclip size={20} className="text-gold/50" />
            Nenhum anexo
          </li>
        )}
      </ul>
      {writable && attachments.length < 5 && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              void onPick(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gold/35 bg-gold/5 py-3 text-sm font-semibold text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            <Upload size={15} />
            {busy ? "Enviando..." : "Enviar anexo"}
          </button>
        </>
      )}
      {err && <p className="text-xs text-red-300">{err}</p>}
    </section>
  );
}

function historyKind(text: string) {
  const t = text.toLowerCase();
  if (t.includes("movido"))
    return {
      Icon: ArrowRight,
      label: "Status",
      wrap: "bg-gold/8",
      icon: "bg-gold/15 text-gold",
      tag: "text-gold/80",
    };
  if (t.includes("etiqueta"))
    return {
      Icon: Tag,
      label: "Etiqueta",
      wrap: "bg-violet-500/10",
      icon: "bg-violet-400/15 text-violet-300",
      tag: "text-violet-300/80",
    };
  if (t.includes("prioridade"))
    return {
      Icon: Flame,
      label: "Prioridade",
      wrap: "bg-red-500/10",
      icon: "bg-red-400/15 text-red-300",
      tag: "text-red-300/80",
    };
  if (t.includes("follow"))
    return {
      Icon: CalendarClock,
      label: "Follow-up",
      wrap: "bg-sky-500/10",
      icon: "bg-sky-400/15 text-sky-300",
      tag: "text-sky-300/80",
    };
  if (t.includes("anota"))
    return {
      Icon: StickyNote,
      label: "Anotação",
      wrap: "bg-amber-500/10",
      icon: "bg-amber-400/15 text-amber-300",
      tag: "text-amber-300/80",
    };
  if (t.includes("tarefa"))
    return {
      Icon: CheckSquare,
      label: "Tarefa",
      wrap: "bg-lime-500/10",
      icon: "bg-lime-400/15 text-lime-300",
      tag: "text-lime-300/80",
    };
  if (t.includes("mensagem") || t.includes("chat"))
    return {
      Icon: MessageSquare,
      label: "Chat",
      wrap: "bg-sky-500/10",
      icon: "bg-sky-400/15 text-sky-300",
      tag: "text-sky-300/80",
    };
  if (t.includes("anexo"))
    return {
      Icon: Paperclip,
      label: "Anexo",
      wrap: "bg-emerald-500/10",
      icon: "bg-emerald-400/15 text-emerald-300",
      tag: "text-emerald-300/80",
    };
  if (t.includes("lead"))
    return {
      Icon: Plus,
      label: "Lead",
      wrap: "bg-white/5",
      icon: "bg-white/10 text-white/70",
      tag: "text-white/50",
    };
  return {
    Icon: History,
    label: "Evento",
    wrap: "bg-white/4",
    icon: "bg-white/8 text-white/55",
    tag: "text-white/40",
  };
}

function HistoryPanel({ history }: { history: CardItem["history"] }) {
  return (
    <section className="h-full min-h-0 overflow-y-auto crm-scroll">
      {history.length === 0 && (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center">
          <History size={22} className="text-violet-300/50" />
          <p className="text-xs text-white/40">Sem eventos ainda.</p>
        </div>
      )}
      <ul className="space-y-1.5 pr-1">
        {history.map((h) => {
          const { Icon, label, wrap, icon, tag } = historyKind(h.text);
          return (
            <li key={h.id} className={`flex gap-2.5 rounded-xl px-2.5 py-2 ${wrap}`}>
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${icon}`}
              >
                <Icon size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${tag}`}>
                  {label}
                </p>
                <p className="text-sm leading-snug text-white/85">{h.text}</p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {formatDateTime(h.created_at)}
                  {h.user_name ? ` · ${h.user_name}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LabelsModal({
  labels,
  writable,
  onClose,
  onChanged,
}: {
  labels: Label[];
  writable: boolean;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f5b301");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post("/labels/", { name: name.trim(), color });
      setName("");
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta etiqueta?")) return;
    await api.delete(`/labels/${id}/`);
    await onChanged();
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Etiquetas</h2>
          <p className="text-xs text-white/40">
            Organize leads por tipo, prioridade comercial etc.
          </p>
        </div>
        <button type="button" onClick={onClose}>
          <X size={20} className="text-white/50" />
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {labels.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <span
              className="h-4 w-4 rounded-full"
              style={{ background: l.color }}
            />
            <span className="flex-1 text-sm">{l.name}</span>
            {writable && (
              <button
                type="button"
                onClick={() => void remove(l.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Excluir
              </button>
            )}
          </li>
        ))}
      </ul>
      {writable && (
        <div className="mt-4 flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-white/10 bg-ink"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova etiqueta..."
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void add()}
            className="rounded-lg bg-gold px-3 font-bold text-ink"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </ModalShell>
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
    if (!confirm("Excluir coluna? Cards serão movidos para outra coluna."))
      return;
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
    <ModalShell onClose={onClose} wide>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Colunas do Kanban</h2>
          <p className="mt-0.5 text-xs text-white/40">
            Marque <span className="text-emerald-300">Ganho</span> ou{" "}
            <span className="text-red-300">Perdido</span> para a coluna final.
          </p>
        </div>
        <button type="button" onClick={onClose}>
          <X size={20} className="text-white/50" />
        </button>
      </div>

      <ul className="mt-5 space-y-3">
        {list.map((col, i) => (
          <li
            key={col.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-ink/40 p-3"
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
              type="button"
              onClick={() => void removeColumn(col.id)}
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
          type="button"
          onClick={() => void addColumn()}
          className="rounded-lg bg-white/10 px-3 text-sm hover:bg-white/15"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 px-4 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void saveAll()}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-ink"
        >
          <Save size={15} />
          Salvar colunas
        </button>
      </div>
    </ModalShell>
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
    <ModalShell onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
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
    </ModalShell>
  );
}
