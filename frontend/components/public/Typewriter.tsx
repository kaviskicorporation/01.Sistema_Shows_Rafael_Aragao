"use client";

import { useEffect, useState } from "react";

/** Efeito de escrita (typewriter) com cursor piscando. */
export default function Typewriter({
  text,
  className = "",
  speed = 38,
  startDelay = 300,
  loop = false,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
  loop?: boolean;
  as?: "p" | "span" | "h3";
}) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    setShown("");
    setDone(false);
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          if (interval) clearInterval(interval);
          setDone(true);
          if (loop) {
            setTimeout(() => {
              setShown("");
              setDone(false);
              i = 0;
              // re-trigger by resetting — simple restart
            }, 2200);
          }
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay, loop]);

  return (
    <Tag className={className}>
      {shown}
      <span
        className={`ml-0.5 inline-block w-[0.55ch] ${
          done ? "animate-pulse opacity-70" : "opacity-100"
        }`}
        style={{
          borderRight: "2px solid var(--theme-primary)",
          animation: done
            ? "blink-caret 1s step-end infinite"
            : undefined,
        }}
        aria-hidden
      >
        &nbsp;
      </span>
    </Tag>
  );
}
