/**
 * A barcode on the meal screen (K-407): read by the phone's camera, sent to the server as scanned — a UPC-E is expanded
 * there, not here (K-208) — and the product comes in as an item with its amount empty, like a food found by name. Not in
 * the database (FDC has few products outside the US, ADR-008): it says so and points to the search. The camera asks
 * once; refused, the number can be typed (a worn label too).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MealScreen from '@/app/meal';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });
const R = (low: number, high: number) => ({ low, high });

const YOGURT: Schemas['Food'] = {
  id: 'fdc-5',
  name: 'Greek yogurt, plain',
  brand: 'Fage',
  per100g: { kcal: R(90, 105), proteinG: R(9, 11), carbsG: R(3, 5), fatG: R(4, 6) },
  servings: [{ name: '1 container', grams: 170 }],
};

type Permission = { granted: boolean; canAskAgain: boolean };
let mockStartPermission: Permission = { granted: true, canAskAgain: true };
let mockAnswerPermission: Permission = { granted: true, canAskAgain: true };
const mockRequest = jest.fn();
let mockCamera: { onBarcodeScanned?: (result: { data: string; type: string }) => void; barcodeScannerSettings?: unknown } | null = null;
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useCameraPermissions: () => {
      const [permission, setPermission] = React.useState<Permission>(mockStartPermission);
      const request = async () => {
        mockRequest();
        setPermission(mockAnswerPermission);
        return mockAnswerPermission;
      };
      return [permission, request];
    },
    CameraView: (props: NonNullable<typeof mockCamera>) => {
      React.useEffect(() => {
        mockCamera = props;
        return () => {
          mockCamera = null;
        };
      });
      return null;
    },
  };
});

let mockLookup: () => Promise<Answer> = async () => ok(YOGURT);
const mockPOST = jest.fn(async (path: string, _init?: unknown) => {
  if (path === '/v1/foods/barcode-lookup') return mockLookup();
  return refused(404, 'NOT_FOUND');
});
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { POST: mockPOST, PUT: jest.fn(), GET: jest.fn(), DELETE: jest.fn() },
  queue: { record: jest.fn() },
  consents: { granted: async () => true, remember: jest.fn() },
  forgetRecord: jest.fn(),
  report: jest.fn(),
};
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCamera = null;
  mockStartPermission = { granted: true, canAskAgain: true };
  mockAnswerPermission = { granted: true, canAskAgain: true };
  mockLookup = async () => ok(YOGURT);
});

async function openScanner() {
  await render(
    <ThemeProvider scheme="light">
      <MealScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.scan') })));
}
async function scan(data: string, type = 'ean13') {
  await act(async () => mockCamera?.onBarcodeScanned?.({ data, type }));
}
const lookups = () => mockPOST.mock.calls.filter(([path]) => path === '/v1/foods/barcode-lookup');

test('the camera reads only the barcodes food packs carry', async () => {
  await openScanner();
  expect(mockCamera?.barcodeScannerSettings).toEqual({ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] });
});

test('a code is looked up as scanned — a UPC-E is expanded on the server — and the product comes in with its amount empty', async () => {
  await openScanner();
  await scan('01234565', 'upc_e');
  expect(mockPOST).toHaveBeenCalledWith('/v1/foods/barcode-lookup', { body: { gtin: '01234565' } });
  expect(mockCamera).toBeNull(); // closed (the next render has no camera)
  expect(screen.getByLabelText(t('meal.item.amount', { name: YOGURT.name })).props.value).toBe('');
  expect(screen.getByRole('button', { name: t('meal.item.unitSpoken', { name: YOGURT.name, unit: '1 container' }) })).toBeSelected();
});

test('the same code seen many times in a moment is looked up once', async () => {
  await openScanner();
  const seen = mockCamera?.onBarcodeScanned;
  await act(async () => {
    seen?.({ data: '5000112548167', type: 'ean13' });
    seen?.({ data: '5000112548167', type: 'ean13' });
    seen?.({ data: '5000112548167', type: 'ean13' });
  });
  expect(lookups()).toHaveLength(1);
});

test('not in the database: it says so and points to the search; nothing is added', async () => {
  mockLookup = async () => refused(404, 'NOT_FOUND');
  await openScanner();
  await scan('8690504000000');
  expect(screen.getByText(t('meal.barcode.notFound'))).toBeOnTheScreen();
  expect(screen.queryByLabelText(t('meal.item.amount', { name: YOGURT.name }))).toBeNull();
});

test('not looked up (offline, a code the server refuses): it says so', async () => {
  mockLookup = async () => {
    throw new TypeError('Network request failed');
  };
  await openScanner();
  await scan('5000112548167');
  expect(screen.getByText(t('meal.barcode.failed'))).toBeOnTheScreen();
});

test('the camera is asked for once; refused, it says so and the number can be typed', async () => {
  mockStartPermission = { granted: false, canAskAgain: true };
  mockAnswerPermission = { granted: false, canAskAgain: false };
  await openScanner();
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t('meal.barcode.denied'))).toBeOnTheScreen();
  expect(mockCamera).toBeNull();

  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.barcode.type')), ' 5000112548167 '));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.lookUp') })));
  expect(mockPOST).toHaveBeenCalledWith('/v1/foods/barcode-lookup', { body: { gtin: '5000112548167' } });
});

test('a typed number that is not a barcode is not sent', async () => {
  await openScanner();
  for (const typed of ['1234567', '123456789012345', '50001125481a7']) {
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.barcode.type')), typed));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.lookUp') })));
  }
  expect(lookups()).toHaveLength(0);
  expect(screen.getByText(t('meal.barcode.invalid', { min: 8, max: 14 }))).toBeOnTheScreen();
});

test('closed without a code: nothing looked up', async () => {
  await openScanner();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.close') })));
  expect(mockCamera).toBeNull();
  expect(lookups()).toHaveLength(0);
});
