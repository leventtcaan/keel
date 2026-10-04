import { forwardRef } from 'react';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { t } from '@/copy';
import { palettes, tokens } from '@/theme/tokens';

import { type CardText, wrap } from './card';

/** The image's own size: 4:5, what feeds and stories show whole. The view scales it to the screen's width. */
const WIDTH = 1080;
const HEIGHT = 1350;
const MARGIN = 96;
const HEADING = tokens.type.shareHeading;
const LINE = tokens.type.shareLine;
const LEADING = 1.35;
const GAP = 36;
const FOOTER = tokens.type.shareFooter;
/**
 * Characters a line holds at LINE size inside the margins: 888 units over ~0.55 em a character (a proportional system font's
 * average) ≈ 31 — an estimate, not a measurement; a long word still overruns rather than being cut (wrap keeps it whole).
 */
const LINE_CHARS = 30;

/** What the card is drawn with: the decision card's colours (ADR-016), the same in light and dark — it is an image. */
const ink = palettes.light;

type Props = { text: CardText; width: number };

/**
 * The share card (K-612): words only — the heading, the lines (cardText), a footer — on the decision card's dark ground
 * with its accent. No photo, no body, no figure (U12, V1). Drawn as SVG so the phone can make the PNG itself
 * (react-native-svg's toDataURL, through the ref); nothing is drawn by a server.
 */
export const ShareCard = forwardRef<Svg, Props>(function ShareCard({ text, width }, ref) {
  let y = MARGIN + HEADING;
  const heading = (
    <SvgText x={MARGIN} y={y} fontSize={HEADING} fontWeight={tokens.weight.bold} fill={ink.decisionText}>
      {text.heading}
    </SvgText>
  );
  y += GAP;
  const rule = <Rect x={MARGIN} y={y} width={WIDTH / 6} height={8} fill={ink.accentInk} />;
  y += GAP + LINE;
  const lines = text.lines.flatMap((line, i) => {
    const pieces = wrap(line, LINE_CHARS).map((piece, j) => {
      const at = y + j * LINE * LEADING;
      return (
        <SvgText key={`${i}-${j}`} x={MARGIN} y={at} fontSize={LINE} fill={i === 0 ? ink.decisionText : ink.decisionTextSecondary}>
          {piece}
        </SvgText>
      );
    });
    y += wrap(line, LINE_CHARS).length * LINE * LEADING + GAP;
    return pieces;
  });
  return (
    <Svg
      ref={ref}
      width={width}
      height={(width * HEIGHT) / WIDTH}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      accessible
      accessibilityRole="image"
      // What is on it, read out: the user checks what a health image says before it leaves the phone.
      accessibilityLabel={[t('share.spoken'), text.heading, ...text.lines].join('. ')}>
      <Rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={ink.decisionBackground} />
      {heading}
      {rule}
      {lines}
      <SvgText x={MARGIN} y={HEIGHT - MARGIN} fontSize={FOOTER} fill={ink.decisionMuted}>
        {text.footer}
      </SvgText>
    </Svg>
  );
});
