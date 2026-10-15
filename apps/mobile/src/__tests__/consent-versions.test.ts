/**
 * Consents from the phone (K-312, K-204, ADR-007): a grant names the version of the text the user saw, and the server
 * accepts only its current one. The phone's texts (data/copy/en.json › consent) and the server's versions
 * (backend application.yml › keel.consent.versions) must name the same version, or every grant is refused.
 */
import * as fs from 'fs';
import * as path from 'path';

import { createApiClient } from '@/api/client';
import { consentVersion, grantConsent, HEALTH_POINTS, loadConsents, withdrawConsent } from '@/consent/consents';
import { has, t } from '@/copy';

const ROOT = path.resolve(__dirname, '../../../..');
const BASE = 'https://api.example.test';

function serverVersions(): Record<string, string> {
  const lines = fs.readFileSync(path.join(ROOT, 'backend/src/main/resources/application.yml'), 'utf8').split('\n');
  const at = lines.findIndex((line) => line.trim() === 'versions:');
  const found: Record<string, string> = {};
  for (const line of lines.slice(at + 1)) {
    const match = /^\s+([A-Z_]+): (\S+)$/.exec(line);
    if (match === null) break;
    found[match[1]] = match[2];
  }
  return found;
}

test.each(['HEALTH_DATA', 'APPLE_HEALTH', 'THIRD_PARTY_AI'] as const)('%s: the text the phone shows is the version the server accepts', (kind) => {
  expect(consentVersion(kind)).toBe(serverVersions()[kind]);
});

/** The health data text as the consent screen reads it: its points, one after the other (version 5: a list, not a paragraph). */
const points = () => HEALTH_POINTS.map((point) => t(`consent.health_data.points.${point}`));
const whole = () => points().join(' ');

