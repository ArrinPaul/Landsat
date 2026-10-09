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
