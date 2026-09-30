# ADR-008 · Besin verisi
- **Durum:** KABUL (Levent, 2026-09-29) · **güncellendi:** ADR-020 (yalnız FDC) ve K-207 spike'ı (lisans, veri yolu)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Tahmin veritabanından gelir, LLM'den değil (U1; ham LLM MAE 652 kcal vs eşleme 171-191). Ulusal hardcoding yok (U11).
Kullanıcı girdisi sistematik olarak eksik bildirilir (%20-27) → ölçülen sonuç (kilo trendi) beyandan üstündür
(`arastirma/04-faz3-urun.md` Ö-14, §8.6).

## Karar
- **Tek kaynak: USDA FoodData Central** — genel gıdalar ve barkod (Branded Foods'taki GTIN). Open Food Facts
  kullanılmaz (ADR-020: ODbL paylaşım-benzeri yükümlülüğünden kaçınma).
- LLM serbest metni/fotoğrafı `{yemek, miktar, belirsizlik}` yapısına çevirir; kalori ve makro **veritabanı
  eşlemesinden** hesaplanır ve **aralık** olarak döner (U5).
- **Gram sorusu** yalnız belirsizlik yüksek ve öğün günün kalorisini domine ediyorsa sorulur (U9).
- **Sapma kalibrasyonu:** fotoğraf/metin tahmini mutlak değer değil, sapması öğrenilen bir seri olarak modellenir;
  gerçek referans kilo trendidir. Kullanıcının kişisel sapması zamanla öğrenilir.
- **Lisans (doğrulandı, K-207, 2026-09-29):** FDC API kılavuzu (fdc.nal.usda.gov/api-guide): "USDA FoodData Central
  data are in the public domain and they are not copyrighted. They are published under CC0 1.0 Universal"; kaynak
  olarak FoodData Central'ın anılması **isteniyor** (zorunluluk değil) → uygulamanın "Hakkında/Kaynaklar" ekranında
  atıf satırı. OFF artık kullanılmadığı için ODbL yükümlülüğü yok.

## Güncelleme — K-207 spike (2026-09-29, agent; teknik karar ADR-019)
**Veri seti (resmî indirme sayfası, fdc.nal.usda.gov/download-datasets):**
| Veri tipi | Son sürüm | CSV (sıkışık / açık) | Ne için |
|---|---|---|---|
| Foundation Foods | Nisan 2026 | 3,7 MB / 32 MB | işlenmemiş gıdalar, örnek bazlı değişkenlik |
| SR Legacy | Nisan 2018 (son, güncellenmiyor) | 6,7 MB / 54 MB | geniş genel gıda kapsamı |
| FNDDS (Survey) | Ekim 2024 (2021-2023) | 200 MB / 1,6 GB | pişmiş/karışık yemekler, porsiyonlar; 2 yılda bir |
| Branded Foods | Nisan 2026 | 428 MB / 2,9 GB | barkodlu ürünler (GDSN, Label Insight); API'de aylık yayın tarihleri görülüyor |

**API'de doğrulandı (DEMO_KEY, salt okuma):** Branded kaydında `gtinUpc` alanı var (14 haneye sıfırla doldurulmuş, ör.
`00016000275287`), GTIN ile arama tek kaydı buluyor; besin değerleri **100 g başına tek sayı** (ör. enerji 359 kcal),
`servingSize` + `householdServingFullText` porsiyonu veriyor. API: data.gov anahtarı, **1.000 istek/saat/IP**, aşımda 429.

**Veri yolu kararı: toplu indirme + kendi veritabanımıza içe aktarma, çalışma anında API yok.**
- Neden: (1) kullanıcının yemek araması ve barkodu **USDA'ya gitmez** (V2 ruhu: kullanıcıdan türeyen veri dışarı
  çıkmaz); (2) saatlik 1.000 istek sınırı ve dış servis kesintisi ürünü durdurmaz; (3) sürümlenmiş, tekrar
  üretilebilir veri (karar denetimi, ADR-003).
- Kapsam, K-208: Foundation + SR Legacy + FNDDS (genel gıda ve yemek, ~1,7 GB açık CSV'den yalnız gereken tablolar:
  gıda, besin (enerji + 3 makro), porsiyon). Branded: yalnız `gtin_upc`, ad, marka, porsiyon ve 4 besin sütunu
  süzülerek (tam 2,9 GB değil). İçe aktarma bir komut (sürüm etiketiyle); yenileme: Branded ayda bir, diğerleri
  yayın oldukça. Ham dosyalar repoya girmez.
- **Aralık bizim modelimizden gelir:** FDC tek sayı verir; kcal/makro aralığı miktar belirsizliği (tartılmış /
  tahmini) ve kaynak türünden türetilir — parametreleri K-208'de araştırmadan kaynakla (`arastirma/ham/F-…`, I2).

**Bilinen zayıflık (Riskler'e yazıldı):** Türk markalı ürün kapsamı **yok denecek kadar az** — "ülker" 2 kayıt (ABD'ye
ithal zeytinyağı), "eti", "torku", "tadım" 0 ya da ilgisiz. Barkod okuma Türkiye'deki ürünlerde çoğunlukla "bulunamadı"
diyecek; genel gıda eşlemesi (Foundation/SR/FNDDS) çalışır. Seçenekler (ürün kararı, Levent): kullanıcıya etiketten
elle giriş (tek sefer, sonra hafıza) · ileride Türkiye kaynağı (TürKomp vb., lisansı ayrıca doğrulanır).

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
`nutrition` (K-208 içe aktarma, eşleme; K-209), `coach`, sözleşme `GET /v1/foods/barcodes/{gtin}` (ADR-024).

## Doğrulama
Eşleme testleri; aralık çıktısı testleri; sapma kalibrasyonu simülasyon testi.

## Güncelleme (30 Eyl 2026, K-208)
- **Aralık modeli:** `arastirma/ham/H7-besin-araligi.md` — değer hatası (analiz ±%10; etiket mevzuat gereği tek yönlü:
  enerji/yağ +%20, protein/karbonhidrat −%20, 21 CFR 101.9(g)(4)-(5)) × miktar hatası (tartı ±%5, porsiyon ±%25, göz
  kararı ±%50). Üç oran `tag: urun`, onay listesinde.
- **Barkod:** GTIN-14'e normalize, GS1 kontrol hanesi doğrulanır; FDC'de yoksa NOT_FOUND.
- **Toplu içe aktarma bekliyor:** FDC dosyalarını indirmek dışarıdan dosya indirme → Levent izni (DURUM soru 16); Branded
  paketi büyük ve disk şu an dolu. O zamana dek `nutrition.food` boş, arama sonuç vermez (dürüst boşluk).
- **İçe aktarmada dikkat (K-208 incelemesi):** Branded'da aynı `gtin_upc` birden çok kayıtta olabilir `[doğrulanmadı]`
  → içe aktarıcı en yeni kaydı tutar (V9'da `gtin` benzersiz); `%kelime%` araması indekssiz tüm tabloyu tarar → Branded
  yüklenince `pg_trgm` GIN indeksi (ayrı göç).
