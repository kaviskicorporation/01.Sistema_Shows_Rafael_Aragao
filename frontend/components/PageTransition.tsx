"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/**
 * Transição entre páginas — só opacity, sem transform/filter
 * (transform/filter quebram position:fixed dos filhos, ex.: header).
 */
export default function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    }
  }, [pathname, reduce]);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={true}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
