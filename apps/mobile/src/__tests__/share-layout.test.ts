/**
 * Where a sticker's words sit in its image (K-975): top to bottom, each piece below the last, every line inside the
 * margins at the size that fits, the grid as wide as the weeks it has. The image is 1080 wide (share.json).
 */
import { EM, type Item, MARGIN, layout, wrap } from '@/share/layout';
import { shareParams } from '@/share/params';
import type { Sticker } from '@/share/stickers';

const WORKOUT: Sticker = {
  kind: 'workout',
  kicker: 'Workout complete',
  title: 'Full body A',
  stats: [
    { value: '52', label: 'minutes' },
    { value: '4,280', label: 'kg lifted', accent: true },
    { value: '14', label: 'sets' },
    { value: '100 kg × 8', label: 'squat PR' },
  ],
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
const text = (items: Item[]) => items.flatMap((i) => (i.kind === 'text' ? [i] : []));
const cells = (items: Item[]) => items.flatMap((i) => (i.kind === 'cell' ? [i] : []));

test('a line is wrapped at words to fit', () => {
  expect(wrap('abcd efgh', 9)).toEqual(['abcd efgh']);
  expect(wrap('Latest call: keep the calories and train as planned', 20)).toEqual(['Latest call: keep', 'the calories and', 'train as planned']);
  expect(wrap('short', 20)).toEqual(['short']);
  expect(wrap('Supercalifragilisticexpialidocious move', 10)).toEqual(['Supercalifragilisticexpialidocious', 'move']);
});

test('every piece of text is drawn, in order from the top, no one over another', () => {
  const { items, height } = layout(WORKOUT);
  const drawn = text(items);

  expect(drawn.map((i) => i.text)).toEqual(
    expect.arrayContaining(['Workout complete', 'Full body A', '52', 'minutes', '4,280', 'kg lifted', '14', 'sets', '100 kg × 8', 'squat PR', 'Next Call']),
  );
  // Each box is [baseline - size, baseline]; boxes in one column never meet, and all sit inside the image.
  const boxes = drawn.map((i) => ({ x: i.x, top: i.y - i.size, bottom: i.y }));
  for (const [a, i] of boxes.entries()) {
    expect(i.top).toBeGreaterThanOrEqual(0);
    expect(i.bottom).toBeLessThanOrEqual(height);
    for (const j of boxes.slice(a + 1)) if (i.x === j.x) expect(j.top >= i.bottom || i.top >= j.bottom).toBe(true);
  }
});

test('the stats sit in two columns, the value above its label', () => {
  const { items } = layout(WORKOUT);
  const at = (value: string) => text(items).find((i) => i.text === value)!;
  expect(at('52').x).toBeLessThan(at('4,280').x);
  expect(at('52').y).toBe(at('4,280').y);
  expect(at('14').y).toBeGreaterThan(at('52').y);
  expect(at('minutes').y).toBeGreaterThan(at('52').y);
  expect(at('minutes').x).toBe(at('52').x);
});

test('the word mark closes the sticker, at its right edge', () => {
  const { items } = layout(WORKOUT);
  const mark = text(items).find((i) => i.text === 'Next Call')!;
  expect(mark.anchor).toBe('end');
  expect(mark.x).toBeLessThanOrEqual(shareParams.storyWidth);
  expect(Math.max(...text(items).map((i) => i.y))).toBe(mark.y);
});

test('a long title takes a smaller size and a second line rather than run past the margin', () => {
  const short = layout({ ...WORKOUT, title: 'Squat' });
  const long = layout({ ...WORKOUT, title: 'Romanian deadlift with a long own name' });
  const size = (l: ReturnType<typeof layout>, t: string) => text(l.items).find((i) => i.text.startsWith(t))!.size;
  expect(size(long, 'Romanian')).toBeLessThan(size(short, 'Squat'));
  expect(text(long.items).filter((i) => i.size === size(long, 'Romanian')).length).toBeGreaterThan(1);
});

test('a long value shrinks to its column; a long label wraps under it', () => {
  const { items } = layout({ ...WORKOUT, stats: [{ value: '1,000.5 lb × 12', label: 'a very long own move name PR' }] });
  const value = text(items).find((i) => i.text === '1,000.5 lb × 12')!;
  const full = layout(WORKOUT);
  expect(value.size).toBeLessThan(text(full.items).find((i) => i.text === '52')!.size);
  expect(text(items).filter((i) => i.x === value.x && i.y > value.y).length).toBeGreaterThan(1);
});

test('the grid: one cell per week, in order, side by side inside the margins, each in its state', () => {
  const grid = cells(layout(STREAK).items);
  expect(grid.map((c) => c.state)).toEqual(STREAK.weeks);
  expect(new Set(grid.map((c) => c.y)).size).toBe(1);
  expect(grid.every((c, i) => i === 0 || c.x > grid[i - 1].x)).toBe(true);
  const last = grid[grid.length - 1];
  expect(last.x + last.size).toBeLessThan(shareParams.storyWidth);
  expect(grid[0].x).toBeGreaterThan(0);
});

test('a short history is a short row of larger cells, not padded', () => {
  const few = cells(layout({ ...STREAK, weeks: ['ON_TRACK', 'SPARE'] }).items);
  expect(few).toHaveLength(2);
  expect(few[0].size).toBeGreaterThanOrEqual(cells(layout(STREAK).items)[0].size);
});

test('a sticker with no grid draws no cell; the image is as tall as its words and no taller', () => {
  expect(cells(layout(WORKOUT).items)).toEqual([]);
  const small = layout({ ...WORKOUT, stats: [] });
  expect(small.height).toBeLessThan(layout(WORKOUT).height);
  expect(layout(WORKOUT).height).toBeLessThan(shareParams.storyHeight);
});

describe('the right edge: nothing runs past the margin', () => {
  const right = (i: Extract<Item, { kind: 'text' }>) => (i.anchor === 'end' ? i.x : i.x + i.text.length * i.size * EM[i.font]);
  const LIMIT = shareParams.storyWidth - MARGIN;
  const LONG: Sticker = {
    ...WORKOUT,
    title: 'Romanian deadlift with a long own name',
    stats: [
      { value: '1,000.5 lb × 12', label: 'a very long own move name PR' },
      { value: '9,436', label: 'lb lifted', accent: true },
      { value: '120', label: 'minutes' },
      { value: '100 kg × 8', label: 'best set ever' },
    ],
    lines: ['Romanian deadlift +20 kg', 'Seated cable row with a long name +10 kg'],
  };

  test.each([
    ['a workout', WORKOUT],
    ['a long title, long values and long lines', LONG],
    ['a streak', STREAK],
    ['a short history', { ...STREAK, weeks: ['ON_TRACK'] as Sticker['weeks'] }],
  ])('%s', (_, sticker) => {
    const { items } = layout(sticker);

    expect(text(items).filter((i) => right(i) > LIMIT).map((i) => i.text)).toEqual([]);
    expect(cells(items).filter((c) => c.x + c.size > LIMIT).length).toBe(0);
    // And the left: the word mark keeps its own width inside the margin too.
    const mark = text(items).find((i) => i.anchor === 'end')!;
    expect(mark.x - mark.text.length * mark.size * EM[mark.font]).toBeGreaterThan(MARGIN);
  });

  test('the check catches a text that overruns', () => {
    expect(right({ kind: 'text', x: MARGIN, y: 100, text: 'x'.repeat(60), size: 150, font: 'display', tone: 'text' })).toBeGreaterThan(LIMIT);
  });
});
