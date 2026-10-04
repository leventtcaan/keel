/**
 * The Terms of Use and Privacy Policy addresses every build carries (K-809, ADR-057 D3, ADR-059 #3): without both the
 * paywall sells nothing and the onboarding paywall stays open. They are not secrets, so they live in eas.json › env, and
 * each must be where the legal pages are published: _config.yml's url + baseurl + the page's permalink (ADR-060).
 */
import * as fs from 'fs';
import * as path from 'path';

import { legalComplete, legalLinks } from '@/subscription/links';

const ROOT = path.resolve(__dirname, '../../../..');
const SITE = path.join(ROOT, 'docs/yasal/site');

type Profile = { extends?: string; env?: Record<string, string> };
const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'apps/mobile/eas.json'), 'utf8')) as { build: Record<string, Profile> };

/** A profile's env as EAS builds it: its own over the one it extends. */
function env(name: string): Record<string, string> {
  const profile = eas.build[name];
  return { ...(profile.extends ? env(profile.extends) : {}), ...(profile.env ?? {}) };
}

function siteValue(key: string): string {
  const line = fs
    .readFileSync(path.join(SITE, '_config.yml'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith(`${key}:`));
  return (line ?? '').slice(key.length + 1).trim().replace(/^"|"$/g, '');
}

function published(page: string): string {
  const permalink = /^permalink:\s*(\S+)\s*$/m.exec(fs.readFileSync(path.join(SITE, page), 'utf8'))?.[1];
  return `${siteValue('url')}${siteValue('baseurl')}${permalink}`;
}

const profiles = Object.keys(eas.build);

test('there are build profiles to check', () => {
  expect(profiles).toEqual(expect.arrayContaining(['development', 'production']));
});

test.each(profiles)('the %s build sells: both addresses, https', (name) => {
  const { EXPO_PUBLIC_TERMS_URL: terms, EXPO_PUBLIC_PRIVACY_URL: privacy } = env(name);
  expect(legalComplete(legalLinks({ terms, privacy }))).toBe(true);
});

test.each(profiles)("the %s build's addresses are the published pages", (name) => {
  expect(env(name).EXPO_PUBLIC_TERMS_URL).toBe(published('terms.md'));
  expect(env(name).EXPO_PUBLIC_PRIVACY_URL).toBe(published('privacy.md'));
});

test('the pages are published on https at a real address', () => {
  expect(published('privacy.md')).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]+\/.+\/privacy\/$/);
  expect(published('terms.md')).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]+\/.+\/terms\/$/);
});
