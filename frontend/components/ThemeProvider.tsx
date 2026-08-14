"use client";

import { useEffect } from "react";
import {
  DEFAULT_PRIMARY,
  DEFAULT_SECONDARY,
  THEME_EVENT,
  applyThemeColors,
} from "@/lib/theme";
import { api } from "@/lib/api";
import type { SiteConfig } from "@/lib/types";

export default function ThemeProvider({
  initialPrimary = DEFAULT_PRIMARY,
  initialSecondary = DEFAULT_SECONDARY,
  children,
}: {
  initialPrimary?: string;
  initialSecondary?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyThemeColors(initialPrimary, initialSecondary);

    let cancelled = false;
    api
      .get<SiteConfig>("/site-config/")
      .then((cfg) => {
        if (cancelled) return;
        applyThemeColors(cfg.primary_color, cfg.secondary_color);
      })
      .catch(() => {});

    function onTheme(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { primary?: string; secondary?: string }
        | undefined;
      if (detail) applyThemeColors(detail.primary, detail.secondary);
    }
    window.addEventListener(THEME_EVENT, onTheme);
    return () => {
      cancelled = true;
      window.removeEventListener(THEME_EVENT, onTheme);
    };
  }, [initialPrimary, initialSecondary]);

  return <>{children}</>;
}
