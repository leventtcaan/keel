import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RangeText } from '@/components/RangeText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { type Seen, updateNote, widthFactor } from '@/projection/projection';
import { Silhouette } from '@/projection/Silhouette';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type Loaded, load, weekdayDate } from '@/today/today';
import { type UnitSystem, weightInput } from '@/units/units';

type Projection = components['schemas']['Projection'];
type Scenario = NonNullable<Projection['scenarios']>[number];
type Note = NonNullable<ReturnType<typeof updateNote>>;

const PERCENT = 100;
// The scenario the figure and the update follow: the middle one, "80 % of planned days" (H2 §4.4).
const FIGURE_SHARE = 0.8;

/**
 * The shape projection (K-606, U12, prototype 4.5). Off unless turned on here; turning it on goes through the SCOFF
 * questions first (ADR-050), and after "off" there the switch cannot be turned on. On, the server's numbers (ADR-052) are
 * drawn: a faceless figure toward the goal, three scenarios as ranges, and an update said as the model's — with two ways from
 * there when it moved away from the goal, never a reason to blame (H2 §4.5).
 */
export default function ProjectionScreen() {
  const { api, projection, projectionSwitch, report } = useAppServices();
  const { color } = useTheme();
  const [on, setOn] = useState(projectionSwitch.on());
  const [access, setAccess] = useState(projection.current());
  const [read, setRead] = useState<Loaded<Projection> | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [failed, setFailed] = useState(false);
  // Set when the switch sent the person to the questions; read when the screen is back in focus.
  const asked = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setAccess(projection.current());
      if (!asked.current) return;
      asked.current = false;
      void projectionSwitch.turnOn().then((turned) => turned && setOn(true), (error: unknown) => reportByName(report, error));
    }, [projection, projectionSwitch, report]),
  );

  useEffect(() => {
    if (!on) return;
    let live = true;
    void load(() => api.GET('/v1/projection')).then(async (loaded) => {
      if (!live) return;
      setRead(loaded);
      const value = loaded.state === 'ready' ? loaded.value : null;
      const followed = value?.shown ? figureScenario(value.scenarios ?? []) : undefined;
      if (value?.direction === undefined || followed === undefined) return;
      const seen: Seen = { adherence: followed.adherence, kg: followed.kg, low: followed.lowKg, high: followed.highKg };
      setNote(updateNote(projectionSwitch.lastSeen(), seen, value.direction));
      // Not kept: the same update is said again next time — reported, never in the way.
      await projectionSwitch.remember(seen).catch((error: unknown) => reportByName(report, error));
    });
    return () => {
      live = false;
    };
  }, [api, on, projectionSwitch, report]);

  const flip = async (wanted: boolean) => {
    setFailed(false);
    try {
      if (!wanted) {
        await projectionSwitch.turnOff();
        setOn(false);
        setRead(null);
        setNote(null);
        return;
      }
      if (projection.current() === 'not-asked') {
        asked.current = true;
        router.push('/scoff');
        return;
      }
      if (await projectionSwitch.turnOn()) setOn(true);
    } catch (error) {
      // Turning it off must work any time (H2 §4.3): when the phone could not, it is said, and the switch shows the truth.
      reportByName(report, error);
      setFailed(true);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('why.back')} onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.back, { color: color.text }]}>{`${t('settings.backMark')} ${t('why.back')}`}</Text>
        </Pressable>
        <ScreenTitle>{t('projection.view.title')}</ScreenTitle>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Text style={[styles.label, { color: color.text }]}>{t('projection.view.switch')}</Text>
              <Text style={[styles.small, { color: color.muted }]}>
                {t(access === 'unavailable' ? 'projection.view.unavailable' : 'projection.view.switchNote')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t('projection.view.switch')}
              value={on}
              disabled={access === 'unavailable'}
              onValueChange={(wanted) => void flip(wanted)}
            />
          </View>
        </Card>
        {failed && <Failed />}
        {on ? <Body read={read} note={note} onOff={() => void flip(false)} /> : <Off />}
      </ScrollView>
    </SafeAreaView>
  );
}

function figureScenario(scenarios: Scenario[]): Scenario | undefined {
  return scenarios.find((scenario) => scenario.adherence === FIGURE_SHARE) ?? scenarios[Math.floor(scenarios.length / 2)];
}

function reportByName(report: (problem: { name: string }) => void, error: unknown) {
  report({ name: error instanceof Error ? error.name : 'Unknown' }); // by name only (V3)
}

