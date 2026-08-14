"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { jumpToContactForm } from "@/lib/scroll";
import {
  buildNavLinks,
  resolveNavIcon,
  type NavMenuConfig,
} from "@/lib/navIcons";

function sectionHref(path: string, hash: string) {
  if (path === "/" || path === "") return hash;
  return `/${hash}`;
}

export default function Navbar({
  title,
  ctaLabel,
  nav,
}: {
  title: string;
  ctaLabel?: string;
  nav?: NavMenuConfig | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const brandFirst = title.split(" ")[0] || "Rafael";
  const brandRest = title.split(" ").slice(1).join(" ") || "Aragão";
  const cta = ctaLabel?.trim() || nav?.nav_cta?.trim() || "Faça seu evento";
  const CtaIcon = resolveNavIcon(nav?.nav_icon_cta, "sparkles");

  const links = useMemo(() => {
    return buildNavLinks(nav).map((l) => ({
      ...l,
      Icon: resolveNavIcon(l.iconId),
    }));
  }, [nav]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const header = (
    <motion.header
      initial={{ opacity: 0, y: -22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-[100] bg-ink pt-[env(safe-area-inset-top)] transition-[box-shadow,padding] duration-300 ${
        scrolled || open
          ? "py-3 shadow-[0_10px_36px_-16px_rgba(0,0,0,0.95)] sm:py-3.5"
          : "py-3.5 sm:py-4"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/#top"
          className="group font-display text-xl font-black tracking-tight sm:text-2xl"
        >
          <span className="text-gold transition-colors group-hover:text-gold-soft">
            {brandFirst}
          </span>{" "}
          <span className="text-white">{brandRest}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={sectionHref(pathname, l.href)}
              onClick={
                l.href === "#contato" && pathname === "/"
                  ? jumpToContactForm
                  : undefined
              }
              className="group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold tracking-wide text-white/75 transition-colors hover:bg-white/8 hover:text-gold"
            >
              <l.Icon
                className="h-4 w-4 text-gold transition-transform group-hover:scale-110"
                strokeWidth={2}
              />
              {l.label}
            </a>
          ))}
          <a
            href={sectionHref(pathname, "#contato")}
            onClick={pathname === "/" ? jumpToContactForm : undefined}
            className="btn-live ml-2 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink shadow-[0_0_24px_-8px_rgba(212,175,55,0.55)]"
            onMouseMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${e.clientX - r.left}px`);
              el.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
          >
            <CtaIcon className="h-4 w-4" strokeWidth={2.25} />
            {cta}
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-6 origin-center bg-white transition ${
                open ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-white transition ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 origin-center bg-white transition ${
                open ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {open && (
        <nav className="mt-1 flex max-h-[calc(100dvh-4.5rem)] flex-col gap-0.5 overflow-y-auto bg-ink px-5 py-3 lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={sectionHref(pathname, l.href)}
              onClick={(e) => {
                if (l.href === "#contato" && pathname === "/") {
                  jumpToContactForm(e);
                }
                setOpen(false);
              }}
              className="inline-flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold text-white/85 hover:bg-white/5 hover:text-gold"
            >
              <l.Icon className="h-[18px] w-[18px] text-gold" strokeWidth={2} />
              {l.label}
            </a>
          ))}
          <a
            href={sectionHref(pathname, "#contato")}
            onClick={(e) => {
              if (pathname === "/") jumpToContactForm(e);
              setOpen(false);
            }}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-center text-[15px] font-bold text-ink"
          >
            <CtaIcon className="h-[18px] w-[18px]" strokeWidth={2.25} />
            {cta}
          </a>
        </nav>
      )}
    </motion.header>
  );

  // Portal no body: evita que transform/filter do PageTransition quebre o fixed
  if (!mounted) return null;
  return createPortal(header, document.body);
}
