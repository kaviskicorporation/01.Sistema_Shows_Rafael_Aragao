"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { jumpToContactForm } from "@/lib/scroll";
import type { SiteConfig } from "@/lib/types";
import {
  DEFAULT_CONTACT_FORM,
  SYSTEM_FIELD_KEYS,
  type ContactFormConfig,
  type ContactFormField,
  type ContactOption,
} from "@/lib/contactForm";
import AnimatedArrow from "./AnimatedArrow";
import SoftCursor from "./SoftCursor";
import { useSoftCursorZone } from "./useSoftCursorZone";
import TiltCard from "./TiltCard";
import SectionAura from "./SectionAura";
import ThemedSelect from "@/components/ui/ThemedSelect";

type Values = Record<string, string>;

function buildInitial(cfg: ContactFormConfig): Values {
  const values: Values = { website: "", area_outros: "" };
  for (const f of cfg.fields) {
    if (f.key === "category" && cfg.categories[0]) {
      values[f.key] = cfg.categories[0].id;
    } else {
      values[f.key] = "";
    }
  }
  return values;
}

function optionsFor(
  field: ContactFormField,
  cfg: ContactFormConfig
): ContactOption[] {
  if (field.options === "areas") return cfg.areas;
  if (field.options === "categories") return cfg.categories;
  if (field.options === "custom") return field.custom_options || [];
  return [];
}

/**
 * Contratação com "rodagem" sticky/parallax.
 */
