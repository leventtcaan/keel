import { Stack } from 'expo-router/stack';

import { OnboardingProvider } from '@/onboarding/OnboardingContext';
import { useAppServices, useOnboarding } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';

// The onboarding steps (K-306), one screen each, in the order of the route (src/onboarding/flow.ts; the first, goal, is
// index); the draft they fill is shared through the provider. Going back is the system's own gesture and the frame's back
// button.
export const unstable_settings = { initialRouteName: 'index' };

export default function OnboardingLayout() {
  const { color } = useTheme();
  const { profile } = useAppServices();
  // Resumed after a restart with the plan still to be seen (K-967): the plan is prepared on the profile the server holds.
  const resumed = useOnboarding() === 'resume' ? profile.resumed() : null;
  return (
    <OnboardingProvider resumed={resumed}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }}>
        {/* Off the walk (ADR-069 #3, ADR-072 #8; flow.ts RETIRED_STEPS): the code stays, nothing opens them, a link neither. */}
        <Stack.Protected guard={false}>
          <Stack.Screen name="foods" />
          <Stack.Screen name="photos" />
          <Stack.Screen name="expectations" />
          <Stack.Screen name="apple-health" />
        </Stack.Protected>
      </Stack>
    </OnboardingProvider>
  );
}
