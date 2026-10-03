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

  it('the limit is V1’s', () => {
    expect(foodParams.photoMaxSide).toBe(1024);
  });
});

describe('readMealPhoto (PhotoLogTests)', () => {
  const tools = (over: Partial<PhotoTools> = {}): PhotoTools & { pick: jest.Mock; shrink: jest.Mock } =>
    ({
      pick: jest.fn(async () => ({ uri: 'file:///photo.heic', width: 4032, height: 3024 })),
      shrink: jest.fn(async (_uri: string, size: { width: number; height: number } | null) => ({ base64: 'AAAA', ...(size ?? { width: 640, height: 480 }) })),
      ...over,
    }) as PhotoTools & { pick: jest.Mock; shrink: jest.Mock };
  const services = (granted: boolean, answer: Answer | 'offline' = ok(DRAFT)) => {
    const POST = jest.fn(async () => {
      if (answer === 'offline') throw new TypeError('Network request failed');
      return answer;
    });
    return { api: { POST } as never, consents: { granted: jest.fn(async () => granted) }, POST };
  };

  it('without the AI consent nothing is taken and nothing is sent', async () => {
    const s = services(false);
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera')).resolves.toEqual({ state: 'consent' });
    expect(s.consents.granted).toHaveBeenCalledWith('THIRD_PARTY_AI');
    expect(t.pick).not.toHaveBeenCalled();
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('a consent the phone cannot read is not given', async () => {
    const s = services(true);
    s.consents.granted.mockRejectedValueOnce(new Error('keychain'));
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'library')).resolves.toEqual({ state: 'consent' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('with it: taken, shrunk to 1024 as a JPEG, sent as base64, the draft back', async () => {
    const s = services(true);
    const t = tools();
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'library')).resolves.toEqual({ state: 'ready', draft: DRAFT });
    expect(t.pick).toHaveBeenCalledWith('library');
    expect(t.shrink).toHaveBeenCalledWith('file:///photo.heic', { width: 1024, height: 768 }, foodParams.photoQuality);
    expect(s.POST).toHaveBeenCalledWith('/v1/meals/photo', { body: { image: 'AAAA' } });
  });

  it('a small photo is still written again (its metadata left behind), only not enlarged', async () => {
    const s = services(true);
    const t = tools({ pick: jest.fn(async () => ({ uri: 'file:///small.jpg', width: 640, height: 480 })) });
    await readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera');
    expect(t.shrink).toHaveBeenCalledWith('file:///small.jpg', null, foodParams.photoQuality);
  });

  it('cancelled: nothing sent', async () => {
    const s = services(true);
    const t = tools({ pick: jest.fn(async () => null) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera')).resolves.toEqual({ state: 'cancelled' });
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('the camera not allowed: said so, nothing sent', async () => {
    const s = services(true);
    const t = tools({ pick: jest.fn(async () => 'denied' as const) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera')).resolves.toEqual({ state: 'denied' });
    expect(t.shrink).not.toHaveBeenCalled();
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('a shrunk photo still longer than the limit is never sent', async () => {
    const s = services(true);
    const t = tools({ shrink: jest.fn(async () => ({ base64: 'AAAA', width: 1025, height: 700 })) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('a photo that cannot be read or shrunk is a failure, not a crash', async () => {
    const s = services(true);
    const t = tools({ shrink: jest.fn(async () => Promise.reject(new Error('decode'))) });
    await expect(readMealPhoto({ api: s.api, consents: s.consents }, t, 'camera')).resolves.toEqual({ state: 'failed' });
    expect(s.POST).not.toHaveBeenCalled();
  });

  it('the server’s answers: its consent answer, offline, refused', async () => {
    const consent = services(true, refused(403, 'CONSENT_REQUIRED'));
    await expect(readMealPhoto({ api: consent.api, consents: consent.consents }, tools(), 'camera')).resolves.toEqual({ state: 'consent' });
    const offline = services(true, 'offline');
    await expect(readMealPhoto({ api: offline.api, consents: offline.consents }, tools(), 'camera')).resolves.toEqual({ state: 'failed' });
    const bad = services(true, refused(400, 'VALIDATION_FAILED'));
    await expect(readMealPhoto({ api: bad.api, consents: bad.consents }, tools(), 'camera')).resolves.toEqual({ state: 'failed' });
  });
});
