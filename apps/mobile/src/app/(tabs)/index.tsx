import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { PlusEntry } from '@/components/PlusEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { Hero } from '@/today/Hero';
import { StateCard } from '@/today/StateCard';
import type { TodayData } from '@/today/today';
import { FoodLine } from '@/today/FoodLine';
import { TodayCard } from '@/today/TodayCard';
import { todayCardOf } from '@/today/todayWorkout';
import { useToday } from '@/today/useToday';
import { WeekStrip } from '@/today/WeekStrip';
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
  const { day, data, reload } = useToday();
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
  if (data !== null) {
    const monday = data.monday ?? weekMonday(data.consistency, data.program, day);
    const program = answered !== null && answered.read === data ? answered.program : data.program.state === 'ready' ? data.program.value : null;
    const sessions = program?.week ?? [];
    const hero = heroOf(data);
    const stateCard = hero.kind === 'monday' ? null : <StateCard state={data.state} onChanged={reload} entry={false} />;
    const card = todayCardOf({ program, day, active: data.active ?? null, doneToday: data.doneToday ?? null });
    top = (
      <>
        <WeekStrip head={weekHead(data.consistency, data.firstWeeks)} days={stripDays(monday, day, sessions, trainedDays(data.week?.workouts), loggedDays(data.week?.weighIns))} />
        {/* A paused week is the state's own card ("I'm back"); back, its welcome stays until another state is read. With the
            check-in open the Monday block is the one hero: the check-in asks whether the state still holds (word budget). */}
        {stateCard}
        <Hero hero={hero} today={day} onChanged={reload} />
        <TodayCard
          card={card}
          program={program}
          today={day}
          parts={data.todayParts}
          onChanged={(changed) => {
            if (changed !== null) setAnswered({ read: data, program: changed });
            reload();
          }}
        />
        <FoodLine budget={data.budget} starting={data.todayParts?.starting ?? null} />
      </>
    );
  }

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the "+" sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
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
      <View style={styles.plus}>
        <PlusEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gear: { width: tokens.size.touch, height: tokens.size.touch, borderRadius: tokens.size.touch / 2, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: tokens.opacity.dim },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  plus: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
