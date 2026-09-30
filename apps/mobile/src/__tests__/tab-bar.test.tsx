/**
 * The tab bar is the system layer (ADR-016): native tabs, neutral — no custom background — and the brand colour only
 * on the selected tab. The native view is replaced by a recorder so the props given to it can be checked.
 */
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabsLayout from '@/app/(tabs)/_layout';
import { t } from '@/copy';
import { TABS } from '@/navigation/tabs';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes } from '@/theme/tokens';

type MockKids = { children?: ReactNode };

const mockBar: { props?: Record<string, unknown> } = {};
const mockTriggers: { name: string; label?: string; icon?: unknown }[] = [];

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  function Label({ children }: MockKids) {
    return <>{children}</>;
  }
  function Icon() {
    return null;
  }
  function Trigger({ name, children }: MockKids & { name: string }) {
    const entry: { name: string; label?: string; icon?: unknown } = { name };
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as Record<string, unknown>;
      if (child.type === Label) entry.label = String(props.children);
      if (child.type === Icon) entry.icon = props.sf;
    });
    mockTriggers.push(entry);
    return null;
  }
  Trigger.Label = Label;
  Trigger.Icon = Icon;
  function NativeTabs({ children, ...props }: MockKids & Record<string, unknown>) {
    mockBar.props = props;
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) Trigger(child.props as MockKids & { name: string });
    });
    return null;
  }
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

beforeEach(() => {
  mockBar.props = undefined;
  mockTriggers.length = 0;
});

describe.each(['light', 'dark'] as ColorScheme[])('%s theme', (scheme) => {
  test('only the selected tab carries the brand colour; the bar keeps the system background', async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <TabsLayout />
      </ThemeProvider>,
    );
    expect(mockBar.props?.tintColor).toBe(palettes[scheme].accent);
    expect(mockBar.props?.backgroundColor).toBeUndefined();
    expect(mockBar.props?.blurEffect).toBeUndefined();
  });
});

test('one trigger per tab, in order, labelled from en.json, each with a symbol', async () => {
  await render(
    <ThemeProvider scheme="light">
      <TabsLayout />
    </ThemeProvider>,
  );
  expect(mockTriggers).toEqual(
    TABS.map((tab) => ({ name: tab.name, label: t(tab.titleKey), icon: tab.icon })),
  );
});
