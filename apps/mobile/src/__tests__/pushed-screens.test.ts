/**
 * One way back (ADR-070 Ek 2 #4, K-1043): a pushed screen has the system header with a back button named for the screen before
 * it. `previousScreenName` finds that name in the stack's state: the tabs are one screen of the stack, so it is the tab in
 * view that gives it. navigation.test.tsx has the real stack; this is the rule.
 */
import { t } from '@/copy';
import { previousScreenName, pushedScreen } from '@/navigation/pushed';
import { palettes } from '@/theme/tokens';

const tabs = (inView?: string) => ({ key: 't', name: '(tabs)', ...(inView === undefined ? {} : { state: { index: ['index', 'train', 'progress'].indexOf(inView), routes: [{ name: 'index' }, { name: 'train' }, { name: 'progress' }] } }) });

describe('previousScreenName', () => {
  test.each([
    ['index', t('tabs.today')],
    ['train', t('tabs.train')],
    ['progress', t('tabs.progress')],
  ])('over the %s tab, the back button says %s', (tab, name) => {
    expect(previousScreenName({ routes: [tabs(tab), { key: 's', name: 'settings' }] }, 's')).toBe(name);
  });

  test('over the tabs before they were ever switched (no state yet), it is This week, the tab the app opens on', () => {
    expect(previousScreenName({ routes: [tabs(), { key: 's', name: 'settings' }] }, 's')).toBe(t('tabs.today'));
  });

  test('over Settings it says Settings; over the gyms, Gyms; over Edit program, Edit program', () => {
    expect(previousScreenName({ routes: [tabs(), { key: 'a', name: 'settings' }, { key: 'b', name: 'settings-detail' }] }, 'b')).toBe(t('settings.title'));
    expect(previousScreenName({ routes: [tabs(), { key: 'a', name: 'gyms' }, { key: 'b', name: 'gym' }] }, 'b')).toBe(t('gyms.title'));
    expect(previousScreenName({ routes: [tabs(), { key: 'a', name: 'edit-program' }, { key: 'b', name: 'edit-program' }] }, 'b')).toBe(t('editProgram.title'));
  });

  test('a screen that is first in the stack, or after one with no name to give, leaves it to the system ("Back")', () => {
    expect(previousScreenName({ routes: [{ key: 's', name: 'settings' }] }, 's')).toBeUndefined();
    expect(previousScreenName({ routes: [{ key: 'a', name: 'food' }, { key: 's', name: 'settings' }] }, 's')).toBeUndefined();
  });
});

describe('pushedScreen', () => {
  test('shows the system header on the page background, with the accent as the back button, no title and no hairline', () => {
    expect(pushedScreen(palettes.light, 'Train')).toEqual({
      headerShown: true,
      title: '',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: palettes.light.background },
      headerTintColor: palettes.light.accent,
      headerBackTitle: 'Train',
    });
  });

  test('with no name to give, the back button says "Back" (generic) rather than the name of a route', () => {
    expect(pushedScreen(palettes.dark, undefined)).toMatchObject({ headerBackButtonDisplayMode: 'generic' });
    expect(pushedScreen(palettes.dark, undefined)).not.toHaveProperty('headerBackTitle');
  });
});
