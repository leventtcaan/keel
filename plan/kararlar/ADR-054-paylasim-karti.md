# ADR-054 · Paylaşım kartı: yalnız kelimeler, telefonda yapılır, kilo ve güvenlik kararları varsayılan dışarıda (K-612)
- **Durum:** KABUL (agent, teknik — ADR-019); güvenlik kararlarının dışarıda tutulması **geçici**, soru 104 Levent'te
- **Tarih:** 2026-10-04 · **Karar veren:** agent

## Bağlam
L3 Y5: kullanıcı başlatmalı paylaşım kartı, "before/after DEĞİL" — bir karar ya da kayıt paylaşılır, vücut değil. Kısıtlar: U4 (yağ % yok), U7, U12
(vücut görseli yok), V1 (fotoğraf yok), V3 (kilo varsayılan gizli). M6 Part 4 talimatı: görüntü telefonda üretilir, sunucuya gitmez; fotoğraf
kütüphanesine (K-614) dokunmaz; sayılar gerçek değer (K-604 gibi).

## Karar
1. **İçerik:** başlık · tutarlılık kaydı (K-608: "11 of 12 weeks on track", af haftası) · son karar başlığı · güç grafiğinin hareketi (ilk ve son
   haftanın en iyi e1RM'i, K-604'ün kendi sayıları, "since {tarih}") · kilo trendi **yalnız kullanıcı açarsa** (varsayılan kapalı, "since {tarih}") ·
   altbilgi. Vücut, fotoğraf, figür, yağ yüzdesi yok. Metin en.json'da; `forbidden-phrases.json` (U4/U6) + `share-forbidden.json`
   (before/after, dönüşüm, vücut gösterisi, suçlama) testte.
2. **Görüntü telefonda:** kart SVG (react-native-svg, kurulu) → `toDataURL` → PNG base64 → önbellek dosyası → paylaşım sayfası → dosya her durumda
   silinir (K-309 dışa aktarma kalıbı). Uygulama görüntüyü hiçbir yere göndermez; nereye gideceğini kullanıcı seçer. Yeni bağımlılık yok.
3. **Sabit palet:** karar kartının koyu zemini (ADR-016 renkleri), temadan bağımsız — bir görüntü.
4. **Güvenlik kararları karta girmez (geçici):** son karar `share_withheld_rules` kurallarından birine dayanıyorsa ya da `safety` ise satır çıkmaz.
   Bu kararlar sağlık sinyali taşır ("Your plan pauses here", hızlı kayıp — kilo anahtarı kapalıyken bile kilo yönünü söyler). En korumacı seçenek;
   Levent'in cevabı (soru 104) gelene kadar.

## D1 · Sayılar ve listeler
| Parametre | Değer | Neden |
|---|---|---|
| `share_withheld_rules` (`share.json`) | low_energy_safety, low_energy_availability, rapid_loss, loss_rate_cap, loss_rate_cap_bodyweight, low_fat_floor | Motorun güvenlik ağının (`SafetyNet`) kuralları; `bmr_floor` dışarıda değil — "yemek aynı, hareket artar" bir sağlık sinyali değil |
| Kart boyutu | 1080 × 1350 (4:5) görüntü birimi | Akışların ve hikâyelerin kırpmadan gösterdiği oran; yazı boyutları `tokens.type.share*` |

## Alternatifler ve neden o değil
| Alternatif | Neden değil |
|---|---|
| `react-native-view-shot` ile ekran görüntüsü | Yeni native bağımlılık; SVG'nin kendi `toDataURL`'i yetiyor |
| Görüntüyü sunucuda üretmek | Kullanıcı verisi dışarı; talimata aykırı |
| Kilo varsayılan açık | V3 / L3 Y5: kilo varsayılan gizli |

## Sonuçlar
Olumsuz (kabul edilen): RN `Share.share({url})` Android'de url'yi göndermez (yalnız iOS; ürün iOS önce) — Android gelince `expo-sharing` ya da
platform yolu. Kart metni sabit genişlikte kelimeyle bölünür (karakter tahmini, ölçüm değil).

## Etkilenen
`apps/mobile/src/share/`, `app/share.tsx`, İlerleme sekmesi, `data/copy/en.json › share`, `data/copy/share-forbidden.json`, `data/parameters/share.json`.
