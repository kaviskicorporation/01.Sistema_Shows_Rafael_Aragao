"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type ThemedSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export default function ThemedSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  required,
  disabled,
  name,
  className = "",
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    openUp: boolean;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;
  const isPlaceholder = !selected;

  useEffect(() => setMounted(true), []);

  function updatePosition() {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
    const spaceAbove = rect.top - gap - 12;
    const preferUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(240, preferUp ? spaceAbove : spaceBelow);
    const width = Math.min(rect.width, window.innerWidth - 16);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;

    setMenuPos({
      top: preferUp ? rect.top - gap : rect.bottom + gap,
      left,
      width,
      maxHeight: Math.max(120, maxHeight),
      openUp: preferUp,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const menu =
    open && menuPos && mounted
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={{
              position: "fixed",
              top: menuPos.openUp ? undefined : menuPos.top,
              bottom: menuPos.openUp
                ? window.innerHeight - menuPos.top
                : undefined,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-y-auto rounded-2xl border border-gold/30 bg-ink-card py-1.5 shadow-[0_20px_60px_-18px_rgba(0,0,0,0.9)] thin-scroll backdrop-blur-md"
          >
            {options.map((o) => {
              const active = o.value === value;
              return (
                <li
                  key={o.value || "__empty"}
                  role="option"
                  aria-selected={active}
                >
                  <button
                    type="button"
                    disabled={o.disabled}
                    onClick={() => {
                      if (o.disabled) return;
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-gold/15 text-gold"
                        : "text-white/85 hover:bg-white/[0.06] hover:text-white"
                    } ${o.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <span className="min-w-0 break-words">{o.label}</span>
                    {active && (
                      <Check size={14} className="shrink-0 text-gold" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <select
        name={name}
        required={required}
        value={value}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="raw-select pointer-events-none absolute h-0 w-0 opacity-0"
        onChange={() => {}}
      >
        {!options.some((o) => o.value === "") && (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option
            key={o.value || "__empty"}
            value={o.value}
            disabled={o.disabled}
          >
            {o.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-ink text-left outline-none transition-all ${
          compact ? "gap-2 px-3 py-2.5 text-sm" : "min-h-[48px] px-4 py-3 text-sm"
        } ${
          open
            ? "border-gold shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-primary)_18%,transparent)]"
            : "border-white/10 hover:border-white/25 focus:border-gold focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-primary)_15%,transparent)]"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`min-w-0 truncate ${
            isPlaceholder ? "text-white/35" : "font-medium text-white"
          }`}
        >
          {label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gold/80 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {menu}
    </div>
  );
}
