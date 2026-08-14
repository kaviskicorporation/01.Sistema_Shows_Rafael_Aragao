"use client";

import PageTransition from "@/components/PageTransition";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageTransition>{children}</PageTransition>;
}
