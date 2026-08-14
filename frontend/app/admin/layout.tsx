"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import Sidebar from "@/components/admin/Sidebar";
import AdminAmbient from "@/components/admin/AdminAmbient";
import PageTransition from "@/components/PageTransition";
import { toneFromPath, toneStyle } from "@/lib/adminTones";

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, user, logout } = useAuth();
  const isLogin = pathname === "/admin/login";
  const tone = toneFromPath(pathname);

  useEffect(() => {
    if (!isLogin && !loading && !user) {
      // Hard redirect — evita ficar preso em "Redirecionando..."
      window.location.replace("/admin/login");
    }
  }, [isLogin, loading, user]);

  if (isLogin) return <PageTransition>{children}</PageTransition>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-white/60">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink text-white/60">
        <p>Redirecionando para o login...</p>
        <a
          href="/admin/login"
          className="text-sm text-gold underline"
          onClick={(e) => {
            e.preventDefault();
            void logout();
          }}
        >
          Ir para o login
        </a>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-ink text-white"
      style={toneStyle(tone.hex)}
    >
      <AdminAmbient />
      <Sidebar />
      <div className="relative z-10 flex min-h-screen flex-col lg:pl-64">
        <PageTransition className="flex min-h-0 flex-1 flex-col">
          {children}
        </PageTransition>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
