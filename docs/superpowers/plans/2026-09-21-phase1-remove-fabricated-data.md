# Phase 1: Remove Fabricated Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No number shown to a user is invented. When Open-Meteo is unreachable or returns nothing, the app says so instead of substituting random or hardcoded values, and the 30-year rainfall normal is computed from real data.

**Architecture:** All Open-Meteo access stays in `src/services/open-meteo.ts`. Fetch functions either return real data or throw. Flows and tools stop catching those errors to substitute mocks; the existing action wrapper (`handleAction`) already turns a thrown error into a user-facing error. The one exception is `compute-metrics`, where weather is a secondary series: a weather failure yields an empty `historicalWeather` array (which the charts already handle) so satellite results still render.

**Tech Stack:** Next.js server actions, TypeScript, Vitest (fetch stubbed with `vi.stubGlobal`), Open-Meteo archive API.

**Spec:** Phase 1 ("Data trust layer") of the overhaul plan, which lives outside the repo at `C:\Users\Arrin Paul\.claude\plans\hey-so-i-was-inherited-sundae.md`. This plan is the "remove fabricated data" slice of it. The `Measured<T>` provenance type, shared data clients and the Supabase cache are deferred to a follow-up plan (Phase 1b), because nothing consumes them until a second data source (SoilGrids / NASA POWER) is added, and adding them now would be unused code.

## Global Constraints

- Verification before every commit: `npx tsc --noEmit`, `npx eslint --max-warnings=0 <changed files>`, `npx vitest run` all pass. A pre-commit hook also runs lint, typecheck and tests.
- Use TDD: write the failing test, watch it fail, then implement.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not stage `.claude/worktrees/frontend-rework` (pre-existing dirty pointer, not part of this work).
- Test files go in `src/test/`. The vitest setup file is `src/test/setup.ts`. Import app code with the `@/` alias.
- Fetch stub helper used in tests (copy into each new test file that needs it):

```ts
const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);
```

---

### Task 1: Compute the 30-year rainfall normal from real daily data

Background: `getHistoricalPrecipitation` requests `yearly=precipitation_sum` from the archive API. That parameter is invalid (HTTP 400, verified 2026-09-21), so the function has always fallen into its mock branch and returned `500 ± 100` mm at random. `daily=precipitation_sum` works.

**Files:**
- Modify: `src/services/open-meteo.ts` (function `getHistoricalPrecipitation`, plus one new exported helper)
- Modify: `src/ai/tools/get-drought-flood-risk-data.ts` (remove the 500 mm / Optimal fallback)
- Test: `src/test/precipitation-normal.test.ts`

**Interfaces:**
- Consumes: `ARCHIVE_API_URL`, `getTraceContext`, `logSystemMetric`, `logger`, `redactSensitive` (already imported in `open-meteo.ts`); `HistoricalPrecipitationData` (existing type, unchanged).
- Produces: `averageAnnualPrecipitationMm(times: string[], values: (number | null)[]): number | null` exported from `src/services/open-meteo.ts`. `getHistoricalPrecipitation(lat, lon)` keeps its signature and return shape (`yearly.precipitation_sum[0]` is the average annual mm, `yearly.time[0]` is `'1991-2020 Average'`) but now throws on failure.

- [ ] **Step 1: Write the failing tests**

