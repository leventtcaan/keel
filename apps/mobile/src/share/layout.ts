/**
 * Where a sticker's words sit in its image (K-975), in image units (share.json: 1080 wide): the kicker, the title, the
 * stats in two columns, the lines, the weeks as a row of cells, the word mark. Pure, so the drawing (Sticker.tsx) only
 * places what this says and the tests can read it. A text steps down in size, then wraps, rather than run past the margin;
 * a character's width is an estimate (a share of the size), not a measurement, so it errs wide.
 */
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

import { shareParams } from './params';
import type { Sticker, WeekCell } from './stickers';

export type Item =
  | { kind: 'text'; x: number; y: number; text: string; size: number; font: 'display' | 'body'; tone: 'text' | 'accent' | 'muted'; anchor?: 'end' }
  | { kind: 'cell'; x: number; y: number; size: number; state: WeekCell };

const WIDTH = shareParams.storyWidth;
/** The margin round the words, and the room left under a sticker set in a Story-sized image. */
export const MARGIN = 72;
const INNER = WIDTH - 2 * MARGIN;
const GAP = 44;
const COLUMN_GAP = 40;
const COLUMN = (INNER - COLUMN_GAP) / 2;
const CELL_GAP = 12;
const CELL_MAX = 72;
/** The width of an average character as a share of the text's size: the display face is narrow, the body face is not. */
export const EM = { display: 0.5, body: 0.6 };
/** Each step a text may shrink to when it does not fit, before it wraps. */
const STEPS = [1, 0.8, 0.64, 0.5];

/** A line broken at spaces into pieces of at most `max` characters; a single longer word stays whole. */
export function wrap(text: string, max: number): string[] {
  const pieces: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      pieces.push(line);
      line = word;
    }
  }
  if (line !== '') pieces.push(line);
  return pieces;
}

/** The largest size from `base` down at which the text fits `width` in at most `maxLines` lines; else the smallest. */
function fit(text: string, width: number, base: number, font: 'display' | 'body', maxLines: number) {
  let chosen = { size: base, lines: [text] };
  for (const step of STEPS) {
    const size = Math.round(base * step);
    const chars = Math.floor(width / (size * EM[font]));
    const lines = wrap(text, chars);
    chosen = { size, lines };
    if (lines.length <= maxLines && lines.every((line) => line.length <= chars)) break;
  }
  return chosen;
}

export function layout(sticker: Sticker): { items: Item[]; height: number } {
  const items: Item[] = [];
  const text = (x: number, y: number, words: string, size: number, font: 'display' | 'body', tone: 'text' | 'accent' | 'muted', anchor?: 'end') =>
    items.push({ kind: 'text', x, y, text: words, size, font, tone, anchor });
  let y = MARGIN;

  y += tokens.type.shareKicker;
  text(MARGIN, y, sticker.kicker, tokens.type.shareKicker, 'body', 'muted');
  y += GAP / 2;

  const title = fit(sticker.title, INNER, tokens.type.shareTitle, 'display', 2);
  for (const line of title.lines) {
    y += title.size;
    text(MARGIN, y, line, title.size, 'display', 'text');
  }
  y += GAP;

  for (let i = 0; i < sticker.stats.length; i += 2) {
    const row = sticker.stats.slice(i, i + 2).map((stat, column) => ({ stat, x: MARGIN + column * (COLUMN + COLUMN_GAP) }));
    const values = row.map(({ stat }) => fit(stat.value, COLUMN, tokens.type.shareValue, 'display', 1));
    const labels = row.map(({ stat }) => wrap(stat.label, Math.floor(COLUMN / (tokens.type.shareLabel * EM.body))));
    const top = y;
    let bottom = top;
    row.forEach(({ stat, x }, k) => {
      let at = top + values[k].size;
      text(x, at, stat.value, values[k].size, 'display', stat.accent ? 'accent' : 'text');
      for (const line of labels[k]) {
        at += tokens.type.shareLabel * 1.2;
        text(x, at, line, tokens.type.shareLabel, 'body', 'muted');
      }
      bottom = Math.max(bottom, at);
    });
    y = bottom + GAP;
  }

  for (const line of sticker.lines.flatMap((l) => wrap(l, Math.floor(INNER / (tokens.type.shareLine * EM.body))))) {
    y += tokens.type.shareLine * 1.3;
    text(MARGIN, y, line, tokens.type.shareLine, 'body', 'text');
  }
  if (sticker.lines.length > 0) y += GAP;

  if (sticker.weeks.length > 0) {
    const size = Math.min(CELL_MAX, Math.floor((INNER - CELL_GAP * (sticker.weeks.length - 1)) / sticker.weeks.length));
    sticker.weeks.forEach((state, i) => items.push({ kind: 'cell', x: MARGIN + i * (size + CELL_GAP), y, size, state }));
    y += size + GAP;
  }

  y += tokens.type.shareMark;
  text(WIDTH - MARGIN, y, t('app.name'), tokens.type.shareMark, 'display', 'text', 'end');
  return { items, height: y + MARGIN };
}
