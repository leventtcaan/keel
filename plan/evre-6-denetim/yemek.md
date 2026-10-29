# Evre 6 · Yemek tarafı denetimi (salt okuma, 29 Eki 2026)

Kapsam: `plan/evre-6-ortalamayi-yakala.md` madde 5-11, ADR-090 #1, ADR-088, ADR-086. Hiçbir repo dosyası değiştirilmedi; simülatör
çalıştırılmadı. Her iddia dosya:satır ile; koşturulmayan çıkarım `[çıkarım]` diye işaretli. Yol önekleri: `B/` = `backend/src/main/java/app/keel/nutrition/`,
`M/` = `apps/mobile/src/`.

## 0. Üç yapısal gerçek

1. **Birim modeli: "g" + FDC'nin porsiyon dizgileri; başka bir şey yok.** Kayıt `Amount{quantity, unit}`; `unit` serbest bir dizgi ve sunucuda yalnız üç
   anlamı var: `"g"`, `"ml"` (yalnız `grams_per_ml` doluysa) ya da besinin `food_serving.name`'ine **dizgi eşitliği** (`B/FoodEstimator.java:138-149`).
   Uygulama `ml`'yi hiç sunmaz: birim çipleri = porsiyon adları + `g` (`M/food/draft.ts:34-40`). "Adet/dilim/bardak" kavramı veri modelinde yok; FDC'nin
   `amount + unit + modifier` metni olduğu gibi ad olur (`B/FdcImport.java:159-168`: "1 large", "1 cup, chopped"). `oz` / `lb` birimi yok. Birim sistemi
   ayarı (metric/imperial) yemek yoluna hiç bağlı değil (`grep imperial|unitSystem` `M/food/` boş). "3 oz" gören metric kullanıcı: bu ayar değil, FDC'nin ilk
   hacim-olmayan porsiyonu (`draft.ts:37` `servings.find(!isVolume) ?? 'g'`).
2. **Veri tabanı ABD için boş sayılır.** Prodda: 8.169 USDA kaydı (SR Legacy 7.793 + Foundation 376, `plan/denetim-2026-10-29.md:27`) + 2.897 Türk OFF ürünü
   (`ADR-088` Ek 1). `FdcImport.Dataset` yalnız `FOUNDATION`/`SR_LEGACY` (`B/FdcImport.java:38-40`); Branded ve FNDDS (Survey) içe aktarılmıyor, ADR-008'de
   planlanmıştı. FDC'den gelen satırlarda `gtin` hiç yazılmıyor (`B/FdcImporter.java:60-64` insert'te gtin yok). OFF süzgeci Türkiye'ye çivili
   (`deploy/off_filter.py:11,34-37`), tek dosya, ve içe aktarım "dosyada olmayan tüm OFF satırlarını siler" (`B/OffImporter.java:91`): ABD alt kümesi eklemek
   için betik + içe aktarıcı + `food_import` tek-kayıt mantığı değişmek zorunda (`OffImporter.java:102` `dataset='OFF'` tek satır).
3. **Kayıt günü = şimdi; okuma = tek gün.** İstemci hiçbir yerde başka bir güne yemek yazmaz (`eatenAt = new Date()`: `M/app/meal.tsx:198`, `M/food/QuickAdds.tsx:67`,
   `M/app/food.tsx:52`) ve yalnız bugün + dün okur (`M/food/useFoodDay.ts:44-45`, `M/food/mealStart.ts:26-27`). Sunucu ise geçmiş `eatenAt` ve herhangi bir gün
   sorgusunu kabul eder (`ApiLimits.moment/day`), yani eksik olan istemci + aralık uç noktası; sözleşmede `PUT/PATCH /v1/meals/{id}` ve aralık sorgusu yok
   (`contracts/openapi.yaml:576-622`).

---

## 1. Veri

