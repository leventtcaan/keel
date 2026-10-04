/**
 * The SCOFF gate before the shape projection (K-607, ADR-050). Five yes-or-no questions — the SCOFF questionnaire (BMJ 1999),
 * word for word in data/copy/en.json — one point per yes; scoff_unavailable_from (2) or more keeps the projection off.
 *
 * The answers are only counted here and then dropped: nothing stores or sends them. What stays is the result, on this phone
 * only (expo-sqlite/kv-store) and with no reason written — "unavailable", never what was answered (V4). A result of
 * "unavailable" is final on this phone: recording "clear" after it changes nothing, so the gate cannot be answered around.
 */
import params from '../../../../data/parameters/projection.json';
import { regionOf } from '@/units/units';
import type { KeyValue } from '@/units/preference';

export const SCOFF_QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
export type ScoffResult = 'clear' | 'unavailable';
export type ProjectionAccessState = 'not-asked' | ScoffResult;
export type ProjectionAccess = Awaited<ReturnType<typeof createProjectionAccess>>;

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`projection.json has no ${key}`);
  return found.value as T;
}

const UNAVAILABLE_FROM = param<number>('scoff_unavailable_from');
const LINKS = param<Record<string, string>>('eating_support_links');
const KEY = 'projection.access';

export function scoffResult(answers: readonly boolean[]): ScoffResult {
  if (answers.length !== SCOFF_QUESTIONS.length) {
    throw new Error(`SCOFF has ${SCOFF_QUESTIONS.length} answers, not ${answers.length}`);
  }
  return answers.filter(Boolean).length >= UNAVAILABLE_FROM ? 'unavailable' : 'clear';
}

/** The checked organisation for the phone's region (ADR-050 D1), or none: then the neutral sentence stands alone. */
export function supportLink(locale: string): { region: string; url: string } | null {
  const region = regionOf(locale);
  if (region === undefined || !Object.hasOwn(LINKS, region)) return null;
  return { region, url: LINKS[region] };
}

const isResult = (value: string | null): value is ScoffResult => value === 'clear' || value === 'unavailable';

export async function createProjectionAccess({ kv, locale }: { kv: KeyValue; locale: string }) {
  const kept = await kv.getItemAsync(KEY);
  let current: ProjectionAccessState = isResult(kept) ? kept : 'not-asked';

  return {
    /** Synchronous, for rendering. */
    current: (): ProjectionAccessState => current,

    /** Keeps the result; after "unavailable", nothing changes it. */
    record: async (result: ScoffResult): Promise<void> => {
      if (current === 'unavailable') return;
      await kv.setItemAsync(KEY, result);
      current = result;
    },

    /** The support link for this phone's region, or none. */
    support: () => supportLink(locale),
  };
}