export default function ContactForm({ config }: { config?: SiteConfig }) {
  const [cfg, setCfg] = useState<ContactFormConfig>(() =>
    (config?.contact_form_config as ContactFormConfig) || DEFAULT_CONTACT_FORM
  );
  const [section, setSection] = useState({
    eyebrow: config?.contact_eyebrow || "Contratação",
    title1: config?.contact_title_line1 || "FAÇA SEU EVENTO",
    title2: config?.contact_title_line2 || "CORPORATIVO",
    hint: config?.contact_scroll_hint || "Role para revelar o formulário",
    bg:
      config?.contact_bg_image_display ||
      config?.contact_bg_image_url ||
      "/images/rei-dos-peao.png",
  });
  const [form, setForm] = useState<Values>(() =>
    buildInitial(
      (config?.contact_form_config as ContactFormConfig) || DEFAULT_CONTACT_FORM
    )
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const {
    zoneRef,
    active: cursorActive,
    mode: cursorMode,
    setMode: setCursorMode,
    onZoneEnter,
    onZoneLeave,
  } = useSoftCursorZone();

  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 26,
    mass: 0.9,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#contato") {
      jumpToContactForm();
    }
  }, []);

  useEffect(() => {
    api
      .get<SiteConfig>("/site-config/")
      .then((data) => {
        const next =
          (data.contact_form_config as ContactFormConfig) ||
          DEFAULT_CONTACT_FORM;
        setCfg(next);
        setForm(buildInitial(next));
        setSection({
          eyebrow: data.contact_eyebrow || "Contratação",
          title1: data.contact_title_line1 || "FAÇA SEU EVENTO",
          title2: data.contact_title_line2 || "CORPORATIVO",
          hint: data.contact_scroll_hint || "Role para revelar o formulário",
          bg:
            data.contact_bg_image_display ||
            data.contact_bg_image_url ||
            "/images/rei-dos-peao.png",
        });
      })
      .catch(() => {});
  }, []);

  const bgScale = useTransform(smooth, [0, 0.55, 1], [1.28, 1.06, 1]);
  const bgY = useTransform(smooth, [0, 1], ["4%", "-8%"]);
  const titleY = useTransform(smooth, [0, 0.4, 0.75, 1], [60, 10, -6, -24]);
  const titleOpacity = useTransform(
    smooth,
    [0, 0.15, 0.45, 0.75, 1],
    [0, 1, 1, 0.5, 0.28]
  );
  const formY = useTransform(smooth, [0, 0.35, 0.7, 1], [110, 40, 6, 0]);
  const formOpacity = useTransform(smooth, [0, 0.2, 0.48, 1], [0, 0.25, 1, 1]);
  const formScale = useTransform(smooth, [0, 0.5, 1], [0.92, 0.98, 1]);
  const veil = useTransform(smooth, [0, 0.35, 1], [0.5, 0.7, 0.86]);
  const hintOpacity = useTransform(smooth, [0, 0.2, 0.38], [1, 0.35, 0]);

  const update = (k: string, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const enabledFields = useMemo(
    () => cfg.fields.filter((f) => f.enabled),
    [cfg.fields]
  );

  const areaValue = form.area || "";
  const isOutros =
    areaValue === "outros" ||
    cfg.areas.find((a) => a.id === areaValue)?.label.toLowerCase() === "outros";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const extra: Record<string, string> = {};
      for (const field of enabledFields) {
        if (!SYSTEM_FIELD_KEYS.has(field.key)) {
          extra[field.key] = form[field.key] || "";
        }
      }

      await api.post("/public/leads/", {
        name: form.name || "",
        area_atuacao: isOutros
          ? "outros"
          : cfg.areas.find((a) => a.id === form.area)?.label || form.area || "",
        area_outros: isOutros ? form.area_outros || "" : "",
        email: form.email || "",
        phone: form.phone || "",
        category: form.category || cfg.categories[0]?.id || "outros",
        message: form.message || "",
        extra_fields: extra,
        website: form.website || "",
      });
      setStatus("success");
      setForm(buildInitial(cfg));
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]> | null;
        if (data && typeof data === "object") {
          const first = Object.values(data)[0];
          setError(Array.isArray(first) ? first[0] : String(first));
        } else {
          setError(err.message);
        }
      } else {
        setError("Não foi possível enviar. Tente novamente.");
      }
    }
  }

  /** Agrupa half+half na mesma linha. */
  const rows = useMemo(() => {
    const result: ContactFormField[][] = [];
    let pending: ContactFormField | null = null;
    for (const field of enabledFields) {
      if (field.width === "half") {
        if (pending) {
          result.push([pending, field]);
          pending = null;
        } else {
          pending = field;
        }
      } else {
        if (pending) {
          result.push([pending]);
          pending = null;
        }
        result.push([field]);
      }
    }
    if (pending) result.push([pending]);
    return result;
  }, [enabledFields]);

  function renderControl(field: ContactFormField) {
    const value = form[field.key] || "";
    if (field.type === "select") {
      const opts = optionsFor(field, cfg);
      return (
        <ThemedSelect
          required={field.required}
          value={value}
          onChange={(v) => update(field.key, v)}
          placeholder={field.placeholder || "Selecione..."}
          options={opts.map((o) => ({ value: o.id, label: o.label }))}
        />
      );
    }
    if (field.type === "textarea") {
      return (
        <textarea
          required={field.required}
          value={value}
          onChange={(e) => update(field.key, e.target.value)}
          rows={3}
          className={`${inputCls} min-h-[96px] resize-y`}
          placeholder={field.placeholder}
        />
      );
    }
    return (
      <input
        required={field.required}
        type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
        value={value}
        onChange={(e) => update(field.key, e.target.value)}
        className={inputCls}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <div id="contato" ref={sectionRef} className="relative h-[220vh] bg-ink">
      <SoftCursor active={cursorActive} mode={cursorMode} />
      <div className="sticky top-0 z-0 h-[100svh] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ scale: bgScale, y: bgY }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.bg}
            alt=""
            className="absolute left-1/2 top-1/2 h-auto w-[min(140vw,1400px)] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--theme-primary)_18%,transparent),transparent_55%)]" />
          <SectionAura variant="orbit" />
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-ink"
          style={{ opacity: veil }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/80" />

        <div className="relative z-10 flex h-full flex-col justify-center px-4 py-10 sm:px-6">
          <motion.div
            style={{ y: titleY, opacity: titleOpacity }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl font-black leading-[0.95] text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {section.title1}
              <br />
              <span className="inline-flex items-center gap-3 text-gold">
                {section.title2}
                <span className="hidden sm:inline-flex">
                  <AnimatedArrow />
                </span>
              </span>
            </h2>
            <motion.p
              style={{ opacity: hintOpacity }}
              className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-sm text-white/60 sm:text-base"
            >
              {section.hint}
              <span className="text-gold sm:hidden">
                <AnimatedArrow />
              </span>
            </motion.p>
          </motion.div>

          <motion.div
            style={{
              y: formY,
              opacity: formOpacity,
              scale: formScale,
            }}
            className="mx-auto mt-8 w-full max-w-3xl origin-center [perspective:1000px]"
          >
            <TiltCard
              maxTilt={1}
              glare={false}
              className={`rounded-2xl border border-white/10 bg-ink-card/90 p-5 shadow-[0_0_80px_-20px_color-mix(in_srgb,var(--theme-primary)_40%,transparent)] backdrop-blur-md sm:p-8 ${
                cursorActive ? "md:cursor-none" : ""
              }`}
            >
              <div
                ref={zoneRef}
                onMouseEnter={onZoneEnter}
                onMouseLeave={onZoneLeave}
              >
              {status === "success" ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-2xl text-gold">
                    ✓
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Solicitação enviada!
                  </h3>
                  <p className="mt-2 max-w-sm text-white/60">
                    Obrigado pelo seu contato. Nossa equipe retornará em breve.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="mt-6 rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white hover:border-gold hover:text-gold"
                  >
                    Enviar outra solicitação
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    name="website"
                    value={form.website || ""}
                    onChange={(e) => update("website", e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden
                  />

                  {rows.map((row, ri) => (
                    <div
                      key={ri}
                      className={
                        row.length > 1
                          ? "grid gap-4 sm:grid-cols-2"
                          : undefined
                      }
                    >
                      {row.map((field) => (
                        <Field
                          key={field.id}
                          label={field.label}
                          required={field.required}
                        >
                          {renderControl(field)}
                        </Field>
                      ))}
                    </div>
                  ))}

                  {isOutros && (
                    <Field label="Qual a sua área?" required>
                      <input
                        required
                        value={form.area_outros || ""}
                        onChange={(e) => update("area_outros", e.target.value)}
                        className={inputCls}
                        placeholder="Digite a sua área de atuação"
                      />
                    </Field>
                  )}

                  {status === "error" && (
                    <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="btn-live inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    onMouseEnter={() => setCursorMode("send")}
                    onMouseLeave={() => setCursorMode("idle")}
                    onMouseMove={(e) => {
                      const el = e.currentTarget;
                      const rect = el.getBoundingClientRect();
                      el.style.setProperty(
                        "--mx",
                        `${e.clientX - rect.left}px`
                      );
                      el.style.setProperty(
                        "--my",
                        `${e.clientY - rect.top}px`
                      );
                    }}
                  >
                    {status === "loading" ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send size={16} strokeWidth={2.25} />
                        {cfg.submit_label || "Solicitar informações"}
                      </>
                    )}
                  </button>
                </form>
              )}
              </div>
            </TiltCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full min-h-[48px] rounded-2xl border border-white/10 bg-ink px-4 py-3 text-base text-white placeholder-white/30 outline-none transition-all focus:border-gold focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--theme-primary)_15%,transparent)] sm:text-sm";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
        {required && <span className="text-gold"> *</span>}
      </span>
      {children}
    </label>
  );
}
