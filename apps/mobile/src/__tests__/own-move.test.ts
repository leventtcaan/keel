/**
 * The user's own move (K-416, ADR-035): the engine needs what the catalog says of a move, so the user answers it —
 * compound or isolation, what is lifted, one side at a time — and nothing is assumed (U1). The body goes only when
 * every question is answered; a bodyweight move asks whether weight is added, as the server's rule pairs them.
 */
import { type OwnAnswers, ownMoveBody } from '@/train/ownMove';
import { workoutParams } from '@/train/params';

const ANSWERED: OwnAnswers = { name: '  Landmine press ', kind: 'COMPOUND', equipment: 'BARBELL', added: null, unilateral: true };

test('every question answered: the body, the name trimmed, an external load', () => {
  expect(ownMoveBody(ANSWERED, 'c1')).toEqual({
    clientId: 'c1',
    name: 'Landmine press',
    kind: 'COMPOUND',
    load: 'EXTERNAL',
    equipment: 'BARBELL',
    unilateral: true,
  });
});

test('a question not answered: no body — nothing is assumed', () => {
  expect(ownMoveBody({ ...ANSWERED, kind: null }, 'c1')).toBeNull();
  expect(ownMoveBody({ ...ANSWERED, equipment: null }, 'c1')).toBeNull();
  expect(ownMoveBody({ ...ANSWERED, unilateral: null }, 'c1')).toBeNull();
  expect(ownMoveBody({ ...ANSWERED, name: '   ' }, 'c1')).toBeNull();
});

test('the body as the equipment: added weight asked, and only then', () => {
  const body = { ...ANSWERED, equipment: 'BODYWEIGHT' } as const;
  expect(ownMoveBody(body, 'c1')).toBeNull();
  expect(ownMoveBody({ ...body, added: false }, 'c1')?.load).toBe('BODYWEIGHT');
  expect(ownMoveBody({ ...body, added: true }, 'c1')?.load).toBe('BODYWEIGHT_PLUS_EXTERNAL');
  expect(ownMoveBody({ ...ANSWERED, added: true }, 'c1')?.load).toBe('EXTERNAL'); // an answer left from before
});

test('a name up to own_move_name_max_chars characters, counted as the server counts them', () => {
  const max = workoutParams.ownMoveNameMaxChars;
  expect(ownMoveBody({ ...ANSWERED, name: '💪'.repeat(max) }, 'c1')).not.toBeNull();
  expect(ownMoveBody({ ...ANSWERED, name: 'a'.repeat(max + 1) }, 'c1')).toBeNull();
});
