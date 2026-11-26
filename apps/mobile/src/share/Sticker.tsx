import { forwardRef } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { palettes, tokens } from '@/theme/tokens';

import { CARD, FRAME, layout } from './layout';
import { shareParams } from './params';
import type { Sticker, WeekCell } from './stickers';

/**
 * What a card is drawn with: the light palette (ADR-094 Ek 2 › Uygulama #10, the paper card), the same whatever the
 * person's theme, since it is an image that leaves the phone: dark ink on off-white paper, coral for the kicker and the
 * record, the highlighter under the record, petrol for the weeks as on Progress.
 */
const ink = palettes.light;
/** The app's mark (its icon), small at the card's foot beside the word mark; Metro needs a static require for an asset. */
const MARK: ImageSourcePropType = require('../../assets/images/icon.png');

/** What the card sits on, drawn into the same image: the user's photo or a plain dark ground. None: the card alone. */
export type Backdrop = { kind: 'dark' } | { kind: 'photo'; uri: string };

type Props = {
  sticker: Sticker;
  width: number;
  backdrop?: Backdrop;
  testID?: string;
};

/**
 * One sticker (K-975), as the paper card: the kicker, the serif title, the numbers in one row in the rounded face, the
 * record on a highlighter mark, the weeks as cells, the word mark. Drawn as views in the app's own faces (New York, SF
 * Pro Rounded), which an SVG cannot draw, and turned into the PNG on the phone by react-native-view-shot through the ref.
 * Every measure is in image units (layout.ts, 1080 wide) times `width` over that, so the view is `width` points wide and
 * its capture that times the screen's scale, which the screen picks to come out at share.json's width. With a backdrop
 * the image is the Story size (9:16, ADR-076 #8) with the card low in it, on the user's own photo or a dark ground;
 * without, the card alone, as tall as its words, on nothing. Nothing is drawn by a server and no body or figure goes in
 * (U12); the photo is the user's file, read here and nowhere else (V1).
 */