| Soru | Bulgu | Kanıt |
|---|---|---|
| Kaynak | FDC Foundation (2025-12-18) + SR Legacy (2018-04), CSV'den açılışta; OFF Türkiye JSONL açılışta | `deploy/fetch-fdc.sh:7`, `deploy/compose.yaml:44-49`, `B/FdcImportRunner.java`, `B/OffImportRunner.java` |
| Adet | 8.169 FDC + 2.897 OFF ≈ 11 bin | `plan/denetim-2026-10-29.md:27`, `ADR-088` Ek 1 |
| Alanlar | `id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, grams_per_ml, dataset` (100 g başına) + `food_serving(name, grams)`; lif, şeker, sodyum, doymuş yağ **yok** | `V9__nutrition_foods.sql:8-30`, `V51` |
| Marka | Şemada var; FDC'de hep boş, yalnız OFF-TR doldurur | `FdcImporter.java:61` (brand yok) |
| Barkod | Şemada `gtin` var; yalnız OFF-TR yazar; FDC'den hiç | `FdcImporter.java:60-64`, `OffImporter.java:92-96` |
| Porsiyon/ev ölçüsü | FDC `food_portion.csv` okunuyor (Foundation'da çoğu gıdada yok, SR Legacy'de "1 large/1 cup/1 slice"); OFF'ta etiketteki tek "1 serving (…)" | `FdcImport.java:93-120,159-168`, `OffImport.java:107-114` |
| Varsayılan porsiyon | Hacim kelimesi içermeyen ilk porsiyon, yoksa 100 g; kelime listesi parametre | `M/food/draft.ts:25-39`, `data/parameters/food.json` `food_serving_volume_words`, `meal_default_grams=100` |
| Ölçek | Tüm CSV'yi bellekte `List<Map>` yapan elle yazılmış okuyucu; backend `mem_limit 1536m` | `FdcImport.java:171-231`, `deploy/compose.yaml:55` |
| Kapsam tabloları | `food.source` yalnız FOUNDATION/SR_LEGACY/BRANDED; `food_import.dataset` yalnız FOUNDATION/SR_LEGACY/OFF; `food.dataset` yalnız FDC/OFF | `V9:10`, `V15:5`, `V51:3,9` → FNDDS ve ABD-OFF için migration gerekir |
| Aralık modeli | Her sayı aralık (U5): tek bir etiket değeri bile "130-160 kcal per 100 g" gibi gösterilir | `B/FoodRanges.java`, `M/food/kcalLine.ts:5-11`, `M/food/FoodPicker.tsx:183` |

Öne çıkan kusurlar: servis adları normalleştirilmemiş ham FDC metni ("1 cup, sifted", "1 large" besin adı olmadan); servis eşleştirmesi ad dizgisi eşitliğiyle
olduğundan yeniden içe aktarımda adı değişen bir porsiyon, eski kayıtlı ve "Recent"/tekrar kaydedilen öğeyi sessizce `VALIDATION_FAILED` yapar
(`FoodEstimator.java:145-147` + `MealController.estimated` yakaladığı `ApiException` → öneri sessizce düşer) `[çıkarım]`.

## 2. Arama

- Uç: `POST /v1/foods/search {q, limit}` (`B/FoodController.java:73-80`), en az 2 karakter, varsayılan 20, en çok 50 (`application.yml:146-147`).
- Eşleştirme: her kelime `folded_text LIKE '%kelime%'` ve hepsi (`B/FoodStore.java:48-55`), ad + marka üzerinde, hiçbir dizin yok (`grep create index` yalnız
  meal/recipe tablolarında); her istekte tüm tablo katlanıp regex'ten geçer (`:44-73`) → 11 bin satırda OK, yüz binlerce markalı üründe değil `[çıkarım, ölçülmedi]`.
- Sıralama: 0 tam ad, 1 "ilk kelime + virgül" (USDA "Egg, whole"), 2 ilk kelime, 3 önek, 4 kelime öneki, 5 içinde; sonra Foundation > SR Legacy > Branded, sonra kısa ad
  (`FoodStore.java:57-72`). **Popülerlik, kullanıcının geçmişi, marka tanınırlığı yok**; sıralamada kullanıcının sık yedikleri hiçbir rol oynamaz.
