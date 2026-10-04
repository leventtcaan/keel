/**
 * Sending what was built (K-609, contract /v1/workout-imports): chunk by chunk, in order, each answer counted; the user
 * sees how far it got. A failure stops it and says what kind by name (V3); what was sent stays sent, and trying again
 * finds it there (the ids come from the file).
 */
import type { components } from '@/api/schema';
import { sendImport } from '@/import/send';

type Chunk = components['schemas']['WorkoutImport'];
const chunk = (n: number): Chunk => ({
  source: 'STRONG',
  workouts: Array.from({ length: n }, (_, i) => ({
    clientId: `00000000-0000-8000-8000-00000000000${i}`,
    startedAt: '2025-01-18T18:00:00.000Z',
    endedAt: '2025-01-18T19:00:00.000Z',
    sets: [{ exerciseId: 'bench_press', setType: 'WORKING' as const, loadKg: 60, reps: 8 }],
  })),
});
const answer = (data?: unknown, status = 200, code?: string) => ({
  data,
  error: code === undefined ? undefined : { code, message: 'x' },
  response: new Response(null, { status }),
});

test('each chunk in order; the counts added up; how far it got told after each', async () => {
  const POST = jest
    .fn()
    .mockResolvedValueOnce(answer({ imported: 2, alreadyThere: 0 }))
    .mockResolvedValueOnce(answer({ imported: 0, alreadyThere: 1 }));
  const progress: [number, number][] = [];

  const sent = await sendImport({ api: { POST } as never, chunks: [chunk(2), chunk(1)], onProgress: (done, of) => progress.push([done, of]) });

  expect(sent).toEqual({ imported: 2, alreadyThere: 1 });
  expect(POST.mock.calls.map((c) => c[0])).toEqual(['/v1/workout-imports', '/v1/workout-imports']);
  expect(POST.mock.calls[1][1]).toEqual({ body: chunk(1) });
  expect(progress).toEqual([
    [1, 2],
    [2, 2],
  ]);
});

test('no answer: NoConnection, and nothing after it is sent', async () => {
  const POST = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'));

  await expect(sendImport({ api: { POST } as never, chunks: [chunk(1), chunk(1)] })).rejects.toMatchObject({ name: 'NoConnection' });
  expect(POST).toHaveBeenCalledTimes(1);
});

test('the consent withdrawn meanwhile: ConsentRequired; anything else refused: ImportRefused', async () => {
  const consent = jest.fn().mockResolvedValueOnce(answer(undefined, 403, 'CONSENT_REQUIRED'));
  const refused = jest.fn().mockResolvedValueOnce(answer(undefined, 400, 'VALIDATION_FAILED'));

  await expect(sendImport({ api: { POST: consent } as never, chunks: [chunk(1)] })).rejects.toMatchObject({ name: 'ConsentRequired' });
  await expect(sendImport({ api: { POST: refused } as never, chunks: [chunk(1)] })).rejects.toMatchObject({ name: 'ImportRefused' });
});
