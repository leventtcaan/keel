/**
 * What is left of today's food (K-409): the server's range (target minus the logged range, K-209), read as one of three
 * plain states — left, about at the target (the range spans zero), or past it — never blame, never a make-up for
 * tomorrow (U7), always a range where it is an estimate (U5).
 */
import { budgetLine } from '@/food/budget';

const left = (kcal: [number, number], protein: [number, number]) => ({
  kcal: { low: kcal[0], high: kcal[1] },
  proteinG: { low: protein[0], high: protein[1] },
});

test('left: the range as the server gave it', () => {
  expect(budgetLine(left([780, 950], [64, 80]))).toEqual({
    kcal: { kind: 'left', low: 780, high: 950 },
    protein: { kind: 'left', low: 64, high: 80 },
  });
});

test('a range across zero is about at the target: neither left nor past can be said', () => {
  expect(budgetLine(left([-120, 90], [-5, 10])).kcal).toEqual({ kind: 'around' });
  expect(budgetLine(left([0, 150], [0, 4])).kcal).toEqual({ kind: 'around' });
});

test('past the target: by how much, as a positive range', () => {
  expect(budgetLine(left([-400, -150], [10, 20])).kcal).toEqual({ kind: 'over', low: 150, high: 400 });
});

test('protein reached once even the low end has nothing left', () => {
  expect(budgetLine(left([500, 700], [-10, 0])).protein).toEqual({ kind: 'done' });
  expect(budgetLine(left([500, 700], [-10, 5])).protein).toEqual({ kind: 'left', low: 0, high: 5 });
});
