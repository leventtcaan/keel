import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, type ButtonVariant } from '@/components/Button';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { formatNumber } from '@/copy/format';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

import { formatDistance } from './distance';
import { walkParams as W } from './params';
import type { Place } from './places';
import type { Leg } from './route';
import { stepsPerKm } from './suggest';

type Draft = { name: string; lat: number; lng: number };
type Found = { name: string; address: string; lat: number; lng: number };
type Measured = { pair: string; leg: Leg };

/** The dotted line: short dashes and long gaps with round caps read as dots. A look, not a threshold. */
const DOTS = [1, 8];
/** Said in code, not text: Button's role and the line's look and the screen reader's politeness. */
const GHOST: ButtonVariant = 'ghost';
const POLITE = 'polite';
const ROUND = 'round';
const MAP_PADDING = { top: 60, right: 60, bottom: 60, left: 60 };

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
const num = (n: number) => formatNumber(Math.round(n));
const clip = (text: string) => Array.from(text).slice(0, W.nameMaxChars).join('');

/**
 * The walk map (K-1227, ADR-093): the places the user saved, on Apple Maps, and the walk between two of them as a dotted line with
 * its distance and steps. A place comes from an address search (Apple Maps; said under the box) or from a press and hold on the map.
 * The steps are the distance times the steps in a km (K-1216: from the profile's height, else the default). The two places and the
 * walk are measured once, when the second is picked; a walk can be kept in "My walks", which the home screen's line then uses.
 * Nothing here reads where the phone is.
 */