- Yazım hatası: yok (trigram/Levenshtein yok); çoğul "eggs" sorgusu yalnız adı "eggs" içeren kaydı bulur (`%eggs%`), "Egg, whole" gelmez `[çıkarım]`. Tek katlama
  ı/İ → i (Türk klavyesi; ABD için gereksiz). Eş anlam yok ("fries" ↔ "french fried potatoes", "soda" ↔ "carbonated beverage").
  Çoğul/"s" toleransı yalnız koçun metin okuma yolunda var (`coach/MealDraft.java:180-185`), aramada yok.
- Sonuç satırı: ad + marka + "kcal aralığı per 100 g" (`FoodPicker.tsx:183`); **porsiyon başına kalori yok**, makro yok.
- Yazarken arama 300 ms bekleyerek var (`food.json` `food_search_delay_ms`; `FoodPicker.tsx:99-111`), eski sonuç hemen kalkıyor (ADR-085).
- Son/sık yenenler: `GET /v1/foods/recent` (son 28 gün, en çok 5, `application.yml:158,165`); ekranda **2** tanesi (`food.json` `quick_recent_max=2`,
  `M/food/QuickAdds.tsx:56`), yalnız yeni öğünde, öğe eklenince kaybolur (`M/app/meal.tsx:285`). Slota göre sıralı, tek dokunuşla son miktarla kaydeder
  (`QuickAdds.tsx:99-110`). "Sık yenen" (frekans) ayrı bir liste olarak yok; favori/yıldız yok. `GET /v1/days/{day}/suggestions` (en çok 3, bütçeye sığanlar) food sayfasında
  (`M/food/Suggestions.tsx`), dokununca `/meal`'e devredip kullanıcı yine Kaydet'e basar.
- "Dünkü gibi": var, **yalnız dün**, yalnız bugün o slotta kayıt yokken (`M/food/meals.ts:51-54`, `QuickAdds.tsx:55`, `food.tsx:96`); başka bir günü / öğünü / "geçen salı"yı kopyalama yok;
  öğünü "favori öğün" yapıp tek dokunuş tekrar yok. Tarif (kendi yemeklerim) kodda var ama ulaşılamıyor (bkz. §8).
- Kendi besinini ekleme (özel besin, hızlı kalori girişi, etiketten el ile giriş) **yok**: `POST /v1/foods` sözleşmede yok; eşleşmeyen bir şey için çıkış yok.

## 3. Barkod

- Tarayıcı gerçek: `expo-camera` `CameraView` + `onBarcodeScanned`, türler ean13/ean8/upc_a/upc_e (`M/food/BarcodeScanner.tsx:17,63-68`), izin reddi veya bozuk etiket için elle numara (`:82-95`),
  `app.config.ts:41-42` `barcodeScannerEnabled: true`. Mock yok.
- Bağ: `FoodPicker.lookUpBarcode` → `POST /v1/foods/barcode-lookup` (`M/food/FoodPicker.tsx:133-147`) → `Gtin.candidates` (UPC-E genişletme, GS1 sağlama; `B/Gtin.java`) → `FoodStore.byGtin`.
  Kod tarafı doğru ve testli (`GtinTests`, `meal-barcode.test.tsx`).
- **Neden "çalışmıyor":** veri. ABD için eşleşecek barkod yok (bkz. 0.2): FDC satırlarında gtin yok, OFF yalnız Türkiye. Hemen her ABD ürünü NOT_FOUND döner `[çıkarım: prodda sayım çalıştırılmadı]`.
- Miss: tarayıcı modalı hemen kapanır (`FoodPicker.tsx:134` `setScanning(false)`), arama kutusunun altında tek satır "That product isn't in the food database yet. Find it by name." (`data/copy/en.json`
  `meal.barcode.notFound`). Ürünü elle ekleme, "tekrar tara", OFF/USDA canlı API'ye düşme (ADR-008: çalışma anında dış API yok) yok. Sözleşme açıklaması hâlâ "USDA FDC Branded Foods" diyor
  (`contracts/openapi.yaml:536-538`) → yanlış.
- Simülatörde kamera olmadığı için tarama akışı uçtan uca yalnız gerçek cihazda sınanabilir; elle numara yolu simülatörde sınanır.

## 4. Öğün listesi, düzeltme, silme, geçmiş

