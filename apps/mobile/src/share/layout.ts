/**
 * The paper card's measures (K-975, ADR-094 Ek 2 › Uygulama #10), in image units (share.json: 1080 wide): where the card
 * sits in a Story-sized image, its padding, and the size each text is set at so it stays inside the card. The drawing
 * (Sticker.tsx) lays the card out with flexbox and scales these to points; pure, so the tests can read it. A text steps
 * down in size before it runs past the card; a character's width is an estimate (a share of the size), not a measurement,
 * so it errs wide, and the drawing still lets a text shrink to fit as a last guard.
 */
import { tokens } from '@/theme/tokens';

import { shareParams } from './params';
import type { Sticker } from './stickers';

/** The card's margins in a Story-sized image: at the sides, and under it. */
export const FRAME = { side: 40, foot: 60 };
/** The card: its padding, corner, the room round the record's highlight, the gaps between its parts, a week's cell. */
export const CARD = { padding: 70, radius: 56, highlight: 14, gap: 44, statGap: 24, cellGap: 12, cellMax: 72, cellRadius: 12 };
/** The width the card's words have. */
export const INNER = shareParams.storyWidth - 2 * FRAME.side - 2 * CARD.padding;
/** The width of an average character as a share of the text's size: the serif is narrow, the rounded numbers are not. */
export const EM = { display: 0.5, number: 0.62, body: 0.6 };
/** Each step a text may shrink to when it does not fit. */
const STEPS = [1, 0.8, 0.64, 0.5, 0.4];

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

/** The largest size from `base` down at which every text fits `width` in at most `maxLines` lines; else the smallest. */
function fit(texts: string[], width: number, base: number, font: keyof typeof EM, maxLines: number): number {
  let size = base;
  for (const step of STEPS) {
    size = Math.round(base * step);
    const chars = Math.floor(width / (size * EM[font]));
    const fits = texts.every((text) => {
      const lines = wrap(text, chars);
      return lines.length <= maxLines && lines.every((line) => line.length <= chars);
    });
    if (fits) break;
  }
  return size;
}

export type Sizes = {
  /** The serif title's size. */
  title: number;
  /** The numbers' size, the same for all of them (one row reads as one). */
  value: number;
  /** A number's column, and the gap between columns. */
  column: number;
  gap: number;
  /** The record's line, in the serif. */
  mark: number;
  /** A week's cell. */
  cell: number;
};

export function layout(sticker: Sticker): Sizes {
  const count = Math.max(sticker.stats.length, 1);
  const column = (INNER - CARD.statGap * (count - 1)) / count;
  const weeks = sticker.weeks.length;
  return {
    title: fit([sticker.title], INNER, tokens.type.shareTitle, 'display', 2),
    value: fit(
      sticker.stats.map((s) => s.value),
      column,
      tokens.type.shareValue,
      'number',
      1,
    ),
    column,
    gap: CARD.statGap,
    mark: sticker.mark === undefined ? tokens.type.shareMark : fit([sticker.mark.text], INNER - 2 * CARD.highlight, tokens.type.shareMark, 'display', 2),
    cell: weeks === 0 ? 0 : Math.min(CARD.cellMax, Math.floor((INNER - CARD.cellGap * (weeks - 1)) / weeks)),
  };
}
