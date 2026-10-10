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
import { addProgramDay } from '@/train/changes';

import type { ChangeRow } from './callChanges';
import { type DayCall, type Saved, SERVER_ADDS_FROM_DAYS, type Weekday, dayCall, freeDays, moveDays, trainingWeekdays } from './week1';
import { type Loaded, load } from './today';

type Schemas = components['schemas'];

const SAID = {
  conflict: 'callScreen.week1.stale',
  refused: 'callScreen.week1.refused',
  offline: 'callScreen.week1.offline',
  failed: 'callScreen.week1.failed',
} as const;
const REPORTED = { conflict: 'DaysConflict', refused: 'DaysRefused', offline: 'DaysOffline', failed: 'DaysFailed' } as const;

/** A place to fill with a day: where it goes in the picker, what the group says, the day it holds now. */
type Slot = { key: string; head: string; chosen: Weekday | undefined };
/** The key of the one slot of the "add a day" call (the move call's slots are keyed by the missed day). */
const NEW_DAY = 'new';

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
 * K-995 B; the program edit of K-970). Null for every other call; for one whose missed days are no training days any
 * more (already moved) there is nothing to pick, only what could not be saved, said. A missed day the program no longer
 * trains on (moved elsewhere already) is left out, the others stay. One more day: the same way, with the suggested
 * weekday filled: for a program of two days the server adds the chosen weekday with its content (POST /v1/program/days,
 * K-1012); for any other count, or when the server says no (409), the day is added in the training days.
 */
