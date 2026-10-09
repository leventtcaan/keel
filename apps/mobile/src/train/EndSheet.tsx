import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  onFinish: () => void;
  onLater: () => void;
  onDiscard: () => void;
  onBack: () => void;
  problem: string | null;
  problemOccurrence?: unknown;
  busy: boolean;
};

/**
 * End (ADR-075 #5, prototype `#endwo`): finish and save (sets not logged stay unlogged); fill in the rest later (the
 * session stays open and counts for its week, K-961, closed by the server after unfinished_session_close_hours); or
 * discard it, asked once more (nothing is saved; the page offers Undo after).
 */
export function EndSheet({ onFinish, onLater, onDiscard, onBack, problem, problemOccurrence, busy }: Props) {
  const { color } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const choice = (title: string, note: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${note}`}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.choice, { backgroundColor: color.surface }, (pressed || busy) && styles.dim]}>
      <Text style={[styles.title, { color: color.text }]}>{title}</Text>
      <Text style={[styles.note, { color: color.textSecondary }]}>{note}</Text>
    </Pressable>
  );
  const discard = confirming ? (
    <View style={[styles.choice, { backgroundColor: color.surface }]}>
      <Text style={[styles.note, { color: color.text }]}>{t('workout.ending.discardNote')}</Text>
      <View style={styles.row}>
        <Button label={t('workout.ending.confirm')} variant="warn" size="sm" onPress={onDiscard} disabled={busy} />
        <Button label={t('workout.ending.keep')} variant="ghost" size="sm" onPress={() => setConfirming(false)} disabled={busy} />
      </View>
    </View>
  ) : (
    choice(t('workout.ending.discard'), t('workout.ending.discardNote'), () => setConfirming(true))
  );
  return (
    <View testID="end-sheet" style={styles.sheet}>
      <Text style={[styles.heading, { color: color.text }]}>{t('workout.ending.title')}</Text>
      {choice(t('workout.ending.finish'), t('workout.ending.finishNote'), onFinish)}
      {choice(t('workout.ending.later'), t('workout.ending.laterNote'), onLater)}
      {discard}
      {problem === null ? null : (
        <ProblemText style={[styles.note, { color: color.text }]} occurrence={problemOccurrence}>
          {problem}
        </ProblemText>
      )}
      <Button label={t('workout.ending.back')} variant="ghost" onPress={onBack} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: tokens.space.sm },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  choice: { gap: tokens.space.xs, padding: tokens.space.md, borderRadius: tokens.radius.card, minHeight: tokens.size.touch },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  note: { fontSize: tokens.type.bodySmall },
  row: { flexDirection: 'row', gap: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
});
