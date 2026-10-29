# Evre 7: Rakip UX kalıpları (gıda + antrenman)

Tarih: 2026-10-30. Amaç: keel'in ortalama ABD kullanıcısının beklediği ve "modern" hissettiren kalıpları çıkarmak. Bu dosya ham araştırmadır; karar ADR ile verilir.

## Yöntem ve etiketler

- Kaynaklar: App Store sayfaları ve iTunes Lookup API (sürüm, tarih, puan, release notes, açıklama), resmî help merkezleri, MacroFactor/Cronometer/Hevy resmî sayfaları, Reddit thread'leri (ego-browser ile, oturum açık tarayıcıdan okundu), WebSearch özetleri.
- WebFetch sonuçları küçük model özetidir. UI etiketleri birebir olmayabilir; tırnaklı etiketler sayfada geçen ifadeler olarak alınmalıdır, yine de ürün öncesi doğrulanmalı.
- `[arama özeti]`: sayfa açılmadı, yalnızca arama sonucu özetinden alındı.
- `[doğrulanmadı]`: kaynak bulunamadı, erişilemedi (403/410), çelişiyor ya da yalnızca rakip blogdan geliyor.
- Hiçbir dokunuş sayısı ölçülmedi. Tablo 1.3'teki sayılar akıştan tahmindir.
- Reddit ve forum yorumları tek kişinin görüşüdür; eğilim değil, kullanıcı sesi olarak okunmalı.

## 0. Bağlam: App Store durumu (2026-10-30, iTunes Lookup)

| Uygulama | Puan | Puanlama sayısı (yaklaşık) | Son sürüm | Kaynak |
|---|---|---|---|---|
| MyFitnessPal | 4.71 | 2,39 M | 26.43.0, 2026-10-27 | https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718 |
| Cal AI | 4.80 | 373 K | 26.43.0, 2026-10-27 | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| Lose It! | 4.77 | 783 K | 18.5.801, 2026-10-26 | https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629 |
| MacroFactor | 4.84 | 23,6 K | 5.8.9, 2026-09-24 | https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 |
| MacroFactor Workouts | 4.84 | 4,8 K | 1.4.1, 2026-10-03 | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Cronometer | 4.77 | 100 K | 4.60.1, 2026-10-22 | https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738 |
| Hevy | 4.92 | 101 K | 3.2.4, 2026-10-28 | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 |
| Strong | 4.86 | 108,5 K | 6.5.1, 2026-10-08 | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Fitbod | 4.81 | 288,5 K | 8.38.0, 2026-10-27 | https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543 |
| Ladder | 4.95 | 214 K | 4.15.0, 2026-10-22 | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 |

Not: MyFitnessPal, 2026 ortasında diary'yi "Today" ana ekranına taşıdı. Bu değişikliğe karşı Reddit'te en çok oy alan şikâyet thread'i (218 oy) açıldı (bkz. 1.4). Ekim 2025 güncellemesi ayrı bir şikâyet dalgası yarattı. Bu, "bilinen kalıbı bozmak" riskinin somut örneğidir.

---

## 1. GIDA LOGLAMA

### 1.1 Kalıplar (pattern · uygulamalar · neden işe yarar · kaynak)

