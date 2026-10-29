/**
 * The text a consent is given to, as every screen shows it (K-1032): onboarding, Settings › Health and data, and the gates
 * on weigh-in, meals, recipes and state. One component, so the text a person says yes to is the same wherever it is asked.
 * The health data text is a short list of points (what is kept, what for, how to withdraw); each point is one stop for
 * VoiceOver, read whole, and the bullet is a dot with no words so it is never read. Each point opens with a short heading
 * (K-1062) so the long words can be skimmed; the legal words under it are unchanged. The other consents are one paragraph.
 */
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { has, t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { CONSENT_COPY, type ConsentKind, HEALTH_POINTS } from './consents';

type Props = {
  kind: ConsentKind;
  /** The smaller body size, for a text shown in a box (onboarding's "full text"). */
  small?: boolean;
  /** The box around it, when the screen puts the text on a surface. */
  style?: StyleProp<ViewStyle>;
};

export function ConsentText({ kind, small = false, style }: Props) {
  const { color } = useTheme();
  const base = CONSENT_COPY[kind];
  const size = small ? tokens.type.bodySmall : tokens.type.body;
  if (!has(`${base}.points.${HEALTH_POINTS[0]}`)) {
    return (
      <View style={style}>
        <Text style={{ color: color.textSecondary, fontSize: size }}>{t(`${base}.body`)}</Text>
      </View>
    );
  }
  return (
    <View testID="consent-list" accessibilityRole="list" style={[styles.list, style]}>
      {HEALTH_POINTS.map((point) => {
        const words = t(`${base}.points.${point}`);
        const heading = has(`${base}.headings.${point}`) ? t(`${base}.headings.${point}`) : null;
        const title =
          heading === null ? null : <Text style={[styles.heading, { color: color.text, fontSize: size }]}>{heading}</Text>;
        return (
          <View key={point} testID="consent-point" accessible accessibilityLabel={heading === null ? words : `${heading}. ${words}`} style={styles.point}>
            <View style={[styles.dot, { backgroundColor: color.textSecondary }]} />
            <View style={styles.text}>
              {title}
              <Text style={{ color: color.textSecondary, fontSize: size }}>{words}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.md },
  point: { flexDirection: 'row', gap: tokens.space.md, alignItems: 'flex-start' },
  // A bullet with no words: nothing for VoiceOver to read, the line height centres it on the first line.
  dot: { width: tokens.space.sm, height: tokens.space.sm, borderRadius: tokens.space.sm / 2, marginTop: tokens.space.sm },
  text: { flex: 1, gap: tokens.space.xs },
  heading: { fontWeight: tokens.weight.semibold },
});
