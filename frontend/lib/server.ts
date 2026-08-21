import type { FaqItem, PublicEvent, SiteConfig, Paginated } from "./types";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicEvents(query = ""): Promise<PublicEvent[]> {
  const data = await serverGet<Paginated<PublicEvent> | PublicEvent[]>(
    `/api/public/events${query}`
  );
  if (!data) return [];
  return Array.isArray(data) ? data : data.results;
}

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  return serverGet<PublicEvent>(`/api/public/events/${slug}`);
}

export async function getSiteConfig(): Promise<SiteConfig | null> {
  return serverGet<SiteConfig>(`/api/site-config`);
}

export async function getPublicFaqs(): Promise<FaqItem[]> {
  const data = await serverGet<Paginated<FaqItem> | FaqItem[]>(`/api/faqs`);
  if (!data) return [];
  const list = Array.isArray(data) ? data : data.results;
  return list.filter((item) => item.is_active !== false);
}
