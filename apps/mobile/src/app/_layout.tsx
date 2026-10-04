import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { ServicesProvider, useOnboarding, useSignedIn } from '@/services/ServicesProvider';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/theme';

// Keep the splash up until the heading font is ready and the services have opened (database, keychain), so titles
// never flash in the fallback face and no blank screen shows while the session is read.
void SplashScreen.preventAutoHideAsync();

// A failure while starting (no database, no server address) is shown with a way to try again, not a crash.
export { ErrorBoundary } from 'expo-router';

// The tabs always sit under the coach, even when a link (keel://coach) opens the app straight on it; without an anchor
// the coach would be the only screen, with no tab bar and nothing to go back to.
export const unstable_settings = { anchor: '(tabs)' };

// Root stack: the tabs, and the coach as a sheet over whichever tab opened it (K-307). The tabs themselves are in
// (tabs)/_layout.tsx; the app opens on the first one, Today. Signed out, the only screen is sign-in (K-305): when the
// session ends (sign-out, a refused refresh) the guarded screens leave the history and sign-in takes their place.
// Signed in without a profile, the only screens are onboarding's (K-306); not known yet, the one that asks the server.
function AppStack() {
  const { color } = useTheme();
  const signedIn = useSignedIn();
  const onboarding = useOnboarding();
  // Mounted only once the services are ready (ServicesProvider renders nothing before).
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
      <Stack.Protected guard={signedIn && onboarding === 'done'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="coach" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-photo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipes" />
        <Stack.Screen name="recipe" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout" />
        <Stack.Screen name="workout-summary" />
        <Stack.Screen name="exercise-history" />
        <Stack.Screen name="exercise" />
        <Stack.Screen name="workout-edit" />
        <Stack.Screen name="gyms" />
        <Stack.Screen name="gym" />
        <Stack.Screen name="check-in" />
        <Stack.Screen name="why" />
        <Stack.Screen name="state" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scoff" options={{ presentation: 'modal' }} />
        <Stack.Screen name="projection" />
        <Stack.Screen name="photo-capture" options={{ presentation: 'modal' }} />
        <Stack.Screen name="compare" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarding === 'needed'}>
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

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || error !== null;

  if (error !== null) {
    // Not fatal: text falls back to the system face. Surfaced in development so a broken asset is noticed.
    console.warn('Heading font failed to load; using the system font.', error.message);
  }
  if (!ready) return null;

  return (
    <ThemeProvider>
      <ServicesProvider>
        <AppStack />
      </ServicesProvider>
    </ThemeProvider>
  );
}
