import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated; what a screen reader calls the field. */
  label: string;
  /** What the empty box says ("Search foods"). */
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  /** The keyboard's Search key. */
  onSearch: () => void;
  /** What the last search found, one short line under the field (searching, nothing found); absent: nothing. */
  hint?: string;
  maxLength?: number;
  /** Reads a barcode: the barcode icon at the end of the box while it is empty. Absent: none. */
  onScan?: () => void;
  autoFocus?: boolean;
};

/**
 * The food search (Evre 7 A): a large rounded field, filled rather than outlined, as iOS draws its own search: a magnifying glass, the
 * words, and at the end one icon button that is the barcode while the box is empty and a clear (x) once it holds words. The glass is
 * drawn, not read: the label names the field. It searches as the user types (ADR-085), so there is no Search button.
 */
export function SearchField({ label, placeholder, value, onChangeText, onSearch, hint, maxLength, onScan, autoFocus = false }: Props) {
  const { color } = useTheme();
  // The words are the field's own while it holds any (K-1052): a value sent back on every key raced the keys and dropped
  // letters typed fast (14 typed, 1 kept). Only an empty value is sent, so the screen can still empty the box (a food
  // picked, the search cleared); the field reports each change as before.
  const held = value === '' ? { value } : {};
  const end =
    value !== '' ? (
      <Pressable testID="search-clear" accessibilityRole="button" accessibilityLabel={t('meal.search.clear')} onPress={() => onChangeText('')} style={styles.end}>
        <Icon name="xmark.circle.fill" size="small" tone="muted" />
      </Pressable>
    ) : onScan === undefined ? null : (
      <Pressable testID="scan-button" accessibilityRole="button" accessibilityLabel={t('meal.barcode.scan')} onPress={onScan} style={styles.end}>
        <Icon name="barcode.viewfinder" tone="accent" testID="scan-icon" />
      </Pressable>
    );
  return (
    <View style={styles.field}>
      <View style={[styles.box, { backgroundColor: color.surface }]}>
        <Icon name="magnifyingglass" size="small" tone="muted" testID="search-icon" />
        <TextInput
          testID="search-input"
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...held}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.muted}
          maxLength={maxLength}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          clearButtonMode="never"
          returnKeyType="search"
          onSubmitEditing={onSearch}
          style={[styles.input, { color: color.text }]}
        />
        {end}
      </View>
      {hint !== undefined && <Text style={[styles.note, { color: color.muted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    borderRadius: tokens.radius.card,
    paddingLeft: tokens.space.md,
    minHeight: tokens.size.primaryButton,
  },
  input: { flex: 1, minWidth: 0, fontSize: tokens.type.body, paddingVertical: tokens.space.sm },
  // A full touch target at the box's end.
  end: { minWidth: tokens.size.touch, minHeight: tokens.size.primaryButton, alignItems: 'center', justifyContent: 'center' },
  note: { marginLeft: tokens.space.xs, fontSize: tokens.type.bodySmall },
});
