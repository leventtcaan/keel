/**
 * Whether the signed-in account has finished onboarding (K-306): it has when the server holds its profile. The answer
 * is kept on the phone so a finished user opens straight on the tabs, offline too; until it is known, the app asks
 * the server. The same read brings the account's unit choice (K-310) — one request, not two.
 */
import { createApiClient } from '@/api/client';
import { createProfileStatus } from '@/onboarding/profileStatus';
import { createUnitsPreference } from '@/units/preference';

import { BASE, PROFILE, type Profile, memoryKv, profileServer } from './support/profileServer';

async function setup({ profile = PROFILE as Profile | null, failGet = undefined as number | undefined, failPut = undefined as number | undefined, kv = memoryKv() } = {}) {
  const server = profileServer(profile, failPut, failGet);
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch: server.fetch });
  const units = await createUnitsPreference({ kv, api, locale: 'en-US' });
  const status = await createProfileStatus({ kv, api, units });
  return { kv, server, units, status };
}

test('nothing known yet: unknown, until the server is asked', async () => {
  const { status } = await setup();
  expect(status.current()).toBe('unknown');
});

test('a profile on the server: done, and the account\'s units come with it, in one request', async () => {
  const { status, units, server } = await setup({ profile: { ...PROFILE, units: 'METRIC' } });
  await status.refresh();
  expect(status.current()).toBe('done');
  expect(units.current()).toBe('METRIC');
  expect(server.fetch).toHaveBeenCalledTimes(1);
});

test('no profile (404): onboarding is needed', async () => {
  const { status } = await setup({ profile: null });
  await status.refresh();
  expect(status.current()).toBe('needed');
});

test('another answer is not a verdict: the error reaches the caller and nothing changes', async () => {
  const { status } = await setup({ failGet: 503 });
  await expect(status.refresh()).rejects.toThrow('503');
  expect(status.current()).toBe('unknown');
});

test('offline: the error reaches the caller and nothing changes', async () => {
  const { status, server } = await setup();
  server.goOffline();
  await expect(status.refresh()).rejects.toThrow();
  expect(status.current()).toBe('unknown');
});

test('done is kept on the phone: the next start knows it without the network', async () => {
  const kv = memoryKv();
  const first = await setup({ kv });
  await first.status.refresh();
  const again = await setup({ kv, profile: null }); // the server is not asked
  expect(again.status.current()).toBe('done');
});

test('"needed" is not kept: the next start asks again (onboarding may have finished on another phone)', async () => {
  const kv = memoryKv();
  const first = await setup({ kv, profile: null });
  await first.status.refresh();
  const again = await setup({ kv });
  expect(again.status.current()).toBe('unknown');
});

test('saving the finished profile: PUT once, then done, kept, and the units are the ones sent', async () => {
  const { status, server, units, kv } = await setup({ profile: null });
  await status.refresh();
  await status.save({ ...PROFILE, units: 'METRIC' });
  expect(server.puts).toEqual([{ ...PROFILE, units: 'METRIC' }]);
  expect(status.current()).toBe('done');
  expect(units.current()).toBe('METRIC');
  expect((await setup({ kv })).status.current()).toBe('done');
});

test('a refused save throws with the status and leaves onboarding open', async () => {
  const { status } = await setup({ profile: null, failPut: 400 });
  await status.refresh();
  await expect(status.save(PROFILE)).rejects.toThrow('400');
  expect(status.current()).toBe('needed');
});

test('listeners hear every change, and stop hearing when they leave', async () => {
  const { status } = await setup({ profile: null });
  const heard: string[] = [];
  const stop = status.subscribe(() => heard.push(status.current()));
  await status.refresh();
  await status.save(PROFILE);
  stop();
  await status.forget();
  expect(heard).toEqual(['needed', 'done']);
});

