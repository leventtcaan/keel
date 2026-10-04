// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * The rule scanners prove themselves: each pattern catches known-bad samples and lets known-good ones through, and the
 * file walk really reaches the code. Without this, a broken regex would make every rule test pass on nothing.
 */
import * as path from 'path';

import { PATTERNS, SRC, sourceFiles } from './support/sourceScan';

const samples: Record<keyof typeof PATTERNS, { bad: string[]; good: string[] }> = {
  colour: {
    bad: ["backgroundColor: '#FFF'", "color: '#B0129A'", 'rgba(0,0,0,.5)', "color: 'white'", "tintColor='black'",
      "borderColor: 'transparent'", "PlatformColor('label')", 'color={"red"}'],
    good: ['color: color.text', 'backgroundColor: p.accent', "testID: 'card'", "accessibilityRole: 'button'"],
  },
  uppercase: {
    bad: ["textTransform: 'uppercase'", '{label.toUpperCase()}'],
    good: ["textTransform: 'none'", 'label.toLowerCase()'],
  },
  fontName: {
    bad: ["fontFamily: 'Barlow'", 'fontFamily: "System"', 'fontFamily={`x`}'],
    good: ['fontFamily: tokens.font.display'],
  },
  fontSizeOrWeight: {
    bad: ['fontSize: 15', "fontWeight: '700'", "fontWeight: 'bold'", 'fontSize: "12"'],
    good: ['fontSize: tokens.type.body', 'fontWeight: tokens.weight.bold'],
  },
};

describe.each(Object.keys(samples) as (keyof typeof PATTERNS)[])('%s pattern', (name) => {
  test.each(samples[name].bad)('catches %s', (text) => {
    expect(text).toMatch(PATTERNS[name]);
  });

  test.each(samples[name].good)('lets %s through', (text) => {
    expect(text).not.toMatch(PATTERNS[name]);
  });
});

test('the walk reaches components, screens and the theme, and skips tests and generated types', () => {
  const files = sourceFiles().map((file) => path.relative(SRC, file));
  expect(files).toEqual(
    expect.arrayContaining(['components/Button.tsx', 'components/DecisionBlock.tsx', 'app/_layout.tsx', 'theme/theme.tsx']),
  );
  expect(files.some((file) => file.startsWith('__tests__') || file.startsWith('api'))).toBe(false);
});
