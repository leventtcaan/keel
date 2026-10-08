import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { DecisionBlock } from '@/components/DecisionBlock';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { applyCall } from './call';
import { labelKey } from './today';
import { type Hero as HeroFace, daysBetween, weekdayOf } from './week';

type Schemas = components['schemas'];

type Props = {
  hero: HeroFace;
  /** Today on the phone's calendar: the days to a date the server gave are counted from it. */
  today: string;
  /** The call's details are open below (the call screen is K-978's). */
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
};

const nameOf = (error: unknown) => (error instanceof Error ? error.name : 'Unknown');
// No connection is the user's to fix; a call that is past (409) is said so; anything else is ours, worth another try.
const SAID: Record<string, string> = { NoConnection: 'today.call.applyFailed', ApplyRefused: 'today.call.applyRefused' };

/** "Next call Monday" and "3 days": the day the server named, by its weekday, and the days to it (never worked out here). */
function when(lead: 'thisWeek.hero.nextCall' | 'thisWeek.hero.firstCall', day: string, today: string): [string, string] {
  const days = daysBetween(today, day);
  const count = days <= 0 ? t('thisWeek.hero.today') : days === 1 ? t('thisWeek.hero.tomorrow') : t('thisWeek.hero.inDays', { count: days });
  return [t(lead, { day: t(`onboarding.schedule.dayName.${weekdayOf(day)}`) }), count];
}

/**
 * The one block at the top of This week (ADR-077 #1, prototype `#home` and `#home-mon`): the first week and the first
 * call's day; this week's call by its label and its one line, the next call's day; declined, "Not applied" and the one tap
 * that uses the call after all (K-963); Monday's "Open your call" while the check-in waits; without the consent, the calls
 * are off and the way to Settings (ADR-072 Ek 1). A paused week is the state's own card, not this block.
 */
