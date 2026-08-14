/** Extrai ID e tempo inicial de URLs do YouTube. */
export function parseYoutubeUrl(raw: string): {
  id: string;
  start: number;
} | null {
  const url = (raw || "").trim();
  if (!url) return null;

  let id = "";
  let start = 0;

  try {
    if (url.includes("youtu.be/")) {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      id = u.pathname.replace("/", "").split("/")[0] || "";
      start = parseStart(u.searchParams.get("t") || u.searchParams.get("start"));
    } else if (url.includes("youtube.com") || url.includes("youtube-nocookie.com")) {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      id =
        u.searchParams.get("v") ||
        (u.pathname.includes("/embed/")
          ? u.pathname.split("/embed/")[1]?.split("/")[0] || ""
          : u.pathname.includes("/shorts/")
            ? u.pathname.split("/shorts/")[1]?.split("/")[0] || ""
            : "");
      start = parseStart(
        u.searchParams.get("t") || u.searchParams.get("start") || undefined
      );
    } else if (/^[\w-]{11}$/.test(url)) {
      id = url;
    }
  } catch {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
    if (m) id = m[1];
    const t = url.match(/[?&]t=([\dhms]+)/i);
    if (t) start = parseStart(t[1]);
  }

  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return { id, start };
}

function parseStart(raw?: string | null): number {
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  let total = 0;
  const h = raw.match(/(\d+)h/i);
  const m = raw.match(/(\d+)m/i);
  const s = raw.match(/(\d+)s/i);
  if (h) total += Number(h[1]) * 3600;
  if (m) total += Number(m[1]) * 60;
  if (s) total += Number(s[1]);
  return total;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
