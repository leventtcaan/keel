# apps/mobile/ — CLAUDE.md

Expo SDK 57 · React Native · TypeScript · expo-router. Kök kurallar: `../../CLAUDE.md`, `../../docs/anayasa.md`.
Görsel dil **Sıcak defter: kırık beyaz kâğıt, petrol = karar ve eylem, mercan = bugün ve ilerleme, yumuşak renkli gruplar, serif başlık + rounded rakam, büyük harf yok** (ADR-094; renk rolü tablosu her ekran ve pop-up için tek kaynak, `colour-roles.test.ts`). Light/Dark/System seçici ve koyu odak modu sürer (ADR-070 #3-#4); sistem katmanı Native Tabs (ADR-016) · mimari ADR-006.

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
  `package.json`'da `devDependencies`'e taşındığını kontrol et. Paket eklemek PR'da gerekçe + alternatif ister (K5, ADR-019).
- Paket sorunları: `npx expo-doctor` · `npx expo install --fix`
- Paketleme denemesi: `npx expo export --platform ios --output-dir /tmp/keel-export`

## Kurallar
- Rotalar `src/app/`'te; her dosya bir ekran, `_layout.tsx` gezinmeyi tanımlar. Bileşen/yardımcı kod `src/app/` dışında.
- **Renk yalnız `src/theme/tokens.ts`'te** — `tokens.test.ts` başka yerdeki renk sabitini yakalar.
- **Metin yalnız `../../data/copy/en.json`'da** — bileşen `t('anahtar')` ister; `copy-keys.test.ts` eksik anahtarı yakalar.
  Metro kökteki `data/`'yı `metro.config.js` üzerinden görür.
- API tipleri `contracts/openapi.yaml`'dan üretilir (K-303); elle yazılmaz.
  İstemci `src/api/client.ts` (`openapi-fetch`, her isteğe `Authorization: Bearer`). Sunucu adresi kodda değil:
  `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=http://localhost:8080` (gitignore'da; `src/api/config.ts` okur, yoksa hata).
- `ios/` ve `android/` klasörleri üretilir (Continuous Native Generation); elle oluşturulmaz, düzenlenmez. Native ayar
  `app.json` ve config plugin'lerle yapılır.
- Native kodlu bir kütüphane eklenince Expo Go yetmez; development build ve mağaza ikilisi gerekir (OTA yetmez). Eski dev build
  çökmesin diye modülü `requireOptionalNativeModule` ile sorup tembel yükle (örnek `src/review/deviceStoreReview.ts`); üst düzey
  `import`, modülü olmayan ikilide açılışta hata verir.
- Worktree'de `node_modules` keel-main'e bağlıysa `npx expo install` bağı gerçek klasöre çevirir (~860 MB): Metro'yu `--clear`
  ile yeniden başlat, birleşince klasörü sil ve bağı geri kur.
- Abonelik ekranı simülatörde: `.env`'e `EXPO_PUBLIC_PAYWALL_PREVIEW=1` ve iki yasal adres (`eas.json` production değerleri);
  yalnız geliştirme derlemesinde örnek planlar (`src/subscription/preview.ts`).
- TypeScript 6: `@types/*` otomatik dahil edilmez; test tipleri `tsconfig.json › types`'ta.
