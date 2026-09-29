# ADR-012 · Abonelik ve kota
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Fiyat kararı: $59,99/yıl · $12,99/ay · 7 gün kartlı deneme · ücretsiz katman yok · lifetime yok
(`arastirma/05-faz4-pazarlama.md` §7). Başabaş 4 abone. Kota: günde 25 koçluk mesajı + 10 fotoğraf analizi.

## Karar
- **Satın alma: RevenueCat** (`react-native-purchases` 10.10.2) üzerinden StoreKit. Abonelik durumu backend'e
  RevenueCat webhook'u ile gelir; yetki (entitlement) kontrolü **sunucuda** yapılır.
- **Kota sunucuda:** günlük sayaç (kullanıcı + gün); limitler `data/parameters/quota.yaml`. Kota bitince uygulama
  deterministik modda çalışmaya devam eder, kullanıcıya "kredi" kelimesi hiç gösterilmez.
- **İptal ve duraklatma** açıkça görünür (Noom $62M davası iptal akışı yüzündendi).
- Fiyatlar App Store Connect'te; kodda fiyat yok (K2).

## Neden
StoreKit makbuz doğrulaması, yenileme, iade gibi işleri RevenueCat taşır; fiyat deneyleri (Experiments) hazır.
Sunucu tarafı kota, istemci manipülasyonuna kapalı.

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| Doğrudan StoreKit 2 (kendi native modülü + App Store Server API) | Öğrenme değeri yüksek ama iş yükü ve hata riski büyük; ilk sürümde gereksiz |
| İstemci tarafı kota | Kolayca aşılır; maliyet kuyruğu açık kalır |

## Geri dönmenin maliyeti
Orta (satın alma katmanı değişimi).

## Etkilenen
`subscription`, `coach`, mobil paywall.

## Doğrulama
Yetkisiz kullanıcının koç çağrısının reddedildiği test; kota sınırı testleri; webhook imza doğrulama testi.
