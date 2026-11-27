import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, type ButtonVariant } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { DRAFT_OFFSET, MARK_OFFSET, MapMark, type MarkRole } from './MapMark';
import { walkParams as W } from './params';
import type { Place } from './places';
import type { Leg } from './route';
import { RouteSlip } from './RouteSlip';
import { stepsPerKm } from './suggest';
import { readTodaySteps, stepsLeft } from './todaySteps';

type Draft = { name: string; lat: number; lng: number };
type Found = { name: string; address: string; lat: number; lng: number };
type Measured = { pair: string; leg: Leg };
type Point = { latitude: number; longitude: number };

/**
 * The quiet map (K-1252, ADR-094 Ek 7 #1): Apple's muted map, no businesses, buildings or compass, no tilt. Said in code, not text:
 * these are the map's look. Where the phone is stays off on each map itself (showsUserLocation, K-1227's privacy test reads it there).
 */
const QUIET = {
  mapType: 'mutedStandard',
  showsPointsOfInterests: false,
  showsBuildings: false,
  showsCompass: false,
  pitchEnabled: false,
} as const;
/** The walk's line on its paper edge (Ek 7 #2): the edge is drawn first, wider, in the page's colour; a look, not a threshold. */
const EDGE_WIDTH = 10;
const LINE_WIDTH = 5;
const ROUND = 'round';
const TEXT: ButtonVariant = 'text';
const POLITE = 'polite';
const SEARCH = 'search';
const MAP_HEIGHT = 330;
/** Room around the points; the top leaves the search pill's height clear. */
const MAP_PADDING = { top: 110, right: 60, bottom: 50, left: 60 };
/** One place alone is shown with this much around it (degrees, about a street's scale), not fitted to a single point (Ek 7 #4). */
const ONE_PLACE_SPAN = 0.008;

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
const clip = (text: string) => Array.from(text).slice(0, W.nameMaxChars).join('');
const pointOf = (p: { lat: number; lng: number }): Point => ({ latitude: p.lat, longitude: p.lng });

/** The map shown on `points`: around the one place when there is one, fitted to all of them when more. */
function show(map: MapView | null, points: Point[], padding = MAP_PADDING) {
  if (points.length === 1) map?.animateToRegion?.({ ...points[0], latitudeDelta: ONE_PLACE_SPAN, longitudeDelta: ONE_PLACE_SPAN }, 0);
  else if (points.length > 1) map?.fitToCoordinates?.(points, { edgePadding: padding, animated: false });
}

/** The walk's line: the paper edge, then the petrol line on it, solid with round ends. */
function WalkLine({ path }: { path: Leg['path'] }) {
  const { color } = useTheme();
  const coordinates = path.map(pointOf);
  return (
    <>
      <Polyline coordinates={coordinates} strokeColor={color.background} strokeWidth={EDGE_WIDTH} lineCap={ROUND} lineJoin={ROUND} />
      <Polyline coordinates={coordinates} strokeColor={color.accent} strokeWidth={LINE_WIDTH} lineCap={ROUND} lineJoin={ROUND} />
    </>
  );
}

function PlaceMarker({ place, role, onPress }: { place: Place; role: MarkRole; onPress?: () => void }) {
  return (
    <Marker testID={`marker-${place.name}`} coordinate={pointOf(place)} centerOffset={MARK_OFFSET} tracksViewChanges={false} onPress={onPress}>
      <MapMark role={role} name={place.name} />
    </Marker>
  );
}

/**
 * The walk map (K-1227, ADR-093; drawn again by K-1252, ADR-094 Ek 7 · route slip): the places the user saved on a quiet Apple map with
 * the app's own marks, a search on the map's top, and, once two are picked, the walk between them as a petrol line and, under the map,
 * the route slip: the two places, the one-way distance and minutes, the round trip, and what it does for today's steps when they are read.
 * A place comes from the search (Apple Maps; said at the foot) or from a press and hold. A walk is kept in "My walks", which Today's
 * walk then uses. Places are removed from Edit. Nothing here reads where the phone is.
 */
