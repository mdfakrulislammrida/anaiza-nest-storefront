import type { MarketingSetting } from "@/lib/types";

// Renders nothing for any ID that isn't actually set in the admin -- each
// snippet below is entirely optional and independent of the others.
// IDs are admin-controlled (not public user input), but are still embedded
// via JSON.stringify rather than raw string interpolation, since they land
// inside a literal <script> body.

export function MarketingHeadScripts({ marketing }: { marketing: MarketingSetting | null }) {
  const gtmId = marketing?.gtm_container_id || null;
  const metaPixelId = marketing?.meta_pixel_id || null;
  const tiktokPixelId = marketing?.tiktok_pixel_id || null;
  // If GTM is configured, GA4 is assumed to be wired up inside the GTM
  // container rather than loaded again directly here (avoids double-firing
  // pageviews). The direct gtag.js tag is only a fallback for when there's
  // a GA4 ID but no GTM container at all.
  const ga4Id = !gtmId && marketing?.ga4_id ? marketing.ga4_id : null;

  return (
    <>
      {gtmId && (
        // eslint-disable-next-line @next/next/next-script-for-ga -- raw snippet kept deliberately, so GTM/Meta/TikTok/GA4 are all handled uniformly here without adding @next/third-parties as a dependency for just one of the four
        <script
          id="gtm-init"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`,
          }}
        />
      )}

      {ga4Id && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`} />
          <script
            id="ga4-init"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(ga4Id)});`,
            }}
          />
        </>
      )}

      {metaPixelId && (
        <script
          id="meta-pixel-init"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`,
          }}
        />
      )}

      {tiktokPixelId && (
        <script
          id="tiktok-pixel-init"
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(${JSON.stringify(tiktokPixelId)});ttq.page();}(window,document,'ttq');`,
          }}
        />
      )}
    </>
  );
}

export function MarketingBodyNoscript({ marketing }: { marketing: MarketingSetting | null }) {
  const gtmId = marketing?.gtm_container_id || null;
  const metaPixelId = marketing?.meta_pixel_id || null;

  if (!gtmId && !metaPixelId) return null;

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
