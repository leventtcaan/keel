/**
 * What the call changes in the plan, old to new (K-978, ADR-077 #3 "the targets that change", Ek 4). The server says
 * each target the call moved, as the plan held it before and as the call set it (`Decision.changes`); the phone writes
 * the numbers, it works none out (U1): no value is taken from the plan, none is made up where the server said there was
 * none. Calls not applied (declined, undone) carry the value in force, not the one the call set.
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import { formatLoad, type UnitSystem } from '@/units/units';

type Schemas = components['schemas'];

/**
 * `from` is the old value without its unit (the new one carries it: "2,100 > 1,850 kcal"). `change`: old to new · `new`: no target was in force, so there is no old one to show · `inForce`: the target the plan
 * follows now, for a call kept off the plan or undone · `held`: a move whose load the call holds, said as the target it is held to
 * and no old one beside it, so a target that falls to the top of the range does not read as a cut (K-1009).
 */
export type ChangeRow = {
  id: string;
  kind: 'change' | 'new' | 'inForce' | 'held';
  label: string;
  from: string | null;
  to: string;
  /** The row as VoiceOver reads it: one sentence, the old value said as old. */
  spoken: string;
};

const NUMBER = new Intl.NumberFormat('en-US');

/**
 * A target's value in the words of its kind; null when the server sent none (an empty value). `bare`: the number alone
 * (the old value beside the new one, which carries the unit).
 */
function valueText(what: Schemas['DecisionChange']['what'], value: Schemas['ChangeValue'] | undefined, bare = false): string | null {
  if (value === undefined) return null;
  switch (what) {
    case 'CALORIES':
      if (value.targetKcal === undefined) return null;
      return bare ? NUMBER.format(value.targetKcal) : t('callScreen.changes.kcal', { kcal: NUMBER.format(value.targetKcal) });
    case 'STEPS':
      if (value.stepsPerDay === undefined) return null;
      return bare ? NUMBER.format(value.stepsPerDay) : t('callScreen.changes.steps', { steps: NUMBER.format(value.stepsPerDay) });
    case 'PHASE':
      return value.phase === undefined ? null : t(`callScreen.changes.phase.${value.phase}`);
    case 'MOVE':
      return null; // a move's target is moveRow's: it needs the user's units
  }
}

/**
 * A hold of the load on a move (K-1009, ADR-077 Ek 6): the move's name from the copy and the target the server says, the
 * load in the user's units. A move with no name in the copy, or no target the server sent, has no row: nothing is made up (U1).
 */
function moveRow(change: Schemas['DecisionChange'], offPlan: boolean, units: UnitSystem): ChangeRow | null {
  const nameKey = `exercises.${change.exerciseId}.name`;
  if (change.exerciseId === undefined || !has(nameKey)) return null;
  const move = t(nameKey);
  const written = (value: Schemas['ChangeValue'] | undefined) =>
    value?.target === undefined ? null : t('callScreen.changes.moveTarget', { load: formatLoad(value.target.loadKg, units), reps: value.target.reps });
  const id = `MOVE:${change.exerciseId}`;
  if (change.inForce !== undefined) {
    const label = t('callScreen.changes.inForce', { what: move });
    const to = written(change.inForce) ?? t('callScreen.changes.noneInForce');
    return { id, kind: 'inForce', label, from: null, to, spoken: t('callScreen.changes.spokenValue', { what: label, to }) };
  }
  const to = written(change.after);
  if (offPlan || to === null) return null;
  const label = t('callScreen.changes.held', { move });
  return { id, kind: 'held', label, from: null, to, spoken: t('callScreen.changes.spokenValue', { what: label, to }) };
}

function rowOf(change: Schemas['DecisionChange'], offPlan: boolean, units: UnitSystem): ChangeRow | null {
  const { what } = change;
  if (what === 'MOVE') return moveRow(change, offPlan, units);
  const name = t(`callScreen.changes.label.${what}`);
  if (change.inForce !== undefined) {
    const label = t('callScreen.changes.inForce', { what: name });
    const to = valueText(what, change.inForce) ?? t('callScreen.changes.noneInForce');
    return { id: what, kind: 'inForce', label, from: null, to, spoken: t('callScreen.changes.spokenValue', { what: label, to }) };
  }
  // A call kept off the plan or undone: its `after` is not what the plan follows, and with no `inForce` there is nothing true to show (U1).
  if (offPlan) return null;
  const to = valueText(what, change.after);
  if (to === null) return null;
  const spokenFrom = valueText(what, change.before);
  if (spokenFrom === null) {
    const label = t('callScreen.changes.new', { what: name });
    return { id: what, kind: 'new', label, from: null, to, spoken: t('callScreen.changes.spokenValue', { what: label, to }) };
  }
  const from = valueText(what, change.before, true) ?? spokenFrom;
  return { id: what, kind: 'change', label: name, from, to, spoken: t('callScreen.changes.spoken', { what: name, from: spokenFrom, to }) };
}

/** The call's changes in the server's order; none for a call that moved no target. */
export function changeRows(decision: Schemas['Decision'], units: UnitSystem): ChangeRow[] {
  const state = decision.application.state;
  const offPlan = state === 'DECLINED' || state === 'UNDONE';
  return decision.changes.flatMap((change) => rowOf(change, offPlan, units) ?? []);
}
