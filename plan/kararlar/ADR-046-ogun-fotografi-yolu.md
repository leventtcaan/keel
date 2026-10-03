# ADR-046 · Öğün fotoğrafı yolu: sunucu yeniden yazar, model göz kararı gram verir (K-514)
- **Durum:** KABUL (agent, teknik — ADR-019; veri dışarı çıkışı V1/V2 ve AI rıza metniyle zaten tanımlı)
- **Tarih:** 2026-10-03 · **Karar veren:** agent

## Bağlam
K-514: öğün fotoğrafı → görüntü modeli → kalemler → veritabanı eşlemesi (L3 P4). Kurallar: fotoğraf istemcide ≤1024 px,
EXIF'siz (V1); yalnız sağlayıcıyı ve "meal photo"yu adıyla söyleyen AI rızasıyla (V2); model yalnız "hangi yemek, ne kadar"
(ADR-004, U1); sayı daima aralık (U5). K-504 (serbest metinden öğün) aynı işin metin yolunu kurdu: `MealDraft`,
`MealReplyCheck`, `/v1/food-estimates`. Araştırma: fotoğraf yemeği tanır ama gramı bilemez; tek bir tartılmış gram
karbonhidrat hatasını %56,6'dan %20,2'ye indirir (`arastirma/ham/F-surtunme-ve-his.md` §1.0, §1.4c).

## Karar sürücüleri
- Telefonun söylediğine güvenmeden V1'i sunucuda da garanti etmek (savunma derinliği).
- Gramın belirsizliğini gizlememek: göz kararı ölçü "ölçülmüş" gibi dar aralık üretmemeli (U5).
- K-504'ün taslağını, denetimini ve bellek içi devrini (K-509) yeniden kullanmak; yeni sözleşme şekli icat etmemek.

## Karar
1. **`POST /v1/meals/photo`**, gövde `{"image": "<base64 JPEG/PNG>"}` (JSON: telefonun üretilen istemcisi ve
   `expo-image-manipulator`'ın base64 çıktısıyla doğrudan; multipart yok). Gövde en fazla `4·⌈max-bytes/3⌉ + 256`
   karakter okunur, fazlası **413** (sonsuz gövde belleğe alınmaz).
2. **Sunucu yeniden yazar:** `MealPhoto` başlıktan boyutu okur (piksel çözmeden; küçük dosya "çok büyüğüm" diyebilir),
   **>1024 px → 400** (küçültmez: o fotoğraf telefondan hiç çıkmamalıydı), JPEG/PNG dışı → 400. Modele giden, sunucunun
   yalnız piksellerden yazdığı JPEG'dir (`keel.coach.photo.jpeg-quality`): EXIF, GPS, XMP, yorum ulaşamaz. Saydamlık beyaza.
   Hiçbir yerde saklanmaz; `Picture.toString` yalnız boyutu söyler (V3).
3. **Model yalnız `{"items":[{"food","quantity","unit":"g"}]}`** (`MealReplyCheck.grams`): porsiyon ipucu **göz kararı
   gram**. Kullanıcının ölçüsü yok; modelin "1 cup" demesi servis ölçüsü olarak **dar** aralık üretirdi (`FoodEstimator`
   servis = MEASURED). Gram + `certainty: ESTIMATED` → `/v1/food-estimates` geniş aralık + tek gram sorusu (U5).
   Başka alan (kcal, protein, toplam, güven) → cevap bütünüyle atılır (U1, ADR-004).
4. Amaç `Purpose.PHOTO_MEAL` → rıza veri türü `meal photo` (`keel.coach.data-types.photo-meal`); kota
   `Quota.Use.PHOTO_ANALYSIS` (`photo_analyses_per_day` 10, ADR-004) — koç mesajından düşmez. Sağlık rızası (ADR-026 #2).
5. Port: `Turn` isteğe bağlı bir `Picture` taşır (yalnız kullanıcının turu). Sahte model istekleri hatırlar → testler
   gidenin EXIF'siz ve ≤1024 px olduğunu görür.

## Neden
- Yeniden yazmak, "EXIF segmentlerini tek tek sil" yaklaşımından daha güvenli: bilinmeyen bir metadata türü (MakerNote,
  ICC içine gömülü metin, APP13) kaçamaz; çıkan dosyada yalnız sunucunun yazdığı JFIF başlığı var.
- Gram + ESTIMATED, araştırmanın "asıl hata gramdan" bulgusunu ürüne taşır: aralık genişler, gram sorusu çıkar.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Sunucu büyük fotoğrafı küçültür | V1'i boşa çıkarır (fotoğraf telefondan tam boy çıkmış olur); istemci hatasını gizler |
| Model servis ölçüsü ("1 bowl") döner | Ölçülmüş gibi dar aralık; göz kararı belirsizliği kaybolur (U5) |
| Model kcal tahmini + DB eşleme kontrolü | U1: sayı modelden gelmez |
| multipart/form-data | Üretilen istemci ve RN'de ikili gövde zahmetli; base64 %33 büyür ama ≤1024 px'te önemsiz |
| Fotoğrafı segment segment temizlemek | Bilinmeyen metadata kaçabilir |

## Sonuçlar
Olumlu: V1 iki uçta; sözleşme şekli K-504'le aynı (telefon aynı taslak ekranını kullanır). Olumsuz: yeniden kodlama küçük
bir kalite kaybı (0,85) ve CPU; JPEG/PNG dışı (HEIC) telefonda JPEG'e çevrilmeli (K-408).

## Geri dönmenin maliyeti
Düşük — tek uç, tek denetim; sözleşme alanı eklemek geriye uyumlu.

## Etkilenen
`coach` (`MealPhoto`, `Picture`, `PhotoProperties`, `MealDraft.readPhoto`, `MealReplyCheck.grams`, `Turn`, `Purpose`),
`contracts/openapi.yaml` (`/v1/meals/photo`, `MealPhoto`), `data/coach/photo-meal.md`, `application.yml`
(`keel.coach.photo`, `data-types.photo-meal`). K-408 (telefon), K-533 (sağlayıcı ölçümüne fotoğraf seti eklenmeli).

## Doğrulama
`MealPhotoTests` (EXIF/yorum gider, 1024 sınırı başlıktan, PNG → JPEG, bozuk/GIF/fazla bayt reddi), `PhotoAnalysisSchemaTests`,
`NoCaloriesFromModelTests`, `PictureTests`, `MealPhotoApiTests` (rıza türü, sağlık rızası, kota türü, 413, ESTIMATED, aralık + soru).
