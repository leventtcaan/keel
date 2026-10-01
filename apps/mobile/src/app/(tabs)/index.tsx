import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CoachEntry } from '@/components/CoachEntry';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { CallCard } from '@/today/CallCard';
import { CoachChips } from '@/today/CoachChips';
import { ConsistencyCard } from '@/today/ConsistencyCard';
import { TodayList } from '@/today/TodayList';
import { chips } from '@/today/today';
import { useToday } from '@/today/useToday';

/**
 * Today (K-401, prototype 2.1): the consistency number, this week's call, today's list and the coach's chips. Each part
 * stands on its own: what is not there yet says what comes; without the health data consent the number and the call
 * give way to one line and the way to Settings; a part that failed says so once, with a way to try again.
 */
export default function TodayScreen() {
  const { color } = useTheme();
  const { day, data, reload } = useToday();

  const parts = data === null ? [] : Object.values(data);
  const needsConsent = data !== null && (data.consistency.state === 'consent' || data.decision.state === 'consent');
  const failed = parts.some((part) => part.state === 'failed');

  const consent = needsConsent ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.consent.body')}</Text>
      <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
    </View>
  ) : null;
  const problem = failed ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.failed')}</Text>
      <Button label={t('today.retry')} variant="ghost" size="sm" onPress={reload} />
    </View>
  ) : null;
  const consistency =
    data === null || (data.consistency.state !== 'ready' && data.consistency.state !== 'none') ? null : (
      <ConsistencyCard consistency={data.consistency.state === 'ready' ? data.consistency.value : null} />
    );
  const call =
    data === null || (data.decision.state !== 'ready' && data.decision.state !== 'none') ? null : (
      <CallCard decision={data.decision.state === 'ready' ? data.decision.value : null} />
    );
  const list =
    data === null ? null : <TodayList day={day} weighIns={data.weighIns} program={data.program} targets={data.targets} budget={data.budget} />;
  const coachChips = data === null ? null : <CoachChips keys={chips(data, day)} />;

  return (
    // Bottom edge too: inside native tabs the bottom inset includes the tab bar, so the coach bar sits above it.
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <ScreenTitle>{t('screens.today.title')}</ScreenTitle>
          <Button label={t('settings.entry')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
        </View>
        {problem}
        {consent}
        {consistency}
        {call}
        {list}
        {coachChips}
      </ScrollView>
      <View style={styles.coach}>
        <CoachEntry />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
  coach: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.sm },
});
