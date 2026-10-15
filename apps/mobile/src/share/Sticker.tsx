import { forwardRef } from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { t } from '@/copy';
import { palettes, tokens } from '@/theme/tokens';

import { type Item, layout } from './layout';
import { shareParams } from './params';
import type { Sticker, WeekCell } from './stickers';

/** What a sticker is drawn with: the decision block's colours (ADR-070), the same in light and dark — it is an image. */
const ink = palettes.light;
const TONE = { text: ink.decisionText, accent: ink.accentInk, muted: ink.decisionTextSecondary };
const PANEL_RADIUS = 56;
const CELL_RADIUS = 12;
const OUTLINE = 4;
const DASH = '10 8';

type Props = { sticker: Sticker; width: number };

/**
 * One sticker (K-975): its words on a see-through dark panel, the weeks as cells, the word mark. Drawn as SVG so the phone
 * can make the PNG itself (react-native-svg's toDataURL through the ref); the image is `width` points wide and its
 * pixels are that times the screen's scale, which the screen picks to come out at the width in share.json. Nothing is
 * drawn by a server and nothing else goes in: no photo, no body, no figure (U12, V1).
 */
export const StickerImage = forwardRef<Svg, Props>(function StickerImage({ sticker, width }, ref) {
  const { items, height } = layout(sticker);
  const pieces = [sticker.kicker, sticker.title, ...sticker.stats.map((s) => `${s.value} ${s.label}`), ...sticker.lines];
  return (
    <Svg
      ref={ref}
      width={width}
      height={(width * height) / shareParams.storyWidth}
      viewBox={`0 0 ${shareParams.storyWidth} ${height}`}
      accessible
      accessibilityRole="image"
      // What is on it, read out: the user checks what an image says before it leaves the phone.
      accessibilityLabel={[t('share.spoken'), ...pieces].join('. ')}>
      <Rect x={0} y={0} width={shareParams.storyWidth} height={height} rx={PANEL_RADIUS} fill={ink.decisionBackground} fillOpacity={tokens.opacity.scrim} />
      {items.map((item, i) => (item.kind === 'text' ? <Words key={i} item={item} /> : <Cell key={i} item={item} />))}
    </Svg>
  );
});

function Words({ item }: { item: Extract<Item, { kind: 'text' }> }) {
  return (
    <SvgText
      x={item.x}
      y={item.y}
      fontSize={item.size}
      fontFamily={item.font === 'display' ? tokens.font.display : undefined}
      fontWeight={item.font === 'display' ? undefined : tokens.weight.bold}
      textAnchor={item.anchor ?? 'start'}
      fill={TONE[item.tone]}>
      {item.text}
    </SvgText>
  );
}

/** A week: on track filled, a spare week half filled, a week not on track an outline, a paused week dashed (U7: none is a mark of blame). */
function Cell({ item }: { item: Extract<Item, { kind: 'cell' }> }) {
  const look: Record<WeekCell, object> = {
    ON_TRACK: { fill: ink.accentInk },
    SPARE: { fill: ink.accentInk, fillOpacity: tokens.opacity.dim },
    MISSED: { fill: 'none', stroke: ink.decisionMuted, strokeWidth: OUTLINE },
    PAUSED: { fill: 'none', stroke: ink.accentInk, strokeWidth: OUTLINE, strokeDasharray: DASH },
  };
  return <Rect x={item.x} y={item.y} width={item.size} height={item.size} rx={CELL_RADIUS} {...look[item.state]} />;
}
