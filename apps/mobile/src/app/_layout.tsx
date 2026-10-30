import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { type ComponentProps, type ReactNode, useEffect } from 'react';
import { Appearance, StyleSheet, View } from 'react-native';

import { GuideProvider } from '@/guide/GuideProvider';
import { previousScreenName, pushedScreen } from '@/navigation/pushed';
import { SavedBanner, SavedProvider } from '@/saved/saved';
import { ProgramChangesListener } from '@/train/ProgramChangesListener';
import { ServicesProvider, useAppServices, useAppearance, useOnboarding, useSignedIn, useSubscriptionGate } from '@/services/ServicesProvider';
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
type ScreenOptions = ComponentProps<typeof Stack.Screen>['options'];
type PushedOptions = Extract<ScreenOptions, (...args: never[]) => unknown>;

function AppStack() {
  const { color } = useTheme();
  const signedIn = useSignedIn();
  const onboarding = useOnboarding();
  const gate = useSubscriptionGate();
  // A pushed screen has the system header with its back button, named for the screen before it (ADR-070 Ek 2 #4).
  const pushed: PushedOptions = ({ route, navigation }) => pushedScreen(color, previousScreenName(navigation.getState(), route.key));
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
        <Stack.Screen name="add-day" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }} />
        <Stack.Screen name="swap" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-program" options={pushed} />
        <Stack.Screen name="build-program" options={pushed} />
        <Stack.Screen name="settings" options={pushed} />
        <Stack.Screen name="settings-detail" options={pushed} />
        <Stack.Screen name="weigh-in" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food" options={pushed} />
        <Stack.Screen name="meal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cardio" options={{ presentation: 'modal' }} />
        <Stack.Screen name="workout" />
        <Stack.Screen name="workout-end" />
        <Stack.Screen name="exercise-history" options={pushed} />
        <Stack.Screen name="exercise" options={pushed} />
        <Stack.Screen name="workout-edit" />
        <Stack.Screen name="check-in" options={pushed} />
        <Stack.Screen name="call" options={pushed} />
        <Stack.Screen name="state" options={pushed} />
        {/* Coming back after a gap (K-981): over the tabs, answered rather than swiped away. */}
        <Stack.Screen name="return" options={{ gestureEnabled: false }} />
        {/* Full screen (K-1055): the camera and its controls are the whole screen; Close is a button, not a swipe down. */}
        <Stack.Screen name="photo-capture" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="compare" />
        <Stack.Screen name="share" options={pushed} />
        <Stack.Screen name="import" options={pushed} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      {/* Taken off the surface (ADR-069 #3, navigation/tabs RETIRED): the code stays, nothing opens them, a link neither. */}
      <Stack.Protected guard={false}>
        <Stack.Screen name="coach" options={{ presentation: 'modal' }} />
        <Stack.Screen name="meal-photo" options={{ presentation: 'modal' }} />
        <Stack.Screen name="recipes" />
        <Stack.Screen name="recipe" options={{ presentation: 'modal' }} />
        <Stack.Screen name="why" />
        <Stack.Screen name="scoff" options={{ presentation: 'modal' }} />
        <Stack.Screen name="projection" />
        <Stack.Screen name="ledger" />
        <Stack.Screen name="what-if" />
        {/* The effort summary (K-406) gave way to the workout's end (K-974, ADR-075 #7). */}
        <Stack.Screen name="workout-summary" />
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

/** The first-use guide (K-1065) is held above the stack, so Settings can ask for it and This week, under it, draws it. */
function GuideHost({ children }: { children: ReactNode }) {
  const { guide } = useAppServices();
  return <GuideProvider mark={guide}>{children}</GuideProvider>;
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
          {/* The one confirmation of a save (weigh-in, cardio, meal) lives over the whole app, so it is on any tab. */}
          <SavedProvider>
            <GuideHost>
              <View style={styles.root}>
                <AppStack />
                <ProgramChangesListener />
                <SavedBanner />
              </View>
            </GuideHost>
          </SavedProvider>
        </ChosenTheme>
      </ServicesProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
