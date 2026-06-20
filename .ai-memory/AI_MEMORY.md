# AI Memory

Last updated: 2026-06-20 12:00:00 +03:00

This file is the project memory.

---

# Fast Context Snapshot

## Project

Project name:

* Hebrew message analyzer (hebrew-analyzer)

Project purpose:

* Single-page Hebrew RTL app: summarize or phishing check on short/long/PDF input. Localhost-only; optional Cursor webhooks, OpenAI fallback, Postgres logging.

Important:

* Cross-platform Docker: `docker compose up --build` → http://localhost:3000 (no `.env.local` required for UI).

## Current Stage

Current stage:

* App + Docker localhost setup complete; reference from matan-moshe-art/-APP- @ 90fde6f.

---

# Important Decisions

```text
- 2026-06-20 12:00 +03:00: Docker Compose uses optional env_file (.env.local, required: false) and overrides POSTGRES_URL to postgres service hostname.
```

---

# Meaningful Work Log

- 2026-06-20 12:00 +03:00: [SETUP] Added cross-platform Docker localhost setup (Dockerfile, docker-compose.yml, .dockerignore, next.config standalone) and README Docker section with Windows/macOS/Linux commands.
  Files changed:
  - Dockerfile
  - docker-compose.yml
  - .dockerignore
  - next.config.ts
  - README.md
  - (full Next.js app from reference)
  Verification:
  - docker compose build -> PASS
  - curl http://localhost:3000 -> 200
  Notes:
  - Postgres host port 5432 may conflict if local Postgres is running; stop other containers or free the port.

---

# Latest Verification

- 2026-06-20 12:00 +03:00: docker compose build -> PASS
- 2026-06-20 12:00 +03:00: curl http://localhost:3000 -> PASS (200)

---

# Do Not Store

Never store:

* passwords
* tokens
* API keys
* private keys
* full database URLs
* real private company data
* raw customer/user data
* long transcripts
* huge logs
* temporary thoughts
* outdated failed plans unless they prevent a future mistake

# Write All Meaningful Changes Here
