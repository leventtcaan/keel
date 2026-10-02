/**
 * Supersets (K-416, ADR-035): moves done back to back, a set of each in turn. A superset is an id on its sets
 * (`supersetId`, made on the phone) and nothing else: the groups are read back from the sets, offline as online — the
 * engine does not know of them, each set is its own move's.
 */
type Grouped = { exerciseId: string; supersetId?: string };

/** The supersets of a session: id → its moves, in the order first done. */
export function supersetsOf(sets: Grouped[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const { exerciseId, supersetId } of sets) {
    if (supersetId === undefined) continue;
    const moves = groups.get(supersetId) ?? [];
    if (!moves.includes(exerciseId)) groups.set(supersetId, [...moves, exerciseId]);
  }
  return groups;
}

/**
 * The supersets still going in a session: a move is in one while its last set carries the id — the first set after it
 * was unlinked has none, so opened again the session does not link it back (no record of the unlinking is needed).
 */
export function supersetsInForce(sets: Grouped[]): Map<string, string[]> {
  const last = new Map(sets.map((s) => [s.exerciseId, s.supersetId]));
  const groups = new Map<string, string[]>();
  for (const [id, moves] of supersetsOf(sets)) {
    const still = moves.filter((move) => last.get(move) === id);
    if (still.length > 0) groups.set(id, still);
  }
  return groups;
}

/** Each move's partners: the other moves its sets share an id with. A group of one move is none. */
export function supersetPartners(sets: Grouped[]): Map<string, string[]> {
  const partners = new Map<string, string[]>();
  for (const moves of supersetsOf(sets).values()) {
    if (moves.length < 2) continue;
    // A move in two supersets (unlinked, then linked with another) keeps both partners.
    for (const id of moves) partners.set(id, [...new Set([...(partners.get(id) ?? []), ...moves.filter((other) => other !== id)])]);
  }
  return partners;
}

/**
 * After a set of `current`: the next move of the group, in its order, with sets left — after the last one the round is
 * done (the rest comes then) and the first comes back. Null when the group has nothing left.
 */
export function nextInGroup(group: string[], current: string, open: (exerciseId: string) => boolean): { next: string | null; roundDone: boolean } {
  const at = group.indexOf(current);
  for (let step = 1; step <= group.length; step++) {
    const index = (at + step) % group.length;
    if (open(group[index])) return { next: group[index], roundDone: at + step >= group.length };
  }
  return { next: null, roundDone: true };
}
