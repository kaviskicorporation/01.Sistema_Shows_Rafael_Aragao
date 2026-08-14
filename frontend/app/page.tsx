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
  hero_subtitle: "Rei dos Peão — Humorista",
  hero_image: null,
  hero_image_url: "/images/rei-dos-peao.png",
  hero_image_display: "/images/rei-dos-peao.png",
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
  featured_video_url: "https://www.youtube.com/watch?v=GyBf5BKZFqw&t=5s",
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
  const nextEvent = events.length > 0 ? events[0] : null;

  return (
    <main className="relative bg-ink">
      <Ambient />
      <div className="relative z-10">
        <Navbar title={config.hero_title} />
        <Hero config={config} nextEvent={nextEvent} events={events} />
        <AgendaSection
          events={events}
          defaultView={
            config.agenda_default_view === "list" ? "list" : "calendar"
          }
        />
        <About config={config} />
        {config.featured_video_url?.trim() ? (
          <VideoSection url={config.featured_video_url.trim()} />
        ) : null}
        <Sponsors />
        <ContactForm />
        <Footer config={config} />
      </div>
    </main>
  );
}
