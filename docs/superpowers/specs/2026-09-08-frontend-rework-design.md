# NASA Landsat (Earth Insights) Frontend Rework — Design Spec

## Purpose

The current frontend works functionally but reads as visually inconsistent and generic: a stray saturated-green theme, a dark-glass auth flow disconnected from the rest of the light-themed app, and a landing page built from the same template shape every AI-generated SaaS site uses (blurred glow orbs, icon-in-rounded-box feature grid, generic "Why us" checklist, generic "Ready to get started?" CTA). This spec reworks the visual system and page composition across the app while preserving existing routes, data flow, and business logic except where explicitly noted (admin settings persistence).

The existing frontend is used only as a structural reference (component boundaries, existing routes, existing data-fetching patterns) — this is not a 1:1 restyle, pages are recomposed where the current layout is the generic pattern being explicitly avoided.

## Non-Goals

- No migration off Leaflet/Recharts/shadcn — these are kept.
- No backend rework beyond the admin settings persistence explicitly requested.
- No new animation library (no framer-motion) — CSS/Tailwind transitions and the already-installed `tailwindcss-animate` are sufficient.
- No restructuring of `/crop-advisor` and `/predict` into standalone pages — confirmed to stay consolidated as dashboard tabs.
- No per-script font bundling for the 13 supported locales — non-Latin scripts fall back to `system-ui`.

## Global Constraints

- **Anti-generic-AI-UI rule (hard constraint, applies to every task below):** no purple/violet gradient hero backgrounds, no blurred mesh/blob gradient orbs used as decoration, no glassmorphism applied indiscriminately, no uniform rounded-2xl-plus-soft-shadow treatment on every single card, no gradient text headlines, no generic centered icon-in-circle + heading + one-line-description grids repeated 3-4x, no decorative stock-style illustrations. Every visual choice must be grounded in real product content (actual map/satellite imagery, actual metrics, actual data shapes) or a deliberate, non-default layout decision — not filler.
- Every page must support both light and dark themes via the shared CSS variable tokens (`--background`, `--primary`, etc. in `src/app/globals.css`) — no page-local hardcoded dark/light overrides (this removes the current login/register `bg-slate-950` hardcoding).
- Land-cover / classification data colors (`CLASS_COLORS` in `gis-dashboard.tsx`, chart series colors that encode data meaning) are colors, not theme — never replaced with brand tokens, always kept as their own named, commented constant.
- Existing routes, URL structure, and API contracts stay the same except: `src/app/crop-advisor/page.tsx` and `src/app/predict/page.tsx` (dead redirect stubs) and any component that becomes unreferenced as a result are deleted; a new `src/app/api/admin/settings/route.ts` and `system_settings` table are added.
- Existing Playwright (`e2e/dashboard.spec.ts`) and Vitest suites must still pass after each page's rework; if a test asserts on markup/copy that changes, the test is updated to match the new (still-correct) behavior, never weakened to pass.
- WCAG contrast minimum 4.5:1 for text in both themes; visible focus states preserved on every interactive element.

---

## 1. Design Tokens (`src/app/globals.css`, `tailwind.config.ts`)

Replace the `:root` and `.dark` HSL variable blocks with a neutral, data-dashboard palette (same variable names, so every component using `bg-primary`, `text-muted-foreground`, etc. needs no code change):

**Light:**
| Token | HSL | Hex equiv |
|---|---|---|
| `--background` | `210 40% 98%` | `#F8FAFC` |
| `--foreground` | `222 47% 11%` | `#1E293B` |
| `--card` | `0 0% 100%` | `#FFFFFF` |
| `--primary` | `224 76% 40%` | `#1E40AF` |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` |
| `--secondary` / `--muted` | `214 32% 91%` | `#E2E8F0`-ish |
| `--muted-foreground` | `215 16% 47%` | `#64748B` |
| `--accent` | `32 95% 44%` | `#D97706` |
| `--accent-foreground` | `0 0% 0%` | `#000000` |
| `--destructive` | `0 84% 60%` | `#DC2626`-ish |
| `--border` / `--input` | `214 32% 88%` | `#DBEAFE`-ish |
| `--ring` | same as `--primary` | |
| `--radius` | `0.5rem` (unchanged) | |

