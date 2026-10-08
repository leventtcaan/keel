import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';
import { Appearance } from 'react-native';

import { ServicesProvider, useAppearance, useOnboarding, useSignedIn, useSubscriptionGate } from '@/services/ServicesProvider';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/theme';

// Keep the splash up until the heading font is ready and the services have opened (database, keychain), so titles
// never flash in the fallback face and no blank screen shows while the session is read.
void SplashScreen.preventAutoHideAsync();

// A failure while starting (no database, no server address) is shown with a way to try again, not a crash.
export { ErrorBoundary } from 'expo-router';

// The tabs always sit under a screen a link opens straight (keel://settings); without an anchor it would be the only
// screen, with no tab bar and nothing to go back to.
export const unstable_settings = { anchor: '(tabs)' };

// Root stack: the tabs, and the "+" sheet over whichever tab opened it (K-953). The tabs themselves are in
// (tabs)/_layout.tsx; the app opens on the first one, This week. Signed out, the only screen is sign-in (K-305): when the
// session ends (sign-out, a refused refresh) the guarded screens leave the history and sign-in takes their place.
// Signed in without a profile, the only screens are onboarding's (K-306); not known yet, the one that asks the server.
// Onboarded but never subscribed, the only screen is the gate (K-706, ADR-058 › 107); not known yet, the gate asks.
function AppStack() {
  const { color } = useTheme();
  const signedIn = useSignedIn();
  const onboarding = useOnboarding();
  const gate = useSubscriptionGate();
  // Mounted only once the services are ready (ServicesProvider renders nothing before).
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
      <Stack.Protected guard={signedIn && onboarding === 'done' && gate === 'open'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plus" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }} />
        <Stack.Screen name="today-change" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }} />
        <Stack.Screen name="swap" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-program" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout" />
        <Stack.Screen name="workout-summary" />
        <Stack.Screen name="exercise-history" />
        <Stack.Screen name="exercise" />
        <Stack.Screen name="workout-edit" />
        <Stack.Screen name="gyms" />
        <Stack.Screen name="gym" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="state" options={{ presentation: 'modal' }} />
        <Stack.Screen name="photo-capture" options={{ presentation: 'modal' }} />
        <Stack.Screen name="compare" />
        <Stack.Screen name="share" />
        <Stack.Screen name="import" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      {/* Taken off the surface (ADR-069 #3, navigation/tabs RETIRED): the code stays, nothing opens them, a link neither. */}
      <Stack.Protected guard={false}>
        <Stack.Screen name="food" />
        <Stack.Screen name="coach" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-photo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipes" />
        <Stack.Screen name="recipe" options={{ presentation: 'modal' }} />
        <Stack.Screen name="why" />
        <Stack.Screen name="scoff" options={{ presentation: 'modal' }} />
        <Stack.Screen name="projection" />
        <Stack.Screen name="ledger" />
        <Stack.Screen name="what-if" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarding === 'done' && gate !== 'open'}>
        <Stack.Screen name="subscribe" />
      </Stack.Protected>
      {/* Not finished, or finished up to the plan before the app was closed (K-967: resumed on the plan). */}
      <Stack.Protected guard={signedIn && (onboarding === 'needed' || onboarding === 'resume')}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarding === 'unknown'}>
        <Stack.Screen name="checking" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * The person's appearance choice, once the services can read it (ADR-070 #3). iOS is told the same, so its own parts
 * (status bar, tab bar, sheets, keyboard) match the page; 'unspecified' lets it follow the phone again.
 */
function ChosenTheme({ children }: { children: ReactNode }) {
  const appearance = useAppearance();
  useEffect(() => {
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [appearance]);
  return <ThemeProvider appearance={appearance}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || error !== null;

  if (error !== null) {
    // Not fatal: text falls back to the system face. Surfaced in development so a broken asset is noticed.
    console.warn('Heading font failed to load; using the system font.', error.message);
  }
  if (!ready) return null;

  // The outer theme (Light, the default) serves what shows before the services open: the start-up error screen.
  return (
    <ThemeProvider>
      <ServicesProvider>
        <ChosenTheme>
          <AppStack />
        </ChosenTheme>
      </ServicesProvider>
    </ThemeProvider>
  );
}
