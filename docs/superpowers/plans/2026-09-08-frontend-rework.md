# Frontend Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's inconsistent, generic-looking visual system (stray green theme, hardcoded-dark auth pages, template-shaped landing page) with a coherent, distinctive, light/dark-adaptive design system, while cleaning up dead routes and making admin Settings actually persist.

**Architecture:** This is a token-and-composition rework, not a rewrite. The shadcn/Tailwind CSS-variable theming system already in place stays; we replace the variable values and rework specific pages' JSX composition (landing, auth, admin) without touching state management, data-fetching, or business logic, except for the one explicitly-scoped backend addition (admin settings persistence + maintenance-mode middleware check).

**Tech Stack:** Next.js 15 (App Router), React 18, Tailwind CSS 3.4 + `tailwindcss-animate`, shadcn/ui (Radix primitives), `next/font/google`, Leaflet/react-leaflet, Recharts, Supabase (`@supabase/supabase-js`), Zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-frontend-rework-design.md`

## Global Constraints

- **Anti-generic-AI-UI:** no purple/violet gradient hero backgrounds, no blurred mesh/blob gradient orbs, no glassmorphism applied indiscriminately, no uniform rounded-2xl-plus-soft-shadow on every card, no gradient text headlines, no generic centered icon-in-circle + heading + one-liner grids repeated 3-4x, no decorative stock-style illustrations. Ground every visual choice in real product content or a deliberate non-default layout.
- Every page supports both light and dark themes via the shared CSS variable tokens in `src/app/globals.css` — no page-local hardcoded dark/light overrides.
- Data-semantic colors (land-cover class colors, chart series that encode meaning like success/failure) are never replaced with brand tokens — kept as their own named, commented constants.
- `src/app/crop-advisor/page.tsx` and `src/app/predict/page.tsx` (dead redirect stubs) are deleted; `crop-advisor-content.tsx` and `predict-content.tsx` are **kept** (confirmed still used as tabs inside `src/components/dashboard.tsx:26-27,411-417`).
- Existing Playwright (`e2e/dashboard.spec.ts`) and Vitest suites (`src/test/*.test.ts`) must pass after each task; if a test asserts on markup/copy/routes that correctly changed, update the test to match — never weaken it to force a pass.
- WCAG contrast minimum 4.5:1 for text in both themes; visible focus states preserved on every interactive element.
- No new runtime dependency for animation (no framer-motion) — use Tailwind/`tailwindcss-animate` transitions already installed.

---

### Task 1: Design tokens

**Files:**
- Modify: `src/app/globals.css:6-67`

**Interfaces:**
- Produces: the same CSS custom property names (`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--radius`) with new HSL values — every later task relies on these names being unchanged so no component code needs edits.

- [ ] **Step 1: Replace the `:root` and `.dark` blocks**

Replace lines 6-67 of `src/app/globals.css` with:

```css
  :root {
    --background: 210 40% 98%;
    --foreground: 222 47% 11%;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 224 76% 40%;
    --primary-foreground: 0 0% 100%;

    --secondary: 214 32% 91%;
    --secondary-foreground: 222 47% 11%;

    --muted: 214 32% 91%;
    --muted-foreground: 215 16% 47%;

    --accent: 32 95% 44%;
    --accent-foreground: 0 0% 0%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 214 32% 88%;
    --input: 214 32% 88%;
    --ring: 224 76% 40%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 7%;
    --foreground: 210 40% 96%;

    --card: 222 40% 10%;
    --card-foreground: 210 40% 96%;

    --popover: 222 40% 10%;
    --popover-foreground: 210 40% 96%;

    --primary: 217 91% 60%;
    --primary-foreground: 222 47% 7%;

    --secondary: 217 33% 17%;
    --secondary-foreground: 210 40% 96%;

    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 65%;

    --accent: 32 95% 55%;
    --accent-foreground: 222 47% 7%;

    --destructive: 0 63% 40%;
    --destructive-foreground: 210 40% 96%;

    --border: 217 33% 20%;
    --input: 217 33% 20%;
    --ring: 217 91% 60%;
  }
```

- [ ] **Step 2: Run typecheck and lint (CSS variable renames can't break TS, but confirm nothing else references old values)**

Run: `npm run typecheck && npm run lint`
Expected: both pass with no errors (Tailwind config already reads these vars by name, not value, per `tailwind.config.ts:24-58`).

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, open `/`, toggle the theme switcher (`ThemeToggle` in header) between light/dark. Expected: background is neutral slate/navy (no green tint), primary buttons/links are blue, no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: replace theme tokens with slate/blue data-dashboard palette"
```

---

### Task 2: Typography — monospace for data readouts

**Files:**
- Modify: `src/app/layout.tsx:1-9`
- Modify: `tailwind.config.ts:21-23`
- Modify: `src/components/summary-cards.tsx`
- Modify: `src/components/metrics-table.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/analytics/page.tsx`

**Interfaces:**
- Produces: `font-mono` Tailwind utility mapped to JetBrains Mono, available to every component from this task onward.

`Inter` is already wired as the sans font (`src/app/layout.tsx:3,8`, `tailwind.config.ts:22`) — no change needed there.

- [ ] **Step 1: Add JetBrains Mono font loader**

In `src/app/layout.tsx`, add the import and font instance alongside the existing `Inter` one:

```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
```

```tsx
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
```

Update the `<body>` className to include the new variable:

```tsx
<body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

- [ ] **Step 2: Wire the Tailwind font family**

In `tailwind.config.ts`, change:

```ts
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
      },
```

to:

```ts
      fontFamily: {
        sans: ["var(--font-inter)", ...fontFamily.sans],
        mono: ["var(--font-jetbrains-mono)", ...fontFamily.mono],
      },
```

- [ ] **Step 3: Apply `font-mono` to numeric readouts**

Read `src/components/summary-cards.tsx` and `src/components/metrics-table.tsx`; add the `font-mono` class to the element(s) rendering the numeric metric value/cell (the actual number span/`<td>`, not the label). In `src/app/admin/page.tsx` and `src/app/admin/analytics/page.tsx`, add `font-mono` to the `<div className="text-2xl font-bold">{...}</div>` stat-number elements (e.g. `admin/analytics/page.tsx:53,63,73,83`).

- [ ] **Step 4: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed; `next build` confirms the new `next/font` loader resolves correctly.

- [ ] **Step 5: Manual visual check**

Open `/dashboard` and `/admin`, confirm metric numbers render in a monospace face and labels stay in Inter.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx tailwind.config.ts src/components/summary-cards.tsx src/components/metrics-table.tsx src/app/admin/page.tsx src/app/admin/analytics/page.tsx
git commit -m "style: add JetBrains Mono for numeric data readouts"
```

---

### Task 3: Remove dead routes and fix their references

**Files:**
- Delete: `src/app/crop-advisor/page.tsx`
- Delete: `src/app/predict/page.tsx`
- Modify: `src/middleware.ts:7,44-53`
- Modify: `e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/predict` and `/crop-advisor` are no longer app routes at all (404 for anyone); their functionality lives only as dashboard tabs (`src/components/dashboard.tsx:26-27,363-417`, unchanged, already confirmed as the live consumers of `PredictTabContent`/`CropAdvisorTabContent`).

- [ ] **Step 1: Delete the dead redirect pages**

```bash
git rm "src/app/crop-advisor/page.tsx" "src/app/predict/page.tsx"
```

- [ ] **Step 2: Remove the now-nonexistent routes from middleware**

In `src/middleware.ts`, change:

```ts
const PROTECTED_PREFIXES = ['/dashboard', '/predict', '/crop-advisor', '/settings', '/onboarding', '/admin'];
```

to:

```ts
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/onboarding', '/admin'];
```

and in `config.matcher`, remove the two matcher entries:

```ts
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
```

(the `/predict/:path*` and `/crop-advisor/:path*` lines are removed).

- [ ] **Step 3: Update the e2e test for the deleted routes**

In `e2e/dashboard.spec.ts`, remove the two tests that assert `/predict` and `/crop-advisor` redirect to login (they now 404 instead, which is correct — those URLs no longer exist). The file becomes:

```ts
import { expect, test } from '@playwright/test';

test('anonymous visit to dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
```

- [ ] **Step 4: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS (1 test).

- [ ] **Step 5: Manual check that the dashboard tabs still work**

Run `npm run dev`, log in, open `/dashboard`, click the "AI Predict" and "Crop Advisor" tabs — confirm their content still renders (nothing in this task touched `dashboard.tsx` itself).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "cleanup: remove dead /predict and /crop-advisor redirect routes"
```

---

### Task 4: Landing page rework

**Files:**
- Modify: `src/app/page.tsx` (full rewrite of the hero, features, why-us, and CTA sections)
- Create: `src/components/feature-row.tsx`

**Interfaces:**
- Produces: `FeatureRow` component — `{ icon: LucideIcon; title: string; description: string; align: "left" | "right"; children?: React.ReactNode }` — an alternating-side row (visual + text), reusable if a future page needs the same pattern.
- Consumes: existing `useLanguage()` hook and `t()` i18n keys already used by `page.tsx` today (`landing.hero.title`, `landing.hero.subtitle`, `landing.hero.getStarted`, `landing.features.*`, `landing.whyUs.*`) — keys are reused as-is, no locale file changes in this task.

- [ ] **Step 1: Create the `FeatureRow` component**

```tsx
// src/components/feature-row.tsx
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  align: "left" | "right";
  children?: React.ReactNode;
}

export function FeatureRow({ icon: Icon, title, description, align, children }: FeatureRowProps) {
  return (
    <div
      className={cn(
        "grid gap-8 items-center py-10 md:grid-cols-2",
        align === "right" && "md:[&>*:first-child]:order-2"
      )}
    >
      <div className="space-y-4">
        <div className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the hero section**

Replace `src/app/page.tsx:20-57` (the whole `{/* HERO SECTION */}` block) with a two-column asymmetric layout — no blurred orb, no dot-grid background:

```tsx
        {/* HERO SECTION */}
        <section className="relative w-full py-16 md:py-24 lg:py-28 bg-background border-b">
            <div className="container px-4 md:px-6 grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary/10 text-primary">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                    Earth Insights v2.0
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
                    {t('landing.hero.title')}
                </h1>
                <p className="max-w-[600px] text-lg text-muted-foreground leading-relaxed">
                    {t('landing.hero.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                   <Button asChild size="lg" className="px-8 text-base">
                    <Link href="/dashboard">
                        {t('landing.hero.getStarted')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="px-8 text-base">
                    <Link href="#features">Learn More</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-md bg-muted h-48 flex items-center justify-center text-muted-foreground text-sm font-mono">
                    Map + NDVI overlay
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">NDVI</p>
                      <p className="text-lg font-mono font-semibold text-foreground">0.64</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Change</p>
                      <p className="text-lg font-mono font-semibold text-primary">+4.2%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </section>
```

Note: the right-hand panel is a static, labeled placeholder representing real dashboard output shape (map area + NDVI/change metric tiles), not a decorative illustration — it should visually echo the actual `SummaryCards`/`GISDashboard` layout so it reads as "this is what the product looks like," per the anti-generic-AI-UI constraint. If a real screenshot is available at implementation time, swap the placeholder `div`s for an `<Image>` of the real dashboard instead.

- [ ] **Step 3: Rewrite the features section using `FeatureRow`**

Replace `src/app/page.tsx:59-136` (the `{/* FEATURES SECTION */}` block, the 4x duplicated `Card` grid) with:

```tsx
        {/* FEATURES SECTION */}
        <section id="features" className="w-full py-16 md:py-24 bg-background border-t">
          <div className="container px-4 md:px-6">
            <div className="max-w-2xl mb-4">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium mb-4">
                  {t('landing.features.keyFeatures')}
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {t('landing.features.title')}
                </h2>
                <p className="mt-4 text-muted-foreground md:text-lg">
                  {t('landing.features.subtitle')}
                </p>
            </div>

            <div className="divide-y divide-border">
              <FeatureRow
                icon={SlidersHorizontal}
                title={t('landing.features.coordinateInput')}
                description={t('landing.features.coordinateInputDesc')}
                align="left"
              >
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm font-mono">lat/lon + polygon draw</div>
              </FeatureRow>
              <FeatureRow
                icon={Cpu}
                title={t('landing.features.metricComputation')}
                description={t('landing.features.metricComputationDesc')}
                align="right"
              >
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm font-mono">NDVI · NDWI · EVI</div>
              </FeatureRow>
              <FeatureRow
                icon={BarChart}
                title={t('landing.features.interactiveVisuals')}
                description={t('landing.features.interactiveVisualsDesc')}
                align="left"
              >
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm font-mono">time-series chart</div>
              </FeatureRow>
              <FeatureRow
                icon={Download}
                title={t('landing.features.exportEasily')}
                description={t('landing.features.exportEasilyDesc')}
                align="right"
              >
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm font-mono">CSV · GeoJSON</div>
              </FeatureRow>
            </div>
          </div>
        </section>
```

Add the import at the top of `src/app/page.tsx`: `import { FeatureRow } from "@/components/feature-row";`

- [ ] **Step 4: Rewrite the "why us" section — drop the invented stat tiles**

Replace `src/app/page.tsx:138-188` (the `{/* ABOUT / WHY US SECTION */}` block): keep the two-column layout and the checklist exactly as-is (it uses real i18n content), but delete the `<div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">...50+/99%/Global...</div>` stat-tile block (lines 171-184) entirely — do not replace it with anything unless the user has supplied verified numbers (they have not, per the spec's open question). The section ends after the checklist `<ul>`.

- [ ] **Step 5: Simplify the CTA section copy**

In `src/app/page.tsx` (the final `{/* CTA SECTION */}` block), change the hardcoded English strings to be specific to the product instead of generic:

```tsx
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Turn a coordinate into an analysis in minutes</h2>
                <p className="text-lg text-muted-foreground mb-8">Draw a boundary or drop a pin — get NDVI, land-cover, and change detection back instantly.</p>
```

- [ ] **Step 6: Run typecheck, lint, and dev check**

Run: `npm run typecheck && npm run lint`
Expected: both pass. Then `npm run dev`, open `/`, verify: no purple/blur orb, feature rows alternate left/right, no stat-tile row, both themes look correct.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/feature-row.tsx
git commit -m "redesign: rework landing page hero/features/CTA away from generic template"
```

---

### Task 5: Auth pages — theme-aware glass card

**Files:**
- Modify: `src/app/login/page.tsx:83-91`
- Modify: `src/app/register/page.tsx:74-82`

**Interfaces:**
- Consumes: `TiltCard` (`src/components/tilt-card.tsx`, unchanged — its only inline `style` is the mouse-driven `rotateX`/`rotateY` transform, which is genuinely dynamic and stays inline).

- [ ] **Step 1: Replace the hardcoded dark page background in `login/page.tsx`**

Change:

```tsx
    <div className="min-h-screen flex flex-col bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors">
        <Globe2 className="h-6 w-6" />
        <span className="font-bold text-lg tracking-tight">Earth Insights</span>
      </Link>
```

to:

```tsx
    <div className="min-h-screen flex flex-col bg-background items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <Globe2 className="h-6 w-6" />
        <span className="font-bold text-lg tracking-tight">Earth Insights</span>
      </Link>
```

- [ ] **Step 2: Replace the glass card and its text colors in `login/page.tsx`**

Change:

```tsx
          <div className="flex flex-col space-y-8 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl [transform:translateZ(30px)]">
            <div className="space-y-2 text-center [transform:translateZ(10px)]">
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
              <p className="text-sm text-gray-400">
```

to:

```tsx
          <div className="flex flex-col space-y-8 bg-card/80 backdrop-blur-xl p-8 rounded-3xl border border-border shadow-2xl [transform:translateZ(30px)]">
            <div className="space-y-2 text-center [transform:translateZ(10px)]">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
```

and within the same block replace every remaining `text-gray-300` → `text-muted-foreground`, `text-gray-400` → `text-muted-foreground`, `text-white` → `text-foreground`, `border-white/10` → `border-border`, `bg-white/5` → `bg-input`, `text-red-400` → `text-destructive` (these appear on the `FormLabel`, `Input` className props, and the "Don't have an account?" footer text).

- [ ] **Step 3: Apply the identical replacements to `register/page.tsx`**

Same substitutions as Step 1-2, applied to `src/app/register/page.tsx:74-82` (page background/back-link) and the glass card block below it (form labels, inputs, footer text).

- [ ] **Step 4: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 5: Manual check in both themes**

Run `npm run dev`, visit `/login` and `/register` in both light and dark mode (toggle via the header's theme switcher on another tab, or `localStorage` theme key, since these pages don't show the header — confirm by checking `document.documentElement.classList` for `dark`). Expected: card is legible and on-token in both modes; no page independently looks different from the app's theme choice.

- [ ] **Step 6: Commit**

```bash
git add src/app/login/page.tsx src/app/register/page.tsx
git commit -m "style: make auth pages respect the app theme instead of hardcoded dark"
```

---

### Task 6: GIS dashboard — data-color hygiene and chrome restyle

**Files:**
- Modify: `src/components/gis-dashboard.tsx`
- Modify: `src/components/boundary-map.tsx:106`

**Interfaces:**
- Produces: `LAND_COVER_CLASS_COLORS` (renamed from `CLASS_COLORS`) — same `string[]` shape and index meaning, consumed by `makeSegmentationOverlay` in the same file.

- [ ] **Step 1: Rename and document the class-color constant**

Change `src/components/gis-dashboard.tsx:20`:

```ts
const CLASS_COLORS = ['#9ca3af', '#22c55e', '#ef4444', '#3b82f6'];
```

to:

```ts
// Land-cover classification colors — encode data meaning (bare/vegetation/burned/water),
// not theme. Never replace with brand tokens.
const LAND_COVER_CLASS_COLORS = ['#9ca3af', '#22c55e', '#ef4444', '#3b82f6'];
```

Update the one other reference at line 29 (`CLASS_COLORS[classId] ?? CLASS_COLORS[0]` → `LAND_COVER_CLASS_COLORS[classId] ?? LAND_COVER_CLASS_COLORS[0]`) and search the file for any other `CLASS_COLORS` usages to rename.

- [ ] **Step 2: Verify the file's other inline `style` usages are legitimately dynamic (no change needed)**

Confirm each of these (found at `gis-dashboard.tsx:193,212,251,259`) computes a value at runtime and cannot be a static Tailwind class: `clipPath: inset(0 0 0 ${comparePosition}%)`, `left: calc(${comparePosition}% - 2px)`, `gridTemplateColumns: repeat(${anomalyGridWidth}, minmax(0, 1fr))`. These stay inline as-is — this step is a verification, not a code change.

- [ ] **Step 3: Restyle static chrome onto tokens**

Read through the compare-slider track, legend, and export-button markup in `gis-dashboard.tsx`; replace any hardcoded Tailwind color utilities that aren't part of `LAND_COVER_CLASS_COLORS` (e.g. `bg-gray-*`, `border-gray-*`, `text-gray-*` used for chrome, not data) with the equivalent token classes (`bg-muted`, `border-border`, `text-muted-foreground`).

- [ ] **Step 3b: Replace the one genuinely-static inline style**

In `src/components/boundary-map.tsx:106`, change:

```tsx
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
```

to:

```tsx
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
```

(`react-leaflet`'s `MapContainer` forwards `className` to its root element, so this is a like-for-like swap, not a behavior change.)

- [ ] **Step 4: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 5: Manual check**

Run `npm run dev`, log in, open `/dashboard`, load an analysis, switch the GIS view between base/segmentation/anomaly layers and drag the compare slider. Expected: no visual regression, land-cover colors unchanged, surrounding UI matches the new token palette in both themes.

- [ ] **Step 6: Commit**

```bash
git add src/components/gis-dashboard.tsx src/components/boundary-map.tsx
git commit -m "style: rename land-cover colors for clarity and restyle GIS chrome onto tokens"
```

---

### Task 7: Admin panel restyle and chart color fix

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/analytics/page.tsx:98-108`
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/admin/activity/page.tsx`

**Interfaces:**
- Consumes: token classes from Task 1 (`bg-card`, `border-border`, `text-muted-foreground`, etc.), `font-mono` from Task 2.

- [ ] **Step 1: Replace the hardcoded violet chart color**

In `src/app/admin/analytics/page.tsx`, change the token-usage area chart from a generic purple to the app's primary blue — this is the concrete "generic AI purple" instance flagged during design review:

```tsx
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
```

and:

```tsx
                <Area type="monotone" dataKey="aiTokens" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTokens)" />
```

Leave `#10b981` (success) and `#ef4444` (failure) in the bar chart below unchanged — those are semantic status colors, not brand/theme colors, matching the "data-semantic colors stay" constraint.

- [ ] **Step 2: Restyle sidebar and layout chrome**

Read `src/app/admin/layout.tsx`; replace any hardcoded gray/slate Tailwind utilities on the sidebar/nav container with token classes (`bg-card`, `border-border`, active-link state using `bg-primary/10 text-primary` instead of a hardcoded color).

- [ ] **Step 3: Restyle stat cards and tables**

In `src/app/admin/page.tsx`, `src/app/admin/users/page.tsx`, and `src/app/admin/activity/page.tsx`, confirm `Card`/`Table` components already inherit tokens (they should, since `ui/card.tsx` and `ui/table.tsx` use the shared token classes) — fix only any page-local hardcoded color override found during the read-through (e.g. a hardcoded `text-gray-500` instead of `text-muted-foreground`).

- [ ] **Step 4: Run typecheck, lint, and vitest**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: all pass.

- [ ] **Step 5: Manual check**

Run `npm run dev`, log in as an admin, visit `/admin`, `/admin/analytics`, `/admin/users`, `/admin/activity` in both themes. Expected: no purple accent anywhere, consistent card/table styling, chart line/area is now blue.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin
git commit -m "style: restyle admin panel onto shared tokens, fix hardcoded chart purple"
```

---

### Task 8: `system_settings` table and API route

**Files:**
- Create: `supabase/migrations/0007_system_settings.sql`
- Create: `src/app/api/admin/settings/route.ts`
- Create: `src/test/admin-settings.test.ts`

**Interfaces:**
- Produces: `GET /api/admin/settings` → `200 { id: 1, maintenance_mode: boolean, maintenance_message: string, notify_new_registrations: boolean, notify_weekly_report: boolean, notify_critical_errors: boolean, updated_at: string }` for admins, `403 { error: string }` for non-admins. `PUT /api/admin/settings` with the same shape (minus `id`/`updated_at`) in the body → `200` with the updated row, `400` on validation failure, `403` for non-admins.
- Consumes: `requireAdmin()` from `src/lib/require-admin.ts` (returns `{ auth }` or `{ response }`, same pattern as `src/app/api/admin/stats/route.ts:6-7`), `getSupabase()` from `src/lib/supabase.ts`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0007_system_settings.sql
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

- [ ] **Step 2: Write the failing tests**

```ts
// src/test/admin-settings.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

const requireAdminMock = vi.fn();
const getSupabaseMock = vi.fn();

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: () => requireAdminMock(),
}));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => getSupabaseMock(),
}));

