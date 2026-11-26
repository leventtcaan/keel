/**
 * A sticker as drawn (K-975; the paper card, ADR-094 Ek 2 › Uygulama #10): an off-white card in dark ink, the coral kicker,
 * the serif title, the numbers in the rounded face, the record on a highlighter mark, the word mark at its foot. Drawn as
 * views in the app's own faces (react-native-view-shot turns the view into the PNG), on the user's photo, a dark ground or
 * nothing; no other picture, no figure (U12, V1). The share code stays on the phone and away from the progress photos (a
 * scan of src/share and the screen).
 */
import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { StyleSheet, type View } from 'react-native';

import { t } from '@/copy';
import { CARD, FRAME } from '@/share/layout';
import { shareParams } from '@/share/params';
import { type Backdrop, StickerImage } from '@/share/Sticker';
import type { Sticker } from '@/share/stickers';
import { palettes, tokens } from '@/theme/tokens';

const paper = palettes.light;
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
const STREAK: Sticker = { kind: 'streak', kicker: 'Weeks on track', title: '11 of 12', stats: [], lines: ['1 spare week'], weeks: ['ON_TRACK', 'SPARE', 'MISSED', 'PAUSED'] };
const KINDS: Sticker[] = [
  WORKOUT,
  { kind: 'pr', kicker: 'New best', title: 'Squat', stats: [{ value: '100 kg × 8', label: 'best set ever' }], lines: [], weeks: [] },
  STREAK,
  { kind: 'progress', kicker: 'Progress', title: '12 weeks in', stats: [], lines: ['Squat +20 kg', 'Row +10 kg'], weeks: [] },
];
const PHOTO: Backdrop = { kind: 'photo', uri: 'file:///cache/ImagePicker/a.jpg' };

const style = (node: { props: Record<string, unknown> }) => StyleSheet.flatten(node.props.style as never) as Record<string, any>;
type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
const all = (node: Node | null, out: Node[] = []): Node[] => {
  if (node === null || typeof node === 'string') return out;
  out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') all(child, out);
  return out;
};
let tree: Node[] = [];
const show = async (sticker: Sticker, width = 360, backdrop?: Backdrop) => {
  const shown = await render(<StickerImage sticker={sticker} width={width} backdrop={backdrop} testID="image" />);
  tree = all(shown.toJSON() as Node);
  return shown;
};
const texts = () => tree.filter((n) => n.type === 'Text').map((n) => (n.children ?? []).join(''));
const images = () => tree.filter((n) => n.type === 'Image');
/** The view right round a text: the record's mark is the one round its line. */
const holder = (words: string) => tree.find((n) => n.type === 'View' && (n.children ?? []).some((c) => typeof c !== 'string' && c.type === 'Text' && (c.children ?? []).join('') === words))!;

test.each(KINDS.map((s) => [s.kind, s] as const))('%s: every piece of its words is drawn, in order, with the word mark last', async (_, sticker) => {
  await show(sticker);

  const expected = [sticker.kicker, sticker.title, ...sticker.stats.flatMap((s) => [s.value, s.label]), ...(sticker.mark ? [sticker.mark.label, sticker.mark.text] : []), ...sticker.lines, t('app.name')];
  expect(texts()).toEqual(expected);
});

test('the paper card: off-white, dark ink, a coral kicker, rounded at its corners', async () => {
  await show(WORKOUT);

  const card = screen.getByTestId('card');
  expect(style(card)).toMatchObject({ backgroundColor: paper.background, borderRadius: expect.any(Number) });
  expect(style(screen.getByText(WORKOUT.kicker)).color).toBe(paper.progressText);
  expect(style(screen.getByText(WORKOUT.title)).color).toBe(paper.text);
  expect(style(screen.getByText('4,280')).color).toBe(paper.text);
  expect(style(screen.getByText('kg lifted')).color).toBe(paper.muted);
});

test("the app's faces: the serif title, record line and word mark; the numbers rounded", async () => {
  await show(WORKOUT);

  for (const words of [WORKOUT.title, WORKOUT.mark!.text, t('app.name')]) expect(style(screen.getByText(words))).toMatchObject(tokens.face.display);
  for (const value of ['52', '4,280', '14']) expect(style(screen.getByText(value)).fontFamily).toBe(tokens.face.displaySemiBold.fontFamily);
});

test('a record is on a highlighter mark, its label coral; a baseline is plain', async () => {
  await show(WORKOUT);
  expect(style(holder(WORKOUT.mark!.text)).backgroundColor).toBe(paper.tintSuggest);
  expect(style(screen.getByText(WORKOUT.mark!.label)).color).toBe(paper.progressText);

  await show({ ...WORKOUT, mark: { kind: 'baseline', label: 'Baseline set', text: 'Squat · 60 kg × 8' } });
  expect(style(holder('Squat · 60 kg × 8')).backgroundColor).toBeUndefined();
});

