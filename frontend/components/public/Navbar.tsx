"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clapperboard, Handshake, UserRound } from "lucide-react";
import { jumpToContactForm } from "@/lib/scroll";

const links = [
  { href: "#agenda", label: "Agenda", Icon: CalendarDays },
  { href: "#sobre", label: "Sobre", Icon: UserRound },
  { href: "#video", label: "Vídeo", Icon: Clapperboard },
  { href: "#contato", label: "Contratação", Icon: Handshake },
];

export default function Navbar({ title }: { title: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-ink/90 backdrop-blur-md border-b border-white/10 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5">
        <a href="#top" className="font-display text-xl font-extrabold tracking-tight">
          <span className="text-gold">{title.split(" ")[0]}</span>{" "}
          <span className="text-white">
            {title.split(" ").slice(1).join(" ")}
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={l.href === "#contato" ? jumpToContactForm : undefined}
              className="group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-gold"
            >
              <l.Icon
                className="h-4 w-4 text-gold/80 transition-transform group-hover:scale-110 group-hover:text-gold"
                strokeWidth={1.75}
              />
              {l.label}
            </a>
          ))}
          <a
            href="#contato"
            onClick={jumpToContactForm}
            className="btn-live ml-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink"
            onMouseMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${e.clientX - r.left}px`);
              el.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
          >
            Faça seu evento
          </a>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="text-white md:hidden"
          aria-label="Menu"
        >
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
          </div>
        </button>
      </div>

      {open && (
        <nav className="mt-3 flex flex-col gap-1 border-t border-white/10 bg-ink px-5 py-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                if (l.href === "#contato") jumpToContactForm(e);
                setOpen(false);
              }}
              className="inline-flex items-center gap-3 py-2.5 text-white/80 hover:text-gold"
            >
              <l.Icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
