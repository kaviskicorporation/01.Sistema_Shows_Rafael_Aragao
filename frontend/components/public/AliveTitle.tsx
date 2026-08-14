"use client";

import { motion } from "framer-motion";

/** Título com letras entrando em sequência. */
export default function AliveTitle({
  children,
  className = "",
  as: Tag = "h2",
  immediate = false,
}: {
  children: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Se true, anima no mount (hero). Senão, ao entrar na viewport. */
  immediate?: boolean;
}) {
  const words = children.split(" ");

  return (
    <Tag className={className}>
      {words.map((word, wi) => (
        <span
          key={`${word}-${wi}`}
          className="mr-[0.28em] inline-block whitespace-nowrap"
        >
          {word.split("").map((char, i) => {
            const delay = wi * 0.1 + i * 0.045;
            const anim = {
              y: 0,
              opacity: 1,
              rotate: 0,
              filter: "blur(0px)",
            };
            const initial = {
              y: 42,
              opacity: 0,
              rotate: -8,
              filter: "blur(6px)",
            };
            const transition = {
              delay,
              type: "spring" as const,
              stiffness: 220,
              damping: 16,
            };

            return (
              <motion.span
                key={`${wi}-${i}`}
                className="inline-block cursor-default will-change-transform"
                initial={initial}
                {...(immediate
                  ? { animate: anim }
                  : {
                      whileInView: anim,
                      viewport: { once: true, margin: "-20px", amount: 0.4 },
                    })}
                transition={transition}
                whileHover={{
                  y: -7,
                  color: "var(--theme-primary)",
                  transition: { type: "spring", stiffness: 420, damping: 12 },
                }}
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
