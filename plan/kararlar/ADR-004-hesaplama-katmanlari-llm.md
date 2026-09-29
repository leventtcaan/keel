# ADR-004 · Hesaplama katmanları ve LLM
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
LLM maliyeti gelirin ~%4,2'si; asıl risk ortalama değil, kotasız kötüye kullanım (ayda $68-122/kullanıcı)
(`arastirma/ham/K5-fiyat-kota-maliyet.md`). Ham LLM kalori tahmini kullanılamaz (MAE 652 kcal); veritabanı
eşlemesiyle 171-191 (`arastirma/ham/I2-etkilesim-modeli.md`). Apple Foundation Models iOS 27 ile görüntü girdisi
kazandı ama yalnız Apple Intelligence'lı cihazlarda (iPhone 15 Pro, 16+) ve 4.096 token bağlamla.

## Karar
**Dört katman — ucuzdan pahalıya, her istek mümkün olan en alt katmanda çözülür:**
| Katman | Ne | Maliyet |
|---|---|---|
| 0 · Deterministik | Karar motoru, trendler, kota, kural metinleri | $0 |
| 1 · Cihaz üstü | Barkod/OCR (Vision), kısa cümleleme, fotoğraf ön-eleme — Apple Foundation Models | $0 |
| 2 · Ucuz bulut modeli | Serbest metin → yapılandırılmış kayıt, sohbet, kararın anlatımı | düşük |
| 3 · Orta model | Haftalık özet — batch, gecikmeli | batch indirimli |

- **Sağlayıcıdan bağımsız port:** `coach` modülünde `LanguageModel` arayüzü; sağlayıcı adaptörü yapılandırmadan seçilir.
  Model adı, fiyat, token limiti koda gömülmez (K2).
- **Yapılandırılmış çıktı zorunlu:** LLM her zaman JSON şemasına göre cevap verir; şemaya uymayan cevap atılır. Kalori
  ve porsiyon **veritabanı eşlemesinden** gelir; LLM yalnız "hangi yemek, ne kadar" çıkarımını yapar (U1).
- **Kota sunucu tarafında:** günde 25 koçluk mesajı + 10 fotoğraf analizi (`data/parameters/quota.yaml`). Kota bitince
  sert durdurma yok; deterministik ürün çalışmaya devam eder (Katman 0-1).
- **Egress tek kapıdan:** dışarıya giden her LLM çağrısı `privacy` modülünün kapısından geçer — rıza kontrolü (V2),
  sağlık verisi maskeleme, loglamama (V3).
- **Maliyet kontrolü:** sağlayıcıda harcama limiti, prompt caching, fotoğraf istemcide ≤1024 px (V1).
- **Katman 1 kapsamı** bir spike göreviyle belirlenir: kendi ince Expo Module'ümüz mü, topluluk paketi mi
  (`expo-apple-foundation-models`, `expo-local-llm` — olgunluk `[doğrulanmadı]`).

## Neden
Maliyet kuyruğunu sabitler, gizliliği tek noktada toplar, sağlayıcı değişimini ucuzlatır (Gemini Flash 1 Ocak 2027'de
fiyatı 2× yapıyor — "modeller ucuzlar" varsayımı yanlışlandı).

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Tek güçlü model her iş için | Maliyet 5-128× artar, kuyruk riski büyür |
| Yalnız cihaz üstü | 4.096 token sohbeti taşımaz; cihaz payı bilinmiyor |
| LLM maliyetini ayrı tahsil etmek | Gelirin %4'ü için en büyük güven riski (Fitia "Coins" krizi) |

## Geri dönmenin maliyeti
Düşük — port arkasında.

## Etkilenen
`coach`, `privacy`, `subscription`, mobil `ai/` katmanı.

## Doğrulama
`coach` hiçbir karar tipi üretmez (mimari test); LLM cevap şema testleri; kota testleri; egress yalnız `privacy`
üzerinden (ModularityTests).