Create `src/test/precipitation-normal.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { averageAnnualPrecipitationMm, getHistoricalPrecipitation } from '@/services/open-meteo';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

/** Build a daily series where every day of each listed year has the same value. */
function dailySeries(years: number[], perDayMm: number) {
  const times: string[] = [];
  const values: (number | null)[] = [];
  for (const year of years) {
    const d = new Date(Date.UTC(year, 0, 1));
    while (d.getUTCFullYear() === year) {
      times.push(d.toISOString().slice(0, 10));
      values.push(perDayMm);
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  return { times, values };
}

describe('averageAnnualPrecipitationMm', () => {
  it('averages the yearly totals of complete years', () => {
    const { times, values } = dailySeries([2001, 2002], 2); // 730 mm and 732 mm (2004 is not here)
    expect(averageAnnualPrecipitationMm(times, values)).toBeCloseTo(730, 0);
  });

  it('ignores null days but rejects years that are mostly missing', () => {
    const complete = dailySeries([2001], 1);
    const sparse = dailySeries([2002], 100);
    // Blank out all but 30 days of 2002 so it is not a usable year.
    sparse.values = sparse.values.map((v, i) => (i < 30 ? v : null));
    const times = [...complete.times, ...sparse.times];
    const values = [...complete.values, ...sparse.values];
    expect(averageAnnualPrecipitationMm(times, values)).toBeCloseTo(365, 0);
  });

  it('returns null when no year has enough data', () => {
    expect(averageAnnualPrecipitationMm(['2001-01-01'], [5])).toBeNull();
    expect(averageAnnualPrecipitationMm([], [])).toBeNull();
  });
});

describe('getHistoricalPrecipitation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests daily data, not the unsupported yearly parameter', async () => {
    const { times, values } = dailySeries([2001, 2002, 2003], 1.5);
    const fetchMock = vi.fn(() => okJson({ daily: { time: times, precipitation_sum: values } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await getHistoricalPrecipitation(20, 78);

    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain('daily=precipitation_sum');
    expect(calledUrl).not.toContain('yearly=');
    expect(data.yearly.time).toEqual(['1991-2020 Average']);
    expect(data.yearly.precipitation_sum[0]).toBeGreaterThan(540);
    expect(data.yearly.precipitation_sum[0]).toBeLessThan(555);
  });

  it('throws instead of returning a random mock when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getHistoricalPrecipitation(20, 78)).rejects.toThrow(/precipitation/i);
  });

  it('throws when the response has too little data to compute a normal', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson({ daily: { time: ['2001-01-01'], precipitation_sum: [1] } })));
    await expect(getHistoricalPrecipitation(20, 78)).rejects.toThrow(/precipitation/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/test/precipitation-normal.test.ts`
Expected: FAIL (`averageAnnualPrecipitationMm` is not exported; the existing function requests `yearly=` and returns a mock).

- [ ] **Step 3: Implement**

In `src/services/open-meteo.ts`, replace the whole `getHistoricalPrecipitation` function (from its doc comment through its closing brace, just above the `getSoilTypeName` doc comment) with:

