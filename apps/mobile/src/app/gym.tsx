import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { type Field, type GymForm, buildGym, emptyForm, formOf, rackOf } from '@/train/gymForm';
import { exerciseName } from '@/train/program';

type Schemas = components['schemas'];
/** `known`: the catalog's machine moves when it was read; null when not (then no stored step is dropped). */
type Read = { exists: boolean; machines: Schemas['Exercise'][]; known: Set<string> | null } | 'failed';

/**
 * A gym's equipment (K-421, ADR-032): bar, plates, the dumbbell rack (filled from its lightest, heaviest and step), the
 * stack step, and machines with their own step — typed in the user's unit, stored in kg. Saved whole under its id
 * (PUT); writing needs the server, and its limits are the server's to check. The first gym is the one in use.
 */
export default function GymScreen() {
  const { api, training, report } = useAppServices();
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useUnits();
  const { color } = useTheme();
  const [read, setRead] = useState<Read | null>(null);
  const [form, setForm] = useState<GymForm | null>(null);
  const [rack, setRack] = useState({ lightest: '', heaviest: '', step: '' });
  const [problem, setProblem] = useState<Field | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const named = useCallback((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }), [report]);
  useEffect(() => {
    void Promise.all([load(() => api.GET('/v1/gyms')), training.read(api)])
      .then(([gyms, data]) => {
        if (gyms.state !== 'ready') return setRead('failed');
        const found = gyms.value.find((g) => g.id === id);
        const machines = (data.exercises.state === 'ready' ? data.exercises.value : []).filter(
          (m) => m.equipment === 'MACHINE' || m.equipment === 'CABLE',
        );
        // A new gym is the one in use when it is the first.
        const start = found === undefined ? { ...emptyForm(units), current: gyms.value.length === 0 } : formOf(found, units);
        setRead({ exists: found !== undefined, machines, known: data.exercises.state === 'ready' ? new Set(machines.map((m) => m.id)) : null });
        setForm(start);
      })
      .catch((error: unknown) => {
        named(error);
        setRead('failed');
      });
  }, [api, training, id, units, named]);

  const change = (part: Partial<GymForm>) => setForm((current) => (current === null ? current : { ...current, ...part }));

  const save = async () => {
    if (form === null || busy) return;
    const built = buildGym(form, read !== null && read !== 'failed' ? read.known : null);
    if (built.kind === 'problem') {
      setProblem(built.field);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const answer = await api.PUT('/v1/gyms/{id}', { params: { path: { id } }, body: built.input });
      if (answer.response.ok) router.back();
      else setSaid(t(answer.response.status === 400 ? 'gym.refused' : 'gym.saveFailed'));
    } catch (error) {
      named(error);
      setSaid(t('gym.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const answer = await api.DELETE('/v1/gyms/{id}', { params: { path: { id } } });
      if (answer.response.ok) router.back();
      else setSaid(t('gym.deleteFailed'));
    } catch (error) {
      named(error);
      setSaid(t('gym.deleteFailed'));
    } finally {
      setBusy(false);
    }
  };

  const unit = t(form?.unit === 'IMPERIAL' ? 'units.lbUnit' : 'units.kgUnit');
  const problemOf = (field: Field) => (problem === field ? t(`gym.problem.${field}`) : null);
  const failed = read === 'failed' ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('gyms.loadFailed')}</Text> : null;
  const fillRack = () => {
    const filled = rackOf(rack.lightest, rack.heaviest, rack.step);
    if (filled !== null) change({ dumbbells: filled });
  };
  const machinesProblem = problem === 'machines' ? <Text style={[styles.text, { color: color.text }]}>{problemOf('machines')}</Text> : null;
  const deleteButton =
    read !== null && read !== 'failed' && read.exists ? (
      <Button label={t('gym.delete')} variant="ghost" onPress={() => void remove()} disabled={busy} />
    ) : null;
  const machines =
    read === null || read === 'failed' || form === null || read.machines.length === 0 ? null : (
      <View style={styles.block}>
        <Text style={[styles.label, { color: color.text }]}>{t('gym.machines')}</Text>
        {read.machines.map((move) => (
          <TextField
            key={move.id}
            label={t('gym.machine', { exercise: exerciseName(move.id), unit })}
            value={form.machines[move.id] ?? ''}
            onChangeText={(text) => change({ machines: { ...form.machines, [move.id]: text } })}
            keyboardType="decimal-pad"
          />
        ))}
        {machinesProblem}
      </View>
    );
  const fields =
    form === null || read === null || read === 'failed' ? null : (
      <>
        <TextField label={t('gym.name')} value={form.name} onChangeText={(name) => change({ name })} problem={problemOf('name')} />
        <Chip label={t('gym.current')} selected={form.current} onPress={() => change({ current: !form.current })} />
        <Text style={[styles.small, { color: color.muted }]}>{t('gym.unitNote')}</Text>
        <View style={styles.units}>
          <Chip label={t('units.kgUnit')} selected={form.unit === 'METRIC'} onPress={() => change({ unit: 'METRIC' })} />
          <Chip label={t('units.lbUnit')} selected={form.unit === 'IMPERIAL'} onPress={() => change({ unit: 'IMPERIAL' })} />
        </View>
        <TextField
          label={t('gym.bar', { unit })}
          value={form.bar}
          onChangeText={(bar) => change({ bar })}
          keyboardType="decimal-pad"
          problem={problemOf('bar')}
        />
        <TextField
          label={t('gym.plates', { unit })}
          value={form.plates}
          onChangeText={(plates) => change({ plates })}
          problem={problemOf('plates')}
          multiline
        />
        <TextField
          label={t('gym.dumbbells', { unit })}
          value={form.dumbbells}
          onChangeText={(dumbbells) => change({ dumbbells })}
          problem={problemOf('dumbbells')}
          multiline
        />
        <View style={styles.rack}>
          <TextField
            label={t('gym.rack.lightest')}
            value={rack.lightest}
            onChangeText={(lightest) => setRack({ ...rack, lightest })}
            keyboardType="decimal-pad"
          />
          <TextField
            label={t('gym.rack.heaviest')}
            value={rack.heaviest}
            onChangeText={(heaviest) => setRack({ ...rack, heaviest })}
            keyboardType="decimal-pad"
          />
          <TextField label={t('gym.rack.step')} value={rack.step} onChangeText={(step) => setRack({ ...rack, step })} keyboardType="decimal-pad" />
        </View>
        <Button label={t('gym.rack.fill')} variant="ghost" size="sm" onPress={fillRack} />
        <TextField
          label={t('gym.stackStep', { unit })}
          value={form.stackStep}
          onChangeText={(stackStep) => change({ stackStep })}
          keyboardType="decimal-pad"
          problem={problemOf('stackStep')}
        />
        {machines}
        {said !== null && <Text style={[styles.text, { color: color.text }]}>{said}</Text>}
        <Button label={t('gym.save')} onPress={() => void save()} disabled={busy} />
        {deleteButton}
      </>
    );

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.text, { color: color.text }]}>{t('gyms.back')}</Text>
        </Pressable>
        <ScreenTitle>{t('gym.title')}</ScreenTitle>
        {failed}
        {fields}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  block: { gap: tokens.space.sm },
  rack: { flexDirection: 'row', gap: tokens.space.sm },
  units: { flexDirection: 'row', gap: tokens.space.sm },
  small: { fontSize: tokens.type.bodySmall },
  label: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
});
