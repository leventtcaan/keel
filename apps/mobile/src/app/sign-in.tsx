import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import type { SignInResult } from '@/session/appleSignIn';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

function message(result: SignInResult | null): string | null {
  if (result === null || result.kind !== 'failed') return null; // closing the Apple sheet is not an error
  return t(result.reason === 'NO_ANSWER' ? 'signIn.offline' : 'signIn.failed');
}

/**
 * Sign in with Apple, the only way in (ADR-011). What happens after is the root layout's: once signed in, its guard
 * swaps this screen for the tabs (K-305); a new account goes to onboarding in K-306.
 */
export default function SignInScreen() {
  const { signInWithApple, appleAvailable } = useAppServices();
  const { scheme, color } = useTheme();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [result, setResult] = useState<SignInResult | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    appleAvailable()
      .then((yes) => live && setAvailable(yes))
      .catch(() => live && setAvailable(false));
    return () => {
      live = false;
    };
  }, [appleAvailable]);

  async function signIn() {
    if (busy.current) return;
    busy.current = true;
    setResult(null);
    try {
      setResult(await signInWithApple());
    } finally {
      busy.current = false;
    }
  }

  const note = message(result);
  // Apple's rule: a black button on a light screen, a white one on a dark screen.
  const appleStyle = scheme === 'dark' ? AppleAuthenticationButtonStyle.WHITE : AppleAuthenticationButtonStyle.BLACK;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ScreenTitle>{t('app.name')}</ScreenTitle>
        <Text style={[styles.text, { color: color.muted }]}>{t('signIn.note')}</Text>
      </View>
      <View style={styles.bottom}>
        {note !== null && <Text style={[styles.text, { color: color.text }]}>{note}</Text>}
        {available === false && <Text style={[styles.text, { color: color.text }]}>{t('signIn.unavailable')}</Text>}
        {available === true && (
          <AppleAuthenticationButton
            buttonType={AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={appleStyle}
            cornerRadius={tokens.radius.button}
            style={styles.button}
            onPress={signIn}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.sm },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  button: { height: tokens.size.control, width: '100%' },
});
