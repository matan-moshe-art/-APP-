# מנתח הודעות רשמיות (Hebrew Official Message Analyzer), V2

Single-page Hebrew RTL app: paste an official message, get four fixed sections (meaning, urgency, actions, suspicious signals).

Includes Supabase magic-link auth and a non-Stripe billing foundation (Lemon Squeezy by default) with checkout, webhook sync, and subscription gating hooks.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `OPENAI_API_KEY` in `.env` if you want an inline AI response.

3. Optional: set `ANALYZE_WEBHOOK_URL` in `.env` to forward requests to your webhook endpoint (e.g. n8n production URL). The app calls the webhook with HTTP `POST` and JSON body; it also mirrors fields on the query string. If the webhook requires Header Auth (n8n Webhook node → Authentication: Header Auth), set `ANALYZE_WEBHOOK_AUTH_HEADER_NAME` and `ANALYZE_WEBHOOK_AUTH_HEADER_VALUE`.

4. Set Postgres `DATABASE_URL` and `DIRECT_URL` (see `.env.example`) — typically Supabase Session Pooler strings — to enable Prisma and analysis logging.

5. Optional billing setup (non-Stripe, Lemon Squeezy):
   - `BILLING_PROVIDER=lemonsqueezy`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`
   - Optional `LEMONSQUEEZY_CUSTOMER_PORTAL_URL` for self-service management
   - `/api/analyze` requires an active subscription by default
   - Optional `BILLING_ZERO_PRICE_TEST_MODE=true` (default) to activate a local 0-shekel test subscription from `/billing`

6. Install and migrate:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

### Billing endpoints

- `POST /api/billing/checkout`: creates provider checkout session URL.
- `POST /api/billing/portal`: returns customer portal URL (if configured).
- `POST /api/billing/webhook`: webhook receiver (signature-verified).
- `GET /api/billing/subscription`: returns current user entitlement state.
- `/billing`: authenticated customer billing page.

## Build

```bash
npm run build
npm start
```

`npm run build` runs `prisma generate` first.

## Deploy (Vercel)

1. Push the repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Add **Environment Variables**:
   - `OPENAI_API_KEY` (required)
   - Optional: `ANALYZE_WEBHOOK_URL` (+ optional `ANALYZE_WEBHOOK_AUTH_HEADER_NAME` / `ANALYZE_WEBHOOK_AUTH_HEADER_VALUE` for Header Auth)
   - Optional: `OPENAI_MODEL` (default `gpt-4o-mini`)
   - Optional: For request logging, set `DATABASE_URL` (pooler) and `DIRECT_URL` (Prisma migrations) from your Supabase (or other Postgres) dashboard. Without them, analyses are not stored (the API still works).

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS v4
- OpenAI Chat Completions (JSON mode)
- Prisma + PostgreSQL (Supabase recommended): pooler URL for runtime, `directUrl` for migrations

## Disclaimer

This tool does not provide legal advice; it aims for clarity only.
