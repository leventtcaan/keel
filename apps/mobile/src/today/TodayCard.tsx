import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Changed, changeToday } from '@/train/changes';
import { MoveThumb } from '@/train/MoveThumb';
import { OpenElsewhere } from '@/train/OpenElsewhere';
import { workoutParams } from '@/train/params';
import { dayName, exerciseName } from '@/train/program';
import { repCount } from '@/train/reps';
import { sessionMoves } from '@/train/workout';
import { type UnitSystem, formatLoad, volumeValue } from '@/units/units';

import { type TodayCard as Card, type TodayParts, cardioLoggedToday, cardioToday } from './todayWorkout';
import { nextSession, weekdayOf } from './week';

type Schemas = components['schemas'];

/** The first moves shown with their targets (prototype `#home`: three; ADR-077 #1). */
const FIRST_MOVES = 3;

/**
 * The next session's target as the server set it, in the user's unit, written the way the session writes a set
 * (train/session.ts setText): a load with its unit ("72.5 kg × 9", as the Train tab writes it), an added load with its
 * plus ("+10 × 7"), and the body alone (a bodyweight move, or a weighted one with nothing added) as its sets and reps
 * ("3 × 7"), never "0 ×". Before a target is known, the plan ("3 × 6-10").
 */
function targetOf(planned: Schemas['PlannedExercise'], move: Schemas['Exercise'] | undefined, units: UnitSystem): string {
  const { nextLoadKg: kg, nextReps: reps } = planned;
  if (reps === undefined) return t('train.setsReps', { sets: planned.sets, reps: repCount(planned.reps) });
  if (kg === undefined || kg === 0 || move?.load === 'BODYWEIGHT') return t('train.setsReps', { sets: planned.sets, reps });
  const key = move?.load === 'BODYWEIGHT_PLUS_EXTERNAL' ? 'thisWeek.today.added' : 'thisWeek.today.target';
  return t(key, { load: formatLoad(kg, units), reps });
}

/** "8,420 kg": the load lifted, the server's sum, whole, in the user's unit. */
function lifted(kg: number, units: UnitSystem): string {
  const value = volumeValue(kg, units).toLocaleString('en-US');
  return t(units === 'METRIC' ? 'units.kg' : 'units.lb', { value });
}

type Props = {
  card: Card;
  program: Schemas['Program'] | null;
  today: string;
  parts: TodayParts | undefined;
  /** A change sent: the program as the server answered it (shown at once), or null when it did not change; read again. */
  onChanged: (changed: Schemas['Program'] | null) => void;
};

type Change = 'UNDO' | 'FULL';

/**
 * Why a change did not happen. No connection is the user's to fix; anything else not a 409 is ours. A 409 is the
 * server's "not now", and what it means depends on the change (POST /v1/program/today): UNDO, a workout of that day
 * started today; FULL, the session is not on today any more (a card left open past midnight, the week changed).
 */
function said(kind: Exclude<Changed['kind'], 'done'>, change: Change): string {
  if (kind === 'offline') return 'todayChange.offline';
  if (kind === 'failed') return 'todayChange.failed';
  return change === 'UNDO' ? 'todayChange.started' : 'todayChange.none';
}

/**
 * Today's workout on This week (K-969, prototype `#home`): today's session with its first moves and their targets, the
 * cardio line, Start, and the way to change today (K-970's page). What the user changed shows on the card itself (user
 * test 8 Oct): the short version offers "Full workout", a session moved says where it went, a skipped one says so, and
 * a move or skip the server can undo has "Undo" (K-995: FULL, UNDO, WeekSession.undoable). A workout under way on this
 * phone is continued ("Open workout · Continue", K-961); one under way elsewhere says so; one done today has its tick
 * and its facts, the server's (K-965), and no Start.
 */
