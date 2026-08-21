"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { api, ApiError, resultsOf } from "@/lib/api";
import type { FaqItem } from "@/lib/types";
import NavIconPicker from "@/components/admin/NavIconPicker";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold disabled:opacity-60";

export default function FaqEditor({ writable }: { writable: boolean }) {
  const [list, setList] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ results: FaqItem[] } | FaqItem[]>("/faqs");
      setList(resultsOf(data).sort((a, b) => a.order - b.order));
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function persistOrder(next: FaqItem[]) {
    setList(next);
    await api.post("/faqs/reorder", {
      items: next.map((item, i) => ({ id: item.id, order: i })),
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await persistOrder(next.map((item, i) => ({ ...item, order: i })));
    } catch {
      await load();
    }
  }

  async function addBlank() {
    setBusyId("new");
    setErr("");
    setMsg("");
    try {
      const created = await api.post<FaqItem>("/faqs", {
        question: "Nova pergunta",
        answer: "Escreva a resposta aqui. URLs viram link automaticamente.",
        icon: "help-circle",
        order: list.length,
        is_active: true,
      });
      setList((prev) => [...prev, created]);
      setMsg("Pergunta adicionada. Edite e saia do campo para salvar.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao criar.");
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: number, data: Record<string, unknown>) {
    setBusyId(id);
    setErr("");
    try {
      const updated = await api.patch<FaqItem>(`/faqs/${id}`, data);
      setList((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao salvar.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta pergunta do FAQ?")) return;
    setBusyId(id);
    try {
      await api.delete(`/faqs/${id}`);
      setList((prev) => prev.filter((item) => item.id !== id));
      setMsg("Pergunta excluída.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-white/40">Carregando FAQ...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/45">
        O que estiver ativo aparece na home, abaixo do formulário. Cole uma URL
        na resposta ou use{" "}
        <code className="text-gold/80">
          {'<a href="https://...">texto do link</a>'}
        </code>{" "}
        para um hyperlink com outro rótulo.
      </p>

      {msg && (
        <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {err}
        </p>
      )}

      <ul className="space-y-3">
        {list.map((item, index) => (
          <FaqRow
            key={item.id}
            item={item}
            writable={writable}
            busy={busyId === item.id}
            canUp={index > 0}
            canDown={index < list.length - 1}
            onMove={(dir) => void move(index, dir)}
            onPatch={(data) => void patch(item.id, data)}
            onRemove={() => void remove(item.id)}
          />
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/35">
            Nenhuma pergunta. Adicione a primeira.
          </li>
        )}
      </ul>

      {writable && (
        <button
          type="button"
          disabled={busyId === "new"}
          onClick={() => void addBlank()}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/20 px-3.5 py-2 text-xs font-semibold text-white/70 hover:border-gold/50 hover:text-gold disabled:opacity-50"
        >
          <Plus size={14} />
          Adicionar pergunta
        </button>
      )}
    </div>
  );
}

function FaqRow({
  item,
  writable,
  busy,
  canUp,
  canDown,
  onMove,
  onPatch,
  onRemove,
}: {
  item: FaqItem;
  writable: boolean;
  busy: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onPatch: (data: Record<string, unknown>) => void;
  onRemove: () => void;
}) {
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);

  useEffect(() => {
    setQuestion(item.question);
    setAnswer(item.answer);
  }, [item]);

  function insertLink() {
    const label = window.prompt("Texto do link", "página de planos");
    if (label === null) return;
    const href = window.prompt("URL", "https://");
    if (!href) return;
    const snippet = `<a href="${href.trim()}">${label.trim() || href.trim()}</a>`;
    const next = answer.trim() ? `${answer.trim()} ${snippet}` : snippet;
    setAnswer(next);
    onPatch({ answer: next });
  }

  return (
    <li
      className={`rounded-xl border border-white/10 bg-ink/45 p-3 ${
        item.is_active ? "" : "opacity-55"
      } ${busy ? "pointer-events-none opacity-70" : ""}`}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div>
          <p className="text-[11px] text-white/45">Ícone</p>
          <div className="mt-1">
            <NavIconPicker
              value={item.icon || "help-circle"}
              onChange={(id) => onPatch({ icon: id })}
              disabled={!writable}
            />
          </div>
        </div>
        <label className="block text-[11px] text-white/45">
          Pergunta
          <input
            value={question}
            disabled={!writable}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={() => {
              if (question.trim() && question !== item.question) {
                onPatch({ question: question.trim() });
              }
            }}
            className={`${inputCls} mt-1`}
          />
        </label>
      </div>
      <label className="mt-2 block text-[11px] text-white/45">
        Resposta
        <textarea
          value={answer}
          disabled={!writable}
          rows={4}
          onChange={(e) => setAnswer(e.target.value)}
          onBlur={() => {
            if (answer.trim() && answer !== item.answer) {
              onPatch({ answer: answer.trim() });
            }
          }}
          className={`${inputCls} mt-1 resize-y`}
        />
      </label>
      {writable && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
          <button
            type="button"
            onClick={insertLink}
            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/25"
          >
            <Link2 size={12} />
            Inserir link
          </button>
          <button
            type="button"
            onClick={() => onPatch({ is_active: !item.is_active })}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-gold"
          >
            {item.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
            {item.is_active ? "Ativo no site" : "Oculto"}
          </button>
          <button
            type="button"
            disabled={!canUp}
            onClick={() => onMove(-1)}
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-gold disabled:opacity-30"
            title="Subir"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            disabled={!canDown}
            onClick={() => onMove(1)}
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-gold disabled:opacity-30"
            title="Descer"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-500/25 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10"
          >
            <Trash2 size={12} />
            Excluir
          </button>
        </div>
      )}
    </li>
  );
}
