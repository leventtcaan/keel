import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { type Pause, pausedFor } from './pause';
import { clockText } from './session';

type Props = {
  /**
   * When the session began (ms): the workout's startedAt, or the moment it was opened while nothing is kept yet. Null
   * shows no time (a session left open past the server's close).
   */
  since: number | null;
  onEnd: () => void;
  /** The session's pause (K-972): its time is not the session's, and while paused the time stands still. */
  pause: Pause;
  /** Pause, or Resume while paused: on the right, opposite End. */
  onPause: () => void;
  /** Under the time: the day and how far into it. */
  subtitle?: ReactNode;
};

/**
 * The session's top bar (ADR-075 #1, prototype `.wtop`): End on the left, the session's time in the middle, counting
 * every second from its real start, so it begins at 0:00, belongs to this session only and runs on after a restart;
 * Pause on the right (K-972), which stops it until Resume.
 */
export function SessionHeader({ since, onEnd, pause, onPause, subtitle }: Props) {
  const { color } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  // Paused, the time is where the pause began; the pauses before it are not the session's.
  const at = pause.pausedAt ?? now;
  const time = since === null ? null : clockText(Math.max(0, Math.floor((at - since - pausedFor(pause, at)) / 1000)));
  const paused = pause.pausedAt !== null;
  const clock =
    time === null ? null : (
      <Text
        testID="session-clock"
        accessibilityLabel={t('workout.clock.label', { time })}
        style={[styles.clock, { color: color.text }, paused && styles.dim]}>
        {time}
      </Text>
    );
  return (
    <View testID="session-header" style={styles.bar}>
      <View style={styles.side}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.endLabel')}
          onPress={onEnd}
          hitSlop={tokens.space.sm}
          style={({ pressed }) => [styles.control, pressed && styles.dim]}>
          <Text style={[styles.end, { color: color.muted }]}>{t('workout.end')}</Text>
        </Pressable>
      </View>
      <View style={styles.middle}>
        {clock}
        {subtitle}
      </View>
      <View style={[styles.side, styles.right]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(paused ? 'workout.resumeLabel' : 'workout.pauseLabel')}
          onPress={onPause}
          hitSlop={tokens.space.sm}
          style={({ pressed }) => [styles.control, pressed && styles.dim]}>
          <Text style={[styles.end, { color: color.accent }]}>{t(paused ? 'workout.resume' : 'workout.pause')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.sm },
  side: { flex: 1, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  middle: { flexShrink: 1, alignItems: 'center' },
  control: { minHeight: tokens.size.touch, justifyContent: 'center' },
  end: { fontSize: tokens.type.body, fontWeight: tokens.weight.bold },
  clock: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle, fontVariant: ['tabular-nums'] },
  dim: { opacity: tokens.opacity.dim },
});
