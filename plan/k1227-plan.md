# K-1227 plan: yerler arası yürüme rotası (aşama 1, kod yok)

Kurulu: Expo SDK 57 (`expo` 57.0.25, RN 0.86.3). Kaynaklar: docs.expo.dev/versions/v57.0.0/sdk/maps ve /sdk/location; `bundledNativeModules.json`; paketlerin kendi kaynağı (npm pack ile okundu, kurulmadı).

## Bulgular
- **expo-maps ~57.0.3**: Apple Maps, API anahtarı yok, ama alfa ("sık kırılır"). `AppleMaps.View` polyline'ında **kesik çizgi (dash) yok**, iOS'ta **uzun basma olayı yok** (yalnız `onMapClick`). Ikisi de kartın çekirdeği.
- **react-native-maps 1.27.2** (SDK 57 paketli sürümü): iOS'ta varsayılan Apple Maps, anahtar yok; `Polyline.lineDashPattern` ve `MapView.onLongPress` var; kaynakta `CLLocationManager` yok. Seçilen.
- **expo-location ~57.0.20**: `geocodeAsync` iOS'ta `CLGeocoder` kullanır; doküman iOS'ta izin gerekir mi demiyor [doğrulanmadı]. Eklentisi `NSLocation*` ve `NSMotionUsageDescription` yazar, paket `CLLocationManager` kodu taşır: "konum okumayız" ile ve mağaza otomatik taramasıyla çelişme riski. Seçilmedi.
- **Yürüme rotası (MKDirections)**: hiçbir bakımlı Expo/RN modülü sunmuyor (expo-maps ve @expo/ui'de MKDirections/MKLocalSearch yok; npm'de yalnız Yandex MapKit, ilgisiz). Yol: depoda emsali olan yerel Expo modülü (`modules/backup-exclusion`) gibi küçük bir Swift modülü.

## Öneri (sürümler ve yedek)
1. **react-native-maps 1.27.2** (`npx expo install react-native-maps`), Apple Maps sağlayıcısı, Google yok.
2. **Yerel modül `modules/places`** (Swift, ExpoModulesCore): `search(text)` = `MKLocalSearch` (adres metni → ad + koordinat), `walkingDistance(from, to)` = `MKDirections` `.walking` → metre. Konum izni **gerektirmez** (CLLocationManager yok).
3. **Yedek:** yönlendirme başarısız/çevrimdışıysa kuş uçuşu × `walk_detour_factor` (data/parameters/walks.json, yeni parametre, başlangıç ~1.3, [tecrübe], gerçek değerle kalibre edilir). Ekranda "yaklaşık" etiketi.
4. Adım = km × `stepsPerKm` (K-1216'nın mevcut işlevi).

## Akış (yer ekle, rota gör)
Ekran "Yerler": (a) "Yer ekle" → adres ara → sonuç seç → ad ver (Ev/Salon/Başka); ya da (b) haritada uzun bas → ad ver. İki yer seç → harita noktalı rotayı (`lineDashPattern`) uçlarda yer adıyla çizer; altta mesafe + adım (tek yön, gidiş-dönüş). Rota mesafesi seçimde **bir kez** hesaplanıp kaydedilir.

## Veri modeli (yalnız telefon)
Mevcut `walks.routes` anahtarının yanına `walks.places` (JSON, aynı küçük depo): `{id, name, lat, lng}` (en çok N, parametre). Rota: `{id, fromId, toId, km, approx}`; K-1216'daki `WalkRoute {id,name,km}` korunur, rota adı "Ev - Salon" üretilir, `suggestWalk` değişmez (yalnız kaynak liste genişler). Sunucuya, API'ye, loga gitmez; çıkışta silinir.

## İzin ve metin
- Yeni Info.plist anahtarı **yok**; GPS yok, `showsUserLocation` kapalı. Apple Health metni ("konum okumayız") doğru kalır.
- Tek yeni metin (copy/en.json + tr.json): adres araması yazdığın metni Apple Haritalar'a gönderir; yerler telefonda kalır. Ürün sahibi onayı gerekir (kullanıcı metni dışarı gidiyor).
- App Store gizlilik etiketi: yerler geliştiriciye iletilmez, toplanan veri eklenmez [doğrulanmadı: Apple'ın "toplama" tanımı platform servislerine giden sorguyu kapsamıyor görünüyor; Connect'te teyit]. Konum veri türü işaretlenmez.

## Derleme
Yeni native kod (rn-maps + modül) = **yeni EAS geliştirme derlemesi** (`development`/`development-simulator`), Expo Go zaten kullanılmıyor. ADR-093: harita kütüphanesi + yerel modül (+ adres aramasının Apple'a gitmesi, ürün sahibi onaylı).

## Bölünme (L kartı)
K-1227a yerler + arama + MKDirections modülü + depo · K-1227b harita ekranı + K-1216 bağlama.

## Test
jest: yer deposu (sınır, geçersiz, sürüm), mesafe→adım, yedek çarpan, `suggestWalk` rota adaylarıyla; modül sahte (mock) ile. Cihaz/simülatör: arama, uzun basma, noktalı çizgi, uçak modunda yedek, izin penceresi hiç çıkmıyor.

## Riskler
- MKDirections yürüme verisi her ülkede yok (Türkiye dahil yürüme kapsamı simülatörde/cihazda doğrulanmalı) → yedek.
- react-native-maps + RN 0.86 yeni mimari: SDK 57 paketli sürüm, derlemede doğrulanır.
- Apple arama/rota sorguları hız sınırlı; her seçimde bir kez çağrı.
- Yedek çarpanı yanıltabilir; "yaklaşık" etiketi şart.