- Liste: `app/food.tsx` (Today › "Food left" satırı → `FoodLine.tsx:57`), `MealList` bugünün öğünlerini slot + yalnız **ad** satırları + kcal aralığı ile gösterir (`M/food/MealList.tsx:20-35`);
  **miktar/birim satırda görünmez** (yalnız düzeltme ekranında). Bekleyen (gönderilmemiş) öğün "Not sent yet" (`:62`).
- Düzelt: öğüne dokun → `/meal?edit=<id>&day=<day>` (`food.tsx:94`); miktar, birim, öğe ekle/çıkar, slot (`meal.tsx:96-118,276-303`). **Sunucuda güncelleme yok**: kaydet = önce eskiyi
  `DELETE` et, sonra aynı `eatenAt` ile yeni `clientId` kuyruğa (`meal.tsx:42-48 doc, 192-221`); bağlantı gerekir (`meal.edit.needsConnection`), yarım kalırsa kullanıcıya "tekrar kaydet" kalır.
- Sil: öğün başına (düzeltme ekranında "Delete" + onay, `meal.tsx:223-234,264-275`); **öğe başına** doğrudan silme yok, düzeltmede öğeyi kaldırıp kaydetmekle olur. Satırdan kaydırarak silme yok.
  Kaydet sonrası "Saved" bandı + Undo var (`savedMeal.ts`, `meal.tsx:208-211`).
- **Geçmiş günler:** yok. Tarih seçici/aralık hiçbir ekranda yok. `useReadOnFocus` her zaman `localDay(new Date())` (`M/today/useReadOnFocus.ts:22-30`). Düzeltme linki başka gün alabilir ama oraya götüren UI yok.
  `GET /v1/meals?day=` tek gün (`B/MealController.java:99-104`); aralık/haftalık toplam uç noktası yok. Progress yalnız bugünün bütçesini okur (`M/progress/read.ts:41`).
- Başka güne/saate yemek yazma yok (bkz. 0.3): "dünkü akşam yemeğini unuttum" yapılamaz.

## 5. Öğün fotoğrafı / AI okuma

- Kod gerçek ve bağlı: `meal-photo.tsx` → `food/photo.ts` → `POST /v1/meals/photo` (`photo.ts:100`), sunucu `coach/MealPhoto.java`, `MealDraft.java`; mock değil (testlerde sahte model).
- **Ulaşılamaz:** `meal-photo`, `coach`, `recipes`, `recipe` `RETIRED` (`M/navigation/tabs.ts:32`); kök yerleşimde `Stack.Protected guard={false}` (`M/app/_layout.tsx:77-80`), "hiçbir şey açmaz, link de".
  `food.tsx` başlığı da AI yüzeyini kapalı diye belirtir (`:24-27`).
