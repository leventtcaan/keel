import { render, screen } from '@testing-library/react-native';

import { type Dot, MoveDots } from '@/train/MoveDots';
import { ThemeProvider } from '@/theme/theme';

// ADR-087 #3 (K-7): ten moves wrapped to two lines and the rest card landed on the first one. The moves share one line,
// whatever their number (this replaces B29's even rows, which wrapped).
const dots = (count: number): Dot[] => Array.from({ length: count }, (_, i) => ({ id: `m${i}`, name: `Move ${i + 1}`, status: '', done: false }));
const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe.each([3, 10, 17])('%i moves', (count) => {
  test('one row that does not wrap, every segment sharing it', async () => {
    await render(
      <ThemeProvider scheme="light">
        <MoveDots dots={dots(count)} selected={0} onPick={() => {}} />
      </ThemeProvider>,
    );
    const style = flat(screen.getByTestId('move-dots').props.style);
    expect(style.flexDirection).toBe('row');
    expect(style.flexWrap).not.toBe('wrap');
    const segments = screen.getAllByRole('button');
    expect(segments).toHaveLength(count);
    for (const segment of segments) {
      const own = flat(segment.props.style);
      expect(own.flex).toBe(1);
      // No fixed share of the line: the width is the row's to split.
      expect(own.flexBasis).toBeUndefined();
      expect(own.maxWidth).toBeUndefined();
    }
  });
});
