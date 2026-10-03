/**
 * The call ledger (K-611, L3 Y4): every call, newest first, each with what came after it — the trend weight it read and
 * the one the next call read. "After", never "because": the ledger claims no cause (L3 Y4).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ledgerEntries } from '@/today/ledger';
import { formatWeight } from '@/units/units';

type Decision = components['schemas']['Decision'];

const call = (id: string, madeOn: string, extra: Partial<Decision> = {}): Decision => ({
  id,
  madeOn,
  action: { type: 'CONTINUE' } as Decision['action'],
  reasons: [{ rule: 'toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'HIGH',
  nextReview: '2026-10-12',
  copyKey: 'decision.continue.toward_goal',
  application: { state: 'NOT_NEEDED' },
  ...extra,
});

test('each call says what came after it: its trend weight and the next call’s, by the next call’s day', () => {
  const entries = ledgerEntries(
    [call('c3', '2026-10-05', { readTrendKg: 80.4 }), call('c2', '2026-09-28', { readTrendKg: 81.0 }), call('c1', '2026-09-21', { readTrendKg: 81.6 })],
    'METRIC',
  );

  expect(entries.map((entry) => entry.id)).toEqual(['c3', 'c2', 'c1']);
  expect(entries[0]?.after).toBeNull(); // nothing has come after the latest yet
  expect(entries[1]?.after).toBe(t('ledger.after', { from: formatWeight(81.0, 'METRIC'), to: formatWeight(80.4, 'METRIC'), date: 'Mon, Oct 5' }));
  expect(entries[2]?.after).toBe(t('ledger.after', { from: formatWeight(81.6, 'METRIC'), to: formatWeight(81.0, 'METRIC'), date: 'Mon, Sep 28' }));
  expect(entries[2]?.title).toBe(t('decision.continue.toward_goal.title'));
  expect(entries[2]?.date).toBe('Mon, Sep 21');
});

test('a call, or the next one, that read no trend says nothing after it — nothing is made up', () => {
  const entries = ledgerEntries([call('c2', '2026-09-28'), call('c1', '2026-09-21', { readTrendKg: 81.6 })], 'METRIC');
  expect(entries[1]?.after).toBeNull();
  expect(ledgerEntries([call('c2', '2026-09-28', { readTrendKg: 81.0 }), call('c1', '2026-09-21')], 'METRIC')[1]?.after).toBeNull();
});

test('in the user’s units', () => {
  const entries = ledgerEntries([call('c2', '2026-09-28', { readTrendKg: 81.0 }), call('c1', '2026-09-21', { readTrendKg: 81.6 })], 'IMPERIAL');
  expect(entries[1]?.after).toContain(formatWeight(81.6, 'IMPERIAL'));
});

test('applied and undone are said; a call that changed nothing says nothing of it', () => {
  const entries = ledgerEntries(
    [
      call('c3', '2026-10-05', { application: { state: 'APPLIED', appliedAt: '2026-10-05T08:00:00Z' } }),
      call('c2', '2026-09-28', { application: { state: 'UNDONE', appliedAt: '2026-09-28T08:00:00Z', undoneAt: '2026-09-29T08:00:00Z' } }),
      call('c1', '2026-09-21'),
    ],
    'METRIC',
  );
  expect(entries.map((entry) => entry.state)).toEqual([t('ledger.state.applied'), t('ledger.state.undone'), null]);
  expect(ledgerEntries([call('c4', '2026-10-12', { application: { state: 'PENDING' } })], 'METRIC')[0]?.state).toBe(t('ledger.state.pending'));
});

test('the words claim no cause', () => {
  for (const key of ['ledger.after', 'ledger.title', 'ledger.intro', 'ledger.state.applied', 'ledger.state.undone', 'ledger.state.pending']) {
    expect(t(key)).not.toMatch(/missing|because|caused|thanks to|led to|so that/i);
  }
});
