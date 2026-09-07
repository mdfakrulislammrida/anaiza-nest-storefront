import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10 bg-ink text-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="font-serif text-xl tracking-wide">Anaiza</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ivory/70">
            Considered pieces, quietly made. Shop the current collection or
            learn about our approach.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Shop
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/shop" className="transition-colors hover:text-gold">
                All products
              </Link>
            </li>
            <li>
              <Link href="/cart" className="transition-colors hover:text-gold">
                Your cart
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Studio
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ivory/80">
            <li>
              <Link href="/about" className="transition-colors hover:text-gold">
                About Anaiza
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10 px-6 py-6 text-center text-xs text-ivory/50">
        © {new Date().getFullYear()} Anaiza. All rights reserved.
      </div>
    </footer>
  );
}
