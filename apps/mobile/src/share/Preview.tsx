import { type Ref } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import type Svg from 'react-native-svg';

import { focusPalette, tokens } from '@/theme/tokens';

import { MARGIN, layout } from './layout';
import { shareParams } from './params';
import { type Backdrop, StickerImage } from './Sticker';
import type { Sticker } from './stickers';

type Props = { sticker: Sticker; backdrop?: Backdrop; width: number; imageRef: Ref<Svg> };

/**
 * What the share will be, 9:16 (ADR-076 #8), `width` points wide. The image is the real one, drawn at the size whose
 * pixels come out at share.json's width on this screen's scale and shown smaller, so the preview is the PNG. With no
 * backdrop ("In Instagram") the PNG is the sticker alone; it is shown where it would sit in a Story, on a dark ground.
 */
export function Preview({ sticker, backdrop, width, imageRef }: Props) {
  const drawn = shareParams.storyWidth / PixelRatio.get();
  const scale = width / drawn;
  const frame = (width * shareParams.storyHeight) / shareParams.storyWidth;
  const canvas = backdrop === undefined ? layout(sticker).height : shareParams.storyHeight;
  const height = (drawn * canvas) / shareParams.storyWidth;
  const top = backdrop === undefined ? frame - height * scale - (MARGIN * width) / shareParams.storyWidth : 0;
  return (
    <View style={[styles.frame, { width, height: frame, backgroundColor: focusPalette.background }]}>
      <View style={{ position: 'absolute', top, left: 0, width: drawn, height, transformOrigin: 'top left', transform: [{ scale }] }}>
        <StickerImage ref={imageRef} sticker={sticker} width={drawn} backdrop={backdrop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'center', overflow: 'hidden', borderRadius: tokens.radius.card },
});