export function TodayCard({ card, program, today, parts, onChanged }: Props) {
  const { api } = useAppServices();
  const { color } = useTheme();
  const units = useUnits();
  const [busy, setBusy] = useState(false);
  // Not changed, said for one read of the week: the one it happened on (no connection: nothing new to read), or, for the
  // server's "not now", the read that follows it (`next`), so the card it speaks of is the week as it now is. A new
  // read after that is a new try.
  type Program = Schemas['Program'] | null;
  const [failed, setFailed] = useState<{ read: Program | 'next'; from: Program; key: string } | null>(null);
  // The read that follows the "not now" takes the note (state adjusted while rendering, React's way for a prop change).
  if (failed?.read === 'next' && program !== failed.from) setFailed({ ...failed, read: program });
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  if (card.kind === 'none') return null;

  async function send(programDayId: string, change: Change) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    const answer = await changeToday(api, programDayId, change);
    sending.current = false;
    setBusy(false);
    if (answer.kind === 'done') {
      setFailed(null);
      // The answer is the week as changed: the card shows it at once, not the old one with live buttons.
      onChanged(answer.program);
    } else if (answer.kind === 'conflict') {
      setFailed({ read: 'next', from: program, key: said(answer.kind, change) });
      onChanged(null);
    } else {
      setFailed({ read: program, from: program, key: said(answer.kind, change) });
    }
  }
  const problem = failed !== null && failed.read === program ? <ProblemText style={[styles.fine, { color: color.textSecondary }]}>{t(failed.key)}</ProblemText> : null;
  const undo = (programDayId: string) => (
    <Button label={t('thisWeek.today.undo')} variant="text" disabled={busy} onPress={() => void send(programDayId, 'UNDO')} />
  );

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
  // K-970's page to change today, for today's session: an icon in the text role (the accent, no fill, size.touch to press), so
  // Start stays the card's one primary and the first view keeps its words (ADR-077 #1, ADR-070 Ek 2 #1).
  const change = (programDayId: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('thisWeek.today.changeLabel')}
      onPress={() => router.push({ pathname: '/today-change', params: { day: programDayId } })}
      style={({ pressed }) => [styles.icon, pressed && styles.dim]}>
      <Icon name="slider.horizontal.3" size="small" tone="accent" />
    </Pressable>
  );
  // The cardio line (prototype `.cl`): planned minutes, or done once the server says it was logged today (K-1029).
  const cardioLine = (minutes: number | null, logged: boolean, optional: boolean) =>
    logged ? (
      <View style={[styles.row, styles.cardio, { borderTopColor: color.line }]}>
        <Icon name="checkmark.circle.fill" size="small" tone="accent" testID="cardio-icon" />
        <Text style={[styles.fine, { color: color.textSecondary }]}>{t('thisWeek.today.cardioDone')}</Text>
      </View>
    ) : minutes === null ? null : (
      <View style={[styles.row, styles.cardio, { borderTopColor: color.line }]}>
        <Icon name="figure.run" size="small" tone="muted" testID="cardio-icon" />
        <Text style={[styles.fine, { color: color.textSecondary }]}>{optional ? t('thisWeek.today.cardioOptional') : t('thisWeek.today.cardio', { minutes })}</Text>
      </View>
    );

  let body: ReactNode;
  switch (card.kind) {
    case 'open': {
      // Under way on another phone (or no longer kept here): the session goes on there; this one starts none (K-995).
      // The server closes it that many hours after it started (unfinished_session_close_hours, the phone's parameter file).
      const hours = workoutParams.unfinishedSessionCloseHours;
      const sets =
        card.sets === null
          ? t('thisWeek.today.openElsewhere')
          : card.sets === 0
            ? t('thisWeek.today.openSets.none', { hours })
            : card.sets === 1
              ? t('thisWeek.today.openSets.one', { hours })
              : t('thisWeek.today.openSets.other', { count: card.sets, hours });
      const resume = card.onPhone ? <Button label={t('thisWeek.today.continue')} size="sm" onPress={() => router.push('/workout')} /> : null;
      body = (
        <>
          {head(t('thisWeek.today.open'), name(card.day), resume)}
          {fine(sets)}
          {card.onPhone || card.workoutId === null ? null : <OpenElsewhere workoutId={card.workoutId} onChanged={() => onChanged(null)} />}
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
          {head(t('thisWeek.today.today'), t('thisWeek.today.rest'), card.undoable ? undo(card.day.id) : null)}
          {fine(t('thisWeek.today.movedTo', { day: t(`onboarding.schedule.dayName.${weekdayOf(card.to)}`) }))}
        </>
      );
      break;
    case 'skipped':
      body = (
        <>
          {head(t('thisWeek.today.today'), name(card.day), card.undoable ? undo(card.day.id) : null)}
          {fine(
            parts?.checkInDay == null
              ? t('thisWeek.today.skippedNoDay')
              : t('thisWeek.today.skipped', { day: t(`onboarding.schedule.dayName.${parts.checkInDay}`) }),
          )}
        </>
      );
      break;
    case 'restWeek':
      body = head(t('thisWeek.today.today'), t('thisWeek.today.restWeek'), null);
      break;
    case 'rest': {
      // A rest day is not an empty card (T-7, prototype 5): the next session, and the cardio when it is planned today.
      const next = program === null ? null : nextSession(program.week, program.days, today);
      const nextLine =
        next === null ? null : (
          <View style={styles.row}>
            <Icon name="calendar" size="small" tone="muted" />
            <Text style={[styles.fine, { color: color.textSecondary }]}>
              {t('thisWeek.today.next', { session: name(next.day), weekday: t(`onboarding.schedule.dayName.${weekdayOf(next.date)}`) })}
            </Text>
          </View>
        );
      const minutes = program === null ? null : cardioToday(program, today);
      body = (
        <>
          {head(t('thisWeek.today.today'), t('thisWeek.today.rest'), null)}
          {nextLine}
          {cardioLine(minutes, program !== null && cardioLoggedToday(program, today), false)}
        </>
      );
      break;
    }
    case 'session': {
      const { day, session } = card;
      const short = session.short === true;
      // The card's one primary, full width at its foot (prototype 5).
      const start = (
        <Button
          label={t('thisWeek.today.start')}
          accessibilityLabel={t('thisWeek.today.startLabel', { session: name(day) })}
          onPress={() => router.push({ pathname: '/workout', params: { day: day.id } })}
        />
      );
      const minutes = program === null ? null : cardioToday(program, today);
      // Cardio already logged today is the server's word (K-1029): the row says it is done, not the plan again.
      const cardio = cardioLine(minutes, program !== null && cardioLoggedToday(program, today), short);
      // The session's own moves, as the session takes them (short version, today's swaps): one rule for both.
      const all = sessionMoves(day, program?.week, today);
      const rest = all.length - FIRST_MOVES;
      const more = rest > 0 ? <Text style={[styles.fine, { color: color.textSecondary }]}>{t('thisWeek.today.more', { count: rest })}</Text> : null;
      const moves = all
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
      // The short version says so by the way back to the full session (K-995 FULL), as the Train tab does.
      const full = short ? <Button label={t('thisWeek.today.full')} variant="text" disabled={busy} onPress={() => void send(day.id, 'FULL')} /> : null;
      body = (
        <>
          {head(
            t('thisWeek.today.today'),
            name(day),
            change(day.id),
          )}
          {moves}
          {more}
          {cardio}
          {full}
          {start}
        </>
      );
      break;
    }
  }
  return (
    <View testID="today-card" accessibilityLabel={t('thisWeek.today.label')} style={[styles.card, { backgroundColor: color.surface }]}>
      {body}
      {problem}
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
  icon: { width: tokens.size.touch, height: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  tick: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
});
