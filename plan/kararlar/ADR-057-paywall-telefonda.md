# ADR-057 · Paywall telefonda: satın alma portu, sunucudan teyit, iptal Apple'da (K-702)
- **Durum:** KABUL (agent, teknik — ADR-019; ADR-012 ve ADR-056'nın telefondaki uygulaması). Ürün soruları (paywall'ın ne zaman
  göründüğü, duraklatma) ayrı: aşağıda "Levent'e".
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
ADR-012: satın alma RevenueCat üzerinden StoreKit; fiyat kodda yok; iptal ve duraklatma görünür. ADR-056: yetki sunucuda, telefon
`GET /v1/subscription`'dan okur (K-705); RevenueCat'in `app_user_id`'si hesabın UUID'si değilse sunucu olayı yok sayar. Kurulu SDK
(`react-native-purchases` 10.11.0, tipler `@revenuecat/purchases-typescript-internal` 19.5.0, 4 Eki okundu): `configure({ apiKey,
appUserID })`, `logIn`, `logOut`, `getOfferings` (`current.annual/monthly`, `product.priceString`, `pricePerMonthString`,
`introPrice.periodNumberOfUnits/periodUnit`), `checkTrialOrIntroductoryPriceEligibility`, `purchasePackage` (iptal:
`PURCHASE_CANCELLED_ERROR` = "1", bekleyen: `PAYMENT_PENDING_ERROR` = "20"), `restorePurchases`, `showManageSubscriptions` (iOS
13+, Apple'ın abonelik sayfası). Expo kurulum dokümanı: SDK Expo Go'da kendiliğinden JS sahtelerine geçer ("real purchases will
not function"); config plugin gerekmez. RevenueCat kimlik doğrulama dokümanı: "Public API keys (also known as SDK API keys…) …
must be used to configure the SDK" — gizli anahtar uygulamaya girmez.

**App Store'da duraklatma yok.** Apple'ın otomatik yenilenen aboneliğinde duraklatılmış durum tanımlı değil; App Store Connect'te
ayarı yok; kullanıcının tek yerleşik yolu iptal. Google Play'de 1 hafta–3 ay duraklatma var (ADR-056: `SUBSCRIPTION_PAUSED` yalnız
Play). Kaynak: Apple'ın StoreKit/abonelik dokümanında duraklatma yok; ikincil kaynaklar doğruluyor `[Apple'dan "yok" diyen
cümle doğrulanmadı — yokluk kanıtı]`. Prototipin "Pause up to 3 months" satırı iOS'ta tutulamaz.

## Karar
### D1 · Satın alma bir port arkasında
`SubscriptionStore` (`apps/mobile/src/subscription/store.ts`): `available`, `identify(appUserId)`, `forget()`, `plans()`,
`buy(planId)`, `restore()`, `manage()`. Cihaz uyarlayıcısı `revenueCat.ts`; Expo Go'da (`isRunningInExpoGo()`) ve anahtar
yokken **yüklenmez, `available: false`** — SDK'nın sahte modu gerçek satın almaya benzediği için kullanılmaz (HealthKit kalıbı,
ADR-031). Testte sahte port.
- **Anahtar yapılandırmadan:** `EXPO_PUBLIC_REVENUECAT_APPLE_KEY` (public SDK anahtarı; `.env`, gitignore). Repoda yok (V5,
  repo public); yoksa satın alma "bu derlemede yok" der, uygulama açılır.
- **Tembel `configure`:** SDK uygulama açılışında değil, ilk kez paywall ya da ayarlardaki abonelik bölümü ona ihtiyaç duyunca,
  **hesabın UUID'siyle** yapılandırılır (`configure({ apiKey, appUserID })`). Böylece hiç anonim kimlik oluşmaz (ADR-056 #3) ve
  aboneliğe hiç dokunmayan kullanıcının cihaz verisi RevenueCat'e gitmez (ADR-012 Ek 1'in en azı). Sonraki hesap değişiminde
  `logIn`; çıkışta `logOut` (anonimken hata verir → adıyla raporlanır, çıkış sürer). Bedeli: RevenueCat açılışta yapılandırmayı
  öneriyor (işlem gözlemcisi). Yarım kalan bir satın alma sonraki yapılandırmada bitirilir; yenilemeler zaten sunucuya webhook'la
  gelir → kabul edilebilir.
- **Kimlik sunucudan:** `appUserId` K-705 cevabından; sunucuya ulaşılamazsa **satın alınmaz** (başka kimlikle yapılan satın alma
  hesaba hiç ulaşmaz — kapalı başarısızlık).

### D2 · Satın almadan sonra sunucuyu yeniden sorma
Mağaza "tamam" dese de erişim sunucunun sözüdür (ADR-012). Webhook birkaç saniye-bir dakika gecikebilir → telefon
`GET /v1/subscription`'ı `subscription_confirm_attempts` kez, `subscription_confirm_interval_ms` arayla sorar
(`data/parameters/subscription.json`; 12 × 5 sn = 1 dk). Aktif görünce "abonesin"; görünmezse "App Store onayladı, bize ulaşması bir
dakika sürebilir" + "tekrar bak" düğmesi — hata değil, satın alma yeniden istenmez. Geri yükleme de aynı teyidi yapar.

### D3 · Fiyat ve deneme dili mağazadan, metin en.json'dan
Planlar `getOfferings().current`'ın `annual` ve `monthly` paketleri; fiyat yalnız `priceString` / `pricePerMonthString` (mağazanın
yerel biçimi; kodda fiyat ve para birimi hesabı yok, K2). Deneme süresi `introPrice`'tan; **deneme dili yalnız
`INTRO_ELIGIBILITY_STATUS_ELIGIBLE` iken** — denemesini kullanmış birine "7 gün ücretsiz" demek yanıltır (Apple 3.1.2). Sayfada:
plan adı, süre, fiyat, deneme sonrası ne zaman ne kadar çekileceği, otomatik yenileme, nasıl iptal edileceği, Kullanım Şartları ve
Gizlilik Politikası bağlantıları (adresler yapılandırmadan: `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`; metinleri M8,
K-801). Prototipteki "Day 5 we remind you" satırı **yok**: hatırlatma yapılmıyor; söz verilmez (soru 105).

### D4 · İptal Apple'ın sayfasında, iki dokunuşta
Ayarlar › Abonelik: durum (deneme · şu tarihte yenilenir · iptal edildi, şu tarihe kadar · ödeme sorunu · süresi doldu) + **"Cancel or
change plan"** → `showManageSubscriptions` (Apple'ın sayfası; orada "Cancel Subscription"). Karanlık desen yok: vazgeçirme ekranı,
"emin misin", kayıp korkusu yok (U7, Noom). Duraklat düğmesi iOS'ta **yok** (yukarıda; soru 106).

### D5 · ENTITLEMENT_REQUIRED paywall'a götürür, zorla açmaz
`load` (`today/today.ts`) 403 `ENTITLEMENT_REQUIRED`'ı `subscription` durumu olarak ayırır; koç ve öğün (kelime, fotoğraf) bunu
"bu bir abonelik ister" + **"See plans"** düğmesi olarak gösterir; paywall kullanıcı dokununca açılır. Motorun kendi sözleri, kayıt
ve karar kartı aboneliksiz çalışır (ADR-056 #10). "Kredi" kelimesi yok.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| RevenueCat Paywalls (`react-native-purchases-ui`) | Hazır arayüz, ama metin en.json dışından, yasaklı ifade bekçisi (U4/U6) ve RUBİN teması dışında; bir paket daha |
| Açılışta anonim `configure`, girişte `logIn` | Her kullanıcı için RevenueCat'te anonim kimlik + cihaz verisi; anonim olaylar sunucuda yok sayılır |
| Satın alma sonrası `CustomerInfo`'ya güvenmek | Yetki istemciye güvenilmez (ADR-012); paywall "aktif" deyip koç 403 dönerse çelişki |
| Expo Go'da SDK'nın sahte modu | Gerçeğe benzeyen sahte satın alma: test ettiğini sanırsın; port + Jest sahtesi daha açık |
| iOS'ta "Pause" = iptal | Yanıltıcı; Apple'da duraklatma yok |

## Geri dönmenin maliyeti
Düşük: port tek dosyada; ekranlar porta bağlı.

## Etkilenen
`apps/mobile/src/subscription/*`, `app/paywall.tsx`, `settings/SubscriptionSection.tsx`, `today/today.ts` (`load`), koç ve öğün
ekranları, `data/parameters/subscription.json`, `data/copy/en.json`, `package.json` (`react-native-purchases` 10.11.0; ADR-012'nin
"10.10.2"si düzeltildi).

## Doğrulama
`subscription-store.test.ts` (uyarlayıcı: Expo Go'da yüklenmez, tembel configure + logIn/logOut, iptal/bekleyen), `paywall.test.ts`
(saf: planlar, deneme yalnız uygunken, teyit döngüsü), `paywall-screen.test.tsx`, `subscription-section.test.tsx`, koç/öğün
ENTITLEMENT_REQUIRED testleri. Cihazda (K-308 sonrası): sandbox satın alma, geri yükleme, iptal.

## Levent'e (sorular 105-107)
- **105 · Deneme bitmeden hatırlatma:** prototip "5. gün hatırlatırız" diyor; yerel bildirimle yapılabilir (K-410 altyapısı). İstiyor musun?
- **106 · Duraklatma:** iOS'ta yok. Öneri: düğme yok, iptal açık; Android gelince Play duraklatması.
- **107 · Paywall ne zaman:** araştırma sert paywall diyor (05 §7.3), K-703 aboneliksiz deterministik mod diyor. Onboarding sonunda
  paywall kapatılabilir mi?
