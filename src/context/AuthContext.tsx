"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginCustomer, registerCustomer } from "@/lib/api";
import type { AuthCustomer, LoginPayload, RegisterPayload } from "@/lib/types";

interface AuthContextValue {
  customer: AuthCustomer | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "anaiza-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time sync from localStorage on mount — see CartContext.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCustomer((JSON.parse(raw) as { customer: AuthCustomer }).customer);
    } catch {
      // ignore malformed storage
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginCustomer(payload);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    setCustomer(res.customer);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await registerCustomer(payload);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    setCustomer(res.customer);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({ customer, login, register, logout }),
    [customer, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
