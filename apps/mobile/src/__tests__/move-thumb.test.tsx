/**
 * A move's icon says only its equipment class (ADR-070 Ek 2 #3, K-1048): the catalog's equipment, as a system symbol through
 * the Icon component; a move whose equipment is not known has no icon at all. No guessed barbell, and no person in a pose:
 * a cable fly once showed a squatting figure.
 */
import { render, screen } from '@testing-library/react-native';

import type { components } from '@/api/schema';
import { ThemeProvider } from '@/theme/theme';
import { MoveThumb } from '@/train/MoveThumb';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { SymbolView: (props: object) => createElement('SymbolView', { ...props, testID: 'symbol' }) };
});

type Equipment = components['schemas']['Equipment'];
const CLASSES: Equipment[] = ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'PLATE_LOADED', 'BODYWEIGHT'];

// The tile is hidden from VoiceOver on purpose: its parts are found among the hidden elements.
const HIDDEN = { includeHiddenElements: true };
const symbol = () => screen.getByTestId('symbol', HIDDEN);
const shown = (equipment: Equipment | undefined) =>
  render(
    <ThemeProvider scheme="light">
      <MoveThumb equipment={equipment} />
    </ThemeProvider>,
  );

describe.each(CLASSES)('%s', (equipment) => {
  test('has the one symbol of its class, drawn by the Icon component (medium weight)', async () => {
    await shown(equipment);
    expect(screen.getByTestId(`move-thumb-${equipment}`, HIDDEN)).toBeTruthy();
    expect(symbol().props).toMatchObject({ weight: 'medium' });
  });

  test('is decorative: the move name is beside it, so VoiceOver passes over it', async () => {
    await shown(equipment);
    expect(screen.getByTestId(`move-thumb-${equipment}`, HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

test('the six classes have six different symbols', async () => {
  await render(
    <ThemeProvider scheme="light">
      {CLASSES.map((equipment) => (
        <MoveThumb key={equipment} equipment={equipment} />
      ))}
    </ThemeProvider>,
  );
  const names = screen.getAllByTestId('symbol', HIDDEN).map((node) => node.props.name as string);
  expect(names).toHaveLength(CLASSES.length);
  expect(new Set(names).size).toBe(CLASSES.length);
});

test('a cable move is not shown as a person in a pose (the squatting figure of the first round)', async () => {
  await shown('CABLE');
  expect(symbol().props.name).not.toMatch(/^figure\./);
});

test('no equipment known: nothing is drawn, not even an empty tile, and no barbell is guessed', async () => {
  const { toJSON } = await shown(undefined);
  expect(toJSON()).toBeNull();
  expect(screen.queryByTestId(/^move-thumb-/, HIDDEN)).toBeNull();
  expect(screen.queryByTestId('symbol', HIDDEN)).toBeNull();
});

test('a machine move (the chest-supported row among them) is not shown with the settings gear, the icon of Settings (K-1057 #12)', async () => {
  await shown('MACHINE');
  expect(symbol().props.name).not.toMatch(/^gear/);
  expect(symbol().props.name).not.toMatch(/^figure\./);
});
