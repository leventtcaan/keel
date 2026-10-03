/**
 * What the coach says (K-509, ADR-043 #76): the server sends what a message is about and which of the call's rules
 * answers it, or the key of the engine's own words; the phone says it from the copy, and nothing the model wrote — it
 * writes nothing. A topic not about the call (a doctor, something else) says only itself: no call "standing" after a
 * doctor (U6). The day's chips are answered here, without the model: no quota, nothing sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { has } from '@/copy';
import { load } from '@/today/today';

type Schemas = components['schemas'];

/** A line the coach says: a copy key and its values. */
export type Line = { key: string; values?: Record<string, string> };

/** What the coach says back: its lines, the call it is about, a way on (the session, for a swap). */
export type Said = { lines: Line[]; call?: Schemas['CoachCall']; open?: { key: string; path: '/workout' } };

/** How a day is shown ("Mon, Oct 5"), handed in so this stays a pure reading of the answer. */
type DayWords = (day: string) => string;

export function linesOf(answer: Schemas['CoachAnswer'], date: DayWords): Line[] {
  if (answer.mode === 'DETERMINISTIC') return answer.copyKey !== undefined ? [{ key: answer.copyKey }] : [];
  const lines: Line[] = [];
  if (answer.topic !== undefined) lines.push({ key: `coach.topic.${answer.topic.toLowerCase()}` });
  // Only a topic about the call carries a rule; after it, the call stands until new data looks at it again.
  if (answer.rule !== undefined) {
    const rule = `decision.rule.${answer.rule}`;
    if (has(rule)) lines.push({ key: rule });
    if (answer.call !== undefined) lines.push(stands(answer.call.nextReview, date));
  }
  return lines;
}

/** The chips the day offers (today.chips.*), each answered on the phone. */
const CHIP_WORDS: Record<string, string> = {
  'today.chips.weighIn': 'coach.chip.weighIn',
  'today.chips.start': 'coach.chip.start',
  'today.chips.swap': 'coach.chip.swap',
};

export function isChip(key: string): boolean {
  return key === 'today.chips.why' || key in CHIP_WORDS;
}

/**
 * A chip's answer. "Why this call?": every rule's sentence (none for a safety call — its general change only, ADR-028
 * #24) and that the call stands, with the call; without a call, that there is none yet.
 */
export function chipAnswer(chip: string, decision: Schemas['Decision'] | null, date: DayWords): Said {
  if (chip === 'today.chips.why') {
    if (decision === null) return { lines: [{ key: 'coach.answer.no_call' }] };
    const reasons = decision.safety === true ? [] : decision.reasons.map((reason) => `decision.rule.${reason.rule}`).filter((key) => has(key));
    return {
      lines: [...reasons.map((key) => ({ key })), stands(decision.nextReview, date)],
      call: { decisionId: decision.id, copyKey: decision.copyKey, nextReview: decision.nextReview },
    };
  }
  const said: Said = { lines: [{ key: CHIP_WORDS[chip] }] };
  return chip === 'today.chips.swap' ? { ...said, open: { key: 'coach.chip.openWorkout', path: '/workout' } } : said;
}

function stands(nextReview: string, date: DayWords): Line {
  return { key: 'coach.answer.stands', values: { date: date(nextReview) } };
}

export type Asked =
  | { state: 'ready'; said: Said; standard: boolean }
  | { state: 'consent' }
  | { state: 'failed' };

/** A message to the coach: its answer said from the copy, the engine's own words marked as such; or why there is none. */
export async function ask(api: ApiClient, text: string, date: DayWords): Promise<Asked> {
  const answer = await load(() => api.POST('/v1/coach/messages', { body: { text } }));
  if (answer.state === 'consent') return { state: 'consent' };
  if (answer.state !== 'ready') return { state: 'failed' };
  return { state: 'ready', said: { lines: linesOf(answer.value, date), call: answer.value.call }, standard: answer.value.mode === 'DETERMINISTIC' };
}
