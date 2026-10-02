import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { foodParams } from './params';

/** The codes food packs carry: EAN-13, EAN-8, UPC-A, UPC-E (the contract's BarcodeLookup). */
const FOOD_BARCODES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

/**
 * The barcode reader (K-407): the camera, asked for once, reads one code and hands it on as scanned — a UPC-E is
 * expanded by the server (K-208). The camera sees the same code many times a second: only the first counts. Refused, or a
 * worn label: the number can be typed. Nothing is recorded or kept; the picture never leaves the camera view (V1).
 */
export function BarcodeScanner({ onCode, onClose }: { onCode: (gtin: string) => void; onClose: () => void }) {
  const { color } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const taken = useRef(false);
  const asked = useRef(false);

  useEffect(() => {
    if (permission === null || permission.granted || !permission.canAskAgain || asked.current) return;
    asked.current = true;
    void requestPermission();
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

  const camera =
    permission?.granted === true ? (
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...FOOD_BARCODES] }}
        onBarcodeScanned={(result) => take(result.data)}
      />
    ) : permission !== null && !permission.granted && !permission.canAskAgain ? (
      <Text style={[styles.text, { color: color.text }]}>{t('meal.barcode.denied')}</Text>
    ) : null;

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
              maxLength={foodParams.barcodeMaxDigits + 2}
            />
            <Button label={t('meal.barcode.lookUp')} variant="ghost" size="sm" onPress={lookUpTyped} />
          </View>
          <Button label={t('meal.barcode.close')} variant="ghost" onPress={onClose} />
        </ScrollView>
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
