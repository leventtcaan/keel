import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { ConsentsSection } from './ConsentsSection';
import { HealthWriteSection } from './HealthWriteSection';
import { ImportSection } from './ImportSection';
import { Section } from './Section';

/**
 * Settings › Health and data (K-982, ADR-007, ADR-018): the consents come first, always (they are how the others unlock);
 * the Apple Health write switches and the weigh-in import need the health data consent, so without it they are not
 * offered, and one line says why. The workout file import is a Training row, not here. `onConsentChange` tells the screen
 * when a consent changed, so Food and these unlock or lock at once.
 */
export function HealthGroup({ granted, onConsentChange }: { granted: boolean | null; onConsentChange: () => void }) {
  const { color } = useTheme();
  return (
    <Section title={t('settings.health.title')}>
      <View style={styles.stack}>
        <ConsentsSection onChanged={onConsentChange} />
        {granted === true && <HealthWriteSection />}
        {granted === true && <ImportSection workouts={false} />}
        {granted === false && <Text style={[styles.note, { color: color.muted }]}>{t('settings.health.locked')}</Text>}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.xl },
  note: { fontSize: tokens.type.bodySmall },
});
