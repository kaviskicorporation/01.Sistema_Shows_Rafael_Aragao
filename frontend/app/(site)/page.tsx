import type { Metadata } from "next";
import { getPublicEvents, getSiteConfig } from "@/lib/server";
import type { SiteConfig } from "@/lib/types";
import Navbar from "@/components/public/Navbar";
import Ambient from "@/components/public/Ambient";
import Hero from "@/components/public/Hero";
import AgendaSection from "@/components/public/AgendaSection";
import About from "@/components/public/About";
import VideoSection from "@/components/public/VideoSection";
import Sponsors from "@/components/public/Sponsors";
import ContactForm from "@/components/public/ContactForm";
import Footer from "@/components/public/Footer";

const FALLBACK_CONFIG: SiteConfig = {
  hero_title: "Rafael Aragão",
  hero_subtitle_lead: "Espetáculo",
  hero_subtitle: "O artista que lota teatros pelo Brasil",
  hero_image: null,
  hero_image_url: "/images/aragones.png",
  hero_image_display: "/images/aragones.png",
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
  about_text: "",
  about_image: null,
  about_image_url: "/images/aragones.png",
  about_image_display: "/images/aragones.png",
  instagram: "",
  youtube: "",
  spotify: "",
  tiktok: "",
  facebook: "",
  footer_text: "Rafael Aragão",
  contact_email: "",
  contact_phone: "",
  seo_title: "Rafael Aragão — Rei dos Peão",
  seo_description:
    "Agenda de shows, contratação e informações do humorista Rafael Aragão.",
  og_image: null,
  og_image_url: "",
  og_image_display: "",
  hide_rule: "next_day",
  hide_days_after: 1,
  agenda_default_view: "calendar",
  agenda_list_page_size: 20,
  featured_video_url: "https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
  contact_eyebrow: "Contratação",
  contact_title_line1: "FAÇA SEU EVENTO",
  contact_title_line2: "CORPORATIVO",
  contact_scroll_hint: "Role para revelar o formulário",
  contact_bg_image: null,
  contact_bg_image_url: "/images/rei-dos-peao.png",
  contact_bg_image_display: "/images/rei-dos-peao.png",
  sponsors_title: "Patrocinadores",
  sponsors: [],
};

export async function generateMetadata(): Promise<Metadata> {
  const config = (await getSiteConfig()) || FALLBACK_CONFIG;
  const title = config.seo_title || config.hero_title;
  const description = config.seo_description || config.hero_subtitle;
  const image =
    config.og_image_display ||
    config.og_image_url ||
    config.hero_image_display ||
    config.hero_image_url;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function HomePage() {
  const [events, configData] = await Promise.all([
    getPublicEvents(),
    getSiteConfig(),
  ]);
  const config = configData || FALLBACK_CONFIG;

  return (
    <main className="relative bg-ink">
      <Ambient />
      <div className="relative z-10">
        <Navbar title={config.hero_title} ctaLabel={config.nav_cta} nav={config} />
        <Hero config={config} events={events} />
        <AgendaSection
          events={events}
          defaultView={
            config.agenda_default_view === "list" ? "list" : "calendar"
          }
          listPageSize={config.agenda_list_page_size || 20}
        />
        <About config={config} />
        {config.featured_video_url?.trim() ? (
          <VideoSection url={config.featured_video_url.trim()} />
        ) : null}
        <Sponsors
          title={config.sponsors_title || "Patrocinadores"}
          sponsors={config.sponsors || []}
        />
        <ContactForm config={config} />
        <Footer config={config} />
      </div>
    </main>
  );
}
