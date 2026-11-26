import { type Ref } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { focusPalette, tokens } from '@/theme/tokens';

import { FRAME } from './layout';
import { shareParams } from './params';
import { type Backdrop, StickerImage } from './Sticker';
import type { Sticker } from './stickers';

/** The points an image is drawn at so its pixels come out at share.json's width on this screen's scale. */
export const drawnWidth = () => shareParams.storyWidth / PixelRatio.get();

type Props = { sticker: Sticker; backdrop?: Backdrop; width: number; imageRef: Ref<View>; bareRef?: Ref<View> };

/**
 * What the share will be, 9:16 (ADR-076 #8), `width` points wide. The image is the real one, drawn at the size whose
 * pixels come out at share.json's width on this screen's scale and shown smaller, so the preview is the PNG. With no
 * backdrop ("In Instagram") the PNG is the card alone; it is shown where it would sit in a Story, at the foot of a dark
 * ground above the margin a Story-sized image leaves it. With `bareRef` the card alone (what a Story takes as its sticker)
 * is drawn first, at its own size and where it would sit, under the image shown: in the window and measured, so it can be
 * captured (in a box of no height it measured 0 tall, K-1244), and covered, so it is never seen twice.
 */
export function Preview({ sticker, backdrop, width, imageRef, bareRef }: Props) {
  const drawn = drawnWidth();
  const scale = width / drawn;
  const frame = (width * shareParams.storyHeight) / shareParams.storyWidth;
  const foot = { bottom: (FRAME.foot * width) / shareParams.storyWidth, transformOrigin: 'bottom left' };
  const place = backdrop === undefined ? foot : { top: 0, transformOrigin: 'top left' };
  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const under =
    bareRef === undefined ? null : (
      <View style={{ position: 'absolute', left: 0, width: drawn, ...foot, transform: [{ scale }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <StickerImage ref={bareRef} testID="bare" sticker={sticker} width={drawn} />
      </View>
    );
  return (
    <View style={[styles.frame, { width, height: frame, backgroundColor: focusPalette.background }]}>
      {under}
      <View style={{ position: 'absolute', left: 0, width: drawn, ...place, transform: [{ scale }] }}>
        <StickerImage ref={imageRef} sticker={sticker} width={drawn} backdrop={backdrop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', overflow: 'hidden', borderRadius: tokens.radius.card },
});
