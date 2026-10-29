import { StyleSheet } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { Pose } from './library';

/** The outline's drawing space (prototype `.sil`): a standing body, head to feet. */
const BODY = { width: 230, height: 500 };
const DASH = '7 6';

/**
 * Front: head, then the shoulders, arms a little away, waist, hips and legs apart, in smooth curves (a body, not a stick
 * figure; build 7 QA). Side: head, then one profile, chest to the right, back, seat and calf behind.
 */
const SHAPES: Record<Pose, { head: { cx: number; cy: number; r: number }; body: string }> = {
  front: {
    head: { cx: 115, cy: 50, r: 30 },
    body: 'M103 84 C95 92 70 94 58 104 C44 114 40 134 40 152 C40 190 34 220 32 250 C30 272 30 292 32 304 C33 316 46 318 47 306 C49 286 52 262 55 238 C58 210 62 180 66 160 C66 190 70 214 74 236 C72 256 66 276 66 298 C66 340 72 370 76 396 C80 420 80 450 84 470 C84 482 80 490 90 492 L106 492 C110 490 110 482 108 474 C106 446 106 420 106 396 C106 360 110 330 115 318 C120 330 124 360 124 396 C124 420 124 446 122 474 C120 482 120 490 124 492 L140 492 C150 490 146 482 146 470 C150 450 150 420 154 396 C158 370 164 340 164 298 C164 276 158 256 156 236 C160 214 164 190 164 160 C168 180 172 210 175 238 C178 262 181 286 183 306 C184 318 197 316 198 304 C200 292 200 272 198 250 C196 220 190 190 190 152 C190 134 186 114 172 104 C160 94 135 92 127 84 Z',
  },
  side: {
    head: { cx: 113, cy: 50, r: 28 },
    body: 'M106 80 L120 82 C130 96 140 112 140 140 C142 170 138 200 140 228 C142 256 138 284 134 312 C132 350 134 380 132 400 C130 430 128 456 128 474 C140 480 146 488 140 492 L106 492 C100 486 102 470 104 456 C98 430 96 410 100 392 C102 360 96 330 94 300 C88 280 88 252 96 236 C100 214 96 190 94 170 C90 140 92 108 98 92 C100 86 104 82 106 80 Z',
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
  /** Its id under test: the camera's outline by default; the intro draws its own two (K-1055). */
  testID?: string;
};

/**
 * The body outline to stand in (K-1055, prototype §10): a guide, not a mask, so it is decorative for VoiceOver (K-807) — the
 * screen's hint says how to stand. Solid accent when the phone is straight, dashed grey when it is not.
 */
export function Silhouette({ pose, straight, mirrored, testID = 'capture-silhouette' }: Props) {
  const { color } = useTheme();
  const { head, body } = SHAPES[pose];
  const stroke = straight ? color.accent : color.text;
  const flip = pose === 'side' && !mirrored ? `matrix(-1 0 0 1 ${BODY.width} 0)` : undefined;
  return (
    <Svg testID={testID} accessible={false} style={styles.fill} viewBox={`0 0 ${BODY.width} ${BODY.height}`} pointerEvents="none">
      <G
        testID={`${testID}-stroke`}
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
