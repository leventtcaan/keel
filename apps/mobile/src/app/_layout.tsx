import { useFonts } from 'expo-font';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/theme';

// Keep the splash up until the heading font is ready, so titles never flash in the fallback face.
void SplashScreen.preventAutoHideAsync();

// Root stack: the tabs, and the coach as a sheet over whichever tab opened it (K-307). The tabs themselves are in
// (tabs)/_layout.tsx; the app opens on the first one, Today.
function AppStack() {
  const { color } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="coach" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts(fontAssets);
  const ready = loaded || error !== null;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (error !== null) {
    // Not fatal: text falls back to the system face. Surfaced in development so a broken asset is noticed.
    console.warn('Heading font failed to load; using the system font.', error.message);
  }
  if (!ready) return null;

  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}
