// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Every route sits behind the right guard (K-804, ADR-061). expo-router registers every file in src/app as a route
 * whether the root layout names it or not; a route left out of every <Stack.Protected> opens without a session, a
 * profile or a subscription — a link (keel://…) is enough. So each route of the root stack is a <Stack.Screen> directly
 * inside a <Stack.Protected> (expo-router ignores, then registers unguarded, a screen wrapped in anything else), and only
 * the screens that exist for the other states — signed out, no profile yet, not subscribed — are outside the main guard.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

import app from '../../app.json';

const APP = path.resolve(__dirname, '../app');
const MAIN_GUARD = "signedIn && onboarding === 'done' && gate === 'open'";
/** The screens of the other guards: what a signed-out, not-yet-onboarded or unsubscribed user may open. */
const OTHER_STATES: Record<string, string[]> = {
  "signedIn && onboarding === 'done' && gate !== 'open'": ['subscribe'],
  "signedIn && onboarding === 'needed'": ['onboarding'],
  "signedIn && onboarding === 'unknown'": ['checking'],
  '!signedIn': ['sign-in'],
};

type Screens = { byGuard: Record<string, string[]>; open: string[] };

/** The root layout's <Stack.Screen name="…"> elements, by the guard of the <Stack.Protected> directly holding them. */
function screens(source: string): Screens {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Screens = { byGuard: {}, open: [] };
  const tag = (node: ts.JsxOpeningLikeElement) => node.tagName.getText(file);
  const attribute = (node: ts.JsxOpeningLikeElement, name: string) =>
    node.attributes.properties.filter(ts.isJsxAttribute).find((a) => a.name.getText(file) === name)?.initializer;
  const name = (node: ts.JsxOpeningLikeElement) =>
    attribute(node, 'name')?.getText(file).replace(/^["']|["']$/g, '') ?? '(no name)';
  const guard = (node: ts.JsxOpeningLikeElement) => {
    const value = attribute(node, 'guard');
    return value && ts.isJsxExpression(value) && value.expression ? value.expression.getText(file) : '(no guard)';
  };
  const visit = (node: ts.Node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && tag(opening) === 'Stack.Screen') {
      // The element directly around the screen: a fragment or a wrapper in between hides it from the guard.
      const parent = node.parent;
      if (ts.isJsxElement(parent) && tag(parent.openingElement) === 'Stack.Protected') {
        (found.byGuard[guard(parent.openingElement)] ??= []).push(name(opening));
      } else {
        found.open.push(name(opening));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** The root stack's routes: each route file of src/app (not a layout, not a +special file) and each folder. */
function routes(): string[] {
  return fs
    .readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (/\.[jt]sx?$/.test(entry.name) && !/^[_+]/.test(entry.name)))
    .map((entry) => (entry.isDirectory() ? entry.name : entry.name.replace(/\.[jt]sx?$/, '')))
    .sort();
}

const layout = () => screens(fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8'));
const guarded = (found: Screens) => Object.values(found.byGuard).flat();

test('the reader tells each guard, and a screen it does not hold directly', () => {
  // Guards the reader: if it stopped seeing <Stack.Protected>, or counted a wrapped screen as held, the tests below
  // would pass on nothing.
  const sample = `<Stack>
      <Stack.Protected guard={signedIn}><Stack.Screen name="settings" /><Stack.Screen name="coach" options={{}} /></Stack.Protected>
      <Stack.Protected guard={!signedIn}><><Stack.Screen name="wrapped" /></></Stack.Protected>
      <Stack.Screen name="leak" />
    </Stack>`;
  expect(screens(sample)).toEqual({ byGuard: { signedIn: ['settings', 'coach'] }, open: ['wrapped', 'leak'] });
});

test('no screen of the root stack is outside a guard', () => {
  expect(layout().open).toEqual([]);
});

test('only the screens of the other states are outside the main guard', () => {
  const { byGuard } = layout();
  const others = Object.fromEntries(Object.entries(byGuard).filter(([guard]) => guard !== MAIN_GUARD));
  expect(others).toEqual(OTHER_STATES);
  expect(byGuard[MAIN_GUARD]?.length).toBeGreaterThan(20);
});

test('every route of the app is a guarded screen, and every guarded screen a route', () => {
  expect(routes().length).toBeGreaterThan(20);
  expect([...guarded(layout())].sort()).toEqual(routes());
});

test('every folder of src/app has its own layout', () => {
  // Without one, expo-router puts the folder's files into the root stack as "folder/file": a <Stack.Screen name="folder">
  // would satisfy the check above and guard nothing.
  const folders = fs.readdirSync(APP, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  expect(folders.length).toBeGreaterThan(0);
  for (const folder of folders) {
    expect(fs.readdirSync(path.join(APP, folder.name)).filter((name) => /^_layout\.[jt]sx?$/.test(name))).toHaveLength(1);
  }
});

test("expo-router's generated sitemap is off: it would open unguarded", () => {
  const plugin = app.expo.plugins.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === 'expo-router');
  expect(Array.isArray(plugin) ? plugin[1] : undefined).toMatchObject({ sitemap: false });
});
