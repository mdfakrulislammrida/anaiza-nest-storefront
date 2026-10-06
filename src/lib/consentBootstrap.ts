// The one inline script that decides what may load, and when. It runs in <head>, before Google Tag Manager,
// and does four things:
//   1. sets Google Consent Mode v2 defaults (analytics_storage, ad_storage, ad_user_data, ad_personalization)
//      from the visitor's saved choice, or from the mode when there is none yet;
//   2. loads GTM (and GA4 when there is no GTM) straight away -- Consent Mode tells them what they may store;
//   3. loads the Meta and TikTok pixels only when marketing is allowed, and again later if the visitor allows it;
//   4. exposes window.anaizaConsent so the banner, the footer link, UTM capture and checkout use the same state.
//
// In notice mode nothing waits: with no choice yet everything is allowed, and a choice the visitor makes is
// still honoured. In opt-in mode analytics and marketing are denied until the visitor chooses.
// The choice is a first-party cookie, "a1m0" style (analytics, marketing), kept for 12 months.
//
// Kept as plain ES5 text so it is tiny, runs before React, and can be tested in isolation (consent.test.ts).

export const CONSENT_COOKIE = "anaiza_consent";
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60; // 12 months

export interface ConsentConfig {
  // False when the banner is switched off (or its settings could not be read): everything is allowed, as before.
  enabled: boolean;
  mode: "notice" | "opt_in";
  gtm: string | null;
  // Only used when there is no GTM container.
  ga4: string | null;
  meta: string | null;
  tiktok: string | null;
}

export function consentBootstrapSource(config: ConsentConfig): string {
  // "<" is escaped so no id, however odd, can close the script tag.
  const cfg = JSON.stringify(config).replace(/</g, "\\u003c");

  return `(function(w,d,cfg){
var CK="${CONSENT_COOKIE}",MAXAGE=${CONSENT_MAX_AGE_SECONDS},L={};
w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments);}
var optIn=!!(cfg.enabled&&cfg.mode==="opt_in");
function read(){
var m=d.cookie.match(new RegExp("(?:^|; )"+CK+"=([^;]*)"));
var r=m&&/^a([01])m([01])$/.exec(decodeURIComponent(m[1]));
return r?{a:r[1]==="1",m:r[2]==="1"}:null;
}
var choice=read();
function eff(){return choice||{a:!optIn,m:!optIn};}
function st(v){return v?"granted":"denied";}
function signal(c){return {analytics_storage:st(c.a),ad_storage:st(c.m),ad_user_data:st(c.m),ad_personalization:st(c.m)};}
if(cfg.gtm||cfg.ga4){
var def=signal(eff());
if(!choice&&optIn)def.wait_for_update=500;
gtag("consent","default",def);
}
function inject(src){var s=d.createElement("script");s.async=true;s.src=src;var f=d.getElementsByTagName("script")[0];f.parentNode.insertBefore(s,f);}
function gtm(){
if(!cfg.gtm||L.gtm)return;L.gtm=1;
w.dataLayer.push({"gtm.start":new Date().getTime(),event:"gtm.js"});
inject("https://www.googletagmanager.com/gtm.js?id="+encodeURIComponent(cfg.gtm));
}
function ga4(){
if(cfg.gtm||!cfg.ga4||L.ga4)return;L.ga4=1;
inject("https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(cfg.ga4));
gtag("js",new Date());gtag("config",cfg.ga4);
}
function meta(){
if(!cfg.meta||L.meta)return;L.meta=1;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,"script","https://connect.facebook.net/en_US/fbevents.js");
w.fbq("init",cfg.meta);w.fbq("track","PageView");
}
function tiktok(){
if(!cfg.tiktok||L.tt)return;L.tt=1;
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load(cfg.tiktok);ttq.page();}(w,d,"ttq");
}
function marketing(){meta();tiktok();}
w.anaizaConsent={
config:cfg,
optIn:optIn,
get:function(){return choice;},
effective:eff,
set:function(a,m){
var was=eff();
choice={a:!!a,m:!!m};
d.cookie=CK+"=a"+(choice.a?1:0)+"m"+(choice.m?1:0)+"; Max-Age="+MAXAGE+"; Path=/; SameSite=Lax"+(w.location&&w.location.protocol==="https:"?"; Secure":"");
if(cfg.gtm||cfg.ga4)gtag("consent","update",signal(choice));
if(choice.m)marketing();
else if(was.m){
if(L.meta&&typeof w.fbq==="function")w.fbq("consent","revoke");
if(L.tt&&w.ttq&&typeof w.ttq.revokeConsent==="function")w.ttq.revokeConsent();
}
try{w.dispatchEvent(new w.CustomEvent("anaiza:consent",{detail:choice}));}catch(e){}
}
};
gtm();ga4();
if(eff().m)marketing();
})(window,document,${cfg});`;
}
