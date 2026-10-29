# Yemek verisi kaynakları — 29 Eki 2026 (yeniden yapım Evre 3 ön araştırması)

> Ham not. Web taraması (alt ajan) + agent denetimi. `[doğrulanmadı]` işaretli rakamlar Evre 3'te döküm üzerinde sayılarak doğrulanır.

## Open Food Facts (OFF)
- Lisans: veritabanı ODbL, içerik DbCL, görseller CC-BY-SA. https://world.openfoodfacts.org/data · https://world.openfoodfacts.org/terms-of-use
- Yükümlülük: herkese açık kullanımda atıf (bağlantı + ODbL); türetilmiş veritabanı herkese açık kullanılırsa ODbL ile paylaşım (share-alike).
  Kullanıcı katkısı alan uygulamalardan katkıyı geri göndermeleri istenir (biz katkı almıyoruz).
- Döküm (gecelik): JSONL.gz https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz · CSV (TSV) ~0,9 GB sıkıştırılmış / ~9 GB açık ·
  Parquet (Hugging Face `openfoodfacts/product-database`) · MongoDB dökümü + 14 günlük farklar.
- Türkiye: `countries_tags` içinde `en:turkey` (ve olası `en:turkiye`); sayı ~7.160 [doğrulanmadı].
- Besin alanları: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g` [fat doğrulanmadı], `serving_size`; `no_nutriments` bayrağı.
  Alan listesi: https://world.openfoodfacts.org/data/data-fields.txt
- API: ürün okuma 15/dk/IP, arama 10/dk/IP, User-Agent `Uygulama/Sürüm (e-posta)`; yüzlerce üründen fazlası için döküm istenir.
  https://openfoodfacts.github.io/openfoodfacts-server/api/

## USDA FoodData Central — Branded Foods
- Lisans: kamu malı (CC0 1.0), atıf istenir. https://fdc.nal.usda.gov/download-datasets
- Boyut (Ekim 2026 sürümü): JSON ~187 MB zip / ~3 GB açık; CSV ~432 MB zip. Kapsam çoğunlukla ABD [doğrulanmadı]; barkod `gtinUpc` [doğrulanmadı].

## TürKomp (Ulusal Gıda Kompozisyon Veri Tabanı)
- Ücretsiz kullanım (TÜBİTAK listesi), ama yeniden dağıtım/içe aktarma lisansı bulunamadı (sayfa zaman aşımı; uygulama mağazasında "© Türkomp").
  ~645 gıda [doğrulanmadı]. **Yazılı izin olmadan içe aktarılmaz.**

## Diğer
- Açık lisanslı Türk yemekleri besin veri seti bulunamadı (Kaggle/GitHub). 767 ana yemeklik 2019 çalışması CC-BY dergide, veri indirilebilir değil.
- Türkçe-İngilizce yemek adı eşlemesi için Wikidata (CC0) incelenecek [doğrulanmadı].

## Sonuç (Evre 3 için)
1. OFF gecelik döküm, VPS'te yerel süzme (Türkiye + barkodlu + besin alanları dolu), atıf + ODbL gereği türetilmiş alt kümenin paylaşımı (süzme betiği ve kaynağa bağlantı).
2. USDA Branded (CC0) barkod yedeği olarak, ABD kapsamı notuyla.
3. TürKomp yok; Türk yemekleri ya izinle ya da kaynaklı tariflerden hesapla (ayrı karar).
