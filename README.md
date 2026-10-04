# Taries Beauty Emporium

Luxury hair and beauty e-commerce site — Next.js (App Router), Tailwind CSS, and Framer Motion, with a self-hosted PocketBase backend.

**Live site:** <https://www.tariesbeauty.com>

## Stack

- **Storefront + admin:** Next.js running on Node (VPS, behind Caddy)
- **API:** Next.js route handlers — `app/api/[[...path]]/route.ts` → `lib/server/tariesApi.ts`
- **Data:** PocketBase on the VPS (`hub.kurosofthub.com`), collections prefixed `tbe_*`
- **Payments:** Flutterwave (server-side initialize/verify + webhook)
- **Email:** Resend (transactional; disabled when `RESEND_API_KEY` is unset)
- **Media:** stored in PocketBase (`tbe_media_assets`) and served via `/api/media/:id`

No Cloudflare, Firebase, Supabase or Fly.io services are used anywhere in this project.

## Development

```bash
npm install
cp .env.local.example .env.local   # fill in the values
npm run dev
```

## Environment

Server-side only (never expose to the browser):

| Variable | Purpose |
|---|---|
| `PB_URL` | PocketBase base URL (e.g. `https://hub.kurosofthub.com`) |
| `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` | Dedicated PocketBase service account |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `FLW_WEBHOOK_HASH` | Flutterwave webhook signature hash |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `ALLOWED_ORIGINS` | Comma-separated CORS allow-list for the API |
| `PUBLIC_SITE_URL` | Public site URL used for payment redirects |

Public:

- `NEXT_PUBLIC_API_BASE_URL=/api`
- `NEXT_PUBLIC_SITE_URL=https://www.tariesbeauty.com`

## PocketBase schema

Schema lives in `pb_migrations/*.js` and is applied by PocketBase itself
(pending migrations run on service start on the VPS). Local development talks
to the same instance unless `PB_URL` is overridden.

## Production

```bash
npm run build
npm run start        # Node server; put Caddy in front
```

## Sub-projects

- `android-app/` — Capacitor Android wrapper
- `desktop-app/` — Electron desktop wrapper

Root TypeScript checks intentionally exclude `android-app/` and `desktop-app/`
so `npm run build` validates the Next.js app without each subproject's
dependency set.

## Flutterwave payments

- Frontend creates the order (`POST /api/orders`)
- API initializes hosted checkout (`POST /api/payments/flutterwave/initialize`)
- Flutterwave redirects to `/checkout/complete`
- API verifies the transaction (`GET /api/payments/flutterwave/verify`)
- Webhook fallback: `POST /api/payments/flutterwave/webhook`

Configure the Flutterwave dashboard webhook URL to
`https://www.tariesbeauty.com/api/payments/flutterwave/webhook` and set
`FLW_WEBHOOK_HASH` accordingly. Rotate the secret key if it was ever exposed.

## Git commit identity (recommended)

To keep commit attribution clean on GitHub, use your GitHub noreply email in this repo:

```bash
git config user.name "Tabuku Kuro"
git config user.email "40246382+Kurosoft1@users.noreply.github.com"
```
