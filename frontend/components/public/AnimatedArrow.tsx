"use client";

import { motion } from "framer-motion";

/** Seta animada — inspira vida no CTA (estilo do vídeo de referência). */
export default function AnimatedArrow({
  className = "",
}: {
  className?: string;
}) {
  return (
    <motion.span
      className={`inline-flex items-center ${className}`}
      aria-hidden
      animate={{ x: [0, 8, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        width="28"
        height="14"
        viewBox="0 0 28 14"
        fill="none"
        className="overflow-visible"
      >
        <motion.path
          d="M1 7H24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.6 }}
        />
        <motion.path
          d="M18 2L25 7L18 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </svg>
    </motion.span>
  );
}