export function WalkMapScreen() {
  const { api, geo, places: store, walks, report } = useAppServices();
  const system = useUnits();
  const { color } = useTheme();
  const places = useSyncExternalStore(store.subscribe, store.current);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Found[] | null>(null);
  const [searchProblem, setSearchProblem] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [perKm, setPerKm] = useState(() => stepsPerKm(null));
  const [notice, setNotice] = useState<string | null>(null);
  const map = useRef<MapView>(null);

  const from = places.find((p) => p.id === fromId) ?? null;
  const to = places.find((p) => p.id === toId) ?? null;

  // The stride, from the profile's height (K-1216); the default until it answers or when it cannot.
  useEffect(() => {
    let current = true;
    void load(() => api.GET('/v1/profile')).then((profile) => {
      if (current && profile.state === 'ready') setPerKm(stepsPerKm(profile.value.heightCm));
    });
    return () => {
      current = false;
    };
  }, [api]);

  // The walk between the two picked places, asked once for the pair; an answer for another pair is not this one's.
  const pair = from === null || to === null ? null : `${from.id}:${to.id}`;
  useEffect(() => {
    if (from === null || to === null || pair === null) return;
    let current = true;
    void geo.walk(from, to).then((leg) => current && setMeasured({ pair, leg }));
    return () => {
      current = false;
    };
  }, [geo, from, to, pair]);
  const ready = pair !== null && measured?.pair === pair ? measured.leg : null;

  const points = useMemo(() => [...places, ...(draft === null ? [] : [draft])].map((p) => ({ latitude: p.lat, longitude: p.lng })), [places, draft]);
  useEffect(() => {
    if (points.length > 0) map.current?.fitToCoordinates?.(points, { edgePadding: MAP_PADDING, animated: false });
  }, [points]);

  async function search() {
    setSearchProblem(null);
    const found = await geo.find(query);
    if (found === null) {
      setResults(null);
      setSearchProblem('walkMap.searchFailed');
    } else setResults(found);
  }

  async function savePlace() {
    if (draft === null) return;
    if (draft.name.trim() === '') return setInvalid(true);
    setInvalid(false);
    setProblem(null);
    try {
      await store.add(draft);
      setDraft(null);
      setResults(null);
      setQuery('');
    } catch (error) {
      if (nameOf(error) === 'PlaceInvalid') setInvalid(true);
      else {
        report({ name: nameOf(error) });
        setProblem(nameOf(error) === 'PlaceLimit' ? 'walkMap.full' : 'walkMap.failed');
      }
    }
  }

  function pick(place: Place) {
    setNotice(null);
    if (fromId === place.id) return setFromId(null);
    if (toId === place.id) return setToId(null);
    if (fromId === null) setFromId(place.id);
    else if (toId === null) setToId(place.id);
    else {
      setFromId(toId);
      setToId(place.id);
    }
  }

  async function remove(place: Place) {
    if (fromId === place.id) setFromId(null);
    if (toId === place.id) setToId(null);
    await store.remove(place.id).catch((error: unknown) => report({ name: nameOf(error) }));
  }

  async function saveWalk(name: string, km: number) {
    try {
      await walks.add({ name, km: Math.round(km * 1000) / 1000 });
      setNotice('walkMap.walkSaved');
    } catch (error) {
      if (nameOf(error) === 'WalkLimit') setNotice('walkMap.walkFull');
      else {
        report({ name: nameOf(error) });
        setNotice('walkMap.failed');
      }
    }
  }

  const routeName = from !== null && to !== null ? clip(t('walkMap.routeName', { from: from.name, to: to.name })) : '';
  const full = places.length >= W.placesMax;
  const row = (place: Place) => {
    const role = place.id === fromId ? t('walkMap.from') : place.id === toId ? t('walkMap.to') : undefined;
    return (
      <ListRow
        key={place.id}
        label={place.name}
        value={role}
        accessibilityLabel={role === undefined ? t('walkMap.placeLabel', { name: place.name }) : `${role}: ${place.name}`}
        onPress={() => pick(place)}
      />
    );
  };

  let walk: ReactNode = <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.pick')}</Text>;
  if (pair !== null && ready === null) walk = <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.measuring')}</Text>;
  if (ready !== null) {
    const { km, approximate } = ready;
    const values = { distance: formatDistance(km, system), steps: num(km * perKm) };
    walk = (
      <View style={styles.stack}>
        <Text accessibilityLiveRegion={POLITE} style={[styles.leg, { color: color.text }]}>{t(approximate ? 'walkMap.legApprox' : 'walkMap.leg', values)}</Text>
        <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.round', { steps: num(2 * km * perKm) })}</Text>
        <Button label={t('walkMap.saveWalk')} accessibilityLabel={t('walkMap.saveWalkLabel', { name: routeName })} variant="secondary" onPress={() => void saveWalk(routeName, km)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('walkMap.title')}</ScreenTitle>
        <View style={styles.stack}>
          <TextField label={t('walkMap.searchLabel')} value={query} onChangeText={setQuery} onSearch={() => void search()} hint={t('walkMap.searchNote')} />
          <Button label={t('walkMap.search')} variant="secondary" disabled={Array.from(query.trim()).length < W.searchMinChars} onPress={() => void search()} />
          {searchProblem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{t(searchProblem)}</ProblemText>}
          {results !== null && results.length === 0 && <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.noMatch')}</Text>}
          {results !== null && results.length > 0 && (
            <ListGroup>
              {results.map((r, i) => (
                <ListRow
                  key={`${r.lat},${r.lng},${i}`}
                  label={r.name}
                  detail={r.address}
                  accessibilityLabel={t('walkMap.resultLabel', { name: r.name, address: r.address })}
                  onPress={() => setDraft({ name: clip(r.name), lat: r.lat, lng: r.lng })}
                />
              ))}
            </ListGroup>
          )}
          <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.holdHint')}</Text>
        </View>

        <View accessible accessibilityLabel={t('walkMap.mapLabel')} style={styles.map}>
          <MapView
            ref={map}
            style={StyleSheet.absoluteFill}
            showsUserLocation={false}
            showsMyLocationButton={false}
            onLongPress={(event) => {
              const { latitude, longitude } = event.nativeEvent.coordinate;
              if (!full) setDraft({ name: '', lat: latitude, lng: longitude });
            }}
          >
            {places.map((p) => (
              <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} pinColor={p.id === fromId || p.id === toId ? color.accent : color.muted} />
            ))}
            {draft !== null && <Marker coordinate={{ latitude: draft.lat, longitude: draft.lng }} pinColor={color.text} />}
            {from !== null && to !== null && (
              <Polyline
                coordinates={[
                  { latitude: from.lat, longitude: from.lng },
                  { latitude: to.lat, longitude: to.lng },
                ]}
                strokeColor={color.accent}
                strokeWidth={4}
                lineCap={ROUND}
                lineDashPattern={DOTS}
              />
            )}
          </MapView>
        </View>

        {draft !== null && (
          <View style={styles.stack}>
            <TextField label={t('walkMap.nameLabel')} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={W.nameMaxChars} problem={invalid ? t('walkMap.invalid') : null} />
            <Button label={t('walkMap.save')} accessibilityLabel={t('walkMap.saveLabel')} onPress={() => void savePlace()} />
            <Button label={t('walkMap.cancel')} variant={GHOST} onPress={() => setDraft(null)} />
          </View>
        )}
        {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{t(problem)}</ProblemText>}
        {full && draft === null && <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.full')}</Text>}

        <View style={styles.stack}>
          <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>{t('walkMap.places')}</Text>
          {places.length === 0 ? <Text style={[styles.note, { color: color.muted }]}>{t('walkMap.none')}</Text> : <ListGroup>{places.map(row)}</ListGroup>}
          {places.map((p) => (
            <Button key={p.id} label={t('walkMap.removeLabel', { name: p.name })} variant={GHOST} onPress={() => void remove(p)} />
          ))}
        </View>

        {walk}
        {notice !== null && <Text accessibilityLiveRegion={POLITE} style={[styles.note, { color: color.text }]}>{t(notice)}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  stack: { gap: tokens.space.md },
  map: { height: 280, borderRadius: tokens.radius.card, overflow: 'hidden' },
  note: { fontSize: tokens.type.bodySmall },
  leg: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  heading: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
});
