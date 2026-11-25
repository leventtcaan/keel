/**
 * The rest on the lock screen and in the Dynamic Island (K-1215, ADR-094): a Live Activity that starts with the rest, moves with its
 * -15 / +15, and ends with Ready, a pause or the end of the session. It is local only (no push token, no server): what it
 * carries is the move's name, the next set and the moment the rest ends, which stay on the phone. The clock is the system's, so
 * the app speaks to the activity only when the rest changes, never each second.
 *
 * Like `haptics.ts`, a port that cannot hurt a set: `expo-widgets` is read on first use, inside a try, so a build without
 * the native module (an older development build, Expo Go) still starts (K-1026's lesson: a native module that threw at load
 * crashed the app), and anything the phone refuses is not the user's problem. The activity is only a view of the rest the screen
 * holds from its timestamp: if its buttons are never delivered (the app asleep), the screen is right again when it comes back.
 */
type Widgets = typeof import('expo-widgets');
type Activity = ReturnType<typeof import('./liveRestActivity').restActivity.start>;

/** What the activity shows: all words come from the copy file, the accent from the theme; times are ms since the epoch. */
export type RestLiveProps = {
  /** The move the next set is of. */
  title: string;
  /** "Next: set 3, 80 kg × 8", as the screen says it. */
  next: string;
  /** The compact island's word: "Rest". */
  label: string;
  less: string;
  more: string;
  ready: string;
  accent: string;
  /** The rest began, and ends (the band's low end, moved by -15 / +15); `endsAt` is never before `since`. */
  since: number;
  endsAt: number;
};

/** A press on the activity's buttons. */
export type LivePress = 'less' | 'more' | 'ready';

type Native = { widgets: Widgets; factory: typeof import('./liveRestActivity').restActivity };

let loaded: Native | null | undefined;
let current: Activity | null = null;

/** The native side, read once and only when asked for; null when this build has none. */
function native(): Native | null {
  if (loaded === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const widgets = require('expo-widgets') as Widgets;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const factory = (require('./liveRestActivity') as typeof import('./liveRestActivity')).restActivity;
      loaded = { widgets, factory };
    } catch {
      loaded = null;
    }
  }
  return loaded;
}

const isPress = (target: unknown): target is LivePress => target === 'less' || target === 'more' || target === 'ready';

export const liveRest = {
  /** The rest as it stands now: starts the activity, or moves the one under way. */
  show(props: RestLiveProps): void {
    try {
      const side = native();
      if (side === null) return;
      const shown = { ...props, endsAt: Math.max(props.endsAt, props.since + 1000) };
      if (current !== null) {
        void current.update(shown).catch(() => undefined);
        return;
      }
      // One at a time: whatever an earlier run of the app left on the lock screen goes before this one starts.
      for (const stale of side.factory.getInstances()) void stale.end('immediate').catch(() => undefined);
      current = side.factory.start(shown);
    } catch {
      current = null; // Nothing to show; the rest on the screen is all the same.
    }
  },
  /** The rest is over (Ready, a pause, the session left): the activity goes at once. */
  stop(): void {
    try {
      const side = loaded ?? null;
      const ended = current;
      current = null;
      if (side === null) return;
      if (ended !== null) void ended.end('immediate').catch(() => undefined);
      // A run of the app that was killed may have left one: leaving the session clears those too.
      for (const stale of side.factory.getInstances()) void stale.end('immediate').catch(() => undefined);
    } catch {
      // Nothing to end.
    }
  },
  /** Listens for the activity's buttons while the app can hear them; returns how to stop. Never throws. */
  onPress(listen: (press: LivePress) => void): () => void {
    try {
      const side = native();
      if (side === null) return () => undefined;
      const subscription = side.widgets.addUserInteractionListener((event) => {
        if (isPress(event.target)) listen(event.target);
      });
      return () => {
        try {
          subscription.remove();
        } catch {
          // Already gone.
        }
      };
    } catch {
      return () => undefined;
    }
  },
};
