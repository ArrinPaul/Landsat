# Phase 1b: Data Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every external data fetch goes through one shared, tested client layer that returns values carrying their source, date and quality, caches expensive lookups in Supabase, cross-checks weather against a second source, and fills the soil type that is currently always "Unknown".

**Architecture:** A new `src/lib/data/` module holds small focused files: a `Measured<T>` provenance type, a shared `fetchJson` (timeout, retry, trace header, metrics), a Supabase-backed `withCache`, and one client per source (Open-Meteo forecast, NASA POWER, ISRIC SoilGrids). Clients throw or return `Measured` values with `status: 'unavailable'`; they never invent numbers. Existing flows are migrated to the shared clients one call site at a time, keeping their output shapes.

**Tech Stack:** Next.js server actions, TypeScript, Vitest (fetch stubbed with `vi.stubGlobal`), Supabase (service-role client in `src/lib/supabase.ts`), Open-Meteo, NASA POWER, ISRIC SoilGrids.

**Spec:** Phase 1 ("Data trust layer") of the overhaul plan at `C:\Users\Arrin Paul\.claude\plans\hey-so-i-was-inherited-sundae.md`. This is the follow-up (1b) that `docs/superpowers/plans/2026-09-21-phase1-remove-fabricated-data.md` deferred. Out of scope: Earth Engine sources (CHIRPS, SMAP), user-supplied data, UI badges for `Measured` (Phase 7).

## Global Constraints

- Verification before every commit: `npx tsc --noEmit`, `npx eslint --max-warnings=0 <changed files>`, `npx vitest run` all pass. A pre-commit hook also runs lint, typecheck and tests.
- TDD: write the failing test, watch it fail, then implement.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Do not stage `.claude/worktrees/frontend-rework` (pre-existing dirty pointer) or `.venv/`, `digest.txt`.
- Test files go in `src/test/`. Import app code with the `@/` alias. Vitest `include` is `src/test/**/*.test.ts`.
- No fabricated values: on failure return `unavailable` or throw. Never substitute a default number.
- Fetch stub helper (copy into each test file that needs it):

```ts
const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);
```

- Real response shapes (verified live 2026-10-10, do not change without re-checking):
  - NASA POWER `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=AG&latitude=..&longitude=..&start=YYYYMMDD&end=YYYYMMDD&format=JSON` returns `{"properties":{"parameter":{"T2M":{"20240101":19.09,...},"PRECTOTCORR":{...},"ALLSKY_SFC_SW_DWN":{...}}},"header":{"fill_value":-999.0}}`. Units: C, mm/day, MJ/m^2/day.
  - ISRIC SoilGrids `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=..&lat=..&property=clay&property=sand&property=silt&property=phh2o&property=soc&depth=0-5cm&value=mean` returns `{"properties":{"layers":[{"name":"clay","unit_measure":{"d_factor":10,...},"depths":[{"label":"0-5cm","values":{"mean":424}}]}, ...]}}`. Real value = `mean / d_factor` (clay 424 -> 42.4 %, phh2o 72 -> 7.2, soc 154 -> 15.4 g/kg). `mean` can be `null` (ocean, urban).

## Review Focus

Failure modes the spec implies but a happy-path test would miss. Each has a test in the owning task.

1. **Fill values from NASA POWER (-999) must become `null`, not enter an average** (Task 5).
2. **A series with too few valid days must not be reported as an annual total** (a 90-day gap silently halves "annual rainfall") (Task 6).
3. **Cache read or write failure (Supabase down, missing env) must never fail the user request** (Task 3).
4. **Two sources that disagree must be flagged with a lowered quality, not averaged silently** (Task 5).
5. **SoilGrids returns `null` for ocean/urban points and can be slow or 5xx; the flows must say "Unknown", not crash or guess** (Task 7).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/data/measured.ts` (create) | `Measured<T>` type and constructors |
| `src/lib/data/http.ts` (create) | `fetchJson` with timeout, retry, trace header, metric; `DataSourceError` |
| `src/lib/data/cache.ts` (create) | `cacheKey`, `DataCacheStore`, `withCache`, Supabase store |
| `supabase/migrations/0007_data_cache.sql` (create) | `data_cache` table |
| `src/lib/data/open-meteo-forecast.ts` (create) | Shared forecast client replacing 3 inlined URLs |
| `src/lib/data/nasa-power.ts` (create) | NASA POWER daily client + parser |
| `src/lib/data/cross-check.ts` (create) | `compareValues` agreement scoring (pure) |
| `src/lib/data/climate-cross-check.ts` (create) | Annual temperature/precipitation/solar from both sources |
| `src/lib/data/soilgrids.ts` (create) | SoilGrids client, USDA texture classifier, `describeSoil` |
| `src/services/open-meteo.ts` (modify) | Cache the 30-year normal |
| `src/ai/flows/get-weather-report.ts`, `schedule-irrigation.ts`, `get-advanced-crop-advice.ts` (modify) | Use shared forecast client |
| `src/ai/flows/plan-crops.ts`, `predict-crop-yield.ts`, `predict-soil-moisture.ts`, `schedule-irrigation.ts` (modify) | Use `describeSoil`; plan-crops uses cross-checked climate |

---

### Task 1: `Measured<T>` provenance type

**Files:**
- Create: `src/lib/data/measured.ts`
- Test: `src/test/measured.test.ts`

**Interfaces:**
- Produces:
  - `type MeasuredStatus = 'measured' | 'estimated' | 'unavailable'`
  - `interface Measured<T> { value: T | null; unit: string; source: string; observedAt: string | null; quality: number; status: MeasuredStatus; reason?: string }`
  - `measured<T>(value: T, init: { unit: string; source: string; observedAt?: string | null; quality?: number }): Measured<T>`
  - `estimated<T>(value: T, init: same): Measured<T>` (default quality 0.5)
  - `unavailable<T>(init: { unit: string; source: string; reason: string }): Measured<T>`
  - `isAvailable<T>(m: Measured<T>): m is Measured<T> & { value: T }`

- [ ] **Step 1: Write the failing test**

Create `src/test/measured.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { estimated, isAvailable, measured, unavailable } from '@/lib/data/measured';

