import { router } from 'expo-router';
import { useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { formatDistance, kmFromInput } from '@/walks/distance';
import { walkParams as W } from '@/walks/params';

import { useAction } from './useAction';

/**
 * Settings › My walks (K-1216): up to three walks the user really takes, each a name and a one-way distance in their unit. When steps
 * are left today, the home screen says which of them is about right. Kept on this phone only; each can be removed. No place is
 * asked for and none is read: a name and a number.
 */
export function WalksEditor() {
  const { walks } = useAppServices();
  const system = useUnits();
  const routes = useSyncExternalStore(walks.subscribe, walks.current);
  const { color } = useTheme();
  const { busy, problem, run } = useAction();
  const [name, setName] = useState('');
  const [distance, setDistance] = useState('');
  const [invalid, setInvalid] = useState(false);
  const full = routes.length >= W.routesMax;

  const add = () => {
    const km = kmFromInput(distance, system);
    if (name.trim() === '' || km === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void run(
      async () => {
        await walks.add({ name, km });
        setName('');
        setDistance('');
      },
      { WalkInvalid: 'settings.walks.invalid' },
      'settings.walks.failed',
    );
  };

  const rows = routes.map((route) => (
    <ListRow
      key={route.id}
      label={route.name}
      value={formatDistance(route.km, system)}
      trailing="trash"
      accessibilityLabel={t('settings.walks.rowLabel', { name: route.name, distance: formatDistance(route.km, system) })}
      accessibilityHint={t('settings.walks.removeLabel', { name: route.name })}
      disabled={busy}
      onPress={() => void run(() => walks.remove(route.id), {}, 'settings.walks.failed')}
    />
  ));
  const form = full ? (
    <Text style={[styles.note, { color: color.muted }]}>{t('settings.walks.full')}</Text>
  ) : (
    <View style={styles.stack}>
      <TextField label={t('settings.walks.name')} value={name} onChangeText={setName} maxLength={W.nameMaxChars} />
      <TextField
        label={t('settings.walks.distance')}
        value={distance}
        onChangeText={setDistance}
        suffix={t(system === 'METRIC' ? 'units.kmUnit' : 'units.miUnit')}
        keyboardType="decimal-pad"
        problem={invalid ? t('settings.walks.invalid') : null}
      />
      <Button label={t('settings.walks.add')} accessibilityLabel={t('settings.walks.addLabel')} disabled={busy} onPress={add} />
    </View>
  );
  return (
    <View style={styles.stack}>
      <Text style={[styles.note, { color: color.muted }]}>{t('settings.walks.hint')}</Text>
      {rows.length > 0 && <ListGroup>{rows}</ListGroup>}
      {form}
      <Button label={t('settings.walks.map')} accessibilityLabel={t('settings.walks.mapLabel')} variant="secondary" onPress={() => router.push('/walk-map')} />
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.md },
  note: { fontSize: tokens.type.bodySmall },
});
