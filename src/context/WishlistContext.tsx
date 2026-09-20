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
import type { Product } from "@/lib/types";

export interface WishlistItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
}

interface WishlistContextValue {
  items: WishlistItem[];
  isWishlisted: (productId: number) => boolean;
  toggle: (product: Product) => void;
  removeItem: (productId: number) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "anaiza-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time sync from localStorage on mount — see CartContext.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw) as WishlistItem[]);
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const isWishlisted = useCallback(
    (productId: number) => items.some((item) => item.productId === productId),
    [items],
  );

  const toggle = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((item) => item.productId === product.id)) {
        return prev.filter((item) => item.productId !== product.id);
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images?.[0]?.url ?? null,
          price: product.effective_price,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const value = useMemo(
    () => ({ items, isWishlisted, toggle, removeItem }),
    [items, isWishlisted, toggle, removeItem],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
