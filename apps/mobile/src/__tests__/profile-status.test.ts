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
