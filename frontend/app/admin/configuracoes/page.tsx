"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  RotateCcw,
  Settings,
  Type,
  Image as ImageIcon,
  Palette,
  UserRound,
  Share2,
  Mail,
  Phone,
  Search,
  EyeOff,
  Sparkles,
  Upload,
  CalendarDays,
  Clapperboard,
  List,
  Handshake,
  AlertTriangle,
  X,
  Menu,
  type LucideIcon,
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
import SponsorsEditor from "@/components/admin/SponsorsEditor";
import NavIconPicker from "@/components/admin/NavIconPicker";
import { api, ApiError } from "@/lib/api";
import type { SiteConfig } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import {
  FacebookIcon,
  InstagramIcon,
  SpotifyIcon,
  TikTokIcon,
  YoutubeIcon,
} from "@/components/public/SocialIcons";
import { dispatchThemeUpdate } from "@/lib/theme";
import { SITE_DEFAULTS } from "@/lib/siteDefaults";
import ThemedSelect from "@/components/ui/ThemedSelect";

const CONFIG_NAV: {
  id: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "cfg-hero", label: "Primeira tela (Hero)", icon: Sparkles },
  { id: "cfg-menu", label: "Menu do site", icon: Menu },
  { id: "cfg-sobre", label: "Sobre o Artista", icon: UserRound },
  { id: "cfg-redes", label: "Redes sociais", icon: Share2 },
  { id: "cfg-rodape", label: "Rodapé e contato", icon: Mail },
  { id: "cfg-patrocinadores", label: "Patrocinadores", icon: Handshake },
  { id: "cfg-seo", label: "SEO / Open Graph", icon: Search },
  { id: "cfg-video", label: "Vídeo em destaque", icon: Clapperboard },
  { id: "cfg-agenda", label: "Agenda pública", icon: CalendarDays },
  { id: "cfg-ocultacao", label: "Ocultação automática", icon: EyeOff },
];

const TRACKED_KEYS: (keyof SiteConfig)[] = [
  "hero_title",
  "hero_subtitle",
  "hero_subtitle_lead",
  "hero_image_url",
  "hero_wordmark",
  "hero_badge",
  "hero_cta_primary",
  "hero_cta_secondary",
  "hero_cta_icon_primary",
  "hero_cta_icon_secondary",
  "hero_next_label",
  "hero_scroll_label",
  "nav_cta",
  "nav_icon_cta",
  "nav_label_agenda",
  "nav_icon_agenda",
  "nav_label_sobre",
  "nav_icon_sobre",
  "nav_label_video",
  "nav_icon_video",
  "nav_label_contato",
  "nav_icon_contato",
  "hero_tag_1",
  "hero_tag_2",
  "hero_tag_3",
  "hero_tag_4",
  "primary_color",
  "secondary_color",
  "about_title",
  "about_text",
  "about_image_url",
  "instagram",
  "youtube",
  "spotify",
  "tiktok",
  "facebook",
  "footer_text",
  "contact_email",
  "contact_phone",
  "seo_title",
  "seo_description",
  "og_image_url",
  "hide_rule",
  "hide_days_after",
  "agenda_default_view",
  "agenda_list_page_size",
  "featured_video_url",
  "sponsors_title",
];

function snapshotConfig(form: Partial<SiteConfig>) {
  const out: Record<string, unknown> = {};
  for (const key of TRACKED_KEYS) {
    out[key] = form[key] ?? null;
  }
  return JSON.stringify(out);
}

function scrollToConfigSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const SOCIALS = [
  {
    key: "instagram" as const,
    label: "Instagram",
    placeholder: "https://instagram.com/...",
    Icon: InstagramIcon,
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    placeholder: "https://youtube.com/@...",
    Icon: YoutubeIcon,
  },
  {
    key: "spotify" as const,
    label: "Spotify",
    placeholder: "https://open.spotify.com/...",
    Icon: SpotifyIcon,
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    placeholder: "https://tiktok.com/@...",
    Icon: TikTokIcon,
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    placeholder: "https://facebook.com/...",
    Icon: FacebookIcon,
  },
];

type DefaultKey = keyof typeof SITE_DEFAULTS;
type ImageSlot = "hero" | "about" | "og";

const IMAGE_SLOTS: Record<
  ImageSlot,
  {
    fileKey: "hero_image" | "about_image" | "og_image";
    urlKey: "hero_image_url" | "about_image_url" | "og_image_url";
    displayKey:
      | "hero_image_display"
      | "about_image_display"
      | "og_image_display";
    clearKey: "clear_hero_image" | "clear_about_image" | "clear_og_image";
    label: string;
  }
