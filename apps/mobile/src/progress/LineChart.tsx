import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

import { type ChartPoint, lineScale } from './lineScale';

/** The chart's own drawing space: labels to the left of BOX, the first and last day under it. */
const WIDTH = 300;
const HEIGHT = 150;
const BOX = { left: 58, right: 284, top: 14, bottom: 118 };
const DATE_Y = 140;
const LABEL_GAP = 6;
const DOT = 3;
const LAST = 5;
const RING = 7;
const LINE_WIDTH = 2.2;

type Props = {
  /** The test ids' stem: `${prefix}-chart`, `-point-`, `-held-`, `-tick`, `-line`. */
  prefix: 'strength' | 'weight';
  /** Oldest first, at least two (a line needs them; the callers draw nothing for one). */
  points: ChartPoint[];
  /** What VoiceOver says of the whole chart: it is reached as one image. */
  summary: string;
};

/**
 * A line over calendar days (K-979: a lift's best set by week, the weight's 7-day average). The two labels on the left are
 * the lowest and the highest point, each at its own height (lineScale): values that happened, never a rounded tick. The
 * latest point is filled; a marked point (a week the call held the load) has a ring. The first and last day sit under it.
 */
export function LineChart({ prefix, points, summary }: Props) {
  const { color } = useTheme();
  const scale = lineScale(points, BOX);
  const last = points[points.length - 1];
  const at = (p: ChartPoint) => ({ cx: scale.x(p.day), cy: scale.y(p.value) });
  const label = { fontFamily: tokens.font.displaySemiBold, fontSize: tokens.type.label, fill: color.muted };
  return (
    <View testID={`${prefix}-chart`} accessible accessibilityRole="image" accessibilityLabel={summary} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {scale.ticks.map((tick) => (
          <Line key={`grid-${tick.point.day}`} x1={BOX.left} x2={WIDTH} y1={tick.y} y2={tick.y} stroke={color.track} strokeWidth={1} />
        ))}
        <Line x1={BOX.left} x2={WIDTH} y1={BOX.bottom} y2={BOX.bottom} stroke={color.muted} strokeWidth={1} />
        {scale.ticks.map((tick) => (
          <SvgText key={`tick-${tick.point.day}`} testID={`${prefix}-tick`} x={BOX.left - LABEL_GAP} y={tick.y + 4} textAnchor="end" {...label}>
            {tick.point.label}
          </SvgText>
        ))}
        <SvgText x={BOX.left} y={DATE_Y} textAnchor="start" {...label}>
          {shortDate(points[0].day)}
        </SvgText>
        <SvgText x={BOX.right} y={DATE_Y} textAnchor="end" {...label}>
          {shortDate(last.day)}
        </SvgText>
        <Polyline
          testID={`${prefix}-line`}
          points={points.map((p) => `${at(p).cx},${at(p).cy}`).join(' ')}
          fill="none"
          stroke={color.text}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <Circle key={p.day} testID={`${prefix}-point-${p.day}`} {...at(p)} r={p === last ? LAST : DOT} fill={p === last ? color.accent : color.text} />
        ))}
        {points
          .filter((p) => p.marked === true)
          .map((p) => (
            <Circle key={`held-${p.day}`} testID={`${prefix}-held-${p.day}`} {...at(p)} r={RING} fill="none" stroke={color.accent} strokeWidth={LINE_WIDTH} />
          ))}
      </Svg>
    </View>
  );
}
