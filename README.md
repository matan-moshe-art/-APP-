# מזהה פישינג בעברית (Hebrew Phishing Analyzer)

Single-page Hebrew RTL app: paste a suspicious message, get four fixed sections (meaning, urgency, actions, suspicious signals).

Includes a second tool at `/summarize` for breaking down complex messages (topic, urgency, actions, recommendations).

**Localhost only** — no login or billing. Uses Cursor automation webhooks, optional OpenAI fallback, and optional Postgres logging for AI training datasets.

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set Cursor webhook URL + auth per feature and input length (see `.env.example`):
   - `ANALYZE_WEBHOOK_*_SHORT` / `ANALYZE_WEBHOOK_*_LONG` for phishing analysis
   - `SUMMARIZE_WEBHOOK_*_SHORT` / `SUMMARIZE_WEBHOOK_*_LONG` for summarize

3. Optional: set `POSTGRES_URL` and run the migration to persist user messages and AI responses:

   ```bash
   psql "$POSTGRES_URL" -f db/migrations/001_ai_interactions.sql
   ```

   Every analyze/summarize request is logged to the `ai_interactions` table (user message + AI response + status). If Postgres is unavailable, the app still works — logging failures are non-fatal.

4. In [cursor.com/automations](https://cursor.com/automations), configure the **phishing** automation like the **summarize** one: webhook trigger only, **no** git/repo tools, instructions that return JSON only (no file edits). See [docs/cursor-automation-analyze.md](docs/cursor-automation-analyze.md).

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
npm start
```

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS v4
- Cursor automation webhooks + optional OpenAI Chat Completions (JSON mode)
- Optional Postgres (`pg`) for `ai_interactions` training logs

## Disclaimer

This tool does not provide legal advice; it aims for clarity only.