test('sizes in image units scaled to the width asked: the title at 1080 wide is the token, at 360 a third of it', async () => {
  await show(WORKOUT, shareParams.storyWidth);
  expect(style(screen.getByText(WORKOUT.title)).fontSize).toBe(tokens.type.shareTitle);

  await show(WORKOUT, shareParams.storyWidth / 3);
  expect(style(screen.getByText(WORKOUT.title)).fontSize).toBeCloseTo(tokens.type.shareTitle / 3, 5);
});

describe('behind the card', () => {
  test('dark: a Story-sized image (9:16 from share.json), a solid dark ground, the card low in it inside its margins', async () => {
    await show(WORKOUT, 360, { kind: 'dark' });

    const k = 360 / shareParams.storyWidth;
    expect(style(screen.getByTestId('image'))).toMatchObject({ width: 360, backgroundColor: palettes.dark.background, justifyContent: 'flex-end' });
    expect(style(screen.getByTestId('image')).height).toBeCloseTo(360 * (shareParams.storyHeight / shareParams.storyWidth), 5);
    expect(style(screen.getByTestId('image')).paddingHorizontal).toBeCloseTo(FRAME.side * k, 5);
    expect(style(screen.getByTestId('image')).paddingBottom).toBeCloseTo(FRAME.foot * k, 5);
    expect(images()).toEqual([]);
  });

  test("a photo: the user's file, covering the image, under the card", async () => {
    await show(WORKOUT, 360, PHOTO);

    const [photo] = images();
    expect(photo.props.source).toEqual({ uri: PHOTO.uri });
    expect(photo.props.resizeMode).toBe('cover');
    expect(style(photo)).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
  });

  test('none (the sticker alone): the card only, as tall as its words, on nothing; the words the same', async () => {
    await show(WORKOUT, 360);
    const alone = texts();
    const frame = style(screen.getByTestId('image'));
    expect(frame.height).toBeUndefined();
    expect(frame.backgroundColor).toBeUndefined();
    expect(frame.paddingBottom).toBeUndefined();

    await show(WORKOUT, 360, PHOTO);
    expect(texts()).toEqual(alone);
  });
});

test('each week is a cell in its own look: a spare week is not a missed one', async () => {
  await show(STREAK);
  const cells = screen.getAllByTestId('week').map((c) => JSON.stringify([style(c).backgroundColor, style(c).borderColor, style(c).borderWidth]));

  expect(cells).toHaveLength(4);
  expect(new Set(cells).size).toBe(4);
  expect(style(screen.getAllByTestId('week')[0]).width).toBeCloseTo(CARD.cellMax * (360 / shareParams.storyWidth), 5);
});

test('the image says what is on it (the user checks before it leaves the phone); its ref is the view the PNG is made from', async () => {
  const ref = createRef<View>();
  await render(<StickerImage ref={ref} sticker={WORKOUT} width={360} testID="image" />);

  expect(screen.getByLabelText(new RegExp(`${t('share.spoken')}.*${WORKOUT.kicker}.*${WORKOUT.title}.*52 minutes.*${WORKOUT.mark!.text}`))).toBeOnTheScreen();
  expect(ref.current).not.toBeNull();
  // Kept as a real view (not flattened away), so there is a view to capture.
  expect(screen.getByTestId('image').props.collapsable).toBe(false);
});

describe('the share code stays on the phone and away from the photos', () => {
  const uncommented = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const SHARE = path.resolve(__dirname, '../share');
  const FILES = [...fs.readdirSync(SHARE).map((name) => path.join(SHARE, name)), path.resolve(__dirname, '../app/share.tsx')];
  /** A write to the server, a request of its own, an upload — the progress photos (K-614) or the camera roll: none may be named. */
  const FORBIDDEN = /\.(POST|PUT|PATCH|DELETE)\b|\bfetch\b|XMLHttpRequest|upload|sendBeacon|WebSocket|@\/photos|services\.photos|\bphotos\b|MediaLibrary|CameraRoll/;

  test('no file of it writes to the server, fetches, uploads or reads a photo', () => {
    expect(FILES.length).toBeGreaterThan(5);
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

// ADR-094 Ek 2 › Uygulama #10: the card is paper whatever the person's theme (an image that leaves the phone), so it is
// drawn in the light palette: its ink, its muted words and its coral reach 4.5:1 on the card and on the highlighter.
// (Before, ADR-094 §4: light words on a see-through dark panel.)
test('the card is drawn in the light palette, its words reading on the paper and on the highlighter', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'share', 'Sticker.tsx'), 'utf8');
  expect(source).toMatch(/const ink = palettes\.light;/);
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  for (const ink of [paper.text, paper.muted, paper.progressText]) expect(ratio(ink, paper.background)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(paper.text, paper.tintSuggest)).toBeGreaterThanOrEqual(4.5);
});
