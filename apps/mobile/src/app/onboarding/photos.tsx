import { StyleSheet, Text } from 'react-native';

import { t } from '@/copy';
import { InfoList } from '@/onboarding/InfoList';
import { StepFrame } from '@/onboarding/StepFrame';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

// Progress photos never leave the phone (V1); nothing is asked here — the camera is asked for when the first photo is
// due (photo_interval_weeks, H1 2.5).
export default function PhotosStep() {
  const { color } = useTheme();
  return (
    <StepFrame step="photos" title={t('onboarding.photos.title')}>
      <InfoList prefix="onboarding.photos" items={['local', 'cadence', 'purpose']} />
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.photos.note')}</Text>
    </StepFrame>
  );
}

const styles = StyleSheet.create({ note: { fontSize: tokens.type.bodySmall } });