- **Sunucuda da kapalı:** `application-prod.yml` `keel.coach.provider: "off"`, `OffLanguageModel` fırlatır; `deploy/compose.yaml:39` "the coach off". AI rızası verilemez (ADR-064 #5).
- Sonuç: "fotoğraftan öğün" şu an ürün değil; ABD ortalaması (MFP Premium, Cal AI) için bir boşluk ama Levent'in ADR-064 kararı + abonelik kapısı (`photo.ts:101`, ENTITLEMENT_REQUIRED) ile bilinçli.
  Pazarlamada vaat ediliyorsa kırık vaat; `docs/magaza/asc-kurulum.md:197` mağaza metni AI'ın aktif olmadığını söylüyor (tutarlı).

## 6. Kayıt bildirimleri

- Hiç yok. Bildirim türleri `training | check_in | quiet` (`M/notifications/plan.ts:18`), "dördüncü tür yok" yorumu duruyor (`plan.ts:2`, ADR-036 #1).
  ADR-090 #2 dördüncü türü (öğün hatırlatması: kullanıcının yemek saatlerinden öğrenir, günde ≤ 2, kapatılabilir) KABUL etti ama koda girmedi.
- Girdi altyapısı da yok: sunucuda öğün saatleri için profil alanı yok; slot başlangıçları sabit parametre (breakfast 4, lunch 11, dinner 16, snack 22; `food.json` `meal_slot_starts`),
  kullanıcıdan öğrenilmez. Son kayıt zamanları `GET /v1/meals` ile gün gün okunabilir ama telefonda öğün-saati dağılımı hesaplayan kod yok. Plan tamamen telefonda ve saf fonksiyon (ADR-036 #2), bu iyi bir yer.

## 7. "Günde N öğün" / kalori hedefi → kayıt arayüzü

- Hedef sunucudan geliyor: `DailyTargets{kcal, proteinG}` günlük (`B/DailyTargets.java`); `GET /v1/days/{day}/budget` hedef − yenen aralığı döner (`MealController.java:201-209`, `DayBudget`).
  Kalan yalnız **kcal ve protein** (`BudgetLine.tsx:28-42`); `eaten` içinde karbonhidrat ve yağ var ama **gösterilmiyor**; `EstimateCard` da yalnız kcal + protein (`EstimateCard.tsx:27-34`).
  Hedef kartı karb/yağı "yalnız bir bölünme uyuyorsa" gösterir (`TargetsCard.tsx:17-24`).
- **"Günde N öğün" kavramı hiçbir yerde yok** (`grep meals_per_day|mealsPerDay|mealCount` boş). Slot sabit 4'lü (BREAKFAST/LUNCH/DINNER/SNACK, `openapi.yaml:2763-2765`), öğün başına hedef yok, günün
  kalanı öğün sayısına bölünmüyor, "kalan öğünde ~X kcal" gibi bir rehber yok. Suggestions (`MealController.java:127-147`) kalan bütçeye sığan kendi yiyeceklerini önerir — kullanıcının "şu kadar öğün" tercihini bilmeden.
- Kalan bütçe This week satırı + food sayfasında; meal ekranında (kayıt anında) kalan kcal / bu öğünün payı görünmez (`meal.tsx` yalnız tahmin kartı).

## 8. Sahte / yer tutucu / ölü kod

- Gerçek mock yok (`grep mock|sample|dummy|stub` food yollarında boş; `FakeLanguageModel` yalnız testte, prodda başlamaz: `LanguageModelConfiguration.java:22`).
- **Ölü ama yaşayan kod (ulaşılamaz):** `app/meal-photo.tsx`, `app/coach.tsx`, `app/recipes.tsx`, `app/recipe.tsx`, `app/scoff.tsx` (`_layout.tsx:77-91`, `tabs.ts:32`); `app/onboarding/foods.tsx` (`flow.ts:79`
  `RETIRED_STEPS`). Tarif akışı buna dahil: kullanıcı tarif **oluşturamaz** (`/recipe`e hiçbir giriş yok), ama `meal.tsx:88-94` ve `FoodPicker` hâlâ `GET /v1/recipes` çağırır (hiç kimsede tarif yok → boş çağrı + `RecipeHits` ölü ağ).
  Backend `RecipeController/Store` ve sözleşme tarif uçları yaşıyor.
- "Foods you avoid" (Settings) yalnız `recent` ve `suggestions` listelerini süzer (`MealController.java:139,160`, `MealSuggestions.avoids`); aramayı süzmez ve kayıtta uyarmaz (bkz. plan madde 13 ayrı denetim).
- Sözleşme/sözlük kalıntıları: `openapi.yaml:536-538` ("USDA FDC Branded"), `FoodController.java:86` yorumu "FDC has mostly US products" (artık yanlış), `FoodPicker.tsx:27` aynı; `off_filter.py:41-47` `name_en` yazıyor ama
  içe aktarıcı okumuyor (`OffImport.parse` `name_en` kullanmaz). ABD için `product_name_tr` önceliği (`off_filter.py:33`) ters olmalı.
- Ölçü kaynağı sürüm sabit: `fetch-fdc.sh:7` Foundation 2025-12-18 ve SR Legacy 2018-04 dizgileri koda gömülü; ADR-008 "Foundation Nisan 2026" diyor → betik yeni sürüme kendiliğinden geçmez.

---

## Boşluklar, önem sırasıyla

### P0 (çalışmıyor / vaat kırık)
| # | Boşluk | Kanıt | Plan |
|---|---|---|---|
| P0-1 | **ABD barkodu eşleşmiyor**: ABD GTIN'li satır yok; tarayıcı çalışır, sonuç hep "not in database", çıkış yok | `FdcImporter.java:60-64`, `off_filter.py:11,34-37`, `en.json meal.barcode.notFound` | 9, 8 |
| P0-2 | **ABD markalı/hazır/restoran yemeği yok**: yalnız 8.169 laboratuvar adlı genel gıda + 2.897 Türk ürünü; "Cheerios/Chobani/Big Mac" bulunamaz | `FdcImport.java:38-40`, `denetim:27`, `ADR-088` Ek 1 | 9, 6 |
| P0-3 | **Geçmiş gün yok, başka güne yazma yok**: tek ekran bugün (+dün yalnız tekrar teklifi için), tarih seçici/aralık yok, `eatenAt=now` | `meal.tsx:198`, `useFoodDay.ts:44-45`, `useReadOnFocus.ts:22-30`, `openapi.yaml:576-600` | 7 |
| P0-4 | **Öğün hatırlatması yok** (ADR-090 #2 KABUL, kodda yok; kullanıcı saati öğrenilmiyor) | `notifications/plan.ts:18`, `ADR-090` #2 | 10 |
| P0-5 | **Birim: yalnız gram + ham FDC porsiyon dizgisi**; "yumurta adetle" ancak SR Legacy'de porsiyonu olan gıdada; Foundation'ın çoğunda porsiyon yok → gram; oz/lb/ml/cup(standart) yok; OFF'ta tek "1 serving" | `FoodEstimator.java:138-149`, `draft.ts:34-40`, `FdcImport.java:159-168` | 5 |

(P0-5 aslında "çalışıyor ama yarım"; plan madde 5 açıkça istediğinden P0 tutuldu. "Egg" için SR Legacy "1 large" var `[çıkarım, prodda porsiyon tablosu okunmadı]`.)

### P1 (çalışır ama ABD ortalamasının altında: MFP / MacroFactor / Cronometer)
| # | Boşluk | Kanıt |
|---|---|---|
| P1-1 | Arama: yazım hatası, çoğul, eş anlam, popülerlik ve kişisel geçmiş sıralaması yok; dizinsiz LIKE (büyük veriye ölçeklenmez) | `FoodStore.java:44-73` |
| P1-2 | Sonuç satırı "per 100 g" aralığı gösterir, porsiyon başına kcal / makro yok; ABD kullanıcısı 100 g düşünmez | `FoodPicker.tsx:183`, `kcalLine.ts` |
| P1-3 | Kendi besinini / hızlı kaloriyi / etiketten girme yok (barkod ya da arama kaçırınca çıkış yok) | `en.json meal.barcode.notFound`; sözleşmede `POST /v1/foods` yok |
| P1-4 | Karbonhidrat ve yağ ne kayıt anında (EstimateCard) ne kalan bütçede görünür; lif/şeker/sodyum veride yok | `EstimateCard.tsx:27-34`, `BudgetLine.tsx:28-42`, `V9` |
| P1-5 | Her şey aralık (U5), tek etiket sayısı bile; MFP kullanıcısı "tek sayı" bekler (ürün kararı, anayasa U5) | `FoodRanges.java`, `FoodPicker.tsx:183` — Levent kararı, hata değil |
| P1-6 | Düzeltme = sil + yeniden kaydet, çevrimdışı olmaz, sunucuda atomik güncelleme yok; öğe başına doğrudan silme yok, kaydırarak silme yok | `meal.tsx:192-221`, `openapi.yaml:613-622` |
| P1-7 | Öğün listesi satırında miktar/birim yok (yalnız ad + kcal) | `MealList.tsx:20-35` |
| P1-8 | "Recent" ekranda 2 öğe, öğe eklenince kaybolur, geçmişi aranamaz; kalıcı favori / "sık yenen" listesi / kendi öğünü kaydet (tarif girişi kapalı) yok | `food.json quick_recent_max`, `QuickAdds.tsx:56`, `meal.tsx:285` |
| P1-9 | "Dünkü gibi" yalnız dün ve yalnız boş slot; "herhangi bir günden kopyala" yok | `meals.ts:51-54` |
| P1-10 | "Günde N öğün" / öğün başı hedef / "bu öğünde ~X kcal" yok; slot sabit 4 ve saatleri sabit (4/11/16/22) | `food.json meal_slot_starts`, `openapi.yaml:2763` |
| P1-11 | Kayıt anında kalan bütçe / günün durumu görünmez (kayıt ekranında yalnız tahmin) | `meal.tsx:276-303` |
| P1-12 | İçe aktarma ölçeği: elle yazılmış, tüm CSV'yi bellekte tutan okuyucu Branded (≈3 GB) ve FNDDS (1,6 GB) için yetmez; OFF tek dosya + tek `food_import` satırı çoklu bölgeye uymaz | `FdcImport.java:171-231`, `OffImporter.java:91,102` |
| P1-13 | Fotoğraftan / metinden öğün ulaşılamaz ve sunucuda AI kapalı (bilinçli, ADR-064 #5) | `tabs.ts:32`, `application-prod.yml` |
| P1-14 | Bildirim yok ⇒ ayrıca "kayıt sıklığına göre" için telefonda öğün saati dağılımı çıkarımı yok | `notifications/plan.ts` |
| P1-15 | Barkod miss'inde modal kapanır, tek satır uyarı; tekrar tara / elle ekle / "bu ürünü ekle" yok | `FoodPicker.tsx:134,162-165` |

### P2 (cila)
- P2-1 Servis adı normalleştirmesi ("1 large" besin adsız; "1 cup, sifted" uzun çip) ve ad eşitliğiyle eşleştirme kırılganlığı (`FoodEstimator.java:145-147`).
- P2-2 Sözleşme/yorum kalıntıları: `openapi.yaml:536-538`, `FoodController.java:86`, `FoodPicker.tsx:27`.
- P2-3 `off_filter.py` `name_en` yazıp okutmuyor; ABD'de `product_name_en` öncelikli olmalı.
- P2-4 Ölü ekranlar ve boş `GET /v1/recipes` çağrıları (`meal.tsx:88-94`); retired kod temizliği.
- P2-5 `fetch-fdc.sh` sürümleri koda gömülü.
- P2-6 Foods-you-avoid arama/kayıtta devre dışı (yalnız öneri/recent'ı süzer).
- P2-7 Ml hiç sunulmuyor (`grams_per_ml` var ama UI'de ml çipi yok): `draft.ts:35-36`.
- P2-8 Arama kutusu ipucu "Try rice." tek kelime; US için örnek ("greek yogurt").

---

## Plan maddeleriyle eşleme
- Madde 5 (birim): P0-5, P1-2, P2-1, P2-7. Gereken: veri modelinde **birim türü** (adet/porsiyon/ölçü) + FNDDS/SR porsiyonlarının adlandırılması + varsayılan birim seçimi sunucuda (şu an istemcide kelime listesiyle).
- Madde 6 (arama): P0-2, P1-1, P1-2, P1-8, P1-9. Gereken: dizin (pg_trgm / tsvector) + popülerlik + kişisel sıklık sıralaması + "recent/frequent" listesinin genişletilmesi.
- Madde 7 (öğün listesi / geçmiş): P0-3, P1-6, P1-7. Gereken: gün kaydırıcı / tarih seçici ekranı, `eatenAt` seçimi, aralık veya çok-gün uç noktası (`GET /v1/meals?from=&to=`), ideal olarak `PATCH /v1/meals/{id}`.
- Madde 8 (barkod): P0-1, P1-3, P1-15. Tarayıcı kodu hazır; veri + miss akışı eksik.
- Madde 9 (veri): P0-1, P0-2, P1-12; ADR-088 #3-4 ODbL atıf düzeni korunmalı (Settings atıf satırı var: `en.json settings.sources.foodValue`).
- Madde 10 (bildirim): P0-4, P1-14.
- Madde 11 (N öğün / hedef): P1-10, P1-11, P1-4.
