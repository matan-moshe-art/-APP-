# AI Memory

Last updated: 2026-04-13 12:15:00 +03:00

## Durable Preferences

- Read this file at the start of every task in this workspace.
- Update this file when the user shares lasting preferences, constraints, decisions, or wants important outputs preserved.
- After updating this file, explicitly tell the user `Memory updated: <timestamp>`.
- Do not store secrets, tokens, passwords, or private keys here.

## Durable Context

- 2026-04-13 08:26:53 +03:00: The user wants a persistent shared memory for Cursor agents in this workspace.
- 2026-04-13 08:26:53 +03:00: `AGENTS.md` and `.cursor/rules/agent-memory.mdc` were configured so agents are instructed to always read and maintain this file.
- 2026-04-13 08:27:44 +03:00: The memory file was expanded to track recent user requests and recent agent outputs explicitly.

## Recent Requests

- 2026-04-13 12:15:00 +03:00: Tag the current work as v2 (between v1 and v2) and push to https://github.com/matan-moshe-art/-APP-.
- 2026-04-13 08:26:53 +03:00: Create a setup so all Cursor agents in this workspace always read shared memory and can update it with a visible timestamp.
- 2026-04-13: Make the website look top-tier with animations and better colors to build user trust.
- 2026-04-13 09:10:00 +03:00: Add full webhook round-trip: N8N callback endpoint, frontend polling, friendly Hebrew waiting UI (no dev jargon for users).

## Recent Outputs

- 2026-04-13 08:26:53 +03:00: Added a persistent memory protocol in `AGENTS.md`, an always-applied Cursor rule, and this shared memory file.
- 2026-04-13 08:27:44 +03:00: Refined the setup so future agents are explicitly told to preserve notable requests and outputs.
- 2026-04-13 09:10:00 +03:00: Implemented webhook response round-trip: `src/lib/pending-store.ts` (in-memory correlationId->result store), `/api/analyze/callback` (N8N POSTs results back), `/api/analyze/status/[id]` (frontend polls), updated `/api/analyze` to pass callbackUrl to N8N and register pending, updated `page.tsx` with polling + chill Hebrew waiting UI.
- 2026-04-13: Major visual/animation upgrade — added CSS keyframe animations (fade-in, slide-up, slide-down, scale-in, float, shimmer, glow-pulse), glassmorphism, gradient mesh background, gradient CTA button, staggered card entrances, hover lift effects, trust footer, icons per section, gradient text header. All pure CSS/Tailwind, no extra deps.
- 2026-04-13 11:45:00 +03:00: Fixed n8n webhook round-trip: `sendToWebhook()` was ignoring the response body from n8n's "Respond to Webhook" node. Now reads and parses the inline response, stores it via `completeAnalysis()`, and returns results directly to the frontend instead of falling through to the (never-completing) polling flow.
- 2026-04-13 12:15:00 +03:00: Pushed v2 to GitHub `matan-moshe-art/-APP-` on `master` (commit 2c00750): webhook callback/status routes, `pending-store`, UI/CSS updates, README V2, `AI_MEMORY.md` + `.cursor/rules/agent-memory.mdc`.

## Update Protocol

- Keep updates concise and factual.
- Prefer durable summaries over full transcripts.
- Record notable user requests and concise summaries of major outputs that future agents should remember.
