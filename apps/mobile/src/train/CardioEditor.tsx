import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { announce } from '@/components/ProblemText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type CardioDraft, canStepMinutes, cardioDraft, steppedMinutes, toggledDay } from './cardio';
import { WEEKDAYS } from './programEdit';

type Schemas = components['schemas'];

type Props = {
  program: Schemas['Program'];
  /** The weekdays the program lifts on (liftDays); null when not known: then no day is taken for a rest day. */
  lifts: readonly Schemas['Weekday'][] | null;
  busy: boolean;
  /** The user's own cardio, sent whole (PUT /v1/program/cardio); no session turns it off. */
  onSave: (plan: Schemas['CardioPlan']) => void;
  /** Back to the coach's default (DELETE /v1/program/cardio). */
  onCoach: () => void;
};

/** What the server's cardio is, by content: a read again that brings the same cardio keeps the user's draft. */
const cardioKey = (program: Schemas['Program']) => {
  const c = program.cardio;
  return JSON.stringify(c === undefined ? null : [c.source, c.minutes, c.sessions]);
};

/**
 * Edit › Cardio (K-970, ADR-074 #4, Ek 1): whose cardio it is (the coach's default or the user's own), the minutes and
 * the days, each day where it goes (after the weights, or easy on a day without them; never before, G2 K-35). Saving
 * makes it the user's own, which the engine never overwrites; with no day chosen there is nothing to save, and only
 * "Turn cardio off" (shown while there is cardio) sends no day; the user's own can go back to the coach's default. The
 * draft stays the user's until the server's cardio changes (a failed save keeps it). A session after the weights past
 * the line gets one line of information from the server (`afterLiftOverLine`), never a block. No dose is worked out here.
 */
export function CardioEditor({ program, lifts, busy, onSave, onCoach }: Props) {
  const { color } = useTheme();
  const key = cardioKey(program);
  const [edited, setEdited] = useState<{ draft: CardioDraft; of: string } | null>(null);
  const draft = edited !== null && edited.of === key ? edited.draft : cardioDraft(program);
  const change = (next: CardioDraft) => setEdited({ draft: next, of: key });
  const own = program.cardio?.source === 'USER';
  const on = program.cardio !== undefined && program.cardio.sessionsPerWeek > 0;
  const minutes = t('train.cardioMinutes', { minutes: draft.minutes });
  const stepTo = (by: number) => {
    const next = steppedMinutes(draft, by);
    change(next);
    announce(t('train.cardioMinutes', { minutes: next.minutes }));
  };
  const step = (by: number, which: 'less' | 'more') => {
    const can = canStepMinutes(draft, by);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`programEditor.${which}Label`, { what: t('editProgram.cardio.minutesLabel') })}
        accessibilityState={{ disabled: !can }}
        disabled={!can}
        onPress={() => stepTo(by)}
        style={[styles.step, !can && styles.dim]}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{t(`programEditor.${which}`)}</Text>
      </Pressable>
    );
  };
  const turnOff = on ? (
    <Button label={t('editProgram.cardio.turnOff')} variant="ghost" disabled={busy} onPress={() => onSave({ minutes: draft.minutes, sessions: [] })} />
  ) : null;
  const coach = own ? <Button label={t('editProgram.cardio.coachDefault')} variant="ghost" disabled={busy} onPress={onCoach} /> : null;
  return (
    <View style={styles.rows}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t(own ? 'editProgram.cardio.own' : 'editProgram.cardio.coach')}</Text>
      <View style={[styles.minutes, { backgroundColor: color.surface }]}>
        {step(-1, 'less')}
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('editProgram.cardio.minutesLabel')}
          accessibilityValue={{ text: minutes }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const by = event.nativeEvent.actionName === 'increment' ? 1 : -1;
            if (canStepMinutes(draft, by)) stepTo(by);
          }}>
          <Text style={[styles.text, styles.bold, { color: color.text }]}>{minutes}</Text>
        </View>
        {step(1, 'more')}
      </View>
      <View style={styles.chips}>
        {WEEKDAYS.map((w) => (
          <Chip
            key={w}
            touch
            label={t(`programEditor.weekdayShort.${w}`)}
            accessibilityLabel={t(`programEditor.weekdayName.${w}`)}
            selected={draft.sessions.some((s) => s.weekday === w)}
            onPress={() => change(toggledDay(draft, w, lifts))}
          />
        ))}
      </View>
      {draft.sessions.map((s) => (
        <Text key={s.weekday} style={[styles.text, { color: color.text }]}>
          {t('editProgram.cardio.dayRow', { weekday: t(`programEditor.weekdayShort.${s.weekday}`), place: t(`editProgram.cardio.place.${s.place}`) })}
        </Text>
      ))}
      {program.cardio?.afterLiftOverLine === true && (
        <Text style={[styles.small, { color: color.textSecondary }]}>{t('decision.rule.cardio_after_lift_over_line')}</Text>
      )}
      <Button label={t('editProgram.cardio.save')} disabled={busy || draft.sessions.length === 0} onPress={() => onSave(draft)} />
      {turnOff}
      {coach}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.space.sm },
  minutes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: tokens.radius.button },
  step: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  bold: { fontWeight: tokens.weight.semibold },
  small: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
