# ADR-001 · Teknik yığın: Spring Boot + Spring Modulith + Expo
- **Durum:** KABUL
- **Tarih:** 2026-09-29 · **Karar veren:** Levent

## Bağlam
Tek geliştirici, seviye sıfır, amaç hem ürünü çıkarmak hem teknik yetkinlik. Paralel bitirme projesi NutriScan aynı
yığını kullanıyor. iOS önce, Android şartlı (`arastirma/05-faz4-pazarlama.md`).

## Karar
- **Backend:** Java 25 · Spring Boot 4.1.1 · Spring Modulith 2.1.1 · Gradle 9.8.0 (Kotlin DSL). Modüler monolit.
- **Mobil:** Expo SDK 57 · React Native · TypeScript · expo-router.
- Sürümler NutriScan'de 2026-09-28'de Maven Central'a karşı doğrulandı; Expo sürümleri 2026-09-29'da npm'de doğrulandı.

## Neden
- Öğrenilen her şey iki projede birden işe yarar ve Java/Spring öğrenme hattıyla bileşir.
- Modulith, modül sınırlarını **testle** korur — agent'ın modül dışına taşmasını yakalayan mekanik bir önlem.
- Expo tek kod tabanından iOS; Android gelirse neredeyse bedava. Apple Foundation Models ve HealthKit, Expo'nun native
  modül desteğiyle (küçük Swift köprüsü) kullanılabilir.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Spring Boot + SwiftUI | En iyi iOS deneyimi ama yeni dil (Swift) ve Android = sıfırdan yazmak |
| Expo + Supabase/FastAPI | En hızlı, ama Spring hattıyla bileşmez; karar motoru TS/Python'a gider |
| Mikroservisler | Tek geliştirici için operasyon yükü; modüler monolit sınırları zaten veriyor |

## Geri dönmenin maliyeti
Yüksek (yığın değişikliği). Bu yüzden KABUL.

## Etkilenen
Tüm depo.

## Doğrulama
`backend/gradle/libs.versions.toml` tek sürüm kaynağı (`VersionCatalogTests`); `apps/mobile/package.json` Expo SDK 57.
