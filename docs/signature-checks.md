# Signature checks

The brand kit's signature visuals (pour line, gift frame, seal, burgundy, shadows, gradients, fixed bars) are held to a
few rules. Two checks keep them there.

## 1. In `npm test`, no browser needed

- `src/lib/signatureSource.test.ts` reads the source: where a shadow, a gradient, a seal, a pour line or a burgundy fill
  may be written. Adding a second one fails the test until someone decides it is meant.
- `src/lib/signatureProbe.test.ts` runs the probe's rules on snapshots (the cases the audit found, next to pages that pass).

## 2. On a rendered page, in a browser

`scripts/signature-probe.cjs` measures the page it is pasted into.

1. Start the shop (`npm run dev` with the API running, or open the built site).
2. Open the page. Set the window to **390 wide** (and 844 high), then paste the whole file into the browser console.
3. Read the `problems` list. An empty list passes. Repeat at **1280 wide**.
4. Do the first visit (no cookie choice, so the banner shows) and again after choosing.

Page types worth running: home, shop, category, product, cart, checkout, a CMS page, a blog article, a landing page.

What it checks, per page:

| Rule | Limit |
| --- | --- |
| h1 | exactly one |
| Sideways scroll | none |
| Pour line (`.pour-line`, `.an-pour`) | at most one, hidden from screen readers |
| Gift frame | inset 4% of the short side (within 1.5 px), hidden from screen readers |
| Seal | at most one |
| Burgundy | once: fills plus italic lines together |
| Shadow | only the product-photo shadow (`shadow-warm`) |
| Gradient | only an element marked `data-scrim` (a text scrim over a photo) |
| Fixed items | none overlapping (a dialog covers the page by design) |
| Fixed bars at the bottom | the order bar and the cookie banner together take at most 38% of the screen height |

A new text scrim over a photo must carry `data-scrim`; a new seal must be rendered by `Seal` (which carries `data-seal`).
