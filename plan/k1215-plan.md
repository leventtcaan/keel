# K-1215 · Dinlenme Live Activity ve Dynamic Island: plan (Faz 1)

Tarih: 2026-11-25. Durum: araştırma bitti, kod yok, hiçbir şey kurulmadı.

## Seçenekler (SDK 57, K6: npm ve resmî dokümanda doğrulandı)
| Seçenek | Sürüm | Karar |
|---|---|---|
| **`expo-widgets`** (Expo'nun kendi paketi) | dist-tag `sdk-57` = **57.0.28** | **Seçilen** |
| `@bacons/apple-targets` | 5.0.0 | Hedefi kurar, Swift'i elle yazdırır; en çok kod |
| `expo-live-activity` (3. taraf) | 0.4.2 | Expo ekibi değil, SDK 57 uyumu belirsiz; elendi |
| Yerel modül + elle hedef | – | `modules/backup-exclusion` düzeni uzantı hedefini kuramaz; en kırılgan |

`expo-widgets` bağımlılıkları: `@expo/ui ~57.0.26` (bizde 57.0.20, **yükseltilir**), `@expo/plist`. Eklenecek: `expo-widgets@~57.0.28` ve `@expo/ui@~57.0.26` (`npx expo install expo-widgets`).

## Doğrulananlar
- Plugin (`expo-widgets`): widget uzantı hedefi (`<bundle id>.ExpoWidgetsTarget`) + App Group (`group.<bundle id>`) + `NSSupportsLiveActivities` yazar. Expo Go'da çalışmaz.
- API: `createLiveActivity(ad, bileşen)` → `start(props, url?)`, `update(props)`, `end(politika?)`, `getInstances()`. Düzen: `banner` (kilit ekranı) ve Dynamic Island bölgeleri.
- **Süre için sistem sayacı:** `@expo/ui` 57.0.26 kaynağında `Text` `timerInterval` + `countsDown` var (iOS 16+); dokümanda anılmıyor, kaynaktan doğrulandı. Saniyede güncelleme yok: yalnız dinlenme başlayınca, ±15'te, bitince güncellenir.
- **Düğmeler:** pakette `LiveActivityUserInteraction` (iOS 17+ `LiveActivityIntent`) var; `Button target` ile JS'e `addUserInteractionListener` olarak düşer. Doküman, uygulama süreci canlıyken diyor. Askıdaki uygulamada ±15/Ready'nin çalışması **doğrulanmadı**.
- **Yeni EAS derlemesi: evet** (dev build ve production). Yeni hedef için EAS, Apple Developer'da uzantı bundle id ve App Group kaydeder (Levent'in Apple girişi gerekebilir).
- **Push/token: gerekmez.** `enablePushNotifications` kapalı kalır; sunucu yok, yalnız yerel başlat/güncelle/bitir (ADR-075 Ek 11 dinlenme zaten yerel).
- Kullanıcı verisi dışarı çıkmaz (V1); App Group yalnız kalan süre ve sıradaki set metnini taşır.

## Tasarım
1. `src/train/liveRest.ts`: `haptics.ts` gibi port. Paket **tembel `require`** ile, her çağrı try/catch; modül yoksa (eski derleme, K-1026 dersi) sessizce hiçbir şey. `start(since, low, nextSet)`, `adjust(low)`, `stop()`. `restAlert` ile aynı yaşam döngüsü ve `generation` koruması.
2. `workout.tsx`: `restAlert.start/stop` çağrılarının yanına; ±15 `onAdjust` yolu `adjust`'ı çağırır. Sıradaki set metni mevcut `restText`/sıradaki set satırından, metinler `data/copy/en.json`'dan (K2).
3. `app.config.ts`: `['expo-widgets', {...}]`; widget listesi boş, yalnız Live Activity. Bundle id `KEEL_IOS_BUNDLE_ID`'den türer.
4. Düğmeler: önce −15/+15/Ready denenir; cihazda askıdayken çalışmazsa düğmesiz yayınlanır, dokunuş uygulamayı açar (`url`). Süre ve sıradaki set her durumda görünür.
5. Dinlenme bildirimi (K-411) aynen kalır: Live Activity ek, yerine geçmez.

## Testler
Jest: port modül yokken fırlatmaz, aynı dinlenmede tekrar `start` yok, `stop` her yolda çağrılır, ±15 süreyi doğru taşır (`virtual` mock, K-976 gibi). Cihaz kanıtı kabul kriteri: kilit ekranı, Dynamic Island, ±15, eski derlemede açılış.

## Riskler
Uzantı JS paketini derleme sırasında üretir (derleme süresi/başarısızlık riski). `expo-widgets` yeni bir native bağımlılık: K5 gereği PR'da gerekçe, kalıcı olduğundan ADR-091'e Ek. Ürün adı/bundle id değişirse App Group yeniden kaydedilir.

## Sıra
Levent onayı → paketi kur → port + test → config → dev build (Levent cihazı) → cihaz kanıtı → PR.
