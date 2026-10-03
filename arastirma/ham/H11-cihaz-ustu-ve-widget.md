# H11 — Cihaz üstü katman ve kilit ekranı: Apple Foundation Models (K-510) · widget + App Intents (K-515) · Live Activity (K-426)

> M5 Part 4 spike araştırması (agent, web; kod yazılmadı). Kararlar: ADR-047 (K-510), ADR-048 (K-515, K-426).

Erişim tarihi: **2026-10-03** (tüm kaynaklar). Kurulum/derleme yapılmadı.
Kurulu sürümler `apps/mobile/package.json` ve `apps/mobile/node_modules/*/package.json`'dan: expo ~57.0.25, react-native 0.86.3,
expo-camera 57.0.6, @expo/ui 57.0.20, expo-modules-core 57.0.19. `expo-widgets` ve `expo-build-properties` **kurulu değil**.

Kısaltma: "npm JSON" = `https://registry.npmjs.org/<paket>` (dist-tags, time, repository, peerDependencies, maintainers).

---

## 0. Her iki spike'ı etkileyen ortak bulgu — Xcode 27 / iOS 27 SDK ve UIScene

- **Expo SDK 58 henüz stabil değil, beta.** expo.dev/changelog'daki son SDK yazısı "Expo SDK 58 Beta is now available"
  (15 Eylül 2026). Kaynak: https://expo.dev/changelog , https://expo.dev/changelog/sdk-58-beta
  npm'de `expo@58.0.0` 2026-09-29'da yayımlandı ama **`next` etiketinde**; `latest` = `57.0.26` (2026-10-03 itibarıyla
  `next` = 58.0.3, 2026-10-03T13:25Z). Kaynak: https://registry.npmjs.org/expo
  Beta yazısı: "SDK 58 beta includes React Native 0.88 (Release Candidate)"; stabil: RN 0.88 çıkınca "shortly after".
  Kesin stabil tarih yok. Beta yazısı ayrıca "SDK 58 is built for iOS 27" ve EAS'te Xcode 27 imajlarının "coming soon"
  olduğunu, en son imajın Xcode 26.6 olduğunu söylüyor.
- **iOS 27 SDK (Xcode 27) UIScene yaşam döngüsünü şart koşuyor.** SDK 58 beta: "the iOS 27 SDK requires the UIScene life
  cycle, so `npx expo prebuild` now generates SceneDelegate.swift". (https://expo.dev/changelog/sdk-58-beta.md)
- **SDK 57 için çözüm var:** `expo-build-properties` → `ios.enableSceneSupport: true`. v57 dokümanı: "Adopt the UIKit
  scene lifecycle in an Expo SDK 57 iOS project, as required by the iOS 27 SDK (Xcode 27)… Requires Expo SDK 57.0.23 or
  newer." (https://docs.expo.dev/versions/v57.0.0/sdk/build-properties.md). `expo-build-properties` sdk-57 = 57.0.22
  (2026-09-24) (https://registry.npmjs.org/expo-build-properties). Biz 57.0.25'teyiz → şart sağlanıyor.
- **Neden önemli:** iOS 27'ye özgü API'ler (Foundation Models görüntü girdisi, `OCRTool`, `BarcodeReaderTool`,
  `PrivateCloudComputeLanguageModel`) **Xcode 27 ile derlemeyi** gerektirir; Xcode 27 ile derlemek de UIScene'i gerektirir.
  Yani K-510'un iOS 27 kısmı ya SDK 57 + `enableSceneSupport` ya da SDK 58 yükseltmesi demektir (K-515'in "SDK 58
  yükseltme değerlendirmesi" kabul kriteriyle aynı karar noktası). iOS 26 API'leri (metin üretimi, `@Generable`,
  availability) Xcode 26.4+ ile, UIScene olmadan derlenir.

---

## SPIKE A — K-510: Apple Foundation Models cihaz üstü katman

### A1. Apple resmî gerçekleri (developer.apple.com DocC JSON uçları üzerinden okundu)

