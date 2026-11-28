# Uygulama içi puan isteme: Apple kuralları ve Expo 57 (28 Kas 2026, K-1254)
Araştıran: agent (Sonnet alt ajanı, ham HTML/JSON curl ile; Opus iki iddiayı ayrıca doğruladı: 5.6.1 metni, `sdk-57` etiketi).
Alıntılar 25 sözcüğün altında; "doğrulanmadı" olanlar resmî sayfada bulunamadı.

## 1 · App Store Review Guidelines (https://developer.apple.com/app-store/review/guidelines/)
- **5.6.1 App Store Reviews:** "Use the provided API to prompt users to review your app… and we will disallow custom review prompts." → özel puan penceresi yasak.
- **3.2.2(x):** "Apps must not force users to rate the app, review the app, download other apps" → puan karşılığı özellik açmak yasak.
- **Business giriş paragrafı (numarasız):** "manipulate reviews… with paid, incentivized, filtered, or fake feedback" → yaptırım geliştirici programından çıkarma olabilir.
- **"Mutlu musun?" süzgeci (review gating):** açık yasak cümlesi yok **[doğrulanmadı]**; "filtered … feedback" ifadesine girer, risklidir.

## 2 · HIG Ratings and reviews (https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews)
- "Ask for a rating only after people have demonstrated engagement with your app or game."
- "Avoid asking for a rating on first launch or during onboarding".
- "Avoid interrupting people while they're performing a task or playing a game."
- "Consider allowing at least a week or two between requests".
- Sistem: "limits the display of the prompt to three occurrences per app within a 365-day period." "Prefer the system-provided prompt."

## 3 · StoreKit (https://developer.apple.com/documentation/storekit/requesting-app-store-reviews)
- "Avoid requesting a review as the result of a user action." Pencere çıkmayabilir: düğmeye bağlanmaz.
- Kalıcı bağlantı serbest: "you may include a persistent link to your App Store product page in your app's settings". Biçim:
  `https://apps.apple.com/app/id<APP_ID>?action=write-review`.
- `SKStoreReviewController.requestReview(in:)` iOS 18'de deprecated → `AppStore.requestReview(in:)`; SwiftUI `RequestReviewAction` iOS 16+.
- Geliştirme derlemesinde pencere her zaman çıkar; **TestFlight'ta hiç çıkmaz.** Sonuç/geri çağırma bildirmez (açık cümle **[doğrulanmadı]**, "if appropriate" tanımından çıkarım).

## 4 · expo-store-review, SDK 57 (https://docs.expo.dev/versions/v57.0.0/sdk/storereview/)
- Kurulum `npx expo install expo-store-review`; SDK 57 sürümü `~57.0.3` (npm `sdk-57` etiketi 57.0.3, doğrulandı; `latest` 58.x kurulmaz).
- API: `requestReview(): Promise<void>`, `isAvailableAsync(): Promise<boolean>` (iOS'ta TestFlight dışında true), `hasAction()`, `storeUrl(): string | null`.
- `storeUrl()`/`hasAction()` `expoConfig.ios.appStoreUrl`'den okur; plugin gerekmez. Uyarı: "Don't call `StoreReview.requestReview()` from a button".
- Yerel modül sarar (SKStoreReviewController) → mevcut ikiliye OTA ile eklenemez, yeni dev build ve mağaza ikilisi gerekir (sayfada açık cümle yok, çıkarım **[doğrulanmadı]**).

## 5 · Koddaki olumlu anlar (agent taraması)
- Antrenman bitişi `src/app/workout-end.tsx`: sunucu yeni rekorları `RECORD` işaretiyle listeler ("Yeni rekor", Evre 7 C3: "bitiş bir başarıdır").
- Karar ekranı `src/app/call.tsx`: "Anladım" / "Kalsın" / "Uygula" eylemleri; karar her zaman iyi haber değildir (hedefe doğru değil), olumlu an sayılmaz.
- Uygulama ID'si `eas.json` › submit `ascAppId` (6819852276).
