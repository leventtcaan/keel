import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { askFirst } from '@/settings/askFirst';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { shortDate } from '@/train/program';

import { comparison } from './compare';
import { type PhotoCheck, POSES } from './library';
import { type PhotoWindow, photoWindow } from './window';

function windowText(window: PhotoWindow): string {
  switch (window.kind) {
    case 'first':
      return t('photos.first', { week: window.week });
    case 'firstDue':
      return t('photos.firstDue');
    case 'anytime':
      return t('photos.anytime');
    case 'next':
      return t('photos.next', { date: shortDate(window.opensOn) });
    case 'open':
      return t('photos.open', { date: shortDate(window.since) });
  }
}

type Props = {
  /** Today on the phone's calendar. */
  today: string;
  /** The week of the first eight, 'over' after them, null if it can't be read (the screen reads it: nothing here calls the API). */
  flowWeek: number | 'over' | null;
};

/**
 * Photos on Progress (K-614): the window for the next one — open since a day, never "late" (U7, H1 §2.5) — the photo days
 * on this phone, and deleting them all, asked first in a system alert. The reminder is this card, not a notification (ADR-036: three types).
 * Reads only the photos folder (V1).
 */
export function PhotoCard({ today, flowWeek }: Props) {
  const { photos, report } = useAppServices();
  const { color } = useTheme();
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
  // A count, not a flag: a second failure is a new showing, said again (K-815).
  const [failures, setFailures] = useState(0);

  const read = useCallback(
    () =>
      photos
        .checks()
        .then(setChecks)
        .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' })),
    [photos, report],
  );
  // Read whenever Progress comes into view: back from taking photos (K-601), the card shows them.
  useFocusEffect(
    useCallback(() => {
      void read();
    }, [read]),
  );

  const remove = async () => {
    try {
      await photos.forget();
      setFailures(0);
    } catch (error) {
      setFailures((n) => n + 1);
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
    await read();
  };

  if (checks === null) return null;
  const last = checks.length === 0 ? null : checks[checks.length - 1].takenOn;
  // Built outside the JSX below (the raw-text guard reads JSX children).
  const count =
    checks.length === 0 ? null : (
      <Text style={[styles.small, { color: color.muted }]}>{t(`photos.count.${checks.length === 1 ? 'one' : 'other'}`, { count: checks.length })}</Text>
    );
  // The question is the system's alert (ADR-087 #1, K-1057): on the screen wherever Progress is scrolled, never under the tab bar.
  const ask = () =>
    askFirst({
      title: t('photos.deleteTitle'),
      body: t('photos.deleteBody'),
      confirmLabel: t('photos.deleteConfirm'),
      keepLabel: t('photos.deleteKeep'),
      onConfirm: () => void remove(),
    });
  const deleting =
    checks.length === 0 ? null : (
      <View style={styles.remove}>
        <Button label={t('photos.delete')} variant="destructive" size="sm" onPress={ask} />
      </View>
    );

  const window = photoWindow(last, today, flowWeek);
  // One row near the top of Progress (ADR-094 Ek 3 #2): on the suggested action's ground while a photo is asked for now,
  // on the quiet one while the window has not opened.
  const ground = ASKED.includes(window.kind) ? color.tintSuggest : color.tintDay;
  return (
    <View testID="photo-card" style={[styles.card, { backgroundColor: ground }]}>
      <View testID="photo-row" style={styles.row}>
        <View style={styles.words}>
          <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
            {t('photos.title')}
          </Text>
          <Text style={[styles.small, { color: color.textSecondary }]}>{windowText(window)}</Text>
        </View>
        <Button label={t('photos.take')} size="sm" onPress={() => router.push('/photo-capture')} />
      </View>
      {count}
      {POSES.some((pose) => comparison(checks, pose) !== null) && <CompareLink />}
      {deleting}
      {failures > 0 && (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={failures}>
          {t('photos.deleteFailed')}
        </ProblemText>
      )}
    </View>
  );
}

/** The windows in which a photo is asked for now: due, offered any time, open since a day. */
const ASKED: readonly PhotoWindow['kind'][] = ['firstDue', 'anytime', 'open'];

/** The way to the comparison anchor (K-602): only with two days of one pose to set side by side. */
function CompareLink() {
  return <Button label={t('photos.compare')} variant="secondary" onPress={() => router.push('/compare')} />;
}

const styles = StyleSheet.create({
  // Apart from the primary above it: a destructive action is not one tap away from Take photos.
  remove: { marginTop: tokens.space.md, alignItems: 'flex-start' },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  card: { borderRadius: tokens.radius.card, padding: tokens.space.md, gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  words: { flex: 1, gap: tokens.space.xs },
  title: { ...tokens.face.display, fontSize: tokens.type.body },
});
