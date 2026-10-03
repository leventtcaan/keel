/**
 * The call ledger (K-611, L3 Y4): every call, newest first, and what came after it — the trend weight it read and the
 * one the next call read, as the server kept them (readTrendKg). "After", never "because": no cause is claimed.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { weekdayDate } from '@/today/today';
import { formatWeight, type UnitSystem } from '@/units/units';

type Decision = components['schemas']['Decision'];

export type LedgerEntry = { id: string; date: string; title: string; state: string | null; after: string | null };

const STATE: Partial<Record<Decision['application']['state'], string>> = {
  APPLIED: 'ledger.state.applied',
  UNDONE: 'ledger.state.undone',
  PENDING: 'ledger.state.pending',
};

/** {@code calls} newest first, as the ledger pages them: the call before an entry in the list is the one after it in time. */
export function ledgerEntries(calls: Decision[], units: UnitSystem): LedgerEntry[] {
  return calls.map((call, i) => {
    const next = i > 0 ? calls[i - 1] : undefined;
    const after =
      next !== undefined && call.readTrendKg !== undefined && next.readTrendKg !== undefined
        ? t('ledger.after', { from: formatWeight(call.readTrendKg, units), to: formatWeight(next.readTrendKg, units), date: weekdayDate(next.madeOn) })
        : null;
    const state = STATE[call.application.state];
    return { id: call.id, date: weekdayDate(call.madeOn), title: t(`${call.copyKey}.title`), state: state === undefined ? null : t(state), after };
  });
}
