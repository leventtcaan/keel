import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { drawingAreas, mapAreas, tipsFor } from '@/train/demo';
import { workoutParams } from '@/train/params';
import { exerciseName } from '@/train/program';
import { type Move, type TrainData, movesOf } from '@/train/trainData';

/**
 * A move's screen (K-418, ADR-017): the setup first — seat, pad, grip, kept on this phone so the move is set the same way
 * every time (G1 K-38) —, then the demo clips (filmed by hand and checked against docs/hareket-cekim-kontrol-listesi.md;
 * none has passed yet, so the screen says so and shows nothing in their place: no stand-in footage, no AI video), Güray's
 * tips for the move, and the muscles it works. Offline: the catalog and the setup are the phone's.
 */
const SIDES = ['front', 'back'] as const;
// Two drawings side by side across the screen's width (the library draws at 200 × 400 at scale 1).
const MAP_SCALE = 0.75;

export default function ExerciseScreen() {
  const { api, training, report } = useAppServices();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const { color } = useTheme();
  const [read, setRead] = useState<{ data: TrainData; own: Move[]; setup: Record<string, string> } | null>(null);
  const [typed, setTyped] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void Promise.all([training.read(api), training.own(api), training.setup(exercise)])
      .then(([data, own, setup]) => setRead({ data, own, setup }))
      .catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
  }, [api, training, exercise, report]);

  const moves = movesOf(read?.data ?? null, read?.own ?? []);
  const move = read === null ? undefined : moves.get(exercise);
  const values = typed ?? read?.setup ?? {};

  const save = async () => {
    try {
      await training.saveSetup(exercise, values);
      setSaved(true);
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
    }
  };

  const setupCard =
    move === undefined || move.setupFields.length === 0 ? null : (
      // Not on a card: a field on the card's colour does not show (simulator).
      <View style={styles.section}>
        <Text style={[styles.heading, { color: color.text }]}>{t('demo.setup')}</Text>
        <Text style={[styles.small, { color: color.muted }]}>{t('demo.setupNote')}</Text>
        {move.setupFields.map((field) => (
          <TextField
            key={field}
            label={t(`exerciseSetup.${field}.label`)}
            value={values[field] ?? ''}
            maxLength={workoutParams.setupValueMaxChars}
            onChangeText={(text) => {
              setSaved(false);
              setTyped({ ...values, [field]: text });
            }}
          />
        ))}
        <Button label={t('demo.save')} variant="ghost" size="sm" onPress={() => void save()} />
        {saved && <Text style={[styles.small, { color: color.muted }]}>{t('demo.saved')}</Text>}
      </View>
    );
  // The muscle map (ADR-017; react-native-body-highlighter, MIT): front and back, the move's areas in the accent colour
  // and every other area in the theme's track colour (the drawing's own grey does not follow the theme).
  const muscleWords = move === undefined ? '' : move.muscles.map((m) => t(`demo.muscle.${m}`)).join(t('demo.separator'));
  const marked = move === undefined ? [] : mapAreas(move);
  const areas =
    marked.length === 0
      ? []
      : [...marked, ...drawingAreas().filter((slug) => !marked.includes(slug))].map((slug) => ({
          slug: slug as Slug, // the areas named in muscle_map_areas are checked against the drawing (exercise-screen.test)
          color: marked.includes(slug) ? color.accent : color.track,
        }));
  const muscleMap =
    areas.length === 0 ? null : (
      <View style={styles.map} accessible accessibilityLabel={t('demo.mapLabel', { muscles: muscleWords })}>
        {SIDES.map((side) => (
          <Body key={side} data={areas} side={side} scale={MAP_SCALE} border="none" />
        ))}
      </View>
    );
  // Clips are filmed for the catalog's moves (ADR-017): an own move gets none, so none is promised to it.
  const clipsPending =
    move === undefined || move.name !== undefined || move.clips !== undefined ? null : (
      <Card>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('demo.clipsPending')}</Text>
      </Card>
    );
  const about =
    move === undefined ? null : (
      <>
        {clipsPending}
        <Text style={[styles.heading, { color: color.text }]}>{t('demo.tips')}</Text>
        {tipsFor(move).map((key) => (
          <Text key={key} style={[styles.text, { color: color.text }]}>
            {t(key)}
          </Text>
        ))}
        {move.muscles.length > 0 && <Text style={[styles.label, { color: color.text }]}>{t('demo.muscles')}</Text>}
        {muscleMap}
        {move.muscles.length > 0 && (
          <Text style={[styles.text, { color: color.textSecondary }]}>{muscleWords}</Text>
        )}
      </>
    );
  const unknown = read !== null && move === undefined ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('demo.unknown')}</Text> : null;

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{exerciseName(exercise, moves)}</ScreenTitle>
        {setupCard}
        {about}
        {unknown}
        <Button label={t('history.done')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  section: { gap: tokens.space.sm },
  map: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md },
  heading: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
