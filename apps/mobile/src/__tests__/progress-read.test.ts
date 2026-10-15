/**
 * What the Progress tab asks of the server (K-979): the parts at once, and the two that wait on them (the plan's starting
 * numbers until a first call exists, the weight average once the trend is ready) at once too, not one after the other.
 */
import type { ApiClient } from '@/api/client';
import { loadProgress } from '@/progress/read';

import { consistency, summary } from './support/progressFixtures';

type Held = { path: string; release: () => void };

/** An API whose answers wait until the test lets them go; it records what was asked, and when. */
function gatedApi(answers: Record<string, unknown>) {
  const asked: string[] = [];
  const held: Held[] = [];
  const api = {
    GET: (path: string) => {
      asked.push(path);
      return new Promise((resolve) => {
        const answer =
          path in answers
            ? { data: answers[path], response: new Response(null, { status: 200 }) }
            : { error: { code: 'NOT_FOUND', message: 'x' }, response: new Response(null, { status: 404 }) };
        held.push({ path, release: () => resolve(answer) });
      });
    },
  } as unknown as ApiClient;
  return { api, asked, held };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('the starting numbers and the weight average are asked together, once the first parts are in', async () => {
  const { api, asked, held } = gatedApi({ '/v1/weigh-ins/summary': summary(80, true) });
  const reading = loadProgress(api, '2026-10-15');
  await flush();
  // The first parts go out together.
  expect([...asked].sort()).toEqual(['/v1/consistency', '/v1/days/{day}/budget', '/v1/decisions', '/v1/program', '/v1/training-progress', '/v1/weigh-ins/summary']);
  for (const h of held.splice(0)) h.release();
  await flush();
  // No first call (404) and the trend ready: both second parts are out before either answers.
  expect(asked).toEqual(expect.arrayContaining(['/v1/targets/starting', '/v1/weight-trend']));
  for (const h of held.splice(0)) h.release();
  const read = await reading;
  expect(read.trend?.state).toBe('none');
  expect(read.starting?.state).toBe('none');
});

test('after a first call the starting numbers are not asked; before the trend is ready the average is not', async () => {
  const { api, asked, held } = gatedApi({ '/v1/consistency': consistency(), '/v1/weigh-ins/summary': summary(3) });
  const reading = loadProgress(api, '2026-10-15');
  await flush();
  for (const h of held.splice(0)) h.release();
  const read = await reading;
  expect(asked).not.toContain('/v1/targets/starting');
  expect(asked).not.toContain('/v1/weight-trend');
  expect(read.starting).toBeNull();
  expect(read.trend).toBeNull();
});
