import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** What an empty number field shows, faint: the empty table cell's dash (prototype `.fv.ghost`). */
const EMPTY = '–';
const NUMERIC: TextInputProps['keyboardType'][] = ['number-pad', 'decimal-pad', 'numeric'];

type Props = {
  /** Already translated; also what a screen reader calls the field. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** The unit after the number ("cm", "ft"), already translated. */
  suffix?: string;
  /** Shown under the field; `problem` replaces it when there is one (in the text colour: warn is for real warnings, ADR-016). */
  hint?: string;
  problem?: string | null;
  keyboardType?: TextInputProps['keyboardType'];
  maxLength?: number;
  /** A few sentences rather than a short answer (a note). */
  multiline?: boolean;
  /** Words to look up rather than to write (a search): taken as typed, no capital, no autocorrect; the key searches. */
  onSearch?: () => void;
};

/** A labelled field for a short answer: a number, a year, a time — or, multiline, a note. */
export function TextField({ label, value, onChangeText, suffix, hint, problem, keyboardType, maxLength, multiline = false, onSearch }: Props) {
  const { color } = useTheme();
  const note = problem ?? hint;
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: color.muted }]}>{label}</Text>
      <View style={[styles.box, { backgroundColor: color.surface, borderColor: problem ? color.text : color.surface }]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={note ?? undefined}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          // On a card (surface on surface) an empty field would not show at all (K-416, simulator).
          {...(NUMERIC.includes(keyboardType) ? { placeholder: EMPTY, placeholderTextColor: color.muted } : {})}
          {...(onSearch === undefined ? {} : { autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'search', onSubmitEditing: onSearch })}
          style={[styles.input, multiline && styles.multiline, { color: color.text }]}
        />
        {suffix !== undefined && <Text style={[styles.suffix, { color: color.muted }]}>{suffix}</Text>}
      </View>
      {problem ? (
        <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>
      ) : (
        hint !== undefined && <Text style={[styles.note, { color: color.muted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: tokens.space.xs, flex: 1 },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.button,
    borderWidth: tokens.border.outline,
    paddingHorizontal: tokens.space.md,
  },
  input: { flex: 1, fontSize: tokens.type.number, paddingVertical: tokens.space.sm },
  // Words, not a number: body size.
  multiline: { fontSize: tokens.type.body },
  suffix: { fontSize: tokens.type.body },
  note: { fontSize: tokens.type.bodySmall },
});