export function useWeek1(decision: Schemas['Decision'] | null): Week1 | null {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const call: DayCall | null = decision === null ? null : dayCall(decision);
  // Both day calls read the program: the move call to offer its free days, the add call to know how many days it has.
  const reads = call !== null;
  const [program, setProgram] = useState<Loaded<Schemas['Program']> | null>(null);
  // The days the user picked, by the slot each stands for: the missed day (not its place in the list: a missed day can drop
  // out when the program is read again, the others keep their picks), or the one new day; none: the server's suggestion.
  const [picks, setPicks] = useState<Partial<Record<string, Weekday>>>({});
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem, occurrence] = useProblem();
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);
  const id = decision?.id;

  useEffect(() => {
    if (!reads) return;
    let live = true;
    void load(() => api.GET('/v1/program')).then((found) => {
      if (live) setProgram(found);
    });
    return () => {
      live = false;
    };
  }, [api, reads, id]);

  if (call === null) return null;

  // Built outside the JSX children (the raw-text guard reads them).
  const note =
    problem === null ? null : (
      <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
        {problem}
      </ProblemText>
    );

  // The program as it is now, read again when it was not (or could not be) read for the choice; null: said why not.
  async function readProgram(): Promise<Schemas['Program'] | null> {
    let current = program;
    if (current?.state !== 'ready') {
      current = await load(() => api.GET('/v1/program'));
      setProgram(current);
    }
    if (current.state === 'ready') return current.value;
    const kind = current.state === 'failed' && current.problem === 'NoConnection' ? 'offline' : 'failed';
    report({ name: REPORTED[kind] });
    setProblem(t(SAID[kind]));
    return null;
  }

  // What both calls share: the places to fill with a day (a missed session's new day; the new day), the rows that show
  // them, the suggestion said in "Change it", and what "Sounds right" / "Done" sends.
  let slots: Slot[];
  let suggestion: string;
  let rows: ChangeRow[];
  let submit: () => Promise<void>;
  let leave: ReactNode = null;

  if (call.kind === 'add') {
    const suggestedDay = call.suggested[0];
    const day = picks[NEW_DAY] ?? suggestedDay;
    slots = [{ key: NEW_DAY, head: t('callScreen.week1.addHead'), chosen: day }];
    suggestion = suggestedDay === undefined ? '' : t('callScreen.week1.suggestionAdd', { day: full(suggestedDay) });
    rows = [row('days', t('callScreen.week1.daysLabel'), null, String(call.toDays)), row('new', t('callScreen.week1.newDay'), null, day === undefined ? t('callScreen.week1.noDay') : short(day))];
    leave = <Button label={t('callScreen.gotIt')} variant="ghost" disabled={busy} onPress={() => router.back()} />;
    // The server fills the new day from the program's own generator, but only for a program of two days (K-1012); any
    // other count, or its 409 (a user's own program, a taken day): the day is added in the program editor.
    const edit = () => router.push('/edit-program?part=days');
    submit = async () => {
      if (sending.current || day === undefined) return;
      sending.current = true;
      setBusy(true);
      setProblem(null);
      try {
        const current = await readProgram();
        if (current === null) return;
        if (current.days.length !== SERVER_ADDS_FROM_DAYS) return edit();
        const result = await addProgramDay(api, day);
        if (result.kind === 'done') {
          setProgram({ state: 'ready', value: result.program });
          announce(t('callScreen.week1.saved'));
          router.back();
        } else if (result.kind === 'conflict') {
          edit();
        } else {
          report({ name: REPORTED[result.kind] });
          setProblem(t(SAID[result.kind]));
        }
      } finally {
        sending.current = false;
        setBusy(false);
      }
    };
  } else {
    // A missed day the program no longer trains on has been moved elsewhere already: nothing to move, its suggestion goes
    // with it (each suggestion stays with its own missed day).
    const training = program?.state === 'ready' ? new Set(trainingWeekdays(program.value)) : null;
    const left = call.missed.map((from, i) => ({ from, to: call.suggested[i] })).filter(({ from }) => training === null || training.has(from));
    // All moved (the call is still the week's, the days are done): no days to pick; a note from a save that failed stays.
    if (training !== null && left.length === 0) return problem === null ? null : { rows: [], dock: null, note, changing: null };
    slots = left.map(({ from, to }) => ({ key: from, head: t('callScreen.week1.moveHead', { day: full(from) }), chosen: picks[from] ?? to }));
    suggestion = left.flatMap(({ from, to }) => (to === undefined ? [] : [t('callScreen.week1.suggestion', { to: full(to), from: full(from) })])).join(t('callScreen.week1.join'));
    rows = left.map(({ from }, i) => {
      const to = slots[i].chosen;
      return row(from, t('callScreen.week1.session', { day: short(from) }), short(from), to === undefined ? t('callScreen.week1.noDay') : short(to));
    });
    submit = async () => {
      if (sending.current) return;
      sending.current = true;
      setBusy(true);
      setProblem(null);
      try {
        const current = await readProgram();
        if (current === null) return;
        // The program as it is now: a missed day it no longer trains on has nothing to move.
        const trained = new Set(trainingWeekdays(current));
        const moves = left.flatMap(({ from }, i) => {
          const to = slots[i].chosen;
          return to === undefined || !trained.has(from) ? [] : [{ from, to }];
        });
        const result: Saved = moves.length === 0 ? { kind: 'conflict' } : await moveDays(api, current, moves);
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
    };
  }

  const picked = slots.some(({ key }) => picks[key] !== undefined);
  const complete = slots.every(({ chosen }) => chosen !== undefined);
  const free = program?.state === 'ready' ? freeDays(program.value) : [];
  const hint = suggestion === '' ? null : <Text style={[styles.text, { color: color.textSecondary }]}>{t('callScreen.week1.changeHint', { suggestion })}</Text>;
  const keepSuggestion =
    suggestion === '' ? null : (
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
      {slots.map(({ key, head, chosen }, i) => (
        <View key={key} style={styles.group}>
          <Text style={[styles.head, { color: color.text }]}>{head}</Text>
          <View style={styles.days}>
            {free
              .filter((day) => !slots.some((other, j) => j !== i && other.chosen === day))
              .map((day) => (
                <Chip key={day} label={full(day)} selected={chosen === day} touch onPress={() => setPicks((now) => ({ ...now, [key]: day }))} />
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
        <Button label={t(picked ? 'callScreen.week1.done' : 'callScreen.week1.soundsRight')} disabled={busy || !complete} onPress={() => void submit()} />
        <Button label={t('callScreen.week1.changeIt')} variant="ghost" disabled={busy} onPress={() => setChanging(true)} />
        {leave}
      </View>
    ),
    note,
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