describe('Measured', () => {
  it('builds a measured value with defaults', () => {
    const m = measured(21.5, { unit: 'C', source: 'Open-Meteo' });
    expect(m).toEqual({ value: 21.5, unit: 'C', source: 'Open-Meteo', observedAt: null, quality: 1, status: 'measured' });
    expect(isAvailable(m)).toBe(true);
  });

  it('clamps quality into 0..1 and treats NaN as 0', () => {
    expect(measured(1, { unit: 'x', source: 's', quality: 7 }).quality).toBe(1);
    expect(measured(1, { unit: 'x', source: 's', quality: -3 }).quality).toBe(0);
    expect(measured(1, { unit: 'x', source: 's', quality: Number.NaN }).quality).toBe(0);
  });

  it('marks estimated values with lower default quality', () => {
    const m = estimated(10, { unit: 'mm', source: 'model' });
    expect(m.status).toBe('estimated');
    expect(m.quality).toBe(0.5);
  });

  it('represents unavailable data without a value', () => {
    const m = unavailable<number>({ unit: 'mm', source: 'NASA POWER', reason: 'timeout' });
    expect(m).toEqual({ value: null, unit: 'mm', source: 'NASA POWER', observedAt: null, quality: 0, status: 'unavailable', reason: 'timeout' });
    expect(isAvailable(m)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/measured.test.ts`
Expected: FAIL, cannot resolve `@/lib/data/measured`.

- [ ] **Step 3: Implement**

Create `src/lib/data/measured.ts`:

```ts
/**
 * Provenance wrapper for every externally sourced number. A consumer must be
 * able to tell where a value came from, when, how much to trust it, and
 * whether it exists at all.
 */
export type MeasuredStatus = 'measured' | 'estimated' | 'unavailable';

export interface Measured<T> {
  value: T | null;
  unit: string;
  source: string;
  observedAt: string | null;
  /** 0..1. Agreement between sources, or a fixed value for single-source data. */
  quality: number;
  status: MeasuredStatus;
  /** Why the value is unavailable. Only set when status is 'unavailable'. */
  reason?: string;
}

interface MeasuredInit {
  unit: string;
  source: string;
  observedAt?: string | null;
  quality?: number;
}

function clampQuality(quality: number): number {
  if (Number.isNaN(quality)) return 0;
  return Math.min(1, Math.max(0, quality));
}

export function measured<T>(value: T, init: MeasuredInit): Measured<T> {
  return {
    value,
    unit: init.unit,
    source: init.source,
    observedAt: init.observedAt ?? null,
    quality: clampQuality(init.quality ?? 1),
    status: 'measured',
  };
}

export function estimated<T>(value: T, init: MeasuredInit): Measured<T> {
  return { ...measured(value, { ...init, quality: init.quality ?? 0.5 }), status: 'estimated' };
}

export function unavailable<T>(init: { unit: string; source: string; reason: string }): Measured<T> {
  return {
    value: null,
    unit: init.unit,
    source: init.source,
    observedAt: null,
    quality: 0,
    status: 'unavailable',
    reason: init.reason,
  };
}

export function isAvailable<T>(m: Measured<T>): m is Measured<T> & { value: T } {
  return m.status !== 'unavailable' && m.value !== null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/test/measured.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/measured.ts src/test/measured.test.ts
git commit -m "feat: add Measured<T> provenance type"
```

---

### Task 2: Shared `fetchJson` client

Background: `open-meteo.ts` repeats the same fetch, trace header, metric and error handling in every function, and three flows fetch Open-Meteo with bare `fetch`, no timeout and no retry.

**Files:**
- Create: `src/lib/data/http.ts`
- Test: `src/test/data-http.test.ts`

**Interfaces:**
- Consumes: `getTraceContext` (`@/lib/trace`), `logSystemMetric` (`@/lib/metrics`), `logger` (`@/lib/logger`), `redactSensitive` (`@/lib/security`).
- Produces:
  - `class DataSourceError extends Error { provider: string; status?: number }`
  - `interface FetchJsonOptions { provider: string; endpoint: string; timeoutMs?: number; retries?: number; retryDelayMs?: number; headers?: Record<string, string> }`
  - `fetchJson<T = unknown>(url: string, options: FetchJsonOptions): Promise<T>`. Defaults: `timeoutMs` 10000, `retries` 2, `retryDelayMs` 300 (multiplied by attempt number). Retries on network error, HTTP 429 and 5xx. Does not retry other 4xx. Throws `DataSourceError`.

- [ ] **Step 1: Write the failing test**

Create `src/test/data-http.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataSourceError, fetchJson } from '@/lib/data/http';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);
const status = (code: number, text = 'err') =>
  Promise.resolve({ ok: false, status: code, statusText: text, json: () => Promise.resolve({}) } as Response);

const opts = { provider: 'test', endpoint: 'x', retryDelayMs: 0 };

describe('fetchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed JSON and passes an abort signal', async () => {
    const fetchMock = vi.fn(() => okJson({ a: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://example.test/a', opts)).resolves.toEqual({ a: 1 });
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('retries a 503 and then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => status(503, 'Unavailable'))
      .mockImplementationOnce(() => okJson({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://example.test/a', opts)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a network error up to the retry limit then throws DataSourceError', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('network down')));
    vi.stubGlobal('fetch', fetchMock);
    const promise = fetchJson('https://example.test/a', { ...opts, retries: 2 });
    await expect(promise).rejects.toBeInstanceOf(DataSourceError);
    await expect(promise).rejects.toThrow(/network down/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a 404', async () => {
    const fetchMock = vi.fn(() => status(404, 'Not Found'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://example.test/a', opts)).rejects.toMatchObject({ status: 404, provider: 'test' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => status(429, 'Too Many Requests'))
      .mockImplementationOnce(() => okJson({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchJson('https://example.test/a', opts)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/data-http.test.ts`
Expected: FAIL, cannot resolve `@/lib/data/http`.

- [ ] **Step 3: Implement**

Create `src/lib/data/http.ts`:

```ts
import { logger } from '@/lib/logger';
import { logSystemMetric } from '@/lib/metrics';
import { redactSensitive } from '@/lib/security';
import { getTraceContext } from '@/lib/trace';

export class DataSourceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export interface FetchJsonOptions {
  provider: string;
  endpoint: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  headers?: Record<string, string>;
}

const isRetryable = (status: number) => status === 429 || status >= 500;
const sleep = (ms: number) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

/**
 * GETs a URL and parses JSON with a timeout, bounded retries and a system metric.
 * @throws DataSourceError after the last attempt fails. Never returns fabricated data.
 */
export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions): Promise<T> {
  const { provider, endpoint } = options;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const attempts = (options.retries ?? 2) + 1;
  const retryDelayMs = options.retryDelayMs ?? 300;
  const traceId = getTraceContext()?.requestId;

  let lastError: DataSourceError | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let retryable = true;
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ...(traceId ? { 'x-request-id': traceId } : {}), ...options.headers },
      });
      if (response.ok) {
        const data = (await response.json()) as T;
        logSystemMetric({ metric_type: 'api_call', provider, is_success: true, metadata: { endpoint } });
        return data;
      }
      lastError = new DataSourceError(
        `${provider} returned an error: ${response.status} ${response.statusText}`,
        provider,
        response.status,
      );
      retryable = isRetryable(response.status);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = new DataSourceError(`${provider} request failed: ${message}`, provider);
    }
    if (!retryable) break;
    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  const failure = lastError ?? new DataSourceError(`${provider} request failed`, provider);
  logger.error('data_source_fetch_failed', {
    scope: 'lib.data.http',
    provider,
    endpoint,
    error: redactSensitive(failure.message),
  });
  logSystemMetric({
    metric_type: 'api_call',
    provider,
    is_success: false,
    error_message: failure.message,
    metadata: { endpoint },
  });
  throw failure;
}
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npx vitest run src/test/data-http.test.ts` (PASS, 5 tests), `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data/http.ts src/test/data-http.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/http.ts src/test/data-http.test.ts
git commit -m "feat: add shared fetchJson client with timeout and retry"
```

---

### Task 3: Supabase-backed cache

Background: `src/ai/cache.ts` is a per-process `Map` with a 5 minute TTL, which is lost on every serverless cold start and not shared across instances. Expensive, slow-changing lookups (the 30-year rainfall normal, soil texture) need a shared cache.

**Files:**
- Create: `supabase/migrations/0007_data_cache.sql`, `src/lib/data/cache.ts`
- Test: `src/test/data-cache.test.ts`

**Interfaces:**
- Consumes: `getSupabase` (`@/lib/supabase`), `logger`.
- Produces:
  - `cacheKey(source: string, latitude: number, longitude: number, ...parts: Array<string | number>): string` (lat/lon rounded to 2 decimals, about 1 km)
  - `interface DataCacheStore { get(key: string): Promise<unknown | undefined>; set(key: string, value: unknown, ttlSeconds: number): Promise<void> }`
  - `createSupabaseStore(): DataCacheStore`
  - `withCache<T>(key: string, ttlSeconds: number, loader: () => Promise<T>, store?: DataCacheStore): Promise<T>`. Cache read and write failures are logged and ignored. Loader errors propagate and are not cached.

- [ ] **Step 1: Write the failing test**

Create `src/test/data-cache.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';

function memoryStore(): DataCacheStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => {
      data.set(key, value);
    },
  };
}

describe('cacheKey', () => {
  it('rounds coordinates to 2 decimals and appends parts', () => {
    expect(cacheKey('soilgrids', 20.50432, 78.9111)).toBe('soilgrids:20.50:78.91');
    expect(cacheKey('om-normal', 20.5, 78.9, '1991-2020')).toBe('om-normal:20.50:78.90:1991-2020');
  });
});

describe('withCache', () => {
  it('loads once and serves the second call from the store', async () => {
    const store = memoryStore();
    const loader = vi.fn(async () => ({ mm: 812 }));
    expect(await withCache('k', 60, loader, store)).toEqual({ mm: 812 });
    expect(await withCache('k', 60, loader, store)).toEqual({ mm: 812 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache loader failures', async () => {
    const store = memoryStore();
    const loader = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(5);
    await expect(withCache('k', 60, loader, store)).rejects.toThrow('boom');
    expect(await withCache('k', 60, loader, store)).toBe(5);
  });

  it('still returns the loaded value when the store read and write both fail', async () => {
    const store: DataCacheStore = {
      get: async () => {
        throw new Error('supabase down');
      },
      set: async () => {
        throw new Error('supabase down');
      },
    };
    expect(await withCache('k', 60, async () => 42, store)).toBe(42);
  });

  it('caches a null result so a missing-data answer is not refetched', async () => {
    const store = memoryStore();
    const loader = vi.fn(async () => null);
    await withCache('k', 60, loader, store);
    await withCache('k', 60, loader, store);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/data-cache.test.ts`
Expected: FAIL, cannot resolve `@/lib/data/cache`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0007_data_cache.sql`:

```sql
-- Shared cache for slow-changing external lookups (30-year rainfall normal,
-- soil texture). Replaces per-process in-memory caches for these values.
create table if not exists data_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists data_cache_expires_at_idx on data_cache(expires_at);

-- Service role only: RLS on with no policies denies all other roles.
alter table data_cache enable row level security;
```

- [ ] **Step 4: Implement**

Create `src/lib/data/cache.ts`:

```ts
import { logger } from '@/lib/logger';
import { getSupabase } from '@/lib/supabase';

export interface DataCacheStore {
  /** Returns the cached value, or `undefined` when missing or expired. */
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

/** Rounds to 2 decimals (about 1 km) so nearby requests share an entry. */
export function cacheKey(source: string, latitude: number, longitude: number, ...parts: Array<string | number>): string {
  const base = `${source}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  return parts.length > 0 ? `${base}:${parts.join(':')}` : base;
}

export function createSupabaseStore(): DataCacheStore {
  return {
    async get(key) {
      const { data, error } = await getSupabase()
        .from('data_cache')
        .select('value, expires_at')
        .eq('key', key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return undefined;
      return new Date(data.expires_at as string).getTime() > Date.now() ? data.value : undefined;
    },
    async set(key, value, ttlSeconds) {
      const { error } = await getSupabase()
        .from('data_cache')
        .upsert({ key, value, expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString() });
      if (error) throw new Error(error.message);
    },
  };
}

/**
 * Returns the cached value for `key`, otherwise runs `loader` and caches its
 * result. The cache is an optimisation: any store failure is logged and
 * ignored, and loader errors propagate without being cached.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  store: DataCacheStore = createSupabaseStore(),
): Promise<T> {
  try {
    const hit = await store.get(key);
    if (hit !== undefined) return hit as T;
  } catch (error: unknown) {
    logger.warn('data_cache_read_failed', { scope: 'lib.data.cache', key, error: String(error) });
  }

  const value = await loader();

  try {
    await store.set(key, value, ttlSeconds);
  } catch (error: unknown) {
    logger.warn('data_cache_write_failed', { scope: 'lib.data.cache', key, error: String(error) });
  }
  return value;
}
```

If `logger.warn` does not exist, check `src/lib/logger.ts` and use its available level (`error` or `info`) instead.

- [ ] **Step 5: Run tests, typecheck, lint, commit**

Run: `npx vitest run src/test/data-cache.test.ts` (PASS, 5 tests), `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data/cache.ts src/test/data-cache.test.ts`

```bash
git add supabase/migrations/0007_data_cache.sql src/lib/data/cache.ts src/test/data-cache.test.ts
git commit -m "feat: add Supabase-backed data cache with fail-open reads and writes"
```

---

### Task 4: Shared Open-Meteo forecast client

Background: three flows build their own forecast URL and call bare `fetch` with no timeout or retry: `get-weather-report.ts:14`, `schedule-irrigation.ts:19`, `get-advanced-crop-advice.ts:23`.

**Files:**
- Create: `src/lib/data/open-meteo-forecast.ts`
- Modify: `src/ai/flows/get-weather-report.ts` (function `fetchRealWeatherData`), `src/ai/flows/schedule-irrigation.ts` (function `fetchWeatherForecast`), `src/ai/flows/get-advanced-crop-advice.ts` (the `weatherUrl` fetch in `fetchRealClimateData`)
- Test: `src/test/open-meteo-forecast.test.ts`

**Interfaces:**
- Consumes: `fetchJson` (Task 2).
- Produces:
  - `interface ForecastRequest { latitude: number; longitude: number; current?: string[]; hourly?: string[]; daily?: string[]; forecastDays?: number }`
  - `interface ForecastResponse` (fields documented as present only when requested; typed as required because callers already select their own fields)
  - `buildForecastUrl(request: ForecastRequest): string`
  - `getForecast(request: ForecastRequest): Promise<ForecastResponse>` (throws `DataSourceError`)

- [ ] **Step 1: Write the failing test**

Create `src/test/open-meteo-forecast.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildForecastUrl, getForecast } from '@/lib/data/open-meteo-forecast';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

describe('buildForecastUrl', () => {
  it('includes only requested sections', () => {
    const url = new URL(
      buildForecastUrl({ latitude: 20.5, longitude: 78.9, current: ['temperature_2m', 'weather_code'], forecastDays: 1 }),
    );
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('20.5');
    expect(url.searchParams.get('current')).toBe('temperature_2m,weather_code');
    expect(url.searchParams.get('daily')).toBeNull();
    expect(url.searchParams.get('forecast_days')).toBe('1');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });

  it('defaults to 7 forecast days', () => {
    const url = new URL(buildForecastUrl({ latitude: 1, longitude: 2, daily: ['precipitation_sum'] }));
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('daily')).toBe('precipitation_sum');
  });
});

describe('getForecast', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the parsed forecast', async () => {
    const body = { latitude: 20, longitude: 78, daily: { time: ['2026-10-10'], precipitation_sum: [1.2] } };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const data = await getForecast({ latitude: 20, longitude: 78, daily: ['precipitation_sum'] });
    expect(data.daily.precipitation_sum).toEqual([1.2]);
  });

  it('throws when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    await expect(getForecast({ latitude: 20, longitude: 78, daily: ['precipitation_sum'], })).rejects.toThrow(/network down/);
  });
});
```

Note: the failure test hits the default retry delays (300 ms and 600 ms), which is acceptable. If it makes the suite noticeably slow, pass `retryDelayMs` through the request interface.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/open-meteo-forecast.test.ts`
Expected: FAIL, cannot resolve module.

- [ ] **Step 3: Implement**

Create `src/lib/data/open-meteo-forecast.ts`:

```ts
import { fetchJson } from '@/lib/data/http';

const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';

export interface ForecastRequest {
  latitude: number;
  longitude: number;
  current?: string[];
  hourly?: string[];
  daily?: string[];
  /** Defaults to 7. */
  forecastDays?: number;
}

/**
 * Open-Meteo only returns the variables a caller requested; each field below is
 * present only if it was in the matching list of the request.
 */
export interface ForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    precipitation: number;
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    evapotranspiration: (number | null)[];
  };
}

export function buildForecastUrl(request: ForecastRequest): string {
  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    timezone: 'auto',
    forecast_days: String(request.forecastDays ?? 7),
  });
  if (request.current?.length) params.set('current', request.current.join(','));
  if (request.hourly?.length) params.set('hourly', request.hourly.join(','));
  if (request.daily?.length) params.set('daily', request.daily.join(','));
  return `${FORECAST_API_URL}?${params.toString()}`;
}

/** @throws DataSourceError if Open-Meteo is unreachable or returns an error. */
export function getForecast(request: ForecastRequest): Promise<ForecastResponse> {
  return fetchJson<ForecastResponse>(buildForecastUrl(request), {
    provider: 'open-meteo',
    endpoint: 'forecast',
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/test/open-meteo-forecast.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Migrate the three call sites**

`src/ai/flows/get-weather-report.ts`: replace the body of `fetchRealWeatherData` with

```ts
import { getForecast } from '@/lib/data/open-meteo-forecast';

async function fetchRealWeatherData(latitude: number, longitude: number) {
  return getForecast({
    latitude,
    longitude,
    current: ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'weather_code'],
    hourly: ['temperature_2m', 'weather_code'],
    forecastDays: 1,
  });
}
```

`src/ai/flows/schedule-irrigation.ts`: replace the body of `fetchWeatherForecast` with

```ts
import { getForecast } from '@/lib/data/open-meteo-forecast';

async function fetchWeatherForecast(lat: number, lon: number) {
  return getForecast({
    latitude: lat,
    longitude: lon,
    daily: ['precipitation_sum', 'temperature_2m_max', 'evapotranspiration'],
    forecastDays: 7,
  });
}
```

`src/ai/flows/get-advanced-crop-advice.ts`: replace the `weatherUrl`, `fetch` and `response.ok` block (first lines of `fetchRealClimateData`) with

```ts
import { getForecast } from '@/lib/data/open-meteo-forecast';

  const weatherData = await getForecast({
    latitude: lat,
    longitude: lon,
    current: ['temperature_2m', 'precipitation', 'weather_code'],
    daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum'],
    forecastDays: 7,
  });
```

Keep the rest of each function unchanged; place the `import` lines with the other imports at the top of the file. Run `npx tsc --noEmit` and fix any type error with optional chaining, not casts.

- [ ] **Step 6: Verify no inlined forecast URLs remain, run everything, commit**

Run: `grep -rn "api.open-meteo.com" src --include=*.ts --include=*.tsx | grep -v "src/test\|src/lib/data\|src/services/open-meteo.ts"`
Expected: no output.

Run: `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data src/ai/flows/get-weather-report.ts src/ai/flows/schedule-irrigation.ts src/ai/flows/get-advanced-crop-advice.ts`, `npx vitest run`

```bash
git add src/lib/data/open-meteo-forecast.ts src/test/open-meteo-forecast.test.ts src/ai/flows/get-weather-report.ts src/ai/flows/schedule-irrigation.ts src/ai/flows/get-advanced-crop-advice.ts
git commit -m "refactor: route forecast fetches through shared Open-Meteo client"
```

---

### Task 5: NASA POWER client and cross-check scoring

**Files:**
- Create: `src/lib/data/nasa-power.ts`, `src/lib/data/cross-check.ts`
- Test: `src/test/nasa-power.test.ts`, `src/test/cross-check.test.ts`

**Interfaces:**
- Consumes: `fetchJson` (Task 2).
- Produces:
  - `interface PowerDaily { dates: string[]; temperatureC: (number | null)[]; precipitationMm: (number | null)[]; solarMjM2: (number | null)[] }` (`dates` are `YYYY-MM-DD`)
  - `parsePowerDaily(body: unknown): PowerDaily` (throws if the response has no `T2M`)
  - `getPowerDaily(latitude: number, longitude: number, startDate: string, endDate: string): Promise<PowerDaily>` (dates `YYYY-MM-DD`)
  - `interface Agreement { relativeDifference: number; quality: number; flagged: boolean }`
  - `compareValues(a: number, b: number, options: { floor: number; tolerance?: number }): Agreement`

- [ ] **Step 1: Write the failing tests**

Create `src/test/nasa-power.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPowerDaily, parsePowerDaily } from '@/lib/data/nasa-power';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

const body = {
  properties: {
    parameter: {
      T2M: { '20240101': 19.09, '20240102': 19.1, '20240103': -999 },
      PRECTOTCORR: { '20240101': 0, '20240102': 0.12, '20240103': 4.5 },
      ALLSKY_SFC_SW_DWN: { '20240101': 14.01, '20240102': -999, '20240103': 12.8 },
    },
  },
  header: { fill_value: -999 },
};

describe('parsePowerDaily', () => {
  it('converts dates to ISO and fill values to null', () => {
    const parsed = parsePowerDaily(body);
    expect(parsed.dates).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(parsed.temperatureC).toEqual([19.09, 19.1, null]);
    expect(parsed.precipitationMm).toEqual([0, 0.12, 4.5]);
    expect(parsed.solarMjM2).toEqual([14.01, null, 12.8]);
  });

  it('throws when the response has no temperature series', () => {
    expect(() => parsePowerDaily({ properties: { parameter: {} } })).toThrow(/NASA POWER/);
    expect(() => parsePowerDaily(null)).toThrow(/NASA POWER/);
  });
});

describe('getPowerDaily', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the compact date format and the AG community', async () => {
    const fetchMock = vi.fn(() => okJson(body));
    vi.stubGlobal('fetch', fetchMock);
    await getPowerDaily(20.5, 78.9, '2024-01-01', '2024-01-03');
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get('start')).toBe('20240101');
    expect(url.searchParams.get('end')).toBe('20240103');
    expect(url.searchParams.get('community')).toBe('AG');
    expect(url.searchParams.get('parameters')).toBe('T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN');
  });
});
```

Create `src/test/cross-check.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { compareValues } from '@/lib/data/cross-check';

describe('compareValues', () => {
  it('scores close values as high quality and not flagged', () => {
    const r = compareValues(800, 820, { floor: 100 });
    expect(r.flagged).toBe(false);
    expect(r.quality).toBeCloseTo(1 - 20 / 820, 5);
  });

  it('flags values that differ by more than the tolerance', () => {
    const r = compareValues(500, 900, { floor: 100 });
    expect(r.flagged).toBe(true);
    expect(r.relativeDifference).toBeCloseTo(400 / 900, 5);
    expect(r.quality).toBeCloseTo(1 - 400 / 900, 5);
  });

  it('uses the floor so tiny values do not explode the ratio', () => {
    // 0.5 vs 1.5 degrees is a 1 degree gap, not a 200% disagreement
    const r = compareValues(0.5, 1.5, { floor: 10 });
    expect(r.relativeDifference).toBeCloseTo(0.1, 5);
    expect(r.flagged).toBe(false);
  });

  it('honours a custom tolerance', () => {
    expect(compareValues(100, 110, { floor: 1, tolerance: 0.05 }).flagged).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/test/nasa-power.test.ts src/test/cross-check.test.ts`
Expected: FAIL, cannot resolve modules.

- [ ] **Step 3: Implement**

Create `src/lib/data/nasa-power.ts`:

```ts
import { fetchJson } from '@/lib/data/http';

const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
/** NASA POWER uses -999 for missing values. */
const FILL_VALUE = -999;

export interface PowerDaily {
  /** YYYY-MM-DD */
  dates: string[];
  temperatureC: (number | null)[];
  precipitationMm: (number | null)[];
  solarMjM2: (number | null)[];
}

type Series = Record<string, unknown>;

const toIsoDate = (compact: string) => `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
const toCompact = (iso: string) => iso.replaceAll('-', '');
const clean = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value !== FILL_VALUE ? value : null;

export function parsePowerDaily(body: unknown): PowerDaily {
  const parameter = (body as { properties?: { parameter?: Record<string, Series> } } | null)?.properties?.parameter;
  const temperature = parameter?.T2M;
  if (!temperature || typeof temperature !== 'object') {
    throw new Error('NASA POWER response contained no temperature series');
  }
  const precipitation = parameter?.PRECTOTCORR ?? {};
  const solar = parameter?.ALLSKY_SFC_SW_DWN ?? {};
  const days = Object.keys(temperature).sort();
  return {
    dates: days.map(toIsoDate),
    temperatureC: days.map((day) => clean(temperature[day])),
    precipitationMm: days.map((day) => clean(precipitation[day])),
    solarMjM2: days.map((day) => clean(solar[day])),
  };
}

/**
 * Daily temperature, corrected precipitation and surface solar radiation.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @throws DataSourceError on network/HTTP failure, Error if the body is unusable.
 */
export async function getPowerDaily(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
): Promise<PowerDaily> {
  const params = new URLSearchParams({
    parameters: 'T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN',
    community: 'AG',
    latitude: String(latitude),
    longitude: String(longitude),
    start: toCompact(startDate),
    end: toCompact(endDate),
    format: 'JSON',
  });
  const body = await fetchJson<unknown>(`${POWER_URL}?${params.toString()}`, {
    provider: 'nasa-power',
    endpoint: 'daily_point',
    timeoutMs: 30_000,
  });
  return parsePowerDaily(body);
}
```

Create `src/lib/data/cross-check.ts`:

```ts
export interface Agreement {
  /** |a - b| relative to the larger magnitude (or `floor`). */
  relativeDifference: number;
  /** 1 means identical, 0 means the sources are completely different. */
  quality: number;
  flagged: boolean;
}

/**
 * Compares the same quantity from two independent sources.
 * `floor` stops a near-zero value (e.g. 0.5 C) from turning a small absolute
 * gap into a huge ratio; use a typical magnitude for the variable.
 */
export function compareValues(a: number, b: number, options: { floor: number; tolerance?: number }): Agreement {
  const tolerance = options.tolerance ?? 0.25;
  const denominator = Math.max(Math.abs(a), Math.abs(b), options.floor);
  const relativeDifference = Math.abs(a - b) / denominator;
  return {
    relativeDifference,
    quality: Math.min(1, Math.max(0, 1 - relativeDifference)),
    flagged: relativeDifference > tolerance,
  };
}
```

- [ ] **Step 4: Run tests, typecheck, lint, commit**

Run: `npx vitest run src/test/nasa-power.test.ts src/test/cross-check.test.ts` (PASS, 7 tests), `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data/nasa-power.ts src/lib/data/cross-check.ts src/test/nasa-power.test.ts src/test/cross-check.test.ts`

```bash
git add src/lib/data/nasa-power.ts src/lib/data/cross-check.ts src/test/nasa-power.test.ts src/test/cross-check.test.ts
git commit -m "feat: add NASA POWER client and cross-source agreement scoring"
```

---

### Task 6: Cross-checked annual climate

**Files:**
- Create: `src/lib/data/climate-cross-check.ts`
- Modify: `src/ai/flows/plan-crops.ts` (function `planCrops`, the `realClimateData` string)
- Test: `src/test/climate-cross-check.test.ts`

**Interfaces:**
- Consumes: `getHistoricalWeather(lat, lon, startDate, endDate): Promise<HistoricalWeatherData>` from `@/services/open-meteo` (`daily.time`, `daily.temperature_2m_mean`, `daily.precipitation_sum`); `getPowerDaily` (Task 5); `compareValues` (Task 5); `measured`, `unavailable`, `Measured` (Task 1).
- Produces:
  - `interface CrossCheckedClimate { temperatureC: Measured<number>; precipitationMm: Measured<number>; solarMjM2: Measured<number>; notes: string[] }`
  - `getCrossCheckedClimate(latitude: number, longitude: number, now?: Date): Promise<CrossCheckedClimate>`. Never throws. Window is the 365 days ending 7 days before `now` (both sources are complete by then). A source needs at least 330 valid days to count.
  - `describeClimateQuality(climate: CrossCheckedClimate): string`

- [ ] **Step 1: Write the failing test**

Create `src/test/climate-cross-check.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/open-meteo', () => ({ getHistoricalWeather: vi.fn() }));
vi.mock('@/lib/data/nasa-power', () => ({ getPowerDaily: vi.fn() }));

import { describeClimateQuality, getCrossCheckedClimate } from '@/lib/data/climate-cross-check';
import { getPowerDaily } from '@/lib/data/nasa-power';
import { getHistoricalWeather } from '@/services/open-meteo';

const NOW = new Date('2026-10-10T00:00:00Z');

function days(count: number) {
  return Array.from({ length: count }, (_, i) => `d${i}`);
}
const omSeries = (count: number, temp: number, precip: number) => ({
  daily: {
    time: days(count),
    temperature_2m_mean: Array(count).fill(temp),
    precipitation_sum: Array(count).fill(precip),
  },
});
const powerSeries = (count: number, temp: number, precip: number, solar = 15) => ({
  dates: days(count),
  temperatureC: Array(count).fill(temp),
  precipitationMm: Array(count).fill(precip),
  solarMjM2: Array(count).fill(solar),
});

describe('getCrossCheckedClimate', () => {
  afterEach(() => vi.clearAllMocks());

  it('combines two agreeing sources with high quality', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 2) as never);
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25.4, 2.1) as never);
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.status).toBe('measured');
    expect(c.temperatureC.value).toBeCloseTo(25.2, 1);
    expect(c.temperatureC.quality).toBeGreaterThan(0.9);
    expect(c.precipitationMm.value).toBeCloseTo(((365 * 2 + 365 * 2.1) / 2), 0);
    expect(c.solarMjM2.value).toBeCloseTo(15, 5);
    // solar is single-source by design; temperature and precipitation agree, so no caveat for them
    expect(c.notes.some((n) => /temperature|precipitation/.test(n))).toBe(false);
  });

  it('flags and lowers quality when the sources disagree', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 1) as never); // 365 mm
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25, 3) as never); // 1095 mm
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.precipitationMm.quality).toBeLessThan(0.5);
    expect(c.notes.join(' ')).toMatch(/precipitation/i);
    expect(c.notes.join(' ')).toMatch(/differ/i);
  });

  it('falls back to the one working source with reduced quality', async () => {
    vi.mocked(getHistoricalWeather).mockRejectedValue(new Error('down'));
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 20, 2) as never);
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.value).toBeCloseTo(20, 5);
    expect(c.temperatureC.source).toBe('NASA POWER');
    expect(c.temperatureC.quality).toBeLessThan(1);
    expect(c.notes.join(' ')).toMatch(/single source/i);
  });

  it('reports unavailable, never a default number, when both sources fail', async () => {
    vi.mocked(getHistoricalWeather).mockRejectedValue(new Error('down'));
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.status).toBe('unavailable');
    expect(c.temperatureC.value).toBeNull();
    expect(c.precipitationMm.status).toBe('unavailable');
    expect(c.solarMjM2.status).toBe('unavailable');
  });

  it('does not report an annual total from a series with large gaps', async () => {
    // 100 valid days only: summing them would silently understate annual rain
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(100, 25, 2) as never);
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.precipitationMm.status).toBe('unavailable');
    expect(c.precipitationMm.reason).toMatch(/valid days/i);
  });

  it('ignores null days when counting and averaging', async () => {
    const om = omSeries(365, 25, 2);
    om.daily.temperature_2m_mean[0] = null as never;
    om.daily.precipitation_sum[0] = null as never;
    vi.mocked(getHistoricalWeather).mockResolvedValue(om as never);
    vi.mocked(getPowerDaily).mockRejectedValue(new Error('down'));
    const c = await getCrossCheckedClimate(20.5, 78.9, NOW);
    expect(c.temperatureC.value).toBeCloseTo(25, 5);
    expect(c.precipitationMm.value).toBeCloseTo(364 * 2, 5);
  });
});