describe('GET /api/admin/settings', () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSupabaseMock.mockReset();
  });

  it('returns 403 for non-admins without querying the database', async () => {
    requireAdminMock.mockResolvedValue({ response: { status: 403 } });
    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET();
    expect(res).toEqual({ status: 403 });
    expect(getSupabaseMock).not.toHaveBeenCalled();
  });

  it('returns the settings row for admins', async () => {
    requireAdminMock.mockResolvedValue({ auth: { role: 'admin' } });
    const row = {
      id: 1,
      maintenance_mode: false,
      maintenance_message: '',
      notify_new_registrations: true,
      notify_weekly_report: true,
      notify_critical_errors: true,
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    getSupabaseMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: row, error: null }),
          }),
        }),
      }),
    });
    const { GET } = await import('@/app/api/admin/settings/route');
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual(row);
  });
});

describe('PUT /api/admin/settings', () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getSupabaseMock.mockReset();
  });

  it('rejects invalid bodies with 400', async () => {
    requireAdminMock.mockResolvedValue({ auth: { role: 'admin' } });
    const { PUT } = await import('@/app/api/admin/settings/route');
    const req = new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ maintenance_mode: 'not-a-boolean' }),
    });
    const res = await PUT(req as any);
    expect(res.status).toBe(400);
  });

  it('updates and returns the row for valid input', async () => {
    requireAdminMock.mockResolvedValue({ auth: { role: 'admin' } });
    const updated = {
      id: 1,
      maintenance_mode: true,
      maintenance_message: 'brb',
      notify_new_registrations: true,
      notify_weekly_report: false,
      notify_critical_errors: true,
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    getSupabaseMock.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: updated, error: null }),
            }),
          }),
        }),
      }),
    });
    const { PUT } = await import('@/app/api/admin/settings/route');
    const req = new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        maintenance_mode: true,
        maintenance_message: 'brb',
        notify_new_registrations: true,
        notify_weekly_report: false,
        notify_critical_errors: true,
      }),
    });
    const res = await PUT(req as any);
    const body = await res.json();
    expect(body).toEqual(updated);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/test/admin-settings.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/admin/settings/route'`.

