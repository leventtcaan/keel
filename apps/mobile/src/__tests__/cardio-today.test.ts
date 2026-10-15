/**
 * Which cardio is today's (K-980, ADR-074 Ek 2): the server's `loggedToday` (the typed one when there is one, the watch's
 * when that is all there is) and what this phone holds that the server may not yet. A typed record is what can be taken
 * back; a copy kept for offline is not believed on what it says of today.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';
import { todaysCardio } from '@/train/cardioToday';

type Schemas = components['schemas'];

const DAY = '2026-09-29';
const cardio = (over: Partial<Schemas['ProgramCardio']> = {}): Schemas['ProgramCardio'] => ({
  source: 'GENERATED',
  minutes: 30,
  sessionsPerWeek: 3,
  sessions: [],
  doneThisWeek: 0,
  afterLiftOverLine: false,
  ...over,
});
const program = (c?: Schemas['ProgramCardio']): Schemas['Program'] => ({ id: 'p', source: 'GENERATED', days: [], ...(c === undefined ? {} : { cardio: c }) });
const session = (over: Partial<Schemas['CardioSession']> = {}): Schemas['CardioSession'] => ({
  id: 'srv-1',
  clientId: 'c-1',
  day: DAY,
  minutes: 30,
  source: 'MANUAL',
  ...over,
});
let seq = 0;
const record = (clientId: string, over: { day?: string; minutes?: number; state?: LocalRecord['state']; serverId?: string | null; source?: 'MANUAL' | 'APPLE_HEALTH' } = {}): LocalRecord => ({
  seq: ++seq,
  clientId,
  kind: 'cardio',
  parentClientId: null,
  body: { clientId, day: over.day ?? DAY, minutes: over.minutes ?? 25, source: over.source ?? 'MANUAL' },
  state: over.state ?? 'PENDING',
  serverId: over.serverId ?? null,
  serverBody: null,
  errorCode: null,
});

const read = (p: Schemas['Program'] | null, records: LocalRecord[] = [], kept = false) => todaysCardio({ program: p, kept, records, day: DAY });

test('nothing logged today: nothing', () => {
  expect(read(program(cardio()))).toEqual({ kind: 'none' });
  expect(read(null)).toEqual({ kind: 'none' });
});

test('the server\'s typed record: its minutes, its id to take it back by', () => {
  expect(read(program(cardio({ loggedToday: session({ minutes: 45 }) })))).toEqual({ kind: 'typed', clientId: 'c-1', minutes: 45, serverId: 'srv-1' });
});

test('Apple Health\'s record when that is all there is: shown, with the watch\'s energy if it measured, never taken back', () => {
  const health = session({ source: 'APPLE_HEALTH', minutes: 40, activeEnergyKcal: 310 });
  expect(read(program(cardio({ loggedToday: health })))).toEqual({ kind: 'health', minutes: 40, activeEnergyKcal: 310 });
  expect(read(program(cardio({ loggedToday: { ...health, activeEnergyKcal: undefined } })))).toEqual({ kind: 'health', minutes: 40 });
});

test('a typed record on this phone, not on the server yet: it is today\'s, taken back by its clientId alone', () => {
  expect(read(program(cardio()), [record('c-2', { minutes: 20 })])).toEqual({ kind: 'typed', clientId: 'c-2', minutes: 20 });
});

test('a typed one beats the watch\'s: it is the one that can be taken back', () => {
  const health = session({ source: 'APPLE_HEALTH', minutes: 40 });
  expect(read(program(cardio({ loggedToday: health })), [record('c-2')])).toEqual({ kind: 'typed', clientId: 'c-2', minutes: 25 });
});

test('a record of another day, or one the server refused, is not today\'s', () => {
  expect(read(program(cardio()), [record('c-3', { day: '2026-09-28' }), record('c-4', { state: 'REJECTED' })])).toEqual({ kind: 'none' });
});

test('a copy kept for offline does not say what is done today: only this phone\'s own records do', () => {
  const stale = program(cardio({ loggedToday: session() }));
  expect(read(stale, [], true)).toEqual({ kind: 'none' });
  expect(read(stale, [record('c-2')], true)).toEqual({ kind: 'typed', clientId: 'c-2', minutes: 25 });
});

test('no cardio in the program (very active work, no profile yet) still reads this phone\'s records', () => {
  expect(read(program(), [record('c-2')])).toEqual({ kind: 'typed', clientId: 'c-2', minutes: 25 });
});

describe('the server\'s list is read (review of K-980: the same rule as the meals, meals.ts)', () => {
  test('online, with the program\'s cardio read: a record kept here that the list does not hold was deleted elsewhere, so it is not today\'s', () => {
    expect(read(program(cardio()), [record('c-5', { state: 'SYNCED', serverId: 'srv-5' })])).toEqual({ kind: 'none' });
  });

  test('online: a record still waiting to be sent is today\'s, whatever the list says', () => {
    expect(read(program(cardio()), [record('c-6', { state: 'PENDING' })])).toEqual({ kind: 'typed', clientId: 'c-6', minutes: 25 });
  });

  test('a kept (offline) copy, or a program without cardio: the phone\'s own sent records still count, there is no list to say otherwise', () => {
    const synced = record('c-7', { state: 'SYNCED', serverId: 'srv-7' });
    expect(read(program(cardio()), [synced], true)).toEqual({ kind: 'typed', clientId: 'c-7', minutes: 25 });
    expect(read(program(), [synced])).toEqual({ kind: 'typed', clientId: 'c-7', minutes: 25 });
  });
});
