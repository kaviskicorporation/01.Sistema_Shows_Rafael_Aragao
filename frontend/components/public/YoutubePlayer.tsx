"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { parseYoutubeUrl, youtubeThumb } from "@/lib/youtube";
import { useIsCoarsePointer } from "./useIsCoarsePointer";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
  unloadModule?: (name: string) => void;
  setOption?: (module: string, option: string, value: unknown) => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.body.appendChild(tag);
    }
  });
  return apiPromise;
}

/** Desliga legendas / CC do YouTube (auto ou manuais). */
function killCaptions(player: YTPlayer | null) {
  if (!player) return;
  try {
    player.unloadModule?.("captions");
    player.unloadModule?.("captions");
    player.setOption?.("captions", "track", {});
  } catch {
    /* ignore */
  }
}

export default function YoutubePlayer({ url }: { url: string }) {
  const parsed = parseYoutubeUrl(url);
  const coarse = useIsCoarsePointer();
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hover, setHover] = useState(false);
  const [started, setStarted] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    if (!parsed || !hostRef.current) return;
    let cancelled = false;
    let player: YTPlayer | null = null;
    let captionWatch: number | undefined;

    loadYoutubeApi().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;
      const mount = document.createElement("div");
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId: parsed.id,
        host: "https://www.youtube-nocookie.com",
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          start: parsed.start || 0,
          cc_load_policy: 0,
          // evita UI extra / anotações
          color: "white",
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            killCaptions(player);
            setReady(true);
            try {
              setDuration(player?.getDuration() || 0);
            } catch {
              /* ignore */
            }
            // YouTube às vezes liga CC depois do ready
            captionWatch = window.setInterval(() => killCaptions(player), 1500);
          },
          onStateChange: (e: { data: number }) => {
            killCaptions(player);
            const st = window.YT?.PlayerState;
            if (!st) return;
            setPlaying(e.data === st.PLAYING);
            if (e.data === st.PLAYING) setStarted(true);
            if (e.data === st.ENDED) {
              setPlaying(false);
              setProgress(1);
            }
          },
          onApiChange: () => {
            killCaptions(player);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (captionWatch) window.clearInterval(captionWatch);
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [parsed?.id, parsed?.start]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p || dragging.current) return;
      try {
        const dur = p.getDuration() || duration;
        if (dur > 0) {
          setDuration(dur);
          setProgress(Math.min(1, p.getCurrentTime() / dur));
        }
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [ready, duration]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      killCaptions(p);
      if (playing) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* ignore */
    }
  }, [playing]);

  function seekFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const p = playerRef.current;
    if (!p || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setProgress(ratio);
    p.seekTo(ratio * duration, true);
  }

  if (!parsed) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-ink-card text-sm text-white/45">
        URL de vídeo inválida
      </div>
    );
  }

  // Controles só no hover (desktop); no touch ficam acessíveis
  const showBar = coarse ? hover || !playing : hover;

  return (
    <div
      className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false);
      }}
    >
      {/*
        Crop agressivo: iframe maior e puxado para cima.
        Corta chrome, logo, faixa preta e legendas do YouTube na base.
      */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div
          ref={hostRef}
          className="pointer-events-none absolute left-1/2 top-[-8%] h-[128%] w-[128%] -translate-x-1/2 [&_iframe]:pointer-events-none [&_iframe]:h-full [&_iframe]:w-full"
          aria-hidden
        />
      </div>

      {/* Thumbnail até o primeiro play */}
      {!started && (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 z-10"
          aria-label="Reproduzir vídeo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumb(parsed.id)}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
        </button>
      )}

      {started && (
        <button
          type="button"
          onClick={toggle}
          className="absolute inset-0 z-[5]"
          aria-label={playing ? "Pausar" : "Reproduzir"}
        />
      )}

      {(!playing || !started) && (
        <button
          type="button"
          onClick={toggle}
          className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold text-ink shadow-[0_0_40px_-8px_var(--theme-primary)] transition hover:scale-105 sm:h-20 sm:w-20"
          aria-label="Reproduzir"
        >
          <Play size={28} className="ml-1 fill-current" />
        </button>
      )}

      {/* Controles próprios — só no hover / toque */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-10 transition-opacity duration-200 sm:px-4 sm:pb-4 ${
          showBar ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition hover:brightness-110"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? (
              <Pause size={16} className="fill-current" />
            ) : (
              <Play size={16} className="ml-0.5 fill-current" />
            )}
          </button>

          <div
            className="group/bar relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20"
            onClick={seekFromEvent}
            onMouseDown={(e) => {
              const bar = e.currentTarget;
              dragging.current = true;
              seekFromEvent(e);
              const onMove = (ev: MouseEvent) => {
                const rect = bar.getBoundingClientRect();
                const ratio = Math.min(
                  1,
                  Math.max(0, (ev.clientX - rect.left) / rect.width)
                );
                setProgress(ratio);
                const p = playerRef.current;
                if (p && duration) p.seekTo(ratio * duration, true);
              };
              const onUp = () => {
                dragging.current = false;
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            tabIndex={0}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gold"
              style={{ width: `${progress * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow transition group-hover/bar:opacity-100"
              style={{ left: `calc(${progress * 100}% - 7px)` }}
            />
          </div>

          <span className="min-w-[4.5rem] text-right text-[11px] font-medium tabular-nums text-white/70">
            {fmt(progress * duration)} / {fmt(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

function fmt(seconds: number) {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
