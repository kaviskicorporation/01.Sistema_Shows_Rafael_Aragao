import type { ImgHTMLAttributes } from "react";

type IconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  title?: string;
};

function BrandImg({
  src,
  alt,
  className = "h-6 w-6",
  title,
  ...props
}: IconProps & { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      title={title || alt}
      className={`object-contain ${className}`}
      draggable={false}
      {...props}
    />
  );
}

/** Pins oficiais (PNGs das redes enviados pelo cliente). */

export function InstagramIcon(props: IconProps) {
  return (
    <BrandImg
      src="/icons/social/instagram.png"
      alt="Instagram"
      {...props}
    />
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <BrandImg src="/icons/social/youtube.png" alt="YouTube" {...props} />
  );
}

export function SpotifyIcon(props: IconProps) {
  return (
    <BrandImg src="/icons/social/spotify.png" alt="Spotify" {...props} />
  );
}

export function TikTokIcon(props: IconProps) {
  return (
    <BrandImg src="/icons/social/tiktok.png" alt="TikTok" {...props} />
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <BrandImg src="/icons/social/facebook.png" alt="Facebook" {...props} />
  );
}
