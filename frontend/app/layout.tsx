import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { getSiteConfig } from "@/lib/server";
import { DEFAULT_PRIMARY, DEFAULT_SECONDARY } from "@/lib/theme";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/siteDefaults";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-display",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
});

const SITE_TITLE = "Rafael Aragão — Rei dos Peão";
const SITE_DESCRIPTION =
  "Agenda de shows, contratação e informações do humorista Rafael Aragão.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_TITLE,
    locale: "pt_BR",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getSiteConfig();
  const primary = config?.primary_color || DEFAULT_PRIMARY;
  const secondary = config?.secondary_color || DEFAULT_SECONDARY;

  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      style={
        {
          ["--theme-primary"]: primary,
          ["--theme-secondary"]: secondary,
          ["--background"]: secondary,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full">
        <ThemeProvider
          initialPrimary={primary}
          initialSecondary={secondary}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
