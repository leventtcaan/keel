# App Store Connect beyanları — gerekçeli taslak (K-803)

> İç belge (Türkçe). App Store Connect'e **Levent girer, M10'da** (ADR-059 #4). Kaynak: veri envanteri `docs/yasal/veri-envanteri.json`
> (koddan; `tools/test_veri_envanteri.py` bu dosyadaki etiket tablosunu envanterle birebir tutar). Apple'ın tanımları:
> https://developer.apple.com/app-store/app-privacy-details/ ve
> https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions/ (ikisi de 4 Eki 2026).
> Erişilebilirlik etiketi K-807'de (Part 2).

## 1. App Privacy (gizlilik etiketi)

**Veri topluyor musunuz?** Evet. Apple'a göre "collect" = veriyi cihazdan, isteğe gerçek zamanlı hizmet etmenin gerektirdiğinden uzun süre
erişilebilir biçimde göndermek. Sunucumuza giden kayıtlar ve RevenueCat'in satın alma kaydı bu tanıma girer. İlerleme fotoğrafları (cihazda),
Health'ten okunup gönderilmeyenler, yerel bildirimler girmez.

**İzleme (tracking): Hayır** — hiçbir veri üçüncü taraf veriyle reklam için birleştirilmiyor, veri simsarına gitmiyor; reklam/analitik SDK'sı yok.
**Kimliğe bağlı mı: Evet** (hepsi hesaba bağlı; Apple: kişisel veri bağlı sayılır).

<!-- label:start -->
| Apple veri türü | Amaç | Kimliğe bağlı | İzleme | Envanterden dayanak |
|---|---|---|---|---|
| Health & Fitness › Health | App Functionality | Evet | Hayır | Tartı, bel, görünüş, fotoğraf sonucu, aktivite günü, öğün ve tarifler, plan ve kararlar, beyan edilen durum, koç sorularına cevaplar, profil (yaş, boy, cinsiyet, kaçınılan besinler) — HEALTH_DATA rızasıyla |
| Health & Fitness › Fitness | App Functionality | Evet | Hayır | Antrenman ve set kaydı, program ve geçmişi, salon ekipmanı, kendi hareketleri |
| Identifiers › User ID | App Functionality | Evet | Hayır | Apple'ın bu uygulamaya özgü kullanıcı kimliği (`identity.account`); RevenueCat'e giden opak hesap UUID'si |
| Usage Data › Product Interaction | App Functionality | Evet | Hayır | Günlük kullanım sayaçları (`subscription.daily_use`): koç mesajı ve öğün fotoğrafı analizi sayısı, içerik yok — kota için |
| Purchases › Purchase History | App Functionality, Analytics | Evet | Hayır | Abonelik durumu ve RevenueCat olayları (sunucu); RevenueCat SDK'sının satın alma kaydı — RevenueCat'in rehberi Purchase History'yi "Analytics" ve "App Functionality" için seçmeyi söylüyor |
<!-- label:end -->

Gerekçeler:
- **Purchase History › Analytics:** RevenueCat'in kendi rehberi (https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy,
  4 Eki) "Purchase History" için hem "Analytics" hem "App Functionality" seçilmesini istiyor (RevenueCat paneli). Biz analitik yapmıyoruz; tür
  RevenueCat'in işlediği için var.
- **Usage Data › Product Interaction:** `subscription.daily_use` hesap başı günlük koç mesajı ve fotoğraf analizi sayısını ~3 gün tutar (kota) →
  Apple'ın "collect" tanımına giriyor; App Functionality için beyan edilir.
- **Toplanmayanlar:** Contact Info (Apple'dan ad/e-posta istenmiyor: `requestedScopes: []`), Location, Contacts, Browsing/Search History, Usage Data'nın geri kalanı (reklam, ürün analitiği yok),
  Diagnostics (çökme raporlama SDK'sı yok), Financial Info (ödeme Apple'da; Apple: geliştirici ödeme bilgisine erişmiyorsa toplanmış sayılmaz),
  Sensitive Info, Photos or Videos (ilerleme fotoğrafı cihazda; öğün fotoğrafı yalnız AI açılınca — aşağıda).
- **AI koç açılınca (M10, K-533) eklenir:** User Content › Other User Content (koç sorusu, öğün notu), User Content › Photos or Videos (öğün fotoğrafı),
  Health & Fitness › Health zaten var. Envanterde `app_privacy_when_active`; sağlayıcı açıldığı gün `app_privacy`'ye taşınır ve bu tablo güncellenir.
- **Kesinleşmeyen [doğrulanmadı]:** Sign in with Apple'ın verdiği kimliğin "User ID" sayılması bizim yorumumuz (Apple'ın "assigned user ID"
  örneğine uyuyor); M10'da ASC formundaki açıklamayla yeniden bakılır.

