/**
 * What the coach says (K-509, ADR-043 #76): the server sends what a message is about and which of the call's rules
 * answers it, or the key of the engine's own words; the phone says it from the copy, and nothing the model wrote — it
 * writes nothing. A topic not about the call (a doctor, something else) says only itself: no call "standing" after a
 * doctor (U6). The day's chips are answered here, without the model: no quota, nothing sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { has } from '@/copy';
import { load, type Loaded } from '@/today/today';

type Schemas = components['schemas'];

/** A line the coach says: a copy key and its values. */
export type Line = { key: string; values?: Record<string, string> };

/** What the coach says back: its lines, the call it is about, a way on (today's session, by its program day). */
export type Said = { lines: Line[]; call?: Schemas['CoachCall']; open?: { key: string; day: string } };

/** How a day is shown ("Mon, Oct 5"), handed in so this stays a pure reading of the answer. */
type DayWords = (day: string) => string;

/** Topics not about the call: their own sentence and nothing of the call standing (U6: a doctor first), whatever came. */
const NOT_ABOUT_THE_CALL = new Set<Schemas['CoachAnswer']['topic']>(['HEALTH', 'OFF_TOPIC']);

export function linesOf(answer: Schemas['CoachAnswer'], date: DayWords): Line[] {
  // The engine's own words; a key missing is the call as it stands, never an empty answer.
  if (answer.mode === 'DETERMINISTIC') return [{ key: answer.copyKey ?? 'coach.answer.call' }];
  const lines: Line[] = [];
  if (answer.topic !== undefined) lines.push({ key: `coach.topic.${answer.topic.toLowerCase()}` });
  // Only a topic about the call carries a rule; after it, the call stands until new data looks at it again.
  if (answer.rule !== undefined && !NOT_ABOUT_THE_CALL.has(answer.topic)) {
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
 * #24) and that the call stands, with the call; no call yet says so; a call that could not be read is not "none" — it
 * says it could not be read (and without the health data consent, that it needs it).
 */
export function chipAnswer(chip: string, decision: Loaded<Schemas['Decision']>, date: DayWords, session?: string): Said {
  if (chip === 'today.chips.why') {
    if (decision.state === 'none') return { lines: [{ key: 'coach.answer.no_call' }] };
    if (decision.state === 'consent') return { lines: [{ key: 'today.consent.body' }] };
    if (decision.state === 'failed') return { lines: [{ key: 'coach.chip.unread' }] };
    const call = decision.value;
    const reasons = call.safety === true ? [] : call.reasons.map((reason) => `decision.rule.${reason.rule}`).filter((key) => has(key));
    return {
      lines: [...reasons.map((key) => ({ key })), stands(call.nextReview, date)],
      call: { decisionId: call.id, copyKey: call.copyKey, nextReview: call.nextReview },
    };
  }
  const said: Said = { lines: [{ key: CHIP_WORDS[chip] }] };
  // A different move is done in the session (its "add a move"), opened on today's program day as Train opens it.
  return chip === 'today.chips.swap' && session !== undefined ? { ...said, open: { key: 'coach.chip.openWorkout', day: session } } : said;
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
  const { value } = answer;
  // A topic not about the call shows no card either: nothing says the call stands after "your doctor comes first" (U6).
  const aboutTheCall = value.mode === 'DETERMINISTIC' || !NOT_ABOUT_THE_CALL.has(value.topic);
  return { state: 'ready', said: { lines: linesOf(value, date), call: aboutTheCall ? value.call : undefined }, standard: value.mode === 'DETERMINISTIC' };
}
