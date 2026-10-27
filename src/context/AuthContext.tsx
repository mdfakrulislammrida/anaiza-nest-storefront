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
import { announceIdentity, trackSignUp } from "@/lib/tracking";
import type { AuthCustomer, LoginPayload, RegisterPayload } from "@/lib/types";

interface AuthContextValue {
  customer: AuthCustomer | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  loginWithToken: (token: string, isNew?: boolean) => Promise<void>;
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
    // From now on the customer id is the visitor's id (identity.ts).
    announceIdentity();
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await registerCustomer(payload);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(res));
    setCustomer(res.customer);
    trackSignUp("email");
    announceIdentity();
  }, []);

  // Social login: the OAuth callback redirect only hands back a bearer
  // token, so the customer profile has to be fetched separately here.
  // isNew is the API saying this sign-in just made the account (a registration with Google). An API that does not say leaves it false, and nothing is reported.
  const loginWithToken = useCallback(async (token: string, isNew = false) => {
    const customer = await getCustomer(token);
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ customer, token }));
    setCustomer(customer);
    if (isNew) trackSignUp("google");
    announceIdentity();
  }, []);

  const logout = useCallback(() => {
    const token = readAuthToken(window.localStorage);

    window.localStorage.removeItem(AUTH_KEY);
    setCustomer(null);

    if (token) void logoutCustomer(token);
    announceIdentity();
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
