// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Every key the phone keeps in its small settings store (expo-sqlite/kv-store) is in the data inventory, and every key
 * the inventory lists is kept by the code (K-813, ADR-061 #5): the privacy policy is written from the inventory, so a
 * setting it does not know is data the policy does not mention. The keys are read from the code itself (TypeScript's
 * syntax tree): each keyed call on `kv` (getItemAsync, setItemAsync, removeItemAsync…) has its key followed to the string
 * it is — a constant, an object of them (`KEY.x`, `KEY[which]`), a template (`consent.${kind}` → `consent.*`), an array
 * or Object.values mapped over, a parameter of a function the file calls. Whatever the reader cannot follow fails:
 * a `let` or a changed list, a wrapper used from elsewhere, `kv` taken apart or aliased, a keyless call (clear, multiSet),
 * the store imported anywhere but where it is made.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

import inventory from '../../../../docs/yasal/veri-envanteri.json';
import { CONSENT_COPY } from '@/consent/consents';
import { createAppServices } from '@/services/appServices';

import { nodeSqlite } from './support/nodeSqlite';

const SRC = path.resolve(__dirname, '..');
const STORE_TYPES = path.resolve(__dirname, '../../node_modules/expo-sqlite/build/Storage.d.ts');
const STORE_MODULE = 'expo-sqlite/kv-store';
const STORE_MAKER = 'services/ServicesProvider.tsx';
// The Keychain (expo-secure-store) is the session's, listed apart in the inventory ("Session tokens in the Keychain").
const KEYCHAIN_FILE = 'session/keychain.ts';
const MUTATORS = new Set(['push', 'unshift', 'splice', 'pop', 'shift', 'fill', 'copyWithin', 'sort', 'reverse']);

/** The store's methods, from its installed types: those taking a key first, and all of them. */
function storeMethods(): { keyed: Set<string>; all: Set<string> } {
  const file = ts.createSourceFile('Storage.d.ts', fs.readFileSync(STORE_TYPES, 'utf8'), ts.ScriptTarget.Latest, true);
  const keyed = new Set<string>();
  const all = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isClassDeclaration(node) && node.name?.text === 'SQLiteStorage') {
      for (const member of node.members) {
        if (!ts.isMethodDeclaration(member) || !member.name || !ts.isIdentifier(member.name)) continue;
        all.add(member.name.text);
        const first = member.parameters[0];
        if (first && first.name.getText(file) === 'key' && first.type?.getText(file) === 'string') keyed.add(member.name.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { keyed, all };
}

const METHODS = storeMethods();

type Found = { keys: string[]; unresolved: string[] };

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** The kv keys one file uses, and what in it could not be followed (file:line why). */
function keysOf(name: string, source: string): Found {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  const found: Found = { keys: [], unresolved: [] };
  const where = (node: ts.Node) => `${name}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;
  const unwrap = (e: ts.Expression): ts.Expression =>
    ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) ? unwrap(e.expression) : e;

  // Names something changes: assigned again, or a list grown or reordered — what they hold is not what they were given.
  const changed = new Set<string>();
  const markChanged = (node: ts.Node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const left = unwrap(node.left);
      const root = ts.isIdentifier(left) ? left : ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left) ? left.expression : null;
      if (root && ts.isIdentifier(root)) changed.add(root.text);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && MUTATORS.has(node.expression.name.text) && ts.isIdentifier(node.expression.expression)) {
      changed.add(node.expression.expression.text);
    }
    ts.forEachChild(node, markChanged);
  };
  markChanged(file);

  type Declared = ts.VariableDeclaration | ts.ParameterDeclaration | ts.FunctionDeclaration;
  /** The declaration an identifier means, looked up scope by scope from where it is used. */
  const declarationOf = (id: ts.Identifier): Declared | null => {
    const inStatements = (statements: ts.NodeArray<ts.Statement>): Declared | null => {
      for (const statement of statements) {
        if (ts.isVariableStatement(statement)) {
          const d = statement.declarationList.declarations.find((v) => ts.isIdentifier(v.name) && v.name.text === id.text);
          if (d) return d;
        }
        if (ts.isFunctionDeclaration(statement) && statement.name?.text === id.text) return statement;
      }
      return null;
    };
    for (let scope: ts.Node | undefined = id.parent; scope !== undefined; scope = scope.parent) {
      if (ts.isFunctionLike(scope)) {
        const p = scope.parameters.find((param) => ts.isIdentifier(param.name) && param.name.text === id.text);
        if (p) return p;
      }
      if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isModuleBlock(scope)) {
        const d = inStatements(scope.statements);
        if (d) return d;
      }
    }
    return null;
  };
  const isConst = (d: ts.VariableDeclaration) => (d.parent.flags & ts.NodeFlags.Const) !== 0;

  const constantOf = (id: ts.Identifier): ts.Expression | null => {
    if (changed.has(id.text)) return null;
    const d = declarationOf(id);
    return d && ts.isVariableDeclaration(d) && isConst(d) && d.initializer ? unwrap(d.initializer) : null;
  };

  /** The strings an expression can be; null when it cannot be followed. */
  const resolve = (expression: ts.Expression, seen: Set<ts.Node>): string[] | null => {
    const e = unwrap(expression);
    if (seen.has(e)) return null;
    const inner = new Set(seen).add(e); // a path, not a shared set: the same constant twice is fine
    const all = (parts: (string[] | null)[]) => (parts.every((p) => p !== null) ? (parts.flat() as string[]) : null);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
    if (ts.isTemplateExpression(e)) return [`${e.head.text}*`];
    if (ts.isObjectLiteralExpression(e)) return all(e.properties.map((p) => (ts.isPropertyAssignment(p) ? resolve(p.initializer, inner) : null)));
    if (ts.isArrayLiteralExpression(e)) return all(e.elements.map((el) => resolve(el, inner)));
    if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) {
      const object = constantOf(e.expression);
      if (object && ts.isObjectLiteralExpression(object)) {
        const property = object.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(file) === e.name.text);
        return property && ts.isPropertyAssignment(property) ? resolve(property.initializer, inner) : null;
      }
      return null;
    }
    if (ts.isElementAccessExpression(e)) return resolve(e.expression, inner); // KEY[which]: any of its values
    if (ts.isCallExpression(e)) {
      if (e.expression.getText(file) === 'Object.values' && e.arguments.length === 1) return resolve(e.arguments[0], inner);
      // KEY(kind), const KEY = (kind) => `consent.${kind}`
      if (ts.isIdentifier(e.expression)) {
        const fn = constantOf(e.expression);
        if (fn && ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return resolve(fn.body, inner);
      }
      return null;
    }
    if (ts.isIdentifier(e)) {
      if (changed.has(e.text)) return null;
      const d = declarationOf(e);
      if (d === null) return null; // imported, or a global: another file's
      if (ts.isParameter(d)) return resolveParameter(d, inner);
      if (ts.isVariableDeclaration(d) && isConst(d) && d.initializer) return resolve(d.initializer, inner);
      return null;
    }
    return null;
  };

  /** A parameter: what its function is given — by `.map/.forEach` over a list, or by its calls in this file only. */
  const resolveParameter = (param: ts.ParameterDeclaration, seen: Set<ts.Node>): string[] | null => {
    const fn = param.parent;
    const index = fn.parameters.indexOf(param);
    const call = fn.parent;
    if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && ['map', 'forEach'].includes(call.expression.name.text) && index === 0) {
      return resolve(call.expression.expression, seen);
    }
    const holder = ts.isFunctionDeclaration(fn) ? fn : ts.isVariableDeclaration(fn.parent) ? fn.parent : undefined;
    const nameNode = holder?.name;
    if (holder === undefined || nameNode === undefined || !ts.isIdentifier(nameNode)) return null;
    // Exported, or its name used other than to call it: given keys from elsewhere this file cannot see.
    const declaration = ts.isVariableDeclaration(holder) ? holder.parent.parent : holder;
    if (ts.getCombinedModifierFlags(declaration as ts.Declaration) & ts.ModifierFlags.Export) return null;
    const given: string[] = [];
    let calls = 0;
    let lost = false;
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node) && node.text === nameNode.text && node !== nameNode) {
        const parent = node.parent;
        if (ts.isCallExpression(parent) && parent.expression === node) {
          calls++;
          const argument = parent.arguments[index];
          const values = argument === undefined ? null : resolve(argument, seen);
          if (values === null) lost = true;
          else given.push(...values);
        } else {
          lost = true;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return calls > 0 && !lost ? given : null;
  };

  // Where `kv` (or `x.kv`) appears: only as the receiver of a keyed call, or handed on whole (an argument, a property,
  // a parameter). Taken apart, aliased, indexed, or asked a keyless thing (clear, multiSet): not followed.
  const isStore = (node: ts.Node): boolean =>
    (ts.isIdentifier(node) && node.text === 'kv' && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) ||
    (ts.isPropertyAccessExpression(node) && node.name.text === 'kv');
  const handedOn = (node: ts.Node) => {
    const parent = node.parent;
    return (
      (ts.isCallExpression(parent) && parent.arguments.some((argument) => argument === node)) ||
      ts.isShorthandPropertyAssignment(parent) ||
      (ts.isPropertyAssignment(parent) && (parent.initializer === node || parent.name === node)) ||
      (ts.isParameter(parent) && parent.name === node) ||
      (ts.isBindingElement(parent) && parent.name === node) ||
      ((ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node)
    );
  };

  const visit = (node: ts.Node) => {
    if (isStore(node)) {
      const parent = node.parent;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        const method = parent.name.text;
        const call = parent.parent;
        if (METHODS.keyed.has(method) && ts.isCallExpression(call) && call.expression === parent && call.arguments.length > 0) {
          const keys = resolve(call.arguments[0], new Set());
          if (keys === null) found.unresolved.push(`${where(call)} kv.${method}: key not followed`);
          else found.keys.push(...keys);
        } else {
          found.unresolved.push(`${where(parent)} kv.${method}: ${METHODS.all.has(method) ? 'not a keyed call' : 'not a call the reader knows'}`);
        }
      } else if (!handedOn(node)) {
        found.unresolved.push(`${where(node)} kv used other than to call it or hand it on`);
      }
    }
    // A keyed call on something not named kv: the store under another name (the Keychain's own file aside).
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && METHODS.keyed.has(node.expression.name.text)) {
      const receiver = node.expression.expression;
      if (!isStore(receiver) && name !== KEYCHAIN_FILE) found.unresolved.push(`${where(node)} ${receiver.getText(file)}.${node.expression.name.text}: not kv`);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === STORE_MODULE && name !== STORE_MAKER) {
      found.unresolved.push(`${where(node)} ${STORE_MODULE} imported outside ${STORE_MAKER}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

function codeKeys(): Found {
  const all = sources(SRC).map((file) => keysOf(path.relative(SRC, file), fs.readFileSync(file, 'utf8')));
  return { keys: [...new Set(all.flatMap((f) => f.keys))].sort(), unresolved: all.flatMap((f) => f.unresolved) };
}

const inventoryKeys = () =>
  [...new Set((inventory.phone.stored as { kv_keys?: string[] }[]).flatMap((entry) => entry.kv_keys ?? []))].sort();

describe('the reader', () => {
  const keysIn = (code: string) => [...new Set(keysOf('s.ts', code).keys)].sort();
  const lost = (code: string) => keysOf('s.ts', code).unresolved;

  test("knows the store's keyed methods from its installed types", () => {
    expect([...METHODS.keyed]).toEqual(expect.arrayContaining(['getItemAsync', 'setItemAsync', 'removeItemAsync']));
    expect(METHODS.all.has('clearAsync') && METHODS.all.has('multiSet')).toBe(true);
    expect(METHODS.keyed.has('clearAsync') || METHODS.keyed.has('multiSet')).toBe(false);
  });

  test('follows every way a key is written', () => {
    const code = `
      const A = 'a.one';
      const B = { x: 'b.x', y: 'b.y' };
      const C = (kind: string) => \`c.\${kind}\`;
      const D = 'd.one'; const E = 'e.one';
      async function keep(key: string) { await kv.setItemAsync(key, '1'); }
      async function run(kv: KV, which: 'x' | 'y') {
        await kv.getItemAsync(A);
        await kv.getItemAsync(B.x);
        await kv.removeItemAsync(B[which]);
        await kv.getItemAsync(C('k'));
        await Promise.all([D, E].map((key) => kv.removeItemAsync(key)));
        await Promise.all(Object.values(B).map((key) => kv.removeItemAsync(key)));
        await keep(A); await keep(A);
        await Promise.all([A, A].map((key) => kv.removeItemAsync(key)));
        await SecureStore.getItemAsync('x');
      }`;
    expect(keysIn(code)).toEqual(['a.one', 'b.x', 'b.y', 'c.*', 'd.one', 'e.one']);
    expect(lost(code)).toEqual(['s.ts:16 SecureStore.getItemAsync: not kv']);
  });

  test.each([
    ['a key from elsewhere', `import { K } from './k'; kv.getItemAsync(K);`],
    ['a let', `let K = 'a'; K = 'leak'; kv.getItemAsync(K);`],
    ['a list grown', `const L = ['a']; L.push('leak'); L.map((k) => kv.removeItemAsync(k));`],
    ['an exported wrapper', `export async function put(key: string) { await kv.setItemAsync(key, '1'); } put('a');`],
    ['a wrapper passed around', `async function put(key: string) { await kv.setItemAsync(key, '1'); } put('a'); later(put);`],
    ['kv taken apart', `const { setItemAsync } = kv; setItemAsync('x', '1');`],
    ['a method kept', `const put = kv.setItemAsync; put('x', '1');`],
    ['indexed', `kv['setItemAsync']('x', '1');`],
    ['called through call', `kv.setItemAsync.call(kv, 'x', '1');`],
    ['a keyless call', `kv.clearAsync();`],
    ['many at once', `kv.multiSet([['x', '1']]);`],
    ['the store under another name', `storage.setItemAsync('x', '1');`],
    ['the store imported elsewhere', `import Storage from 'expo-sqlite/kv-store';`],
  ])('cannot follow %s, and says so', (_, code) => {
    expect(lost(code)).not.toEqual([]);
  });

  test('a name means its nearest declaration: the parameter, not a constant outside', () => {
    expect(keysIn(`const key = 'outer'; ['inner'].map((key) => kv.removeItemAsync(key));`)).toEqual(['inner']);
  });

  test('a store handed on whole is fine', () => {
    expect(lost(`makeA({ kv }); makeB({ kv: deps.kv }); makeC(kv); function f({ kv }: { kv: KV }) {} type T = { kv: KV };`)).toEqual([]);
  });
});

test("every kv call's key is followed", () => {
  expect(codeKeys().unresolved).toEqual([]);
});

test('every key the code keeps is in the inventory, and every key the inventory lists is kept', () => {
  expect(inventoryKeys()).toEqual(codeKeys().keys);
});

describe('signing out clears every key but the one the policy names (privacy › data-on-phone)', () => {
  const BASE = 'https://api.example.test';
  const SESSION = { accessToken: 'a1', refreshToken: 'r1', accessTokenExpiresAt: '2026-09-30T12:15:00Z' };
  const settings = (inventory.phone.stored as { kv_keys?: string[]; survives_sign_out?: string[] }[]).find((entry) => entry.survives_sign_out);

  /** A phone with every inventory key kept from before (the app started on it), signed in; then signed out. */
  async function signOutOf(access: string): Promise<string[]> {
    const items = new Map<string, string>();
    for (const key of inventoryKeys().flatMap((k) => (k === 'consent.*' ? Object.keys(CONSENT_COPY).map((kind) => `consent.${kind}`) : [k]))) {
      items.set(key, key === 'projection.access' ? access : '1');
    }
    const kv = {
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => void items.delete(key),
    };
    let session: typeof SESSION | null = SESSION;
    const storage = { load: async () => session, save: async (s: typeof SESSION) => void (session = s), clear: async () => void (session = null) };
    // The server failing: nothing it answers clears a key in the services' place.
    const fetch = jest.fn(async () => new Response(null, { status: 500 }));
    const services = await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch, report: () => {}, kv, locale: 'en-US' });
    await services.signOut();
    await new Promise((r) => setTimeout(r, 0));
    return [...items.keys()].sort();
  }

  test('the inventory names what survives', () => {
    expect(settings?.survives_sign_out).toEqual(['projection.access']);
  });

  test('every key goes but a projection the eating-pattern check made unavailable (ADR-050)', async () => {
    expect(await signOutOf('unavailable')).toEqual(settings?.survives_sign_out);
  });

  test('a projection the check cleared goes too: the next person is asked afresh', async () => {
    expect(await signOutOf('clear')).toEqual([]);
  });
});
