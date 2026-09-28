# apps/mobile/ — CLAUDE.md

Expo SDK 57 · React Native · TypeScript · expo-router. Kök kurallar: `../../CLAUDE.md`, `../../docs/anayasa.md`.
Görsel dil **C** (ADR-014) · mimari ADR-006.

## Expo her sürümde değişir — ezberden yazma
Expo her SDK'da API kırar; hatırladığın API büyük ihtimalle taşınmış ya da kalkmıştır. Bir Expo/EAS/React Native API'sine
dokunmadan önce:
1. `package.json`'daki `expo` ana sürümünü oku (şu an 57).
2. O sürümün dokümanını aç: `https://docs.expo.dev/versions/v57.0.0/` · genel indeks `https://docs.expo.dev/llms.txt`.
3. Emin değilsen kurulu paketin tip dosyasına bak (`node_modules/<paket>/build/*.d.ts`).
Örnek: SDK 57'de `import { Tabs } from 'expo-router'` **deprecated**; doğrusu `expo-router/js-tabs` (kurulu sürümde doğrulandı).

## Komutlar
- Hepsi birden: `npm run check` (typecheck + lint + test) — "bitti" demeden önce çalıştır ve çıktıyı göster
- Paket ekleme: **her zaman** `npx expo install <paket>` (SDK uyumlu sürümü çözer); geliştirme aracıysa
  `package.json`'da `devDependencies`'e taşındığını kontrol et. Paket eklemek sorulur (K5).
- Paket sorunları: `npx expo-doctor` · `npx expo install --fix`
- Paketleme denemesi: `npx expo export --platform ios --output-dir /tmp/keel-export`

## Kurallar
- Rotalar `src/app/`'te; her dosya bir ekran, `_layout.tsx` gezinmeyi tanımlar. Bileşen/yardımcı kod `src/app/` dışında.
- **Renk yalnız `src/theme/tokens.ts`'te** — `tokens.test.ts` başka yerdeki renk sabitini yakalar.
- **Metin yalnız `../../data/copy/en.json`'da** — bileşen `t('anahtar')` ister; `copy-keys.test.ts` eksik anahtarı yakalar.
  Metro kökteki `data/`'yı `metro.config.js` üzerinden görür.
- API tipleri `contracts/openapi.yaml`'dan üretilir (K-303); elle yazılmaz.
- `ios/` ve `android/` klasörleri üretilir (Continuous Native Generation); elle oluşturulmaz, düzenlenmez. Native ayar
  `app.json` ve config plugin'lerle yapılır.
- Native kodlu bir kütüphane eklenince Expo Go yetmez; development build gerekir.
- TypeScript 6: `@types/*` otomatik dahil edilmez; test tipleri `tsconfig.json › types`'ta.
