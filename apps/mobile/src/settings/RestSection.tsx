import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { WordChoice } from '@/components/WordChoice';
import { t } from '@/copy';
import { useAppServices, useRestChoice } from '@/services/ServicesProvider';
import { type RestChoice, type RestKind, clampCustom, recommendedBand } from '@/train/restBand';
import { workoutParams } from '@/train/params';
import { bandText, restText } from '@/train/session';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const MODE_KEYS = { RECOMMENDED: 'settings.rest.recommended', CUSTOM: 'settings.rest.custom' } as const;
const MODES = Object.keys(MODE_KEYS) as (keyof typeof MODE_KEYS)[];
const KINDS: { kind: RestKind; key: string }[] = [
  { kind: 'COMPOUND', key: 'settings.rest.compound' },
  { kind: 'ISOLATION', key: 'settings.rest.isolation' },
];

/** The line a Training row says: the band, or "Your own". */
export function restLine(choice: RestChoice): string {
  const band = recommendedBand();
  return choice.mode === 'RECOMMENDED' ? bandText(band.low, band.high ?? band.low) : t('settings.rest.custom');
}

/**
 * Settings › Training › Rest (K-1214): the recommended band (2-3 min, G1 K-49), or one fixed rest of the user's own for compound
 * and for isolation moves. Kept on the phone like the appearance: it is how this phone's timer behaves, nothing the server
 * or the engine reads.
 */
export function RestSection() {
  const { restPreference } = useAppServices();
  const choice = useRestChoice();
  const { color } = useTheme();
  const band = recommendedBand();
  const step = workoutParams.restAdjustSeconds;
  const recommended = choice.mode === 'RECOMMENDED';
  const save = (next: RestChoice) => void restPreference.set(next);
  const move = (kind: RestKind, by: number) => save({ ...choice, custom: { ...choice.custom, [kind]: clampCustom(choice.custom[kind] + by) } });
  return (
    <View style={styles.section}>
      <WordChoice
        testID="rest-mode"
        options={MODES.map((mode) => ({ value: mode, label: t(MODE_KEYS[mode]) }))}
        value={choice.mode}
        onChange={(mode) => save({ ...choice, mode })}
      />
      {recommended ? (
        <Text style={[styles.note, { color: color.muted }]}>{t('settings.rest.recommendedNote', { band: bandText(band.low, band.high ?? band.low) })}</Text>
      ) : (
        <>
          {KINDS.map(({ kind, key }) => {
            const seconds = choice.custom[kind];
            return (
              <View key={kind} testID={`rest-${kind}`} style={styles.row}>
                <Text style={[styles.label, { color: color.text }]}>{t(key)}</Text>
                <View style={styles.stepper}>
                  <Button label={t('workout.rest.less', { seconds: step })} accessibilityLabel={t('settings.rest.lessLabel', { what: t(key), seconds: step })} variant="secondary" size="touch" disabled={seconds <= workoutParams.restCustomMinSeconds} onPress={() => move(kind, -step)} />
                  <Text accessibilityLiveRegion="polite" style={[styles.value, { color: color.text }]}>{restText(seconds)}</Text>
                  <Button label={t('workout.rest.more', { seconds: step })} accessibilityLabel={t('settings.rest.moreLabel', { what: t(key), seconds: step })} variant="secondary" size="touch" disabled={seconds >= workoutParams.restCustomMaxSeconds} onPress={() => move(kind, step)} />
                </View>
              </View>
            );
          })}
          <Text style={[styles.note, { color: color.muted }]}>{t('settings.rest.customNote')}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space.md },
  note: { marginHorizontal: tokens.space.xs, fontSize: tokens.type.label },
  row: { gap: tokens.space.sm },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  value: { minWidth: 64, textAlign: 'center', fontSize: tokens.type.heading, fontVariant: ['tabular-nums'] },
});
