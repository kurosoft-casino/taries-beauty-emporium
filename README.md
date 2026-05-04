# Taries Beauty Emporium

Luxury hair and beauty e-commerce site built with Next.js 16, Tailwind CSS, and Framer Motion.

**Live site:** <https://www.tariesbeauty.com>  
**Also available at:** <http://tariesbeauty.com> (until apex SSL is fully provisioned)

> This repository is deployed with GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Environment

Create `.env.local` (frontend):

```bash
NEXT_PUBLIC_API_URL=https://taries-beauty-api.kurosoft01.workers.dev
NEXT_PUBLIC_SITE_URL=https://www.tariesbeauty.com
```

Set Worker secrets (server-side only, never commit these):

```bash
cd api
wrangler secret put FLW_SECRET_KEY
wrangler secret put FLW_WEBHOOK_HASH
```

Optional (if your callback domain differs):

```bash
wrangler secret put PUBLIC_SITE_URL
```

## Monorepo surfaces

The standalone repo now contains:

- `app/` (main Next.js storefront/admin)
- `api/` (Cloudflare Worker API)
- `android-app/` (Capacitor Android wrapper)
- `desktop-app/` (Electron desktop wrapper)

Root TypeScript checks intentionally exclude `api/`, `android-app/`, and `desktop-app/` so `npm run build` validates the Next.js app without requiring each subproject dependency set.

## Static export for GitHub Pages

The workflow temporarily moves `app/api` out of the app tree before static export.

```bash
tmp=.pages-temp-api
rm -rf "$tmp"
if [ -d app/api ]; then mv app/api "$tmp"; fi
npm run build:static
status=$?
if [ -d "$tmp" ]; then mv "$tmp" app/api; fi
exit $status
```

## Flutterwave payments (live)

The checkout now uses server-side Flutterwave Standard initialization:

- Frontend creates order in API (`POST /orders`)
- API initializes hosted checkout (`POST /payments/flutterwave/initialize`)
- Flutterwave redirects to `/checkout/complete`
- API verifies transaction (`GET /payments/flutterwave/verify`)
- Webhook fallback endpoint: `POST /payments/flutterwave/webhook`

Configure Flutterwave dashboard:

1. Webhook URL: `https://taries-beauty-api.kurosoft01.workers.dev/payments/flutterwave/webhook`
2. Secret hash: same value as `FLW_WEBHOOK_HASH`
3. Enable needed payment channels (card, bank transfer, mobile money)

Important: if any secret key was exposed publicly, rotate it in Flutterwave immediately and update Worker secrets.

## Domain and SSL (GitHub Pages)

GitHub Pages custom domain is set to `www.tariesbeauty.com`.

Required DNS records for apex + www:

- `A` for `tariesbeauty.com` -> `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `AAAA` for `tariesbeauty.com` -> `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` (or remove incorrect AAAA records)
- `CNAME` for `www` -> `kurosoft1.github.io`

After DNS is correct, GitHub Pages will issue/refresh the HTTPS certificate for the apex domain.

## Git commit identity (recommended)

To keep commit attribution clean on GitHub, use your GitHub noreply email in this repo:

```bash
git config user.name "Tabuku Kuro"
git config user.email "40246382+Kurosoft1@users.noreply.github.com"
```
