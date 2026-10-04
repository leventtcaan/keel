import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/theme';

/** The figure's own drawing space (prototype 4.5); the body's centre line is x = CENTRE. */
const WIDTH = 120;
const HEIGHT = 240;
const CENTRE = WIDTH / 2;
const SIZE = 150;
const BODY =
  'M60 46 C52 46 30 48 24 56 C21 72 27 98 31 118 C32 128 27 136 27 146 L31 232 L52 232 L57 162 L63 162 L68 232 L89 232 L93 146 C93 136 88 128 89 118 C93 98 99 72 96 56 C90 48 68 46 60 46 Z';
const ARMS = ['M24 58 C16 62 12 90 10 140 L18 142 C20 100 24 80 28 70 Z', 'M96 58 C104 62 108 90 110 140 L102 142 C100 100 96 80 92 70 Z'];

/**
 * A faceless, neutral figure (U12, H2 §4.2): today filled, the projection as a dashed outline of the same figure, wider or
 * narrower by `factor` about its centre line — a shape, never a photo, never a face. The factor is already clamped toward the
 * goal (widthFactor); the head is not scaled.
 */
export function Silhouette({ factor }: { factor: number }) {
  const { color } = useTheme();
  // Scale x about the centre line: x' = CENTRE + factor × (x − CENTRE).
  const toward = `translate(${CENTRE * (1 - factor)} 0) scale(${factor} 1)`;
  return (
    <Svg testID="projection-figure" width={SIZE * (WIDTH / HEIGHT)} height={SIZE} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} accessible={false}>
      <Circle cx={CENTRE} cy={26} r={15} fill={color.line} />
      <Path d={BODY} fill={color.line} />
      {ARMS.map((arm) => (
        <Path key={arm} d={arm} fill={color.line} />
      ))}
      <G transform={toward}>
        <Path d={BODY} fill="none" stroke={color.accent} strokeWidth={2} strokeDasharray="4 3" />
      </G>
    </Svg>
  );
}
