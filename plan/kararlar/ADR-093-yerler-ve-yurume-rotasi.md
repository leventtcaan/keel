# ADR-093 · Yerler ve yürüme rotası: react-native-maps + kendi ince Expo modülümüz (Apple Haritalar)
- **Durum:** KABUL (agent, teknik: ADR-019; ürün onayı Levent, 25 Kas 2026: adres aramasında arama kutusunun altında tek satırlık not, yerler telefonda, konum izni yok)
- **Tarih:** 2026-11-25 · **Karar veren:** agent (öneren: agent; plan `plan/k1227-plan.md`)
- **Dayanak:** K-1227, ADR-091 Ek 5 (yeni istek), ADR-047 (kendi ince Expo modülümüz), `plan/k1227-plan.md` (SDK 57 dokümanı ve paket kaynakları okunarak)

## Bağlam
Levent: "gym ile evim arasındaki adım sayımı haritada nokta nokta görsem, planlarımı buna göre güncellerim". Kullanıcı yer kaydeder, haritada iki yer
arasında noktalı yürüme rotasını ve adım karşılığını görür; K-1216 önerisi bu rotaları kullanır. Yerler sunucuya gitmez, GPS takibi yok, Apple Health
rıza metni "konum okumayız" der ve doğru kalmalı.

## Karar
1. **Harita: `react-native-maps` 1.27.2** (SDK 57'nin paketli sürümü, `npx expo install` yazdı). iOS'ta varsayılan Apple Haritalar, API anahtarı yok;
   `Polyline.lineDashPattern` (noktalı rota) ve `MapView.onLongPress` (haritadan yer seçme) var; kaynağında `CLLocationManager` yok.
2. **Adres arama ve yürüme mesafesi: yerel modül `modules/places`** (Swift, ExpoModulesCore; `modules/backup-exclusion` örüntüsü): `MKLocalSearch`
   (metin → ad + nokta, en çok 5) ve `MKDirections` `.walking` (iki nokta → metre). Konum izni gerektirmez. **Swift kodu yalnız EAS derlemesinde
   derlenir** (yerelde Xcode yok); Jest tarafında modül sahtedir, kaynak metni konum API'si kullanmadığı testle tutulur.
3. **Yedek:** Apple yürüme rotası vermezse ya da çağrı başarısız olursa (çevrimdışı, veri yok): kuş uçuşu × `walk_detour_factor` (`data/parameters/walks.json`,
   1.3, [kaynak yok]: ürün tahmini); ekranda "yaklaşık" denir. Rota, iki yer seçilince bir kez hesaplanır ve kaydedilir.
4. **Veri:** `places.items` (kv; ad, enlem, boylam; en çok `walk_places_max` = 8) yalnız telefonda; çıkışta ve hesap silinince silinir; envantere işlendi.
   Kayıtlı rota K-1216'nın `WalkRoute {id, name, km}` biçimindedir, "Yürüyüşlerim"e eklenir; `suggestWalk` değişmez.
5. **İzin ve gizlilik:** Info.plist'e yeni anahtar yok; `expo-location` ve `expo-maps` eklenmez (eklentisi `NSLocation*`/`NSMotionUsageDescription` yazar, paket
   `CLLocationManager` kodu taşır: "konum okumayız" ve mağaza taramasıyla çelişme riski). Adres metni, iki nokta ve harita alanı Apple Haritalar'a telefondan gider
   (sunucumuzdan geçmez): arama kutusunun altında "Search uses Apple Maps; your places stay on this phone." (en + tr), gizlilik metni ve veri envanteri
   (alıcı: Apple) güncellendi. App Store etiketi: yerler geliştiriciye iletilmez, veri türü eklenmez; Apple'ın "toplama" tanımının platform servisine giden sorguyu
   kapsamadığı [doğrulanmadı], App Store Connect'te teyit edilir.
6. **Derleme:** yeni native kod (react-native-maps + modül) için yeni EAS geliştirme derlemesi gerekir (`development` / `development-simulator` profilleri `eas.json`'da var).

## Reddedilenler
- `expo-maps` ~57.0.3: alfa; polyline'da kesik çizgi yok, iOS'ta uzun basma yok.
- `expo-location` (`geocodeAsync`): iOS'ta izin gerekip gerekmediği dokümanda yok [doğrulanmadı]; eklenti konum ve hareket izin metni yazar.
- Yalnız kuş uçuşu: yürüme yolu sokakları izler; yedek olarak kaldı, ana yol olmadı.

## Sonuç
İki PR: (a) yer deposu, arama ve rota modülü, yedek parametre; (b) harita ekranı ve K-1216 bağlama. Riskler: MKDirections yürüme kapsamı bölgeye göre değişir
(cihazda doğrulanır; yedek var); react-native-maps yeni mimaride derlemede doğrulanır.
