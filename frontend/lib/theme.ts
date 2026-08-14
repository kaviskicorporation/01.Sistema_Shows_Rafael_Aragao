export const DEFAULT_PRIMARY = "#f5b301";
export const DEFAULT_SECONDARY = "#0f0f0f";

export const THEME_EVENT = "site-theme-updated";

export type ThemeColors = {
  primary: string;
  secondary: string;
};

function normalizeHex(value: string | undefined | null, fallback: string) {
  const raw = (value || "").trim();
  if (!raw) return fallback;
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  return fallback;
}

export function applyThemeColors(
  primary?: string | null,
  secondary?: string | null
): ThemeColors {
  const colors: ThemeColors = {
    primary: normalizeHex(primary, DEFAULT_PRIMARY),
    secondary: normalizeHex(secondary, DEFAULT_SECONDARY),
  };

  if (typeof document === "undefined") return colors;

  const root = document.documentElement;
  root.style.setProperty("--theme-primary", colors.primary);
  root.style.setProperty("--theme-secondary", colors.secondary);
  root.style.setProperty("--background", colors.secondary);
  root.style.setProperty("--color-gold", colors.primary);
  root.style.setProperty("--color-brand", colors.primary);
  root.style.setProperty("--color-ink", colors.secondary);

  return colors;
}

export function dispatchThemeUpdate(primary: string, secondary: string) {
  applyThemeColors(primary, secondary);
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(THEME_EVENT, {
      detail: { primary, secondary },
    })
  );
}
