# Cut-over to https://anaizanest.com

## Build

```
NEXT_PUBLIC_SITE_URL=https://anaizanest.com NEXT_PUBLIC_ALLOW_INDEXING=true NEXT_PUBLIC_API_URL=https://api.anaizanest.com/api npm run build
```

A variable set in the shell beats `.env.production` and `.env.local`, so the staging defaults in `.env.production` do not matter for this build.
Rebuild whenever products, categories, pages or articles are added or changed, so their pages carry the full static HTML (the JSON-LD, og:image
and canonical). Until then an item added after the last build is shown by the client shell of `.htaccess` rule 4 (it works, without the static SEO).

## What goes where

- `anaizanest-com-deploy.zip`: the contents of `out/`, including `.htaccess`. Upload to the root of the main domain's folder, next to the
  existing `api` link. Do not delete `api` (and `storage` / `admin` if the old site has them as links).
- `new-subdomain-redirect.zip`: one `.htaccess`. After go-live, put it in the folder that serves new.anaizanest.com in place of the staging site.
  It redirects every path to the same path on https://anaizanest.com with a 301, query string included, and leaves `/.well-known/` alone so the
  certificate keeps renewing.

## The `api` folder on the main domain

`api` at the site root is a link to the Laravel public folder. `public/.htaccess` rule 00 says `^(api|storage|admin)(/|$)` is left exactly as it is: no
redirect, no rewrite, no shell. So `https://anaizanest.com/api/...` is answered by Laravel itself (its own `.htaccess` applies in that folder), the same
application and database as https://api.anaizanest.com/api/..., just under another host name. The shop does not use it: the build calls
`https://api.anaizanest.com/api` (allowed by the API's CORS list, which must contain `https://anaizanest.com`; `php artisan golive:check` tests it).
Two things follow: the API answers on both hosts, and `robots.txt` disallows `/api/` and `/admin/` on the main domain so crawlers do not wander in.
Everything that is not one of those three folders and not a file goes through the shop's rules (clean URLs, the old-site redirects, the client shells).

## HTTPS and www

Before this build `.htaccess` had no https or www rule (only the clean-URL and trailing-slash ones). Rule 00b now sends http to https and
www.anaizanest.com to anaizanest.com, once, and not again behind a host that ends https in front (it reads `X-Forwarded-Proto`). If the hosting
panel already forces https, nothing changes; if the site ever loops, remove the two rules of 00b and tell the developer. The trailing-slash rule
(3) is unchanged: `/shop/` serves `shop.html`.

## Old addresses

See `docs/redirect-map.md` (regenerate with `node --no-warnings scripts/redirect-table.ts` after a build).
