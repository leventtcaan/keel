/**
 * Every route sits behind a guard (K-804, ADR-061). expo-router registers every file in src/app as a route whether the
 * root layout names it or not; a route left out of every <Stack.Protected> opens without a session, a profile or a
 * subscription — a link (keel://…) is enough. So each route of the root stack must be a <Stack.Screen> inside one.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const APP = path.resolve(__dirname, '../app');

type Screens = { guarded: string[]; open: string[] };

/** The root layout's <Stack.Screen name="…"> elements, by whether a <Stack.Protected> holds them. */
function screens(source: string): Screens {
  const file = ts.createSourceFile('_layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Screens = { guarded: [], open: [] };
  const tag = (node: ts.JsxOpeningLikeElement) => node.tagName.getText(file);
  const name = (node: ts.JsxOpeningLikeElement) =>
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .find((attribute) => attribute.name.getText(file) === 'name')
      ?.initializer?.getText(file)
      .replace(/^["']|["']$/g, '');
  const visit = (node: ts.Node, guarded: boolean) => {
    let inside = guarded;
    if (ts.isJsxElement(node) && tag(node.openingElement) === 'Stack.Protected') inside = true;
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && tag(opening) === 'Stack.Screen') {
      found[guarded ? 'guarded' : 'open'].push(name(opening) ?? '(no name)');
    }
    ts.forEachChild(node, (child) => visit(child, inside));
  };
  visit(file, false);
  return found;
}

/** The root stack's routes: each file of src/app (not a layout) and each folder, a group "(tabs)" included. */
function routes(): string[] {
  return fs
    .readdirSync(APP, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (/\.tsx?$/.test(entry.name) && !entry.name.startsWith('_')))
    .map((entry) => (entry.isDirectory() ? entry.name : entry.name.replace(/\.tsx?$/, '')))
    .sort();
}

const layout = () => screens(fs.readFileSync(path.join(APP, '_layout.tsx'), 'utf8'));

test('the reader tells a guarded screen from an open one', () => {
  // Guards the reader: if it stopped seeing <Stack.Protected>, every screen would count as guarded and the test pass on nothing.
  const sample = `<Stack>
      <Stack.Protected guard={signedIn}><Stack.Screen name="settings" /><Stack.Screen name="coach" options={{}} /></Stack.Protected>
      <Stack.Screen name="leak" />
    </Stack>`;
  expect(screens(sample)).toEqual({ guarded: ['settings', 'coach'], open: ['leak'] });
});

test('no screen of the root stack is outside a guard', () => {
  expect(layout().open).toEqual([]);
});

test('every route of the app is a guarded screen, and every guarded screen a route', () => {
  expect(routes().length).toBeGreaterThan(20);
  expect([...layout().guarded].sort()).toEqual(routes());
});
