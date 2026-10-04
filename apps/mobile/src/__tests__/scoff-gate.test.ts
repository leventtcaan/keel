/**
 * The SCOFF gate (K-607, ADR-050): five yes-or-no questions (the SCOFF questionnaire, BMJ 1999); two or more yes keeps the shape
 * projection off. The answers are never stored or sent — only the result stays on the phone — and a result of "off" is not
 * re-asked. After it, a neutral sentence and, where the phone's region has a checked one, an organisation's link.
 */
import params from '../../../../data/parameters/projection.json';
import { SCOFF_QUESTIONS, createProjectionAccess, scoffResult, supportLink } from '@/projection/scoff';

type Stored = Map<string, string>;
function memoryKv(stored: Stored = new Map()) {
  return {
    stored,
    getItemAsync: jest.fn(async (key: string) => stored.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      stored.set(key, value);
    }),
    removeItemAsync: jest.fn(async (key: string) => stored.delete(key)),
  };
}

const allAnswers = (): boolean[][] =>
  Array.from({ length: 2 ** SCOFF_QUESTIONS.length }, (_, bits) => SCOFF_QUESTIONS.map((_q, i) => ((bits >> i) & 1) === 1));

describe('the result', () => {
  test('five questions, the SCOFF ones, in order', () => {
    expect(SCOFF_QUESTIONS).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  test('the threshold is the published one: two or more yes', () => {
    const threshold = params.parameters.find((p) => p.key === 'scoff_unavailable_from');
    expect(threshold?.value).toBe(2);
  });

  test.each(allAnswers().map((answers) => [answers]))('every answer set: off from two yes, on below (%j)', (answers) => {
    const yes = answers.filter(Boolean).length;
    expect(scoffResult(answers)).toBe(yes >= 2 ? 'unavailable' : 'clear');
  });

  test('a set that is not five answers is not a result', () => {
    expect(() => scoffResult([true, false])).toThrow();
    expect(() => scoffResult([false, false, false, false, false, false])).toThrow();
  });
});

describe('what the phone keeps', () => {
  test('not asked yet until a result is recorded', async () => {
    const access = await createProjectionAccess({ kv: memoryKv(), locale: 'en-US' });
    expect(access.current()).toBe('not-asked');
  });

  test('only the result is written, never the answers', async () => {
    const kv = memoryKv();
    const access = await createProjectionAccess({ kv, locale: 'en-US' });

    await access.record(scoffResult([true, true, false, false, false]));

    expect(kv.setItemAsync).toHaveBeenCalledTimes(1);
    const [, value] = kv.setItemAsync.mock.calls[0];
    expect(value).toBe('unavailable');
    expect([...kv.stored.values()]).toEqual(['unavailable']);
  });

  test('"off" is kept across a restart and is not re-asked: a later "clear" changes nothing', async () => {
    const kv = memoryKv();
    await (await createProjectionAccess({ kv, locale: 'en-US' })).record('unavailable');

    const again = await createProjectionAccess({ kv, locale: 'en-US' });
    expect(again.current()).toBe('unavailable');

    await again.record('clear');
    expect(again.current()).toBe('unavailable');
    expect((await createProjectionAccess({ kv, locale: 'en-US' })).current()).toBe('unavailable');
  });

  test('"clear" is kept too: asked once', async () => {
    const kv = memoryKv();
    await (await createProjectionAccess({ kv, locale: 'tr-TR' })).record('clear');

    expect((await createProjectionAccess({ kv, locale: 'tr-TR' })).current()).toBe('clear');
  });

  test('on the same phone session too: "off" is not overwritten (review finding)', async () => {
    const kv = memoryKv();
    const access = await createProjectionAccess({ kv, locale: 'en-US' });

    await access.record('unavailable');
    expect(access.current()).toBe('unavailable');
    await access.record('clear');

    expect(access.current()).toBe('unavailable');
    expect(kv.stored.get('projection.access')).toBe('unavailable');
  });

  test('"clear" can still become "off": a later answer of two or more yes counts', async () => {
    const kv = memoryKv();
    const access = await createProjectionAccess({ kv, locale: 'en-US' });

    await access.record('clear');
    await access.record('unavailable');

    expect(access.current()).toBe('unavailable');
    expect(kv.stored.get('projection.access')).toBe('unavailable');
  });

  test('a write that fails changes nothing and reaches the caller', async () => {
    const kv = memoryKv();
    kv.setItemAsync.mockRejectedValueOnce(new Error('disk full'));
    const access = await createProjectionAccess({ kv, locale: 'en-US' });

    await expect(access.record('clear')).rejects.toThrow('disk full');
    expect(access.current()).toBe('not-asked');
  });

  test('sign-out forgets "clear" — the next person is asked — and keeps "off" (ADR-050 question 94)', async () => {
    const cleared = memoryKv();
    const clear = await createProjectionAccess({ kv: cleared, locale: 'en-US' });
    await clear.record('clear');
    await clear.signedOut();
    expect(clear.current()).toBe('not-asked');
    expect(cleared.stored.has('projection.access')).toBe(false);

    const kept = memoryKv();
    const off = await createProjectionAccess({ kv: kept, locale: 'en-US' });
    await off.record('unavailable');
    await off.signedOut();
    expect(off.current()).toBe('unavailable');
    expect(kept.stored.get('projection.access')).toBe('unavailable');
  });

  test('something else in the store is read as not asked', async () => {
    const kv = memoryKv(new Map([['projection.access', 'yes please']]));
    expect((await createProjectionAccess({ kv, locale: 'en-US' })).current()).toBe('not-asked');
  });
});

describe('the support link, by the phone region', () => {
  const links = params.parameters.find((p) => p.key === 'eating_support_links')?.value as Record<string, string>;

  test('US and GB have a checked organisation', () => {
    expect(supportLink('en-US')).toEqual({ region: 'US', url: links.US });
    expect(supportLink('en-GB')).toEqual({ region: 'GB', url: links.GB });
    expect(supportLink('en_GB')).toEqual({ region: 'GB', url: links.GB });
  });

  test('anywhere else, Turkey included, the neutral sentence alone', () => {
    expect(supportLink('tr-TR')).toBeNull();
    expect(supportLink('de-DE')).toBeNull();
    expect(supportLink('en')).toBeNull();
  });

  test('every link is https', () => {
    Object.values(links).forEach((url) => expect(url).toMatch(/^https:\/\//));
  });
});
