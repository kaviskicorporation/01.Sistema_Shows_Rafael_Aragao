/** Atmosfera por seção — visível, variada, sem virar ruído. */

type AuraVariant =
  | "rings"
  | "beams"
  | "dots"
  | "ribbons"
  | "wash"
  | "orbit";

export default function SectionAura({
  variant = "rings",
}: {
  variant?: AuraVariant;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {variant === "rings" && <Rings />}
      {variant === "beams" && <Beams />}
      {variant === "dots" && <Dots />}
      {variant === "ribbons" && <Ribbons />}
      {variant === "wash" && <Wash />}
      {variant === "orbit" && <Orbit />}
    </div>
  );
}

/** Anéis suaves e equilibrados — sem pilha pesada de círculos */
function Rings() {
  return (
    <>
      {/* Um arco leve de cada lado */}
      <div
        className="absolute -left-[22%] top-[-10%] h-[72vmin] w-[72vmin] rounded-full opacity-[0.22]"
        style={{
          background:
            "conic-gradient(from 200deg, color-mix(in srgb, var(--theme-primary) 40%, transparent), transparent 55%)",
          maskImage:
            "radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)",
        }}
      />
      <div
        className="absolute -right-[18%] bottom-[-20%] h-[68vmin] w-[68vmin] rounded-full opacity-[0.18]"
        style={{
          background:
            "conic-gradient(from 20deg, color-mix(in srgb, var(--theme-primary) 32%, transparent), transparent 50%)",
          maskImage:
            "radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 62%, #000 63%, #000 70%, transparent 71%)",
        }}
      />
      {/* Névoa dourada equilibrada */}
      <div className="absolute left-[8%] top-[30%] h-44 w-44 rounded-full bg-gold/12 blur-[80px]" />
      <div className="absolute right-[10%] bottom-[22%] h-44 w-44 rounded-full bg-gold/10 blur-[80px]" />
    </>
  );
}

/** Faixas diagonais de luz */
function Beams() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_15%_20%,color-mix(in_srgb,var(--theme-primary)_22%,transparent),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_90%_80%,color-mix(in_srgb,var(--theme-primary)_14%,transparent),transparent_50%)]" />
      <div
        className="absolute -left-[20%] top-[-30%] h-[140%] w-[45%] rotate-[18deg] opacity-50"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--theme-primary) 16%, transparent), transparent)",
        }}
      />
      <div
        className="absolute right-[-10%] top-[-20%] h-[130%] w-[28%] -rotate-[12deg] opacity-35"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
        }}
      />
      <div className="absolute bottom-[12%] left-[30%] h-px w-[40%] bg-gradient-to-r from-transparent via-gold/35 to-transparent" />
    </>
  );
}

/** Campo de pontos / constelação */
function Dots() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 55%, transparent) 1.1px, transparent 1.25px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #000 10%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, #000 10%, transparent 72%)",
        }}
      />
      <div className="absolute left-[12%] top-[28%] h-3 w-3 rounded-full bg-gold/50 blur-[1px]" />
      <div className="absolute right-[18%] top-[22%] h-2 w-2 rounded-full bg-gold/40" />
      <div className="absolute right-[28%] bottom-[30%] h-2.5 w-2.5 rounded-full bg-white/25" />
      <div className="absolute left-[40%] bottom-[18%] h-24 w-24 rounded-full bg-gold/18 blur-[50px]" />
      <div className="absolute right-[8%] top-[40%] h-36 w-36 rounded-full bg-gold/12 blur-[60px]" />
    </>
  );
}

/** Fitas / pinceladas curvas em SVG */
function Ribbons() {
  return (
    <>
      <div className="absolute -left-[10%] top-[5%] h-[70%] w-[55%] rounded-full bg-gold/15 blur-[100px]" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35]"
        viewBox="0 0 1200 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M-50 520 C 180 380, 320 640, 520 480 S 820 280, 1100 420"
          stroke="var(--theme-primary)"
          strokeWidth="70"
          strokeLinecap="round"
          opacity="0.22"
        />
        <path
          d="M-80 200 C 220 80, 380 260, 600 140 S 900 60, 1250 180"
          stroke="var(--theme-primary)"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.18"
        />
        <path
          d="M100 720 C 360 600, 540 760, 780 620 S 1050 540, 1280 680"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="18"
          strokeLinecap="round"
          opacity="0.25"
        />
        <circle
          cx="980"
          cy="180"
          r="120"
          stroke="var(--theme-primary)"
          strokeWidth="2"
          opacity="0.35"
        />
        <circle
          cx="980"
          cy="180"
          r="78"
          stroke="var(--theme-primary)"
          strokeWidth="1.5"
          opacity="0.22"
        />
      </svg>
    </>
  );
}

/** Névoa assimétrica + arco aberto */
function Wash() {
  return (
    <>
      <div className="absolute -left-[15%] top-[-20%] h-[75%] w-[60%] rounded-[50%] bg-gold/20 blur-[110px]" />
      <div className="absolute right-[-20%] bottom-[-30%] h-[70%] w-[55%] rounded-[50%] bg-gold/12 blur-[120px]" />
      <div
        className="absolute left-[-25%] bottom-[-40%] h-[90vmin] w-[90vmin] rounded-full opacity-50"
        style={{
          background:
            "conic-gradient(from 120deg, transparent 0deg, color-mix(in srgb, var(--theme-primary) 35%, transparent) 70deg, transparent 140deg)",
          maskImage:
            "radial-gradient(circle, transparent 58%, #000 59%, #000 74%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 58%, #000 59%, #000 74%, transparent 75%)",
        }}
      />
      <div className="absolute right-[10%] top-[15%] h-px w-40 rotate-45 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="absolute right-[14%] top-[18%] h-px w-24 rotate-45 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </>
  );
}

/** Órbita / alvo parcial no canto */
function Orbit() {
  return (
    <>
      <div className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />
      <div className="absolute left-1/2 top-1/2 h-[85vmax] w-[85vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/15" />
      <div className="absolute left-1/2 top-1/2 h-[55vmax] w-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/10" />
      <div className="absolute left-[5%] top-[30%] h-48 w-48 rounded-full bg-gold/20 blur-[70px]" />
      <div className="absolute right-[5%] bottom-[20%] h-56 w-56 rounded-full bg-white/[0.05] blur-[80px]" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 46px, color-mix(in srgb, var(--theme-primary) 8%, transparent) 46px, color-mix(in srgb, var(--theme-primary) 8%, transparent) 47px)",
          maskImage:
            "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)",
        }}
      />
    </>
  );
}