test('the health data text is 3 to 4 short points: what is kept, what for, how to withdraw (version 5, Levent 15 Oct)', () => {
  expect(HEALTH_POINTS).toEqual(['collected', 'purpose', 'withdraw', 'scope']);
  for (const text of points()) {
    expect(text).not.toMatch(/^\[missing/);
    // Short: a point is read at a glance, not a paragraph of its own.
    expect(text.split(/\s+/).length).toBeLessThanOrEqual(60);
  }
  // The old paragraph is gone: the screens ask for the points, never for one block.
  expect(has('consent.health_data.body')).toBe(false);
});

test('the health data text says a withdrawal deletes the data it covers (K-429, ADR-037 #36)', () => {
  // K-231: withdrawing deletes for good; the text the consent is given to must say so, not only that the calls stop.
  expect(t('consent.health_data.points.withdraw')).toMatch(/withdraw[^.]*delet/i);
  // Training is not deleted (ADR-007, ConsentWithdrawalDeletionTests): the text must not promise it is.
  expect(t('consent.health_data.points.withdraw')).toMatch(/withdraw[^.]*except your training/i);
  expect(t('consent.health_data.points.withdraw')).toMatch(/calls stop[^.]*allow it again/i);
  expect(consentVersion('HEALTH_DATA')).not.toBe('1-draft');
});

test('the health data text classes data as the code does: the training log is not health data (K-808, ADR-059 #2)', () => {
  // ADR-007/ADR-026: training needs no consent and stays when it is withdrawn, so the opening sentence, which says what
  // the health data is, must not name it (question 57); the privacy policy uses the same classing.
  const [opening] = t('consent.health_data.points.collected').split('.');
  expect(opening).toMatch(/health data/i);
  expect(opening).not.toMatch(/training/i);
  expect(t('consent.health_data.points.withdraw')).toMatch(/training log[^.]*(isn't|is not) health data/i);
});

test('the health data text: sick and pain are health data, traveling, a busy week and a new gym are not and stay (K-1021)', () => {
  // Version 3 listed "away" among the health data and said everything above is deleted; neither is true any more.
  expect(whole()).not.toMatch(/\baway\b/i);
  expect(t('consent.health_data.points.collected')).toMatch(/sick or in pain/i);
  expect(t('consent.health_data.points.scope')).toMatch(/traveling[^.]*busy week[^.]*new gym[^.]*(isn't|aren't|is not|are not) health data/i);
  expect(t('consent.health_data.points.scope')).toMatch(/if you withdraw[^.]*stays[^.]*account/i);
});

test('nothing of the paragraph is dropped: what is kept, what for, never sold, export and delete, imports, withdrawal (K-1032)', () => {
  const kept = t('consent.health_data.points.collected');
  for (const what of ['weight', 'waist', 'steps', 'sleep', 'active energy', 'progress photos', 'the look you pick', 'meals and recipes', 'plan', 'check-in answers', 'foods you avoid']) {
    expect(kept).toContain(what);
  }
  expect(t('consent.health_data.points.scope')).toMatch(/importing past workouts[^.]*another app[^.]*consent[^.]*weight/i);
  const purpose = t('consent.health_data.points.purpose');
  expect(purpose).toMatch(/weekly calls/i);
  expect(purpose).toMatch(/progress/i);
  expect(purpose).toMatch(/nothing else/i);
  expect(purpose).toMatch(/never sell[^.]*ads/i);
  expect(purpose).toMatch(/export or delete[^.]*any time/i);
});

test('a new text is a new version (GDPR Art. 7(1)): version 5, so a yes to version 4 is asked again', () => {
  expect(consentVersion('HEALTH_DATA')).toBe('5');
});

test('a grant the server holds to version 4 reads OUTDATED: not given, asked again, to the text shown now', async () => {
  const answer = { data: [{ kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: '4' }], response: new Response(null, { status: 200 }) };
  expect(await loadConsents({ GET: async () => answer } as never)).toEqual({ HEALTH_DATA: 'OUTDATED' });
  const current = { data: [{ kind: 'HEALTH_DATA', status: 'GRANTED', textVersion: '5' }], response: new Response(null, { status: 200 }) };
  expect(await loadConsents({ GET: async () => current } as never)).toEqual({ HEALTH_DATA: 'GRANTED' });
});

function server(status = 200) {
  const seen: { method: string; path: string; body: unknown }[] = [];
  const fetch = jest.fn(async (request: Request) => {
    seen.push({ method: request.method, path: request.url.slice(BASE.length), body: await request.json() });
    const body = status === 200 ? { kind: 'HEALTH_DATA', status: 'GRANTED' } : { code: 'VALIDATION_FAILED', message: 'x' };
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  return { fetch, seen };
}

test('a grant is a PUT of the version shown, and nothing else (no provider for the health consents)', async () => {
  const fake = server();
  await grantConsent(createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch: fake.fetch }), 'HEALTH_DATA');
  expect(fake.seen).toEqual([{ method: 'PUT', path: '/v1/consents/HEALTH_DATA', body: { textVersion: consentVersion('HEALTH_DATA') } }]);
});

test('a refused grant throws: the screen must not go on as if the consent were given', async () => {
  const fake = server(400);
  const api = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch: fake.fetch });
  await expect(grantConsent(api, 'APPLE_HEALTH')).rejects.toThrow('400');
});

test('no answer is NoConnection, an answer that refuses is ConsentRefused: the screen words them differently', async () => {
  const offline = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch: async () => { throw new TypeError('Network request failed'); } });
  await expect(grantConsent(offline, 'HEALTH_DATA')).rejects.toMatchObject({ name: 'NoConnection' });
  const refusing = createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch: server(400).fetch });
  await expect(grantConsent(refusing, 'HEALTH_DATA')).rejects.toMatchObject({ name: 'ConsentRefused' });
});

test('a withdrawal is a DELETE of that consent', async () => {
  const fake = server();
  const fetch = jest.fn(async (request: Request) => {
    fake.seen.push({ method: request.method, path: request.url.slice(BASE.length), body: null });
    return new Response(JSON.stringify({ kind: 'HEALTH_DATA', status: 'WITHDRAWN' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  await withdrawConsent(createApiClient({ baseUrl: BASE, accessToken: async () => 't', fetch }), 'HEALTH_DATA');
  expect(fake.seen).toEqual([{ method: 'DELETE', path: '/v1/consents/HEALTH_DATA', body: null }]);
});