## 2. Yaş derecelendirmesi anketi

Anketin hesapladığı derece **9+** (aşağıdaki cevaplarla; "Health or Wellness Topics" her sıklıkta 9+). **Override to Higher Age Rating → 18+
zorunlu:** Apple: "If your app has a EULA with minimum age requirements that exceed the rating that Apple calculated, you must override to a
rating that adheres to the requirements." Kullanım şartlarımız 18+ diyor (K-225) → ASC'de 18+ seçilir; mağaza 18+ gösterir, içerik açıklamaları
anket cevaplarından gelir (https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/, 4 Eki 2026).

<!-- age:start -->
| Soru | Cevap | Gerekçe |
|---|---|---|
| Parental Controls | No | Uygulamada ebeveyn denetimi yok |
| Age Assurance | No | Yalnız doğum yılı beyanı var (K-225); yaş doğrulama mekanizması değil |
| Unrestricted Web Access | No | Uygulama içinde serbest tarayıcı yok; yalnız yasal sayfalar ve Apple'ın abonelik sayfası açılır |
| User-Generated Content | No | Kullanıcılar arası içerik paylaşımı yok; notlar ve koç soruları yalnız kullanıcının kendisine |
| Social Media | No | — |
| Social Media Disabled for Users Under 13 | No (uygulanmaz) | Sosyal özellik yok |
| Messaging and Chat | No | Kullanıcılar arası mesajlaşma yok; koç ekranı kurallı yanıt verir (AI açılınca da kişiler arası değil) `[doğrulanmadı: Apple'ın tanımı AI sohbetini kapsıyor mu — M10'da bak]` |
| Advertising | No | Reklam yok |
| Profanity or Crude Humor | None | — |
| Horror/Fear Themes | None | — |
| Alcohol, Tobacco, or Drug Use or References | None | Besin veritabanında alkollü içecek kalemleri olabilir (USDA); referans değil, kayıt. `None` |
| Medical or Treatment Information | None `[doğrulanmadı]` | U6: teşhis, hastalık adı, tedavi dili yok; kan tahlili yorumlanmaz. Ama Apple'ın tanımı geniş ("guidance around the management of medical conditions or health and wellness … emergency medical care") ve uygulamada üç yer var: yeme düzeni kontrolü ve destek hattı yönlendirmesi (`scoff.tsx`), düşük enerji güvenlik durağında "doktorunla konuş", "In pain … see a professional" durumu → "Infrequent" (13+) savunulabilir. 18+ override ile görünen derece değişmez; M10'da Levent'le seçilir |
| Health or Wellness Topics | **Frequent** | Kalori takibi, diyet ve egzersiz önerisi uygulamanın ana işi (Apple'ın tanımı birebir) → 9+ |
| Mature or Suggestive Themes | None | — |
| Sexual Content or Nudity | None | İlerleme fotoğrafları kullanıcının kendi cihazında, uygulama içeriği değil |
| Graphic Sexual Content and Nudity | None | — |
| Cartoon or Fantasy Violence | None | — |
| Realistic Violence | None | — |
| Prolonged Graphic or Sadistic Realistic Violence | None | — |
| Guns or Other Weapons | None | — |
| Gambling | No | — |
| Simulated Gambling | None | — |
| Contests | None | — |
| Loot Boxes | No | — |
<!-- age:end -->

## 3. Erişilebilirlik Besin Etiketi (Accessibility Nutrition Labels) — K-807

Kaynak (5 Eki 2026): developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels —
dokuz özellik; bir özellik ancak **"users must be able to complete all of the common tasks of your app using that feature"** ise
işaretlenir. Etiket şimdilik **isteğe bağlı** ("voluntary to start"), ileride zorunlu olacak. ASC'ye Levent girer (M10, ADR-059).

**Ortak görevler (bu uygulamanın):** giriş + onboarding · günlük kayıt (tartı, antrenman seti, öğün) · haftalık karar ve "Why this call" ·
koça soru · paywall'dan abonelik · Ayarlar › abonelik iptali, dışa aktarma, hesap silme.

| Özellik | Cevap (taslak) | Gerekçe | Kanıt / eksik |
|---|---|---|---|
| Dark Interface | **Evet** | Açık/koyu iki palet, sistem ayarını izler (ADR-016); her bileşen rengi `useTheme()`'den alır | `tokens.test.ts` (renk yalnız belirteç dosyasında), `contrast.test.ts` iki temada |
| Sufficient Contrast | **Henüz işaretlenmez** | Metin her yerde ≥4.5:1 (iki tema + karar bloğunun ters paleti; uyarı rengi blokta yok). Ama Apple metin dışı öğeler (kontroller, durum) için 3:1 istiyor: alan kutusu (`surface` zeminde, 1.12), seçili olmayan çip kenarı (`line`, 1.27–1.34), seçili hareket satırı (1.12) altında | `contrast.test.ts`. **K-816:** metin dışı 3:1 (görsel dil belirteci — ADR-016, Levent onayı) + Bold Text/Increase Contrast/Reduce Transparency açık cihaz turu |
| Differentiate Without Color Alone | **Evet (cihazda teyit)** | Seçili çip dolu/çerçeveli (şekil) + VoiceOver "selected"; yapılan set işaretli (✓) ve "done" diye okunur (K-807 inceleme: önce yalnız renkti); uyarılar ve kararlar metinle; güç grafiğinde "daha kolay" haftalar halka | `set-table.test.tsx`; cihazda Grayscale'de ortak görevler |
| Reduced Motion | **Evet (cihazda teyit)** | Uygulamanın kendi hareketleri (koçta son mesaja kaydırma, barkod sayfasının kayması) Reduce Motion açıkken anında olur (`useReduceMotion`); başka animasyon yok (test). Yerel ekran geçişleri tek eksenli kaymadır — Apple'ın sorunlu saydığı derinlik/paralaks, çok eksenli, dönen ve sürekli hareketlerden değil; Reduce Motion'da değişip değişmedikleri [doğrulanmadı] | `accessibility.test.ts`, `reduce-motion.test.tsx`; cihazda Reduce Motion açık tur |
| Larger Text | **Henüz işaretlenmez** | Kod hazır: ölçekleme kapatılmamış, kesme yok (`allowFontScaling`, `maxFontSizeMultiplier`, `numberOfLines`, `adjustsFontSizeToFit` yasak — test). Apple: AX3'te ≥%200, yan yana öğeler büyüyünce alt alta | **Cihaz:** en büyük boyutta (AX5) ortak görevler, taşan satır var mı (K-308 sonrası) |
| VoiceOver | **Henüz işaretlenmez** | Her `Pressable` rol + (etiket ya da okunacak metin); her görsel adlı ya da süs; kontrol, erişilebilir yapılmış bir öğenin içinde değil (iOS gizler); `Text`/`View` üzerinde `onPress` yok; ham `TextInput`/`Switch` adlı. Koç cevabı, "düşünüyor" ve eylem hataları (kaydetme, silme, uygulama, rıza) belirince VoiceOver'a duyurulur (`ProblemText`, `announce` — K-815); düz `Text` ile çizilen hata satırı kaynak taramasında yakalanır | `accessibility.test.ts`, `announcements.test.tsx`; **K-815** cihaz turu |
| Voice Control | **Henüz işaretlenmez** | Etiketler Voice Control'ün "Tap …" komutuna da isim verir | **Cihaz:** ortak görevler sesle |
| Captions | **Uygulanamaz (işaretlenmez)** | Uygulamada sesli içerik yok: hareket klipleri sessiz kesilir (`tools/clip.py`, `-an`) | — |
| Audio Descriptions | **Hayır** | Hareket kliplerinde anlatım yok; yazılı ipuçları (`demo.tip.*`) var ama Apple'ın tanımı zaman eşlemeli sesli anlatım | M11 adayı |

**Cihaz kontrol listesi — K-815 (K-308 sonrası, agent simülatörde + Levent cihazda):**
1. Ayarlar › Erişilebilirlik › Ekran ve Metin Boyutu › Daha Büyük Metin › en büyük (AX5): giriş, Today, kayıt (tartı/set/öğün), karar kartı + Why, koç,
   paywall, Ayarlar — kesilen, üst üste binen ya da ekrandan taşan metin yok; yan yana öğeler alt alta iniyor.
2. VoiceOver açık: aynı ortak görevler baştan sona; her düğme adını ve rolünü söylüyor; karşılaştırma kaydırıcısı yukarı/aşağı kaydırmayla.
3. Reduce Motion açık: koçta yeni mesaj ve barkod sayfası hareketsiz; yerel geçişlerin ne yaptığı not edilir.
4. Bold Text + Increase Contrast + Reduce Transparency açık, iki temada: okunmayan metin yok.
5. Grayscale: seçili çip, uyarı, karar durumu renksiz de ayırt ediliyor.
Simülatörde 1, 3, 4, 5 yapılabilir (`xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`); VoiceOver yalnız cihazda
(simülatörde Accessibility Inspector). Giriş Apple ile olduğundan oturumlu ekranlar cihaz ya da çalışan bir sunucu ister.