export const StickerImage = forwardRef<View, Props>(function StickerImage({ sticker, width, backdrop, testID }, ref) {
  const u = scaled(width);
  const sizes = layout(sticker);
  const pieces = [sticker.kicker, sticker.title, ...sticker.stats.map((s) => `${s.value} ${s.label}`), ...(sticker.mark ? [sticker.mark.text] : []), ...sticker.lines];
  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const frame =
    backdrop === undefined
      ? { width, paddingHorizontal: u(FRAME.side) }
      : { ...styles.story, width, height: (width * shareParams.storyHeight) / shareParams.storyWidth, paddingHorizontal: u(FRAME.side), paddingBottom: u(FRAME.foot) };
  const highlight = sticker.mark?.kind === 'record' ? styles.highlight : null;
  const photo = backdrop?.kind === 'photo' ? <Image source={{ uri: backdrop.uri }} resizeMode="cover" accessible={false} style={StyleSheet.absoluteFill} /> : null;
  return (
    <View
      ref={ref}
      testID={testID}
      collapsable={false}
      style={frame}
      accessible
      accessibilityRole="image"
      // What is on it, read out: the user checks what an image says before it leaves the phone.
      accessibilityLabel={[t('share.spoken'), ...pieces].join('. ')}>
      {photo}
      {/* The card's words are set at their image size whatever the phone's text size: the image is the same for whoever sees it. */}
      <View testID="card" style={[styles.card, { borderRadius: u(CARD.radius), padding: u(CARD.padding), gap: u(CARD.gap) }]}>
        <View style={{ gap: u(CARD.statGap / 2) }}>
          <Text allowFontScaling={false} style={[body(u, tokens.type.shareKicker), styles.coral]}>
            {sticker.kicker}
          </Text>
          <Text allowFontScaling={false} style={[tokens.face.display, styles.ink, { fontSize: u(sizes.title), lineHeight: u(sizes.title * 1.1) }]}>
            {sticker.title}
          </Text>
        </View>
        {sticker.stats.length > 0 && (
          <View style={[styles.row, { gap: u(sizes.gap) }]}>
            {sticker.stats.map((stat) => (
              <View key={stat.label} style={{ width: u(sizes.column) }}>
                <Text allowFontScaling={false} style={[tokens.face.displaySemiBold, styles.ink, styles.number, { fontSize: u(sizes.value) }]}>
                  {stat.value}
                </Text>
                <Text allowFontScaling={false} style={[body(u, tokens.type.shareLabel), styles.muted]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        )}
        {sticker.mark !== undefined && (
          // The record (or the baseline): its coral label, then the move and the set in the serif; a record on the highlighter.
          <View style={{ gap: u(CARD.cellGap) }}>
            <Text allowFontScaling={false} style={[body(u, tokens.type.shareKicker), styles.coral]}>
              {sticker.mark.label}
            </Text>
            <View style={[styles.marked, { borderRadius: u(CARD.cellRadius), paddingHorizontal: u(CARD.highlight), marginHorizontal: -u(CARD.highlight) }, highlight]}>
              <Text allowFontScaling={false} style={[tokens.face.display, styles.ink, { fontSize: u(sizes.mark), lineHeight: u(sizes.mark * 1.3) }]}>
                {sticker.mark.text}
              </Text>
            </View>
          </View>
        )}
        {sticker.lines.length > 0 && (
          <View>
            {sticker.lines.map((line) => (
              <Text key={line} allowFontScaling={false} style={[body(u, tokens.type.shareLine), styles.ink]}>
                {line}
              </Text>
            ))}
          </View>
        )}
        {sticker.weeks.length > 0 && (
          <View style={[styles.row, { gap: u(CARD.cellGap) }]}>
            {sticker.weeks.map((state, i) => (
              <View key={i} testID="week" style={[{ width: u(sizes.cell), height: u(sizes.cell), borderRadius: u(CARD.cellRadius) }, LOOK[state]]} />
            ))}
          </View>
        )}
        <View style={[styles.sign, { gap: u(CARD.cellGap) }]}>
          <Image testID="app-mark" source={MARK} accessible={false} style={{ width: u(CARD.mark), height: u(CARD.mark), borderRadius: u(CARD.markRadius) }} />
          <Text allowFontScaling={false} style={[tokens.face.display, styles.muted, { fontSize: u(tokens.type.shareSign) }]}>
            {t('app.name')}
          </Text>
        </View>
      </View>
    </View>
  );
});

type Scale = (units: number) => number;

/** Image units (1080 wide) to points, for an image `width` points wide. */
const scaled =
  (width: number): Scale =>
  (units) =>
    (units * width) / shareParams.storyWidth;

/** A body text's size and its line. */
const body = (u: Scale, size: number) => ({ fontSize: u(size), lineHeight: u(size * 1.25) });

/** A week as on Progress (ConsistencyGrid): on track filled, a spare week soft with a ring, a missed one plain, a paused one empty (U7: none is a mark of blame). */
const LOOK: Record<WeekCell, object> = {
  ON_TRACK: { backgroundColor: ink.accent },
  SPARE: { backgroundColor: ink.accentSoft, borderColor: ink.accent, borderWidth: tokens.border.ring },
  MISSED: { backgroundColor: ink.weekMissed },
  PAUSED: { backgroundColor: ink.background, borderColor: ink.muted, borderWidth: tokens.border.ring },
};

const styles = StyleSheet.create({
  story: { justifyContent: 'flex-end', backgroundColor: palettes.dark.background, overflow: 'hidden' },
  card: { backgroundColor: ink.background },
  row: { flexDirection: 'row' },
  ink: { color: ink.text },
  muted: { color: ink.muted },
  coral: { color: ink.progressText, fontWeight: tokens.weight.semibold },
  number: { fontVariant: ['tabular-nums'] },
  marked: { alignSelf: 'flex-start' },
  highlight: { backgroundColor: ink.tintSuggest },
  sign: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end' },
});
