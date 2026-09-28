import { Tabs } from 'expo-router/js-tabs';

import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

// Main navigation: Today is the first tab and the screen the app opens on (Levent, 29 Sep; ADR-006).
export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.accent,
        tabBarInactiveTintColor: tokens.color.muted,
        tabBarStyle: { backgroundColor: tokens.color.background, borderTopColor: tokens.color.line },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="train" options={{ title: t('tabs.train') }} />
      <Tabs.Screen name="food" options={{ title: t('tabs.food') }} />
      <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
    </Tabs>
  );
}
