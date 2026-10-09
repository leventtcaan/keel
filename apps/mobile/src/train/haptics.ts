/**
 * The app's haptics, as a port (ADR-075 Ek 5). `record()` is felt when a workout ends with a record, and only then
 * (ADR-075 #7: no other buzz). For now it does nothing: the real one is `expo-haptics`, joined in Part 4's native build
 * with K-976's `react-native-share`, so the development build in use stays as it is. The screens call the port, the
 * tests check the call; swapping the body in is the whole change then.
 */
export const haptics = {
  record(): void {
    // Part 4: Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) (expo-haptics, ADR-075 Ek 5).
  },
};