test('sign-out forgets: unknown again, and nothing kept for the next account', async () => {
  const { status, kv } = await setup();
  await status.refresh();
  await status.forget();
  expect(status.current()).toBe('unknown');
  expect((await setup({ kv, profile: null })).status.current()).toBe('unknown');
});

test('a read still on its way when the user signs out does not mark the next account done', async () => {
  const { status, server } = await setup();
  server.holdNextGet();
  const reading = status.refresh();
  await new Promise((r) => setTimeout(r, 0)); // the request is on its way
  await status.forget();
  server.release();
  await reading;
  expect(status.current()).toBe('unknown');
});

test('a unit choice made while the profile is read is not undone by the read (K-310 guard)', async () => {
  const { status, server, units } = await setup({ profile: { ...PROFILE, units: 'METRIC' } });
  server.holdNextGet();
  const reading = status.refresh();
  await new Promise((r) => setTimeout(r, 0)); // the request is on its way
  await units.set('IMPERIAL');
  server.release();
  await reading;
  expect(units.current()).toBe('IMPERIAL');
});

test('a refused save writes nothing to the phone: the next start still asks', async () => {
  const kv = memoryKv();
  const { status } = await setup({ profile: null, failPut: 400, kv });
  await expect(status.save(PROFILE)).rejects.toThrow('400');
  expect(kv.items.has('onboarded')).toBe(false);
  expect((await setup({ kv })).status.current()).toBe('unknown');
});

test('a save still on its way when the user signs out does not mark the next account done', async () => {
  const { status, server, kv } = await setup({ profile: null });
  server.holdNextPut();
  const saving = status.save(PROFILE);
  await new Promise((r) => setTimeout(r, 0)); // the request is on its way
  await status.forget();
  server.release();
  await saving;
  expect(status.current()).toBe('unknown');
  expect(kv.items.has('onboarded')).toBe(false);
});

test('a kept "done" that the server contradicts (404) is dropped: the server holds the truth', async () => {
  const kv = memoryKv();
  await (await setup({ kv })).status.refresh();
  const again = await setup({ kv, profile: null });
  expect(again.status.current()).toBe('done');
  await again.status.refresh();
  expect(again.status.current()).toBe('needed');
  expect(kv.items.has('onboarded')).toBe(false);
});

test('reads asked for at once share one request (sign-in and the checking screen both ask)', async () => {
  const { status, server } = await setup();
  await Promise.all([status.refresh(), status.refresh()]);
  expect(server.fetch).toHaveBeenCalledTimes(1);
  await status.refresh(); // a later read asks again
  expect(server.fetch).toHaveBeenCalledTimes(2);
});

test('a failed read tells a server problem from no connection', async () => {
  const down = await setup({ failGet: 500 });
  await expect(down.status.refresh()).rejects.toMatchObject({ name: 'ProfileReadFailed' });
  const offline = await setup();
  offline.server.goOffline();
  await expect(offline.status.refresh()).rejects.toMatchObject({ name: 'NoConnection' });
});

test('a failed save tells no connection from a refusal, by name', async () => {
  const offline = await setup({ profile: null });
  offline.server.goOffline();
  await expect(offline.status.save(PROFILE)).rejects.toMatchObject({ name: 'NoConnection' });
  const refused = await setup({ profile: null, failPut: 400 });
  await expect(refused.status.save(PROFILE)).rejects.toMatchObject({ name: 'ProfileSaveFailed' });
});

