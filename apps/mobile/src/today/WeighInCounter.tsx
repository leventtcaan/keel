import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type WeighInWeek, counterOf } from './weighInWeek';

type Props = { week: WeighInWeek; today: string };

/**
 * The week's weigh-ins in the hero block, on the inverse surface (ADR-089, prototype 11.1-11.4): the block's seven days as
 * small segments (filled: weighed; ring: today), "N of 4" with a check once it is reached, one line that says what is left
 * or why the first calls wait, and "Weigh in" while today can still help. All of it the server's count and date (U1).
 */
export function WeighInCounter({ week, today }: Props) {
  const { color } = useTheme();
  const counter = counterOf(week, today);
  const spoken = t(counter.reached ? 'thisWeek.counter.labelReached' : 'thisWeek.counter.label', { count: counter.count, needed: counter.needed });
  // Built outside the JSX children (the raw-text guard reads them).
  const check = (
    <View testID="counter-reached">
      <SymbolView name="checkmark" size={tokens.type.bodySmall} tintColor={color.accentInk} weight="bold" />
    </View>
  );
  const weighIn = <Button label={t('thisWeek.counter.weighIn')} size="sm" onPress={() => router.push('/weigh-in')} />;
  return (
    <View testID="weigh-in-counter" style={[styles.frame, { borderTopColor: color.decisionLine }]}>
      <View accessible accessibilityLabel={spoken} style={styles.block}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: color.decisionText }]}>{t('thisWeek.counter.title')}</Text>
          <View style={styles.row}>
            <Text style={[styles.number, { color: counter.reached ? color.accentInk : color.decisionText }]}>
              {t('thisWeek.counter.of', { count: counter.count, needed: counter.needed })}
            </Text>
            {counter.reached ? check : null}
          </View>
        </View>
        <View style={styles.row}>
          {counter.days.map((day) => (
            <View
              key={day.date}
              testID={`counter-day-${day.date}`}
              style={[
                styles.segment,
                { backgroundColor: day.weighed ? color.accentInk : color.decisionLine, borderColor: day.today ? color.decisionText : day.weighed ? color.accentInk : color.decisionLine },
              ]}
            />
          ))}
        </View>
        <View style={styles.row}>
          {counter.days.map((day) => (
            <Text key={day.date} style={[styles.letter, { color: color.decisionMuted }]}>
              {t(`thisWeek.strip.letter.${day.weekday}`)}
            </Text>
          ))}
        </View>
      </View>
      <Text style={[styles.note, { color: color.decisionTextSecondary }]}>{t(counter.note.key, counter.note.vars)}</Text>
      {counter.showWeighIn ? <View style={styles.button}>{weighIn}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { gap: tokens.space.sm, borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm, marginTop: tokens.space.xs },
  block: { gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.xs },
  title: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  number: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
  segment: { flex: 1, height: tokens.space.sm, borderRadius: tokens.radius.track, borderWidth: 2 },
  letter: { flex: 1, textAlign: 'center', fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
  button: { alignSelf: 'flex-start' },
});
