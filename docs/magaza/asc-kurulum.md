# App Store Connect ve RevenueCat kurulumu: Next Call (K-1002, K-1003, K-1033)

> Levent için tıkla-yaz listesi. Sırayla git; her adımdaki kutular **aynen yapıştırılacak** değerlerdir. Değerlerin kaynağı
> `data/copy/store.en.json` (mağaza metni, testle korunur) ve `docs/yasal/app-store-beyanlari.md` (gizlilik, yaş, erişilebilirlik).
> Karar: ADR-080 + Ek 1 + Ek 2. Her Apple/RevenueCat iddiası dayanak adresiyle sonda; doğrulanamayan satır `[doğrulanmadı]`.
> Bu belge vergi ya da hukuk tavsiyesi değildir.

**Önkoşul:** Apple Developer hesabın **Account Holder** sensin (sözleşmeyi yalnız Account Holder imzalar). Uygulama kaydı ASC'de var
(`ascAppId 6819852276`, `apps/mobile/eas.json`); paket kimliği `dev.leventtcaan.keel` kalır.

---

## A. Business: sözleşme, banka, vergi, Small Business Program

**Sıra önemli:** Paid Apps sözleşmesi aktif olmadan abonelik ürünü oluşturulamaz ve satılamaz.

1. ASC › üstte **Business** › **Agreements** sekmesi › **Paid Apps** satırı › **View and Agree to Terms** › **Agree**.
   İki adımlı doğrulama kodu isteyebilir. **Geri alınamaz.**
2. **Banka bilgisi:** aynı Business bölümünden. Adım adım ekranı Apple'ın sayfası anlatmıyor; ASC'nin yönlendirmesini izle. `[doğrulanmadı: ekran yolu]`
3. **Vergi formu (ADR-080 Ek 1: şimdi yapılır):** Business › Agreements › **Tax Forms** › **Add Tax Info**. Form görünmüyorsa Tax Forms yanındaki **(+)** ›
   **Paid Apps** › formu işaretle › **Add**.
   - Apple'ın söylediği: ABD dışı geliştiricide **W-8BEN, W-8BEN-E veya W-8ECI** gerekebilir; ASC birkaç soru sorup seni doğru forma yönlendirir. Gönderdikten sonra
     ASC'de değişiklik yapamazsın (Apple'a yazman gerekir): göndermeden önce her alanı kontrol et.
   - Formun ne sorduğu: bireysel W-8BEN genelde ad, vatandaşlık ve yaşadığın ülke, adres, vergi kimlik numarası ve (varsa) vergi anlaşması talebi (ülke ve madde) ister.
     **Anlaşma talebine ne yazacağın benim cevaplayacağım bir soru değil.** `[doğrulanmadı: formun alanları Apple'ın sayfasından değil bilgimden; vergi tavsiyesi vermiyorum]`.
     Bunu mali müşavire bırakmak istersen formu ona göstermeden gönderme; mali müşavir işi (GVK 20/B) gelir gelince M11'de (ADR-080 Ek 1).
4. **AB Digital Services Act (trader) beyanı:** Business › Agreements › aşağıda **Compliance** › Digital Services Act › **Complete Compliance Requirements**.
   Apple: trader olup olmadığını **Apple belirlemez, sen değerlendirirsin**; trader isen adres, telefon ve e-posta AB ürün sayfalarında **herkese görünür**;
   değilsen AB tüketicisine tüketici haklarının sözleşmene uygulanmayabileceği bildirilir. Cevap senin (hukuki); `[doğrulanmadı: sana trader sayılıp sayılmadığın]`.
