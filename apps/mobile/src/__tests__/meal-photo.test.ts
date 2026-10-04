/**
 * A meal photo from the phone (K-408, V1, V2, ADR-046): without the AI consent nothing is taken and nothing is sent;
 * with it, the photo is shrunk to at most 1024 px a side and written again as a JPEG on the phone (its metadata left
 * behind), and only then sent — what comes back is the server's draft of the database's foods (U1).
 */
import { fitWithin, readMealPhoto, type PhotoTools } from '@/food/photo';
import { foodParams } from '@/food/params';

type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const DRAFT = {
  mode: 'MODEL',
  items: [{ food: 'rice white cooked', amount: { quantity: 180, unit: 'g', certainty: 'ESTIMATED' }, confident: true, candidates: [{ id: 'f1', name: 'Rice, white' }] }],
};

describe('fitWithin (ResizeTests)', () => {
  it('shrinks the longer side to the limit and keeps the shape', () => {
    expect(fitWithin(4032, 3024, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3024, 4032, 1024)).toEqual({ width: 768, height: 1024 });
    expect(fitWithin(3000, 3000, 1024)).toEqual({ width: 1024, height: 1024 });
  });

  it('never makes a side longer than the limit, rounding down', () => {
    const { width, height } = fitWithin(4000, 2999, 1024) as { width: number; height: number };
    expect(width).toBe(1024);
    expect(height).toBe(767); // 2999 × 1024 / 4000 = 767.7
  });

  it('leaves a photo already within the limit as it is (no enlarging)', () => {
    expect(fitWithin(1024, 768, 1024)).toBeNull();
    expect(fitWithin(640, 480, 1024)).toBeNull();
  });

  it('over the limit: the longer side is exactly the limit, the other at least 1 and at most the limit (every size to 6000)', () => {
    const wrong: string[] = [];
    for (let w = 1; w <= 6000; w += 7) {
      for (const h of [1, 2, 37, 480, 1023, 1024, 1025, 1122, 2999, 3024, 4032, w]) {
        const fit = fitWithin(w, h, 1024);
        const over = w > 1024 || h > 1024;
        if (!over) {
          if (fit !== null) wrong.push(`${w}x${h} resized`);
          continue;
        }
        if (fit === null || Math.max(fit.width, fit.height) !== 1024 || Math.min(fit.width, fit.height) < 1 || fit.width > 1024 || fit.height > 1024)
          wrong.push(`${w}x${h} -> ${JSON.stringify(fit)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the limit is V1’s', () => {
    expect(foodParams.photoMaxSide).toBe(1024);
  });
});

describe('readMealPhoto (PhotoLogTests)', () => {
  const tools = (over: Partial<PhotoTools> = {}): PhotoTools & { pick: jest.Mock; shrink: jest.Mock; discard: jest.Mock } =>
    ({
      pick: jest.fn(async () => ({ uri: 'file:///photo.heic' })),
      shrink: jest.fn(async () => ({ base64: 'AAAA', width: 1024, height: 768, uri: 'file:///shrunk.jpg' })),
      discard: jest.fn(async () => {}),
      ...over,
    }) as PhotoTools & { pick: jest.Mock; shrink: jest.Mock; discard: jest.Mock };
  const services = (granted: boolean, answer: Answer | 'offline' = ok(DRAFT)) => {
    const POST = jest.fn(async () => {
      if (answer === 'offline') throw new TypeError('Network request failed');
      return answer;
    });
    return { api: { POST } as never, consents: { granted: jest.fn(async () => granted) }, report: jest.fn(), POST };
  };

  it('without the AI consent nothing is taken and nothing is sent', async () => {
    const s = services(false);
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'camera')).resolves.toEqual({ state: 'consent' });
    expect(s.consents.granted).toHaveBeenCalledWith('THIRD_PARTY_AI');
    expect(t.pick).not.toHaveBeenCalled();
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('a consent the phone cannot read is not given', async () => {
    const s = services(true);
    s.consents.granted.mockRejectedValueOnce(new Error('keychain'));
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'library')).resolves.toEqual({ state: 'consent' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('with it: taken, shrunk to 1024 as a JPEG, sent as base64, the draft back', async () => {
    const s = services(true);
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'library')).resolves.toEqual({ state: 'ready', draft: DRAFT });
    expect(t.pick).toHaveBeenCalledWith('library');
    expect(t.shrink).toHaveBeenCalledWith('file:///photo.heic', foodParams.photoMaxSide, foodParams.photoQuality);
    expect(s.POST).toHaveBeenCalledWith('/v1/meals/photo', { body: { image: 'AAAA' } });
  });

  it('cancelled: nothing sent', async () => {
    const s = services(true);
    const t = tools({ pick: jest.fn(async () => null) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'camera')).resolves.toEqual({ state: 'cancelled' });
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('the camera not allowed: said so, nothing sent', async () => {
    const s = services(true);
    const t = tools({ pick: jest.fn(async () => 'denied' as const) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'camera')).resolves.toEqual({ state: 'denied' });
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it.each([
    [1025, 700],
    [700, 1025],
  ])('a shrunk photo still over the limit (%i × %i) is never sent', async (width, height) => {
    const s = services(true);
    const t = tools({ shrink: jest.fn(async () => ({ base64: 'AAAA', width, height, uri: 'file:///shrunk.jpg' })) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('a photo that cannot be read or shrunk is a failure, not a crash', async () => {
    const s = services(true);
    const t = tools({ shrink: jest.fn(async () => Promise.reject(new Error('decode'))) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents, report: s.report }, t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('the server’s answers: its consent answer, offline, the subscription’s answer, refused', async () => {
    const consent = services(true, refused(403, 'CONSENT_REQUIRED'));
    await expect(readMealPhoto({ api: consent.api, consents: consent.consents, report: consent.report }, tools(), 'camera')).resolves.toEqual({ state: 'consent' });
    const offline = services(true, 'offline');
    await expect(readMealPhoto({ api: offline.api, consents: offline.consents, report: offline.report }, tools(), 'camera')).resolves.toEqual({ state: 'failed' });
    const unsubscribed = services(true, refused(403, 'ENTITLEMENT_REQUIRED'));
    await expect(readMealPhoto({ api: unsubscribed.api, consents: unsubscribed.consents, report: unsubscribed.report }, tools(), 'camera')).resolves.toEqual({
      state: 'subscription',
    });
    const bad = services(true, refused(400, 'VALIDATION_FAILED'));
    await expect(readMealPhoto({ api: bad.api, consents: bad.consents, report: bad.report }, tools(), 'camera')).resolves.toEqual({ state: 'failed' });
  });
});

describe('nothing of the photo stays on the phone (K-811, V1)', () => {
  const PICKED = 'file:///cache/ImagePicker/a.jpg';
  const SHRUNK = 'file:///cache/ImageManipulator/b.jpg';
  const tools = (over: Partial<PhotoTools> = {}): PhotoTools & { discard: jest.Mock } => ({
    pick: jest.fn(async () => ({ uri: PICKED })),
    shrink: jest.fn(async () => ({ base64: 'AAAA', width: 1024, height: 768, uri: SHRUNK })),
    discard: jest.fn(async (_uri: string) => {}),
    ...over,
  }) as PhotoTools & { discard: jest.Mock };
  const services = (answer: Answer | 'offline' = ok(DRAFT)) => ({
    api: { POST: jest.fn(async () => (answer === 'offline' ? Promise.reject(new TypeError('Network request failed')) : answer)) } as never,
    consents: { granted: jest.fn(async () => true) },
    report: jest.fn(),
  });

  it.each([
    ['sent and read', ok(DRAFT)],
    ['refused', refused(403, 'ENTITLEMENT_REQUIRED')],
    ['offline', 'offline' as const],
  ])('%s: the picked file and the shrunk one are deleted', async (_, answer) => {
    const t = tools();
    await readMealPhoto(services(answer), t, 'camera');
    expect(t.discard.mock.calls.map(([uri]: [string]) => uri).sort()).toEqual([PICKED, SHRUNK].sort());
  });

  it('too big to send: both deleted, nothing sent', async () => {
    const t = tools({ shrink: jest.fn(async () => ({ base64: 'AAAA', width: 2000, height: 10, uri: SHRUNK })) });
    await expect(readMealPhoto(services(), t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(t.discard.mock.calls.map(([uri]: [string]) => uri).sort()).toEqual([PICKED, SHRUNK].sort());
  });

  it('a photo that could not be shrunk: the picked file deleted', async () => {
    const t = tools({ shrink: jest.fn(async () => Promise.reject(new Error('decode'))) });
    await expect(readMealPhoto(services(), t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(t.discard.mock.calls).toEqual([[PICKED]]);
  });

  it('nothing picked: nothing to delete', async () => {
    const t = tools({ pick: jest.fn(async () => null) });
    await readMealPhoto(services(), t, 'library');
    expect(t.discard).not.toHaveBeenCalled();
  });

  it('a file that cannot be deleted is reported by name; the draft still comes back', async () => {
    const s = services();
    const t = tools({ discard: jest.fn(async () => Promise.reject(Object.assign(new Error('/private/var/x.jpg'), { name: 'FileBusy' }))) });
    await expect(readMealPhoto(s, t, 'camera')).resolves.toEqual({ state: 'ready', draft: DRAFT });
    expect(s.report).toHaveBeenCalledWith({ name: 'FileBusy' });
    expect(JSON.stringify(s.report.mock.calls)).not.toContain('/private/var');
  });
});
