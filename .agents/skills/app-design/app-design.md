---
name: app-design
description: >-
  Visual design for the Hebrew phishing analyzer and summarize app (Next.js,
  RTL). Use when the user asks about colors, layout, UI, styling, typography,
  spacing, components, pages, or anything visible to end users—not prompts or
  API logic. Enforces restrained, trustworthy UI; removes decorative clutter
  even if it exists in the repo today.
---

# App design (visual only)

This skill applies **only** to how the product looks. Do not use it for prompts, webhooks, billing, or backend behavior.

**Anchor:** This repository is the sole design reference. Read `src/app/globals.css`, `src/app/page.tsx`, and `src/app/summarize/page.tsx` before proposing visual changes. You may **polish** and **remove** irrelevant decoration that already exists (emojis on cards, per-card rainbow accents, heavy glow, mesh backgrounds, shimmer, floating orbits, marketing filler).

## Philosophy

- **Crafted, not empty** — clear structure, headers, tool area, results; never a bare white page.
- **Restrained, not flashy** — no “AI SaaS demo” or startup template aesthetics.
- **Trustworthy** — calm, serious tone suited to phishing/safety tools; clarity over spectacle.
- **Purposeful** — every visual element must help the user paste text and read four result sections. If it does not, remove or simplify it.

## Layout

- One primary task per screen (analyze or summarize); secondary nav is minimal.
- Obvious hierarchy: header → input → action → results (four cards).
- Generous whitespace; avoid cramming widgets, badges, or feature grids.
- RTL-first (`dir="rtl"`); logical spacing for Hebrew readers.
- Do not add decorative sections (hero feature grids, testimonial blocks, icon rows) unless the user explicitly asks.

## Color

- Default palette: **dark base + green accent** (see [reference.md](reference.md) tokens in `globals.css`).
- **One accent family** per screen; avoid orange/amber/purple per-card color coding unless the user requests it.
- Muted surfaces (`--card`, `--border`); accent for primary actions and focus only.
- You may adjust greens or neutrals if the result stays cohesive and calm—not rainbow or high-saturation multi-accent layouts.

## Typography

- Font: **Heebo** via `--font-sans` (already wired in theme).
- **Hebrew recommended** for all user-visible copy; English is allowed when appropriate (error codes, technical labels the user already uses).
- No gradient text headlines, no oversized marketing H1s, no ALL-CAPS slogans.
- Body text: readable size, comfortable line height; avoid wall-of-text in cards.

## Motion

- Allowed: short fade/slide on reveal (existing `fade-in`, `slide-up`, stagger).
- Avoid adding: shimmer loaders, pulsing glows, floating orbits, gradient-shifting buttons, scale-bounce hovers unless the user asks.
- Prefer a static or subtly animated progress indicator over skeleton + glow combos.

## Components (reuse, do not fork)

- Extend existing utilities: `glass-dark`, `btn-primary`, `btn-ghost`, `card-hover`, `nav-blur`, CSS variables in `:root`.
- Primary button: solid or simple green; **no** glowing hover halos or aggressive `scale(1.03)` unless simplifying existing CSS.
- Result cards: shared card style (one border/background treatment); use typography and titles to differentiate sections—not emoji + unique gradient per card.
- Icons: prefer none, simple Unicode sparingly, or minimal SVG—**no emoji** in production UI unless the user overrides.
- Textareas: clear border and focus ring; avoid heavy outer glow on focus.

## Hard bans (default AI / template tells)

Do **not** introduce or restore:

- Background mesh stacks, multi-layer radial “aurora” fills, or purple/violet/teal rainbow accents
- Glowing buttons, neon box-shadows, `animate-glow` / `shimmer-bg` on static content
- Emoji as section icons or decorative chrome
- Stock AI/marketing phrases (e.g. seamless, cutting-edge, powered by AI, revolutionize, game-changer, unlock, supercharge)
- Generic three-column “features” with icon circles
- Illustration packs, 3D blobs, glassmorphism for its own sake
- Light-mode “blank canvas” redesigns unless requested
- Competing design systems (new color tokens file, shadcn theme swap) without user approval

## Hebrew / RTL

- Set `dir="rtl"` on page roots; mirror padding and alignment for RTL.
- Keep nav links and primary actions in predictable places (header ends, not scattered).
- Numbers and URLs may stay LTR inside Hebrew paragraphs (`dir="ltr"` on snippets if needed).

## Scope

Applies to anything **visible**: pages, shared layout, `globals.css`, components, auth screens if re-added, email HTML in repo, error/toast copy styling—not `*-prompt.ts` or API routes unless the user asks for wording inside a visible error string.

## Workflow for agents

1. Read anchor files (`globals.css`, target page).
2. List what violates this skill in the current UI (decoration without function).
3. Propose a **minimal diff**: remove clutter first, then small polish.
4. Keep `/` and `/summarize` visually consistent (same header, card pattern, button styles).
5. After changes, sanity-check: still not a blank page; still not a flashy landing page.

## Additional reference

- Token table and class inventory: [reference.md](reference.md)
