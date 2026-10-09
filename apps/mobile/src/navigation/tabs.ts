/**
 * The main tabs, in order (ADR-069 #4: This week, Train, Progress; the app opens on This week). `name` is the route file in
 * app/(tabs)/, `titleKey` the en.json key, `icon` the SF Symbol for the unselected and selected tab. The one "+" sits on
 * every tab (components/PlusEntry), not in the bar.
 */
import type { SFSymbolIcon } from 'expo-router/unstable-native-tabs';

/** An SF Symbol name, as the native tabs type it (kept from expo-router, not a transitive package). */
type SFSymbol = Extract<NonNullable<SFSymbolIcon['sf']>, string>;

export type TabRoute = {
  name: 'index' | 'train' | 'progress';
  titleKey: string;
  icon: { default: SFSymbol; selected: SFSymbol };
};

export const TABS: readonly TabRoute[] = [
  { name: 'index', titleKey: 'tabs.today', icon: { default: 'calendar', selected: 'calendar' } },
  { name: 'train', titleKey: 'tabs.train', icon: { default: 'dumbbell', selected: 'dumbbell.fill' } },
  {
    name: 'progress',
    titleKey: 'tabs.progress',
    icon: { default: 'chart.line.uptrend.xyaxis', selected: 'chart.line.uptrend.xyaxis' },
  },
];

/**
 * Screens taken off the surface (ADR-069 #3): their code stays, and nothing opens them, a link neither (the root layout
 * holds them behind a guard that is never true). The coach and the meal photo among them: with the AI off, no dead end
 * (K-909). Order as in the root layout.
 */
export const RETIRED = ['food', 'coach', 'meal-photo', 'recipes', 'recipe', 'why', 'scoff', 'projection', 'ledger', 'what-if', 'workout-summary'] as const;
