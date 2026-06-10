# הבנת הודעות ובדיקת הונאה

Single-page Hebrew RTL app at `/`: choose **summarize** or **phishing check**, then **short**, **long**, or **PDF** input. Results are four structured Hebrew sections.

`/summarize` redirects to `/` (legacy bookmark support).

**Localhost only** — no login or billing. Uses Cursor automation webhooks (async: trigger + poll Cloud Agents API), optional OpenAI fallback for analyze, and optional Postgres logging for AI training.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set Cursor webhook URL + auth per feature and input length (see `.env.example`):
   - `ANALYZE_WEBHOOK_URL_SHORT` / `ANALYZE_WEBHOOK_AUTH_TOKEN_SHORT` (and `_LONG`) for phishing
   - `SUMMARIZE_WEBHOOK_URL_SHORT` / `SUMMARIZE_WEBHOOK_AUTH_TOKEN_SHORT` (and `_LONG`) for summarize
   - Optional shared fallback: `CURSOR_WEBHOOK_AUTH_TOKEN` if per-route tokens are unset

3. Optional: set `POSTGRES_URL` and run the migration:

   ```bash
   psql "$POSTGRES_URL" -f db/migrations/001_ai_interactions.sql
   ```

   Every analyze/summarize request is logged to `ai_interactions` (user message + AI response + status). Logging is non-fatal if Postgres is down. View rows in pgAdmin only (no in-app viewer).

4. In [cursor.com/automations](https://cursor.com/automations), configure automations to return JSON only (no file edits). See [docs/cursor-automation-analyze.md](docs/cursor-automation-analyze.md).

5. Optional: set `OPENAI_API_KEY` for analyze fallback when the webhook returns unusable output.

6. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run lint
npm start
```

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- Cursor automation webhooks + Cloud Agents API polling
- Optional OpenAI Chat Completions (JSON mode) for analyze fallback
- Optional Postgres (`pg`) for `ai_interactions` training logs
- PDF text extraction via `pdf-parse` (`POST /api/pdf-text`)

## Project layout (key paths)

| Path | Role |
|------|------|
| `src/components/AnalysisApp.tsx` | Home UI composer |
| `src/hooks/useAnalysisFlow.ts` | Client state + API calls |
| `src/app/api/analyze/route.ts` | Phishing analyze API |
| `src/app/api/summarize/route.ts` | Summarize API |
| `src/lib/cursor-webhook-auth.ts` | Webhook trigger + poll |
| `src/lib/cursor-webhook-routing.ts` | Env-based webhook resolution |
| `src/lib/analyze-prompt-short.ts` / `-long.ts` | Analyze prompts |
| `src/lib/summarize-prompt-short.ts` / `-long.ts` | Summarize prompts |

## Disclaimer

This tool does not provide legal advice; it aims for clarity only.
