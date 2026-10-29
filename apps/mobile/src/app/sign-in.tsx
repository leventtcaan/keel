import {
  AppleAuthenticationButton,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationButtonType,
} from 'expo-apple-authentication';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { ExampleCalls } from '@/onboarding/ExampleCalls';
import type { SignInResult } from '@/session/appleSignIn';
import { useAppServices } from '@/services/ServicesProvider';
import { configuredLegalLinks } from '@/subscription/links';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

function message(result: SignInResult | null): string | null {
  if (result === null || result.kind !== 'failed') return null; // closing the Apple sheet is not an error
  return t(result.reason === 'NO_ANSWER' ? 'signIn.offline' : 'signIn.failed');
}

/**
 * #welcome, and Sign in with Apple, the only way in (ADR-011). Under the button, "18+ · Terms · Privacy" (prototype): the age,
 * and the two documents as links to the addresses the paywall links to (subscription/links.ts); one the build does not
 * have is left out, never a dead link. The account comes first because the starting call is the
 * engine's, on the server (ADR-072 #2); nothing personal is asked here. What happens after is the root layout's: once
 * signed in, its guard swaps this screen for onboarding or the tabs (K-305, K-306).
 */
export default function SignInScreen() {
  const { signInWithApple, appleAvailable, report } = useAppServices();
  const { scheme, color } = useTheme();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [result, setResult] = useState<SignInResult | null>(null);
  const [links] = useState(configuredLegalLinks);
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
  const documents = [
    { key: 'subscription.terms', label: t('welcome.legal.terms') },
    { key: 'subscription.privacy', label: t('welcome.legal.privacy') },
  ].flatMap(({ key, label }) => links.filter((link) => link.key === key).map((link) => ({ label, url: link.url })));
  // Apple's rule: a black button on a light screen, a white one on a dark screen.
  const appleStyle = scheme === 'dark' ? AppleAuthenticationButtonStyle.WHITE : AppleAuthenticationButtonStyle.BLACK;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.mark, { color: color.text }]}>{t('app.name')}</Text>
        <ExampleCalls />
        <ScreenTitle>{t('welcome.headline')}</ScreenTitle>
        <Text style={[styles.lead, { color: color.textSecondary }]}>{t('welcome.lead')}</Text>
      </ScrollView>
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
        <View style={styles.legal}>
          <Text style={[styles.fine, { color: color.muted }]}>{t('welcome.legal.age')}</Text>
          {documents.map(({ label, url }) => (
            <Fragment key={label}>
              <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.fine, { color: color.muted }]}>
                {t('welcome.legal.dot')}
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={label}
                onPress={() => void Linking.openURL(url).catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }))}
                hitSlop={tokens.space.sm}
                style={styles.link}>
                <Text style={[styles.fine, styles.underline, { color: color.muted }]}>{label}</Text>
              </Pressable>
            </Fragment>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: tokens.space.lg, paddingTop: tokens.space.md, gap: tokens.space.md },
  mark: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle },
  lead: { fontSize: tokens.type.body },
  bottom: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
  button: { height: tokens.size.primaryButton, width: '100%' },
  legal: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: tokens.space.sm },
  fine: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  underline: { textDecorationLine: 'underline' },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
});
