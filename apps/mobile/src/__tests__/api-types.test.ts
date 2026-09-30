/**
 * Compile-time contract checks (K-303 "Tip kontrolü"): `npm run typecheck` fails if the generated types stop
 * rejecting these calls. Each @ts-expect-error must stay an error; if the contract started accepting the call, tsc
 * would report an unused directive.
 */
import type { ApiClient } from '@/api/client';

export async function contractShapes(api: ApiClient) {
  // @ts-expect-error — a path the contract does not have
  await api.GET('/v1/not-in-the-contract');

  // @ts-expect-error — a weigh-in needs clientId, measuredAt, kg and source
  await api.POST('/v1/weigh-ins', { body: { kg: 80 } });

  await api.POST('/v1/weigh-ins', {
    body: {
      clientId: '00000000-0000-4000-8000-000000000000',
      measuredAt: '2026-09-30T07:00:00+03:00',
      kg: 80.4,
      // @ts-expect-error — source is a closed set from the contract
      source: 'GUESS',
    },
  });

  const { data } = await api.GET('/health');
  // @ts-expect-error — Health has only `status`
  return data?.uptime;
}

test('the type checks above are compiled by npm run typecheck', () => {
  expect(typeof contractShapes).toBe('function');
});
