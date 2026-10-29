/**
 * No paragraphs outside Settings (K-1065, ADR-090): the texts the Evre 6 audit named, and the first-use guide's, stay short rows
 * and one-liners. The word counts are the audit's ceiling (about 25 words for a line, a few more for a confirmation).
 */
import * as fs from 'fs';
import * as path from 'path';

import en from '../../../../data/copy/en.json';

type Json = { [key: string]: string | Json };
const text = (key: string): string => {
  const found = key.split('.').reduce<string | Json | undefined>((tree, part) => (tree !== undefined && typeof tree !== 'string' ? tree[part] : undefined), en as Json);
  if (typeof found !== 'string') throw new Error(`${key} is not a text`);
  return found;
};
const words = (key: string) => text(key).trim().split(/\s+/).length;

test.each([
  ['editProgram.rebuildBody', 25],
  ['editProgram.targetsLost', 20],
  ['import.privacy', 20],
  ['import.unknown', 20],
  ['import.rowsLeftOut', 15],
  ['import.unit.note', 15],
  ['import.skipped', 20],
  ['import.leftOut', 15],
  ['onboarding.programImport.allLeftOut', 20],
  ['welcome.lead', 15],
  ['train.rackEnds', 20],
  ['checkIn.reason.cycle_stopped', 25],
  ['review.once_a_week.body', 25],
  ['demo.setupNote', 15],
  ['demo.tip.fullRange', 10],
  ['demo.tip.backRange', 10],
  ['demo.tip.tempo', 10],
  ['demo.tip.lastRep', 10],
  ['guide.call.body', 12],
  ['guide.workout.body', 12],
  ['guide.plus.body', 12],
  ['guide.tabs.body', 12],
])('%s is at most %i words', (key, most) => {
  expect(words(key)).toBeLessThanOrEqual(most);
});

test("the sign-in line names no weekday: the check-in day is the user's own to choose", () => {
  expect(text('welcome.lead')).not.toMatch(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
});

test('the move screen promises no clips', () => {
  expect(JSON.stringify((en as Json).demo)).not.toMatch(/film|clip/i);
});

// Evre 6 G (K-1066): every catalog move has its OWN three short cues, none shared with another move's list.
describe('the catalog moves cues', () => {
  const dir = path.resolve(__dirname, '../../../../data/exercises');
  const ids = fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, ''));

  test('there are moves to check', () => {
    expect(ids.length).toBeGreaterThanOrEqual(30);
  });

  test.each(ids)('%s has cue1, cue2, cue3, each at most 8 words and no dash', (id) => {
    for (const cue of ['cue1', 'cue2', 'cue3']) {
      const key = `exercises.${id}.${cue}`;
      expect(words(key)).toBeLessThanOrEqual(8);
      expect(text(key)).not.toMatch(/[\u2013\u2014]/);
    }
  });

  test('no two moves have the same three cues', () => {
    const lists = ids.map((id) => ['cue1', 'cue2', 'cue3'].map((cue) => text(`exercises.${id}.${cue}`)).join('|'));
    expect(new Set(lists).size).toBe(lists.length);
  });
});
