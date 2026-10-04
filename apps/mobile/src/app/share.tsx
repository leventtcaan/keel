import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import type Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('share.title')}</ScreenTitle>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.note')}</Text>
        {text !== null && text.lines.length === 0 && <Text style={[styles.text, { color: color.textSecondary }]}>{t('share.nothing')}</Text>}
        {text !== null && text.lines.length > 0 && (
          <View style={styles.part}>
            <ShareCard ref={card} text={text} width={width - 2 * tokens.space.lg} />
            <View style={styles.row}>
              <View style={styles.words}>
                <Text style={[styles.text, { color: color.text }]}>{t('share.showWeight')}</Text>
                <Text style={[styles.small, { color: color.muted }]}>{t('share.weightNote')}</Text>
              </View>
              <Switch accessibilityLabel={t('share.showWeight')} value={showWeight} onValueChange={setShowWeight} />
            </View>
            {failed && <Failed />}
            <Button label={t('share.share')} disabled={busy} onPress={share} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The trend's first and last point in the window: what it was and what it is, both measured. */
function trendChange(points: Schemas['TrendPoint'][]): CardFacts['weight'] {
  if (points.length < 2) return null;
  return { fromKg: points[0].kg, toKg: points[points.length - 1].kg };
}

function Failed() {
  const { color } = useTheme();
  return <Text style={[styles.text, { color: color.text }]}>{t('share.failed')}</Text>;
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
