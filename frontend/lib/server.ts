import type { FaqItem, PublicEvent, SiteConfig, Paginated } from "./types";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

/** Troca host Docker interno (backend:8000) por caminho público /media/... */
function rewriteInternalMediaUrls<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") {
    if (!/https?:\/\/backend(?::\d+)?\//i.test(value)) return value;
    try {
      const u = new URL(value);
      return (u.pathname + u.search) as T;
    } catch {
      return value.replace(/^https?:\/\/backend(?::\d+)?/i, "") as T;
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteInternalMediaUrls(item)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteInternalMediaUrls(v);
    }
    return out as T;
  }
  return value;
}

async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    return rewriteInternalMediaUrls(data);
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
