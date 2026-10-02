/**
 * The check-in's answers (K-501): a pick becomes the answer its question takes, or nothing — the call waits for every
 * question, and nothing the server did not offer goes to it.
 */
import { answerOf, answersOf, choiceKey, type Question } from '@/checkIn/checkIn';

const TRAINING: Question = { kind: 'TRAINING', format: 'CHOICE', choices: ['IMPROVING', 'STABLE'], copyKey: 'q', reasonCopyKey: 'r' };
const ENERGY: Question = { kind: 'ENERGY', format: 'SCALE_1_10', copyKey: 'q', reasonCopyKey: 'r' };
const WAIST: Question = { kind: 'WAIST', format: 'CENTIMETRES', copyKey: 'q', reasonCopyKey: 'r' };

test('a choice the question offers, and only that', () => {
  expect(answerOf(TRAINING, 'STABLE', 'METRIC')).toEqual({ kind: 'TRAINING', choice: 'STABLE' });
  expect(answerOf(TRAINING, 'DECLINING', 'METRIC')).toBeNull();
  expect(answerOf(TRAINING, undefined, 'METRIC')).toBeNull();
});

test('a step of the scale, 1 to 10', () => {
  expect(answerOf(ENERGY, '10', 'METRIC')).toEqual({ kind: 'ENERGY', scale: 10 });
  expect(answerOf(ENERGY, '0', 'METRIC')).toBeNull();
  expect(answerOf(ENERGY, '11', 'METRIC')).toBeNull();
});

test('a length in the user\'s units, sent in centimetres; one that is not a length is no answer', () => {
  expect(answerOf(WAIST, '84', 'METRIC')).toEqual({ kind: 'WAIST', cm: 84 });
  expect(answerOf(WAIST, '34', 'IMPERIAL')).toEqual({ kind: 'WAIST', cm: 86.4 });
  expect(answerOf(WAIST, 'abc', 'METRIC')).toBeNull();
});

test('all answers in the order asked, or none while one is missing', () => {
  const checkIn = { weekOf: '2026-10-05', answered: false, questions: [TRAINING, ENERGY] };
  expect(answersOf(checkIn, { ENERGY: '5' }, 'METRIC')).toBeNull();
  expect(answersOf(checkIn, { ENERGY: '5', TRAINING: 'IMPROVING' }, 'METRIC')).toEqual([
    { kind: 'TRAINING', choice: 'IMPROVING' },
    { kind: 'ENERGY', scale: 5 },
  ]);
});

test("a choice's words: checkIn.choice.<kind>.<choice>, lowercased", () => {
  expect(choiceKey('CYCLE_STOPPED', 'YES')).toBe('checkIn.choice.cycle_stopped.yes');
});
