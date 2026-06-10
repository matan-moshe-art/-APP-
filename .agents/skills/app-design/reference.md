# Design tokens and classes (anchor app)

Source of truth: `src/app/globals.css`. Prefer editing variables and shared classes over one-off Tailwind in pages.

## CSS variables (`:root`)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | `#050a08` | Page base |
| `--foreground` | `#f4f4f5` | Primary text |
| `--muted` | `#9ca3af` | Secondary text |
| `--accent` | `#16a34a` | Primary accent |
| `--accent-glow` | green rgba | **Prefer removing** from hovers per design skill |
| `--accent-soft` | green rgba | Focus rings, subtle highlights |
| `--teal` | `#22c55e` | Secondary green highlight |
| `--card` | dark green glass | Card backgrounds |
| `--border` | slate low alpha | Borders |

## Shared classes

| Class | Role | Design-skill note |
|-------|------|-------------------|
| `.bg-mesh-dark` | Layered radial page background | Simplify to flat `--background` or single subtle radial |
| `.glass-dark` / `.glass-dark-strong` | Cards, panels | Keep; reduce blur/saturation if heavy |
| `.btn-primary` | Main CTA | Remove gradient shift + glow hover |
| `.btn-ghost` | Secondary actions | Keep subtle |
| `.card-hover` | Lift on hover | Optional: reduce translateY / shadow |
| `.nav-blur` | Header | Keep |
| `.shimmer-bg` | Loading skeleton | Replace with flat muted bar |
| `.preview-orbit` | Float animation | Remove unless needed |
| `.stagger-*` | Card entrance delay | Keep |

## Pages to keep aligned

- `src/app/page.tsx` — phishing analyze (`/`)
- `src/app/summarize/page.tsx` — summarize (`/summarize`)

Both use `SECTIONS` with per-card colors and emoji `icon` fields—**candidates to unify** under the design skill.

## Tailwind patterns to avoid adding

- `from-purple-*`, `violet-*`, `fuchsia-*`
- `drop-shadow` glow on icons
- `animate-float`, `animate-glow`, `animate-shimmer` on non-loading UI
- Marketing-style `bg-gradient-to-r` on headings

## Acceptable polish examples

- Single green accent bar on the left of all four result cards
- Simple section title + body in `glass-dark` without emoji
- Flat `#050a08` body background with one soft green radial at top (optional)
- Progress bar: solid green fill, no shimmer
