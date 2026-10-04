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
import PopupManager from "@/components/PopupManager";
import { getMarketingSettings, getSiteSettings } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import { siteJsonLd } from "@/lib/jsonld";
import { siteRobots } from "@/lib/seo";
import { MarketingBodyNoscript, MarketingHeadScripts } from "@/components/MarketingScripts";
import RouteChangeTracker from "@/components/RouteChangeTracker";
import UtmCapture from "@/components/UtmCapture";

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

// Default meta description: the admin's brand description when one is set,
// otherwise the fixed line that was used before it existed. Pages that set their
// own description are unaffected.
export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings().catch(() => null);
  const description = siteSettings?.brand_description || SITE_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    robots: siteRobots(),
    title: {
      default: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      title: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Bangladesh's #1 Gift Shop`,
      description,
    },
  };
}

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(siteSettings)) }}
        />
        <MarketingHeadScripts marketing={marketing} />
      </head>
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <MarketingBodyNoscript marketing={marketing} />
        <RouteChangeTracker />
        <UtmCapture />
        <SiteSettingsProvider initialSettings={siteSettings}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <TopPromoBar />
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
                <CartDrawer />
                <WhatsAppButton />
                <PopupManager />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
