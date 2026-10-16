# Yayına giden yol (ADR-080) — üç oturum + Levent'in adımları

> Kaynak: `plan/kararlar/ADR-080-en-hizli-temiz-yayin.md`. Hafıza DURUM › DEVAM NOKTASI. Ortak talimat `YENI-YUZ-kod.md` (senkron, toplu mod),
> ajan talimatı `ajan-brief.md`. Opus düzenleyici, Sonnet uygulayıcı + inceleme; en çok 3 uygulayıcı; her PR'a inceleme; disk ≥ 5 GB.

## Levent'in adımları (paralel, oturum beklemez)
1. **K-983** App Store Connect: yıllık + aylık abonelikte introductory offer "Free, 2 weeks".
2. **K-1001** ürün adı (+ marka kontrolü: USPTO/EUIPO/TÜRKPATENT, App Store araması). Mağaza metni, ekran görüntüleri buna bağlı.
3. **K-805** mali müşavir (W-8BEN, GVK 20/B) → ASC › Agreements, Tax, and Banking: Paid Applications Agreement + vergi + banka.
4. **K-904** dış TestFlight grubu: birkaç kişi (kayıt tutan, salona giden), e-postalar TestFlight'a.
5. **RevenueCat gizli API anahtarı** → VPS ortam değişkeni `KEEL_REVENUECAT_API_KEY` (`deploy/env.example`, init-env.sh).
6. (İsteğe bağlı) **K-976** Facebook App ID → EAS ortam değişkeni `EXPO_PUBLIC_FACEBOOK_APP_ID`.

## Oturum 1 · Yayın öncesi kod — ✅ BİTTİ (16 Eki, #602-#606)
```
oturum-baslat. Toplu mod. Yayın öncesi kod (ADR-080): plan/oturum-promptlari/YAYIN.md › Oturum 1.
Kartlar (M9): K-905 öncü göstergeler (sağlık verisiz, kendi sunucumuzda, olay şeması ADR; yayın günü ölçer), K-908 /health hazır olmayı söyler,
K-817 hız sınırı, K-816 metin dışı kontrast 3:1 (prototipte göster, Levent onayı), K-704 RevenueCat REST tazelemesi. Paralel en çok 3; her PR'a inceleme;
göçlü PR'lar tek tek (sıradaki V50). Bitiş: DURUM'a ÇIKIŞ + Oturum 2 hazır mı (K-983 durumu).
```

## Oturum 2 · K-984 TestFlight + cihaz turu (K-983 bitince)
```
oturum-baslat. Toplu mod. M9a son iş: K-984 + K-903 + K-815 (ADR-080): plan/oturum-promptlari/YAYIN.md › Oturum 2 ve YENI-YUZ-part4-devam.md (cihaz turu listesi).
Önce K-983 kontrolü (RevenueCat sandbox'ta introPrice 2 hafta), K-976 App ID EAS'ta mı. EAS derlemesi (docs/eas-derleme.md) → TestFlight → dış grup (K-904, 2 hafta).
Levent'e cihaz turu listesini madde madde ver; notlar karta; engelleyici olanları bu oturumda düzelt, yeni derleme. Bitiş: K-984 done, M9a ÇIKIŞ (tam).
```

## Oturum 3 · Mağazaya çıkış (K-1001 ad + K-805 hazır olunca; dış beta sürerken)
```
oturum-baslat. Toplu mod. Mağazaya çıkış (M10, ADR-080): plan/oturum-promptlari/YAYIN.md › Oturum 3.
K-1002 EN-US ASO (ürün adıyla), K-1003 5-6 ekran görüntüsü + açıklama (simülatör düzeneği ../keel-sim/.sim/), K-1006 puan isteği değer anında,
K-1033 mağaza başvurusu (ASC beyanları app-store-beyanlari.md, SANDBOX kapalı, AI kapalı yüzeyler, review notları). Mağaza metni data/copy/store.en.json.
Gönderim ve Release Levent'te (ADR-019). Bitiş: "Uygulama App Review'da / mağazada" + pazarlama konuşmasının girdileri (ilk kullanım verisi, K-905).
```

## Sonra
Pazarlama planı (M11): ayrı konuşma, yayından sonra ilk gerçek veriyle. Güncellemeler: klipler (K-419, K-425), Live Activity, AI katmanı (K-533) vb.

## Durum (16 Eki öğleden sonra)
Oturum 2 ve 3 tek oturumda birleşti: App Store Connect + RevenueCat kuruldu, build 3 TestFlight'ta. Kalan: ikon (6 · N.) + paywall v2 PR'ları → build 4 → telefon kontrolü → Submit (Levent).
Ayrıntı ve sıra: DURUM › DEVAM NOKTASI. Devam prompt'u:
```
oturum-baslat. YAYIN son adım: DURUM › DEVAM NOKTASI (16 Eki öğleden sonra). İkon ve paywall v2 PR'larını incele/birleştir, build 4 al, App Store Connect'te bağla,
inceleme notu + abonelik görselini güncelle, Levent'e telefon kontrolü ve Submit'i bırak. Yeni büyük iş açma.
```
