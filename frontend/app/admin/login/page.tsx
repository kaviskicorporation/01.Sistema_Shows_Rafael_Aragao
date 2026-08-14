"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message || "Credenciais inválidas."
          : "Não foi possível entrar. Verifique se o backend está rodando."
      );
      setLoading(false);
    }
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
            disabled={loading}
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
        </form>
      </div>
    </div>
  );
}
