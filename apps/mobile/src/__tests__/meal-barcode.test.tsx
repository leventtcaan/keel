/**
 * A barcode on the meal screen (K-407): read by the phone's camera, sent to the server as scanned — a UPC-E is expanded
 * there, not here (K-208) — and the product comes in as an item with its amount empty, like a food found by name. Not in
 * the database (FDC has few products outside the US, ADR-008): it says so and points to the search. The camera asks
 * once; refused, the number can be typed (a worn label too).
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MealScreen from '@/app/meal';
import { FoodPicker } from '@/food/FoodPicker';
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
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => ({}) }));
const mockServices = {
  api: { POST: mockPOST, PUT: jest.fn(), GET: jest.fn(), DELETE: jest.fn() },
  queue: { record: jest.fn(), drain: jest.fn(async () => {}) },
  mealRecords: async () => [],
  recentFoods: async () => [],
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
  mockPOST.mockImplementation(async (path: string) => {
    if (path === '/v1/foods/barcode-lookup') return mockLookup();
    return refused(404, 'NOT_FOUND');
  });
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

test('a code is looked up as scanned — a UPC-E is expanded on the server — and the product comes in with its amount filled (1 of its serving)', async () => {
  await openScanner();
  await scan('01234565', 'upc_e');
  expect(mockPOST).toHaveBeenCalledWith('/v1/foods/barcode-lookup', { body: { gtin: '01234565' } });
  expect(mockCamera).toBeNull(); // closed (the next render has no camera)
  expect(screen.getByLabelText(t('meal.item.amount', { name: YOGURT.name })).props.value).toBe('1');
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

// K1 (K-1063): a miss was a line pointing to the search; it is never a dead end now: "Add it" (the product from its label, the barcode
// filled in) and "Search instead". The line still says the product is not in the database.
test('not in the database: it says so, nothing is added, and offers to add the product or to search instead', async () => {
  mockLookup = async () => refused(404, 'NOT_FOUND');
  await openScanner();
  await scan('8690504000000');
  expect(screen.getByText(t('meal.barcode.missTitle'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('meal.barcode.addIt') })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: t('meal.barcode.searchInstead') })).toBeOnTheScreen();
  expect(screen.queryByLabelText(t('meal.item.amount', { name: YOGURT.name }))).toBeNull();
});

test('Search instead clears the miss and leaves the search box ready', async () => {
  mockLookup = async () => refused(404, 'NOT_FOUND');
  await openScanner();
  await scan('8690504000000');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.searchInstead') })));
  expect(screen.queryByText(t('meal.barcode.missTitle'))).toBeNull();
  expect(screen.getByLabelText(t('meal.search.label'))).toBeOnTheScreen();
});

test('Add it: the form with the barcode filled in; saved from the label, the product comes into the meal on its serving', async () => {
  mockLookup = async () => refused(404, 'NOT_FOUND');
  const created: Schemas['Food'] = {
    id: 'own:1',
    name: 'Zork bar',
    own: true,
    per100g: { kcal: R(380, 460), proteinG: R(35, 45), carbsG: R(35, 45), fatG: R(10, 14) },
    servings: [{ name: '1 serving (50 g)', grams: 50 }],
    portions: [{ unit: '1 serving (50 g)', label: '1 serving (50 g)', kind: 'SERVING', grams: 50, kcal: 200, proteinG: 20, carbsG: 20, fatG: 6 }],
    defaultAmount: { quantity: 1, unit: '1 serving (50 g)' },
  };
  mockPOST.mockImplementation(async (path: string) => {
    if (path === '/v1/foods/barcode-lookup') return mockLookup();
    if (path === '/v1/foods') return ok(created);
    return refused(404, 'NOT_FOUND');
  });
  await openScanner();
  await scan('8690504000000');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.addIt') })));
  expect(screen.getByText(t('meal.own.barcode', { gtin: '8690504000000' }))).toBeOnTheScreen();
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.name')), 'Zork bar'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.serving')), '50'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.kcal')), '200'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.protein')), '20'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.carbs')), '20'));
  await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.own.fat')), '6'));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.own.save') })));
  expect(mockPOST).toHaveBeenCalledWith('/v1/foods', {
    body: { name: 'Zork bar', gtin: '8690504000000', servingGrams: 50, kcal: 200, proteinG: 20, carbsG: 20, fatG: 6 },
  });
  expect(screen.getByLabelText(t('meal.item.amount', { name: 'Zork bar' })).props.value).toBe('1');
  expect(screen.getByTestId('numbers-0')).toHaveTextContent('200');
});

test('an own food with nothing in it is not sent: the form says to check the name and the numbers', async () => {
  mockLookup = async () => refused(404, 'NOT_FOUND');
  await openScanner();
  await scan('8690504000000');
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.addIt') })));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.own.save') })));
  expect(screen.getByText(t('meal.own.invalid'))).toBeOnTheScreen();
  expect(mockPOST.mock.calls.filter(([path]) => path === '/v1/foods')).toHaveLength(0);
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

describe('review', () => {
  test('a number the server refuses (a wrong check digit, 400) says to check the digits, not the connection', async () => {
    mockLookup = async () => refused(400, 'VALIDATION_FAILED');
    await openScanner();
    await scan('5000112548168');
    expect(screen.getByText(t('meal.barcode.badNumber'))).toBeOnTheScreen();
    expect(screen.queryByText(t('meal.barcode.failed'))).toBeNull();
  });

  test('refused once where the camera can still be asked again (Android): it says why, and asks again only on a tap', async () => {
    mockStartPermission = { granted: false, canAskAgain: true };
    mockAnswerPermission = { granted: false, canAskAgain: true };
    await openScanner();
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t('meal.barcode.denied'))).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('meal.barcode.askAgain') })));
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  test('a barcode answer that arrives after a newer search is dropped', async () => {
    let release: (answer: Answer) => void = () => {};
    mockLookup = () => new Promise<Answer>((resolve) => (release = resolve));
    mockPOST.mockImplementation(async (path: string) => {
      if (path === '/v1/foods/barcode-lookup') return mockLookup();
      if (path === '/v1/foods/search') return ok([{ ...YOGURT, id: 'fdc-9', name: 'Rice' }]);
      return refused(404, 'NOT_FOUND');
    });
    await openScanner();
    await scan('5000112548167');
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('meal.search.label')), 'rice'));
    await act(async () => fireEvent(screen.getByLabelText(t('meal.search.label')), 'submitEditing'));
    await act(async () => release(ok(YOGURT)));
    expect(screen.queryByLabelText(t('meal.item.amount', { name: YOGURT.name }))).toBeNull();
    expect(screen.getByRole('button', { name: t('meal.search.add', { name: 'Rice' }) })).toBeOnTheScreen();
  });

  // K1 (Evre 7 A): the meal screen has no "full" state any more (it adds one food at a time); a picker told its list is full (the
  // recipe's ingredients) still takes no barcode, and that is what is held here.
  test('a full list takes no barcode either: the scan is gone', async () => {
    await render(
      <ThemeProvider scheme="light">
        <FoodPicker full onFood={jest.fn()} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: t('meal.barcode.scan') })).toBeNull();
  });
});
