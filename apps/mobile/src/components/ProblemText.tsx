/**
 * VoiceOver hears only what it is on (K-815, docs/yasal/app-store-beyanlari.md › 3): a line that shows up after a tap — a save
 * that failed, the coach's answer — would go unheard. `announce` says it; `ProblemText` is a problem's line that says itself
 * when it appears and again when its words change (a screen that clears its problem before trying again says a repeat too).
 * iOS drops an announcement when VoiceOver is off.
 */
import { type ComponentProps, useEffect } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

export function announce(words: string): void {
  if (words.trim() !== '') AccessibilityInfo.announceForAccessibility(words);
}

export function ProblemText({ children, ...props }: Omit<ComponentProps<typeof Text>, 'children'> & { children: string }) {
  useEffect(() => announce(children), [children]);
  return <Text {...props}>{children}</Text>;
}
