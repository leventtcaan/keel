/**
 * A sticker as drawn (K-975): its words on a see-through panel, the word mark on every one, the grid in its cells,
 * nothing else: no image, no figure (U12, V1). The share code stays on the phone and away from the progress photos
 * (a scan of src/share and the screen).
 */
import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import type Svg from 'react-native-svg';

import { t } from '@/copy';
import { layout } from '@/share/layout';
import { shareParams } from '@/share/params';
import { type Backdrop, StickerImage } from '@/share/Sticker';
import type { Sticker } from '@/share/stickers';

const WORKOUT: Sticker = {
  kind: 'workout',
  kicker: 'Workout complete',
  title: 'Full body A',
  stats: [
    { value: '52', label: 'minutes' },
    { value: '4,280', label: 'kg lifted', accent: true },
  ],
  lines: ['Next time every set has a target'],
  weeks: [],
};
const STREAK: Sticker = { kind: 'streak', kicker: 'Weeks on track', title: '11 of 12', stats: [], lines: [], weeks: ['ON_TRACK', 'SPARE', 'MISSED', 'PAUSED'] };
const KINDS: Sticker[] = [
  WORKOUT,
  { kind: 'pr', kicker: 'New PR', title: 'Squat', stats: [{ value: '100 kg × 8', label: 'best set ever', accent: true }], lines: [], weeks: [] },
  STREAK,
  { kind: 'progress', kicker: 'Progress', title: '12 weeks in', stats: [], lines: ['Squat +20 kg', 'Row +10 kg'], weeks: [] },
];

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
const all = (node: Node | null, out: Node[] = []): Node[] => {
  if (node === null || typeof node === 'string') return out;
  out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') all(child, out);
  return out;
};
const nodes = async (sticker: Sticker, width = 360, backdrop?: Backdrop) =>
  all((await render(<StickerImage sticker={sticker} width={width} backdrop={backdrop} />)).toJSON() as Node);
const words = (list: Node[]) => list.flatMap((n) => (typeof n.props.content === 'string' ? [n.props.content] : []));

test.each(KINDS.map((s) => [s.kind, s] as const))('%s: every piece of its words is drawn, with the word mark', async (_, sticker) => {
  const drawn = words(await nodes(sticker));

  expect(drawn).toEqual(expect.arrayContaining([sticker.kicker, sticker.title, ...sticker.stats.flatMap((s) => [s.value, s.label]), t('app.name')]));
  expect(drawn.length).toBe(layout(sticker).items.filter((i) => i.kind === 'text').length);
});

test('nothing but text, cells and a see-through panel: no picture, no pattern', async () => {
  const list = await nodes(STREAK);

  expect(list.map((n) => n.type).filter((type) => /^(RNSVG)?(Image|Pattern|Use|ClipPath|Mask)$/i.test(type))).toEqual([]);
  // The panel is the only thing under the words and lets what is behind show through (a sticker, not a card).
  const panel = list.find((n) => n.type === 'RNSVGRect')!;
  expect(panel.props.fillOpacity).toBeLessThan(1);
});

test('the image is as wide as asked and as tall as its words: its view box is the 1080-wide image', async () => {
  const { height } = layout(WORKOUT);
  const [svg] = await nodes(WORKOUT, 360);

  expect(svg.props).toMatchObject({ width: 360, vbWidth: shareParams.storyWidth, vbHeight: height });
  expect(svg.props.height).toBeCloseTo((360 * height) / shareParams.storyWidth, 5);
  expect(height).toBeLessThan(shareParams.storyHeight);
});

describe('behind the words', () => {
  const PHOTO: Backdrop = { kind: 'photo', uri: 'file:///cache/ImagePicker/a.jpg' };

  test('dark: a Story-sized image (9:16 from share.json), the words low in it, inside the margins', async () => {
    const list = await nodes(WORKOUT, 360, { kind: 'dark' });

    expect(list[0].props).toMatchObject({ vbWidth: shareParams.storyWidth, vbHeight: shareParams.storyHeight });
    const ground = list.find((n) => n.type === 'RNSVGRect' && n.props.fill !== undefined)!;
    expect(ground.props).toMatchObject({ width: shareParams.storyWidth, height: shareParams.storyHeight });
    expect(ground.props.fillOpacity).toBeUndefined(); // the ground is solid
    // The group holding the words sits at the bottom: its top is below the middle, its bottom inside the image.
    const group = list.find((n) => n.type === 'RNSVGGroup' && n.props.matrix !== undefined)!;
    const top = (group.props.matrix as number[])[5];
    expect(top).toBeGreaterThan(shareParams.storyHeight / 2);
    expect(top + layout(WORKOUT).height).toBeLessThan(shareParams.storyHeight);
  });

  test("a photo: the user's file, filling the image, under the words", async () => {
    const list = await nodes(WORKOUT, 360, PHOTO);

    const photo = list.find((n) => n.type === 'RNSVGImage')!;
    expect(photo.props).toMatchObject({ width: shareParams.storyWidth, height: shareParams.storyHeight, src: { uri: PHOTO.uri } });
    expect(photo.props.meetOrSlice).toBe(1); // slice: cover the image, never letterbox
    expect(list.indexOf(photo)).toBeLessThan(list.findIndex((n) => n.type === 'RNSVGText'));
  });

  test('with a backdrop the words are the same; without one the image is only as tall as the words', async () => {
    const withPhoto = words(await nodes(WORKOUT, 360, PHOTO));
    const alone = words(await nodes(WORKOUT, 360));

    expect(withPhoto).toEqual(alone);
    expect((await nodes(WORKOUT))[0].props.vbHeight).toBe(layout(WORKOUT).height);
  });
});

test('each week is a cell in its own look: a spare week is not a missed one', async () => {
  const list = await nodes(STREAK);
  const cells = list.filter((n) => n.type === 'RNSVGRect' && n.props.rx !== undefined && n.props.width !== undefined);
  const looks = cells.slice(-STREAK.weeks.length).map((c) => JSON.stringify([c.props.fill, c.props.fillOpacity, c.props.stroke, c.props.strokeDasharray]));

  expect(looks).toHaveLength(4);
  expect(new Set(looks).size).toBe(4);
});

test('the image says what is on it (the user checks before it leaves the phone), and its ref can make the PNG', async () => {
  const ref = createRef<Svg>();
  await render(<StickerImage ref={ref} sticker={WORKOUT} width={360} />);

  expect(screen.getByLabelText(new RegExp(`${t('share.spoken')}.*${WORKOUT.kicker}.*${WORKOUT.title}.*52 minutes`))).toBeOnTheScreen();
  expect(typeof ref.current?.toDataURL).toBe('function');
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
