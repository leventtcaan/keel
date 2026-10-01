import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { workoutParams } from './params';
import { restText } from './session';

/**
 * Rest since the last set, counting up, with the band to aim for (G1 K-49: 2-3 minutes). It runs while the screen is
 * open; the timer in the background and on the lock screen are K-411.
 */
export function RestTimer({ since }: { since: number }) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <View style={[styles.rest, { backgroundColor: color.decisionBackground }]}>
      <Text style={[styles.time, { color: color.decisionText }]}>{restText(seconds)}</Text>
      <Text style={[styles.label, { color: color.accentInk }]}>
        {t('workout.rest.label', { min: restText(workoutParams.restSecondsMin), max: restText(workoutParams.restSecondsMax) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rest: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, padding: tokens.space.md, borderRadius: tokens.radius.card },
  time: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
});
