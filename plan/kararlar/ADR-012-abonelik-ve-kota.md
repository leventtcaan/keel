# ADR-012 · Abonelik ve kota
- **Durum:** KABUL (Levent, 2026-09-29)
- **Tarih:** 2026-09-29 · **Karar veren:** Levent (öneren: agent)

## Bağlam
Fiyat kararı: $59,99/yıl · $12,99/ay · 7 gün kartlı deneme · ücretsiz katman yok · lifetime yok
(`arastirma/05-faz4-pazarlama.md` §7). Başabaş 4 abone. Kota: günde 25 koçluk mesajı + 10 fotoğraf analizi.

## Karar
- **Satın alma: RevenueCat** (`react-native-purchases`; kurulu 10.11.0 — Ek 1) üzerinden StoreKit. Abonelik durumu backend'e
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

## Ek 1 · M7 başı cevapları (Levent, 2026-10-04)
- **Hazır olan yok:** RevenueCat hesabı/projesi, App Store Connect abonelik grubu + ürünler + 7 gün deneme, Paid Applications sözleşmesi
  (vergi/banka), sandbox test hesabı. Kod bunları beklemez: değerler (webhook yetki başlığı, entitlement adı, ürün kimlikleri) yapılandırmadan
  okunur, kodda yoktur. Entitlement adı `premium`, ürünler `keel_monthly` / `keel_annual` yalnız **öneri**; Levent ASC/RevenueCat'te ne koyarsa
  yapılandırmaya o yazılır.
- **Veri dışarı (V2) — onaylı:** RevenueCat'e bizim seçtiğimiz tek alan hesabın **opak kimliği** (UUID; e-posta, ad, sağlık verisi yok).
  RevenueCat SDK'sı ayrıca App Store satın alma kaydını, mağaza ülkesi/para birimini, cihaz/iOS sürümünü ve IP'yi alır — SDK'yı kullanmanın
  kaçınılmaz parçası; Levent bunu da onayladı. Gizlilik politikasında madde: M8 (K-801). Webhook'la gelen olaydan sunucu yalnız durumun
  gerektirdiğini saklar (ADR-056).
- **Sürüm:** `react-native-purchases` 10.10.2 yazılı ama doğrulanmadı; Part 2'de `npx expo install` ile Expo SDK 57 uyumu çözülür, sürüm
  `package.json`'dan okunup buraya yazılır (K6). **Çözüldü (K-702, 4 Eki):** `npx expo install react-native-purchases` → **10.11.0**
  (paket Expo'nun `bundledNativeModules` listesinde yok; npm'in en yenisi; eş bağımlılık `react-native >= 0.73`, kurulu 0.86.3). Ayrıntı ADR-057.
