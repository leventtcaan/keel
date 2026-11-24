# data/food — Türk yemekleri ve ev ölçüleri (K-1213, #721)

İki dosya, ikisi de backend'e `processResources` ile girer (`data/food/`); kodda gram ya da yemek sabiti yok (K2).

## tr-measures.json — ev ölçüleri
Su bardağı (200 ml), çay bardağı (100 ml), yemek/tatlı/çay kaşığı, çorba ve servis kepçesi. Bir ölçünün kaç gram olduğu içindeki
besine bağlıdır: sınıf (yoğurt, yağ, un, şeker, pişmiş tahıl, pişmiş baklagil, sıvı) besin adının ilk kelimesinden bulunur
(`TurkishMeasures`). Sınıfı olmayan besinin Türk ölçüsü yoktur; tahmin edilmez. Sunucu ölçüleri `tr:<id>` birimi olarak portion
listesine koyar, telefon yalnız Türkçe gösterilirken sunar (`meal.item.measure.*` anahtarları en.json + tr.json).
Kaynak: TÜBER 2022 ve Rakıcıoğlu kataloğu, `arastirma/ham/tur3-openai-turkomp-yayin-2026-11-25.md` §2.3 üzerinden. **[doğrulanmadı]**:
değerler araştırma notundan geldi; birincil PDF açılıp karşılaştırılana kadar böyle kalır.

## tr-dishes.json — yemekler
~57 ev yemeği, her biri USDA FoodData Central malzemelerinin **tarifi** (malzemenin FDC açıklaması + bir standart porsiyondaki gram;
`servingG` pişmiş porsiyon ağırlığı). Besin değeri dosyada yok: açılışta `TurkishDishRunner`, FDC sürümleri alındıktan sonra
(`keel.fdc.import-dir` açıkken) `TurkishDishImporter` ile her malzemeyi `nutrition.food`'da adıyla bulur, 100 g başına toplar,
`tr:<id>` satırı yazar (`source=RECIPE`, `region=TR`, `dataset=RECIPE`, porsiyon "1 bowl (250 g)"). Bir malzeme bulunmazsa o yemek
yazılmaz (eksik değer uydurulmaz) ve sayısı `nutrition.food_import` (dataset RECIPE, `skipped`) kaydında görünür. Malzeme için `or`
aynı besinin başka FDC adlarıdır (USDA sürümler arası ad değiştirir).
Aralık: tarif tahminidir, `recipe_estimate_value_error_ratio` (0,25, `data/parameters/nutrition.yaml`) ile analiz değerinden geniş (U5).
TürKomp kullanılmaz (ticari lisans gerekir, API yok). Tarifler projenin tahminidir, **[doğrulanmadı]**.
Bir malzeme bu sürümde yoksa o yemek yeniden hesaplanmaz ama önceki iyi satırı kalır (silinen yalnız dosyadan çıkarılan yemektir). Sunucuda hangi malzeme adlarının bulunduğunu `tools/check_tr_ingredients.sql` gösterir (salt okunur; dosya değişince `python3 tools/gen_check_tr_ingredients.py`). `fdcId` bilinince malzemeye yazılır ve önce o denenir.
Yeni yemek: dosyaya ekle, `TurkishDishesTests` biçimi doğrular.

## Arama metni (V62, V63)
`nutrition.food.search_folded`: ad + marka + yemeğin İngilizce adları; NFC, ı İ ş ğ ç ö ü düz harf (tek liste: `FoodSearchTerms` ve
`nutrition.fold_text`, `SearchFoldedTests` ikisini karşılaştırır). V62 yalnız boş sütun, fonksiyon ve tetikleyici ekler (tablo yeniden
yazılmaz); eski satırları açılıştan sonra arka planda `SearchFoldBackfill` doldurur (yığın boyutu ve bekleme `keel.nutrition.search.fold-backfill`),
V63 indeksi `CONCURRENTLY` kurar. Dolum bitene kadar arama eski `search_text`'i kullanır (yalnız ı İ katlı); bitince `food_import`'a
(`SEARCH_FOLDED`, `done`) yazılır ve arama `search_folded`'a geçer.
