"use client";

import Link from "next/link";
import { Component, type ReactNode } from "react";
import { useCart } from "@/context/CartContext";

// A safety net for the parts of the page that read the cart. The cart is checked before it is used (storedState.ts), so
// this should never be needed; but if anything here ever fails, the failure stays in its own corner (the header, the
// basket drawer, the page body) and the rest of the shop, the header and the footer included, keeps working.
//
// `variant` says what is shown in the place of what failed. Functions cannot be passed down from the server layout, so
// the three looks live here: "silent" (nothing), "header" (the name and a way home) and "page" (a short note with two
// buttons: try again, or start a fresh basket).

type Variant = "silent" | "header" | "page";

interface Props {
  children: ReactNode;
  variant: Variant;
  // Called when the visitor chooses to start a fresh basket.
  onFreshBasket: () => void;
}

interface State {
  failed: boolean;
}

class Boundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Left in the console for whoever looks; nothing else is done with it.
    console.error("A part of the page failed and was replaced:", error);
  }

  private retry = () => this.setState({ failed: false });

  private freshBasket = () => {
    this.props.onFreshBasket();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    if (this.props.variant === "silent") return null;

    if (this.props.variant === "header") {
      return (
        <header className="border-b border-linen bg-ivory">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
            <Link href="/" className="font-serif text-h2 text-navy">
              Anaiza Nest
            </Link>
          </div>
        </header>
      );
    }

    return (
      <div role="alert" className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="font-serif text-h2 text-charcoal">Something went wrong showing this page</h2>
        <p className="mt-4 text-body text-stone">
          We are sorry. Your basket may be the cause. You can try again, or start a fresh basket and add your gifts once more.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={this.retry}
            className="rounded-btn bg-navy px-8 py-4 text-button text-ivory transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.freshBasket}
            className="rounded-btn border border-stone/80 px-8 py-4 text-button text-charcoal hover:bg-linen"
          >
            Start a fresh basket
          </button>
        </div>
      </div>
    );
  }
}

export default function CartBoundary({ children, variant }: { children: ReactNode; variant: Variant }) {
  const { clearCart } = useCart();

  return (
    <Boundary variant={variant} onFreshBasket={clearCart}>
      {children}
    </Boundary>
  );
}
