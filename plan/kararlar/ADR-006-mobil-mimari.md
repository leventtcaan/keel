# ADR-006 · Mobil mimari
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Salonda sinyal kopar; kayıt hiç kaybolmamalı. Arayüz metni koda gömülmez (K2, U11). Görsel dil C (ADR-014).
Ana ekran: Bugün (Levent, 29 Eyl).

## Karar
- **expo-router** ile dosya tabanlı gezinme. Sekmeler: **Today · Train · Food · Progress**; koç girişi her ekranda.
- **Offline-first:** kayıtlar önce cihazdaki yerel depoya (expo-sqlite) yazılır, bağlantı gelince sunucuya gönderilir.
- **API tipleri üretilir:** `contracts/openapi.yaml` → `openapi-typescript` → `src/api/schema.ts` (elle düzenlenmez, K3).
- **Metinler:** `data/copy/en.json` derleme anında pakete girer; bileşenler metni anahtarla ister.
- **Tasarım token'ları:** `src/theme/tokens.ts` tek dosya (renk, font, radius, boşluk) — yön C.
- **Native köprüler** (HealthKit, Apple Foundation Models, kamera, fotoğraf küçültme) `src/native/` altında ince
  sarmalayıcılar; bağımlılık eklemek sorulur (K5). Adaylar (npm'de 2026-09-29'da doğrulandı):
  `@kingstinct/react-native-healthkit` 16.0.0, `expo-camera` 57.0.5, `expo-image-manipulator` 57.0.20,
  `expo-apple-authentication` 57.0.2, `expo-sqlite` 57.0.3.
- **Test:** tip kontrolü (`tsc`), lint, birim testleri (Jest). `npm run check` üçünü çalıştırır.

## Neden
Offline-first salon gerçeğine uyar; üretilen tipler backend ile mobilin sessizce kopmasını önler.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| React Navigation (elle) | expo-router aynı işi dosya düzeniyle ve daha az kodla yapar |
| Online-only | Salonda kayıt kaybı = güven kaybı |
| Elle yazılmış API tipleri | Sessiz sözleşme kopması |

## Geri dönmenin maliyeti
Orta.

## Etkilenen
`apps/mobile/`, `contracts/`.

## Doğrulama
`npm run check` yeşil; `src/api/schema.ts` sözleşmeden yeniden üretildiğinde diff yok (CI adımı).