- [ ] **Step 4: Implement the route**

```ts
// src/app/api/admin/settings/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/require-admin';
import { getSupabase } from '@/lib/supabase';

const settingsSchema = z.object({
  maintenance_mode: z.boolean(),
  maintenance_message: z.string(),
  notify_new_registrations: z.boolean(),
  notify_weekly_report: z.boolean(),
  notify_critical_errors: z.boolean(),
});

export async function GET() {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const guard = await requireAdmin();
  if ('response' in guard) return guard.response;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('system_settings')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/test/admin-settings.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0007_system_settings.sql src/app/api/admin/settings/route.ts src/test/admin-settings.test.ts
git commit -m "feat: add system_settings table and admin settings API route"
```

---

### Task 9: Wire admin Settings page to the real API

**Files:**
- Modify: `src/app/admin/settings/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `GET`/`PUT /api/admin/settings` from Task 8.

- [ ] **Step 1: Rewrite the page as a controlled form backed by the API**

```tsx
// src/app/admin/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Save, BellRing, Database, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Settings = {
  maintenance_mode: boolean;
  maintenance_message: string;
  notify_new_registrations: boolean;
  notify_weekly_report: boolean;
  notify_critical_errors: boolean;
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setSettings(updated);
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">Manage application-wide configurations.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Maintenance Mode</CardTitle>
            </div>
            <CardDescription>
              Take the system offline for non-admin users to perform database upgrades or maintenance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">Users will see a maintenance screen.</p>
              </div>
              <Switch
                checked={settings.maintenance_mode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
              />
            </div>
            <div className="space-y-2 pt-2">
              <Label>Maintenance Message</Label>
              <Input
                placeholder="We are currently performing scheduled maintenance..."
                value={settings.maintenance_message}
                onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <CardTitle>System Notifications</CardTitle>
            </div>
            <CardDescription>Configure automated alerts sent to administrators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New User Registrations</Label>
                <p className="text-sm text-muted-foreground">Receive an email when a new user joins.</p>
              </div>
              <Switch
                checked={settings.notify_new_registrations}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_new_registrations: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Analytics Report</Label>
                <p className="text-sm text-muted-foreground">Get a weekly summary of system usage.</p>
              </div>
              <Switch
                checked={settings.notify_weekly_report}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_weekly_report: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Critical Error Alerts</Label>
                <p className="text-sm text-muted-foreground">Immediate notification if an API service fails.</p>
              </div>
              <Switch
                checked={settings.notify_critical_errors}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_critical_errors: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 3: Manual end-to-end check**

Run `npm run dev`, log in as an admin, go to `/admin/settings`, toggle a switch and edit the message, click Save, reload the page. Expected: the toggled/edited values persist across reload (confirms the `PUT` actually wrote to Supabase and `GET` reads it back).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat: wire admin settings page to real persistence"
```

---

### Task 10: Maintenance-mode enforcement and maintenance page

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/app/maintenance/page.tsx`

**Interfaces:**
- Consumes: `system_settings.maintenance_mode` (Task 8's table), `getSupabase()` from `src/lib/supabase.ts`, `session.role` (already available in `middleware.ts` from `verifySession`).

- [ ] **Step 1: Create the maintenance page**

```tsx
// src/app/maintenance/page.tsx
import { Globe2 } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-center p-4">
      <Globe2 className="h-10 w-10 text-primary" />
      <h1 className="text-2xl font-bold text-foreground">We&apos;ll be right back</h1>
      <p className="text-muted-foreground max-w-md">
        Earth Insights is undergoing scheduled maintenance. Please check back shortly.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add the maintenance-mode check to middleware**

In `src/middleware.ts`, add the import and the check. The full modified file:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/jwt';
import { getSupabase } from '@/lib/supabase';

// Every feature area requires a signed-in account: visitors must register/log in
// before they can use the dashboard, predictive tools, or crop advisor. Only the
// landing page and the auth pages themselves are reachable anonymously.
const PROTECTED_PREFIXES = ['/dashboard', '/settings', '/onboarding', '/admin'];
const ADMIN_PREFIXES = ['/admin'];
const AUTH_PAGES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip any client-supplied identity headers so they can never be trusted downstream.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-role');

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isMaintenancePage = pathname === '/maintenance';
  const isApiRoute = pathname.startsWith('/api');

  if (!isAdminRoute && !isApiRoute && !isMaintenancePage && session?.role !== 'admin') {
    const { data } = await getSupabase()
      .from('system_settings')
      .select('maintenance_mode')
      .eq('id', 1)
      .single();
    if (data?.maintenance_mode) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/',
    '/maintenance',
    '/dashboard/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
```

Note the ordering: the maintenance check runs before the existing protected/admin/auth redirects so a non-admin is bounced to `/maintenance` regardless of which of those branches they'd otherwise hit; `/admin/:path*` and `/api/*` stay exempt so an admin can always reach `/admin/settings` to turn the flag back off.

- [ ] **Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 4: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS — the existing dashboard-redirect test still passes since `maintenance_mode` defaults to `false` in the seed row from Task 8's migration, so the new check is a no-op in the test environment.

- [ ] **Step 5: Manual check**

With the app running locally against the real Supabase instance: log in as admin, go to `/admin/settings`, enable Maintenance Mode, Save. In a different (non-admin or logged-out) browser session, visit `/` or `/dashboard` — expect a redirect to `/maintenance`. As the admin, `/admin/settings` should remain reachable; turn the flag back off and confirm normal access resumes.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/app/maintenance/page.tsx
git commit -m "feat: enforce maintenance mode in middleware"
```

---

### Task 11: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full automated suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run test:e2e`
Expected: all pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds with no type or build errors (confirms the `next/font` additions and all page changes compile for production).

- [ ] **Step 3: Full manual page sweep in both themes**

Run `npm run dev`. For each of: `/`, `/login`, `/register`, `/onboarding`, `/dashboard` (all three tabs), `/settings`, `/admin`, `/admin/users`, `/admin/analytics`, `/admin/activity`, `/admin/settings` — toggle light/dark via the header `ThemeToggle` and confirm: no leftover green tint, no hardcoded-dark card on a light page (or vice versa), text meets contrast (visually: no gray-on-gray, no low-contrast muted text on muted background), focus rings visible when tabbing through interactive elements.

- [ ] **Step 4: Confirm no stray generic-AI patterns remain**

Grep for the specific patterns called out in the spec's Global Constraints to confirm none were reintroduced:

```bash
grep -rn "blur-\[100px\]\|#8b5cf6\|bg-slate-950" src/app src/components
```

Expected: no matches (the violet chart color and hardcoded dark auth background were the two instances found and fixed in Tasks 5 and 7; the blur orb was removed in Task 4).

- [ ] **Step 5: Commit (if Step 3/4 surfaced any fixes)**

If the manual sweep or grep found anything, fix it and commit:

```bash
git add -A
git commit -m "style: final contrast/consistency fixes from full-app review"
```

If nothing was found, no commit is needed for this task.
