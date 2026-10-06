import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri, Inter, Noto_Serif_Bengali } from "next/font/google";
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
import { getCategories, getCookieConsentSettings, getMarketingSettings, getSiteSettings } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/config";
import { siteJsonLd } from "@/lib/jsonld";
import { siteRobots } from "@/lib/seo";
import { MarketingBodyNoscript, MarketingHeadScripts } from "@/components/MarketingScripts";
import RouteChangeTracker from "@/components/RouteChangeTracker";
import UtmCapture from "@/components/UtmCapture";
import CookieConsent from "@/components/CookieConsent";

// Brand kit type: Fraunces 300/400/500 for headings (italic 300 only for the one emotional line),
// Inter 400/500/600 for text. Both are variable fonts, so every weight the kit uses (300/400/500 and 400/500/600) is one file each.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Loaded on demand: only a page that actually shows the emotional line asks for this file.
const frauncesItalic = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: "300",
  variable: "--font-fraunces-italic",
  display: "swap",
  preload: false,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Bangla: Noto Serif Bengali 400/500 for headings, Hind Siliguri 400/500/600 for text. Only the
// Bengali subset is declared (so these families have no Latin glyphs) and preload is off, so the
// browser downloads a Bangla file only when a page contains Bangla characters.
const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500"],
  variable: "--font-bn-serif",
  display: "swap",
  preload: false,
});

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-bn-sans",
  display: "swap",
  preload: false,
});

const SITE_NAME = BRAND.name;

// Default meta: the title pattern is "Page name | Anaiza Nest" (the template below); the home page,
// which has no page name, reads "Anaiza Nest | <tagline>". The default description is the one-line
// boilerplate (the footer blurb the admin can edit). Pages that set their own are unaffected.
export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await getSiteSettings().catch(() => null);
  // A blank tagline in the admin comes back null: the title is then just the name.
  const tagline = siteSettings ? siteSettings.tagline : BRAND.tagline;
  const description = siteSettings?.footer_about || BRAND.oneLine;
  const homeTitle = tagline ? `${SITE_NAME} | ${tagline}` : SITE_NAME;
  const monogram = siteSettings?.monogram;

  return {
    metadataBase: new URL(SITE_URL),
    robots: siteRobots(),
    title: {
      default: homeTitle,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    ...(monogram ? { icons: { icon: monogram, apple: monogram } } : {}),
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      title: homeTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
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
  // The cookie banner's mode and on/off switch are built into the page head (they decide what loads and when), so
  // changing them needs a rebuild; its wording refreshes on its own.
  const cookieConsent = await getCookieConsentSettings().catch(() => null);
  // The header's Categories menu is built from the categories as of this build; a category added
  // later is linked only after the next build, because its page doesn't exist until then.
  const categories = await getCategories().catch(() => []);

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${frauncesItalic.variable} ${inter.variable} ${notoSerifBengali.variable} ${hindSiliguri.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd(siteSettings)) }}
        />
        <MarketingHeadScripts marketing={marketing} consent={cookieConsent} />
      </head>
      <body className="flex min-h-full flex-col bg-ivory text-charcoal">
        <MarketingBodyNoscript marketing={marketing} consent={cookieConsent} />
        <RouteChangeTracker />
        <UtmCapture />
        <SiteSettingsProvider initialSettings={siteSettings}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <TopPromoBar />
                <Header categories={categories} />
                <main className="flex-1">{children}</main>
                <Footer cookieBanner={Boolean(cookieConsent?.enabled)} />
                <CartDrawer />
                <WhatsAppButton />
                <PopupManager />
                <CookieConsent initial={cookieConsent} />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
