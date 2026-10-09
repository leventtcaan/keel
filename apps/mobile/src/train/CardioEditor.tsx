import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type CardioDraft, canStepMinutes, cardioDraft, steppedMinutes, toggledDay } from './cardio';
import { WEEKDAYS } from './programEdit';

type Schemas = components['schemas'];

type Props = {
  program: Schemas['Program'];
  busy: boolean;
  /** The user's own cardio, sent whole (PUT /v1/program/cardio); no session turns it off. */
  onSave: (plan: Schemas['CardioPlan']) => void;
  /** Back to the coach's default (DELETE /v1/program/cardio). */
  onCoach: () => void;
};

/**
 * Edit › Cardio (K-970, ADR-074 #4, Ek 1): whose cardio it is (the coach's default or the user's own), the minutes and
 * the days, each day where it goes (after the weights, or easy on a day without them; never before, G2 K-35). Saving
 * makes it the user's own, which the engine never overwrites; "Turn cardio off" saves no session; the user's own can go
 * back to the coach's default. A session after the weights past the line gets one line of information from the server
 * (`afterLiftOverLine`), never a block. No dose is worked out here.
 */
export function CardioEditor({ program, busy, onSave, onCoach }: Props) {
  const { color } = useTheme();
  // The draft starts from the program as the server sent it; a new program (the answer to a save) starts it again.
  const [edited, setEdited] = useState<{ draft: CardioDraft; of: Schemas['Program'] } | null>(null);
  const draft = edited !== null && edited.of === program ? edited.draft : cardioDraft(program);
  const change = (next: CardioDraft) => setEdited({ draft: next, of: program });
  const own = program.cardio?.source === 'USER';
  const step = (by: number, key: 'less' | 'more') => {
    const what = t('editProgram.cardio.minutesLabel');
    const on = canStepMinutes(draft, by);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`programEditor.${key}Label`, { what })}
        accessibilityState={{ disabled: !on }}
        disabled={!on}
        onPress={() => change(steppedMinutes(draft, by))}
        style={[styles.step, !on && styles.dim]}>
        <Text style={[styles.text, styles.bold, { color: color.text }]}>{t(`programEditor.${key}`)}</Text>
      </Pressable>
    );
  };
  const coach = own ? <Button label={t('editProgram.cardio.coachDefault')} variant="ghost" disabled={busy} onPress={onCoach} /> : null;
  return (
    <View style={styles.rows}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t(own ? 'editProgram.cardio.own' : 'editProgram.cardio.coach')}</Text>
      <View style={[styles.minutes, { backgroundColor: color.surface }]}>
        {step(-1, 'less')}
        <Text accessibilityLabel={`${t('editProgram.cardio.minutesLabel')}, ${t('train.cardioMinutes', { minutes: draft.minutes })}`} style={[styles.text, styles.bold, { color: color.text }]}>
          {t('train.cardioMinutes', { minutes: draft.minutes })}
        </Text>
        {step(1, 'more')}
      </View>
      <View style={styles.chips}>
        {WEEKDAYS.map((w) => (
          <Chip
            key={w}
            label={t(`programEditor.weekdayShort.${w}`)}
            accessibilityLabel={t(`programEditor.weekdayName.${w}`)}
            selected={draft.sessions.some((s) => s.weekday === w)}
            onPress={() => change(toggledDay(draft, w, program))}
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
      <Button label={t('editProgram.cardio.save')} disabled={busy} onPress={() => onSave(draft)} />
      <Button label={t('editProgram.cardio.turnOff')} variant="ghost" disabled={busy} onPress={() => onSave({ minutes: draft.minutes, sessions: [] })} />
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
