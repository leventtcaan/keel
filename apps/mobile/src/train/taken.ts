/**
 * Taken, in the workout (ADR-090 Ek 2, K-1064; Coaching rule G1 K-77: a busy machine is not waited for, you go to an alternative you
 * know). Two ways out, both for this workout only and never sent as a change of the program: "Do it later" (the move goes
 * to the end of today's order) and a few moves of the same muscles on other equipment. The moves are the server's
 * (`swapOptions` of the planned move: its alternatives, then the moves of the same muscles, U1); the phone leaves out
 * the taken move's equipment and picks among them, it adds none.
 */
import type { components } from '@/api/schema';

type Planned = components['schemas']['PlannedExercise'];
type Equipment = components['schemas']['Equipment'];

/** A move to do instead; `done`: the user has done it before (the server has a best set of it), so its weight is theirs. */
export type TakenChoice = { id: string; done: boolean };

type Args = {
  /** The planned move the session started with: its `swapOptions` and their tables. */
  base: Planned;
  /** The move taken: the planned one or the one swapped in its place. */
  current: string;
  /** The session's moves: not offered twice. */
  inSession: ReadonlySet<string>;
  /** Moves the phone has in its catalog: a set of any other would be refused. */
  known: (id: string) => boolean;
  equipmentOf: (id: string) => Equipment | undefined;
  max: number;
  /** The moves already found taken in this session: a move taken after one that was swapped away from avoids both. */
  taken?: readonly string[];
};

/**
 * What a taken move can be done as: the options of the planned move on other equipment than the taken one (a second move at
 * the same cable station is no way out of a busy cable station), the ones done before first, then the server's order, one of
 * each kind of equipment so the few shown are different places in the gym, at most `max`. A taken move whose equipment the
 * catalog does not say leaves nothing out; one taken after another that was swapped away from leaves out both's equipment.
 */
export function takenChoices({ base, current, inSession, known, equipmentOf, max, taken: before = [] }: Args): TakenChoice[] {
  const taken = equipmentOf(current);
  // The equipment of every move found taken so far (an earlier Taken on the move this one stands in for, say): a chain of
  // busy stations is not walked into again.
  const busy = new Set([taken, ...before.map(equipmentOf)].filter((equipment): equipment is Equipment => equipment !== undefined));
  const options = base.swapOptions ?? [];
  const history = new Set((base.swapTables ?? []).filter((row) => row.lastBestSet !== undefined).map((row) => row.exerciseId));
  const candidates = options
    .filter((id) => id !== current && id !== base.exerciseId && !inSession.has(id) && known(id))
    .filter((id) => !busy.has(equipmentOf(id) as Equipment))
    .map((id, index) => ({ id, done: history.has(id), index }))
    .sort((a, b) => Number(b.done) - Number(a.done) || a.index - b.index);
  const seen = new Set<Equipment | undefined>();
  const picked: TakenChoice[] = [];
  for (const { id, done } of candidates) {
    const equipment = equipmentOf(id);
    if (equipment !== undefined && seen.has(equipment)) continue;
    seen.add(equipment);
    picked.push({ id, done });
    if (picked.length === max) break;
  }
  return picked;
}

/** The moves put behind so far with another at the end: a move put behind twice is last. */
export function pushBehind(behind: string[], id: string): string[] {
  return [...behind.filter((other) => other !== id), id];
}

/** Today's moves with the ones put behind at the end, in the order they were put there; the rest keep their order. */
export function orderBehind<T>(items: T[], keyOf: (item: T) => string, behind: string[]): T[] {
  const last = behind.flatMap((id) => items.filter((item) => keyOf(item) === id));
  return [...items.filter((item) => !behind.includes(keyOf(item))), ...last];
}
