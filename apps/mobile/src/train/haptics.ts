/**
 * The app's haptics, as a port (ADR-075 Ek 5). `setDone()` is the light tick of a set kept (Evre 7 C2, ADR-090 Ek 7); `record()` is
 * felt when a workout ends with a record (ADR-075 #7). Both are `expo-haptics` (SDK 57 module, no data, nothing leaves the phone).
 * iOS plays them only when the phone's own System Haptics setting is on (Settings › Sounds & Haptics), so the user's choice is the
 * system's; the app has no switch of its own. A phone whose build does not have the native module yet (an older development build)
 * or a refusal simply feels nothing: a missing tick never costs a logged set. The screens call the port, the tests check the call.
 */
type Haptics = typeof import('expo-haptics');

let module: Haptics | null | undefined;

/** The native module, read once and only when a haptic is asked for; null when this build has none. */
function native(): Haptics | null {
  if (module === undefined) {
    try {
      // Read on first use so a build without the native module still starts (an import at the top would throw at load).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      module = require('expo-haptics') as Haptics;
    } catch {
      module = null;
    }
  }
  return module;
}

/** Plays one haptic; whatever goes wrong (no module, the phone refuses) is not the user's problem. */
function play(feel: (haptics: Haptics) => Promise<void>): void {
  try {
    const haptics = native();
    if (haptics !== null) void feel(haptics).catch(() => undefined);
  } catch {
    // Nothing to feel; the set is logged all the same.
  }
}

export const haptics = {
  /** A set logged (Evre 7 C2, the check of a Hevy-like row): a light tick. */
  setDone(): void {
    play((h) => h.impactAsync(h.ImpactFeedbackStyle.Light));
  },
  /** A record at the end of a workout (ADR-075 Ek 5): the success notification. */
  record(): void {
    play((h) => h.notificationAsync(h.NotificationFeedbackType.Success));
  },
};
