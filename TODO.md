# Earth Insights — Project Audit & TODO

> **Generated:** 2026-02-10
> **Scope:** Full codebase analysis — architecture, security, bugs, performance, accessibility, and feature gaps.

---

## Table of Contents

- [1. Critical Bugs & Security Issues](#1-critical-bugs--security-issues)
- [2. High-Priority Bugs](#2-high-priority-bugs)
- [3. AI Layer Issues](#3-ai-layer-issues)
- [4. AI Flows Issues](#4-ai-flows-issues)
- [5. Component & UI Issues](#5-component--ui-issues)
- [6. App Routes & Pages Issues](#6-app-routes--pages-issues)
- [7. Lib / Services / Hooks Issues](#7-lib--services--hooks-issues)
- [8. Configuration & Build Issues](#8-configuration--build-issues)
- [9. Testing & Quality Assurance](#9-testing--quality-assurance)
- [10. Accessibility (a11y)](#10-accessibility-a11y)
- [11. Performance Optimizations](#11-performance-optimizations)
- [12. Feature Gaps & Incomplete Implementations](#12-feature-gaps--incomplete-implementations)
- [13. Architecture Improvements](#13-architecture-improvements)
- [14. DevOps & Deployment](#14-devops--deployment)
- [15. Recommended New Features](#15-recommended-new-features)

---

## 1. Critical Bugs & Security Issues

- [ ] **SSL verification disabled in production** — `rejectUnauthorized: false` in `src/services/open-meteo.ts` (lines 86, 137, 185), `src/ai/flows/get-weather-report.ts`, `src/ai/flows/get-advanced-crop-advice.ts`, `src/ai/flows/predict-satellite-pass.ts`, `src/ai/flows/schedule-irrigation.ts`. Enables MITM attacks. Must use proper certificates or only disable in dev via `NODE_TLS_REJECT_UNAUTHORIZED` env var.

- [ ] **Prompt injection vulnerability** — All user inputs (`locationDescription`, `crop`, `scenarioDescription`, etc.) in `src/ai/ai-utils.ts` and `src/ai/tools/run-scenario-analysis.ts` are interpolated directly into LLM prompts with zero sanitization. Malicious users can inject instructions.

- [ ] **CSV injection vulnerability** — `src/lib/csv.ts` exports user-supplied values directly into CSV without escaping dangerous prefixes (`=`, `+`, `-`, `@`). When opened in Excel, these execute as formulas.

- [ ] **API key leak risk** — `src/ai/flows/generate-timelapse-video.ts` appends API key directly to URL (`?key=${apiKey}`). If logged or returned on error, key leaks. Provider error bodies in `src/ai/providers.ts` (lines 100, 147) may echo auth headers.

- [ ] **Firebase init crashes entire server** — `src/lib/firebase.ts` throws at module import time if `GOOGLE_APPLICATION_CREDENTIALS_JSON` is not set. Any module importing firebase will crash even if it doesn't need Firestore.

- [ ] **Missing `'use server'` directive** — `src/ai/flows/compute-metrics.ts` lacks the `'use server'` directive. Server-only code (EE credentials, Firestore) could leak to client bundle.

- [ ] **Security in payment page** — `src/app/payment/page.tsx` uses plain `<Input>` for CVC — should use `type="password"` or `inputMode="numeric"` with `autoComplete="cc-csc"`.

---

## 2. High-Priority Bugs

- [ ] **JSX syntax error** — `src/components/dashboard.tsx` (~line 148): Stray `.` after `</CardContent>.` — causes parse error or renders a literal period.

- [ ] **Duplicate chatbot instances** — `src/app/dashboard/page.tsx` renders `<Chatbot />` AND the imported `<Dashboard />` component also renders `<Chatbot />`. Two chatbot instances appear simultaneously.

- [ ] **`isFetchingWeather` / `isFetchingPass` never toggled** — In `src/components/dashboard.tsx`, these state variables are defined but never set to `true`/`false`. Loading states never display.

- [ ] **Unhandled promise rejections** — `src/components/dashboard.tsx` (lines 120-121): `predictSatellitePassAction` and `getWeatherReportAction` `.then()` calls have no `.catch()`.

- [ ] **Fire-and-forget without error handling** — `src/ai/flows/compute-metrics.ts` (line 121): `computeMetricsFlow(input, jobId)` called without `await` and no `.catch()`. Synchronous throws become unhandled rejections.

- [ ] **`node-fetch` `.buffer()` removed in v3+** — `src/ai/flows/generate-timelapse-video.ts` (line 82) calls `.buffer()` which doesn't exist in modern node-fetch. Should use `.arrayBuffer()` + `Buffer.from()`.

- [ ] **Stale closure in speech recognition** — `src/components/chatbot.tsx`: `handleSend` is called from `recognition.onresult` but captures stale `messages` state. Missing from `useEffect` dependency array.

- [ ] **Memory leak in geometric background** — `src/components/geometric-background.tsx`: `window.addEventListener('resize', ...)` uses an anonymous function but cleanup removes a different function reference. Listener is never properly removed.

- [ ] **`GeometricBackground` imported but never rendered** — `src/app/page.tsx` imports the component but never uses `<GeometricBackground />` in JSX. Dead code.

- [ ] **Rate limiter uses `"default-user"` for all users** — `src/lib/actions.ts` (line 43): Rate limiting is shared across all users. A single abuser blocks everyone; distributed attacks bypass it entirely.

- [ ] **Rate limiter not wired into AI pipeline** — `src/ai/rate-limiter.ts` exists but is never called from `src/ai/ai-utils.ts` or `src/ai/providers.ts`.

---

## 3. AI Layer Issues

### `src/ai/genkit.ts`
- [ ] `MODELS.fast` and `MODELS.primary` are identical (`gemini-2.0-flash`); `MODELS.fallback` and `MODELS.pro` are identical (`gemini-2.0-flash-exp`). The fallback array retries the same model twice, wasting quota.
- [ ] Unused imports: `z` from `genkit`, `generateWithMultiProvider`, `getProviderLimits`, `AIProvider` from `providers.ts`.
- [ ] Console output at module import time (lines 11-20) — runs during testing, SSR, and build.
- [ ] `generateWithGeminiFallback` swallows intermediate errors without logging.

### `src/ai/providers.ts`
- [ ] HuggingFace uses Mistral `[INST]` template hardcoded (line 92) for ALL models — produces garbage for non-Mistral models.
- [ ] `Groq` client re-instantiated on every call (line 41) — should be a singleton for connection reuse.
- [ ] No request timeouts on `fetch()` calls to HuggingFace and Mistral — hung API blocks indefinitely.
- [ ] No response size limits — `response.json()` reads entire body into memory.
- [ ] Heavy use of `any` typing (lines 98, 143).

### `src/ai/ai-utils.ts`
- [ ] God function: `executePromptWithFallback` is ~350 lines with 15-branch switch statement. Should extract prompt templates into per-flow modules.
- [ ] Dead code: unreachable `throw lastError` at line 475.
- [ ] Unused import: `googleAI` from `@genkit-ai/google-genai`.
- [ ] No caching integration despite `cache.ts` existing.
- [ ] No input validation — coordinates as strings like `"not_a_number"` silently pass.
- [ ] Magic strings: flow detection via `'locationDescription' in inputData` is fragile.

### `src/ai/cache.ts`
- [ ] **Memory leak** — Cache `Map` never evicts expired entries. `getCache` detects stale entries but doesn't delete them.
- [ ] No max size limit — cache can grow until OOM under load.
- [ ] No granular invalidation — `clearCache()` is the only option (nuclear).
- [ ] Process-local only — useless in serverless (Vercel) deployments.
- [ ] `CacheResult` has a `'stale'` state but stale-while-revalidate is never leveraged.

### `src/ai/rate-limiter.ts`
- [ ] **Memory leak** — `requestCounts` Map never cleans up entries for inactive users.
- [ ] No global rate limit — only per-user. Aggregate requests can exceed upstream API quotas.
- [ ] Process-local — doesn't work across serverless instances.
- [ ] Hard-coded constants (15 req/min) — no per-flow or per-provider configuration.

### `src/ai/startup-checks.ts`
- [ ] Misleading `allKeysValid` — stays `true` even if Gemini key is missing.
- [ ] `chalk` dependency imported unconditionally — may crash in serverless builds where it's not bundled.
- [ ] Returns `void` — callers have no way to know if checks passed.
- [ ] Only checks key presence, never validity. A simple ping request would catch typos.

### `src/ai/dev.ts`
- [ ] Import ordering: `runStartupChecks()` runs before flow modules load, but those trigger their own side effects — out-of-order logs.
- [ ] No conditional loading — all 18+ flows imported unconditionally increases startup time.
- [ ] No error handling for missing flow files.

---

## 4. AI Flows Issues

### `src/ai/flows/analyze-change.ts`
- [ ] Catch block throws generic message without propagating original Zod validation error.
- [ ] No timeout on AI call.

### `src/ai/flows/analyze-drought-flood-risk.ts`
- [ ] No fallback if `getDroughtAndFloodRiskData` tool fails — model may hallucinate data.

### `src/ai/flows/chatbot.ts`
- [ ] `ChatbotResponseSchema` defined but never used — dead code.
- [ ] Three unused imports: `predictCropYield`, `suggestCrop`, `getAdvancedCropAdvice` — dead imports suggesting incomplete agentic chatbot implementation.
- [ ] Prompt input schema defined inline instead of reusing `ChatbotInputSchema`.

### `src/ai/flows/compute-metrics.ts`
- [ ] `getPercentageChange` — division by very small `start` values produces astronomically large results. Needs clamping.
- [ ] EE `getThumbURL()` generates expiring URLs stored in Firestore — won't work long-term.
- [ ] 406 lines — too large. Should decompose into EE auth, image processing, time-series, land cover, and AI orchestration modules.

### `src/ai/flows/generate-timelapse-video.ts`
- [ ] Video polling loop has no timeout — polls every 5s indefinitely if operation never completes.
- [ ] `VIDEO_MODELS` list includes `imagen-3.0-generate-001` which is an image model, not video.
- [ ] Video base64-encoded in response — could be hundreds of MB in memory.

### `src/ai/flows/get-advanced-crop-advice.ts`
- [ ] Unused import: `getSoilAndWeatherData`.
- [ ] No error handling on `fetchRealClimateData` — crashes entirely if Open-Meteo is down.
- [ ] Dual type definitions (`AdvancedCropAdvice` interface vs `AdvancedCropAdviceOutputSchema`) can drift.

### `src/ai/flows/get-weather-report.ts`
- [ ] Not an AI flow — purely a data service. Should be moved to `src/services/`.
- [ ] No validation of Open-Meteo API response shape.
- [ ] `HourlyForecastSchema` has no date/time format validation on `time`.

### `src/ai/flows/plan-crops.ts`
- [ ] `${new Date().toISOString()}` evaluated at import time — becomes stale if server runs for days.

### `src/ai/flows/predict-crop-yield.ts`
- [ ] Same stale date issue as `plan-crops.ts`.
- [ ] No try/catch around AI call or parsing.
- [ ] `cropType` `.default('Maize')` may never apply since inputs bypass schema parsing.

### `src/ai/flows/predict-satellite-pass.ts`
- [ ] `calculateNextPass` is a highly simplified approximation that ignores orbital mechanics. Results can be hours off. Consider using `satellite.js` library.
- [ ] TLE data is fetched but barely utilized (only mean motion extracted).

### `src/ai/flows/predict-soil-moisture.ts`
- [ ] `soilData` schema field defined but never used — dead schema field.
- [ ] Not an AI flow — should be in `src/services/`.

### `src/ai/flows/suggest-coordinates.ts`
- [ ] No coordinate validation — AI could return `latitude: 999`. Should add `.min(-90).max(90)` and `.min(-180).max(180)`.

### `src/ai/flows/schedule-irrigation.ts`
- [ ] `nextIrrigationDate` schema is just `z.string()` — AI could return `"next Tuesday"` instead of `YYYY-MM-DD`.
- [ ] Over-broad catch silently returns mock data, hiding AI errors.
- [ ] Inconsistent indentation.

### `src/ai/flows/text-to-speech.ts`
- [ ] `Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64')` — if format changes, `indexOf(',')` returns -1, and entire URL decoded as base64 → garbage.
- [ ] No input text length limit — can produce massive audio causing OOM.

### `src/ai/flows/suggest-crop.ts`
- [ ] `suitabilityScore` uses `min(0).max(100)` while other flows use `0-1` ratio. Inconsistent confidence scoring.

### Cross-cutting flow issues:
- [ ] **Stale dates** in prompts (plan-crops, predict-crop-yield, schedule-irrigation).
- [ ] **No Zod `.parse()` at function boundaries** — schemas exist but aren't used to validate incoming inputs.
- [ ] **Inconsistent error handling** — some flows have try/catch with fallbacks, others throw raw errors.
- [ ] **Dead imports** scattered across multiple flow files.

---

## 5. Component & UI Issues

### `src/components/dashboard.tsx`
- [ ] `groundTruthData` passed to `Visualizations` but only used for comparison scatter (requires CSV upload). Poorly communicated to user.
- [ ] History is in-memory only — page refresh loses all analysis history. Persist to `localStorage`.
- [ ] No abort mechanism for in-flight computations.

### `src/components/header.tsx`
- [ ] Unused import: `BrainCircuit`.
- [ ] **Breakpoint gap**: Between `sm` and `md`, neither desktop utils nor mobile menu trigger are visible — language switcher and theme toggle disappear.
- [ ] No active link indicator for current page.
- [ ] Scroll listener runs on every page even though transparency transition only matters on landing page.

### `src/components/chatbot.tsx`
- [ ] Audio `newIndex` calculation (`messages.length + 1`) may be off by one due to batched state updates.
- [ ] No `aria-live` region for screen readers.
- [ ] Fixed positioning can overlap content on small screens.
- [ ] No message persistence — refresh clears chat.
- [ ] `ref={scrollAreaRef as any}` — type coercion indicates mismatch.

### `src/components/input-panel.tsx`
- [ ] No numeric validation for lat/lon — accepts any string (`"abc"` passes).
- [ ] Date range picker allows future dates — would produce empty satellite data.
- [ ] CSV file input has no size limit.
- [ ] `fileName` state doesn't reset for same-file re-selection.

### `src/components/visualizations.tsx`
- [ ] Dead imports: `Droplets`, `Thermometer`.
- [ ] `chartRef` and `scatterRef` created but never used.
- [ ] No empty state when `combinedChartData` is empty.
- [ ] Video dialog `autoPlay` on `<video>` — accessibility concern.
- [ ] No chart export/download despite landing page advertising "Export Easily."

### `src/components/weather-report.tsx`
- [ ] **Bundle bloat**: `import * as LucideIcons` imports entire lucide-react library (~200KB+), defeats tree-shaking.
- [ ] `toFixed(0)` on temperature — use `Math.round()` to avoid `-0`.

### `src/components/land-cover-analysis.tsx`
- [ ] Color-only change indicators (red/green arrows) — colorblind users can't distinguish. Need text labels or patterns.
- [ ] No null checks on `landCover.vegetation` — calling `.startArea.toFixed(2)` on undefined throws.

### `src/components/metrics-table.tsx`
- [ ] Table not responsive — 6 columns overflow on mobile. Needs horizontal scroll wrapper.
- [ ] `insightLoading` disables ALL insight buttons, not just the one loading.
- [ ] Missing `aria-sort` attributes on sortable `<th>` elements.

### `src/components/summary-cards.tsx`
- [ ] Missing "Other" land cover category from display.
- [ ] No skeleton/loading state — `toFixed(2)` on undefined will throw.

### `src/components/monitoring-card.tsx`
- [ ] Monitoring toggle is purely cosmetic — `handleSave` just shows a toast. No backend monitoring/alerting service exists.
- [ ] `threshold` input has no min/max bounds.
- [ ] `formatDistanceToNow` produces confusing output if `nextPass.passTime` is in the past.

### `src/components/contact-sheet.tsx`
- [ ] **Form submits nowhere** — `handleSubmit` prevents default and logs to console only.
- [ ] No email/phone format validation beyond HTML `required`.
- [ ] No CSRF protection or rate limiting.

### `src/components/providers.tsx`
- [ ] Import from `next-themes/dist/types` — internal path that may break on updates. Use `import type { ThemeProviderProps } from "next-themes"`.

### `src/components/theme-toggle.tsx`
- [ ] "Light", "Dark", "System" labels hardcoded in English — not internationalized.

### `src/components/geometric-background.tsx`
- [ ] 800 stars at 60fps — performance concern on low-end devices.
- [ ] No `prefers-reduced-motion` support (WCAG 2.3.3 violation).
- [ ] `Star` class defined inside `useEffect` — recreated on every mount.

### `src/components/icons.tsx`
- [ ] **Dead file** — only contains a comment. Should be deleted.

### `src/components/image-with-loader.tsx`
- [ ] No `onError` handler — if image fails, skeleton disappears but nothing shown (blank space).
- [ ] `unoptimized` prop disables Next.js image optimization even for HTTP URLs.

### `src/components/language-switcher.tsx`
- [ ] `es.json` (Spanish) exists in `src/locales/` but is NOT in the language switcher dropdown. Spanish users can't select it.

---

## 6. App Routes & Pages Issues

### `src/app/layout.tsx`
- [ ] Hardcoded `lang="en"` on `<html>` — contradicts multilingual LanguageProvider. Should reflect selected language.
- [ ] No global `error.tsx` error boundary — unhandled errors crash entire app.
- [ ] No `loading.tsx` — no global loading fallback for route transitions.
- [ ] No `not-found.tsx` — no custom 404 page.
- [ ] Minimal SEO metadata — missing `robots`, `openGraph`, `icons`.
- [ ] Trailing space in title: `"Earth Insights "`.

### `src/app/page.tsx` (Landing)
- [ ] `scrollToFeatures` defined but never called — dead function.
- [ ] `GeometricBackground` imported but never rendered.
- [ ] Footer duplicated across all 7+ pages — extract to shared `<Footer />` component.

### `src/app/dashboard/page.tsx`
- [ ] Duplicate `<Chatbot />` rendering (also rendered inside `<Dashboard />`).
- [ ] Footer duplication.

### `src/app/predict/page.tsx`
- [ ] ~500-line monolithic component — should split into sub-components per prediction type.
- [ ] `WeatherReport` (a `Card`) rendered inside `Dialog` — nested cards with awkward styling.
- [ ] `resultDialogOpen` can show stale previous results briefly.
- [ ] No loading indicator inside result dialog.
- [ ] Footer duplication.

### `src/app/settings/page.tsx`
- [ ] Very sparse — only two settings (dark mode already in header + notifications).
- [ ] `whitespace-nowrap` on copyright can overflow narrow screens.
- [ ] Footer duplication.

### `src/app/pricing/page.tsx`
- [ ] Feature lists, tier names, descriptions hardcoded in English — not internationalized.
- [ ] "Popular" badge uses `absolute` positioning but parent may lack `relative`.
- [ ] Enterprise "Contact Sales" `<Link href="#">` with `onClick` may conflict.
- [ ] Footer duplication.

### `src/app/payment/page.tsx`
- [ ] **Completely non-functional** — form shows a toast but does no actual payment processing.
- [ ] No input masking for card number, expiry, CVC.
- [ ] Razorpay logo loaded from external URL — breaks if URL changes.
- [ ] No client-side field validation (card numbers, expiry, CVC).
- [ ] Summary features hardcoded in English.
- [ ] Footer duplication.

### `src/app/login/page.tsx` & `src/app/signup/page.tsx`
- [ ] **Dead routes** — files contain only comments. Should be deleted or redirect to `/`.

### `src/app/crop-advisor/page.tsx`
- [ ] No validation on lat/lon inputs before submission.
- [ ] Footer duplication.

---

## 7. Lib / Services / Hooks Issues

### `src/lib/actions.ts`
- [ ] `getMetricsResultAction` accepts `latitude`, `longitude`, `locationDescription`, `dateRangeFrom`, `dateRangeTo` but only uses `jobId` — 5 params silently ignored.
- [ ] Dead comment: `"// ... (imports and other functions remain the same)"` — leftover.
- [ ] `predictCropYieldAction` uses `as any` to force input type.
- [ ] Error messages reveal Firestore project ID and expected IAM roles.
- [ ] 429 (Too Many Requests) from upstream not handled — retried pointlessly.

### `src/lib/types.ts`
- [ ] Inconsistent validation: some types use Zod schemas, others are plain interfaces with zero runtime validation.
- [ ] `SuggestCropInput`/`SuggestCropOutput` duplicated here and in flow file.

### `src/lib/firebase.ts`
- [ ] No JSON parse protection on `JSON.parse(creds)` — malformed JSON throws unhandled exception.
- [ ] No structural validation of parsed service account object.

### `src/lib/csv.ts`
- [ ] Naive CSV parsing: `row.split(',')` fails on quoted fields containing commas.
- [ ] No file size limits — parsing huge CSVs could cause DoS.
- [ ] `downloadFile` uses `document.createElement` — no SSR guard, will crash server-side.

### `src/services/open-meteo.ts`
- [ ] All three functions silently fall back to mock/fabricated data with NO user indication. Crop/drought advice based on fake numbers is dangerous.
- [ ] No fetch timeout — network hangs block indefinitely.
- [ ] No input validation for latitude/longitude bounds.
- [ ] `API_URL` constant declared but never used.
- [ ] Fallback pattern duplicated 3 times — extract into helper.

### `src/hooks/use-language.tsx`
- [ ] Language selection not persisted — resets to `'en'` on every page reload.
- [ ] `t()` function not memoized — recreated every render, causing unnecessary re-renders.
- [ ] `setLanguage('xyz')` attempts import of nonexistent file — no validation.
- [ ] No pluralization support.
- [ ] No nested key support.
- [ ] No RTL language detection.

### `src/hooks/use-toast.ts`
- [ ] `TOAST_REMOVE_DELAY = 1000000` (~16.7 minutes) — dismissed toasts stay in memory far too long.
- [ ] `toastTimeouts` Map and `listeners` Array are module-level singletons — grow unbounded in SSR.

### `src/types/google-earth-engine.d.ts`
- [ ] Types the entire `@google/earthengine` module as `any` — provides zero type safety.

---

## 8. Configuration & Build Issues

### `next.config.ts` (root AND `src/next.config.ts`)
- [ ] **Duplicate config files** — `next.config.ts` exists in both root and `src/`. The root one is used by Next.js; the `src/` copy is misleading and should be deleted.
- [ ] `typescript.ignoreBuildErrors: true` — hides all TypeScript errors during builds. Should be `false` in production.
- [ ] `eslint.ignoreDuringBuilds: true` — hides all lint errors during builds. Should be `false` in production.
- [ ] Root config uses `module.exports` instead of `export default` — inconsistent with TypeScript file extension.
- [ ] `remotePatterns` only allows `placehold.co` and `picsum.photos` — Earth Engine thumbnail URLs may be blocked.

### `package.json`
- [ ] Package name is `"nextn"` — should be `"earth-insights"` or similar.
- [ ] `react` and `react-dom` are on v18 but `next` is v15.3.8 — verify React 19 compatibility or pin to matching versions.
- [ ] `wav` package listed as dependency — used only in TTS flow; consider if really needed.
- [ ] No `engines` field — doesn't specify required Node.js version.
- [ ] No `lint-staged` or `husky` for pre-commit checks.
- [ ] No `prettier` configured — inconsistent code formatting.

### `tailwind.config.ts`
- [ ] Uses `require()` syntax (`require("tailwindcss/defaultTheme")`) mixed with ES module `import` — inconsistent.

### Missing Configuration Files
- [ ] No `.env.example` — new developers have no reference for required environment variables.
- [ ] No `.eslintrc` / `eslint.config.js` — ESLint is in devDependencies (via Next.js) but no config exists.
- [ ] No `robots.txt` or `sitemap.xml` generation.
- [ ] No `.nvmrc` or `.node-version` to pin Node.js version.

---

## 9. Testing & Quality Assurance

- [ ] **ZERO tests exist** — `src/test/` directory is completely empty.
- [ ] `scripts/test-analyze-change.ts` exists but is a standalone script, not a proper test.
- [ ] No test framework configured (no Jest, Vitest, or Testing Library in dependencies).
- [ ] No E2E testing setup (no Playwright or Cypress).
- [ ] No CI/CD pipeline configuration (no GitHub Actions, etc.).
- [ ] Coverage directory exists (`coverage/`) with HTML reports but no test runner to generate them.
- [ ] `typecheck` script exists but `ignoreBuildErrors: true` negates its value in CI.

### Recommended Test Coverage Plan
- [ ] Add Vitest + React Testing Library.
- [ ] Unit tests for all AI flows (input validation, JSON parsing, error handling).
- [ ] Unit tests for `csv.ts` (parsing edge cases, CSV injection prevention).
- [ ] Unit tests for `rate-limiter.ts` and `cache.ts`.
- [ ] Component tests for `InputPanel`, `MetricsTable`, `SummaryCards`.
- [ ] Integration tests for server actions in `actions.ts`.
- [ ] E2E tests for critical user flows (analysis, predict, crop advisor).

---

## 10. Accessibility (a11y)

- [ ] No `prefers-reduced-motion` support for canvas animation (`geometric-background.tsx`).
- [ ] Color-only change indicators in `land-cover-analysis.tsx` and `metrics-table.tsx` — colorblind users can't distinguish.
- [ ] No `aria-sort` on sortable table headers in `metrics-table.tsx`.
- [ ] No `aria-live` region in chatbot for screen reader announcements.
- [ ] Hero buttons on landing page lack `aria-label`.
- [ ] Footer contact link uses `<a href="#contact">` with `preventDefault()` — misleading to screen readers.
- [ ] No skip-to-content link in layout.
- [ ] No keyboard trap prevention in modal dialogs.
- [ ] `<html lang>` hardcoded to `"en"` regardless of selected language.

---

## 11. Performance Optimizations

- [ ] `import * as LucideIcons` in `weather-report.tsx` defeats tree-shaking (~200KB+ added to bundle).
- [ ] `GeometricBackground` canvas animation runs 800 particles at 60fps — no reduced-motion check.
- [ ] `Groq` SDK client recreated on every call in `providers.ts` — should be singleton.
- [ ] No `fetch` timeouts anywhere in provider layer — hung APIs block event loop.
- [ ] In-memory cache and rate limiter ineffective in serverless (Vercel).
- [ ] `t()` function in `use-language.tsx` not memoized — triggers unnecessary re-renders across entire component tree.
- [ ] All 18+ flows unconditionally imported in `dev.ts` — increases startup time.
- [ ] No `React.lazy` or dynamic imports for heavy components (charts, maps).
- [ ] No image optimization for Earth Engine thumbnails (`unoptimized` always set).
- [ ] Brush Recharts state management conflicts with internal state — causes janky chart interactions.

---

## 12. Feature Gaps & Incomplete Implementations

- [ ] **Authentication system**: `login/page.tsx` and `signup/page.tsx` are stubs. No auth flow exists despite Firebase being configured.
- [ ] **Contact form**: Submits nowhere — purely cosmetic.
- [ ] **Payment processing**: Completely non-functional — no Razorpay/Stripe integration.
- [ ] **Monitoring alerts**: Toggle is cosmetic — no backend service for satellite-pass or threshold alerts.
- [ ] **Chart export/download**: Landing page advertises "Export Easily" but no export functionality exists.
- [ ] **Agentic chatbot**: `chatbot.ts` imports 3 flow modules but never dispatches to them — incomplete tool-use implementation.
- [ ] **Real historical baseline**: `get-historical-baseline.ts` returns fully simulated data, not real data.
- [ ] **Proper orbital calculations**: `predict-satellite-pass.ts` uses crude approximation instead of actual orbital mechanics.
- [ ] **Dashboard history persistence**: Lost on page refresh.
- [ ] **Chat message persistence**: Lost on refresh.
- [ ] **Language persistence**: Resets to English on every page load.
- [ ] **PWA / Offline support**: No service worker.
- [ ] **Prompts directory empty**: `src/ai/prompts/` exists but all prompts are inline in flow/utils files.

---

## 13. Architecture Improvements

- [ ] **Extract shared Footer component** — duplicated across 7+ pages.
- [ ] **Extract prompt templates** from `ai-utils.ts` (350-line switch/case) into per-flow `src/ai/prompts/` files.
- [ ] **Move non-AI flows** (`get-weather-report.ts`, `predict-soil-moisture.ts`) to `src/services/`.
- [ ] **Move `run-scenario-analysis.ts`** from `src/ai/tools/` to `src/ai/flows/` — it's a flow, not a tool.
- [ ] **Decompose `compute-metrics.ts`** (406 lines) into separate EE, time-series, land-cover, and orchestration modules.
- [ ] **Split `predict/page.tsx`** (~500 lines) into per-prediction-type sub-components.
- [ ] **Use Zod schemas at function boundaries** — every exported flow function should `.parse()` its inputs.
- [ ] **Standardize confidence scoring** — use either 0-1 or 0-100 consistently across all flows.
- [ ] **Create shared error handling patterns** — unified try/catch with fallback data across all flows.
- [ ] **Use environment-aware logging** — replace `console.log` scattered everywhere with a shared logger that respects log levels.
- [ ] **Consider Redis or KV store** for cache and rate limiting in serverless environment.
- [ ] **Single source of truth for types** — eliminate duplicate type definitions between `types.ts` and individual flow files.
- [ ] **Delete dead files**: `src/components/icons.tsx`, `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/next.config.ts`.

---

## 14. DevOps & Deployment

- [ ] Create `.env.example` with all required environment variables documented.
- [ ] Add GitHub Actions CI pipeline: lint, typecheck, test, build.
- [ ] Fix `ignoreBuildErrors` and `ignoreDuringBuilds` — set to `false` in production builds.
- [ ] Add `engines` field to `package.json` to specify Node.js version.
- [ ] Add `lint-staged` + `husky` for pre-commit hooks.
- [ ] Add Prettier configuration for consistent formatting.
- [ ] Set up `.nvmrc` for consistent Node.js version.
- [ ] Configure Sentry or similar for error tracking.
- [ ] Add health check endpoint for monitoring.
- [ ] Properly manage EE thumbnail URL expiration (consider proxying or refreshing).

---

## 15. Recommended New Features

- [ ] **User authentication** — Firebase Auth integration (email/password, Google OAuth).
- [ ] **Protected routes** — middleware to guard dashboard, predict, settings pages.
- [ ] **User analysis history** — persist to Firestore per-user.
- [ ] **Real payment integration** — Razorpay or Stripe for premium tier.
- [ ] **Email notifications** — crop alerts, satellite pass reminders.
- [ ] **PDF report generation** — export analysis results as downloadable PDFs.
- [ ] **Map integration** — interactive Mapbox/Google Maps for location selection instead of manual lat/lon input.
- [ ] **Comparison mode** — side-by-side analysis of two different time periods or locations.
- [ ] **API rate limit dashboard** — show users their remaining API calls.
- [ ] **Admin dashboard** — usage analytics, user management.
- [ ] **Webhook support** — notify external services on analysis completion.
- [ ] **Proper orbital propagation** — integrate `satellite.js` for accurate pass predictions.
- [ ] **Real-time collaboration** — share analysis results with team members.
- [ ] **Mobile app** — React Native or PWA for field use.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Critical Security Issues | 7 |
| High-Priority Bugs | 11 |
| AI Layer Issues | 26 |
| AI Flow Issues | 25 |
| Component/UI Issues | 45 |
| Page/Route Issues | 20 |
| Lib/Services/Hooks Issues | 18 |
| Config/Build Issues | 14 |
| Testing Issues | 7 |
| Accessibility Issues | 9 |
| Performance Issues | 10 |
| Feature Gaps | 13 |
| Architecture Improvements | 14 |
| DevOps Items | 10 |
| New Feature Suggestions | 14 |
| **Total Items** | **~243** |

---

> **Priority Recommendation:** Start with the 7 critical security issues, then the 11 high-priority bugs, then set up a testing framework. Everything else can be addressed incrementally.