**Dark:**
| Token | HSL | Hex equiv |
|---|---|---|
| `--background` | `222 47% 7%` | `#0B1220` |
| `--foreground` | `210 40% 96%` | `#F1F5F9` |
| `--card` | `222 40% 10%` | `#111A2E` |
| `--primary` | `217 91% 60%` | `#3B82F6` |
| `--primary-foreground` | `222 47% 7%` | `#0B1220` |
| `--secondary` / `--muted` | `217 33% 17%` | `#1E293B`-ish |
| `--muted-foreground` | `215 20% 65%` | `#94A3B8` |
| `--accent` | `32 95% 55%` | `#F59E0B`-ish |
| `--accent-foreground` | `222 47% 7%` | |
| `--destructive` | `0 63% 40%` | |
| `--border` / `--input` | `217 33% 20%` | |
| `--ring` | same as `--primary` | |

Update `tailwind.config.ts` only if it hardcodes any color value outside these CSS vars (verify during implementation; do not add new color scales speculatively).

## 2. Typography

Add Inter (variable, via `next/font/google`) as the sans body/heading font and JetBrains Mono as a `font-mono` utility for numeric readouts. Wire both through `src/app/layout.tsx` using `next/font` (not a CSS `@import`, to get self-hosted optimization) and reference them in `tailwind.config.ts` `fontFamily.sans` / `fontFamily.mono`. Apply `font-mono` specifically to: metric values in `summary-cards.tsx`, numeric cells in `metrics-table.tsx`, stat numbers in `admin/page.tsx` and `admin/analytics/page.tsx`. Everything else stays `font-sans`.

## 3. Landing Page (`src/app/page.tsx`)

Replace the generic template sections with a structure grounded in the actual product:

- **Hero:** two-column, asymmetric (not centered-stack). Left: headline + subtitle + CTA buttons (existing i18n keys reused). Right: a real static preview — an actual screenshot-style composition of the dashboard's map + metrics panel (can be a styled, non-interactive mock built from the same `Card`/map-tile visual language used in `gis-dashboard.tsx`, not a stock illustration or abstract gradient blob). Remove the blurred `rounded-full bg-primary/20 blur-[100px]` orb and the grid-dot background.
- **Features section:** replace the 4x-duplicated centered icon-card grid with a data array (`FEATURES: {icon, titleKey, descKey}[]`) mapped to one `<FeatureRow>` component laid out as an alternating left/right row (image/visual + text), not a uniform centered grid — avoids the generic 3-4 column icon-card pattern while cutting the JSX duplication.
- **"Why us" section:** keep the checklist content (real, specific claims) but drop the generic floating stat tiles ("50+ Satellites / 99% Uptime / Global") since these are unverifiable placeholder-style stats that read as filler — replace with the same checklist point styling but no invented numbers, or actual sourced numbers if the user supplies them (flag as a question during implementation if this section is reached and no real numbers exist).
- **CTA section:** keep, drop generic "Ready to get started?" copy for something specific to the product (e.g. referencing actual dashboard capability), reusing existing i18n pattern.

## 4. Auth Pages (`src/app/login/page.tsx`, `src/app/register/page.tsx`)

Rebuild the glass-card visual using theme tokens (`bg-card/80 backdrop-blur border-border`) instead of the hardcoded `bg-slate-950`, so it adapts to light/dark. Keep `TiltCard`. This one glass treatment on the auth card is intentional and scoped — not extended to other pages (avoids "glassmorphism everywhere").

## 5. Dashboard (`src/components/dashboard.tsx` and children)

