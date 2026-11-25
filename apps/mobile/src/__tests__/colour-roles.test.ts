// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * ADR-094 §1: each colour has one role in every screen, sheet and pop-up, now and later. Coral is "where you are and how
 * far you came" and its soft ground is a suggestion: neither may stand for a warning or the primary action, so a file
 * that draws a warning or the primary button does not use them.
 */
import fs from 'fs';
import path from 'path';

import { sourceFiles } from './support/sourceScan';

const SRC = path.resolve(__dirname, '..');
const PROGRESS = /color\.(progress|progressText|tintSuggest)\b/;
const WARNING_OR_PRIMARY = /color\.(warn|onWarn|cta|onCta)\b/;

test('coral and the suggestion ground never share a file with a warning or the primary button', () => {
  const mixed = sourceFiles()
    .filter((file) => !file.endsWith(path.join('theme', 'tokens.ts')) && !file.endsWith(path.join('theme', 'theme.tsx')))
    .filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return PROGRESS.test(text) && WARNING_OR_PRIMARY.test(text);
    })
    .map((file) => path.relative(SRC, file));
  expect(mixed).toEqual([]);
});

test('the guard sees the patterns it is meant to catch', () => {
  expect(PROGRESS.test('backgroundColor: color.progress')).toBe(true);
  expect(WARNING_OR_PRIMARY.test('{ color: color.warn }')).toBe(true);
  expect(PROGRESS.test('color.progressive')).toBe(false);
});
