import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load, localDay } from '@/today/today';
import { type Entry, SetEntry } from '@/train/SetEntry';
import { SetLine } from '@/train/SetLine';
import { SupersetLine } from '@/train/SupersetLink';
import { exerciseName, shortDate } from '@/train/program';
import { supersetPartners } from '@/train/superset';
import { type Move, movesOf } from '@/train/trainData';
import { buildSet, parseEntry, setText } from '@/train/session';
import { weightInput } from '@/units/units';

type Schemas = components['schemas'];
type Problem = { at: string; text: string } | null;

const SIDES: Schemas['Side'][] = ['LEFT', 'RIGHT'];

/**
 * A past session, corrected (K-416, L3 §1 #11): a set wrongly logged deleted, a forgotten one added. The session is the
 * server's — no longer in the phone's queue — so editing is online, and says so offline. The phone's copy of a deleted
 * set is forgotten, or the history would join it back in. Records and the estimated max are derived from the sets each
 * time (ADR-033), so an edit changes them by itself; the next targets were set at the finish and stay (K-217).
 */
export default function WorkoutEditScreen() {
  const { api, training, forgetRecord, report } = useAppServices();
  const { workout } = useLocalSearchParams<{ workout: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [session, setSession] = useState<Loaded<Schemas['Workout']> | null>(null);
  const [moves, setMoves] = useState<Map<string, Move>>(() => new Map());
  const [confirming, setConfirming] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [side, setSide] = useState<Schemas['Side']>('LEFT');
  // What was typed belongs to its move, side and the session as read: a new one starts from its own suggestion.
  const [typed, setTyped] = useState<{ key: string; entry: Entry } | null>(null);
  const [problem, setProblem] = useState<Problem>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false); // two taps at once must not delete or add twice
  // One clientId per set being added, kept until it is stored: tried again after a lost answer, the server keeps one
  // (ADR-024), not two.
  const adding = useRef<string | null>(null);

  const named = useCallback((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }), [report]);
  const read = useCallback(() => load(() => api.GET('/v1/workouts/{id}', { params: { path: { id: workout } } })).then(setSession), [api, workout]);
  useEffect(() => {
    void read();
    void Promise.all([training.read(api), training.own(api)])
      .then(([data, own]) => setMoves(movesOf(data, own)))
      .catch(named);
  }, [api, training, read, named]);

  // A session under way is changed in the session itself: edited here, the phone's session and the server's would split.
  const underWay = session?.state === 'ready' && session.value.endedAt === undefined;
  const sets = session?.state === 'ready' && !underWay ? session.value.sets : [];
  // The session's moves, in the order first done; a move the catalog no longer has cannot be written (its load model).
  const order = [...new Set(sets.map((s) => s.exerciseId))].filter((id) => moves.has(id));
  const partners = supersetPartners(sets);
  const chosen = picked !== null && order.includes(picked) ? picked : (order[0] ?? null);
  const move = chosen === null ? undefined : moves.get(chosen);
  const rowSide: Schemas['Side'] = move?.unilateral === true ? side : 'BOTH';
  const workingSoFar = sets.filter((s) => s.exerciseId === chosen && s.setType === 'WORKING').length;
  // A forgotten set is most like the move's last work set of the session (that side's): the form starts from it, as the
  // session's rows start from their target — empty, the fields would not even show on the card.
  const last = sets.findLast((s) => s.exerciseId === chosen && s.setType === 'WORKING' && (s.side ?? 'BOTH') === rowSide);
  const entryKey = `${chosen ?? ''}-${rowSide}-${sets.length}`;
  const entry: Entry =
    typed !== null && typed.key === entryKey
      ? typed.entry
      : {
          load: last === undefined ? '' : weightInput(last.loadKg, units),
          reps: last === undefined ? '' : String(last.reps),
          rir: last?.rir ?? 0,
          note: null,
        };

  const remove = async (set: Schemas['LoggedSet']) => {
    if (saving.current || session?.state !== 'ready') return;
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const { response } = await api.DELETE('/v1/workouts/{id}/sets/{setId}', { params: { path: { id: session.value.id, setId: set.id } } });
      if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
      await forgetRecord(set.clientId).catch(named);
      setConfirming(null);
      await read();
    } catch (error) {
      named(error);
      setProblem({ at: set.id, text: t('sessionEdit.needsConnection') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const add = async () => {
    if (saving.current || session?.state !== 'ready' || move === undefined) return;
    const parsed = parseEntry(entry.load, entry.reps, move, units, last?.loadKg ?? null);
    if (parsed === null) {
      setProblem({ at: ADD, text: t('workout.invalid') });
      return;
    }
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      adding.current ??= newClientId();
      const body = buildSet(adding.current, move, rowSide, parsed, entry.rir, entry.note ?? undefined);
      const { response } = await api.POST('/v1/workouts/{id}/sets', { params: { path: { id: session.value.id } }, body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      adding.current = null;
      setTyped(null);
      await read();
    } catch (error) {
      named(error);
      setProblem({ at: ADD, text: t('sessionEdit.needsConnection') });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const unreadable =
    session === null || session.state === 'ready' ? null : (
      <Text style={[styles.text, { color: color.textSecondary }]}>
        {t(session.state === 'none' ? 'sessionEdit.gone' : 'sessionEdit.needsConnection')}
      </Text>
    );

  // Handed down as they are: the rows call them with their own set.
  const removeSet = (set: Schemas['LoggedSet']) => void remove(set);

  const groups = order.map((id) => {
    const each = moves.get(id) as Schemas['Exercise'];
    return (
      <Card key={id}>
        <Text style={[styles.heading, { color: color.text }]}>{exerciseName(id, moves)}</Text>
        <SupersetLine partners={partners.get(id)} moves={moves} />
        {sets
          .filter((s) => s.exerciseId === id)
          .map((s) => {
            // As the history writes it (K-415): a warm-up marked, a work set with its RIR.
            const done = setText(s, each, units);
            const line =
              s.setType === 'WARM_UP'
                ? t('history.warmUp', { set: done })
                : s.rir === undefined
                  ? done
                  : t('summary.setRir', { set: done, rir: s.rir });
            return (
              <SetLine
                key={s.id}
                line={line}
                asking={confirming === s.id}
                busy={busy}
                problem={problem !== null && problem.at === s.id ? problem.text : null}
                set={s}
                onAsk={setConfirming}
                onKeep={() => setConfirming(null)}
                onDelete={removeSet}
              />
            );
          })}
      </Card>
    );
  });

  const sideChips =
    move?.unilateral === true
      ? SIDES.map((s) => <Chip key={s} label={t(`workout.sideName.${s}`)} selected={side === s} onPress={() => setSide(s)} />)
      : null;
  const addForm =
    move === undefined ? null : (
      <Card>
        <Text style={[styles.heading, { color: color.text }]}>{t('sessionEdit.add')}</Text>
        <View style={styles.chips}>
          {order.map((id) => (
            <Chip key={id} label={exerciseName(id, moves)} selected={id === chosen} onPress={() => setPicked(id)} />
          ))}
        </View>
        <View style={styles.chips}>{sideChips}</View>
        <SetEntry
          move={move}
          index={workingSoFar}
          side={rowSide}
          entry={entry}
          onChange={(change) => setTyped({ key: entryKey, entry: { ...entry, ...change } })}
          onLog={() => void add()}
          problem={problem !== null && problem.at === ADD ? problem.text : null}
          busy={busy}
        />
      </Card>
    );

  const when =
    session?.state === 'ready' && !underWay ? (
      <Text style={[styles.small, { color: color.muted }]}>{shortDate(localDay(new Date(session.value.startedAt)))}</Text>
    ) : null;

  const underWayNote = underWay ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('sessionEdit.underWay')}</Text> : null;
  // The next targets were set at the finish (K-217) and an edit does not move them: said, not left to be found out.
  const targetsNote = sets.length > 0 ? <Text style={[styles.small, { color: color.muted }]}>{t('sessionEdit.targetsNote')}</Text> : null;

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('sessionEdit.title')}</ScreenTitle>
        {when}
        {unreadable}
        {underWayNote}
        {groups}
        {addForm}
        {targetsNote}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The add form's own key for a problem: not a set's. */
const ADD = 'add';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  set: { gap: tokens.space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  grow: { flex: 1 },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
