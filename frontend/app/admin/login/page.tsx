"use client";

import { useState } from "react";
import { Briefcase, Eye, Handshake, LogIn, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const PROFILES = [
  {
    username: "admin",
    password: "admin12345",
    label: "Administrador",
    short: "Admin",
    icon: Shield,
    tone: "border-gold/40 bg-gold/15 text-gold hover:bg-gold hover:text-ink",
  },
  {
    username: "gerente",
    password: "gerente12345",
    label: "Gerente",
    short: "Gerente",
    icon: Briefcase,
    tone: "border-sky-400/40 bg-sky-500/15 text-sky-300 hover:bg-sky-400 hover:text-ink",
  },
  {
    username: "comercial",
    password: "comercial12345",
    label: "Comercial",
    short: "Comercial",
    icon: Handshake,
    tone: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-400 hover:text-ink",
  },
  {
    username: "visualizador",
    password: "visual12345",
    label: "Visualizador",
    short: "Visual",
    icon: Eye,
    tone: "border-violet-400/40 bg-violet-500/15 text-violet-300 hover:bg-violet-400 hover:text-ink",
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  const busy = loading || loadingUser !== null;

  async function enter(user: string, pass: string, asProfile?: string) {
    setError("");
    if (asProfile) setLoadingUser(asProfile);
    else setLoading(true);
    try {
      await login(user.trim(), pass);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "Credenciais inválidas."
          : "Não foi possível entrar. Verifique se o backend está rodando."
      );
      setLoading(false);
      setLoadingUser(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    await enter(username, password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-black text-white">
            <span className="text-gold">Rafael</span> Aragão
          </h1>
          <p className="mt-2 text-sm text-white/50">Painel administrativo</p>
        </div>

        <form
          data-hydrated="1"
          method="post"
          action="#"
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-ink-card p-8 shadow-2xl"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm text-white/70">Usuário</span>
            <input
              autoFocus
              required
              autoComplete="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-white outline-none focus:border-gold"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm text-white/70">Senha</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ink px-4 py-3 text-white outline-none focus:border-gold"
            />
          </label>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void handleSubmit({
                preventDefault() {},
                stopPropagation() {},
              } as React.FormEvent);
            }}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3 font-semibold text-ink transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/30">
              ou entre como
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {PROFILES.map((profile) => {
              const Icon = profile.icon;
              const active = loadingUser === profile.username;
              return (
                <button
                  key={profile.username}
                  type="button"
                  disabled={busy}
                  title={profile.label}
                  onClick={() =>
                    void enter(profile.username, profile.password, profile.username)
                  }
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 transition-colors disabled:opacity-60 ${profile.tone}`}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span className="text-[11px] font-medium leading-none">
                    {active ? "…" : profile.short}
                  </span>
                </button>
              );
            })}
          </div>
        </form>
      </div>
    </div>
  );
}
