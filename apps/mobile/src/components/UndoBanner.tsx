import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { announce } from '@/components/ProblemText';
import { t } from '@/copy';
import { InverseSurface, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { workoutParams } from '@/train/params';

type Props = {
  /** What was saved, one short line after "Saved" ("72.5 kg"). Already translated. */
  detail?: string;
  /** The person tapped Undo. */
  onUndo: () => void;
  /** The banner is done, by Undo or by time: the screen stops showing it. */
  onDismiss: () => void;
  /** How long it stays; the parameter `undo_banner_ms` when not given. */
  durationMs?: number;
  /** Lift it above something at the bottom (the tab bar), in points from the bottom edge. */
  bottomOffset?: number;
};

/**
 * After a save (a weigh-in, cardio, a meal, a set), the one confirmation of the app: a band at the bottom, "Saved · Undo",
 * that goes by itself (ADR-070 Ek 2 #6). The screen shows it by rendering it and stops on `onDismiss`; a new save is a new
 * banner (give it a new `key`). It is the inverse surface, as the decision block is, so it reads on any page.
 */
export function UndoBanner({ detail, onUndo, onDismiss, durationMs = workoutParams.undoBannerMs, bottomOffset = tokens.space.xl }: Props) {
  const { color } = useTheme();
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(true);
  const [fade] = useState(() => new Animated.Value(0));
  // The latest callback, without restarting the timer when the screen re-renders.
  const dismissed = useRef(onDismiss);
  useEffect(() => {
    dismissed.current = onDismiss;
  });

  useEffect(() => {
    announce(detail === undefined ? t('undoBanner.announceBare') : t('undoBanner.announce', { detail }));
  }, [detail]);

  // The time is up: the banner goes. A tap on Undo ends it first (`shown` false), which clears the timer: nothing is dismissed twice.
  useEffect(() => {
    if (!shown) return undefined;
    const timer = setTimeout(() => {
      setShown(false);
      dismissed.current();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, shown]);

  // Reduce Motion: it is there whole at once, not faded in (the style below).
  useEffect(() => {
    if (reduce) return undefined;
    const coming = Animated.timing(fade, { toValue: 1, duration: tokens.motion.bannerMs, useNativeDriver: true });
    coming.start();
    return () => coming.stop();
  }, [reduce, fade]);

  if (!shown) return null;
  const undo = () => {
    setShown(false);
    onUndo();
    onDismiss();
  };
  return (
    <Animated.View
      testID="undo-banner"
      style={[styles.band, { backgroundColor: color.decisionBackground, bottom: bottomOffset, opacity: reduce ? 1 : fade }]}>
      <InverseSurface>
        <BannerWords detail={detail} />
        <Button label={t('undoBanner.undo')} variant="text" onPress={undo} />
      </InverseSurface>
    </Animated.View>
  );
}

/** Inside the inverse surface: the block's own text colours. */
function BannerWords({ detail }: { detail?: string }) {
  const { color } = useTheme();
  return (
    <View style={styles.words}>
      <Text style={[styles.saved, { color: color.text }]}>{t('undoBanner.saved')}</Text>
      {detail !== undefined && <Text style={[styles.detail, { color: color.textSecondary }]}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: tokens.space.lg,
    right: tokens.space.lg,
    minHeight: tokens.size.banner,
    borderRadius: tokens.radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space.sm,
    paddingLeft: tokens.space.lg,
    paddingRight: tokens.space.xs,
  },
  words: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: tokens.space.sm },
  saved: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  detail: { fontSize: tokens.type.bodySmall },
});
