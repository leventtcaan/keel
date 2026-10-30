/**
 * The step every gate shows when the health data consent is missing (Evre 7 final pass, issue 684): weigh-in, meals, pause. A
 * title if the screen has none of its own, ONE line of what saying yes unlocks, and the two choices in a dock under the
 * scroll, inside the safe area, so they never clip. The legal words are the same ConsentText, one tap away behind "Read the
 * full text" (U/V rules: the text a person says yes to stays reachable, whole, wherever it is asked).
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { ConsentText } from './ConsentText';

type Props = {
  /** A heading, when the screen has no title of its own. */
  title?: string;
  /** The one line: what saying yes unlocks. Already translated. */
  why: string;
  allow: string;
  notNow: string;
  onAllow: () => void;
  onNotNow: () => void;
  busy: boolean;
  /** What went wrong recording the choice, already translated; `occurrence` makes the same failure said twice. */
  problem: string | null;
  occurrence?: number;
};

export function ConsentStep({ title, why, allow, notNow, onAllow, onNotNow, busy, problem, occurrence }: Props) {
  const { color } = useTheme();
  const [reading, setReading] = useState(false);
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
        {title}
      </Text>
    );
  const text = reading ? <ConsentText kind="HEALTH_DATA" small style={[styles.full, { backgroundColor: color.surface }]} /> : null;
  return (
    <View style={styles.fill}>
      <ScrollView testID="consent-scroll" contentContainerStyle={styles.body}>
        {heading}
        <Text style={[styles.why, { color: color.textSecondary }]}>{why}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: reading }} onPress={() => setReading((was) => !was)} style={styles.link}>
          <Text style={[styles.linkText, { color: color.accent }]}>{t('consent.step.fullText')}</Text>
        </Pressable>
        {text}
        {problem !== null && (
          <ProblemText style={[styles.why, { color: color.text }]} occurrence={occurrence}>
            {problem}
          </ProblemText>
        )}
      </ScrollView>
      <View testID="consent-dock" style={styles.dock}>
        <Button label={allow} onPress={onAllow} disabled={busy} />
        <Button label={notNow} variant="text" onPress={onNotNow} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingVertical: tokens.space.sm, gap: tokens.space.md },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  why: { fontSize: tokens.type.body },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
  linkText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  full: { padding: tokens.space.md, borderRadius: tokens.radius.option },
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm, gap: tokens.space.xs },
});
