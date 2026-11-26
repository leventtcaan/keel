import { type Ref } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { focusPalette, tokens } from '@/theme/tokens';

import { shareParams } from './params';
import { type Backdrop, StickerImage } from './Sticker';
import type { Sticker } from './stickers';

/** The points an image is drawn at so its pixels come out at share.json's width on this screen's scale. */
export const drawnWidth = () => shareParams.storyWidth / PixelRatio.get();

type Props = { sticker: Sticker; backdrop: Backdrop; width: number; imageRef?: Ref<View> };

/**
 * What the share will be, 9:16 (ADR-076 #8), `width` points wide. The image is the real one, drawn at the size whose
 * pixels come out at share.json's width on this screen's scale and shown smaller, so the preview is the PNG.
 */
export function Preview({ sticker, backdrop, width, imageRef }: Props) {
  const drawn = drawnWidth();
  const scale = width / drawn;
  const frame = (width * shareParams.storyHeight) / shareParams.storyWidth;
  return (
    <View style={[styles.frame, { width, height: frame, backgroundColor: focusPalette.background }]}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: drawn, transformOrigin: 'top left', transform: [{ scale }] }}>
        <StickerImage ref={imageRef} sticker={sticker} width={drawn} backdrop={backdrop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', overflow: 'hidden', borderRadius: tokens.radius.card },
});
