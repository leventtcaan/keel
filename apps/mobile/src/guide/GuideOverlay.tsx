import { type MutableRefObject, type RefObject, useContext, useEffect, useState } from 'react';
import { Modal, Pressable, type ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from '@/motion/reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { Button } from '@/components/Button';
import { t } from '@/copy';
import { useTween } from '@/motion/useTween';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useReduceMotion } from '@/theme/useReduceMotion';

import { useGuide } from './GuideProvider';
import { ORDER, type Rect as Frame, type StepId, cardPlacement, clipped, holePath } from './steps';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** What the guide needs of a part of the screen: where it stands in the window. A View's ref is one. */
export type Measurable = { measureInWindow: (done: (x: number, y: number, width: number, height: number) => void) => void };
type Target = RefObject<Measurable | null>;

type Props = {
  /** The parts of This week the steps point at, by the ref of the view that holds each; a part not drawn has a ref with no view. */
  targets: Partial<Record<Exclude<StepId, 'tabs'>, Target>>;
  /** The screen's scroll, so a part below the fold is brought into view for its step. */
  scroll?: { ref: RefObject<ScrollView | null>; y: MutableRefObject<number> };
};

function measure(target: Target | undefined): Promise<Frame | null> {
  return new Promise((resolve) => {
    const view = target?.current;
    if (view === null || view === undefined) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

const inflate = (rect: Frame, by: number): Frame => ({ x: rect.x - by, y: rect.y - by, width: rect.width + 2 * by, height: rect.height + 2 * by });
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const same = (a: Frame, b: Frame) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Where a part stands once it has stopped moving: the guide opens as This week comes into view, while the screen over it (Settings)
 * is still sliding away, and a part measured then is where it was a moment ago. Measured again until two reads agree.
 */
async function settled(target: Target | undefined): Promise<Frame | null> {
  let last = await measure(target);
  for (let tries = 0; tries < tokens.motion.guideSettleTries; tries++) {
    await pause(tokens.motion.guideSettleMs);
    const now = await measure(target);
    if (now !== null && last !== null && same(now, last)) return now;
    last = now;
  }
  return last;
}

/**
 * The first-use guide (K-1065): a short walk over This week, right after the plan and the paywall. The screen is dimmed except
 * the part a step is about, which is ringed in the accent; under or over it a card says what it is in a line. A tap anywhere,
 * or Next, goes on; Skip is on every step. The steps are the call, today's workout, the "+" and the tabs (Train, Progress);
 * a part that is not on the screen is left out. Opened by `useGuide().arrive()` the first time and by Settings' "How it works".
 * The dim and the ring move from one part to the next with react-native-reanimated, and are simply there under Reduce Motion.
 */
export function GuideOverlay(props: Props) {
  // The walk is mounted for as long as the guide is open: each opening starts from its first step.
  return useGuide().open ? <Walk {...props} /> : null;
}

function Walk({ targets, scroll }: Props) {
  const guide = useGuide();
  const window = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0 };
  // The steps are the parts the screen has when the guide opens.
  const [ids] = useState<StepId[]>(() => ORDER.filter((id) => id === 'tabs' || targets[id]?.current != null));
  const [at, setAt] = useState(0);
  const [rect, setRect] = useState<Frame | null>(null);

  const last = at >= ids.length - 1;
  const close = guide.close;
  const next = () => (last ? close() : setAt(at + 1));

  useEffect(() => {
    const id = ids[at];
    if (id === undefined) return;
    let live = true;
    // Where the tab bar starts: just under the "+", which stands above it; without the "+", where the bottom inset says.
    const tabTop = async (): Promise<number> => {
      const plus = await settled(targets.plus);
      return plus === null ? window.height - insets.bottom - tokens.size.tabBar : plus.y + plus.height + tokens.space.md;
    };
    const find = async (): Promise<Frame | null> => {
      if (id === 'tabs') {
        const top = await tabTop();
        return { x: 0, y: top, width: window.width, height: window.height - top };
      }
      let found = await settled(targets[id]);
      if (found === null) return null;
      const floor = (await tabTop()) - tokens.space.xl;
      // Below the fold: the screen scrolls up to it, as far as its top stays in view.
      if (id !== 'plus' && found.y + found.height > floor && scroll?.ref.current != null) {
        const by = Math.min(found.y + found.height - floor, found.y - (insets.top + tokens.space.lg));
        if (by > 0) {
          scroll.ref.current.scrollTo({ y: scroll.y.current + by, animated: false });
          found = await settled(targets[id]);
          if (found === null) return null;
        }
      }
      // The "+" floats over the scroll, in view wherever it is; the rest is cut at the fold, above the "+" and the tab bar.
      const seen = clipped(found, window, id === 'plus' ? 0 : window.height - floor);
      return seen === null ? null : inflate(seen, tokens.space.sm);
    };
    void find().then((found) => {
      if (!live) return;
      if (found !== null) return setRect(found);
      // Nothing to point at (the part is not there to see): the step is left out.
      if (at < ids.length - 1) setAt(at + 1);
      else close();
    });
    return () => {
      live = false;
    };
  }, [ids, at, targets, scroll, window, insets.bottom, insets.top, close]);

  const id = ids[at];
  if (rect === null || id === undefined) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Pressable
        testID="guide-backdrop"
        accessibilityRole="button"
        accessibilityLabel={t(last ? 'guide.done' : 'guide.next')}
        accessible={false}
        style={StyleSheet.absoluteFill}
        onPress={next}>
        <Spotlight rect={rect} round={id === 'plus'} />
      </Pressable>
      <Card key={id} id={id} index={at} total={ids.length} rect={rect} last={last} onNext={next} onSkip={close} />
    </Modal>
  );
}

/** The dim with a hole where the part is, and the ring round it; both ease to the next part. */
function Spotlight({ rect, round }: { rect: Frame; round: boolean }) {
  const { color } = useTheme();
  const window = useWindowDimensions();
  const reduce = useReduceMotion();
  const { guideMs } = tokens.motion;
  const x = useTween(rect.x, { reduce, from: rect.x, ms: guideMs });
  const y = useTween(rect.y, { reduce, from: rect.y, ms: guideMs });
  const width = useTween(rect.width, { reduce, from: rect.width, ms: guideMs });
  const height = useTween(rect.height, { reduce, from: rect.height, ms: guideMs });
  const appear = useTween(1, { reduce, from: 0, ms: guideMs });
  // The corner: the card's, and a full circle for the round "+" (the radius is cut to half the side).
  const corner = useTween(round ? Math.max(rect.width, rect.height) : tokens.radius.card, { reduce, from: round ? Math.max(rect.width, rect.height) : tokens.radius.card, ms: guideMs });
  const dim = useAnimatedProps(() => ({ d: holePath(x.value, y.value, width.value, height.value, window, corner.value) }));
  const ring = useAnimatedProps(() => ({
    x: x.value,
    y: y.value,
    width: width.value,
    height: height.value,
    rx: Math.min(corner.value, width.value / 2, height.value / 2),
  }));
  const fade = useAnimatedStyle(() => ({ opacity: appear.value }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade]}>
      <Svg accessible={false} width={window.width} height={window.height}>
        <AnimatedPath
          animatedProps={dim}
          d={holePath(rect.x, rect.y, rect.width, rect.height, window, round ? Math.max(rect.width, rect.height) : tokens.radius.card)}
          fill={color.shadow}
          fillOpacity={tokens.opacity.guideDim}
          fillRule="evenodd"
        />
        <AnimatedRect animatedProps={ring} x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={round ? Math.max(rect.width, rect.height) / 2 : tokens.radius.card} fill="none" stroke={color.accent} strokeWidth={tokens.border.outline} />
      </Svg>
    </Animated.View>
  );
}

