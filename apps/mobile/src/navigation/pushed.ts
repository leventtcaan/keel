/**
 * One way back (ADR-070 Ek 2 #4): a screen pushed onto the stack has the system header with the system back button, "‹" and the
 * name of the screen it came from. No screen draws its own "Back". A sheet keeps "Done" at its top right (or a swipe down), and
 * has no header. The title of a pushed screen is the large one in its content (ScreenTitle), so the header is the back button alone.
 */
import { t } from '@/copy';
import { TABS } from '@/navigation/tabs';
import type { Palette } from '@/theme/tokens';

/** A route in the stack's state, with the state of the navigator inside it, if it has one (the tabs). */
type RouteState = { key: string; name: string; state?: { index?: number; routes: { name: string }[] } };

/** What a screen is called when another names it as the one it came from. Tabs are named by the tab in view. */
const NAMED: Record<string, string> = {
  settings: 'settings.title',
  'settings-detail': 'settings.title',
  'edit-program': 'editProgram.title',
};

/**
 * The name the back button carries on the screen `key`: the one before it in the stack. The tabs are one screen of the stack,
 * so it is the tab in view that gives the name (This week, Train, Progress). A screen with no name of its own to give leaves the
 * system to say "Back".
 */
export function previousScreenName(state: { routes: RouteState[] }, key: string): string | undefined {
  const at = state.routes.findIndex((route) => route.key === key);
  const previous = at > 0 ? state.routes[at - 1] : undefined;
  if (previous === undefined) return undefined;
  if (previous.name === '(tabs)') {
    const inView = previous.state?.routes[previous.state.index ?? 0]?.name ?? TABS[0].name;
    const tab = TABS.find((candidate) => candidate.name === inView);
    return tab === undefined ? undefined : t(tab.titleKey);
  }
  const named = NAMED[previous.name];
  return named === undefined ? undefined : t(named);
}

/** The header of a pushed screen: the back button on the page's own background, no title, no hairline. */
export function pushedScreen(color: Palette, backTitle: string | undefined) {
  return {
    headerShown: true,
    title: '',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: color.background },
    headerTintColor: color.accent,
    ...(backTitle === undefined ? { headerBackButtonDisplayMode: 'generic' as const } : { headerBackTitle: backTitle }),
  };
}
