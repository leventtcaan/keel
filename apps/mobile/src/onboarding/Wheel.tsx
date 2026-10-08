/**
 * A scroll wheel (prototype `.wheel`, #ob-about): a column of values that snaps to a row; the row in the middle is the
 * value. VoiceOver reaches the whole wheel as one adjustable control and steps it with a swipe up or down (Apple: the
 * adjustable trait). `unset`: the middle row is only a suggestion, drawn quietly, until the person moves the wheel or
 * comes to rest on it; VoiceOver hears that it is not set, and how to set it.
 */
import { useEffect, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated: "Height". */
  label: string;
  /** Already translated, shown under the wheel and read after the value: "cm". */
  unit?: string;
  values: readonly number[];
  value: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  unset?: boolean;
};

/** One row is a touch target high; five show, the value in the middle. */
const ROW = tokens.size.touch;
const ROWS_SHOWN = 5;
const AROUND = Math.floor(ROWS_SHOWN / 2);

export function Wheel({ label, unit, values, value, format, onChange, unset = false }: Props) {
  const { color } = useTheme();
  const list = useRef<FlatList<number>>(null);
  const index = Math.max(0, values.indexOf(value));
  // A row the column came to rest on is already in place: moving it there again would stop a list still coasting.
  const fromColumn = useRef(false);

  // A value set from outside (a VoiceOver step, other units) moves the column to it. A jump, not a scroll: no motion.
  useEffect(() => {
    if (fromColumn.current) {
      fromColumn.current = false;
      return;
    }
    list.current?.scrollToOffset({ offset: index * ROW, animated: false });
  }, [index]);

  const pick = (at: number, byColumn = false) => {
    const next = values[Math.min(values.length - 1, Math.max(0, at))];
    if (next === value && !unset) return;
    fromColumn.current = byColumn && next !== value;
    onChange(next);
  };
  const rest = (event: NativeSyntheticEvent<NativeScrollEvent>) => pick(Math.round(event.nativeEvent.contentOffset.y / ROW), true);
  // A lift with speed coasts on (and snaps); its row comes with the momentum's end. A still lift has no momentum to wait for.
  const lift = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if ((event.nativeEvent.velocity?.y ?? 0) === 0) rest(event);
  };
  const step = (by: number) => {
    const at = index + by;
    if (at >= 0 && at < values.length) pick(at);
  };

  const shown = unit === undefined ? format(value) : `${format(value)} ${unit}`;
  const spoken = unset ? t('onboarding.wheel.unset', { value: shown }) : shown;
  return (
    <View style={styles.box}>
      <Text style={[styles.label, { color: color.muted }]}>{label}</Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: spoken }}
        accessibilityHint={unset ? t('onboarding.wheel.unsetHint') : undefined}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        style={[styles.window, { backgroundColor: color.surface }]}>
        <View style={[styles.band, { backgroundColor: color.background }]} />
        <FlatList
          ref={list}
          testID={`wheel-${label}`}
          data={values}
          keyExtractor={String}
          getItemLayout={(_, at) => ({ length: ROW, offset: ROW * at, index: at })}
          initialScrollIndex={index}
          snapToInterval={ROW}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          contentContainerStyle={styles.column}
          onMomentumScrollEnd={rest}
          onScrollEndDrag={lift}
          renderItem={({ item }) => {
            const middle = item === value;
            const ink = middle && !unset ? color.text : color.muted;
            return (
              <View style={styles.row}>
                <Text style={[middle ? styles.middle : styles.value, { color: ink }]}>{format(item)}</Text>
              </View>
            );
          }}
        />
      </View>
      {unit !== undefined && <Text style={[styles.unit, { color: color.muted }]}>{unit}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', gap: tokens.space.xs },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  window: { width: '100%', height: ROW * ROWS_SHOWN, borderRadius: tokens.radius.option, overflow: 'hidden' },
  band: {
    pointerEvents: 'none',
    position: 'absolute',
    top: ROW * AROUND,
    left: tokens.space.xs,
    right: tokens.space.xs,
    height: ROW,
    borderRadius: tokens.radius.button,
  },
  column: { paddingVertical: ROW * AROUND },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
  middle: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  unit: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
});
