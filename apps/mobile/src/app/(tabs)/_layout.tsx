import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/copy';
import { TABS } from '@/navigation/tabs';
import { useReturnPrompt } from '@/return/useReturnPrompt';
import { useTheme } from '@/theme/theme';

/**
 * The tab bar is the system layer (ADR-016): native tabs — Liquid Glass on iOS 26, the standard bar before — with the
 * system background. The brand colour appears only on the selected tab. The tabs are up only for someone signed in, onboarded
 * and past the gate, so this is where the app, on opening, asks the server whether to ask about coming back (K-981).
 */
export default function TabsLayout() {
  const { color } = useTheme();
  useReturnPrompt();
  return (
    <NativeTabs tintColor={color.accent}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{t(tab.titleKey)}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
