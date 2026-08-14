"use client";

import { motion } from "framer-motion";

/** Camada ambiente do admin — brilho suave da cor da página. */
export default function AdminAmbient() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:pl-64"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--admin-tone,var(--theme-primary))_8%,transparent),transparent_55%)]" />
      <motion.div
        className="admin-tone-glow absolute -left-24 top-16 h-80 w-80 rounded-full blur-[100px]"
        animate={{ x: [0, 28, 0], y: [0, 18, 0], opacity: [0.35, 0.8, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-20 bottom-16 h-96 w-96 rounded-full bg-gold/[0.055] blur-[110px]"
        animate={{ x: [0, -22, 0], y: [0, -26, 0], opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, #000 20%, transparent 75%)",
        }}
      />
    </div>
  );
}
