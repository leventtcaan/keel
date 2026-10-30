/**
 * The app's haptics, as a port (ADR-075 Ek 5). `record()` is felt when a workout ends with a record (ADR-075 #7); `setDone()`, the light tick of a set kept (Evre 7 C2, ADR-090 Ek 7). For now it does nothing: the real one is `expo-haptics`, joined in Part 4's native build
 * with K-976's `react-native-share`, so the development build in use stays as it is. The screens call the port, the
 * tests check the call; swapping the body in is the whole change then.
 */
export const haptics = {
  /** A set logged (Evre 7 C2, the check of a Hevy-like row): a light tick. Nothing yet, as `record` (the same native step). */
  setDone(): void {
    // Part 4: Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) (expo-haptics).
  },
  record(): void {
    // Part 4: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) (expo-haptics, ADR-075 Ek 5).
  },
};
