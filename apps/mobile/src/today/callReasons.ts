/**
 * The call's reasons, one line each (K-978, ADR-077 #3 "the data and the rule", Ek 4). The line is the rule's short
 * template (`decision.ruleShort.<rule>`) filled with the numbers the server read (`Reason.facts`): the server says the
 * numbers, the app the words (U1), and no number is made up. A rule whose numbers the call did not keep (a call from
 * before they were) falls back to the longer sentence (`decision.rule.<rule>`); a call resting on the safety net says no
 * reason at all, only its kind of source (ADR-028 #24).
 */
import type { components } from '@/api/schema';
import { has, t } from '@/copy';
import { formatWeight, type UnitSystem } from '@/units/units';

type Schemas = components['schemas'];

export type CallReason = { text: string | null; tag: Schemas['SourceTag'] };

const NUMBER = new Intl.NumberFormat('en-US');

/**
 * The pace as a weight in the user's units with its sign as read (ADR-029): the server's kilograms are shown once, rounded
 * to what the screen shows, so a pound screen never says a kilogram. A pace that rounds to nothing carries no sign.
 */
function pace(kgPerWeek: number, units: UnitSystem): string {
  const weight = formatWeight(Math.abs(kgPerWeek), units);
  return kgPerWeek < 0 && weight !== formatWeight(0, units) ? `-${weight}` : weight;
}

/**
 * The numbers as the templates write them: the pace with its unit (the placeholder keeps the server's fact name; the
 * template adds no unit of its own), a calorie step with thousands.
 */
function figures(facts: Schemas['ReasonFacts'] | undefined, units: UnitSystem): Record<string, string | number> {
  if (facts === undefined) return {};
  const found: Record<string, string | number> = {};
  if (facts.kgPerWeek !== undefined) found.kgPerWeek = pace(facts.kgPerWeek, units);
  if (facts.kcal !== undefined) found.kcal = NUMBER.format(facts.kcal);
  for (const name of ['weeks', 'done', 'planned', 'sessions'] as const) {
    const value = facts[name];
    if (value !== undefined) found[name] = value;
  }
  return found;
}

function sentence(reason: Schemas['Reason'], units: UnitSystem): string | null {
  const short = `decision.ruleShort.${reason.rule}`;
  if (has(short)) {
    const text = t(short, figures(reason.facts, units));
    // A placeholder left over is a number the call did not keep: the longer sentence says it without one.
    if (!/\{\w+\}/.test(text)) return text;
  }
  const long = `decision.rule.${reason.rule}`;
  return has(long) ? t(long) : null;
}

export function callReasons(decision: Schemas['Decision'], units: UnitSystem): CallReason[] {
  return decision.reasons.map((reason) => ({ text: decision.safety === true ? null : sentence(reason, units), tag: reason.source.tag }));
}
