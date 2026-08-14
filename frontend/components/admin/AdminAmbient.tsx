"use client";

import { motion } from "framer-motion";

/** Camada ambiente bem sutil — só presença, sem distrair o trabalho. */
export default function AdminAmbient() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:pl-64"
      aria-hidden
    >
      <motion.div
        className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-gold/[0.04] blur-[90px]"
        animate={{ x: [0, 24, 0], y: [0, 16, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-gold/[0.035] blur-[100px]"
        animate={{ x: [0, -18, 0], y: [0, -22, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
