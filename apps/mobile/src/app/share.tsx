import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { windowFrom } from '@/progress/strength';
import { type CardFacts, cardText, strengthFact } from '@/share/card';
import { ShareCard } from '@/share/ShareCard';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load, localDay } from '@/today/today';
import { sessionsOf } from '@/train/history';
import { historyFrom, movesOf } from '@/train/trainData';

type Schemas = components['schemas'];

/**
 * Share your progress (K-612, L3 Y5): started by the user, never offered on its own. The card is made on this phone from
 * what the app already shows — the record (K-608), the latest call, the strength chart's lift (K-604) — and the weight
 * trend only when the user turns it on. It is drawn here and handed to the share sheet as an image; the screen only
 * reads, and the app sends the image nowhere.
 */
export default function ShareScreen() {
  const { api, training, workoutRecords, shareImage, report } = useAppServices();
  const units = useUnits();
  const { color } = useTheme();
  const { width } = useWindowDimensions();
  const [facts, setFacts] = useState<CardFacts | null>(null);
  const [showWeight, setShowWeight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // A part the server could not give (offline): said, so an empty card is not read as "nothing yet".
  const [partial, setPartial] = useState(false);
  const card = useRef<Svg>(null);

  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      const today = localDay(now);
      const trend = { params: { query: { from: windowFrom(today), to: today } } };
      void Promise.all([
        load(() => api.GET('/v1/consistency')),
        load(() => api.GET('/v1/decisions/current')),
        load(() => api.GET('/v1/weight-trend', trend)),
        training.read(api),
        training.own(api),
        training.history(api, now),
        workoutRecords(),
      ])
        .then(([consistency, call, weights, data, own, history, records]) => {
          const sessions = sessionsOf(history.state === 'ready' ? history.value : null, records, historyFrom(now));
          setPartial([consistency, call, weights].some((read) => read.state === 'failed'));
          setFacts({
            consistency: consistency.state === 'ready' ? consistency.value : null,
            latestCall: call.state === 'ready' ? call.value : null,
            strength: strengthFact(movesOf(data, own), sessions, today),
            weight: weights.state === 'ready' ? trendChange(weights.value) : null,
          });
        })
        .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    }, [api, training, workoutRecords, report]),
  );

  const text = facts === null ? null : cardText(facts, units, showWeight);
  const share = () => {
    if (busy || card.current === null) return;
    setBusy(true);
    setFailed(false);
    card.current.toDataURL((base64) => {
      shareImage(base64)
        .catch((error: unknown) => {
          report({ name: error instanceof Error ? error.name : 'Unknown' });
          setFailed(true);
        })
        .finally(() => setBusy(false));
    });
  };

  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const weightSwitch =
    facts?.weight == null ? null : (
      <View style={styles.row}>
        <View style={styles.words}>
          <Text style={[styles.text, { color: color.text }]}>{t('share.showWeight')}</Text>
          <Text style={[styles.small, { color: color.muted }]}>{t('share.weightNote')}</Text>
        </View>
        <Switch accessibilityLabel={t('share.showWeight')} value={showWeight} onValueChange={setShowWeight} />
      </View>
    );
  const shareable =
    text === null ? null : text.lines.length === 0 ? (
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.nothing')}</Text>
    ) : (
      <View style={styles.part}>
        <ShareCard ref={card} text={text} width={width - 2 * tokens.space.lg} />
        {weightSwitch}
        {failed && <Failed />}
        <Button label={t('share.share')} disabled={busy} onPress={share} />
      </View>
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('share.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.note')}</Text>
        {partial && <Text style={[styles.small, { color: color.muted }]}>{t('share.partial')}</Text>}
        {shareable}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The trend's first and last point in the window: what it was and what it is, both measured, and since when. */
function trendChange(points: Schemas['TrendPoint'][]): CardFacts['weight'] {
  if (points.length < 2) return null;
  return { fromKg: points[0].kg, toKg: points[points.length - 1].kg, since: points[0].day };
}

function Failed() {
  const { color } = useTheme();
  return <ProblemText style={[styles.text, { color: color.text }]}>{t('share.failed')}</ProblemText>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
  words: { flex: 1, gap: tokens.space.xs },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
