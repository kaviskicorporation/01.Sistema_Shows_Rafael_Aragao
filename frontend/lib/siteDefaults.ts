import type { SiteConfig } from "@/lib/types";

/** Valores padrão do site (seed / fábrica) — usados em “Voltar ao padrão”. */
export const SITE_DEFAULTS: Pick<
  SiteConfig,
  | "hero_title"
  | "hero_subtitle"
  | "hero_image_url"
  | "primary_color"
  | "secondary_color"
  | "about_title"
  | "about_text"
  | "about_image_url"
  | "instagram"
  | "youtube"
  | "spotify"
  | "tiktok"
  | "facebook"
  | "footer_text"
  | "contact_email"
  | "contact_phone"
  | "seo_title"
  | "seo_description"
  | "og_image_url"
  | "hide_rule"
  | "hide_days_after"
  | "agenda_default_view"
  | "featured_video_url"
> = {
  hero_title: "Rafael Aragão",
  hero_subtitle: "Rei dos Peão — O humorista que lota teatros pelo Brasil",
  hero_image_url: "/images/rei-dos-peao.png",
  primary_color: "#f5b301",
  secondary_color: "#0f0f0f",
  about_title: "Sobre o Artista",
  about_text:
    'Rafael Aragão é um dos maiores nomes do humor nacional. Com o espetáculo "Rei dos Peão", leva gargalhadas a plateias por todo o país, misturando observações do cotidiano, causos e muita irreverência.',
  about_image_url: "/images/aragones.png",
  instagram: "https://instagram.com/orafaelaragao",
  youtube: "https://youtube.com/@orafaelaragao",
  spotify: "https://open.spotify.com/",
  tiktok: "",
  facebook: "",
  footer_text: "Rafael Aragão — Rei dos Peão",
  contact_email: "contato@rafaelaragao.com.br",
  contact_phone: "",
  seo_title: "Rafael Aragão — Rei dos Peão | Humorista",
  seo_description:
    "Agenda de shows, contratação e informações do humorista Rafael Aragão.",
  og_image_url: "",
  hide_rule: "next_day",
  hide_days_after: 1,
  agenda_default_view: "calendar",
  featured_video_url: "https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
};

export const SOCIAL_BRAND = {
  instagram: "#E4405F",
  youtube: "#FF0000",
  spotify: "#1DB954",
  tiktok: "#25F4EE",
  facebook: "#1877F2",
} as const;
