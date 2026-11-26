/**
 * The paper card's measures (K-975, ADR-094 Ek 2 › Uygulama #10): the card sits low in a Story-sized image inside its
 * margins; a text steps down in size rather than run past the card's inner width (the title in at most two lines, a
 * number in its column, the record's line in at most two lines); the weeks are a row of cells inside the card. All in
 * image units (share.json: 1080 wide); the drawing (Sticker.tsx) lays them out with flexbox and scales them to points.
 */
import { CARD, EM, FRAME, INNER, layout, wrap } from '@/share/layout';
import { shareParams } from '@/share/params';
import type { Sticker } from '@/share/stickers';
import { tokens } from '@/theme/tokens';

const WORKOUT: Sticker = {
  kind: 'workout',
  kicker: 'Workout complete · Oct 13',
  title: 'Full body A',
  stats: [
    { value: '52', label: 'minutes' },
    { value: '4,280', label: 'kg lifted' },
    { value: '14', label: 'sets' },
  ],
  mark: { kind: 'record', label: 'New best', text: 'Squat · 100 kg × 8' },
  lines: [],
  weeks: [],
};
const STREAK: Sticker = {
  kind: 'streak',
  kicker: 'Weeks on track',
  title: '11 of 12',
  stats: [],
  lines: ['1 spare week'],
  weeks: ['ON_TRACK', 'ON_TRACK', 'SPARE', 'ON_TRACK', 'MISSED', 'PAUSED', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK', 'ON_TRACK'],
};
const LONG: Sticker = {
  ...WORKOUT,
  title: 'Romanian deadlift with a long own name',
  stats: [
    { value: '1,000.5 lb × 12', label: 'best set ever' },
    { value: '+20 kg', label: 'since Jul 13' },
  ],
  mark: { kind: 'record', label: 'New best', text: 'Seated cable row with a very long own name · 1,000.5 lb × 12' },
};
/** A text's estimated width at its size (the same estimate layout.ts sizes by). */
const width = (text: string, size: number, font: keyof typeof EM) => text.length * size * EM[font];
const lines = (text: string, size: number, font: keyof typeof EM, room: number) => wrap(text, Math.floor(room / (size * EM[font])));

test('a line is wrapped at words to fit', () => {
  expect(wrap('abcd efgh', 9)).toEqual(['abcd efgh']);
  expect(wrap('Latest call: keep the calories and train as planned', 20)).toEqual(['Latest call: keep', 'the calories and', 'train as planned']);
  expect(wrap('short', 20)).toEqual(['short']);
  expect(wrap('Supercalifragilisticexpialidocious move', 10)).toEqual(['Supercalifragilisticexpialidocious', 'move']);
});

test('the card sits inside the image: its margins at the sides and the foot, its words inside its padding', () => {
  expect(FRAME.side).toBeGreaterThan(0);
  expect(FRAME.foot).toBeGreaterThan(0);
  expect(INNER).toBe(shareParams.storyWidth - 2 * FRAME.side - 2 * CARD.padding);
  expect(INNER).toBeGreaterThan(shareParams.storyWidth / 2);
});

test('the words at their full sizes when they fit', () => {
  const sizes = layout({ ...WORKOUT, stats: [{ value: '66', label: 'minutes' }, { value: '168', label: 'kg lifted' }, { value: '1', label: 'set' }] });
  expect(sizes.title).toBe(tokens.type.shareTitle);
  expect(sizes.value).toBe(tokens.type.shareValue);
  expect(sizes.mark).toBe(tokens.type.shareMark);
});

test('the numbers share one row: each its column, the columns filling the inner width', () => {
  const three = layout(WORKOUT);
  const two = layout({ ...WORKOUT, stats: WORKOUT.stats.slice(0, 2) });
  expect(three.column * 3 + three.gap * 2).toBeCloseTo(INNER, 5);
  expect(two.column).toBeGreaterThan(three.column);
});

test('a four-digit total sets all three numbers a step smaller, alike, each inside its column', () => {
  const sizes = layout(WORKOUT);
  expect(sizes.value).toBeLessThan(tokens.type.shareValue);
  expect(WORKOUT.stats.filter((s) => width(s.value, sizes.value, 'number') > sizes.column)).toEqual([]);
});

test('a long title takes a smaller size and at most two lines, inside the card', () => {
  const short = layout({ ...WORKOUT, title: 'Squat' });
  const long = layout(LONG);
  expect(long.title).toBeLessThan(short.title);
  const drawn = lines(LONG.title, long.title, 'display', INNER);
  expect(drawn.length).toBeLessThanOrEqual(2);
  expect(drawn.filter((line) => width(line, long.title, 'display') > INNER)).toEqual([]);
});

test('a long number shrinks to its column; the record line shrinks to the card', () => {
  const sizes = layout(LONG);
  expect(sizes.value).toBeLessThan(tokens.type.shareValue);
  expect(Math.max(...LONG.stats.map((s) => width(s.value, sizes.value, 'number')))).toBeLessThanOrEqual(sizes.column);
  expect(sizes.mark).toBeLessThan(tokens.type.shareMark);
  const drawn = lines(LONG.mark!.text, sizes.mark, 'display', INNER - 2 * CARD.highlight);
  expect(drawn.length).toBeLessThanOrEqual(2);
});

test('the weeks: one cell each, side by side inside the card; a short history is a short row of larger cells', () => {
  const sizes = layout(STREAK);
  expect(sizes.cell * STREAK.weeks.length + CARD.cellGap * (STREAK.weeks.length - 1)).toBeLessThanOrEqual(INNER);
  const few = layout({ ...STREAK, weeks: ['ON_TRACK', 'SPARE'] });
  expect(few.cell).toBeGreaterThanOrEqual(sizes.cell);
  expect(few.cell).toBeLessThanOrEqual(CARD.cellMax);
});
