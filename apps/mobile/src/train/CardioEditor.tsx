import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type CardioDraft, cardioDraft, toggledDay } from './cardio';
import { MinutesStepper } from './MinutesStepper';
import { WEEKDAYS } from './programEdit';

type Schemas = components['schemas'];

type Props = {
  program: Schemas['Program'];
  /** The weekdays the program lifts on (liftDays); null when not known: then no day is taken for a rest day. */
  lifts: readonly Schemas['Weekday'][] | null;
  busy: boolean;
  /** The user's own cardio, sent whole (PUT /v1/program/cardio); a plan with no session is cardio turned off. */
  onSave: (plan: Schemas['CardioPlan']) => void;
  /** Back to the plan's default (DELETE /v1/program/cardio). */
  onCoach: () => void;
};

/** What the server's cardio is, by content: a read again that brings the same cardio keeps the user's draft. */
const cardioKey = (program: Schemas['Program']) => {
  const c = program.cardio;
  return JSON.stringify(c === undefined ? null : [c.source, c.minutes, c.sessions]);
};

/**
 * Edit › Cardio (K-970, ADR-074 #4, Ek 1; rows instead of paragraphs, Evre 7 B4): an on/off switch, the minutes, the days. A day
 * is where it is said: a filled dot under it is after the weights, a ring is an easy day without them (never before the weights,
 * G2 K-35). Whose it is: "Plan" or "Yours" (with Reset). Turning it on is the plan's own default; turning it off sends no day. Saving
 * makes it the user's own, which the engine never overwrites. The draft stays the user's until the server's cardio changes (a failed
 * save keeps it). A session after the weights past the line gets one small chip from the server (`afterLiftOverLine`), never a block.
 * No dose is worked out here.
 */
export function CardioEditor({ program, lifts, busy, onSave, onCoach }: Props) {
  const { color } = useTheme();
  const key = cardioKey(program);
  const [edited, setEdited] = useState<{ draft: CardioDraft; of: string } | null>(null);
  const draft = edited !== null && edited.of === key ? edited.draft : cardioDraft(program);
  const change = (next: CardioDraft) => setEdited({ draft: next, of: key });
  const own = program.cardio?.source === 'USER';
  const on = program.cardio !== undefined && program.cardio.sessionsPerWeek > 0;
  const flip = (value: boolean) => (value ? onCoach() : onSave({ minutes: draft.minutes, sessions: [] }));
  const reset = own ? <Button label={t('editProgram.cardio.reset')} variant="text" size="touch" disabled={busy} onPress={onCoach} /> : null;
  const long =
    program.cardio?.afterLiftOverLine === true ? (
      <View style={[styles.pill, { backgroundColor: color.accentSoft }]}>
        <Text style={[styles.pillText, { color: color.text }]}>{t('editProgram.cardio.long')}</Text>
      </View>
    ) : null;
  const switchRow = (
    <ListGroup>
      <ListRow icon="figure.run" label={t('editProgram.cardio.title')} switch={{ value: on, onValueChange: flip }} disabled={busy} />
    </ListGroup>
  );
  if (!on) return <View style={styles.rows}>{switchRow}</View>;
  return (
    <View style={styles.rows}>
      {switchRow}
      <View style={styles.whose}>
        <View style={[styles.pill, { backgroundColor: color.surface }]}>
          <Text style={[styles.pillText, { color: color.text }]}>{t(own ? 'editProgram.cardio.yours' : 'editProgram.cardio.plan')}</Text>
        </View>
        {long}
        {reset}
      </View>
      <MinutesStepper minutes={draft.minutes} onChange={(minutes) => change({ ...draft, minutes })} />
      <View style={styles.days}>
        {WEEKDAYS.map((w) => {
          const session = draft.sessions.find((s) => s.weekday === w);
          const name = t(`programEditor.weekdayName.${w}`);
          return (
            <View key={w} style={styles.day}>
              <Chip
                touch
                label={t(`programEditor.weekdayShort.${w}`).charAt(0)}
                accessibilityLabel={session === undefined ? name : t('editProgram.cardio.dayLabel', { weekday: name, place: t(`editProgram.cardio.place.${session.place}`) })}
                selected={session !== undefined}
                onPress={() => change(toggledDay(draft, w, lifts))}
              />
              <View
                testID={session === undefined ? undefined : `cardio-place-${session.place}`}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.dot,
                  session === undefined
                    ? styles.none
                    : session.place === 'AFTER_LIFT'
                      ? { backgroundColor: color.accent, borderColor: color.accent }
                      : { borderColor: color.accent },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        {(['AFTER_LIFT', 'OFF_DAY_LOW_INTENSITY'] as const).map((place) => (
          <View key={place} style={styles.key}>
            <View style={[styles.dot, place === 'AFTER_LIFT' ? { backgroundColor: color.accent, borderColor: color.accent } : { borderColor: color.accent }]} />
            <Text style={[styles.small, { color: color.muted }]}>{t(`editProgram.cardio.place.${place}`)}</Text>
          </View>
        ))}
      </View>
      <Button label={t('editProgram.cardio.save')} disabled={busy || draft.sessions.length === 0} onPress={() => onSave(draft)} />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.space.md },
  whose: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space.sm },
  pill: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs },
  pillText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  days: { flexDirection: 'row', gap: tokens.space.xs },
  day: { alignItems: 'center', gap: tokens.space.xs },
  dot: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.size.swatch / 2, borderWidth: tokens.border.outline },
  none: { borderWidth: 0 },
  legend: { flexDirection: 'row', gap: tokens.space.lg },
  key: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs },
  small: { fontSize: tokens.type.bodySmall },
});
