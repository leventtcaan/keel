# ADR-048 · Kilit ekranı: `expo-widgets` 57 ile karar widget'ı ve Live Activity; App Intents SDK 58 stabil olunca (K-515, K-426)
- **Durum:** KABUL (agent, teknik — ADR-019; madde 5'in ürün yanı Levent, 3 Eki 2026, soru 86: önce buton, sonra intent) · **cihaz adımı bekliyor** (K-308)
- **Tarih:** 2026-10-03 · **Karar veren:** agent (teknik); Levent (madde 5'in ürün yanı)

## Bağlam
K-515: "Widget: haftanın kararı + sonraki değerlendirme; varsayılan sayısız görünüm (V3)" + "Spike: Expo SDK 58 expo-app-intents (alpha)
vs native Swift; 'Log weigh-in' uygulamayı açmadan kayıt" + "SDK 58 yükseltme değerlendirmesi (L3 P15)". K-426: dinlenme sayacı Live
Activity olarak. Araştırma: `arastirma/ham/H11-cihaz-ustu-ve-widget.md` §0, §B1-B4 (3 Eki 2026).

## Karar sürücüleri
- V3: kilit ekranı kilitsiz görünür; sayı varsayılan olarak **hiç** yazılmamalı. Apple'ın `privacySensitive` gizlemesi kullanıcının
  "Allow Access When Locked" ayarına bağlı — varsayılan değil (H11 §B3) → kural bizim kodumuzda.
- Resmî, SDK'mızla uyumlu, tek paket; native hedef işini Expo üstlensin.
- Alpha/beta'ya bağlanmamak (tek geliştirici).

## Karar
1. **`expo-widgets` 57.x** (resmî; kilit ekranı `accessoryRectangular`/`accessoryInline`/`accessoryCircular` + Live Activity
   `createLiveActivity` tek pakette; `@expo/ui` zaten kurulu). Kurulum **cihaz adımında** (K-308 ile): config plugin App Group
   entitlement'ı ekler, App Group Apple hesabında kaydedilir (Levent'in terminali) — şimdi `app.json`'a girerse K-308 derlemesi
   kayıtsız App Group'a takılır.
2. **Widget içeriği saf bir fonksiyondan** (`apps/mobile/src/widgets/lockScreen.ts`): karar → kararın **etiketi** (`decision.<action>.label`,
   ör. "Keep going", "Hold the weight") + "Next review {date}". Güvenlik kararı zaten genel `change_phase` anahtarıyla gelir (ADR-028
   #24) → genel etiket. Karar yoksa/okunamıyorsa tek nötr satır. **Sayı yok** (kilo, kalori, yüzde); tarih dışında rakam yok — testle.
   Widget'a giden props'ta sayı alanı hiç yok; sayılı görünüm ileride ayarla açılırsa `privacySensitive()` ile çift koruma.
3. **Güncelleme:** uygulama çalışırken (Bugün yüklenince, karar uygulanınca) `updateSnapshot`; arka plan fetch yok (expo-widgets
   modeli: "all data a widget needs must come in through its props").
4. **Live Activity (K-426):** aynı paket; props kalan süre + sıradaki set, `@expo/ui` `Text timerInterval`; ağ yok.
5. **App Intents ertelendi:** `expo-app-intents` alpha ve SDK 58'e bağlı (`@expo/ui ^58`); SDK 58 **beta** (RN 0.88 RC). "Log weigh-in
   uygulamayı açmadan" her yolda Swift `perform()` ister. Tetikleyici: SDK 58 stabil + `expo-app-intents` ≥ beta. Kilit ekranından kilo
   girişinin biçimi (Levent, soru 86): **şimdi** widget'ta uygulamayı tartı ekranına derin bağlantıyla açan buton (SDK 57, `expo-widgets`,
   cihaz adımında); **SDK 58 stabil olunca** uygulamayı açmadan parametreli Siri/Shortcuts intent'i ("Log 82.4 kg", Swift `perform()`).
6. **SDK 58 yükseltmesi: şimdi değil.** Beta; stabil çıkınca ayrı görev (L3 P15). iOS 27'ye özgü API gerekirse önce SDK 57 +
   `expo-build-properties › ios.enableSceneSupport` (Xcode 27 UIScene şartı; 57.0.23+ — biz 57.0.25) değerlendirilir.

## Neden
- `expo-widgets` SDK 57'de resmî ve kilit ekranı + Live Activity'yi kapsıyor; `@bacons/apple-targets` tamamen native SwiftUI demek.
- Sayısız varsayılanı props'ta zorlamak Apple'ın kullanıcı ayarına bağlı gizlemesinden güçlü: veri widget deposuna (App Group) hiç girmez.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `@bacons/apple-targets` 5.0.0 + native SwiftUI | Her şey Swift; `expo-widgets` yetmezse yedek |
| `expo-app-intents` şimdi | Alpha, SDK 58'e bağlı; SDK 58 beta |
| Apple `privacySensitive`'e güvenmek | Kullanıcı ayarına bağlı, varsayılan değil (V3 ihlali) |

## Sonuçlar
Olumlu: widget metni bugün test edilebilir; cihaz adımı yalnız kurulum + görme. Olumsuz: App Intents ve kilitten kilo girişi bekliyor;
widget yalnız uygulama açıldığında tazelenir.

## Geri dönmenin maliyeti
Düşük — içerik saf fonksiyonda; paket değişirse yalnız bağlama değişir.

## Etkilenen
`apps/mobile/src/widgets/lockScreen.ts` (+ test), cihaz adımında `expo-widgets` kurulumu + `app.config.ts` (App Group kimliği
yapılandırmada, K2) + Bugün'ün yüklenişinde `updateSnapshot`; K-426 (Live Activity), K-515 (App Intents kısmı ertelendi).

## Doğrulama
Şimdi: `lock-screen.test.ts` (her karar türü ve kuralı için metin sayısız; güvenlik kararı genel; karar yok → nötr). Cihaz adımı
(K-308 sonrası): kilit ekranında görüldü, kilitliyken sayı yok, App Group kaydı, Live Activity geri sayımı.
