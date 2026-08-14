"use client";

import { useState } from "react";
import type { EventImage } from "@/lib/types";

function src(img: EventImage): string {
  return img.image_url || img.image || "";
}

export default function Gallery({ images }: { images: EventImage[] }) {
  const [active, setActive] = useState<string | null>(null);
  const valid = images.filter((i) => src(i));
  if (valid.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {valid.map((img) => (
          <button
            key={img.id}
            onClick={() => setActive(src(img))}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src(img)}
              alt={img.caption || ""}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
          <button
            onClick={() => setActive(null)}
            className="absolute right-6 top-6 text-3xl text-white/70 hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
