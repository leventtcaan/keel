import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * A small line of a series, no axes (9c-3, prototype gorsel-yon/y5-e1): the shape of the weight's trend beside its number.
 * The points are the server's (U1), drawn oldest to newest across the box, the newest marked with a dot. It says nothing a
 * screen reader needs: the number and its change beside it are read, so the drawing is hidden from it.
 */
export function TrendLine({ points }: { points: number[] }) {
  const { color } = useTheme();
  if (points.length < 2) return null;
  const { trendWidth: w, trendHeight: h, trendDot: dot } = tokens.size;
  const [low, high] = [Math.min(...points), Math.max(...points)];
  const span = high - low;
  const at = (i: number): [number, number] => {
    const x = dot / 2 + (i * (w - dot)) / (points.length - 1);
    // A flat series sits in the middle; otherwise the highest point at the top, the lowest at the bottom, the dot inside.
    const y = span === 0 ? h / 2 : dot / 2 + ((high - points[i]) * (h - dot)) / span;
    return [x, y];
  };
  const d = points.map((_, i) => `${i === 0 ? 'M' : 'L'}${at(i).join(' ')}`).join(' ');
  const [endX, endY] = at(points.length - 1);
  return (
    <Svg width={w} height={h} accessible={false} importantForAccessibility="no-hide-descendants">
      <Path testID="trend-line" d={d} stroke={color.accent} strokeWidth={tokens.border.outline} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle testID="trend-end" cx={endX} cy={endY} r={dot / 2} fill={color.accent} />
    </Svg>
  );
}
