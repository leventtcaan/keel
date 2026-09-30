import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The screen's heading; one of the two places uppercase is allowed (ADR-016). */
export function ScreenTitle({ children }: { children: string }) {
  const { color } = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: tokens.font.display, fontSize: tokens.type.screenTitle, textTransform: 'uppercase' },
});