describe('describeClimateQuality', () => {
  it('summarises sources, quality and notes for a prompt', async () => {
    vi.mocked(getHistoricalWeather).mockResolvedValue(omSeries(365, 25, 2) as never);
    vi.mocked(getPowerDaily).mockResolvedValue(powerSeries(365, 25, 2) as never);
    const text = describeClimateQuality(await getCrossCheckedClimate(20.5, 78.9, NOW));
    expect(text).toMatch(/Open-Meteo/);
    expect(text).toMatch(/NASA POWER/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/climate-cross-check.test.ts`
Expected: FAIL, cannot resolve `@/lib/data/climate-cross-check`.

- [ ] **Step 3: Implement**

Create `src/lib/data/climate-cross-check.ts`:

```ts
import { compareValues } from '@/lib/data/cross-check';
import { isAvailable, measured, unavailable, type Measured } from '@/lib/data/measured';
import { getPowerDaily } from '@/lib/data/nasa-power';
import { getHistoricalWeather } from '@/services/open-meteo';

const OPEN_METEO = 'Open-Meteo ERA5';
const NASA_POWER = 'NASA POWER';
/** A source must have at least this many valid days (of 365) to be trusted. */
const MIN_VALID_DAYS = 330;
/** Quality assigned when only one source answered, so nothing was cross-checked. */
const SINGLE_SOURCE_QUALITY = 0.7;

export interface CrossCheckedClimate {
  temperatureC: Measured<number>;
  precipitationMm: Measured<number>;
  solarMjM2: Measured<number>;
  notes: string[];
}

interface SourceStat {
  value: number | null;
  reason?: string;
}

const valid = (series: (number | null)[]) => series.filter((v): v is number => typeof v === 'number');

function stat(series: (number | null)[] | undefined, kind: 'mean' | 'sum'): SourceStat {
  const values = valid(series ?? []);
  if (values.length < MIN_VALID_DAYS) {
    return { value: null, reason: `only ${values.length} valid days (need ${MIN_VALID_DAYS})` };
  }
  const total = values.reduce((a, b) => a + b, 0);
  return { value: kind === 'mean' ? total / values.length : total };
}

const iso = (d: Date) => d.toISOString().split('T')[0];

interface CombineInit {
  label: string;
  unit: string;
  floor: number;
  observedAt: string;
  notes: string[];
}

function combine(om: SourceStat, power: SourceStat, init: CombineInit): Measured<number> {
  const { label, unit, floor, observedAt, notes } = init;
  if (om.value !== null && power.value !== null) {
    const agreement = compareValues(om.value, power.value, { floor });
    if (agreement.flagged) {
      notes.push(
        `${label}: ${OPEN_METEO} (${om.value.toFixed(1)}) and ${NASA_POWER} (${power.value.toFixed(1)}) differ by ${(
          agreement.relativeDifference * 100
        ).toFixed(0)}%`,
      );
    }
    return measured((om.value + power.value) / 2, {
      unit,
      source: `${OPEN_METEO} + ${NASA_POWER}`,
      observedAt,
      quality: agreement.quality,
    });
  }
  const only = om.value !== null ? { source: OPEN_METEO, value: om.value } : power.value !== null ? { source: NASA_POWER, value: power.value } : null;
  if (only) {
    notes.push(`${label}: single source (${only.source}), not cross-checked`);
    return measured(only.value, { unit, source: only.source, observedAt, quality: SINGLE_SOURCE_QUALITY });
  }
  const reason = [om.reason && `${OPEN_METEO}: ${om.reason}`, power.reason && `${NASA_POWER}: ${power.reason}`]
    .filter(Boolean)
    .join('; ');
  return unavailable({ unit, source: `${OPEN_METEO} + ${NASA_POWER}`, reason: reason || 'no data returned' });
}

/**
 * Annual mean temperature, annual precipitation and mean solar radiation over
 * the 365 days ending 7 days before `now`, cross-checked between Open-Meteo
 * (ERA5) and NASA POWER. Never throws; failures become `unavailable`.
 */
export async function getCrossCheckedClimate(
  latitude: number,
  longitude: number,
  now: Date = new Date(),
): Promise<CrossCheckedClimate> {
  const end = new Date(now.getTime() - 7 * 86_400_000);
  const start = new Date(end.getTime() - 364 * 86_400_000);
  const startDate = iso(start);
  const endDate = iso(end);

  const [omResult, powerResult] = await Promise.allSettled([
    getHistoricalWeather(latitude, longitude, startDate, endDate),
    getPowerDaily(latitude, longitude, startDate, endDate),
  ]);

  const failure = (result: PromiseSettledResult<unknown>): string | undefined =>
    result.status === 'rejected' ? String(result.reason instanceof Error ? result.reason.message : result.reason) : undefined;

  const omTemp: SourceStat = omResult.status === 'fulfilled' ? stat(omResult.value.daily.temperature_2m_mean, 'mean') : { value: null, reason: failure(omResult) };
  const omPrecip: SourceStat = omResult.status === 'fulfilled' ? stat(omResult.value.daily.precipitation_sum, 'sum') : { value: null, reason: failure(omResult) };
  const powerTemp: SourceStat = powerResult.status === 'fulfilled' ? stat(powerResult.value.temperatureC, 'mean') : { value: null, reason: failure(powerResult) };
  const powerPrecip: SourceStat = powerResult.status === 'fulfilled' ? stat(powerResult.value.precipitationMm, 'sum') : { value: null, reason: failure(powerResult) };
  const powerSolar: SourceStat = powerResult.status === 'fulfilled' ? stat(powerResult.value.solarMjM2, 'mean') : { value: null, reason: failure(powerResult) };

  const notes: string[] = [];
  return {
    temperatureC: combine(omTemp, powerTemp, { label: 'temperature', unit: 'C', floor: 10, observedAt: endDate, notes }),
    precipitationMm: combine(omPrecip, powerPrecip, { label: 'precipitation', unit: 'mm/year', floor: 100, observedAt: endDate, notes }),
    solarMjM2: combine({ value: null }, powerSolar, { label: 'solar radiation', unit: 'MJ/m2/day', floor: 5, observedAt: endDate, notes }),
    notes,
  };
}

/** One short paragraph for LLM prompts: sources, quality and any disagreement. */
export function describeClimateQuality(climate: CrossCheckedClimate): string {
  const part = (label: string, m: Measured<number>) =>
    isAvailable(m)
      ? `${label} from ${m.source} (quality ${(m.quality * 100).toFixed(0)}%)`
      : `${label} unavailable`;
  const lines = [
    `Data sources: ${part('temperature', climate.temperatureC)}; ${part('precipitation', climate.precipitationMm)}.`,
  ];
  if (climate.notes.length > 0) lines.push(`Data caveats: ${climate.notes.join('; ')}.`);
  return lines.join(' ');
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/test/climate-cross-check.test.ts`.
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire into `plan-crops.ts`**

In `src/ai/flows/plan-crops.ts` add imports:

```ts
import { describeClimateQuality, getCrossCheckedClimate } from '@/lib/data/climate-cross-check';
import { isAvailable } from '@/lib/data/measured';
```

Replace the `planCrops` body up to the `executePromptWithFallback` call with:

```ts
export async function planCrops(input: PlanCropsInput): Promise<PlanCropsOutput> {
    // Fetch REAL climate data, cross-checked between two sources
    const [realData, climate] = await Promise.all([
      fetchClimateDataForCropPlanning(input.latitude, input.longitude),
      getCrossCheckedClimate(input.latitude, input.longitude),
    ]);
    const avgTemp = isAvailable(climate.temperatureC) ? climate.temperatureC.value.toFixed(1) : realData.avgAnnualTemp;
    const annualPrecip = isAvailable(climate.precipitationMm) ? climate.precipitationMm.value.toFixed(0) : realData.annualPrecipitation;

    const promptInput = {
      ...input,
      currentDate: new Date().toISOString(),
      realClimateData: `Average Temperature: ${avgTemp}°C, Min Temp: ${realData.minTemp}°C, Max Temp: ${realData.maxTemp}°C, Annual Precipitation: ${annualPrecip}mm, Soil Type: ${realData.soilType}, Current Moisture: ${realData.currentMoisture}. ${describeClimateQuality(climate)}`
    };
```

Keep the remainder of the function unchanged.

- [ ] **Step 6: Typecheck, lint, full tests, commit**

Run: `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data/climate-cross-check.ts src/ai/flows/plan-crops.ts src/test/climate-cross-check.test.ts`, `npx vitest run`

```bash
git add src/lib/data/climate-cross-check.ts src/test/climate-cross-check.test.ts src/ai/flows/plan-crops.ts
git commit -m "feat: cross-check annual climate between Open-Meteo and NASA POWER"
```

---

### Task 7: SoilGrids soil texture

Background: `getSoilTypeName(soilData.hourly?.soil_type_0_to_10cm?.[0])` always returns "Unknown" now that mock soil was removed, in four flows. ISRIC SoilGrids provides real sand/silt/clay, pH and organic carbon.

**Files:**
- Create: `src/lib/data/soilgrids.ts`
- Modify: `src/ai/flows/plan-crops.ts`, `src/ai/flows/predict-crop-yield.ts`, `src/ai/flows/predict-soil-moisture.ts`, `src/ai/flows/schedule-irrigation.ts`
- Test: `src/test/soilgrids.test.ts`

**Interfaces:**
- Consumes: `fetchJson` (Task 2), `withCache`, `cacheKey` (Task 3), `measured`, `unavailable`, `Measured`, `isAvailable` (Task 1).
- Produces:
  - `interface SoilTexture { texture: string; sandPct: number; siltPct: number; clayPct: number; phH2o: number | null; organicCarbonGkg: number | null }`
  - `parseSoilGrids(body: unknown): SoilTexture | null` (`null` when sand, silt or clay is missing)
  - `classifyUsdaTexture(sand: number, silt: number, clay: number): string`
  - `getSoilTexture(latitude: number, longitude: number, store?: DataCacheStore): Promise<Measured<SoilTexture>>` (never throws; cached 90 days)
  - `describeSoilTexture(m: Measured<SoilTexture>): string`
  - `describeSoil(latitude: number, longitude: number): Promise<string>` (never throws)

- [ ] **Step 1: Write the failing test**

Create `src/test/soilgrids.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataCacheStore } from '@/lib/data/cache';
import {
  classifyUsdaTexture,
  describeSoilTexture,
  getSoilTexture,
  parseSoilGrids,
} from '@/lib/data/soilgrids';

const okJson = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) } as Response);

const layer = (name: string, mean: number | null, dFactor = 10) => ({
  name,
  unit_measure: { d_factor: dFactor },
  depths: [{ label: '0-5cm', values: { mean } }],
});

// Real values returned for lat 20.5, lon 78.9 (central India)
const REAL_BODY = {
  properties: {
    layers: [layer('clay', 424), layer('phh2o', 72), layer('sand', 247), layer('silt', 329), layer('soc', 154)],
  },
};

const emptyStore = (): DataCacheStore => {
  const data = new Map<string, unknown>();
  return { get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v) };
};

describe('classifyUsdaTexture', () => {
  it.each([
    [92, 5, 3, 'Sand'],
    [65, 25, 10, 'Sandy loam'],
    [40, 40, 20, 'Loam'],
    [10, 85, 5, 'Silt'],
    [30, 35, 35, 'Clay loam'],
    [24.7, 32.9, 42.4, 'Clay'],
  ])('sand %d silt %d clay %d -> %s', (sand, silt, clay, expected) => {
    expect(classifyUsdaTexture(sand, silt, clay)).toBe(expected);
  });
});

describe('parseSoilGrids', () => {
  it('divides raw values by d_factor', () => {
    const soil = parseSoilGrids(REAL_BODY);
    expect(soil).toEqual({
      texture: 'Clay',
      sandPct: 24.7,
      siltPct: 32.9,
      clayPct: 42.4,
      phH2o: 7.2,
      organicCarbonGkg: 15.4,
    });
  });

  it('returns null when texture components are missing (ocean or urban point)', () => {
    const body = { properties: { layers: [layer('clay', null), layer('sand', null), layer('silt', null)] } };
    expect(parseSoilGrids(body)).toBeNull();
    expect(parseSoilGrids({})).toBeNull();
  });

  it('keeps texture when only pH and carbon are missing', () => {
    const body = { properties: { layers: [layer('clay', 200), layer('sand', 400), layer('silt', 400)] } };
    expect(parseSoilGrids(body)).toMatchObject({ phH2o: null, organicCarbonGkg: null, texture: 'Loam' });
  });
});

describe('getSoilTexture', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a measured value with source and quality', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson(REAL_BODY)));
    const m = await getSoilTexture(20.5, 78.9, emptyStore());
    expect(m.status).toBe('measured');
    expect(m.source).toMatch(/SoilGrids/);
    expect(m.value?.texture).toBe('Clay');
  });

  it('is unavailable (not a guess) when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network down'))));
    const m = await getSoilTexture(20.5, 78.9, emptyStore());
    expect(m.status).toBe('unavailable');
    expect(m.value).toBeNull();
    expect(describeSoilTexture(m)).toMatch(/^Unknown/);
  });

  it('is unavailable with a clear reason when SoilGrids has no data for the point', async () => {
    const body = { properties: { layers: [layer('clay', null), layer('sand', null), layer('silt', null)] } };
    vi.stubGlobal('fetch', vi.fn(() => okJson(body)));
    const m = await getSoilTexture(0, 0, emptyStore());
    expect(m.status).toBe('unavailable');
    expect(m.reason).toMatch(/no soil data/i);
  });

  it('serves the second request from the cache', async () => {
    const fetchMock = vi.fn(() => okJson(REAL_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const store = emptyStore();
    await getSoilTexture(20.5, 78.9, store);
    await getSoilTexture(20.5, 78.9, store);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('describeSoilTexture', () => {
  it('lists texture and properties with the source', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson(REAL_BODY)));
    const text = describeSoilTexture(await getSoilTexture(20.5, 78.9, emptyStore()));
    expect(text).toContain('Clay');
    expect(text).toContain('clay 42%');
    expect(text).toContain('pH 7.2');
    expect(text).toContain('SoilGrids');
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/soilgrids.test.ts`
Expected: FAIL, cannot resolve `@/lib/data/soilgrids`.

- [ ] **Step 3: Implement**

Create `src/lib/data/soilgrids.ts`:

```ts
import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';
import { fetchJson } from '@/lib/data/http';
import { isAvailable, measured, unavailable, type Measured } from '@/lib/data/measured';

const SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';
const SOURCE = 'ISRIC SoilGrids 0-5 cm';
const NINETY_DAYS_S = 90 * 24 * 60 * 60;
/** Modelled 250 m product, not an in-field measurement. */
const SOILGRIDS_QUALITY = 0.75;

export interface SoilTexture {
  texture: string;
  sandPct: number;
  siltPct: number;
  clayPct: number;
  phH2o: number | null;
  organicCarbonGkg: number | null;
}

/** USDA soil texture class from percent sand, silt and clay. */
export function classifyUsdaTexture(sand: number, silt: number, clay: number): string {
  if (silt + 1.5 * clay < 15) return 'Sand';
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return 'Loamy sand';
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) {
    return 'Sandy loam';
  }
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'Silt loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'Sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 35 && sand > 45) return 'Sandy clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  if (clay >= 40 && sand <= 45 && silt < 40) return 'Clay';
  return 'Unclassified';
}

interface RawLayer {
  name?: string;
  unit_measure?: { d_factor?: number };
  depths?: Array<{ values?: { mean?: number | null } }>;
}

export function parseSoilGrids(body: unknown): SoilTexture | null {
  const layers = (body as { properties?: { layers?: RawLayer[] } } | null)?.properties?.layers;
  if (!Array.isArray(layers)) return null;

  const read = (name: string): number | null => {
    const layer = layers.find((l) => l.name === name);
    const mean = layer?.depths?.[0]?.values?.mean;
    if (typeof mean !== 'number' || !Number.isFinite(mean)) return null;
    const factor = layer?.unit_measure?.d_factor;
    return mean / (typeof factor === 'number' && factor > 0 ? factor : 1);
  };

  const sand = read('sand');
  const silt = read('silt');
  const clay = read('clay');
  if (sand === null || silt === null || clay === null) return null;

  return {
    texture: classifyUsdaTexture(sand, silt, clay),
    sandPct: sand,
    siltPct: silt,
    clayPct: clay,
    phH2o: read('phh2o'),
    organicCarbonGkg: read('soc'),
  };
}

/**
 * Real topsoil texture, pH and organic carbon from ISRIC SoilGrids. Cached for
 * 90 days (soil does not change). Never throws; failures are `unavailable`.
 */
export async function getSoilTexture(
  latitude: number,
  longitude: number,
  store?: DataCacheStore,
): Promise<Measured<SoilTexture>> {
  const params = new URLSearchParams({ lon: String(longitude), lat: String(latitude), depth: '0-5cm', value: 'mean' });
  for (const property of ['clay', 'sand', 'silt', 'phh2o', 'soc']) params.append('property', property);

  try {
    const soil = await withCache<SoilTexture | null>(
      cacheKey('soilgrids', latitude, longitude),
      NINETY_DAYS_S,
      async () =>
        parseSoilGrids(
          await fetchJson<unknown>(`${SOILGRIDS_URL}?${params.toString()}`, {
            provider: 'soilgrids',
            endpoint: 'properties_query',
            timeoutMs: 20_000,
            retries: 1,
          }),
        ),
      store,
    );
    if (soil === null) {
      return unavailable({ unit: 'USDA texture class', source: SOURCE, reason: 'SoilGrids has no soil data for this point (water, urban or ice)' });
    }
    return measured(soil, { unit: 'USDA texture class', source: SOURCE, quality: SOILGRIDS_QUALITY });
  } catch (error: unknown) {
    return unavailable({
      unit: 'USDA texture class',
      source: SOURCE,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

/** One line for prompts and summaries. */
export function describeSoilTexture(m: Measured<SoilTexture>): string {
  if (!isAvailable(m)) return 'Unknown (soil data unavailable)';
  const s = m.value;
  const extras = [
    `clay ${s.clayPct.toFixed(0)}%`,
    `sand ${s.sandPct.toFixed(0)}%`,
    `silt ${s.siltPct.toFixed(0)}%`,
    s.phH2o !== null ? `pH ${s.phH2o.toFixed(1)}` : null,
    s.organicCarbonGkg !== null ? `organic carbon ${s.organicCarbonGkg.toFixed(1)} g/kg` : null,
  ].filter(Boolean);
  return `${s.texture} (${extras.join(', ')}; ${m.source})`;
}

export async function describeSoil(latitude: number, longitude: number): Promise<string> {
  return describeSoilTexture(await getSoilTexture(latitude, longitude));
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/test/soilgrids.test.ts`
Expected: PASS, 14 tests.

If a `classifyUsdaTexture` case fails, the decision list order matters: do not reorder branches to make a test pass; re-derive the expected class from the USDA triangle first and fix the test only if the test value is on a class boundary.

- [ ] **Step 5: Wire into the four flows**

Add `import { describeSoil } from '@/lib/data/soilgrids';` and replace each `getSoilTypeName(...)` use:

- `src/ai/flows/plan-crops.ts`, `fetchClimateDataForCropPlanning`: add `describeSoil(lat, lon)` as a third element of the `Promise.all` and use it for `soilType`:

```ts
    const [historicalWeather, soilData, soilType] = await Promise.all([
      getHistoricalWeather(lat, lon, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),
      getSoilAndWeatherData(lat, lon),
      describeSoil(lat, lon),
    ]);
```
and `soilType,` in the returned object. Remove `getSoilTypeName` from the import if now unused.

- `src/ai/flows/predict-crop-yield.ts`, `fetchRealClimateData(lat, lon)`: same pattern, `soilType` from `describeSoil(lat, lon)`.

- `src/ai/flows/schedule-irrigation.ts`, `scheduleIrrigation`: add `describeSoil(input.latitude, input.longitude)` to the existing `Promise.all`, replace `const soilType = getSoilTypeName(...)` with the awaited value.

- `src/ai/flows/predict-soil-moisture.ts`: replace

```ts
      const soilTypeIndex = data.hourly?.soil_type_0_to_10cm?.[0];
      const soilType = getSoilTypeName(soilTypeIndex);
```
with `const soilType = await describeSoil(input.latitude, input.longitude);`. In the same file, `getMoistureSummary` prints `vwc.toFixed(1)}% VWC` for a 0..1 fraction (reads "0.3% VWC" for 0.25). Import `formatVwcPercent` from `@/services/open-meteo` and use `${formatVwcPercent(vwc)} VWC` in the three summary strings in place of `${vwc.toFixed(1)}% VWC`. Check `formatVwcPercent` output format first (`src/services/open-meteo.ts`) so the unit is not doubled.

- [ ] **Step 6: Verify and commit**

Run: `grep -rn "getSoilTypeName" src --include=*.ts | grep -v "src/test\|src/services/open-meteo.ts"`
Expected: no output (the helper stays exported and tested in `soil-fetch.test.ts`).

Run: `npx tsc --noEmit`, `npx eslint --max-warnings=0 src/lib/data/soilgrids.ts src/ai/flows/plan-crops.ts src/ai/flows/predict-crop-yield.ts src/ai/flows/predict-soil-moisture.ts src/ai/flows/schedule-irrigation.ts`, `npx vitest run`

```bash
git add src/lib/data/soilgrids.ts src/test/soilgrids.test.ts src/ai/flows/plan-crops.ts src/ai/flows/predict-crop-yield.ts src/ai/flows/predict-soil-moisture.ts src/ai/flows/schedule-irrigation.ts
git commit -m "feat: real soil texture from ISRIC SoilGrids in place of 'Unknown'"
```

---

### Task 8: Cache the 30-year rainfall normal and final verification

Background: `getHistoricalPrecipitation` downloads 30 years of daily data (about 11,000 rows) on every request, but the normal for a location never changes within a day.

**Files:**
- Modify: `src/services/open-meteo.ts` (function `getHistoricalPrecipitation`)
- Test: extend `src/test/precipitation-normal.test.ts`

**Interfaces:**
- Consumes: `withCache`, `cacheKey`, `DataCacheStore` (Task 3).
- Produces: `getHistoricalPrecipitation(latitude, longitude, store?: DataCacheStore)` (extra optional third argument; existing callers unchanged).

- [ ] **Step 1: Add the failing test**

Append to `src/test/precipitation-normal.test.ts` inside the `getHistoricalPrecipitation` describe block (reuse its `dailySeries` and `okJson` helpers; add `import type { DataCacheStore } from '@/lib/data/cache';` at the top):

```ts
  it('serves a repeat request from the cache without refetching 30 years of data', async () => {
    const { times, values } = dailySeries([1991, 1992], 2);
    const fetchMock = vi.fn(() => okJson({ latitude: 20, longitude: 78, daily: { time: times, precipitation_sum: values } }));
    vi.stubGlobal('fetch', fetchMock);
    const data = new Map<string, unknown>();
    const store: DataCacheStore = { get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v) };

    const first = await getHistoricalPrecipitation(20, 78, store);
    const second = await getHistoricalPrecipitation(20, 78, store);

    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
```

If the file's existing helpers use different names, adapt to them rather than redefining.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/test/precipitation-normal.test.ts`
Expected: the new test FAILS (fetch called twice); the others pass.

- [ ] **Step 3: Implement**

In `src/services/open-meteo.ts` add imports `import { cacheKey, withCache, type DataCacheStore } from '@/lib/data/cache';`. Rename the current `getHistoricalPrecipitation` to a private `fetchHistoricalPrecipitation` (body unchanged) and add:

```ts
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

export function getHistoricalPrecipitation(
    latitude: number,
    longitude: number,
    store?: DataCacheStore,
): Promise<HistoricalPrecipitationData> {
    return withCache(
        cacheKey('open-meteo-normal-1991-2020', latitude, longitude),
        THIRTY_DAYS_S,
        () => fetchHistoricalPrecipitation(latitude, longitude),
        store,
    );
}
```

The 1991-2020 window is fixed, so a 30 day TTL is conservative.

- [ ] **Step 4: Run the full gate**

Run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`
Expected: all pass. The build catches client/server import mistakes (`src/lib/data` must not be imported from a `'use client'` file).

- [ ] **Step 5: Live smoke test of the real APIs (manual, needs internet)**

Run a throwaway script from the scratchpad directory, not the repo:

```bash
curl -sS --ssl-no-revoke "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=AG&latitude=20.5&longitude=78.9&start=20240101&end=20240105&format=JSON" | head -c 300
curl -sS --ssl-no-revoke "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=78.9&lat=20.5&property=clay&property=sand&property=silt&depth=0-5cm&value=mean" | head -c 300
```

Expected: JSON matching the shapes in Global Constraints. If a shape changed, fix the parser and its fixture before merging.

- [ ] **Step 6: Apply the migration**

Run `supabase/migrations/0007_data_cache.sql` in the Supabase SQL editor (same procedure as `0005`/`0006`). Until it runs, `withCache` logs a warning and falls back to uncached behaviour, so deployment order is safe.

- [ ] **Step 7: Commit**

```bash
git add src/services/open-meteo.ts src/test/precipitation-normal.test.ts
git commit -m "perf: cache the 30-year rainfall normal in the shared data cache"
```

---

## Self-Review

**Spec coverage** (Phase 1 of the overhaul plan, items deferred from 1):
- `Measured<T>` provenance model: Task 1.
- `src/lib/data/` shared clients with timeout, retry, caching, provenance, replacing duplicated fetch code and inlined forecast URLs: Tasks 2, 4. The "three duplicated `fetchClimateData` functions" are partly consolidated: forecast URLs are unified (Task 4); the historical-weather + soil parts still live in three flows and now share `getCrossCheckedClimate` only in `plan-crops`. Migrating `predict-crop-yield` and `get-advanced-crop-advice` climate summaries to `getCrossCheckedClimate` is deliberately left for Phase 3 (yield model rewrite) so it is not done twice.
- Source cascade, weather: Open-Meteo + NASA POWER cross-check: Tasks 5, 6. Soil properties: SoilGrids: Task 7.
- Compare sources, quality from agreement, flag disagreement: Tasks 5, 6.
- Shared Supabase `data_cache` with TTL: Task 3, used by Tasks 7, 8.
- Not in this plan (called out in the header): CHIRPS, SMAP, user soil test, UI badges.

**Placeholder scan:** none; every code step has full code. Two steps tell the executor to adapt to existing names (`logger.warn` level in Task 3, helper names in Task 8) and say exactly how to check.

**Type consistency:** `Measured<T>`, `measured`, `unavailable`, `isAvailable` (Task 1) are used with the same signatures in Tasks 6 and 7. `fetchJson(url, {provider, endpoint, timeoutMs, retries, retryDelayMs})` (Task 2) matches uses in Tasks 4, 5, 7. `withCache(key, ttl, loader, store?)` and `cacheKey(source, lat, lon, ...parts)` (Task 3) match Tasks 7 and 8. `PowerDaily` field names (`temperatureC`, `precipitationMm`, `solarMjM2`) match Task 6's use. `compareValues(a, b, {floor, tolerance})` matches Task 6.

**Known remaining issues surfaced while planning (not fixed here):**
- `predict-soil-moisture.ts` still returns a hardcoded `confidence: 0.95` (Phase 0 item 1 asked to drop it). The output schema requires a number, so it needs the Phase 7 quality formula; leave and track.
- The NASA POWER series is `community=AG` at roughly 0.5 degree resolution; a point near a coast or mountain can legitimately differ from ERA5 (0.25 degree). Flags on those points are a real signal, not a bug.
- `get-historical-baseline.ts` is still a latitude lookup (Phase 3 item 2).
