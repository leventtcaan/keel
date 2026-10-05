import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { Confirm } from '@/settings/Confirm';
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
 * on this phone, and deleting them all, asked first. The reminder is this card, not a notification (ADR-036: three types).
 * Reads only the photos folder (V1).
 */
export function PhotoCard({ today, flowWeek }: Props) {
  const { photos, report } = useAppServices();
  const { color } = useTheme();
  const [checks, setChecks] = useState<PhotoCheck[] | null>(null);
  const [asking, setAsking] = useState(false);
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
    setAsking(false);
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
  const deleting =
    checks.length === 0 ? null : asking ? (
      <Confirm
        body={t('photos.deleteBody')}
        confirmLabel={t('photos.deleteConfirm')}
        keepLabel={t('photos.deleteKeep')}
        onConfirm={() => void remove()}
        onKeep={() => setAsking(false)}
        busy={false}
      />
    ) : (
      <Button label={t('photos.delete')} variant="ghost" size="sm" onPress={() => setAsking(true)} />
    );

  return (
    <Card testID="photo-card">
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('photos.title')}
      </Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{windowText(photoWindow(last, today, flowWeek))}</Text>
      {count}
      <Button label={t('photos.take')} onPress={() => router.push('/photo-capture')} />
      {POSES.some((pose) => comparison(checks, pose) !== null) && <CompareLink />}
      {deleting}
      {failures > 0 && (
        <ProblemText style={[styles.text, { color: color.text }]} occurrence={failures}>
          {t('photos.deleteFailed')}
        </ProblemText>
      )}
    </Card>
  );
}

/** The way to the comparison anchor (K-602): only with two days of one pose to set side by side. */
function CompareLink() {
  return <Button label={t('photos.compare')} variant="ghost" size="sm" onPress={() => router.push('/compare')} />;
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
