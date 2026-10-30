import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MacroChips } from './MacroChips';
import { SectionHeader } from './SectionHeader';

export type FoodRowData = {
  key: string;
  /** "Egg", "Chobani Greek yogurt". */
  name: string;
  /** The second line: the brand, then the portion it opens on ("Fage · 1 cup"). */
  sub?: string;
  /** What one tap of the plus logs, as one number. Absent: the numbers are not known (a food read without portions). */
  kcal?: number;
  macros?: { protein: number; carbs?: number; fat?: number };
  /** A small warning mark under the name ("You avoid this"); never hides the row. */
  marker?: string;
  /** A quiet badge after the name ("Yours" for a food the user made). */
  badge?: string;
  /** Opens the portion step: the food with its natural portion chosen. */
  onOpen: () => void;
  /** Logs it as it stands in one tap (the plus). Absent: the row has no plus. */
  onLog?: () => void;
  /** What a screen reader says for each press. */
  openLabel: string;
  logLabel?: string;
  /** The heart: on or off, and what it does. Absent: the food cannot be a favorite (a recipe). */
  favorite?: { on: boolean; onToggle: () => void };
  /** The row was just logged: the plus is a check for a moment. */
  added?: boolean;
  testID?: string;
};

/**
 * A list of foods to pick from (Evre 7 A, ADR-090 Ek 6): one card, rows split by a hairline. Each row is the food (name, brand and portion,
 * its macros as three coloured marks), its calories as one number, a heart and a plus. The row opens the portion step; the plus logs the
 * portion shown right away (a long press on it opens the step too); the heart keeps the food in Favorites. One row, one look, for
 * search results, favorites, the foods usually had at the meal and the recent ones.
 */
export function FoodList({ title, rows, testID }: { title?: string; rows: FoodRowData[]; testID?: string }) {
  const { color } = useTheme();
  if (rows.length === 0) return null;
  return (
    <View testID={testID} style={styles.group}>
      {title !== undefined && <SectionHeader title={title} />}
      <View style={[styles.card, { backgroundColor: color.surface }]}>
        {rows.map((row, index) => (
          <FoodRow key={row.key} row={row} first={index === 0} />
        ))}
      </View>
    </View>
  );
}

function FoodRow({ row, first }: { row: FoodRowData; first: boolean }) {
  const { color } = useTheme();
  const id = (suffix: string) => (row.testID === undefined ? undefined : `${row.testID}-${suffix}`);
  const marker =
    row.marker === undefined ? null : (
      <View style={styles.marker} testID={id('marker')}>
        <Icon name="exclamationmark.triangle.fill" size="small" tone="warn" />
        <Text style={[styles.markerText, { color: color.muted }]}>{row.marker}</Text>
      </View>
    );
  const badge =
    row.badge === undefined ? null : (
      <Text style={[styles.badge, { color: color.text, backgroundColor: color.accentSoft }]} testID={id('badge')}>
        {row.badge}
      </Text>
    );
  const heart =
    row.favorite === undefined ? null : (
      <Pressable
        testID={id('heart')}
        accessibilityRole="button"
        accessibilityLabel={t(row.favorite.on ? 'meal.favorite.remove' : 'meal.favorite.add', { name: row.name })}
        accessibilityState={{ selected: row.favorite.on }}
        onPress={row.favorite.onToggle}
        style={styles.side}>
        <Icon name={row.favorite.on ? 'heart.fill' : 'heart'} size="small" tone={row.favorite.on ? 'accent' : 'muted'} />
      </Pressable>
    );
  const plus =
    row.onLog === undefined ? null : (
      <Pressable
        testID={id('log')}
        accessibilityRole="button"
        accessibilityLabel={row.added === true ? t('meal.row.added') : (row.logLabel ?? t('meal.logNow'))}
        onPress={row.onLog}
        onLongPress={row.onOpen}
        style={styles.side}>
        <Icon name={row.added === true ? 'checkmark.circle.fill' : 'plus.circle.fill'} tone="accent" />
      </Pressable>
    );
  return (
    <View style={styles.row}>
      {first ? null : <View style={[styles.line, { backgroundColor: color.line }]} />}
      <Pressable testID={row.testID} accessibilityRole="button" accessibilityLabel={row.openLabel} onPress={row.onOpen} style={styles.main}>
        <View style={styles.texts}>
          <View style={styles.nameLine}>
            <Text style={[styles.name, { color: color.text }]}>
              {row.name}
            </Text>
            {badge}
          </View>
          {row.sub === undefined ? null : (
            <Text style={[styles.sub, { color: color.muted }]}>
              {row.sub}
            </Text>
          )}
          {row.macros === undefined ? null : <MacroChips {...row.macros} />}
          {marker}
        </View>
        {row.kcal === undefined ? null : (
          <Text style={[styles.kcal, { color: color.text }]} testID={id('kcal')}>
            {t('food.single.kcal', { value: row.kcal.toLocaleString('en-US') })}
          </Text>
        )}
      </Pressable>
      {heart}
      {plus}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space.xs },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: tokens.size.row },
  line: { position: 'absolute', top: 0, left: tokens.space.md, right: 0, height: StyleSheet.hairlineWidth },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, paddingVertical: tokens.space.md, paddingLeft: tokens.space.md },
  texts: { flex: 1, minWidth: 0, gap: tokens.space.xs },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  name: { flexShrink: 1, fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  sub: { fontSize: tokens.type.bodySmall },
  kcal: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold, fontVariant: ['tabular-nums'] },
  marker: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  markerText: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  badge: { overflow: 'hidden', borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm, paddingVertical: 2, fontSize: tokens.type.min, fontWeight: tokens.weight.semibold },
  // A side button is a full touch target wide, the row's height tall.
  side: { minWidth: tokens.size.touch, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
