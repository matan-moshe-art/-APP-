<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Memory Protocol

- Before doing substantive work on any user request in this workspace, read `AI_MEMORY.md`.
- Treat `AI_MEMORY.md` as the durable shared memory for this workspace across agent turns.
- Update `AI_MEMORY.md` when the user shares lasting preferences, constraints, decisions, notable requests, or when you produce user-visible outputs that should be remembered later.
- Never store secrets, tokens, passwords, or private keys in `AI_MEMORY.md`.
- After updating `AI_MEMORY.md`, tell the user `Memory updated: <timestamp>` using the same timestamp written into the file.
- If `AI_MEMORY.md` does not exist, create it before continuing.
