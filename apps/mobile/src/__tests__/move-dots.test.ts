import { dotsPerRow } from '@/train/MoveDots';

// B29 (Tur 4): nine moves read "0 of 9" but the strip showed eight, the ninth alone on a line of its own.
describe('the dots of a long session', () => {
  test('they fit one line: no even-rows rule', () => {
    expect(dotsPerRow(400, 4)).toBeNull();
    expect(dotsPerRow(400, 8)).toBeNull();
    expect(dotsPerRow(null, 9)).toBeNull();
  });

  test('nine on a line of eight: five and four, not eight and one', () => {
    expect(dotsPerRow(400, 9)).toBe(5);
  });

  test('more lines stay even, and never wider than a line holds', () => {
    expect(dotsPerRow(400, 17)).toBe(6);
    expect(dotsPerRow(400, 16)).toBe(8);
    for (let count = 9; count <= 30; count++) expect(dotsPerRow(400, count)).toBeLessThanOrEqual(Math.floor(400 / 48));
  });

  test('a very narrow line still holds one', () => {
    expect(dotsPerRow(30, 3)).toBe(1);
  });
});
