import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getPages, getSiteSettings } from "@/lib/api";
import type { Page, SiteSetting } from "@/lib/types";

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
    default: "Anaiza",
    template: "%s | Anaiza",
  },
  description: "Considered pieces, quietly made.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let siteSettings: SiteSetting | null = null;
  let pages: Page[] = [];

  try {
    [siteSettings, pages] = await Promise.all([getSiteSettings(), getPages()]);
  } catch {
    // Header/Footer fall back to defaults when the API is unreachable.
  }

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <CartProvider>
          <Header siteSettings={siteSettings} />
          <main className="flex-1">{children}</main>
          <Footer siteSettings={siteSettings} pages={pages} />
        </CartProvider>
      </body>
    </html>
  );
}
