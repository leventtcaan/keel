import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated; also what a screen reader calls the field. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** The keyboard's Search key. */
  onSearch: () => void;
  /** Shown under the field (the hint for an empty box, what the last search found). */
  hint?: string;
  maxLength?: number;
  /** Reads a barcode: the text button "Scan" with the barcode beside it, inside the field (prototype `.srch .bc`). Absent: none. */
  onScan?: () => void;
};

/**
 * The food search field (prototype `.srch`): a magnifying glass, the words, and at the end the barcode with "Scan" as a
 * text button. The glass and the barcode are drawn, not read: the label names the field, and "Scan a barcode" names the
 * button (a screen reader gets one button, the sighted get the icon and the word as one target).
 */
export function SearchField({ label, value, onChangeText, onSearch, hint, maxLength, onScan }: Props) {
  const { color } = useTheme();
  // The words are the field's own while it holds any (K-1052): a value sent back on every key raced the keys and dropped
  // letters typed fast (14 typed, 1 kept). Only an empty value is sent, so the screen can still empty the box (a food
  // picked, the search cleared); the field reports each change as before.
  const held = value === '' ? { value } : {};
  // Built outside the JSX children (the raw-text guard reads them). The icon is a second, silent target for the same press.
  const scan =
    onScan === undefined ? null : (
      <>
        <Pressable accessible={false} accessibilityRole="button" accessibilityLabel={t('meal.barcode.scan')} onPress={onScan}>
          <Icon name="barcode.viewfinder" size="small" tone="accent" testID="scan-icon" />
        </Pressable>
        <Button label={t('meal.barcode.scanShort')} accessibilityLabel={t('meal.barcode.scan')} variant="text" onPress={onScan} />
      </>
    );
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: color.muted }]}>{label}</Text>
      <View style={[styles.box, { backgroundColor: color.surface, borderColor: color.edge }]}>
        <Icon name="magnifyingglass" size="small" tone="muted" testID="search-icon" />
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...held}
          onChangeText={onChangeText}
          maxLength={maxLength}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSearch}
          style={[styles.input, { color: color.text }]}
        />
        {scan}
      </View>
      {hint !== undefined && <Text style={[styles.note, { color: color.muted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.space.xs },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    borderRadius: tokens.radius.button,
    borderWidth: tokens.border.outline,
    paddingHorizontal: tokens.space.md,
    minHeight: tokens.size.control,
  },
  input: { flex: 1, minWidth: 0, fontSize: tokens.type.body, paddingVertical: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
