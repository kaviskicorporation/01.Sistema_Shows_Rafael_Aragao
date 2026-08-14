"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import Topbar from "@/components/admin/Topbar";
import AdminHero from "@/components/admin/AdminHero";
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
  const { can, canWrite } = useAuth();
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

  useEffect(() => {
    if (can("config")) {
      api.get<SiteConfig>("/site-config/").then(setForm).catch(() => {});
    }
  }, [can]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function save() {
    if (!form) return;
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
        ["hero_subtitle", current.hero_subtitle || ""],
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
        ["featured_video_url", current.featured_video_url || ""],
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
    } catch (e) {
      const detail =
        e instanceof ApiError
          ? e.message || "Erro ao salvar."
          : "Erro ao salvar.";
      setErr(detail);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="Configurações do Site" />
      <div className="mx-auto max-w-3xl space-y-8 p-6">
        <AdminHero
          icon={Settings}
          title="Configurações do site"
          subtitle="Textos, cores, redes e contato. Em toda opção há o botão Voltar ao padrão."
        />

        <Section title="Hero" icon={Sparkles}>
          <ConfigField
            label="Título"
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
            />
          </ConfigField>
          <ConfigField
            label="Subtítulo"
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
            />
          </ConfigField>
          <ImageUploadField
            label="Imagem do hero"
            preview={previewFor("hero")}
            disabled={!writable}
            canReset={writable}
            onReset={() => resetImage("hero")}
            onFile={(file) => onPickImage("hero", file)}
          />
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

        <Section title="Sobre o Artista" icon={UserRound}>
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

        <Section title="Redes sociais" icon={Share2}>
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

        <Section title="Rodapé e contato" icon={Mail}>
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

        <Section title="SEO / Open Graph" icon={Search}>
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

        <Section title="Vídeo em destaque" icon={Clapperboard}>
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

        <Section title="Agenda pública" icon={CalendarDays}>
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
          <p className="text-xs text-white/40">
            Escolha se o visitante vê primeiro o calendário ou a lista na seção
            Agenda.
          </p>
        </Section>

        <Section title="Ocultação automática de eventos" icon={EyeOff}>
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

        {writable && (
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-8 py-3 font-semibold text-ink disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        )}
      </div>
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
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-card p-5">
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
