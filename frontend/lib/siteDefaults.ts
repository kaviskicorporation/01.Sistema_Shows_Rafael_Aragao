import type { SiteConfig } from "@/lib/types";

/** Valores padrão do site (seed / fábrica) — usados em “Voltar ao padrão”. */
export const SITE_DEFAULTS: Pick<
  SiteConfig,
  | "hero_title"
  | "hero_subtitle_lead"
  | "hero_subtitle"
  | "hero_image_url"
  | "hero_wordmark"
  | "hero_badge"
  | "hero_cta_primary"
  | "hero_cta_secondary"
  | "hero_cta_icon_primary"
  | "hero_cta_icon_secondary"
  | "hero_next_label"
  | "hero_scroll_label"
  | "nav_cta"
  | "nav_icon_cta"
  | "nav_label_agenda"
  | "nav_icon_agenda"
  | "nav_label_sobre"
  | "nav_icon_sobre"
  | "nav_label_video"
  | "nav_icon_video"
  | "nav_label_contato"
  | "nav_icon_contato"
  | "hero_tag_1"
  | "hero_tag_2"
  | "hero_tag_3"
  | "hero_tag_4"
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
  | "agenda_list_page_size"
  | "featured_video_url"
  | "sponsors_title"
  | "contact_eyebrow"
  | "contact_title_line1"
  | "contact_title_line2"
  | "contact_scroll_hint"
  | "contact_bg_image_url"
> = {
  hero_title: "Rafael Aragão",
  hero_subtitle_lead: "Espetáculo",
  hero_subtitle: "O artista que lota teatros pelo Brasil",
  hero_image_url: "/images/aragones.png",
  hero_wordmark: "Rei dos Peão",
  hero_badge: "Ao vivo · Turnê {year}",
  hero_cta_primary: "Ver agenda",
  hero_cta_secondary: "Contratar show",
  hero_cta_icon_primary: "calendar-days",
  hero_cta_icon_secondary: "handshake",
  hero_next_label: "Próximo show",
  hero_scroll_label: "Role",
  nav_cta: "Faça seu evento",
  nav_icon_cta: "sparkles",
  nav_label_agenda: "Agenda",
  nav_icon_agenda: "calendar-days",
  nav_label_sobre: "Sobre",
  nav_icon_sobre: "user-round",
  nav_label_video: "Vídeo",
  nav_icon_video: "clapperboard",
  nav_label_contato: "Contratação",
  nav_icon_contato: "handshake",
  hero_tag_1: "Humor de palco",
  hero_tag_2: "Turnê nacional",
  hero_tag_3: "Agenda {year}",
  hero_tag_4: "Teatros lotados",
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
  agenda_list_page_size: 20,
  featured_video_url: "https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
  sponsors_title: "Patrocinadores",
  contact_eyebrow: "Contratação",
  contact_title_line1: "FAÇA SEU EVENTO",
  contact_title_line2: "CORPORATIVO",
  contact_scroll_hint: "Role para revelar o formulário",
  contact_bg_image_url: "/images/rei-dos-peao.png",
};

export const SOCIAL_BRAND = {
  instagram: "#E4405F",
  youtube: "#FF0000",
  spotify: "#1DB954",
  tiktok: "#25F4EE",
  facebook: "#1877F2",
} as const;
