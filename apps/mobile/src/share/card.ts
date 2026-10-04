/**
 * The share card's words (K-612, L3 Y5): a record and a call, never a body. The weeks on track since the first call
 * (K-608: never reset, one off week forgiven), the latest call by its title (not a "not yet"), a lift's estimated max
 * from the strength chart's own numbers (K-604, its first and last week, "since" the first) and the weight trend only
 * when the user turns it on (off by default). A safety call is left off (ADR-054 §4). No body-fat number (U4), no photo or body (U12, V1), no blame (U7) — the copy is
 * checked against data/copy/forbidden-phrases.json and share-forbidden.json.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { strengthMoves, strengthPoints } from '@/progress/strength';
import type { Session } from '@/train/history';
import { exerciseName, shortDate } from '@/train/program';
import type { Move } from '@/train/trainData';
import { type UnitSystem, formatLoad, formatWeight } from '@/units/units';

import { shareParams } from './params';

type Schemas = components['schemas'];

export type CardFacts = {
  consistency: Schemas['Consistency'] | null;
  latestCall: Schemas['Decision'] | null;
  /** The strength chart's lift: its name, its first and last week's best estimated max in kg, and that first week. */
  strength: { move: string; fromKg: number; toKg: number; since: string } | null;
  /** The weight trend's first and last value in the strength chart's window, in kg, and the first point's day. */
  weight: { fromKg: number; toKg: number; since: string } | null;
};

export type CardText = { heading: string; lines: string[]; footer: string };

/**
 * A call the card leaves off (ADR-054 §4, provisional — question 104): the hard stop (`safety`), or one resting on a rule
 * of the safety net — a health signal, and rapid loss tells the weight's direction with the weight off.
 */
function withheld(call: Schemas['Decision']): boolean {
  return call.safety === true || call.reasons.some((reason) => shareParams.withheldRules.includes(reason.rule));
}

export function cardText({ consistency, latestCall, strength, weight }: CardFacts, units: UnitSystem, showWeight: boolean): CardText {
  const lines: string[] = [];
  const record = consistency?.record;
  if (record !== undefined && record.countedWeeks > 0) {
    lines.push(t('share.card.record', { onTrack: record.onTrackWeeks, counted: record.countedWeeks }));
    if (record.forgivenWeeks > 0) {
      lines.push(t(record.forgivenWeeks === 1 ? 'share.card.forgiven' : 'share.card.forgivenMany', { count: record.forgivenWeeks }));
    }
  }
  if (latestCall !== null && latestCall.action.type !== 'NO_DECISION_YET' && !withheld(latestCall)) {
    lines.push(t('share.card.call', { call: t(`${latestCall.copyKey}.title`) }));
  }
  if (strength !== null) {
    lines.push(
      t('share.card.strength', {
        move: strength.move,
        date: shortDate(strength.since),
        from: formatLoad(strength.fromKg, units),
        to: formatLoad(strength.toKg, units),
      }),
    );
  }
  if (showWeight && weight !== null) {
    lines.push(t('share.card.weight', { date: shortDate(weight.since), from: formatWeight(weight.fromKg, units), to: formatWeight(weight.toKg, units) }));
  }
  return { heading: t('share.card.heading'), lines, footer: t('share.card.footer') };
}

/** The lift the strength chart shows first (the most weeks), when it has two weeks to compare; its real estimates. */
export function strengthFact(moves: ReadonlyMap<string, Move>, sessions: Session[], today: string): CardFacts['strength'] {
  const lift = strengthMoves(moves, sessions, today)[0];
  if (lift === undefined) return null;
  const points = strengthPoints(lift, sessions, today);
  if (points.length < 2) return null;
  return { move: exerciseName(lift, moves), fromKg: points[0].kg, toKg: points[points.length - 1].kg, since: points[0].week };
}

/** A line broken at spaces into pieces of at most `max` characters; a single longer word stays whole. */
export function wrap(text: string, max: number): string[] {
  const pieces: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      pieces.push(line);
      line = word;
    }
  }
  if (line !== '') pieces.push(line);
  return pieces;
}
