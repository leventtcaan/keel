/**
 * The main tabs, in order (Levent, 29 Sep: the app opens on Today; ADR-006). `name` is the route file in
 * app/(tabs)/, `titleKey` the en.json key, `icon` the SF Symbol for the unselected and selected tab.
 */
import type { SFSymbolIcon } from 'expo-router/unstable-native-tabs';

/** An SF Symbol name, as the native tabs type it (kept from expo-router, not a transitive package). */
type SFSymbol = Extract<NonNullable<SFSymbolIcon['sf']>, string>;

export type TabRoute = {
  name: 'index' | 'train' | 'food' | 'progress';
  titleKey: string;
  icon: { default: SFSymbol; selected: SFSymbol };
};

export const TABS: readonly TabRoute[] = [
  { name: 'index', titleKey: 'tabs.today', icon: { default: 'sun.max', selected: 'sun.max.fill' } },
  { name: 'train', titleKey: 'tabs.train', icon: { default: 'dumbbell', selected: 'dumbbell.fill' } },
  { name: 'food', titleKey: 'tabs.food', icon: { default: 'fork.knife', selected: 'fork.knife' } },
  {
    name: 'progress',
    titleKey: 'tabs.progress',
    icon: { default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' },
  },
];
