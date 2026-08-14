import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { getPublicEvent, getSiteConfig } from "@/lib/server";
import { formatFullDate, formatTime } from "@/lib/format";
import Countdown from "@/components/public/Countdown";
import Gallery from "@/components/public/Gallery";
import Footer from "@/components/public/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Show não encontrado" };
  const title = `${event.name} — ${event.city}/${event.state}`;
  return {
    title,
    description: event.description || title,
    openGraph: {
      title,
      description: event.description || title,
      images: event.banner_display ? [{ url: event.banner_display }] : [],
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
    <main className="min-h-screen bg-ink">
      {/* Banner */}
      <div className="relative h-[45vh] min-h-[320px] w-full overflow-hidden">
        {event.banner_display ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.banner_display}
            alt={event.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-ink-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
        <Link
          href="/#agenda"
          className="absolute left-5 top-6 z-10 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:border-gold hover:text-gold"
        >
          ← Voltar à agenda
        </Link>
      </div>

      <div className="mx-auto -mt-24 max-w-4xl px-5 pb-20">
        <div className="relative rounded-2xl border border-white/10 bg-ink-card p-6 sm:p-10">
          <span className="inline-flex rounded-full bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold">
            {event.city} / {event.state}
          </span>
          <h1 className="mt-4 font-display text-4xl font-black text-white sm:text-5xl">
            {event.name}
          </h1>
          <p className="mt-3 text-lg text-white/70">
            {formatFullDate(event.date)}
            {event.time ? ` • ${formatTime(event.time)}` : ""}
            {event.venue ? ` • ${event.venue}` : ""}
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gold">
                Contagem regressiva
              </h2>
              <div className="mt-3">
                <Countdown
                  target={`${event.date}T${event.time || "21:00:00"}`}
                />
              </div>

              {event.description && (
                <p className="mt-8 whitespace-pre-line leading-relaxed text-white/70">
                  {event.description}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {event.tickets_link && (
                  <a
                    href={event.tickets_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3 font-semibold text-ink transition-transform hover:scale-105"
                  >
                    <ShoppingCart size={18} strokeWidth={2.25} />
                    Comprar ingressos
                  </a>
                )}
                {event.external_link && (
                  <a
                    href={event.external_link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/20 px-7 py-3 font-semibold text-white hover:border-gold hover:text-gold"
                  >
                    Mais informações
                  </a>
                )}
              </div>
            </div>

            {event.gallery.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold">
                  Galeria
                </h2>
                <Gallery images={event.gallery} />
              </div>
            )}
          </div>
        </div>
      </div>

      {config && <Footer config={config} />}
    </main>
  );
}
