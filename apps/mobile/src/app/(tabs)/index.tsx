import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PLUS_CLEARANCE, PlusEntry } from '@/components/PlusEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { GuideOverlay } from '@/guide/GuideOverlay';
import { useGuide } from '@/guide/GuideProvider';
import { workoutLine } from '@/guide/workoutLine';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { Hero } from '@/today/Hero';
import { StateCard } from '@/today/StateCard';
import type { TodayData } from '@/today/today';
import { FoodLine } from '@/today/FoodLine';
import { TodayCard } from '@/today/TodayCard';
import { todayCardOf } from '@/today/todayWorkout';
import { useToday } from '@/today/useToday';
import { useUnits } from '@/services/ServicesProvider';
import { DaySheet } from '@/today/DaySheet';
import { dayView } from '@/today/dayView';
import { WeekStrip } from '@/today/WeekStrip';
import { BuildProgramPrompt } from '@/train/BuildProgramPrompt';
import { todayFor } from '@/train/week';
import { heroOf, loggedDays, stripDays, trainedDays, weekHead, weekMonday } from '@/today/week';

type Program = components['schemas']['Program'];

/**
 * This week (K-969, ADR-077 #1, prototype #home and #home-mon): the week strip under the week's number and record, one
 * hero block (the first week, this week's call, Monday's "Open your call", a paused week, or the calls off without the
 * consent), then today's workout and the food line. No coach bar, no paragraphs (ADR-069 #3, ADR-077 #1): the consistency's parts, the first weeks'
 * words and the coach's questions are off this screen. Settings top right. Every week, date and count is the server's;
 * the phone lays its week out and counts the days to the dates it gave (ADR-077 Ek 2). A part that failed says so once.
 */
export default function TodayScreen() {
  const { color } = useTheme();
  // The first-use guide (K-1065): opened the first time the week is on the screen, and when Settings asked for it and This week is
  // back in view. The focus part comes first, so the week's own read on focus is the last to register.
  const guide = useGuide();
  const { arrive } = guide;
  const loadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (loadedRef.current) arrive();
    }, [arrive]),
  );
  const { day, data, reload } = useToday();
  const units = useUnits();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const loaded = data !== null;
  useEffect(() => {
    loadedRef.current = loaded;
    if (loaded) arrive();
  }, [loaded, arrive]);
  // The parts the guide points at, and the scroll it may move to bring one into view.
  const callRef = useRef<View>(null);
  const workoutRef = useRef<View>(null);
  const plusRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const targets = useMemo(() => ({ call: callRef, workout: workoutRef, plus: plusRef }), []);
  const scroll = useMemo(() => ({ ref: scrollRef, y: scrollY }), []);
  // A change to today answered with the program as changed: shown at once, for the read it answered, while the week is
  // read again (Health, the queue, every part); the next read is the server's word again.
  const [answered, setAnswered] = useState<{ read: TodayData; program: Program } | null>(null);

  const parts = data === null ? [] : [data.consistency, data.decision, data.program, data.budget, ...(data.checkIn ? [data.checkIn] : [])];
  const failed = parts.some((part) => part.state === 'failed');
  const problem = failed ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.failed')}</Text>
      <Button label={t('today.retry')} variant="ghost" size="sm" onPress={reload} />
    </View>
  ) : null;

  let top = null;
  let daySheet = null;
  let guideLines: { workout?: string } = {};
  if (data !== null) {
    const monday = data.monday ?? weekMonday(data.consistency, data.program, day);
    const program = answered !== null && answered.read === data ? answered.program : data.program.state === 'ready' ? data.program.value : null;
    const sessions = program?.week ?? [];
    const hero = heroOf(data);
    const stateCard = hero.kind === 'monday' ? null : <StateCard state={data.state} onChanged={reload} entry={false} />;
    // Today as the training screens read it (src/train/week.ts › todayFor): the server's, the phone's day only without its
    // word (the program not read: the copy the Train tab keeps, or none). One today for the strip, the hero and the card.
    const read = answered !== null && answered.read === data ? { program: answered.program, kept: false } : (data.cardProgram ?? null);
    const kept = read?.kept === true;
    const now = data.readAt ?? new Date();
    const today = todayFor(read?.program ?? null, kept, now);
    const card = todayCardOf({ program: read?.program ?? null, kept, records: data.records ?? [], now });
    // No program on the server (not one that could not be read): the training card's place is the way to build one (K-1037).
    const noProgram =
      data.program.state === 'none' ? (
        <Card testID="build-program-card">
          <BuildProgramPrompt />
        </Card>
      ) : null;
    // The parts the guide points at are held in a view only where there is something to see: an empty one would still add a gap.
    const call =
      hero.kind === 'paused' || hero.kind === 'none' ? null : (
        <View ref={callRef} collapsable={false}>
          <Hero hero={hero} today={today} onChanged={reload} />
        </View>
      );
    const workout =
      card.kind === 'none' ? null : (
        <View ref={workoutRef} collapsable={false}>
          <TodayCard
            card={card}
            program={read?.program ?? null}
            today={today}
            parts={data.todayParts}
            onChanged={(changed) => {
              if (changed !== null) setAnswered({ read: data, program: changed });
              reload();
            }}
          />
        </View>
      );
    guideLines = { workout: workoutLine(card, read?.program ?? null, today) };
    const opened = openDay === null ? null : stripDays(monday, today, sessions, trainedDays(data.week?.workouts), loggedDays(data.week?.weighIns)).find((d) => d.date === openDay);
    if (opened !== undefined && opened !== null)
      daySheet = (
        <DaySheet
          day={opened}
          view={dayView(opened, program, data.week?.workouts.state === 'ready' ? data.week.workouts.value : [], units)}
          onClose={() => setOpenDay(null)}
        />
      );
    top = (
      <>
        <WeekStrip
          head={weekHead(data.consistency, data.firstWeeks)}
          days={stripDays(monday, today, sessions, trainedDays(data.week?.workouts), loggedDays(data.week?.weighIns))}
          onDay={(d) => setOpenDay(d.date)}
        />
        {/* A paused week is the state's own card ("I'm back"); back, its welcome stays until another state is read. With the
            check-in open the Monday block is the one hero: the check-in asks whether the state still holds (word budget). */}
        {stateCard}
        {call}
        {noProgram}
        {workout}
        <FoodLine budget={data.budget} />
      </>
    );
  }

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the "+" floats above it (K-1050).
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <View style={styles.frame}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.body} scrollEventThrottle={16} onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}>
          <View style={styles.head}>
            <ScreenTitle>{t('screens.today.title')}</ScreenTitle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('thisWeek.settings')}
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.gear, { backgroundColor: color.surface }, pressed && styles.dim]}>
              <SymbolView name="gearshape" size={tokens.type.heading} tintColor={color.text} />
            </Pressable>
          </View>
          {problem}
          {top}
        </ScrollView>
        {daySheet}
        <PlusEntry buttonRef={plusRef} />
        <GuideOverlay targets={targets} scroll={scroll} lines={guideLines} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, paddingBottom: PLUS_CLEARANCE, gap: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gear: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  frame: { flex: 1 },
});
