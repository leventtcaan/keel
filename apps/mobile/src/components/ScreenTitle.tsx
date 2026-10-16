import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/**
 * The screen's heading; one of the two places uppercase is allowed (ADR-016). `accent` is a second line in the accent colour (the
 * paywall's "for 2 weeks"); `label` is what a screen reader says of both lines together.
 */
export function ScreenTitle({ children, accent, label }: { children: string; accent?: string; label?: string }) {
  const { color } = useTheme();
  return (
    <Text accessibilityRole="header" accessibilityLabel={label} style={[styles.title, { color: color.text }]}>
      {children}
      {accent !== undefined && (
        <>
          {'\n'}
          <Text style={{ color: color.accent }}>{accent}</Text>
        </>
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: tokens.font.display, fontSize: tokens.type.screenTitle, textTransform: 'uppercase' },
});
