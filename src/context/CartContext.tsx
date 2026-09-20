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
import type { ProductVariant } from "@/lib/types";

// Only the fields addItem actually reads — lets callers that don't have a
// full Product (e.g. the wishlist page's cached snapshot) add to cart too.
export interface CartAddableProduct {
  id: number;
  slug: string;
  name: string;
  effective_price: number;
  stock_quantity: number;
  images?: { url: string }[];
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  variantId: number | null;
  variantLabel: string | null;
  quantity: number;
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: CartAddableProduct, variant: ProductVariant | null, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "anaiza-cart";

function cartKey(productId: number, variantId: number | null) {
  return `${productId}:${variantId ?? "base"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time sync from localStorage on mount — window is unavailable
      // during SSR, so this can't be a lazy useState initializer instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback(
    (product: CartAddableProduct, variant: ProductVariant | null, quantity: number) => {
      const key = cartKey(product.id, variant?.id ?? null);
      setItems((prev) => {
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) =>
            item.key === key
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, item.stock || 99),
                }
              : item,
          );
        }
        return [
          ...prev,
          {
            key,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.effective_price,
            image: product.images?.[0]?.url ?? null,
            variantId: variant?.id ?? null,
            variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
            quantity,
            stock: product.stock_quantity,
          },
        ];
      });
      setIsDrawerOpen(true);
    },
    [],
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: Math.max(quantity, 0) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
