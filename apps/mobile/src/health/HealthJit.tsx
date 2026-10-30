import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ProblemText } from '@/components/ProblemText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { connectHealthJit, healthJitDue } from './justInTime';

/**
 * Apple Health, asked when it is first used (K-980, ADR-018 Ek 1, prototype `#health-jit`): a card under the first weigh-in,
 * once. Continue shows Apple's sheet and records the consent; "Not now" is free and is the once. A permission ask at the moment of a task must not come back (Evre 7 final pass, issue 684): the card seen is the
 * once, answered or not — leaving the screen with the card still there marks it asked. The end of a workout does not ask
 * (the achievement is not the place); Settings › Apple Health gives it any time. Nothing is on the screen when there is
 * nothing to ask (asked before, Apple Health on already, not available in this build, no health data consent). `onSettled`,
 * if given, tells the parent how it ended.
 */
export function HealthJit({ onSettled }: { onSettled?: (how: 'connected' | 'declined') => void }) {
  const { api, health, consents, healthAsk, report } = useAppServices();
  const { color } = useTheme();
  const [due, setDue] = useState(false);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const working = useRef(false); // two taps in the same moment must not show Apple's sheet twice
  // The card was on the screen: the next unmount makes that the once. Once shown it is not asked of the store again while it stays.
  const shown = useRef(false);
  const ask = useRef(healthAsk);
  useEffect(() => {
    ask.current = healthAsk;
  });

  useEffect(() => {
    if (shown.current) return;
    let live = true;
    void healthJitDue({ health, consents, healthAsk })
      .catch(() => false)
      .then((yes) => {
        if (!live) return;
        shown.current = yes;
        setDue(yes);
      });
    return () => {
      live = false;
    };
  }, [health, consents, healthAsk]);

  useEffect(
    () => () => {
      if (shown.current) void ask.current.markAsked().catch(() => undefined);
    },
    [],
  );

  if (!due) return null;

  const connect = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setProblem(null);
    const how = await connectHealthJit({ api, health, consents, healthAsk });
    working.current = false;
    setBusy(false);
    if (how === 'connected') {
      setDue(false);
      onSettled?.('connected');
    } else {
      report({ name: how === 'sheetFailed' ? 'HealthSheetFailed' : 'ConsentRefused' });
      setProblem(t(how === 'sheetFailed' ? 'health.jit.sheetFailed' : 'health.jit.failed'));
    }
  };
  const decline = async () => {
    if (working.current) return;
    working.current = true;
    await healthAsk.markAsked().catch((error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' }));
    working.current = false;
    setDue(false);
    onSettled?.('declined');
  };

  return (
    <Card testID="health-jit">
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('health.jit.title')}
      </Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('health.jit.reads')}</Text>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('health.jit.writes')}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: reading }} onPress={() => setReading((was) => !was)} style={styles.link}>
        <Text style={[styles.strong, { color: color.accent }]}>{t('health.jit.read')}</Text>
      </Pressable>
      {reading && <Text style={[styles.small, { color: color.textSecondary }]}>{t('consent.apple_health.body')}</Text>}
      {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
      <View style={styles.actions}>
        {/* Not the screen's one primary (ADR-070 Ek 2 #1): a secondary and a text button, inside the card. */}
        <Button label={t('health.jit.continue')} variant="secondary" onSurface onPress={() => void connect()} disabled={busy} />
        <Button label={t('health.jit.notNow')} variant="text" onPress={() => void decline()} disabled={busy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  strong: { fontSize: tokens.type.bodySmall, fontWeight: tokens.weight.bold },
  link: { minHeight: tokens.size.touch, justifyContent: 'center' },
  actions: { gap: tokens.space.sm },
});
