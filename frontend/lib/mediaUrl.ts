/** Corrige URLs de mídia geradas com host Docker interno. */
export function publicMediaUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const raw of candidates) {
    const value = (raw || "").trim();
    if (!value) continue;
    if (/https?:\/\/backend(?::\d+)?\//i.test(value)) {
      try {
        const u = new URL(value);
        if (u.pathname) return u.pathname + u.search;
      } catch {
        /* ignore */
      }
      continue;
    }
    return value;
  }
  return "";
}
