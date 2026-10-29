import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

export type FoodRowData = {
  key: string;
  /** "Egg", "Chobani Greek yogurt". */
  name: string;
  /** The second line: "1 large · 72 kcal · P 6 · C 0 · F 5". */
  detail: string;
  /** A small marker at the end of the second line ("You avoid this"); never hides the row. */
  marker?: string;
  /** Opens the portion step: the food added to the meal with its natural portion chosen. */
  onOpen: () => void;
  /** Logs it as it stands in one tap (the plus). Absent: the row has no plus. */
  onLog?: () => void;
  /** What a screen reader says for each press. */
  openLabel: string;
  logLabel?: string;
  /** The row itself logs (a past meal has no portion step): it carries a plus that is drawn, not a second button. */
  logOnOpen?: boolean;
  testID?: string;
};

/**
 * A list of foods to pick from (ADR-090, K-1063): each row is the food and what one portion of it holds, as single numbers; the
 * row opens the portion step, the plus at its end logs the portion shown right away. One card, rows split by a hairline, as a
 * ListGroup. The plus and the row are two targets: a person logging a usual breakfast taps once.
 */
export function FoodList({ title, rows, testID }: { title?: string; rows: FoodRowData[]; testID?: string }) {
  const { color } = useTheme();
  if (rows.length === 0) return null;
  const heading =
    title === undefined ? null : (
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {title}
      </Text>
    );
  const rowViews = rows.map((row, index) => <FoodRow key={row.key} row={row} first={index === 0} />);
  return (
    <View testID={testID} style={styles.group}>
      {heading}
      <View style={[styles.card, { backgroundColor: color.surface }]}>{rowViews}</View>
    </View>
  );
}

function FoodRow({ row, first }: { row: FoodRowData; first: boolean }) {
  const { color } = useTheme();
  const markerId = row.testID === undefined ? undefined : `${row.testID}-marker`;
  const logId = row.testID === undefined ? undefined : `${row.testID}-log`;
  const marker =
    row.marker === undefined ? null : (
      <Text style={[styles.marker, { color: color.muted }]} testID={markerId}>
        {row.marker}
      </Text>
    );
  const plus =
    row.onLog === undefined ? null : (
      <Pressable testID={logId} accessibilityRole="button" accessibilityLabel={row.logLabel ?? t('meal.logNow')} onPress={row.onLog} hitSlop={tokens.space.sm} style={styles.plus}>
        <Icon name="plus.circle.fill" tone="accent" />
      </Pressable>
    );
  const drawnPlus =
    row.logOnOpen === true && row.onLog === undefined ? (
      <View style={styles.plus}>
        <Icon name="plus.circle.fill" tone="accent" />
      </View>
    ) : null;
  const line = first ? null : <View style={[styles.line, { backgroundColor: color.line }]} />;
  return (
    <View style={styles.row}>
      {line}
      <Pressable testID={row.testID} accessibilityRole="button" accessibilityLabel={row.openLabel} onPress={row.onOpen} style={styles.main}>
        <Text style={[styles.name, { color: color.text }]}>{row.name}</Text>
        <Text style={[styles.detail, { color: color.muted }]}>{row.detail}</Text>
        {marker}
      </Pressable>
      {plus}
      {drawnPlus}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space.sm },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: tokens.size.touch },
  line: { position: 'absolute', top: 0, left: tokens.space.md, right: 0, height: StyleSheet.hairlineWidth },
  main: { flex: 1, minWidth: 0, minHeight: tokens.size.row, justifyContent: 'center', paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, gap: 2 },
  name: { fontSize: tokens.type.body },
  detail: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  marker: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  plus: { paddingHorizontal: tokens.space.md, alignSelf: 'stretch', justifyContent: 'center' },
});
