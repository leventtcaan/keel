# ADR-094 · Dinlenme sayacı kilit ekranında ve Dynamic Island'da (Live Activity)
- **Durum:** KABUL (agent, teknik; ürün kapsamı K-1215'te Levent'in backlog kararı)
- **Tarih:** 2026-11-25 · **Karar veren:** agent · **İş:** K-1215 (#723)
- **İlgili:** ADR-075 Ek 10/11 (dinlenme kendi durumu, ±15 sn), ADR-090 Ek 7 (geriye sayım, "sakin" bitiş), K-411 (arka plan bildirimi), K-1026 dersi (açılışta çöken native modül)

## Bağlam
Hevy'nin en övülen özelliği dinlenme sayacının kilit ekranında olması; bizde yok (`plan/evre-8-butun-urun.md`). İstek: kalan süre, sıradaki setin hedefi, mümkünse −15/+15 ve Ready.

## Karar
1. **Paket: `expo-widgets@~57.0.28`** (npm dist-tag `sdk-57`; Expo'nun kendi paketi), beraberinde `@expo/ui` `~57.0.20` → `~57.0.26` (paketin bağımlılığı). Kaynaklar: npm kayıt defteri (`npm view expo-widgets dist-tags`), `docs.expo.dev/versions/v57.0.0/sdk/widgets/`, paketin kendi kaynağı (`Text timerInterval`, `LiveActivityUserInteraction` ve `plugin/build/ios/*`) ve `expo prebuild` çıktısı (hedef, entitlement ve `NSSupportsLiveActivities` üretildi).
   Reddedilen: `@bacons/apple-targets` 5.0.0 (hedefi kurar, Swift'i elle yazdırır), `expo-live-activity` 0.4.2 (Expo ekibi dışı, SDK 57 uyumu belirsiz), yerel modül + elle hedef (modül düzeni uzantı hedefi kuramaz).
2. **Yapılandırma:** `app.config.ts` › `['expo-widgets', { bundleIdentifier: '<id>.ExpoWidgetsTarget', groupIdentifier: 'group.<id>', widgets: [] }]`; kimlikler `KEEL_IOS_BUNDLE_ID`'den türer. Ana ekran widget'ı yok; push yok (`enablePushNotifications` kapalı): yalnız yerel başlat/güncelle/bitir. Yeni native hedef: **yeni EAS derlemesi** gerekir.
3. **Süre sistemin saatidir:** `Text timerInterval` + `countsDown`. Saniyede güncelleme yok; etkinlik yalnız dinlenme başlayınca, −15/+15'te ve sıradaki set değişince güncellenir. Bitiş hiçbir zaman başlangıçtan önce olmaz (sistem aralığı ister).
4. **Gövde (`src/train/RestLive.tsx`):** dinlenme ekranı (`resting`) göründüğü sürece etkinlik vardır; bileşen kalkınca (Ready, duraklatma, oturumdan çıkma, çıkış) biter. Başlık: sıradaki hareket; satır: ekrandaki "Next: set N, …" cümlesi; düğmeler: `workout.rest.less/more/end` (en/tr, mevcut anahtarlar; yeni metin yok, K2); vurgu: `focusPalette.accent` (antrenman her zaman koyu).
5. **Düğmeler (−15, +15, Ready):** `LiveActivityIntent` (iOS 17+) JS'e `addUserInteractionListener` ile düşer; ekranın kendi düğmeleriyle aynı işi yapar (tek `restShift` durumu, arka plan bildirimi de kayar). **Teslim garantisi yoktur:** uygulama askıdayken JS çalışmayabilir. Etkinlik bu yüzden yalnız bir *görünümdür*: dinlenmenin gerçeği ekranın zaman damgasıdır, öne gelince yeniden hesaplanır. Teslim edilmeyen düğme veri kaybettirmez.
6. **K-1026 koruması:** `src/train/liveRest.ts` bağlantı noktasıdır (`haptics.ts` gibi): `expo-widgets` ve `liveRestActivity` ilk kullanımda tembel `require` ile, her çağrı `try/catch` içinde okunur; modülsüz derleme açılır ve hiçbir şey yapmaz. Testler: iki paketin yüklenmesi fırlatırken bağlantı noktası ve `RestLive` çalışır (`live-rest.test.ts`, `live-rest-no-module.test.tsx`; üst düzey `import` konursa kırmızı olduğu denendi).
7. **Veri (V1):** etkinlik yalnız hareket adı, set hedefi ve bitiş anını taşır; telefondan çıkmaz, sunucu ve push yoktur. App Group yalnız paketin uzantıyla paylaştığı içindir.

## Bedeli ve açık noktalar
- Apple Developer / EAS: uzantı bundle id'si ve App Group kaydı (EAS ilk derlemede ister; Levent'in Apple girişi gerekebilir). Ürün adı/bundle id değişirse ikisi yeniden kaydedilir.
- **Cihazda doğrulanmadı:** `timerInterval` uzantıda, −15/+15/Ready'nin askıdaki uygulamada teslimi, Dynamic Island yerleşimi. Çalışmazsa düğmeler kaldırılır; süre ve sıradaki set kalır.
- Uzantı hedefi her derlemeye girer (derleme süresi, imza yüzeyi); `expo-widgets` SDK ile birlikte yükseltilir.
