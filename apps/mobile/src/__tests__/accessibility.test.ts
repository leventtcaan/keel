/**
 * What VoiceOver and Larger Text need from the code, checked in the source (K-807; Apple's Accessibility Nutrition Labels,
 * evaluation criteria for VoiceOver, Larger Text, Reduced Motion). Colour contrast is contrast.test.ts; what only a phone
 * can show — every common task done with VoiceOver, no layout broken at the largest text size — is the device check
 * (docs/yasal/app-store-beyanlari.md › Erişilebilirlik).
 * - Every Pressable says what it is (a role) and what it does: a label, or text inside that VoiceOver reads out.
 * - Every image or drawing is named, sits inside an element that is (a chart said as one image), or is marked
 *   decorative (`accessible={false}`) — so nothing meaningful is silent and nothing decorative is noise.
 * - Text scales with the phone's setting and wraps, never cut: no allowFontScaling, maxFontSizeMultiplier,
 *   numberOfLines or adjustsFontSizeToFit (Apple: "consider allowing the text to wrap … instead of truncation").
 * - No animation of our own unless it follows Reduce Motion (the app has none; native transitions follow the system).
 */
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';

const SRC = path.resolve(__dirname, '..');
const TEXT_LIMITS = ['allowFontScaling', 'maxFontSizeMultiplier', 'numberOfLines', 'adjustsFontSizeToFit'];
const PICTURES = new Set(['Image', 'Svg']);
const MOTION = /\bAnimated\.|react-native-reanimated|LayoutAnimation/;
const REDUCED = /useReducedMotion|isReduceMotionEnabled/;

type Problems = string[];

function sources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sources(full);
    return /\.tsx$/.test(entry.name) ? [full] : [];
  });
}

/** What one file breaks of the rules above, as "file:line what". */
function problemsOf(name: string, source: string): Problems {
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: Problems = [];
  const at = (node: ts.Node) => `${name}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;
  const opening = (node: ts.Node) => (ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null);
  const attribute = (element: ts.JsxOpeningLikeElement, attr: string) =>
    element.attributes.properties.filter(ts.isJsxAttribute).find((a) => a.name.getText(file) === attr);
  const has = (element: ts.JsxOpeningLikeElement, attr: string) => attribute(element, attr) !== undefined;
  const notAccessible = (element: ts.JsxOpeningLikeElement) => attribute(element, 'accessible')?.initializer?.getText(file) === '{false}';
  const hasText = (node: ts.Node): boolean => {
    const element = opening(node);
    if (element && element.tagName.getText(file) === 'Text') return true;
    return node.getChildren(file).some(hasText);
  };
  // An ancestor element that VoiceOver reaches as one, with its own words (a chart said as one image).
  const namedAncestor = (node: ts.Node): boolean => {
    for (let up = node.parent; up !== undefined; up = up.parent) {
      const element = opening(up);
      if (element && has(element, 'accessibilityLabel') && has(element, 'accessible') && !notAccessible(element)) return true;
    }
    return false;
  };

  const visit = (node: ts.Node) => {
    const element = opening(node);
    if (element) {
      const tag = element.tagName.getText(file);
      if (tag === 'Pressable') {
        if (!has(element, 'accessibilityRole')) problems.push(`${at(node)} Pressable without accessibilityRole`);
        if (!has(element, 'accessibilityLabel') && !hasText(node)) problems.push(`${at(node)} Pressable with no label and no text`);
      }
      if (PICTURES.has(tag) && !has(element, 'accessibilityLabel') && !notAccessible(element) && !namedAncestor(node)) {
        problems.push(`${at(node)} ${tag} neither named nor marked decorative`);
      }
      for (const limit of TEXT_LIMITS) if (has(element, limit)) problems.push(`${at(node)} ${limit}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (MOTION.test(source) && !REDUCED.test(source)) problems.push(`${name} animates without Reduce Motion`);
  return problems;
}

test('the reader finds each kind of problem, and lets the right things through', () => {
  const sample = `
    export function X() {
      return (
        <View>
          <Pressable onPress={go}><Text>{t('a')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={go} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('b')} onPress={go} />
          <Pressable accessibilityRole="button" onPress={go}><View><Text>{t('c')}</Text></View></Pressable>
          <Image source={a} />
          <Image source={a} accessibilityLabel={t('d')} />
          <Image source={a} accessible={false} />
          <View accessible accessibilityRole="image" accessibilityLabel={t('e')}><Svg /></View>
          <Svg />
          <Text numberOfLines={1}>{t('f')}</Text>
        </View>
      );
    }`;
  expect(problemsOf('x.tsx', sample)).toEqual([
    'x.tsx:5 Pressable without accessibilityRole',
    'x.tsx:6 Pressable with no label and no text',
    'x.tsx:9 Image neither named nor marked decorative',
    'x.tsx:13 Svg neither named nor marked decorative',
    'x.tsx:14 numberOfLines',
  ]);
  expect(problemsOf('m.tsx', `import Animated from 'react-native-reanimated'; const a = Animated.View;`)).toEqual(['m.tsx animates without Reduce Motion']);
  expect(problemsOf('m.tsx', `import { useReducedMotion } from 'react-native-reanimated';`)).toEqual([]);
});

test('the app keeps them all', () => {
  const files = sources(SRC);
  expect(files.length).toBeGreaterThan(80);
  expect(files.flatMap((file) => problemsOf(path.relative(SRC, file), fs.readFileSync(file, 'utf8')))).toEqual([]);
});