describe('the profile handed on, for the reminders (K-410)', () => {
  async function withListener(kv = memoryKv(), profile: Profile | null = PROFILE) {
    const server = profileServer(profile);
    const api = createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch: server.fetch });
    const units = await createUnitsPreference({ kv, api, locale: 'en-US' });
    const onProfile = jest.fn(async (_profile: Profile) => {});
    const status = await createProfileStatus({ kv, api, units, onProfile });
    return { status, server, onProfile };
  }

  test('after a read and after a save, the profile the server holds', async () => {
    const { status, onProfile } = await withListener();
    await status.refresh();
    expect(onProfile).toHaveBeenLastCalledWith(expect.objectContaining({ schedule: PROFILE.schedule }));
    await status.save(PROFILE);
    expect(onProfile).toHaveBeenCalledTimes(2);
  });

  test('not for a read still on its way when the user signs out', async () => {
    const { status, server, onProfile } = await withListener();
    server.holdNextGet();
    const reading = status.refresh();
    await new Promise((r) => setTimeout(r, 0));
    await status.forget();
    server.release();
    await reading;
    expect(onProfile).not.toHaveBeenCalled();
  });

  test('not when the sign-out lands while "done" is being written', async () => {
    const kv = memoryKv();
    let release = () => {};
    const set = kv.setItemAsync;
    kv.setItemAsync = async (key: string, value: string) => {
      if (key === 'onboarded') await new Promise<void>((resolve) => (release = resolve));
      return set(key, value);
    };
    const { status, onProfile } = await withListener(kv);
    const reading = status.refresh();
    await new Promise((r) => setTimeout(r, 10)); // the answer came; "done" is being written
    await status.forget();
    release();
    await reading;
    expect(onProfile).not.toHaveBeenCalled();
    expect(status.current()).toBe('unknown');
    expect(kv.items.has('onboarded')).toBe(false); // the next start must not open the next account on the tabs
  });
});

describe('stored before the plan is shown, finished after it (K-967, ADR-072 #2)', () => {
  test('stored: PUT once, the units adopted, the profile the server holds handed back; onboarding still open, nothing kept', async () => {
    const { status, server, units, kv } = await setup({ profile: null });
    await status.refresh();
    const stored = await status.store({ ...PROFILE, units: 'METRIC' });
    expect(server.puts).toEqual([{ ...PROFILE, units: 'METRIC' }]);
    expect(stored).toEqual({ ...PROFILE, units: 'METRIC' });
    expect(units.current()).toBe('METRIC');
    expect(status.current()).toBe('needed');
    expect(kv.items.has('onboarded')).toBe(false);
  });

  test('finished: done and kept, with no second PUT; the profile handed on once', async () => {
    const kv = memoryKv();
    const server = profileServer(null);
    const api = createApiClient({ baseUrl: BASE, accessToken: async () => 'tok', fetch: server.fetch });
    const units = await createUnitsPreference({ kv, api, locale: 'en-US' });
    const onProfile = jest.fn(async (_profile: Profile) => {});
    const status = await createProfileStatus({ kv, api, units, onProfile });
    await status.store(PROFILE);
    expect(onProfile).not.toHaveBeenCalled();
    await status.finish();
    expect(status.current()).toBe('done');
    expect(server.puts).toHaveLength(1);
    expect(onProfile).toHaveBeenCalledTimes(1);
    expect((await setup({ kv })).status.current()).toBe('done');
  });

  test('nothing stored: finishing does nothing', async () => {
    const { status } = await setup({ profile: null });
    await status.refresh();
    await status.finish();
    expect(status.current()).toBe('needed');
  });

  test('a refused store throws by name, like a save, and leaves nothing to finish', async () => {
    const { status } = await setup({ profile: null, failPut: 400 });
    await status.refresh();
    await expect(status.store(PROFILE)).rejects.toMatchObject({ name: 'ProfileSaveFailed' });
    await status.finish();
    expect(status.current()).toBe('needed');
  });

  test('stored for one account, then a sign-out: finishing does not mark the next account done', async () => {
    const { status, kv } = await setup({ profile: null });
    await status.store(PROFILE);
    await status.forget();
    await status.finish();
    expect(status.current()).toBe('unknown');
    expect(kv.items.has('onboarded')).toBe(false);
  });

  test('a finish that cannot be kept throws, and can be tried again: the stored profile is not lost', async () => {
    const kv = memoryKv();
    const { status } = await setup({ profile: null, kv });
    await status.store(PROFILE);
    const set = kv.setItemAsync;
    kv.setItemAsync = async () => {
      throw Object.assign(new Error('disk full'), { name: 'KvFailed' });
    };
    await expect(status.finish()).rejects.toMatchObject({ name: 'KvFailed' });
    expect(status.current()).not.toBe('done');
    kv.setItemAsync = set;
    await status.finish();
    expect(status.current()).toBe('done');
  });
});

