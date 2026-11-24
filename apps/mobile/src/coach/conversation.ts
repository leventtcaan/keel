/**
 * What the coach says (K-509, ADR-043 #76, ADR-092): the server sends either the model's words, which it checked (every number one
 * the engine gave, nothing that changes or concedes the call: `reply`), or what a message is about and which of the call's rules
 * answers it, or the key of the engine's own words; the phone shows the checked words as they came and says the rest from the
 * copy. A topic not about the call (a doctor, something else) says only itself: no call "standing" after a doctor (U6), and no
 * model words. The day's chips are answered here, without the model: no quota, nothing sent.
 */
import type { ApiClient } from '@/api/client';
import type { components } from '@/api/schema';
import { has } from '@/copy';
import { type CallRead, chips, load, type TodayData } from '@/today/today';

type Schemas = components['schemas'];

/** A line the coach says: a copy key and its values. */
export type Line = { key: string; values?: Record<string, string> };

/**
 * What the coach says back: the model's checked words (`text`, ADR-092) before its lines, the call it is about, a way on (today's
 * session, by its program day).
 */
export type Said = { lines: Line[]; text?: string; heading?: string; call?: Schemas['CoachCall']; open?: { key: string; day: string } };

/** How a day is shown ("Mon, Oct 5"), handed in so this stays a pure reading of the answer. */
type DayWords = (day: string) => string;

/** Topics not about the call: their own sentence and nothing of the call standing (U6: a doctor first), whatever came. */
const NOT_ABOUT_THE_CALL = new Set<Schemas['CoachAnswer']['topic']>(['HEALTH', 'OFF_TOPIC']);

