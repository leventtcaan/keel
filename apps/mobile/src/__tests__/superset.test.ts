/**
 * Supersets (K-416, ADR-035): a superset is an id on its sets, no record of its own — the groups are read back from the
 * sets. Logging one move's set brings up the next move of the group with sets left; the round ends at the last one.
 */
import { nextInGroup, supersetPartners, supersetsInForce, supersetsOf } from '@/train/superset';

const set = (exerciseId: string, supersetId?: string) => ({ exerciseId, ...(supersetId === undefined ? {} : { supersetId }) });

test('the groups of a session, by id, each with its moves in the order first done; sets without an id are no group', () => {
  const sets = [set('bench_press', 'g1'), set('barbell_row', 'g1'), set('bench_press', 'g1'), set('squat'), set('curl', 'g2'), set('pushdown', 'g2')];
  expect(supersetsOf(sets)).toEqual(
    new Map([
      ['g1', ['bench_press', 'barbell_row']],
      ['g2', ['curl', 'pushdown']],
    ]),
  );
});

test("each move's partners: the other moves of its group; a move in none has no entry", () => {
  const partners = supersetPartners([set('bench_press', 'g1'), set('barbell_row', 'g1'), set('squat')]);
  expect(partners.get('bench_press')).toEqual(['barbell_row']);
  expect(partners.get('barbell_row')).toEqual(['bench_press']);
  expect(partners.has('squat')).toBe(false);
});

test('a group of one move (its partner never done) is no superset to show', () => {
  expect(supersetPartners([set('bench_press', 'g1')]).has('bench_press')).toBe(false);
});

describe('the next move after a set', () => {
  const group = ['bench_press', 'barbell_row', 'curl'];
  const open = (left: string[]) => (id: string) => left.includes(id);

  test('the next one in the group with sets left', () => {
    expect(nextInGroup(group, 'bench_press', open(['bench_press', 'barbell_row', 'curl']))).toEqual({ next: 'barbell_row', roundDone: false });
  });

  test('past a move with nothing left; after the last, the round is done and the first comes back', () => {
    expect(nextInGroup(group, 'bench_press', open(['bench_press', 'curl']))).toEqual({ next: 'curl', roundDone: false });
    expect(nextInGroup(group, 'curl', open(['bench_press', 'barbell_row', 'curl']))).toEqual({ next: 'bench_press', roundDone: true });
  });

  test('the others all done: the same move again, a round of its own; nothing left at all: none', () => {
    expect(nextInGroup(group, 'barbell_row', open(['barbell_row']))).toEqual({ next: 'barbell_row', roundDone: true });
    expect(nextInGroup(group, 'barbell_row', open([]))).toEqual({ next: null, roundDone: true });
  });
});

test("in force: a move stays in its superset while its last set carries the id — a set after unlinking takes it out", () => {
  const sets = [set('bench_press', 'g1'), set('barbell_row', 'g1'), set('bench_press'), set('curl', 'g2'), set('pushdown', 'g2')];
  expect(supersetsInForce(sets)).toEqual(
    new Map([
      ['g1', ['barbell_row']],
      ['g2', ['curl', 'pushdown']],
    ]),
  );
});

test('a move in two supersets (unlinked, then linked with another) has both partners in the history', () => {
  const partners = supersetPartners([set('bench_press', 'g1'), set('barbell_row', 'g1'), set('bench_press', 'g2'), set('curl', 'g2')]);
  expect(partners.get('bench_press')).toEqual(['barbell_row', 'curl']);
});