5. **App Store Small Business Program (%15 komisyon):**
   - Koşul (Apple): önceki takvim yılının 12 mali ayında ve içinde bulunulan yılda **toplam proceeds en çok 1 milyon USD**; yeni geliştirici de katılabilir.
     Eşik aşılırsa o yıl standart oran uygulanır, sonraki yıl yeniden hak kazanılabilir.
   - Başvuru koşulları: Account Holder olmak, **güncel Paid Apps sözleşmesini kabul etmiş olmak**, varsa ilişkili geliştirici hesaplarını listelemek (başka hesapta %50'den fazla payın varsa).
   - Başvuru adresi: https://developer.apple.com/app-store/small-business-program/ . Düğmenin tam yeri `[doğrulanmadı]`.
   - **Zamanlama:** kayıt onaylandığı mali ayın bitiminden **15 gün sonra** proceeds %15'e göre ayarlanır. İlk satıştan önce başvur.

## B. Uygulama kaydı

1. ASC › **Apps** › Next Call (mevcut kayıt) › **App Information**.
   Kaydın adı hâlâ "keel" ise buradan değişir. Ad, uygulama incelemeye gönderilene kadar serbestçe değişir.
2. Alanlar (hepsi EN-US):

   | Alan | Değer |
   |---|---|
   | Name | `Next Call: Lift & Diet Coach` (28/30) |
   | Subtitle | `Weekly Workout & Calorie Plan` (29/30) |
   | Primary Category | `Health & Fitness` |
   | Secondary Category (isteğe bağlı) | `Food & Drink` (Apple'ın tarifi: "dietary" örneği var; Sports ya da hiçbiri de olur) |
   | Privacy Policy URL | `https://leventtcaan.github.io/keel/privacy/` |
   | Content Rights | Besin veritabanı USDA FoodData Central (kamu malı). Üçüncü taraf içeriği hak gerektirmiyor gibi görünüyor `[doğrulanmadı: soruya Evet/Hayır]` |

   Ad ASC'de "kullanımda" derse dur ve söyle (yedek ad kararı senin). Biçim: marka (`Next Call`, içinde AI/Fit/Coach yok) + 2 genel kelime (`Lift & Diet Coach`); ADR-080 Ek 2 ve araştırma 05 §6.6.
3. **App Privacy** (sol menü): **Get Started** › "Yes, we collect data" › **Next** › aşağıdaki 5 türü seç › **Save**. Her tür için: amaç, **Linked to the user: Yes**, **Tracking: No**.

   | Tür | Amaç |
   |---|---|
   | Health & Fitness › Health | App Functionality |
   | Health & Fitness › Fitness | App Functionality |
   | Identifiers › User ID | App Functionality |
   | Usage Data › Product Interaction | App Functionality |
   | Purchases › Purchase History | App Functionality **ve** Analytics (RevenueCat'in kendi rehberi böyle ister) |

   Sonra **Product Page Preview › See Details** ile bak, sağ üstte **Publish**. Gerekçeler ve "toplanmayanlar" listesi: `app-store-beyanlari.md` §1.
   AI açıldığında (M11) User Content ve Photos eklenir; şimdi **eklenmez** (sağlayıcı yok). "Apple kimliği = User ID" yorumu bizim `[doğrulanmadı]`.
4. **Age Rating** (App Information içinde, soru formu): cevaplar `app-store-beyanlari.md` §2 tablosundaki gibi.
   - Hepsi **No / None**, yalnız **Health or Wellness Topics = Frequent**.
   - **Medical or Treatment Information:** belgede `None [doğrulanmadı]`. Benim önerim **Infrequent**: düşük enerji uyarısında "doktorunla konuş" ve "In pain, see a professional" metinleri var;
     ancak **18+ override** zaten görünen dereceyi belirlediği için pratikte bir şey değiştirmez. **Karar senin.**
   - Sonda **Override to Higher Age Rating › 18+** (Kullanım Şartlarımız 18+ diyor; Apple EULA'daki alt yaşın hesaplanandan yüksek olması hâlinde override'ı zorunlu kılıyor).
5. **Accessibility Nutrition Labels** (erişilebilirlik beyanı, isteğe bağlı): `app-store-beyanlari.md` §3. Bugün için **yalnız Dark Interface = Yes** işaretle.
   Differentiate Without Color Alone ve Reduced Motion cihaz turundan (K-815) sonra; Larger Text, VoiceOver, Voice Control, Sufficient Contrast **işaretlenmez** (tur ve onay bekliyor). Menü yeri `[doğrulanmadı]`.
6. **Sürüm sayfası** (App Store › 1.0 Prepare for Submission):

   | Alan | Değer |
   |---|---|
   | Promotional Text | `store.en.json › promotionalText` (157/170) |
   | Description | `store.en.json › description` (3011/4000), olduğu gibi yapıştır |
   | Keywords | `gym,training,strength,macro,nutrition,weight,tracker,log,food,progressive,overload,deload,rpe,reps` (98/100 bayt) |
   | Support URL | `https://leventtcaan.github.io/keel/` **EKSİK:** Apple, bu sayfanın **gerçek iletişim bilgisi** (e-posta ya da telefon) göstermesini ister. `_config.yml › contact_email` hâlâ "[contact address to be added before launch]". Önce e-postanı koy (Levent), sonra bu URL doğru olur |
   | Marketing URL | boş bırak (isteğe bağlı) |
   | Copyright | `2026 Levent Can Ceylan` (`_config.yml › controller_name`; Apple © işaretini kendisi ekler) |
   | Screenshots | K-1003: 5-6 dikey, caption'lı. Yer tutucu: `docs/magaza/ekran-goruntuleri/` (henüz yok) |
   | Build | K-984'te yüklenen TestFlight derlemesi (aynı derleme incelemeye gider, ADR-080 Ek 1) |
   | Version Release | **Manually release this version** |

   Anahtar kelime notları: AI, rakip adı (Strong, Hevy…), isim ve alt başlıktaki kelimeler **yok**; "AI" gizli alana da girmedi çünkü yayında AI kapalı (Apple 2.3.1/2.3.7).
7. **Pricing and Availability:** uygulama **Free**; ülkeler varsayılan (tümü). Kısıtlamak istersen karar senin.
8. **Export compliance:** `usesNonExemptEncryption: false` derlemede yazılı (`apps/mobile/app.json`), yükleme sırasında sorulmaması gerekir. Sorarsa "yalnız standart/işletim sistemi şifrelemesi, muaf".

## C. Abonelikler (ASC)

1. Uygulama › sol menü **Monetization › Subscriptions** › **(+)** ile grup: Reference Name `Next Call`.
2. Gruba **Create** ile iki ürün:

   | | Aylık | Yıllık |
   |---|---|---|
   | Reference Name | `Next Call Monthly` | `Next Call Yearly` |
   | **Product ID** | `nextcall.premium.monthly` | `nextcall.premium.yearly` |
   | Subscription Duration | 1 Month | 1 Year |
   | Price (ABD, USD) | **12.99** | **59.99** |

   Fiyat: **Subscription Prices › Add Subscription Price** › ülke United States › fiyat. Apple diğer 174 mağaza için karşılaştırılabilir fiyatı vergi ve kura göre
   kendisi doldurur; istersen tek tek değiştirirsin. $12.99 ve $59.99'un fiyat listesinde olduğunu ASC'de gör `[doğrulanmadı: 800 fiyat noktası var, listeyi Apple göstermiyor]`.
   Fiyat kodda yok (K2); uygulama fiyatı RevenueCat/StoreKit'ten okur.
3. **Availability:** tüm ülkeler.
4. **Grup sırası (levels):** yıllığı üste koy. `[doğrulanmadı: Apple'ın yükseltme/düşürme kuralları]`
5. **Yerelleştirme (English U.S.)** (her üründe **Display Name and Description › Add**; kural: işaretleme, emoji, aksan yok):

   | | Grup | Aylık | Yıllık |
   |---|---|---|---|
   | Display Name | `Next Call` | `Next Call Monthly` | `Next Call Yearly` |
   | Description | (yok) | `Weekly calls and full tracking, monthly` | `Weekly calls and full tracking, yearly` |

   Limitler: ad 30, açıklama 45 (ASC sayacı; Apple'ın yardım sayfası sayı vermiyor `[doğrulanmadı]`). Grup adında "App Name Display Options": uygulama adını seç.
6. **Introductory Offer (ADR-058 Ek 1, ADR-071 #1):** her iki ürün için ayrı ayrı:
   Ürün › **Subscription Prices › View all Subscription Pricing › Set up Introductory Offer** › ülkeler: **hepsi** › tarih: başlangıç **bugün** (bitiş: yok ya da çok ileri) ›
   Offer type **Free** › süre **2 Weeks** › fiyatları gözden geçir › **Confirm**.
   - **Düzeltme:** formda "yalnız yeni aboneler" diye bir seçenek **yok**; Apple kuralı: kişi **abonelik grubu başına tek** tanıtım teklifini kullanabilir (yeni/eski fark etmez).
   - Onaylandıktan sonra **düzenlenemez**: yanlışsa silip yeniden yaratılır. Sandbox'ta görünmesi 1 saati bulabilir.
7. **App Review için ekran görüntüsü:** her üründe **Review Information**: paywall ekran görüntüsü yüklenir. Yer tutucu: `docs/magaza/ekran-goruntuleri/paywall-inceleme.png` (henüz yok, K-1003).
   Boyut kuralı `[doğrulanmadı]`.
   **Review Notes** (ürün başına, kısa):
   ```
   Auto-renewing subscription that unlocks the app's weekly calls and full tracking. Reached at the end of onboarding (sign in with Apple, answer the short questions, then the subscription screen). The 2-week free trial applies to new subscribers.
   ```
8. Sürümü gönderirken (F) iki ürünü **In-App Purchases and Subscriptions** bölümünden sürüme ekle: **ilk abonelik yeni uygulama sürümüyle birlikte gönderilmek zorunda**.

## D. RevenueCat

1. https://app.revenuecat.com › yeni **Project** (ad `Next Call`). `[doğrulanmadı: ekran yolu]`
2. Projede **Apps › + New › Apple App Store**: App name `Next Call`, **Bundle ID `dev.leventtcaan.keel`** (harfi harfine).
   - **In-app purchase key:** ASC › **Users and Access › Integrations › In-App Purchase** › **Generate In-App Purchase Key** (ad ver) › **Download API Key** (**yalnız bir kez** iner; sakla, repoya koyma, V5).
     RevenueCat'te uygulamayı seç › **In-app purchase key configuration** sekmesi › .p8'i yükle, **Issuer ID**'yi (aynı ASC sayfasında) yaz › **Save changes**. "Valid credentials" görmelisin.
   - Shared Secret gerekmez: RevenueCat'e göre yalnız StoreKit 1 içindir; kurulu SDK 10.11.0 StoreKit 2 ile anahtar kullanır.
   - (Önerilir) **App Store Connect API key** + **Apple server notifications**: uygulama ayarlarında "Apple Server to Server notification settings" › **Apply in App Store Connect**.
     Elle yapacaksan: URL'yi kopyala › ASC › uygulama › App Information › **App Store Server Notifications** › URL'yi hem Production hem Sandbox alanına yapıştır, Version 2 seç.
3. **Product catalog › Products › + New › Import Products** (ASC bağlıyken) ya da **+ New product** ile kimliği aynen yaz: `nextcall.premium.monthly`, `nextcall.premium.yearly`.
4. **Product catalog › Entitlements › + New entitlement**: Identifier tam olarak **`premium`** (sunucu: `backend/src/main/resources/application.yml › keel.subscription.revenuecat.entitlement`).
   Entitlement'ı aç › **Attach** › iki ürünü bağla.
5. **Offerings › + New**: Identifier **`default`**, açıklama `Default`. İçinde **+ Add package**:
   - **Monthly** (`$rc_monthly`) → `nextcall.premium.monthly`
   - **Annual** (`$rc_annual`) → `nextcall.premium.yearly`

   Uygulama `offerings.current.monthly` ve `.annual` okur (`apps/mobile/src/subscription/revenueCat.ts`); paket kimliği standart olmalı, özel ad olmaz.
   Bu offering'in **current/default** olduğunu panelde doğrula (düğmenin adı `[doğrulanmadı]`).
6. **Genel (public) SDK anahtarı:** dashboard › **Project Settings › API keys › App specific keys** › Apple uygulamasının anahtarı. Gizli değil ama yine repoya girmez; EAS'a:
   ```
   cd apps/mobile
   eas env:create --name EXPO_PUBLIC_REVENUECAT_APPLE_KEY --value <ANAHTAR> --environment production --visibility plaintext
   eas env:list production
   ```
   `EXPO_PUBLIC_` değişkenleri derlemeye gömülür: **değişkenden sonra yeniden derleme gerekir**. `eas.json` production profili `"environment": "production"` kullanıyor.
   (Not: yüklü EAS CLI 24.x'te `env:create` var, `--help` ile doğrulandı; Expo'nun güncel sayfası aynı işi `env:set` diye gösteriyor. Biri çalışmazsa öbürünü dene.)
7. **Gizli (secret) API anahtarı:** **API keys › + New secret API key** (`sk_…`; yalnız proje Admin'i yaratır). Sunucuda `KEEL_REVENUECAT_API_KEY` olur (aşağıda). Hangi sürüm (V1/V2) ve izinle yaratılacağı Apple dışı; sunucu REST **v1** kullanır (`base-uri: …/v1/`) `[doğrulanmadı: v1 uçlarının hangi anahtar izniyle çalıştığı]`; bir 401/403 görürsen anahtarın izinlerine bak.
8. **Webhook:** Integrations › **Webhooks** › **Add new configuration**:
   - Name `keel-backend`, URL **`https://keel-beta.duckdns.org/webhooks/revenuecat`**
   - **Authorization header: boş bırak** (sunucu yalnız HMAC imzasına bakar, ADR-056 #1)
   - Events: **hem Production hem Sandbox** (sunucu ikisini de kabul ediyor; inceleme sandbox'ta)
   - App: yalnız Next Call; event türü filtresi: yok
   - Kaydettikten sonra webhook'u aç › **HMAC webhook signing: açık** › **imza sırrını kopyala**. RevenueCat'e göre sır **yalnız bir kez** gösterilir; kaybolursa **Rotate secret** (eskisi hemen geçersiz).
   - Başlık biçimi: `X-RevenueCat-Webhook-Signature: t=<unix>,v1=<hmac_sha256_hex>`, imzalanan metin `"<t>.<ham gövde>"`; sunucumuz tam bunu doğrular, 5 dk tolerans.
9. **VPS'e sırları koy.** Sır sohbete ya da repoya yazılmaz; sunucuda dosyayı elle düzenle:
   ```
   ssh keel-vps
   nano /opt/keel/.env        # iki satırı doldur, kaydet, çık
   ```
   - `KEEL_REVENUECAT_WEBHOOK_SECRET=<webhook imza sırrı>` (init-env.sh rastgele bir değer yazmıştı; RevenueCat'inkiyle **değiştir**)
   - `KEEL_REVENUECAT_API_KEY=<sk_… gizli anahtar>`

   Yeniden başlat (deploy/README.md › Secrets): `ssh keel-vps '/opt/keel/deploy/kc up -d'`. Sağlık: `curl https://keel-beta.duckdns.org/health` → `{"status":"UP"}`.
   Gizli anahtar boşsa sunucu silinen hesapların RevenueCat kaydını silemez ve her 5 dakikada bir hata satırı yazar: **gerçek kullanıcıdan önce** koy.
10. **Doğrula (sandbox):** TestFlight derlemesiyle paywall'da Sandbox hesabıyla dene; sunucu logunda 401 olmamalı:
    `ssh keel-vps 'journalctl CONTAINER_NAME=keel-backend-1 --since "10 min ago"'`. Aboneliğin uygulamada aktif görünmesi = webhook imzası ve entitlement `premium` doğru.
    **SANDBOX kabulü inceleme boyunca AÇIK kalır** (ADR-080 Ek 1); `environments: [PRODUCTION, SANDBOX]` değişmez.

## E. App Review Information

Sürüm sayfası › **App Review Information**:

| Alan | Değer |
|---|---|
| Sign-in required | **Kapalı bırak.** Uygulamada **yalnız Sign in with Apple** var (`apps/mobile/src/app/sign-in.tsx`; başka giriş yok); inceleyici kendi Apple ID'siyle girer, demo hesap gerekmez. Apple demo hesabı yalnızca giriş varsa ister (2.1) |
| Contact first/last name | `Levent Can Ceylan` |
| Contact phone | `+90…` (uluslararası biçim, artı ve ülke kodu şart) **Sen yaz** |
| Contact email | **Sen yaz** (kamuya açık değil; Support URL ile aynı olması gerekmez) |
| Notes (en çok 4000 bayt) | aşağıdaki metin |

```
Next Call is a weekly training and nutrition coach. You log workouts, meals and weigh-ins. Once a week a fixed rule engine makes one decision (keep the plan, or change calories, steps or training loads) and shows the reason. No language model makes decisions.

SIGN IN: The app uses Sign in with Apple only. There is no other account system, so there is no demo account: sign in with your own Apple ID. The app asks for no name and no email.

PAYWALL: After signing in, answer the short onboarding questions (units, goal, training days, equipment, consents). The subscription screen appears at the end and cannot be skipped. It shows the monthly and yearly plans, the 2-week free trial for new subscribers, the renewal terms, Restore Purchases, and links to the Terms of Use and the Privacy Policy. Purchases are made in the App Store sandbox during review and work with a sandbox tester account.

WEEKLY CALL: A call needs logged data, so a new account shows "No call yet" and says why. The weekly call appears after the first weekly check-in. Logging (workout, meals, weigh-ins) works from the first minute.

AI FEATURES ARE NOT ACTIVE in this version. No AI provider is connected and no data is sent to one. The coach answers in fixed wording from the rules. Reading a meal from a photo or from typed words is not offered. Where such a screen exists, it says the feature is not active yet.

HEALTH: This is a general wellness app for adults (18+), not a medical device. The Health Notice is at https://leventtcaan.github.io/keel/health/ and is linked from the Terms of Use on the subscription screen. Apple Health is read only if the user allows it in the app. Progress photos stay on the phone.

ACCOUNT DELETION (5.1.1(v)): Settings (top of the This week tab) > Delete account. The same account section (export, delete account, sign out) is on the subscription screen, so it can be reached before subscribing.

The server (https://keel-beta.duckdns.org) is running for the review.
```

Notes'u göndermeden önce **cihazda şunları gör** (metin bunlara dayanıyor, ben cihazda doğrulamadım `[doğrulanmadı]`):
paywall onboarding sonunda atlanamıyor mu · Ayarlar'da "Delete account" · AI kapalı yüzeyler (koç serbest metin, öğün fotoğrafı) dürüst "not active" gösteriyor mu (K-1033 kabul kriteri) ·
Terms bağlantısı paywall'dan açılıyor mu.

> **Boşluk (kod/mimari):** uygulamada **Health Notice'a doğrudan bağlantı yok**; yalnız Terms ve Privacy paywall'da (`subscription/links.ts`), Health Notice Terms sayfasından bağlı.
> Guideline 1.4.1 "tıbbi uygulamalar doktora danışmayı hatırlatmalı" der; kısa sağlık notu ya da bağlantı eklemek ayrı bir iş olabilir.

## F. Gönderim

1. Kontrol: A-E bitti; ASC'de uygulama kaydında sarı uyarı yok; iki abonelik durumu **Ready to Submit**; privacy **Published**; yaş derecesi dolu; derleme seçili.
2. Sürüm sayfasında **In-App Purchases and Subscriptions**: iki aboneliği ekle.
3. **Version Release: Manually release this version.**
4. **Add for Review › Submit to App Review**; içerik hakları ve dışa aktarma sorularını yanıtla.
5. Onaydan sonra durum **Pending Developer Release** olur; mağazada yayınlamak **sen basınca** olur (ADR-019, mağaza yayını Levent'te).
6. İnceleme sürerken sunucu açık kalsın (Apple 2.1: arka uç canlı olmalı).

---

## Dayanaklar (hepsi 16 Eki 2026'da okundu)

- Paid Apps sözleşmesi: https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements
- Vergi formları: https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information
- Small Business Program: https://developer.apple.com/app-store/small-business-program/
- DSA trader: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements
- Alan limitleri: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information · .../platform-version-information
- Abonelik grubu ve ürün, yerelleştirme: https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions
- Abonelik alanları: https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information
- Tanıtım teklifi: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions
- Fiyatlama: https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions
- App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy
- Gönderim: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-for-review
- Kategoriler: https://developer.apple.com/app-store/categories/
- İnceleme kuralları (2.1, 2.3.1, 2.3.7, 1.4.1, 3.1.2, 5.1.1(v)): https://developer.apple.com/app-store/review/guidelines/
- RevenueCat webhook (HMAC açma, sır bir kez, başlık): https://www.revenuecat.com/docs/integrations/webhooks
- RevenueCat uygulama bağlama: https://www.revenuecat.com/docs/projects/connect-a-store
- In-App Purchase Key: https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration
- Shared secret yalnız StoreKit 1: https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret
- Ürün import: https://www.revenuecat.com/docs/offerings/products-overview · Entitlement: https://www.revenuecat.com/docs/getting-started/entitlements
- Offering/paket: https://www.revenuecat.com/docs/offerings/overview · https://www.revenuecat.com/docs/getting-started/displaying-products
- API anahtarları: https://www.revenuecat.com/docs/projects/authentication · Apple S2S: https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications
- EAS ortam değişkenleri: https://docs.expo.dev/eas/environment-variables/ · CLI (`eas env:create --help`, yerel 24.x)
- Repo: `plan/kararlar/ADR-056-yetki-sunucuda.md`, `ADR-058`, `ADR-071`, `ADR-080`, `deploy/README.md`, `docs/yasal/app-store-beyanlari.md`

## Doğrulanmayanlar (özet)

1. Banka ekranının yolu · W-8BEN alanları ve anlaşma talebi (vergi tavsiyesi değil) · DSA trader sayılıp sayılmadığın.
2. Small Business Program başvuru düğmesinin yeri.
3. Abonelik görünen ad (30) ve açıklama (45) sayacı; $12.99 ve $59.99'un fiyat listesinde olması; grup sırası kuralı; inceleme ekran görüntüsü boyutu.
4. RevenueCat: proje yaratma yolu, "current offering" düğmesi, gizli anahtar izni (REST v1), "Send test event" varlığı.
5. Medical or Treatment Information cevabı (None mı Infrequent mi); Content Rights sorusu; "Apple kimliği = User ID" yorumu.
6. Notes'taki cihaz iddiaları (paywall atlanmaz, Delete account yolu, AI kapalı yüzeylerin metni).
7. IAP görünen adlarının arama dizinine girdiği iddiası (K-1002 kabul kriteri): adlar markalı bırakıldı, anahtar kelime taşımıyor.
