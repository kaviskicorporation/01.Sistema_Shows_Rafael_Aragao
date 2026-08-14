import type { SiteConfig } from "@/lib/types";
import {
  FacebookIcon,
  InstagramIcon,
  SpotifyIcon,
  TikTokIcon,
  YoutubeIcon,
} from "./SocialIcons";
import SectionAura from "./SectionAura";

export default function Footer({ config }: { config: SiteConfig }) {
  const socials = [
    { label: "Instagram", href: config.instagram, Icon: InstagramIcon },
    { label: "YouTube", href: config.youtube, Icon: YoutubeIcon },
    { label: "Spotify", href: config.spotify, Icon: SpotifyIcon },
    { label: "TikTok", href: config.tiktok, Icon: TikTokIcon },
    { label: "Facebook", href: config.facebook, Icon: FacebookIcon },
  ].filter((s) => Boolean(s.href && String(s.href).trim()));

  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-ink py-12">
      <SectionAura variant="wash" />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 text-center">
        <div className="font-display text-2xl font-extrabold">
          <span className="text-gold">{config.hero_title.split(" ")[0]}</span>{" "}
          <span className="text-white">
            {config.hero_title.split(" ").slice(1).join(" ")}
          </span>
        </div>

        {socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-white/70 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
              >
                <s.Icon className="h-5 w-5 shrink-0 rounded-[22%] transition group-hover:scale-110" />
                <span>{s.label}</span>
              </a>
            ))}
          </div>
        )}

        {(config.contact_email || config.contact_phone) && (
          <p className="text-sm text-white/50">
            {config.contact_email}
            {config.contact_email && config.contact_phone ? " • " : ""}
            {config.contact_phone}
          </p>
        )}

        <p className="text-xs text-white/30">
          © {new Date().getFullYear()}{" "}
          {config.footer_text || config.hero_title}. Todos os direitos
          reservados.
        </p>
      </div>
    </footer>
  );
}
