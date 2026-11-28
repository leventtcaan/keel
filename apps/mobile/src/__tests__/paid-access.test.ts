/** Whether a paid part is open (K-1261, ADR-096 #2): the server's word on the subscription; unread is never a lock. */
import { readPaidAccess } from '@/subscription/access';
import { createApiClient } from '@/api/client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const api = (answer: () => Response | 'offline') =>
  createApiClient({
    baseUrl: 'http://keel.test',
    accessToken: async () => 'tok',
    fetch: async () => {
      const a = answer();
      if (a === 'offline') throw new TypeError('Network request failed');
      return a;
    },
  });

test('active is open, not active is locked, unread (offline or a server error) is neither', async () => {
  expect(await readPaidAccess(api(() => json({ appUserId: 'u', active: true })))).toBe('open');
  expect(await readPaidAccess(api(() => json({ appUserId: 'u', active: false })))).toBe('locked');
  expect(await readPaidAccess(api(() => 'offline'))).toBe('unread');
  expect(await readPaidAccess(api(() => json({ code: 'X' }, 500)))).toBe('unread');
});
