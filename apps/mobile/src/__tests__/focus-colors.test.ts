/**
 * Colour roles on the workout's set and rest screens (K-1207; ADR-070 #4, "one turquoise for five jobs"): the accent is for the one
 * thing to do now (the primary button, which is the palette's `cta`) and the clock that counts the rest; a link, a mark and a
 * selection are neutral; no frame is drawn in the text colour; and the greys the foreground uses are three: text, muted and edge.
 * Read from the source, like the token rules, so a later change that brings the accent back to a link is caught here.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf8');
const rolesIn = (file: string) => new Set([...read(file).matchAll(/\bcolor\.(\w+)/g)].map((m) => m[1]));

/** The screens the set and the rest are made of. */
const FOCUS = [
  'app/workout.tsx',
  'train/ActiveSet.tsx',
  'train/DoneSets.tsx',
  'train/GoalLine.tsx',
  'train/MoveDots.tsx',
  'train/SessionHeader.tsx',
  'train/MoreSheet.tsx',
  'train/InsightLine.tsx',
  'train/Warmups.tsx',
  'train/UpNext.tsx',
  'train/RestTimer.tsx',
];
/** The only foreground greys: the text, the quiet text and the control edge. */
const GREYS = ['text', 'muted', 'edge'];
/** Where the accent is allowed: the rest's clock when it is over (the timer). */
const ACCENT_OK = ['train/RestTimer.tsx'];

describe.each(FOCUS)('%s', (file) => {
  test('the accent is for the timer only; no soft or mid accent anywhere', () => {
    const roles = rolesIn(file);
    expect(roles.has('accentSoft')).toBe(false);
    expect(roles.has('accentMid')).toBe(false);
    if (!ACCENT_OK.includes(file)) expect(roles.has('accent')).toBe(false);
  });

  test('no frame in the text colour', () => {
    expect(read(file)).not.toMatch(/borderColor:\s*color\.text/);
  });
});

test('the foreground greys are three across the focus screens: text, muted, edge (no fourth, textSecondary)', () => {
  for (const file of FOCUS) expect([file, rolesIn(file).has('textSecondary')]).toEqual([file, false]);
  const used = new Set<string>();
  for (const file of FOCUS) for (const role of rolesIn(file)) if (GREYS.includes(role)) used.add(role);
  expect(used.size).toBeLessThanOrEqual(3);
});

test('the primary button is the palette\'s cta (the accent on dark), not a second use of the accent token', () => {
  expect(read('components/Button.tsx')).toMatch(/primary':\s*\n?\s*return \{ fill: \{ backgroundColor: color\.cta \}/);
});
