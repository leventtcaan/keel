import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';
import { type UnitSystem, formatLoad, loadValue } from '@/units/units';

import { chartScale } from './chartScale';
import { type StrengthPoint, weekOf } from './strength';

/** The chart's own drawing space (prototype 4.4): labels to the left of BOX, the weeks' dates under it. */
const WIDTH = 300;
const HEIGHT = 172;
const BOX = { left: 58, right: 278, top: 26, bottom: 140 };
const DATE_Y = 160;
const LABEL_GAP = 6;
const BAND_LABEL_Y = 16;
const DOT = 3;
const RING = 5;
const LINE_WIDTH = 2.2;

type Props = { points: StrengthPoint[]; from: string; today: string; units: UnitSystem; move: string };

/**
 * A lift's best estimated 1RM of each week (K-604, prototype 4.4) over the evaluation window, the decision window as a
 * labelled band on its right. The two labels on the left are the lowest and the highest week, at their own heights
 * (chartScale) — real values only. A ring: the same weight for the same reps with more in reserve; the latest week filled.
 * Drawn in the user's unit, from the same numbers the labels write.
 */
export function StrengthChart({ points, from, today, units, move }: Props) {
  const { color } = useTheme();
  const shown = (kg: number) => loadValue(kg, units);
  const scale = chartScale(points, from, today, BOX, shown);
  const [first, last] = [points[0], points[points.length - 1]];
  const spoken = t('strength.spoken', {
    move,
    first: formatLoad(first.kg, units),
    firstDate: shortDate(first.week),
    last: formatLoad(last.kg, units),
    lastDate: shortDate(last.week),
    low: formatLoad(scale.ticks[0].point.kg, units),
    high: formatLoad(scale.ticks[scale.ticks.length - 1].point.kg, units),
  });
  const at = (p: StrengthPoint) => ({ cx: scale.x(p.week), cy: scale.y(shown(p.kg)) });
  const label = { fontFamily: tokens.font.displaySemiBold, fontSize: tokens.type.label, fill: color.muted };

  return (
    <View testID="strength-chart" accessible accessibilityRole="image" accessibilityLabel={spoken} style={{ aspectRatio: WIDTH / HEIGHT }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Rect testID="strength-band" x={scale.bandX} y={0} width={WIDTH - scale.bandX} height={BOX.bottom} fill={color.background} />
        <SvgText
          testID="strength-band-label"
          x={(scale.bandX + WIDTH) / 2}
          y={BAND_LABEL_Y}
          textAnchor="middle"
          {...label}
          fontFamily={tokens.font.displayBold}
          fill={color.accent}>
          {t('strength.band')}
        </SvgText>
        {scale.ticks.map((tick) => (
          <Line key={`grid-${tick.point.week}`} x1={BOX.left} x2={WIDTH} y1={tick.y} y2={tick.y} stroke={color.track} strokeWidth={1} />
        ))}
        <Line x1={BOX.left} x2={WIDTH} y1={BOX.bottom} y2={BOX.bottom} stroke={color.muted} strokeWidth={1} />
        {scale.ticks.map((tick) => (
          <SvgText key={`tick-${tick.point.week}`} testID="strength-tick" x={BOX.left - LABEL_GAP} y={tick.y + 4} textAnchor="end" {...label}>
            {formatLoad(tick.point.kg, units)}
          </SvgText>
        ))}
        <SvgText x={BOX.left} y={DATE_Y} textAnchor="start" {...label}>
          {shortDate(weekOf(from))}
        </SvgText>
        <SvgText x={BOX.right} y={DATE_Y} textAnchor="end" {...label}>
          {shortDate(weekOf(today))}
        </SvgText>
        <Polyline
          points={points.map((p) => `${at(p).cx},${at(p).cy}`).join(' ')}
          fill="none"
          stroke={color.text}
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
        />
        {points.map((p) => (
          // The latest week filled; a ring is drawn over a week that got easier (the latest included: the ring says more).
          <Circle
            key={p.week}
            testID={`strength-point-${p.week}`}
            {...at(p)}
            r={p === last ? RING : DOT}
            fill={p === last ? color.accent : color.text}
          />
        ))}
        {points
          .filter((p) => p.easier)
          .map((p) => (
            <Circle
              key={`ring-${p.week}`}
              testID={`strength-easier-${p.week}`}
              {...at(p)}
              r={RING}
              fill={color.surface}
              stroke={color.accent}
              strokeWidth={LINE_WIDTH}
            />
          ))}
      </Svg>
    </View>
  );
}
