// The web GTM loader, served from the shop's own tagging domain by Stape (the "Custom Loader"). It replaces Google's gtm.js snippet and is what lets
// Stape's Cookie Keeper extend _fbp, _fbc, _ga and FPID (Safari), and what keeps the container reachable when an ad blocker is on. The container is still
// GTM-MS2HWSWF and GTM still owns GA4 and Meta; only WHERE the container is fetched from changed.
//
// STAPE_LOADER_SOURCE is Stape's code, byte for byte (it is public page code, not a secret). Do not edit, reformat or minify it differently: paste a new
// version from Stape over it. The host, the loader id and the query value live inside it and nowhere else; STAPE_LOADER reads them back out for the tests,
// the headless check and the docs, so there is one copy to keep right. src/lib/consentBootstrap.ts runs it at the moment the tags are due (see there);
// docs/tracking-custom-loader.md says how to put the old Google loader back.

export const STAPE_LOADER_SOURCE = `!function(){"use strict";function l(e){for(var t=e,r=0,n=document.cookie.split(";");r<n.length;r++){var o=n[r].split("=");if(o[0].trim()===t)return o[1]}}function s(e){return localStorage.getItem(e)}function u(e){return window[e]}function A(e,t){e=document.querySelector(e);return t?null==e?void 0:e.getAttribute(t):null==e?void 0:e.textContent}var e=window,t=document,r="script",n="dataLayer",o="https://metrics.anaizanest.com",a="",i="d877ecfdyons",c="ax11=GgpSPjArTiggXCcuNzElQwVTXVdVQAcLTg8BGA0cAgsWHRtXBwkO",g="stapeUserId",v="",E="",d=!1;try{var d=!!g&&(m=navigator.userAgent,!!(m=new RegExp("Version/([0-9._]+)(.*Mobile)?.*Safari.*").exec(m)))&&16.4<=parseFloat(m[1]),f="stapeUserId"===g,I=d&&!f?function(e,t,r){void 0===t&&(t="");var n={cookie:l,localStorage:s,jsVariable:u,cssSelector:A},t=Array.isArray(t)?t:[t];if(e&&n[e])for(var o=n[e],a=0,i=t;a<i.length;a++){var c=i[a],c=r?o(c,r):o(c);if(c)return c}else console.warn("invalid uid source",e)}(g,v,E):void 0;d=d&&(!!I||f)}catch(e){console.error(e)}var m=e,g=(m[n]=m[n]||[],m[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"}),t.getElementsByTagName(r)[0]),v=I?"&bi="+encodeURIComponent(I):"",E=t.createElement(r),f=(d&&(i=8<i.length?i.replace(/([a-z]{8}$)/,"kp$1"):"kp"+i),!d&&a?a:o);E.async=!0,E.src=f+"/"+i+".js?"+c+v,null!=(e=g.parentNode)&&e.insertBefore(E,g)}();`;

// The web container this loader serves: the no-script frame names it. (The loader itself needs no container id: Stape ties the loader id to it.)
export const STAPE_CONTAINER_ID = "GTM-MS2HWSWF";

const pick = (name: string): string => new RegExp(`[,;]${name}="([^"]*)"`).exec(STAPE_LOADER_SOURCE)?.[1] ?? "";

/** The values inside the loader, read back out of it (never typed a second time). */
export const STAPE_LOADER = {
  /** Where the loader and the container come from: our own tagging domain. */
  host: pick("o"),
  /** The loader's file name, without ".js"; on Safari 16.4 and newer the loader puts "kp" in front of its last eight letters. */
  id: pick("i"),
  /** The query the file is asked for with. */
  query: pick("c"),
};

/** The no-script frame, the same loader family: the tagging domain's ns.html for the container. */
export function stapeNoscriptSrc(): string {
  return `${STAPE_LOADER.host}/ns.html?id=${encodeURIComponent(STAPE_CONTAINER_ID)}`;
}