export function Hero({ hero, today, open, onToggle, onChanged }: Props) {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  // Not used, said for the read it happened on (as CallCard): the call read again is a new try.
  const [failed, setFailed] = useState<{ read: Schemas['Decision']; key: string } | null>(null);
  // A ref, not state: two taps in the same moment both see state from before either ran, a ref they share.
  const sending = useRef(false);

  async function takeCall(decision: Schemas['Decision']) {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await applyCall(api, decision.id);
      setFailed(null);
      onChanged();
    } catch (error) {
      const name = nameOf(error);
      report({ name });
      setFailed({ read: decision, key: SAID[name] ?? 'today.call.applyError' });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const line = (text: string) => <Text style={[styles.line, { color: color.decisionTextSecondary }]}>{text}</Text>;
  const foot = (left: string | null, right: ReactNode) => (
    <View style={[styles.row, styles.foot, { borderTopColor: color.decisionLine }]}>
      {left === null ? <View /> : <Text style={[styles.meta, { color: color.decisionMuted }]}>{left}</Text>}
      {right}
    </View>
  );
  const count = (text: string) => <Text style={[styles.count, { color: color.accentInk }]}>{text}</Text>;

  switch (hero.kind) {
    case 'monday': {
      const ready = hero.week === null ? t('thisWeek.hero.monday.readyNoWeek') : t('thisWeek.hero.monday.ready', { week: hero.week });
      const ask =
        hero.questions === 0 ? null : hero.questions === 1 ? t('thisWeek.hero.monday.one') : t('thisWeek.hero.monday.other', { count: hero.questions });
      // No label of its own: the block's one control is the ritual (prototype `.ritual`).
      return (
        <View testID="hero" style={[styles.block, { backgroundColor: color.decisionBackground }]}>
          <View style={styles.row}>
            <Text style={[styles.meta, { color: color.decisionMuted }]}>{t(`onboarding.schedule.dayName.${hero.weekday}`)}</Text>
            {hero.week === null ? null : <Text style={[styles.meta, { color: color.decisionMuted }]}>{t('thisWeek.week', { week: hero.week })}</Text>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('thisWeek.hero.monday.openLabel')}
            onPress={() => router.push('/check-in')}
            style={({ pressed }) => [styles.ritual, { backgroundColor: color.accentInk }, pressed && styles.dim]}>
            <Text style={[styles.ritualOpen, { color: color.onAccentInk }]}>{t('thisWeek.hero.monday.open')}</Text>
            <Text style={[styles.ritualCall, { color: color.onAccentInk }]}>{t('thisWeek.hero.monday.yourCall')}</Text>
          </Pressable>
          <Text style={[styles.line, styles.center, { color: color.decisionTextSecondary }]}>{ask === null ? ready : `${ready} ${ask}`}</Text>
        </View>
      );
    }
    case 'call': {
      const { decision, declined } = hero;
      const chevron = (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(open ? 'thisWeek.hero.hideCall' : 'thisWeek.hero.openCall')}
          accessibilityState={{ expanded: open }}
          onPress={onToggle}
          hitSlop={tokens.space.md}
          style={styles.chevron}>
          <SymbolView name={open ? 'chevron.down' : 'chevron.right'} size={tokens.type.body} tintColor={color.decisionText} weight="bold" />
        </Pressable>
      );
      const [next, inDays] = when('thisWeek.hero.nextCall', decision.nextReview, today);
      const use = <Button label={t('thisWeek.hero.useCall')} size="sm" disabled={busy} onPress={() => void takeCall(decision)} />;
      return (
        <DecisionBlock testID="hero" eyebrow={t('thisWeek.hero.call')} aside={chevron} title={t(labelKey(decision.copyKey))}>
          {line(declined ? t('thisWeek.hero.notApplied') : t(`${decision.copyKey}.title`))}
          {declined ? foot(t('thisWeek.hero.notAppliedShort'), use) : foot(next, count(inDays))}
          {failed?.read === decision ? <ProblemText style={[styles.meta, { color: color.decisionMuted }]}>{t(failed.key)}</ProblemText> : null}
        </DecisionBlock>
      );
    }
    case 'firstWeek': {
      const call = hero.firstCallOn === null ? null : when('thisWeek.hero.firstCall', hero.firstCallOn, today);
      return (
        <DecisionBlock testID="hero" eyebrow={t('thisWeek.hero.start')} title={t('thisWeek.hero.firstWeek')}>
          {line(t('thisWeek.hero.weighIn'))}
          {call === null ? null : foot(call[0], count(call[1]))}
        </DecisionBlock>
      );
    }
    case 'callsOff': {
      const settings = (
        <Button
          label={t('thisWeek.hero.settings')}
          accessibilityLabel={t('thisWeek.hero.settingsLabel')}
          size="sm"
          variant="ghost"
          onPress={() => router.push('/settings')}
        />
      );
      return (
        <DecisionBlock testID="hero" eyebrow={t('thisWeek.hero.yourWeek')} title={t('thisWeek.hero.callsOff')}>
          {line(t('thisWeek.hero.train'))}
          {foot(null, settings)}
        </DecisionBlock>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  block: { borderRadius: tokens.radius.card, padding: tokens.space.lg, gap: tokens.space.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.sm },
  foot: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.sm, marginTop: tokens.space.xs, flexWrap: 'wrap' },
  meta: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  line: { fontSize: tokens.type.body },
  center: { textAlign: 'center' },
  count: { fontFamily: tokens.font.displayBold, fontSize: tokens.type.number },
  chevron: { minWidth: tokens.size.touch, minHeight: tokens.size.touch, alignItems: 'flex-end', justifyContent: 'center' },
  ritual: {
    alignSelf: 'center',
    width: tokens.size.primaryButton * 2,
    height: tokens.size.primaryButton * 2,
    borderRadius: tokens.size.primaryButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: tokens.space.sm,
  },
  ritualOpen: { fontFamily: tokens.font.display, fontSize: tokens.type.heading },
  ritualCall: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.semibold },
  dim: { opacity: tokens.opacity.dim },
});
