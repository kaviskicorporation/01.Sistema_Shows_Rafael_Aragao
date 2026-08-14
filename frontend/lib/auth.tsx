"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (module: string) => boolean;
  canWrite: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Invalida /auth/me em voo — evita apagar o user logo após um login bem-sucedido
  const epoch = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++epoch.current;
    try {
      // api.get("/auth/me") já tenta renovar o access via refresh cookie
      const me = await api.get<User>("/auth/me");
      if (id !== epoch.current) return;
      setUser(me);
    } catch {
      if (id !== epoch.current) return;
      setUser(null);
    } finally {
      if (id === epoch.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      // cancela qualquer refresh antigo que ainda possa setUser(null)
      const id = ++epoch.current;
      const me = await api.post<User>("/auth/login", {
        username: username.trim(),
        password,
      });
      if (id !== epoch.current) return;
      setUser(me);
      setLoading(false);
      // hard nav: garante cookie + estado limpo no painel
      window.location.assign("/admin");
    },
    []
  );

  const logout = useCallback(async () => {
    epoch.current += 1;
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setLoading(false);
      window.location.assign("/admin/login");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      can: (module) => Boolean(user?.permissions?.[module]),
      canWrite: (module) => {
        if (!user) return false;
        if (user.role === "admin") return true;
        if (user.role === "visualizador") return false;
        return Boolean(user.permissions?.[module]);
      },
    }),
    [user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
