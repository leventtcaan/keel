/**
 * The confirm loop takes its count and its interval from the parameters (K2, ADR-057 D2) — not numbers of its own: with other
 * values in the file, it looks that many times, that far apart.
 */
import { createApiClient } from '@/api/client';
import { confirmActive } from '@/subscription/paywall';

jest.mock('@/subscription/params', () => ({ subscriptionParams: { confirmAttempts: 3, confirmIntervalMs: 7 } }));

test('three looks, seven apart', async () => {
  const fetch = jest.fn(
    async () => new Response(JSON.stringify({ active: false, appUserId: 'x' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  const waits: number[] = [];
  const api = createApiClient({ baseUrl: 'https://api.example.test', accessToken: async () => 't', fetch });
  expect(await confirmActive(api, async (ms) => void waits.push(ms))).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(waits).toEqual([7, 7]);
});
