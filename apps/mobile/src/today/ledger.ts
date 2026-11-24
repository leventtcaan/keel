/**
 * The call ledger (K-611, L3 Y4): every call, newest first, and what came after it — the trend weight it read and the
 * one the next call read, as the server kept them (readTrendKg). "After", never "because": no cause is claimed.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { isLocked, weekdayDate } from '@/today/today';
import { formatWeight, type UnitSystem } from '@/units/units';

type Schemas = components['schemas'];
type Decision = Schemas['Decision'];

export type LedgerEntry = { id: string; date: string; title: string; state: string | null; after: string | null };

const STATE: Partial<Record<Decision['application']['state'], string>> = {
  APPLIED: 'ledger.state.applied',
  UNDONE: 'ledger.state.undone',
  PENDING: 'ledger.state.pending',
};

/** A row of the ledger: a locked call (ADR-091 Ek 1) is only its day, nothing of what it says, and it opens no "why". */
export type LedgerRow = { locked: true; id: string; date: string } | { locked: false; entry: LedgerEntry };

/** {@code calls} newest first, as the ledger pages them: the call before an entry in the list is the one after it in time. */
export function ledgerRows(calls: Schemas['CallView'][], units: UnitSystem): LedgerRow[] {
  return calls.map((call, i): LedgerRow => {
    if (isLocked(call)) return { locked: true, id: call.id, date: weekdayDate(call.madeOn) };
    const next = i > 0 ? calls[i - 1] : undefined;
    return { locked: false, entry: entryOf(call, i, next === undefined || isLocked(next) ? undefined : next, units) };
  });
}

/** The full calls only; see ledgerRows for the whole page. */
export function ledgerEntries(calls: Decision[], units: UnitSystem): LedgerEntry[] {
  return calls.map((call, i) => entryOf(call, i, i > 0 ? calls[i - 1] : undefined, units));
}

function entryOf(call: Decision, i: number, next: Decision | undefined, units: UnitSystem): LedgerEntry {
  const after =
    next !== undefined && call.readTrendKg !== undefined && next.readTrendKg !== undefined
      ? t('ledger.after', { from: formatWeight(call.readTrendKg, units), to: formatWeight(next.readTrendKg, units), date: weekdayDate(next.madeOn) })
      : null;
  // Only the latest call can be applied: an older one left pending is history, not something still owed (U7).
  const state = call.application.state === 'PENDING' && i > 0 ? undefined : STATE[call.application.state];
  return { id: call.id, date: weekdayDate(call.madeOn), title: t(`${call.copyKey}.title`), state: state === undefined ? null : t(state), after };
}
