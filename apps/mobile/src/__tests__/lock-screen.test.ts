/**
 * The lock-screen call (K-515, ADR-048, V3): what the widget shows is the week's call in a few words — its label, never a
 * number (weight, calories, a percentage) — and when it is looked at again. The lock screen is seen without unlocking,
 * and Apple hides a widget's content only if the user changed a setting: the numberless view is ours to keep.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { lockScreenCall } from '@/widgets/lockScreen';

import en from '../../../../data/copy/en.json';

type Decision = components['schemas']['Decision'];
const call = (copyKey: string, over: Partial<Decision> = {}): Decision =>
  ({
    id: 'd1',
    madeOn: '2026-09-28',
    action: { type: 'CONTINUE' },
    reasons: [],
    confidence: 'MEDIUM',
    nextReview: '2026-10-12',
    copyKey,
    application: { state: 'NOT_NEEDED' },
    ...over,
  }) as Decision;

// Every call the copy file can word: "decision.<action>.<rule>" with a title.
const decisions = en.decision as unknown as Record<string, Record<string, unknown>>;
const EVERY_CALL = Object.entries(decisions).flatMap(([action, rules]) =>
  typeof rules === 'object' && rules !== null
    ? Object.entries(rules).filter(([, words]) => typeof words === 'object' && words !== null && 'title' in (words as object)).map(([rule]) => `decision.${action}.${rule}`)
    : [],
);

test('the call’s label and when it is looked at again', () => {
  expect(lockScreenCall(call('decision.continue.toward_goal'))).toEqual({
    line: t('decision.continue.label'),
    next: t('today.call.nextReview', { date: 'Mon, Oct 12' }),
  });
});

test('every call the app can make says no number on the lock screen (V3)', () => {
  expect(EVERY_CALL.length).toBeGreaterThan(30);
  const withNumbers = EVERY_CALL.map((key) => [key, lockScreenCall(call(key)).line] as const).filter(([, line]) => /[\d{}%]/.test(line));
  expect(withNumbers).toEqual([]);
  // The date is the only figure, and only in its own line.
  for (const key of EVERY_CALL) expect(lockScreenCall(call(key)).next).toMatch(/^Next review [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/);
});

test('never the title: on a screen anyone can see, the action only — not why', () => {
  for (const key of EVERY_CALL) expect(lockScreenCall(call(key)).line).not.toBe(t(`${key}.title`));
});

test('a safety call is its general change of phase (ADR-028 #24) — on the phone too, whatever key it came with', () => {
  const safety = lockScreenCall(call('decision.change_phase.low_energy_safety', { safety: true, action: { type: 'CHANGE_PHASE', to: 'BULK' } }));
  expect(safety.line).toBe(t('decision.change_phase.label'));
  // The server words it as a change of phase; a lock screen anyone can see does not rely on that alone.
  const hardStop = lockScreenCall(call('decision.hard_stop.low_energy', { safety: true, action: { type: 'CHANGE_PHASE', to: 'BULK' } }));
  expect(hardStop.line).toBe(t('decision.change_phase.label'));
});

test('no call: says so, no date', () => {
  expect(lockScreenCall(null)).toEqual({ line: t('widget.call.none'), next: null });
});

test('a call the app cannot word is still a call: a neutral line that says there is one, no date', () => {
  expect(lockScreenCall(call('decision.unknown_action.whatever'))).toEqual({ line: t('widget.call.ready'), next: null });
  expect(t('widget.call.ready')).not.toMatch(/[\d{}%]/);
});
