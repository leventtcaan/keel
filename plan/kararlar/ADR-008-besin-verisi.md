# ADR-008 · Besin verisi
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Tahmin veritabanından gelir, LLM'den değil (U1; ham LLM MAE 652 kcal vs eşleme 171-191). Ulusal hardcoding yok (U11).
Kullanıcı girdisi sistematik olarak eksik bildirilir (%20-27) → ölçülen sonuç (kilo trendi) beyandan üstündür
(`arastirma/04-faz3-urun.md` Ö-14, §8.6).

## Karar
- **Birincil kaynak: USDA FoodData Central** (genel gıdalar). **Barkod: Open Food Facts.**
- LLM serbest metni/fotoğrafı `{yemek, miktar, belirsizlik}` yapısına çevirir; kalori ve makro **veritabanı
  eşlemesinden** hesaplanır ve **aralık** olarak döner (U5).
- **Gram sorusu** yalnız belirsizlik yüksek ve öğün günün kalorisini domine ediyorsa sorulur (U9).
- **Sapma kalibrasyonu:** fotoğraf/metin tahmini mutlak değer değil, sapması öğrenilen bir seri olarak modellenir;
  gerçek referans kilo trendidir. Kullanıcının kişisel sapması zamanla öğrenilir.
- **Lisans yükümlülükleri `[doğrulanmadı]`:** FDC'nin kamu malı (CC0) olduğu, Open Food Facts veritabanının ODbL
  (paylaşım-benzeri, atıf) olduğu biliniyor; yükümlülükler ilk veri görevinde resmî sayfalardan doğrulanıp bu ADR'ye
  işlenecek.

## Neden
Doğruluk + savunulabilirlik + maliyet. Sapma kalibrasyonu, "fotoğraf loglama adaptif TDEE'yi bozar" çelişkisini çözer.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| LLM'in kalori tahmini | MAE 652 kcal, tutarsız, denetlenemez |
| Ticari besin API'si (Nutritionix vb.) | Ücretli; Nutritionix indie erişimini kaldırdı |
| Kendi veritabanı | Kapsam imkânsız |

## Geri dönmenin maliyeti
Orta.

## Etkilenen
`nutrition`, `coach`.

## Doğrulama
Eşleme testleri; aralık çıktısı testleri; sapma kalibrasyonu simülasyon testi.
