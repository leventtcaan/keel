import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useCallback, useRef } from 'react';
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
import { swapChoice } from './swap';
import type { Move } from './trainData';
import { type Found, type TodayKind, sessionMoves, weekdayOf } from './week';

type Schemas = components['schemas'];

type Props = {
  program: Schemas['Program'];
  /** The week's session on today (sessionState); null on a day without one. */
  today: Found | null;
  /** Today (sessionState): the server's, or the phone's day when the program is the copy kept offline. */
  date: string;
  /** What the card says: a week off, done, open on another phone, skipped, today's session, moved off, rest (todayKind, as This week). */
  kind: TodayKind;
  /** The program is the copy kept offline: its Undo and its full-workout offer were the server's then, not now. */
  stale: boolean;
  /** The session the server moved off today (moved and still undoable: movedOffToday), when today has none. */
  movedAway: Found | null;
  moves: ReadonlyMap<string, Move>;
  units: UnitSystem;
  /** A workout under way on this phone (any day's, not finished): continued, never a second started. */
  underWay: boolean;
  /** With no session today, a session of the week below can be started: the rest line says so. */
  canPick: boolean;
  onStart: (programDayId: string) => void;
  /** Today's change of a session undone (UNDO), or the short version made full again (FULL); null while one is sent. */
  onChange: ((programDayId: string, change: 'UNDO' | 'FULL') => void) | null;
  /** What came of the last change, said under the card (an undo the server could not make, a failure). */
  notice: ReactNode;
};

const weekdayShort = (date: string) => t(`programEditor.weekdayShort.${weekdayOf(date)}`);

/**
 * Today's session (K-970, prototype `#train` › `.card.ink`): the session the server put on today, by its day's name;
 * each move with its image, sets × reps, the next load the server set and "held" while loads are held; today's cardio
 * after lifting; Start and Change. Done today, under way on this phone or on another (sessionState: the phone's
 * records first, then the server's word), it says so; under way here, "Continue workout". Skipped or moved off today,
 * it says so (where it went is the date of the session moved and still undoable), with Undo while the server says it
 * can be (`undoable`, never from a copy kept offline); the short version offers the full workout back. A week off, or a
 * day without a session, is rest. Today is sessionState's (the server's, the phone's day for a kept copy). Every number
 * is the server's.
 */
export function TodayCard(props: Props) {
  return (
    <InverseSurface>
      <Body {...props} />
    </InverseSurface>
  );
}

function Body({ program, today, date, kind, stale, movedAway, moves, units, underWay, canPick, onStart, onChange, notice }: Props) {
  const { color } = useTheme();
  // One sheet per tap: a second tap before the sheet is up must not open a second one (as Start, K-405 review).
  const opening = useRef(false);
  useFocusEffect(
    useCallback(() => {
      opening.current = false;
    }, []),
  );
  const sheet = (href: Parameters<typeof router.push>[0]) => {
    if (opening.current) return;
    opening.current = true;
    router.push(href);
  };
  const restWeek = kind === 'restWeek';
  const done = kind === 'done';
  const elsewhere = kind === 'openElsewhere';
  const session = restWeek || today === null || today.session.skipped === true || done || elsewhere ? null : today;
  const shown = session === null ? [] : sessionMoves(session.day, session.session);
  const meta = session === null ? '' : t(shown.length === 1 ? 'train.moveCount.one' : 'train.moveCount.other', { count: shown.length });
  const title = session !== null ? dayName(session.day) : today !== null && !restWeek ? dayName(today.day) : t('train.rest');

  let line: string | null = null;
  if (restWeek) line = t('train.status.restWeekNote');
  else if (done) line = t('train.doneToday');
  else if (elsewhere) line = t('train.openElsewhere');
  else if (today?.session.skipped === true) line = t('train.skipped');
  else if (today === null && movedAway !== null) line = t('train.movedTo', { weekday: weekdayShort(movedAway.session.date) });
  else if (today === null) line = t(canPick ? 'train.restDayPick' : 'train.restDay');
  // Undo where the server says today's move or skip can be undone; the full workout back from the short version.
  const undoable = stale || underWay ? null : ([today, movedAway].find((f) => f !== null && f.session.undoable === true) ?? null);
  const undo =
    undoable === null ? null : (
      <Button
        label={t('train.undo')}
        accessibilityLabel={t('train.undoLabel')}
        variant="ghost"
        size="sm"
        disabled={onChange === null}
        onPress={() => onChange?.(undoable.day.id, 'UNDO')}
      />
    );

  const cardio = program.cardio?.sessions.find((s) => s.weekday === weekdayOf(date) && s.place === 'AFTER_LIFT');
  const short = session?.session.short === true;
  const full =
    session !== null && short && !underWay && !stale ? (
      <Button label={t('train.full')} variant="ghost" size="sm" disabled={onChange === null} onPress={() => onChange?.(session.day.id, 'FULL')} />
    ) : null;
  const held = program.loadHeldSince !== undefined;
  const change = () => sheet({ pathname: '/today-change', params: { day: session?.day.id ?? '' } });
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
      {undo}
      {full}
      {notice}
      {shown.map(({ planned, insteadOf }) => {
        const name = exerciseName(planned.exerciseId, moves);
        // The swap names the program's move; a move swapped for today offers it back. None with nothing to swap to.
        const plannedId = insteadOf?.exerciseId ?? planned.exerciseId;
        // While a workout is under way, its moves are swapped in the workout.
        const canSwap = !underWay && session !== null && (swapChoice(session, plannedId)?.options.length ?? 0) > 0;
        const swap = canSwap ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('swap.label', { move: name })}
            onPress={() => sheet({ pathname: '/swap', params: { day: session.day.id, move: plannedId } })}
            hitSlop={tokens.space.xs}
            style={[styles.swap, { backgroundColor: color.raise }]}>
            <SymbolView name="arrow.left.arrow.right" size={tokens.type.bodySmall} tintColor={color.text} />
          </Pressable>
        ) : null;
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
            {swap}
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
  swap: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  dock: { flexDirection: 'row', gap: tokens.space.sm, alignItems: 'center' },
  grow: { flex: 1 },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
});
