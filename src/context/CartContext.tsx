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
import { feedItemId, trackAddToCart, trackRemoveFromCart } from "@/lib/tracking";
import type { RestoreLine } from "@/lib/cartRecovery";
import { CART_KEY, loadCart } from "@/lib/storedState";
import type { ProductVariant } from "@/lib/types";

// Only the fields addItem actually reads — lets callers that don't have a
// full Product (e.g. the wishlist page's cached snapshot) add to cart too.
export interface CartAddableProduct {
  id: number;
  slug: string;
  name: string;
  effective_price: number;
  // The regular price (a Product has it as `price`). Kept on a cart line only when it is above the price charged, so the
  // cart can say how much is saved.
  price?: number;
  stock_quantity: number;
  // The product's SKU, which is its id in the product feeds (the product id stands in when it has none).
  sku?: string | null;
  images?: { url: string }[];
  // Its category, for the events' item_category (a wishlist snapshot has none).
  category?: { name: string } | null;
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  name: string;
  price: number;
  // What it costs without the sale, when it is on sale. Carts saved before this was kept have none.
  regularPrice?: number;
  image: string | null;
  variantId: number | null;
  variantLabel: string | null;
  // The SKU of this exact piece (the variant's, when it has its own): the id the pixels report. Carts saved before this
  // was kept have none, and report the product id.
  sku?: string | null;
  // The product's category name when it was added (item_category in the events). Carts saved before this was kept have none.
  category?: string | null;
  quantity: number;
  stock: number;
}

// The most a line can hold: its stock, or a generous ceiling when the stock figure is unknown.
export function maxQuantityFor(item: Pick<CartItem, "stock">): number {
  return item.stock > 0 ? item.stock : 99;
}

interface CartContextValue {
  items: CartItem[];
  // True once the saved cart has been read from the browser (until then `items` is empty because nothing has been read).
  ready: boolean;
  itemCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (product: CartAddableProduct, variant: ProductVariant | null, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  // Puts a saved cart back (from a reminder's link). Not an add to cart, so it fires no add-to-cart event.
  restoreItems: (lines: RestoreLine[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartKey(productId: number, variantId: number | null) {
  return `${productId}:${variantId ?? "base"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    // What is in storage is checked line by line before it is used: a cart saved by the old site, by an older version
    // of this one, or a broken string is ignored and removed (see storedState.ts), never handed on as the cart.
    // One-time sync from localStorage on mount — window is unavailable during SSR, so this can't be a lazy
    // useState initializer instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loadCart(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // Storage full or blocked: the cart still works for this visit.
    }
  }, [items, hydrated]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addItem = useCallback(
    (product: CartAddableProduct, variant: ProductVariant | null, quantity: number) => {
      trackAddToCart(product, quantity, variant);
      const key = cartKey(product.id, variant?.id ?? null);
      setItems((prev) => {
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) =>
            item.key === key
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, maxQuantityFor(item)),
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
            ...(product.price !== undefined && product.price > product.effective_price ? { regularPrice: product.price } : {}),
            image: product.images?.[0]?.url ?? null,
            variantId: variant?.id ?? null,
            variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
            sku: feedItemId(product, variant),
            ...(product.category?.name ? { category: product.category.name } : {}),
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
          item.key === key ? { ...item, quantity: Math.min(Math.max(quantity, 0), maxQuantityFor(item)) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback(
    (key: string) => {
      const removed = items.find((item) => item.key === key);
      if (removed) trackRemoveFromCart(removed);
      setItems((prev) => prev.filter((item) => item.key !== key));
    },
    [items],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const restoreItems = useCallback((lines: RestoreLine[]) => {
    if (lines.length === 0) return;

    setItems((prev) => {
      const next = [...prev];

      for (const line of lines) {
        const key = cartKey(line.productId, line.variantId);
        const at = next.findIndex((item) => item.key === key);

        if (at >= 0) {
          // Already in the cart: keep the larger quantity, never more than is in stock.
          next[at] = { ...next[at], price: line.price, quantity: Math.min(Math.max(next[at].quantity, line.quantity), maxQuantityFor({ stock: line.stock })), stock: line.stock };
        } else {
          next.push({
            key,
            productId: line.productId,
            slug: line.slug,
            name: line.name,
            price: line.price,
            image: line.image,
            variantId: line.variantId,
            variantLabel: line.variantLabel,
            sku: line.sku,
            quantity: line.quantity,
            stock: line.stock,
          });
        }
      }

      return next;
    });
  }, []);

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
      ready: hydrated,
      itemCount,
      subtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      restoreItems,
    }),
    [
      items,
      hydrated,
      itemCount,
      subtotal,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      restoreItems,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
