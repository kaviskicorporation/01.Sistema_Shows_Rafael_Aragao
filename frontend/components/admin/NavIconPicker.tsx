"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown } from "lucide-react";
import { NAV_ICON_OPTIONS, resolveNavIcon } from "@/lib/navIcons";

type PanelPos = {
  top: number;
  left: number;
  width: number;
  openUp: boolean;
  maxHeight: number;
};

export default function NavIconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const Selected = resolveNavIcon(value);
  const selectedMeta = NAV_ICON_OPTIONS.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return NAV_ICON_OPTIONS;
    return NAV_ICON_OPTIONS.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        o.id.toLowerCase().includes(term)
    );
  }, [q]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 8;
      const preferred = Math.min(320, window.innerHeight * 0.55);
      const spaceBelow = window.innerHeight - r.bottom - gap - 12;
      const spaceAbove = r.top - gap - 12;
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        180,
        Math.min(preferred, openUp ? spaceAbove : spaceBelow)
      );
      const width = Math.max(r.width, Math.min(340, window.innerWidth - 24));
      let left = r.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      setPos({
        top: openUp ? r.top - gap : r.bottom + gap,
        left,
        width,
        openUp,
        maxHeight,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
      setQ("");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && !disabled && mounted && pos
      ? createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp
                ? window.innerHeight - pos.top
                : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 9999,
            }}
            className="flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#141414] shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]"
          >
            <div className="shrink-0 border-b border-white/8 p-2.5">
              <label className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-white/35" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar ícone…"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-white/40">
                  Nenhum ícone encontrado
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                  {filtered.map(({ id, label, Icon }) => {
                    const active = id === value;
                    return (
                      <button
                        key={id}
                        type="button"
                        title={label}
                        onClick={() => {
                          onChange(id);
                          setOpen(false);
                          setQ("");
                        }}
                        className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                          active
                            ? "bg-gold text-ink shadow-[0_0_0_1px_rgba(245,179,1,0.5)]"
                            : "bg-white/[0.03] text-white/75 hover:bg-gold/15 hover:text-gold"
                        }`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                        <span className="max-w-full truncate px-0.5 text-[9px] leading-tight opacity-80">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-white/8 px-3 py-2 text-[11px] text-white/35">
              {filtered.length} ícones · clique para escolher
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-gold/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Selected className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {selectedMeta?.label || "Ícone"}
          </span>
          <span className="block truncate text-[11px] text-white/40">
            {value || "—"}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/40 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {panel}
    </div>
  );
}
