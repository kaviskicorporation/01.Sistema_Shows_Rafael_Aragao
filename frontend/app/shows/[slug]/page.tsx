import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicEvent, getSiteConfig } from "@/lib/server";
import { publicMediaUrl } from "@/lib/mediaUrl";
import { DEFAULT_OG_IMAGE } from "@/lib/siteDefaults";
import Footer from "@/components/public/Footer";
import Navbar from "@/components/public/Navbar";
import Ambient from "@/components/public/Ambient";
import ShowDetailView from "@/components/public/ShowDetailView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Show não encontrado" };
  const title = `${event.name} — ${event.city}/${event.state}`;
  const banner = publicMediaUrl(event.banner_display) || DEFAULT_OG_IMAGE;
  return {
    title,
    description: event.description || title,
    openGraph: {
      title,
      description: event.description || title,
      images: [{ url: banner }],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [event, config] = await Promise.all([
    getPublicEvent(slug),
    getSiteConfig(),
  ]);
  if (!event) notFound();

  return (
    <main className="relative min-h-screen bg-ink">
      <Ambient />
      <div className="relative z-10">
        <Navbar
          title={config?.hero_title || "Rafael Aragão"}
          ctaLabel={config?.nav_cta}
          nav={config}
        />
        <ShowDetailView
          event={event}
          brandTitle={config?.hero_title || "Rafael Aragão"}
          config={config}
        />
        {config && <Footer config={config} />}
      </div>
    </main>
  );
}
