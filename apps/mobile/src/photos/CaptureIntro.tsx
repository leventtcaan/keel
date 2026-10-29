import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Segmented } from '@/components/Segmented';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { IconName } from './CameraChrome';
import { photoParams } from './params';

/** How the photos will be taken: the phone on a stand (a timer, the front camera) or in someone's hands. */
export type Setup = 'stand' | 'hand';

const TIPS: { icon: IconName; key: 'light' | 'clothes' | 'phone' }[] = [
  { icon: 'sun.max', key: 'light' },
  { icon: 'figure.stand', key: 'clothes' },
  { icon: 'iphone', key: 'phone' },
];

type Props = { setup: Setup; onSetup: (setup: Setup) => void; onStart: () => void; onClose: () => void };

/**
 * The first set's start (K-1055, prototype §10 frame 1): how to stand and hold the phone, and the one choice that sets the
 * camera and the timer to begin with. Shown only until there is a photo on the phone; after that the camera opens at once.
 */
export function CaptureIntro({ setup, onSetup, onStart, onClose }: Props) {
  const { color } = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('capture.intro.title')}</ScreenTitle>
        {TIPS.map(({ icon, key }) => (
          <View key={key} style={styles.tip}>
            <Icon name={icon} tone="accent" />
            <Text style={[styles.text, styles.tipText, { color: color.text }]}>{t(`capture.intro.${key}`)}</Text>
          </View>
        ))}
        <Segmented
          testID="capture-setup"
          options={[
            { value: 'stand', label: t('capture.intro.stand', { seconds: photoParams.timerSeconds }) },
            { value: 'hand', label: t('capture.intro.hand') },
          ]}
          value={setup}
          onChange={onSetup}
        />
        <Text style={[styles.small, { color: color.muted }]}>{t('capture.intro.note')}</Text>
      </ScrollView>
      <View style={styles.buttons}>
        <Button label={t('capture.intro.start')} onPress={onStart} />
        <Button label={t('capture.close')} variant="text" onPress={onClose} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.xl, gap: tokens.space.lg },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space.md },
  tipText: { flex: 1 },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  buttons: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md, gap: tokens.space.sm },
});
