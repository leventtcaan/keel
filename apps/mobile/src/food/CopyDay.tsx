import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { dayLabel } from './dayLabel';
import { kcalText, mid } from './single';

/**
 * "Copy a day's meals" (K-1063): the last month's days that have meals, newest first, each with what it came to; one tap copies all of
 * that day's meals into the day being shown, each at its own time of day. Nothing is chosen twice: the day's rows say what they hold.
 */
export function CopyDay({
  days,
  into,
  today,
  busy,
  onCopy,
  onClose,
}: {
  days: components['schemas']['DaySummary'][];
  into: string;
  today: string;
  busy: boolean;
  onCopy: (day: components['schemas']['DaySummary']) => void;
  onClose: () => void;
}) {
  const { color } = useTheme();
  const sources = days.filter((day) => day.day !== into).reverse();
  return (
    <View testID="copy-day" style={styles.part}>
      {sources.length === 0 ? (
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.copy.none')}</Text>
      ) : (
        <ListGroup title={t('food.copy.title', { day: dayLabel(into, today) })}>
          {sources.map((day) => (
            <ListRow
              key={day.day}
              testID={`copy-${day.day}`}
              label={dayLabel(day.day, today)}
              detail={t(day.meals === 1 ? 'food.copy.one' : 'food.copy.other', { count: day.meals, kcal: kcalText(mid(day.eaten.kcal)) })}
              trailing="plus.circle.fill"
              accessibilityLabel={t('food.copy.spoken', { day: dayLabel(day.day, today) })}
              disabled={busy}
              onPress={() => onCopy(day)}
            />
          ))}
        </ListGroup>
      )}
      <Button label={t('food.copy.close')} variant="text" size="sm" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  part: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
