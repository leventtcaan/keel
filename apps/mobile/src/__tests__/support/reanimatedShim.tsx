/**
 * react-native-reanimated for the tests (K-1065). The real library needs its native runtime; under Jest this stands in with the
 * part of its surface the app uses, so a screen's movement can be tested for where it ends, not how it gets there: a shared
 * value is a value that draws the screen again when it is set, `withTiming` is its target at once, and an animated style or
 * prop is its function's answer at the moment of drawing. Set up in jest.setup.ts.
 */
import { useEffect, useReducer, useRef, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';

type Shared<T> = { value: T; set: (next: T) => void; get: () => T };

export function useSharedValue<T>(initial: T): Shared<T> {
  const [, draw] = useReducer((n: number) => n + 1, 0);
  const [box] = useState<Shared<T>>(() => {
    let current = initial;
    const set = (next: T) => {
      if (next === current) return;
      current = next;
      draw();
    };
    return {
      get value() {
        return current;
      },
      set value(next: T) {
        set(next);
      },
      set,
      get: () => current,
    };
  });
  return box;
}

/** The target at once, and the callback told it finished. */
export function withTiming<T>(to: T, _config?: unknown, done?: (finished: boolean) => void): T {
  done?.(true);
  return to;
}
export const withDelay = <T,>(_ms: number, to: T): T => to;
export const cancelAnimation = () => undefined;
export const useAnimatedStyle = <T,>(update: () => T): T => update();
export const useAnimatedProps = <T,>(update: () => T): T => update();

/** The reaction runs when what it prepares has changed, as the library's does (and once at the start). */
export function useAnimatedReaction<T>(prepare: () => T, react: (now: T, before: T | null) => void): void {
  const now = prepare();
  const before = useRef<T | null>(null);
  useEffect(() => {
    if (before.current === now) return;
    const was = before.current;
    before.current = now;
    react(now, was);
  });
}

const curve = (_: unknown) => (t: number) => t;
export const Easing = { out: curve, in: curve, inOut: curve, cubic: (t: number) => t, ease: (t: number) => t, linear: (t: number) => t };

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  createAnimatedComponent: <C,>(component: C): C => component,
};

export default Animated;
export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
