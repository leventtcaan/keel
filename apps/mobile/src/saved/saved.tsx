import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { announce } from '@/components/ProblemText';
import { UndoBanner } from '@/components/UndoBanner';
import { t } from '@/copy';
import { tokens } from '@/theme/tokens';

/** What taking a save back came to. */
export type Undone =
  /** Taken back; `said` is told to VoiceOver ("Weigh-in taken back."). */
  | { done: true; said?: string }
  /** Not taken back; `message` says why, and `again` keeps the save open to another try (the connection may come back). */
  | { done: false; message: string; again: boolean };

/** Something was saved and can be taken back for a few seconds. */
export type Save = {
  /** One short line after "Saved" ("80.2 kg"). Already translated. */
  detail?: string;
  /**
   * Takes the save back through the very calls the screen that saved it would make (the delete by id, the held send
   * dropped). Closed over services, never over the screen's state: that screen is gone by now.
   */
  undo: () => Promise<Undone>;
};

type Shown = Save & { id: number };
type Channel = {
  shown: Shown | null;
  publish: (save: Save) => void;
  /** The banner is done (by time or by Undo): only if it is still the one shown, so a late call does not clear a newer save. */
  dismiss: (id: number) => void;
};

// Outside a provider (a screen under test) a save is told to nobody.
const Saved = createContext<Channel>({ shown: null, publish: () => {}, dismiss: () => {} });

/**
 * The app's one "something was saved, here is how to take it back" (ADR-070 Ek 2 #6): a screen that keeps a weigh-in, a
 * cardio session or a meal publishes it as it closes; the banner at the root of the app shows it on whatever screen is
 * visible. One at a time: a second save replaces the first, whose Undo goes with its banner.
 */
export function SavedProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const count = useRef(0);
  const publish = useCallback((save: Save) => setShown({ ...save, id: ++count.current }), []);
  const dismiss = useCallback((id: number) => setShown((now) => (now !== null && now.id === id ? null : now)), []);
  const channel = useMemo(() => ({ shown, publish, dismiss }), [shown, publish, dismiss]);
  return <Saved.Provider value={channel}>{children}</Saved.Provider>;
}

/** The screen's way to say "this was saved, and this takes it back". */
export function useSaved(): (save: Save) => void {
  return useContext(Saved).publish;
}

/**
 * How high above the safe area's bottom edge the "+" ends: the tab bar, the screen's small gap under the button
 * (PlusEntry's place in each tab), and the button's own height. The banner stands above it, not at the tab bar's height,
 * where it would cover the "+" for its whole time (prototype `.bnr.up`, K-1048).
 */
const PLUS_TOP = tokens.size.tabBar + tokens.space.sm + tokens.size.primaryButton;

/**
 * The banner of the last save, over the tab bar and the "+". Mounted once, at the root of the app, so it is the same on
 * every tab and after any sheet closes. Its time is the parameter `undo_banner_ms`; while it is up, Undo is there, and once
 * it is gone the save cannot be taken back from here.
 */
export function SavedBanner() {
  const { shown, publish, dismiss } = useContext(Saved);
  const insets = useContext(SafeAreaInsetsContext);
  if (shown === null) return null;

  const undo = async () => {
    let result: Undone;
    try {
      result = await shown.undo();
    } catch {
      result = { done: false, message: t('undoBanner.failed'), again: true };
    }
    if (result.done) {
      if (result.said !== undefined) announce(result.said);
      return;
    }
    announce(result.message);
    Alert.alert(result.message);
    // Not taken back, but still possible: the banner comes back, with a new time.
    if (result.again) publish({ detail: shown.detail, undo: shown.undo });
  };

  return (
    <UndoBanner
      key={shown.id}
      detail={shown.detail}
      onUndo={() => void undo()}
      onDismiss={() => dismiss(shown.id)}
      bottomOffset={(insets?.bottom ?? 0) + PLUS_TOP + tokens.space.sm}
    />
  );
}
