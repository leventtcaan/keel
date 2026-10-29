import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProblemText, announce, useProblem } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReadOnFocus } from '@/today/useReadOnFocus';
import { freeWeekdays, suggestion } from '@/train/addDay';
import { addProgramDay } from '@/train/changes';

type Weekday = Parameters<typeof addProgramDay>[1];

const SAID = { conflict: 'addDay.conflict', offline: 'addDay.offline', failed: 'addDay.failed', refused: 'addDay.conflict' } as const;
type Said = keyof typeof SAID;

/**
 * "Add a day" (ADR-090 Ek 1, K-1060): a sheet over Train and Edit, the one way a training day is added. One tap: the button adds
 * the suggested weekday (the free one with the most rest around it), a chip any other free one; the server fills the day with
 * moves (POST /v1/program/days) and the tabs read the program again. Nothing is asked of the user but the weekday.
 *
 * A day is never an empty one (Evre 7 B1): the phone asks the server whatever the program's `canAddDay` says (absent on an older
 * server and on the copy kept offline), and when it cannot be added the sheet says why and offers "Try again" for the same day.
 * There is no editor day to fall back to.
 */
export default function AddDayScreen() {
  const { api, training } = useAppServices();
  const { color } = useTheme();
  const { data, reload } = useReadOnFocus(useCallback(() => training.read(api), [api, training]));
  const [problem, setProblem, occurrence] = useProblem();
  const [busy, setBusy] = useState(false);
  // The day the last try was for, while it failed: its button reads "Try again".
  const [failed, setFailed] = useState<Weekday | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran.
  const sending = useRef(false);
  // An answer that comes once the sheet has gone closes nothing: going back then would close another screen.
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
    };
  }, []);

  const program = data?.program.state === 'ready' ? data.program.value : null;
  const free = program === null ? [] : freeWeekdays(program);
  const pick = program === null ? undefined : suggestion(program);
  const suggested = pick?.day;
  const name = (day: Weekday) => t(`programEditor.weekdayName.${day}`);

  const add = async (day: Weekday) => {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setProblem(null);
    setFailed(null);
    const answer = await addProgramDay(api, day);
    sending.current = false;
    if (!shown.current) return;
    setBusy(false);
    if (answer.kind === 'done') {
      announce(t('addDay.added', { day: name(day) }));
      router.back();
    } else {
      setFailed(day);
      setProblem(t(SAID[answer.kind as Said]));
    }
  };

  // The first read on its way, or not there at all (no connection and nothing kept): said, with the way to read again.
  const unread = data !== null && program === null;
  const others = free.filter((day) => day !== suggested);
  let body = null;
  if (data === null) body = <ActivityIndicator accessible accessibilityLabel={t('train.loading')} color={color.muted} style={styles.loading} />;
  else if (unread) {
    body = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t(data.program.state === 'failed' && data.program.problem === 'NoConnection' ? 'addDay.offline' : 'addDay.readFailed')}</Text>
        <Button label={t('addDay.retry')} onPress={reload} />
      </View>
    );
  } else if (program !== null && suggested === undefined) body = <Text style={[styles.text, { color: color.textSecondary }]}>{t('addDay.full')}</Text>;
  else if (program !== null && suggested !== undefined) {
    body = (
      <View style={styles.rows}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('addDay.hint')}</Text>
        {/* After a failure the button is the way to try the same day again; another day is still a chip away. */}
        <Button
          label={failed === suggested ? t('addDay.retry') : t('addDay.addOn', { day: name(suggested) })}
          accessibilityLabel={failed === suggested ? t('addDay.retryLabel', { day: name(suggested) }) : t('addDay.addOnLabel', { day: name(suggested) })}
          busy={busy}
          disabled={busy}
          onPress={() => void add(suggested)}
        />
        {pick !== undefined && pick.rest > 0 && <Text style={[styles.small, { color: color.muted }]}>{t('addDay.suggested')}</Text>}
        {others.length > 0 && (
          <View style={styles.rows}>
            <Text style={[styles.small, { color: color.textSecondary }]}>{t('addDay.other')}</Text>
            <View style={styles.days}>
              {others.map((day) => (
                <Chip
                  key={day}
                  label={t(`programEditor.weekdayShort.${day}`)}
                  accessibilityLabel={failed === day ? t('addDay.retryLabel', { day: name(day) }) : t('addDay.addOnLabel', { day: name(day) })}
                  touch
                  disabled={busy}
                  onPress={() => void add(day)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }
  return (
    <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: color.background }]}>
      <ScreenTitle>{t('addDay.title')}</ScreenTitle>
      {body}
      {problem !== null && (
        <ProblemText occurrence={occurrence} style={[styles.text, { color: color.text }]}>
          {problem}
        </ProblemText>
      )}
      <Button label={t('addDay.close')} variant="ghost" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: tokens.space.lg, gap: tokens.space.md },
  rows: { gap: tokens.space.sm },
  loading: { alignSelf: 'flex-start', minHeight: tokens.size.touch },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