type CardProps = { id: StepId; index: number; total: number; rect: Frame; last: boolean; onNext: () => void; onSkip: () => void };

/** One step's card: which step of how many, what it is in a line, Next, and Skip. It rises in as the step comes. */
function Card({ id, index, total, rect, last, onNext, onSkip }: CardProps) {
  const { color } = useTheme();
  const window = useWindowDimensions();
  const reduce = useReduceMotion();
  const appear = useTween(1, { reduce, from: 0, ms: tokens.motion.guideMs });
  const rise = useAnimatedStyle(() => ({ opacity: appear.value, transform: [{ translateY: (1 - appear.value) * tokens.motion.revealRise }] }));
  const placed =
    cardPlacement(rect, window) === 'below'
      ? { top: rect.y + rect.height + tokens.space.md }
      : { bottom: window.height - rect.y + tokens.space.md };
  const dots = Array.from({ length: total }, (_, i) => (
    <View key={i} style={[styles.dot, { backgroundColor: i === index ? color.accent : color.edge }]} />
  ));
  return (
    <Animated.View
      testID={`guide-step-${id}`}
      accessibilityViewIsModal
      style={[styles.card, placed, { backgroundColor: color.background, shadowColor: color.shadow }, rise]}>
      <View style={styles.head}>
        <Text style={[styles.step, { color: color.muted }]}>{t('guide.step', { step: index + 1, total })}</Text>
        <Button label={t('guide.skip')} accessibilityLabel={t('guide.skipLabel')} variant="text" size="sm" onPress={onSkip} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t(`guide.${id}.title`)}
      </Text>
      <Text style={[styles.body, { color: color.textSecondary }]}>{t(`guide.${id}.body`)}</Text>
      <View style={styles.foot}>
        <View accessible={false} style={styles.dots}>
          {dots}
        </View>
        <Button label={t(last ? 'guide.done' : 'guide.next')} size="sm" onPress={onNext} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: tokens.space.lg,
    right: tokens.space.lg,
    borderRadius: tokens.radius.card,
    padding: tokens.space.md,
    gap: tokens.space.sm,
    shadowOpacity: tokens.float.opacity,
    shadowRadius: tokens.float.blur,
    shadowOffset: { width: 0, height: tokens.float.offsetY },
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  body: { fontSize: tokens.type.body },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: tokens.space.xs },
  dots: { flexDirection: 'row', gap: tokens.space.xs },
  dot: { width: tokens.space.sm, height: tokens.space.sm, borderRadius: tokens.space.sm / 2 },
});
