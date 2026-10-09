import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { MoveThumb } from '@/train/MoveThumb';
import { dayName, exerciseName } from '@/train/program';
import { repCount } from '@/train/reps';
import { sessionMoves } from '@/train/workout';
import { type UnitSystem, loadValue } from '@/units/units';

import { type TodayCard as Card, type TodayParts, cardioToday } from './todayWorkout';
import { weekdayOf } from './week';

type Schemas = components['schemas'];

/** The first moves shown with their targets (prototype `#home`: three; ADR-077 #1). */
const FIRST_MOVES = 3;

/**
 * The next session's target as the server set it, in the user's unit, written the way the session writes a set
 * (train/session.ts setText): a load ("72.5 × 9", prototype `#home`, the unit the Train tab's), an added load with its
 * plus ("+10 × 7"), and the body alone (a bodyweight move, or a weighted one with nothing added) as its sets and reps
 * ("3 × 7"), never "0 ×". Before a target is known, the plan ("3 × 6-10").
 */
function targetOf(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string {
  const { nextLoadKg: kg, nextReps: reps } = planned;
  if (reps === undefined) return t('train.setsReps', { sets: planned.sets, reps: repCount(planned.reps) });
  if (kg === undefined || kg === 0 || move?.load === 'BODYWEIGHT') return t('train.setsReps', { sets: planned.sets, reps });
  const key = move?.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'thisWeek.today.added' : 'thisWeek.today.target';
  return t(key, { load: loadValue(kg, units), reps });
}

/** "8,420 kg": the load lifted, the server's sum, whole, in the user's unit. */
function lifted(kg: number, units: UnitSystem): string {
  const value = Math.round(loadValue(kg, units)).toLocaleString('en-US');
  return t(units === 'METRIC' ? 'units.kg' : 'units.lb', { value });
}

type Props = { card: Card; program: Schemas['Program'] | null; today: string; parts: TodayParts | undefined };

/**
 * Today's workout on This week (K-969, prototype `#home`): today's session with its first moves and their targets, the
 * cardio line, Start, and the way to change today (K-970's page). What the user changed shows on the card itself (user
 * test 8 Oct): the short version is marked, a session moved says where it went, a skipped one says so; undoing waits
 * for the server (K-995). A workout under way is continued ("Open workout · Continue", K-961); one done today has its
 * tick and its facts, the server's (K-965), and no Start.
 */
export function TodayCard({ card, program, today, parts }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  if (card.kind === 'none') return null;

  const name = (day: Schemas['ProgramDay'] | null) => (day === null ? '' : dayName(day));
  const fine = (text: string) => <Text style={[styles.fine, { color: color.textSecondary }]}>{text}</Text>;
  const head = (title: string, session: string, right: ReactNode, tag?: string) => (
    <View style={styles.head}>
      <View style={styles.titles}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: color.muted }]}>{title}</Text>
          {tag === undefined ? null : <Text style={[styles.tag, { color: color.accent, backgroundColor: color.accentSoft }]}>{tag}</Text>}
        </View>
        <Text accessibilityRole="header" style={[styles.session, { color: color.text }]}>
          {session}
        </Text>
      </View>
      {right}
    </View>
  );
  // K-970's page to change today, for today's session. An icon, so the first view keeps its words (ADR-077 #1: the
  // prototype's card has none for it).
  const change = (programDayId: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('thisWeek.today.changeLabel')}
      onPress={() => router.push({ pathname: '/today-change', params: { day: programDayId } })}
      style={({ pressed }) => [styles.icon, { backgroundColor: color.background }, pressed && styles.dim]}>
      <SymbolView name="slider.horizontal.3" size={tokens.type.body} tintColor={color.text} />
    </Pressable>
  );

  let body: ReactNode;
  switch (card.kind) {
    case 'open': {
      const sets =
        card.sets === 0 ? t('thisWeek.today.openSets.none') : card.sets === 1 ? t('thisWeek.today.openSets.one') : t('thisWeek.today.openSets.other', { count: card.sets });
      const resume = <Button label={t('thisWeek.today.continue')} size="sm" onPress={() => router.push('/workout')} />;
      body = (
        <>
          {head(t('thisWeek.today.open'), name(card.day), resume)}
          {fine(sets)}
        </>
      );
      break;
    }
    case 'done': {
      const tick = (
        <View accessibilityLabel={t('thisWeek.today.doneLabel')} style={[styles.tick, { backgroundColor: color.accent }]}>
          <SymbolView name="checkmark" size={tokens.type.body} tintColor={color.onAccent} weight="bold" />
        </View>
      );
      const summary = parts?.summary?.state === 'ready' ? parts.summary.value : null;
      const stats =
        summary === null
          ? null
          : summary.workingSets === 1
            ? t('thisWeek.today.doneStats.one', { lifted: lifted(summary.liftedKg, units) })
            : t('thisWeek.today.doneStats.other', { count: summary.workingSets, lifted: lifted(summary.liftedKg, units) });
      body = (
        <>
          {head(t('thisWeek.today.done'), name(card.day), tick)}
          {stats === null ? null : fine(stats)}
        </>
      );
      break;
    }
    case 'moved':
      body = (
        <>
          {head(t('thisWeek.today.today'), t('thisWeek.today.rest'), null)}
          {fine(t('thisWeek.today.movedTo', { day: t(`onboarding.schedule.dayName.${weekdayOf(card.to)}`) }))}
        </>
      );
      break;
    case 'skipped':
      body = (
        <>
          {head(t('thisWeek.today.today'), name(card.day), null)}
          {fine(
            parts?.checkInDay == null
              ? t('thisWeek.today.skippedNoDay')
              : t('thisWeek.today.skipped', { day: t(`onboarding.schedule.dayName.${parts.checkInDay}`) }),
          )}
        </>
      );
      break;
    case 'restWeek':
    case 'rest':
      body = head(t('thisWeek.today.today'), t(card.kind === 'rest' ? 'thisWeek.today.rest' : 'thisWeek.today.restWeek'), null);
      break;
    case 'session': {
      const { day, session } = card;
      const short = session.short === true;
      const start = (
        <Button
          label={t('thisWeek.today.start')}
          accessibilityLabel={t('thisWeek.today.startLabel', { session: name(day) })}
          size="sm"
          onPress={() => router.push({ pathname: '/workout', params: { day: day.id } })}
        />
      );
      const minutes = program === null ? null : cardioToday(program, today);
      const cardio =
        minutes === null ? null : (
          <View style={[styles.row, styles.cardio, { borderTopColor: color.line }]}>
            <SymbolView name="figure.run" size={tokens.type.body} tintColor={color.muted} />
            <Text style={[styles.fine, { color: color.textSecondary }]}>
              {short ? t('thisWeek.today.cardioOptional') : t('thisWeek.today.cardio', { minutes })}
            </Text>
          </View>
        );
      // The session's own moves, as the session takes them (short version, today's swaps): one rule for both.
      const moves = sessionMoves(day, program?.week, today)
        .slice(0, FIRST_MOVES)
        .map((planned) => {
          const id = planned.exerciseId;
          const move = parts?.moves.get(id);
          return (
            <View key={id} testID={`move-${id}`} style={styles.move}>
              <MoveThumb equipment={move?.equipment} />
              <Text style={[styles.moveName, { color: color.text }]}>{exerciseName(id, parts?.moves)}</Text>
              <Text style={[styles.target, { color: color.text }]}>{targetOf(planned, move, units)}</Text>
            </View>
          );
        });
      body = (
        <>
          {head(
            t('thisWeek.today.today'),
            name(day),
            <View style={styles.row}>
              {change(day.id)}
              {start}
            </View>,
            short ? t('thisWeek.today.short') : undefined,
          )}
          {moves}
          {cardio}
        </>
      );
      break;
    }
  }
  return (
    <View testID="today-card" accessibilityLabel={t('thisWeek.today.label')} style={[styles.card, { backgroundColor: color.surface }]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  titles: { flex: 1, gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, flexWrap: 'wrap' },
  title: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  tag: {
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold,
    borderRadius: tokens.radius.chip,
    paddingHorizontal: tokens.space.sm,
    overflow: 'hidden',
  },
  session: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.heading },
  fine: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  moveName: { flex: 1, fontSize: tokens.type.body },
  target: { fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
  cardio: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm },
  icon: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  tick: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
});
