import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopPromoBar from "@/components/TopPromoBar";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getSiteSettings } from "@/lib/api";
import type { SiteSetting } from "@/lib/types";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Anaiza Nest — Bangladesh's #1 Gift Shop",
    template: "%s | Anaiza Nest",
  },
  description:
    "Handcrafted ceramic tea sets, porcelain collections, and premium gift boxes, delivered across Bangladesh.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let siteSettings: SiteSetting | null = null;

  try {
    siteSettings = await getSiteSettings();
  } catch {
    // Header/Footer fall back to defaults when the API is unreachable.
  }

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <TopPromoBar siteSettings={siteSettings} />
              <Header siteSettings={siteSettings} />
              <main className="flex-1">{children}</main>
              <Footer siteSettings={siteSettings} />
              <CartDrawer />
              <WhatsAppButton phone={siteSettings?.contact_phone ?? null} />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
