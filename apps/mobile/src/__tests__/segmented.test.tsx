/**
 * Segmented (ADR-070 Ek 2 #2, K-1043): two to three exclusive choices in one track, the chosen one raised in the text colour;
 * each segment a button that says whether it is selected and is a full touch target. Colours come from the palette.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactElement, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Segmented } from '@/components/Segmented';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;
const flat = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) ?? {}) as Record<string, unknown>;
const renderIn = (scheme: ColorScheme, ui: ReactElement) => render(<ThemeProvider scheme={scheme}>{ui}</ThemeProvider>);
const segment = (name: string) => screen.getByRole('button', { name });

function Held({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('light');
  return (
    <Segmented
      options={OPTIONS}
      value={value}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
}

describe.each(['light', 'dark'] as const)('in the %s theme', (scheme) => {
  const p = palettes[scheme];

  test('the chosen segment is filled with the text colour and its words take the background colour; the others sit on the track', async () => {
    await renderIn(scheme, <Held />);
    expect(flat(segment('Light'))).toMatchObject({ backgroundColor: p.text });
    expect(flat(screen.getByText('Light'))).toMatchObject({ color: p.background });
    expect(flat(segment('Dark'))).not.toHaveProperty('backgroundColor');
    expect(flat(screen.getByText('Dark'))).toMatchObject({ color: p.text });
  });
});

test('every segment is a button that says whether it is selected, and at least a touch target tall', async () => {
  await renderIn('light', <Held />);
  expect(segment('Light')).toBeSelected();
  expect(segment('Dark')).not.toBeSelected();
  expect(segment('System')).not.toBeSelected();
  for (const option of OPTIONS) expect(flat(segment(option.label)).minHeight).toBeGreaterThanOrEqual(tokens.size.touch);
});

test('a tap tells the caller the value, and the selection moves', async () => {
  const heard = jest.fn();
  await renderIn('light', <Held onChange={heard} />);
  await fireEvent.press(segment('System'));
  expect(heard).toHaveBeenCalledWith('system');
  expect(segment('System')).toBeSelected();
  expect(segment('Light')).not.toBeSelected();
});

test('the segments share the track equally', async () => {
  await renderIn('light', <Held />);
  for (const option of OPTIONS) expect(flat(segment(option.label)).flex).toBe(1);
});
