/**
 * User-facing text reaches components only through t() (K2, ADR-010). Two holes the key check cannot see:
 * - raw text written straight into JSX (<Text>Hello</Text>) or into a text prop (label="Apply");
 * - a template placeholder the caller never fills, which would show the user a literal "{name}".
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

import en from '../../../../data/copy/en.json';

type Json = { [key: string]: string | Json };

const SRC = path.resolve(__dirname, '..');
/** Props and navigation options whose value the user reads or VoiceOver speaks. */
const TEXT_PROPS = new Set([
  'label', 'title', 'eyebrow', 'placeholder', 'accessibilityLabel', 'accessibilityHint',
  'tabBarLabel', 'headerTitle', 'headerBackTitle',
]);
const LETTER = /\p{L}/u;

function sourceFiles(dir: string, ext: RegExp): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' || entry.name === 'api' ? [] : sourceFiles(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

function lookup(key: string): string | undefined {
  const node = key.split('.').reduce<string | Json | undefined>(
    (tree, part) => (tree !== undefined && typeof tree !== 'string' ? tree[part] : undefined),
    en as Json,
  );
  return typeof node === 'string' ? node : undefined;
}

const placeholders = (template: string) => new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

const isStringLike = (node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node);

function literalText(node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression): string {
  return ts.isTemplateExpression(node)
    ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join('')
    : node.text;
}

/** String literals under `node` that are not arguments of a call — t('key') and friends are keys, not text. */
function textLiterals(node: ts.Node): string[] {
  if (ts.isCallExpression(node)) return [];
  if (isStringLike(node)) return LETTER.test(literalText(node)) ? [literalText(node)] : [];
  const found: string[] = [];
  ts.forEachChild(node, (child) => void found.push(...textLiterals(child)));
  return found;
}

/** The text a prop value shows: a literal, or either branch of a conditional — never a nested style object. */
function valueText(node: ts.Node): string[] {
  if (ts.isJsxExpression(node)) return node.expression ? valueText(node.expression) : [];
  if (ts.isParenthesizedExpression(node)) return valueText(node.expression);
  if (ts.isConditionalExpression(node)) return [...valueText(node.whenTrue), ...valueText(node.whenFalse)];
  if (ts.isBinaryExpression(node)) return [...valueText(node.left), ...valueText(node.right)];
  return isStringLike(node) && LETTER.test(literalText(node)) ? [literalText(node)] : [];
}

const propName = (name: ts.Node) =>
  ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : ts.isJsxNamespacedName(name) ? '' : name.getText();

/**
 * User-facing text written into code instead of en.json: JSX text, literals inside JSX children
 * ({'Eat more'}, {ok ? 'Yes' : 'No'}), and literals given to a text prop or option (label="Apply",
 * options={{ title: 'Today' }}). Reads the syntax tree, so formatting cannot hide it.
 */
export function rawJsxText(source: string, fileName = 'file.tsx'): string[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && LETTER.test(node.text)) {
      found.push(node.text.trim().replace(/\s+/g, ' '));
    } else if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      if (node.expression) found.push(...textLiterals(node.expression));
    } else if (ts.isJsxAttribute(node) && TEXT_PROPS.has(propName(node.name)) && node.initializer) {
      found.push(...valueText(node.initializer));
    } else if (ts.isPropertyAssignment(node) && TEXT_PROPS.has(propName(node.name))) {
      found.push(...valueText(node.initializer));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

export function unfilledPlaceholders(source: string): string[] {
  const problems: string[] = [];
  // t('key') and t('key', { a, b: 1 }) with an inline object; a call that passes a variable cannot be read here.
  for (const m of source.matchAll(/\bt\(\s*['"]([\w.]+)['"]\s*(?:,\s*\{([^}]*)\})?\s*(,|\))/g)) {
    const template = lookup(m[1]);
    if (template === undefined) continue; // copy-keys.test.ts reports missing keys
    if (m[2] === undefined && m[3] === ',') continue; // vars passed as a variable
    const given = new Set((m[2] ?? '').split(',').map((part) => part.split(':')[0].trim()).filter(Boolean));
    for (const name of placeholders(template)) if (!given.has(name)) problems.push(`${m[1]} needs {${name}}`);
  }
  return problems;
}

test('no raw user-facing text in components or screens', () => {
  const offenders = sourceFiles(SRC, /\.(ts|tsx)$/).flatMap((file) =>
    rawJsxText(fs.readFileSync(file, 'utf8'), file).map((text) => `${path.relative(SRC, file)}: "${text}"`),
  );
  expect(offenders).toEqual([]);
});

test('every literal t() call fills every placeholder of its template', () => {
  const offenders = sourceFiles(SRC, /\.(ts|tsx)$/).flatMap((file) =>
    unfilledPlaceholders(fs.readFileSync(file, 'utf8')).map((p) => `${path.relative(SRC, file)}: ${p}`),
  );
  expect(offenders).toEqual([]);
});

describe('the detectors themselves', () => {
  test.each([
    ['<Text>Eat a little more</Text>', 'Eat a little more'],
    ['<Text>3 sets left</Text>', '3 sets left'],
    ["<Text>{'Eat more'}</Text>", 'Eat more'],
    ['<Text>Eat {n} more</Text>', 'Eat'],
    ["<Text>{ok ? 'Yes' : 'No'}</Text>", 'Yes'],
    ['<Text>{`${n} kg to go`}</Text>', ' kg to go'],
    ['<Button label="Apply" onPress={go} />', 'Apply'],
    ["<Button label={'Apply'} />", 'Apply'],
    ['<Text accessibilityLabel="Week">{t("a.b")}</Text>', 'Week'],
    ["<Tabs.Screen options={{ title: 'Today' }} />", 'Today'],
    ["<Tabs.Screen options={{ tabBarLabel: `Today` }} />", 'Today'],
    ["const header = { headerTitle: 'Coach' };", 'Coach'],
    ["<Chip label={on ? 'On' : 'Off'} />", 'Off'],
  ])('flags %s', (source, text) => {
    expect(rawJsxText(source)).toContain(text);
  });

  test.each([
    "<Text>{t('tabs.today')}</Text>",
    '<Text>{t(`screens.${screen}.title`)}</Text>',
    "<Text>{' '}</Text>",
    '<View testID="card" edges={["top"]} />',
    "<Tabs.Screen name=\"index\" options={{ title: t('tabs.today') }} />",
    "const style = { fontFamily: tokens.font.display, textTransform: 'uppercase' };",
    "throw new Error('useTheme() needs a provider');",
    "const styles = StyleSheet.create({ title: { textTransform: 'uppercase', fontFamily: tokens.font.display } });",
  ])('lets %s through', (source) => {
    expect(rawJsxText(source)).toEqual([]);
  });

  test('find a placeholder the call leaves empty', () => {
    expect(unfilledPlaceholders("t('format.range')")).toEqual(['format.range needs {low}', 'format.range needs {high}']);
    expect(unfilledPlaceholders("t('format.range', { low })")).toEqual(['format.range needs {high}']);
  });

  test('accept a call that fills every placeholder or passes a variable', () => {
    expect(unfilledPlaceholders("t('format.range', { low, high: 3 })")).toEqual([]);
    expect(unfilledPlaceholders("t('format.range', vars)")).toEqual([]);
    expect(unfilledPlaceholders("t('tabs.today')")).toEqual([]);
  });
});
