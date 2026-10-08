import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { InverseSurface, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type UnitSystem, formatLoad } from '@/units/units';

import { MoveThumb } from './MoveThumb';
import { dayName, exerciseName, rackNote } from './program';
import { repCount } from './reps';
import type { Move } from './trainData';
import { type Found, alsoMoved, sessionMoves, weekdayOf } from './week';

type Schemas = components['schemas'];

type Props = {
  program: Schemas['Program'];
  /** Today's date on the phone's calendar (YYYY-MM-DD): which of the server's dates is today. */
  date: string;
  /** The week's session on today, as the server set it; null on a day without one. */
  today: Found | null;
  /** The session of today's weekday the server moved to another day ("Move it"). */
  away: Found | null;
  moves: ReadonlyMap<string, Move>;
  units: UnitSystem;
  /** A workout under way: continued, not started again. */
  underWay: boolean;
  onStart: (programDayId: string) => void;
};

const weekdayShort = (date: string) => t(`programEditor.weekdayShort.${weekdayOf(date)}`);

/**
 * Today's session (K-970, prototype `#train` › `.card.ink`): the session the server put on today, by its day's name;
 * each move with its image, sets × reps, the next load the server set and "held" while loads are held; today's cardio
 * after lifting; Start and Change. Moved off today, skipped, or a week off, it says so instead, with the days that
 * shifted (the server's week). Every number is the server's.
 */
export function TodayCard({ program, date, today, away, moves, units, underWay, onStart }: Props) {
  return (
    <InverseSurface>
      <Body program={program} date={date} today={today} away={away} moves={moves} units={units} underWay={underWay} onStart={onStart} />
    </InverseSurface>
  );
}

function Body({ program, date, today, away, moves, units, underWay, onStart }: Props) {
  const { color } = useTheme();
  const restWeek = program.restUntil !== undefined;
  const session = restWeek || today === null || today.session.skipped === true ? null : today;
  const shown = session === null ? [] : sessionMoves(session.day, session.session);
  const meta = session === null ? '' : t(shown.length === 1 ? 'train.moveCount.one' : 'train.moveCount.other', { count: shown.length });
  const title = session !== null ? dayName(session.day) : today !== null && !restWeek ? dayName(today.day) : t('train.rest');

  let line: string | null = null;
  if (restWeek) line = t('train.status.restWeekNote');
  else if (today?.session.skipped === true) line = t('train.skipped');
  else if (today === null && away !== null) line = t('train.movedTo', { weekday: weekdayShort(away.session.date) });
  else if (today === null) line = t('train.restDay');
  const shifted = today === null && away !== null ? alsoMoved(program, away.day.id) : [];
  const then =
    shifted.length === 0 ? null : t('train.movedThen', { days: shifted.map((f) => t('train.weekRow', { weekday: weekdayShort(f.session.date), day: dayName(f.day) })).join(', ') });

  const cardio = program.cardio?.sessions.find((s) => s.weekday === weekdayOf(date) && s.place === 'AFTER_LIFT');
  const short = session?.session.short === true;
  const held = program.loadHeldSince !== undefined;
  const change = () => router.push({ pathname: '/today-change', params: { day: session?.day.id ?? '' } });
  let dock = null;
  if (underWay) dock = <Button label={t('train.continueWorkout')} onPress={() => router.push('/workout')} />;
  else if (session !== null) {
    dock = (
      <View style={styles.dock}>
        <View style={styles.grow}>
          <Button label={t('train.start')} accessibilityLabel={t('train.startDay', { day: dayName(session.day) })} onPress={() => onStart(session.day.id)} />
        </View>
        <Button label={t('train.change')} accessibilityLabel={t('train.changeLabel')} variant="ghost" onPress={change} />
      </View>
    );
  }
  return (
    <View testID="today-card" style={[styles.card, { backgroundColor: color.background }]}>
      <View style={styles.head}>
        <Text style={[styles.small, { color: color.muted }]}>{t('train.todayOn', { weekday: weekdayShort(date) })}</Text>
        <Text style={[styles.small, { color: color.muted }]}>{short ? t('train.shortTag') : meta}</Text>
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {title}
      </Text>
      {line !== null && <Text style={[styles.text, { color: color.text }]}>{line}</Text>}
      {then !== null && <Text style={[styles.small, { color: color.textSecondary }]}>{then}</Text>}
      {shown.map(({ planned }) => {
        const name = exerciseName(planned.exerciseId, moves);
        const move = moves.get(planned.exerciseId);
        const rack = rackNote(planned);
        // No weight to aim for on a bodyweight move; an added load (a weighted dip) with its plus.
        const kg = planned.nextLoadKg === undefined || move?.load === 'BODYWEIGHT' ? null : formatLoad(planned.nextLoadKg, units);
        const load = kg !== null && move?.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? t('train.addedLoad', { load: kg }) : kg;
        return (
          <View key={planned.exerciseId} style={styles.move}>
            <MoveThumb equipment={move?.equipment} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('history.openLabel', { exercise: name })}
              onPress={() => router.push({ pathname: '/exercise-history', params: { exercise: planned.exerciseId } })}
              style={styles.name}>
              <Text style={[styles.text, styles.bold, { color: color.text }]}>{name}</Text>
              <Text style={[styles.small, { color: color.textSecondary }]}>{t('train.setsReps', { sets: planned.sets, reps: repCount(planned.reps) })}</Text>
              {rack !== null && <Text style={[styles.small, { color: color.textSecondary }]}>{rack}</Text>}
            </Pressable>
            {load !== null && (
              <View style={styles.load}>
                <Text style={[styles.text, { color: color.text }]}>{load}</Text>
                {held && <Text style={[styles.small, { color: color.muted }]}>{t('train.held')}</Text>}
              </View>
            )}
          </View>
        );
      })}
      {session !== null && cardio !== undefined && program.cardio !== undefined && (
        <View style={[styles.move, styles.cardio, { borderColor: color.line }]}>
          <View style={styles.name}>
            <Text style={[styles.text, styles.bold, { color: color.text }]}>{t('train.cardio')}</Text>
            <Text style={[styles.small, { color: color.textSecondary }]}>{t(short ? 'train.cardioOptional' : 'train.cardioAfter')}</Text>
          </View>
          <Text style={[styles.text, { color: color.text }]}>{t('train.cardioMinutes', { minutes: program.cardio.minutes })}</Text>
        </View>
      )}
      {dock}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space.sm },
  title: { fontSize: tokens.type.decisionTitle, fontWeight: tokens.weight.bold },
  move: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm, minHeight: tokens.size.touch },
  cardio: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm },
  name: { flex: 1, gap: tokens.space.xs },
  load: { alignItems: 'flex-end' },
  dock: { flexDirection: 'row', gap: tokens.space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
