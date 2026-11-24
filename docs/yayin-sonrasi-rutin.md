# Yayın sonrası rutin (K-1210)

Tek kişilik ekip için: Next Call yayındayken neye, ne sıklıkla, hangi eşikte bakılır. Apple kuralları 25 Kasım 2026'da resmî sayfadan okundu;
okunamayanlar **[doğrulanmadı]**. Antigravity ham notu (`arastirma/ham/tur3-openai-turkomp-yayin-2026-11-25.md` §3) yalnız ipucu: teklif kodu
kotası orada "çeyrekte 150.000" yazıyor, Apple sayfası **1 milyon** diyor; ham not yanlış.

## 1. Her gün (5 dk)
- [ ] ASC › Apps › Next Call › **Ratings and Reviews**: yeni yorum var mı (bölüm 5).
- [ ] ASC › **TestFlight › Crashes** ve Xcode Organizer: yeni çökme grubu var mı. Sayı eşiği yok; yeni grup = karta çevir.
- [ ] RevenueCat (proje "Next Call") › **Overview**: yeni deneme, iade, ters giden bir şey var mı.
- [ ] Destek e-postası. Sunucu sağlığı için ayrı bir şey yok; `docker ps` ancak şikâyet gelirse.

## 2. Her hafta (30 dk, pazartesi)
- [ ] `ssh keel-vps /opt/keel/deploy/weekly-report.sh` (öncü göstergeler, ADR-081; bölüm 7).
- [ ] RevenueCat: deneme → ücretli dönüşüm, aktif abonelik, iptal ve iade (bölüm 7).
- [ ] ASC › **Analytics**: gösterim, ürün sayfası görüntüleme, indirme; geçen haftayla kıyas.
- [ ] ASC › **Sales and Trends**: net indirme, yenileme.
- [ ] Açık Dependabot PR'ları (CLAUDE.md kuralı), `DURUM.md` güncel mi.
- [ ] Haftanın tek kararı: ne düzeltilecek, kart olarak `plan/backlog.yaml`'a.

## 3. Her sürümde
| Adım | Not |
|---|---|
| Kod kapıları yeşil, EAS production build, TestFlight'ta cihaz turu | `docs/eas-derleme.md` |
| Sürüme build'i **bağla** | build değişince yeniden gönder |
| **Abonelik grubu + abonelikler aynı gönderimde** | 6 Kas reddi (2.1(b)): gönderimi geri çekmek ya da build değiştirmek ilk abonelikleri gönderimden düşürdü. Yeniden gönderirken sürüm + grup + abonelikler **tek taslakta** (DURUM, 7 Kas) |
| App Review notu | hesap silme yolu (paywall › Account › Delete account), test hesabı, SANDBOX açık (1.0.1 incelemesi sandbox satın alır, ADR-080 Ek 1); önceki red varsa en başa "RESUBMISSION" |
| Ekran görüntüsünde fiyat/ücretsiz deneme yok | 2.3.7 reddi (28 Eki) |
| **Phased Release** aç | Sürüm sayfası › "Phased Release for Automatic Updates" › 7 günlük seçenek › Save. Gün 1-7: %1, 2, 5, 10, 20, 50, 100. Yalnız otomatik güncelleme açıklar; elle güncelleyen hemen alır. En çok 30 gün duraklatılır. Yayın şekli bizde ELLE: Release düğmesi Levent'te. [kaynak](https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases) |
| Yayından sonra ilk 48 saat | çökme ve RevenueCat'e her gün bak; ciddi sorun varsa **Pause**, 1.0.x düzeltme gönder |
| Bekleme uzarsa | günlerce "Waiting for Review" ise ASC › Contact Us (28 Eki dersi) |
| Anahtar kelime/ürün sayfası metni | yalnız yeni sürümle değişir [doğrulanmadı] |

## 4. Uygulamayı tanıdığa vermek
| | TestFlight dış grup | App promo kodu | Abonelik **Offer Code** |
|---|---|---|---|
| Ne verir | yayın öncesi/sonrası sürüm denemesi | ücretli uygulama kodu | abonelik erişimi (Next Call ücretsiz indirilir, abonelik şart) |
| Limit | app başına 10.000 tester | [doğrulanmadı] | app başına çeyrekte 1 milyon kod (tüm abonelikler ortak) |
| Biter | build süresi [doğrulanmadı] | [doğrulanmadı] | tek kullanımlıkta en geç 6 ay; özel kodda süresiz olabilir |
| Bize uyan | beta, sürüm testi | uymaz (uygulama ücretsiz) | **tanıdık, aile, basın** |

**TestFlight dış grup** (K-904): önce bir iç grup şart; dış gruba eklenen her build **TestFlight App Review**'a girer (sürüm başına ilk build tam
inceleme; 24 saatte en çok 6 gönderim). Public link: ASC › TestFlight › grup › Public Link, tester limiti 1-10.000 arası ayarlanır.
[kaynak](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers)

**Offer Code oluşturma**
1. ASC › **Apps › Next Call › Subscriptions** › abonelik grubu › abonelik (aylık ya da yıllık).
2. **Subscription Prices** altında **+ › Create Offer Codes** ile teklifi aç (ad, süre, uygun kitle: yeni / mevcut / süresi dolmuş abone).
3. Teklifi seç › **Create One-Time Use Codes** (parti 500-25.000, en geç 6 ay) ya da **Create Custom Codes** (ör. SPRINGPROMO, ≤64 karakter, kişi başı 1).
4. Teklif sayfasındaki bağlantıyı kopyala, tek kullanımlıkta koda ekle; CSV'de hazır bağlantılar var.

