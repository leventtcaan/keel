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
1. **EAS projesi** (Expo hesabı, bir kez) — **yapıldı (6 Eki, K-903):** `@leventcan/keel`, kimlik `app.json › expo.extra.eas.projectId`
   (sır değil). `eas init` expo-router'ın çözülmüş `extra.router` ayarını da app.json'a yazar; o kopya silindi (eklenti zaten kurar).
2. **Simülatör derlemesi** (bulutta, Apple hesabı yok): `eas build -p ios --profile development-simulator` →
   `eas build:run -p ios --latest` (indirir, simülatöre kurar) → `npx expo start --dev-client`. Beklenen: onboarding'in
   Apple Health adımında "Connect" görünür, Apple'ın izin sayfası açılır.
3. **Cihaz kaydı** (Apple hesabı): `eas device:create` → iPhone'da açılan bağlantıyla profil kurulur.
4. **Cihaz derlemesi**: `eas build -p ios --profile development` → Apple ile giriş (Levent). EAS, App ID'yi ve
   yetenekleri (Sign in with Apple, HealthKit) entitlements'tan eşler. QR ile kur → `npx expo start --dev-client`.
   Beklenen (K-308 kabul): Apple ile giriş sayfası ve HealthKit izin sayfası **gerçek cihazda** görülür.
5. **TestFlight** (dahili): `eas build -p ios --profile production` → `eas submit -p ios --latest` (App Store Connect'te
   uygulama kaydı yoksa EAS oluşturur) → App Store Connect › TestFlight › dahili test grubu (Levent).
   Store derlemesinde JS gömülüdür: `EXPO_PUBLIC_API_URL` EAS'in `production` ortamında — **yapıldı (6 Eki):**
   `https://keel-beta.duckdns.org` (düz metin, sır değil; `eas env:list --environment production`). `eas.json › build.production.environment`
   bu ortamı açıkça seçer. İlk derleme Levent'in terminalinde: `eas build -p ios --profile production --auto-submit` (Apple girişi + 2FA;
   EAS dağıtım sertifikasını, profili, App Store Connect kaydını ve gönderim anahtarını kurar). Sonra App Store Connect kaydının sayısal
   Apple ID'si `eas.json › submit.production.ios.ascAppId`'e girer (sır değil; **yapıldı (7 Eki): `6819852276`**, kayıt "keel (42901f)") — o olmadan etkileşimsiz gönderim düşer (eas-cli 20.3
   `IosSubmitCommand`: "Set ascAppId in the submit profile"). Ondan sonra derlemeler etkileşimsiz:
   `eas build -p ios --profile production --auto-submit --non-interactive`.
   Şifreleme beyanı `app.json › ios.config.usesNonExemptEncryption: false` (yalnız işletim sisteminin HTTPS/Keychain'i) → TestFlight her
   derlemede ihracat sorusu sormaz.
   Yasal adresler (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`) gizli değil: `eas.json › build.production.env`'de (K-809, ADR-060; geliştirme istemcisi yerelde `.env`'den okur);
   ürün adı/alan adı gelince (M10) orada ve `docs/yasal/site/_config.yml`'de değişir.
   Sunucu canlı (M9 Part 1, `https://keel-beta.duckdns.org/health`); `prod` profilinde koç AI kapalı, SANDBOX satın almaları sayılır.
   RevenueCat anahtarı (`EXPO_PUBLIC_REVENUECAT_APPLE_KEY`) yokken mağaza "kullanılamaz" olur ve abonelik kapısı kapanmaz (ADR-058 #107).

## Bilinen sınırlar
- `eas build:run` derlemeyi indirir (~yüzlerce MB); disk 5 GB altındaysa önce temizlik.
