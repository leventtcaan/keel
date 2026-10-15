/**
 * The preview (K-975, ADR-076 #8): 9:16 whatever the sticker, and the real image shown smaller, never a second drawing.
 */
import { render } from '@testing-library/react-native';
import { PixelRatio, StyleSheet } from 'react-native';

import { layout } from '@/share/layout';
import { shareParams } from '@/share/params';
import { Preview } from '@/share/Preview';
import type { Sticker } from '@/share/stickers';

const STICKER: Sticker = { kind: 'streak', kicker: 'Weeks on track', title: '11 of 12', stats: [], lines: [], weeks: ['ON_TRACK', 'SPARE'] };

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };
const views = (node: Node | null, out: Node[] = []): Node[] => {
  if (node === null || typeof node === 'string') return out;
  if (node.type === 'View') out.push(node);
  for (const child of node.children ?? []) if (typeof child !== 'string') views(child, out);
  return out;
};
const style = (node: Node) => StyleSheet.flatten(node.props.style) as Record<string, any>;

async function shown(backdrop?: { kind: 'dark' }) {
  const { toJSON } = await render(<Preview sticker={STICKER} backdrop={backdrop} width={240} imageRef={{ current: null }} />);
  const [frame, image] = views(toJSON() as Node);
  return { frame: style(frame), image: style(image) };
}

test('the frame is 9:16 at the width asked', async () => {
  const { frame } = await shown({ kind: 'dark' });
  expect(frame.width).toBe(240);
  expect(frame.height).toBeCloseTo((240 * shareParams.storyHeight) / shareParams.storyWidth, 5);
});

test('the image is drawn at the size whose pixels are the width in share.json, and scaled to the frame', async () => {
  const { image } = await shown({ kind: 'dark' });
  const drawn = shareParams.storyWidth / PixelRatio.get();

  expect(image.width).toBeCloseTo(drawn, 5);
  expect(image.transform).toEqual([{ scale: 240 / drawn }]);
  expect(image.top).toBe(0); // a backdrop fills the frame
});

test('with no backdrop the sticker alone sits low in the frame, as in a Story, inside it', async () => {
  const { frame, image } = await shown();
  const height = (image.height as number) * (240 / (shareParams.storyWidth / PixelRatio.get()));

  expect(image.height).toBeCloseTo(((shareParams.storyWidth / PixelRatio.get()) * layout(STICKER).height) / shareParams.storyWidth, 5);
  expect(image.top).toBeGreaterThan(frame.height / 2);
  expect(image.top + height).toBeLessThan(frame.height);
});
