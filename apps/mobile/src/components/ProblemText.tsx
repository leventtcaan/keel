/**
 * VoiceOver hears only what it is on (K-815, docs/yasal/app-store-beyanlari.md › 3): a line that shows up after a tap — a save
 * that failed, the coach's answer — would go unheard. `announce` says it; `ProblemText` is a problem's line that says itself
 * when it appears, when its words change, and when a new `occurrence` of it is shown: the same failure twice is said twice.
 * React does not draw the same words set again, so a screen keeping words uses `useProblem` (each set a new occurrence); one
 * keeping an object passes the object.
 * iOS drops an announcement when VoiceOver is off.
 */
import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

export function announce(words: string): void {
  if (words.trim() !== '') AccessibilityInfo.announceForAccessibility(words);
}

type Props = Omit<ComponentProps<typeof Text>, 'children'> & { children: string; occurrence?: unknown };

export function ProblemText({ children, occurrence, ...props }: Props) {
  useEffect(() => announce(children), [children, occurrence]);
  return <Text {...props}>{children}</Text>;
}

/** A problem's words and which showing of them this is: `[words, set, occurrence]`; set(null) clears. */
export function useProblem(): [string | null, (words: string | null) => void, number] {
  const [shown, setShown] = useState<{ words: string; occurrence: number } | null>(null);
  const count = useRef(0);
  const set = useCallback((words: string | null) => setShown(words === null ? null : { words, occurrence: ++count.current }), []);
  return [shown?.words ?? null, set, shown?.occurrence ?? 0];
}
