import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * Signed in, but whether onboarding is done is not known yet (K-306): the first start on this phone, and no answer from
 * the server. Asks once on arrival and again on request; the root layout moves on when the answer comes.
 */
export default function CheckingScreen() {
  const { profile } = useAppServices();
  const { color } = useTheme();
  const [failed, setFailed] = useState(false);

  const ask = useCallback(() => profile.refresh().catch(() => setFailed(true)), [profile]);

  useEffect(() => {
    void ask();
  }, [ask]);

  const retry = () => {
    setFailed(false);
    void ask();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t('onboarding.checking.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.muted }]}>
          {failed ? t('onboarding.checking.offline') : t('onboarding.checking.body')}
        </Text>
      </View>
      {failed && (
        <View style={styles.bottom}>
          <Button label={t('onboarding.checking.retry')} onPress={retry} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
  text: { fontSize: tokens.type.body },
});
