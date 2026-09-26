import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { AuthProvider } from "@/context/AuthContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TopPromoBar from "@/components/TopPromoBar";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getMarketingSettings, getSiteSettings } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { organizationJsonLd } from "@/lib/jsonld";
import { MarketingBodyNoscript, MarketingHeadScripts } from "@/components/MarketingScripts";
import RouteChangeTracker from "@/components/RouteChangeTracker";

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

const SITE_NAME = "Anaiza Nest";
const SITE_DESCRIPTION =
  "Handcrafted ceramic tea sets, porcelain collections, and premium gift boxes, delivered across Bangladesh.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    title: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
    description: SITE_DESCRIPTION,
  },
};

// viewportFit: "cover" lets content draw under the home-indicator area on
// notched phones, which is what makes env(safe-area-inset-bottom) resolve
// to a real value instead of 0 -- needed for the sticky mobile CTA bar on
// the product page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Fetched once at build time purely to emit static, crawlable Organization
  // JSON-LD below. The live header/footer intentionally keep fetching
  // site-settings again client-side (SiteSettingsProvider) so a name/logo/
  // contact-info change in the admin still shows up without a rebuild --
  // this build-time copy only needs to be roughly right, not live.
  const siteSettings = await getSiteSettings().catch(() => null);
  const marketing = await getMarketingSettings().catch(() => null);

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(siteSettings)) }}
        />
        <MarketingHeadScripts marketing={marketing} />
      </head>
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <MarketingBodyNoscript marketing={marketing} />
        <RouteChangeTracker />
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <TopPromoBar />
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <CartDrawer />
                <WhatsAppButton />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