Kurallar: uygunluk teklif açılırken seçilir, sonradan **düzenlenmez**; kod düzenlenmez; kodlar oluşturulduktan en çok 1 saat sonra çalışır; uygulama
Ready for Sale olmalı; deaktive edilen teklif geri açılmaz, kullanılmamış kodlar kotaya dönmez; rol: Account Holder, Admin, App Manager, Marketing.
Deneme/ücretsiz süre bitince normal fiyattan yenilenir mi, teklifin türüne (free/pay up front) bağlı: açarken oku. Bizim ürün adında 2 haftalık
deneme zaten var; kod bunun yerine **uzun süre** vermek içindir.
[kaynak](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-offer-codes) · Koda göre RevenueCat'te `premium`
görünür; sunucu erişimi RevenueCat webhook'u verir, elle premium işareti yok.

## 5. Yorumları okumak ve yanıtlamak
ASC › Apps › Next Call › **Ratings and Reviews** (yanıt: rol Admin ya da Customer Support, yorumun altında Reply). Yanıt herkese açıktır;
yorumcuya bildirim gider, yorumunu güncelleyebilir; yanıtı istediğin zaman düzenlersin.
[kaynak](https://developer.apple.com/app-store/ratings-and-reviews/) · [rol/ASC](https://developer.apple.com/help/app-store-connect/monitor-ratings-and-reviews/ratings-and-reviews-overview/)
- Sıra: en düşük puan ve teknik sorun bildirenler önce; kısa, somut, kişiye özel.
- **Ton (anayasa U7):** suçlama, utandırma yok. "Yanlış kullanıyorsunuz", "yazmıştık" yok; "bunu düzeltiyoruz, 1.0.x'te" var.
- Tıbbi dil, kilo/yağ vaadi, sayı yok (U4-U6). Kişisel veri istenmez; indirme/fatura sorunu → Apple Support'a yönlendir.
- Hakaret, spam: yanıtlama, **Report a Concern**. Yanıtlarda ürün adı dışında kişi adı yok.
- Düzeltilen şikâyeti sürüm notuna yaz, sonra yorumcuya haber ver.

## 6. Puan isteme
Sistem penceresi `requestReview` ile gelir; yılda en çok 3 kez, gösterilip gösterilmediğini bilemezsin, zorlayamazsın.
Kural kümesi (3/365 gün, tetik yeri, ödül/kapılama yasağı) Apple sayfası bu oturumda okunamadığı için **[doğrulanmadı]**; yayın öncesi
[API sayfasını](https://developer.apple.com/documentation/storekit/requestreview) elle oku. Bizim kural (K-1006): değer anında (kullanıcı
haftalık kararını gördükten ve uyguladıktan sonra), açılışta, hata sonrası ya da işlem ortasında değil; puan için ödül yok; "beğendin mi?"
ön sorusu yok; ayarlarda ayrıca "Write a review" bağlantısı olabilir (`?action=write-review`) [doğrulanmadı].

## 7. Hangi sayı, hangi eşik
Eşikler benim önerim, ölçülmüş değil: ilk 4 haftanın gerçek sayısıyla **yeniden ayarla** ve burada güncelle. Dış kıyas (RevenueCat denemeden
ücretliye %35-50, aylık churn <%8, iade <%2, çökmesiz oturum >%99,8) ham notta kaynaksız: **[doğrulanmadı]**, hedef değil.

| Sayı | Nerede | Bak | Eşik (öneri) → ne yap |
|---|---|---|---|
| Yeni çökme grubu | ASC/Organizer | günlük | 1 tane bile, onboarding/paywall/kayıtta → aynı gün kart; sürüm yeni çıktıysa Phased Release **Pause** |
| İade | RevenueCat | günlük | haftada 2+ → paywall metni ve deneme anlatımı yanıltıyor mu bak |
| Deneme → ücretli | RevenueCat Charts | haftalık | 20+ deneme bitince oran %20'nin altı → paywall/fiyat kararı (Levent'in) |
| Aktif abonelik, iptal | RevenueCat | haftalık | iptal, yeni abonelikten fazla iki hafta üst üste → sebebi ara (yorum, hafta-2 sayısı) |
| Ürün sayfası → indirme | ASC Analytics | haftalık | iki hafta düşüş → ekran görüntüsü/metin; değişiklik yeni sürüm ister |
| Hesaptan ilk karara kadar gün (mediyan, "ulaşan" sayısıyla) | weekly-report | haftalık | 3 günü aşarsa onboarding'de takılma var; ulaşan sayısı küçükse yorumlama |
| 2. hafta retention | weekly-report | haftalık | önceki haftanın yarısına inerse bildirim ve ilk hafta deneyimine bak |
| Planı değişince gören % | weekly-report | haftalık | düşükse ürünün tezi (karar veren koç) kullanıcıya ulaşmıyor: kart |

`weekly-report.sh` salt okunur, toplamdır; 5 kişiden küçük grup sayı göstermez (ADR-081), yani ilk haftalarda çoğu hücre boş çıkar.
Boş hücreden sonuç çıkarma.
