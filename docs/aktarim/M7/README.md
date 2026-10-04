# M7 aktarım planı — Abonelik (yetki sunucuda)

> Toplu mod (`docs/aktarim-protokolu.md`). Kod birleşti; Levent anlatabilene kadar "aktarılmamış".
> Her görev dosyası: projede nerede · neden · basamaklar · satır satır anlatılacak yerler · canlı kanıt · soru bankası.

## Aktarım sırası (Part 1 · Yetki sunucuda)
1. K-701 RevenueCat webhook'u ve yetki (`K-701.md`, ADR-056, ADR-012 Ek 1) — webhook, HMAC imzası, durum makinesi, özellik testi, satır kilidi, sır ortamda
2. K-703 premium uçlarda yetki (`K-703.md`, ADR-056 #10) — kapının yeri (rızadan, kotadan, fotoğraftan önce), deterministik mod, ENTITLEMENT_REQUIRED

## Aktarım sırası (Part 2 · Paywall ve teslim)
3. K-705 telefon için abonelik durumu (`K-705.md`, ADR-056 Ek 1) — sözleşme önce, `active` vs `status`, `appUserId`, sabit saatli test
4. K-702 paywall, satın alma, geri yükleme, iptal (`K-702.md`, ADR-057) — port, tembel configure + UUID, teyit döngüsü, deneme dili, iptal Apple'da, 403 → See plans
