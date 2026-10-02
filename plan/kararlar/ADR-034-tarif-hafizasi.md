# ADR-034 · Tarif hafızası: malzemeler saklanır, sayı her seferinde veritabanından
- **Durum:** KABUL (teknik, agent — ADR-019; sağlık verisi sınıflaması tutucu seçildi, Levent gevşetebilir: soru 45)
- **Tarih:** 2026-10-02 · **Karar veren:** agent

## Bağlam
K-413 (Ö-16, L3 #22 / P14): ev yemeği en büyük sürtünme ("ev chili'si için 20 dk", E §7.3). Kabul kriteri: tarif bir kez
girilir, porsiyonla tekrar kullanılır; kalori veritabanından, aralıkla (U1, U5). Bugün öğün = kalemler (`ItemRequest`:
`foodId` + `Amount`), tahmin `FoodEstimator`'da, öğün kalemleri o anki tahminle saklanır (K-209). Sözleşmede tarif yok.

## Karar
1. **Tarif = ad + kaç porsiyon çıktığı + malzemeler** (`ItemRequest` listesi, öğünle aynı biçim ve aynı sınırlar: 1..50
   kalem, kalem başına ≤ 5000 g). **Sayı saklanmaz:** her okumada ve her kullanımda malzemeler veritabanından yeniden
   tahmin edilir (U1) — veritabanı ya da parametre değişirse tarif de değişir; ezberlenmiş eski sayı yoktur.
2. **Öğünde tarif bir kalemdir:** `foodId = "recipe:<id>"`, birim `portion`, miktar porsiyon sayısı (≤ 2 ondalık).
   `FoodEstimator` bu kalemi malzemelerin toplam aralığından **porsiyon/verim oranıyla** ölçekler; alt uç aşağı, üst uç
   yukarı yuvarlanır (aralık daralmaz, U5). Öğün bu kalemi o anki tahminle saklar (K-209 kuralı): tarif sonradan
   değişse ya da silinse de geçmiş öğün değişmez. Ad, tarifin adıdır ("Lentil soup").
3. **Gram sorusu tarif kalemine sorulmaz:** soru "kaç gram?" der, porsiyonun cevabı değildir. Soru adayı yalnız
   veritabanı kalemleridir (`FoodRanges.question`).
4. **Yalnız kendi tarifin:** başka hesabın tarifi `VALIDATION_FAILED` (var olduğu söylenmez). Tarif içinde tarif yok
   (malzeme yalnız veritabanı yiyeceği) — döngü ve derinlik sorunu baştan yok.
5. **Sağlık verisi sayılır:** öğün kayıtları gibi `HEALTH_DATA` rızası ister, rıza geri çekilince ve hesap silinince
   silinir, dışa aktarımda yer alır. Gerekçe: tarif kullanıcının ne yediğini anlatır; tutucu sınıflama, gevşetmek
   sıkılaştırmaktan kolaydır. (Soru 45: Levent "tarif sağlık verisi değil" derse rıza şartı kalkar.)
6. **Sözleşme:** `GET /v1/recipes` (ada göre), `POST /v1/recipes` (`NewRecipe`, `clientId` ile 201/200 — ADR-024),
   `DELETE /v1/recipes/{id}`. `Recipe` porsiyon başına aralıkları taşır (`perPortion: Nutrients`). Düzenleme yok: sil ve
   yeniden gir (sürüm 1; kullanım görülünce `PUT`). Aynı değişiklikte `NewMeal.items`'a sunucunun zaten uyguladığı
   `minItems: 1, maxItems: 50` yazılır (K-407 incelemesi).

## Neden
Malzeme saklamak U1'i korur (sayı hep veritabanından) ve öğün akışını değiştirmez (tarif bir kalem). Tarif kalemi
için ayrı bir öğün alanı açmak hem sözleşmeyi hem telefonun taslak mantığını ikiye bölerdi.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Tarifin aralığını oluşturulurken saklamak | Veritabanı/parametre güncellemesi tarife yansımaz; U1'in "sayı veritabanından" ruhu zayıflar |
| Tarifi öğüne malzemeleri olarak açmak | Öğün listesi "Lentil soup" yerine 9 malzeme gösterir; düzeltme ve "dünkü gibi" okunmaz olur |
| Pişmiş toplam ağırlık + tartılan porsiyon (gram) | Daha dar aralık verir ama iki tartı ister; kabul kriteri porsiyon diyor. Sonra eklenebilir (`unit: "g"` tarifte) |
| Tarif içinde tarif | Döngü/derinlik denetimi; kullanım görülmeden gereksiz (K7) |

## Geri dönmenin maliyeti
Düşük: tablo ve üç uç nokta; öğünler tarif kalemini zaten tahminiyle saklıyor.

## Etkilenen
`nutrition` (FoodEstimator, yeni RecipeStore/RecipeController, V22), `contracts/openapi.yaml`, privacy (silme/dışa
aktarım: `NutritionAccountData`). Telefon arayüzü ayrı görev (K-423).

## Doğrulama
RecipeTests: malzemelerden porsiyon başına aralık; öğünde `recipe:` kalemi ölçeklenir ve saklanır; başkasının tarifi
reddedilir; tarif silinince geçmiş öğün değişmez; rıza yokken 403; rıza geri çekilince ve hesap silinince silinir.
