/**
 * The haptics port is real (Evre 7 fix d): a set kept is a light impact, a record the success notification, both through
 * `expo-haptics`; a build without the native module, or a phone that refuses, feels nothing and throws nothing.
 */
const mockImpact = jest.fn(async (_style: string) => undefined);
const mockNotify = jest.fn(async (_type: string) => undefined);

jest.mock('expo-haptics', () => ({
  impactAsync: (style: string) => mockImpact(style),
  notificationAsync: (type: string) => mockNotify(type),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

import { haptics } from '@/train/haptics';

describe('haptics', () => {
  beforeEach(() => jest.clearAllMocks());

  test('a set kept is a light tick', () => {
    haptics.setDone();
    expect(mockImpact).toHaveBeenCalledWith('light');
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('a record is the success notification', () => {
    haptics.record();
    expect(mockNotify).toHaveBeenCalledWith('success');
  });

  test('a phone that refuses feels nothing and nothing is thrown', async () => {
    mockImpact.mockRejectedValueOnce(new Error('no engine'));
    expect(() => haptics.setDone()).not.toThrow();
    await Promise.resolve();
  });
});
