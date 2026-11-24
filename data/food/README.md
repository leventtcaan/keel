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
Yeni yemek: dosyaya ekle, `TurkishDishesTests` biçimi doğrular.
