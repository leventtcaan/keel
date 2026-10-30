import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { tokens } from '@/theme/tokens';

import { foodParams } from './params';

/** The codes food packs carry: EAN-13, EAN-8, UPC-A, UPC-E (the contract's BarcodeLookup). */
const FOOD_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * The barcode reader (K-407): the camera, asked for once, reads one code and hands it on as scanned — a UPC-E is
 * expanded by the server (K-208). The camera sees the same code many times a second: only the first counts. Refused, or a
 * worn label, or no camera on the phone at all: the number can be typed, and the screen says so. Nothing is recorded or kept; the picture never leaves the camera view (V1).
 */
export function BarcodeScanner({ onCode, onClose }: { onCode: (gtin: string) => void; onClose: () => void }) {
  const reduceMotion = useReduceMotion();
  const { color } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const taken = useRef(false);
  const asking = useRef(false);
  // Asked once by itself; refused, it says why — on Android a first "no" can still be asked again, on a tap.
  const [asked, setAsked] = useState(false);
  // Whether the phone has a camera at all (a simulator has none): false is certain, anything else is "try it".
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.resolve()
      .then(() => CameraView.isAvailableAsync())
      .then((yes) => live && setAvailable(yes === true))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (permission === null || permission.granted || !permission.canAskAgain || asking.current) return;
    asking.current = true;
    void requestPermission().finally(() => setAsked(true));
  }, [permission, requestPermission]);

  const take = (code: string) => {
    if (taken.current) return;
    taken.current = true;
    onCode(code);
  };
  const lookUpTyped = () => {
    const code = typed.trim();
    const digits = new RegExp(`^[0-9]{${foodParams.barcodeMinDigits},${foodParams.barcodeMaxDigits}}$`);
    if (!digits.test(code)) {
      setProblem(t('meal.barcode.invalid', { min: foodParams.barcodeMinDigits, max: foodParams.barcodeMaxDigits }));
      return;
    }
    take(code);
  };

  // On Android a first "no" can still be asked again; on iOS it is Settings.
  const askAgain =
    permission?.canAskAgain === true ? (
      <Button label={t('meal.barcode.askAgain')} variant="ghost" size="sm" onPress={() => void requestPermission()} />
    ) : null;
  const camera =
    available === false ? (
      <View style={styles.typed}>
        <Text style={[styles.text, { color: color.text }]}>{t('meal.barcode.noCamera')}</Text>
        {permission?.granted === true ? null : askAgain}
      </View>
    ) : permission?.granted === true ? (
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...FOOD_BARCODES] }}
        onBarcodeScanned={(result) => take(result.data)}
        onMountError={() => setAvailable(false)}
      />
    ) : permission !== null && !permission.granted && (asked || !permission.canAskAgain) ? (
      <View style={styles.typed}>
        <Text style={[styles.text, { color: color.text }]}>{t('meal.barcode.denied')}</Text>
        {askAgain}
      </View>
    ) : null;

  return (
    <Modal animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <FormScroll contentContainerStyle={styles.body}>
          <ScreenTitle>{t('meal.barcode.title')}</ScreenTitle>
          {camera}
          <View style={styles.typed}>
            <TextField
              label={t('meal.barcode.type')}
              value={typed}
              onChangeText={(next) => {
                setTyped(next);
                setProblem(null);
              }}
              problem={problem}
              keyboardType="number-pad"
              maxLength={foodParams.barcodeMaxChars}
            />
            <Button label={t('meal.barcode.lookUp')} variant="ghost" size="sm" onPress={lookUpTyped} />
          </View>
          <Button label={t('meal.barcode.close')} variant="ghost" onPress={onClose} />
        </FormScroll>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  // Square: room to frame a pack's barcode, with the typed number still in sight above the keyboard.
  camera: { width: '100%', aspectRatio: 1, borderRadius: tokens.radius.card, overflow: 'hidden' },
  text: { fontSize: tokens.type.body },
  typed: { gap: tokens.space.sm },
});
