// constitution-audit (tools/anayasa-denetimi.sh)
/**
 * Every key the phone keeps in its small settings store (expo-sqlite/kv-store) is in the data inventory, and every key
 * the inventory lists is kept by the code (K-813, ADR-061 #5): the privacy policy is written from the inventory, so a
 * setting it does not know is data the policy does not mention. The keys are read from the code itself (TypeScript's
 * syntax tree): each `kv.getItemAsync / setItemAsync / removeItemAsync` call's key is followed to the string it is —
 * a constant, an object of them, a template (`consent.${kind}` → `consent.*`), an array or Object.values mapped over,
 * a parameter of a function the file calls with one. A key the reader cannot follow fails the test, so a new way of
 * writing one cannot slip past it.
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

import inventory from '../../../../docs/yasal/veri-envanteri.json';
import { createAppServices } from '@/services/appServices';

import { nodeSqlite } from './support/nodeSqlite';

const SRC = path.resolve(__dirname, '..');
const METHODS = new Set(['getItemAsync', 'setItemAsync', 'removeItemAsync', 'getItem', 'setItem', 'removeItem', 'getItemSync', 'setItemSync']);
// The Keychain (expo-secure-store) is the session's, listed apart in the inventory ("Session tokens in the Keychain"):
// session/keychain.ts is its one user, through the module or the `secure` it is given.
const KEYCHAIN = new Set(['SecureStore', 'secure']);

type Found = { keys: string[]; unresolved: string[] };

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** The kv keys one file uses, and the calls whose key could not be followed (file:line). */
function keysOf(name: string, source: string): Found {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
  const found: Found = { keys: [], unresolved: [] };
  const where = (node: ts.Node) => `${name}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;

  const constants = new Map<string, ts.Expression>();
  const functions = new Map<string, ts.SignatureDeclaration>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = node.initializer;
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) functions.set(node.name.text, init);
      constants.set(node.name.text, init);
    }
    if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node);
    ts.forEachChild(node, collect);
  };
  collect(file);

  const unwrap = (e: ts.Expression): ts.Expression =>
    ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) ? unwrap(e.expression) : e;

  /** The strings an expression can be; null when it cannot be followed. */
  const resolve = (expression: ts.Expression, seen: Set<ts.Node> = new Set()): string[] | null => {
    const e = unwrap(expression);
    if (seen.has(e)) return null;
    seen.add(e);
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return [e.text];
    if (ts.isTemplateExpression(e)) return [`${e.head.text}*`];
    if (ts.isObjectLiteralExpression(e)) {
      const values = e.properties.map((p) => (ts.isPropertyAssignment(p) ? resolve(p.initializer, seen) : null));
      return values.every((v) => v !== null) ? values.flat() as string[] : null;
    }
    if (ts.isArrayLiteralExpression(e)) {
      const values = e.elements.map((el) => resolve(el, seen));
      return values.every((v) => v !== null) ? values.flat() as string[] : null;
    }
    if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) {
      const object = constants.get(e.expression.text);
      const target = object && unwrap(object);
      if (target && ts.isObjectLiteralExpression(target)) {
        const property = target.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(file) === e.name.text);
        return property && ts.isPropertyAssignment(property) ? resolve(property.initializer, seen) : null;
      }
      return null;
    }
    if (ts.isElementAccessExpression(e)) return resolve(e.expression, seen); // KEY[which]: any of its values
    if (ts.isCallExpression(e)) {
      // Object.values(KEY)
      if (e.expression.getText(file) === 'Object.values' && e.arguments.length === 1) return resolve(e.arguments[0], seen);
      // KEY(kind) with const KEY = (kind) => `consent.${kind}`
      if (ts.isIdentifier(e.expression)) {
        const fn = functions.get(e.expression.text);
        if (fn && ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return resolve(fn.body, seen);
      }
      return null;
    }
    if (ts.isIdentifier(e)) {
      const constant = constants.get(e.text);
      if (constant !== undefined && !functions.has(e.text)) return resolve(constant, seen);
      return resolveParameter(e, seen);
    }
    return null;
  };

  /** A parameter: what the function it belongs to is given — by `.map/.forEach` over a list, or by its calls in this file. */
  const resolveParameter = (id: ts.Identifier, seen: Set<ts.Node>): string[] | null => {
    let fn: ts.Node | undefined = id.parent;
    while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
    if (!fn || !ts.isFunctionLike(fn)) return null;
    const index = fn.parameters.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === id.text);
    if (index < 0) return null;
    const call = fn.parent;
    if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && ['map', 'forEach'].includes(call.expression.name.text) && index === 0) {
      return resolve(call.expression.expression, seen);
    }
    const name = fn.name && ts.isIdentifier(fn.name) ? fn.name.text : ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name) ? fn.parent.name.text : null;
    if (name === null) return null;
    const given: string[] = [];
    let calls = 0;
    let lost = false;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
        calls++;
        const argument = node.arguments[index];
        const values = argument === undefined ? null : resolve(argument, seen);
        if (values === null) lost = true;
        else given.push(...values);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return calls > 0 && !lost ? given : null;
  };

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && METHODS.has(node.expression.name.text)) {
      const receiver = node.expression.expression.getText(file);
      if (!KEYCHAIN.has(receiver) && node.arguments.length > 0) {
        const keys = receiver === 'kv' || receiver.endsWith('.kv') ? resolve(node.arguments[0]) : null;
        if (keys === null) found.unresolved.push(`${where(node)} ${receiver}.${node.expression.name.text}`);
        else found.keys.push(...keys);
      }
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

test('the reader follows every way a key is written', () => {
  const sample = `
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
      await keep(A);
      await SecureStore.getItemAsync('session');
      await kv.getItemAsync(somewhere());
    }`;
  expect(keysOf('sample.ts', sample).unresolved).toEqual(['sample.ts:16 kv.getItemAsync']);
  expect([...new Set(keysOf('sample.ts', sample).keys)].sort()).toEqual(['a.one', 'b.x', 'b.y', 'c.*', 'd.one', 'e.one']);
});

test("every kv call's key is followed", () => {
  const { keys, unresolved } = codeKeys();
  expect(unresolved).toEqual([]);
  expect(keys.length).toBeGreaterThan(15);
});

test('every key the code keeps is in the inventory, and every key the inventory lists is kept', () => {
  expect(inventoryKeys()).toEqual(codeKeys().keys);
});

describe('signing out clears every key but the one the policy names (privacy › data-on-phone)', () => {
  const BASE = 'https://api.example.test';
  const SESSION = { accessToken: 'a1', refreshToken: 'r1', accessTokenExpiresAt: '2026-09-30T12:15:00Z' };
  const settings = (inventory.phone.stored as { kv_keys?: string[]; survives_sign_out?: string[] }[]).find((entry) => entry.survives_sign_out);

  test('the inventory names what survives', () => {
    expect(settings?.survives_sign_out).toEqual(['projection.access']);
  });

  test('every inventory key, filled, is gone after a sign-out but those', async () => {
    const items = new Map<string, string>();
    const kv = {
      getItemAsync: async (key: string) => items.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void items.set(key, value),
      removeItemAsync: async (key: string) => void items.delete(key),
    };
    let session: typeof SESSION | null = null;
    const storage = { load: async () => session, save: async (s: typeof SESSION) => void (session = s), clear: async () => void (session = null) };
    const fetch = jest.fn(async () => new Response(null, { status: 404 }));
    const services = await createAppServices({ baseUrl: BASE, storage, db: nodeSqlite(), fetch, report: () => {}, kv, locale: 'en-US' });
    await services.session.signIn(SESSION);
    // Every key the inventory lists, with a value as the code writes it ("consent.*": each consent).
    for (const key of inventoryKeys().flatMap((k) => (k === 'consent.*' ? ['consent.HEALTH_DATA', 'consent.THIRD_PARTY_AI', 'consent.APPLE_HEALTH'] : [k]))) {
      items.set(key, key === 'projection.access' ? 'unavailable' : '1');
    }

    await services.signOut();
    await new Promise((r) => setTimeout(r, 0));

    expect([...items.keys()].sort()).toEqual(settings?.survives_sign_out);
  });
});
