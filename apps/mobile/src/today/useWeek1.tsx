import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import type { ChangeRow } from './callChanges';
import { type DayCall, type Weekday, dayCall, freeDays, moveDays, trainingWeekdays } from './week1';
import { type Loaded, load } from './today';

type Schemas = components['schemas'];

const SAID = {
  conflict: 'callScreen.week1.stale',
  offline: 'callScreen.week1.offline',
  failed: 'callScreen.week1.failed',
} as const;
const REPORTED = { conflict: 'DaysConflict', offline: 'DaysOffline', failed: 'DaysFailed' } as const;

const short = (day: Weekday) => t(`programEditor.weekdayShort.${day}`);
const full = (day: Weekday) => t(`programEditor.weekdayName.${day}`);
const row = (id: string, label: string, from: string | null, to: string): ChangeRow => ({
  id,
  kind: from === null ? 'new' : 'change',
  label,
  from,
  to,
  spoken: from === null ? t('callScreen.changes.spokenValue', { what: label, to }) : t('callScreen.changes.spoken', { what: label, from, to }),
});

export type Week1 = {
  /** What the call changes, in the days (the server's `changes` are empty for it). */
  rows: ChangeRow[];
  /** The buttons under the call. */
  dock: ReactNode;
  /** Said under the call: why the days were not saved. */
  note: ReactNode;
  /** "Change it": the days to pick from, in place of the call. */
  changing: ReactNode | null;
};

/**
 * The call that closes the first week (K-978, ADR-077 #4, Ek 1 and Ek 4; prototype #week1 and #w1change). The days come
 * filled with what the server suggested (`suggested`): "Sounds right" saves them, "Change it" lets the user pick others
 * (any day the program does not train on), then "Done". The save is the program's days by their ids (PATCH /v1/program,
 * K-995 B). Null for every other call, and for one whose missed days are no training days any more (already moved).
 * One more day has no day to add by itself on the server: it is picked in the training days.
 */
export function useWeek1(decision: Schemas['Decision'] | null): Week1 | null {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const call: DayCall | null = decision === null ? null : dayCall(decision);
  const moving = call?.kind === 'move';
  const [program, setProgram] = useState<Loaded<Schemas['Program']> | null>(null);
  // The days the user picked, by the place of the missed day they stand for; none: the server's suggestion.
  const [picks, setPicks] = useState<Record<number, Weekday>>({});
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  const id = decision?.id;

  useEffect(() => {
    if (!moving) return;
    let live = true;
    void load(() => api.GET('/v1/program')).then((found) => {
      if (live) setProgram(found);
    });
    return () => {
      live = false;
    };
  }, [api, moving, id]);

  if (call === null) return null;

  if (call.kind === 'add') {
    const day = call.suggested[0];
    return {
      rows: [row('days', t('callScreen.week1.daysLabel'), null, String(call.toDays)), ...(day === undefined ? [] : [row('suggested', t('callScreen.week1.suggestedDay'), null, short(day))])],
      dock: (
        <View style={styles.dock}>
          <Button label={t('callScreen.week1.pickDay')} onPress={() => router.push('/edit-program?part=days')} />
          <Button label={t('callScreen.gotIt')} variant="ghost" onPress={() => router.back()} />
        </View>
      ),
      note: null,
      changing: null,
    };
  }

  const { missed, suggested } = call;
  // Already moved: no missed day is a training day any more (the call is still the week's, the days are done).
  if (program?.state === 'ready') {
    const training = new Set(trainingWeekdays(program.value));
    if (missed.every((day) => !training.has(day))) return null;
  }
  const chosen: (Weekday | undefined)[] = missed.map((_, i) => picks[i] ?? suggested[i]);
  const picked = Object.keys(picks).length > 0;
  const complete = chosen.every((day) => day !== undefined);

  const rows = missed.map((from, i) => {
    const to = chosen[i];
    return row(from, t('callScreen.week1.session', { day: short(from) }), short(from), to === undefined ? t('callScreen.week1.noDay') : short(to));
  });

  async function save() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    try {
      let current = program;
      if (current?.state !== 'ready') {
        current = await load(() => api.GET('/v1/program'));
        setProgram(current);
      }
      if (current.state !== 'ready') {
        const kind = current.state === 'failed' && current.problem === 'NoConnection' ? 'offline' : 'failed';
        report({ name: REPORTED[kind] });
        setProblem(t(SAID[kind]));
        return;
      }
      const moves = missed.flatMap((from, i) => {
        const to = chosen[i];
        return to === undefined ? [] : [{ from, to }];
      });
      const result = await moveDays(api, current.value, moves);
      if (result.kind === 'done') {
        announce(t('callScreen.week1.saved'));
        router.back();
        return;
      }
      report({ name: REPORTED[result.kind] });
      setProblem(t(SAID[result.kind]));
      // The program changed under the choice: read it again, so what is offered is what is there.
      if (result.kind === 'conflict') setProgram(await load(() => api.GET('/v1/program')));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const free = program?.state === 'ready' ? freeDays(program.value) : [];
  const suggestion = suggested
    .map((to, i) => t('callScreen.week1.suggestion', { to: full(to), from: full(missed[i]) }))
    .join(t('callScreen.week1.join'));
  // Built outside the JSX children (the raw-text guard reads them).
  const hint = suggested.length === 0 ? null : <Text style={[styles.text, { color: color.textSecondary }]}>{t('callScreen.week1.changeHint', { suggestion })}</Text>;
  const keepSuggestion =
    suggested.length === 0 ? null : (
      <Button
        label={t('callScreen.week1.keepSuggestion')}
        variant="ghost"
        onPress={() => {
          setPicks({});
          setChanging(false);
        }}
      />
    );
  const picker = changing ? (
    <ScrollView contentContainerStyle={styles.change}>
      <ScreenTitle>{t('callScreen.week1.changeTitle')}</ScreenTitle>
      {hint}
      {keepSuggestion}
      {missed.map((from, i) => (
        <View key={from} style={styles.group}>
          <Text style={[styles.head, { color: color.text }]}>{t('callScreen.week1.moveHead', { day: full(from) })}</Text>
          <View style={styles.days}>
            {free
              .filter((day) => !chosen.some((other, j) => j !== i && other === day))
              .map((day) => (
                <Chip key={day} label={full(day)} selected={chosen[i] === day} touch onPress={() => setPicks((now) => ({ ...now, [i]: day }))} />
              ))}
          </View>
        </View>
      ))}
      <Button label={t('callScreen.week1.done')} onPress={() => setChanging(false)} />
      <Button label={t('callScreen.keep')} variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  ) : null;

  return {
    rows,
    dock: (
      <View style={styles.dock}>
        <Button label={t(picked ? 'callScreen.week1.done' : 'callScreen.week1.soundsRight')} disabled={busy || !complete} onPress={() => void save()} />
        <Button label={t('callScreen.week1.changeIt')} variant="ghost" disabled={busy} onPress={() => setChanging(true)} />
      </View>
    ),
    note: problem === null ? null : (
      <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
        {problem}
      </ProblemText>
    ),
    changing: picker,
  };
}

const styles = StyleSheet.create({
  dock: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg, gap: tokens.space.sm },
  change: { padding: tokens.space.lg, gap: tokens.space.md },
  group: { gap: tokens.space.sm },
  head: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
