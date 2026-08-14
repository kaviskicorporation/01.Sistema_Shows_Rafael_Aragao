"use client";

import { motion } from "framer-motion";

/** Staggered letter title — signature micro-motion for RA. */
export default function AliveTitle({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const words = children.split(" ");

  return (
    <Tag className={className}>
      {words.map((word, wi) => (
        <span key={`${word}-${wi}`} className="mr-[0.28em] inline-block whitespace-nowrap">
          {word.split("").map((char, i) => (
            <motion.span
              key={`${wi}-${i}`}
              className="inline-block cursor-default"
              initial={{ y: 28, opacity: 0, rotate: -4 }}
              whileInView={{ y: 0, opacity: 1, rotate: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: wi * 0.08 + i * 0.03,
                type: "spring",
                stiffness: 280,
                damping: 18,
              }}
              whileHover={{
                y: -6,
                color: "var(--theme-primary)",
                transition: { type: "spring", stiffness: 400, damping: 12 },
              }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