export function linesOf(answer: Schemas['CoachAnswer'], date: DayWords): Line[] {
  // The engine's own words; a key missing is the call as it stands, never an empty answer.
  if (answer.mode === 'DETERMINISTIC') return [{ key: answer.copyKey ?? 'coach.answer.call' }];
  const lines: Line[] = [];
  const aboutTheCall = answer.topic === undefined || !NOT_ABOUT_THE_CALL.has(answer.topic);
  // The model's words, checked on the server, say the topic and the rule themselves; the call then stands, in the app's words.
  if (answer.reply !== undefined && aboutTheCall) {
    if (answer.call !== undefined) lines.push(stands(answer.call.nextCallOn, date));
    return lines;
  }
  if (answer.topic !== undefined) lines.push({ key: `coach.topic.${answer.topic.toLowerCase()}` });
  // Only a topic about the call carries a rule; after it, the call stands until new data looks at it again.
  if (answer.rule !== undefined && !NOT_ABOUT_THE_CALL.has(answer.topic)) {
    const rule = `decision.rule.${answer.rule}`;
    if (has(rule)) lines.push({ key: rule });
    if (answer.call !== undefined) lines.push(stands(answer.call.nextCallOn, date));
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

/** A meal said in words, read into a draft of the database's foods (K-504): always on offer in the coach. */
export const MEAL_CHIP = 'coach.meal.chip';

/**
 * The coach's chips (prototype 2.1): three — the day's own first (two at most), a meal in words always, and how it works
 * when the day gives fewer.
 */
export function coachChips(today: TodayData, day: string): string[] {
  const own = chips(today, day).filter((key) => key !== 'today.chips.start').slice(0, 2);
  return [...own, MEAL_CHIP, 'today.chips.start'].slice(0, 3);
}

/**
 * A chip's answer. "Why this call?": every rule's sentence (none for a safety call — its general change only, ADR-028
 * #24) and that the call stands, with the call; no call yet says so; a call that could not be read is not "none" — it
 * says it could not be read (and without the health data consent, that it needs it).
 */
export function chipAnswer(chip: string, decision: CallRead, date: DayWords, session?: string): Said {
  if (chip === 'today.chips.why') {
    if (decision.state === 'none') return { lines: [{ key: 'coach.answer.no_call' }] };
    if (decision.state === 'consent') return { lines: [{ key: 'today.consent.body' }] };
    // A call the account has not unlocked (ADR-091 Ek 1): that it is ready, nothing of what it says.
    if (decision.state === 'locked') return { lines: [{ key: 'lockedCall.line', values: { date: date(decision.value.weekOf) } }] };
    // The call needs no subscription (ADR-056 #10): that answer here is one more call not read.
    if (decision.state === 'failed' || decision.state === 'subscription') return { lines: [{ key: 'coach.chip.unread' }] };
    const call = decision.value;
    const reasons = call.safety === true ? [] : call.reasons.map((reason) => `decision.rule.${reason.rule}`).filter((key) => has(key));
    return {
      lines: [...reasons.map((key) => ({ key })), stands(call.nextCallOn, date)],
      call: { decisionId: call.id, copyKey: call.copyKey, nextReview: call.nextReview, nextCallOn: call.nextCallOn },
    };
  }
  const said: Said = { lines: [{ key: CHIP_WORDS[chip] }] };
  // A different move is done in the session (its "add a move"), opened on today's program day as Train opens it.
  return chip === 'today.chips.swap' && session !== undefined ? { ...said, open: { key: 'coach.chip.openWorkout', day: session } } : said;
}

/**
 * That the call stands, until the day the next call opens: the server's Decision.nextCallOn (U1; the phone works out no
 * date, and not nextReview, which is the engine's window for the data). Without it the sentence has no date.
 */
function stands(nextCallOn: string | undefined, date: DayWords): Line {
  return nextCallOn === undefined ? { key: 'coach.answer.standsNoDate' } : { key: 'coach.answer.stands', values: { date: date(nextCallOn) } };
}

export type Asked =
  | { state: 'ready'; said: Said; standard: boolean }
  | { state: 'consent' }
  /** The model's answer needs a subscription (403 ENTITLEMENT_REQUIRED, K-703): the way to the plans (K-702). */
  | { state: 'subscription' }
  | { state: 'failed' };

/** A message to the coach: its answer said from the copy, the engine's own words marked as such; or why there is none. */
export async function ask(api: ApiClient, text: string, date: DayWords, decisionId?: string): Promise<Asked> {
  const answer = await load(() => api.POST('/v1/coach/messages', { body: decisionId === undefined ? { text } : { text, decisionId } }));
  if (answer.state === 'consent') return { state: 'consent' };
  if (answer.state === 'subscription') return { state: 'subscription' };
  if (answer.state !== 'ready') return { state: 'failed' };
  const { value } = answer;
  // A topic not about the call shows no card either: nothing says the call stands after "your doctor comes first" (U6).
  const aboutTheCall = value.mode === 'DETERMINISTIC' || !NOT_ABOUT_THE_CALL.has(value.topic);
  const words = value.mode === 'MODEL' && aboutTheCall ? value.reply : undefined;
  return { state: 'ready', said: { lines: linesOf(value, date), text: words, call: aboutTheCall ? value.call : undefined }, standard: value.mode === 'DETERMINISTIC' };
}

export type Read = { state: 'ready'; draft: Schemas['MealDraft'] } | { state: 'consent' } | { state: 'subscription' } | { state: 'failed' };

/** A meal in words, read into a draft (K-504): the database's foods for each, nothing of what they hold (U1). */
export async function readMeal(api: ApiClient, text: string): Promise<Read> {
  const draft = await load(() => api.POST('/v1/meals/parse', { body: { text } }));
  if (draft.state === 'consent') return { state: 'consent' };
  if (draft.state === 'subscription') return { state: 'subscription' };
  return draft.state === 'ready' ? { state: 'ready', draft: draft.value } : { state: 'failed' };
}

/** The starter questions, the coach's first suggestions (ADR-092 #7): the first two are sent as they are; the third is the start of the user's own. */
export const STARTERS = ['why', 'week', 'whatif'] as const;

/** One message of the conversation, as the phone shows it: the user's own words (which they may ask the coach to remember), or the coach's. */
export type Past =
  | { from: 'user'; text: string; id: string }
  | { from: 'coach'; said: Said; standard: boolean; id: string };

/**
 * The conversation so far, from the server (ADR-092 #3), oldest first; none when it cannot be read (no history is no reason to
 * stop the coach). The coach's engine sentences come back as their key, said from the copy and marked as the engine's.
 */
export async function loadHistory(api: ApiClient): Promise<Past[]> {
  const history = await load(() => api.GET('/v1/coach/history'));
  if (history.state !== 'ready') return [];
  return history.value.messages.flatMap((message): Past[] => {
    if (message.role === 'USER') return message.text === undefined ? [] : [{ from: 'user', text: message.text, id: message.id }];
    if (message.text !== undefined) return [{ from: 'coach', said: { lines: [], text: message.text }, standard: false, id: message.id }];
    if (message.copyKey === undefined || !has(message.copyKey)) return [];
    return [{ from: 'coach', said: { lines: [{ key: message.copyKey }] }, standard: message.copyKey.startsWith('coach.answer.'), id: message.id }];
  });
}

export type Remembered = 'saved' | 'full' | 'refused' | 'failed';

/** "Remember this" (ADR-092 #3): the user's own sentence, kept only because they asked. 409 is a full list, 400 words the coach could not say. */
export async function remember(api: ApiClient, text: string): Promise<Remembered> {
  try {
    const answer = await api.POST('/v1/coach/memory', { body: { text } });
    if (answer.data !== undefined) return 'saved';
    if (answer.response.status === 409) return 'full';
    return answer.response.status === 400 ? 'refused' : 'failed';
  } catch {
    return 'failed';
  }
}
