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
import { loadWishlist, WISHLIST_KEY } from "@/lib/storedState";
import { trackAddToWishlist } from "@/lib/tracking";
import type { Product } from "@/lib/types";

export interface WishlistItem {
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  // For the id the pixels report; saved lists from before this have none.
  sku?: string | null;
}

interface WishlistContextValue {
  items: WishlistItem[];
  isWishlisted: (productId: number) => boolean;
  toggle: (product: Product) => void;
  removeItem: (productId: number) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Checked before use, like the cart (see storedState.ts).
    // One-time sync from localStorage on mount — see CartContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadWishlist(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked: the list still works for this visit.
    }
  }, [items, hydrated]);

  const isWishlisted = useCallback(
    (productId: number) => items.some((item) => item.productId === productId),
    [items],
  );

  const toggle = useCallback(
    (product: Product) => {
      // Reported when the heart is switched on, once per tap (outside the state update, which React may run twice).
      if (!items.some((item) => item.productId === product.id)) trackAddToWishlist(product);

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
            sku: product.sku,
          },
        ];
      });
    },
    [items],
  );

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