describe('onboarding still open on this phone: the plan comes back after a restart (K-967 review)', () => {
  /** The app opened again on the same phone: the same kept items, the server as it is now. */
  const restart = (kv: ReturnType<typeof memoryKv>, profile: Profile | null) => setup({ kv, profile });

  test('marked open before the profile is saved', async () => {
    const { status, kv, server } = await setup({ profile: null });
    server.holdNextPut();
    const storing = status.store(PROFILE);
    await new Promise((r) => setTimeout(r, 0)); // the request is on its way
    expect(kv.items.has('onboarding.open')).toBe(true);
    server.release();
    await storing;
  });

  test('(a) closed after the profile was saved: not done — resumed, with the profile the server holds', async () => {
    const first = await setup({ profile: null });
    await first.status.store(PROFILE);
    const again = await restart(first.kv, PROFILE);
    expect(again.status.current()).toBe('unknown');
    await again.status.refresh();
    expect(again.status.current()).toBe('resume');
    expect(again.status.resumed()).toEqual(PROFILE);
    await again.status.finish();
    expect(again.status.current()).toBe('done');
    expect(again.kv.items.has('onboarding.open')).toBe(false);
    expect((await restart(again.kv, PROFILE)).status.current()).toBe('done');
  });

  test('finished: the mark goes before "done" is kept — closed between the two, the server read finds a profile and no mark: done', async () => {
    const kv = memoryKv();
    const order: string[] = [];
    const set = kv.setItemAsync;
    const remove = kv.removeItemAsync;
    kv.setItemAsync = async (key: string, value: string) => (order.push(`set ${key}`), set(key, value));
    kv.removeItemAsync = async (key: string) => (order.push(`remove ${key}`), remove(key));
    const { status } = await setup({ profile: null, kv });
    await status.store(PROFILE);
    order.length = 0;
    await status.finish();
    expect(order.indexOf('remove onboarding.open')).toBeLessThan(order.indexOf('set onboarded'));
  });

  test('both kept (an older order of the two writes): done — "done" is never undone by the mark', async () => {
    const kv = memoryKv();
    kv.items.set('onboarded', 'done');
    kv.items.set('onboarding.open', '1');
    const again = await restart(kv, PROFILE);
    expect(again.status.current()).toBe('done');
    await again.status.refresh();
    expect(again.status.current()).toBe('done');
    expect(kv.items.has('onboarding.open')).toBe(false);
  });

  test('(d) a sign-out forgets the mark: the next account is not resumed', async () => {
    const first = await setup({ profile: null });
    await first.status.store(PROFILE);
    await first.status.forget();
    expect(first.kv.items.has('onboarding.open')).toBe(false);
    const again = await restart(first.kv, PROFILE);
    await again.status.refresh();
    expect(again.status.current()).toBe('done');
  });

  test('(e) a profile on the server and no mark: done, as always', async () => {
    const { status } = await setup({ profile: PROFILE });
    await status.refresh();
    expect(status.current()).toBe('done');
    expect(status.resumed()).toBeNull();
  });

  test('(f) the mark but no profile on the server (the save never landed): start over, the mark dropped', async () => {
    const kv = memoryKv();
    kv.items.set('onboarding.open', '1');
    const again = await restart(kv, null);
    await again.status.refresh();
    expect(again.status.current()).toBe('needed');
    expect(kv.items.has('onboarding.open')).toBe(false);
  });
});
