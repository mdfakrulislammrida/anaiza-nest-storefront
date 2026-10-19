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
2. Open the page. Set the window to **360 x 640**, then paste the whole file into the browser console.
3. Read the `problems` list. An empty list passes. Repeat at **375 x 667**, **390 x 844** and **1280 x 800**. On the home page also run **1440, 1600, 1700 and 1920** wide, with a hero picture set and without one.
4. Do the first visit (no cookie choice, so the banner shows) and again after choosing.

Run it against content that looks like the live site, not only the demo data: the live logo is a 197 px wide SVG, and it was the
logo that pushed the header off a phone. (Point the dev server at the live API, or copy the live logo into the local settings.)

Page types worth running: home, shop, category, product, cart, checkout, a CMS page, a blog article, a landing page.

What it checks, per page:

| Rule | Limit |
| --- | --- |
| h1 | exactly one |
| Pour line (`.pour-line`, `.an-pour`) | at most one, hidden from screen readers |
| Gift frame | inset 4% of the short side (within 1.5 px), hidden from screen readers |
| Seal | at most one |
| Burgundy | once: fills plus italic lines together |
| Shadow | only the product-photo shadow (`shadow-warm`) |
| Gradient | only an element marked `data-scrim` (a text scrim over a photo; see the list below) |
| Fixed items | none overlapping (a dialog covers the page by design) |
| Fixed bars at the bottom | the order bar and the cookie banner together take at most 38% of the screen height, or 320 px if that is more (the bars are as tall on a short phone as on a tall one) |
| Header | every control inside the screen; the cart whole and at least 44 x 44 px |
| Hero (home) | the headline and the badge whole, inside the screen and inside the text panel; with a picture set, the gift frame and the pour line inside the text panel and never over the photograph; from 640 px the hero's left edge and the tiles' right edge within 1 px of the header's logo and cart edges |
| Checkout (phone) | the order total in the first screen (in the folded summary at the top) and the fixed bar (total and Confirm order) at most 64 px; the small header has no cart on purpose, and every other header rule still holds |
| Sideways scroll | measured as `scrollWidth` against `clientWidth` (a phone that scrolls sideways reports an `innerWidth` as wide as the page, which once hid the header overflow) |

## The scrims (gradients the kit's ban allows)

Every gradient is a flat colour fading to nothing, over a photograph, and carries `data-scrim`. `signatureSource.test.ts` lists where they may be written:

| Where | What |
| --- | --- |
| `HeroSlider.tsx` | the slide text scrim |
| `landing/LandingBlocks.tsx` | the landing hero scrim |
| `Hero.tsx` | the edge of the home hero's text panel when a picture is set: deepink `#141F30` at the panel's own 90% to nothing, 120 px wide, wide screens only. It sits outside the panel, so no text is on it; the text is on the flat panel (4.5:1 or better over the brightest photograph, measured in `homepagePictures.test.ts`). It does dim the part of the photograph that is under it, so the admin's note says to keep the subject on the right. |
| `app/prose.css` | the "Read more" fade on a long summary |

A new text scrim over a photo must carry `data-scrim`; a new seal must be rendered by `Seal` (which carries `data-seal`).
