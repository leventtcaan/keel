# ADR-031 · Apple Health kütüphanesi: @kingstinct/react-native-healthkit, bir yetenek arayüzünün arkasında
- **Durum:** KABUL (teknik, agent — ADR-019)
- **Tarih:** 2026-09-30 · **Karar veren:** agent · **Görev:** K-403 (M4'ten M3'e çekildi: K-308 izin diyaloğunu cihazda ister)

## Bağlam
ADR-018 Apple Health'ten okuma (adım, uyku, tartı, aktif enerji, dış antrenman) ve ayrı izinle yazma istiyor. Expo'nun
birinci taraf HealthKit modülü yok (30 Eyl: `expo-healthkit`, `@expo/healthkit` npm'de 404; docs.expo.dev/llms.txt'te
"health" yok). Kütüphane native kod içerir → Expo Go'da çalışmaz, development build gerekir (K-308).

## Karar
1. **`@kingstinct/react-native-healthkit` 16.x** (+ `react-native-nitro-modules` 0.37), `npx expo install` ile. Expo config
   plugin'i var (Info.plist açıklamaları, HealthKit entitlement'ı).
2. Ekranlar kütüphaneyi değil **`HealthAccess`** arayüzünü tanır (`src/health/health.ts`); telefon uygulaması
   `healthKitAccess()` (`src/health/healthKit.ts`). **Expo Go'da kütüphane hiç yüklenmez** (`isRunningInExpoGo()`, Expo
   Go'nun kendi yerel modülüne bakar): ilk yüklemeden sonra `require` edilen modülün yükleme hatasını Metro yakalayıp
   ölümcül hata ekranı gösterir, bizim `try/catch`'imize gelmez (K-403 incelemesi; metro-runtime `guardedLoadModule`).
   Başka yerde yüklenemezse ya da cihazda Health deposu yoksa (iPad) "kullanılamaz" — ekranlar bunu söyler.
   (`Constants.executionEnvironment` Expo Go ile development build'i ayıramaz: ikisi de `storeClient`.)
3. **Yalnız okuma**, rıza metnindeki beş tür (`READ_TYPES`); yazma izni K-412'de ayrı düğmeyle; arka plan teslimi kapalı
   (K-404 okumaya başlayınca karar verilir). ADR-018 §4 dışlamaları (kalp, döngü, ilaç, klinik, konum) testle.
4. iOS izin metni kullanıcıya görünür → `data/copy/en.json › permissions.healthRead`; `app.config.ts` onu plugin'e verir
   (K2). `app.json` temel kalır.

## Neden
Bakımda (16.0.0, 18 Eyl 2026), React 19 / RN ≥0.79 ile uyumlu, TypeScript tipleri HealthKit tanımlayıcılarını birebir
taşıyor, Expo plugin'i hazır. Arayüz, kütüphane değişirse ekranları korur ve testte sahtesiyle çalışır.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `react-native-health` 1.19 | Son güncelleme Ekim 2024; Nitro/yeni mimari desteği belirsiz [doğrulanmadı]; plugin yok |
| Kendi Expo modülümüz (Swift) | M3'te gereksiz iş; bakım yükü |
| Health yok, yalnız elle giriş | ADR-018 ile çelişir; RED-S güvenlik ağı aktif enerji ister (U13) |

## Geri dönmenin maliyeti
Düşük: yalnız `healthKit.ts` ve `app.config.ts` değişir; ekranlar ve testler arayüze bağlı.

## Doğrulama
`healthkit.test.ts` (yüklenemezse kullanılamaz, okuma listesi, dışlamalar, hata iletimi) · `app-config.test.ts` (izin
metni en.json'dan, yazma yok, arka plan yok) · `npx expo config --type prebuild` çıktısı · cihazda/simülatörde izin
diyaloğu ve bir okuma: K-308 development build'i ile (K-403 kartının test satırı orada kanıtlanır).
