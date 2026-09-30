import { Stack } from 'expo-router/stack';

import { OnboardingProvider } from '@/onboarding/OnboardingContext';
import { useTheme } from '@/theme/theme';

// The onboarding steps (K-306), one screen each, in the order of STEPS (src/onboarding/draft.ts; the first, goal, is
// index); the draft they fill is
// shared through the provider. Going back is the system's own gesture and the frame's back button.
export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  const { color } = useTheme();
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }} />
    </OnboardingProvider>
  );
}