export function WalkMapScreen() {
  const { api, geo, places: store, walks, report, syncHealth } = useAppServices();
  const system = useUnits();
  const { color, scheme } = useTheme();
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
  const [today, setToday] = useState<{ perKm: number; left: number }>(() => ({ perKm: stepsPerKm(null), left: Number.NaN }));
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const map = useRef<MapView>(null);

  const from = places.find((p) => p.id === fromId) ?? null;
  const to = places.find((p) => p.id === toId) ?? null;

  // Today's steps and the stride (K-1216), as Today's walk reads them; the default stride and no today until they answer or when they cannot.
  useEffect(() => {
    let current = true;
    void readTodaySteps({ api, syncHealth, report }).then((read) => current && setToday({ perKm: read.perKm, left: stepsLeft(read.steps) }));
    return () => {
      current = false;
    };
  }, [api, syncHealth, report]);

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

  // The places and, once measured, the walk's own line: the map shows all of it, so a route that leaves the places' box stays in view.
  // The draft by its point alone: typing its name gives it a new identity on every key, and must not move the map (K-1252 review).
  const draftLat = draft?.lat;
  const draftLng = draft?.lng;
  const points = useMemo(
    () => [...places, ...(draftLat === undefined || draftLng === undefined ? [] : [{ lat: draftLat, lng: draftLng }]), ...(ready?.path ?? [])].map(pointOf),
    [places, draftLat, draftLng, ready],
  );
  useEffect(() => show(map.current, points), [points]);

  async function search() {
    if (Array.from(query.trim()).length < W.searchMinChars) return;
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
    // Edit ends with the last place: its Done goes with the list, and a place added after is one to pick (K-1252 review).
    if (places.length <= 1) setEditing(false);
    if (fromId === place.id) setFromId(null);
    if (toId === place.id) setToId(null);
    await store.remove(place.id).catch((error: unknown) => report({ name: nameOf(error) }));
  }

  async function saveWalk(name: string, km: number, ends: { from: string; to: string }) {
    try {
      await walks.add({ name, km: Math.round(km * 1000) / 1000, ...ends });
      setNotice('walkMap.walkSaved');
    } catch (error) {
      if (nameOf(error) === 'WalkLimit') setNotice('walkMap.walkFull');
      else {
        report({ name: nameOf(error) });
        setNotice('walkMap.failed');
      }
    }
  }

  // "Home to Gym"; when the two names do not fit a walk's name, the place it goes to alone (K-1251: a clipped "Campus to" read as nonsense).
  const fullName = from !== null && to !== null ? t('walkMap.routeName', { from: from.name, to: to.name }) : '';
  const routeName = to === null ? '' : Array.from(fullName).length <= W.nameMaxChars ? fullName : clip(to.name);
  const full = places.length >= W.placesMax;
  const roleOf = (place: Place): MarkRole => (place.id === fromId ? 'from' : place.id === toId ? 'to' : 'idle');
  const searchable = Array.from(query.trim()).length >= W.searchMinChars;

  const row = (place: Place) => {
    if (editing) {
      return <ListRow key={place.id} label={place.name} icon="minus.circle.fill" destructive accessibilityLabel={t('walkMap.removeLabel', { name: place.name })} onPress={() => void remove(place)} />;
    }
    const role = roleOf(place);
    const said = role === 'from' ? t('walkMap.from') : role === 'to' ? t('walkMap.to') : undefined;
    return (
      <ListRow
        key={place.id}
        label={place.name}
        icon={role === 'from' ? 'circle.circle' : role === 'to' ? 'smallcircle.filled.circle.fill' : 'circle'}
        value={said}
        accessibilityLabel={said === undefined ? t('walkMap.placeLabel', { name: place.name }) : `${said}: ${place.name}`}
        onPress={() => pick(place)}
      />
    );
  };

  // Under the map: the route slip once the walk is measured, what to do before it.
  let walk: ReactNode = <Text style={[styles.note, { color: color.textSecondary }]}>{t(places.length < 2 ? 'walkMap.pickOne' : 'walkMap.pick')}</Text>;
  if (pair !== null && ready === null) walk = <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.measuring')}</Text>;
  if (ready !== null && from !== null && to !== null) {
    walk = (
      <View style={styles.stack}>
        <RouteSlip from={from} to={to} leg={ready} perKm={today.perKm} left={today.left} system={system} />
        <Button label={t('walkMap.saveWalk')} accessibilityLabel={t('walkMap.saveWalkLabel', { name: routeName })} onPress={() => void saveWalk(routeName, ready.km, { from: from.id, to: to.id })} />
        {notice !== null && <Text accessibilityLiveRegion={POLITE} style={[styles.note, { color: color.text }]}>{t(notice)}</Text>}
      </View>
    );
  }

  // Built apart from the JSX tree they join (copy-literals reads the tree's children for text).
  const draftMark =
    draft === null ? null : (
      <Marker testID="marker-draft" coordinate={pointOf(draft)} centerOffset={DRAFT_OFFSET} tracksViewChanges={false}>
        <MapMark role="draft" />
      </Marker>
    );
  const searchButton = searchable ? (
    <Pressable accessibilityRole="button" onPress={() => void search()} hitSlop={tokens.space.sm}>
      <Text style={[styles.pillSearch, { color: color.accent }]}>{t('walkMap.search')}</Text>
    </Pressable>
  ) : null;
  const editButton = places.length === 0 ? null : <Button label={t(editing ? 'walkMap.editDone' : 'walkMap.edit')} variant={TEXT} size="sm" onPress={() => setEditing(!editing)} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ScreenTitle>{t('walkMap.title')}</ScreenTitle>

        <View style={styles.map}>
          <View accessible accessibilityLabel={t('walkMap.mapLabel')} style={StyleSheet.absoluteFill}>
            <MapView
              ref={map}
              style={StyleSheet.absoluteFill}
              {...QUIET}
              showsUserLocation={false}
              showsMyLocationButton={false}
              userInterfaceStyle={scheme}
              onMapReady={() => show(map.current, points)}
              onLongPress={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                if (!full) setDraft({ name: '', lat: latitude, lng: longitude });
              }}
            >
              {ready !== null && <WalkLine path={ready.path} />}
              {/* Keyed by the role too: a mark that changes its part is drawn again (tracksViewChanges is off, the map keeps the first look). */}
              {places.map((p) => (
                <PlaceMarker key={`${p.id}:${roleOf(p)}`} place={p} role={roleOf(p)} onPress={() => pick(p)} />
              ))}
              {draftMark}
            </MapView>
          </View>
          <View style={[styles.pill, { backgroundColor: color.background, borderColor: color.line }]}>
            <Icon name="magnifyingglass" size="small" tone="muted" />
            <TextInput
              accessibilityLabel={t('walkMap.searchLabel')}
              placeholder={t('walkMap.searchLabel')}
              placeholderTextColor={color.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void search()}
              returnKeyType={SEARCH}
              style={[styles.pillInput, { color: color.text }]}
            />
            {searchButton}
          </View>
        </View>

        {searchProblem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{t(searchProblem)}</ProblemText>}
        {results !== null && results.length === 0 && <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.noMatch')}</Text>}
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

        {draft !== null ? (
          <View style={styles.stack}>
            <TextField label={t('walkMap.nameLabel')} value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} maxLength={W.nameMaxChars} problem={invalid ? t('walkMap.invalid') : null} />
            <Button label={t('walkMap.save')} accessibilityLabel={t('walkMap.saveLabel')} onPress={() => void savePlace()} />
            <Button label={t('walkMap.cancel')} variant={TEXT} onPress={() => setDraft(null)} />
          </View>
        ) : (
          walk
        )}
        {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{t(problem)}</ProblemText>}
        {full && draft === null && <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.full')}</Text>}

        <View style={styles.stackSmall}>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={[styles.heading, { color: color.text }]}>{t('walkMap.places')}</Text>
            {editButton}
          </View>
          {places.length === 0 ? <Text style={[styles.note, { color: color.textSecondary }]}>{t('walkMap.none')}</Text> : <ListGroup>{places.map(row)}</ListGroup>}
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('walkMap.holdHint')}</Text>
          <Text style={[styles.small, { color: color.textSecondary }]}>{t('walkMap.searchNote')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * A walk on the map, to look at (K-1251, Today's walk; the quiet map and marks of K-1252): the places, and the walk's line when it is
 * measured, shown to fit. With `ends` the two places are the walk's start and end; else they are places alone. It is here, beside the map
 * screen, so react-native-maps stays in this one file, which never shows where the phone is.
 */
export function RouteMap({ places, path, height, ends = false }: { places: Place[]; path: Leg['path'] | null; height: number; ends?: boolean }) {
  const { scheme } = useTheme();
  const map = useRef<MapView>(null);
  const points = (path ?? places).map(pointOf);
  const fit = () => show(map.current, points);
  // Shown again only when the points change: the parent draws again on every read and store change (K-1251 review).
  const key = points.map((p) => `${p.latitude},${p.longitude}`).join(';');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fit, [key]);
  const roleOf = (index: number): MarkRole => (!ends ? 'idle' : index === 0 ? 'from' : 'to');
  return (
    <View accessible accessibilityLabel={t('walkMap.mapLabel')} style={[styles.map, { height }]}>
      <MapView ref={map} style={StyleSheet.absoluteFill} {...QUIET} showsUserLocation={false} showsMyLocationButton={false} userInterfaceStyle={scheme} scrollEnabled={false} zoomEnabled={false} onMapReady={fit}>
        {path !== null && <WalkLine path={path} />}
        {places.map((p, i) => (
          <PlaceMarker key={`${p.id}:${roleOf(i)}`} place={p} role={roleOf(i)} />
        ))}
      </MapView>
    </View>
  );
}

const PILL = 44;
const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.xl },
  stack: { gap: tokens.space.md },
  stackSmall: { gap: tokens.space.sm },
  map: { height: MAP_HEIGHT, borderRadius: tokens.radius.card, overflow: 'hidden' },
  pill: {
    position: 'absolute',
    top: tokens.space.md,
    left: tokens.space.md,
    right: tokens.space.md,
    height: PILL,
    borderRadius: PILL / 2,
    borderWidth: tokens.border.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
    gap: tokens.space.sm,
  },
  pillInput: { flex: 1, fontSize: tokens.type.body },
  pillSearch: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { ...tokens.face.display, fontSize: tokens.type.heading },
  note: { fontSize: tokens.type.bodySmall },
  small: { fontSize: tokens.type.label },
});