| Kalıp | Uygulamalar | Neden işe yarar | Kaynak |
|---|---|---|---|
| Öğün bölümü (Breakfast, Lunch…) satırında "Log" butonu; tıklayınca o öğünün önerileri ve aramasına gider | MyFitnessPal (Today) | Öğün bağlamı akışta kaybolmaz; "hangi öğün?" sorusu sorulmaz | https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab |
| Öğün satırında sağa kaydırma: son o öğünde loglanan yiyecekleri tek jestle geri getirir | MyFitnessPal (Today) | "Dünkü öğün" en sık tekrar eden işlem; arama gerektirmez | aynı URL |
| "View All / View Diary": günün tüm öğünleri tek listede | MyFitnessPal (Today) | Günlük tüm kalemleri görme ihtiyacı; ama kullanıcılar bunu ikinci adım olarak buluyor (bkz. 1.4) | aynı URL |
| Saat bazlı giriş: günlük zaman çizelgesinde saatin yanında "+"; saat önerileri ("1pm Go-Tos") | MacroFactor | Öğün adı yerine saat; öğünler arası esneklik, öneri saatin alışkanlığından gelir | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Arama açılınca boş ekranda: Favorites bar (üstte), saat önerileri, "Latest" | MacroFactor | Yazmadan 1-2 dokunuşla ekleme; aramaya yazı yazmak gerekmez | aynı URL |
| Yazınca sonuçlar kaynağa göre gruplanır: "From History", "Custom", "Common", "Branded"; "+15" ile daha fazlası | MacroFactor | Kullanıcının kendi geçmişi ilk gelir; marka gürültüsü sona düşer | aynı URL |
| Yiyecek kutusundaki küçük "+": detay açmadan plate'e ekler | MacroFactor | Tek dokunuşla ekleme; detay isteğe bağlı | aynı URL |
| Favori: arama → yiyecek detayı → kalp ikonu; kaydedilen porsiyon favoriye gider | MacroFactor | Porsiyonla birlikte kaydedildiği için favori tek dokunuşta doğru miktarı verir | https://macrofactor.com/favorite-foods/ (Updated March 4, 2025) |
| Aynı yiyeceğin birden çok preset'i (ör. 12 oz ve 16 oz latte) | MacroFactor | Aynı yiyeceğin farklı porsiyonları ayrı tile olur | https://macrofactor.com/favorite-foods/ |
| Favori sıralama: Library → Favorites → sağ üst reorder → sürükle | MacroFactor | Favoriler kullanıcının kendi listesi olur | https://macrofactor.com/favorite-foods/ |
| Arama sekmeleri: All / Favorites / Common Foods / Supplements / Brands / Restaurants / Custom; dişli ikonu ile Source, Category, Language filtreleri | Cronometer | Sekmeler sonucu daraltır; kaynak güvenilirliği kullanıcıya gösterilir | https://support.cronometer.com/hc/en-us/articles/360018193011 |
| Klavye akışı: arama kutusunda Tab → en iyi sonuç seçilir, odak miktar kutusuna geçer; Tab → ölçü listesi; Enter → ekler | Cronometer | Güç kullanıcı için en hızlı yol; fare/klavye ile tam kontrol | https://support.cronometer.com/hc/en-us/articles/360018193011 |
| Favori: Cronometer destek sayfasında "marking a food as a favorite" ile Favorites sekmesinde bulunur; forumda sonuç satırındaki yıldız anlatılıyor | Cronometer | Yıldız, sonuç satırında | https://support.cronometer.com/hc/en-us/articles/360018193011 (sekme); yıldız için forum [arama özeti, doğrulanmadı]: https://forums.cronometer.com/discussion/comment/5017 |
| Porsiyon: yiyecek detayında unit + quantity; plate'te yiyeceğin yanındaki kutuya dokunarak değiştirme | MacroFactor | Porsiyon düzenlemesi ekleme sonrası da yapılabilir | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Gram seçeneğinin her zaman olması (kullanıcı yorumu: "always have a grams weight option") | MacroFactor | Ölçü birimi tutarsızlığını azaltır | https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 (2023 yorumu) |
| Barkod + etiket: "Scan" → barkod eşleşirse ad ve makro; etiket okunabilir → units/quantity → "Add" veya "Log Foods" | MacroFactor | Barkod ve etiket aynı akışta | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Barkod bulunamazsa: kullanıcı kendi barkod verisini ekleyebilir | MacroFactor | "Miss" durumunda kullanıcı yolu var; yorum 2023 tarihli | https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 (2023 yorumu) |
| Barkod: "best in class barcode scanner", 50 M+ yiyecek veritabanı iddiası | Lose It! | Pazarlama iddiası; doğrulanmadı | https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629 (satıcı açıklaması) |
| Quick Add: Energy, Protein, Fat, Carbs, Alcohol alanları; isim opsiyonel; "Log Foods" ya da "Quick Add" (plate'e) | MacroFactor | Hızlı makro girişi; ancak Quick Add aramada kaydedilmez | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Quick Add yorumu: serbest düzenleme, kendi değerlerini girme | Cal AI | Tahmini değeri elle düzeltme, "adjust freely" | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 (09/15/2025 yorumu) |
| Kayıtlı öğün (saved meal) oluşturma: "More" → "Save Meal" | MyFitnessPal | Çok kalemli öğünü tek kayıt yapar | https://blog.myfitnesspal.com/copy-and-remember-meals/ [blog; "Save Meal" etiketi arama özetinde, tam sayfa açılmadı] |
| Kayıtlı öğün kopyalama: iOS'ta "+" → My Meals → öğün → Copy → düzenle → Save; Android'de üç nokta → Copy Meal | MyFitnessPal | Varyasyon üretmek için kopya | https://support.myfitnesspal.com/hc/en-us/articles/360032622131-How-do-I-copy-a-meal-from-one-day-to-another [arama özeti] |
| Kayıtlı öğün loglama: kayıtlı öğün diary'de tek tek yiyecekler olarak görünür, öğün adıyla değil | MyFitnessPal | Diary'nin "gerçek kalemler" içermesi | https://support.myfitnesspal.com/hc/en-us/articles/360032625331-Create-find-and-log-your-saved-meals [arama özeti] |
| Kayıtlı öğünün sadece web'de ekleme ile yapılması (Food → Add Food → Meals → Add Checked) | MyFitnessPal | Web'de yerleşik akış | https://support.myfitnesspal.com/hc/en-us/articles/360032625331-Create-find-and-log-your-saved-meals [arama özeti] |
| Öğün kopyalama (uygulamada): öğün başlığındaki ••• ile loglanmış öğünü başka öğüne kopyala | MyFitnessPal | Aynı günün başka öğününe kopya | https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab [arama özeti] |
| Kopyalama + Explode: recipe tek kalemden bileşenlere açılır (Cronometer: diary'de sağ tık → "Explode"; MacroFactor: recipe "Expand Ingredients") | Cronometer, MacroFactor | Recipe'yi tek kalem gibi logla, gerektiğinde bileşen düzelt | https://forums.cronometer.com/discussion/4217/how-can-you-add-foods-without-adding-it-to-your-diary [arama özeti]; https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Farklı güne/saate loglama: plate'in üstündeki takvim ikonu → gün ve saat → "Log to Date and Time" | MacroFactor | Geriye dönük loglama tek akış | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Log-again / Copy diary: Cronometer'da "Copy & Paste" yardım başlığı | Cronometer | Gün kopyalama var; ayrıntı açılmadı | https://support.cronometer.com/hc/en-us/articles/360018193011 (sidebar başlığı) [doğrulanmadı: içerik] |
| Fotoğrafla loglama: fotoğraf → sonuç (kalemler) → düzenle → kaydet; kalemler ayrı ayrı ayarlanır | Cal AI | "Tek çekim" ile ilk değer; ancak doğruluk tartışmalı (bkz. 1.4) | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 (How to use: "Snap a photo of your meal"); akış ayrıntısı [arama özeti: https://aumiqx.com/ai-tools/cal-ai-app-review-nutrition-tracker-2026/] |
| Fotoğraf loglama Premium ile: "FOOD SCANNING ANALYSIS RESULTS REQUIRE A SUBSCRIPTION" | Cal AI | Abonelik fotoğraf analizinin önünde | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| Metinle loglama: "Describe" → metin veya sesle tarif → "Find Foods" → plate'te gözden geçir → "Log Foods"; fotoğraf kullanılmaz | MacroFactor | AI'ın yapılandırdığı, kullanıcının onayladığı liste | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Sesle loglama: "Say It" ve "Snap It" (fotoğraf); "98% accuracy" pazarlama iddiası; App Store'da "This Fall, Try Voice Logging" | Lose It! | Sesli giriş; doğruluk satıcı iddiası | https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629 (What's New/editör bloğu) |
| Snap It/Say It ücretsiz mi Premium mu: kaynaklar çelişiyor. Basın bülteni (2025) ücretsiz deneme diyor; güncel App Store'da Premium özellikleri arasında [arama özeti] | Lose It! | Kafa karışıklığı; ürün kararı için ayrıca bakılmalı | https://www.accessnewswire.com/newsroom/en/publishing-and-media/lose-it-finds-ai-powered-logging-boosts-weight-loss-success-and-greater-nutritional-mindfulness [2025]; [doğrulanmadı: 2026 durumu] |
| AI Coach (MyFitnessPal) | MyFitnessPal | Koçluk katmanı App Store açıklamasında öne çıkarılıyor; ekran kalıbı doğrulanmadı | https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718 |
| Yiyecek sekmesi "Recent/Frequent" MyFitnessPal'da: "Log" → önce son ve sık öğeler, sonra arama | MyFitnessPal | Aynı kalıp; kişiselleştirilmiş önce | https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab |
| Lose It "Previous Meals" listesi, "My Foods", "Add to Log" | Lose It! | Tek kaynak üçüncü taraf blog; resmî help erişilmedi (loseit.com erişime kapalı) | https://www.recime.app/blog/?p=15120 [doğrulanmadı] |

### 1.2 Öğün seçimi ve zaman bağlamı

- MyFitnessPal: öğün seçimi Today ekranında öğün satırına göre yapılır; ekle akışında öğün sorulmaz (help: "Tap Log next to any meal section").
- MacroFactor: öğün yerine saat. Saat önerileri ("1pm Go-Tos") bu saatte daha önce loglanan yiyecekleri gösterir (help).
- Cronometer: ekle akışında "Diary Group" seçilir. Kullanıcılar "recent foods öğüne göre ayrılmıyor" diye şikâyet ediyor; yanıt olarak grup başlığında "Sort Group by time" öneriliyor (forum, doğrulanmadı: https://forums.cronometer.com/discussion/comment/21619).
- Lose It: öğün zamanına göre öneri davranışı [doğrulanmadı].

### 1.3 Dokunuş sayısı (tahmin, ölçülmedi)

| En sık log | Yol | Tahmini dokunuş |
|---|---|---|
| Dünkü öğünü tekrar (MyFitnessPal) | Öğün satırında sağa kaydır | 1 jest |
| Favori yiyecek (MacroFactor) | Arama ekranı açık → Favorites bar → tile | 2 (ekranı açma + tile) |
| Son yiyecek (MacroFactor) | Arama → Latest → "+" | 2 |
| Yeni arama (Cronometer, klavye) | Add Food → yaz → Tab → Enter | 2 + yazma |
| Barkod (MacroFactor) | Scan → barkod eşleşir → Add | 2-3 |

Kaynak: yukarıdaki akış tarifleri; sayılar tahmindir.

### 1.4 Şikâyet ve övgüler (gıda)

| Uygulama | Övgü | Şikâyet | Kaynak |
|---|---|---|---|
| MyFitnessPal | Meal planner, favoriler, özelleştirilebilir nutrient dashboard (App Store yorumu, 04/16/2025: "insert my own recipes or food favorites to make it easy") | Today ekranı diary'yi bölüyor: "... and 8 more", tek tek büyük kartlar, bir ekranda 7 öğe (eskiden 12); "View all" ikinci adım; menü ikonu ("person") standart dışı (Reddit, ~6 ay önce; 218 oy, 54 yorum) | https://www.reddit.com/r/Myfitnesspal/comments/1su1sgi/why_the_app_facelift_sucks/ |
| MyFitnessPal | Uzun süreli kullanıcılar veriyi koruyor | Ekim 2025 güncellemesi: "stutters, duplicates or misses food"; yorumda arama kütüphanesinin sıfırlandığı (tek kullanıcı, doğrulanmadı) | https://www.reddit.com/r/Myfitnesspal/comments/1piq07d/they_ruined_the_mfp_app/ |
| MyFitnessPal | - | Mart/Nisan 2026 redesign sonrası puan düşüşü iddiası (mwm.ai, 410 Gone; diğer kaynaklar çelişiyor) | [doğrulanmadı] https://mwm.ai/articles/myfitnesspal-v26-16-0-replaces-diary-with-new-ui-sparking-rating-drop-in-april-2026 |
| MacroFactor | "Logging food is faster and easier so I don't mind doing it" (2023); "enter the food by time of day"; gram seçeneği | Reddit başlıkları (içerik açılmadı): "'To Custom' and serving size", "Scan result has limited units", "What is the meaning with the AI photo search function?" | https://www.reddit.com/r/MacroFactor/ (arama); yorumlar: https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 |
| MacroFactor | 2025 yeniden tasarım: yeni yemek ikonları, daha iyi ikon eşleme, onboarding ve haftalık check-in illüstrasyonları (geliştirici yanıtı) | — | https://www.reddit.com/r/MacroFactor/comments/1niphf6/a_new_look_for_a_new_chapter_and_a_first_look_at/ |
| Cal AI | Kamera ile dışarıda yemek; barkod + etiket; makroları serbestçe düzenleme; yemek hatırlama (09/15/2025 ve 06/16/2025 yorumları) | "It's good, BUT beware inaccurate more times than not" başlığı; yüklenirken yemek kayboluyor (06/16/2025); adım verisi "zero" (09/15/2025) | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| Cal AI | Doğruluk tartışması | Cal AI doğruluğu için Reddit'te doğrudan thread bulunamadı. Fotoğraf-app çalışması başlığı: "Photo Calorie Apps Underestimate Calories and Fat" (27 Temmuz 2026). Test edilen uygulamalar ve Cal AI'nın dahil olup olmadığı açılamadı | https://www.healthday.com/health-news/nutrition/how-accurate-are-photo-based-calorie-apps-4-are-put-to-the-test [başlık; Cal AI adı geçmiyor] |
| Lose It! | Editör notu: barkod, aranabilir yaygın market listesi, restoran veritabanı, sosyal özellikler | Reklam ve Premium sürtünmesi iddiası (rakip blog, doğrulanmadı) | https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629 (editör notu); https://nutrola.app/en/blog/lose-it-got-worse-after-update [rakip blog, doğrulanmadı] |
| Cronometer | Doğruluk ve veritabanı (1,1 M doğrulanmış yiyecek iddiası); "much better value than MFP" başlığı | "Please surface recent foods first" (forum, birden çok yıl); recent listesi tutarsız; öğüne göre recents yok | https://forums.cronometer.com/discussion/comment/14542/ ; https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738 |

---

## 2. ANTRENMAN

### 2.1 Kalıplar (pattern · uygulamalar · neden işe yarar · kaynak)

| Kalıp | Uygulamalar | Neden işe yarar | Kaynak |
|---|---|---|---|
| Başlangıç: "+ Start Empty Workout" (Workout sekmesi) | Hevy | Tek dokunuşla antrenmana geçiş | https://www.hevyapp.com/features/track-workouts/ (WebFetch özeti) |
| Başlangıç: serbest kütüphane, "a full split or individual workouts"; "No program? No problem" | Hevy | Program yokken de başlanabilir | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 |
| Başlangıç: her gün yeni program (Ladder); haftalık plan | Ladder | Plan kendi kendine gelir; ama program kararı uygulamada | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 |
| Başlangıç: Workout sekmesinde "Swap" ve "Start Workout" kilidi (başlamadan düzenleme yapılabilir; Start'ta kilitlenir) | Fitbod | Düzenleme ile başlamayı ayırır | https://help.fitbod.me/hc/en-us/articles/38318585683991-Customizing-Today-s-Workout [arama özeti] |
| Set satırı: ağırlık + tekrar + "PREVIOUS" (önceki performans) | Hevy | "Geçen seferki" referansı girişi hızlandırır | https://www.hevyapp.com/features/track-workouts/ ; App Store: "See last session's weights and reps for every exercise, right where you need them" https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 |
| Önceki değer ayarı: önceki performansı hangi antrenmandan olursa olsun göster | Hevy | Rutin dışı egzersizde de referans | https://www.hevyapp.com/features/workout-settings/ [arama özeti] |
| Set ekleme: "+ Add Set"; silme: sola kaydır → Delete | Hevy | Standart iOS kalıbı | https://www.hevyapp.com/features/track-workouts/ |
| Tamamla → rest timer otomatik başlar (set "completed" olunca) | Hevy | Ayrı "başlat" dokunuşu yok | https://www.hevyapp.com/features/workout-rest-timer/ |
| Rest süresi: 5 sn–5 dk; egzersiz başına ayrı; "-15" / "+15" ile düzenleme; "off" | Hevy | Ağır birleşikte uzun, izolasyonda kısa | https://www.hevyapp.com/features/workout-rest-timer/ |
| Varsayılan rest: Profile → Settings → Workouts → Default Rest Timer | Hevy | Global varsayılan; egzersiz başına değişir | https://www.hevyapp.com/features/workout-rest-timer/ |
| Rest bittiğinde bildirim (ses/titreşim belirtilmemiş) | Hevy | Haptic/ses ayrıntısı doğrulanmadı | https://www.hevyapp.com/features/workout-rest-timer/ [haptic: doğrulanmadı] |
| Live Activity (iOS/Android): sonraki set, hedef ağırlık/tekrar, süre, rest sayacı, önceki performans; kilit ekranından "set complete"; rest ±15 sn; atla | Hevy | Telefonu açmadan akış; "without unlocking your phone" | https://www.hevyapp.com/features/live-activity/ |
| Otomatik rest sayacı (Strong): "Auto Countdown Timer" | Strong | Hevy ile aynı kalıp | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Set etiketleri: Warm Up, Failure, Drop Sets; superset | Strong | Set türü ayrımı, hacim doğruluğu | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Set etiketleri: "Track different weights and reps on your right and left sides" (tek taraflı), supersets, partial reps, myoreps, RIR | MacroFactor Workouts | Tekniğe özgü ayrıntı | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Plate calculator: Strong "for when the weights get high" + Warm Up Calculator | Strong | Bar ağırlığı ve plaka dökümü | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Plate calculator: "based on available plates and bars" (salon profili) | MacroFactor Workouts | Ekipman tabanlı plaka hesabı | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Plaka yuvarlama: "rounds to plate-able weights, accounts for the bar" (2026 review) | Fitbod | Yuvarlama ekipmana göre | https://www.techradar.com/health-fitness/fitbod-app-review [arama özeti] |
| Apple Watch: Strong watch kendi başına çalışır ("without my phone") | Strong | Telefonsuz set kaydı | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 (yorum 2021) |
| Apple Watch: Fitbod swap için telefona dönmeyi gerektiriyor (kullanıcı) | Fitbod | Kötü örnek | https://www.techradar.com/health-fitness/fitbod-app-review [arama özeti] |
| Egzersiz değiştirme (Replace): Hevy Trainer'da ••• → 4 öneri üstte, kütüphane altta; "kalıcı mı?" sorusu | Hevy Trainer | Program bütünlüğünü korur | https://www.hevyapp.com/features/workout-plan-generator/ [arama özeti] |
| Egzersiz değiştirme: sola kaydır → Replace; filtre: Best Replacements, Your Most Logged, Your Least Logged, Never Logged; ekipman filtresi | Fitbod | Sıralama kullanıcı geçmişine göre | https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod [arama özeti] |

| Egzersiz değiştirme: ••• → Recommend More Often / Less Often / Don't Recommend Again | Fitbod | Tercih sinyali algoritmaya gider | https://help.fitbod.me/hc/en-us/articles/16254175592215 (Q&A) ve https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod [arama özeti] |
| Egzersiz değiştirme: "easily swap exercises with smart suggestions" | MacroFactor Workouts | Akıllı öneri | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Egzersiz değiştirme (kullanıcı): ağırlık yerine body weight veya cable; koç öneri yapabilir | Ladder | Ekipman yoksa alternatif, koçtan | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 (yorum 05/26/2025) |
| Egzersiz ekleme: alt kısımda "+ Add Exercise" (mavi); arama ve filtreler | Hevy | Antrenman içinden ekleme | https://www.hevyapp.com/features/track-workouts/ |
| Egzersiz ekleme: kütüphane muscle group ve equipment ile filtrelenir | Hevy | Kas grubu ve ekipman kalıbı | https://www.hevyapp.com/equipment/ [arama özeti] |
| Egzersiz ekleme: video ve adım adım talimat (kütüphane) | Hevy, Strong | Form gösterimi | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 ; https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Egzersiz ekleme: "+ Add Exercise" workout ekranında; manuel ekleme algoritmaya geri bildirim | Fitbod | Tercih öğrenme | https://help.fitbod.me/hc/en-us/articles/16254175592215 |
| Gym profile (salon profili): ekipman seçimi; birden çok salon (MacroFactor Workouts) | Fitbod, MacroFactor Workouts | Ekipman tabanlı öneri ve plaka | https://help.fitbod.me/hc/en-us/articles/16254175592215 ; https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Program düzenleme: rutin ekle/seç; ücretsiz sürümde 3 özel rutin sınırı | Strong | Rutin esnekliği | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Program: "My Plan" (hedef, ekipman, program takvimi, tercihler) | Fitbod | Program ayarları tek yerde | https://help.fitbod.me/hc/en-us/sections/31812804804375-Training-Program-Goals [arama özeti] |
| Program: "Hevy Trainer" programı ekipman, deneyim ve tercihe göre üretir (Pro) | Hevy | Koç katmanı | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 |
| Program: Ladder "new workout plan every day", 5-6 haftalık bloklar | Ladder | Bloklar | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 ; https://www.garagegymreviews.com/equipment/ladder [arama özeti] |
| Program: kullanıcı "Jeff Nippard" rutinlerini içe aktarabiliyor, yeni rutinleri manuel ekleyebiliyor | MacroFactor Workouts | Hazır program kütüphanesi | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| Bitiş: "Finish" sağ üstte; özet: ad, hacim (volume load), set sayısı, süre, başlangıç saati, en fazla 3 fotoğraf, not, gizli | Hevy | Kayıt ve düzeltme bitişte | https://www.hevyapp.com/features/track-workouts/ |
| Bitiş sonucu: antrenman sıra numarası, aktif haftalık seri, o antrenmandaki PR'lar, paylaş | Hevy | Haftalık seri (günlük değil); PR görünür | https://www.hevyapp.com/features/track-workouts/ |
| Canlı PR bildirimi (ayar ile) | Hevy | Set sırasında kutlama | https://www.hevyapp.com/features/track-workouts/ |
| Paylaş: sheet ile rutin ve antrenman | Strong | Standart paylaşım | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| Paylaş: kullanıcı yorumu: paylaşım kartına uygulama tanıtımı konursa iyi olur, metne uzun reklam eklenmesi rahatsız edici | Fitbod | Paylaşımda reklam sürtünmesi | https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543 (12/09/2024 yorumu) |
| Kesinti: Fitbod'da antrenman başladıktan sonra uygulamanın geri kalanına geçilemiyor (kullanıcı) | Fitbod | Kötü örnek | https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543 (12/09/2024 yorumu) |
| Kesinti: Hevy Live Activity ile kilit ekranından set tamamlama | Hevy | Telefon kilidini açmadan devam | https://www.hevyapp.com/features/live-activity/ |
| Kesinti: duraklatma, antrenmanı iptal etme, erken bitirme | — | Bu uygulamalarda doğrulanmadı | [doğrulanmadı] |
| İlerleme: "Advanced Statistics": PR, 1RM hesabı, toplam kaldırılan ağırlık; hacim ve 1RM grafikleri | Strong | Grafik seti | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 |
| İlerleme: "Ladder Journal": set başına ağırlık ve tekrar; tahmini 1RM artışını gösterir (kullanıcı) | Ladder | Ağırlık-tekrar günlüğü | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 ; yorum 05/26/2025 |
| İlerleme: "charts and data insights" (planlayıcı + PR) | MacroFactor Workouts | Grafikler | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |
| İlerleme: kas grubu başına çalışma miktarı (analitik, kullanıcı yorumu 07/26/2025) | Hevy | Kas grubu analitiği | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 (yorum) |
| İlerleme ekranı "body map" görseli | — | Doğrulanmadı | [doğrulanmadı] |
| Haftalık seri (Hevy results ekranı); MFP'de "Streaks" görünümü (Today tab) | Hevy, MyFitnessPal | Günlük seri cezası yok; haftalık tutarlılık | https://www.hevyapp.com/features/track-workouts/ ; https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab |
| Haptics: Hevy 3.0.11 "more haptic feedback" (changelog) | Hevy | Haptic eklendi; ayrıntı yok | https://www.apkmirror.com/apk/hevy-gym-workout-tracker/hevy-gym-log-workout-tracker/hevy-gym-log-workout-tracker-3-0-11-release/ [arama özeti; Android changelog] |

### 2.2 Antrenman şikâyet ve övgüleri

| Uygulama | Övgü | Şikâyet | Kaynak |
|---|---|---|---|
| Hevy | "Log weights, reps, duration, and RPE in seconds without breaking the flow of your sets"; "easy to replace and add when you're in the gym" (06/18/2025); tek kullanıcı: "one time purchase option" | Bodyweight squat hacmi eklenmiyor (07/26/2025) | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 |
| Strong | "Simplest interface of any fitness app"; "Strong doesn't bog you down with distractions"; Apple Watch; auto rest timer; PR ve 1RM | Eski yorumlar: egzersiz veritabanı esnek değil; ağırlık+süre birleşimi yok (10/24/2023); 2025 kararsızlığı: silinen antrenman, sync (unitQ, arama özeti); ürün güncelleme bug notları (App Store sürüm notları: "Sign-in prompt", "Calendar widget") | https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 ; https://unitq.com/unitq-scorecards/strongworkouttracker [arama özeti] |
| Strong (vendor sayfası) | Progress grafikleri, basit tasarım, rutin yönetimi, Apple Watch, otomatik rest timer, önceki değer, PR alarmı | Sayfa vendor pazarlamasıdır; tüm yorumlar 5 yıldız. Eleştiri yok | https://strong.app/love (erişim 403 ile okunamadı; arama özeti ile tarandı) [doğrulanmadı: içerik] |
| Fitbod | Customize düzeyi (App Store 2021 yorumu: profil, ekipman, hariç tutma, swap); egzersiz başına kısa video gösterim | AI, bir gün önce omuz çalıştırılmış olmasına rağmen omuz egzersizi seçti (Ocak 2025, arama özeti); alarm/ses ayarı yok ve bir uygulama içi ekran kilidi (12/09/2024 yorumu); paylaşımda reklam | https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543 ; https://www.techradar.com/health-fitness/fitbod-app-review [arama özeti] |
| Ladder | Koç grup sohbeti; "Ladder estimates your one-rep max" (05/26/2025); "in-ear coaching" | Pazarlama dili ağır ("#1 app", "Apple's Editors' Choice"); ücret konusunda kaynaklar çelişiyor (arama özeti) | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 |
| MacroFactor Workouts | Plaka hesabı, RIR, gym profile, Jeff Nippard rutinleri, otomatik ilerleme "just like a coach would" | Yeni uygulama; yorum verisi az (4,8 K puan) | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |

### 2.3 Onboarding ve ilk değer (antrenman + gıda)

| Kalıp | Uygulamalar | Neden | Kaynak |
|---|---|---|---|
| 3 adımlı tanıtım: "Answer lifestyle questions → Snap a photo → Get your nutritional breakdown" | Cal AI | İlk değer 3 adımda; App Store açıklamasında öne çıkarılıyor | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| Onboarding paywall: Cal AI'da onboarding "first high-intent purchase moment" olarak tanımlanıyor; paywall gösterim oranı %87 (tarih belirtilmemiş); 61 paywall deneyi | Cal AI (Superwall vaka çalışması) | Ödeme niyeti onboarding'de yüksek; ama satıcının kendi ölçümü | https://superwall.com/case-studies/cal-ai |
| Fotoğraf ve barkod, kamera tarama ve makro analizi Premium kapısının arkasında | Cal AI | Ücretli kapı, ilk değer sonrası | https://superwall.com/case-studies/cal-ai ; https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| İlk antrenmana kadar onboarding soruları (deneyim, hedef, ekipman); ilk ilk açılışta | Fitbod | İlk üretilen antrenman için girdi | https://help.fitbod.me/hc/en-us/sections/31812804804375-Training-Program-Goals [arama özeti: Getting Started bölümü https://help.fitbod.me/hc/en-us/sections/360001927994-Getting-Started] |
| Fitbod ilk antrenman ücretsiz, paywall ilk antrenman üretildikten sonra ve başlamadan önce | Fitbod | Üçüncü taraf UI incelemesi | [doğrulanmadı] https://screensdesign.com/showcase/fitbod-gym-fitness-planner (video incelemesi; ayrıntı arama özeti) |
| 7 gün deneme, "NO PAYMENT collected during trial" | Ladder | Ödeme korkusunu azaltır | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 |
| 7 gün deneme, ücretsiz-uygulama ayrıcalığı: MacroFactor "Download to start your 7-day trial" | MacroFactor, MacroFactor Workouts | Trial açık | https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 |
| Onboarding sırasında ekran animasyonları ve illüstrasyonlar (yeni "space-themed" görünüm) | MacroFactor | Onboarding kişiliği | https://www.reddit.com/r/MacroFactor/comments/1niphf6/a_new_look_for_a_new_chapter_and_a_first_look_at/ |
| Kullanıcı bilgisi ile ilk öneri: "Your personal plan" | MacroFactor Workouts | Hedef ve ekipmandan kişisel rutin | https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524 |

### 2.4 "Akıllı" özellikleri kalabalık yapmadan sunma

| Kalıp | Uygulamalar | Neden | Kaynak |
|---|---|---|---|
| Algoritma açıklaması ayrı bir yardım sayfasında (nasıl üretildiği, neden üretilmediği) | Fitbod | Şeffaflık; "neden olmadı" sorusuna cevap | https://help.fitbod.me/hc/en-us/articles/16254175592215 |
| Çeşitlilik ayarı: Balanced / More Consistent / More Variability | Fitbod | Kullanıcı kontrolü | https://help.fitbod.me/hc/en-us/articles/16254175592215 |
| Haftalık check-in: makro ve kalori hedefi check-in'de otomatik güncellenir | MacroFactor | Kararı haftalık tek ekranda veriyor | https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 ; yorum (2023): "the app will auto adjust my calories and macros during check in" https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471 |
| Metin girişi AI'ya yalnızca yapılandırma verir: Describe → "Find Foods" → plate'te kullanıcı onayı → "Log Foods" | MacroFactor | Kararı kullanıcı verir, AI sadece listeler | https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor |
| Egzersiz gelen öneri; kullanıcı eylemleri (replace, add) öğrenmeye dönüşür | Fitbod | Geri bildirim döngüsü | https://help.fitbod.me/hc/en-us/articles/16254175592215 |
| Koç mesajlaşması grup sohbetinde (Ladder) | Ladder | Kişi temasını ürünün içinde tutar | https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 (yorum 01/23/2024) |
| Koç katmanı ücretli: Hevy Trainer "available with Hevy Pro"; Ladder koç tabanlı programlar (abonelik) | Hevy, Ladder | Koçluk, ücretli katman olarak ayrılıyor | https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 ; https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 |
| AI Coach gıda uygulamasında: "Your new AI Coach gives you personalized guidance based on your goals and history" | MyFitnessPal | Koç, ana ekranda değil, App Store açıklamasında öne çıkıyor | https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718 |
| Today ekranında kalori kalan + makro özeti en üstte; makro değerlerine dokununca g/kalan/% (Premium) | MyFitnessPal | Üst özet; ayrıntı isteğe bağlı | https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab |
| Kullanıcı yorumu: MFP'nin ekle akışında çok adım ("Having to click through multiple screens to add water") | MyFitnessPal | Kalabalık ekran şikâyeti | https://www.reddit.com/r/Myfitnesspal/comments/1su1sgi/why_the_app_facelift_sucks/ |

### 2.5 Renk ve vurgu

| Kalıp | Uygulamalar | Neden | Kaynak |
|---|---|---|---|
| Erişilebilirlik beyanları: "Differentiate Without Color Alone", "Dark Interface", "Reduced Motion", "Larger Text", "VoiceOver", "Voice Control" | Cal AI | Mağaza beyanı; renk tek sinyal değil | https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 |
| Erişilebilirlik beyanı: Cronometer "Larger Text", "Dark Interface" | Cronometer | Koyu arayüz desteği | https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738 |
| Apple yönergesi: rengi tek başına anlam taşıyıcı yapma; şekil, yerleşim, ikon ekle; grayscale testi | Apple (tüm uygulamalar) | Renk körlüğü ve ışık koşulları | https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria |
| Apple yönergesi (HIG sayfası) içeriği WebFetch ile okunamadı; yalnızca başlık geldi | Apple | — | [doğrulanmadı] https://developer.apple.com/design/human-interface-guidelines/color |
| MacroFactor 2025 yeniden markalaşma: yeni logo, yeni yazı tipi (Macro Sans) başlıklarda, yeni yemek ikonları | MacroFactor | Marka ve tanınabilirlik | https://www.reddit.com/r/MacroFactor/comments/1niphf6/a_new_look_for_a_new_chapter_and_a_first_look_at/ |
| MyFitnessPal Today: kalori (tüketilen/kalan) ve makro dağılımı en üstte | MyFitnessPal | Üst kısımda tek bakış | https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab |
| Uygulamaların hex değerleri ve accent renkleri | — | Ekran görüntüleri ve sayfa kaynağı incelenmedi | [doğrulanmadı] |

---

## 3. Sınırlar

- Tüm dokunuş sayıları, animasyon hızları ve haptic ayrıntıları tahmindir. Ölçmek için simülatörde kronometre testi gerekir.
- Hevy ve Strong'un ekip içi uygulama ekranları (tam set satırı, sıralama) bu araştırmada ekran görüntüsü olarak incelenmedi. Tablolardaki ifadeler yardım sayfası ve App Store metninden çıkarıldı.
- Reddit içeriği 2 thread (MFP Today redesign ve MacroFactor yeniden markalama) ayrıntılı okundu. Diğer thread'ler yalnızca başlık seviyesinde. "Hevy" ve "Strong" için r/weightroom ve r/Fitness aramaları sonuç vermedi.
- Cal AI, Lose It!, MFP barkod kaldırma iddiası (kimola 410) ve Ladder fiyatı kaynaklar arasında çelişiyor; doğrulanmadı.
- Rakip blog (nutrola.app) yorumları bilinçli olarak yalnızca "doğrulanmadı" ile kullanıldı; satıcı ilgisi var.

## 4. Bizim için 15 somut kural

1. Ana ekran günün öğün listesi olsun: her öğün başlığı altında kalemler tek bakışta görünsün; "View All" ikinci adım olmasın. (MFP Today yorumları: https://www.reddit.com/r/Myfitnesspal/comments/1su1sgi/why_the_app_facelift_sucks/)
2. Her öğün satırında "+" ve "son öğünü tekrarla" tek jest olsun; öğün seçimini ekleme akışı sormasın. (https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab)
3. Boş aramada öneri göster: Favorites, sonra saat önerileri, sonra Latest. Yazınca kaynaklara göre grupla. (https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor)
4. Favori kalp ile yemek detayında eklensin; porsiyon kaydedilsin; aynı yemeğin birden çok preset'i olabilsin. (https://macrofactor.com/favorite-foods/)
5. Son kullanılan porsiyon varsayılan olsun; gram seçeneği her zaman açık; klavye akışı Tab → Enter ile tamamlansın. (https://support.cronometer.com/hc/en-us/articles/360018193011)
6. Barkod bulunamazsa üç yol sun: kendi barkodunu/etiketini tara, Quick Add ile makro gir, elle ara. Quick Add'i "aramada sakla" seçeneğiyle sun (MacroFactor'da kaydedilmiyor). (https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor)
7. AI fotoğraf ya da metin sonucu düzenlenebilir kalem listesi olsun; her kalemde "tahmin" etiketi ve aralık; kabul tek dokunuş. Cal AI'daki doğruluk şikâyeti bu kararın gerekçesi. (https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 ; https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor)
8. Onboarding 3 adımda bitsin ve ilk değer (ilk haftalık karar ön izlemesi) onboarding içinde görünsün. Ücretli kapıyı ilk değerden sonra koy; deneme ödeme almıyorsa bunu açıkça yaz. Paywall yerleşimi Levent'in kararıdır (ADR-019 para). (https://apps.apple.com/us/app/ladder-strength-training-plans/id1502936453 ; https://superwall.com/case-studies/cal-ai)
9. Set satırında önceki değer (PREVIOUS) her zaman görünsün; ✓ tek dokunuşla setı tamamlasın ve rest timer otomatik başlasın; timer ±15 sn ile ayarlanabilsin. (https://www.hevyapp.com/features/workout-rest-timer/ ; https://www.hevyapp.com/features/track-workouts/)
10. Kilit ekranı (Live Activity) üzerinden set tamamlama ve rest sayacı; uygulamaya girmeden akış sürsün. (https://www.hevyapp.com/features/live-activity/)
11. Set etiketleri (Warm Up, Failure, Drop) ve plaka hesabı ekipman profilinden beslensin; ağırlık girilince plaka dökümü görünsün. (https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 ; https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524)
12. Egzersiz değiştirme ve ekleme aynı sistemde: satır kaydırma veya ••• ile Replace; üstte 3-4 öneri, altta arama + kas grubu + ekipman filtresi + video. "Daha az öner" seçeneği ekle. (https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod ; https://www.hevyapp.com/features/workout-plan-generator/)
13. Bitiş ekranı: süre, hacim, set sayısı, PR'lar; PR kutlaması bilgi olarak; paylaşım isteğe bağlı; günlük seri yok, haftalık tutarlılık gösterilebilir. (https://www.hevyapp.com/features/track-workouts/ ; U7 kuralı)
14. Haftalık karar kartı MacroFactor modeline benzesin: check-in'de "ne değişti, neden" tek ekranda; kullanıcı değişikliği görmeden hedef değişmesin. (https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471)
15. Renk tek accent (turkuaz) ile eylemi ve aktif durumu gösterir; her renkli durum metin ya da ikonla da ayırt edilir (Cal AI "Differentiate Without Color Alone" beyanı); koyu mod ve "Larger Text" desteği olsun (Cal AI beyanları). (https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 ; https://developer.apple.com/help/app-store-connect/manage-app-accessibility/differentiate-without-color-alone-evaluation-criteria)

## 5. Açık sorular (Levent kararı)

- Paywall yeri: Cal AI onboarding'de gösteriyor; biz ilk değerden sonra. Para kararı Levent'te.
- Haftalık check-in'in gücü: MacroFactor modeli iyi ama ilk ana ekranın ne göstereceği ürün kapsamı.
- "Recent foods" öğüne göre mi, saate göre mi: MacroFactor saat, MFP öğün. Karar ürün tasarımında.
