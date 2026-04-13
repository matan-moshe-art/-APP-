# מנתח הודעות רשמיות (Hebrew Official Message Analyzer) — V1

Single-page Hebrew RTL app: paste an official message, get four fixed sections (meaning, urgency, actions, suspicious signals).

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `OPENAI_API_KEY` in `.env`.

3. Optional: set `DATABASE_URL` (default `file:./dev.db`) to log each successful analysis. If unset, the app runs without persistence.

4. Install and migrate:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

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
   - Optional: `OPENAI_MODEL` (default `gpt-4o-mini`)
   - Optional: For request logging, use a hosted database (e.g. [Vercel Postgres](https://vercel.com/storage/postgres)) and set `DATABASE_URL` to the Postgres connection string. Without it, analyses are not stored (the API still works).

SQLite files are not persisted across Vercel serverless invocations; use Postgres (or similar) for production logging.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS v4
- OpenAI Chat Completions (JSON mode)
- Prisma + SQLite (optional local logging)

## Disclaimer

This tool does not provide legal advice; it aims for clarity only.
