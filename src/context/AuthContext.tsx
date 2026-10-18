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
import { getCustomer, loginCustomer, logoutCustomer, registerCustomer } from "@/lib/api";
import { AUTH_KEY, loadAuth, readAuthToken } from "@/lib/storedState";
import type { AuthCustomer, LoginPayload, RegisterPayload } from "@/lib/types";

interface AuthContextValue {
  customer: AuthCustomer | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<AuthCustomer | null>(null);

  useEffect(() => {
    // A saved sign-in is used only when it is a customer with a token (see storedState.ts).
    // One-time sync from localStorage on mount — see CartContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomer(loadAuth(window.localStorage)?.customer ?? null);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginCustomer(payload);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(res));
    setCustomer(res.customer);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await registerCustomer(payload);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(res));
    setCustomer(res.customer);
  }, []);

  // Social login: the OAuth callback redirect only hands back a bearer
  // token, so the customer profile has to be fetched separately here.
  const loginWithToken = useCallback(async (token: string) => {
    const customer = await getCustomer(token);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ customer, token }));
    setCustomer(customer);
  }, []);

  const logout = useCallback(() => {
    const token = readAuthToken(window.localStorage);

    window.localStorage.removeItem(AUTH_KEY);
    setCustomer(null);

    if (token) void logoutCustomer(token);
  }, []);

  const value = useMemo(
    () => ({ customer, login, register, loginWithToken, logout }),
    [customer, login, register, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
