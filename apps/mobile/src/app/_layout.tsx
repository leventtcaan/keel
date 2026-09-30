import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router/js-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { t } from '@/copy';
import { fontAssets } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/theme';

// Keep the splash up until the heading font is ready, so titles never flash in the fallback face.
void SplashScreen.preventAutoHideAsync();

// Main navigation: Today is the first tab and the screen the app opens on (Levent, 29 Sep; ADR-006).
function AppTabs() {
  const { color } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.background },
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: { backgroundColor: color.background, borderTopColor: color.line },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="train" options={{ title: t('tabs.train') }} />
      <Tabs.Screen name="food" options={{ title: t('tabs.food') }} />
      <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
    </Tabs>
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
      <AppTabs />
    </ThemeProvider>
  );
}
