import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  children?: ReactNode;
  /** Outlined card on the page background instead of a filled surface (prototype `.card.outline`). */
  outline?: boolean;
  testID?: string;
};

export function Card({ children, outline = false, testID }: Props) {
  const { color } = useTheme();
  const fill = outline
    ? { backgroundColor: color.background, borderColor: color.text, borderWidth: tokens.border.outline }
    : { backgroundColor: color.surface };
  return (
    <View testID={testID} style={[styles.card, fill]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
});
