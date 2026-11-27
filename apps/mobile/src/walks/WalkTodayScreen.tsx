import { router } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { formatNumber } from '@/copy/format';
import { useAppServices } from '@/services/ServicesProvider';
import { openDetail } from '@/settings/detail';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { MapLock } from './MapLock';
import { useMapAccess } from './mapAccess';
import { walkParams as W } from './params';
import type { Place } from './places';
import type { Leg } from './route';
import { stepsPerKm, type WalkOption, walkOptions } from './suggest';
import { readTodaySteps, stepsLeft } from './todaySteps';
import { RouteMap } from './WalkMapScreen';

const MAP_HEIGHT = 300;
const num = (n: number) => formatNumber(Math.round(n));

/** The two places of a walk kept from the map, when both are still kept; a typed walk has none. */
function endsOf(option: Pick<WalkOption, 'route'>, places: Place[]): [Place, Place] | null {
  const from = places.find((p) => p.id === option.route.from);
  const to = places.find((p) => p.id === option.route.to);
  return from === undefined || to === undefined ? null : [from, to];
}

/**
 * Today's walk (K-1251, ADR-094 Ek 6, direction A: a page of its own): the steps left today (the engine's target less Apple Health's
 * count, U1) with the coral bar and the minutes; the walk that covers them on the map; and which of the user's walks covers it, the one
 * K-1216's suggestion picks marked. A walk that does not cover it is not said short (U7). The map is the paid part (option 1): without a
 * subscription a lock stands in its place, and the steps and the walks stay. Opened from This week's walk line and from the cardio sheet.
 */
export function WalkTodayScreen() {
  const { api, syncHealth, walks, places: placeStore, geo, report } = useAppServices();
  const { color } = useTheme();
  const routes = useSyncExternalStore(walks.subscribe, walks.current);
  const places = useSyncExternalStore(placeStore.subscribe, placeStore.current);
  const access = useMapAccess(api);
  const { data } = useReadOnFocus(
    useCallback(() => readTodaySteps({ api, syncHealth, report }), [api, syncHealth, report]),
  );

  const steps = data?.steps ?? null;
  const remaining = stepsLeft(steps);
  const options = walkOptions({ remaining, routes, stepsPerKm: data?.perKm ?? stepsPerKm(null) });

  // The walk drawn: the one that covers it, when it knows its places (a typed one has none: the places alone, no other walk's line drawn
  // as if it were); with none covering, the first walk that knows its places; else the places alone.
  const covering = options.find((o) => o.covers);
  const drawn = covering !== undefined ? endsOf(covering, places) : (options.map((o) => endsOf(o, places)).find((ends) => ends !== null) ?? null);
  // The pair by its places' ids and points: a place moved or named again is measured again.
  const pair = drawn === null ? null : drawn.map((p) => `${p.id}@${p.lat},${p.lng}`).join(':');
  const [measured, setMeasured] = useState<{ pair: string; leg: Leg } | null>(null);
  useEffect(() => {
    if (access !== 'open' || drawn === null || pair === null) return;
    let current = true;
    void geo.walk(drawn[0], drawn[1]).then((leg) => current && setMeasured({ pair, leg }));
    return () => {
      current = false;
    };
    // Measured once for the pair: `pair` holds both places' ids and points, so `drawn` is read only when it says something new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, geo, pair]);
  const path = measured !== null && measured.pair === pair ? measured.leg.path : null;

  let band = null;
  if (data !== null && steps === null) band = <Text style={[styles.note, { color: color.text }]}>{t('walks.today.unread')}</Text>;
  else if (steps !== null && steps.steps === null) band = <Text style={[styles.note, { color: color.textSecondary }]}>{t('walks.today.noCount', { target: num(steps.target) })}</Text>;
  else if (steps !== null && steps.steps !== null) {
    const values = { steps: num(steps.steps), target: num(steps.target) };
    const share = steps.target > 0 ? steps.steps / steps.target : 1;
    const done = remaining < W.minRemainingSteps;
    band = (
      <>
        <Text style={[styles.left, { color: color.text }]}>{done ? t('walks.today.done') : t('walks.today.left', { steps: num(remaining) })}</Text>
        <ProgressBar value={share} label={t('walks.today.progress', values)} />
        <Text style={[styles.note, { color: color.textSecondary }]}>
          {done ? t('walks.today.doneOf', values) : t('walks.today.of', { steps: values.steps, target: values.target, minutes: Math.max(1, Math.round(remaining / W.cadence)) })}
        </Text>
      </>
    );
  }

  let map = null;
  if (access === 'locked') map = <MapLock />;
  else if (access === 'unread') map = <Text style={[styles.note, { color: color.text }]}>{t('walks.today.mapUnread')}</Text>;
  else if (access === 'open' && places.length === 0) {
    map = (
      <View style={styles.stack}>
        <Text style={[styles.note, { color: color.textSecondary }]}>{t('walks.today.noPlaces')}</Text>
        <Button label={t('walks.today.addPlaces')} variant="text" size="sm" onPress={() => router.push('/walk-map')} />
      </View>
    );
  } else if (access === 'open') map = <RouteMap places={drawn ?? places} ends={drawn !== null} path={path} height={MAP_HEIGHT} />;

  const rows = options.map((option) => {
    const ends = endsOf(option, places);
    const name = ends === null ? option.route.name : t('walkMap.routeName', { from: ends[0].name, to: ends[1].name });
    const values = { name, steps: num(option.roundTripSteps), minutes: option.minutes };
    return (
      <ListRow
        key={option.route.id}
        label={name}
        detail={t('walks.today.row', values)}
        value={option.covers ? t('walks.today.coversIt') : undefined}
        trailing={option.covers ? 'checkmark.circle.fill' : undefined}
        accessibilityLabel={t(option.covers ? 'walks.today.coversLabel' : 'walks.today.rowLabel', values)}
      />
    );
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('walks.today.title')}</ScreenTitle>
        {band !== null && <View style={[styles.band, { backgroundColor: color.tintDay }]}>{band}</View>}
        {map}
        <View style={styles.stack}>
          <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>{t('walks.today.covers')}</Text>
          {rows.length === 0 ? <Text style={[styles.note, { color: color.textSecondary }]}>{t('walks.today.none')}</Text> : <ListGroup>{rows}</ListGroup>}
          <Button label={t('walks.today.edit')} variant="text" size="sm" onPress={() => openDetail('walks')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  stack: { gap: tokens.space.sm, alignItems: 'stretch' },
  band: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm },
  left: { ...tokens.face.displayBold, fontSize: tokens.type.number, fontVariant: ['tabular-nums'] },
  note: { fontSize: tokens.type.bodySmall, fontVariant: ['tabular-nums'] },
  heading: { ...tokens.face.display, fontSize: tokens.type.heading },
});
