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