> = {
  hero: {
    fileKey: "hero_image",
    urlKey: "hero_image_url",
    displayKey: "hero_image_display",
    clearKey: "clear_hero_image",
    label: "Imagem do hero",
  },
  about: {
    fileKey: "about_image",
    urlKey: "about_image_url",
    displayKey: "about_image_display",
    clearKey: "clear_about_image",
    label: "Imagem do sobre",
  },
  og: {
    fileKey: "og_image",
    urlKey: "og_image_url",
    displayKey: "og_image_display",
    clearKey: "clear_og_image",
    label: "Imagem Open Graph (compartilhamento)",
  },
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { can, canWrite, logout } = useAuth();
  const writable = canWrite("config");
  const [form, setForm] = useState<Partial<SiteConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pendingFiles, setPendingFiles] = useState<
    Partial<Record<ImageSlot, File>>
  >({});
  const [clearFlags, setClearFlags] = useState<
    Partial<Record<ImageSlot, boolean>>
  >({});
  const [previews, setPreviews] = useState<Partial<Record<ImageSlot, string>>>(
    {}
  );
  const [activeSection, setActiveSection] = useState(CONFIG_NAV[0].id);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const savedSnapRef = useRef("");
  const savedFormRef = useRef<Partial<SiteConfig> | null>(null);
  const allowLeaveRef = useRef(false);
  const dirtyRef = useRef(false);

  const markSaved = useCallback((data: Partial<SiteConfig>) => {
    savedFormRef.current = data;
    savedSnapRef.current = snapshotConfig(data);
  }, []);

  const isDirty = useMemo(() => {
    if (!form || !writable) return false;
    if (!savedSnapRef.current) return false;
    const formDirty = snapshotConfig(form) !== savedSnapRef.current;
    const filesDirty = Object.keys(pendingFiles).length > 0;
    const clearDirty = Object.keys(clearFlags).length > 0;
    return formDirty || filesDirty || clearDirty;
  }, [form, pendingFiles, clearFlags, writable]);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (!can("config")) return;
    api
      .get<SiteConfig>("/site-config/")
      .then((data) => {
        setForm(data);
        markSaved(data);
      })
      .catch(() => {});
  }, [can, markSaved]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form) return;
    const nodes = CONFIG_NAV.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => Boolean(n)
    );
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.55],
      }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [form]);

  useEffect(() => {
    const chip = document.querySelector<HTMLElement>(
      `[data-cfg-nav="${activeSection}"]`
    );
    chip?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeSection]);

  const askLeave = useCallback((dest: string) => {
    setPendingNav(dest);
    setLeaveOpen(true);
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const onDocClick = (e: MouseEvent) => {
      if (allowLeaveRef.current || !dirtyRef.current) return;
      if (leaveOpen) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (anchor) {
        const href = anchor.getAttribute("href") || "";
        if (
          !href ||
          href.startsWith("#") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          anchor.target === "_blank" ||
          anchor.hasAttribute("download")
        ) {
          return;
        }
        let url: URL;
        try {
          url = new URL(href, window.location.origin);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        askLeave(`${url.pathname}${url.search}${url.hash}`);
        return;
      }

      const logoutBtn = target.closest("aside button");
      if (
        logoutBtn &&
        /sair/i.test(logoutBtn.textContent || "") &&
        !logoutBtn.closest("[data-leave-dialog]")
      ) {
        e.preventDefault();
        e.stopPropagation();
        askLeave("__logout__");
      }
    };

    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [isDirty, leaveOpen, askLeave]);

  useEffect(() => {
    if (!isDirty) return;
    const marker = { __cfgUnsaved: true };
    window.history.pushState(marker, "");

    const onPopState = () => {
      if (allowLeaveRef.current || !dirtyRef.current) return;
      window.history.pushState(marker, "");
      askLeave("__back__");
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty, askLeave]);

  const discardChanges = useCallback(() => {
    const saved = savedFormRef.current;
    if (saved) {
      setForm({ ...saved });
      dispatchThemeUpdate(
        String(saved.primary_color || SITE_DEFAULTS.primary_color),
        String(saved.secondary_color || SITE_DEFAULTS.secondary_color)
      );
    }
    setPendingFiles({});
    setClearFlags({});
    setPreviews((prev) => {
      Object.values(prev).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      return {};
    });
    setMsg("");
    setErr("");
  }, []);

  const finishLeave = useCallback(
    async (dest: string | null) => {
      allowLeaveRef.current = true;
      setLeaveOpen(false);
      setPendingNav(null);
      if (!dest) return;
      if (dest === "__logout__") {
        await logout();
        return;
      }
      if (dest === "__back__") {
        // Remove o estado-guarda + volta à página anterior
        window.history.go(-2);
        return;
      }
      router.push(dest);
    },
    [logout, router]
  );

  if (!can("config")) {
    return (
      <>
        <Topbar title="Configurações" />
        <p className="p-6 text-white/50">Sem permissão para este módulo.</p>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <Topbar title="Configurações" />
        <p className="p-6 text-white/50">Carregando...</p>
      </>
    );
  }

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setForm((f) => ({ ...f!, [key]: value }));
  }

  function previewFor(slot: ImageSlot): string {
    if (previews[slot]) return previews[slot]!;
    if (clearFlags[slot]) {
      return String(SITE_DEFAULTS[IMAGE_SLOTS[slot].urlKey] || "");
    }
    const meta = IMAGE_SLOTS[slot];
    return (
      String(form![meta.displayKey] || "") ||
      String(form![meta.urlKey] || "") ||
      String(SITE_DEFAULTS[meta.urlKey] || "")
    );
  }

  function onPickImage(slot: ImageSlot, file: File | null) {
    setPreviews((prev) => {
      const old = prev[slot];
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      const next = { ...prev };
      if (file) next[slot] = URL.createObjectURL(file);
      else delete next[slot];
      return next;
    });
    setPendingFiles((prev) => {
      const next = { ...prev };
      if (file) next[slot] = file;
      else delete next[slot];
      return next;
    });
    setClearFlags((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  function resetField(key: DefaultKey) {
    const value = SITE_DEFAULTS[key];
    setForm((f) => ({ ...f!, [key]: value }));
    if (key === "primary_color" || key === "secondary_color") {
      const next = { ...form!, [key]: value };
      dispatchThemeUpdate(
        String(next.primary_color || SITE_DEFAULTS.primary_color),
        String(next.secondary_color || SITE_DEFAULTS.secondary_color)
      );
    }
  }

  function resetImage(slot: ImageSlot) {
    const meta = IMAGE_SLOTS[slot];
    const defUrl = SITE_DEFAULTS[meta.urlKey];
    setForm((f) => ({
      ...f!,
      [meta.urlKey]: defUrl,
      [meta.fileKey]: null,
      [meta.displayKey]: defUrl,
    }));
    setPendingFiles((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setClearFlags((prev) => ({ ...prev, [slot]: true }));
    setPreviews((prev) => {
      const old = prev[slot];
      if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
      return { ...prev, [slot]: String(defUrl || "") };
    });
  }

  async function save(): Promise<boolean> {
    if (!form) return false;
    const current = form;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const fd = new FormData();
      const primary = current.primary_color || "#f5b301";
      const secondary = current.secondary_color || "#0f0f0f";
      const fields: [string, string | number][] = [
        ["hero_title", current.hero_title || ""],
        ["hero_subtitle_lead", current.hero_subtitle_lead || ""],
        ["hero_subtitle", current.hero_subtitle || ""],
        ["hero_wordmark", current.hero_wordmark || ""],
        ["hero_badge", current.hero_badge || ""],
        ["hero_cta_primary", current.hero_cta_primary || ""],
        ["hero_cta_secondary", current.hero_cta_secondary || ""],
        ["hero_cta_icon_primary", current.hero_cta_icon_primary || "calendar-days"],
        ["hero_cta_icon_secondary", current.hero_cta_icon_secondary || "handshake"],
        ["hero_next_label", current.hero_next_label || ""],
        ["hero_scroll_label", current.hero_scroll_label || ""],
        ["nav_cta", current.nav_cta || ""],
        ["nav_icon_cta", current.nav_icon_cta || "sparkles"],
        ["nav_label_agenda", current.nav_label_agenda || ""],
        ["nav_icon_agenda", current.nav_icon_agenda || "calendar-days"],
        ["nav_label_sobre", current.nav_label_sobre || ""],
        ["nav_icon_sobre", current.nav_icon_sobre || "user-round"],
        ["nav_label_video", current.nav_label_video || ""],
        ["nav_icon_video", current.nav_icon_video || "clapperboard"],
        ["nav_label_contato", current.nav_label_contato || ""],
        ["nav_icon_contato", current.nav_icon_contato || "handshake"],
        ["hero_tag_1", current.hero_tag_1 || ""],
        ["hero_tag_2", current.hero_tag_2 || ""],
        ["hero_tag_3", current.hero_tag_3 || ""],
        ["hero_tag_4", current.hero_tag_4 || ""],
        ["hero_image_url", current.hero_image_url || ""],
        ["primary_color", primary],
        ["secondary_color", secondary],
        ["about_title", current.about_title || ""],
        ["about_text", current.about_text || ""],
        ["about_image_url", current.about_image_url || ""],
        ["instagram", current.instagram || ""],
        ["youtube", current.youtube || ""],
        ["spotify", current.spotify || ""],
        ["tiktok", current.tiktok || ""],
        ["facebook", current.facebook || ""],
        ["footer_text", current.footer_text || ""],
        ["contact_email", current.contact_email || ""],
        ["contact_phone", current.contact_phone || ""],
        ["seo_title", current.seo_title || ""],
        ["seo_description", current.seo_description || ""],
        ["og_image_url", current.og_image_url || ""],
        ["hide_rule", current.hide_rule || "next_day"],
        ["hide_days_after", current.hide_days_after ?? 1],
        [
          "agenda_default_view",
          current.agenda_default_view === "list" ? "list" : "calendar",
        ],
        [
          "agenda_list_page_size",
          Math.max(1, Math.min(200, Number(current.agenda_list_page_size) || 20)),
        ],
        ["featured_video_url", current.featured_video_url || ""],
        [
          "sponsors_title",
          current.sponsors_title || SITE_DEFAULTS.sponsors_title || "Patrocinadores",
        ],
      ];
      for (const [k, v] of fields) fd.append(k, String(v));

      (Object.keys(IMAGE_SLOTS) as ImageSlot[]).forEach((slot) => {
        const meta = IMAGE_SLOTS[slot];
        if (clearFlags[slot]) fd.append(meta.clearKey, "true");
        const file = pendingFiles[slot];
        if (file) fd.append(meta.fileKey, file);
      });

      const updated = await api.put<SiteConfig>("/site-config/", fd);
      setForm(updated);
      markSaved(updated);
      setPendingFiles({});
      setClearFlags({});
      setPreviews((prev) => {
        Object.values(prev).forEach((url) => {
          if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        return {};
      });
      dispatchThemeUpdate(
        updated.primary_color || primary,
        updated.secondary_color || secondary
      );
      setMsg("Configurações salvas com sucesso.");
      return true;
    } catch (e) {
      const detail =
        e instanceof ApiError
          ? e.message || "Erro ao salvar."
          : "Erro ao salvar.";
      setErr(detail);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Configurações do Site" />
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <AdminHero
          icon={Settings}
          title="Configurações do site"
          subtitle="Textos, cores, redes e contato. Em toda opção há o botão Voltar ao padrão."
        />

        <div className="relative mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          {/* Sumário lateral — sempre acompanha o scroll */}
          <aside className="sticky top-[4.5rem] z-10 w-full shrink-0 self-start sm:top-[4.75rem] lg:w-56 xl:w-64">
            <nav
              aria-label="Ir para seção"
              className="max-h-[min(70vh,calc(100svh-5.75rem))] overflow-y-auto overscroll-contain rounded-2xl border border-[color-mix(in_srgb,var(--admin-tone)_30%,transparent)] bg-gradient-to-b from-[#1a1a1a] via-ink-card to-[#121212] p-3.5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)]"
            >
              <div className="mb-3 border-b border-[color-mix(in_srgb,var(--admin-tone)_22%,transparent)] pb-3">
                <p className="admin-tone px-1 text-[10px] font-bold uppercase tracking-[0.28em]">
                  Ir para seção
                </p>
                <p className="mt-1 px-1 text-[11px] text-white/40">
                  Clique para ir direto ao bloco
                </p>
              </div>
              <ul className="space-y-1">
                {CONFIG_NAV.map(({ id, label }, index) => {
                  const active = activeSection === id;
                  const n = index + 1;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        data-cfg-nav={id}
                        onClick={() => {
                          setActiveSection(id);
                          scrollToConfigSection(id);
                        }}
                        className={`group flex w-full items-start gap-2.5 rounded-xl px-2 py-2 text-left transition ${
                          active
                            ? "bg-[color-mix(in_srgb,var(--admin-tone)_16%,transparent)] shadow-[inset_3px_0_0_0_var(--admin-tone)]"
                            : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums transition ${
                            active
                              ? "admin-tone-btn"
                              : "bg-white/[0.06] text-[color-mix(in_srgb,var(--admin-tone)_70%,white)] group-hover:bg-[color-mix(in_srgb,var(--admin-tone)_20%,transparent)]"
                          }`}
                        >
                          {n}
                        </span>
                        <span
                          className={`min-w-0 flex-1 pt-0.5 text-[13px] leading-snug transition ${
                            active
                              ? "admin-tone font-semibold"
                              : "font-medium text-white/70 group-hover:text-white"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 flex-1 space-y-8 overflow-x-hidden">
        <Section id="cfg-hero" title="Primeira tela (Hero)" icon={Sparkles}>
          <p className="mb-1 text-sm text-white/45">
            Título, subtítulo e foto que aparecem na abertura do site — a imagem
            do artista na cadeira e os textos principais.
          </p>
          <ConfigField
            label="Título principal"
            icon={Type}
            fieldKey="hero_title"
            canReset={writable}
            onReset={() => resetField("hero_title")}
          >
            <input
              value={form.hero_title || ""}
              onChange={(e) => set("hero_title", e.target.value)}
              className={inputCls}
              disabled={!writable}
              placeholder="Rafael Aragão"
            />
          </ConfigField>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConfigField
              label="Texto dourado (acima)"
              icon={Type}
              fieldKey="hero_subtitle_lead"
              canReset={writable}
              onReset={() => resetField("hero_subtitle_lead")}
            >
              <input
                value={form.hero_subtitle_lead || ""}
                onChange={(e) => set("hero_subtitle_lead", e.target.value)}
                className={inputCls}
                disabled={!writable}
                placeholder="Espetáculo"
              />
            </ConfigField>
            <ConfigField
              label="Texto de apoio (abaixo)"
              icon={Type}
              fieldKey="hero_subtitle"
              canReset={writable}
              onReset={() => resetField("hero_subtitle")}
            >
              <input
                value={form.hero_subtitle || ""}
                onChange={(e) => set("hero_subtitle", e.target.value)}
                className={inputCls}
                disabled={!writable}
                placeholder="O artista que lota teatros pelo Brasil"
              />
            </ConfigField>
          </div>
          <ConfigField
            label="Marca de fundo (Rei dos Peão)"
            icon={Type}
            fieldKey="hero_wordmark"
            canReset={writable}
            onReset={() => resetField("hero_wordmark")}
          >
            <input
              value={form.hero_wordmark || ""}
              onChange={(e) => set("hero_wordmark", e.target.value)}
              className={inputCls}
              disabled={!writable}
              placeholder="Rei dos Peão"
            />
          </ConfigField>
          <ConfigField
            label="Selo (Ao vivo / Turnê)"
            icon={Type}
            fieldKey="hero_badge"
            canReset={writable}
            onReset={() => resetField("hero_badge")}
          >
            <input
              value={form.hero_badge || ""}
              onChange={(e) => set("hero_badge", e.target.value)}
              className={inputCls}
              disabled={!writable}
              placeholder="Ao vivo · Turnê {year}"
            />
          </ConfigField>
          <p className="text-xs text-white/35">
            Use <code className="text-gold/80">{"{year}"}</code> para o ano da
            agenda entrar sozinho (ex.: 2026).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-3 sm:p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">
                Botão principal
              </p>
              <div className="space-y-3">
                <ConfigField
                  label="Texto"
                  icon={Type}
                  fieldKey="hero_cta_primary"
                  canReset={writable}
                  onReset={() => resetField("hero_cta_primary")}
                >
                  <input
                    value={form.hero_cta_primary || ""}
                    onChange={(e) => set("hero_cta_primary", e.target.value)}
                    className={inputCls}
                    disabled={!writable}
                    placeholder="Ver agenda"
                  />
                </ConfigField>
                <ConfigField
                  label="Ícone"
                  icon={CalendarDays}
                  fieldKey="hero_cta_icon_primary"
                  canReset={writable}
                  onReset={() => resetField("hero_cta_icon_primary")}
                >
                  <NavIconPicker
                    value={String(
                      form.hero_cta_icon_primary ||
                        SITE_DEFAULTS.hero_cta_icon_primary
                    )}
                    onChange={(id) => set("hero_cta_icon_primary", id)}
                    disabled={!writable}
                  />
                </ConfigField>
              </div>
            </div>
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-3 sm:p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">
                Botão secundário
              </p>
              <div className="space-y-3">
                <ConfigField
                  label="Texto"
                  icon={Type}
                  fieldKey="hero_cta_secondary"
                  canReset={writable}
                  onReset={() => resetField("hero_cta_secondary")}
                >
                  <input
                    value={form.hero_cta_secondary || ""}
                    onChange={(e) => set("hero_cta_secondary", e.target.value)}
                    className={inputCls}
                    disabled={!writable}
                    placeholder="Contratar show"
                  />
                </ConfigField>
                <ConfigField
                  label="Ícone"
                  icon={Handshake}
                  fieldKey="hero_cta_icon_secondary"
                  canReset={writable}
                  onReset={() => resetField("hero_cta_icon_secondary")}
                >
                  <NavIconPicker
                    value={String(
                      form.hero_cta_icon_secondary ||
                        SITE_DEFAULTS.hero_cta_icon_secondary
                    )}
                    onChange={(id) => set("hero_cta_icon_secondary", id)}
                    disabled={!writable}
                  />
                </ConfigField>
              </div>
            </div>
            <ConfigField
              label="Rótulo do próximo show"
              icon={Type}
              fieldKey="hero_next_label"
              canReset={writable}
              onReset={() => resetField("hero_next_label")}
            >
              <input
                value={form.hero_next_label || ""}
                onChange={(e) => set("hero_next_label", e.target.value)}
                className={inputCls}
                disabled={!writable}
                placeholder="Próximo show"
              />
            </ConfigField>
            <ConfigField
              label="Texto de rolar"
              icon={Type}
              fieldKey="hero_scroll_label"
              canReset={writable}
              onReset={() => resetField("hero_scroll_label")}
            >
              <input
                value={form.hero_scroll_label || ""}
                onChange={(e) => set("hero_scroll_label", e.target.value)}
                className={inputCls}
                disabled={!writable}
                placeholder="Role"
              />
            </ConfigField>
          </div>
          <p className="mt-2 text-sm text-white/45">Faixa inferior (ticker)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["hero_tag_1", "Humor de palco"],
                ["hero_tag_2", "Turnê nacional"],
                ["hero_tag_3", "Agenda {year}"],
                ["hero_tag_4", "Teatros lotados"],
              ] as const
            ).map(([key, placeholder], i) => (
              <ConfigField
                key={key}
                label={`Tag ${i + 1}`}
                icon={Type}
                fieldKey={key}
                canReset={writable}
                onReset={() => resetField(key)}
              >
                <input
                  value={form[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                  className={inputCls}
                  disabled={!writable}
                  placeholder={placeholder}
                />
              </ConfigField>
            ))}
          </div>
          <ImageUploadField
            label="Foto da primeira tela"
            preview={previewFor("hero")}
            disabled={!writable}
            canReset={writable}
            onReset={() => resetImage("hero")}
            onFile={(file) => onPickImage("hero", file)}
          />
          <p className="text-xs text-white/35">
            Use a arte do artista (ex.: na cadeira). A faixa &quot;Turnê
            20XX&quot; monta sozinha pela agenda de eventos.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ConfigField
              label="Cor primária (destaques)"
              icon={Palette}
              fieldKey="primary_color"
              canReset={writable}
              onReset={() => resetField("primary_color")}
            >
              <input
                type="color"
                value={form.primary_color || "#f5b301"}
                onChange={(e) => {
                  set("primary_color", e.target.value);
                  dispatchThemeUpdate(
                    e.target.value,
                    form.secondary_color || "#0f0f0f"
                  );
                }}
                className="h-10 w-full cursor-pointer rounded border border-white/10"
                disabled={!writable}
              />
            </ConfigField>
            <ConfigField
              label="Cor secundária (fundo)"
              icon={Palette}
              fieldKey="secondary_color"
              canReset={writable}
              onReset={() => resetField("secondary_color")}
            >
              <input
                type="color"
                value={form.secondary_color || "#0f0f0f"}
                onChange={(e) => {
                  set("secondary_color", e.target.value);
                  dispatchThemeUpdate(
                    form.primary_color || "#f5b301",
                    e.target.value
                  );
                }}
                className="h-10 w-full cursor-pointer rounded border border-white/10"
                disabled={!writable}
              />
            </ConfigField>
          </div>
          <p className="text-xs text-white/40">
            A prévia das cores aplica na hora no painel. Clique em salvar para
            valer no site público também.
          </p>
        </Section>

        <Section id="cfg-menu" title="Menu do site" icon={Menu}>
          <p className="mb-1 text-sm text-white/50">
            Nomes e ícones do menu público (Agenda, Sobre, Vídeo, Contratação) e
            o botão de destaque do header.
          </p>
          {(
            [
              {
                labelKey: "nav_label_agenda" as const,
                iconKey: "nav_icon_agenda" as const,
                title: "Agenda",
                placeholder: "Agenda",
              },
              {
                labelKey: "nav_label_sobre" as const,
                iconKey: "nav_icon_sobre" as const,
                title: "Sobre",
                placeholder: "Sobre",
              },
              {
                labelKey: "nav_label_video" as const,
                iconKey: "nav_icon_video" as const,
                title: "Vídeo",
                placeholder: "Vídeo",
              },
              {
                labelKey: "nav_label_contato" as const,
                iconKey: "nav_icon_contato" as const,
                title: "Contratação",
                placeholder: "Contratação",
              },
            ] as const
          ).map((item) => (
            <div
              key={item.labelKey}
              className="rounded-2xl border border-white/8 bg-white/[0.02] p-3 sm:p-4"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold/80">
                Seção · {item.title}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ConfigField
                  label="Nome no menu"
                  icon={Type}
                  fieldKey={item.labelKey}
                  canReset={writable}
                  onReset={() => resetField(item.labelKey)}
                >
                  <input
                    value={form[item.labelKey] || ""}
                    onChange={(e) => set(item.labelKey, e.target.value)}
                    className={inputCls}
                    disabled={!writable}
                    placeholder={item.placeholder}
                  />
                </ConfigField>
                <ConfigField
                  label="Ícone"
                  icon={Sparkles}
                  fieldKey={item.iconKey}
                  canReset={writable}
                  onReset={() => resetField(item.iconKey)}
                >
                  <NavIconPicker
                    value={String(form[item.iconKey] || SITE_DEFAULTS[item.iconKey])}
                    onChange={(id) => set(item.iconKey, id)}
                    disabled={!writable}
                  />
                </ConfigField>
              </div>
            </div>
          ))}
          <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] p-3 sm:p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold">
              Botão do header
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ConfigField
                label="Texto do botão"
                icon={Type}
                fieldKey="nav_cta"
                canReset={writable}
                onReset={() => resetField("nav_cta")}
              >
                <input
                  value={form.nav_cta || ""}
                  onChange={(e) => set("nav_cta", e.target.value)}
                  className={inputCls}
                  disabled={!writable}
                  placeholder="Faça seu evento"
                />
              </ConfigField>
              <ConfigField
                label="Ícone do botão"
                icon={Sparkles}
                fieldKey="nav_icon_cta"
                canReset={writable}
                onReset={() => resetField("nav_icon_cta")}
              >
                <NavIconPicker
                  value={String(form.nav_icon_cta || SITE_DEFAULTS.nav_icon_cta)}
                  onChange={(id) => set("nav_icon_cta", id)}
                  disabled={!writable}
                />
              </ConfigField>
            </div>
          </div>
        </Section>

        <Section id="cfg-sobre" title="Sobre o Artista" icon={UserRound}>
          <ConfigField
            label="Título"
            icon={Type}
            fieldKey="about_title"
            canReset={writable}
            onReset={() => resetField("about_title")}
          >
            <input
              value={form.about_title || ""}
              onChange={(e) => set("about_title", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ConfigField
            label="Texto"
            icon={Type}
            fieldKey="about_text"
            canReset={writable}
            onReset={() => resetField("about_text")}
          >
            <textarea
              rows={5}
              value={form.about_text || ""}
              onChange={(e) => set("about_text", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ImageUploadField
            label="Imagem do sobre"
            preview={previewFor("about")}
            disabled={!writable}
            canReset={writable}
            onReset={() => resetImage("about")}
            onFile={(file) => onPickImage("about", file)}
          />
        </Section>

        <Section id="cfg-redes" title="Redes sociais" icon={Share2}>
          <p className="mb-1 text-xs text-white/40">
            Links preenchidos aparecem no rodapé do site com o ícone oficial da
            rede.
          </p>
          <div className="grid gap-3">
            {SOCIALS.map(({ key, label, placeholder, Icon }) => (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink/60 px-3 py-2.5 transition focus-within:border-white/25"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[22%]">
                  <Icon className="h-8 w-8" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white/55">
                      {label}
                    </span>
                    {writable && (
                      <ResetBtn onClick={() => resetField(key)} />
                    )}
                  </span>
                  <input
                    value={(form[key] as string) || ""}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                    disabled={!writable}
                  />
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="cfg-rodape" title="Rodapé e contato" icon={Mail}>
          <ConfigField
            label="Texto do rodapé"
            icon={Type}
            fieldKey="footer_text"
            canReset={writable}
            onReset={() => resetField("footer_text")}
          >
            <input
              value={form.footer_text || ""}
              onChange={(e) => set("footer_text", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ConfigField
            label="E-mail de contato"
            icon={Mail}
            fieldKey="contact_email"
            canReset={writable}
            onReset={() => resetField("contact_email")}
          >
            <input
              value={form.contact_email || ""}
              onChange={(e) => set("contact_email", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ConfigField
            label="Telefone de contato"
            icon={Phone}
            fieldKey="contact_phone"
            canReset={writable}
            onReset={() => resetField("contact_phone")}
          >
            <input
              value={form.contact_phone || ""}
              onChange={(e) => set("contact_phone", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
        </Section>

        <Section id="cfg-patrocinadores" title="Patrocinadores" icon={Handshake}>
          <ConfigField
            label="Título da seção"
            icon={Type}
            fieldKey="sponsors_title"
            canReset={writable}
            onReset={() => resetField("sponsors_title")}
          >
            <input
              value={form.sponsors_title || ""}
              onChange={(e) => set("sponsors_title", e.target.value)}
              className={inputCls}
              disabled={!writable}
              placeholder="Patrocinadores"
            />
          </ConfigField>
          <div className="mt-2 overflow-x-hidden">
            <SponsorsEditor writable={writable} />
          </div>
          <p className="mt-2 text-[11px] text-white/35">
            O título acima é salvo com o botão Salvar no final da página. Os
            logos salvam automaticamente ao editar.
          </p>
        </Section>

        <Section id="cfg-seo" title="SEO / Open Graph" icon={Search}>
          <ConfigField
            label="Meta title"
            icon={Type}
            fieldKey="seo_title"
            canReset={writable}
            onReset={() => resetField("seo_title")}
          >
            <input
              value={form.seo_title || ""}
              onChange={(e) => set("seo_title", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ConfigField
            label="Meta description"
            icon={Type}
            fieldKey="seo_description"
            canReset={writable}
            onReset={() => resetField("seo_description")}
          >
            <input
              value={form.seo_description || ""}
              onChange={(e) => set("seo_description", e.target.value)}
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <ImageUploadField
            label="Imagem Open Graph"
            preview={previewFor("og")}
            disabled={!writable}
            canReset={writable}
            onReset={() => resetImage("og")}
            onFile={(file) => onPickImage("og", file)}
          />
        </Section>

        <Section id="cfg-video" title="Vídeo em destaque" icon={Clapperboard}>
          <ConfigField
            label="URL do YouTube"
            icon={Clapperboard}
            fieldKey="featured_video_url"
            canReset={writable}
            onReset={() => resetField("featured_video_url")}
          >
            <input
              value={form.featured_video_url || ""}
              onChange={(e) => set("featured_video_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <p className="text-xs text-white/40">
            Aparece na seção Vídeo da home. Aceita link completo do YouTube
            (incluindo tempo inicial, ex.: &amp;t=5s). Deixe em branco para
            ocultar a seção.
          </p>
        </Section>

        <Section id="cfg-agenda" title="Agenda pública" icon={CalendarDays}>
          <ConfigField
            label="Modo inicial ao abrir o site"
            icon={CalendarDays}
            fieldKey="agenda_default_view"
            canReset={writable}
            onReset={() => resetField("agenda_default_view")}
          >
            <ThemedSelect
              value={form.agenda_default_view || "calendar"}
              onChange={(v) =>
                set("agenda_default_view", v === "list" ? "list" : "calendar")
              }
              disabled={!writable}
              options={[
                { value: "calendar", label: "Calendário" },
                { value: "list", label: "Lista" },
              ]}
            />
          </ConfigField>
          <ConfigField
            label="Shows por página na lista"
            icon={List}
            fieldKey="agenda_list_page_size"
            canReset={writable}
            onReset={() => resetField("agenda_list_page_size")}
          >
            <input
              type="number"
              min={1}
              max={200}
              value={form.agenda_list_page_size ?? 20}
              onChange={(e) =>
                set("agenda_list_page_size", Number(e.target.value) || 20)
              }
              className={inputCls}
              disabled={!writable}
            />
          </ConfigField>
          <p className="text-xs text-white/40">
            Na visão Lista, mostra esse total primeiro e o botão &quot;Ver
            mais&quot; carrega o mesmo tanto de novo. Padrão: 20.
          </p>
        </Section>

        <Section
          id="cfg-ocultacao"
          title="Ocultação automática de eventos"
          icon={EyeOff}
        >
          <ConfigField
            label="Regra global"
            icon={EyeOff}
            fieldKey="hide_rule"
            canReset={writable}
            onReset={() => resetField("hide_rule")}
          >
            <ThemedSelect
              value={form.hide_rule || "next_day"}
              onChange={(v) => set("hide_rule", v)}
              disabled={!writable}
              options={[
                {
                  value: "immediate",
                  label: "Imediatamente após o evento",
                },
                { value: "next_day", label: "1 dia depois" },
                {
                  value: "days_after",
                  label: "X dias após o encerramento",
                },
              ]}
            />
          </ConfigField>
          {form.hide_rule === "days_after" && (
            <ConfigField
              label="Quantidade de dias"
              icon={EyeOff}
              fieldKey="hide_days_after"
              canReset={writable}
              onReset={() => resetField("hide_days_after")}
            >
              <input
                type="number"
                min={1}
                value={form.hide_days_after ?? 1}
                onChange={(e) =>
                  set("hide_days_after", Number(e.target.value))
                }
                className={inputCls}
                disabled={!writable}
              />
            </ConfigField>
          )}
          <p className="text-xs text-white/40">
            Eventos passados somem automaticamente da página pública conforme
            esta regra. Cada evento pode ter um override individual.
          </p>
        </Section>

        {msg && (
          <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {msg}
          </p>
        )}
        {err && (
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {err}
          </p>
        )}

        {writable && !isDirty && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 font-semibold text-ink disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        )}

        {/* espaço para a tarja fixa */}
        {writable && isDirty && <div className="h-20" aria-hidden />}
          </div>
        </div>
      </div>

      {writable && isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold/35 bg-ink/95 px-4 py-3 shadow-[0_-16px_40px_-20px_rgba(0,0,0,0.85)] backdrop-blur-md lg:left-64">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold sm:mt-0">
                <AlertTriangle size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  Alterações não salvas
                </p>
                <p className="text-xs text-white/50">
                  Salve antes de sair desta página para não perder o que editou.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => discardChanges()}
                disabled={saving}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar configurações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveOpen && (
        <div
          data-leave-dialog
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cfg-leave-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-ink-card shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <AlertTriangle size={18} />
                </span>
                <div>
                  <h3
                    id="cfg-leave-title"
                    className="font-display text-lg font-bold text-white"
                  >
                    Sair sem salvar?
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">
                    Você alterou as configurações do site e ainda não salvou.
                    Se sair agora, essas mudanças serão perdidas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLeaveOpen(false);
                  setPendingNav(null);
                }}
                className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setLeaveOpen(false);
                  setPendingNav(null);
                }}
                className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  discardChanges();
                  void finishLeave(pendingNav);
                }}
                className="rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Sair sem salvar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    const ok = await save();
                    if (ok) await finishLeave(pendingNav);
                  })();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-110 disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Salvando..." : "Salvar e sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-60";

function ImageUploadField({
  label,
  preview,
  disabled,
  canReset,
  onReset,
  onFile,
}: {
  label: string;
  preview: string;
  disabled?: boolean;
  canReset?: boolean;
  onReset?: () => void;
  onFile: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onFile(file);
          e.target.value = "";
        }}
      />

      <div className="relative aspect-[16/9] w-full bg-black/50 sm:aspect-[21/9]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30">
            <ImageIcon size={22} />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          <p className="text-[11px] text-white/45">PNG, JPG ou WebP</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              disabled={disabled}
              title="Voltar ao padrão"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 text-[11px] font-medium text-white/70 backdrop-blur-md transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Padrão</span>
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            title="Enviar imagem"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[11px] font-bold text-ink transition hover:brightness-110 disabled:opacity-40"
          >
            <Upload size={13} />
            Trocar
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:border-gold/50 hover:bg-gold/10 hover:text-gold"
      title="Restaura o valor original deste campo"
    >
      <RotateCcw size={11} />
      Voltar ao padrão
    </button>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 admin-glass p-5 lg:scroll-mt-28"
    >
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-gold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15">
          <Icon size={15} />
        </span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ConfigField({
  label,
  icon: Icon,
  children,
  canReset,
  onReset,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  fieldKey?: string;
  children: React.ReactNode;
  canReset?: boolean;
  onReset?: () => void;
}) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
          {Icon && <Icon size={12} className="text-gold/80" />}
          {label}
        </span>
        {canReset && onReset && <ResetBtn onClick={onReset} />}
      </div>
      {children}
    </div>
  );
}
