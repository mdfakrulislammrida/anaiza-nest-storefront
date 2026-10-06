import type { CookieConsentSettings, MarketingSetting } from "@/lib/types";
import { consentBootstrapSource } from "@/lib/consentBootstrap";

// Renders nothing for any ID that isn't actually set in the admin -- each tag is entirely optional and
// independent of the others. The tags themselves are loaded by one small inline script (see
// consentBootstrap.ts) that first sets Google Consent Mode v2 defaults, then loads GTM, and loads the Meta
// and TikTok pixels only when the visitor's cookie choice allows marketing. IDs are admin-controlled (not
// public user input) and are embedded as JSON, never interpolated into code.

// Opt-in cookie mode: the no-JavaScript fallbacks below would load Google's and Meta's tags with no way to
// ask for consent, so they are left out.
function waitsForConsent(consent: CookieConsentSettings | null): boolean {
  return Boolean(consent?.enabled && consent.mode === "opt_in");
}

export function MarketingHeadScripts({
  marketing,
  consent,
}: {
  marketing: MarketingSetting | null;
  consent: CookieConsentSettings | null;
}) {
  const gtm = marketing?.gtm_container_id || null;
  const meta = marketing?.meta_pixel_id || null;
  const tiktok = marketing?.tiktok_pixel_id || null;
  // If GTM is configured, GA4 is assumed to be wired up inside the GTM container rather than loaded again
  // directly here (avoids double-firing pageviews). The direct gtag.js tag is only a fallback for when there
  // is a GA4 ID but no GTM container at all.
  const ga4 = !gtm && marketing?.ga4_id ? marketing.ga4_id : null;

  // Nothing to load and no banner: nothing to do. (With the banner on, the script is still needed, because it
  // is what UTM storage and checkout ask about the visitor's choice.)
  if (!gtm && !meta && !tiktok && !ga4 && !consent?.enabled) return null;

  return (
    <script
      id="consent-and-tags"
      dangerouslySetInnerHTML={{
        __html: consentBootstrapSource({
          // No settings (or the banner is off): everything is allowed, exactly as before the banner existed.
          enabled: Boolean(consent?.enabled),
          mode: consent?.mode === "opt_in" ? "opt_in" : "notice",
          gtm,
          ga4,
          meta,
          tiktok,
        }),
      }}
    />
  );
}

export function MarketingBodyNoscript({
  marketing,
  consent,
}: {
  marketing: MarketingSetting | null;
  consent: CookieConsentSettings | null;
}) {
  const gtmId = marketing?.gtm_container_id || null;
  const metaPixelId = marketing?.meta_pixel_id || null;

  if (waitsForConsent(consent) || (!gtmId && !metaPixelId)) return null;

  return (
    <>
      {gtmId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="gtm"
          />
        </noscript>
      )}
      {metaPixelId && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel, not a real image */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId)}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </>
  );
}