Apply new tokens throughout; no structural/behavioral change to tabs, state, or data flow. Specific cleanups:
- `gis-dashboard.tsx`: extract `CLASS_COLORS` into a named, commented constant (`LAND_COVER_CLASS_COLORS`) documenting it's data-semantic, not theme; restyle surrounding chrome (buttons, legend, compare slider track) onto tokens.
- Remove now-fully-dead `src/app/crop-advisor/page.tsx`, `src/app/predict/page.tsx`; if `crop-advisor-content.tsx`/`predict-content.tsx` become unreferenced after this, delete them too (confirm no other import site first).

## 6. Admin Panel

Restyle sidebar, tables, stat cards, and recharts color config (`ui/chart.tsx` consumers in `admin/page.tsx`, `admin/analytics/page.tsx`) onto the new tokens.

### Admin Settings — real persistence

New migration `supabase/migrations/0007_system_settings.sql`:

```sql
create table system_settings (
  id int primary key default 1 check (id = 1),
  maintenance_mode boolean not null default false,
  maintenance_message text not null default '',
  notify_new_registrations boolean not null default true,
  notify_weekly_report boolean not null default true,
  notify_critical_errors boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into system_settings (id) values (1);
```

New `src/app/api/admin/settings/route.ts`:
- `GET`: `requireAdmin()` guard (same pattern as `api/admin/stats/route.ts`), `select('*').eq('id', 1).single()`, return the row.
- `PUT`: `requireAdmin()` guard, validate body with a zod schema (matches table columns), `update(...).eq('id', 1)`, set `updated_at`, return updated row.

`src/app/admin/settings/page.tsx` becomes a client component that fetches on mount, holds controlled `Switch`/`Input` state, calls `PUT` on Save, shows a real success/error toast (remove the "mock" toast copy).

**Maintenance mode enforcement:** `src/middleware.ts` currently only matches specific protected/auth paths (`PROTECTED_PREFIXES`, `AUTH_PAGES` — see its `config.matcher`), and the landing page `/` is intentionally not matched at all. Two concrete changes here:
1. Remove `/predict` and `/crop-advisor` from `PROTECTED_PREFIXES` and from `config.matcher`, since those routes are being deleted (§5).
2. Add a `maintenance_mode` check: call `getSupabase()` (from `src/lib/supabase.ts`, already a fetch-based client so it works in the edge middleware runtime) to read the single `system_settings` row, cached per-request only (no cross-request caching — simplicity over a premature optimization). If `maintenance_mode` is true and `session?.role !== 'admin'`, redirect to a new `src/app/maintenance/page.tsx`. Because true "site-wide" maintenance must also cover the currently-unmatched landing page, add `'/'` (exact, not `/:path*`, so nested static assets aren't touched) and `'/maintenance'` itself (to avoid a redirect loop) to `config.matcher`. `/api/*` and `/admin/*` stay reachable so admins can flip the flag back off and existing API behavior is unaffected.

## 7. Component Cleanup

Replace static inline `style={{}}` usage with Tailwind classes/CSS custom properties in `tilt-card.tsx` (keep only the dynamically-computed transform inline), `boundary-map.tsx`, `chart.tsx`, `dialog.tsx`, `progress.tsx`, `sheet.tsx` — audit each during implementation; only change what's genuinely static.

## Testing

- Run `npm run test` (vitest) and `npx playwright test e2e/dashboard.spec.ts` after the dashboard/GIS changes.
- After admin settings changes, add a focused test (vitest or a new Playwright case) covering: GET returns defaults, PUT persists and is reflected on reload, non-admin GET/PUT is rejected (mirroring how `requireAdmin` is already tested elsewhere, if it is — check `src/test` during implementation).
- Manual pass per page: toggle light/dark, confirm no leftover hardcoded-dark or hardcoded-green artifacts, confirm focus states visible, confirm no console errors.

## Open Question for Implementation Time

The "Why us" stat tiles (50+/99%/Global) are being dropped as unverifiable filler unless real numbers exist — implementer should ask the user for real numbers before deciding whether to keep a numeric-stats element at all.
