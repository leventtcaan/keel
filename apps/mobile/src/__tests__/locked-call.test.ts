/**
 * A call the account has not unlocked (ADR-091 Ek 1, K-1202). The contract makes a call a CallView, Decision or LockedDecision;
 * the phone splits the two where the server's answer comes in, so no reader can touch `action` or `reasons` without the locked
 * branch in front of it. The type-level proof is at the foot of this file: `tsc` (npm run typecheck) fails if it stops holding.
 */
import type { components } from '@/api/schema';
import { ledgerRows } from '@/today/ledger';
import { chips, isLocked, readCall, type TodayData } from '@/today/today';
import { heroOf } from '@/today/week';

type Schemas = components['schemas'];
const LOCKED: Schemas['LockedDecision'] = { id: 'l1', madeOn: '2026-12-21', weekOf: '2026-12-21', nextCallOn: '2026-12-28', locked: true };
const FULL: Schemas['Decision'] = {
  id: 'f1',
  madeOn: '2026-12-14',
  action: { type: 'CONTINUE' },
  reasons: [{ rule: 'toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-12-28',
  nextCallOn: '2026-12-21',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
  declinable: false,
  changes: [],
};

test('the locked view is told from the full one by `locked: true`, which only it has', () => {
  expect(isLocked(LOCKED)).toBe(true);
  expect(isLocked(FULL)).toBe(false);
});

test('a read splits into ready (the full call) and locked; every other state passes through', () => {
  expect(readCall({ state: 'ready', value: FULL })).toEqual({ state: 'ready', value: FULL });
  expect(readCall({ state: 'ready', value: LOCKED })).toEqual({ state: 'locked', value: LOCKED });
  expect(readCall({ state: 'subscription' })).toEqual({ state: 'subscription' });
  expect(readCall({ state: 'none' })).toEqual({ state: 'none' });
});

const today = (decision: TodayData['decision']): TodayData => ({
  consistency: { state: 'none' },
  decision,
  program: { state: 'none' },
  weighIns: { state: 'none' },
  targets: { state: 'none' },
  budget: { state: 'none' },
});

test('the hero of a locked call is the locked hero, carrying only the locked view', () => {
  expect(heroOf(today({ state: 'locked', value: LOCKED }))).toEqual({ kind: 'locked', call: LOCKED });
});

test('the coach has nothing to say "why" about a locked call', () => {
  expect(chips(today({ state: 'locked', value: LOCKED }), '2026-12-22')).not.toContain('today.chips.why');
});

test('the ledger: a locked call is its day only; the call after it has no "after" to read from it', () => {
  const rows = ledgerRows([LOCKED, { ...FULL, readTrendKg: 80 }], 'METRIC');
  expect(rows[0]).toEqual({ locked: true, id: 'l1', date: 'Mon, Dec 21' });
  expect(rows[1]).toMatchObject({ locked: false, entry: { id: 'f1', after: null } });
});

// Type level: a reader that ignores `locked` does not compile. Each @ts-expect-error below is itself an error if the line under it compiles.
test('the type forces the locked branch (checked by tsc)', () => {
  const view: Schemas['CallView'] = LOCKED as Schemas['CallView'];
  // @ts-expect-error `action` is not on a CallView: the locked view has none
  void view.action;
  // @ts-expect-error `reasons` neither
  void view.reasons;
  const read = readCall({ state: 'ready', value: view });
  // @ts-expect-error a CallRead is not a Decision until its state is 'ready'
  void read.value.action;
  if (read.state === 'ready') void read.value.action;
  expect(true).toBe(true);
});
