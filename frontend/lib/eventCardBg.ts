import type { CSSProperties } from "react";

/** Presets de fundo do card na página do show. */

export type CardBgPreset =
  | "chair"
  | "texture_soft"
  | "texture_grain"
  | "texture_mesh"
  | "texture_lines"
  | "gradient_gold"
  | "gradient_ember"
  | "gradient_night"
  | "gradient_forest"
  | "gradient_violet"
  | "solid"
  | "custom_image";

export const CARD_BG_OPTIONS: {
  value: CardBgPreset;
  label: string;
  hint: string;
}[] = [
  { value: "chair", label: "Foto na cadeira", hint: "Padrão do artista" },
  { value: "texture_soft", label: "Textura suave", hint: "Noise discreto" },
  { value: "texture_grain", label: "Textura grain", hint: "Grão cinematográfico" },
  { value: "texture_mesh", label: "Textura mesh", hint: "Grade sutil" },
  { value: "texture_lines", label: "Linhas diagonais", hint: "Ritmo gráfico" },
  { value: "gradient_gold", label: "Gradiente ouro", hint: "Ink → gold" },
  { value: "gradient_ember", label: "Gradiente brasa", hint: "Tons quentes" },
  { value: "gradient_night", label: "Gradiente noite", hint: "Azul profundo" },
  { value: "gradient_forest", label: "Gradiente floresta", hint: "Verde escuro" },
  { value: "gradient_violet", label: "Gradiente violeta", hint: "Roxo suave" },
  { value: "solid", label: "Cor sólida", hint: "Escolha a cor" },
  { value: "custom_image", label: "Imagem custom", hint: "URL da imagem" },
];

const CHAIR = "/images/aragones.png";

const TEXTURES: Record<string, string> = {
  texture_soft: `radial-gradient(ellipse at 30% 20%, color-mix(in srgb, var(--theme-primary) 14%, transparent), transparent 55%),
    radial-gradient(ellipse at 80% 80%, rgba(255,255,255,0.04), transparent 50%),
    linear-gradient(160deg, #141414 0%, #0a0a0a 100%)`,
  texture_grain: `repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 4px),
    linear-gradient(145deg, #1a1510 0%, #0c0c0c 55%, #12100e 100%)`,
  texture_mesh: `linear-gradient(rgba(245,179,1,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,179,1,0.06) 1px, transparent 1px),
    linear-gradient(160deg, #121212, #0b0b0b)`,
  texture_lines: `repeating-linear-gradient(-32deg, transparent, transparent 10px, rgba(255,255,255,0.035) 10px, rgba(255,255,255,0.035) 11px),
    linear-gradient(150deg, #161412, #0a0a0a)`,
};

const GRADIENTS: Record<string, string> = {
  gradient_gold:
    "linear-gradient(145deg, #1a1408 0%, #0f0c06 40%, #2a1f0a 75%, #0d0d0d 100%)",
  gradient_ember:
    "linear-gradient(150deg, #1c100c 0%, #2a120c 45%, #0e0a08 100%)",
  gradient_night:
    "linear-gradient(150deg, #0b1220 0%, #0a0e18 50%, #06080f 100%)",
  gradient_forest:
    "linear-gradient(150deg, #0c1610 0%, #0a120e 50%, #070b08 100%)",
  gradient_violet:
    "linear-gradient(150deg, #140e1c 0%, #0e0a14 50%, #08060c 100%)",
};

export function resolveCardBackground(opts: {
  preset?: string | null;
  color?: string | null;
  imageUrl?: string | null;
}): { style: CSSProperties } {
  const preset = (opts.preset || "chair") as CardBgPreset;
  const color = opts.color || "#121212";

  if (preset === "chair") {
    return {
      style: {
        backgroundColor: "#0a0a0a",
        backgroundImage: `url(${CHAIR})`,
        backgroundSize: "cover",
        backgroundPosition: "68% center",
      },
    };
  }

  if (preset in TEXTURES) {
    return { style: { backgroundImage: TEXTURES[preset] } };
  }

  if (preset in GRADIENTS) {
    return { style: { backgroundImage: GRADIENTS[preset] } };
  }

  if (preset === "solid") {
    return { style: { backgroundColor: color } };
  }

  if (preset === "custom_image" && opts.imageUrl) {
    return {
      style: {
        backgroundColor: "#0a0a0a",
        backgroundImage: `url(${opts.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      },
    };
  }

  return { style: { backgroundImage: TEXTURES.texture_soft } };
}

/** Fundo do topo da página do show quando não há banner */
export const PAGE_SOFT_TEXTURE: CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse at 40% 0%, color-mix(in srgb, var(--theme-primary) 14%, transparent), transparent 58%),
    radial-gradient(ellipse at 90% 70%, rgba(255,255,255,0.03), transparent 50%),
    linear-gradient(180deg, #121212 0%, #0a0a0a 100%)
  `,
};

/** Preview swatch for admin */
export function presetSwatchStyle(
  preset: CardBgPreset,
  color = "#121212"
): CSSProperties {
  if (preset === "chair") {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${CHAIR})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (preset === "solid") return { backgroundColor: color };
  if (preset === "custom_image") {
    return {
      backgroundImage:
        "linear-gradient(135deg, #333 25%, #222 25%, #222 50%, #333 50%, #333 75%, #222 75%)",
      backgroundSize: "12px 12px",
    };
  }
  const { style } = resolveCardBackground({ preset, color });
  return style;
}
