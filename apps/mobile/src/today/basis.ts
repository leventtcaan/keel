/**
 * "Why this call"'s data (K-502, K-519, Ö-25): the rows the call read, as the server kept them from the call's own
 * snapshot — nothing counted or estimated here. Weights rounded once, in the user's units (ADR-029); a row the call did
 * not read is absent, and so is a training figure that says nothing (zero, or no).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { formatWeight, roundTo, type UnitSystem } from '@/units/units';

type Basis = components['schemas']['DecisionBasis'];

export type BasisRow = { label: string; value: string };

/** Enough digits to undo a product's floating-point error, far fewer than a ratio of real counts needs. */
const FLOAT_DIGITS = 9;

export function basisRows(basis: Basis, units: UnitSystem): BasisRow[] {
  const rows: BasisRow[] = [];
  const add = (label: string, value: string) => rows.push({ label: t(`why.row.${label}`), value });

  const first = basis.weeks[0];
  const latest = basis.weeks[basis.weeks.length - 1];
  if (first !== undefined && latest !== undefined) {
    add('trend', basis.weeks.length === 1 ? formatWeight(latest.kg, units) : t('why.value.trend', { from: formatWeight(first.kg, units), to: formatWeight(latest.kg, units) }));
  }
  if (basis.changeKgPerWeek !== undefined) add('rate', rate(basis.changeKgPerWeek, units));
  // Rounded down, as the consistency number: it never claims more than was done — after the float's own error is gone
  // (0.58 × 100 is 57.99999999999999; the server's whole percent is 58).
  // The counts when the call kept them (K-526, ADR-041 #63: "16 of 19" says more than a share); an older call's share only.
  if (basis.adherenceCount !== undefined) add('adherence', t('why.value.adherenceCount', { done: basis.adherenceCount.done, planned: basis.adherenceCount.planned }));
  else if (basis.adherence !== undefined) add('adherence', t('why.value.adherence', { percent: Math.floor(roundTo(basis.adherence * 100, FLOAT_DIGITS)) }));

  const { look, training, recovery, waist, appetite } = basis.answers;
  if (look !== undefined) add('look', t(`why.answer.look.${look.toLowerCase()}`));
  if (training !== undefined) add('training', t(`checkIn.choice.training.${training.toLowerCase()}`));
  if (recovery !== undefined) add('recovery', t(`checkIn.choice.recovery.${recovery.toLowerCase()}`));
  if (waist !== undefined) add('waist', t(`why.answer.waist.${waist.toLowerCase()}`));
  if (appetite !== undefined) add('appetite', t(`checkIn.choice.appetite.${appetite.toLowerCase()}`));

  const lifts = basis.training;
  if (lifts !== undefined) {
    const count = (label: string, value: number) => value > 0 && add(label, String(value));
    count('stalled', lifts.stalledSessions);
    count('loadHeld', lifts.weeksLoadHeld);
    count('monthsStalled', lifts.monthsStalled);
    count('planMissed', lifts.weeksPlanMissed);
    if (lifts.restedLastWeek) add('rested', t('why.value.yes'));
    if (lifts.loadsBelowLastWeek) add('loadsBelow', t('why.value.yes'));
  }
  if (basis.pausedBy !== undefined) add('paused', t(`state.kind.${basis.pausedBy.toLowerCase()}.title`));
  return rows;
}

/** Down, up, or steady when the change is too small to show at the display's rounding. */
function rate(kgPerWeek: number, units: UnitSystem): string {
  const weight = formatWeight(Math.abs(kgPerWeek), units);
  if (weight === formatWeight(0, units)) return t('why.value.rateFlat');
  return t(kgPerWeek < 0 ? 'why.value.rateDown' : 'why.value.rateUp', { weight });
}
