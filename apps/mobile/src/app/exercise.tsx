import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Body, { type Slug } from 'react-native-body-highlighter';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Figure, drawingAreas, mapAreas, tipsFor } from '@/train/demo';
import { workoutParams } from '@/train/params';
import { exerciseName } from '@/train/program';
import { type Move, type TrainData, movesOf } from '@/train/trainData';

/**
 * A move's screen (K-418, ADR-017, K-1065): scannable, no paragraphs. What the move is (its equipment and kind), the cues for it
 * as short bullets, the muscles it works with the map, and the setup — seat, pad, grip, kept on this phone so the move is set
 * the same way every time (G1 K-38). There are no demo clips in this version, so none is promised (the "not filmed yet" card is
 * gone). The system header carries the way back. Offline: the catalog and the setup are the phone's.
 */
const SIDES = ['front', 'back'] as const;
// Two drawings side by side across the screen's width (the library draws at 200 × 400 at scale 1).
const MAP_SCALE = 0.75;

export default function ExerciseScreen() {
  const { api, training, report, bodyFigure } = useAppServices();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const { color } = useTheme();
  const [read, setRead] = useState<{ data: TrainData; own: Move[]; setup: Record<string, string> } | null>(null);
  const [typed, setTyped] = useState<Record<string, string> | null>(null);
  // The figure the profile gives (ADR-037 › 49); not known, the one drawn until now.
  const [figure, setFigure] = useState<Figure>('male');
  useEffect(() => {
    let live = true;
    bodyFigure().then(
      (kept) => live && setFigure(kept),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [bodyFigure]);
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
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('demo.setup')}
        </Text>
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
      : [...marked, ...drawingAreas(figure).filter((slug) => !marked.includes(slug))].map((slug) => ({
          slug: slug as Slug, // the areas named in muscle_map_areas are checked against the drawing (exercise-screen.test)
          color: marked.includes(slug) ? color.accent : color.track,
        }));
  const muscleMap =
    areas.length === 0 ? null : (
      <View style={styles.map} accessible accessibilityLabel={t('demo.mapLabel', { muscles: muscleWords })}>
        {SIDES.map((side) => (
          <Body key={side} data={areas} side={side} gender={figure} scale={MAP_SCALE} border="none" />
        ))}
      </View>
    );
  const pill = (text: string) => (
    <View key={text} style={[styles.pill, { backgroundColor: color.surface }]}>
      <Text style={[styles.pillText, { color: color.text }]}>{text}</Text>
    </View>
  );
  const worked =
    move === undefined || move.muscles.length === 0 ? null : (
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
          {t('demo.muscles')}
        </Text>
        <View style={styles.pills}>{move.muscles.map((m) => pill(t(`demo.muscle.${m}`)))}</View>
        {muscleMap}
      </View>
    );
  const about =
    move === undefined ? null : (
      <>
        <View style={styles.pills}>
          {pill(t(`ownMove.equipments.${move.equipment}`))}
          {pill(t(`demo.kind.${move.kind}`))}
        </View>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>
            {t('demo.tips')}
          </Text>
          {tipsFor(move).map((key) => (
            <View key={key} style={styles.cue}>
              <View style={[styles.dot, { backgroundColor: color.accent }]} />
              <Text style={[styles.text, styles.grow, { color: color.text }]}>{t(key)}</Text>
            </View>
          ))}
        </View>
        {worked}
      </>
    );
  const unknown = read !== null && move === undefined ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('demo.unknown')}</Text> : null;

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <FormScroll contentContainerStyle={styles.body}>
        <ScreenTitle>{exerciseName(exercise, moves)}</ScreenTitle>
        {about}
        {setupCard}
        {unknown}
      </FormScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  section: { gap: tokens.space.sm },
  map: { flexDirection: 'row', justifyContent: 'center', gap: tokens.space.md },
  heading: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  grow: { flex: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  pill: { borderRadius: tokens.radius.chip, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.xs },
  pillText: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  cue: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  dot: { width: tokens.size.swatch, height: tokens.size.swatch, borderRadius: tokens.size.swatch / 2 },
});
