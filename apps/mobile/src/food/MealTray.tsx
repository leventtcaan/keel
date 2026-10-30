import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { foodParams } from './params';
import type { TrayItem } from './tray';

type Props = {
  /** Already translated: "Breakfast · Today". */
  title: string;
  items: TrayItem[];
  /** A chip was pressed: change that item where it stands. A meal not sent yet cannot be changed, its chip does nothing. */
  onEdit: (item: TrayItem) => void;
  /** Opens Today's food on the day being logged. */
  onViewDay: () => void;
};

/**
 * What the meal already holds on the day being logged (Evre 7 A): a small card under the search with the foods as chips (name and
 * calories; a press changes it), and the way to the whole day — "View day ›" — which was too hidden in build 9. The first few items are
 * chips; the rest are one "+N" chip that opens the day. An empty meal says so in one short line.
 */
export function MealTray({ title, items, onEdit, onViewDay }: Props) {
  const { color } = useTheme();
  const shown = items.slice(0, foodParams.trayItemsMax);
  const rest = items.length - shown.length;
  // Built outside the JSX children (the raw-text guard reads them).
  const moreChip =
    rest > 0 ? (
      <Pressable
        testID="tray-more"
        accessibilityRole="button"
        accessibilityLabel={t('meal.tray.moreSpoken', { count: rest })}
        onPress={onViewDay}
        style={[styles.chip, { backgroundColor: color.raise }]}>
        <Text style={[styles.chipName, { color: color.text }]}>{t('meal.tray.more', { count: rest })}</Text>
      </Pressable>
    ) : null;
  return (
    <View testID="tray" style={[styles.card, { backgroundColor: color.surface }]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
          {title}
        </Text>
        <Pressable
          testID="tray-view-day"
          accessibilityRole="button"
          accessibilityLabel={t('meal.tray.viewDaySpoken')}
          onPress={onViewDay}
          hitSlop={tokens.space.sm}
          style={styles.view}>
          <Text style={[styles.viewText, { color: color.accent }]}>{t('meal.tray.viewDay')}</Text>
          <Icon name="chevron.right" size="small" tone="accent" />
        </Pressable>
      </View>
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: color.muted }]}>{t('meal.tray.empty')}</Text>
      ) : (
        <View style={styles.chips}>
          {shown.map((item) => (
            <Pressable
              key={item.key}
              testID={`tray-item-${item.key}`}
              accessibilityRole="button"
              accessibilityLabel={t('meal.tray.edit', { name: item.name })}
              disabled={item.meal === undefined}
              onPress={() => onEdit(item)}
              style={[styles.chip, { backgroundColor: color.raise }]}>
              <Text style={[styles.chipName, { color: color.text }]}>
                {item.name}
              </Text>
              {item.kcal === null ? null : <Text style={[styles.chipKcal, { color: color.muted }]}>{item.kcal.toLocaleString('en-US')}</Text>}
            </Pressable>
          ))}
          {moreChip}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.md, paddingBottom: tokens.space.md, gap: tokens.space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.size.touch },
  title: { flexShrink: 1, fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  view: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: tokens.size.touch },
  viewText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  empty: { fontSize: tokens.type.bodySmall },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs, maxWidth: '100%', borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.sm + 2, paddingVertical: tokens.space.sm, minHeight: tokens.size.touch - tokens.space.sm },
  chipName: { flexShrink: 1, fontSize: tokens.type.bodySmall },
  chipKcal: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
});
