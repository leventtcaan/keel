import { useEffect, useRef } from 'react';

import { t } from '@/copy';
import { focusPalette } from '@/theme/tokens';

import { type LivePress, liveRest } from './liveRest';
import { workoutParams } from './params';

/**
 * Draws nothing: while it is on the screen (the rest is the screen, K-1207) the rest is on the lock screen and in the Dynamic
 * Island too (K-1215). It starts the Live Activity, moves it when the end of the rest or the next set changes (-15 / +15, a
 * new move), and ends it when it goes (Ready, a pause, the session left). The buttons of the activity do what the screen's do;
 * if they are never delivered, nothing is lost: the screen counts from its timestamp.
 */
export function RestLive({
  since,
  endsAt,
  title,
  next,
  onShift,
  onReady,
}: {
  since: number;
  endsAt: number;
  title: string;
  next: string;
  onShift: (seconds: number) => void;
  onReady: () => void;
}) {
  useEffect(() => {
    liveRest.show({
      title,
      next,
      label: t('workout.rest.label'),
      less: t('workout.rest.less', { seconds: workoutParams.restAdjustSeconds }),
      more: t('workout.rest.more', { seconds: workoutParams.restAdjustSeconds }),
      ready: t('workout.rest.end'),
      accent: focusPalette.accent,
      since,
      endsAt,
    });
  }, [since, endsAt, title, next]);
  // The latest handlers, so the one listener below never holds a stale rest.
  const handlers = useRef({ onShift, onReady });
  useEffect(() => {
    handlers.current = { onShift, onReady };
  });
  useEffect(() => {
    const step = workoutParams.restAdjustSeconds;
    const stopListening = liveRest.onPress((press: LivePress) => {
      if (press === 'ready') handlers.current.onReady();
      else handlers.current.onShift(press === 'less' ? -step : step);
    });
    return () => {
      stopListening();
      liveRest.stop();
    };
  }, []);
  return null;
}