function Failed() {
  const { color } = useTheme();
  return <Text style={[styles.text, { color: color.warn }]}>{t('projection.view.saveFailed')}</Text>;
}

function Off() {
  const { color } = useTheme();
  return <Text style={[styles.text, { color: color.textSecondary }]}>{t('projection.view.offNote')}</Text>;
}

function Body({ read, note, onOff }: { read: Loaded<Projection> | null; note: Note | null; onOff: () => void }) {
  const { color } = useTheme();
  const units = useUnits();
  if (read === null) return null;
  if (read.state !== 'ready') {
    return <Text style={[styles.text, { color: color.textSecondary }]}>{t(read.state === 'consent' ? 'today.consent.body' : 'projection.view.failed')}</Text>;
  }
  const value = read.value;
  if (!value.shown || value.scenarios === undefined || value.todayKg === undefined || value.direction === undefined || value.on === undefined) {
    return <Text style={[styles.text, { color: color.textSecondary }]}>{t(`projection.view.reason.${value.reason ?? 'TOO_EARLY'}`)}</Text>;
  }
  const followed = figureScenario(value.scenarios);
  const date = weekdayDate(value.on);
  return (
    <>
      {note !== null && <Update note={note} units={units} onOff={onOff} />}
      {followed !== undefined && <Figure todayKg={value.todayKg} scenario={followed} direction={value.direction} />}
      {/* Next to the figure, not small print (H2 §4.2). */}
      <Text style={[styles.text, { color: color.text }]}>{t('projection.view.disclaimer')}</Text>
      {value.scenarios.map((scenario) => (
        <ScenarioRow key={scenario.adherence} scenario={scenario} date={date} units={units} />
      ))}
    </>
  );
}

function Figure({ todayKg, scenario, direction }: { todayKg: number; scenario: Scenario; direction: 'LOSS' | 'GAIN' }) {
  const { color } = useTheme();
  const pct = Math.round(scenario.adherence * PERCENT);
  return (
    <View style={styles.figure}>
      <Silhouette factor={widthFactor(todayKg, scenario.kg, direction)} />
      <Text style={[styles.small, { color: color.muted }]}>{t('projection.view.now')}</Text>
      {/* The behaviour, never a single weight: the weight is an estimate, shown as a range below (U5). */}
      <Text style={[styles.small, { color: color.accent }]}>{t('projection.view.at', { pct })}</Text>
    </View>
  );
}

function ScenarioRow({ scenario, date, units }: { scenario: Scenario; date: string; units: UnitSystem }) {
  const { color } = useTheme();
  return (
    <Card>
      <Text style={[styles.label, { color: color.text }]}>{t('projection.view.scenario', { pct: Math.round(scenario.adherence * PERCENT) })}</Text>
      <RangeText low={Number(weightInput(scenario.lowKg, units))} high={Number(weightInput(scenario.highKg, units))} unit={unitOf(units)} />
      <Text style={[styles.small, { color: color.muted }]}>{t('projection.view.by', { date })}</Text>
    </Card>
  );
}

function Update({ note, units, onOff }: { note: Note; units: UnitSystem; onOff: () => void }) {
  const { color } = useTheme();
  const [kept, setKept] = useState(false);
  const range = (seen: Seen) =>
    `${t('format.range', { low: Number(weightInput(seen.low, units)), high: Number(weightInput(seen.high, units)) })} ${unitOf(units)}`;
  return (
    <Card>
      <Text style={[styles.text, { color: color.text }]}>{t('projection.view.updated', { from: range(note.from), to: range(note.to) })}</Text>
      {note.away && !kept && <Options onKeep={() => setKept(true)} onOff={onOff} />}
    </Card>
  );
}

function Options({ onKeep, onOff }: { onKeep: () => void; onOff: () => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.options}>
      <Text style={[styles.small, { color: color.textSecondary }]}>{t('projection.view.options')}</Text>
      <Button label={t('projection.view.keep')} size="sm" onPress={onKeep} />
      <Button label={t('projection.view.off')} variant="ghost" size="sm" onPress={onOff} />
    </View>
  );
}

function unitOf(units: UnitSystem): string {
  return t(units === 'METRIC' ? 'units.kgUnit' : 'units.lbUnit');
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  head: { paddingHorizontal: tokens.space.lg, gap: tokens.space.sm },
  back: { fontSize: tokens.type.body },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  grow: { flex: 1, gap: tokens.space.xs },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  figure: { alignItems: 'center', gap: tokens.space.xs },
  options: { gap: tokens.space.sm, marginTop: tokens.space.sm },
});
