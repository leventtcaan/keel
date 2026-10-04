# EAS derleme ve TestFlight — runbook (K-308)

> Hesap ve mağaza adımları **Levent'in**: aşağıdaki komutlardan Apple/Expo hesabına dokunanlar onun onayıyla ve çoğu onun
> terminalinde (Apple girişi ve iki adımlı doğrulama etkileşimlidir). Sır repoya girmez (V5): Apple parolası, .p8,
> App Store Connect API anahtarı EAS'in kimlik deposunda ya da Levent'in anahtarlığında kalır.

## Neden development build
Expo Go yalnız Expo'nun kendi yerel modüllerini taşır. HealthKit (`@kingstinct/react-native-healthkit`, ADR-031) ve
Apple ile giriş yetenekleri bizim uygulamamızın kendi derlemesini ister. **Development build** = bizim yerel modüllerimizle
derlenmiş "kendi Expo Go'muz" (`expo-dev-client`); JS'i yine Mac'teki Metro'dan alır, kod değişikliği için yeniden
derleme gerekmez. **Store build** = JS gömülü, TestFlight'a gider.

## Profiller (`apps/mobile/eas.json`)
| Profil | Ne | Apple hesabı? |
|---|---|---|
| `development-simulator` | simülatörde development build | hayır |
| `development` | iPhone'da development build (dahili dağıtım, kayıtlı cihaz) | evet |
| `production` | mağaza derlemesi, `eas submit` ile TestFlight | evet |

Paket kimliği: `dev.leventtcaan.keel` (geçici, `app.config.ts`; `KEEL_IOS_BUNDLE_ID` ile değişir). Sunucudaki
`KEEL_APPLE_CLIENT_ID` aynı olmalı.

## Adımlar (sırayla)
1. **EAS projesi** (Expo hesabı, bir kez): `cd apps/mobile && eas init` → çıkan proje kimliği `app.json › expo.extra.eas.projectId`
   olarak eklenir (sır değil) ve commit'lenir.
2. **Simülatör derlemesi** (bulutta, Apple hesabı yok): `eas build -p ios --profile development-simulator` →
   `eas build:run -p ios --latest` (indirir, simülatöre kurar) → `npx expo start --dev-client`. Beklenen: onboarding'in
   Apple Health adımında "Connect" görünür, Apple'ın izin sayfası açılır.
3. **Cihaz kaydı** (Apple hesabı): `eas device:create` → iPhone'da açılan bağlantıyla profil kurulur.
4. **Cihaz derlemesi**: `eas build -p ios --profile development` → Apple ile giriş (Levent). EAS, App ID'yi ve
   yetenekleri (Sign in with Apple, HealthKit) entitlements'tan eşler. QR ile kur → `npx expo start --dev-client`.
   Beklenen (K-308 kabul): Apple ile giriş sayfası ve HealthKit izin sayfası **gerçek cihazda** görülür.
5. **TestFlight** (dahili): `eas build -p ios --profile production` → `eas submit -p ios --latest` (App Store Connect'te
   uygulama kaydı yoksa EAS oluşturur) → App Store Connect › TestFlight › dahili test grubu (Levent).
   Store derlemesinde JS gömülüdür: `EXPO_PUBLIC_API_URL` EAS ortamında olmalı
   (`eas env:create --environment production --name EXPO_PUBLIC_API_URL --value <adres> --visibility plaintext`).
   Yasal adresler (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`) gizli değil: `eas.json › build.<profil>.env`'de (K-809, ADR-060);
   ürün adı/alan adı gelince (M10) orada ve `docs/yasal/site/_config.yml`'de değişir.
   Sunucu henüz yayında değil (M9) → TestFlight derlemesi açılır, giriş sunucuya ulaşamaz.

## Bilinen sınırlar
- Cihazdan Apple ile girişin **uçtan uca** bitmesi çalışan bir sunucu ister (Docker bu Mac'te açılmıyor; yayın M9).
  Diyalog görünür, `/v1/auth/apple` çağrısı sunucu adresine gider.
- `eas build:run` derlemeyi indirir (~yüzlerce MB); disk 5 GB altındaysa önce temizlik.
