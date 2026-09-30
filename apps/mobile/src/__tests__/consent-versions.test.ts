/**
 * Consents from the phone (K-312, K-204, ADR-007): a grant names the version of the text the user saw, and the server
 * accepts only its current one. The phone's texts (data/copy/en.json › consent) and the server's versions
 * (backend application.yml › keel.consent.versions) must name the same version, or every grant is refused.
 */
import * as fs from 'fs';
import * as path from 'path';

import { createApiClient } from '@/api/client';
import { consentVersion, grantConsent, withdrawConsent } from '@/consent/consents';

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
