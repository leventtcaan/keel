import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Failure = null | 'offline' | 'serverError';

/**
 * Signed in, but whether onboarding is done is not known yet (K-306): the first start on this phone, and no answer from
 * the server. Asks on arrival (joining a read already on its way) and again on request; the root layout moves on when
 * the answer comes. No connection and a server error are told apart, and signing out is always a way off this screen.
 */
export default function CheckingScreen() {
  const { profile, signOut } = useAppServices();
  const { color } = useTheme();
  const [failure, setFailure] = useState<Failure>(null);

  const ask = useCallback(
    () =>
      profile
        .refresh()
        .catch((error: unknown) =>
          setFailure(error instanceof Error && error.name === 'NoConnection' ? 'offline' : 'serverError'),
        ),
    [profile],
  );

  useEffect(() => {
    void ask();
  }, [ask]);

  const retry = () => {
    setFailure(null);
    void ask();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t('onboarding.checking.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.muted }]}>
          {failure === null ? t('onboarding.checking.body') : t(`onboarding.checking.${failure}`)}
        </Text>
      </View>
      <View style={styles.bottom}>
        {failure !== null && <Button label={t('onboarding.checking.retry')} onPress={retry} />}
        <Button label={t('onboarding.signOut')} variant="ghost" onPress={() => void signOut()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