| Gerçek | Değer | Kaynak |
|---|---|---|
| FoundationModels framework minimum | iOS/iPadOS/macOS/visionOS **26.0**, watchOS 27.0 | https://developer.apple.com/documentation/foundationmodels |
| `SystemLanguageModel` | iOS 26.0; "An on-device Apple Foundation Model capable of text generation tasks." | https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel |
| `SystemLanguageModel.Availability` | `available`, `unavailable(_:)` | https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum |
| `UnavailableReason` | **`deviceNotEligible`, `appleIntelligenceNotEnabled`, `modelNotReady`** (Swift enum; kodda `@unknown default` gerekir) | https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum/unavailablereason |
| `isAvailable` (Bool kısayolu) | var | systemlanguagemodel sayfası "Checking model availability" |
| `contextSize` | Apple metadata'sında **iOS 26.0** olarak işaretli (repo araştırması "26.4'ten beri" diyor — `contextSize` için bu yanlış görünüyor; 26.4 olan `tokenCount(for:)`) | https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/contextsize |
| `tokenCount(for:)` | **iOS 26.4** | https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/tokencount(for:) |
| Bağlam penceresi | "Apple's on-device foundation model has a context window of **4096 tokens per session**" | https://developer.apple.com/documentation/foundationmodels/managing-the-context-window |
| Yapılandırılmış çıktı | `@Generable`, `@Guide`, `GenerationSchema`, **`DynamicGenerationSchema`** (çalışma zamanında şema — JS'ten gelen şema için gerekli olan bu) | https://developer.apple.com/documentation/foundationmodels/generable , foundationmodels sayfası "Structured output" |
| `LanguageModelSession` | iOS 26.0; `respond(to:generating:…)`, `respond(to:schema:…)`, `streamResponse…`, `prewarm(promptPrefix:)` | https://developer.apple.com/documentation/foundationmodels/languagemodelsession |
| **Görüntü girdisi** | **Doğrulandı: iOS 27.** `Attachment` ve `ImageAttachmentContent` iOS/iPadOS/macOS **27.0**. Makale: "The Foundation Models framework supports using text and images in your prompts"; `CGImage` vb. kabul ediliyor | https://developer.apple.com/documentation/foundationmodels/attachment , https://developer.apple.com/documentation/foundationmodels/imageattachmentcontent , https://developer.apple.com/documentation/foundationmodels/analyzing-images-with-multimodal-prompting |
| OCR / barkod araçları | **Doğrulandı:** `Vision.OCRTool` ve `Vision.BarcodeReaderTool` **iOS 27.0**; çok modlu makale bunları session'a eklenebilir araç olarak anlatıyor | https://developer.apple.com/documentation/vision/ocrtool , https://developer.apple.com/documentation/vision/barcodereadertool |
| Private Cloud Compute modeli | `PrivateCloudComputeLanguageModel` iOS 27.0 | https://developer.apple.com/documentation/foundationmodels/privatecloudcomputelanguagemodel |
| Dış/özel model sağlayıcı | "Custom language model provider" bölümü (`LanguageModel`, `LanguageModelExecutor`…) framework sayfasında var | foundationmodels sayfası |

Repo araştırmasının (`arastirma/ham/K5-fiyat-kota-maliyet.md` §A3) şu iddiaları **Apple'da doğrulanmadı / bu spike'ta
kontrol edilmedi**: AFM 3 model boyutları (3B / 20B seyrek), PCC 32.000 token, iOS 27 çıkış tarihi 14 Eylül 2026, cihaz
listesi (iPhone 15 Pro, 16+), LoRA adapter boyutu → `[doğrulanmadı]` (bu spike kapsamında).
Not: üçüncü taraf `expo-foundation-models` README'si "A17 Pro or later" diyor — Apple sayfası değil, `[doğrulanmadı]`.

### A2. Seçenek 1 — Kendi ince Expo Module'ümüz (Swift)

- Oluşturma: `npx create-expo-module@latest --local` → projede `modules/<ad>/` dizini; native kod değişince yeniden
  prebuild/derleme gerekir (https://docs.expo.dev/modules/get-started/). Sayfa Expo Go'yu açıkça anmıyor; ancak Expo Go
  sabit bir native ikili olduğu için içinde olmayan native modül yüklenemez — bu, `expo-ai`, `expo-widgets`,
  `expo-app-intents` dokümanlarında açıkça yazıyor ("not available in Expo Go"). Yani **yalnız dev build** (repo zaten
  `expo-dev-client` 57.0.19 kullanıyor).
- Modül DSL: `Name`, `Constant`, `Function`, `AsyncFunction`, `Property`, `Events`, `OnCreate`…; JS nesneleri `Record` +
  `@Field` ile tipli Swift struct'a eşlenir (https://docs.expo.dev/modules/module-api/).
- **Swift `async/await`:** doküman sayfası göstermiyor ama **kurulu `expo-modules-core` 57.0.19'da doğrulandı**:
  `ios/Api/Factories/ConcurrentFunctionFactories.swift` → `AsyncFunction(_ name:, _ closure: … async throws -> R)`.
  Expo'nun kendi `expo-ai` modülü de `AsyncFunction(...) { ... try await session.generate(...) }` kullanıyor.
  Yani `LanguageModelSession.respond(...)` doğrudan `await` edilebilir.
- Gerekenler (taslak, kod yazılmadı):
  - `#if canImport(FoundationModels)` + `if #available(iOS 26.0, *)` koruması (deployment target 26'dan düşük kalacak).
  - `getAvailability()` → `SystemLanguageModel.default.availability` switch'i: `available` /
    `deviceNotEligible` / `appleIntelligenceNotEnabled` / `modelNotReady` / `@unknown default` / iOS<26 → "unsupported-os".
  - Tek bir dar iş fonksiyonu, ör. `classifyMeal(text) -> JSON`: Swift tarafında **sabit bir `@Generable` struct**
    (en basit, en açıklanabilir yol) ya da JS'ten şema gelecekse `DynamicGenerationSchema`.
  - Podspec deployment target ≥ 16.4 (Expo'nun `expo-ai` podspec'i `ios => '16.4'`, Swift 6.0).
  - Derleme: Xcode 26.4+ (iOS 26 API'leri). Görüntü/OCRTool için Xcode 27 + UIScene (bkz. §0).
- Avantaj: her satır bizim, ~100-200 satır Swift + ~50 satır TS; bağımlılık yok; ADR-004 `LanguageModel` portuna birebir
  oturur; U1 gereği yalnız "hangi yemek / ne kadar" yapılandırması yapılır, kalori DB'den.
- Dezavantaj: Swift/Expo Modules öğrenme yükü; iOS sürüm farklılıklarını (26 vs 27) kendimiz yönetiriz.

### A3. Seçenek 2 — Paketler (npm JSON + README; erişim 2026-10-03)

| Paket | Var mı / latest / yayın | Sahip · lisans | Uyumluluk | Availability raporu | Yapılandırılmış çıktı | Görüntü | iOS min |
|---|---|---|---|---|---|---|---|
| **`expo-ai`** (Expo resmî) | Docs var ama **npm'de yayımlanmamış**: npm `latest` = 0.0.0 (2023-12-07, yer tutucu, `bycedric`). GitHub `packages/expo-ai/package.json` → `"version": "0.1.0", "private": true`; 2026-09-29 commit: "Revert changelog/changeset entries since this is unpublished". v57 ve v58 doküman URL'leri 404; yalnız `unversioned` var. Doküman: **alpha**, "frequently experience breaking changes" | 650 Industries (Expo) · MIT | Expo Go yok, dev build; Xcode 26.4+ (görüntü için 27+) | `getAvailabilityAsync()` → `available` / `downloadable` / `downloading` / `not-ready` / `unavailable` + `reason`. Swift eşlemesi: `deviceNotEligible`→`unsupported-device`, `appleIntelligenceNotEnabled`→`intelligence-disabled`, iOS<26→`unsupported-os`, dil→`unsupported-language` | `schema.object/…` (JSON Schema), `InferSchema<S>`; "native constrained output when supported" | Evet: ≤8 `file://` görüntü, iOS 27+ anlama; `Tools.ocr`, `Tools.barcode` (`expo-ai/apple`) | çalışma 26+, deployment 16.4 |
| `@react-native-ai/apple` (Callstack) | Var · **0.12.0** · 2026-01-28 (son modified 2026-02-11) | `artus9033`, `grabbou` · MIT · repo callstackincubator/ai (1409★, son push 2026-07-07; `apple-llm` paketinde son commit 2026-07-06) | peer `react-native >=0.76`; README: "React Native New Architecture", "Vercel AI SDK v5" (bağımlılık `@ai-sdk/provider ^3`, `zod ^4`) | **Yalnız `isAvailable(): boolean`** (TurboModule spec) — sebep yok | Evet (AI SDK `generateObject`) | README'de yok | iOS 26+ |
| `expo-apple-foundation-models` | Var · **1.2.0** · 2026-01-27 | `grenos` · MIT · 3★, 7 açık issue | "Expo SDK 53+"; peer `expo *` | `isFoundationModelsEnabled()` → `'available' \| 'appleIntelligenceNotEnabled' \| 'modelNotReady' \| 'unavailable'` (`deviceNotEligible` ayrı değil) | `generateStructuredOutput` (kendi şema tipi) | README'de yok | iOS 26 |
| `expo-local-llm` | Var · **0.7.0** · 2026-09-28 (repo son push 2026-10-02) | `gijungkim` · MIT · 14★ | peer `expo >=52`, RN >=0.76; örnek SDK 57 / RN 0.86; Xcode 26.4+; deployment 16.4 | `'available' \| 'notEnabled' \| 'notReady' \| 'notEligible' \| 'downloadRequired' \| 'downloading' \| 'unknown' \| 'moduleUnavailable'` | `generateObject()` → `DynamicGenerationSchema` ile constrained; şema dışı → `StructuredOutputValidationError` | README'de yok | 26+ (16.4'te "notEligible" döner) |
| `react-native-apple-llm` | Var · **1.0.16** · 2026-01-17 | `deveix` · MIT · 346★ | peer `react-native >=0.80`; README "beta feature"; Xcode 26 | `isFoundationModelsEnabled()` → `available` / `appleIntelligenceNotEnabled` / `modelNotReady` / `unavailable` | `generateStructuredOutput` (JSON schema) | yok | iOS 26.0 |
| `expo-foundation-models` (ek) | Var · **1.0.2** · 2026-09-17 | `junnos` · MIT · 3★ | "Expo SDK 54+"; peer `react ^19.2.1` | `FoundationModels.isAvailable()` + `getFeatures()` | var | **iOS 27 image attachments** (README) | 26.0 (CoreML 16) |
| `react-native-foundation-models` (ek) | Var · **0.1.3** · 2026-08-06 | `corasan` · MIT | Nitro (`react-native-nitro-modules >=0.36.5` — repo'da 0.37.1 zaten var) | `checkFoundationModelsAvailability()` | — | yok; README kendisi `tokenCount` vb. 26.4 API'lerinin henüz bağlanmadığını söylüyor | 26.0 |
| `expo-ai-kit` (ek) | Var · **0.18.2** · 2026-09-17 | `saidkaban`, `laraelmas` · MIT | "Expo SDK 54+", Expo Go yok; peer `@ai-sdk/provider ^3` | `isAvailable()` (Bool) | var (guide) | vision: `labelImage`, `recognizeText` | 26+ |
| `@expo/foundation-models` | **Yok** (npm 404) | — | — | — | — | — | — |

Kaynaklar (hepsi 2026-10-03): https://registry.npmjs.org/expo-ai · https://docs.expo.dev/versions/unversioned/sdk/ai.md ·
https://github.com/expo/expo/tree/main/packages/expo-ai (package.json, ios/ExpoAIModule.swift, src/LanguageModels.types.ts) ·
https://registry.npmjs.org/@react-native-ai/apple · https://github.com/callstackincubator/ai (packages/apple-llm/src/NativeAppleLLM.ts) ·
https://registry.npmjs.org/expo-apple-foundation-models · https://registry.npmjs.org/expo-local-llm ·
https://registry.npmjs.org/react-native-apple-llm · https://registry.npmjs.org/expo-foundation-models ·
https://registry.npmjs.org/react-native-foundation-models · https://registry.npmjs.org/expo-ai-kit ·
GitHub REST `api.github.com/repos/<owner>/<repo>` (yıldız, son push).

Not: Callstack docs sitesi (https://react-native-ai.com/docs/apple) okunamadı (bağlantı hatası) → Expo config plugin ve
ayrıntılı API `[doğrulanmadı]`; yukarıdaki bilgiler npm README + GitHub kaynak koddan.

### A4. Barkod / OCR — "Vision cihazda çalıştı" kriteri neyi kapsıyor?

- **Repo bugün barkodu `expo-camera` `CameraView` + `onBarcodeScanned` ile okuyor** (`apps/mobile/src/food/BarcodeScanner.tsx`).
- `expo-camera` sdk-57 iOS kaynağı: canlı tarama **AVFoundation `AVCaptureMetadataOutput`** ile
  (`ios/Current/BarcodeScanner.swift`, `MetaDataDelegate.swift`) — **Vision framework değil.** PDF417/Code39/Codabar için
  isteğe bağlı ZXingObjC sağlayıcısı (`ExpoCameraBarcodeScanning.podspec`). `scanFromURLAsync` iOS'ta yalnız
  `CIDetector` QR. `launchScanner()` ise **VisionKit `DataScannerViewController`** kullanıyor, ama yalnız
  `.barcode(symbologies:)` ile — metin (OCR) tanıma açık değil.
  Kaynak: https://github.com/expo/expo/tree/sdk-57/packages/expo-camera/ios (`CameraViewModule.swift` satır ~331-415).
  Apple: `AVCaptureMetadataOutput` iOS 6 (https://developer.apple.com/documentation/avfoundation/avcapturemetadataoutput),
  `DataScannerViewController` iOS 16 (https://developer.apple.com/documentation/visionkit/datascannerviewcontroller).
- Yani: **barkod zaten cihazda ve bedava** (AVFoundation; ağ yok). "Vision" sözcüğü kelimesi kelimesine alınırsa
  karşılanmıyor ama ürün amacı (cihazda, ücretsiz barkod) karşılanıyor. Kartın ifadesi netleştirilmeli.
- **OCR (besin etiketi) bugün yok.** Seçenekler: (a) kendi modülümüzde Vision `VNRecognizeTextRequest` (iOS 13,
  https://developer.apple.com/documentation/vision/vnrecognizetextrequest) veya Swift-native `RecognizeTextRequest`
  (iOS 18, https://developer.apple.com/documentation/vision/recognizetextrequest) — Apple Intelligence **gerektirmez**, tüm
  iOS 18 cihazlarda çalışır; (b) `OCRTool` (iOS 27, FoundationModels session aracı) — yalnız Apple Intelligence cihazları +
  Xcode 27. Geniş cihaz kapsamı için (a) doğru katman; (b) gereksiz bağımlılık.

### A5. Öneri (K-510)

**Kendi ince Expo Module'ümüz (`modules/on-device/`), iki parçalı:**
1. **Vision OCR** (`RecognizeTextRequest`, iOS 18+) — Apple Intelligence'tan bağımsız, cihaz tabanının çoğunda çalışır;
   çıktı ham metin → mevcut deterministik parser → sunucuya yalnız sayılar (V1).
2. **FoundationModels** — `getAvailability()` (Apple'ın 3 sebebini birebir taşır) + tek bir dar `@Generable` iş
   (ör. serbest metni yemek/gram listesine yapılandırma). Desteklenmeyen cihazda (`deviceNotEligible`,
   `appleIntelligenceNotEnabled`, `modelNotReady`, iOS<26) → Katman 2 bulut yoluna düş (rıza kapısı V2 ile) ya da
   özelliği gizle. iOS 27 görüntü girdisi **şimdilik kapsam dışı** (Xcode 27 + UIScene + SDK kararı gerektirir).

Gerekçe:
- Levent her satırı anlatabilmeli: ~200 satır Swift kendi kodumuz; paketlerin tamamı tek kişilik, 3-346 yıldız, çoğu
  Ocak 2026'dan beri yayın almamış (`expo-apple-foundation-models`, `react-native-apple-llm`, `@react-native-ai/apple`).
- Paketlerin çoğu Apple'ın `deviceNotEligible` ile `appleIntelligenceNotEnabled` ayrımını kaybediyor (Callstack yalnız
  Bool). "Zarif geri düşüş" kabul kriteri için bu ayrım önemli (birine "Ayarlar'dan aç" denir, ötekine denmez).
- `@react-native-ai/apple` Vercel AI SDK'yı (zod, `@ai-sdk/provider`) getirir — ADR-004'ün kendi `LanguageModel` portu varken
  ikinci bir soyutlama.
- **Expo'nun resmî `expo-ai` paketi geliyor ama yayımlanmadı** (private, alpha). Kendi modülümüzü onun API şekline yakın
  (availability durumları, `reason` adları) yazarsak, yayımlandığında geçiş ucuz olur. ADR'de "expo-ai npm'de stabil
  olunca yeniden değerlendir" tetikleyicisi konmalı.
- `expo-local-llm` en aktif topluluk alternatifi (SDK 57/RN 0.86 örneği, 2026-09-28 yayın, sebep ayrımı var) — kendi
  modülümüz başarısız olursa yedek; ancak tek geliştiricili, 14★.

Cihaz gereksinimi: Simülatör FoundationModels'i ancak Mac'te Apple Intelligence açıksa çalıştırır (`expo-local-llm`
README iddiası, `[doğrulanmadı]` Apple'da). "Desteklenmeyen cihazda geri düşüş" testi için Apple Intelligence'sız bir
cihaz/simülatör, "çalıştı" kaydı için gerçek Apple Intelligence cihazı (K-308 cihaz derlemesi) gerekir.
Cihazsız yapılabilecekler: modül iskeleti, TS tarafı + availability eşleme birim testleri (Jest, native mock), Swift
tarafında availability switch'inin saf fonksiyon olarak yazılması.

---

## SPIKE B — K-515 kilit ekranı karar widget'ı + App Intents · K-426 Live Activity

### B1. `expo-widgets` (SDK 57)

- npm: `sdk-57` = `latest` = **57.0.22** (2026-09-29T10:56Z); `next` = 58.0.12 (2026-10-03). Sahip: Expo ekibi, MIT,
  repo `expo/expo/packages/expo-widgets`. peer `expo/react/react-native *`; bağımlılık `@expo/ui`.
  Kaynak: https://registry.npmjs.org/expo-widgets
- Doküman: https://docs.expo.dev/versions/v57.0.0/sdk/widgets/ — "This library is not available in the Expo Go app — use
  development builds to try it out." Sayfada alpha/beta uyarısı görülmedi `[sayfa özetinden; kesin değil]`.
- Destek: ana ekran `systemSmall/Medium/Large/ExtraLarge`; **kilit ekranı `accessoryCircular`, `accessoryRectangular`,
  `accessoryInline`**; **Live Activities** (`createLiveActivity(name, component)` → `.start(props,url)`, `.update(props)`,
  `.end(...)`, `.getInstances()`); etkileşimli `Button onPress` (iOS 17+); yapılandırılabilir widget (iOS 17+); push ile
  Live Activity (`enablePushNotifications`), uzaktan başlatma iOS 17.2+.
- JS'ten güncelleme: `createWidget(name, component)` → `updateSnapshot(props)` (anında), `updateTimeline(entries)`
  (her girdi "a date and the props to display at that time"), `reload()`, `getTimeline()`. Doküman: "All data a widget
  needs must come in through its props". Arka plan fetch yok — veri **uygulama çalışırken** yazılır.
- Mekanizma (sdk-57 kaynağı): `'widget'` direktifli bileşen ayrı bir bundle'a derlenir; uzantı bunu
  **JavaScriptCore `JSContext`** ile değerlendirir (`ios/Widgets/WidgetsJSRuntime.swift`); hook/async/uygulama state'i
  kullanılamaz, yalnız `@expo/ui/swift-ui` bileşenleri. Props **App Group `UserDefaults(suiteName:)`** içinde
  (`ios/WidgetsStorage.swift`, Info.plist `ExpoWidgetsAppGroupIdentifier`).
- Config plugin: `widgets: [{ name, displayName, description, ios: { supportedFamilies } }]`; `groupIdentifier`
  (varsayılan `group.<bundleId>`), `bundleIdentifier`, `enablePushNotifications`. Plugin kaynağı: App Group
  entitlement'ı ekler (`withAppGroupEntitlements.ts`), `NSSupportsLiveActivities = true` yazar (`withAppInfoPlist.ts`),
  ve EAS için `appExtensions` + App Group'u yapılandırmaya ekler (`withEasConfig.ts`) — yani EAS Build kimlik bilgisi
  akışı App Group'u kaydetmeye çalışır; Apple hesabında App ID/App Group kaydı yine Levent'in hesabında olur
  (ayrıntı `[doğrulanmadı]`). Podspec iOS **16.4**.
  Kaynak: https://github.com/expo/expo/tree/sdk-57/packages/expo-widgets
- Kurulu `@expo/ui` 57.0.20'de (repo `node_modules`) **`privacySensitive(sensitive?)`**, **`redacted(reason)`**
  modifier'ları ve `Text`/`ProgressView` **`timerInterval`** prop'u var (`build/swift-ui/modifiers/index.d.ts`,
  `build/swift-ui/Text/index.d.ts`) — K-426 kartındaki "timerInterval kurulu tiplerde doğrulandı" notu tutarlı.
- `WidgetEnvironment`: `widgetFamily`, `colorScheme`, `isLuminanceReduced`, `widgetRenderingMode`
  ('fullColor'|'vibrant'|'accented'), `showsWidgetLabel` (doküman özeti).
- SDK 58 beta'da expo-widgets: Android widget desteği, iOS Live Activity `staleDate`, "stable ActivityKit identifiers"
  (https://expo.dev/changelog/sdk-58-beta).

### B2. `expo-app-intents` ve alternatifler

- npm: `latest` = **0.0.1** (2026-06-08, yer tutucu); `next` = **0.5.1** (2026-10-03); SDK 58 preview'larıyla aynı
  günlerde yayımlanıyor (0.3.0 → 2026-09-14 …). `next` bağımlılığı `@expo/ui ^58.0.12` → **SDK 58'e bağlı**; SDK 57'de
  kullanılamaz (resmî SDK 57 desteği dokümanda yok).
  Kaynak: https://registry.npmjs.org/expo-app-intents
- Doküman: https://docs.expo.dev/versions/v58.0.0/sdk/app-intents.md — **alpha** ("frequently experience breaking
  changes"); Expo Go yok; iOS 16.4+. Intent tipleri JS'ten dinamik yaratılamaz: **Swift inline modules** içinde
  `app-intents/` dizininde yazılır (`AppIntent`, `AppEntity`, `EntityQuery`, `AppShortcutsProvider`). JS API:
  `useAppIntents`, `addAppIntentListener`, `setEntityCatalogAsync`, `donateIntentAsync`, `getPendingInvocationsAsync`,
  `removePendingInvocationAsync`. Kritik: "Dispatching is one-way… the intent may run while your app is closed"; JS
  kapalıysa çağrı kuyrukta kalır, uygulama açılınca işlenir; asıl iş Swift `perform()` içinde yapılır.
  → **"Log weigh-in uygulamayı açmadan"** = Swift `perform()` içinde kaydı (ör. App Group'a / yerel kuyruğa) yazmak; JS
  sonradan senkronlar. Bu, alpha paketle de native Swift ile de **Swift yazmayı** gerektiriyor.
- `@bacons/apple-targets`: **5.0.0** (2026-07-17), Evan Bacon, MIT, peer `expo >=52`; repo 1394★, son push 2026-10-03.
  README: "requires at least CocoaPods 1.16.2 …, Xcode 16 … and Expo SDK +53"; `/targets/<ad>/expo-target.config.js`,
  `npx create-target widget`, App Group entitlement'ı `app.json`'dan aynalayabilir. Tamamen native SwiftUI/WidgetKit
  kodu yazarsın (widget, Live Activity, App Intents uzantısı dahil).
  Kaynak: https://registry.npmjs.org/@bacons/apple-targets , https://github.com/EvanBacon/expo-apple-targets

### B3. Kilit ekranı accessory widget — ne gösterir, gizlilik

- `accessoryRectangular` (iOS 16): dikdörtgen, birkaç satır metin/gauge; `accessoryInline` (iOS 16): "a single row of text
  and an optional image"; `accessoryCircular` (iOS 16). iPad kilit ekranı iPadOS 17+.
  https://developer.apple.com/documentation/widgetkit/widgetfamily/accessoryrectangular ·
  …/accessoryinline · …/accessorycircular
- Kilit ekranında sistem accessory widget'ları `vibrant` render modunda çizer (renk yok, tek ton)
  (https://developer.apple.com/documentation/widgetkit/widgetrenderingmode).
- Apple gizlilik mekanizması: hassas görünümleri `privacySensitive(_:)` ile işaretle; "In iOS, people can configure whether
  to show sensitive data on the Lock Screen… deactivate data access for Lock Screen widgets in the ALLOW ACCESS WHEN LOCKED
  section of Settings > Face ID & Passcode" (https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension ;
  https://developer.apple.com/documentation/swiftui/view/privacysensitive(_:) ;
  https://developer.apple.com/documentation/widgetkit/developing-a-widgetkit-strategy "Consider user privacy").
  → Apple redaksiyonu **kullanıcı ayarına bağlı, varsayılan değil.** Bizim V3 / L3-Y1 kuralı ("varsayılan: sayı yerine
  eylem, ör. 'No change this week'; sayı ayarla açılır") **uygulama tarafında** uygulanmalı: widget props'una varsayılan
  olarak sayı hiç yazılmaz; kullanıcı açarsa sayılı metin gönderilir ve yine `privacySensitive()` ile işaretlenir
  (çift koruma). Bu bir ürün kuralı (V3), Apple zorunluluğu değil.
- Live Activity: kilit ekranı + Dynamic Island; ağ erişimi yok (developing-a-widgetkit-strategy tablosu); ActivityKit iOS 16.1
  (https://developer.apple.com/documentation/activitykit).

### B4. Öneri (K-515 / K-426)

- **Widget ve Live Activity: `expo-widgets` 57.0.22** (resmî, SDK 57'de mevcut, kilit ekranı aileleri + Live Activity
  tek pakette, JS/TSX ile; `@expo/ui` zaten kurulu). `@bacons/apple-targets` yalnız `expo-widgets` yetmezse (ör. App
  Intents uzantısı SDK 57'de lazım olursa) yedek.
- **App Intents: şimdi bağlama; SDK 58 stabil olunca.** `expo-app-intents` alpha ve SDK 58'e bağlı; SDK 58 hâlâ beta
  (RN 0.88 RC). "Log weigh-in uygulamayı açmadan" her iki yolda da Swift `perform()` gerektirir. Spike raporunda bu yazılır,
  ADR'de "SDK 58 stabil + expo-app-intents ≥ beta" tetikleyicisi konur. Not: widget'ın etkileşimli `Button`'u sayısal girdi
  alamaz; kilo girişi ya Siri/Shortcuts parametreli intent ya da uygulamayı derin bağlantıyla açan buton olur (ürün kararı
  → Levent).
- **Cihazsız şimdi yazılabilecekler:** widget bileşeni (`'widget'` TSX) için props'u üreten saf fonksiyon (karar →
  sayısız metin; "numbers on lock screen" ayarı kapalıyken sayı içermediğini doğrulayan test — property-based olabilir);
  `updateTimeline` girdilerini (sonraki değerlendirme tarihi) üreten saf fonksiyon; Expo Go/destek yokken "kullanılamaz"
  yolu (K-403 kalıbı); config plugin yapılandırması (App Group kimliği yapılandırmada, kodda değil — K2); Live Activity
  props üretimi (kalan süre/sıradaki set) ve `timerInterval` aralığı hesabı.
- **Cihaz derlemesi (K-308) gerektirenler:** widget'ın kilit ekranında görülmesi, App Group'un Apple hesabında kaydı
  (Levent'in terminali/hesabı), Live Activity'nin kilit ekranı/Dynamic Island'da görülmesi, `privacySensitive` davranışı
  (cihaz kilitliyken). Simülatör widget ve Live Activity'yi gösterebilir `[doğrulanmadı]` ama kabul kriteri "gerçek cihaz".

---

## Açık sorular / Levent'e
1. K-510 kabul kriteri "Barkod/OCR (Vision)": barkod bugün AVFoundation ile cihazda — kriter "cihazda, ağsız barkod + OCR"
   olarak mı okunsun? (Ürün değil, ifade netleştirmesi; teknik karar agent'ta.)
2. Kilit ekranından kilo girişi: parametreli Siri/Shortcuts intent'i mi (SDK 58 + Swift), yoksa uygulamayı açan buton mu?
   (Ürün kapsamı.)
3. iOS 27 görüntü girdisi / `OCRTool` isteniyorsa: SDK 57 + `enableSceneSupport` ile Xcode 27 mi, SDK 58'i mi bekleriz?
   (Teknik — agent karar verebilir; K-515'in SDK 58 değerlendirmesiyle birleştirilmesi önerilir.)
