/**
 * The card as drawn (K-612): words on the decision card's ground — every line the card text has, wrapped to fit — and
 * nothing else: no image, no figure (U12, V1). The share card stays off the progress photos and the server
 * (a scan of src/share and the screen).
 */
import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type Svg from 'react-native-svg';

import { ShareCard } from '@/share/ShareCard';

const TEXT = {
  heading: 'My training, week by week',
  lines: ['11 of 12 weeks on track', 'Latest call: Food stays where it is. Movement goes up.'],
  footer: 'Calls made by rules, from my own data.',
};
type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
const all = (node: Node | null, out: Node[] = []): Node[] => {
  if (node === null || typeof node === 'string') return out;
  out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') all(child, out);
  return out;
};

test('every line is on the card, a long one wrapped; nothing but text and colour', async () => {
  const { toJSON } = await render(<ShareCard text={TEXT} width={360} />);
  const nodes = all(toJSON() as Node);
  const words = nodes.flatMap((n) => (typeof n.props.content === 'string' ? [n.props.content] : []));

  expect(words).toEqual(expect.arrayContaining(['My training, week by week', '11 of 12 weeks on track', 'Latest call: Food stays where', 'it is. Movement goes up.']));
  expect(words.join(' ')).toContain(TEXT.footer);
  expect(nodes.map((n) => n.type).filter((type) => /^(RNSVG)?(Image|Pattern|Use)$/i.test(type))).toEqual([]);
});

test('lines do not overlap: each starts below the last', async () => {
  const { toJSON } = await render(<ShareCard text={TEXT} width={360} />);
  // react-native-svg keeps a text's y on the RNSVGText node, as a list.
  const ys = all(toJSON() as Node)
    .filter((n) => n.type === 'RNSVGText')
    .map((n) => (n.props.y as number[])[0]);
  expect(ys.length).toBeGreaterThan(3);
  const lines = ys;
  expect(lines.every((y, i) => i === 0 || y > lines[i - 1])).toBe(true);
});

test('the image says what is on it, and its ref can make the PNG', async () => {
  const ref = createRef<Svg>();
  await render(<ShareCard ref={ref} text={TEXT} width={360} />);

  expect(screen.getByLabelText(new RegExp(TEXT.lines[0]))).toBeOnTheScreen();
  expect(typeof ref.current?.toDataURL).toBe('function');
});

describe('the share card stays on the phone and away from the photos', () => {
  const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const SHARE = path.resolve(__dirname, '../share');
  const FILES = [...fs.readdirSync(SHARE).map((name) => path.join(SHARE, name)), path.resolve(__dirname, '../app/share.tsx')];
  /** The camera roll is a photo library too: the card is handed to the sheet, never saved into one by the app. */
  /** A write to the server, a request of its own, an upload — or the progress photos (K-614): none may be named. */
  const FORBIDDEN = /\.(POST|PUT|PATCH|DELETE)\b|\bfetch\b|XMLHttpRequest|upload|sendBeacon|WebSocket|@\/photos|services\.photos|\bphotos\b|MediaLibrary|CameraRoll/;

  test('no file of it writes to the server, fetches, uploads or reads a photo', () => {
    expect(FILES.length).toBeGreaterThan(3);
    expect(FILES.filter((file) => FORBIDDEN.test(uncommented(fs.readFileSync(file, 'utf8')))).map((f) => path.basename(f))).toEqual([]);
  });

  test('the scan catches what it is for', () => {
    for (const bad of ["api.POST('/v1/x')", 'await fetch(url)', "import { x } from '@/photos/library'", 'const { photos } = useAppServices()', 'File.upload(u)']) {
      expect(FORBIDDEN.test(bad)).toBe(true);
    }
    expect(FORBIDDEN.test("api.GET('/v1/consistency')")).toBe(false);
    expect(FORBIDDEN.test('MediaLibrary.saveToLibraryAsync(uri)')).toBe(true);
    // The writing itself is in the scan: the device side lives under src/share.
    expect(FILES.map((f) => path.basename(f))).toContain('deviceShare.ts');
  });
});
