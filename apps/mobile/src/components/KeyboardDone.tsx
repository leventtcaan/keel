/**
 * The "Done" bar over a number pad (K-1065): a number or decimal pad has no Return key, so iOS apps put a bar with Done above it
 * (Notes, Health, Reminders do). A field names the bar with `inputAccessoryViewID` and draws the bar beside its input; the bar
 * only closes the keyboard. Where there is no such bar (not iOS) nothing is drawn.
 */
import { type ReactNode, useId } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, type TextInputProps, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

const NUMERIC: TextInputProps['keyboardType'][] = ['number-pad', 'decimal-pad', 'numeric', 'phone-pad'];

/** Whether the keyboard asked for has no Return key of its own. */
export const isNumberPad = (keyboardType: TextInputProps['keyboardType']): boolean => NUMERIC.includes(keyboardType);

/** The id a field gives its input as `inputAccessoryViewID`, and the bar to draw next to it; none off iOS or for a keyboard with Return. */
export function useDoneBar(needed: boolean): { id: string | undefined; bar: ReactNode } {
  const id = `keel-done-${useId()}`;
  if (!needed || Platform.OS !== 'ios') return { id: undefined, bar: null };
  return { id, bar: <DoneBar id={id} /> };
}

function DoneBar({ id }: { id: string }) {
  const { color } = useTheme();
  return (
    <InputAccessoryView nativeID={id}>
      <View style={[styles.bar, { backgroundColor: color.surface, borderTopColor: color.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('keyboard.hide')}
          onPress={() => Keyboard.dismiss()}
          hitSlop={tokens.space.sm}
          style={({ pressed }) => [styles.done, pressed && styles.dim]}>
          <Text style={[styles.label, { color: color.accent }]}>{t('keyboard.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
    borderTopWidth: tokens.border.hairline,
  },
  done: { minHeight: tokens.size.touch, justifyContent: 'center', paddingHorizontal: tokens.space.sm },
  dim: { opacity: tokens.opacity.dim },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
});
