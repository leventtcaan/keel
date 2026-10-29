import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Pose } from './library';

/** The outline's drawing space (prototype `.sil`): a standing body, head to feet. */
const BODY = { width: 230, height: 500 };
const DASH = '7 6';

/** Front: head, then shoulders, arms a little away, legs apart. Side: head, then one profile, chest to the right. */
const SHAPES: Record<Pose, { head: { cx: number; cy: number; r: number }; body: string }> = {
  front: {
    head: { cx: 115, cy: 48, r: 32 },
    body: 'M78 92 Q115 104 152 92 L190 120 Q200 200 196 262 L178 266 L168 168 L164 300 L160 476 L126 476 L118 318 L112 318 L104 476 L70 476 L66 300 L62 168 L52 266 L34 262 Q30 200 40 120 Z',
  },
  side: {
    head: { cx: 112, cy: 48, r: 30 },
    body: 'M100 84 Q122 92 130 104 Q142 150 136 200 Q146 250 134 300 L136 476 L104 476 L100 320 Q92 260 96 210 Q86 150 94 104 Z',
  },
};

type Props = {
  pose: Pose;
  /** The phone is straight: the outline is solid and in the accent. Otherwise it is dashed and grey, and nothing is blocked. */
  straight: boolean;
  /**
   * Which way the side profile faces. The front camera's picture is mirrored, so someone who turns to their right faces the
   * right of the screen; through the back camera they face its left.
   */
  mirrored: boolean;
};

/**
 * The body outline to stand in (K-1055, prototype §10): a guide, not a mask, so it is decorative for VoiceOver (K-807) — the
 * screen's hint says how to stand. Solid accent when the phone is straight, dashed grey when it is not.
 */
export function Silhouette({ pose, straight, mirrored }: Props) {
  const { color } = useTheme();
  const { head, body } = SHAPES[pose];
  const stroke = straight ? color.accent : color.text;
  const flip = pose === 'side' && !mirrored ? `matrix(-1 0 0 1 ${BODY.width} 0)` : undefined;
  return (
    <Svg testID="capture-silhouette" accessible={false} style={styles.fill} viewBox={`0 0 ${BODY.width} ${BODY.height}`} pointerEvents="none">
      <G
        testID="capture-silhouette-stroke"
        transform={flip}
        fill="none"
        stroke={stroke}
        strokeOpacity={straight ? 1 : tokens.opacity.silhouette}
        strokeDasharray={straight ? undefined : DASH}
        strokeWidth={tokens.border.silhouette}
        strokeLinejoin="round">
        <Circle {...head} />
        <Path d={body} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
