import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/copy';
import { TABS } from '@/navigation/tabs';
import { useTheme } from '@/theme/theme';

/**
 * The tab bar is the system layer (ADR-016): native tabs — Liquid Glass on iOS 26, the standard bar before — with the
 * system background. The brand colour appears only on the selected tab.
 */
export default function TabsLayout() {
  const { color } = useTheme();
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