```ts
/** A year needs at least this many non-null daily values to count towards the normal. */
const MIN_DAYS_PER_NORMAL_YEAR = 330;

/**
 * Averages annual precipitation totals from a daily series.
 * Only years with enough non-null days are used, so a gap-filled year does not drag the mean down.
 * @returns The mean yearly total in mm, or null when no year has enough data.
 */
export function averageAnnualPrecipitationMm(times: string[], values: (number | null)[]): number | null {
    const perYear = new Map<string, { sum: number; days: number }>();
    for (let i = 0; i < times.length; i++) {
        const value = values[i];
        if (value === null || value === undefined || Number.isNaN(value)) continue;
        const year = times[i].slice(0, 4);
        const entry = perYear.get(year) ?? { sum: 0, days: 0 };
        entry.sum += value;
        entry.days += 1;
        perYear.set(year, entry);
    }
    const totals = [...perYear.values()].filter(y => y.days >= MIN_DAYS_PER_NORMAL_YEAR).map(y => y.sum);
    if (totals.length === 0) return null;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
}

/**
 * Fetches the 1991-2020 average annual precipitation for a given location.
 * The archive API has no yearly aggregation, so this requests daily ERA5 data and aggregates it.
 * @param latitude The latitude of the location.
 * @param longitude The longitude of the location.
 * @returns A promise that resolves to the precipitation normal (`yearly.precipitation_sum[0]`, mm/year).
 * @throws If the API is unreachable or returns too little data. No mock data is returned.
 */
export async function getHistoricalPrecipitation(latitude: number, longitude: number): Promise<HistoricalPrecipitationData> {
    const traceId = getTraceContext()?.requestId;
    const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: '1991-01-01',
        end_date: '2020-12-31',
        daily: 'precipitation_sum',
        models: 'era5_seamless',
    });

    try {
        const response = await fetch(`${ARCHIVE_API_URL}?${params.toString()}`, {
            cache: 'no-store',
            headers: traceId ? { 'x-request-id': traceId } : undefined,
        });
        if (!response.ok) {
            throw new Error(`Open-Meteo Archive API returned an error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const average = averageAnnualPrecipitationMm(data?.daily?.time ?? [], data?.daily?.precipitation_sum ?? []);
        if (average === null) {
            throw new Error('Open-Meteo response had too little data to compute a precipitation normal');
        }

        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: true, metadata: { endpoint: 'historical_precipitation' } });

        return {
            latitude: data.latitude ?? latitude,
            longitude: data.longitude ?? longitude,
            generationtime_ms: data.generationtime_ms ?? 0,
            utc_offset_seconds: data.utc_offset_seconds ?? 0,
            timezone: data.timezone ?? 'UTC',
            timezone_abbreviation: data.timezone_abbreviation ?? 'UTC',
            elevation: data.elevation ?? 0,
            yearly_units: { time: 'string', precipitation_sum: 'mm' },
            yearly: { time: ['1991-2020 Average'], precipitation_sum: [average] },
        };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('historical_precipitation_fetch_failed', {
            scope: 'services.open-meteo',
            error: redactSensitive(message),
        });
        logSystemMetric({ metric_type: 'api_call', provider: 'open-meteo', is_success: false, error_message: message, metadata: { endpoint: 'historical_precipitation' } });
        throw new Error(`Failed to fetch precipitation normal: ${message}`);
    }
}
```

In `src/ai/tools/get-drought-flood-risk-data.ts`, delete the `catch` block that returns `averagePrecipitationMm: 500` / `'Optimal'` and the surrounding `try {`, so the errors propagate. The handler body becomes:

```ts
  async ({ latitude, longitude }) => {
    // Fetch data in parallel. Failures propagate: there is no safe default for real risk data.
    const [precipitationData, soilData] = await Promise.all([
      getHistoricalPrecipitation(latitude, longitude),
      getSoilAndWeatherData(latitude, longitude)
    ]);

    const moisture = getMoistureLevel(soilData.current.soil_moisture_0_to_1cm);
    const avgPrecipitation = precipitationData.yearly.precipitation_sum[0] || 0;

    return {
      averagePrecipitationMm: avgPrecipitation,
      currentMoistureLevel: moisture as 'Dry' | 'Optimal' | 'Wet'
    };
  }
```

- [ ] **Step 4: Run tests, typecheck and lint**

Run: `npx vitest run src/test/precipitation-normal.test.ts && npx tsc --noEmit && npx eslint --max-warnings=0 src/services/open-meteo.ts src/ai/tools/get-drought-flood-risk-data.ts src/test/precipitation-normal.test.ts`
Expected: all PASS. If eslint reports unused imports in the drought tool (for example `logger`), remove them.

- [ ] **Step 5: Verify against the real API (manual)**

Run in PowerShell (the sandbox's curl cannot reach Open-Meteo, PowerShell can):
`(Invoke-WebRequest -UseBasicParsing "https://archive-api.open-meteo.com/v1/archive?latitude=20&longitude=78&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&models=era5_seamless").StatusCode`
Expected: `200`. If it is not 200 (for example a request-size limit), change the implementation to request the 30 years in three 10-year chunks and merge the daily arrays, and re-run Step 4.

- [ ] **Step 6: Commit**

```bash
git add src/services/open-meteo.ts src/ai/tools/get-drought-flood-risk-data.ts src/test/precipitation-normal.test.ts
git commit -m "fix: compute 30-year rainfall normal from real daily data"
```

---

### Task 2: Stop fabricating historical weather

**Files:**
- Modify: `src/services/open-meteo.ts` (function `getHistoricalWeather`, remove the mock in its `catch`)
- Modify: `src/ai/flows/compute-metrics.ts` (around line 627, `computeMetricsFlow`)
- Test: `src/test/historical-weather.test.ts`

**Interfaces:**
- Consumes: `HistoricalWeatherData` (existing type).
- Produces: `getHistoricalWeather(lat, lon, startDate, endDate): Promise<HistoricalWeatherData>` now throws `Error('Failed to fetch historical weather: <reason>')` instead of returning random values. In `computeMetricsFlow`, a weather failure produces `historicalWeather: []` and a warning log.

- [ ] **Step 1: Write the failing test**

Create `src/test/historical-weather.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHistoricalWeather } from '@/services/open-meteo';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('getHistoricalWeather', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the API data unchanged on success', async () => {
    const body = {
      latitude: 20,
      longitude: 78,
      daily: { time: ['2026-01-01'], temperature_2m_mean: [21.5], precipitation_sum: [0] },
    };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const data = await getHistoricalWeather(20, 78, '2026-01-01', '2026-01-01');
    expect(data.daily.temperature_2m_mean).toEqual([21.5]);
  });

  it('throws instead of returning random mock weather when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getHistoricalWeather(20, 78, '2026-01-01', '2026-01-10')).rejects.toThrow(/historical weather/i);
  });

  it('throws on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 500, statusText: 'Server Error' } as Response))
    );
    await expect(getHistoricalWeather(20, 78, '2026-01-01', '2026-01-10')).rejects.toThrow(/historical weather/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/historical-weather.test.ts`
Expected: the two throw tests FAIL (the function returns mock data); the success test passes.

- [ ] **Step 3: Implement**

In `getHistoricalWeather`, replace everything in the `catch` block after the `logSystemMetric(...)` line (the `logger.warn('historical_weather_mock_fallback'...)` line, the whole mock generation loop and the mock `return {...}`) with:

```ts
        throw new Error(`Failed to fetch historical weather: ${message}`);
```

In `src/ai/flows/compute-metrics.ts`, change the `Promise.all` in `computeMetricsFlow` so weather failure does not fail the satellite analysis:

```ts
    const [eeData, weatherData, historicalBaseline] = await Promise.all([
        runEeAnalysis(input),
        getHistoricalWeather(input.latitude, input.longitude, input.startDate, input.endDate).catch((error: unknown) => {
            logger.warn('historical_weather_unavailable', {
                scope: 'ai.flows.compute-metrics',
                error: redactSensitive(error instanceof Error ? error.message : String(error)),
            });
            return null;
        }),
        getHistoricalBaseline(input.latitude, input.longitude)
    ]);

    const historicalWeatherResult: HistoricalDataPoint[] = weatherData
        ? weatherData.daily.time.map((date, index) => ({
            date: date,
            temperature: weatherData.daily.temperature_2m_mean[index],
            precipitation: weatherData.daily.precipitation_sum[index],
        }))
        : [];
```

If `logger` or `redactSensitive` are not yet imported in `compute-metrics.ts`, add `import { logger } from '@/lib/logger';` and `import { redactSensitive } from '@/lib/security';` (check the existing imports first).

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run && npx tsc --noEmit && npx eslint --max-warnings=0 src/services/open-meteo.ts src/ai/flows/compute-metrics.ts src/test/historical-weather.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/open-meteo.ts src/ai/flows/compute-metrics.ts src/test/historical-weather.test.ts
git commit -m "fix: stop returning random mock historical weather"
```

---

### Task 3: Remove the mock fallbacks in the crop and irrigation flows

**Files:**
- Modify: `src/ai/flows/plan-crops.ts` (the `catch` in `fetchClimateDataForCropPlanning`)
- Modify: `src/ai/flows/predict-crop-yield.ts` (the `catch` in `fetchRealClimateData`)
- Modify: `src/ai/flows/schedule-irrigation.ts` (the `catch` at the end of `scheduleIrrigation`)
- Modify: `src/ai/tools/get-soil-moisture.ts` (the `catch` that returns `'Optimal'`)

**Interfaces:**
- Consumes: `getHistoricalWeather` and `getSoilAndWeatherData`, which now throw on failure (Tasks 2 and the earlier soil fix).
- Produces: these flows and the tool reject with an `Error` whose message says which data was unavailable. `handleAction` (`src/lib/actions.ts`) already converts a thrown error into the error result shown to the user, so no caller change is needed.

There is no unit test for these: the flows call the LLM and Genkit, so the failure paths are covered by the tests of the service functions in Tasks 1 and 2. Verification for this task is the typecheck, a grep proving no mock strings remain, and the full suite.

- [ ] **Step 1: plan-crops**

In `src/ai/flows/plan-crops.ts`, replace the catch block:

```ts
  } catch (error) {
    console.warn('Using mock climate data for crop planning', error);
    const tempAdjustment = Math.abs(lat) / 90 * 15;
    return {
      avgAnnualTemp: (20 - tempAdjustment).toFixed(1),
      minTemp: (5 - tempAdjustment).toFixed(1),
      maxTemp: (30 - tempAdjustment / 2).toFixed(1),
      annualPrecipitation: '500',
      soilType: 'Loam',
      currentMoisture: 'Optimal' as const
    };
  }
```

with:

```ts
  } catch (error) {
    throw new Error(`Climate data for crop planning is unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
```

Also remove the invented defaults for empty data. Replace the three `: 20`, `: 0`, `: 35` fallbacks so an empty series throws instead:

```ts
    if (temps.length === 0) {
      throw new Error('No temperature observations were returned for this location');
    }
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const totalPrecip = precip.reduce((a, b) => a + b, 0);
```

(This replaces the four lines `const avgTemp ...` through `const totalPrecip ...`.)

- [ ] **Step 2: predict-crop-yield**

In `src/ai/flows/predict-crop-yield.ts`, replace the catch block that logs `Using mock climate data for crop yield` and returns `soilMoisture: '0.25'`, `moistureLevel: 'Optimal'`, `soilType: 'Loam'` with:

```ts
  } catch (error) {
    throw new Error(`Climate data for yield prediction is unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
```

and replace `const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 20;` with:

```ts
    if (temps.length === 0) {
      throw new Error('No temperature observations were returned for this location');
    }
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
```

Then find the later line `soilMoisture: Number.isFinite(soilMoisture) ? soilMoisture : 0.25,` (near line 120) and change it to use the value directly, since `soilMoisture` now always comes from a real fetch:

```ts
      soilMoisture,
```

If `Number.isFinite(soilMoisture)` is false at that point, the surrounding code should not continue: add before that object literal `if (!Number.isFinite(soilMoisture)) { throw new Error('Soil moisture is unavailable for this location'); }`.

- [ ] **Step 3: schedule-irrigation**

In `src/ai/flows/schedule-irrigation.ts`, replace the final catch block (the one that logs `Network error, using mock irrigation recommendation` and returns `'Irrigate within 24 hours'`, 1.5 inches) with:

```ts
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
```

- [ ] **Step 4: get-soil-moisture tool**

In `src/ai/tools/get-soil-moisture.ts`, keep the `logger.error(...)` call in the catch but replace the line `return { moistureLevel: 'Optimal' as const };` and its comment above with:

```ts
        throw error instanceof Error ? error : new Error(String(error));
```

- [ ] **Step 5: Verify no mock strings remain and everything passes**

Run: `npx tsc --noEmit && npx eslint --max-warnings=0 src/ai src/services && npx vitest run`
Expected: PASS.

Run: `grep -rn -i "mock\|Math.random" src/ai src/services --include=*.ts | grep -v "src/test"`
Expected: no lines that describe returning fabricated values (the only acceptable matches are in comments that explain the removal). If eslint flags now-unused variables such as `lat`, `lon` or imports, remove them.

- [ ] **Step 6: Commit**

```bash
git add src/ai
git commit -m "fix: remove mock climate, irrigation and soil moisture fallbacks"
```

---

### Task 4: Full verification and honest empty states

**Files:**
- Verify only, plus a small UI check: `src/components/visualizations.tsx` (line ~139) and `src/components/gis-dashboard.tsx` (line ~56) already tolerate an empty `historicalWeather` array.

- [ ] **Step 1: Confirm the UI tolerates empty weather**

Read `src/components/visualizations.tsx` around the `weatherMap` construction and the chart that consumes `historicalWeather`. If the weather chart renders an empty axis without any message when the array is empty, add a one-line note shown only when `analysisResult.historicalWeather.length === 0`, for example `Weather data was unavailable for this period.`, using the existing translation mechanism (add the key to `src/locales/en.json` and the other locale files as an English fallback string). If the chart is already hidden or labelled for the empty case, make no change.

- [ ] **Step 2: Run the whole quality gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 3: Manual smoke test (only if API keys are configured)**

Run `npm run dev`, open `http://localhost:9003/dashboard`, run an analysis for a point (default is fine), then check: the historical weather chart shows real values, and the drought/flood card shows an average precipitation that is stable across repeated runs (before this fix it changed between runs because it was random). If keys are not configured, say so in the final report instead of claiming the smoke test passed.

- [ ] **Step 4: Commit (only if Step 1 changed files)**

```bash
git add src/components src/locales
git commit -m "feat: show a message when weather data is unavailable"
```

---

## Self-Review

- **Coverage:** every fabricated-data site found in exploration is addressed: random historical weather (Task 2), random normals and the always-400 `yearly` call (Task 1), mock crop-plan/yield data (Task 3), the fixed irrigation recommendation (Task 3), the `Optimal` moisture fallback and the `500 mm` drought fallback (Tasks 1 and 3). The hardcoded default temperatures (`20`, `0`, `35`) are removed in Task 3.
- **Deferred on purpose:** `Measured<T>` provenance type, shared data clients, Supabase cache, SoilGrids soil texture, NASA POWER cross-check (Phase 1b).
- **Type consistency:** `averageAnnualPrecipitationMm` is defined in Task 1 and used only there. `getHistoricalWeather` and `getHistoricalPrecipitation` keep their signatures, so no caller types change.
- **Behavior change to announce to users:** when Open-Meteo is down, crop plan, yield, irrigation, drought/flood and soil moisture now return an error instead of plausible-looking numbers. This is intended.
