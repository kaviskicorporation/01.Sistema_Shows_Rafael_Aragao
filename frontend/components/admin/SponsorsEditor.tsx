"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { api, ApiError, resultsOf } from "@/lib/api";
import type { Sponsor } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm text-white outline-none focus:border-gold disabled:opacity-60";

export default function SponsorsEditor({ writable }: { writable: boolean }) {
  const [list, setList] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<number | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<{ results: Sponsor[] } | Sponsor[]>(
        "/sponsors/?page_size=100"
      );
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

  async function persistOrder(next: Sponsor[]) {
    setList(next);
    await api.post("/sponsors/reorder/", {
      sponsors: next.map((s, i) => ({ id: s.id, order: i })),
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await persistOrder(next.map((s, i) => ({ ...s, order: i })));
    } catch {
      await load();
    }
  }

  async function addBlank() {
    setBusyId("new");
    setErr("");
    setMsg("");
    try {
      const created = await api.post<Sponsor>("/sponsors/", {
        name: "Novo patrocinador",
        text_mark: "",
        image_url: "",
        link: "",
        order: list.length,
        is_active: true,
      });
      setList((prev) => [...prev, created]);
      setMsg("Patrocinador adicionado.");
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message || "Erro ao criar." : "Erro ao criar."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function patch(id: number, data: Record<string, unknown>) {
    setBusyId(id);
    setErr("");
    try {
      const updated = await api.patch<Sponsor>(`/sponsors/${id}/`, data);
      setList((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Erro ao salvar."
          : "Erro ao salvar."
      );
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function uploadLogo(id: number, file: File) {
    setBusyId(id);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const updated = await api.patch<Sponsor>(`/sponsors/${id}/`, fd);
      setList((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setMsg("Logo enviado.");
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Falha no upload."
          : "Falha no upload."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remover este patrocinador?")) return;
    setBusyId(id);
    try {
      await api.delete(`/sponsors/${id}/`);
      setList((prev) => prev.filter((s) => s.id !== id));
      setMsg("Removido.");
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message || "Erro ao remover."
          : "Erro ao remover."
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-white/40">Carregando patrocinadores...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-white/45">
        Adicione, edite ou remova logos da faixa de patrocinadores na home.
        Use logo (upload ou URL) ou um texto-marca (ex.: CDC).
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
        {list.map((s, index) => (
          <SponsorRow
            key={s.id}
            sponsor={s}
            writable={writable}
            busy={busyId === s.id}
            onMove={(dir) => void move(index, dir)}
            canUp={index > 0}
            canDown={index < list.length - 1}
            onPatch={(data) => void patch(s.id, data)}
            onUpload={(file) => void uploadLogo(s.id, file)}
            onRemove={() => void remove(s.id)}
          />
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/35">
            Nenhum patrocinador. Adicione o primeiro.
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
          Adicionar patrocinador
        </button>
      )}
    </div>
  );
}

function SponsorRow({
  sponsor,
  writable,
  busy,
  onMove,
  canUp,
  canDown,
  onPatch,
  onUpload,
  onRemove,
}: {
  sponsor: Sponsor;
  writable: boolean;
  busy: boolean;
  onMove: (dir: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
  onPatch: (data: Record<string, unknown>) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(sponsor.name);
  const [textMark, setTextMark] = useState(sponsor.text_mark || "");
  const [imageUrl, setImageUrl] = useState(sponsor.image_url || "");
  const [link, setLink] = useState(sponsor.link || "");
  const preview = sponsor.image_display || sponsor.image_url || "";

  useEffect(() => {
    setName(sponsor.name);
    setTextMark(sponsor.text_mark || "");
    setImageUrl(sponsor.image_url || "");
    setLink(sponsor.link || "");
  }, [sponsor]);

  return (
    <li
      className={`overflow-hidden rounded-xl border border-white/10 bg-ink/45 p-3 ${
        sponsor.is_active ? "" : "opacity-55"
      } ${busy ? "pointer-events-none opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={sponsor.name}
              className="max-h-12 max-w-[90%] object-contain"
            />
          ) : (
            <span className="px-2 text-center font-display text-sm font-black tracking-widest text-white/50">
              {textMark || "LOGO"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-[11px] text-white/45">
              Nome
              <input
                value={name}
                disabled={!writable}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name !== sponsor.name) {
                    onPatch({ name: name.trim() });
                  }
                }}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="block text-[11px] text-white/45">
              Texto-marca (sem logo)
              <input
                value={textMark}
                disabled={!writable}
                onChange={(e) => setTextMark(e.target.value)}
                onBlur={() => {
                  if (textMark !== (sponsor.text_mark || "")) {
                    onPatch({ text_mark: textMark });
                  }
                }}
                className={`${inputCls} mt-1`}
                placeholder="Ex.: CDC"
              />
            </label>
            <label className="block text-[11px] text-white/45 sm:col-span-2">
              URL do logo (opcional)
              <input
                value={imageUrl}
                disabled={!writable}
                onChange={(e) => setImageUrl(e.target.value)}
                onBlur={() => {
                  if (imageUrl !== (sponsor.image_url || "")) {
                    onPatch({ image_url: imageUrl });
                  }
                }}
                className={`${inputCls} mt-1`}
                placeholder="/images/senai.png ou https://..."
              />
            </label>
            <label className="block text-[11px] text-white/45 sm:col-span-2">
              Link ao clicar (opcional)
              <input
                value={link}
                disabled={!writable}
                onChange={(e) => setLink(e.target.value)}
                onBlur={() => {
                  if (link !== (sponsor.link || "")) {
                    onPatch({ link });
                  }
                }}
                className={`${inputCls} mt-1`}
                placeholder="https://..."
              />
            </label>
          </div>
        </div>
      </div>

      {writable && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1.5 text-[11px] font-semibold text-gold hover:bg-gold/25"
          >
            <Upload size={12} />
            Upload logo
          </button>
          {sponsor.image && (
            <button
              type="button"
              onClick={() => onPatch({ clear_image: true })}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-gold"
            >
              <ImageIcon size={12} />
              Limpar upload
            </button>
          )}
          <button
            type="button"
            onClick={() => onPatch({ is_active: !sponsor.is_active })}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-gold"
          >
            {sponsor.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
            {sponsor.is_active ? "Ativo" : "Oculto"}
          </button>
          <button
            type="button"
            disabled={!canUp}
            onClick={() => onMove(-1)}
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-gold disabled:opacity-30"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            disabled={!canDown}
            onClick={() => onMove(1)}
            className="rounded-lg border border-white/10 p-1.5 text-white/50 hover:text-gold disabled:opacity-30"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto inline-flex items-center gap-1 rounded-full border border-red-500/25 px-2.5 py-1.5 text-[11px] text-red-300 hover:bg-red-500/10"
          >
            <Trash2 size={12} />
            Remover
          </button>
        </div>
      )}
    </li>
  );
}
